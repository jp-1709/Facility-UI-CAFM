import { frappeFetch } from '../frappe-sdk';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getList(
  doctype: string,
  fields: string[],
  filters: any[] = [],
  limit = 500,
  orderBy = ''
): Promise<any[]> {
  const params = new URLSearchParams({
    fields:            JSON.stringify(fields),
    filters:           JSON.stringify(filters),
    limit_page_length: String(limit),
  });
  if (orderBy) params.set('order_by', orderBy);
  const res = await frappeFetch(`/api/resource/${encodeURIComponent(doctype)}?${params}`);
  if (!res.ok) return [];
  return (await res.json()).data ?? [];
}

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
  if (!res.ok) return [];
  return (await res.json()).message ?? [];
}

function toDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function monthStart(): string {
  const n = new Date();
  return toDate(new Date(n.getFullYear(), n.getMonth(), 1));
}

function today(): string {
  return toDate(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDate(d);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OverviewData {
  monthly_revenue:     number;
  total_orders:        number;
  unique_customers:    number;
  avg_order_value:     number;
  low_stock_count:     number;
  pending_orders:      number;
  staff_on_shift:      number;
  upcoming_events:     number;
  top_selling_items:   { item_name: string; qty: number; revenue: number }[];
}

export interface LowStockItem {
  item_code:   string;
  item_name:   string;
  item_group:  string;
  actual_qty:  number;
  min_qty:     number;
}

export interface OperationsData {
  low_stock_count:       number;
  pending_purchase_orders: number;
  active_suppliers:      number;
  total_inventory_items: number;
  low_stock_items:       LowStockItem[];
}

export interface StaffData {
  total_staff:    number;
  on_shift_today: number;
  recent_hires:   number;
}

export interface EventItem {
  name:            string;
  subject:         string;
  starts_on:       string;
  ends_on:         string;
  expected_guests: number;
}

export interface EventsData {
  upcoming_count:   number;
  event_revenue:    number;
  expected_guests:  number;
  upcoming_events:  EventItem[];
}

export interface RevenuePoint { date: string; revenue: number }
export interface HourPoint    { hour: string; orders: number  }

export interface TopItem {
  item_name: string;
  item_code: string;
  orders:    number;
  revenue:   number;
  is_top:    boolean;
}

export interface AnalyticsData {
  monthly_revenue:       number;
  customer_growth_pct:   number;
  avg_order_value:       number;
  repeat_customer_pct:   number;
  total_orders:          number;
  revenue_trend:         RevenuePoint[];
  orders_by_hour:        HourPoint[];
  top_performing_items:  TopItem[];
  peak_hour:             string;
  top_selling_item:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────

export const getOverviewData = async (): Promise<OverviewData> => {
  const ms = monthStart();
  const td = today();

  // Monthly Sales Invoices (submitted only)
  const invoices = await getList(
    'Sales Invoice',
    ['name', 'grand_total', 'customer', 'posting_date'],
    [['posting_date', '>=', ms], ['posting_date', '<=', td], ['docstatus', '=', 1]],
    5000
  );

  const monthly_revenue  = invoices.reduce((s: number, i: any) => s + (parseFloat(i.grand_total) || 0), 0);
  const total_orders     = invoices.length;
  const unique_customers = new Set(invoices.map((i: any) => i.customer)).size;
  const avg_order_value  = total_orders > 0 ? monthly_revenue / total_orders : 0;

  // Top selling items — from Sales Invoice Item child table for current month only
  const itemRows = await clientGetList(
    'Sales Invoice Item',
    [['docstatus', '=', 1], ['posting_date', '>=', ms], ['posting_date', '<=', td]],
    ['item_code', 'item_name', 'qty', 'base_amount'],
    10000
  );

  const itemMap = new Map<string, { item_name: string; qty: number; revenue: number }>();
  for (const r of itemRows) {
    const prev = itemMap.get(r.item_code) ?? { item_name: r.item_name, qty: 0, revenue: 0 };
    itemMap.set(r.item_code, {
      item_name: r.item_name,
      qty:       prev.qty + (parseFloat(r.qty) || 0),
      revenue:   prev.revenue + (parseFloat(r.base_amount) || 0),
    });
  }

  const top_selling_items = Array.from(itemMap.values())
    .sort((a, b) => b.qty - a.qty) // Sort by quantity sold (descending)
    .slice(0, 10);

  // Low stock — Bin where actual_qty <= 0 or very low (using re_order_qty as threshold)
  const lowBins = await getList(
    'Bin',
    ['item_code', 'actual_qty', 'warehouse'],
    [['actual_qty', '<=', 5]],
    2000
  );
  const low_stock_count = lowBins.length;

  // Pending orders (Sales Order, not completed/closed)
  const pendingOrders = await getList(
    'Sales Order',
    ['name'],
    [['docstatus', '=', 1], ['status', 'not in', ['Completed', 'Closed']]],
    2000
  );
  const pending_orders = pendingOrders.length;

  // Staff on shift today
  const attendanceToday = await getList(
    'Attendance',
    ['name'],
    [['attendance_date', '=', td], ['status', '=', 'Present']],
    500
  );
  const staff_on_shift = attendanceToday.length;

  // Upcoming events
  const upcomingEvts = await getList(
    'Event',
    ['name'],
    [['starts_on', '>=', td]],
    500
  );
  const upcoming_events = upcomingEvts.length;

  return {
    monthly_revenue,
    total_orders,
    unique_customers,
    avg_order_value,
    low_stock_count,
    pending_orders,
    staff_on_shift,
    upcoming_events,
    top_selling_items,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Operations tab
// ─────────────────────────────────────────────────────────────────────────────

export const getOperationsData = async (): Promise<OperationsData> => {
  const [poRows, supplierRows, itemRows, binRows] = await Promise.all([
    // Pending Purchase Orders: docstatus=1, status not Completed/Closed
    getList('Purchase Order', ['name'],
      [['docstatus', '=', 1], ['status', 'not in', ['Completed', 'Closed']]], 2000),

    // Active Suppliers
    getList('Supplier', ['name'], [['disabled', '=', 0]], 2000),

    // Total stock items
    getList('Item', ['name'], [['is_stock_item', '=', 1], ['disabled', '=', 0]], 5000),

    // Bins with actual_qty <= 5 for "low stock"
    getList('Bin', ['item_code', 'actual_qty', 'reserved_qty'],
      [['actual_qty', '<=', 5]], 2000, 'actual_qty asc'),
  ]);

  // Fetch item details for low stock bins
  const lowCodes = [...new Set(binRows.map((b: any) => b.item_code))].slice(0, 200);
  let itemDetails: any[] = [];
  if (lowCodes.length > 0) {
    itemDetails = await clientGetList(
      'Item',
      [['name', 'in', lowCodes]],
      ['name', 'item_name', 'item_group'],
      lowCodes.length + 10
    );
  }
  const itemDetailMap = new Map(itemDetails.map((i: any) => [i.name, i]));

  const low_stock_items: LowStockItem[] = binRows.map((b: any) => {
    const detail = itemDetailMap.get(b.item_code);
    return {
      item_code:  b.item_code,
      item_name:  detail?.item_name ?? b.item_code,
      item_group: detail?.item_group ?? '',
      actual_qty: Math.max(0, parseFloat(b.actual_qty) || 0),
      min_qty:    0,
    };
  });

  return {
    low_stock_count:         binRows.length,
    pending_purchase_orders: poRows.length,
    active_suppliers:        supplierRows.length,
    total_inventory_items:   itemRows.length,
    low_stock_items,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Staff tab
// ─────────────────────────────────────────────────────────────────────────────

export const getStaffData = async (): Promise<StaffData> => {
  const td  = today();
  const d30 = daysAgo(30);

  const [activeEmployees, presentToday, recentHires] = await Promise.all([
    getList('Employee', ['name'], [['status', '=', 'Active']], 2000),
    getList('Attendance', ['name'], [['attendance_date', '=', td], ['status', '=', 'Present']], 2000),
    getList('Employee', ['name'], [['date_of_joining', '>=', d30], ['status', '=', 'Active']], 500),
  ]);

  return {
    total_staff:    activeEmployees.length,
    on_shift_today: presentToday.length,
    recent_hires:   recentHires.length,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Events tab
// ─────────────────────────────────────────────────────────────────────────────

export const getEventsData = async (): Promise<EventsData> => {
  const td = today();

  const upcomingRows = await getList(
    'Event',
    ['name', 'subject', 'starts_on', 'ends_on'],
    [['starts_on', '>=', td]],
    200,
    'starts_on asc'
  );

  const upcoming_events: EventItem[] = upcomingRows.map((e: any) => ({
    name:            e.name,
    subject:         e.subject ?? e.name,
    starts_on:       e.starts_on ?? '',
    ends_on:         e.ends_on   ?? '',
    expected_guests: parseFloat(e.expected_guests) || 0,
  }));

  const expected_guests = upcoming_events.reduce((s, e) => s + e.expected_guests, 0);

  // Event revenue — Sales Invoices created this month (proxy for event bookings)
  const ms = monthStart();
  const evtInvoices = await getList(
    'Sales Invoice',
    ['grand_total'],
    [['posting_date', '>=', ms], ['posting_date', '<=', td], ['docstatus', '=', 1]],
    5000
  );
  const event_revenue = evtInvoices.reduce(
    (s: number, i: any) => s + (parseFloat(i.grand_total) || 0), 0
  );

  return {
    upcoming_count:  upcomingRows.length,
    event_revenue,
    expected_guests,
    upcoming_events,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics tab
// ─────────────────────────────────────────────────────────────────────────────

export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  const ms      = monthStart();
  const td      = today();
  const lastMs  = toDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const lastMe  = toDate(new Date(new Date().getFullYear(), new Date().getMonth(), 0));

  const [currentInvoices, lastInvoices] = await Promise.all([
    getList('Sales Invoice',
      ['name', 'grand_total', 'customer', 'posting_date', 'posting_time'],
      [['posting_date', '>=', ms], ['posting_date', '<=', td], ['docstatus', '=', 1]],
      5000),
    getList('Sales Invoice',
      ['name', 'grand_total', 'customer'],
      [['posting_date', '>=', lastMs], ['posting_date', '<=', lastMe], ['docstatus', '=', 1]],
      5000),
  ]);

  const monthly_revenue  = currentInvoices.reduce((s: number, i: any) => s + (parseFloat(i.grand_total) || 0), 0);
  const total_orders     = currentInvoices.length;
  const avg_order_value  = total_orders > 0 ? monthly_revenue / total_orders : 0;

  // Customer growth %
  const currCustomers = new Set(currentInvoices.map((i: any) => i.customer)).size;
  const lastCustomers = new Set(lastInvoices.map((i: any)  => i.customer)).size;
  const customer_growth_pct = lastCustomers > 0
    ? ((currCustomers - lastCustomers) / lastCustomers) * 100
    : 0;

  // Repeat customers: customers who appear > once this month
  const custOrderCount = new Map<string, number>();
  for (const inv of currentInvoices) {
    custOrderCount.set(inv.customer, (custOrderCount.get(inv.customer) ?? 0) + 1);
  }
  const repeatCount         = [...custOrderCount.values()].filter(c => c > 1).length;
  const repeat_customer_pct = currCustomers > 0 ? (repeatCount / currCustomers) * 100 : 0;

  // Revenue trend: group by posting_date, sum grand_total
  const revByDate = new Map<string, number>();
  for (const inv of currentInvoices) {
    const d = inv.posting_date?.slice(0, 10) ?? '';
    if (d) revByDate.set(d, (revByDate.get(d) ?? 0) + (parseFloat(inv.grand_total) || 0));
  }
  const revenue_trend: RevenuePoint[] = Array.from(revByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // Orders by hour: group by hour from posting_time
  const ordersByHour = new Map<number, number>();
  for (const inv of currentInvoices) {
    const time = inv.posting_time ?? '00:00:00';
    const hour = parseInt(time.split(':')[0]) || 0;
    ordersByHour.set(hour, (ordersByHour.get(hour) ?? 0) + 1);
  }
  const orders_by_hour: HourPoint[] = Array.from({ length: 24 }, (_, h) => ({
    hour:   `${String(h).padStart(2, '0')}:00`,
    orders: ordersByHour.get(h) ?? 0,
  }));

  // Top performing items (by revenue this month) — fetch from item child table
  const itemRows = await clientGetList(
    'Sales Invoice Item',
    [['docstatus', '=', 1]],
    ['item_code', 'item_name', 'qty', 'amount'],
    10000
  );

  const itemMap = new Map<string, { item_name: string; qty: number; revenue: number; orders: number }>();
  for (const r of itemRows) {
    const prev = itemMap.get(r.item_code) ?? { item_name: r.item_name, qty: 0, revenue: 0, orders: 0 };
    itemMap.set(r.item_code, {
      item_name: r.item_name,
      qty:       prev.qty + (parseFloat(r.qty) || 0),
      revenue:   prev.revenue + (parseFloat(r.amount) || 0),
      orders:    prev.orders + 1,
    });
  }

  const sorted = Array.from(itemMap.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 8);

  const top_performing_items: TopItem[] = sorted.map(([code, v], i) => ({
    item_code: code,
    item_name: v.item_name,
    orders:    v.orders,
    revenue:   v.revenue,
    is_top:    i === 0,
  }));

  // Peak hour
  let peakHour = 0, peakCount = 0;
  ordersByHour.forEach((count, hour) => {
    if (count > peakCount) { peakCount = count; peakHour = hour; }
  });
  const peak_hour = `${String(peakHour).padStart(2, '0')}:00-${String(peakHour + 1).padStart(2, '0')}:00`;

  const top_selling_item = top_performing_items[0]?.item_name ?? '—';

  return {
    monthly_revenue,
    customer_growth_pct,
    avg_order_value,
    repeat_customer_pct,
    total_orders,
    revenue_trend,
    orders_by_hour,
    top_performing_items,
    peak_hour,
    top_selling_item,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// All data in one parallel call (used by the component)
// ─────────────────────────────────────────────────────────────────────────────

export type TabId = 'overview' | 'operations' | 'staff' | 'events' | 'analytics';

export const fetchTabData = async (tab: TabId) => {
  switch (tab) {
    case 'overview':   return { overview:   await getOverviewData()   };
    case 'operations': return { operations: await getOperationsData() };
    case 'staff':      return { staff:      await getStaffData()      };
    case 'events':     return { events:     await getEventsData()     };
    case 'analytics':  return { analytics:  await getAnalyticsData()  };
  }
};
