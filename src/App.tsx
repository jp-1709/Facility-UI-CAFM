import { Route, Routes, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";

// ── Pages ───────────────────────────────────────────────────────────────────

// Auth
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Core
import Dashboard from "@/pages/Dashboard";
import WorkOrders from "@/pages/WorkOrders";
import Requests from "@/pages/Requests";
import Assets from "@/pages/Assets";
import Contracts from "@/pages/Contracts";
import IotDashboard from "@/pages/IotDashboard";

// Scheduling
import CalendarView from "@/pages/CalendarView";
import Scheduler from "@/pages/Scheduler";
import Locations from "@/pages/Locations";

// Reports
import Reporting from "@/pages/Reporting";
import RequestsReporting from "@/pages/RequestsReporting";
import TechnicianReporting from "@/pages/TechnicianReporting";
import ContractReporting from "@/pages/ContractReporting";
import AssetReporting from "@/pages/AssetReporting";

// Finance
import FinancialDashboard from "@/pages/FinancialDashboard";
import AccountsPayable from "@/pages/AccountsPayable";
import AccountsReceivable from "@/pages/AccountsReceivable";
import JournalEntry from "@/pages/JournalEntry";
import ChartOfAccounts from "@/pages/ChartOfAccounts";
import GLEntry from "@/pages/GLEntry";
import BankAccount from "@/pages/BankAccount";
import BankTransaction from "@/pages/BankTransaction";
import OpeningBalances from "@/pages/OpeningBalances";
import PettyCash from "@/pages/FinancialAccounting/PettyCash";
import TaxConfiguration from "@/pages/finance/TaxConfiguration";

// HR & Payroll
import HR from "@/pages/HR";
import StaffManagement from "@/pages/StaffManagement";
import Payroll from "@/pages/Payroll";
import Technicians from "@/pages/Technicians";

// Procurement & Inventory
import PurchaseOrders from "@/pages/PurchaseOrders";
import Suppliers from "@/pages/Suppliers";
import GoodsReceipts from "@/pages/GoodsReceipts";
import InventoryManagement from "@/pages/InventoryManagement";
import StockTracking from "@/pages/StockTracking";
import StockTransfers from "@/pages/StockTransfers";
import SupplierReturns from "@/pages/SupplierReturns";

// F&B / Hospitality
import Reservations from "@/pages/Reservations";
import RecipeManagement from "@/pages/RecipeManagement";
import Manufacturing from "@/pages/Manufacturing";

// Admin
import CategoriesManagement from "@/pages/CategoriesManagement";
import UnitsManagement from "@/pages/UnitsManagement";
import WorkspaceManagement from "@/pages/WorkspaceManagement";
import UserSetup from "@/pages/UserSetup";

// Misc
import PlaceholderPage from "@/pages/PlaceholderPage";

// ─── Application Routes ──────────────────────────────────────────────────────

const App = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes — need at least "login" for the layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          
          {/* Default redirect: "/" redirects to dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* ── Core Operations ─────────────────────────────────── */}
          <Route element={<ProtectedRoute module="dashboard" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/iot-dashboard" element={<IotDashboard />} />
          </Route>

          <Route element={<ProtectedRoute module="work_orders" />}>
            <Route path="/work-orders" element={<WorkOrders />} />
          </Route>


          <Route element={<ProtectedRoute module="requests" />}>
            <Route path="/requests" element={<Requests />} />
          </Route>

          <Route element={<ProtectedRoute module="assets" />}>
            <Route path="/assets" element={<Assets />} />
          </Route>

          <Route element={<ProtectedRoute module="contracts" />}>
            <Route path="/contracts" element={<Contracts />} />
          </Route>

          {/* ── Scheduling ──────────────────────────────────────── */}
          <Route element={<ProtectedRoute module="calendar" />}>
            <Route path="/calendar" element={<CalendarView />} />
          </Route>

          <Route element={<ProtectedRoute module="scheduler" />}>
            <Route path="/scheduler" element={<Scheduler />} />
          </Route>

          <Route element={<ProtectedRoute module="locations" />}>
            <Route path="/locations" element={<Locations />} />
          </Route>

          {/* ── Reports ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute module="reports" />}>
            <Route path="/reporting" element={<Reporting />} />
            <Route path="/reports" element={<Reporting />} />
            <Route path="/reports/wo-reports" element={<Reporting />} />
            <Route path="/reports/requests-reports" element={<RequestsReporting />} />
            <Route path="/reports/technician-reports" element={<TechnicianReporting />} />
            <Route path="/reports/contract-reports" element={<ContractReporting />} />
            <Route path="/reports/asset-reports" element={<AssetReporting />} />
            <Route path="/reports/sales-report" element={<PlaceholderPage title="Sales Report" />} />
            <Route path="/reports/vat-summary" element={<PlaceholderPage title="VAT Summary" />} />
          </Route>

          {/* ── Finance ─────────────────────────────────────────── */}
          <Route element={<ProtectedRoute module="financial_dashboard" />}>
            <Route path="/financial-dashboard" element={<FinancialDashboard />} />
            <Route path="/finance/accounting" element={<FinancialDashboard />} />
          </Route>

          <Route element={<ProtectedRoute module="accounts_payable" />}>
            <Route path="/accounts-payable" element={<AccountsPayable />} />
            <Route path="/finance/accounting/accounts-payable" element={<AccountsPayable />} />
          </Route>

          <Route element={<ProtectedRoute module="accounts_receivable" />}>
            <Route path="/accounts-receivable" element={<AccountsReceivable />} />
            <Route path="/finance/accounting/accounts-receivable" element={<AccountsReceivable />} />
          </Route>

          <Route element={<ProtectedRoute module="journal_entry" />}>
            <Route path="/journal-entry" element={<JournalEntry />} />
          </Route>

          <Route element={<ProtectedRoute module="chart_of_accounts" />}>
            <Route path="/chart-of-accounts" element={<ChartOfAccounts />} />
          </Route>

          <Route element={<ProtectedRoute module="gl_entry" />}>
            <Route path="/gl-entry" element={<GLEntry />} />
          </Route>

          <Route element={<ProtectedRoute module="bank_account" />}>
            <Route path="/bank-account" element={<BankAccount />} />
            <Route path="/bank-accounts" element={<BankAccount />} />
          </Route>

          <Route element={<ProtectedRoute module="bank_transaction" />}>
            <Route path="/bank-transaction" element={<BankTransaction />} />
            <Route path="/bank-transactions" element={<BankTransaction />} />
          </Route>

          <Route element={<ProtectedRoute module="opening_balances" />}>
            <Route path="/opening-balances" element={<OpeningBalances />} />
          </Route>

          <Route element={<ProtectedRoute module="petty_cash" />}>
            <Route path="/petty-cash" element={<PettyCash />} />
          </Route>

          <Route element={<ProtectedRoute module="tax_configuration" />}>
            <Route path="/tax-configuration" element={<TaxConfiguration />} />
          </Route>

          <Route path="/finance/accounting/corporate-billing" element={<PlaceholderPage title="Corporate Billing" />} />

          {/* ── HR & Payroll ─────────────────────────────────────── */}
          <Route element={<ProtectedRoute module="hr" />}>
            <Route path="/hr" element={<HR />} />
          </Route>

          <Route element={<ProtectedRoute module="staff_management" />}>
            <Route path="/staff-management" element={<StaffManagement />} />
          </Route>

          <Route element={<ProtectedRoute module="payroll" />}>
            <Route path="/payroll" element={<Payroll />} />
          </Route>

          <Route element={<ProtectedRoute module="hr" />}>
            <Route path="/technicians" element={<Technicians />} />
          </Route>

          {/* ── Procurement & Inventory ─────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            {/* Inventory routes use PageLayout directly (no AppSidebar) */}
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/categories" element={<CategoriesManagement />} />
            <Route path="/units" element={<UnitsManagement />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/goods-receipts" element={<GoodsReceipts />} />
            <Route path="/stock-tracking" element={<StockTracking />} />
            <Route path="/stock-transfers" element={<StockTransfers />} />
            <Route path="/supplier-returns" element={<SupplierReturns />} />
          </Route>

          {/* ── F&B ─────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute module="reservations" />}>
            <Route path="/reservations" element={<Reservations />} />
          </Route>

          <Route element={<ProtectedRoute module="recipe_management" />}>
            <Route path="/recipe-management" element={<RecipeManagement />} />
          </Route>

          <Route element={<ProtectedRoute module="manufacturing" />}>
            <Route path="/manufacturing" element={<Manufacturing />} />
          </Route>

          {/* ── Admin ───────────────────────────────────────────── */}
          <Route element={<ProtectedRoute module="categories_management" />}>
            <Route path="/categories" element={<CategoriesManagement />} />
          </Route>

          <Route element={<ProtectedRoute module="units_management" />}>
            <Route path="/units" element={<UnitsManagement />} />
          </Route>

          <Route element={<ProtectedRoute module="workspace_management" />}>
            <Route path="/workspaces" element={<WorkspaceManagement />} />
          </Route>

          <Route element={<ProtectedRoute module="user_setup" minLevel="full" />}>
            <Route path="/user-setup" element={<UserSetup />} />
            <Route path="/teams" element={<UserSetup />} />
          </Route>

          {/* Optional Support pages shared by all */}
          <Route path="/messages" element={<PlaceholderPage title="Messages" />} />
          <Route path="/procedures" element={<PlaceholderPage title="Procedure Library" />} />
          <Route path="/meters" element={<PlaceholderPage title="Meters" />} />
          <Route path="/vendors" element={<PlaceholderPage title="Vendors" />} />

        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
