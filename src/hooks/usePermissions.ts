/**
 * usePermissions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Convenience hook — fast access to permissions AND data-level scope filters.
 *
 * Key export: `scope.filtersFor(doctype)` → Frappe filter array
 *
 * Per-role behaviour:
 *  Technician    → assigned_to = staffCode      (Work Orders, PPM Schedule)
 *                  name = staffCode              (Resource list — shows only self)
 *                  branch_code = branchCode      (Service Request, other branch docs)
 *  Supervisor    → assigned_to IN supervised[]  (Work Orders, PPM Schedule)
 *                  name IN supervised[]          (Resource list — shows team)
 *                  branch_code = branchCode      (Service Request, other branch docs)
 *  Branch Manager→ branch_code = branchCode     (all branch-aware doctypes)
 *                  branch_code = branchCode      (Resource list)
 *  Admin         → []  (no filter, full access)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canAccess, canCreate, canWrite } from "@/lib/permissions";
import type { ModuleKey, AccessLevel } from "@/lib/permissions";
import type { UserScope, ScopeRole } from "@/contexts/AuthContext";

export type FrappeFilter = [string, string, string | number | boolean];

// Doctypes that carry a branch_code field usable for branch-level scoping
const BRANCH_AWARE = new Set([
  "Work Orders",
  "Service Request",
  "Property",
  "Branch",
  "CFAM Asset",
]);

// Doctypes where assigned_to / technician filtering applies
const ASSIGNED_TO_AWARE = new Set([
  "Work Orders",
  "PPM Schedule",
]);

// ─── Filter builder ───────────────────────────────────────────────────────────

function buildFiltersFor(doctype: string, scope: UserScope): FrappeFilter[] {
  if (scope.scopeRole === "Admin") return [];
  if (!scope.hasLinkedResource) return [];

  // ── Technician ────────────────────────────────────────────────────────────
  if (scope.scopeRole === "Technician") {
    // Resource list: show only themselves in Scheduler Gantt / Calendar resource picker
    if (doctype === "Resource" && scope.staffCode) {
      return [["name", "=", scope.staffCode]];
    }
    // WO / PPM: filter by the assigned_to field (= Resource.name = staff_code)
    if (ASSIGNED_TO_AWARE.has(doctype) && scope.staffCode) {
      return [["assigned_to", "=", scope.staffCode]];
    }
    // Everything else with a branch_code: fall back to branch scope
    if (BRANCH_AWARE.has(doctype) && scope.branchCode) {
      return [["branch_code", "=", scope.branchCode]];
    }
    return [];
  }

  // ── Supervisor ────────────────────────────────────────────────────────────
  if (scope.scopeRole === "Supervisor") {
    const codes = scope.supervisedStaffCodes ?? [];

    // Resource list: show only supervised technicians in Gantt / pickers
    if (doctype === "Resource") {
      if (codes.length > 0) return [["name", "in", codes.join(",")]];
      // Supervisor with no linked technicians — show nothing rather than all
      return [["name", "=", "__no_technicians__"]];
    }
    // WO / PPM: filter by assigned_to IN supervised codes
    if (ASSIGNED_TO_AWARE.has(doctype)) {
      if (codes.length > 0) return [["assigned_to", "in", codes.join(",")]];
      return [["assigned_to", "=", "__no_technicians__"]];
    }
    // Branch-aware doctypes: use branch scope as fallback
    if (BRANCH_AWARE.has(doctype) && scope.branchCode) {
      return [["branch_code", "=", scope.branchCode]];
    }
    return [];
  }

  // ── Branch Manager ────────────────────────────────────────────────────────
  if (scope.scopeRole === "Branch Manager") {
    // Resource list: show all resources in the branch
    if (doctype === "Resource" && scope.branchCode) {
      return [["branch_code", "=", scope.branchCode]];
    }
    // All branch-aware doctypes: filter by branch
    if (BRANCH_AWARE.has(doctype) && scope.branchCode) {
      return [["branch_code", "=", scope.branchCode]];
    }
    // WO / PPM also carry branch_code
    if (ASSIGNED_TO_AWARE.has(doctype) && scope.branchCode) {
      return [["branch_code", "=", scope.branchCode]];
    }
    return [];
  }

  return [];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePermissions() {
  const { permissions, roles, user, isAuthenticated, userScope } = useAuth();

  const scope = useMemo(
    () => ({
      /**
       * Returns Frappe filters for `doctype` based on the current user's scope.
       * Merge into your existing filters:
       *   filters: [...myFilters, ...scope.filtersFor("Work Orders")]
       */
      filtersFor: (doctype: string): FrappeFilter[] =>
        buildFiltersFor(doctype, userScope),

      /** Scoping tier derived from roles */
      scopeRole: userScope.scopeRole as ScopeRole,

      /** True once all async lookups (Resource / Branch / supervised codes) completed */
      isResolved: userScope.isResolved,

      /**
       * True if a linked Resource or Branch doc was found.
       * False for Technicians/Supervisors with no Resource doc linked,
       * or Branch Managers with no Branch.user_id set.
       */
      hasLink: userScope.hasLinkedResource,

      /** Supervised technician staff codes — for Supervisor scope only */
      supervisedCodes: userScope.supervisedStaffCodes ?? [],

      /** Full raw scope object for components that need detailed inspection */
      raw: userScope,
    }),
    [userScope]
  );

  return {
    can:     (module: ModuleKey, minLevel?: AccessLevel) => canAccess(permissions, module, minLevel),
    canDo:   (module: ModuleKey) => canCreate(permissions, module),
    canEdit: (module: ModuleKey) => canWrite(permissions, module),
    level:   (module: ModuleKey): AccessLevel => permissions[module] ?? "none",
    hasRole: (...r: string[]) => r.some(x => roles.includes(x)),
    hasAnyRole: (list: string[]) => list.some(r => roles.includes(r)),
    scope,
    roles,
    user,
    isAuthenticated,
    permissions,
  };
}