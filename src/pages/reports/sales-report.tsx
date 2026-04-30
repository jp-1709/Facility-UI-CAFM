import React, { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Package,
  Download,
  RefreshCw,
  AlertCircle,
  LucideIcon,
} from "lucide-react";
import { PageLayout } from "../../components/PageLayout";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SalesOrderItem {
  parent: string;
  item_code: string;
  item_name: string;
  qty: number;
  rate: number;
  amount: number;
  item_group: string;
}

interface SalesOrder {
  name: string;
  customer: string;
  transaction_date: string;
  grand_total: number;
  status: string;
  docstatus: number;
  payment_terms_template: string;
  base_grand_total: number;
  currency: string;
  items: SalesOrderItem[];
}

interface DateRange {
  from: string;
  to: string;
}

interface FetchFilters {
  from_date?: string;
  to_date?: string;
  status?: string;
}

interface DailyDataPoint {
  date: string;
  total: number;
}

interface StatusDataPoint {
  name: string;
  value: number;
}

interface TopItem {
  name: string;
  qty: number;
  amount: number;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

interface ErpParams {
  [key: string]: string | number | boolean;
}

// Frappe global (injected by ERPNext at runtime)
declare const frappe: { csrf_token?: string } | undefined;

// ─── ERPNext API Helper ───────────────────────────────────────────────────────

const erpFetch = async <T = unknown>(method: string, params: ErpParams = {}): Promise<T> => {
  const url = new URL(`/api/method/${method}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) =>
    url.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : String(v))
  );
  const res = await fetch(url.toString(), {
    credentials: "include",
    headers: {
      "X-Frappe-CSRF-Token":
        typeof frappe !== "undefined" ? frappe?.csrf_token ?? "" : "",
    },
  });
  if (!res.ok) throw new Error(`ERPNext API error: ${res.status}`);
  const json = await res.json();
  return (json.message ?? json) as T;
};

const fetchSalesOrders = async (filters: FetchFilters = {}): Promise<SalesOrder[]> => {
  try {
    const orders = await erpFetch<SalesOrder[]>("quantbit_ury_customization.ury_customization.sales_report_api.get_sales_report_data", {
      from_date: filters.from_date || '',
      to_date: filters.to_date || '',
      status: filters.status || ''
    });
    return orders;
  } catch (error) {
    console.error('Error fetching sales orders:', error);
    throw error;
  }
};

// ─── Date Presets ─────────────────────────────────────────────────────────────

type PresetKey =
  | "today"
  | "yesterday"
  | "week"
  | "last7"
  | "month"
  | "lastmonth"
  | "year"
  | "custom";

const getPreset = (preset: PresetKey): DateRange => {
  const today = new Date();
  const fmt = (d: Date): string => d.toISOString().split("T")[0];
  const start = (days: number): string => {
    const x = new Date(today);
    x.setDate(x.getDate() - days);
    return fmt(x);
  };
  switch (preset) {
    case "today":
      return { from: fmt(today), to: fmt(today) };
    case "yesterday":
      return { from: start(1), to: start(1) };
    case "week":
      return { from: start(6), to: fmt(today) };
    case "last7":
      return { from: start(7), to: fmt(today) };
    case "month": {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: fmt(d), to: fmt(today) };
    }
    case "lastmonth": {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: fmt(s), to: fmt(e) };
    }
    case "year": {
      const d = new Date(today.getFullYear(), 0, 1);
      return { from: fmt(d), to: fmt(today) };
    }
    default:
      return { from: start(29), to: fmt(today) };
  }
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD = "#F5A623";
const COLORS: string[] = [GOLD, "#F5C842", "#E87A1A", "#D4580A", "#FFC857", "#FFE0A3"];

const STATUS_COLORS: Record<string, string> = {
  Draft: "#9CA3AF",
  "To Deliver and Bill": "#3B82F6",
  "To Bill": "#8B5CF6",
  "To Deliver": "#F59E0B",
  Completed: "#10B981",
  Cancelled: "#EF4444",
  Closed: "#6B7280",
  "On Hold": "#F97316",
};

const STATUS_OPTIONS = [
  "Draft",
  "To Deliver and Bill",
  "To Bill",
  "To Deliver",
  "Completed",
  "Closed",
  "On Hold",
  "Cancelled",
];

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "last7", label: "Last 7 Days" },
  { key: "month", label: "This Month" },
  { key: "lastmonth", label: "Last Month" },
  { key: "year", label: "This Year" },
];

// ─── Stat Card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, sub, color = GOLD }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: 10,
      padding: "20px 24px",
      border: "1px solid #F3F4F6",
      flex: 1,
      minWidth: 180,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
    }}
  >
    <div>
      <p style={{ margin: 0, fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "6px 0 4px", fontSize: 26, fontWeight: 700, color: "#111827" }}>{value}</p>
      {sub && <p style={{ margin: 0, fontSize: 12, color: "#10B981" }}>{sub}</p>}
    </div>
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: `${color}20`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon size={20} color={color} />
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const SalesReport: React.FC = () => {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetKey>("month");
  const [dateRange, setDateRange] = useState<DateRange>(getPreset("month"));
  const [statusFilter, setStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSalesOrders({
        from_date: dateRange.from,
        to_date: dateRange.to,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setOrders(data);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error occurred";
      setError(errorMessage);
      console.error('Sales Report Error:', e);
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Client-side filters ──────────────────────────────────────────────────
  const filtered: SalesOrder[] = orders.filter((o) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !o.name.toLowerCase().includes(q) &&
        !o.customer.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // ── Metrics ──────────────────────────────────────────────────────────────
  const totalSales = filtered.reduce((s, o) => s + (o.grand_total ?? 0), 0);
  const avgOrder = filtered.length ? totalSales / filtered.length : 0;
  const totalItems = filtered.reduce(
    (s, o) => s + o.items.reduce((a, i) => a + (i.qty ?? 0), 0),
    0
  );

  // ── Daily Trend ──────────────────────────────────────────────────────────
  const dailyMap: Record<string, number> = {};
  filtered.forEach((o) => {
    const d = o.transaction_date;
    dailyMap[d] = (dailyMap[d] ?? 0) + o.grand_total;
  });
  const dailyData: DailyDataPoint[] = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, total]) => ({ date: date.slice(5), total: Math.round(total) }));

  // ── Status Breakdown ─────────────────────────────────────────────────────
  const statusMap: Record<string, number> = {};
  filtered.forEach((o) => {
    statusMap[o.status] = (statusMap[o.status] ?? 0) + o.grand_total;
  });
  const statusData: StatusDataPoint[] = Object.entries(statusMap).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // ── Top Items ─────────────────────────────────────────────────────────────
  const itemMap: Record<string, { qty: number; amount: number }> = {};
  filtered.forEach((o) =>
    o.items.forEach((i) => {
      if (!itemMap[i.item_name]) itemMap[i.item_name] = { qty: 0, amount: 0 };
      itemMap[i.item_name].qty += i.qty ?? 0;
      itemMap[i.item_name].amount += i.amount ?? 0;
    })
  );
  const topItems: TopItem[] = Object.entries(itemMap)
    .sort(([, a], [, b]) => b.amount - a.amount)
    .slice(0, 8)
    .map(([name, v]) => ({
      name: name.length > 20 ? name.slice(0, 18) + "…" : name,
      qty: v.qty,
      amount: Math.round(v.amount),
    }));

  // ── Top Customers ─────────────────────────────────────────────────────────
  const custMap: Record<string, number> = {};
  filtered.forEach((o) => {
    custMap[o.customer] = (custMap[o.customer] ?? 0) + o.grand_total;
  });
  const topCustomers: [string, number][] = Object.entries(custMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = (): void => {
    const rows: (string | number)[][] = [
      ["Order#", "Customer", "Date", "Status", "Grand Total", "Items Count"],
      ...filtered.map((o) => [
        o.name,
        o.customer,
        o.transaction_date,
        o.status,
        o.grand_total,
        o.items.length,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], {
      type: "text/csv",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `sales-report-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
  };

  const fmt = (n: number): string =>
    `KSh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <PageLayout
      title="Sales Report"
      subtitle="Track sales performance and revenue trends"
      actions={
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#6B7280" }}>
            📅 {dateRange.from} – {dateRange.to}
          </span>
          <button
            onClick={() => void load()}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#fff",
              border: "1px solid #D1D5DB",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              color: "#374151",
            }}
          >
            <RefreshCw
              size={14}
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}
            />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: GOLD,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
            }}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      }
    >
      <div
        style={{
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          background: "#F9FAFB",
          minHeight: "100%",
          padding: 24,
        }}
      >

        {/* Date Presets + Filters */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPreset(p.key);
                setDateRange(getPreset(p.key));
              }}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid #E5E7EB",
                background: preset === p.key ? GOLD : "#fff",
                color: preset === p.key ? "#fff" : "#374151",
                fontWeight: preset === p.key ? 600 : 400,
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {p.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPreset("custom");
                setDateRange((d) => ({ ...d, from: e.target.value }));
              }}
              style={{
                padding: "6px 10px",
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setPreset("custom");
                setDateRange((d) => ({ ...d, to: e.target.value }));
              }}
              style={{
                padding: "6px 10px",
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                fontSize: 13,
              }}
            />
            <select
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setStatus(e.target.value)
              }
              style={{
                padding: "6px 10px",
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              placeholder="Search order / customer…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              style={{
                padding: "6px 12px",
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                fontSize: 13,
                width: 220,
              }}
            />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              padding: "12px 16px",
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              marginBottom: 16,
              color: "#B91C1C",
            }}
          >
            <AlertCircle size={16} />
            <span style={{ fontSize: 13 }}>
              {error}. Please ensure you are logged into ERPNext and have permission to view Sales Orders.
              Contact your system administrator if the issue persists.
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "#6B7280" }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${GOLD}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }}
            />
            Loading Sales Orders…
          </div>
        )}

        {!loading && (
          <>
            {/* Stat Cards */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
              <StatCard icon={DollarSign} label="Total Sales" value={fmt(totalSales)} color={GOLD} />
              <StatCard icon={ShoppingCart} label="Total Orders" value={filtered.length} color="#3B82F6" />
              <StatCard icon={TrendingUp} label="Avg Order Value" value={fmt(avgOrder)} color="#8B5CF6" />
              <StatCard
                icon={Package}
                label="Items Sold (Qty)"
                value={Math.round(totalItems).toLocaleString()}
                color="#10B981"
              />
            </div>

            {/* Charts Row 1 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Daily Trend */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid #F3F4F6",
                }}
              >
                <h3
                  style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" }}
                >
                  Daily Sales Trend
                </h3>
                {dailyData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke={GOLD}
                        strokeWidth={2}
                        dot={{ r: 3, fill: GOLD }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#9CA3AF", textAlign: "center", paddingTop: 80 }}>
                    No data
                  </p>
                )}
              </div>

              {/* Sales by Status */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid #F3F4F6",
                }}
              >
                <h3
                  style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" }}
                >
                  Sales by Status
                </h3>
                {statusData.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        nameKey="name"
                        label={({
                          name,
                          percent,
                        }: {
                          name: string;
                          percent: number;
                        }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {statusData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] ?? GOLD}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#9CA3AF", textAlign: "center", paddingTop: 80 }}>
                    No data
                  </p>
                )}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {/* Top Items by Revenue */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid #F3F4F6",
                }}
              >
                <h3
                  style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" }}
                >
                  Top Items by Revenue
                </h3>
                {topItems.length ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topItems} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        width={110}
                      />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="amount" fill={GOLD} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ color: "#9CA3AF", textAlign: "center", paddingTop: 80 }}>
                    No data
                  </p>
                )}
              </div>

              {/* Top Customers */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 20,
                  border: "1px solid #F3F4F6",
                }}
              >
                <h3
                  style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#111827" }}
                >
                  Top Customers
                </h3>
                {topCustomers.length ? (
                  <div>
                    {topCustomers.map(([cust, val], i) => {
                      const pct = (val / (topCustomers[0][1] || 1)) * 100;
                      return (
                        <div key={cust} style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 4,
                            }}
                          >
                            <span
                              style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}
                            >
                              {i + 1}.{" "}
                              {cust.length > 30 ? cust.slice(0, 28) + "…" : cust}
                            </span>
                            <span
                              style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}
                            >
                              {fmt(val)}
                            </span>
                          </div>
                          <div
                            style={{
                              height: 6,
                              background: "#F3F4F6",
                              borderRadius: 3,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: "100%",
                                background: COLORS[i % COLORS.length],
                                borderRadius: 3,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#9CA3AF", textAlign: "center", paddingTop: 60 }}>
                    No data
                  </p>
                )}
              </div>
            </div>

            {/* Orders Table */}
            <div
              style={{
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #F3F4F6",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #F3F4F6",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#111827" }}>
                  Sales Orders{" "}
                  <span style={{ fontWeight: 400, color: "#6B7280", fontSize: 13 }}>
                    ({filtered.length})
                  </span>
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#F9FAFB" }}>
                      {["Order #", "Customer", "Date", "Status", "Grand Total", "Items"].map(
                        (h) => (
                          <th
                            key={h}
                            style={{
                              padding: "10px 16px",
                              textAlign: "left",
                              borderBottom: "1px solid #E5E7EB",
                              fontWeight: 600,
                              color: "#374151",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 50).map((o, i) => (
                      <tr
                        key={o.name}
                        style={{
                          borderBottom: "1px solid #F9FAFB",
                          background: i % 2 ? "#FAFAFA" : "#fff",
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 16px",
                            fontWeight: 600,
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <a
                            href={`/app/sales-order/${o.name}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#2563EB", textDecoration: "none" }}
                          >
                            {o.name}
                          </a>
                        </td>
                        <td style={{ padding: "10px 16px", color: "#374151" }}>
                          {o.customer}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            color: "#6B7280",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {o.transaction_date}
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span
                            style={{
                              padding: "3px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 600,
                              background: `${STATUS_COLORS[o.status] ?? "#9CA3AF"}20`,
                              color: STATUS_COLORS[o.status] ?? "#9CA3AF",
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            fontWeight: 600,
                            color: "#111827",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmt(o.grand_total)}
                        </td>
                        <td style={{ padding: "10px 16px", color: "#6B7280" }}>
                          {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}
                        >
                          No orders found for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {filtered.length > 50 && (
                  <p
                    style={{
                      padding: "10px 16px",
                      color: "#6B7280",
                      fontSize: 12,
                      margin: 0,
                    }}
                  >
                    Showing 50 of {filtered.length} orders. Use date filters or export CSV
                    for full data.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.9; }
        a:hover { text-decoration: underline !important; }
      `}</style>
      </div>
    </PageLayout>
  );
};

export default SalesReport;