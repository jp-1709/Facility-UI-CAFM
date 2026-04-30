/**
 * permissions.ts
 * ─────────────────────────────────────────────────────────────
 * Single source-of-truth for the CAFM Role–Module access matrix.
 *
 * DESIGN PRINCIPLES
 *  • Nothing is hard-coded per user.  Every check uses the *roles*
 *    array returned live from Frappe for the logged-in user.
 *  • Roles are the exact strings stored in Frappe roles.
 *  • Module keys match the route slugs used in App.tsx / AppSidebar.
 *  • Access levels: "none" | "read" | "limited" | "full"
 *
 * HOW TO EXTEND
 *  1. Add the new module key to ModuleKey union type.
 *  2. Add a row in ROLE_MODULE_PERMISSIONS for each role.
 *  3. Add the sidebar item in AppSidebar.tsx referencing the module key.
 * ─────────────────────────────────────────────────────────────
 */

// ─── Access levels (ordered: none < read < limited < full) ──────────────────
export type AccessLevel = "none" | "read" | "limited" | "full";

// ─── Module keys (match route IDs) ──────────────────────────────────────────
export type ModuleKey =
  | "dashboard"
  | "work_orders"
  | "requests"
  | "assets"
  | "contracts"
  | "calendar"
  | "scheduler"
  | "locations"
  | "reports"
  | "financial_dashboard"
  | "accounts_payable"
  | "accounts_receivable"
  | "journal_entry"
  | "chart_of_accounts"
  | "gl_entry"
  | "bank_account"
  | "bank_transaction"
  | "opening_balances"
  | "petty_cash"
  | "tax_configuration"
  | "payroll"
  | "hr"
  | "staff_management"
  | "purchase_orders"
  | "suppliers"
  | "goods_receipts"
  | "inventory_management"
  | "stock_tracking"
  | "stock_transfers"
  | "supplier_returns"
  | "categories_management"
  | "units_management"
  | "workspace_management"
  | "menu_management"
  | "table_setup"
  | "reservations"
  | "recipe_management"
  | "user_setup"
  | "manufacturing";

// ─── Frappe role names (exact strings) ──────────────────────────────────────
export type CafmRole =
  | "Super Admin"
  | "Management Director"
  | "Head Operations"
  | "Branch Manager"
  | "Regional Manager"
  | "Site Manager"
  | "Supervisor"
  | "Technician"
  | "Finance Executive"
  | "Stores Purchase"
  | "Helpdesk"
  | "Client Admin"
  | "Client User"
  | "Vendor Contractor"
  // Frappe built-in roles that may also be present
  | "System Manager"
  | "Administrator";

// ─── Per-role module access matrix ──────────────────────────────────────────
/**
 * For every role, list the AccessLevel for each module.
 * Omitted entries default to "none".
 * Based on CAFM_Roles_Access_Matrix.docx
 */
export const ROLE_MODULE_PERMISSIONS: Record<
  CafmRole,
  Partial<Record<ModuleKey, AccessLevel>>
