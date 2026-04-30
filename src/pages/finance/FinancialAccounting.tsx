// FinancialAccounting.tsx
// Layout: PageLayout (app-wide sidebar + EPOS back + title in top bar)
//   └── Outlet content area (bg-gray-50/80, scrollable)

import React from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  PieChart, Wallet, Book, FileText, ArrowRightLeft,
  FileSpreadsheet, Receipt, Building2, Landmark, DollarSign,
  PiggyBank, BadgePercent, TrendingUp, LineChart,
} from 'lucide-react';
import { Settings } from 'lucide-react';
import { PageLayout } from '../../components/PageLayout';

// ─── Determine active view from URL ───────────────────────────────────────────
function useCurrentView() {
  const { pathname: p } = useLocation();
  if (p.includes('financial-dashboard'))  return 'financial-dashboard';
  if (p.includes('chart-of-accounts'))    return 'chart-of-accounts';
  if (p.includes('gl-entry'))             return 'gl-entry';
  if (p.includes('journal-entry'))        return 'journal-entry';
  if (p.includes('accounts-payable'))     return 'accounts-payable';
  if (p.includes('accounts-receivable'))  return 'accounts-receivable';
  if (p.includes('corporate-billing'))    return 'corporate-billing';
  if (p.includes('bank-accounts'))        return 'bank-accounts';
  if (p.includes('bank-transactions'))    return 'bank-transactions';
  if (p.includes('petty-cash'))           return 'petty-cash';
  if (p.includes('vat-manager'))          return 'vat-manager';
  if (p.includes('catering-levy'))        return 'catering-levy';
  if (p.includes('financial-reports'))    return 'financial-reports';
  if (p.includes('tax-configuration'))    return 'tax-configuration';
  if (p.includes('payment-analysis'))     return 'payment-analysis';
  if (p.includes('daily-sales-summary'))  return 'daily-sales-summary';
  if (p.includes('fixed-assets'))         return 'fixed-assets';
  if (p.includes('budgets'))              return 'budgets';
  if (p.includes('opening-balances'))     return 'opening-balances';
  return 'financial-dashboard';
}

