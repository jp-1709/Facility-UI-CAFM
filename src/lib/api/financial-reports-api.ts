import { frappeFetch } from '../frappe-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Periodicity = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly';

export interface ReportFilters {
  company: string;
  fiscal_year: string;          // e.g. "2025-2026"  — used as the "anchor" year
  from_fiscal_year?: string;    // Date Range start fiscal year name
  to_fiscal_year?: string;      // Date Range end   fiscal year name
  periodicity: Periodicity;
  // Resolved from FiscalYear objects — REQUIRED by ERPNext financial_statements.py
  from_date: string;           // year_start_date of from_fiscal_year  (YYYY-MM-DD)
  to_date: string;             // year_end_date   of to_fiscal_year    (YYYY-MM-DD)
  // Alternative names for ERPNext compatibility - some versions expect these
  period_start_date?: string;   // Same as from_date - for compatibility
  period_end_date?: string;     // Same as to_date - for compatibility
}

/** A single row returned by Frappe's query report engine */
export interface ReportRow {
  [key: string]: any;
  account?: string;
  account_name?: string;
  account_type?: string;
  indent?: number;
  is_group?: boolean;
}

export interface FinancialReportResult {
  columns: { label: string; fieldname: string; fieldtype: string }[];
  rows: ReportRow[];
  /** Available on P&L / Balance Sheet from report_summary */
  summary?: { label: string; value: number; indicator?: string }[];
}

export interface ProfitLossSummary {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  revenue_rows: ReportRow[];
  expense_rows: ReportRow[];
  columns: any[];
}

export interface BalanceSheetSummary {
  total_assets: number;
  total_liabilities: number;
  asset_rows: ReportRow[];
  liability_rows: ReportRow[];
  equity_rows: ReportRow[];
  columns: any[];
}

export interface TrialBalanceRow {
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  indent?: number;
}

export interface FiscalYear {
  name: string;
  year_start_date: string;
  year_end_date: string;
}

