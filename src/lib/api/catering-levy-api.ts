import { frappeFetch } from '../frappe-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CateringLevySummary {
    total_levy_collected: number;   // sum of base_tax_amount from Catering Levy Payable - QR
    gross_sales: number;            // sum of item amounts from Sales Invoice Items
    transaction_count: number;
    payment_due_date: string;       // 20th of following month (ISO string)
}

export interface CateringLevyTransaction {
    id: string;           // GL Entry name
    posting_date: string; // GL Entry → posting_date
    voucher_no: string;   // GL Entry → voucher_no
    order_number: string; // Sales Invoice → order_type
    gross_sales: number;  // Sales Invoice Items → sum of base_amount per parent
    levy_amount: number;  // Sales Taxes and Charges → base_tax_amount (account_head='Catering Levy Payable - QR')
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/resource/<doctype>  — Frappe standard resource API.
 * Reuses frappeFetch from frappe-sdk so auth/CSRF is handled identically
 * to every other API call in this app.
 */
async function getList(
    doctype: string,
    filters: any[],
    fields: string[],
    limit = 2000
): Promise<any[]> {
    const params = new URLSearchParams({
        filters: JSON.stringify(filters),
        fields: JSON.stringify(fields),
        limit_page_length: String(limit),
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

/**
 * POST /api/method/frappe.client.get_list
 * Required for child-table DocTypes (Sales Invoice Item, Sales Taxes and
 * Charges) and for IN filters with many IDs that would bust URL-length limits.
 * Frappe returns the result wrapped in { message: [...] }.
 */
async function clientGetList(
    doctype: string,
    filters: any[],
    fields: string[],
    limit = 2000
): Promise<any[]> {
    const res = await frappeFetch('/api/method/frappe.client.get_list', {
        method: 'POST',
        body: JSON.stringify({ doctype, filters, fields, limit_page_length: limit }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`[clientGetList / ${doctype}] ${res.status}: ${body}`);
    }
    const json = await res.json();
    return json.message ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch Catering Training Levy transactions for a given date range.
 *
 * Data mapping (strict per spec):
 *
 *   Base query  → GL Entry
 *     account      = 'Catering Levy Payable - QR'
 *     voucher_type = 'Sales Invoice'
 *     posting_date BETWEEN fromDate AND toDate
 *
 *   Date        ← gl.posting_date
 *   Order #     ← Sales Invoice.order_type           (cross-reference)
 *   Gross Sales ← SUM(Sales Invoice Item.base_amount) per parent  (Items child table)
 *   Levy (2%)   ← Sales Taxes and Charges.base_tax_amount
 *                 WHERE account_head = 'Catering Levy Payable - QR'
 *
 *   Columns EXCLUDED per spec: Service Type, Payment Method
 */
export const getCateringLevyTransactions = async (
    fromDate: string,
    toDate: string
): Promise<CateringLevyTransaction[]> => {
    // ── Step 1: GL Entry (base query) ─────────────────────────────────────────
    const glRows = await getList(
        'GL Entry',
        [
            ['account', '=', 'Catering Levy Payable - QR'],
            ['voucher_type', '=', 'Sales Invoice'],
            ['posting_date', '>=', fromDate],
            ['posting_date', '<=', toDate],
            ['is_cancelled', '=', 0],
        ],
        ['name', 'posting_date', 'voucher_no'],
        2000
    );

    if (!glRows.length) return [];

    // ── Deduplicate by voucher_no ──────────────────────────────────────────────
    // GL Entry always has both a debit and a credit row — keep one per voucher.
    const seen = new Set<string>();
    const unique: typeof glRows = [];
    for (const row of glRows) {
        if (!seen.has(row.voucher_no)) {
            seen.add(row.voucher_no);
            unique.push(row);
        }
    }

    const vouchers = unique.map(r => r.voucher_no);

    // ── Step 2: Batch-fetch Sales Invoice fields ───────────────────────────────
    // Order # → Sales Invoice.order_type
    const invoiceRows = await clientGetList(
        'Sales Invoice',
        [['name', 'in', vouchers]],
        ['name', 'order_type'],
        vouchers.length + 50
    );
    const orderTypeMap = new Map<string, string>();
    for (const r of invoiceRows) {
        orderTypeMap.set(r.name, r.order_type ?? '—');
    }

    // ── Step 3: Batch-fetch Items child table ──────────────────────────────────
    // Gross Sales → SUM(base_amount) per parent Sales Invoice
    const itemRows = await clientGetList(
        'Sales Invoice Item',
        [['parent', 'in', vouchers]],
        ['parent', 'base_amount'],
        vouchers.length * 20  // conservative: allow up to 20 items per invoice
    );
    const grossSalesMap = new Map<string, number>();
    for (const r of itemRows) {
        const prev = grossSalesMap.get(r.parent) ?? 0;
        grossSalesMap.set(r.parent, prev + (parseFloat(r.base_amount) || 0));
    }

    // ── Step 4: Batch-fetch Taxes child table ──────────────────────────────────
    // Levy (2%) → Sales Taxes and Charges.base_tax_amount
    //             WHERE account_head = 'Catering Levy Payable - QR'
    const taxRows = await clientGetList(
        'Sales Taxes and Charges',
        [
            ['parent', 'in', vouchers],
            ['account_head', '=', 'Catering Levy Payable - QR'],
        ],
        ['parent', 'base_tax_amount'],
        vouchers.length + 50
    );
    const levyMap = new Map<string, number>();
    for (const r of taxRows) {
        levyMap.set(r.parent, parseFloat(r.base_tax_amount) || 0);
    }

    // ── Step 5: Assemble result rows ───────────────────────────────────────────
    const transactions: CateringLevyTransaction[] = unique.map(row => ({
        id: row.name,
        posting_date: row.posting_date,
        voucher_no: row.voucher_no,
        order_number: orderTypeMap.get(row.voucher_no) ?? '—',
        gross_sales: grossSalesMap.get(row.voucher_no) ?? 0,
        levy_amount: levyMap.get(row.voucher_no) ?? 0,
    }));

    // Sort descending by date
    transactions.sort(
        (a, b) =>
            new Date(b.posting_date).getTime() - new Date(a.posting_date).getTime()
    );

    return transactions;
};

/**
 * Convenience wrapper — calculates date range for a given month/year
 * and returns both summary totals and the transaction register rows.
 * Mirrors getVATDataForMonth() in vat-api.ts.
 */
export const getCateringLevyDataForMonth = async (
    year: string,
    month: string
): Promise<{
    transactions: CateringLevyTransaction[];
    summary: CateringLevySummary;
}> => {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Payment due date: 20th of the following month
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
    const nextMonthYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year);
    const paymentDueDate = `${nextMonthYear}-${String(nextMonth).padStart(2, '0')}-20`;

    const transactions = await getCateringLevyTransactions(startDate, endDate);

    const summary: CateringLevySummary = {
        total_levy_collected: transactions.reduce((s, t) => s + t.levy_amount, 0),
        gross_sales: transactions.reduce((s, t) => s + t.gross_sales, 0),
        transaction_count: transactions.length,
        payment_due_date: paymentDueDate,
    };

    return { transactions, summary };
};
