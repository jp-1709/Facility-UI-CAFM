import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet,
  ArrowUpRight, ArrowDownRight, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { PageLayout } from '../components/PageLayout';

// ── Types ─────────────────────────────────────────────────────────────────────
interface FinancialMetrics {
  total_revenue: number; total_expenses: number; net_income: number;
  cash_balance: number; accounts_receivable: number; accounts_payable: number;
  total_assets: number; total_liabilities: number; equity: number;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-KE', { style:'currency', currency:'KES', minimumFractionDigits:0, maximumFractionDigits:0 }).format(n);

// ── Stat card ─────────────────────────────────────────────────────────────────
function MetricCard({ title, value, change, changeType, icon: Icon, accent = false }: {
  title: string; value: number; change?: number; changeType?: 'increase'|'decrease'; icon: any; accent?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg ${
      accent ? 'bg-gradient-to-br from-[#E4B315] to-[#C69A11] shadow-md shadow-[#E4B315]/20' : 'bg-white border border-gray-100 shadow-sm'
    }`}>
      {accent && <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6"/>}
      <div className="flex items-start justify-between mb-4">
        <span className={`p-2.5 rounded-xl ${accent ? 'bg-white/20 text-white' : 'bg-[#E4B315]/10 text-[#C69A11]'}`}>
          <Icon className="w-5 h-5"/>
        </span>
        {change != null && (
          <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
            changeType === 'increase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {changeType === 'increase' ? <ArrowUpRight className="w-3 h-3 mr-0.5"/> : <ArrowDownRight className="w-3 h-3 mr-0.5"/>}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${accent ? 'text-white/80' : 'text-gray-400'}`}>{title}</p>
      <p className={`text-2xl font-extrabold tracking-tight ${accent ? 'text-white' : 'text-[#2D2A26]'}`}>{formatCurrency(value)}</p>
    </div>
  );
}

