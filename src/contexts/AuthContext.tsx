/**
 * AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the logged-in user's identity, Frappe roles,
 * and computed CAFM permissions.
 *
 * This version merges the robust permission-based checks with the standard
 * login/logout flow.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  mergeRolePermissions,
  canAccess,
  canCreate,
  canWrite,
  type AccessLevel,
  type ModuleKey,
} from "@/lib/permissions";
import { useNavigate } from "react-router-dom";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UserProfile {
  email: string;
  full_name: string;
  user_image?: string;
  user_type?: string;
  home_page?: string;
}

export interface AuthContextType {
  /** True while any Frappe call is still in-flight */
  loading: boolean;
  /** True once the initial auth check is complete (even if logged out) */
  initialized: boolean;
  /** null if not logged in or session expired */
  user: UserProfile | null;
  /** Exact role strings returned by Frappe (e.g. "Site Manager", "Technician") */
  roles: string[];
  /** Computed AccessLevel per ModuleKey */
  permissions: Record<ModuleKey, AccessLevel>;
  /** Is the user currently authenticated? */
  isAuthenticated: boolean;
  /** Error message from login or other auth operations */
  error: string | null;

  /** Action: Login */
  login: (credentials: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  /** Action: Logout */
  logout: () => Promise<void>;
  /** Action: Force a re-fetch (e.g. after an admin changes your role) */
  refreshUser: () => Promise<void>;
  /** Compatibility: Check auth manually */
  checkAuth: () => boolean;

  /** Permission Helper: Can user access module at minLevel? */
  can: (module: ModuleKey, minLevel?: AccessLevel) => boolean;
  /** Permission Helper: Can user create in module? */
  canDo: (module: ModuleKey) => boolean; // alias for canCreate
  /** Permission Helper: Can user write/edit in module? */
  canEdit: (module: ModuleKey) => boolean; // alias for canWrite
}

// ─── Context & Hook ──────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}

/** Alias for useAuthContext to maintain compatibility with existing hooks */
export { useAuthContext as useAuth };

// ─── Frappe API helpers ──────────────────────────────────────────────────────

const FRAPPE_BASE = typeof window !== "undefined" ? window.location.origin : "";

function csrf(): string {
  return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "";
}

async function frappeCall<T>(
  method: string,
  args?: Record<string, unknown>
): Promise<T> {
  const params = new URLSearchParams({
    cmd: method,
    ...Object.fromEntries(
      Object.entries(args ?? {}).map(([k, v]) => [k, String(v)])
    ),
  });
  const res = await fetch(`${FRAPPE_BASE}/api/method/${method}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Frappe-CSRF-Token": csrf(),
    },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Frappe call ${method} failed: ${res.status}`);
  const json = await res.json();
  return json.message as T;
}

async function frappeGetDoc<T>(
  doctype: string,
  name: string,
  fields: string[]
): Promise<T> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
  });
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(
      name
    )}?${params}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.status}`);
  return (await res.json()).data as T;
}

// ─── Role fetching ────────────────────────────────────────────────────────────

interface FrappeUserRole {
  role: string;
}

interface FrappeUserDoc {
  full_name: string;
  user_image?: string;
  user_type?: string;
  roles: FrappeUserRole[];
}

async function fetchUserRoles(
  email: string
): Promise<{ profile: UserProfile; roles: string[] }> {
  // Fetch profile and roles in parallel for better reliability and performance
  const [doc, userRoles] = await Promise.all([
    frappeGetDoc<FrappeUserDoc>("User", email, [
      "full_name",
      "user_image",
      "user_type",
    ]),
    frappeCall<string[]>("quantbit_facility_management.api.facility_user_management.fm_get_user_roles", {
      user_id: email
    }).catch(err => {
      console.error("Error fetching roles via fm_get_user_roles:", err);
      return [] as string[];
    })
  ]);

  return {
    profile: {
      email,
      full_name: doc.full_name ?? email,
      user_image: doc.user_image,
      user_type: doc.user_type,
    },
    roles: userRoles || [],
  };
}


// ─── Provider ─────────────────────────────────────────────────────────────────

const EMPTY_PERMS = {} as Record<ModuleKey, AccessLevel>;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Record<ModuleKey, AccessLevel>>(
    EMPTY_PERMS
  );
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const doFetch = useCallback(async (opts?: { background?: boolean }) => {
    if (!opts?.background) setLoading(true);
    try {
      // 1. Who is logged in?
      const email = await frappeCall<string>("frappe.auth.get_logged_user");
      if (!email || email === "Guest") {
        setUser(null);
        setRoles([]);
        setPermissions(EMPTY_PERMS);
        return;
      }

      // 2. Fetch their profile + roles
      const { profile, roles: userRoles } = await fetchUserRoles(email);
      const computedPerms = mergeRolePermissions(userRoles);

      setUser(profile);
      setRoles(userRoles);
      setPermissions(computedPerms);
      
      // Update localStorage for compatibility if needed
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user", JSON.stringify(profile));
    } catch (err) {
      // Session expired or network error → treat as logged out
      setUser(null);
      setRoles([]);
      setPermissions(EMPTY_PERMS);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  // Re-fetch when the tab regains focus (handles session expiry)
  useEffect(() => {
    const handleFocus = () => {
      doFetch({ background: true });
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [doFetch]);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${FRAPPE_BASE}/api/method/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            usr: credentials.email,
            pwd: credentials.password,
          }),
        });

        const data = await response.json();

        if (response.ok && data.message === "Logged In") {
          await doFetch(); // Populate roles/permissions immediately
          navigate("/dashboard", { replace: true });
          return { success: true };
        } else {
          const errorMessage = data.message || "Login failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred during login";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [doFetch, navigate]
  );

  const logout = useCallback(async () => {
    try {
      await fetch(`${FRAPPE_BASE}/api/method/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setRoles([]);
      setPermissions(EMPTY_PERMS);
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const checkAuth = useCallback(() => {
    return !!user;
  }, [user]);

  const can = useCallback(
    (module: ModuleKey, minLevel?: AccessLevel) =>
      canAccess(permissions, module, minLevel),
    [permissions]
  );
  const canDo = useCallback(
    (module: ModuleKey) => canCreate(permissions, module),
    [permissions]
  );
  const canEdit = useCallback(
    (module: ModuleKey) => canWrite(permissions, module),
    [permissions]
  );

  const value: AuthContextType = {
    loading,
    initialized,
    user,
    roles,
    permissions,
    isAuthenticated: !!user,
    error,
    login,
    logout,
    refreshUser: doFetch,
    checkAuth,
    can,
    canDo,
    canEdit,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
