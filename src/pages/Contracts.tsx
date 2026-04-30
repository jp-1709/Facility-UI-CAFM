/**
 * Contracts.tsx — Enhanced Edition
 * All original data logic preserved. Visual enhancements only.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search, Plus, Building2, User, Calendar, Tag,
  CheckCircle2, ChevronDown, ChevronRight, MoreVertical,
  Pencil, X, Loader2, AlertCircle, RefreshCw, FileText,
  DollarSign, Clock, Shield, AlertTriangle, CheckCheck, XCircle,
  TrendingUp, Activity, Filter, RotateCcw, CreditCard, BarChart2, FileText as FileTextIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast as sonnerToast } from "sonner";

/* ═══════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════ */

const CONTRACT_CSS = `
@keyframes conFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
@keyframes conSlideR { from{opacity:0;transform:translateX(-10px)} to{opacity:1;transform:translateX(0)} }
@keyframes conBarFill { from{width:0%} to{width:var(--target-w)} }
@keyframes cardSlideUp { from{opacity:0;transform:translateY(12px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes slaBarFill { from{width:0} to{width:var(--sla-w)} }
@keyframes filterPillIn { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
@keyframes expiryPulseRed { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)} 70%{box-shadow:0 0 0 8px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
@keyframes expiryPulseAmber { 0%{box-shadow:0 0 0 0 rgba(245,158,11,.5)} 70%{box-shadow:0 0 0 8px rgba(245,158,11,0)} 100%{box-shadow:0 0 0 0 rgba(245,158,11,0)} }
@keyframes shimmerBg { 0%{transform:translateX(-100%) skewX(-15deg)} 100%{transform:translateX(300%) skewX(-15deg)} }
@keyframes dotPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.8)} }

.c-fade-up { animation:conFadeUp .26s cubic-bezier(.4,0,.2,1) both; }
.c-slide-r { animation:conSlideR .22s cubic-bezier(.4,0,.2,1) both; }
.c-stagger>* { animation:conFadeUp .26s cubic-bezier(.4,0,.2,1) both; }
.c-stagger>*:nth-child(1){animation-delay:0ms} .c-stagger>*:nth-child(2){animation-delay:50ms}
.c-stagger>*:nth-child(3){animation-delay:100ms} .c-stagger>*:nth-child(4){animation-delay:150ms}

.sec-card { animation:cardSlideUp .28s cubic-bezier(.4,0,.2,1) both; }
.sec-card:nth-child(1){animation-delay:0ms} .sec-card:nth-child(2){animation-delay:60ms}
.sec-card:nth-child(3){animation-delay:120ms} .sec-card:nth-child(4){animation-delay:180ms}
.sec-card:nth-child(5){animation-delay:240ms}

.section-card-wrap { transition: box-shadow .18s, transform .18s; }
.section-card-wrap:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,0,0,.08); }

.con-card-row { transition:background .14s; }
.con-card-row:hover .con-arrow { opacity:1; transform:translateX(3px); }
.con-arrow { opacity:0; transition:opacity .14s,transform .14s; }
.con-bar-fill { animation:conBarFill 1s cubic-bezier(.4,0,.2,1) forwards; }
.sla-bar { animation:slaBarFill .9s cubic-bezier(.4,0,.2,1) both; }

.alert-glow-red { animation:expiryPulseRed 2s infinite; }
.alert-glow-amber { animation:expiryPulseAmber 2s infinite; }
.shimmer-effect::after {
  content:''; position:absolute; top:0; left:-60px; width:40px; height:100%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);
  animation:shimmerBg 3s infinite cubic-bezier(.4,0,.2,1);
}
.dot-pulse { animation:dotPulse 1.8s ease-in-out infinite; }
.filter-pill { animation:filterPillIn .18s cubic-bezier(.4,0,.2,1) both; }

select.styled-filter { appearance:none; cursor:pointer; transition:border-color .15s,box-shadow .15s; }
select.styled-filter:focus { box-shadow:0 0 0 2px rgba(79,70,229,.25); border-color:#6366f1; }
`;

function useContractStyles() {
  useEffect(() => {
    if (document.getElementById("contract-css")) return;
    const s = document.createElement("style");
    s.id = "contract-css"; s.textContent = CONTRACT_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS  (unchanged)
═══════════════════════════════════════════ */

const FRAPPE_BASE = "";
type FrappeFilters = [string, string, string | number][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FrappeFilters = [], orderBy = "", limit = 500): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
    ...(orderBy ? { order_by: orderBy } : {}),
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
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { exc_type?: string })?.exc_type || `POST ${doctype} failed`);
  }
  return (await res.json()).data as T;
}

function getCsrfToken(): string { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════
   TYPES  (unchanged)
═══════════════════════════════════════════ */

interface ContractListItem {
  name: string; contract_code: string; contract_title: string;
  client_code: string; client_name?: string;
  branch_code?: string; branch_name?: string;
  contract_group?: string; contract_type?: string;
  start_date: string; end_date: string;
  annual_value?: number; fixed_monthly?: number;
  billing_model?: string; payment_status?: string; status: string;
}

interface ContractDetail extends ContractListItem {
  amended_from?: string; sla_details?: SLARow[];
}

interface SLARow { priority: string; response_hours: number; resolution_hours: number; }
interface Client { name: string; client_name: string; }

/* ═══════════════════════════════════════════
   HOOKS  (unchanged)
═══════════════════════════════════════════ */

function useFrappeList<T>(doctype: string, fields: string[], filters: FrappeFilters, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
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

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": getCsrfToken() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error((e as { exc_type?: string })?.exc_type || "Update failed");
  }
  return (await res.json()).data as T;
}