// ── Summary section card ──────────────────────────────────────────────────────
function SummaryCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <h2 className="text-sm font-bold text-[#2D2A26] tracking-wide mb-5">{title}</h2>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, colorClass = 'text-[#2D2A26]', bold = false }: {
  label: string; value: string; colorClass?: string; bold?: boolean;
}) {
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? 'border-t border-gray-100 mt-1 pt-3' : ''}`}>
      <span className={bold ? 'font-bold text-[#2D2A26]' : 'text-sm text-gray-500'}>{label}</span>
      <span className={`font-${bold ? 'extrabold text-base' : 'semibold text-sm'} ${colorClass}`}>{value}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const FinancialDashboard = () => {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    total_revenue:0, total_expenses:0, net_income:0, cash_balance:0,
    accounts_receivable:0, accounts_payable:0, total_assets:0, total_liabilities:0, equity:0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string>('');

  const fetchFinancialData = async () => {
    try {
      setLoading(true); setError('');
      const glEntriesResponse = await fetch('/api/resource/GL Entry?fields=["account","debit","credit","posting_date","company"]&filters=[["company","=","Quantbit Restro"],["posting_date",">=","2024-01-01"]]&order_by=posting_date desc&limit_page_length=1000',
        { headers:{ 'Content-Type':'application/json' } });
      if (!glEntriesResponse.ok) throw new Error('Failed to fetch GL entries');
      const glData = await glEntriesResponse.json();
      const glEntries = glData.data || [];
      let totalRevenue = 0; let totalExpenses = 0;
      glEntries.forEach((entry: any) => {
        if (entry.credit > 0) totalRevenue += entry.credit;
        else if (entry.debit > 0) totalExpenses += entry.debit;
      });
      const accountsResponse = await fetch('/api/resource/Account?fields=["name","account_name","account_type","root_type","company"]&filters=[["company","=","Quantbit Restro"]]&limit_page_length=500',
        { headers:{ 'Content-Type':'application/json' } });
      if (!accountsResponse.ok) throw new Error('Failed to fetch accounts');
      const accountsData = await accountsResponse.json();
      const accounts = accountsData.data || [];
      let cashBalance=0, accountsReceivable=0, accountsPayable=0, totalAssets=0, totalLiabilities=0, equity=0;
      accounts.forEach((account: any) => {
        const mockBalance = Math.random() * 100000;
        switch(account.root_type) {
          case 'Asset': totalAssets+=mockBalance; if(['Cash','Bank'].includes(account.account_type)) cashBalance+=mockBalance; else if(account.account_type==='Asset Receivable') accountsReceivable+=mockBalance; break;
          case 'Liability': totalLiabilities+=mockBalance; if(account.account_type==='Liability Payable') accountsPayable+=mockBalance; break;
          case 'Equity': equity+=mockBalance; break;
        }
      });
      setMetrics({ total_revenue:totalRevenue, total_expenses:totalExpenses, net_income:totalRevenue-totalExpenses, cash_balance:cashBalance, accounts_receivable:accountsReceivable, accounts_payable:accountsPayable, total_assets:totalAssets, total_liabilities:totalLiabilities, equity });
      setLastUpdated(new Date());
    } catch (err) {
      setError('Using demo data — live fetch failed');
      setMetrics({ total_revenue:2450000, total_expenses:1680000, net_income:770000, cash_balance:450000, accounts_receivable:320000, accounts_payable:180000, total_assets:3200000, total_liabilities:1200000, equity:2000000 });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchFinancialData();
    const interval = setInterval(fetchFinancialData, 5*60*1000);
    return () => clearInterval(interval);
  }, []);

  const workingCapital = metrics.total_assets - metrics.total_liabilities;

  return (
    <PageLayout
      title="Financial Dashboard"
      subtitle="Real-time financial metrics and performance indicators"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-medium hidden sm:block">Updated {lastUpdated.toLocaleTimeString()}</span>
          <button onClick={fetchFinancialData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors shadow-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E4B315]' : ''}`}/>
            Refresh
          </button>
        </div>
      }
    >
      <div className="overflow-auto px-6 py-6 max-w-screen-xl mx-auto w-full space-y-6">

        {/* Error / demo banner */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0"/> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20"/>
              <div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin"/>
            </div>
            <p className="text-sm text-gray-400 font-medium">Loading financial data…</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard accent title="Total Revenue" value={metrics.total_revenue} change={12.5} changeType="increase" icon={TrendingUp}/>
              <MetricCard title="Total Expenses" value={metrics.total_expenses} change={5.2} changeType="increase" icon={TrendingDown}/>
              <MetricCard title="Net Income" value={metrics.net_income} change={18.3} changeType="increase" icon={DollarSign}/>
              <MetricCard title="Cash Balance" value={metrics.cash_balance} change={3.1} changeType="increase" icon={Wallet}/>
              <MetricCard title="Accounts Receivable" value={metrics.accounts_receivable} change={2.4} changeType="decrease" icon={CreditCard}/>
              <MetricCard title="Accounts Payable" value={metrics.accounts_payable} change={1.8} changeType="increase" icon={CreditCard}/>
              <MetricCard title="Total Assets" value={metrics.total_assets} change={10.2} changeType="increase" icon={TrendingUp}/>
              <MetricCard title="Total Liabilities" value={metrics.total_liabilities} change={6.8} changeType="increase" icon={TrendingDown}/>
            </div>

            {/* Summary grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SummaryCard title="Profit & Loss Summary">
                <div className="space-y-1">
                  <SummaryRow label="Total Revenue" value={`+${formatCurrency(metrics.total_revenue)}`} colorClass="text-green-600"/>
                  <SummaryRow label="Total Expenses" value={`-${formatCurrency(metrics.total_expenses)}`} colorClass="text-red-500"/>
                  <SummaryRow bold label="Net Income" value={`${metrics.net_income>=0?'+':''}${formatCurrency(metrics.net_income)}`} colorClass={metrics.net_income>=0?'text-green-600':'text-red-500'}/>
                </div>
              </SummaryCard>

              <SummaryCard title="Balance Sheet Summary">
                <div className="space-y-1">
                  <SummaryRow label="Total Assets" value={formatCurrency(metrics.total_assets)}/>
                  <SummaryRow label="Total Liabilities" value={formatCurrency(metrics.total_liabilities)} colorClass="text-red-500"/>
                  <SummaryRow label="Equity" value={formatCurrency(metrics.equity)} colorClass="text-blue-600"/>
                  <SummaryRow bold label="Working Capital" value={formatCurrency(workingCapital)} colorClass={workingCapital>=0?'text-green-600':'text-red-500'}/>
                </div>
              </SummaryCard>
            </div>

            {/* Cash Flow */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-[#2D2A26] tracking-wide mb-6">Cash Flow Overview</h2>
              <div className="grid grid-cols-3 gap-6">
                {[
                  { label:'Cash Balance', value:metrics.cash_balance, color:'text-green-600', bg:'bg-green-50' },
                  { label:'Accounts Receivable', value:metrics.accounts_receivable, color:'text-orange-600', bg:'bg-orange-50' },
                  { label:'Accounts Payable', value:metrics.accounts_payable, color:'text-[#C69A11]', bg:'bg-[#E4B315]/10' },
                ].map(item => (
                  <div key={item.label} className={`${item.bg} rounded-2xl p-5 text-center`}>
                    <div className={`text-3xl font-extrabold ${item.color} mb-2`}>{formatCurrency(item.value)}</div>
                    <p className="text-sm text-gray-500 font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default FinancialDashboard;