export interface CompanyOption {
  name: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs a standard ERPNext Script Report via frappe.desk.query_report.run.
 * This is the correct endpoint for Profit and Loss Statement, Balance Sheet,
 * and Trial Balance — all of which are script reports (not query reports).
 *
 * Response shape: { message: { result: [...], columns: [...], report_summary: [...] } }
 */
async function runReport(
  reportName: string,
  filters: Record<string, any>
): Promise<{ result: any[]; columns: any[]; report_summary?: any[] }> {
  const res = await frappeFetch('/api/method/frappe.desk.query_report.run', {
    method: 'POST',
    body: JSON.stringify({
      report_name: reportName,
      filters,
      // Prevent Frappe from trying to save user's last filter state
      ignore_prepared_report: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[${reportName}] report failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const msg = json.message ?? {};
  return {
    result: msg.result ?? [],
    columns: msg.columns ?? [],
    report_summary: msg.report_summary ?? [],
  };
}

/** GET /api/resource/<doctype> — reused from the same pattern as vat-api.ts */
async function getList(
  doctype: string,
  fields: string[],
  filters: any[] = [],
  limit = 100
): Promise<any[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
    order_by: 'creation asc',
  });
  const res = await frappeFetch(`/api/resource/${encodeURIComponent(doctype)}?${params}`);
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

/** Safely parse a numeric value from a Frappe report row cell */
function toNum(v: any): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta — Fiscal Years & Companies
// ─────────────────────────────────────────────────────────────────────────────

/** Fetch all available Fiscal Years for the dropdowns */
export const getFiscalYears = async (): Promise<FiscalYear[]> => {
  try {
    return await getList(
      'Fiscal Year',
      ['name', 'year_start_date', 'year_end_date'],
      [],
      50
    );
  } catch {
    return [];
  }
};

/** Fetch all Companies */
export const getCompanies = async (): Promise<CompanyOption[]> => {
  try {
    return await getList('Company', ['name'], [], 50);
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Profit & Loss Statement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the standard ERPNext "Profit and Loss Statement" report.
 *
 * ERPNext's financial_statements.py → get_period_list → validate_dates()
 * REQUIRES from_date and to_date as actual ISO date strings.
 * These are resolved from the FiscalYear objects passed in.
 *
 * Filters sent:
 *   company           — selected company
 *   from_fiscal_year  — fiscal year name for column header labels
 *   to_fiscal_year    — fiscal year name for column header labels
 *   from_date         — year_start_date of from_fiscal_year  ← MANDATORY
 *   to_date           — year_end_date   of to_fiscal_year    ← MANDATORY
 *   periodicity       — Monthly | Quarterly | Half-Yearly | Yearly
 */
export const getProfitAndLoss = async (
  filters: ReportFilters,
  fiscalYears: FiscalYear[] = []
): Promise<ProfitLossSummary> => {
  // ── Resolve from_date / to_date from FiscalYear objects ───────────────────
  const fromFYName = filters.from_fiscal_year ?? filters.fiscal_year;
  const toFYName = filters.to_fiscal_year ?? filters.fiscal_year;

  const fromFY = fiscalYears.find(fy => fy.name === fromFYName);
  const toFY = fiscalYears.find(fy => fy.name === toFYName);

  // If caller already resolved the dates, prefer those; otherwise use FY dates
  const fromDate = filters.from_date ?? fromFY?.year_start_date ?? `${new Date().getFullYear()}-01-01`;
  const toDate = filters.to_date ?? toFY?.year_end_date ?? `${new Date().getFullYear()}-12-31`;

  const { result, columns, report_summary } = await runReport('Profit and Loss Statement', {
    company: filters.company,
    from_fiscal_year: fromFYName,
    to_fiscal_year: toFYName,
    from_date: fromDate,   // ← required by financial_statements.py
    to_date: toDate,     // ← required by financial_statements.py
    // Alternative names for ERPNext compatibility
    period_start_date: fromDate,   // Some ERPNext versions expect this name
    period_end_date: toDate,     // Some ERPNext versions expect this name
    periodicity: filters.periodicity,
  });

  // ── Parse summary cards ────────────────────────────────────────────────────
  let total_revenue = 0;
  let total_expenses = 0;
  let net_income = 0;

  if (report_summary && report_summary.length > 0) {
    for (const s of report_summary) {
      const label = (s.label ?? '').toLowerCase();
      const val = toNum(s.value);
      if (label.includes('revenue') || label.includes('income')) total_revenue = val;
      if (label.includes('expense')) total_expenses = val;
      if (label.includes('profit') || label.includes('net')) net_income = val;
    }
    // Fallback: derive net income if not explicitly in summary
    if (net_income === 0) net_income = total_revenue - total_expenses;
  }

  // ── Separate rows into Revenue / Expense sections ─────────────────────────
  // Frappe P&L rows have a `parent_account` or the section header row has
  // account == "Income" / "Expense". We use account_type and row structure.
  const revenue_rows: ReportRow[] = [];
  const expense_rows: ReportRow[] = [];

  let currentSection: 'revenue' | 'expense' | null = null;

  for (const row of result) {
    // Skip empty/total rows that have no account name
    if (!row || (!row.account && !row.account_name)) continue;

    const name = (row.account_name ?? row.account ?? '').toLowerCase();
    const type = (row.account_type ?? row.root_type ?? '').toLowerCase();

    // Section detection via root_type / account_type
    if (type === 'income' || type === 'revenue') currentSection = 'revenue';
    else if (type === 'expense' || type === 'cost') currentSection = 'expense';
    // Frappe uses section header rows (is_group=true, indent=0) as dividers
    else if (name.includes('income') || name.includes('revenue')) currentSection = 'revenue';
    else if (name.includes('expense')) currentSection = 'expense';

    // Sum totals from leaf rows for fallback when report_summary is absent
    const isLeaf = !row.is_group;
    if (isLeaf) {
      // The "total" column name varies by periodicity; grab the last numeric value
      const rowTotal = extractRowTotal(row);
      if (currentSection === 'revenue') total_revenue += rowTotal;
      if (currentSection === 'expense') total_expenses += rowTotal;
    }

    if (currentSection === 'revenue') revenue_rows.push(row);
    else if (currentSection === 'expense') expense_rows.push(row);
  }

  // Prefer summary values when available (they're more accurate)
  if ((report_summary?.length ?? 0) === 0) {
    net_income = total_revenue - total_expenses;
  }

  return { total_revenue, total_expenses, net_income, revenue_rows, expense_rows, columns };
};

// ─────────────────────────────────────────────────────────────────────────────
// Balance Sheet
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the standard ERPNext "Balance Sheet" report.
 *
 * Same date requirement as P&L — financial_statements.py needs
 * from_date and to_date as ISO strings, not just fiscal year names.
 *
 * Filters sent:
 *   company           — selected company
 *   from_fiscal_year  — fiscal year name
 *   to_fiscal_year    — fiscal year name
 *   from_date         — year_start_date  ← MANDATORY
 *   to_date           — year_end_date    ← MANDATORY
 *   periodicity       — granularity
 */
export const getBalanceSheet = async (
  filters: ReportFilters,
  fiscalYears: FiscalYear[] = []
): Promise<BalanceSheetSummary> => {
  const fromFYName = filters.from_fiscal_year ?? filters.fiscal_year;
  const toFYName = filters.to_fiscal_year ?? filters.fiscal_year;

  const fromFY = fiscalYears.find(fy => fy.name === fromFYName);
  const toFY = fiscalYears.find(fy => fy.name === toFYName);

  const fromDate = filters.from_date ?? fromFY?.year_start_date ?? `${new Date().getFullYear()}-01-01`;
  const toDate = filters.to_date ?? toFY?.year_end_date ?? `${new Date().getFullYear()}-12-31`;

  const { result, columns, report_summary } = await runReport('Balance Sheet', {
    company: filters.company,
    from_fiscal_year: fromFYName,
    to_fiscal_year: toFYName,
    from_date: fromDate,   // ← required by financial_statements.py
    to_date: toDate,     // ← required by financial_statements.py
    // Alternative names for ERPNext compatibility
    period_start_date: fromDate,   // Some ERPNext versions expect this name
    period_end_date: toDate,     // Some ERPNext versions expect this name
    periodicity: filters.periodicity,
  });

  let total_assets = 0;
  let total_liabilities = 0;
  const asset_rows: ReportRow[] = [];
  const liability_rows: ReportRow[] = [];
  const equity_rows: ReportRow[] = [];

  // Parse summary
  if (report_summary && report_summary.length > 0) {
    for (const s of report_summary) {
      const label = (s.label ?? '').toLowerCase();
      const val = toNum(s.value);
      if (label.includes('asset')) total_assets = val;
      if (label.includes('liabilit')) total_liabilities = val;
    }
  }

  let currentSection: 'asset' | 'liability' | 'equity' | null = null;

  for (const row of result) {
    if (!row || (!row.account && !row.account_name)) continue;

    const type = (row.account_type ?? row.root_type ?? '').toLowerCase();
    const name = (row.account_name ?? row.account ?? '').toLowerCase();

    if (type === 'asset' || name.includes('asset')) currentSection = 'asset';
    else if (type === 'equity' || name.includes('equity')) currentSection = 'equity';
    else if (type === 'liability' || name.includes('liabilit')) currentSection = 'liability';

    const rowTotal = extractRowTotal(row);
    if (!row.is_group) {
      if (currentSection === 'asset') total_assets += rowTotal;
      if (currentSection === 'liability') total_liabilities += rowTotal;
    }

    if (currentSection === 'asset') asset_rows.push(row);
    else if (currentSection === 'liability') liability_rows.push(row);
    else if (currentSection === 'equity') equity_rows.push(row);
  }

  return { total_assets, total_liabilities, asset_rows, liability_rows, equity_rows, columns };
};

// ─────────────────────────────────────────────────────────────────────────────
// Trial Balance
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the standard ERPNext "Trial Balance" report.
 *
 * Filters applied:
 *   company      — selected company
 *   fiscal_year  — from filter's fiscal_year
 *   from_date    — first day of from_fiscal_year
 *   to_date      — last day of to_fiscal_year
 *
 * Returns rows with Account Name, Account Type, Debit, Credit.
 */
export const getTrialBalance = async (
  filters: ReportFilters,
  fiscalYears: FiscalYear[]
): Promise<TrialBalanceRow[]> => {
  // Resolve date range from fiscal year names
  const fromFY = fiscalYears.find(
    fy => fy.name === (filters.from_fiscal_year ?? filters.fiscal_year)
  );
  const toFY = fiscalYears.find(
    fy => fy.name === (filters.to_fiscal_year ?? filters.fiscal_year)
  );

  const fromDate = fromFY?.year_start_date ?? `${new Date().getFullYear()}-01-01`;
  const toDate = toFY?.year_end_date ?? `${new Date().getFullYear()}-12-31`;

  const { result } = await runReport('Trial Balance', {
    company: filters.company,
    fiscal_year: filters.fiscal_year,
    from_date: fromDate,
    to_date: toDate,
    // Alternative names for ERPNext compatibility
    period_start_date: fromDate,   // Some ERPNext versions expect this name
    period_end_date: toDate,     // Some ERPNext versions expect this name
    // Show all accounts (not just those with transactions)
    show_zero_values: 0,
  });

  return result
    .filter((row: any) => row && (row.account || row.account_name))
    .map((row: any): TrialBalanceRow => ({
      account_name: row.account_name ?? row.account ?? '',
      account_type: row.account_type ?? row.root_type ?? '',
      debit: toNum(row.debit ?? row.opening_debit ?? row.closing_debit),
      credit: toNum(row.credit ?? row.opening_credit ?? row.closing_credit),
      indent: row.indent ?? 0,
    }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extract the most-relevant total from a P&L / BS row
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Frappe report rows contain one column per period (e.g. "Apr 2025", "total").
 * We look for the "total" column first, then fall back to the last numeric field.
 */
function extractRowTotal(row: ReportRow): number {
  if (!row) return 0;

  // Explicit total columns Frappe uses
  for (const key of ['total', 'grand_total', 'net_total']) {
    if (key in row) return toNum(row[key]);
  }

  // Fall back: last numeric value in the row (periods go left-to-right, total is last)
  let last = 0;
  for (const val of Object.values(row)) {
    const n = toNum(val);
    if (n !== 0) last = n;
  }
  return last;
}
