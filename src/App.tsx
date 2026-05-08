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
import Technicians from "@/pages/Scheduling/Technicians";
import TechnicianReporting from "@/pages/Scheduling/TechnicianReporting";
import ContractReporting from "@/pages/ContractReporting";
import AssetReporting from "@/pages/AssetReporting";


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

          <Route element={<ProtectedRoute module="hr" />}>
            <Route path="/technicians" element={<Technicians />} />
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


        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