/* ═══════════════════════════════════════════
   COLOUR MAPS  (unchanged)
═══════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; border: string; icon: React.ReactNode }> = {
  Active: { label: "Active", bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", border: "#10b981", icon: <CheckCheck className="w-3 h-3" /> },
  Draft: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", border: "#9ca3af", icon: <FileText className="w-3 h-3" /> },
  Expired: { label: "Expired", bg: "bg-red-100", text: "text-red-600", dot: "bg-red-400", border: "#ef4444", icon: <XCircle className="w-3 h-3" /> },
  Terminated: { label: "Terminated", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-600", border: "#dc2626", icon: <XCircle className="w-3 h-3" /> },
  "On Hold": { label: "On Hold", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", border: "#f59e0b", icon: <AlertTriangle className="w-3 h-3" /> },
};

const GROUP_COLORS: Record<string, { cls: string; accent: string }> = {
  IFM: { cls: "bg-blue-100 text-blue-700 border border-blue-200", accent: "#3b82f6" },
  "DC Ops": { cls: "bg-violet-100 text-violet-700 border border-violet-200", accent: "#7c3aed" },
  "Soft FM": { cls: "bg-teal-100 text-teal-700 border border-teal-200", accent: "#0d9488" },
  "Hard FM": { cls: "bg-orange-100 text-orange-700 border border-orange-200", accent: "#ea580c" },
  "MEP Only": { cls: "bg-sky-100 text-sky-700 border border-sky-200", accent: "#0284c7" },
  Other: { cls: "bg-gray-100 text-gray-600 border border-gray-200", accent: "#6b7280" },
  AMC: { cls: "bg-indigo-100 text-indigo-700 border border-indigo-200", accent: "#4f46e5" },
  AdHoc: { cls: "bg-pink-100 text-pink-700 border border-pink-200", accent: "#db2777" },
  PMC: { cls: "bg-cyan-100 text-cyan-700 border border-cyan-200", accent: "#0891b2" },
  FM: { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", accent: "#059669" },
};

const PAYMENT_CONFIG: Record<string, { cls: string; dot: string }> = {
  Current: { cls: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "#10b981" },
  Overdue: { cls: "bg-red-100 text-red-700 border border-red-200", dot: "#ef4444" },
  Disputed: { cls: "bg-amber-100 text-amber-700 border border-amber-200", dot: "#f59e0b" },
  Settled: { cls: "bg-gray-100 text-gray-600 border border-gray-200", dot: "#9ca3af" },
};

const SLA_PRIORITY_CFG: Record<string, { cls: string; dot: string; bg: string; border: string; accent: string }> = {
  Critical: { cls: "bg-red-50 border-red-200", dot: "#ef4444", bg: "#fef2f2", border: "#fecaca", accent: "#ef4444" },
  High: { cls: "bg-orange-50 border-orange-200", dot: "#f97316", bg: "#fff7ed", border: "#fed7aa", accent: "#f97316" },
  Medium: { cls: "bg-amber-50 border-amber-200", dot: "#f59e0b", bg: "#fef3c7", border: "#fde68a", accent: "#f59e0b" },
  Low: { cls: "bg-gray-50 border-gray-200", dot: "#9ca3af", bg: "#f9fafb", border: "#e5e7eb", accent: "#9ca3af" },
};

const GROUP_ICONS: Record<string, string> = {
  IFM: "https://api.iconify.design/fluent-emoji-flat/office-building.svg",
  "DC Ops": "https://api.iconify.design/fluent-emoji-flat/desktop-computer.svg",
  "Soft FM": "https://api.iconify.design/fluent-emoji-flat/broom.svg",
  "Hard FM": "https://api.iconify.design/fluent-emoji-flat/wrench.svg",
  "MEP Only": "https://api.iconify.design/fluent-emoji-flat/high-voltage.svg",
  AMC: "https://api.iconify.design/fluent-emoji-flat/gear.svg",
  PMC: "https://api.iconify.design/fluent-emoji-flat/briefcase.svg",
  FM: "https://api.iconify.design/fluent-emoji-flat/building-construction.svg",
  Other: "https://api.iconify.design/fluent-emoji-flat/page-facing-up.svg",
  AdHoc: "https://api.iconify.design/fluent-emoji-flat/clipboard.svg",
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}
function formatDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function formatDateShort(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}
function formatOMR(v?: number): string {
  if (!v) return "—";
  return `OMR ${v.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}
function formatOMRK(v?: number): string {
  if (!v) return "—";
  return v >= 1000 ? `OMR ${(v / 1000).toFixed(0)}K` : `OMR ${v}`;
}

/* ═══════════════════════════════════════════
   BASE UI HELPERS
═══════════════════════════════════════════ */

function LoadingSpinner({ small }: { small?: boolean }) {
  return <div className={`flex items-center justify-center ${small ? "py-4" : "py-16"}`}><Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-6 h-6"}`} /></div>;
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
  const c = STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {c.icon} {c.label}
    </span>
  );
}

