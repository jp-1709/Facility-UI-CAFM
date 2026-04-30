import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, Plus, Filter, MapPin, ChevronDown, ChevronRight,
  MoreVertical, Pencil, X, Loader2, AlertCircle, RefreshCw,
  Camera, Zap, Shield, Wrench, Thermometer, Droplets,
  Server, Building2, AlertTriangle, CheckCircle, Clock,
  Activity, Package, TrendingUp, ChevronLeft, ExternalLink,
  QrCode, Download, Copy, Check, Share2, Scan, Eye,
  Tag, LayoutGrid, List, Package as PackageIcon, RotateCcw,
} from "lucide-react";
import { toast as sonnerToast } from "sonner";

/* ═══════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════ */

const ASSET_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes assetFadeUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes assetSlideR {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes assetPulse {
  0%,100% { opacity: 1; }
  50%      { opacity: .5; }
}
@keyframes progressFill {
  from { width: 0%; }
  to   { width: var(--target-w); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
@keyframes criticalPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  50%       { box-shadow: 0 0 0 4px rgba(239,68,68,0.15); }
}
@keyframes cardReveal {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes dotPing {
  0%   { transform: scale(1); opacity: 1; }
  75%, 100% { transform: scale(2.2); opacity: 0; }
}
@keyframes statusGlow {
  0%,100% { opacity: 0.6; }
  50%     { opacity: 1; }
}

.a-fade-up   { animation: assetFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.a-slide-r   { animation: assetSlideR 0.22s cubic-bezier(.4,0,.2,1) both; }
.a-stagger > * { animation: assetFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.a-stagger > *:nth-child(1)  { animation-delay: 0ms; }
.a-stagger > *:nth-child(2)  { animation-delay: 50ms; }
.a-stagger > *:nth-child(3)  { animation-delay: 100ms; }
.a-stagger > *:nth-child(4)  { animation-delay: 150ms; }
.a-stagger > *:nth-child(5)  { animation-delay: 200ms; }
.a-stagger > *:nth-child(6)  { animation-delay: 250ms; }
.a-stagger > *:nth-child(7)  { animation-delay: 300ms; }
.a-stagger > *:nth-child(8)  { animation-delay: 350ms; }

.asset-card-row { transition: background .14s; }
.asset-card-row:hover .asset-arrow { opacity: 1; transform: translateX(3px); }
.asset-arrow { opacity: 0; transition: opacity .14s, transform .14s; }

/* ── Rich Asset Card ── */
.asset-rich-card {
  position: relative;
  transition: transform 0.18s cubic-bezier(.22,1,.36,1),
              box-shadow 0.18s cubic-bezier(.22,1,.36,1),
              border-color 0.18s ease;
  will-change: transform;
  font-family: 'DM Sans', sans-serif;
}
.asset-rich-card:hover {
  transform: translateY(-1px) scale(1.008);
  box-shadow: 0 6px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06);
}
.asset-rich-card.selected {
  transform: translateY(-1px) scale(1.010);
}
.asset-rich-card.is-critical {
  animation: criticalPulse 2.8s ease-in-out infinite;
}
.asset-rich-card .card-shine {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
  opacity: 0; transition: opacity 0.2s;
}
.asset-rich-card:hover .card-shine { opacity: 1; }

.status-dot-live {
  position: relative;
}
.status-dot-live::after {
  content: '';
  position: absolute; inset: 0;
  border-radius: 50%;
  background: inherit;
  animation: dotPing 1.8s cubic-bezier(0,0,.2,1) infinite;
}

.asset-code-mono { font-family: 'JetBrains Mono', monospace; }

.ppm-track {
  position: relative;
  height: 3px;
  border-radius: 99px;
  background: rgba(0,0,0,0.08);
  overflow: visible;
}
.ppm-track-fill {
  height: 100%;
  border-radius: 99px;
  animation: progressFill 1s cubic-bezier(.22,1,.36,1) forwards;
  position: relative;
}
.ppm-track-fill::after {
  content: '';
  position: absolute;
  right: -2px; top: -2px;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: inherit;
  box-shadow: 0 0 0 2px white;
}

.stat-shimmer {
  background: linear-gradient(90deg,transparent 0%,rgba(255,255,255,.12) 50%,transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2.5s ease infinite;
}
.ppm-bar-fill { animation: progressFill .9s cubic-bezier(.4,0,.2,1) forwards; }

/* Card reveal for groups */
.card-group-reveal > * {
  animation: cardReveal 0.3s cubic-bezier(.22,1,.36,1) both;
}
.card-group-reveal > *:nth-child(odd)  { animation-delay: calc(var(--i,0) * 60ms); }
.card-group-reveal > *:nth-child(even) { animation-delay: calc(var(--i,0) * 60ms + 30ms); }
`;

function useAssetStyles() {
  useEffect(() => {
    if (document.getElementById("asset-css")) return;
    const s = document.createElement("style");
    s.id = "asset-css";
    s.textContent = ASSET_CSS;
    document.head.appendChild(s);
  }, [] as unknown[]);
}

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS  (unchanged)
═══════════════════════════════════════════ */

const FRAPPE_BASE = "";
type FrappeFilters = [string, string, string | number][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FrappeFilters = [], limit = 500, order_by?: string): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
    ...(order_by && { order_by }),
  });
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype} failed: ${res.statusText}`);
  return (await res.json()).data as T[];
}

async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.statusText}`);
  return (await res.json()).data as T;
}

async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": getCsrfToken() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { 
    const e = await res.json().catch(() => ({})); 
    interface ErrorResponse { exc_type?: string; message?: string; }
    throw new Error(((e as ErrorResponse).exc_type) || "POST failed"); 
  }
  return (await res.json()).data as T;
}

function getCsrfToken() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════
   TYPES  (unchanged)
═══════════════════════════════════════════ */

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": getCsrfToken() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Update failed");
  return (await res.json()).data as T;
}
interface PPMInfo { last_run_date?: string; next_run_date?: string; }
interface WOHistoryItem {
  name: string; wo_title?: string; description?: string;
  status?: string; schedule_start_date?: string; creation?: string;
}

/* ═══════════════════════════════════════════
   HOOKS  (unchanged)
═══════════════════════════════════════════ */

function useFrappeList<T>(doctype: string, fields: string[], filters: FrappeFilters, deps: unknown[], skip = false, order_by?: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    if (skip) { setData([]); return; }
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters, 500, order_by)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip, order_by]);
  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useFrappeDoc<T>(doctype: string, name: string, refreshKey = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true); setError(null);
    frappeGetDoc<T>(doctype, name)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctype, name, refreshKey]);
  return { data, loading, error };
}

/* ═══════════════════════════════════════════
   COLOUR / ICON MAPS  (unchanged)
═══════════════════════════════════════════ */

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; border: string; glow: string }> = {
  Active: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", border: "#10b981", glow: "#10b98120" },
  Inactive: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", border: "#9ca3af", glow: "#9ca3af15" },
  Decommissioned: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-400", border: "#ef4444", glow: "#ef444415" },
  "Under Repair": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", border: "#f59e0b", glow: "#f59e0b20" },
  Scrap: { bg: "bg-red-50", text: "text-red-400", dot: "bg-red-300", border: "#fca5a5", glow: "#fca5a510" },
};

const CRITICALITY_CFG: Record<string, { cls: string; dot: string }> = {
  Critical: { cls: "bg-red-100 text-red-700 border border-red-200", dot: "#ef4444" },
  High: { cls: "bg-orange-100 text-orange-700 border border-orange-200", dot: "#f97316" },
  Medium: { cls: "bg-amber-100 text-amber-700 border border-amber-200", dot: "#f59e0b" },
  Low: { cls: "bg-gray-100 text-gray-600 border border-gray-200", dot: "#9ca3af" },
};

const CAT_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  MEP: { icon: <Thermometer className="w-5 h-5" />, color: "#0ea5e9", bg: "#0ea5e915" },
  "Banking Equipment": { icon: <Building2 className="w-5 h-5" />, color: "#10b981", bg: "#10b98115" },
  "IT Infrastructure": { icon: <Server className="w-5 h-5" />, color: "#8b5cf6", bg: "#8b5cf615" },
  Civil: { icon: <Building2 className="w-5 h-5" />, color: "#78716c", bg: "#78716c15" },
  Safety: { icon: <Shield className="w-5 h-5" />, color: "#ef4444", bg: "#ef444415" },
  HVAC: { icon: <Thermometer className="w-5 h-5" />, color: "#06b6d4", bg: "#06b6d415" },
  Plumbing: { icon: <Droplets className="w-5 h-5" />, color: "#3b82f6", bg: "#3b82f615" },
  Electrical: { icon: <Zap className="w-5 h-5" />, color: "#f59e0b", bg: "#f59e0b15" },
  Security: { icon: <Shield className="w-5 h-5" />, color: "#dc2626", bg: "#dc262615" },
  Other: { icon: <Wrench className="w-5 h-5" />, color: "#6b7280", bg: "#6b728015" },
};

function getCatCfg(masterCat?: string, cat?: string) {
  if (cat) for (const k of Object.keys(CAT_ICONS)) if (cat.toLowerCase().includes(k.toLowerCase())) return CAT_ICONS[k];
  if (masterCat && CAT_ICONS[masterCat]) return CAT_ICONS[masterCat];
  return { icon: <Package className="w-5 h-5" />, color: "#6b7280", bg: "#6b728015" };
}

const WO_STATUS_CFG: Record<string, { cls: string; dot: string }> = {
  Open: { cls: "bg-emerald-100 text-emerald-700", dot: "#10b981" },
  "In Progress": { cls: "bg-blue-100 text-blue-700", dot: "#3b82f6" },
  Completed: { cls: "bg-gray-100 text-gray-500", dot: "#9ca3af" },
  Cancelled: { cls: "bg-red-100 text-red-600", dot: "#ef4444" },
};

function isWarrantyExpired(expiry?: string) { return !!expiry && new Date(expiry) < new Date(); }
function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateShort(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

/* ═══════════════════════════════════════════
   BASE UI HELPERS
═══════════════════════════════════════════ */

function LoadingSpinner({ small }: { small?: boolean }) {
  return <div className={`flex items-center justify-center ${small ? "py-4" : "py-14"}`}><Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-6 h-6"}`} /></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl m-3">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-xs font-semibold text-destructive underline">Retry</button>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG["Inactive"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> {status}
    </span>
  );
}