> = {
  // ── System / built-in ────────────────────────────────────────────────────
  "System Manager": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "full", calendar: "full", scheduler: "full", locations: "full",
    reports: "full", financial_dashboard: "full", accounts_payable: "full",
    accounts_receivable: "full", journal_entry: "full", chart_of_accounts: "full",
    gl_entry: "full", bank_account: "full", bank_transaction: "full",
    opening_balances: "full", petty_cash: "full", tax_configuration: "full",
    payroll: "full", hr: "full", staff_management: "full",
    purchase_orders: "full", suppliers: "full", goods_receipts: "full",
    inventory_management: "full", stock_tracking: "full", stock_transfers: "full",
    supplier_returns: "full", categories_management: "full", units_management: "full",
    workspace_management: "full", menu_management: "full", table_setup: "full",
    reservations: "full", recipe_management: "full", user_setup: "full",
    manufacturing: "full",
  },

  "Administrator": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "full", calendar: "full", scheduler: "full", locations: "full",
    reports: "full", financial_dashboard: "full", accounts_payable: "full",
    accounts_receivable: "full", journal_entry: "full", chart_of_accounts: "full",
    gl_entry: "full", bank_account: "full", bank_transaction: "full",
    opening_balances: "full", petty_cash: "full", tax_configuration: "full",
    payroll: "full", hr: "full", staff_management: "full",
    purchase_orders: "full", suppliers: "full", goods_receipts: "full",
    inventory_management: "full", stock_tracking: "full", stock_transfers: "full",
    supplier_returns: "full", categories_management: "full", units_management: "full",
    workspace_management: "full", menu_management: "full", table_setup: "full",
    reservations: "full", recipe_management: "full", user_setup: "full",
    manufacturing: "full",
  },

  // ── Super Admin — Full access to everything ───────────────────────────────
  "Super Admin": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "full", calendar: "full", scheduler: "full", locations: "full",
    reports: "full", financial_dashboard: "full", accounts_payable: "full",
    accounts_receivable: "full", journal_entry: "full", chart_of_accounts: "full",
    gl_entry: "full", bank_account: "full", bank_transaction: "full",
    opening_balances: "full", petty_cash: "full", tax_configuration: "full",
    payroll: "full", hr: "full", staff_management: "full",
    purchase_orders: "full", suppliers: "full", goods_receipts: "full",
    inventory_management: "full", stock_tracking: "full", stock_transfers: "full",
    supplier_returns: "full", categories_management: "full", units_management: "full",
    workspace_management: "full", menu_management: "full", table_setup: "full",
    reservations: "full", recipe_management: "full", user_setup: "full",
    manufacturing: "full",
  },

  // ── Management / Director — Read ops, full reporting, no user admin ───────
  "Management Director": {
    dashboard: "full", work_orders: "read", requests: "read", assets: "read",
    contracts: "read", calendar: "read", scheduler: "read", locations: "read",
    reports: "full", financial_dashboard: "full", accounts_payable: "read",
    accounts_receivable: "read", journal_entry: "read", chart_of_accounts: "read",
    gl_entry: "read", bank_account: "read", bank_transaction: "read",
    payroll: "read", hr: "read", staff_management: "read",
    purchase_orders: "read", suppliers: "read", goods_receipts: "read",
    inventory_management: "read", stock_tracking: "read",
    user_setup: "none",
  },

  // ── Head Operations — Full ops, limited billing ───────────────────────────
  "Head Operations": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "limited", calendar: "full", scheduler: "full", locations: "full",
    reports: "full", financial_dashboard: "read", accounts_payable: "read",
    accounts_receivable: "read", hr: "read", staff_management: "full",
    purchase_orders: "limited", suppliers: "limited", goods_receipts: "limited",
    inventory_management: "limited", stock_tracking: "read",
    payroll: "none", user_setup: "none", tax_configuration: "none",
  },

  // ── Branch Manager — Branch-scoped full ops ───────────────────────────────
  "Branch Manager": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "limited", calendar: "full", scheduler: "full", locations: "full",
    reports: "limited", financial_dashboard: "none", accounts_payable: "none",
    accounts_receivable: "none", hr: "read", staff_management: "full",
    purchase_orders: "limited", suppliers: "limited", goods_receipts: "limited",
    inventory_management: "limited", stock_tracking: "limited",
    payroll: "none", user_setup: "none",
  },

  // ── Regional Manager — Multi-branch oversight ─────────────────────────────
  "Regional Manager": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "limited", calendar: "full", scheduler: "full", locations: "full",
    reports: "limited", financial_dashboard: "none", hr: "read",
    staff_management: "limited", purchase_orders: "limited", suppliers: "limited",
    goods_receipts: "limited", inventory_management: "read", stock_tracking: "read",
    payroll: "none", user_setup: "none",
  },

  // ── Site Manager — PM schedules, vendors, attendance ─────────────────────
  "Site Manager": {
    dashboard: "full", work_orders: "full", requests: "full", assets: "full",
    contracts: "read", calendar: "full", scheduler: "full", locations: "full",
    reports: "limited", financial_dashboard: "none", hr: "read",
    staff_management: "limited", purchase_orders: "limited", suppliers: "limited",
    goods_receipts: "limited", inventory_management: "limited",
    payroll: "none", user_setup: "none", accounts_payable: "none",
    accounts_receivable: "none",
  },

  // ── Supervisor — Assign tasks, checklists ─────────────────────────────────
  "Supervisor": {
    dashboard: "full", work_orders: "limited", requests: "limited",
    assets: "read", calendar: "read", scheduler: "limited", locations: "read",
    reports: "limited", financial_dashboard: "none",
    inventory_management: "read", stock_tracking: "read",
    payroll: "none", user_setup: "none", contracts: "none",
    accounts_payable: "none", accounts_receivable: "none",
  },

  // ── Technician — Own jobs, photos, closure ────────────────────────────────
  "Technician": {
    dashboard: "limited", work_orders: "limited", requests: "read",
    assets: "read", calendar: "read", scheduler: "read", locations: "read",
    reports: "none", financial_dashboard: "none", contracts: "none",
    payroll: "none", user_setup: "none", accounts_payable: "none",
    accounts_receivable: "none", hr: "none", staff_management: "none",
    purchase_orders: "none", suppliers: "none",
  },

  // ── Finance Executive — Invoices, expenses, margin ───────────────────────
  "Finance Executive": {
    dashboard: "full", financial_dashboard: "full",
    accounts_payable: "full", accounts_receivable: "full",
    journal_entry: "full", chart_of_accounts: "full", gl_entry: "full",
    bank_account: "full", bank_transaction: "full", opening_balances: "full",
    petty_cash: "full", tax_configuration: "full",
    contracts: "read", reports: "full", work_orders: "read",
    requests: "read", assets: "read", purchase_orders: "read",
    suppliers: "read", goods_receipts: "read",
    payroll: "limited", hr: "read",
    user_setup: "none", scheduler: "none",
  },

  // ── Stores / Purchase — PO, GRN, stock ────────────────────────────────────
  "Stores Purchase": {
    dashboard: "limited", purchase_orders: "full", suppliers: "full",
    goods_receipts: "full", inventory_management: "full",
    stock_tracking: "full", stock_transfers: "full", supplier_returns: "full",
    work_orders: "limited", requests: "read", assets: "read",
    reports: "limited", financial_dashboard: "none",
    payroll: "none", user_setup: "none", contracts: "none",
    accounts_payable: "read", accounts_receivable: "none",
  },

  // ── Helpdesk — Ticket logging, updates ────────────────────────────────────
  "Helpdesk": {
    dashboard: "limited", requests: "full", work_orders: "limited",
    assets: "read", locations: "read", calendar: "read",
    reports: "limited", financial_dashboard: "none",
    contracts: "none", payroll: "none", user_setup: "none",
    accounts_payable: "none", accounts_receivable: "none",
    hr: "none", staff_management: "none",
  },

  // ── Client Admin — Own data, raise/view WOs, invoice view ────────────────
  "Client Admin": {
    dashboard: "limited", work_orders: "limited", requests: "full",
    assets: "read", contracts: "read", calendar: "read",
    reports: "limited", accounts_receivable: "read",
    financial_dashboard: "none", payroll: "none", user_setup: "none",
    scheduler: "none", hr: "none", staff_management: "none",
    accounts_payable: "none",
  },

  // ── Client User — Raise own requests, track complaints ───────────────────
  "Client User": {
    dashboard: "limited", requests: "limited", work_orders: "read",
    assets: "read", calendar: "read", reports: "limited",
    financial_dashboard: "none", payroll: "none", user_setup: "none",
    scheduler: "none", contracts: "none", hr: "none",
    staff_management: "none", accounts_payable: "none",
    accounts_receivable: "none",
  },

  // ── Vendor / Contractor — Assigned jobs, submit bills ────────────────────
  "Vendor Contractor": {
    dashboard: "limited", work_orders: "limited", requests: "read",
    assets: "read", calendar: "read", reports: "limited",
    financial_dashboard: "none", payroll: "none", user_setup: "none",
    scheduler: "none", contracts: "none", accounts_payable: "limited",
    accounts_receivable: "none", hr: "none", staff_management: "none",
  },
};