function GroupBadge({ group }: { group?: string }) {
  if (!group) return null;
  const cfg = GROUP_COLORS[group] || GROUP_COLORS["Other"];
  const iconSrc = GROUP_ICONS[group] || GROUP_ICONS["Other"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold ${cfg.cls}`}>
      <img src={iconSrc} alt={group} className="w-3.5 h-3.5" /> {group}
    </span>
  );
}

function InfoRow({ label, value, link, mono }: { label: string; value?: string | null; link?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium shrink-0 w-36">{label}</span>
      {link
        ? <span className="text-sm text-primary font-medium cursor-pointer hover:underline text-right">{value || "—"}</span>
        : <span className={`text-sm text-foreground font-semibold text-right ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
═══════════════════════════════════════════ */

interface ContractStats { active: number; totalValue: number; expiringSoon: number; overdue: number; }

function StatsBar({ stats, loading }: { stats: ContractStats; loading: boolean }) {
  const items = [
    { label: "Active Contracts", value: String(stats.active), icon: <CheckCheck className="w-4 h-4" />, color: "#10b981", bg: "#10b98115" },
    { label: "Total Value", value: loading ? "—" : formatOMRK(stats.totalValue), icon: <DollarSign className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115" },
    { label: "Expiring ≤60d", value: String(stats.expiringSoon), icon: <Clock className="w-4 h-4" />, color: "#f59e0b", bg: "#f59e0b15" },
    { label: "Overdue Payment", value: String(stats.overdue), icon: <AlertTriangle className="w-4 h-4" />, color: "#ef4444", bg: "#ef444415" },
  ];

  return (
    <div className="flex items-stretch border-b border-border bg-card c-stagger">
      {items.map(({ label, value, icon, color, bg }) => (
        <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3 border-r border-border/50 last:border-r-0 relative overflow-hidden">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-40" /> : icon}
          </div>
          <div>
            <p className="text-xl font-bold text-foreground leading-none">{loading ? "—" : value}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONTRACT PERIOD TIMELINE (in detail)
═══════════════════════════════════════════ */

function ContractTimeline({ startDate, endDate, status }: { startDate: string; endDate: string; status: string }) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = end - start;
  const elapsed = now - start;
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  const days = daysUntil(endDate);
  const isExpired = days < 0;
  const isExpiring = !isExpired && days <= 60;
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG["Draft"];

  const barColor = isExpired ? "#ef4444" : isExpiring ? "#f59e0b" : "#10b981";

  return (
    <div className="py-1">
      <div className="flex items-center justify-between mb-1.5 text-[10px] font-semibold text-muted-foreground">
        <span>Contract Start</span>
        <span className={`font-bold ${isExpired ? "text-red-500" : isExpiring ? "text-amber-600" : "text-emerald-600"}`}>
          {isExpired ? "Expired" : isExpiring ? `Expiring in ${days}d` : `${days} days remaining`}
        </span>
        <span>End Date</span>
      </div>
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="con-bar-fill absolute left-0 top-0 h-full rounded-full"
          style={{ "--target-w": `${progress}%`, width: `${progress}%`, background: barColor } as React.CSSProperties}
        />
        {/* today marker */}
        <div className="absolute top-0 h-full w-0.5 bg-foreground/50" style={{ left: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
        <span>{formatDate(startDate)}</span>
        <span className="bg-muted/80 px-2 py-0.5 rounded-full font-medium border border-border/50">Today · {progress}%</span>
        <span className={isExpired ? "text-red-500 font-semibold" : ""}>{formatDate(endDate)}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FINANCIAL HIGHLIGHTS (in detail)
═══════════════════════════════════════════ */

function FinancialCards({ c }: { c: ContractDetail }) {
  const paymentCfg = PAYMENT_CONFIG[c.payment_status || ""] || null;

  return (
    <div className="grid grid-cols-3 gap-3 mb-4">
      {/* Annual Value */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Annual Value</p>
        <p className="text-lg font-bold text-foreground leading-tight">{formatOMR(c.annual_value)}</p>
        {c.billing_model && <p className="text-[10px] text-muted-foreground">{c.billing_model}</p>}
      </div>
      {/* Monthly */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fixed Monthly</p>
        <p className="text-lg font-bold text-foreground leading-tight">{formatOMR(c.fixed_monthly)}</p>
        <p className="text-[10px] text-muted-foreground">per month</p>
      </div>
      {/* Payment Status */}
      <div className={`rounded-xl border p-4 flex flex-col gap-1 ${paymentCfg?.cls || "border-border bg-card"}`}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Payment</p>
        <div className="flex items-center gap-1.5">
          {paymentCfg && <span className="w-2 h-2 rounded-full" style={{ background: paymentCfg.dot }} />}
          <p className="text-base font-bold text-foreground leading-tight">{c.payment_status || "—"}</p>
        </div>
        <p className="text-[10px] text-muted-foreground">{c.billing_model || "—"}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SLA TABLE
═══════════════════════════════════════════ */

function SLATable({ rows }: { rows: SLARow[] }) {
  if (!rows.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/60">
            <th className="px-4 py-2.5 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Priority</th>
            <th className="px-4 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Response</th>
            <th className="px-4 py-2.5 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Resolution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const cfg = SLA_PRIORITY_CFG[row.priority] || SLA_PRIORITY_CFG["Low"];
            return (
              <tr key={i} className={`border-t border-border ${cfg.cls}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                    <span className="font-bold text-foreground">{row.priority}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-semibold text-foreground">{row.response_hours}h</td>
                <td className="px-4 py-3 text-center font-semibold text-foreground">{row.resolution_hours}h</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


/* ═══════════════════════════════════════════
   CONTRACT CARD (left list)
═══════════════════════════════════════════ */

function ContractCard({ c, selected, onClick }: { c: ContractListItem; selected: boolean; onClick: () => void }) {
  const days = daysUntil(c.end_date);
  const expiring = days >= 0 && days <= 60;
  const expired = days < 0;
  const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG["Draft"];
  const groupCfg = GROUP_COLORS[c.contract_group || ""] || GROUP_COLORS["Other"];

  /* expiry bar progress */
  const start = new Date(c.start_date).getTime();
  const end = new Date(c.end_date).getTime();
  const now = Date.now();
  const progress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const barColor = expired ? "#ef4444" : expiring ? "#f59e0b" : "#10b981";

  return (
    <button onClick={onClick}
      className={`con-card-row w-full text-left px-4 py-3.5 border-b border-border flex gap-3 transition-colors
        ${selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}
    >
      {/* icon */}
      <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${groupCfg.accent}15`, color: groupCfg.accent }}>
        <img src={GROUP_ICONS[c.contract_group || ""] || GROUP_ICONS["Other"]} alt="icon" className="w-6 h-6 drop-shadow-sm" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{c.contract_title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{c.client_name || c.client_code}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <GroupBadge group={c.contract_group} />
        </div>

        {/* expiry progress bar */}
        <div className="mt-2.5">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: barColor }} />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] text-muted-foreground">{formatDateShort(c.start_date)}</span>
            <span className={`text-[9px] font-semibold ${expired ? "text-red-500" : expiring ? "text-amber-600" : "text-muted-foreground"}`}>
              {expired ? `Expired ${Math.abs(days)}d ago` : expiring ? `Exp in ${days}d ⚠` : `Exp ${formatDateShort(c.end_date)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <StatusBadge status={c.status} />
        <span className="text-[11px] text-muted-foreground font-mono">#{c.contract_code}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end mt-auto">
          {expired ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">Expired</span>
          ) : expiring ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">Expiring</span>
          ) : (
            <span className="text-[10px] font-medium text-muted-foreground">{c.annual_value ? formatOMRK(c.annual_value) + "/yr" : "—"}</span>
          )}
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   NEW CONTRACT FORM
═══════════════════════════════════════════ */

interface NewContractForm {
  contract_code: string; contract_title: string; client_code: string;
  contract_group: string; contract_type: string;
  start_date: string; end_date: string;
  annual_value: string; billing_model: string; fixed_monthly: string;
  payment_status: string; status: string;
}

const BLANK: NewContractForm = {
  contract_code: "", contract_title: "", client_code: "",
  contract_group: "", contract_type: "", start_date: "", end_date: "",
  annual_value: "", billing_model: "", fixed_monthly: "", payment_status: "", status: "Draft",
};

// Move these components outside to prevent re-creation on each render
const LabeledInput = ({ label, value, onChange, type = "text", placeholder, required }: { 
  label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean 
}) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
  </div>
);

const LabeledSelect = ({ label, value, onChange, options, required }: { 
  label: string; value: string; onChange: (value: string) => void; options: string[]; required?: boolean 
}) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
      <option value="">Select...</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

function NewContractForm({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [form, setForm] = useState<NewContractForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: keyof NewContractForm) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data: clients } = useFrappeList<Client>("Client", ["name", "client_name"], [], []);

  const handleSubmit = async () => {
    if (!form.contract_title || !form.client_code || !form.start_date || !form.end_date) {
      setSaveError("Title, Client, Start Date and End Date are required."); return;
    }
    setSaving(true); setSaveError(null);
    try {
      const doc = await frappeCreate<ContractDetail>("FM Contract", {
        ...form,
        annual_value: form.annual_value ? Number(form.annual_value) : undefined,
        fixed_monthly: form.fixed_monthly ? Number(form.fixed_monthly) : undefined,
      });

      // 🎉 Professional toast notification for contract creation
      sonnerToast.success(
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <FileTextIcon className="w-6 h-6 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-base text-white leading-tight">Contract Created</span>
            <span className="text-sm text-white/80 leading-tight">{doc.name} • Created successfully</span>
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

      onCreated(doc.name);
    } catch (e: unknown) { setSaveError((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 c-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">New Contract</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Register a new FM contract</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      <div className="bg-muted/20 rounded-xl border border-border/60 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">General Details</p>
        <LabeledInput label="Contract Code" value={form.contract_code} onChange={set("contract_code")} placeholder="e.g. CON-2026-001" required />
        <LabeledInput label="Contract Title" value={form.contract_title} onChange={set("contract_title")} placeholder="e.g. HVAC AMC – Tower A" required />
        <div className="mb-4">
          <label className="block text-xs font-semibold text-foreground mb-1.5">Client <span className="text-destructive">*</span></label>
          <select value={form.client_code} onChange={(e) => set("client_code")(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">Select client…</option>
            {clients.map((c) => <option key={c.name} value={c.name}>{c.client_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect label="Contract Group" value={form.contract_group} onChange={set("contract_group")}
            options={["IFM", "DC Ops", "Soft FM", "Hard FM", "MEP Only", "AMC", "PMC", "FM", "AdHoc", "Other"]} />
          <LabeledSelect label="Contract Type" value={form.contract_type} onChange={set("contract_type")}
            options={["Annual AMC", "Multi-Year AMC", "Spot", "Call-Out", "Project Based", "Other"]} />
        </div>
      </div>

      <div className="bg-muted/20 rounded-xl border border-border/60 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contract Period</p>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Start Date" value={form.start_date} onChange={set("start_date")} type="date" required />
          <LabeledInput label="End Date" value={form.end_date} onChange={set("end_date")} type="date" required />
        </div>
      </div>

      <div className="bg-muted/20 rounded-xl border border-border/60 p-4 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Financial Terms</p>
        <div className="grid grid-cols-2 gap-3">
          <LabeledInput label="Annual Value (OMR)" value={form.annual_value} onChange={set("annual_value")} type="number" placeholder="96000" />
          <LabeledInput label="Fixed Monthly (OMR)" value={form.fixed_monthly} onChange={set("fixed_monthly")} type="number" placeholder="8000" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledSelect label="Billing Model" value={form.billing_model} onChange={set("billing_model")}
            options={["Fixed Monthly", "Fixed+Variable", "Unit Rate", "Lump Sum", "Other"]} />
          <LabeledSelect label="Payment Status" value={form.payment_status} onChange={set("payment_status")}
            options={["Current", "Overdue", "Disputed", "Settled"]} />
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Initial Status</p>
        <div className="flex gap-2">
          {["Draft", "Active", "On Hold"].map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <button key={s} onClick={() => set("status")(s)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                  ${form.status === s ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-foreground hover:border-primary/40 hover:bg-muted"}`}>
                {cfg?.icon} {s}
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Contract</>}
      </button>
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════
   ★ ENHANCED SECTION CARDS — replacing ColSection approach
═══════════════════════════════════════════════════════════ */

/* Shared wrapper: accent top-strip + gradient header + icon */
function SectionCard({
  accentColor, icon, title, subtitle, children, className = "",
}: {
  accentColor: string; icon: React.ReactNode; title: string; subtitle?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`section-card-wrap sec-card rounded-2xl border border-border/70 bg-card overflow-hidden mb-4 ${className}`}>
      {/* colour accent strip */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${accentColor},${accentColor}55)` }} />
      {/* card header */}
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/40"
        style={{ background: `linear-gradient(135deg,${accentColor}07 0%,transparent 70%)` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}18`, color: accentColor }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest leading-none" style={{ color: accentColor }}>{title}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

/* Data row inside section cards */
function DataRow({ label, value, link = false, mono = false, valueColor }: {
  label: string; value?: string | null; link?: boolean; mono?: boolean; valueColor?: string;
}) {
  const isEmpty = !value;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/25 last:border-0">
      <span className="text-[11px] text-muted-foreground font-medium shrink-0">{label}</span>
      {isEmpty
        ? <span className="text-[11px] text-muted-foreground/35">—</span>
        : link
          ? <span className="text-[11px] text-primary font-semibold cursor-pointer hover:underline text-right">{value}</span>
          : <span className={`text-[11px] font-semibold text-right ${mono ? "font-mono" : ""}`}
            style={valueColor ? { color: valueColor } : undefined}>{value}</span>
      }
    </div>
  );
}

/* ── 1. CONTRACT DETAILS CARD ── */
function ContractDetailsCard({ c }: { c: ContractDetail }) {
  const accent = "#4f46e5";
  const groupCfg = GROUP_COLORS[c.contract_group || ""] || GROUP_COLORS["Other"];
  return (
    <SectionCard accentColor={accent} icon={<FileText className="w-4 h-4" />} title="Contract Details"
      subtitle={[c.client_name || c.client_code, c.contract_group].filter(Boolean).join(" · ")}>
      <div className="grid grid-cols-2 gap-x-8 mb-4">
        <div>
          <DataRow label="Contract ID" value={c.contract_code} mono />
          <DataRow label="Contract Type" value={c.contract_type} />
          <DataRow label="Group" value={c.contract_group} />
        </div>
        <div>
          <DataRow label="Client" value={c.client_name || c.client_code} link />
          {c.amended_from && <DataRow label="Amended From" value={c.amended_from} link />}
        </div>
      </div>
      {/* visual footer: icon + full title + badges */}
      <div className="pt-3.5 border-t border-border/25 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${groupCfg.accent}14` }}>
          <img src={GROUP_ICONS[c.contract_group || ""] || GROUP_ICONS["Other"]} alt="" className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{c.contract_title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <GroupBadge group={c.contract_group} />
            {c.contract_type && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-muted border border-border text-muted-foreground">{c.contract_type}</span>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ── 2. SCOPE & DURATION CARD ── */
function ScopeDurationCard({ c, autoRenew, onAutoRenewChange }: {
  c: ContractDetail; autoRenew: boolean; onAutoRenewChange: (v: boolean) => void;
}) {
  const days = daysUntil(c.end_date);
  const isExpired = days < 0;
  const isExpiring = !isExpired && days <= 60;
  const accent = isExpired ? "#ef4444" : isExpiring ? "#f59e0b" : "#0891b2";

  const totalDays = Math.max(1, Math.ceil((new Date(c.end_date).getTime() - new Date(c.start_date).getTime()) / 86_400_000));
  const elapsedDays = totalDays - Math.max(0, days);
  const ringPct = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  const r = 22, circ = 2 * Math.PI * r;
  const strokeOffset = circ - (ringPct / 100) * circ;

  /* Timeline */
  const start = new Date(c.start_date).getTime();
  const end = new Date(c.end_date).getTime();
  const now = Date.now();
  const timelineProgress = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const barColor = isExpired ? "#ef4444" : isExpiring ? "#f59e0b" : "#10b981";

  return (
    <SectionCard accentColor={accent} icon={<Calendar className="w-4 h-4" />} title="Scope & Duration"
      subtitle={isExpired ? "Contract has ended" : isExpiring ? `Expiring in ${days} days` : `${days} days remaining`}>
      {/* timeline bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-1.5 text-[10px] font-semibold text-muted-foreground">
          <span>Contract Start</span>
          <span className={`font-bold ${isExpired ? "text-red-500" : isExpiring ? "text-amber-600" : "text-emerald-600"}`}>
            {isExpired ? "Expired" : isExpiring ? `Expiring in ${days}d` : `${days} days remaining`}
          </span>
          <span>End Date</span>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <div className="con-bar-fill absolute left-0 top-0 h-full rounded-full"
            style={{ "--target-w": `${timelineProgress}%`, width: `${timelineProgress}%`, background: barColor } as React.CSSProperties} />
          <div className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${timelineProgress}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
          <span>{formatDate(c.start_date)}</span>
          <span className="bg-muted/80 px-2 py-0.5 rounded-full font-medium border border-border/50">Today · {timelineProgress}%</span>
          <span className={isExpired ? "text-red-500 font-semibold" : ""}>{formatDate(c.end_date)}</span>
        </div>
      </div>

      {/* 3-col: start chip / ring / end chip */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-border/50 bg-muted/20 p-3.5 flex flex-col gap-1">
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Start Date</p>
          <p className="text-sm font-bold text-foreground">{formatDate(c.start_date)}</p>
          <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center mt-0.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          </div>
        </div>
        {/* SVG progress ring */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-3 flex flex-col items-center gap-1">
          <svg width="54" height="54" viewBox="0 0 54 54">
            <circle cx="27" cy="27" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle cx="27" cy="27" r={r} fill="none" stroke={accent} strokeWidth="4"
              strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={strokeOffset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)" }} />
            <text x="27" y="31" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#374151">{ringPct.toFixed(0)}%</text>
          </svg>
          <p className="text-[9px] text-muted-foreground font-medium text-center leading-tight">elapsed</p>
        </div>
        <div className={`rounded-xl border p-3.5 flex flex-col gap-1 ${isExpired ? "border-red-200 bg-red-50" : isExpiring ? "border-amber-200 bg-amber-50" : "border-border/50 bg-muted/20"}`}>
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">End Date</p>
          <p className={`text-sm font-bold ${isExpired ? "text-red-600" : isExpiring ? "text-amber-700" : "text-foreground"}`}>{formatDate(c.end_date)}</p>
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 ${isExpired ? "bg-red-100" : isExpiring ? "bg-amber-100" : "bg-muted"}`}>
            {isExpired ? <XCircle className="w-3 h-3 text-red-500" />
              : isExpiring ? <AlertTriangle className="w-3 h-3 text-amber-600" />
                : <Clock className="w-3 h-3 text-muted-foreground" />}
          </div>
        </div>
      </div>

      {/* auto-renew toggle */}
      <div className="pt-3.5 border-t border-border/25 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>
            <RotateCcw className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Auto-Renew</p>
            <p className="text-[10px] text-muted-foreground">Automatically renew on expiry</p>
          </div>
        </div>
        <Switch checked={autoRenew} onCheckedChange={onAutoRenewChange} />
      </div>
    </SectionCard>
  );
}

/* ── 3. FINANCIAL CARD ── */
function FinancialSectionCard({ c }: { c: ContractDetail }) {
  const accent = "#059669";
  const paymentCfg = PAYMENT_CONFIG[c.payment_status || ""] || null;
  const annualVal = c.annual_value || 0;
  const monthlyVal = c.fixed_monthly || 0;
  const expectedMonthly = annualVal / 12;
  const barRatio = expectedMonthly > 0 ? Math.min(100, (monthlyVal / expectedMonthly) * 100) : 0;

  return (
    <SectionCard accentColor={accent} icon={<DollarSign className="w-4 h-4" />} title="Financial"
      subtitle={c.billing_model || "Billing details"}>
      {/* big value pair */}
      <div className="grid grid-cols-2 gap-3.5 mb-4">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-600 mb-1.5">Annual Value</p>
          <p className="text-2xl font-black text-emerald-800 leading-none">{formatOMR(c.annual_value)}</p>
          {c.billing_model && (
            <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">{c.billing_model}</span>
          )}
        </div>
        <div className="rounded-xl bg-muted/30 border border-border/50 p-4">
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Fixed Monthly</p>
          <p className="text-2xl font-black text-foreground leading-none">{formatOMR(c.fixed_monthly)}</p>
          <p className="text-[10px] text-muted-foreground mt-2">per month</p>
        </div>
      </div>

      {/* monthly vs expected bar */}
      {annualVal > 0 && monthlyVal > 0 && (
        <div className="mb-4">
          <div className="flex justify-between mb-1.5">
            <p className="text-[10px] text-muted-foreground font-medium">Monthly vs Expected ({formatOMR(Math.round(expectedMonthly))})</p>
            <p className="text-[10px] font-bold" style={{ color: barRatio > 100 ? "#ef4444" : accent }}>{barRatio.toFixed(0)}%</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${barRatio}%`, background: barRatio > 100 ? "#ef4444" : accent }} />
          </div>
        </div>
      )}

      {/* payment status chip */}
      {c.payment_status && (
        <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${paymentCfg?.cls || "border-border bg-muted/20"}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: paymentCfg ? `${paymentCfg.dot}1a` : "#f3f4f6" }}>
            <CreditCard className="w-4 h-4" style={{ color: paymentCfg?.dot || "#9ca3af" }} />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Payment Status</p>
            <p className="text-sm font-bold text-foreground">{c.payment_status}</p>
          </div>
          {paymentCfg && <span className="w-2.5 h-2.5 rounded-full dot-pulse" style={{ background: paymentCfg.dot }} />}
        </div>
      )}
    </SectionCard>
  );
}

/* ── 4. SLA CARD ── */
function SLASectionCard({ rows }: { rows: SLARow[] }) {
  if (!rows.length) return null;
  const accent = "#7c3aed";

  return (
    <SectionCard accentColor={accent} icon={<Shield className="w-4 h-4" />} title="SLA Configuration"
      subtitle={`${rows.length} priority level${rows.length !== 1 ? "s" : ""}`}>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        {rows.map((row, i) => {
          const cfg = SLA_PRIORITY_CFG[row.priority] || SLA_PRIORITY_CFG["Low"];
          return (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border transition-shadow hover:shadow-sm"
              style={{ background: cfg.bg, borderColor: cfg.border }}>
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full shadow-sm" style={{ background: cfg.accent }} />
                <span className="text-xs font-bold text-foreground">{row.priority}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 border border-black/5 shadow-sm" title="Response Time">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-foreground">{row.response_hours}h</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/60 border border-black/5 shadow-sm" title="Resolution Time">
                  <CheckCheck className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-bold text-foreground">{row.resolution_hours}h</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ── 5. STATUS & TRACKING CARD ── */
const STATUS_LIFECYCLE_STEPS = ["Draft", "Active", "On Hold", "Expired", "Terminated"] as const;

function StatusTrackingCard({ c }: { c: ContractDetail }) {
  const accent = "#0284c7";
  const currentIdx = STATUS_LIFECYCLE_STEPS.indexOf(c.status as typeof STATUS_LIFECYCLE_STEPS[number]);
  const days = daysUntil(c.end_date);
  const isOverdue = c.payment_status === "Overdue";
  const isDisputed = c.payment_status === "Disputed";
  const health = c.status !== "Active" ? 0 : isOverdue ? 38 : isDisputed ? 55 : days < 0 ? 20 : days <= 30 ? 52 : days <= 60 ? 70 : 95;
  const healthColor = health >= 80 ? "#10b981" : health >= 52 ? "#f59e0b" : "#ef4444";
  const healthLabel = health >= 80 ? "Healthy" : health >= 52 ? "At Risk" : "Critical";

  return (
    <SectionCard accentColor={accent} icon={<Activity className="w-4 h-4" />} title="Status & Tracking"
      subtitle={`Current status: ${c.status}`}>
      {/* lifecycle step rail */}
      <div className="mb-5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Contract Lifecycle</p>
        <div className="relative flex items-start gap-0">
          <div className="absolute left-4 right-4 top-3.5 h-px bg-border z-0" />
          {STATUS_LIFECYCLE_STEPS.map((s, i) => {
            const cfg = STATUS_CONFIG[s];
            const isPast = currentIdx > i;
            const isCurrent = currentIdx === i;
            return (
              <div key={s} className="flex-1 flex flex-col items-center gap-1.5 relative z-10">
                <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
                  ${isCurrent ? "scale-110 shadow-md" : isPast ? "border-emerald-300 bg-emerald-50" : "border-border bg-card"}`}
                  style={isCurrent ? { borderColor: cfg?.border || accent, background: `${cfg?.border || accent}18` } : {}}>
                  <span className={`${isPast ? "text-emerald-600" : isCurrent ? "" : "text-muted-foreground/35"}`}
                    style={isCurrent ? { color: cfg?.border || accent } : {}}>
                    {cfg?.icon}
                  </span>
                </div>
                <span className={`text-[8px] font-semibold text-center leading-tight
                  ${isCurrent ? "text-foreground" : isPast ? "text-emerald-600" : "text-muted-foreground/40"}`}
                  style={isCurrent ? { color: cfg?.border || accent } : {}}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* health gauge */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${healthColor}18`, color: healthColor }}>
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Contract Health</p>
              <p className="text-sm font-bold leading-tight" style={{ color: healthColor }}>{healthLabel}</p>
            </div>
          </div>
          <p className="text-3xl font-black leading-none" style={{ color: healthColor }}>
            {health}<span className="text-sm font-bold opacity-50">%</span>
          </p>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${health}%`, background: healthColor }} />
        </div>
        {/* health factor pills */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${STATUS_CONFIG[c.status]?.bg || "bg-muted"} ${STATUS_CONFIG[c.status]?.text || "text-muted-foreground"}`}>
            {c.status}
          </span>
          {c.payment_status && (
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${PAYMENT_CONFIG[c.payment_status]?.cls || "bg-muted text-muted-foreground"}`}>
              {c.payment_status}
            </span>
          )}
          {days >= 0 && (
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${days <= 30 ? "bg-red-100 text-red-700" : days <= 60 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
              {days}d remaining
            </span>
          )}
          {days < 0 && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">Expired</span>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
interface EditContractState {
  contract_code: string; contract_title: string; client_code: string;
  contract_group: string; contract_type: string; start_date: string; end_date: string;
  annual_value: string; fixed_monthly: string; billing_model: string;
  payment_status: string; status: string;
}

function contractToEditState(c: ContractDetail): EditContractState {
  return {
    contract_code: c.contract_code ?? "",
    contract_title: c.contract_title ?? "",
    client_code: c.client_code ?? "",
    contract_group: c.contract_group ?? "",
    contract_type: c.contract_type ?? "",
    start_date: c.start_date ?? "",
    end_date: c.end_date ?? "",
    annual_value: String(c.annual_value ?? ""),
    fixed_monthly: String(c.fixed_monthly ?? ""),
    billing_model: c.billing_model ?? "",
    payment_status: c.payment_status ?? "",
    status: c.status ?? "Draft",
  };
}

function EditSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="text-primary">{icon}</div>
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h4>
      </div>
      <div className="space-y-3.5 bg-muted/20 rounded-xl p-4 border border-border/50">
        {children}
      </div>
    </div>
  );
}

function EditInput({ label, value, onChange, dirty, type = "text", placeholder, req }: { label: string; value: string; onChange: (v: string) => void; dirty?: boolean; type?: string; placeholder?: string; req?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">{label}{req && <span className="text-destructive ml-1">*</span>}</label>
        {dirty && <span className="text-[9px] font-bold text-amber-600 animate-pulse">Modified</span>}
      </div>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg text-sm bg-background border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20
          ${dirty ? "border-amber-300 ring-2 ring-amber-500/10" : "border-border hover:border-border/80"}`} />
    </div>
  );
}

function EditSelect({ label, value, onChange, options, dirty, req }: { label: string; value: string; onChange: (v: string) => void; options: string[]; dirty?: boolean; req?: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">{label}{req && <span className="text-destructive ml-1">*</span>}</label>
        {dirty && <span className="text-[9px] font-bold text-amber-600 animate-pulse">Modified</span>}
      </div>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm bg-background border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none
            ${dirty ? "border-amber-300 ring-2 ring-amber-500/10" : "border-border hover:border-border/80"}`}>
          <option value="">Select options…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>
    </div>
  );
}

function EditContractDrawer({
  contract, onClose, onSaved
}: { contract: ContractDetail; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditContractState>(() => contractToEditState(contract));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

  const set = (k: keyof EditContractState) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirtyFields(s => new Set([...s, k]));
  };

  const { data: clients } = useFrappeList<Client>("Client", ["name", "client_name"], [], []);

  const handleSave = async () => {
    if (!form.contract_title || !form.client_code || !form.start_date || !form.end_date) {
      setSaveError("Title, Client, Start Date, and End Date are required.");
      return;
    }
    setSaving(true); setSaveError(null);
    try {
      await frappeUpdate<ContractDetail>("FM Contract", contract.name, {
        contract_title: form.contract_title,
        client_code: form.client_code,
        contract_group: form.contract_group || undefined,
        contract_type: form.contract_type || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
        annual_value: form.annual_value ? Number(form.annual_value) : 0,
        fixed_monthly: form.fixed_monthly ? Number(form.fixed_monthly) : 0,
        billing_model: form.billing_model || undefined,
        payment_status: form.payment_status || undefined,
        status: form.status,
      });

      // 🎉 Professional toast notification for contract update
      sonnerToast.success(
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-sm text-white leading-tight">Contract Updated</span>
            <span className="text-xs text-white/80 leading-tight">{contract.name} • Updated successfully</span>
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
    finally { setSaving(false); }
  };

  const isDirty = dirtyFields.size > 0;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[520px] max-w-full bg-card shadow-2xl flex flex-col border-l border-border c-slide-r">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Pencil className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Edit Contract</h3>
              <p className="text-[11px] text-muted-foreground font-mono">#{contract.contract_code}</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

          <EditSection title="General Details" icon={<FileText className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Contract Code" value={form.contract_code} onChange={set("contract_code")} dirty={dirtyFields.has("contract_code")} req />
              <EditInput label="Contract Title" value={form.contract_title} onChange={set("contract_title")} dirty={dirtyFields.has("contract_title")} req />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold text-foreground/70 uppercase tracking-tight">Client <span className="text-destructive ml-1">*</span></label>
                {dirtyFields.has("client_code") && <span className="text-[9px] font-bold text-amber-600 animate-pulse">Modified</span>}
              </div>
              <div className="relative">
                <select value={form.client_code} onChange={(e) => set("client_code")(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm bg-background border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none
                    ${dirtyFields.has("client_code") ? "border-amber-300 ring-2 ring-amber-500/10" : "border-border hover:border-border/80"}`}>
                  <option value="">Select client…</option>
                  {clients.map(cl => <option key={cl.name} value={cl.name}>{cl.client_name}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EditSelect label="Contract Group" value={form.contract_group} onChange={set("contract_group")} dirty={dirtyFields.has("contract_group")}
                options={["IFM", "DC Ops", "Soft FM", "Hard FM", "MEP Only", "AMC", "PMC", "FM", "AdHoc", "Other"]} />
              <EditSelect label="Contract Type" value={form.contract_type} onChange={set("contract_type")} dirty={dirtyFields.has("contract_type")}
                options={["Annual AMC", "Multi-Year AMC", "Spot", "Call-Out", "Project Based", "Other"]} />
            </div>
          </EditSection>

          <EditSection title="Contract Period" icon={<Calendar className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Start Date" value={form.start_date} onChange={set("start_date")} dirty={dirtyFields.has("start_date")} type="date" req />
              <EditInput label="End Date" value={form.end_date} onChange={set("end_date")} dirty={dirtyFields.has("end_date")} type="date" req />
            </div>
          </EditSection>

          <EditSection title="Financial Terms" icon={<DollarSign className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <EditInput label="Annual Value (OMR)" value={form.annual_value} onChange={set("annual_value")} dirty={dirtyFields.has("annual_value")} type="number" />
              <EditInput label="Fixed Monthly (OMR)" value={form.fixed_monthly} onChange={set("fixed_monthly")} dirty={dirtyFields.has("fixed_monthly")} type="number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EditSelect label="Billing Model" value={form.billing_model} onChange={set("billing_model")} dirty={dirtyFields.has("billing_model")}
                options={["Fixed Monthly", "Fixed+Variable", "Unit Rate", "Lump Sum", "Other"]} />
              <EditSelect label="Payment Status" value={form.payment_status} onChange={set("payment_status")} dirty={dirtyFields.has("payment_status")}
                options={["Current", "Overdue", "Disputed", "Settled"]} />
            </div>
          </EditSection>

          <EditSection title="Status" icon={<Activity className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 gap-3">
              <EditSelect label="Status" value={form.status} onChange={set("status")} dirty={dirtyFields.has("status")}
                options={["Draft", "Active", "On Hold", "Expired", "Terminated"]} />
            </div>
          </EditSection>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-4 bg-card flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !isDirty}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><CheckCircle2 className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */

function DetailView({ contractName, onRefresh }: { contractName: string; onRefresh?: () => void }) {
  const [editKey, setEditKey] = useState(0);
  const [showEdit, setShowEdit] = useState(false);
  const { data: c, loading, error } = useFrappeDoc<ContractDetail>("FM Contract", contractName, editKey);
  const [autoRenew, setAutoRenew] = useState(false);

  const handleSaved = () => {
    setShowEdit(false);
    // Incrementing editKey triggers useFrappeDoc to re-fetch the latest data from the server
    setEditKey(prev => prev + 1);
    // Notifying the parent component to refresh the main list (refetch())
    if (onRefresh) onRefresh();
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!c) return null;

  const days = daysUntil(c.end_date);
  const expiryWarning = days >= 0 && days <= 60;
  const isExpired = days < 0;
  const groupCfg = GROUP_COLORS[c.contract_group || ""] || GROUP_COLORS["Other"];

  return (
    <div className="c-fade-up">
      {/* ── HERO HEADER (sticky) ── */}
      <div className="sticky top-0 z-10 px-6 pt-6 pb-5 border-b border-border/70 bg-card/95 backdrop-blur-md"
        style={{ background: `linear-gradient(135deg,${groupCfg.accent}09 0%,transparent 80%)` }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-white/30 shadow-sm shrink-0"
              style={{ background: `${groupCfg.accent}18` }}>
              <img src={GROUP_ICONS[c.contract_group || ""] || GROUP_ICONS["Other"]} alt="icon" className="w-7 h-7 drop-shadow-md" />
            </div>
            <div className="flex-1 flex items-start justify-between min-w-0 gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-foreground leading-tight">{c.contract_title}</h2>
                  <p className="text-[11px] text-muted-foreground font-mono">#{c.contract_code}</p>
                </div>
              </div>
              {(expiryWarning || isExpired) && (
                <div className={`flex items-center gap-2.5 pl-3 pr-4 py-2 rounded-xl border relative overflow-hidden alert-glow-${isExpired ? "red" : "amber"} ${isExpired ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-300"} shrink-0 shadow-sm`}>
                  <div className="shimmer-effect absolute inset-0 pointer-events-none rounded-xl" />
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/70 relative z-10 shrink-0 shadow-sm">
                    <AlertTriangle className={`w-4 h-4 ${isExpired ? "text-red-500" : "text-amber-500"}`} />
                  </div>
                  <div className="relative z-10 flex flex-col justify-center border-l pl-2.5 border-current/10">
                    <p className={`text-[11px] font-bold uppercase tracking-wider leading-none mb-1 ${isExpired ? "text-red-700" : "text-amber-700"}`}>
                      {isExpired ? "Contract Expired" : "Expiring Soon"}
                    </p>
                    <p className={`text-[10px] whitespace-nowrap leading-none font-medium ${isExpired ? "text-red-600/90" : "text-amber-700/90"}`}>
                      {isExpired ? `on ${formatDate(c.end_date)}` : `in ${days} days`}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <StatusBadge status={c.status} />
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-border/80 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            {/* <button className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button> */}
          </div>
        </div>
        {/* quick pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <GroupBadge group={c.contract_group} />
          {c.contract_type && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted border border-border text-foreground">{c.contract_type}</span>
          )}
          {c.payment_status && (
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${PAYMENT_CONFIG[c.payment_status]?.cls || "bg-muted border-border text-foreground"}`}>
              <DollarSign className="w-3 h-3" />{c.payment_status}
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION CARDS ── */}
      <div className="px-6 py-5">
        <ContractDetailsCard c={c} />
        <ScopeDurationCard c={c} autoRenew={autoRenew} onAutoRenewChange={setAutoRenew} />
        <FinancialSectionCard c={c} />
        {c.sla_details && c.sla_details.length > 0 && <SLASectionCard rows={c.sla_details} />}
        <StatusTrackingCard c={c} />
      </div>

      {showEdit && (
        <EditContractDrawer
          contract={c}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
/* ★ ENHANCED FILTER BAR COMPONENTS
═══════════════════════════════════════════ */

interface FilterPillProps {
  icon: React.ReactNode; label: string; value: string;
  options: string[]; onChange: (v: string) => void; accentColor?: string;
}

function FilterPill({ icon, label, value, options, onChange, accentColor = "#4f46e5" }: FilterPillProps) {
  const isActive = !!value;
  return (
    <div className="relative filter-pill">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="styled-filter appearance-none pl-7 pr-7 py-1.5 rounded-full text-[11px] font-semibold border focus:outline-none"
        style={{
          borderColor: isActive ? accentColor : undefined,
          background: isActive ? `${accentColor}0e` : undefined,
          color: isActive ? accentColor : undefined,
        }}>
        <option value="">{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: isActive ? accentColor : undefined }}>
        {icon}
      </span>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        {isActive
          ? <CheckCircle2 className="w-3 h-3" style={{ color: accentColor }} />
          : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </span>
      {isActive && (
        <span className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 0 2px ${accentColor}38` }} />
      )}
    </div>
  );
}

function ActiveFilterChips({
  filters, onRemove,
}: { filters: { label: string; value: string; key: string; color: string }[]; onRemove: (key: string) => void; }) {
  if (!filters.length) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Active:</span>
      {filters.map((f) => (
        <span key={f.key}
          className="filter-pill inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[10px] font-bold border"
          style={{ color: f.color, background: `${f.color}10`, borderColor: `${f.color}32` }}>
          {f.value}
          <button onClick={() => onRemove(f.key)}
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-current/20 transition-colors ml-0.5">
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

type TabType = "Active" | "Expired" | "All";

export default function Contracts() {
  useContractStyles();

  const [activeTab, setActiveTab] = useState<TabType>("Active");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"expiry" | "value">("expiry");
  const [filterType, setFilterType] = useState<string>("");
  const [filterGroup, setFilterGroup] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const { data: allContracts, loading, error, refetch } = useFrappeList<ContractListItem>(
    "FM Contract",
    ["name", "contract_code", "contract_title", "client_code", "client_name",
      "branch_code", "branch_name",
      "contract_group", "contract_type", "start_date", "end_date",
      "annual_value", "fixed_monthly", "billing_model", "payment_status", "status"],
    [], []
  );

  const stats = useMemo<ContractStats>(() => ({
    active: allContracts.filter((c) => c.status === "Active").length,
    totalValue: allContracts.reduce((s, c) => s + (c.annual_value || 0), 0),
    expiringSoon: allContracts.filter((c) => { const d = daysUntil(c.end_date); return d >= 0 && d <= 60; }).length,
    overdue: allContracts.filter((c) => c.payment_status === "Overdue").length,
  }), [allContracts]);

  /* derive unique option lists from live data */
  const branchOptions = useMemo(() => Array.from(new Set(allContracts.map((c) => c.branch_name || c.branch_code).filter(Boolean))) as string[], [allContracts]);
  const groupOptions = useMemo(() => Array.from(new Set(allContracts.map((c) => c.contract_group).filter(Boolean))) as string[], [allContracts]);
  const clientOptions = useMemo(() => Array.from(new Set(allContracts.map((c) => c.client_name).filter(Boolean))) as string[], [allContracts]);
  const typeOptions = useMemo(() => Array.from(new Set(allContracts.map((c) => c.contract_type).filter(Boolean))) as string[], [allContracts]);
  const statusOptions = useMemo(() => Array.from(new Set(allContracts.map((c) => c.status).filter(Boolean))) as string[], [allContracts]);

  const clearAll = () => { setFilterType(""); setFilterGroup(""); setFilterClient(""); setFilterBranch(""); setFilterStatus(""); };

  const activeFilterChips = useMemo(() => [
    filterBranch && { key: "branch", label: "Branch", value: filterBranch, color: "#f59e0b" },
    filterGroup && { key: "group", label: "Group", value: filterGroup, color: (GROUP_COLORS[filterGroup] || GROUP_COLORS["Other"]).accent },
    filterClient && { key: "client", label: "Client", value: filterClient, color: "#0891b2" },
    filterType && { key: "type", label: "Type", value: filterType, color: "#7c3aed" },
    filterStatus && { key: "status", label: "Status", value: filterStatus, color: (STATUS_CONFIG[filterStatus] || STATUS_CONFIG["Draft"]).border },
  ].filter(Boolean) as { label: string; value: string; key: string; color: string }[], [filterBranch, filterGroup, filterClient, filterType, filterStatus]);

  const removeFilter = (key: string) => {
    if (key === "branch") setFilterBranch("");
    if (key === "group") setFilterGroup("");
    if (key === "client") setFilterClient("");
    if (key === "type") setFilterType("");
    if (key === "status") setFilterStatus("");
  };

  const filtered = allContracts.filter((c) => {
    if (activeTab === "Active" && c.status !== "Active") return false;
    if (activeTab === "Expired" && !["Expired", "Terminated"].includes(c.status)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(c.contract_title?.toLowerCase().includes(q) || c.contract_code?.toLowerCase().includes(q) || c.client_name?.toLowerCase().includes(q))) return false;
    }
    if (filterType && c.contract_type !== filterType) return false;
    if (filterBranch && (c.branch_name || c.branch_code) !== filterBranch) return false;
    if (filterGroup && c.contract_group !== filterGroup) return false;
    if (filterClient && c.client_name !== filterClient) return false;
    if (activeTab === "All" && filterStatus && c.status !== filterStatus) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "expiry") return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    return (b.annual_value || 0) - (a.annual_value || 0);
  });

  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showNewForm) setSelectedName(filtered[0].name);
  }, [filtered, selectedName, showNewForm]);

  const hasActiveFilters = !!(filterBranch || filterType || filterGroup || filterClient || filterStatus);

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Contracts</h1>
        <div className="flex items-center gap-2.5">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-64 focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="Search Contracts…" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>
          <button onClick={() => { setShowNewForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      {/* ══ STATS BAR ══ */}
      <StatsBar stats={stats} loading={loading} />

      {/* ══ ENHANCED FILTER BAR ══ */}
      <div className="border-b border-border bg-card/80">
        <div className="flex items-center gap-2 px-5 py-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1">
            <Filter className="w-3 h-3" /> Filters
          </div>
          <FilterPill icon={<Building2 className="w-3 h-3" />} label="All Branches" value={filterBranch}
            options={branchOptions} onChange={setFilterBranch} accentColor="#f59e0b" />
          <FilterPill icon={<Building2 className="w-3 h-3" />} label="All Groups" value={filterGroup}
            options={groupOptions} onChange={setFilterGroup} accentColor="#3b82f6" />
          <FilterPill icon={<User className="w-3 h-3" />} label="All Clients" value={filterClient}
            options={clientOptions} onChange={setFilterClient} accentColor="#0891b2" />
          <FilterPill icon={<Tag className="w-3 h-3" />} label="All Types" value={filterType}
            options={typeOptions} onChange={setFilterType} accentColor="#7c3aed" />
          {activeTab === "All" && (
            <FilterPill icon={<CheckCircle2 className="w-3 h-3" />} label="All Statuses" value={filterStatus}
              options={statusOptions} onChange={setFilterStatus} accentColor="#059669" />
          )}
          {hasActiveFilters && (
            <>
              <div className="h-5 w-px bg-border mx-1" />
              <ActiveFilterChips filters={activeFilterChips} onRemove={removeFilter} />
              <button onClick={clearAll}
                className="filter-pill ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-all">
                <X className="w-2.5 h-2.5" /> Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL ── */}
        <div className="w-[400px] min-w-[400px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border bg-muted/20">
            {(["Active", "Expired", "All"] as TabType[]).map((t) => {
              const count = t === "All" ? allContracts.length
                : t === "Active" ? allContracts.filter((c) => c.status === "Active").length
                  : allContracts.filter((c) => ["Expired", "Terminated"].includes(c.status)).length;
              return (
                <button key={t} onClick={() => { setActiveTab(t); setSelectedName(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all relative flex items-center justify-center gap-1.5
                    ${activeTab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {t}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === t ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {loading ? "…" : count}
                  </span>
                  {activeTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                </button>
              );
            })}
          </div>
          {/* sort + count */}
          <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{sorted.length} contract{sorted.length !== 1 ? "s" : ""}</span>
            <button onClick={() => setSortBy(sortBy === "expiry" ? "value" : "expiry")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sort: <span className="font-semibold text-foreground">{sortBy === "expiry" ? "Expiry Date" : "Value"}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {loading && <LoadingSpinner />}
            {error && <ErrorBanner message={error} onRetry={refetch} />}
            {!loading && !error && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FileText className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No contracts found</p>
                {hasActiveFilters && <button onClick={clearAll} className="text-xs text-primary hover:underline">Clear filters</button>}
              </div>
            )}
            <div className="c-stagger">
              {!loading && !error && sorted.map((c) => (
                <ContractCard key={c.name} c={c}
                  selected={selectedName === c.name && !showNewForm}
                  onClick={() => { setSelectedName(c.name); setShowNewForm(false); }} />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showNewForm ? (
            <NewContractForm onClose={() => setShowNewForm(false)}
              onCreated={(name) => { setShowNewForm(false); setSelectedName(name); refetch(); }} />
          ) : selectedName ? (
            <DetailView contractName={selectedName} onRefresh={refetch} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Select a contract</p>
                <p className="text-xs text-muted-foreground mt-1">to view full details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}