// ─── Group section label ──────────────────────────────────────────────────────
const GroupLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-3 py-2 text-[10px] font-bold text-[#C69A11] uppercase tracking-widest">
    {children}
  </div>
);

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href?: string;
  view?: string;
  active: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, href, view, active, onClick }) => {
  const navigate = useNavigate();
  const handleClick = onClick || (() => {
    if (href) {
      navigate(href);
    } else if (view) {
      navigate(`/finance/accounting/${view}`);
    }
  });

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        aria-current={active ? 'page' : undefined}
        className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
          active
            ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/25'
            : 'text-gray-500 hover:bg-[#E4B315]/8 hover:text-[#C69A11]'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-white/80" />
        )}
        <span className={`flex items-center justify-center w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-[#C69A11]'}`}>
          {icon}
        </span>
        <span className="leading-none truncate">{label}</span>
      </button>
    </li>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const FinancialAccounting: React.FC = () => {
  const currentView = useCurrentView();

  const VALID_VIEWS = [
    'financial-dashboard', 'chart-of-accounts', 'gl-entry', 'journal-entry',
    'accounts-payable', 'bank-accounts', 'bank-transactions', 'petty-cash',
    'vat-manager', 'catering-levy', 'financial-reports', 'tax-configuration',
    'payment-analysis', 'budgets', 'fixed-assets', 'accounts-receivable',
    'corporate-billing', 'opening-balances', 'daily-sales-summary',
  ];

  return (
    <PageLayout
      title="Finance & Accounting"
      subtitle="Core accounting, receivables, payables and reporting"
    >
      <div className="flex h-full overflow-hidden">
        {/* ── Core Accounting sidebar ──────────────────────────────────────── */}
        <aside
          className="w-56 shrink-0 border-r border-gray-100 bg-white hidden md:flex flex-col sticky top-0 h-full z-10 overflow-y-auto"
          aria-label="Finance navigation"
        >
          <nav className="py-3 px-2 flex-1">

            {/* Core Accounting */}
            <div className="mb-3">
              <GroupLabel>Core Accounting</GroupLabel>
              <ul className="px-1 space-y-0.5">
                <NavItem icon={<PieChart className="h-4 w-4" />}    label="Dashboard"         href="/finance/accounting/financial-dashboard" active={currentView === 'financial-dashboard'} />
                <NavItem icon={<Wallet className="h-4 w-4" />}      label="Chart of Accounts" href="/finance/accounting/chart-of-accounts"    active={currentView === 'chart-of-accounts'} />
                <NavItem icon={<Book className="h-4 w-4" />}        label="General Ledger"    href="/finance/accounting/gl-entry"              active={currentView === 'gl-entry'} />
                <NavItem icon={<FileText className="h-4 w-4" />}    label="Journal Entries"   href="/finance/accounting/journal-entry"          active={currentView === 'journal-entry'} />
                <NavItem icon={<ArrowRightLeft className="h-4 w-4" />} label="Opening Balances" view="opening-balances"                        active={currentView === 'opening-balances'} />
              </ul>
            </div>

            {/* Receivables & Payables */}
            <div className="mb-3">
              <GroupLabel>Receivables &amp; Payables</GroupLabel>
              <ul className="px-1 space-y-0.5">
                <NavItem icon={<FileSpreadsheet className="h-4 w-4" />} label="Accounts Receivable" href="/finance/accounting/accounts-receivable"                active={currentView === 'accounts-receivable'} />
                <NavItem icon={<Receipt className="h-4 w-4" />}         label="Accounts Payable"    href="/finance/accounting/accounts-payable"                   active={currentView === 'accounts-payable'} />
                <NavItem icon={<Building2 className="h-4 w-4" />}       label="Corporate Billing"   href="/finance/accounting/corporate-billing"                  active={currentView === 'corporate-billing'} />
              </ul>
            </div>

            {/* Cash Management */}
            <div className="mb-3">
              <GroupLabel>Cash Management</GroupLabel>
              <ul className="px-1 space-y-0.5">
                <NavItem icon={<Landmark className="h-4 w-4" />}   label="Bank Accounts"     href="/finance/accounting/bank-accounts"        active={currentView === 'bank-accounts'} />
                <NavItem icon={<DollarSign className="h-4 w-4" />} label="Bank Transactions" href="/finance/accounting/bank-transactions"     active={currentView === 'bank-transactions'} />
                <NavItem icon={<PiggyBank className="h-4 w-4" />}  label="Petty Cash"        href="/finance/accounting/petty-cash"           active={currentView === 'petty-cash'} />
              </ul>
            </div>

            {/* Compliance & Reporting */}
            <div className="mb-3">
              <GroupLabel>Compliance &amp; Reporting</GroupLabel>
              <ul className="px-1 space-y-0.5">
                <NavItem icon={<BadgePercent className="h-4 w-4" />} label="VAT Manager"          href="/finance/accounting/vat-manager"           active={currentView === 'vat-manager'} />
                <NavItem icon={<TrendingUp className="h-4 w-4" />}   label="Catering Levy"        href="/finance/accounting/catering-levy"          active={currentView === 'catering-levy'} />
                <NavItem icon={<LineChart className="h-4 w-4" />}    label="Financial Reports"    href="/finance/accounting/financial-reports"      active={currentView === 'financial-reports'} />
                <NavItem icon={<PieChart className="h-4 w-4" />}     label="Payment Analysis"     href="/finance/accounting/payment-analysis"       active={currentView === 'payment-analysis'} />
                <NavItem icon={<TrendingUp className="h-4 w-4" />}   label="Daily Sales Summary"  href="/finance/accounting/daily-sales-summary"    active={currentView === 'daily-sales-summary'} />
              </ul>
            </div>

            {/* Assets & Budgeting */}
            <div className="mb-3">
              <GroupLabel>Assets &amp; Budgeting</GroupLabel>
              <ul className="px-1 space-y-0.5">
                <NavItem icon={<Building2 className="h-4 w-4" />} label="Fixed Assets" href="/finance/accounting/fixed-assets" active={currentView === 'fixed-assets'} />
                <NavItem icon={<LineChart className="h-4 w-4" />} label="Budgets"      href="/finance/accounting/budgets"       active={currentView === 'budgets'} />
              </ul>
            </div>

          </nav>
        </aside>

        {/* ── Outlet content area ─────────────────────────────────────────── */}
        <section className="flex-1 bg-gray-50/80 overflow-y-auto min-h-0">
          {VALID_VIEWS.includes(currentView) ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12 h-full">
              <Outlet />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-gray-400 flex-col gap-4">
              <Settings className="h-12 w-12 opacity-20" />
              <p className="text-sm font-medium">Module "{currentView}" is under construction.</p>
            </div>
          )}
        </section>

      </div>
    </PageLayout>
  );
};

export default FinancialAccounting;