// ─── Helper: merge multiple roles (take highest access level) ───────────────
const LEVEL_ORDER: Record<AccessLevel, number> = {
  none: 0, read: 1, limited: 2, full: 3,
};

export function mergeRolePermissions(
  roles: string[]
): Record<ModuleKey, AccessLevel> {
  const result = {} as Record<ModuleKey, AccessLevel>;

  for (const role of roles) {
    const rolePerm =
      ROLE_MODULE_PERMISSIONS[role as CafmRole] || {};
    for (const [module, level] of Object.entries(rolePerm) as [ModuleKey, AccessLevel][]) {
      const current = result[module] ?? "none";
      if (LEVEL_ORDER[level] > LEVEL_ORDER[current]) {
        result[module] = level;
      }
    }
  }

  return result;
}

// ─── Guard helpers ───────────────────────────────────────────────────────────
export function canAccess(
  permissions: Record<ModuleKey, AccessLevel>,
  module: ModuleKey,
  minLevel: AccessLevel = "read"
): boolean {
  const level = permissions[module] ?? "none";
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel];
}

export function canCreate(
  permissions: Record<ModuleKey, AccessLevel>,
  module: ModuleKey
): boolean {
  return canAccess(permissions, module, "limited");
}

export function canWrite(
  permissions: Record<ModuleKey, AccessLevel>,
  module: ModuleKey
): boolean {
  return canAccess(permissions, module, "full");
}
