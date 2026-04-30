/**
 * AppSidebar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Navigation sidebar. Components are gated by the user's live permissions.
 * Maintains a collapsible design with tooltips for a streamlined UI.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard, ClipboardList, BarChart3, MessageSquare, Tag, Package, FileText,
  Gauge, MapPin, Users, Truck, HelpCircle, Inbox, CalendarDays,
  ChevronLeft, ChevronRight, Boxes, ArrowRightLeft, TrendingUp, ShoppingCart,
  DollarSign, UsersRound, Building, Banknote, ArrowUpDown, Receipt,
  Building2, LogOut, ChevronDown, Clock, Wrench, Shield, RefreshCw,
  Ruler, UserCog, Layers, BookOpen, Landmark, Scale, Wallet
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleKey } from "@/lib/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItemDef {
  label: string;
  path: string;
  icon: React.ElementType;
  module: ModuleKey;
}

interface NavGroupDef {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItemDef[];
  guardModule?: ModuleKey;
}

const Settings = (props: any) => <Wrench {...props} />;

// ─── Navigation Tree ─────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroupDef[] = [
  {
    id: "ops",
    label: "Operations",
    icon: Layers,
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
      { label: "Work Orders", path: "/work-orders", icon: ClipboardList, module: "work_orders" },
      { label: "Requests", path: "/requests", icon: Inbox, module: "requests" },

      { label: "Assets", path: "/assets", icon: Package, module: "assets" },
      { label: "Contracts", path: "/contracts", icon: FileText, module: "contracts" },
    ],
  },
  {
    id: "scheduling",
    label: "Scheduling",
    icon: CalendarDays,
    items: [
      { label: "Calendar", path: "/calendar", icon: CalendarDays, module: "calendar" },
      { label: "Scheduler", path: "/scheduler", icon: Clock, module: "scheduler" },
      { label: "Locations", path: "/locations", icon: MapPin, module: "locations" },
    ],
  },
  {
    id: "inventory",
    label: "Procurement",
    icon: Boxes,
    guardModule: "purchase_orders",
    items: [
      { label: "Inventory", path: "/inventory", icon: Boxes, module: "inventory_management" },
      { label: "Stock Transfers", path: "/stock-transfers", icon: ArrowRightLeft, module: "stock_transfers" },
      { label: "Stock Tracking", path: "/stock-tracking", icon: TrendingUp, module: "stock_tracking" },
      { label: "Suppliers", path: "/suppliers", icon: Truck, module: "suppliers" },
      { label: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart, module: "purchase_orders" },
    ],
  },
  {
    id: "hr",
    label: "HR & People",
    icon: UsersRound,
    guardModule: "hr",
    items: [
      { label: "HR Dashboard", path: "/hr", icon: UsersRound, module: "hr" },
      { label: "Staff", path: "/staff-management", icon: Users, module: "staff_management" },
      { label: "Technicians", path: "/technicians", icon: Wrench, module: "hr" },
      { label: "Workspaces", path: "/workspace-management", icon: Building, module: "workspace_management" },
      { label: "Payroll", path: "/payroll", icon: Banknote, module: "payroll" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    guardModule: "financial_dashboard",
    items: [
      { label: "Accounting", path: "/finance/accounting", icon: BarChart3, module: "financial_dashboard" },
      { label: "Bank Accounts", path: "/bank-accounts", icon: Building, module: "bank_account" },
      { label: "Bank Transactions", path: "/bank-transactions", icon: ArrowUpDown, module: "bank_transaction" },
      { label: "Payables", path: "/finance/accounting/accounts-payable", icon: Receipt, module: "accounts_payable" },
      { label: "Receivables", path: "/finance/accounting/accounts-receivable", icon: DollarSign, module: "accounts_receivable" },
      { label: "Corporate", path: "/finance/accounting/corporate-billing", icon: Building2, module: "financial_dashboard" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: BarChart3,
    items: [
      { label: "Reporting", path: "/reporting", icon: BarChart3, module: "reports" },
      { label: "WO Reports", path: "/reports/wo-reports", icon: FileText, module: "reports" },
      { label: "Requests Reports", path: "/reports/requests-reports", icon: MessageSquare, module: "reports" },
      { label: "Technician Reports", path: "/reports/technician-reports", icon: Wrench, module: "reports" },
      { label: "Contract Reports", path: "/reports/contract-reports", icon: Receipt, module: "reports" },
      { label: "Asset Reports", path: "/reports/asset-reports", icon: Package, module: "reports" },
      { label: "Sales Report", path: "/reports/sales-report", icon: FileText, module: "reports" },
      { label: "VAT Summary", path: "/reports/vat-summary", icon: FileText, module: "reports" },
    ],
  },
  {
    id: "admin",
    label: "Setup",
    icon: Settings,
    guardModule: "user_setup",
    items: [
      { label: "Categories", path: "/categories", icon: Tag, module: "categories_management" },
      { label: "Units", path: "/units", icon: Ruler, module: "units_management" },
      { label: "User Setup", path: "/teams", icon: UserCog, module: "user_setup" },
    ],
  },
  {
    id: "support",
    label: "Support",
    icon: HelpCircle,
    items: [
      { label: "Messages", path: "/messages", icon: MessageSquare, module: "dashboard" },
      { label: "Procedures", path: "/procedures", icon: FileText, module: "dashboard" },
      { label: "Meters", path: "/meters", icon: Gauge, module: "dashboard" },
      { label: "Vendors", path: "/vendors", icon: Truck, module: "dashboard" },
    ],
  },
];

// ─── Main Sidebar Component ──────────────────────────────────────────────────

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, roles, loading, refreshUser } = useAuth();
  const { can } = usePermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ ops: true, scheduling: true });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside
      className={`
        ${isCollapsed ? "w-[70px]" : "w-[240px]"} 
        transition-all duration-300 ease-in-out 
        bg-card border-r border-border flex flex-col h-full relative
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 w-6 h-6 bg-card border border-border rounded-full flex items-center justify-center z-50 hover:bg-accent text-muted-foreground transition-colors shadow-sm"
      >
        {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Logo Area */}
      <div className={`px-4 pt-6 pb-4 flex flex-col items-center border-b border-border/50 transition-all ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className={`
          ${isCollapsed ? "w-10 h-10 rounded-lg" : "w-12 h-12 rounded-xl"} 
          bg-primary flex items-center justify-center transition-all duration-300 shadow-lg shadow-primary/20
        `}>
          <span className={`${isCollapsed ? "text-xl" : "text-2xl"} text-primary-foreground font-black transition-all`}>Q</span>
        </div>
        {!isCollapsed && (
          <div className="mt-3 text-center">
            <p className="text-sm font-bold text-foreground leading-tight">Quantbit</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">Facility Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-none px-2 space-y-4">
          {NAV_GROUPS.map((group) => {
            // Check if group is visible
            if (group.guardModule && !can(group.guardModule)) return null;
            const visibleItems = group.items.filter(item => can(item.module));
            if (visibleItems.length === 0) return null;

            const isGroupOpen = openGroups[group.id];

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header (only when not collapsed) */}
                {!isCollapsed && (
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <group.icon className="w-3 h-3" />
                      {group.label}
                    </span>
                    {isGroupOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                )}

                {/* Divider for collapsed view */}
                {isCollapsed && <div className="border-t border-border/50 mx-2 my-2" />}

                {(isCollapsed || isGroupOpen) && (
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => {
                      const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
                      
                      const content = (
                        <button
                          key={item.path}
                          onClick={() => navigate(item.path)}
                          className={`
                            nav-item-base w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group
                            ${isActive 
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/10" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"} 
                            ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}
                          `}
                        >
                          <item.icon className={`${isCollapsed ? "w-5 h-5" : "w-4 h-4"} shrink-0 transition-transform group-hover:scale-110`} />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </button>
                      );

                      if (isCollapsed) {
                        return (
                          <Tooltip key={item.path}>
                            <TooltipTrigger asChild>
                              {content}
                            </TooltipTrigger>
                            <TooltipContent side="right" className="ml-2">
                              {item.label}
                            </TooltipContent>
                          </Tooltip>
                        );
                      }

                      return content;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </TooltipProvider>

      {/* User Area */}
      <div className={`border-t border-border p-3 transition-all duration-300`}>
        {!isCollapsed && user && (
          <div className="mb-4 px-2 py-2.5 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {user.full_name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{user.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <button 
                onClick={refreshUser} 
                disabled={loading}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Refresh session"
              >
                <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="flex flex-wrap gap-1 px-1">
              {roles.slice(0, 2).map(role => (
                <span key={role} className="px-1.5 py-0.5 rounded-md bg-background border border-border text-[9px] font-bold text-muted-foreground leading-tight">
                  {role}
                </span>
              ))}
              {roles.length > 2 && <span className="text-[9px] text-muted-foreground/60 font-bold ml-1">+{roles.length - 2}</span>}
            </div>
          </div>
        )}

        <button 
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            bg-red-500/5 hover:bg-red-500/10
            text-red-600 hover:text-red-700
            border border-red-500/10 hover:border-red-500/20
            text-sm font-bold transition-all duration-200
            ${isCollapsed ? "justify-center px-0 w-10 h-10 mx-auto" : ""}
          `}
        >
          <LogOut className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
