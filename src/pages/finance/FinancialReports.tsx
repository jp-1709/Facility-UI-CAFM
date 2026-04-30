import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, Printer, Download, Filter, Calendar, TrendingUp,
  TrendingDown, DollarSign, Info, ChevronRight,
} from 'lucide-react';
import {
  getProfitAndLoss,
  getBalanceSheet,
  getTrialBalance,
  getFiscalYears,
  getCompanies,
  ReportFilters,
  Periodicity,
  ProfitLossSummary,
  BalanceSheetSummary,
  TrialBalanceRow,
  FiscalYear,
  CompanyOption,
} from '../../lib/api/financial-reports-api';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'pl' | 'bs' | 'tb';

const TABS: { id: TabId; label: string }[] = [
  { id: 'pl', label: 'Profit & Loss' },
  { id: 'bs', label: 'Balance Sheet' },
  { id: 'tb', label: 'Trial Balance' },
];

const PERIODICITIES: Periodicity[] = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const formatCurrency = (n: number, compact = false) => {
  if (compact && Math.abs(n) >= 1_000_000)
    return `KSh ${(n / 1_000_000).toFixed(1)}M`;
  if (compact && Math.abs(n) >= 1_000)
    return `KSh ${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-KE', {
    style: 'currency', currency: 'KES',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
};

const numDisplay = (n: number) =>
  n === 0 ? <span className="text-muted-foreground">KSh 0</span>
    : <span className={n > 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(n)}</span>;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

export const SectionHeader = ({ columns, title }: { columns: any[]; title: string }) => {
  const valueColumns = columns.filter(c => c.fieldname !== 'account' && c.fieldname !== 'account_name' && c.fieldname !== 'currency');
  return (
    <div className="flex py-3 border-b-2 border-border mb-2 items-end pl-4">
      <h3 className="text-lg font-semibold min-w-[250px] flex-1 shrink-0">{title}</h3>
      <div className="flex gap-4 pr-4">
        {valueColumns.map(col => (
          <span key={col.fieldname} className="text-xs font-semibold uppercase text-muted-foreground text-right shrink-0 w-[120px]">
            {col.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const SectionRow = ({ row, columns }: { row: any; columns: any[] }) => {
  const name = row.account_name ?? row.account ?? '';
  const indent = (row.indent ?? 0) * 16;
  const isGroup = row.is_group;

  const valueColumns = columns.filter(c => c.fieldname !== 'account' && c.fieldname !== 'account_name' && c.fieldname !== 'currency');

  return (
    <div
      className={`flex items-center py-3 border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors ${isGroup ? 'font-semibold' : ''}`}
      style={{ paddingLeft: `${(row.indent ?? 0) * 16 + 16}px` }}
    >
      <span className={`text-sm ${isGroup ? 'text-foreground' : 'text-muted-foreground'} min-w-[250px] truncate flex-1 shrink-0`}>
        {name || '—'}
      </span>
      <div className="flex gap-4 pr-4">
        {valueColumns.map(col => {
          const val = parseFloat(row[col.fieldname]) || 0;
          return (
            <span key={col.fieldname} className={`text-sm font-medium text-right shrink-0 w-[120px]`}>
              {val === 0 ? <span className="text-muted-foreground">-</span> : <span className={val > 0 ? 'text-green-600' : 'text-red-500'}>{formatCurrency(val)}</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const FinancialReports = () => {
  const [activeTab, setActiveTab] = useState<TabId>('pl');

  // ── Meta state ─────────────────────────────────────────────────────────────
  const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [company, setCompany] = useState('');
  const [fiscalYear, setFiscalYear] = useState('');
  const [fromFiscalYear, setFromFiscalYear] = useState('');
  const [toFiscalYear, setToFiscalYear] = useState('');
  const [periodicity, setPeriodicity] = useState<Periodicity>('Yearly');

  // Filter panel toggle
  const [showFilters, setShowFilters] = useState(false);
  const [showDateRange, setShowDateRange] = useState(false);

  // ── Report data state ──────────────────────────────────────────────────────
  const [plData, setPlData] = useState<ProfitLossSummary | null>(null);
  const [bsData, setBsData] = useState<BalanceSheetSummary | null>(null);
  const [tbData, setTbData] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load meta on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const loadMeta = async () => {
      setMetaLoading(true);
      try {
        const [fys, cos] = await Promise.all([getFiscalYears(), getCompanies()]);
        setFiscalYears(fys);
        setCompanies(cos);

        // Set sensible defaults
        if (cos.length > 0) setCompany(cos[0].name);
        if (fys.length > 0) {
          // Default to most recent fiscal year
          const latest = fys[fys.length - 1];
          setFiscalYear(latest.name);
          setFromFiscalYear(latest.name);
          setToFiscalYear(latest.name);
        }
      } catch (e: any) {
        console.error('Failed to load meta:', e);
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, []);

  // ── Fetch report when filters or tab changes ────────────────────────────────
  const fetchReport = useCallback(async () => {
    if (!company || !fiscalYear) return;

    setLoading(true);
    setError(null);

    // ── Resolve actual ISO dates from fiscal year objects ──────────────────
    // ERPNext financial_statements.py requires from_date + to_date as date
    // strings — fiscal year names alone are not enough (causes 417 error).
    const fromFYName = fromFiscalYear || fiscalYear;
    const toFYName = toFiscalYear || fiscalYear;
    const fromFY = fiscalYears.find(fy => fy.name === fromFYName);
    const toFY = fiscalYears.find(fy => fy.name === toFYName);

    // Ensure dates are always provided - ERPNext requires mandatory from_date/to_date
    const fromDate = fromFY?.year_start_date || `${new Date().getFullYear()}-01-01`;
    const toDate = toFY?.year_end_date || `${new Date().getFullYear()}-12-31`;

    const filters: ReportFilters = {
      company,
      fiscal_year: fiscalYear,
      from_fiscal_year: fromFYName,
      to_fiscal_year: toFYName,
      periodicity,
      // Resolved date strings — passed directly to report
      from_date: fromDate,   // ← required by financial_statements.py
      to_date: toDate,     // ← required by financial_statements.py
    };

    try {
      if (activeTab === 'pl') {
        const data = await getProfitAndLoss(filters, fiscalYears);
        setPlData(data);
      } else if (activeTab === 'bs') {
        const data = await getBalanceSheet(filters, fiscalYears);
        setBsData(data);
      } else {
        const data = await getTrialBalance(filters, fiscalYears);
        setTbData(data);
      }
    } catch (e: any) {
      console.error('Report error:', e);
      setError(e?.message ?? 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, company, fiscalYear, fromFiscalYear, toFiscalYear, periodicity, fiscalYears]);

  // Auto-fetch on tab/filter change (once meta is ready)
  useEffect(() => {
    if (!metaLoading && company && fiscalYear) {
      fetchReport();
    }
  }, [activeTab, company, fiscalYear, fromFiscalYear, toFiscalYear, periodicity, metaLoading]);

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    if (activeTab === 'tb' && tbData.length > 0) {
      // Trial Balance CSV
      const header = 'Account Name,Account Type,Debit,Credit\n';
      const rows = tbData
        .map(r => `"${r.account_name}","${r.account_type}",${r.debit},${r.credit}`)
        .join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trial-balance-${fiscalYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (activeTab === 'pl' && plData) {
      // Profit & Loss CSV
      const valueCols = (plData.columns || []).filter(c => c.fieldname !== 'account' && c.fieldname !== 'account_name' && c.fieldname !== 'currency');
      const header = 'Account,' + valueCols.map(c => `"${c.label}"`).join(',') + '\n';
      const allRows = [
        ...plData.revenue_rows.map(r => `"${r.account_name || r.account || ''}",` + valueCols.map(c => r[c.fieldname] || 0).join(',')),
        ...plData.expense_rows.map(r => `"${r.account_name || r.account || ''}",` + valueCols.map(c => r[c.fieldname] || 0).join(','))
      ];
      const rows = allRows.join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profit-loss-${fiscalYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (activeTab === 'bs' && bsData) {
      // Balance Sheet CSV
      const valueCols = (bsData.columns || []).filter(c => c.fieldname !== 'account' && c.fieldname !== 'account_name' && c.fieldname !== 'currency');
      const header = 'Account,' + valueCols.map(c => `"${c.label}"`).join(',') + '\n';
      const allRows = [
        ...bsData.asset_rows.map(r => `"${r.account_name || r.account || ''}",` + valueCols.map(c => r[c.fieldname] || 0).join(',')),
        ...bsData.liability_rows.map(r => `"${r.account_name || r.account || ''}",` + valueCols.map(c => r[c.fieldname] || 0).join(',')),
        ...bsData.equity_rows.map(r => `"${r.account_name || r.account || ''}",` + valueCols.map(c => r[c.fieldname] || 0).join(','))
      ];
      const rows = allRows.join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `balance-sheet-${fiscalYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Fallback to print if no data
      window.print();
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const renderPL = () => {
    if (!plData) return null;
    const { total_revenue, total_expenses, net_income, revenue_rows, expense_rows } = plData;

    return (
      <>
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground font-medium">Total Revenue</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(total_revenue)}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground font-medium">Total Expenses</span>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(total_expenses)}</div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground font-medium">Net Income</span>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className={`text-2xl font-bold ${net_income >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {formatCurrency(net_income)}
            </div>
          </div>
        </div>

        {/* Print button */}
        <div className="flex justify-end mb-4">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        {/* Revenue section */}
        <div className="bg-card border border-border rounded-lg p-5 mb-5 w-full">
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <SectionHeader title="Revenue" columns={plData.columns || []} />
              {revenue_rows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No revenue data for this period.</p>
              ) : (
                revenue_rows.map((row, i) => <SectionRow key={i} row={row} columns={plData.columns || []} />)
              )}
              {revenue_rows.length > 0 && (
                <div className="flex items-center pt-3 mt-1 border-t-2 border-border font-bold text-sm pl-4 pr-4">
                  <span className="min-w-[250px] flex-1">Total Revenue</span>
                  <div className="flex gap-4">
                    {(plData.columns || []).filter(c => c.fieldname !== 'account' && c.fieldname !== 'account_name' && c.fieldname !== 'currency').map(col => {
                      const val = revenue_rows.filter(r => !r.is_group).reduce((s, r) => s + (parseFloat(r[col.fieldname]) || 0), 0);
                      return <span key={col.fieldname} className="text-green-600 shrink-0 w-[120px] text-right">{val === 0 ? '-' : formatCurrency(val)}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expenses section */}
        {expense_rows.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-5 mb-5 w-full">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <SectionHeader title="Expenses" columns={plData.columns || []} />
                {expense_rows.map((row, i) => <SectionRow key={i} row={row} columns={plData.columns || []} />)}
                <div className="flex items-center pt-3 mt-1 border-t-2 border-border font-bold text-sm pl-4 pr-4">
                  <span className="min-w-[250px] flex-1">Total Expenses</span>
                  <div className="flex gap-4">
                    {(plData.columns || []).filter(c => c.fieldname !== 'account' && c.fieldname !== 'account_name' && c.fieldname !== 'currency').map(col => {
                      const val = expense_rows.filter(r => !r.is_group).reduce((s, r) => s + (parseFloat(r[col.fieldname]) || 0), 0);
                      return <span key={col.fieldname} className="text-red-500 shrink-0 w-[120px] text-right">{val === 0 ? '-' : formatCurrency(val)}</span>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Net income banner */}
        <div className={`rounded-lg p-4 border-2 flex justify-between items-center font-bold ${net_income >= 0
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
          }`}>
          <span>{net_income >= 0 ? 'Net Profit' : 'Net Loss'}</span>
          <span className="text-xl">{formatCurrency(Math.abs(net_income))}</span>
        </div>
      </>
    );
  };

  const renderBS = () => {
    if (!bsData) return null;
    const { total_assets, total_liabilities, asset_rows, liability_rows, equity_rows } = bsData;

    return (
      <>
        <div className="flex justify-end mb-4">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-card border border-border rounded-lg p-5 col-span-1 lg:col-span-2 shadow-sm w-full">
            <div className="overflow-x-auto">
              <div className="min-w-max">
                <div className="flex items-center gap-3 mb-2 px-4">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-400 text-white">
                    {formatCurrency(total_assets)}
                  </span>
                </div>
                <SectionHeader title="Assets" columns={bsData.columns || []} />
                {asset_rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No asset data.</p>
                ) : (
                  asset_rows.map((row, i) => <SectionRow key={i} row={row} columns={bsData.columns || []} />)
                )}
              </div>
            </div>
          </div>

          {/* Liabilities + Equity */}
          <div className="space-y-5 col-span-1 lg:col-span-2 w-full">
            <div className="bg-card border border-border rounded-lg p-5 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  <div className="flex items-center gap-3 mb-2 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-400 text-white">
                      {formatCurrency(total_liabilities)}
                    </span>
                  </div>
                  <SectionHeader title="Liabilities" columns={bsData.columns || []} />
                  {liability_rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No liability data.</p>
                  ) : (
                    liability_rows.map((row, i) => <SectionRow key={i} row={row} columns={bsData.columns || []} />)
                  )}
                </div>
              </div>
            </div>

            {equity_rows.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-5 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="min-w-max">
                    <SectionHeader title="Equity" columns={bsData.columns || []} />
                    {equity_rows.map((row, i) => <SectionRow key={i} row={row} columns={bsData.columns || []} />)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  const renderTB = () => {
    const totalDebit = tbData.reduce((s, r) => s + r.debit, 0);
    const totalCredit = tbData.reduce((s, r) => s + r.credit, 0);

    return (
      <>
        <div className="flex justify-end mb-4">
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-sm hover:bg-muted transition-colors">
            <Printer className="h-4 w-4" /> Print
          </button>
        </div>

        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-5">Trial Balance</h3>

          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <table className="w-full text-sm text-left">
                <thead className="border-b border-border">
                  <tr>
                    <th className="pb-3 font-semibold text-foreground">Account Name</th>
                    <th className="pb-3 font-semibold text-foreground">Account Type</th>
                    <th className="pb-3 font-semibold text-foreground text-right">Debit</th>
                    <th className="pb-3 font-semibold text-foreground text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {tbData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-muted-foreground">
                        No trial balance data for this period.
                      </td>
                    </tr>
                  )}
                  {tbData.map((row, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                      <td className="py-3 pr-4" style={{ paddingLeft: `${(row.indent ?? 0) * 16 + 4}px` }}>
                        {row.account_name}
                      </td>
                      <td className="py-3 pr-8">
                        {row.account_type ? (
                          <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
                            {row.account_type.toLowerCase()}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {row.debit > 0 ? formatCurrency(row.debit) : <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {row.credit > 0 ? formatCurrency(row.credit) : <span className="text-muted-foreground">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {tbData.length > 0 && (
                  <tfoot className="border-t-2 border-border font-bold bg-muted/30 text-sm">
                    <tr>
                      <td colSpan={2} className="py-3 pl-1">Totals</td>
                      <td className="py-3 text-right">{formatCurrency(totalDebit)}</td>
                      <td className="py-3 text-right">{formatCurrency(totalCredit)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Financial Reports</h1>

      <div className="bg-card border border-border rounded-lg p-6">

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Financial Reports</h2>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Date Range toggle */}
            <button
              onClick={() => setShowDateRange(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm transition-colors ${showDateRange
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              <Calendar className="h-4 w-4" /> Date Range
            </button>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm transition-colors ${showFilters
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-muted'
                }`}
            >
              <Filter className="h-4 w-4" /> Filter
            </button>

            {/* Export button */}
            <button
              onClick={handleExport}
              disabled={loading || (!plData && !bsData && !tbData.length)}
              className="flex items-center gap-1.5 px-3 py-2 border rounded-md text-sm transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
        </div>

        {/* ── Date Range panel ─────────────────────────────────────────── */}
        {showDateRange && (
          <div className="mb-5 p-4 bg-muted/30 border border-border rounded-lg">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Date Range — Fiscal Year
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Year</label>
                <select
                  value={fromFiscalYear}
                  onChange={e => setFromFiscalYear(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background text-sm"
                >
                  {fiscalYears.map(fy => (
                    <option key={fy.name} value={fy.name}>{fy.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Year</label>
                <select
                  value={toFiscalYear}
                  onChange={e => setToFiscalYear(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-background text-sm"
                >
                  {fiscalYears.map(fy => (
                    <option key={fy.name} value={fy.name}>{fy.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Filters panel ────────────────────────────────────────────── */}
        {showFilters && (
          <div className="mb-5 p-4 bg-muted/30 border border-border rounded-lg">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Filters
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Fiscal Year */}
              <div>
                <label className="block text-sm font-medium mb-1">Fiscal Year</label>
                <select
                  value={fiscalYear}
                  onChange={e => {
                    setFiscalYear(e.target.value);
                    // Keep date range in sync unless user has customised it
                    setFromFiscalYear(e.target.value);
                    setToFiscalYear(e.target.value);
                  }}
                  disabled={metaLoading}
                  className="w-full p-2 border border-border rounded-md bg-background text-sm disabled:opacity-50"
                >
                  {fiscalYears.map(fy => (
                    <option key={fy.name} value={fy.name}>{fy.name}</option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div>
                <label className="block text-sm font-medium mb-1">Company</label>
                <select
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  disabled={metaLoading}
                  className="w-full p-2 border border-border rounded-md bg-background text-sm disabled:opacity-50"
                >
                  {companies.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Periodicity */}
              <div>
                <label className="block text-sm font-medium mb-1">Periodicity</label>
                <select
                  value={periodicity}
                  onChange={e => setPeriodicity(e.target.value as Periodicity)}
                  className="w-full p-2 border border-border rounded-md bg-background text-sm"
                >
                  {PERIODICITIES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Apply button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading…' : 'Apply Filters'}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        <div className="flex border-b border-border mb-6">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Error banner ─────────────────────────────────────────────── */}
        {error && (
          <div className="mb-5 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Loading overlay ───────────────────────────────────────────── */}
        {loading && (
          <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading report…</span>
          </div>
        )}

        {/* ── Tab content ───────────────────────────────────────────────── */}
        {!loading && (
          <>
            {activeTab === 'pl' && (
              plData
                ? renderPL()
                : <p className="text-center text-muted-foreground py-12 text-sm">
                  Select filters and apply to load the Profit & Loss report.
                </p>
            )}

            {activeTab === 'bs' && (
              bsData
                ? renderBS()
                : <p className="text-center text-muted-foreground py-12 text-sm">
                  Select filters and apply to load the Balance Sheet report.
                </p>
            )}

            {activeTab === 'tb' && renderTB()}
          </>
        )}
      </div>
    </div>
  );
};

export default FinancialReports;
