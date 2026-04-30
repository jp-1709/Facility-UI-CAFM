// PageLayout.tsx
// Shared layout wrapper: collapsible app sidebar + top bar with back-to-EPOS button
// Used by Orders, FinancialDashboard, InventoryManagement, Reservations, etc.

import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  House, Store, Monitor, ChefHat, Wine, CreditCard,
  UtensilsCrossed, BookOpen, Factory, Calendar,
  Package, UsersRound, ChartColumn, Boxes, Truck,
  ShoppingCart, FileText, TrendingUp, DollarSign,
  Receipt, BarChart3, ArrowRightLeft, ArrowUpDown,
  ChevronDown, Building, Building2, PieChart, Users,
  ExternalLink, Banknote, Rocket, PanelLeftClose, PanelLeftOpen,
  Settings, UserCog, Tags, Ruler, Package2, PackageMinus,
  ClipboardList, TriangleAlert,
} from 'lucide-react';

// ─── Colour palette (matches app-sidebar.tsx) ─────────────────────────────────
const SECTION_COLORS: Record<string, {
  iconBg: string; headerOpen: string; headerHover: string;
  itemActive: string; itemHover: string; dot: string;
}> = {
  dashboard: { iconBg:'bg-[#E4B315]/15 text-[#C69A11]', headerOpen:'bg-[#E4B315]/10 border-[#E4B315]/30 text-[#2D2A26]', headerHover:'hover:bg-[#E4B315]/6 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-[#E4B315]/8 hover:text-[#C69A11]', dot:'bg-[#E4B315]' },
  pos:        { iconBg:'bg-orange-100 text-orange-600', headerOpen:'bg-orange-50 border-orange-200 text-[#2D2A26]', headerHover:'hover:bg-orange-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-orange-50 hover:text-orange-700', dot:'bg-orange-400' },
  restaurant: { iconBg:'bg-rose-100 text-rose-600', headerOpen:'bg-rose-50 border-rose-200 text-[#2D2A26]', headerHover:'hover:bg-rose-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-rose-50 hover:text-rose-700', dot:'bg-rose-400' },
  inventory:  { iconBg:'bg-emerald-100 text-emerald-600', headerOpen:'bg-emerald-50 border-emerald-200 text-[#2D2A26]', headerHover:'hover:bg-emerald-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-emerald-50 hover:text-emerald-700', dot:'bg-emerald-400' },
  hr:         { iconBg:'bg-indigo-100 text-indigo-600', headerOpen:'bg-indigo-50 border-indigo-200 text-[#2D2A26]', headerHover:'hover:bg-indigo-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-indigo-50 hover:text-indigo-700', dot:'bg-indigo-400' },
  finance:    { iconBg:'bg-teal-100 text-teal-600', headerOpen:'bg-teal-50 border-teal-200 text-[#2D2A26]', headerHover:'hover:bg-teal-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-teal-50 hover:text-teal-700', dot:'bg-teal-400' },
  reports:    { iconBg:'bg-purple-100 text-purple-600', headerOpen:'bg-purple-50 border-purple-200 text-[#2D2A26]', headerHover:'hover:bg-purple-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-purple-50 hover:text-purple-700', dot:'bg-purple-400' },
  events:     { iconBg:'bg-sky-100 text-sky-600', headerOpen:'bg-sky-50 border-sky-200 text-[#2D2A26]', headerHover:'hover:bg-sky-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-sky-50 hover:text-sky-700', dot:'bg-sky-400' },
  setup:      { iconBg:'bg-slate-100 text-slate-600', headerOpen:'bg-slate-50 border-slate-200 text-[#2D2A26]', headerHover:'hover:bg-slate-50/60 hover:text-[#2D2A26]', itemActive:'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/30', itemHover:'hover:bg-slate-50 hover:text-slate-700', dot:'bg-slate-400' },
};

