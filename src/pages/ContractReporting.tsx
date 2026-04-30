/**
 * ContractReporting.tsx  ·  CAFM Facility-UI
 * ─────────────────────────────────────────────────────────────────────
 * Dynamic report viewer for Frappe Script Reports.
 * Reports implemented:
 *   • Contract Summary       (contract_summary.py)
 *   • Contract Register      (contract_register.py)
 *
 * All filters, columns, and data are driven live from the Frappe
 * query_report.run API — nothing about field structure is hard-coded.
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, Filter, RefreshCw, Download, ChevronDown, ChevronUp,
  X, Loader2, AlertCircle, BarChart2, FileText, Calendar,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, TrendingDown,
  Users, Building2, Activity, Zap, Shield, Star, Check,
  ArrowUpDown, ChevronLeft, ChevronRight, Printer, Share2,
  SlidersHorizontal, LayoutGrid, List, Eye, Package, Phone,
  MessageSquare, UserCheck, ThumbsUp, Wrench, User, Award,
  Target, Timer, DollarSign, Receipt, FileCheck,
  CalendarDays,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   GLOBAL CSS
══════════════════════════════════════════════════════════════ */
const RPT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes rptFadeUp  { from{opacity:0;transform:translateY(12px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes rptSlideL  { from{opacity:0;transform:translateX(-12px)}            to{opacity:1;transform:translateX(0)}         }
@keyframes rptBarFill { from{width:0%} to{width:var(--bw)} }
@keyframes rptShimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes rptPulse   { 0%,100%{opacity:1} 50%{opacity:.45} }
@keyframes rptCount   { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
@keyframes rptRowIn   { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }

.r-fade-up  { animation: rptFadeUp  .3s cubic-bezier(.22,1,.36,1) both }
.r-slide-l  { animation: rptSlideL  .25s cubic-bezier(.22,1,.36,1) both }
.r-count    { animation: rptCount   .35s cubic-bezier(.22,1,.36,1) both }

.r-stagger > * { animation: rptFadeUp .28s cubic-bezier(.22,1,.36,1) both }
.r-stagger > *:nth-child(1){animation-delay:0ms}
.r-stagger > *:nth-child(2){animation-delay:60ms}
.r-stagger > *:nth-child(3){animation-delay:120ms}
.r-stagger > *:nth-child(4){animation-delay:180ms}
.r-stagger > *:nth-child(5){animation-delay:240ms}
.r-stagger > *:nth-child(6){animation-delay:300ms}

.rpt-bar { animation: rptBarFill 1s cubic-bezier(.4,0,.2,1) forwards }

.shimmer-row {
  background: linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size: 200% 100%;
  animation: rptShimmer 1.4s ease infinite;
  border-radius:4px;
  height:14px;
}

.rpt-row-anim { animation: rptRowIn .2s cubic-bezier(.22,1,.36,1) both }
.rpt-tr:hover td { background: #f8faff !important }

.sort-btn:hover { color: #4f46e5; }

/* Scrollbar */
.report-scroll::-webkit-scrollbar { height:6px; width:6px }
.report-scroll::-webkit-scrollbar-track { background:#f1f5f9 }
.report-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:99px }
.report-scroll::-webkit-scrollbar-thumb:hover { background:#94a3b8 }
`;

function useRptStyles() {
  useEffect(() => {
    if (document.getElementById("rpt-css-contract")) return;
    const s = document.createElement("style"); s.id = "rpt-css-contract"; s.textContent = RPT_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ══════════════════════════════════════════════════════════════
   FRAPPE API
══════════════════════════════════════════════════════════════ */
const BASE = "";
type FF = [string, string, string | number][];

function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/** Run a Frappe Script Report */
async function runReport(reportName: string, filters: Record<string, string>): Promise<{
  columns: ReportColumn[];
  result: ReportRow[];
}> {
  const body = new URLSearchParams({
    report_name: reportName,
    filters: JSON.stringify(filters),
  });
  const r = await fetch(`${BASE}/api/method/frappe.desk.query_report.run`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Frappe-CSRF-Token": csrf() },
    body: body.toString(),
  });
  if (!r.ok) throw new Error(`Report failed: ${r.statusText}`);
  const j = await r.json();
  return { columns: j.message?.columns || [], result: j.message?.result || [] };
}

/** Fetch a simple list for a Link field */
async function fGetList<T>(doctype: string, fields: string[], filters: FF = []): Promise<T[]> {
  const p = new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: "500" });
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}?${p}`, { credentials: "include" });
  if (!r.ok) return [];
  return (await r.json()).data as T[];
}

/* ══════════════════════════════════════════════════════════════
   TYPES
════════════════════════════════════════════════════════════ */
interface ReportColumn {
  label: string;
  fieldname: string;
  fieldtype: string;
  options?: string;
  width?: number;
}

type ReportRow = Record<string, string | number | null>;

interface FilterDef {
  fieldname: string;
  label: string;
  fieldtype: "Date" | "Link" | "Select" | "Data";
  options?: string;    // doctype for Link; newline-delimited values for Select
  width?: number;
}

/* ══════════════════════════════════════════════════════════════════
   REPORT DEFINITIONS  (driven by .js filter configs)
══════════════════════════════════════════════════════════════ */
const CONTRACT_SUMMARY_FILTERS: FilterDef[] = [
  { fieldname: "from_date",     label: "From Date", fieldtype: "Date"  },
  { fieldname: "to_date",       label: "To Date",   fieldtype: "Date"  },
  { fieldname: "client_code",   label: "Client",    fieldtype: "Link",   options: "Client" },
];

const CONTRACT_REGISTER_FILTERS: FilterDef[] = [
  { fieldname: "from_date",       label: "From Date",           fieldtype: "Date"   },
  { fieldname: "to_date",         label: "To Date",             fieldtype: "Date"   },
  { fieldname: "contract_code",   label: "Contract No",          fieldtype: "Link",   options: "FM Contract" },
  { fieldname: "client_code",     label: "Client",              fieldtype: "Link",   options: "Client"      },
  { fieldname: "status",          label: "Status",              fieldtype: "Select",
    options: "\nActive\nExpired\nTerminated\nSuspended" },
];

interface ReportDef {
  id: string;
  name: string;          // Frappe report_name
  label: string;         // display label
  icon: React.ReactNode;
  accent: string;
  filters: FilterDef[];
  description: string;
}

const CONTRACT_REPORTS: ReportDef[] = [
  {
    id: "summary",
    name: "Contract Summary",
    label: "Contract Summary",
    icon: <BarChart2 className="w-4 h-4" />,
    accent: "#7c3aed",
    filters: CONTRACT_SUMMARY_FILTERS,
    description: "Aggregated contract metrics including active contracts and revenue analysis by client.",
  },
  {
    id: "register",
    name: "Contract Register",
    label: "Contract Register",
    icon: <FileText className="w-4 h-4" />,
    accent: "#0891b2",
    filters: CONTRACT_REGISTER_FILTERS,
    description: "Complete contract register with details, billing cycles, and contract values.",
  },
];

/* ══════════════════════════════════════════════════════════════
   COLOUR MAPS for cell values
════════════════════════════════════════════════════════════════ */
const CONTRACT_STATUS_STYLES: Record<string, string> = {
  "Active":     "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Expired":    "bg-red-100 text-red-600 border-red-200",
  "Terminated": "bg-gray-100 text-gray-600 border-gray-200",
  "Suspended":  "bg-amber-100 text-amber-700 border-amber-200",
};

/* ════════════════════════════════════════════════════════════════
   HELPER: format cell value for display
════════════════════════════════════════════════════════════════ */
function formatContractCellValue(col: ReportColumn, val: string | number | null): { text: string; badge?: string } {
  if (val === null || val === undefined || val === "") return { text: "—" };
  const s = String(val);

  if (col.fieldname === "status") return { text: s, badge: CONTRACT_STATUS_STYLES[s] };

  if (col.fieldtype === "Currency") {
    const n = Number(val);
    return { text: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) };
  }
  if (col.fieldtype === "Float") {
    const n = Number(val);
    return { text: n.toLocaleString() };
  }
  if (col.fieldtype === "Int") return { text: Number(val).toLocaleString() };
  if (col.fieldtype === "Date" || col.fieldtype === "Datetime") {
    try { return { text: new Date(s).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) }; }
    catch { return { text: s }; }
  }
  return { text: s };
}

/* ══════════════════════════════════════════════════════════════
   SUMMARY STAT CARDS (for Contract Summary report)
════════════════════════════════════════════════════════════════ */
function ContractSummaryKPIs({ data }: { data: ReportRow[] }) {
  const totals = useMemo(() => {
    let totalContracts = 0, monthlyRevenue = 0, annualRevenue = 0;
    for (const r of data) {
      totalContracts   += Number(r.active_contracts || 0);
      monthlyRevenue   += Number(r.monthly_revenue   || 0);
      annualRevenue   += Number(r.annual_revenue || 0);
    }
    return { totalContracts, monthlyRevenue, annualRevenue };
  }, [data]);

  const cards = [
    { label: "Active Contracts", value: totals.totalContracts,     icon: <FileCheck      className="w-4 h-4" />, color: "#7c3aed", bg: "#f5f3ff" },
    { label: "Monthly Revenue",  value: totals.monthlyRevenue,   icon: <DollarSign    className="w-4 h-4" />, color: "#059669", bg: "#ecfdf5" },
    { label: "Annual Revenue",   value: totals.annualRevenue,     icon: <TrendingUp    className="w-4 h-4" />, color: "#0891b2", bg: "#ecfeff" },
  ];

  return (
    <div className="grid grid-cols-3 xl:grid-cols-3 gap-3 mb-5 r-stagger">
      {cards.map(({ label, value, icon, color, bg }) => (
        <div key={label} className="rounded-2xl border border-border bg-card px-4 py-3 relative overflow-hidden group hover:shadow-md transition-all cursor-default">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: bg }} />
          <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2 relative z-10 transition-transform group-hover:scale-110"
            style={{ background: bg, color, border: `1px solid ${color}25` }}>
            {icon}
          </div>
          <p className="text-2xl font-bold leading-none mb-1 relative z-10 r-count" style={{ color }}>{value}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground relative z-10">{label}</p>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   REGISTER KPIs (for Contract Register)
════════════════════════════════════════════════════════════════ */
function ContractRegisterKPIs({ data }: { data: ReportRow[] }) {
  const stats = useMemo(() => {
    const statusMap: Record<string, number> = {};
    const billingMap: Record<string, number> = {};
    let total = 0, totalValue = 0;
    for (const r of data) {
      total++;
      const st = String(r.status || ""); statusMap[st] = (statusMap[st] || 0) + 1;
      const bm = String(r.billing_model || ""); if (bm) billingMap[bm] = (billingMap[bm] || 0) + 1;
      totalValue += Number(r.annual_value || 0);
    }
    return { total, statusMap, billingMap, totalValue };
  }, [data]);

  const topStatuses = Object.entries(stats.statusMap).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5 r-stagger">
      {/* Total */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center mb-2" style={{ color: "#7c3aed" }}>
          <FileText className="w-4 h-4" />
        </div>
        <p className="text-2xl font-bold text-purple-600 leading-none mb-1">{stats.total}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total Contracts</p>
      </div>

      {/* Total Value */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center mb-2" style={{ color: "#059669" }}>
          <DollarSign className="w-4 h-4" />
        </div>
        <p className="text-2xl font-bold text-green-600 leading-none mb-1">
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalValue)}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total Value</p>
      </div>

      {/* Status breakdown */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center mb-2">
          <Activity className="w-4 h-4 text-sky-600" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">By Status</p>
        <div className="space-y-1">
          {topStatuses.map(([st, n]) => (
            <div key={st} className="flex items-center justify-between gap-2">
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold border truncate ${CONTRACT_STATUS_STYLES[st] || "bg-muted text-muted-foreground border-border"}`}>{st}</span>
              <span className="text-xs font-bold text-foreground shrink-0">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Model breakdown */}
      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center mb-2">
          <Receipt className="w-4 h-4 text-indigo-600" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Billing Model</p>
        <div className="space-y-1">
          {Object.entries(stats.billingMap).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([bm, n]) => (
            <div key={bm} className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground truncate">{bm}</span>
              <span className="text-xs font-bold text-foreground shrink-0">{n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   LINK FIELD INPUT (fetches options from Frappe)
════════════════════════════════════════════════════════════ */
interface LinkInputProps {
  filterDef: FilterDef;
  value: string;
  onChange: (v: string) => void;
}

function LinkInput({ filterDef, value, onChange }: LinkInputProps) {
  const [search, setSearch] = useState(value);
  const [options, setOptions] = useState<{ name: string; label: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // label field mapping per doctype
  const LABEL_FIELD: Record<string, string> = {
    "Client":      "client_name",
    "FM Contract": "contract_title",
  };

  useEffect(() => {
    if (!open) return;
    const dt = filterDef.options!;
    const labelF = LABEL_FIELD[dt] || "name";
    setLoading(true);
    fGetList<Record<string, string>>(dt, ["name", labelF], [])
      .then(rows => {
        setOptions(rows.map(r => ({ name: r.name, label: r[labelF] || r.name })));
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filterDef.options]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = options.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  function select(name: string) {
    onChange(name);
    setSearch(name);
    setOpen(false);
  }
  function clear() { onChange(""); setSearch(""); }

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center border rounded-lg bg-background transition-all ${open ? "border-ring ring-2 ring-ring/20" : "border-border"}`}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
          onFocus={() => setOpen(true)}
          placeholder={`Search ${filterDef.label}…`}
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none"
        />
        {value ? (
          <button onClick={clear} className="px-2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        ) : (
          <span className="px-2 text-muted-foreground"><ChevronDown className="w-3.5 h-3.5" /></span>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-xl shadow-xl min-w-full max-h-52 overflow-y-auto">
          {loading ? <div className="px-3 py-3 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div> : null}
          {!loading && filtered.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground">No results</div>}
          {!loading && filtered.map(o => (
            <button key={o.name} onClick={() => select(o.name)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 ${value === o.name ? "text-primary font-semibold" : ""}`}>
              {value === o.name && <Check className="w-3 h-3 shrink-0" />}
              <span className={value === o.name ? "" : "ml-5 "}>{o.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{o.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FILTER BAR (renders filters from FilterDef[])
══════════════════════════════════════════════════════════════ */
interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
  onRun: () => void;
  onReset: () => void;
  running: boolean;
}

function FilterBar({ filters, values, onChange, onRun, onReset, running }: FilterBarProps) {
  const activeCount = Object.values(values).filter(Boolean).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-5 r-fade-up relative z-40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Filters</p>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button onClick={onReset}
              className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3 h-3" /> Reset
            </button>
          )}
          <button onClick={onRun} disabled={running}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60">
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            {running ? "Running…" : "Run Report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filters.map(fd => (
          <div key={fd.fieldname}>
            <label className="block text-[11px] font-bold text-muted-foreground mb-1">{fd.label}</label>

            {fd.fieldtype === "Date" && (
              <input type="date" value={values[fd.fieldname] || ""} onChange={e => onChange(fd.fieldname, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
                  ${values[fd.fieldname] ? "border-primary/40 bg-primary/3" : "border-border"}`} />
            )}

            {fd.fieldtype === "Select" && (
              <select value={values[fd.fieldname] || ""} onChange={e => onChange(fd.fieldname, e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
                  ${values[fd.fieldname] ? "border-primary/40 bg-primary/3" : "border-border"}`}>
                <option value="">All</option>
                {(fd.options || "").split("\n").filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}

            {fd.fieldtype === "Link" && (
              <LinkInput filterDef={fd} value={values[fd.fieldname] || ""} onChange={v => onChange(fd.fieldname, v)} />
            )}

            {fd.fieldtype === "Data" && (
              <input type="text" value={values[fd.fieldname] || ""} onChange={e => onChange(fd.fieldname, e.target.value)}
                placeholder={`Enter ${fd.label}…`}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DATA TABLE
══════════════════════════════════════════════════════════════════ */
interface ContractTableProps {
  columns: ReportColumn[];
  data: ReportRow[];
  loading: boolean;
  reportId: string;
}

function ContractDataTable({ columns, data, loading, reportId }: ContractTableProps) {
  const [sortCol, setSortCol]   = useState("");
  const [sortAsc, setSortAsc]   = useState(true);
  const [search,  setSearch]    = useState("");
  const [page,    setPage]      = useState(1);
  const PAGE_SIZE = 25;

  function toggleSort(col: string) {
    if (sortCol === col) setSortAsc(v => !v);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  const searched = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(row => Object.values(row).some(v => String(v || "").toLowerCase().includes(q)));
  }, [data, search]);

  const sorted = useMemo(() => {
    if (!sortCol) return searched;
    return [...searched].sort((a, b) => {
      const av = a[sortCol] ?? ""; const bv = b[sortCol] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv : String(av).localeCompare(String(bv));
      return sortAsc ? cmp : -cmp;
    });
  }, [searched, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export CSV
  function exportCSV() {
    const headers = columns.map(c => c.label).join(",");
    const rows = sorted.map(row =>
      columns.map(c => {
        const v = String(row[c.fieldname] ?? "");
        return `"${v.replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${reportId}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-muted/20 flex gap-4">
          {[100, 80, 120, 90].map((w, i) => <div key={i} className="shimmer-row" style={{ width: w }} />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-5 py-3.5 border-b border-border flex gap-4" style={{ animationDelay: `${i * 50}ms` }}>
            {[100, 80, 120, 60, 90, 70, 80].map((w, j) => <div key={j} className="shimmer-row" style={{ width: w }} />)}
          </div>
        ))}
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground r-fade-up bg-card border border-border rounded-2xl">
        <BarChart2 className="w-12 h-12 opacity-20 mb-3" />
        <p className="text-sm font-semibold">Set your filters and run the report</p>
        <p className="text-xs opacity-60 mt-1">Results will appear here</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground r-fade-up bg-card border border-border rounded-2xl">
        <FileText className="w-12 h-12 opacity-20 mb-3" />
        <p className="text-sm font-semibold">No records found</p>
        <p className="text-xs opacity-60 mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden r-fade-up">
      {/* table toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search table…"
              className="pl-8 pr-8 py-1.5 border border-border rounded-lg text-sm bg-background w-48 focus:outline-none focus:ring-2 focus:ring-ring" />
            {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground" /></button>}
          </div>
          <span className="text-xs text-muted-foreground">
            {sorted.length} row{sorted.length !== 1 ? "s" : ""}
            {searched.length !== data.length ? ` (filtered from ${data.length})` : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto report-scroll">
        <table className="w-full border-collapse text-sm" style={{ minWidth: `${columns.length * 120}px` }}>
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-10 shrink-0">#</th>
              {columns.map(col => (
                <th key={col.fieldname}
                  className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer hover:text-primary hover:bg-muted/60 transition-colors select-none sort-btn"
                  style={{ minWidth: col.width || 100 }}
                  onClick={() => toggleSort(col.fieldname)}>
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {sortCol === col.fieldname
                      ? (sortAsc ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />)
                      : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, ri) => (
              <tr key={ri} className="rpt-tr border-b border-border/50 last:border-0 transition-colors rpt-row-anim"
                style={{ animationDelay: `${ri * 20}ms` }}>
                <td className="px-4 py-2.5 text-[11px] text-muted-foreground/50 font-mono">
                  {(page - 1) * PAGE_SIZE + ri + 1}
                </td>
                {columns.map(col => {
                  const raw = row[col.fieldname];
                  const { text, badge } = formatContractCellValue(col, raw);

                  return (
                    <td key={col.fieldname} className="px-4 py-2.5 whitespace-nowrap">
                      {badge
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge}`}>{text}</span>
                        : <span className={`text-sm ${col.fieldtype === "Int" || col.fieldtype === "Float" || col.fieldtype === "Currency" ? "font-bold text-foreground tabular-nums" : "text-foreground"}`}>
                            {col.fieldtype === "Link" && col.options
                              ? <span className="text-primary font-medium cursor-pointer hover:underline">{text}</span>
                              : text}
                          </span>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/10">
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}  ·  Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 7) {
                if (page <= 4) p = i + 1;
                else if (page >= totalPages - 3) p = totalPages - 6 + i;
                else p = page - 3 + i;
              }
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors
                    ${page === p ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   REPORT VIEW  (one per report)
════════════════════════════════════════════════════════════════════ */
function ContractReportView({ report }: { report: ReportDef }) {
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [columns,    setColumns]    = useState<ReportColumn[]>([]);
  const [data,       setData]       = useState<ReportRow[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hasRun,     setHasRun]     = useState(false);

  function setFilter(k: string, v: string) {
    setFilterVals(prev => ({ ...prev, [k]: v }));
  }

  function resetFilters() {
    setFilterVals({});
  }

  const handleRun = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { columns: cols, result } = await runReport(report.name, filterVals);
      setColumns(cols); setData(result); setHasRun(true);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, [report.name, filterVals]);

  // Auto-run on mount with empty filters
  useEffect(() => { handleRun(); }, []); // eslint-disable-line

  const activeFilters = Object.values(filterVals).filter(Boolean).length;

  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 r-fade-up">
      {/* Report header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-border/50"
            style={{ background: `${report.accent}18`, color: report.accent }}>
            {report.icon}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{report.label}</h2>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </div>
        </div>
        {hasRun && !loading && data.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {data.length} row{data.length !== 1 ? "s" : ""} loaded
          </div>
        )}
      </div>

      {/* Filters */}
      <FilterBar
        filters={report.filters}
        values={filterVals}
        onChange={setFilter}
        onRun={handleRun}
        onReset={resetFilters}
        running={loading}
      />

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive r-fade-up">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={handleRun} className="text-xs underline font-semibold">Retry</button>
        </div>
      )}

      {/* KPI cards — only after run */}
      {hasRun && !loading && data.length > 0 && (
        report.id === "summary"
          ? <ContractSummaryKPIs data={data} />
          : <ContractRegisterKPIs data={data} />
      )}

      {/* Table */}
      <ContractDataTable
        columns={columns}
        data={data}
        loading={loading}
        reportId={report.id}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function ContractReporting() {
  useRptStyles();
  const [activeId, setActiveId] = useState<string>(CONTRACT_REPORTS[0].id);
  const activeReport = CONTRACT_REPORTS.find(r => r.id === activeId)!;

  return (
    <div className="flex flex-col h-full bg-background" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Contract Report</h1>
            <p className="text-[10px] text-muted-foreground">Contract Analytics & Management</p>
          </div>
        </div>
      </div>

      {/* ── REPORT TABS ── */}
      <div className="flex items-end gap-0 border-b border-border bg-card px-5 shrink-0">
        {CONTRACT_REPORTS.map(r => {
          const active = r.id === activeId;
          return (
            <button key={r.id} onClick={() => setActiveId(r.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all relative
                ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <span style={{ color: active ? r.accent : undefined }}>{r.icon}</span>
              {r.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full" style={{ background: r.accent }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── REPORT CONTENT ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <ContractReportView key={activeId} report={activeReport} />
      </div>
    </div>
  );
}
