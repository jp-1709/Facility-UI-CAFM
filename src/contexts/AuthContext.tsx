/**
 * AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for identity, Frappe roles, permissions, and
 * data-level scope for all four CAFM roles:
 *
 *  Technician    → WOs/PPM assigned to themselves only
 *  Supervisor    → WOs/PPM assigned to their supervised technicians
 *                  (linked via Resource.supervisor_code)
 *  Branch Manager→ everything in their branch (linked via Branch.user_id)
 *  Admin         → unrestricted, no extra fetches at login
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode,
} from "react";
import {
  mergeRolePermissions, canAccess, canCreate, canWrite,
  type AccessLevel, type ModuleKey,
} from "@/lib/permissions";
import { useNavigate } from "react-router-dom";

// ─── Scope Types ─────────────────────────────────────────────────────────────

export type ScopeRole = "Technician" | "Supervisor" | "Branch Manager" | "Admin";

export interface UserScope {
  scopeRole: ScopeRole;
  /**
   * Resource.name (= staff_code). Used as the `assigned_to` value on WOs/PPM.
   * Set for Technician and Supervisor.
   */
  staffCode?: string;
  /**
   * branch_code. Set for Branch Manager (from Branch doc), and for
   * Technician/Supervisor if their Resource doc has branch_code.
   */
  branchCode?: string;
  /** Display name (resource_name or branch_name) */
  resourceName?: string;
  /**
   * Supervisor only: staff_codes of all technicians supervised by this user.
   * Fetched from Resources where supervisor_code = this supervisor's staffCode.
   */
  supervisedStaffCodes?: string[];
  /** True once all async lookups are done */
  isResolved: boolean;
  /** False means no linked Resource/Branch was found → warn + show no scoped data */
  hasLinkedResource: boolean;
}

const UNRESOLVED_SCOPE: UserScope = { scopeRole: "Admin", isResolved: false, hasLinkedResource: false };

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface UserProfile {
  email: string; full_name: string; user_image?: string; user_type?: string;
}

export interface AuthContextType {
  loading: boolean; initialized: boolean;
  user: UserProfile | null; roles: string[];
  permissions: Record<ModuleKey, AccessLevel>;
  userScope: UserScope;
  isAuthenticated: boolean; error: string | null;
  login: (c: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>; refreshUser: () => Promise<void>; checkAuth: () => boolean;
  can: (m: ModuleKey, l?: AccessLevel) => boolean;
  canDo: (m: ModuleKey) => boolean;
  canEdit: (m: ModuleKey) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
export { useAuthContext as useAuth };

// ─── Frappe helpers ───────────────────────────────────────────────────────────

const FRAPPE_BASE = typeof window !== "undefined" ? window.location.origin : "";
function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

async function frappeCall<T>(method: string, args?: Record<string, unknown>): Promise<T> {
  const params = new URLSearchParams({
    cmd: method,
    ...Object.fromEntries(Object.entries(args ?? {}).map(([k, v]) => [k, String(v)])),
  });
  const res = await fetch(`${FRAPPE_BASE}/api/method/${method}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Frappe-CSRF-Token": csrf() },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`${method} failed: ${res.status}`);
  return (await res.json()).message as T;
}

async function frappeGetDoc<T>(doctype: string, name: string, fields: string[]): Promise<T> {
  const params = new URLSearchParams({ fields: JSON.stringify(fields) });
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}?${params}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.status}`);
  return (await res.json()).data as T;
}

async function frappeList<T>(
  doctype: string, fields: string[], filters: [string, string, string | number][]
): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: "200",
  });
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`LIST ${doctype} failed: ${res.status}`);
  return (await res.json()).data as T[];
}

// ─── Role & profile helpers ───────────────────────────────────────────────────

