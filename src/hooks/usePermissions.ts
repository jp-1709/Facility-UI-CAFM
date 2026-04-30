/**
 * usePermissions.ts
 * Convenience hook — gives any component fast access to the
 * current user's permissions without importing AuthContext directly.
 */

import { useAuth } from "@/contexts/AuthContext";
import { canAccess, canCreate, canWrite } from "@/lib/permissions";
import type { ModuleKey, AccessLevel } from "@/lib/permissions";

export function usePermissions() {
  const { permissions, roles, user, isAuthenticated } = useAuth();

  return {
    /** Check if user has at least `minLevel` on a module (default: "read") */
    can:     (module: ModuleKey, minLevel?: AccessLevel) =>
               canAccess(permissions, module, minLevel),
    /** Alias: user can create / take action (limited or above) */
    canDo:   (module: ModuleKey) => canCreate(permissions, module),
    /** Alias: user has full write access */
    canEdit: (module: ModuleKey) => canWrite(permissions, module),
    /** Raw access level for a module */
    level:   (module: ModuleKey): AccessLevel => permissions[module] ?? "none",
    /** Is any of these roles in the user's role list? */
    hasRole: (...rolesToCheck: string[]) =>
               rolesToCheck.some((r) => roles.includes(r)),
    /** True if the user holds at least one of the listed roles */
    hasAnyRole: (roleList: string[]) =>
               roleList.some((r) => roles.includes(r)),
    roles,
    user,
    isAuthenticated,
    permissions,
  };
}
