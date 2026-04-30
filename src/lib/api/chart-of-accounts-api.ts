import { frappeFetch } from '../frappe-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AccountRootType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';

export interface Account {
  name: string;           // Frappe document name (internal ID)
  account_name: string;
  account_number: string;
  account_type: string;   // e.g. "Current Asset", "Fixed Asset", "Payable" …
  root_type: AccountRootType;
  parent_account: string;
  is_group: number;       // 1 = group/header, 0 = leaf
  disabled: number;       // 0 = active
  balance?: number;
  company: string;
  account_currency: string;
  tax_rate?: number;
}

export interface AccountFormData {
  account_name: string;
  account_number: string;
  parent_account: string;
  account_type: string;
  root_type: string;
  tax_rate: string;
  company: string;
  account_currency: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers  (mirrors the pattern used in vat-api.ts / catering-levy-api.ts)
// ─────────────────────────────────────────────────────────────────────────────

async function getList(
  doctype: string,
  fields: string[],
  filters: any[] = [],
  limit = 500
): Promise<any[]> {
  const params = new URLSearchParams({
    fields:            JSON.stringify(fields),
    filters:           JSON.stringify(filters),
    limit_page_length: String(limit),
    order_by:          'account_number asc, account_name asc',
  });
  const res = await frappeFetch(
    `/api/resource/${encodeURIComponent(doctype)}?${params}`
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`[getList / ${doctype}] ${res.status}: ${body}`);
  }
  return (await res.json()).data ?? [];
}

async function frappePost(url: string, body: Record<string, any>): Promise<any> {
  const res = await frappeFetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      json?.exception ??
      (json?._server_messages
        ? JSON.parse(json._server_messages)?.[0]?.message
        : null) ??
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all Account documents.
 * Balance is derived from GL Entry via a separate call when needed; here we
 * return balance as 0 unless Frappe has pre-computed it on the Account doc.
 */
export const getAccounts = async (company?: string): Promise<Account[]> => {
  const filters: any[] = [['disabled', '=', 0]];
  if (company) filters.push(['company', '=', company]);

  const rows = await getList(
    'Account',
    [
      'name', 'account_name', 'account_number', 'account_type',
      'root_type', 'parent_account', 'is_group', 'disabled',
      'company', 'account_currency', 'tax_rate',
    ],
    filters,
    1000
  );

  return rows as Account[];
};

/**
 * Fetch balances for a set of accounts from GL Entry.
 * Returns a map: account_name → net balance (debit - credit).
 */
export const getAccountBalances = async (
  accountNames: string[],
  company?: string
): Promise<Map<string, number>> => {
  const map = new Map<string, number>();
  if (!accountNames.length) return map;

  try {
    const filters: any[] = [
      ['account', 'in', accountNames],
      ['is_cancelled', '=', 0],
    ];
    if (company) filters.push(['company', '=', company]);

    const params = new URLSearchParams({
      filters:           JSON.stringify(filters),
      fields:            JSON.stringify(['account', 'debit', 'credit']),
      limit_page_length: '10000',
    });
    const res = await frappeFetch(`/api/resource/GL%20Entry?${params}`);
    if (!res.ok) return map;

    const rows: any[] = (await res.json()).data ?? [];
    for (const r of rows) {
      const prev = map.get(r.account) ?? 0;
      map.set(r.account, prev + (parseFloat(r.debit) || 0) - (parseFloat(r.credit) || 0));
    }
  } catch {
    // balances are best-effort; page still renders without them
  }
  return map;
};

/**
 * Fetch all existing account numbers (for the "View Existing Account Codes" panel).
 * Grouped by root_type.
 */
export const getExistingAccountCodes = async (
  company?: string
): Promise<Record<string, string[]>> => {
  const filters: any[] = [['disabled', '=', 0], ['is_group', '=', 0]];
  if (company) filters.push(['company', '=', company]);

  const rows = await getList(
    'Account',
    ['account_number', 'root_type'],
    filters,
    1000
  );

  const grouped: Record<string, string[]> = {
    Assets: [], Liabilities: [], Equity: [], Revenue: [], Expenses: [],
  };

  const rootMap: Record<string, string> = {
    Asset: 'Assets', Liability: 'Liabilities', Equity: 'Equity',
    Income: 'Revenue', Expense: 'Expenses',
  };

  for (const r of rows) {
    if (!r.account_number) continue;
    const key = rootMap[r.root_type as AccountRootType] ?? r.root_type;
    if (grouped[key]) grouped[key].push(r.account_number);
  }

  // Sort numerically
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => parseInt(a) - parseInt(b));
  }

  return grouped;
};

/** Fetch all parent (group) accounts for the Parent Account dropdown */
export const getParentAccounts = async (company?: string): Promise<Account[]> => {
  const filters: any[] = [['is_group', '=', 1], ['disabled', '=', 0]];
  if (company) filters.push(['company', '=', company]);

  return (await getList(
    'Account',
    ['name', 'account_name', 'account_number', 'root_type', 'parent_account'],
    filters,
    500
  )) as Account[];
};

/** Fetch list of companies */
export const getCompanies = async (): Promise<string[]> => {
  try {
    const rows = await getList('Company', ['name'], [], 50);
    return rows.map(r => r.name);
  } catch {
    return [];
  }
};

/**
 * Create a new Account document.
 * Maps directly to the Account DocType fields.
 */
export const createAccount = async (data: AccountFormData): Promise<Account> => {
  const json = await frappePost('/api/resource/Account', {
    account_name:     data.account_name,
    account_number:   data.account_number,
    parent_account:   data.parent_account,
    account_type:     data.account_type,
    root_type:        data.root_type,
    tax_rate:         data.tax_rate ? parseFloat(data.tax_rate) : undefined,
    company:          data.company,
    account_currency: data.account_currency,
    is_group:         0,
  });
  return json.data as Account;
};

/**
 * Update an existing Account document.
 * Only sends the editable fields (parent_account, account_type).
 */
export const updateAccount = async (
  accountName: string,
  patch: { parent_account?: string; account_type?: string }
): Promise<Account> => {
  const res = await frappeFetch(`/api/resource/Account/${encodeURIComponent(accountName)}`, {
    method: 'PUT',
    body: JSON.stringify(patch),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.exception ?? `Update failed (${res.status})`);
  }
  return json.data as Account;
};

/**
 * Delete (disable) an Account.
 * Frappe prevents hard-deleting accounts with GL entries — we use DELETE
 * which Frappe handles gracefully (throws if linked).
 */
export const deleteAccount = async (accountName: string): Promise<void> => {
  const res = await frappeFetch(`/api/resource/Account/${encodeURIComponent(accountName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.exception ?? `Delete failed (${res.status})`);
  }
};
