/**
 * ProtectedRoute.tsx
 * ─────────────────────────────────────────────────────────────
 * Unified route protection with role-based access control.
 *
 * Usage:
 *   <ProtectedRoute module="work_orders" />           → need "read"
 *   <ProtectedRoute module="assets" minLevel="full" /> → need "full"
 *   <ProtectedRoute> ... </ProtectedRoute>            → backward compatible children wrap
 *   <ProtectedRoute />                                → only needs login (returns Outlet)
 * ─────────────────────────────────────────────────────────────
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldOff, AlertTriangle } from "lucide-react";
import type { ModuleKey, AccessLevel } from "@/lib/permissions";

interface ProtectedRouteProps {
  /** Optional: module key to check permissions for */
  module?: ModuleKey;
  /** Optional: minimum access level required (default: "read") */
  minLevel?: AccessLevel;
  /** Optional: children to render if authenticated */
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  module,
  minLevel = "read",
  children,
}) => {
  const { loading, initialized, isAuthenticated, can } = useAuth();
  const location = useLocation();

  // ── Splash while auth resolves ──────────────────────────────────────────
  if (!initialized || loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-background text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Verifying access…</p>
      </div>
    );
  }

  // ── Not logged in → redirect to /login ──────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── Logged in but insufficient module permission → 403 ──────────────────
  if (module && !can(module, minLevel)) {
    return <AccessDenied module={module} minLevel={minLevel} />;
  }

  // Return children if provided, otherwise the Outlet for nested routes
  return <>{children || <Outlet />}</>;
};

// ─── 403 Page ─────────────────────────────────────────────────────────────────
function AccessDenied({
  module,
  minLevel,
}: {
  module: ModuleKey;
  minLevel: AccessLevel;
}) {
  const { roles } = useAuth();
  const prettyModule = module
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-red-100/50 flex items-center justify-center">
          <ShieldOff className="w-9 h-9 text-red-500" />
        </div>
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-600 flex items-center justify-center border-4 border-background">
          <AlertTriangle className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      <div className="max-w-sm">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your current role{roles.length > 1 ? "s" : ""}{" "}
          <span className="font-semibold text-foreground">
            ({roles.slice(0, 3).join(", ")}
            {roles.length > 3 ? "…" : ""})
          </span>{" "}
          {roles.length === 1 ? "does" : "do"} not have{" "}
          <strong className="text-foreground">{minLevel}</strong> access to{" "}
          <strong className="text-foreground">{prettyModule}</strong>.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => window.history.back()}
          className="px-5 py-2.5 text-sm font-semibold border border-border rounded-xl hover:bg-muted transition-all active:scale-95"
        >
          Go Back
        </button>
        <a
          href="/dashboard"
          className="px-5 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95"
        >
          Dashboard
        </a>
      </div>

      <p className="text-xs text-muted-foreground/60">
        Contact your administrator to request additional access.
      </p>
    </div>
  );
}

export default ProtectedRoute;