async function fetchUserRoles(email: string): Promise<{ profile: UserProfile; roles: string[] }> {
  const [doc, userRoles] = await Promise.all([
    frappeGetDoc<{ full_name: string; user_image?: string; user_type?: string }>(
      "User", email, ["full_name", "user_image", "user_type"]
    ),
    frappeCall<string[]>(
      "quantbit_facility_management.api.facility_user_management.fm_get_user_roles",
      { user_id: email }
    ).catch(err => { console.error("fm_get_user_roles:", err); return [] as string[]; }),
  ]);
  return {
    profile: { email, full_name: doc.full_name ?? email, user_image: doc.user_image, user_type: doc.user_type },
    roles: userRoles || [],
  };
}

// ─── Scope resolution ─────────────────────────────────────────────────────────

interface ResourceDoc { name: string; staff_code: string; branch_code: string; branch_name: string; resource_name: string; }
interface BranchDoc   { name: string; branch_code: string; branch_name: string; }

function deriveScopeRole(roles: string[]): ScopeRole {
  // Check for admin roles first (case-insensitive)
  const adminRoles = ["System Manager", "Administrator", "Admin", "System Administrator"];
  if (roles.some(role => adminRoles.some(admin => role.toLowerCase() === admin.toLowerCase()))) {
    return "Admin";
  }
  if (roles.includes("Technician"))    return "Technician";
  if (roles.includes("Supervisor"))    return "Supervisor";
  if (roles.includes("Branch Manager")) return "Branch Manager";
  return "Admin";
}

async function fetchLinkedResource(email: string): Promise<ResourceDoc | null> {
  try {
    const rows = await frappeList<ResourceDoc>(
      "Resource",
      ["name", "staff_code", "branch_code", "branch_name", "resource_name"],
      [["user_id", "=", email]]
    );
    return rows[0] ?? null;
  } catch { return null; }
}

async function fetchLinkedBranch(email: string): Promise<BranchDoc | null> {
  try {
    const rows = await frappeList<BranchDoc>(
      "Branch",
      ["name", "branch_code", "branch_name"],
      [["user_id", "=", email]]
    );
    return rows[0] ?? null;
  } catch { return null; }
}

/**
 * Fetch staff codes of all active technicians whose supervisor_code = supervisorCode.
 * This is how we know which technicians a Supervisor is responsible for.
 */
async function fetchSupervisedStaffCodes(supervisorCode: string): Promise<string[]> {
  try {
    const rows = await frappeList<{ name: string }>(
      "Resource", ["name"],
      [["supervisor_code", "=", supervisorCode], ["is_active", "=", 1]]
    );
    return rows.map(r => r.name);
  } catch { return []; }
}

