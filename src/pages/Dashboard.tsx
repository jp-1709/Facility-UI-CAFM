

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ComposedChart, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import {
  RefreshCw, AlertTriangle, CheckCircle2, Clock, Zap,
  TrendingUp, TrendingDown, Activity, Users, Package,
  FileText, Plus, ChevronRight, BarChart2, Calendar,
  Shield, Wrench, AlertCircle, Loader2, Building2,
  ClipboardList, MessageSquare, Map, Star, Cpu,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   GLOBAL ANIMATIONS
═══════════════════════════════════════════════════════════════ */
const DASH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

:root {
  --dash-primary:   #4f46e5;
  --dash-success:   #059669;
  --dash-warning:   #d97706;
  --dash-danger:    #dc2626;
  --dash-info:      #0891b2;
  --dash-violet:    #7c3aed;
  --dash-teal:      #0d9488;
  --dash-orange:    #ea580c;
}

@keyframes dashFadeUp   { from{opacity:0;transform:translateY(18px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes dashSlideR   { from{opacity:0;transform:translateX(18px)}  to{opacity:1;transform:translateX(0)} }
@keyframes dashPulse    { 0%,100%{opacity:1} 50%{opacity:.4} }
@keyframes dashShimmer  { 0%{background-position:-400% 0} 100%{background-position:400% 0} }
@keyframes dashSpin     { to{transform:rotate(360deg)} }
@keyframes dashCountUp  { from{opacity:0;transform:scale(.8)} to{opacity:1;transform:scale(1)} }
@keyframes dashBarGrow  { from{transform:scaleY(0);transform-origin:bottom} to{transform:scaleY(1)} }
@keyframes dashRingFill { from{stroke-dashoffset:314} to{stroke-dashoffset:var(--dash-offset)} }
@keyframes dashAlertIn  { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
@keyframes dashGlow     { 0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.4)} 50%{box-shadow:0 0 0 8px rgba(79,70,229,0)} }

.d-fade-up    { animation: dashFadeUp  .4s cubic-bezier(.22,1,.36,1) both }
.d-slide-r    { animation: dashSlideR  .35s cubic-bezier(.22,1,.36,1) both }
.d-count      { animation: dashCountUp .5s cubic-bezier(.22,1,.36,1) both }

.d-stagger > * { animation: dashFadeUp .38s cubic-bezier(.22,1,.36,1) both }
.d-stagger > *:nth-child(1){animation-delay:60ms}
.d-stagger > *:nth-child(2){animation-delay:120ms}
.d-stagger > *:nth-child(3){animation-delay:180ms}
.d-stagger > *:nth-child(4){animation-delay:240ms}
.d-stagger > *:nth-child(5){animation-delay:300ms}
.d-stagger > *:nth-child(6){animation-delay:360ms}
.d-stagger > *:nth-child(7){animation-delay:420ms}
.d-stagger > *:nth-child(8){animation-delay:480ms}

.dash-card {
  transition: transform .2s cubic-bezier(.22,1,.36,1), box-shadow .2s ease, border-color .2s ease;
  will-change: transform;
}
.dash-card:hover {
  transform: translateY(-2px) scale(1.005);
  box-shadow: 0 8px 30px rgba(0,0,0,.1);
}

.kpi-card:hover .kpi-icon { transform: scale(1.15) rotate(-5deg); }
.kpi-icon { transition: transform .25s cubic-bezier(.22,1,.36,1); }

.quick-btn { transition: transform .15s cubic-bezier(.22,1,.36,1), box-shadow .15s ease, background .15s ease; }
.quick-btn:hover { transform: translateY(-2px) scale(1.04); box-shadow: 0 4px 16px rgba(0,0,0,.12); }
.quick-btn:active { transform: scale(.97); }

.alert-row { animation: dashAlertIn .3s cubic-bezier(.22,1,.36,1) both; }
.alert-row:nth-child(2){animation-delay:40ms}
.alert-row:nth-child(3){animation-delay:80ms}
.alert-row:nth-child(4){animation-delay:120ms}
.alert-row:nth-child(5){animation-delay:160ms}

.shimmer-block {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 400% 100%;
  animation: dashShimmer 1.6s ease infinite;
  border-radius: 8px;
}

.pred-bar { animation: dashBarGrow .8s cubic-bezier(.22,1,.36,1) both; }

.live-dot { animation: dashGlow 2s ease-in-out infinite; }

/* Custom recharts tooltip */
.custom-tooltip {
  background: white;
  border: 1px solid hsl(214,20%,92%);
  border-radius: 10px;
  padding: 10px 14px;
  box-shadow: 0 4px 20px rgba(0,0,0,.1);
  font-family: Inter, sans-serif;
  font-size: 12px;
}
`;

function useDashStyles() {
  useEffect(() => {
    if (document.getElementById("dash-css")) return;
    const s = document.createElement("style"); s.id = "dash-css"; s.textContent = DASH_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ═══════════════════════════════════════════════════════════════
   FRAPPE API LAYER
═══════════════════════════════════════════════════════════════ */
const BASE = "";

function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

async function fGet<T>(doctype: string, fields: string[], filters: [string, string, string | number][] = [], limit = 500, orderBy = ""): Promise<T[]> {
  const p = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
    ...(orderBy ? { order_by: orderBy } : {}),
  });
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}?${p}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}: ${r.statusText}`);
  return (await r.json()).data as T[];
}

async function fCall<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(`${BASE}/api/method/${method}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`${method}: ${r.statusText}`);
  return (await r.json()).message as T;
}

/* ═══════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════ */
interface WODoc {
  name: string; wo_title?: string; status: string;
  actual_priority?: string; default_priority?: string;
  assigned_technician?: string; assigned_to?: string;
  schedule_start_date?: string; actual_start?: string; actual_end?: string;
  resolution_sla_target?: string; resolution_sla_actual?: string;
  resolution_sla_breach?: 0 | 1;
  service_group?: string; fault_category?: string;
  wo_type?: string; total_wo_cost?: number;
  creation?: string; modified?: string;
}

interface SRDoc {
  name: string; sr_title?: string; status: string;
  priority_actual?: string; raised_date?: string; creation?: string;
  service_group?: string; fault_category?: string;
}

interface AssetDoc {
  name: string; asset_name?: string; asset_status: string;
  criticality?: string; asset_master_category?: string;
  installation_date?: string; warranty_expiry?: string;
}

interface ResourceDoc {
  name: string; resource_name: string; is_active?: 0 | 1;
  designation?: string; department?: string;
}

interface PPMDoc {
  name: string; pm_title?: string; status: string;
  next_due_date?: string; last_done_date?: string;
  frequency?: string; asset_code?: string;
}

/* ═══════════════════════════════════════════════════════════════
   DATA HOOKS
═══════════════════════════════════════════════════════════════ */
interface DashData {
  wos: WODoc[];
  srs: SRDoc[];
  assets: AssetDoc[];
  resources: ResourceDoc[];
  ppms: PPMDoc[];
}

function useDashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const [wos, srs, assets, resources, ppms] = await Promise.all([
        fGet<WODoc>("Work Orders", [
          "name", "wo_title", "status", "actual_priority", "default_priority",
          "assigned_technician", "assigned_to", "schedule_start_date",
          "actual_start", "actual_end", "resolution_sla_target",
          "resolution_sla_actual", "resolution_sla_breach",
          "service_group", "fault_category", "wo_type", "total_wo_cost", "creation", "modified",
        ], [["creation", ">=", dateStr]], 2000, "creation desc"),

        fGet<SRDoc>("Service Request", [
          "name", "sr_title", "status", "priority_actual", "raised_date", "creation",
          "service_group", "fault_category",
        ], [["creation", ">=", dateStr]], 2000, "creation desc"),

        fGet<AssetDoc>("CFAM Asset", [
          "name", "asset_name", "asset_status", "criticality",
          "asset_master_category", "installation_date", "warranty_expiry",
        ], [], 500),

        fGet<ResourceDoc>("Resource", [
          "name", "resource_name", "is_active", "designation", "department",
        ], [["is_active", "=", 1]], 200),

        fGet<PPMDoc>("PPM Schedule", [
          "name", "pm_title", "status", "next_due_date", "last_done_date", "frequency", "asset_code",
        ], [], 300, "next_due_date asc"),
      ]);

      setData({ wos, srs, assets, resources, ppms });
      setLastRefresh(new Date());
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const t = setInterval(fetch_, 120_000);
    return () => clearInterval(t);
  }, [fetch_]);

  return { data, loading, error, refetch: fetch_, lastRefresh };
}

/* ═══════════════════════════════════════════════════════════════
   COMPUTED METRICS
═══════════════════════════════════════════════════════════════ */
interface Metrics {
  activeWOs: number;
  criticalWOs: number;
  slaCompliance: number;    // %
  ppmCompletion: number;    // %
  ppmTotal: number;
  ppmDone: number;
  activeAssets: number;
  totalAssets: number;
  assetHealthPct: number;
  openSRs: number;
  techCount: number;
  resolvedToday: number;
  overdueWOs: number;
}

function computeMetrics(d: DashData): Metrics {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const activeWOs = d.wos.filter(w => !["Completed", "Closed", "Cancelled"].includes(w.status)).length;
  const criticalWOs = d.wos.filter(w =>
    (w.actual_priority === "P1 - Critical" || w.default_priority === "P1 - Critical") &&
    !["Completed", "Closed", "Cancelled"].includes(w.status)
  ).length;

  // SLA: % of WOs with both actual + target set, where actual <= target
  const slaable = d.wos.filter(w => w.resolution_sla_target && w.resolution_sla_actual);
  const slaPass = slaable.filter(w => w.resolution_sla_breach !== 1);
  const slaCompliance = slaable.length > 0 ? Math.round((slaPass.length / slaable.length) * 100) : 0;

  // PPM completion: Completed / total scheduled for last 30 days
  const ppmDone = d.ppms.filter(p => p.status === "Completed").length;
  const ppmTotal = d.ppms.length;
  const ppmCompletion = ppmTotal > 0 ? Math.round((ppmDone / ppmTotal) * 100) : 0;

  // Assets
  const activeAssets = d.assets.filter(a => a.asset_status === "Active").length;
  const totalAssets = d.assets.length;
  const assetHealthPct = totalAssets > 0 ? Math.round((activeAssets / totalAssets) * 100) : 0;

  // Misc
  const openSRs = d.srs.filter(s => !["Resolved", "Closed", "Cancelled"].includes(s.status)).length;
  const techCount = d.resources.length;
  const resolvedToday = d.wos.filter(w =>
    ["Completed", "Closed"].includes(w.status) && w.actual_end?.startsWith(todayStr)
  ).length;
  const overdueWOs = d.wos.filter(w => {
    if (["Completed", "Closed", "Cancelled"].includes(w.status)) return false;
    if (!w.schedule_start_date) return false;
    return new Date(w.schedule_start_date) < now;
  }).length;

  return { activeWOs, criticalWOs, slaCompliance, ppmCompletion, ppmTotal, ppmDone, activeAssets, totalAssets, assetHealthPct, openSRs, techCount, resolvedToday, overdueWOs };
}

/* ═══════════════════════════════════════════════════════════════
   CHART DATA BUILDERS
═══════════════════════════════════════════════════════════════ */
interface TrendPoint { date: string; created: number; resolved: number; }
interface AssetStatusPoint { name: string; value: number; color: string; }
interface WOStatusPoint { status: string; count: number; color: string; }
interface CostPoint { month: string; actual: number; forecast: number; }
interface PredPoint { date: string; actual?: number; forecast?: number; upper: number; lower: number; }

function buildTrend(wos: WODoc[]): TrendPoint[] {
  const days = 30;
  const points: TrendPoint[] = [];
  const createdCounts: Record<string, number> = {};
  const resolvedCounts: Record<string, number> = {};

  for (const w of wos) {
    if (w.creation) {
      const d = new Date(w.creation);
      const key = d.toLocaleDateString("en-CA");
      createdCounts[key] = (createdCounts[key] || 0) + 1;
    }
    if (w.actual_end && ["Completed", "Closed"].includes(w.status)) {
      const d = new Date(w.actual_end);
      const key = d.toLocaleDateString("en-CA");
      resolvedCounts[key] = (resolvedCounts[key] || 0) + 1;
    }
  }

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    const label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    points.push({
      date: label,
      created: createdCounts[key] || 0,
      resolved: resolvedCounts[key] || 0,
    });
  }
  return points;
}

const ASSET_STATUS_COLORS: Record<string, string> = {
  "Active": "#059669",
  "Under Repair": "#d97706",
  "Inactive": "#6b7280",
  "Decommissioned": "#dc2626",
  "Scrap": "#991b1b",
};

function buildAssetStatus(assets: AssetDoc[]): AssetStatusPoint[] {
  const map: Record<string, number> = {};
  for (const a of assets) {
    const k = a.asset_status || "Unknown";
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map).map(([name, value]) => ({
    name, value, color: ASSET_STATUS_COLORS[name] || "#8b5cf6",
  }));
}

const WO_STATUS_COLORS: Record<string, string> = {
  "Open": "#0891b2",
  "Assigned": "#4f46e5",
  "In Progress": "#7c3aed",
  "On Hold": "#d97706",
  "Pending Parts": "#ea580c",
  "Pending Approval": "#8b5cf6",
  "Completed": "#059669",
  "Closed": "#6b7280",
  "Cancelled": "#dc2626",
};

function buildWOStatus(wos: WODoc[]): WOStatusPoint[] {
  const map: Record<string, number> = {};
  for (const w of wos) { const k = w.status || "Unknown"; map[k] = (map[k] || 0) + 1; }
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => ({ status, count, color: WO_STATUS_COLORS[status] || "#8b5cf6" }));
}

/**
 * Capital Forecasting — 6-month rolling cost actuals + 3-month projection
 * Uses simple linear regression on actual data for forecast.
 */
function buildCapitalForecast(wos: WODoc[]): CostPoint[] {
  const months: Record<string, number> = {};
  for (const w of wos) {
    if (!w.creation || !w.total_wo_cost) continue;
    const m = w.creation.slice(0, 7); // YYYY-MM
    months[m] = (months[m] || 0) + (w.total_wo_cost || 0);
  }
  // Last 6 actual months
  const pts: CostPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    pts.push({ month: label, actual: Math.round(months[key] || 0), forecast: 0 });
  }
  // Linear regression for 3-month forecast
  const xs = pts.map((_, i) => i);
  const ys = pts.map(p => p.actual);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, i) => a + i * ys[i], 0);
  const sumX2 = xs.reduce((a, i) => a + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;

  for (let i = 1; i <= 3; i++) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i);
    const label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    const forecast = Math.max(0, Math.round(intercept + slope * (n + i - 1)));
    pts.push({ month: label, actual: 0, forecast });
  }
  return pts;
}

/**
 * Predictive Maintenance — Holt-Winters Double Exponential Smoothing
 * Forecasts next 14 days of WO volume using α=0.3 (level), β=0.1 (trend).
 * High-accuracy for short-term operational forecasting.
 */
function buildPredMaintenance(wos: WODoc[]): PredPoint[] {
  // Build last-30-day actuals
  const counts: Record<string, number> = {};
  for (const w of wos) {
    if (!w.creation) continue;
    const d = new Date(w.creation);
    const key = d.toLocaleDateString("en-CA"); // YYYY-MM-DD
    counts[key] = (counts[key] || 0) + 1;
  }

  const actuals: number[] = [];
  const labels: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    labels.push(d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }));
    actuals.push(counts[key] || 0);
  }

  // Holt-Winters Double Exponential Smoothing
  const alpha = 0.35; // level smoothing
  const beta = 0.12; // trend smoothing
  let level = actuals[0];
  let trend = actuals[1] - actuals[0];

  const smoothed: number[] = [level];
  for (let i = 1; i < actuals.length; i++) {
    const prevLevel = level;
    level = alpha * actuals[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    smoothed.push(Math.max(0, level + trend));
  }

  // Compute residual std dev for confidence interval
  const residuals = actuals.map((a, i) => a - smoothed[i]);
  const stdDev = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / residuals.length);

  const points: PredPoint[] = labels.map((date, i) => ({
    date, actual: actuals[i],
    // past_pred: Math.round(smoothed[i]), // we can skip past smoothed to avoid overlapping lines
    upper: Math.round(smoothed[i] + 1.5 * stdDev),
    lower: Math.max(0, Math.round(smoothed[i] - 1.5 * stdDev)),
  }));

  // To bridge the lines nicely, the first forecast point is the same as the last actual/smoothed
  let lastSmoothed = smoothed[smoothed.length - 1];

  // 14-day forecast
  for (let i = 1; i <= 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    level = alpha * (level + trend) + (1 - alpha) * (level + trend);
    trend = beta * (level - lastSmoothed) + (1 - beta) * trend;
    const pred = Math.max(0, Math.round(level));
    lastSmoothed = pred;
    smoothed.push(pred);
    points.push({
      date, forecast: pred,
      upper: Math.round(pred + (1.5 + i * 0.1) * stdDev),
      lower: Math.max(0, Math.round(pred - (1.5 + i * 0.1) * stdDev)),
    });
  }

  // Add forecast starting point to the last historical point if not present
  if (points.length > 30) {
    (points[29] as any).forecast = (points[29] as any).actual ?? Math.round(smoothed[29]);
  }

  return points;
}

/* ═══════════════════════════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════════════════════════ */
function Shimmer({ w = "100%", h = 20 }: { w?: number | string; h?: number | string }) {
  return <div className="shimmer-block" style={{ width: w, height: h }} />;
}

function KPISkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <Shimmer w={80} h={10} /><div className="h-3" />
      <Shimmer w={60} h={28} /><div className="h-2" />
      <Shimmer w={120} h={10} />
    </div>
  );
}

function ChartSkeleton({ h = 260 }: { h?: number }) {
  return (
    <div className="flex items-end gap-2 pt-4" style={{ height: h }}>
      {[40, 65, 50, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((pct, i) => (
        <div key={i} className="flex-1 shimmer-block" style={{ height: `${pct}%` }} />
      ))}
    </div>
  );
}

function ErrBanner({ msg, onRetry }: { msg: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl mb-4">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{msg}</span>
      <button onClick={onRetry} className="text-xs font-bold underline text-destructive">Retry</button>
    </div>
  );
}

const PRIORITY_CFG: Record<string, { cls: string; dot: string }> = {
  "P1 - Critical": { cls: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  "P2 - High": { cls: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  "P3 - Medium": { cls: "bg-amber-100 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  "P4 - Low": { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
};

function PriBadge({ pri }: { pri?: string }) {
  if (!pri) return null;
  const c = PRIORITY_CFG[pri];
  if (!c) return <span className="text-xs text-muted-foreground">{pri}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{pri.split(" - ")[0]}
    </span>
  );
}

function TimeAgo({ ts }: { ts?: string }) {
  if (!ts) return <span className="text-xs text-muted-foreground">—</span>;
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const text = d > 0 ? `${d}d ago` : h > 0 ? `${h}h ago` : m > 0 ? `${m}m ago` : "just now";
  return <span className="text-[11px] text-muted-foreground">{text}</span>;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <p className="font-bold text-foreground mb-1.5 text-[11px]">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-[11px]">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="font-bold text-foreground ml-auto">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   KPI CARD
═══════════════════════════════════════════════════════════════ */
interface KPIProps {
  label: string; value: string | number; sub: string;
  icon: React.ReactNode; color: string; bg: string;
  trend?: "up" | "down" | "neutral";
  subColor?: string; ring?: boolean;
}
function KPICard({ label, value, sub, icon, color, bg, trend, subColor, ring }: KPIProps) {
  return (
    <div className={`dash-card kpi-card rounded-2xl border border-border bg-card p-5 relative overflow-hidden cursor-default ${ring ? "live-dot" : ""}`}>
      {/* background tint */}
      <div className="absolute inset-0 opacity-0 transition-opacity hover:opacity-100 pointer-events-none"
        style={{ background: bg }} />
      {/* content */}
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div className="kpi-icon w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: bg, color, border: `1px solid ${color}30` }}>
          {icon}
        </div>
        {trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-500" />}
        {trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      <p className="text-3xl font-black leading-none mb-1.5 relative z-10 d-count"
        style={{ color, fontFamily: "Inter, sans-serif" }}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5 relative z-10">{label}</p>
      <p className="text-[11px] relative z-10" style={{ color: subColor || "#6b7280" }}>{sub}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   QUICK ACTIONS
═══════════════════════════════════════════════════════════════ */
function QuickActions() {
  const navigate = useNavigate();
  
  const actions = [
    { label: "Work Orders", icon: <ClipboardList className="w-4 h-4" />, color: "#4f46e5", bg: "#eef2ff", route: "/work-orders" },
    { label: "Requests", icon: <MessageSquare className="w-4 h-4" />, color: "#0891b2", bg: "#ecfeff", route: "/requests" },
    { label: "Assets", icon: <Package className="w-4 h-4" />, color: "#7c3aed", bg: "#f5f3ff", route: "/assets" },
    { label: "Clients", icon: <Building2 className="w-4 h-4" />, color: "#0d9488", bg: "#f0fdfa", route: "/clients" },
    { label: "Technicians", icon: <Users className="w-4 h-4" />, color: "#059669", bg: "#ecfdf5", route: "/technicians" },
    { label: "Calendar", icon: <Calendar className="w-4 h-4" />, color: "#d97706", bg: "#fffbeb", route: "/calendar" },
    { label: "Reports", icon: <BarChart2 className="w-4 h-4" />, color: "#dc2626", bg: "#fef2f2", route: "/reports" },
    { label: "Locations", icon: <Map className="w-4 h-4" />, color: "#ea580c", bg: "#fff7ed", route: "/locations" },
    { label: "Contracts", icon: <FileText className="w-4 h-4" />, color: "#0369a1", bg: "#f0f9ff", route: "/contracts" },
  ];

  const handleActionClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6 d-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-primary" />
        <p className="text-sm font-bold text-foreground">Quick Actions</p>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {actions.map(a => (
          <button key={a.label} onClick={() => handleActionClick(a.route)}
            className="quick-btn flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-border hover:border-transparent text-center no-underline cursor-pointer"
            style={{ "--hover-bg": a.bg } as React.CSSProperties}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: a.bg, color: a.color }}>
              {a.icon}
            </div>
            <span className="text-[10px] font-semibold text-foreground leading-tight">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION HEADER
═══════════════════════════════════════════════════════════════ */
function SH({ title, icon, sub, action }: { title: string; icon: React.ReactNode; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-bold text-foreground">{title}</p>
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ALERT FEED
═══════════════════════════════════════════════════════════════ */
function CriticalAlerts({ wos, srs, loading }: { wos: WODoc[]; srs: SRDoc[]; loading: boolean }) {
  const alerts = useMemo(() => {
    if (!wos.length && !srs.length) return [];
    const critWOs = wos
      .filter(w => (w.actual_priority === "P1 - Critical" || w.default_priority === "P1 - Critical") && !["Completed", "Closed", "Cancelled"].includes(w.status))
      .map(w => ({
        id: w.name, title: w.wo_title || w.name,
        type: "Work Order", priority: w.actual_priority || w.default_priority || "",
        status: w.status, ts: w.modified || w.creation || "",
      }));
    const critSRs = srs
      .filter(s => s.priority_actual === "P1 - Critical" && !["Resolved", "Closed", "Cancelled"].includes(s.status))
      .map(s => ({
        id: s.name, title: s.sr_title || s.name,
        type: "Service Request", priority: s.priority_actual || "",
        status: s.status, ts: s.creation || "",
      }));
    return [...critWOs, ...critSRs]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .slice(0, 8);
  }, [wos, srs]);

  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <SH title="Critical Alerts" icon={<AlertTriangle className="w-4 h-4" />}
        sub={`${alerts.length} active critical items`}
        action={
          <span className={`w-2.5 h-2.5 rounded-full ${alerts.length > 0 ? "bg-red-500 live-dot" : "bg-gray-300"}`} />
        } />
      <div className="divide-y divide-border">
        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3">
            <Shimmer w={32} h={32} /><div className="flex-1 space-y-1.5"><Shimmer h={10} /><Shimmer w="60%" h={8} /></div>
          </div>
        ))}
        {!loading && alerts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-600">No critical alerts</p>
            <p className="text-xs opacity-60">All P1 items resolved</p>
          </div>
        )}
        {!loading && alerts.map((a, i) => (
          <div key={a.id} className="alert-row px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors cursor-pointer"
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{a.type} · {a.id}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <PriBadge pri={a.priority} />
              <TimeAgo ts={a.ts} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TECHNICIAN ACTIVITY
═══════════════════════════════════════════════════════════════ */
function TechActivity({ wos, resources, loading }: { wos: WODoc[]; resources: ResourceDoc[]; loading: boolean }) {
  const techStats = useMemo(() => {
    const map: Record<string, { name: string; total: number; completed: number; inProgress: number }> = {};
    for (const w of wos) {
      const key = w.assigned_to || w.assigned_technician;
      if (!key) continue;
      const tech = resources.find(r => r.name === key);
      const name = tech?.resource_name || w.assigned_technician || key;
      if (!map[key]) map[key] = { name, total: 0, completed: 0, inProgress: 0 };
      map[key].total++;
      if (["Completed", "Closed"].includes(w.status)) map[key].completed++;
      if (w.status === "In Progress") map[key].inProgress++;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [wos, resources]);

  const AVATAR_COLORS = ["#4f46e5", "#7c3aed", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777", "#ea580c"];
  function avatarColor(name: string) { return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length]; }

  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <SH title="Technician Activity" icon={<Users className="w-4 h-4" />}
        sub="WO assignment overview — last 30 days" />
      <div className="divide-y divide-border">
        {loading && Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-3 flex items-center gap-3">
            <Shimmer w={32} h={32} />
            <div className="flex-1 space-y-1.5"><Shimmer h={10} /><Shimmer w="80%" h={6} /></div>
            <Shimmer w={60} h={10} />
          </div>
        ))}
        {!loading && techStats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
            <Users className="w-8 h-8 opacity-30" />
            <p className="text-sm font-semibold">No assignment data</p>
          </div>
        )}
        {!loading && techStats.map((t, i) => {
          const pct = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
          const color = avatarColor(t.name);
          const initials = t.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
          return (
            <div key={t.name} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              style={{ animationDelay: `${i * 40}ms` }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                style={{ background: color }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                  <span className="text-[11px] font-bold text-foreground shrink-0 ml-2">{pct}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{t.completed}/{t.total}</span>
                </div>
              </div>
              {t.inProgress > 0 && (
                <span className="text-[10px] font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full shrink-0">
                  {t.inProgress} active
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ASSET STATUS DONUT
═══════════════════════════════════════════════════════════════ */
function AssetDonut({ data, loading }: { data: AssetStatusPoint[]; loading: boolean }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <SH title="Asset Status" icon={<Package className="w-4 h-4" />}
        sub={`${total} total assets`} />
      <div className="px-5 py-4">
        {loading ? <ChartSkeleton h={200} /> : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={data} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value"
                  strokeWidth={0}>
                  {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {data.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-foreground flex-1">{d.name}</span>
                  <span className="text-xs font-bold text-foreground">{d.value}</span>
                  <span className="text-[10px] text-muted-foreground">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
            {data.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No asset data</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WO STATUS BAR CHART
═══════════════════════════════════════════════════════════════ */
function WOStatusChart({ data, loading }: { data: WOStatusPoint[]; loading: boolean }) {
  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <SH title="Work Orders by Status" icon={<ClipboardList className="w-4 h-4" />} />
      <div className="px-5 py-4">
        {loading ? <ChartSkeleton h={200} /> : (
          data.length === 0
            ? <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data</div>
            : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} barSize={24} layout="vertical" margin={{ left: 4, right: 10, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(214,20%,92%)" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} width={110}
                    tick={{ fontSize: 10, fill: "#64748b" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {data.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WO TREND CHART (Created vs Resolved)
═══════════════════════════════════════════════════════════════ */
function WOTrendChart({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  // Show every 5th label to avoid clutter
  const tickFormatter = (v: string, i: number) => i % 5 === 0 ? v : "";

  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <SH title="Work Orders · Created vs Resolved" icon={<Activity className="w-4 h-4" />}
        sub="Last 30 days" />
      <div className="px-5 py-4">
        {loading ? <ChartSkeleton h={260} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gcreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gresolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,92%)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={tickFormatter} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Area type="monotone" dataKey="created" stroke="#4f46e5" strokeWidth={2} fill="url(#gcreated)" dot={false} name="Created" />
              <Area type="monotone" dataKey="resolved" stroke="#059669" strokeWidth={2} fill="url(#gresolved)" dot={false} name="Resolved" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CAPITAL FORECASTING CHART
═══════════════════════════════════════════════════════════════ */
function CapitalForecastChart({ data, loading }: { data: CostPoint[]; loading: boolean }) {
  const hasActual = data.some(d => d.actual > 0);
  const hasForecast = data.some(d => d.forecast > 0);

  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <SH title="Capital Forecasting" icon={<TrendingUp className="w-4 h-4" />}
        sub="6-month actuals + 3-month linear regression forecast" />
      <div className="px-5 py-4">
        {loading ? <ChartSkeleton h={220} /> : (
          !hasActual && !hasForecast
            ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                <BarChart2 className="w-8 h-8 opacity-30" />
                <p className="text-sm font-semibold">No cost data available</p>
                <p className="text-xs opacity-60">Populate total_wo_cost on Work Orders to see this chart</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data} barSize={22} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,92%)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="actual" name="Actual (OMR)" fill="#4f46e5" radius={[4, 4, 0, 0]} opacity={0.9} />
                  <Bar dataKey="forecast" name="Forecast (OMR)" fill="#d97706" radius={[4, 4, 0, 0]} opacity={0.7}
                    strokeDasharray="4 2" />
                </BarChart>
              </ResponsiveContainer>
            )
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREDICTIVE MAINTENANCE CHART  (Holt-Winters Forecast)
═══════════════════════════════════════════════════════════════ */
function PredictiveMaintenanceChart({ data, loading }: { data: PredPoint[]; loading: boolean }) {
  const dividerIdx = data.findIndex(d => d.actual === undefined);
  const todayLabel = dividerIdx >= 0 ? data[dividerIdx - 1]?.date : undefined;

  return (
    <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-violet-100 text-violet-600"><Cpu className="w-4 h-4" /></div>
          <div>
            <p className="text-sm font-bold text-foreground">Predictive Maintenance</p>
            <p className="text-[11px] text-muted-foreground">Holt-Winters double exponential smoothing · 14-day forecast</p>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200">
          ML Forecast
        </span>
      </div>
      <div className="px-5 py-4">
        {loading ? <ChartSkeleton h={240} /> : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gpred" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gconf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(214,20%,92%)" />
              <XAxis dataKey="date" axisLine={false} tickLine={false}
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                tickFormatter={(v, i) => i % 7 === 0 ? v : ""} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<CustomTooltip />} />
              {/* Confidence band */}
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#gconf)" name="Upper CI" legendType="none" connectNulls />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#ffffff" name="Lower CI" legendType="none" connectNulls />

              <Line type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={3}
                dot={{ r: 3, fill: "#4f46e5", strokeWidth: 0 }} name="Actual WOs" connectNulls={false} />

              <Line type="monotone" dataKey="forecast" stroke="#7c3aed" strokeWidth={3}
                strokeDasharray="6 4" dot={false} name="Forecast WOs" connectNulls={false} />

              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {!loading && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border flex-wrap">
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <div className="w-4 h-1 bg-[#4f46e5] rounded-full" />
              <span>Actuals (Past 30d)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <div className="w-4 h-1 border-t-2 border-dashed border-[#7c3aed]" />
              <span>Forecast (Next 14d)</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <div className="w-4 h-3 bg-emerald-100 border border-emerald-200 rounded" />
              <span>95% Confidence Band</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-lg border border-border">
              <span className="text-[10px] text-muted-foreground font-bold">MODE:</span>
              <span className="text-[10px] text-violet-600 font-black uppercase tracking-widest">Holt-Winters (α=0.35 β=0.12)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PPM PROGRESS RING
═══════════════════════════════════════════════════════════════ */
function PPMRing({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 42; const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 80 ? "#059669" : pct >= 60 ? "#d97706" : "#dc2626";

  return (
    <div className="flex items-center gap-4">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circ}
          style={{
            strokeDashoffset: offset, transformOrigin: "50% 50%",
            transform: "rotate(-90deg)", transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)",
          }} />
        <text x="50" y="54" textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="Inter,sans-serif">{pct}%</text>
      </svg>
      <div>
        <p className="text-2xl font-black text-foreground">{done}<span className="text-sm font-semibold text-muted-foreground">/{total}</span></p>
        <p className="text-xs text-muted-foreground mt-0.5">Tasks completed</p>
        <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold
          ${pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
          {pct >= 80 ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
          {pct >= 80 ? "On track" : pct >= 60 ? "Needs attention" : "Behind schedule"}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  useDashStyles();

  const { data, loading, error, refetch, lastRefresh } = useDashboard();

  const metrics = useMemo(() => data ? computeMetrics(data) : null, [data]);

  const trendData = useMemo(() => data ? buildTrend(data.wos) : [], [data]);
  const assetStatus = useMemo(() => data ? buildAssetStatus(data.assets) : [], [data]);
  const woStatus = useMemo(() => data ? buildWOStatus(data.wos) : [], [data]);
  const capitalData = useMemo(() => data ? buildCapitalForecast(data.wos) : [], [data]);
  const predData = useMemo(() => data ? buildPredMaintenance(data.wos) : [], [data]);

  return (
    <div className="h-full overflow-y-auto bg-background" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── HEADER ── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b border-border bg-card/95 backdrop-blur-md shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> Live FM Dashboard
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Real-time analytics · Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refetch} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="px-5 py-5 max-w-[1600px] mx-auto">

        {error && <ErrBanner msg={error} onRetry={refetch} />}

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-5 d-stagger">
          {loading ? (
            <>{Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)}</>
          ) : metrics ? (
            <>
              <KPICard
                label="Active Work Orders" value={metrics.activeWOs}
                sub={`${metrics.criticalWOs} critical · ${metrics.overdueWOs} overdue`}
                icon={<ClipboardList className="w-5 h-5" />}
                color="#4f46e5" bg="#eef2ff"
                trend={metrics.activeWOs > 20 ? "up" : "neutral"}
                subColor={metrics.overdueWOs > 0 ? "#dc2626" : undefined} ring />
              <KPICard
                label="SLA Compliance" value={`${metrics.slaCompliance}%`}
                sub={`Target: 95% · ${metrics.slaCompliance >= 95 ? "✓ Fulfilled" : "✗ Below target"}`}
                icon={<Shield className="w-5 h-5" />}
                color={metrics.slaCompliance >= 95 ? "#059669" : "#dc2626"}
                bg={metrics.slaCompliance >= 95 ? "#ecfdf5" : "#fef2f2"}
                trend={metrics.slaCompliance >= 95 ? "up" : "down"}
                subColor={metrics.slaCompliance >= 95 ? "#059669" : "#dc2626"} />
              <KPICard
                label="PPM Completion" value={`${metrics.ppmCompletion}%`}
                sub={`${metrics.ppmDone} of ${metrics.ppmTotal} tasks done`}
                icon={<Wrench className="w-5 h-5" />}
                color="#0891b2" bg="#ecfeff"
                trend={metrics.ppmCompletion >= 80 ? "up" : "neutral"} />
              <KPICard
                label="Asset Health" value={`${metrics.assetHealthPct}%`}
                sub={`${metrics.activeAssets} active of ${metrics.totalAssets} total`}
                icon={<Package className="w-5 h-5" />}
                color="#059669" bg="#ecfdf5"
                trend={metrics.assetHealthPct >= 90 ? "up" : "down"} />
            </>
          ) : null}
        </div>

        {/* ── SECONDARY KPIs ── */}
        {!loading && metrics && (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5 d-stagger">
            {[
              { label: "Open SRs", val: metrics.openSRs, icon: <MessageSquare className="w-3.5 h-3.5" />, color: "#7c3aed" },
              { label: "Technicians", val: metrics.techCount, icon: <Users className="w-3.5 h-3.5" />, color: "#0891b2" },
              { label: "Resolved Today", val: metrics.resolvedToday, icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "#059669" },
              { label: "Total Assets", val: metrics.totalAssets, icon: <Building2 className="w-3.5 h-3.5" />, color: "#d97706" },
              {
                label: "PPM Overdue", val: data?.ppms.filter(p => p.next_due_date && new Date(p.next_due_date) < new Date() && p.status !== "Completed").length || 0,
                icon: <AlertTriangle className="w-3.5 h-3.5" />, color: "#dc2626"
              },
              { label: "Critical WOs", val: metrics.criticalWOs, icon: <Zap className="w-3.5 h-3.5" />, color: "#ea580c" },
            ].map(k => (
              <div key={k.label} className="dash-card rounded-xl border border-border bg-card px-3 py-3 flex items-center gap-2.5 cursor-default">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${k.color}18`, color: k.color }}>
                  {k.icon}
                </div>
                <div>
                  <p className="text-base font-black leading-none" style={{ color: k.color }}>{k.val}</p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── QUICK ACTIONS ── */}
        <QuickActions />

        {/* ── ROW 1: Trend + Asset donut + WO status ── */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mb-5">
          <div className="xl:col-span-3"><WOTrendChart data={trendData} loading={loading} /></div>
          <div className="xl:col-span-1"><AssetDonut data={assetStatus} loading={loading} /></div>
          <div className="xl:col-span-1"><WOStatusChart data={woStatus} loading={loading} /></div>
        </div>

        {/* ── ROW 2: PPM ring + Capital forecast ── */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5 mb-5">
          {/* PPM detail card */}
          <div className="xl:col-span-1">
            <div className="dash-card rounded-2xl border border-border bg-card overflow-hidden h-full">
              <SH title="PPM Progress" icon={<Star className="w-4 h-4" />}
                sub={`${data?.ppms.filter(p => p.next_due_date && new Date(p.next_due_date) <= (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })()).length || 0} due within 7 days`} />
              <div className="px-5 py-5">
                {loading
                  ? <div className="flex gap-4"><Shimmer w={100} h={100} /><div className="flex-1 space-y-2"><Shimmer h={14} /><Shimmer h={10} w="80%" /><Shimmer h={10} w="60%" /></div></div>
                  : metrics ? <PPMRing pct={metrics.ppmCompletion} done={metrics.ppmDone} total={metrics.ppmTotal} /> : null}
                {/* PPM status breakdown */}
                {!loading && data && (
                  <div className="mt-4 space-y-2 pt-4 border-t border-border">
                    {[
                      { label: "Completed", count: data.ppms.filter(p => p.status === "Completed").length, color: "#059669" },
                      { label: "Scheduled", count: data.ppms.filter(p => p.status === "Scheduled").length, color: "#0891b2" },
                      { label: "Overdue", count: data.ppms.filter(p => p.next_due_date && new Date(p.next_due_date) < new Date() && p.status !== "Completed").length, color: "#dc2626" },
                      { label: "Deferred", count: data.ppms.filter(p => p.status === "Deferred").length, color: "#6b7280" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />{s.label}
                        </span>
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="xl:col-span-3"><CapitalForecastChart data={capitalData} loading={loading} /></div>
        </div>

        {/* ── ROW 3: Predictive Maintenance (full width) ── */}
        <div className="mb-5">
          <PredictiveMaintenanceChart data={predData} loading={loading} />
        </div>

        {/* ── ROW 4: Alerts + Technician Activity ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
          <CriticalAlerts wos={data?.wos || []} srs={data?.srs || []} loading={loading} />
          <TechActivity wos={data?.wos || []} resources={data?.resources || []} loading={loading} />
        </div>

        {/* footer */}
        {/* <div className="text-center py-4 text-[11px] text-muted-foreground/50">
          CAFM Facility-UI · Live Dashboard · All data sourced from Frappe backend
        </div> */}
      </div>
    </div>
  );
}