// ─── Smooth animated section content ─────────────────────────────────────────
function SectionContent({ open, children }: { open: boolean; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [height, setHeight] = React.useState<number | 'auto'>(open ? 'auto' : 0);
  const [overflow, setOverflow] = React.useState<'hidden' | 'visible'>(open ? 'visible' : 'hidden');

  React.useEffect(() => {
    if (!ref.current) return;
    if (open) {
      setOverflow('hidden'); setHeight(ref.current.scrollHeight);
      const t = setTimeout(() => { setHeight('auto'); setOverflow('visible'); }, 300);
      return () => clearTimeout(t);
    } else {
      setOverflow('hidden'); setHeight(ref.current.scrollHeight);
      ref.current.getBoundingClientRect();
      const t = setTimeout(() => setHeight(0), 10);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <div ref={ref} style={{ height: height === 'auto' ? 'auto' : height, overflow, transition: 'height 280ms cubic-bezier(0.4,0,0.2,1)' }}>
      {children}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({ icon, label, href, external, badge, sectionId, collapsed }: {
  icon: React.ReactNode; label: string; href?: string; external?: boolean;
  badge?: string; sectionId: string; collapsed?: boolean;
}) {
  const location = useLocation();
  const colors = SECTION_COLORS[sectionId] ?? SECTION_COLORS.dashboard;
  const isActive = !external && href && (location.pathname === href);

  const baseClass = `group relative w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all duration-200 cursor-pointer select-none`;

  const content = (
    <>
      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-white/80" />}
      <span className={`flex items-center justify-center h-6 w-6 rounded-lg shrink-0 transition-all duration-200 ${isActive ? 'bg-white/20 text-white' : colors.iconBg}`}>
        {icon}
      </span>
      {!collapsed && (
        <>
          <span className={`flex-1 font-medium leading-none truncate transition-colors duration-150 ${isActive ? 'text-white' : 'text-foreground/75'}`}>{label}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-[#E4B315]/15 text-[#C69A11]'}`}>{badge}</span>
          )}
          {external && <ExternalLink className={`h-3 w-3 shrink-0 ${isActive ? 'text-white/70' : 'text-muted-foreground/50'}`} />}
        </>
      )}
    </>
  );

  if (external && href) return <li><a href={href} target="_blank" rel="noopener noreferrer" className={`${baseClass} ${isActive ? colors.itemActive : `${colors.itemHover} text-muted-foreground`}`} title={collapsed ? label : undefined}>{content}</a></li>;
  return <li><Link to={href || '/'} className={`${baseClass} ${isActive ? colors.itemActive : `${colors.itemHover} text-muted-foreground`}`} title={collapsed ? label : undefined}>{content}</Link></li>;
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ id, title, Icon, open, onToggle, hasActiveChild, children, collapsed }: {
  id: string; title: string; Icon: React.ElementType; open: boolean; onToggle: () => void;
  hasActiveChild: boolean; children: React.ReactNode; collapsed?: boolean;
}) {
  const colors = SECTION_COLORS[id] ?? SECTION_COLORS.dashboard;
  return (
    <div className="mb-1">
      <button type="button" onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer select-none border ${
          open ? colors.headerOpen : `border-transparent text-muted-foreground ${colors.headerHover}`
        }`}
        title={collapsed ? title : undefined}
      >
        <span className={`flex items-center justify-center h-6 w-6 rounded-lg shrink-0 transition-all duration-200 ${open || hasActiveChild ? colors.iconBg : 'bg-muted/60 text-muted-foreground'}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{title}</span>
            {!open && hasActiveChild && <span className={`h-1.5 w-1.5 rounded-full shrink-0 animate-pulse ${colors.dot}`} />}
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-280 ${open ? 'rotate-180' : 'rotate-0'}`} />
          </>
        )}
      </button>
      {!collapsed && (
        <SectionContent open={open}>
          <ul className="mt-0.5 space-y-0.5 px-1 pb-1 pt-0.5">{children}</ul>
        </SectionContent>
      )}
    </div>
  );
}

// ─── Inline Sidebar ───────────────────────────────────────────────────────────
interface InlineSidebarProps { collapsed: boolean; }

function InlineSidebar({ collapsed }: InlineSidebarProps) {
  const location = useLocation();
  const [open, setOpen] = React.useState<Record<string, boolean>>({
    dashboard:false, pos:false, restaurant:false, inventory:false,
    hr:false, finance:false, reports:false, events:false, setup:false,
  });

  // Auto-open the section matching current route
  React.useEffect(() => {
    const sectionPaths: Record<string, string[]> = {
      dashboard:  ['/dashboard'],
      pos:        ['/pos','/kot','/bar-display','/orders','/payment'],
      restaurant: ['/menu','/recipes','/manufacturing','/reservations'],
      inventory:  ['/inventory','/stock-transfers','/stock-tracking','/suppliers','/purchase-orders'],
      hr:         ['/hr','/staff-management','/workspace-management'],
      finance:    ['/payroll','/finance','/bank-accounts','/bank-transactions'],
      reports:    ['/reports'],
      events:     ['/events'],
      setup:      ['/branch-setup', '/restaurant-setup', '/user-setup', '/room-setup', '/table-setup'],
    };
    const active = Object.entries(sectionPaths).find(([,paths]) =>
      paths.some(p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p)))
    );
    if (active) setOpen(prev => ({ ...prev, [active[0]]: true }));
  }, [location.pathname]);

  // Check if current route is an inventory-related route
  const isInventoryRoute = [
    '/inventory','/categories','/units','/suppliers','/purchase-orders',
    '/goods-receipts','/supplier-returns','/stock-transfers','/stock-tracking',
    '/requisitions','/low-stock-alerts'
  ].some(
    path => location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
  );

  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  const sectionPaths: Record<string,string[]> = {
    dashboard:['/dashboard'], pos:['/pos','/kot','/bar-display','/orders','/payment'],
    restaurant:['/menu','/recipes','/manufacturing','/reservations'],
    inventory:['/inventory','/categories','/units','/suppliers','/purchase-orders','/goods-receipts','/supplier-returns','/stock-transfers','/stock-tracking','/requisitions','/low-stock-alerts'],
    'master-data':['/inventory','/categories','/units'],
    'suppliers-purchasing':['/suppliers','/purchase-orders','/goods-receipts','/supplier-returns'],
    'operations':['/stock-transfers','/stock-tracking'],
    'planning-control':['/requisitions','/low-stock-alerts'],
    hr:['/hr','/staff-management','/workspace-management'],
    finance:['/payroll','/finance','/bank-accounts','/bank-transactions'],
    reports:['/reports'], events:['/events'],
    setup:['/branch-setup', '/restaurant-setup', '/user-setup', '/room-setup', '/table-setup'],
  };
  const hasActive = (id: string) => (sectionPaths[id]??[]).some(p => location.pathname===p||(p!=='/'&&location.pathname.startsWith(p)));

  const w = collapsed ? 'w-14' : 'w-56';

  return (
    <div className={`${w} shrink-0 bg-sidebar border-r border-border flex flex-col h-full transition-all duration-300 overflow-hidden`}>
      {/* Brand */}
      <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-border/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-[#E4B315] to-[#C69A11] shadow-md shadow-[#E4B315]/25 shrink-0">
          <UtensilsCrossed className="h-3.5 w-3.5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            {/* <div className="text-sm font-extrabold tracking-tight text-[#2D2A26] leading-none">QuantPOS</div>
            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Restaurant ERP</div> */}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-thin scrollbar-thumb-[#E4B315]/20 scrollbar-track-transparent">
        <nav>
          {/* Show only inventory section when inventory route is active */}
          {isInventoryRoute ? (
            <>
              {/* Master Data Section */}
              <Section id="master-data" title="Master Data" Icon={Package} open={true} onToggle={() => toggle('master-data')} hasActiveChild={hasActive('master-data')} collapsed={collapsed}>
                <NavItem sectionId="master-data" icon={<Boxes className="h-3.5 w-3.5" />} label="Stock Items" href="/inventory" collapsed={collapsed} />
                <NavItem sectionId="master-data" icon={<Tags className="h-3.5 w-3.5" />} label="Categories" href="/categories" collapsed={collapsed} />
                <NavItem sectionId="master-data" icon={<Ruler className="h-3.5 w-3.5" />} label="Units" href="/units" collapsed={collapsed} />
              </Section>

              {/* Suppliers & Purchasing Section */}
              <Section id="suppliers-purchasing" title="Suppliers & Purchasing" Icon={Truck} open={true} onToggle={() => toggle('suppliers-purchasing')} hasActiveChild={hasActive('suppliers-purchasing')} collapsed={collapsed}>
                <NavItem sectionId="suppliers-purchasing" icon={<Truck className="h-3.5 w-3.5" />} label="Suppliers" href="/suppliers" collapsed={collapsed} />
                <NavItem sectionId="suppliers-purchasing" icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Purchase Orders" href="/purchase-orders" collapsed={collapsed} />
                <NavItem sectionId="suppliers-purchasing" icon={<Package2 className="h-3.5 w-3.5" />} label="Goods Receipts" href="/goods-receipts" collapsed={collapsed} />
                <NavItem sectionId="suppliers-purchasing" icon={<PackageMinus className="h-3.5 w-3.5" />} label="Supplier Returns" href="/supplier-returns" collapsed={collapsed} />
              </Section>

              {/* Operations Section */}
              <Section id="operations" title="Operations" Icon={ArrowRightLeft} open={true} onToggle={() => toggle('operations')} hasActiveChild={hasActive('operations')} collapsed={collapsed}>
                <NavItem sectionId="operations" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} label="Stock Transfers" href="/stock-transfers" collapsed={collapsed} />
                <NavItem sectionId="operations" icon={<TrendingUp className="h-3.5 w-3.5" />} label="Stock Tracking" href="/stock-tracking" collapsed={collapsed} />
              </Section>

              {/* Planning & Control Section */}
              <Section id="planning-control" title="Planning & Control" Icon={ClipboardList} open={true} onToggle={() => toggle('planning-control')} hasActiveChild={hasActive('planning-control')} collapsed={collapsed}>
                <NavItem sectionId="planning-control" icon={<FileText className="h-3.5 w-3.5" />} label="Requisitions" href="/requisitions" collapsed={collapsed} />
                <NavItem sectionId="planning-control" icon={<TriangleAlert className="h-3.5 w-3.5" />} label="Low Stock Alerts" href="/low-stock-alerts" collapsed={collapsed} />
              </Section>
            </>
          ) : (
            <>
              {/* <Section id="dashboard" title="Dashboard" Icon={House} open={open.dashboard} onToggle={() => toggle('dashboard')} hasActiveChild={hasActive('dashboard')} collapsed={collapsed}>
                <NavItem sectionId="dashboard" icon={<House className="h-3.5 w-3.5" />} label="Dashboard Home" href="/dashboard" badge="Home" collapsed={collapsed} />
                <NavItem sectionId="dashboard" icon={<Rocket className="h-3.5 w-3.5" />} label="CloudClic Landing" href="/dashboard/landing" collapsed={collapsed} />
              </Section> */}

              {/* <Section id="pos" title="Point of Sale" Icon={Store} open={open.pos} onToggle={() => toggle('pos')} hasActiveChild={hasActive('pos')} collapsed={collapsed}>
                <NavItem sectionId="pos" icon={<Monitor className="h-3.5 w-3.5" />} label="EPOS Terminal" href="" badge="POS" collapsed={collapsed} />
                <NavItem sectionId="pos" icon={<ChefHat className="h-3.5 w-3.5" />} label="Kitchen Order Ticket" href="/kot" collapsed={collapsed} />
                <NavItem sectionId="pos" icon={<Wine className="h-3.5 w-3.5" />} label="Bar Order" href="/bar-display" collapsed={collapsed} />
                <NavItem sectionId="pos" icon={<ChefHat className="h-3.5 w-3.5" />} label="Order Management" href="/orders" collapsed={collapsed} />
                <NavItem sectionId="pos" icon={<CreditCard className="h-3.5 w-3.5" />} label="Payment Processing" href="/payment" collapsed={collapsed} />
              </Section> */}

              {/* <Section id="restaurant" title="Restaurant Operations" Icon={UtensilsCrossed} open={open.restaurant} onToggle={() => toggle('restaurant')} hasActiveChild={hasActive('restaurant')} collapsed={collapsed}>
                <NavItem sectionId="restaurant" icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label="Menu Management" href="/menu" collapsed={collapsed} />
                <NavItem sectionId="restaurant" icon={<BookOpen className="h-3.5 w-3.5" />} label="Recipe Management" href="/recipes" collapsed={collapsed} />
                <NavItem sectionId="restaurant" icon={<Factory className="h-3.5 w-3.5" />} label="Manufacturing" href="/manufacturing" collapsed={collapsed} />
                <NavItem sectionId="restaurant" icon={<Calendar className="h-3.5 w-3.5" />} label="Reservations" href="/reservations" collapsed={collapsed} />
              </Section> */}

              <Section id="inventory" title="Inventory & Suppliers" Icon={Package} open={open.inventory} onToggle={() => toggle('inventory')} hasActiveChild={hasActive('inventory')} collapsed={collapsed}>
                <NavItem sectionId="inventory" icon={<Boxes className="h-3.5 w-3.5" />} label="Inventory" href="/inventory" collapsed={collapsed} />
                <NavItem sectionId="inventory" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} label="Stock Transfers" href="/stock-transfers" collapsed={collapsed} />
                <NavItem sectionId="inventory" icon={<TrendingUp className="h-3.5 w-3.5" />} label="Stock Tracking" href="/stock-tracking" collapsed={collapsed} />
                <NavItem sectionId="inventory" icon={<Truck className="h-3.5 w-3.5" />} label="Suppliers" href="/suppliers" collapsed={collapsed} />
                <NavItem sectionId="inventory" icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Purchase Orders" href="/purchase-orders" collapsed={collapsed} />
              </Section>

              <Section id="hr" title="Human Resources" Icon={UsersRound} open={open.hr} onToggle={() => toggle('hr')} hasActiveChild={hasActive('hr')} collapsed={collapsed}>
                <NavItem sectionId="hr" icon={<UsersRound className="h-3.5 w-3.5" />} label="HR Dashboard" href="/hr" collapsed={collapsed} />
                <NavItem sectionId="hr" icon={<Users className="h-3.5 w-3.5" />} label="Staff Management" href="/staff-management" collapsed={collapsed} />
                <NavItem sectionId="hr" icon={<Building className="h-3.5 w-3.5" />} label="Workspace Management" href="/workspace-management" collapsed={collapsed} />
              </Section>

              <Section id="finance" title="Finance & Accounting" Icon={Banknote} open={open.finance} onToggle={() => toggle('finance')} hasActiveChild={hasActive('finance')} collapsed={collapsed}>
                <NavItem sectionId="finance" icon={<UsersRound className="h-3.5 w-3.5" />} label="Payroll" href="/payroll" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<BarChart3 className="h-3.5 w-3.5" />} label="Financial Accounting" href="/finance/accounting" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<Building className="h-3.5 w-3.5" />} label="Bank Accounts" href="/bank-accounts" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<ArrowUpDown className="h-3.5 w-3.5" />} label="Bank Transactions" href="/bank-transactions" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<Receipt className="h-3.5 w-3.5" />} label="Accounts Payable" href="/finance/accounting/accounts-payable" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<DollarSign className="h-3.5 w-3.5" />} label="Accounts Receivable" href="/finance/accounting/accounts-receivable" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<Building2 className="h-3.5 w-3.5" />} label="Corporate Billing" href="/finance/accounting/corporate-billing" collapsed={collapsed} />
                <NavItem sectionId="finance" icon={<PieChart className="h-3.5 w-3.5" />} label="Loyalty Programme" href="/app/loyalty-program" external collapsed={collapsed} />
              </Section>

              <Section id="reports" title="Reports & Analytics" Icon={ChartColumn} open={open.reports} onToggle={() => toggle('reports')} hasActiveChild={hasActive('reports')} collapsed={collapsed}>
                <NavItem sectionId="reports" icon={<FileText className="h-3.5 w-3.5" />} label="Sales Report" href="/reports/sales-report" collapsed={collapsed} />
                <NavItem sectionId="reports" icon={<FileText className="h-3.5 w-3.5" />} label="VAT Summary" href="/reports/vat-summary" collapsed={collapsed} />
              </Section>

              {/* <Section id="events" title="Event Management" Icon={Calendar} open={open.events} onToggle={() => toggle('events')} hasActiveChild={hasActive('events')} collapsed={collapsed}>
                <NavItem sectionId="events" icon={<Calendar className="h-3.5 w-3.5" />} label="Calendar" href="/events/calendar" collapsed={collapsed} />
                <NavItem sectionId="events" icon={<FileText className="h-3.5 w-3.5" />} label="All Events" href="/events/all-events" collapsed={collapsed} />
                <NavItem sectionId="events" icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label="Menu Packages" href="/events/menu-packages" collapsed={collapsed} />
              </Section> */}

              {/* <Section id="setup" title="Set Up" Icon={Settings} open={open.setup} onToggle={() => toggle('setup')} hasActiveChild={hasActive('setup')} collapsed={collapsed}>
                <NavItem sectionId="setup" icon={<Building2 className="h-3.5 w-3.5" />} label="Branch Setup" href="/branch-setup" collapsed={collapsed} />
                <NavItem sectionId="setup" icon={<Store className="h-3.5 w-3.5" />} label="Restaurant Setup" href="/restaurant-setup" collapsed={collapsed} />
                <NavItem sectionId="setup" icon={<UserCog className="h-3.5 w-3.5" />} label="User Setup" href="/user-setup" collapsed={collapsed} />
                <NavItem sectionId="setup" icon={<Building className="h-3.5 w-3.5" />} label="Room Setup" href="/room-setup" collapsed={collapsed} />
                <NavItem sectionId="setup" icon={<UtensilsCrossed className="h-3.5 w-3.5" />} label="Table Setup" href="/table-setup" collapsed={collapsed} />
              </Section> */}
            </>
          )}
        </nav>
        <div className="h-6 shrink-0" />
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-3 py-3 border-t border-border/50">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-[#E4B315]/8">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#E4B315] to-[#C69A11] flex items-center justify-center shrink-0">
              <span className="text-white text-[9px] font-extrabold">Q</span>
            </div>
            {/* <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#2D2A26] truncate">QuantPOS Africa</div>
              <div className="text-[10px] text-muted-foreground truncate">v2.0 · Cloud ERP</div>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PageLayout ───────────────────────────────────────────────────────────────
interface PageLayoutProps {
  children: React.ReactNode;
  /** Page title shown in the top bar */
  title: string;
  /** Optional sub-title */
  subtitle?: string;
  /** Buttons / actions rendered in the top-bar right slot */
  actions?: React.ReactNode;
}

export const PageLayout: React.FC<PageLayoutProps> = ({ children, title, subtitle, actions }) => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/80">
      {/* Sidebar */}
      <InlineSidebar collapsed={collapsed} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="shrink-0 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-2 rounded-xl border border-gray-100 text-gray-500 hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-all shadow-sm shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          {/* Back to EPOS */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-100 text-sm font-semibold text-gray-600 hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-all shadow-sm shrink-0"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">EPOS</span>
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-extrabold text-[#2D2A26] tracking-tight leading-none truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-400 font-medium mt-0.5 truncate">{subtitle}</p>}
          </div>

          {/* Right actions */}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PageLayout;