async function resolveUserScope(email: string, roles: string[]): Promise<UserScope> {
  const scopeRole = deriveScopeRole(roles);

  // Admin — no restriction, skip network calls
  if (scopeRole === "Admin") {
    return { scopeRole, isResolved: true, hasLinkedResource: true };
  }

  // Branch Manager — identified via Branch.user_id (not Resource)
  if (scopeRole === "Branch Manager") {
    const branch = await fetchLinkedBranch(email);
    if (!branch) {
      console.warn(`[Scope] Branch Manager "${email}" has no Branch with user_id set.`);
      return { scopeRole, isResolved: true, hasLinkedResource: false };
    }
    return {
      scopeRole,
      branchCode: branch.name,   // Branch.name = branch_code (autoname by field)
      resourceName: branch.branch_name,
      isResolved: true,
      hasLinkedResource: true,
    };
  }

  // Technician / Supervisor — identified via Resource.user_id
  const resource = await fetchLinkedResource(email);
  if (!resource) {
    console.warn(`[Scope] ${scopeRole} "${email}" has no Resource with user_id set.`);
    return { scopeRole, isResolved: true, hasLinkedResource: false };
  }

  if (scopeRole === "Technician") {
    return {
      scopeRole,
      staffCode: resource.name,
      branchCode: resource.branch_code,
      resourceName: resource.resource_name,
      isResolved: true,
      hasLinkedResource: true,
    };
  }

  // Supervisor — also load their supervised technician list
  const supervisedStaffCodes = await fetchSupervisedStaffCodes(resource.name);
  if (supervisedStaffCodes.length === 0) {
    console.warn(
      `[Scope] Supervisor "${resource.resource_name}" has no linked technicians. ` +
      "Open each technician's Resource record and set supervisor_code = this supervisor's staff_code."
    );
  }

  return {
    scopeRole,
    staffCode: resource.name,
    branchCode: resource.branch_code,
    resourceName: resource.resource_name,
    supervisedStaffCodes,
    isResolved: true,
    hasLinkedResource: true,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const EMPTY_PERMS = {} as Record<ModuleKey, AccessLevel>;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading]       = useState(true);
  const [initialized, setInit]      = useState(false);
  const [user, setUser]             = useState<UserProfile | null>(null);
  const [roles, setRoles]           = useState<string[]>([]);
  const [permissions, setPerms]     = useState<Record<ModuleKey, AccessLevel>>(EMPTY_PERMS);
  const [userScope, setUserScope]   = useState<UserScope>(UNRESOLVED_SCOPE);
  const [error, setError]           = useState<string | null>(null);
  const navigate = useNavigate();

  const doFetch = useCallback(async (opts?: { background?: boolean }) => {
    if (!opts?.background) setLoading(true);
    try {
      const email = await frappeCall<string>("frappe.auth.get_logged_user");
      if (!email || email === "Guest") {
        setUser(null); setRoles([]); setPerms(EMPTY_PERMS); setUserScope(UNRESOLVED_SCOPE);
        return;
      }
      const { profile, roles: userRoles } = await fetchUserRoles(email);
      const [computedPerms, scope] = await Promise.all([
        Promise.resolve(mergeRolePermissions(userRoles)),
        resolveUserScope(email, userRoles),
      ]);
      setUser(profile); setRoles(userRoles); setPerms(computedPerms); setUserScope(scope);
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(profile));
    } catch {
      setUser(null); setRoles([]); setPerms(EMPTY_PERMS); setUserScope(UNRESOLVED_SCOPE);
      localStorage.removeItem("isAuthenticated"); localStorage.removeItem("user");
    } finally { setLoading(false); setInit(true); }
  }, []);

  useEffect(() => { doFetch(); }, [doFetch]);
  useEffect(() => {
    const h = () => doFetch({ background: true });
    window.addEventListener("focus", h);
    return () => window.removeEventListener("focus", h);
  }, [doFetch]);

  const login = useCallback(async (credentials: { email: string; password: string }) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${FRAPPE_BASE}/api/method/login`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ usr: credentials.email, pwd: credentials.password }),
      });
      const data = await res.json();
      if (res.ok && data.message === "Logged In") {
        await doFetch(); navigate("/dashboard", { replace: true }); return { success: true };
      }
      const msg = data.message || "Login failed"; setError(msg); return { success: false, error: msg };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setError(msg); return { success: false, error: msg };
    } finally { setLoading(false); }
  }, [doFetch, navigate]);

  const logout = useCallback(async () => {
    try {
      await fetch(`${FRAPPE_BASE}/api/method/logout`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      });
    } catch { /* ignore */ }
    finally {
      setUser(null); setRoles([]); setPerms(EMPTY_PERMS); setUserScope(UNRESOLVED_SCOPE);
      localStorage.removeItem("isAuthenticated"); localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const can    = useCallback((m: ModuleKey, l?: AccessLevel) => canAccess(permissions, m, l), [permissions]);
  const canDo  = useCallback((m: ModuleKey) => canCreate(permissions, m), [permissions]);
  const canEdit = useCallback((m: ModuleKey) => canWrite(permissions, m), [permissions]);

  return (
    <AuthContext.Provider value={{
      loading, initialized: initialized, user, roles, permissions, userScope,
      isAuthenticated: !!user, error,
      login, logout, refreshUser: doFetch, checkAuth: () => !!user,
      can, canDo, canEdit,
    }}>
      {children}
    </AuthContext.Provider>
  );
}