function CriticalityBadge({ criticality }: { criticality: string }) {
  const c = CRITICALITY_CFG[criticality] || CRITICALITY_CFG["Low"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${c.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />{criticality}
    </span>
  );
}

function InfoRow({ label, value, link, warn, mono }: { label: string; value?: string | null; link?: boolean; warn?: boolean; mono?: boolean }) {
  if (!value) return (
    <div className="flex flex-col py-2.5 border-b border-border/50 last:border-0 relative z-10 group">
      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 mb-0.5 transition-colors group-hover:text-muted-foreground">{label}</span>
      <span className="text-[13px] text-muted-foreground/40 font-medium">—</span>
    </div>
  );
  return (
    <div className="flex flex-col py-2.5 border-b border-border/50 last:border-0 relative z-10 group">
      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 mb-0.5 transition-colors group-hover:text-muted-foreground/90">{label}</span>
      {link
        ? <span className="text-[13px] text-primary font-bold cursor-pointer hover:underline">{value}</span>
        : <span className={`text-[13px] font-semibold ${warn ? "text-red-600" : "text-foreground"} ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>}
    </div>
  );
}

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`asset-rich-card rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col h-full ${className || ""}`}>
      <div className="card-shine" />
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-2 bg-gradient-to-r from-muted/30 to-transparent relative z-10 shrink-0">
        {icon && <div className="p-1 px-1.5 rounded-md bg-background border border-border/50 shadow-sm text-primary">{icon}</div>}
        <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/80">{title}</p>
      </div>
      <div className="px-4 pb-2 relative z-10 flex-1">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
═══════════════════════════════════════════ */

interface AssetStats { total: number; active: number; underRepair: number; critical: number; }

function StatsBar({ stats, loading }: { stats: AssetStats; loading: boolean }) {
  const items = [
    { label: "Total Assets", value: stats.total, icon: <Package className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115", border: "#6366f130" },
    { label: "Active", value: stats.active, icon: <CheckCircle className="w-4 h-4" />, color: "#10b981", bg: "#10b98115", border: "#10b98130" },
    { label: "Under Repair", value: stats.underRepair, icon: <Wrench className="w-4 h-4" />, color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b30" },
    { label: "Critical", value: stats.critical, icon: <AlertTriangle className="w-4 h-4" />, color: "#ef4444", bg: "#ef444415", border: "#ef444430" },
  ];

  return (
    <div className="flex items-stretch border-b border-border bg-card/80 backdrop-blur-sm a-stagger" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {items.map(({ label, value, icon, color, bg, border }) => (
        <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3.5 border-r border-border/40 last:border-r-0 relative overflow-hidden group cursor-default">
          {/* subtle hover bg */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: bg }} />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110"
            style={{ background: bg, color, border: `1px solid ${border}` }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : icon}
          </div>
          <div className="relative z-10">
            <p className="text-[22px] font-bold text-foreground leading-none tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {loading ? <span className="text-muted-foreground/30">—</span> : value}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
          {/* decorative number bg */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[42px] font-black opacity-[0.04] leading-none select-none pointer-events-none" style={{ color, fontFamily: "'DM Sans', sans-serif" }}>
            {loading ? "" : value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ASSET CARD (left list)
═══════════════════════════════════════════ */

function AssetCard({ a, selected, onClick, ppm }: { a: AssetListItem; selected: boolean; onClick: (name: string) => void; ppm?: PPMInfo }) {
  const catCfg = getCatCfg(a.asset_master_category, a.asset_category);
  const statusCfg = STATUS_CFG[a.asset_status] || STATUS_CFG["Inactive"];
  const warrantyWarn = isWarrantyExpired(a.warranty_expiry);

  return (
    <button
      onClick={() => onClick(a.name)}
      className={`asset-card-row w-full text-left px-4 py-3.5 border-b border-border/60 flex gap-3 transition-all
        ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}
      style={{ borderLeft: `3px solid ${selected ? statusCfg.border : "transparent"}` }}
    >
      {/* icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative"
        style={{ background: catCfg.bg, color: catCfg.color }}>
        {catCfg.icon}
        {/* status dot */}
        <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${statusCfg.dot}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{a.asset_name}</p>
        <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{a.asset_code}</p>
        {(a.property_name || a.property_code) && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-2.5 h-2.5 shrink-0" />
            {a.location_full_path || [a.property_name || a.property_code, a.zone_code].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StatusBadge status={a.asset_status} />
          {warrantyWarn && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600 border border-red-200">
              <AlertTriangle className="w-2.5 h-2.5" /> Warranty
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <CriticalityBadge criticality={a.criticality} />
        {ppm?.next_run_date && (
          <span className="text-[9px] text-muted-foreground mt-auto whitespace-nowrap">
            Next PM: {formatDateShort(ppm.next_run_date)}
          </span>
        )}
        <ChevronRight className="asset-arrow w-3.5 h-3.5 text-muted-foreground mt-auto" />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   PPM MAINTENANCE TIMELINE
═══════════════════════════════════════════ */

function PPMTimeline({ ppm, installDate }: { ppm?: PPMInfo; installDate?: string }) {
  if (!ppm?.last_run_date && !ppm?.next_run_date) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>No PPM schedule configured</span>
      </div>
    );
  }

  const last = ppm.last_run_date ? new Date(ppm.last_run_date).getTime() : null;
  const next = ppm.next_run_date ? new Date(ppm.next_run_date).getTime() : null;
  const now = Date.now();

  let progress = 50;
  if (last && next) {
    const total = next - last;
    const elapsed = now - last;
    progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  const daysToNext = next ? Math.ceil((next - now) / 86_400_000) : null;
  const overdue = daysToNext !== null && daysToNext < 0;

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
        <span>Last PM</span>
        <span className={overdue ? "text-red-500 font-bold" : daysToNext !== null && daysToNext <= 7 ? "text-amber-600 font-bold" : ""}>
          {daysToNext !== null
            ? overdue ? `Overdue by ${Math.abs(daysToNext)}d` : `Next PM in ${daysToNext}d`
            : ""}
        </span>
        <span>Next PM</span>
      </div>
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="ppm-bar-fill absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            "--target-w": `${progress}%`,
            width: `${progress}%`,
            background: overdue ? "#ef4444" : progress > 80 ? "#f59e0b" : "#10b981",
          } as React.CSSProperties}
        />
        {/* Today marker */}
        <div className="absolute top-0 bottom-0 w-[3px] bg-foreground/50 rounded-full shadow-sm" style={{ left: `${progress}%`, transform: 'translateX(-50%)' }} />
      </div>
      <div className="flex items-center justify-between text-[11px] font-bold text-foreground">
        <span>{formatDate(ppm.last_run_date)}</span>
        <span className="bg-muted px-2.5 py-0.5 rounded-md text-[10px] font-bold text-muted-foreground border border-border/50 shadow-sm">TODAY</span>
        <span className={overdue ? "text-red-600" : ""}>{formatDate(ppm.next_run_date)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   WORK ORDER TIMELINE
═══════════════════════════════════════════ */

function WOTimeline({ workOrders }: { workOrders: WOHistoryItem[] }) {
  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
        <Activity className="w-6 h-6" />
        <p className="text-xs">No work orders found</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* vertical line */}
      <div className="absolute left-3.5 top-2 bottom-2 w-px bg-border" />
      <div className="flex flex-col gap-0 a-stagger">
        {workOrders.map((wo) => {
          const cfg = WO_STATUS_CFG[wo.status || ""] || { cls: "bg-muted text-muted-foreground", dot: "#9ca3af" };
          return (
            <div key={wo.name} className="flex gap-3 group pl-1 pb-4 last:pb-0">
              {/* dot */}
              <div className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center shrink-0 mt-0.5 z-10"
                style={{ background: cfg.dot }}>
                <span className="w-2 h-2 rounded-full bg-white" />
              </div>
              {/* content */}
              <div className="flex-1 bg-muted/30 rounded-xl border border-border/50 px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary hover:underline cursor-pointer">{wo.name}</p>
                    <p className="text-xs text-foreground mt-0.5 line-clamp-1">{wo.wo_title || wo.description || "—"}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {wo.status && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cfg.cls}`}>{wo.status}</span>
                    )}
                    <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                      {wo.schedule_start_date ? new Date(wo.schedule_start_date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   QR CODE HELPERS
═══════════════════════════════════════════ */

/** Build the canonical asset scan URL */
function buildAssetScanUrl(assetCode: string): string {
  const base = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}${window.location.pathname}`
    : "";
  return `${base}?asset_scan=${encodeURIComponent(assetCode)}`;
}

/** Returns the qrserver.com image URL for a given data string */
function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&ecc=M&margin=2`;
}

/* ── Public asset view (shown when QR code is scanned) ── */
interface AssetPublicViewProps { assetCode: string; onClose?: () => void; }

function AssetPublicView({ assetCode, onClose }: AssetPublicViewProps) {
  const { data: a, loading, error } = useFrappeDoc<AssetListItem>("CFAM Asset", assetCode);
  const { data: ppms } = useFrappeList<PPMInfo>(
    "PPM Schedule", ["next_due_date", "last_done_date"],
    assetCode ? [["asset_code", "=", assetCode]] : [], [assetCode], !assetCode
  );

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading asset details…</p>
      </div>
    </div>
  );

  if (error || !a) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">Asset Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">No asset found with code <strong>{assetCode}</strong></p>
        {onClose && <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold">Go Back</button>}
      </div>
    </div>
  );

  const catCfg = getCatCfg(a.asset_master_category, a.asset_category);
  const statusCfg = STATUS_CFG[a.asset_status] || STATUS_CFG["Inactive"];
  const ppm = ppms[0];
  const warrantyExpired = isWarrantyExpired(a.warranty_expiry);
  const scanUrl = buildAssetScanUrl(a.asset_code);

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* sticky top bar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: catCfg.bg, color: catCfg.color }}>
            {catCfg.icon}
          </div>
          <span className="text-sm font-bold text-foreground">Asset Details</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-1 rounded">Scanned QR</span>
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Hero card */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm"
          style={{ background: `linear-gradient(135deg, ${catCfg.bg} 0%, transparent 80%)` }}>
          <div className="px-5 pt-5 pb-4">
            {/* image / icon */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl border border-white/50 shadow-md flex items-center justify-center overflow-hidden shrink-0"
                style={{ background: catCfg.bg, color: catCfg.color }}>
                {a.asset_image
                  ? <img src={a.asset_image.startsWith("http") ? a.asset_image : `http://facility.quantcloud.in${a.asset_image}`}
                      className="w-16 h-16 object-cover" alt="" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  : <span className="scale-150">{catCfg.icon}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground leading-tight mb-1">{a.asset_name}</h1>
                <p className="text-[12px] font-mono text-muted-foreground">{a.asset_code}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={a.asset_status} />
                  <CriticalityBadge criticality={a.criticality} />
                </div>
              </div>
            </div>

            {/* Category tags */}
            <div className="flex flex-wrap gap-1.5">
              {a.asset_master_category && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{ color: catCfg.color, background: `${catCfg.color}18`, borderColor: `${catCfg.color}30` }}>
                  {a.asset_master_category}
                </span>
              )}
              {a.asset_category && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">{a.asset_category}</span>
              )}
              {a.asset_sub_category && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted/50 border border-border/50 text-muted-foreground">{a.asset_sub_category}</span>
              )}
            </div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 gap-3">
          {/* Location */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded-md bg-primary/10 border border-primary/20"><MapPin className="w-3.5 h-3.5 text-primary" /></div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Location</p>
            </div>
            <div className="space-y-2">
              {[["Property", a.property_name || a.property_code], ["Zone", a.zone_code], ["Sub Zone", a.sub_zone_code], ["Base Unit", a.base_unit_code]].map(([lbl, val]) =>
                val ? (
                  <div key={lbl} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{lbl}</span>
                    <span className="text-sm font-semibold text-foreground">{val}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Make & Specs */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded-md bg-violet-100 border border-violet-200"><Package className="w-3.5 h-3.5 text-violet-600" /></div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Make & Specifications</p>
            </div>
            <div className="space-y-2">
              {[["Manufacturer", a.make_brand], ["Model", a.model], ["Serial No", a.serial_number]].map(([lbl, val]) =>
                val ? (
                  <div key={lbl} className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{lbl}</span>
                    <span className={`text-sm font-semibold text-foreground ${lbl === "Serial No" ? "font-mono text-[11px]" : ""}`}>{val}</span>
                  </div>
                ) : null
              )}
            </div>
          </div>

          {/* Lifecycle */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1 rounded-md bg-amber-100 border border-amber-200"><Clock className="w-3.5 h-3.5 text-amber-600" /></div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Lifecycle</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Install Date</span>
                <span className="text-sm font-semibold text-foreground">{formatDate(a.installation_date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Warranty Expiry</span>
                <span className={`text-sm font-semibold ${warrantyExpired ? "text-red-600" : "text-foreground"}`}>
                  {formatDate(a.warranty_expiry)}{warrantyExpired ? " (Expired)" : ""}
                </span>
              </div>
              {a.service_group_code && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Service Group</span>
                  <span className="text-sm font-semibold text-foreground">{a.service_group_code}</span>
                </div>
              )}
            </div>
          </div>

          {/* PPM Schedule */}
          {ppm && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-md bg-emerald-100 border border-emerald-200"><Activity className="w-3.5 h-3.5 text-emerald-600" /></div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Maintenance Schedule</p>
              </div>
              <PPMTimeline ppm={ppm} installDate={a.installation_date} />
            </div>
          )}
        </div>

        {/* QR scan info */}
        <div className="rounded-xl bg-muted/50 border border-border p-4 flex items-center gap-3">
          <img src={qrImageUrl(scanUrl, 64)} alt="QR" className="w-16 h-16 rounded-lg border border-border bg-white" />
          <div>
            <p className="text-xs font-bold text-foreground mb-0.5">This page was opened via QR code scan</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Scan the QR code on this asset to always get the latest maintenance status.
            </p>
          </div>
        </div>

        {/* footer */}
        <div className="text-center py-2">
          <p className="text-[10px] text-muted-foreground">CAFM Asset Register · {a.asset_code}</p>
        </div>
      </div>
    </div>
  );
}

/* ── QR Code section shown in DetailView ── */
function QRCodeSection({ asset }: { asset: AssetListItem }) {
  const [copied, setCopied] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const scanUrl = buildAssetScanUrl(asset.asset_code);
  const qrSrc = qrImageUrl(scanUrl, 200);
  const qrLargeSrc = qrImageUrl(scanUrl, 400);

  function handleCopy() {
    navigator.clipboard.writeText(scanUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = qrLargeSrc;
    a.download = `QR-${asset.asset_code}.png`;
    a.click();
  }

  return (
    <>
      <div className="mb-6 px-1">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[13px] font-bold text-foreground">QR Code</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
            <Scan className="w-2.5 h-2.5" /> Scannable
          </span>
        </div>

        <div className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-card shadow-sm">
          {/* QR image */}
          <div className="relative group cursor-pointer shrink-0" onClick={() => setShowFullscreen(true)}>
            <div className="w-[120px] h-[120px] rounded-xl border border-border bg-white flex items-center justify-center overflow-hidden shadow-sm">
              {!imgLoaded && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              <img
                src={qrSrc}
                alt={`QR code for ${asset.asset_code}`}
                className={`w-full h-full object-contain transition-opacity ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
              />
            </div>
            {/* hover overlay */}
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Info + actions */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <p className="text-xs font-bold text-foreground mb-0.5">Scan to view asset</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Scan with any camera app to instantly view live details, maintenance status, and history for <strong>{asset.asset_name}</strong>.
              </p>
            </div>

            {/* URL chip */}
            <div className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1.5 mb-3 overflow-hidden">
              <Share2 className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[10px] font-mono text-muted-foreground truncate flex-1">{scanUrl}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all
                  ${copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border text-foreground hover:bg-muted hover:border-primary/30"}`}>
                {copied ? <><Check className="w-3 h-3" />Copied!</> : <><Copy className="w-3 h-3" />Copy Link</>}
              </button>

              <button onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-all">
                <Download className="w-3 h-3" /> Download QR
              </button>

              <button onClick={() => setShowFullscreen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-all">
                <QrCode className="w-3 h-3" /> Full Size
              </button>
            </div>
          </div>
        </div>

        {/* Usage hint */}
        <div className="mt-2 flex items-start gap-2 px-1">
          <div className="w-1 h-1 rounded-full bg-muted-foreground/40 mt-1.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground/70">
            Print and affix the QR code to the physical asset for instant field access. Scanning opens a live view — no login required.
          </p>
        </div>
      </div>

      {/* Fullscreen QR modal */}
      {showFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setShowFullscreen(false)}>
          <div className="bg-card rounded-3xl p-6 max-w-sm w-full shadow-2xl a-fade-up text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">{asset.asset_name}</h3>
                <p className="text-[11px] font-mono text-muted-foreground">{asset.asset_code}</p>
              </div>
              <button onClick={() => setShowFullscreen(false)} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>

            <div className="mx-auto w-56 h-56 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden shadow-sm mb-4">
              <img src={qrLargeSrc} alt="QR" className="w-full h-full object-contain" />
            </div>

            <p className="text-[11px] text-muted-foreground mb-4">Scan with any camera to view asset details</p>

            <div className="flex gap-2">
              <button onClick={handleCopy}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all
                  ${copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border text-foreground hover:bg-muted"}`}>
                {copied ? <><Check className="w-4 h-4" />Copied</> : <><Copy className="w-4 h-4" />Copy Link</>}
              </button>
              <button onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface AssetListItem {
  name: string; asset_code: string; asset_name: string;
  asset_master_category?: string; asset_category?: string; asset_sub_category?: string;
  branch_code?: string; branch_name?: string;
  property_code?: string; property_name?: string;
  zone_code?: string; zone_name?: string;
  sub_zone_code?: string; sub_zone_name?: string;
  base_unit_code?: string; base_unit_name?: string;
  location_full_path?: string;
  client_code?: string; client_name?: string;
  make_brand?: string; model?: string; serial_number?: string;
  installation_date?: string; warranty_expiry?: string;
  purchase_cost?: number; criticality?: string; asset_status?: string;
  qr_code_url?: string; service_group_code?: string; asset_image?: string;
}

interface NewAssetForm {
  asset_code: string; asset_name: string; asset_master_category: string; asset_category: string;
  asset_sub_category: string; make_brand: string; model: string; serial_number: string;
  branch_code: string; branch_name: string;
  property_code: string; property_name: string;
  zone_code: string; zone_name: string;
  sub_zone_code: string; sub_zone_name: string;
  base_unit_code: string; base_unit_name: string;
  location_full_path: string;
  installation_date: string; warranty_expiry: string; purchase_cost: string; criticality: string;
  client_code: string; asset_status: string; service_group_code: string; asset_image?: string;
  _pending_file?: File;
}

const BLANK: NewAssetForm = {
  asset_code: "", asset_name: "", asset_master_category: "", asset_category: "",
  asset_sub_category: "", make_brand: "", model: "", serial_number: "",
  branch_code: "", branch_name: "", property_code: "", property_name: "",
  zone_code: "", zone_name: "", sub_zone_code: "", sub_zone_name: "",
  base_unit_code: "", base_unit_name: "",
  location_full_path: "",
  installation_date: "", warranty_expiry: "", purchase_cost: "", criticality: "",
  client_code: "", asset_status: "Active", service_group_code: "",
};

// Form input components moved outside to prevent re-creation on each render
const FormInput = ({ label, value, onChange, type = "text", placeholder, required }: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  type?: string; 
  placeholder?: string; 
  required?: boolean 
}) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" 
    />
  </div>
);

const FormSelect = ({ label, value, onChange, opts, required }: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  opts: { v: string; l: string }[]; 
  required?: boolean 
}) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">Select…</option>
      {opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

function NewAssetForm({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [form, setForm] = useState<NewAssetForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof NewAssetForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Dynamic data fetching
  const { data: branches } = useFrappeList<{ name: string; branch_code: string; branch_name: string }>(
    "Branch", ["name", "branch_code", "branch_name"], [["is_active", "=", 1]], [], false, "branch_code asc"
  );
  const { data: properties } = useFrappeList<{ name: string; property_code: string; property_name: string }>(
    "Property", ["name", "property_code", "property_name"],
    form.branch_code ? [["branch_code", "=", form.branch_code], ["is_active", "=", 1]] : [["is_active", "=", 1]],
    [form.branch_code]
  );
  const { data: zones } = useFrappeList<{ name: string; zone_code: string; zone_name: string }>(
    "Zone", ["name", "zone_code", "zone_name"],
    form.property_code ? [["property_code", "=", form.property_code], ["is_active", "=", 1]] : [],
    [form.property_code], !form.property_code, "zone_code asc"
  );
  const { data: subZones } = useFrappeList<{ name: string; sub_zone_code: string; sub_zone_name: string }>(
    "Sub Zone", ["name", "sub_zone_code", "sub_zone_name"],
    form.zone_code ? [["zone_code", "=", form.zone_code], ["is_active", "=", 1]] : [],
    [form.zone_code], !form.zone_code, "sub_zone_code asc"
  );
  const { data: baseUnits } = useFrappeList<{ name: string; base_unit_code: string; base_unit_name: string }>(
    "Base Unit", ["name", "base_unit_code", "base_unit_name"],
    form.sub_zone_code ? [["sub_zone_code", "=", form.sub_zone_code], ["is_active", "=", 1]] : [],
    [form.sub_zone_code], !form.sub_zone_code, "base_unit_code asc"
  );
  const { data: clients } = useFrappeList<{ name: string; client_name: string }>(
    "Client", ["name", "client_name"], [], [], false, "client_name asc"
  );

  const handleBranchChange = (v: string) => {
    setForm(f => ({ ...f, branch_code: v, property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "" }));
  };

  /* dynamic path update */
  useEffect(() => {
    const parts: string[] = [];
    let bName = "", pName = "", zName = "", szName = "", buName = "";

    if (form.branch_code) {
      const b = (branches as any[]).find(x => x.name === form.branch_code);
      if (b) bName = b.branch_name;
    }
    if (form.property_code) {
      const p = (properties as any[]).find(x => x.name === form.property_code);
      if (p) { pName = p.property_name; parts.push(pName); }
    }
    if (form.zone_code) {
      const z = (zones as any[]).find(x => x.name === form.zone_code);
      if (z) { zName = z.zone_name; parts.push(zName); }
    }
    if (form.sub_zone_code) {
      const s = (subZones as any[]).find(x => x.name === form.sub_zone_code);
      if (s) { szName = s.sub_zone_name; parts.push(szName); }
    }
    if (form.base_unit_code) {
      const bu = (baseUnits as any[]).find(x => x.name === form.base_unit_code);
      if (bu) { buName = bu.base_unit_name; parts.push(buName); }
    }

    const newPath = parts.join(" / ");
    if (
      newPath !== form.location_full_path ||
      bName !== form.branch_name ||
      pName !== form.property_name ||
      zName !== form.zone_name ||
      szName !== form.sub_zone_name ||
      buName !== form.base_unit_name
    ) {
      setForm(f => ({
        ...f,
        location_full_path: newPath,
        branch_name: bName,
        property_name: pName,
        zone_name: zName,
        sub_zone_name: szName,
        base_unit_name: buName,
      }));
    }
  }, [form.branch_code, form.property_code, form.zone_code, form.sub_zone_code, form.base_unit_code, branches, properties, zones, subZones, baseUnits]);
  const handlePropertyChange = (v: string) => {
    setForm(f => ({ ...f, property_code: v, zone_code: "", sub_zone_code: "", base_unit_code: "" }));
  };
  const handleZoneChange = (v: string) => {
    setForm(f => ({ ...f, zone_code: v, sub_zone_code: "", base_unit_code: "" }));
  };
  const handleSubZoneChange = (v: string) => {
    setForm(f => ({ ...f, sub_zone_code: v, base_unit_code: "" }));
  };

  // Handle image upload - store file for later upload after document creation
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setSaveError('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setSaveError('Image size should be less than 5MB');
      return;
    }
    
    // Store file for later upload after document is created
    setUploadedImage(URL.createObjectURL(file)); // Show preview
    setForm(f => ({ 
      ...f, 
      _pending_file: file
    }));
  };

  const handleSubmit = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.asset_name || !form.asset_master_category || !form.asset_category || !form.property_code || !form.criticality || !form.client_code) {
      setSaveError("Name, Master Category, Category, Property, Criticality, and Client are required."); return;
    }
    setSaving(true); setSaveError(null);
    try {
      // 1. Create the document first (without image — we upload after to get proper Frappe linkage)
      const { _pending_file, asset_image: _ai, ...restForm } = form;
      const docData = {
        ...restForm,
        purchase_cost: restForm.purchase_cost ? Number(restForm.purchase_cost) : undefined,
      };
      const result = await frappeCreate<{ name: string; asset_code: string }>('CFAM Asset', docData);
      if (!result?.name) throw new Error('No document returned from save');

      // 2. Upload image now that the doc exists so Frappe can link the File record
      //    and auto-set the asset_image field via fieldname param.
      if (_pending_file) {
        const fd = new FormData();
        fd.append('file', _pending_file, _pending_file.name);
        fd.append('is_private', '0');
        fd.append('folder', 'Home/Attachments');
        fd.append('doctype', 'CFAM Asset');
        fd.append('docname', result.name);
        fd.append('fieldname', 'asset_image');
        const upRes = await fetch('/api/method/upload_file', {
          method: 'POST',
          body: fd,
          credentials: 'include',
          headers: { 'X-Frappe-CSRF-Token': getCsrfToken() }
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          // Frappe returns { message: { file_url: "..." } } — guard against variant shapes
          const msg = upJson.message;
          const newUrl: string | null =
            msg && typeof msg === 'object'
              ? (msg.file_url ?? msg.file_name ?? null)
              : typeof msg === 'string' ? msg : null;
          // upload_file with fieldname already saves asset_image on the doc,
          // but we do an explicit update to guarantee the value is persisted.
          if (newUrl) {
            try {
              await frappeUpdate('CFAM Asset', result.name, { asset_image: newUrl });
            } catch (imgErr) {
              console.warn('asset_image field update failed after upload:', imgErr);
            }
          }
        } else {
          console.warn('Image upload failed — asset created without image');
        }
      }

      // 3. Auto-generate and save QR code URL (non-blocking)
      try {
        const assetCode = result.asset_code || result.name;
        const qrUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?asset_scan=${encodeURIComponent(assetCode)}`;
        await frappeUpdate('CFAM Asset', result.name, { qr_code_url: qrUrl });
      } catch { /* non-blocking — QR save failure doesn't block asset creation */ }

      // 🎉 Professional toast notification for asset creation
      sonnerToast.success(
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <PackageIcon className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base text-white leading-tight">Asset Created</span>
            <span className="text-sm text-white/80 leading-tight">{result.asset_code || result.name} • Created successfully</span>
          </div>
        </div>,
        {
          duration: 5000,
          position: 'top-right',
          icon: null,
          style: {
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            padding: '24px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
          className: 'animate-bounce-in',
        }
      );

      onCreated(result.name);
    } catch (e: unknown) { 
      setSaveError((e as Error).message); 
    } finally { 
      setSaving(false); 
    }
  };

  const STEPS = ["Identity", "Location", "Lifecycle", "Client"];

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 a-fade-up">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">New Asset</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Add a new asset to the register</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>

      {/* step indicator */}
      <div className="flex items-center gap-0 mb-6 rounded-xl overflow-hidden border border-border">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`flex-1 py-2 text-xs font-semibold text-center transition-all border-r border-border last:border-r-0
              ${step === i ? "bg-primary text-primary-foreground" : step > i ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
            <span className="mr-1 opacity-60">{i + 1}.</span>{s}
          </button>
        ))}
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      {/* Step 0 — Identity */}
      {step === 0 && (
        <div className="a-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Asset Code" value={form.asset_code} onChange={(v) => set('asset_code')(v)} placeholder="AST-001" required />
            <FormInput label="Asset Name" value={form.asset_name} onChange={(v) => set('asset_name')(v)} placeholder="Chiller Unit A" required />
          </div>
          <FormSelect label="Master Category"
            value={form.asset_master_category} onChange={(v) => set('asset_master_category')(v)} required
            opts={["MEP", "Banking Equipment", "IT Infrastructure", "Civil", "Electrical", "Security", "Fire & Safety", "Other"].map((v) => ({ v, l: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Asset Category" value={form.asset_category} onChange={(v) => set('asset_category')(v)} placeholder="e.g. Air Handling Unit" required />
            <FormInput label="Asset Sub Category" value={form.asset_sub_category} onChange={(v) => set('asset_sub_category')(v)} placeholder="e.g. Chiller" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <FormInput label="Manufacturer" value={form.make_brand} onChange={(v) => set('make_brand')(v)} placeholder="e.g. Carrier" />
            <FormInput label="Model" value={form.model} onChange={(v) => set('model')(v)} placeholder="e.g. 30XA-500" />
            <FormInput label="Serial No" value={form.serial_number} onChange={(v) => set('serial_number')(v)} placeholder="SN-XXXXXXX" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-foreground mb-1.5">Asset Image</label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div className={`border-2 ${uploadedImage ? 'border-green-500 bg-green-50' : 'border-dashed border-border'} rounded-xl py-7 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors ${uploading ? 'opacity-60' : 'bg-muted/10'}`}>
                {uploading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> <span className="text-xs">Uploading...</span></>
                ) : uploadedImage ? (
                  <><CheckCircle className="w-5 h-5 text-green-600" /> <span className="text-xs text-green-600">Image uploaded</span></>
                ) : (
                  <><Camera className="w-5 h-5" /> <span className="text-xs">Attach or drag photo here</span></>
                )}
              </div>
              {uploadedImage && (
                <img src={uploadedImage} alt="Asset preview" className="mt-2 w-20 h-20 object-cover rounded-lg" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Location */}
      {step === 1 && (
        <div className="a-fade-up">
          <FormSelect label="Branch" value={form.branch_code} onChange={handleBranchChange} required
            opts={branches.map((b) => ({ v: b.name, l: `${b.branch_code} — ${b.branch_name}` }))} />
          <FormSelect label="Property" value={form.property_code} onChange={handlePropertyChange} required
            opts={properties.map((p) => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
          <FormSelect label="Zone" value={form.zone_code} onChange={handleZoneChange}
            opts={zones.map((z) => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
          <FormSelect label="Sub Zone" value={form.sub_zone_code} onChange={handleSubZoneChange}
            opts={subZones.map((s) => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} />
          <FormSelect label="Base Unit" value={form.base_unit_code} onChange={(v) => set('base_unit_code')(v)}
            opts={baseUnits.map((bu) => ({ v: bu.name, l: `${bu.base_unit_code} — ${bu.base_unit_name}` }))} />
          <FormInput label="Service Group" value={form.service_group_code} onChange={(v) => set('service_group_code')(v)} placeholder="MEP, Civil, IT…" />
        </div>
      )}

      {/* Step 2 — Lifecycle */}
      {step === 2 && (
        <div className="a-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Installation Date" value={form.installation_date} onChange={(v) => set('installation_date')(v)} type="date" />
            <FormInput label="Warranty Expiry" value={form.warranty_expiry} onChange={(v) => set('warranty_expiry')(v)} type="date" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Purchase Cost (OMR)" value={form.purchase_cost} onChange={(v) => set('purchase_cost')(v)} type="number" placeholder="25000" />
            <FormSelect label="Criticality" value={form.criticality} onChange={(v) => set('criticality')(v)} required
              opts={["Critical", "High", "Medium", "Low"].map((v) => ({ v, l: v }))} />
          </div>
          <FormSelect label="Asset Status" value={form.asset_status} onChange={(v) => set('asset_status')(v)} required
            opts={["Active", "Inactive", "Decommissioned", "Under Repair", "Scrap"].map((v) => ({ v, l: v }))} />
        </div>
      )}

      {/* Step 3 — Client */}
      {step === 3 && (
        <div className="a-fade-up">
          <FormSelect label="Client" value={form.client_code} onChange={(v) => set('client_code')(v)} required
            opts={clients.map((c) => ({ v: c.name, l: c.client_name }))} />
        </div>
      )}

      {/* navigation */}
      <div className="flex items-center gap-3 mt-6">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
            Next: {STEPS[step + 1]} <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Asset</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDIT ASSET DRAWER
   Slides in from right; full Frappe-style inline
   edit for every field + image re-upload.
═══════════════════════════════════════════ */

interface EditAssetState {
  asset_name: string; asset_code: string;
  asset_master_category: string; asset_category: string; asset_sub_category: string;
  make_brand: string; model: string; serial_number: string;
  branch_code: string; property_code: string; zone_code: string; sub_zone_code: string; base_unit_code: string;
  installation_date: string; warranty_expiry: string; purchase_cost: string;
  criticality: string; asset_status: string; service_group_code: string;
  client_code: string; asset_image: string;
  _pendingFile?: File;
}

function assetToEditState(a: AssetListItem): EditAssetState {
  return {
    asset_name: a.asset_name || "",
    asset_code: a.asset_code || "",
    asset_master_category: a.asset_master_category || "",
    asset_category: a.asset_category || "",
    asset_sub_category: a.asset_sub_category || "",
    make_brand: a.make_brand || "",
    model: a.model || "",
    serial_number: a.serial_number || "",
    branch_code: a.branch_code || "",
    property_code: a.property_code || "",
    zone_code: a.zone_code || "",
    sub_zone_code: a.sub_zone_code || "",
    base_unit_code: a.base_unit_code || "",
    installation_date: a.installation_date || "",
    warranty_expiry: a.warranty_expiry || "",
    purchase_cost: a.purchase_cost ? String(a.purchase_cost) : "",
    criticality: a.criticality || "",
    asset_status: a.asset_status || "Active",
    service_group_code: a.service_group_code || "",
    client_code: a.client_code || "",
    asset_image: a.asset_image || "",
  };
}


/* ── Edit Drawer Helpers (defined outside to prevent focus loss) ── */

const EditSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50">
      <span className="p-1 rounded-md bg-primary/10 text-primary">{icon}</span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">{title}</p>
    </div>
    {children}
  </div>
);

const EditInput = ({ label, value, onChange, dirty, type = "text", placeholder, req }: {
  label: string; value: string; onChange: (v: string) => void; dirty?: boolean; type?: string; placeholder?: string; req?: boolean;
}) => (
  <div className="mb-3.5">
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
      {label}
      {req && <span className="text-destructive">*</span>}
      {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Modified" />}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
        ${dirty ? "border-amber-400 bg-amber-50/30" : "border-border"}`}
    />
  </div>
);

const EditSelect = ({ label, value, onChange, dirty, opts, req }: {
  label: string; value: string; onChange: (v: string) => void; dirty?: boolean; opts: { v: string; l: string }[]; req?: boolean;
}) => (
  <div className="mb-3.5">
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
      {label}
      {req && <span className="text-destructive">*</span>}
      {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Modified" />}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
        ${dirty ? "border-amber-400 bg-amber-50/30" : "border-border"}`}
    >
      <option value="">Select…</option>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

function EditAssetDrawer({
  asset, onClose, onSaved,
}: { asset: AssetListItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditAssetState>(() => assetToEditState(asset));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    asset.asset_image
      ? (asset.asset_image.startsWith("http") ? asset.asset_image : `http://facility.quantcloud.in${asset.asset_image}`)
      : null
  );
  const [uploadingImg, setUploadingImg] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof EditAssetState) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirtyFields(s => new Set([...s, k]));
  };

  /* linked data */
  const { data: branches } = useFrappeList<{ name: string; branch_code: string; branch_name: string }>(
    "Branch", ["name", "branch_code", "branch_name"], [["is_active", "=", 1]], [], false, "branch_code asc"
  );
  const { data: properties } = useFrappeList<{ name: string; property_code: string; property_name: string }>(
    "Property", ["name", "property_code", "property_name"],
    form.branch_code ? [["branch_code", "=", form.branch_code], ["is_active", "=", 1]] : [["is_active", "=", 1]],
    [form.branch_code]
  );
  const { data: zones } = useFrappeList<{ name: string; zone_code: string; zone_name: string }>(
    "Zone", ["name", "zone_code", "zone_name"],
    form.property_code ? [["property_code", "=", form.property_code], ["is_active", "=", 1]] : [],
    [form.property_code], !form.property_code, "zone_code asc"
  );
  const { data: subZones } = useFrappeList<{ name: string; sub_zone_code: string; sub_zone_name: string }>(
    "Sub Zone", ["name", "sub_zone_code", "sub_zone_name"],
    form.zone_code ? [["zone_code", "=", form.zone_code], ["is_active", "=", 1]] : [],
    [form.zone_code], !form.zone_code, "sub_zone_code asc"
  );
  const { data: baseUnits } = useFrappeList<{ name: string; base_unit_code: string; base_unit_name: string }>(
    "Base Unit", ["name", "base_unit_code", "base_unit_name"],
    form.sub_zone_code ? [["sub_zone_code", "=", form.sub_zone_code], ["is_active", "=", 1]] : [],
    [form.sub_zone_code], !form.sub_zone_code, "base_unit_code asc"
  );
  const { data: clients } = useFrappeList<{ name: string; client_name: string }>(
    "Client", ["name", "client_name"], [], [], false, "client_name asc"
  );

  const handleBranchChange = (v: string) => {
    setForm(f => ({ ...f, branch_code: v, property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "" }));
    setDirtyFields(s => new Set([...s, "branch_code", "property_code", "zone_code", "sub_zone_code", "base_unit_code"]));
  };
  const handlePropertyChange = (v: string) => {
    setForm(f => ({ ...f, property_code: v, zone_code: "", sub_zone_code: "", base_unit_code: "" }));
    setDirtyFields(s => new Set([...s, "property_code", "zone_code", "sub_zone_code", "base_unit_code"]));
  };
  const handleZoneChange = (v: string) => {
    setForm(f => ({ ...f, zone_code: v, sub_zone_code: "", base_unit_code: "" }));
    setDirtyFields(s => new Set([...s, "zone_code", "sub_zone_code", "base_unit_code"]));
  };
  const handleSubZoneChange = (v: string) => {
    setForm(f => ({ ...f, sub_zone_code: v, base_unit_code: "" }));
    setDirtyFields(s => new Set([...s, "sub_zone_code", "base_unit_code"]));
  };

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setSaveError("Please select an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setSaveError("Image must be under 10 MB."); return; }
    setImagePreview(URL.createObjectURL(file));
    setForm(f => ({ ...f, _pendingFile: file }));
    setDirtyFields(s => new Set([...s, "asset_image"]));
  }

  function removeImage() {
    setImagePreview(null);
    setForm(f => ({ ...f, asset_image: "", _pendingFile: undefined }));
    setDirtyFields(s => new Set([...s, "asset_image"]));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave(e?: React.MouseEvent | React.FormEvent) {
    if (e) e.preventDefault();
    if (!form.asset_name || !form.criticality || !form.asset_status) {
      setSaveError("Asset Name, Criticality and Status are required.");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      // Start with the current saved URL; will be replaced if a new file is chosen.
      let finalImageUrl: string = form.asset_image;

      // Upload new image if the user selected one
      if (form._pendingFile) {
        setUploadingImg(true);
        const fd = new FormData();
        fd.append("file", form._pendingFile, form._pendingFile.name);
        fd.append("is_private", "0");
        fd.append("folder", "Home/Attachments");
        fd.append("doctype", "CFAM Asset");
        fd.append("docname", asset.name);
        fd.append("fieldname", "asset_image");
        const up = await fetch("/api/method/upload_file", {
          method: "POST", credentials: "include",
          headers: { "X-Frappe-CSRF-Token": getCsrfToken() },
          body: fd,
        });
        setUploadingImg(false);
        if (!up.ok) throw new Error("Image upload failed");
        const upJson = await up.json();

        // Frappe returns { message: { file_url: "..." } } across v13/v14/v15.
        // Guard against variant shapes to always extract the URL string.
        const msg = upJson.message;
        const uploadedUrl: string | null =
          msg && typeof msg === "object"
            ? (msg.file_url ?? msg.file_name ?? null)
            : typeof msg === "string" ? msg : null;

        if (!uploadedUrl) {
          throw new Error("Image uploaded but the server returned no file URL. Please try again.");
        }
        finalImageUrl = uploadedUrl;
      } else if (!imagePreview) {
        // User explicitly removed the image via the × button
        finalImageUrl = "";
      }

      const { _pendingFile: _, ...rest } = form;
      await frappeUpdate<AssetListItem>("CFAM Asset", asset.name, {
        asset_name: rest.asset_name,
        asset_master_category: rest.asset_master_category || undefined,
        asset_category: rest.asset_category || undefined,
        asset_sub_category: rest.asset_sub_category || undefined,
        make_brand: rest.make_brand || undefined,
        model: rest.model || undefined,
        serial_number: rest.serial_number || undefined,
        property_code: rest.property_code || undefined,
        branch_code: rest.branch_code || undefined,
        zone_code: rest.zone_code || undefined,
        sub_zone_code: rest.sub_zone_code || undefined,
        base_unit_code: rest.base_unit_code || undefined,
        installation_date: rest.installation_date || undefined,
        warranty_expiry: rest.warranty_expiry || undefined,
        purchase_cost: rest.purchase_cost ? Number(rest.purchase_cost) : undefined,
        criticality: rest.criticality,
        asset_status: rest.asset_status,
        service_group_code: rest.service_group_code || undefined,
        client_code: rest.client_code || undefined,
        asset_image: finalImageUrl,
      });

      // 🎉 Professional toast notification for asset update
      sonnerToast.success(
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-white leading-tight">Asset Updated</span>
            <span className="text-xs text-white/80 leading-tight">{asset.name} • Updated successfully</span>
          </div>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          icon: null,
          style: {
            background: 'linear-gradient(135deg, #1e40af 0%, #3730a3 100%)',
            color: 'white',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            padding: '20px',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          },
          className: 'animate-slide-in-right',
        }
      );

      onSaved();
    } catch (e: unknown) { setSaveError((e as Error).message); }
    finally { setSaving(false); setUploadingImg(false); }
  }

  const isDirty = dirtyFields.size > 0;

  return (
    /* backdrop */
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      {/* drawer panel */}
      <div className="absolute right-0 top-0 bottom-0 w-[520px] max-w-full bg-card shadow-2xl flex flex-col a-slide-r border-l border-border">
        {/* drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Edit Asset</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{asset.asset_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> {dirtyFields.size} unsaved change{dirtyFields.size !== 1 ? "s" : ""}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {saveError && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />{saveError}
            </div>
          )}

          {/* Image section */}
          <EditSection title="Asset Photo" icon={<Camera className="w-3.5 h-3.5" />}>
            <div className="flex items-start gap-4">
              {/* preview */}
              <div className="relative w-24 h-24 rounded-xl border-2 border-border overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
                {(uploadingImg) && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                {imagePreview
                  ? <img src={imagePreview} alt="" className="w-full h-full object-cover" onError={() => setImagePreview(null)} />
                  : <Camera className="w-8 h-8 text-muted-foreground/40" />}
                {imagePreview && (
                  <button type="button" onClick={removeImage}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/20 transition-all mb-2">
                  <Camera className="w-4 h-4" />
                  {imagePreview ? "Change Photo" : "Upload Photo"}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">PNG, JPG up to 10 MB. Stored in Frappe file system.</p>
              </div>
            </div>
          </EditSection>

          {/* Identity */}
          <EditSection title="Identity" icon={<Tag className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Asset Code" value={String(form.asset_code ?? "")} onChange={set("asset_code")} dirty={dirtyFields.has("asset_code")} placeholder="AST-001" />
              <EditInput label="Asset Name" value={String(form.asset_name ?? "")} onChange={set("asset_name")} dirty={dirtyFields.has("asset_name")} placeholder="Chiller Unit A" req />
            </div>
            <EditSelect label="Master Category" value={String(form.asset_master_category ?? "")} onChange={set("asset_master_category")} dirty={dirtyFields.has("asset_master_category")} req
              opts={["MEP","Banking Equipment","IT Infrastructure","Civil","Electrical","Security","Fire & Safety","Other"].map(v=>({v,l:v}))} />
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Asset Category" value={String(form.asset_category ?? "")} onChange={set("asset_category")} dirty={dirtyFields.has("asset_category")} placeholder="e.g. Air Handling Unit" req />
              <EditInput label="Asset Sub-Category" value={String(form.asset_sub_category ?? "")} onChange={set("asset_sub_category")} dirty={dirtyFields.has("asset_sub_category")} placeholder="e.g. Chiller" />
            </div>
          </EditSection>

          {/* Make & Model */}
          <EditSection title="Make & Model" icon={<Package className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-3 gap-3">
              <EditInput label="Manufacturer" value={String(form.make_brand ?? "")} onChange={set("make_brand")} dirty={dirtyFields.has("make_brand")} placeholder="Carrier" />
              <EditInput label="Model" value={String(form.model ?? "")} onChange={set("model")} dirty={dirtyFields.has("model")} placeholder="30XA-500" />
              <EditInput label="Serial No" value={String(form.serial_number ?? "")} onChange={set("serial_number")} dirty={dirtyFields.has("serial_number")} placeholder="SN-XXXXXXX" />
            </div>
          </EditSection>

          {/* Location */}
          <EditSection title="Location" icon={<MapPin className="w-3.5 h-3.5" />}>
            <EditSelect label="Branch" value={String(form.branch_code ?? "")} onChange={handleBranchChange} dirty={dirtyFields.has("branch_code")}
              opts={branches.map(b => ({ v: b.name, l: `${b.branch_code} — ${b.branch_name}` }))} />
            <EditSelect label="Property" value={String(form.property_code ?? "")} onChange={handlePropertyChange} dirty={dirtyFields.has("property_code")} req
              opts={properties.map(p => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
            <EditSelect label="Zone" value={String(form.zone_code ?? "")} onChange={handleZoneChange} dirty={dirtyFields.has("zone_code")}
              opts={zones.map(z => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} />
            <EditSelect label="Sub Zone" value={String(form.sub_zone_code ?? "")} onChange={handleSubZoneChange} dirty={dirtyFields.has("sub_zone_code")}
              opts={subZones.map(s => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} />
            <EditSelect label="Base Unit" value={String(form.base_unit_code ?? "")} onChange={set("base_unit_code")} dirty={dirtyFields.has("base_unit_code")}
              opts={baseUnits.map(bu => ({ v: bu.name, l: `${bu.base_unit_code} — ${bu.base_unit_name}` }))} />
            <EditInput label="Service Group" value={String(form.service_group_code ?? "")} onChange={set("service_group_code")} dirty={dirtyFields.has("service_group_code")} placeholder="MEP, Civil, IT…" />
          </EditSection>

          {/* Lifecycle */}
          <EditSection title="Lifecycle & Finance" icon={<TrendingUp className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Installation Date" value={String(form.installation_date ?? "")} onChange={set("installation_date")} dirty={dirtyFields.has("installation_date")} type="date" />
              <EditInput label="Warranty Expiry" value={String(form.warranty_expiry ?? "")} onChange={set("warranty_expiry")} dirty={dirtyFields.has("warranty_expiry")} type="date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Purchase Cost (OMR)" value={String(form.purchase_cost ?? "")} onChange={set("purchase_cost")} dirty={dirtyFields.has("purchase_cost")} type="number" placeholder="25000" />
              <EditSelect label="Criticality" value={String(form.criticality ?? "")} onChange={set("criticality")} dirty={dirtyFields.has("criticality")} req
                opts={["Critical","High","Medium","Low"].map(v=>({v,l:v}))} />
            </div>
          </EditSection>

          {/* Client & Status */}
          <EditSection title="Client & Status" icon={<Activity className="w-3.5 h-3.5" />}>
            <EditSelect label="Client" value={String(form.client_code ?? "")} onChange={set("client_code")} dirty={dirtyFields.has("client_code")} req
              opts={clients.map(c=>({v:c.name,l:c.client_name}))} />
            <EditSelect label="Asset Status" value={String(form.asset_status ?? "")} onChange={set("asset_status")} dirty={dirtyFields.has("asset_status")} req
              opts={["Active","Inactive","Decommissioned","Under Repair","Scrap"].map(v=>({v,l:v}))} />
          </EditSection>
        </div>

        {/* sticky footer */}
        <div className="shrink-0 border-t border-border px-5 py-4 bg-card flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !isDirty}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />{uploadingImg ? "Uploading image…" : "Saving…"}</>
              : <><CheckCircle className="w-4 h-4" />Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */

function DetailView({ assetName, onRefresh }: { assetName: string; onRefresh?: () => void }) {
  const [editKey, setEditKey] = useState(0);
  const [showEdit, setShowEdit] = useState(false);

  const { data: a, loading, error } = useFrappeDoc<AssetListItem>("CFAM Asset", assetName, editKey);
  const { data: ppms } = useFrappeList<PPMInfo>(
    "PPM Schedule", ["next_due_date", "last_done_date"],
    assetName ? [["asset_code", "=", assetName]] : [], [assetName], !assetName, "next_due_date asc"
  );
  const { data: workOrders } = useFrappeList<WOHistoryItem>(
    "Work Orders", ["name", "wo_title", "status", "schedule_start_date", "creation"],
    assetName ? [["asset_code", "=", assetName]] : [], [assetName], !assetName, "creation desc"
  );

  function handleSaved() {
    setShowEdit(false);
    setEditKey(k => k + 1); // forces doc refetch
    if (onRefresh) onRefresh();
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!a) return null;

  const assetPpm = ppms && ppms.length > 0 ? ppms[0] : undefined;
  const catCfg = getCatCfg(a.asset_master_category, a.asset_category);
  const statusCfg = STATUS_CFG[a.asset_status] || STATUS_CFG["Inactive"];
  const warrantyExpired = isWarrantyExpired(a.warranty_expiry);

  return (
    <div className="a-fade-up relative">
      {/* Edit Drawer */}
      {showEdit && a && (
        <EditAssetDrawer
          asset={a}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}
      {/* hero header */}
      <div className="sticky top-0 z-10 px-6 pt-6 pb-5 border-b border-border/70 bg-card/95 backdrop-blur-md"
        style={{ background: `linear-gradient(135deg, ${catCfg.bg} 0%, ${statusCfg.glow} 60%, transparent 100%)` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 flex-1">
            {/* asset icon / image */}
            <div className="w-12 h-12 rounded-2xl border border-white/50 shadow-sm flex items-center justify-center shrink-0"
              style={{ background: catCfg.bg, color: catCfg.color }}>
              {a.asset_image
                ? <img src={a.asset_image.startsWith('http') ? a.asset_image : `http://facility.quantcloud.in${a.asset_image}`} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                : <span className="scale-125">{catCfg.icon}</span>}
            </div>

            <div className="flex-1 flex items-start justify-between min-w-0 gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-foreground leading-tight">{a.asset_name}</h2>
                  <p className="text-[11px] text-muted-foreground font-mono">#{a.asset_code}</p>
                </div>
              </div>

              {warrantyExpired && (
                <div className={`flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border relative overflow-hidden alert-glow-red bg-red-50 border-red-300 shrink-0 shadow-sm`}>
                  <div className="shimmer-effect absolute inset-0 pointer-events-none rounded-xl" />
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 relative z-10 shrink-0 shadow-sm">
                    <AlertTriangle className={`w-4 h-4 text-red-500`} />
                  </div>
                  <div className="relative z-10 flex flex-col justify-center border-l pl-2.5 border-current/10">
                    <p className="text-[11px] font-bold uppercase tracking-wider leading-none mb-1 text-red-700">
                      Warranty Expired
                    </p>
                    <p className="text-[10px] whitespace-nowrap leading-none font-medium text-red-600/90">
                      on {formatDate(a.warranty_expiry)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-primary/40 rounded-lg text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {/* <button className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button> */}
          </div>
        </div>

        {/* quick-stat chips */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={a.asset_status} />
          <CriticalityBadge criticality={a.criticality} />
          {a.asset_master_category && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
              style={{ color: catCfg.color, background: catCfg.bg, borderColor: `${catCfg.color}30` }}>
              {catCfg.icon} {a.asset_master_category}
            </span>
          )}
          {a.asset_category && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-muted border border-border text-foreground">
              {a.asset_category}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Location */}
          <SectionCard title="Location" icon={<MapPin className="w-3.5 h-3.5" />}>
            <InfoRow label="Property" value={a.property_name || a.property_code} link />
            <InfoRow label="Zone" value={a.zone_code} />
            <InfoRow label="Sub Zone" value={a.sub_zone_code} />
            <InfoRow label="Base Unit" value={a.base_unit_code} />
          </SectionCard>

          {/* Make & Model */}
          <SectionCard title="Make & Model" icon={<Package className="w-3.5 h-3.5" />}>
            <InfoRow label="Manufacturer" value={a.make_brand} />
            <InfoRow label="Model" value={a.model} />
            <InfoRow label="Serial No" value={a.serial_number} mono />
          </SectionCard>

          {/* Lifecycle */}
          <SectionCard title="Lifecycle & Finance" icon={<TrendingUp className="w-3.5 h-3.5" />}>
            <InfoRow label="Install Date" value={formatDate(a.installation_date)} />
            <InfoRow
              label="Warranty Expiry"
              value={warrantyExpired ? `${formatDate(a.warranty_expiry)} — Expired` : formatDate(a.warranty_expiry)}
              warn={warrantyExpired}
            />
            <InfoRow label="Purchase Cost" value={a.purchase_cost ? `OMR ${a.purchase_cost.toLocaleString()}` : null} />
            <InfoRow label="Service Group" value={a.service_group_code} />
            <InfoRow label="Client" value={a.client_code} link />
          </SectionCard>

          {/* PPM Maintenance */}
          <SectionCard title="Maintenance Schedule" icon={<Clock className="w-3.5 h-3.5" />}>
            <PPMTimeline ppm={assetPpm} installDate={a.installation_date} />
          </SectionCard>
        </div>

        {/* warranty expired card */}
        {/* {warrantyExpired && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-5 a-fade-up">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Warranty Expired</p>
              <p className="text-xs text-red-500 mt-0.5">
                Warranty expired on {formatDate(a.warranty_expiry)}. Consider renewal or asset replacement.
              </p>
            </div>
          </div>
        )} */}

        {/* Asset Image */}
        {a.asset_image && (
          <div className="mb-6 px-1">
            <h3 className="text-[13px] font-bold text-foreground mb-3">Pictures</h3>
            <div className="relative group inline-block">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm transition-all duration-300 group-hover:shadow-md">
                <img 
                  src={a.asset_image.startsWith('http') ? a.asset_image : `http://facility.quantcloud.in${a.asset_image}`} 
                  alt={a.asset_name}
                  className="w-auto h-auto max-w-[320px] max-h-[240px] object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '';
                  }}
                />
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={() => window.open(a.asset_image?.startsWith('http') ? a.asset_image : `http://facility.quantcloud.in${a.asset_image}`, '_blank')}
                    className="p-2 bg-white/90 shadow-sm hover:bg-white rounded-lg transition-colors text-foreground transform scale-95 hover:scale-100"
                    title="View full size"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* QR Code — always shown, auto-generated per asset */}
        <QRCodeSection asset={a} />

        {/* Work Order History */}
        <SectionCard title="Work Order History" icon={<Activity className="w-3.5 h-3.5" />} className="!mb-0">
          <div className="flex items-center justify-between mb-3 mt-4 px-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Activity</p>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-bold">{workOrders.length} Records</span>
          </div>
          <WOTimeline workOrders={workOrders} />
        </SectionCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FILTER DROPDOWN
═══════════════════════════════════════════ */

interface FilterDropdownProps {
  label: string;
  icon: React.ReactNode;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

function FilterDropdown({ label, icon, options, value, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const active = !!value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[11px] font-medium transition-all
          ${active
            ? "border-primary bg-primary/5 text-primary"
            : "border-border text-foreground hover:bg-muted hover:border-primary/30"
          }`}
      >
        {icon}
        <span>{active ? value : label}</span>
        {active
          ? <button onClick={e => { e.stopPropagation(); onChange(""); setOpen(false); }} className="ml-0.5 hover:text-foreground"><X className="w-2.5 h-2.5" /></button>
          : <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        }
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px] a-fade-up">
          <div className="py-1">
            <button onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2">
              <X className="w-3 h-3" /> Clear
            </button>
            <div className="h-px bg-border mx-2 my-1" />
            {options.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2
                  ${value === opt ? "text-primary bg-primary/5" : "text-foreground hover:bg-muted"}`}>
                {value === opt && <Check className="w-3 h-3 shrink-0" />}
                <span className={value === opt ? "ml-0" : "ml-5"}>{opt}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type AssetTab = "All Assets" | "Building Assets" | "Unit Assets";

export default function Assets() {
  useAssetStyles();

  const [tab, setTab] = useState<AssetTab>("All Assets");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProp, setExpandedProp] = useState<string | null>("All Properties");

  /* ── Active filter values ── */
  const [filterAssetType, setFilterAssetType]   = useState("");
  const [filterProperty,  setFilterProperty]    = useState("");
  const [filterStatus,    setFilterStatus]      = useState("");
  const [filterCategory,  setFilterCategory]    = useState("");
  const [filterBranch,    setFilterBranch]      = useState("");

  /* ── QR Scan URL handling ── */
  const [scannedAssetCode, setScannedAssetCode] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("asset_scan");
    if (code) setScannedAssetCode(decodeURIComponent(code));
  }, []);

  function dismissScan() {
    setScannedAssetCode(null);
    // Remove param from URL without reload
    const url = new URL(window.location.href);
    url.searchParams.delete("asset_scan");
    window.history.replaceState({}, "", url.toString());
  }

  /* ── Frappe filters (only tab-level) ── */
  const tabFilters: FrappeFilters =
    tab === "Building Assets" ? [] :
    tab === "Unit Assets"     ? [] : [];

  const { data: assets, loading, error, refetch } = useFrappeList<AssetListItem>(
    "CFAM Asset",
    ["name", "asset_code", "asset_name", "asset_master_category", "asset_category",
      "branch_code", "branch_name", "property_code", "property_name", "zone_code", "sub_zone_code", "base_unit_code",
      "asset_status", "criticality", "client_code", "make_brand", "model",
      "installation_date", "warranty_expiry", "asset_image", "service_group_code", "qr_code_url"],
    tabFilters, [tab], false, "asset_code asc"
  );

  const { data: ppms } = useFrappeList<{ asset_code: string; last_done_date?: string; next_due_date?: string }>(
    "PPM Schedule", ["asset_code", "last_done_date", "next_due_date"], [], [], false, "next_due_date asc"
  );

  const ppmMap: Record<string, PPMInfo> = {};
  ppms.forEach((p) => { if (p.asset_code) ppmMap[p.asset_code] = { last_run_date: p.last_done_date, next_run_date: p.next_due_date }; });

  /* ── Derive dynamic filter options from loaded data ── */
  const branchOptions     = useMemo(() => [...new Set(assets.map(a => a.branch_name || a.branch_code).filter(Boolean) as string[])].sort(), [assets]);
  const assetTypeOptions  = useMemo(() => [...new Set(assets.map(a => a.asset_master_category).filter(Boolean) as string[])].sort(), [assets]);
  const propertyOptions   = useMemo(() => [...new Set(assets.map(a => a.property_name || a.property_code).filter(Boolean) as string[])].sort(), [assets]);
  const statusOptions     = useMemo(() => [...new Set(assets.map(a => a.asset_status).filter(Boolean) as string[])].sort(), [assets]);
  const categoryOptions   = useMemo(() => [...new Set(assets.map(a => a.asset_category).filter(Boolean) as string[])].sort(), [assets]);

  /* ── Stats ── */
  const stats = useMemo<AssetStats>(() => ({
    total: assets.length,
    active: assets.filter((a) => a.asset_status === "Active").length,
    underRepair: assets.filter((a) => a.asset_status === "Under Repair").length,
    critical: assets.filter((a) => a.criticality === "Critical").length,
  }), [assets]);

  /* ── Filter + search (client-side) ── */
  const filtered = useMemo(() => assets.filter((a) => {
    if (filterBranch    && (a.branch_name || a.branch_code) !== filterBranch) return false;
    if (filterAssetType && a.asset_master_category !== filterAssetType) return false;
    if (filterProperty  && (a.property_name || a.property_code) !== filterProperty) return false;
    if (filterStatus    && a.asset_status !== filterStatus) return false;
    if (filterCategory  && a.asset_category !== filterCategory) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return a.asset_name?.toLowerCase().includes(q) ||
      a.asset_code?.toLowerCase().includes(q) ||
      a.asset_category?.toLowerCase().includes(q) ||
      a.property_name?.toLowerCase().includes(q) ||
      a.serial_number?.toLowerCase().includes(q);
  }), [assets, filterBranch, filterAssetType, filterProperty, filterStatus, filterCategory, search]);

  const activeFilterCount = [filterBranch, filterAssetType, filterProperty, filterStatus, filterCategory].filter(Boolean).length;

  /* group by property */
  const grouped: Record<string, AssetListItem[]> = {};
  filtered.forEach((a) => {
    const key = a.property_name || a.property_code || "Unknown Property";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });
  const allKey = "All Properties";

  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showNewForm) setSelectedName(filtered[0].name);
  }, [filtered, selectedName, showNewForm]);

  /* ── If QR scanned, show public view ── */
  if (scannedAssetCode) {
    return <AssetPublicView assetCode={scannedAssetCode} onClose={dismissScan} />;
  }

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm relative z-40">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground tracking-tight shrink-0">Assets</h1>
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Search Assets…" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>

          {/* ── Dynamic filter chips ── */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterDropdown
              label="Branch" icon={<Building2 className="w-3 h-3" />}
              options={branchOptions} value={filterBranch} onChange={setFilterBranch}
            />
            <FilterDropdown
              label="Asset Type" icon={<Filter className="w-3 h-3" />}
              options={assetTypeOptions} value={filterAssetType} onChange={setFilterAssetType}
            />
            <FilterDropdown
              label="Property" icon={<Building2 className="w-3 h-3" />}
              options={propertyOptions} value={filterProperty} onChange={setFilterProperty}
            />
            <FilterDropdown
              label="Status" icon={<Activity className="w-3 h-3" />}
              options={statusOptions} value={filterStatus} onChange={setFilterStatus}
            />
            <FilterDropdown
              label="Category" icon={<Package className="w-3 h-3" />}
              options={categoryOptions} value={filterCategory} onChange={setFilterCategory}
            />
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setFilterBranch(""); setFilterAssetType(""); setFilterProperty(""); setFilterStatus(""); setFilterCategory(""); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all">
                <X className="w-2.5 h-2.5" /> Clear {activeFilterCount}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Asset
          </button>
        </div>
      </div>

      {/* ══ STATS BAR ══ */}
      <StatsBar stats={stats} loading={loading} />

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="w-[400px] min-w-[400px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border bg-muted/20">
            {(["All Assets", "Building Assets", "Unit Assets"] as AssetTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-all whitespace-nowrap px-1 relative
                  ${tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
                {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
              </button>
            ))}
          </div>

          {/* Active filter summary */}
          {activeFilterCount > 0 && (
            <div className="px-3 py-2 bg-primary/5 border-b border-primary/10 flex items-center gap-2">
              <Filter className="w-3 h-3 text-primary" />
              <span className="text-[11px] text-primary font-semibold">
                {filtered.length} of {assets.length} assets shown
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} onRetry={refetch} />}

            {!loading && !error && (
              <>
                {/* All Properties group header */}
                <button onClick={() => setExpandedProp(expandedProp === allKey ? null : allKey)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border hover:bg-muted/50 transition-colors sticky top-0 z-20 backdrop-blur-sm">
                  <span className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />{allKey}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-[10px] font-bold">{filtered.length}</span>
                    {expandedProp === allKey
                      ? <ChevronDown className="w-3.5 h-3.5 transition-transform" />
                      : <ChevronRight className="w-3.5 h-3.5 transition-transform" />}
                  </div>
                </button>

                {expandedProp === allKey && Object.keys(grouped).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 a-fade-up">
                    <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                      <Package className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground">No assets found</p>
                    <p className="text-xs text-muted-foreground/60">Try adjusting your search or filters</p>
                  </div>
                )}

                {expandedProp === allKey && Object.entries(grouped).map(([propName, propAssets]) => (
                  <div key={propName}>
                    {Object.keys(grouped).length > 1 && (
                      <div className="px-3 py-2 bg-muted/20 border-b border-border/40 flex items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5 uppercase tracking-widest">
                          <Building2 className="w-3 h-3" /> {propName}
                        </span>
                        <span className="text-[10px] bg-muted border border-border px-2 py-0.5 rounded-full font-semibold text-muted-foreground">{propAssets.length}</span>
                      </div>
                    )}
                    <div className="card-group-reveal">
                      {propAssets.map((a, i) => (
                        <div key={a.name} style={{ "--i": i } as React.CSSProperties}>
                          <AssetCard
                            a={a}
                            selected={selectedName === a.name && !showNewForm}
                            ppm={ppmMap[a.name]}
                            onClick={() => { setSelectedName(a.name); setShowNewForm(false); }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            <NewAssetForm onClose={() => setShowNewForm(false)}
              onCreated={(name) => { setShowNewForm(false); setSelectedName(name); refetch(); }} />
          ) : selectedName ? (
            <DetailView assetName={selectedName} onRefresh={refetch} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground a-fade-up">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center border border-border/50">
                  <Package className="w-9 h-9 text-muted-foreground/40" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-primary/60" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground/70">Select an asset</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click any card to view full details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}