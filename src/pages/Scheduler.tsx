
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Plus, Search, X, CheckCircle2,
  XCircle, AlertTriangle, Clock, ChevronDown, Loader2,
  Filter, User, MapPin, RefreshCw, Calendar, List,
  LayoutGrid, Bell, Shield, Building2, Maximize2, Minimize2, ChevronUp,
} from "lucide-react";

/* ═══════════════════════════════════════════
   FRAPPE API
═══════════════════════════════════════════ */
const FRAPPE_BASE = "";
type FF = [string, string, string | number | string[]][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FF = [], limit = 300): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit),
  });
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`, { credentials: "include" });
  if (!res.ok) throw new Error(`GET ${doctype}: ${res.statusText}`);
  return (await res.json()).data as T[];
}

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Update failed");
  return (await res.json()).data as T;
}

async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || "" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Create failed");
  return (await res.json()).data as T;
}

function generateID(prefix: string) {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${date}-${time}-${rand}`;
}

function useFetch<T>(doctype: string, fields: string[], filters: FF, deps: unknown[]) {
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

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
interface Resource { name: string; resource_name: string; designation?: string; is_active?: boolean; branch_code?: string; branch_name?: string; }
interface PPMSchedule {
  name: string; pm_id: string; pm_title: string; pm_type?: string; frequency?: string; status: string;
  asset_code?: string; asset_name?: string; asset_category?: string; service_group?: string;
  property_code?: string; property_name?: string; zone_code?: string; sub_zone_code?: string;
  branch_code?: string; branch_name?: string;
  client_code?: string; client_name?: string; contract_code?: string; contract_group?: string;
  last_done_date?: string; next_due_date: string; overdue_by_days?: number;
  assigned_to?: string; assigned_technician?: string; ppm_wo_number?: string;
  planned_duration_hrs?: number; estimated_spares?: number; checklist_reference?: string; notes?: string;
}
interface WorkOrder {
  name: string; wo_number?: string; wo_title: string; wo_type?: string; status: string; actual_priority?: string;
  assigned_to?: string; assigned_technician?: string;
  schedule_start_date?: string; schedule_start_time?: string; schedule_end_time?: string; planned_duration_min?: number;
  property_code?: string; property_name?: string; asset_code?: string; asset_name?: string;
  branch_code?: string; branch_name?: string;
  service_group?: string; fault_category?: string; client_code?: string; client_name?: string;
  response_sla_target?: string; response_sla_actual?: string; response_sla_breach?: 0 | 1;
  resolution_sla_target?: string; resolution_sla_actual?: string; resolution_sla_breach?: 0 | 1;
  work_done_notes?: string;
}
interface ServiceRequest {
  name: string; sr_title?: string; fault_category?: string;
  property_name?: string; property_code?: string; reported_by?: string;
  branch_code?: string; branch_name?: string;
  priority_actual?: string; raised_date?: string; raised_time?: string; status: string;
  appointment_date?: string; priority_default?: string; client_code?: string; client_name?: string;
  contract_code?: string; contract_group?: string; zone_code?: string; sub_zone_code?: string;
  base_unit_code?: string; asset_code?: string; service_group?: string; fault_code?: string;
  reporting_level?: string; business_type?: string; approval_criticality?: string;
  work_description?: string; response_sla_target?: string; resolution_sla_target?: string;
  location_full_path?: string; wo_source?: string;
}
type ScheduleItem = PPMSchedule | WorkOrder;

/* ═══════════════════════════════════════════
   DATE HELPERS
═══════════════════════════════════════════ */
function getWeekStart(d: Date): Date {
  const s = new Date(d); const day = s.getDay();
  s.setDate(s.getDate() - (day === 0 ? 6 : day - 1)); s.setHours(0, 0, 0, 0); return s;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function dateKey(d: Date): string { return d.toISOString().split("T")[0]; }
function isToday(d: Date): boolean { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }
function fmtShort(d: Date): string { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
function formatDate(d?: string): string { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* item accessors */
function itemDate(it: ScheduleItem): string { return (it as PPMSchedule).next_due_date || (it as WorkOrder).schedule_start_date || ""; }
function itemTitle(it: ScheduleItem): string { return (it as PPMSchedule).pm_title || (it as WorkOrder).wo_title || it.name; }
function itemTime(it: ScheduleItem): string { return ((it as WorkOrder).schedule_start_time || "").slice(0, 5); }
function itemTechKey(it: ScheduleItem): string { return (it as PPMSchedule).assigned_to || (it as WorkOrder).assigned_to || ""; }
function itemTechName(it: ScheduleItem): string { return (it as PPMSchedule).assigned_technician || (it as WorkOrder).assigned_technician || ""; }
function isPPM(it: ScheduleItem): it is PPMSchedule { return !!(it as PPMSchedule).pm_id; }

/* ═══════════════════════════════════════════
   COLOUR SYSTEM
═══════════════════════════════════════════ */
const RES_PALETTE = [
  { card: "bg-[#06b6d4] text-white", dot: "bg-[#06b6d4]" },
  { card: "bg-[#8b5cf6] text-white", dot: "bg-[#8b5cf6]" },
  { card: "bg-[#f59e0b] text-black", dot: "bg-[#f59e0b]" },
  { card: "bg-[#ec4899] text-white", dot: "bg-[#ec4899]" },
  { card: "bg-[#22c55e] text-white", dot: "bg-[#22c55e]" },
  { card: "bg-[#f97316] text-white", dot: "bg-[#f97316]" },
  { card: "bg-[#3b82f6] text-white", dot: "bg-[#3b82f6]" },
  { card: "bg-[#ef4444] text-white", dot: "bg-[#ef4444]" },
];
function pal(i: number) { return RES_PALETTE[i % RES_PALETTE.length]; }

const CAT_MAP: [string[], string][] = [
  [["Preventive", "PPM", "Planned"], "bg-[#6366f1] text-white"],
  [["Clean"], "bg-[#06b6d4] text-white"],
  [["Inspect", "Fire"], "bg-[#f97316] text-white"],
  [["Security", "CCTV", "Access"], "bg-[#ec4899] text-white"],
  [["IT", "BMS", "Server"], "bg-[#8b5cf6] text-white"],
  [["Pest"], "bg-[#ef4444] text-white"],
  [["Garden", "Landscape"], "bg-[#84cc16] text-black"],
  [["Elevator", "Lift"], "bg-[#6366f1] text-white"],
  [["HVAC", "Chiller", "AHU"], "bg-[#0ea5e9] text-white"],
  [["Plumb", "Water", "Pump"], "bg-[#3b82f6] text-white"],
  [["Electr", "DB", "Panel", "Generator"], "bg-[#f59e0b] text-black"],
];
function catCls(it: ScheduleItem): string {
  const key = `${isPPM(it) ? it.pm_type : ""} ${isPPM(it) ? it.frequency : ""} ${isPPM(it) ? it.service_group : (it as WorkOrder).service_group || ""} ${itemTitle(it)}`;
  for (const [words, cls] of CAT_MAP) if (words.some(w => key.includes(w))) return cls;
  return "bg-[#64748b] text-white";
}
function catDot(it: ScheduleItem): string { return catCls(it).split(" ")[0].replace("bg-", "bg-"); }

const PRIORITY_CFG: Record<string, { bg: string; text: string; label: string }> = {
  "P1 - Critical": { bg: "bg-red-500", text: "text-white", label: "P1 – Urgent" },
  "P2 - High": { bg: "bg-orange-500", text: "text-white", label: "P2 – Urgent" },
  "P3 - Medium": { bg: "bg-blue-500", text: "text-white", label: "P3" },
  "P4 - Low": { bg: "bg-gray-400", text: "text-white", label: "P4" },
};
const STATUS_CLS: Record<string, string> = {
  Open: "bg-sky-100 text-sky-700", "In Progress": "bg-blue-100 text-blue-700",
  Completed: "bg-emerald-100 text-emerald-700", Scheduled: "bg-violet-100 text-violet-700",
  Overdue: "bg-red-100 text-red-700", Cancelled: "bg-gray-100 text-gray-500", Deferred: "bg-amber-100 text-amber-700",
};

/* ═══════════════════════════════════════════
   MICRO COMPONENTS
═══════════════════════════════════════════ */
function Spin() { return <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>; }
function ErrMsg({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 m-3 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"><AlertTriangle className="w-4 h-4 shrink-0" />{msg}</div>;
}
function Avatar({ name, size = "sm", ci }: { name?: string; size?: "sm" | "md" | "lg"; ci?: number }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-cyan-500", "bg-violet-500", "bg-amber-500", "bg-pink-500", "bg-green-500", "bg-orange-500", "bg-blue-500", "bg-red-500"];
  const c = ci !== undefined ? colors[ci % colors.length] : colors[(initials.charCodeAt(0) || 0) % colors.length];
  const sz = size === "lg" ? "w-10 h-10 text-sm" : size === "md" ? "w-8 h-8 text-xs" : "w-7 h-7 text-[11px]";
  return <div className={`${sz} rounded-full ${c} flex items-center justify-center text-white font-bold shrink-0`}>{initials}</div>;
}

/* ═══════════════════════════════════════════
   DETAIL MODAL
═══════════════════════════════════════════ */
function DetailModal({ item, onClose, onStatusChange }: { item: ScheduleItem; onClose: () => void; onStatusChange: () => void }) {
  const ppm_ = isPPM(item);
  const wo = item as WorkOrder;
  const ppm = item as PPMSchedule;
  const [localStatus, setLocalStatus] = useState(item.status);
  const [updating, setUpdating] = useState(false);
  const [checks, setChecks] = useState([true, true, true, false, false]);
  const checkItems = ["Filter condition checked", "Coil visual inspection", "Refrigerant pressure logged", "Belt tension verified", "Drain pan cleaned"];
  const pc = wo.actual_priority ? PRIORITY_CFG[wo.actual_priority] : null;
  const statusFlow = ppm_ ? ["Scheduled", "In Progress", "Completed", "Overdue"] : ["Open", "In Progress", "Completed", "Closed"];

  async function changeStatus(s: string) {
    if (s === localStatus) return;
    setUpdating(true);
    try { await frappeUpdate(ppm_ ? "PPM Schedule" : "Work Orders", item.name, { status: s }); setLocalStatus(s); onStatusChange(); }
    catch { /* silent */ }
    finally { setUpdating(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl fade-in">
        {/* header */}
        <div className="px-7 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                <span className="text-sm font-bold text-primary font-mono">{ppm_ ? ppm.pm_id : (wo.wo_number || wo.name)}</span>
                {pc && <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${pc.bg} ${pc.text}`}>{pc.label}</span>}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLS[localStatus] || "bg-muted text-muted-foreground"}`}>{localStatus}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{itemTitle(item)}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {(ppm_ ? ppm.property_name : wo.property_name) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{ppm_ ? ppm.property_name : wo.property_name}</span>}
                {itemTime(item) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Scheduled: {itemTime(item)}</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          {/* status bar */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Status <span className="italic">(Click to Update)</span></p>
            <div className="flex items-center gap-2">
              {updating ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />Updating…</div>
                : statusFlow.map(s => (
                  <button key={s} onClick={() => changeStatus(s)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${localStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    {s}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="px-7 py-5 grid grid-cols-2 gap-8">
          {/* LEFT */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Description</p>
            <div className="bg-muted/40 rounded-lg p-3 text-sm text-foreground leading-relaxed mb-5 min-h-[60px]">
              {(ppm_ ? ppm.notes : wo.work_done_notes) || "No description provided."}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{ppm_ ? "Next Due" : "Scheduled"}</p>
                <p className="text-sm font-semibold text-foreground">{formatDate(itemDate(item))}</p>
              </div>
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Assignee</p>
                <p className="text-sm font-semibold text-foreground">{itemTechName(item) || "Unassigned"}</p>
              </div>
            </div>
            {ppm_ ? (
              <div className="space-y-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">PPM Details</p>
                {([["PM Type", ppm.pm_type], ["Frequency", ppm.frequency], ["Asset", ppm.asset_name || ppm.asset_code], ["Category", ppm.asset_category], ["Service Group", ppm.service_group], ["Checklist", ppm.checklist_reference], ["Duration", ppm.planned_duration_hrs ? `${ppm.planned_duration_hrs} hrs` : "—"], ["Est. Spares", ppm.estimated_spares ? `OMR ${ppm.estimated_spares.toLocaleString()}` : "—"], ["Contract", ppm.contract_code], ["Client", ppm.client_name || ppm.client_code], ["Last Done", formatDate(ppm.last_done_date)], ["Overdue By", ppm.overdue_by_days ? `${ppm.overdue_by_days} days` : "—"], ["Generated WO", ppm.ppm_wo_number || "—"]] as [string, string | undefined][]).map(([l, v]) => (
                  <div key={l} className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
                    <span className="text-muted-foreground text-xs font-medium w-28 shrink-0">{l}</span>
                    <span className={`font-medium text-right text-sm ${l === "Overdue By" && ppm.overdue_by_days ? "text-red-500" : "text-foreground"}`}>{v || "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Activity Timeline</p>
                {[{ t: "09:00", l: "Request raised — SLA clock started", c: "border-gray-400" }, { t: "10:00", l: `First response by ${wo.assigned_technician || "Technician"}`, c: "border-emerald-500" }, { t: "11:00", l: `Work Order: ${wo.wo_number || wo.name}`, c: "border-violet-500" }, { t: "12:00", l: "On-site assessment — work started", c: "border-amber-500" }].map((ev, i, arr) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full border-2 ${ev.c} bg-card mt-0.5 shrink-0`} />
                      {i < arr.length - 1 && <div className="w-px h-7 bg-border" />}
                    </div>
                    <div className="pb-3"><p className="text-[11px] text-muted-foreground">Today {ev.t}</p><p className="text-xs text-foreground">{ev.l}</p></div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* RIGHT */}
          <div>
            {!ppm_ && (
              <>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">SLA Metrics</p>
                {/* Response */}
                <div className={`border rounded-xl p-4 mb-3 ${wo.response_sla_breach ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">First Response</p>
                  <div className="flex items-center gap-2 mb-3">
                    {wo.response_sla_breach ? <><XCircle className="w-5 h-5 text-red-500" /><span className="font-bold text-red-600">Breach</span></> : <><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="font-bold text-emerald-600">Fulfilled</span></>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[["Target", formatDate(wo.response_sla_target)], ["Actual", formatDate(wo.response_sla_actual) || "Pending"]].map(([l, v]) => (
                      <div key={l} className="bg-white rounded-lg p-2.5 border border-border"><p className="text-[10px] text-muted-foreground uppercase mb-1">{l}</p><p className="text-sm font-bold text-foreground">{v}</p></div>
                    ))}
                  </div>
                </div>
                {/* Resolution */}
                <div className={`border rounded-xl p-4 mb-3 ${wo.resolution_sla_breach ? "border-red-200 bg-red-50" : "border-border bg-muted/30"}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Resolution</p>
                  <div className="flex items-center gap-2 mb-3">
                    {wo.resolution_sla_breach ? <><XCircle className="w-5 h-5 text-red-500" /><span className="font-bold text-red-600">Breach</span></> : <><CheckCircle2 className="w-5 h-5 text-emerald-500" /><span className="font-bold text-emerald-600">Fulfilled</span></>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[["Target", formatDate(wo.resolution_sla_target)], ["Actual", formatDate(wo.resolution_sla_actual) || "Pending"]].map(([l, v]) => (
                      <div key={l} className="bg-white rounded-lg p-2.5 border border-border"><p className="text-[10px] text-muted-foreground uppercase mb-1">{l}</p><p className="text-sm font-bold text-foreground">{v}</p></div>
                    ))}
                  </div>
                  {wo.resolution_sla_breach && <span className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-100 rounded-full px-2.5 py-0.5 w-fit"><AlertTriangle className="w-3 h-3" />Overdue</span>}
                </div>
                {/* Score */}
                <div className="bg-muted/50 border border-border rounded-xl p-4 mb-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">SLA Score</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><p className="text-xl font-bold text-foreground">{wo.response_sla_breach ? 0 : 1}</p><p className="text-[10px] text-muted-foreground">Response</p></div>
                    <div><p className="text-xl font-bold text-foreground">{wo.resolution_sla_breach ? 0 : 1}</p><p className="text-[10px] text-muted-foreground">Resolution</p></div>
                    <div><p className={`text-xl font-bold ${!wo.response_sla_breach && !wo.resolution_sla_breach ? "text-emerald-600" : wo.response_sla_breach && wo.resolution_sla_breach ? "text-red-500" : "text-amber-600"}`}>
                      {!wo.response_sla_breach && !wo.resolution_sla_breach ? "100%" : wo.response_sla_breach && wo.resolution_sla_breach ? "0%" : "50%"}
                    </p><p className="text-[10px] text-muted-foreground">Score</p></div>
                  </div>
                </div>
              </>
            )}
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Checklist Items</p>
            <div className="bg-muted/30 border border-border rounded-xl p-3 flex flex-col gap-2">
              {checkItems.map((ci, i) => (
                <button key={i} onClick={() => setChecks(c => c.map((v, j) => j === i ? !v : v))} className="flex items-center gap-2 text-left w-full hover:bg-muted/50 rounded-lg px-1 py-0.5 transition-colors">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checks[i] ? "bg-primary border-primary" : "border-border"}`}>
                    {checks[i] && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <span className={`text-xs ${checks[i] ? "line-through text-muted-foreground" : "text-foreground"}`}>{ci}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   GANTT WEEK VIEW
═══════════════════════════════════════════ */
function GanttView({ resources, items, weekAnchor, onItemClick }: { resources: Resource[]; items: ScheduleItem[]; weekAnchor: Date; onItemClick: (it: ScheduleItem) => void }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekAnchor, i));
  const grid: Record<string, Record<string, ScheduleItem[]>> = {};
  items.forEach(it => { const tk = itemTechKey(it) || "__unassigned"; const dk = itemDate(it); if (!grid[tk]) grid[tk] = {}; if (!grid[tk][dk]) grid[tk][dk] = []; grid[tk][dk].push(it); });

  function cellHours(tk: string, dk: string, cap: number) {
    const its = grid[tk]?.[dk] || [];
    const used = its.reduce((s, it) => { const h = (it as PPMSchedule).planned_duration_hrs || ((it as WorkOrder).planned_duration_min ? (it as WorkOrder).planned_duration_min! / 60 : 1.5); return s + h; }, 0);
    return { used, pct: Math.min(100, Math.round((used / cap) * 100)), over: used > cap };
  }

  return (
    <div className="overflow-auto flex-1">
      <table className="w-full border-collapse" style={{ minWidth: "1100px" }}>
        <thead className="sticky top-0 z-20 bg-card">
          <tr className="border-b border-border">
            <th className="w-[190px] min-w-[190px] px-4 py-3 text-left border-r border-border">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Technician / Capacity</span>
            </th>
            {days.map((day, i) => (
              <th key={i} className={`px-3 py-3 text-center border-r border-border min-w-[155px] ${isToday(day) ? "bg-primary/5" : ""}`}>
                <p className={`text-sm font-bold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                  {DAY_LABELS[i]}{" "}
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday(day) ? "bg-primary text-primary-foreground" : ""}`}>{day.getDate()}</span>{" "}
                  {day.toLocaleDateString("en-GB", { month: "short" })}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((res, ri) => {
            const p = pal(ri);
            const cap = 8; // Default capacity since field doesn't exist in Resource doctype
            return (
              <tr key={res.name} className="border-b border-border">
                <td className="w-[190px] min-w-[190px] border-r border-border bg-card align-top p-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Avatar name={res.resource_name} size="md" ci={ri} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{res.resource_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{res.designation || "Technician"} · {cap}h/day</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${res.is_active === false ? "bg-amber-500" : "bg-emerald-500"}`} />
                    <span className="text-[11px] text-muted-foreground">{res.is_active === false ? "Inactive" : "Available"}</span>
                  </div>
                </td>
                {days.map((day, di) => {
                  const dk = dateKey(day);
                  const { used, pct, over } = cellHours(res.name, dk, cap);
                  const dayItems = grid[res.name]?.[dk] || [];
                  return (
                    <td key={di} className={`align-top border-r border-border p-0 ${isToday(day) ? "bg-primary/3" : "bg-background"}`}>
                      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50">
                        <span className={`text-[10px] font-semibold ${over ? "text-red-500" : "text-muted-foreground"}`}>{used.toFixed(1)}/{cap}h</span>
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden mx-1">
                          <div className={`h-full rounded-full transition-all ${over ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-[10px] font-semibold ${over ? "text-red-500" : "text-muted-foreground"}`}>{pct}%{over && " ▲"}</span>
                      </div>
                      <div className="p-1.5 min-h-[72px]">
                        {dayItems.length === 0 && <div className="h-14 rounded-lg border border-dashed border-border/50 flex items-center justify-center"><span className="text-[10px] text-muted-foreground/40">Drop here</span></div>}
                        {dayItems.map((it, idx) => (
                          <button key={idx} onClick={() => onItemClick(it)}
                            className={`w-full text-left rounded-lg p-2 mb-1 last:mb-0 ${p.card} hover:opacity-90 transition-opacity shadow-sm`}>
                            {itemTime(it) && <p className="text-[10px] font-bold opacity-80">{itemTime(it)}</p>}
                            <p className="text-[11px] font-bold leading-tight">{(it as PPMSchedule).pm_id || (it as WorkOrder).wo_number || it.name}</p>
                            <p className="text-[11px] opacity-90 truncate leading-tight">{itemTitle(it)}</p>
                          </button>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {grid["__unassigned"] && (
            <tr className="border-b border-border bg-muted/20">
              <td className="border-r border-border p-3 align-top"><p className="text-xs font-bold text-muted-foreground">Unassigned</p></td>
              {days.map((day, di) => {
                const dk = dateKey(day);
                const its = grid["__unassigned"]?.[dk] || [];
                return <td key={di} className="border-r border-border p-1.5 align-top">{its.map((it, idx) => (
                  <button key={idx} onClick={() => onItemClick(it)} className="w-full text-left rounded-lg p-2 mb-1 bg-amber-100 border border-amber-200 hover:bg-amber-200 transition-colors">
                    <p className="text-[11px] font-semibold text-amber-800 truncate">{itemTitle(it)}</p>
                  </button>
                ))}</td>;
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MONTH CALENDAR VIEW
═══════════════════════════════════════════ */
function MonthView({ items, anchor, onItemClick }: { items: ScheduleItem[]; anchor: Date; onItemClick: (it: ScheduleItem) => void }) {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const year = anchor.getFullYear(); const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0);
  let gs = new Date(firstDay); const dow = gs.getDay(); gs.setDate(gs.getDate() - (dow === 0 ? 6 : dow - 1));
  const cells: Date[] = []; let cur = new Date(gs);
  while (cur <= lastDay || cells.length % 7 !== 0) { cells.push(new Date(cur)); cur.setDate(cur.getDate() + 1); if (cells.length > 42) break; }
  const byDay: Record<string, ScheduleItem[]> = {};
  items.forEach(it => { const dk = itemDate(it); if (!byDay[dk]) byDay[dk] = []; byDay[dk].push(it); });
  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-border bg-card sticky top-0 z-10">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => <div key={d} className="py-2 text-center text-xs font-bold text-muted-foreground border-r last:border-r-0 border-border">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dk = dateKey(day); const its = byDay[dk] || []; const inMonth = day.getMonth() === month; const tod = isToday(day);
          const isExpanded = expandedDay === dk;
          const vis = isExpanded ? its : its.slice(0, 2); const over = its.length - 2;
          return (
            <div key={idx} className={`min-h-[110px] border-b border-r border-border last:border-r-0 p-1.5 ${!inMonth ? "bg-muted/20" : "bg-background"} ${tod ? "bg-primary/3" : ""}`}>
              <div className="mb-1">
                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold ${tod ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>{day.getDate()}</span>
              </div>
              {vis.map((it, i) => (
                <button key={i} onClick={() => onItemClick(it)} className={`w-full text-left rounded px-2 py-0.5 mb-0.5 text-[11px] font-semibold truncate ${catCls(it)} hover:opacity-80 transition-opacity`}>
                  {itemTime(it) && <span className="mr-1 opacity-80">{itemTime(it)}</span>}{itemTitle(it)}
                </button>
              ))}
              {over > 0 && !isExpanded && <p onClick={(e) => { e.stopPropagation(); setExpandedDay(dk); }} className="text-[11px] text-primary font-semibold pl-1 cursor-pointer hover:underline">+{over} more</p>}
              {isExpanded && over > 0 && <p onClick={(e) => { e.stopPropagation(); setExpandedDay(null); }} className="text-[11px] text-muted-foreground font-semibold pl-1 cursor-pointer hover:underline">Show less</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AGENDA VIEW
═══════════════════════════════════════════ */
function AgendaView({ items, onItemClick }: { items: ScheduleItem[]; onItemClick: (it: ScheduleItem) => void }) {
  const sorted = [...items].sort((a, b) => itemDate(a).localeCompare(itemDate(b)));
  const groups: Record<string, ScheduleItem[]> = {};
  sorted.forEach(it => { const dk = itemDate(it) || "No Date"; if (!groups[dk]) groups[dk] = []; groups[dk].push(it); });
  return (
    <div className="flex-1 overflow-auto px-5 py-4">
      {Object.entries(groups).map(([dk, its]) => (
        <div key={dk} className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex flex-col items-center w-12 shrink-0">
              <span className="text-xs font-bold text-muted-foreground uppercase">{dk !== "No Date" ? new Date(dk).toLocaleDateString("en-GB", { month: "short" }) : "—"}</span>
              <span className={`text-2xl font-bold leading-tight ${isToday(new Date(dk)) ? "text-primary" : "text-foreground"}`}>{dk !== "No Date" ? new Date(dk).getDate() : "?"}</span>
              <span className="text-[10px] text-muted-foreground">{dk !== "No Date" ? new Date(dk).toLocaleDateString("en-GB", { weekday: "short" }) : ""}</span>
            </div>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="ml-15 flex flex-col gap-2">
            {its.map((it, i) => (
              <button key={i} onClick={() => onItemClick(it)} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors group">
                <span className={`w-1 h-10 rounded-full ${catDot(it)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground truncate">{itemTitle(it)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CLS[it.status] || "bg-muted text-muted-foreground"}`}>{it.status}</span>
                    {(it as WorkOrder).actual_priority && PRIORITY_CFG[(it as WorkOrder).actual_priority!] && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIORITY_CFG[(it as WorkOrder).actual_priority!].bg} ${PRIORITY_CFG[(it as WorkOrder).actual_priority!].text}`}>
                        {PRIORITY_CFG[(it as WorkOrder).actual_priority!].label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {itemTime(it) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{itemTime(it)}</span>}
                    {(isPPM(it) ? it.property_name : (it as WorkOrder).property_name) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{isPPM(it) ? it.property_name : (it as WorkOrder).property_name}</span>}
                    {itemTechName(it) && <span className="flex items-center gap-1"><User className="w-3 h-3" />{itemTechName(it)}</span>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      ))}
      {sorted.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2"><Calendar className="w-10 h-10" /><p className="text-sm">No scheduled items</p></div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   UNASSIGNED REQUESTS PANEL
═══════════════════════════════════════════ */
function UnassignedPanel({ requests, resources, onAssign, onRequestClick, height, setHeight, onResizeStart }: {
  requests: ServiceRequest[];
  resources: Resource[];
  onAssign: (srName: string, tech: string) => void;
  onRequestClick: (sr: ServiceRequest) => void;
  height: number;
  setHeight: (h: number) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}) {
  const [target, setTarget] = useState<string | null>(null);
  const [techMap, setTechMap] = useState<Record<string, string>>({});
  if (requests.length === 0) return null;
  const PDOT: Record<string, string> = { "P1 - Critical": "bg-red-500", "P2 - High": "bg-orange-500", "P3 - Medium": "bg-blue-500", "P4 - Low": "bg-gray-400" };
  const isMinimized = height <= 45;

  return (
    <div className="border-t border-border bg-card shrink-0 relative flex flex-col" style={{ height: `${height}px`, minHeight: '45px', transition: 'height 0.1s ease-out' }}>
      {/* RESIZE HANDLE */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize hover:bg-primary/40 transition-colors z-10"
        title="Drag to resize"
      />

      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm font-bold text-foreground">Un-Assigned Requests</span>
          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">{requests.length} pending</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground italic hidden sm:inline">Click Assign to dispatch to a technician</span>
          <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
            <button onClick={() => setHeight(45)} className={`p-1.5 hover:bg-muted transition-colors ${height <= 45 ? "bg-muted text-primary" : "text-muted-foreground"}`} title="Minimize"><Minimize2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => setHeight(240)} className={`p-1.5 border-x border-border hover:bg-muted transition-colors ${height > 45 && height < 500 ? "bg-muted text-primary" : "text-muted-foreground"}`} title="Standard"><ChevronUp className="w-3.5 h-3.5" /></button>
            <button onClick={() => setHeight(600)} className={`p-1.5 hover:bg-muted transition-colors ${height >= 500 ? "bg-muted text-primary" : "text-muted-foreground"}`} title="Maximize"><Maximize2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border bg-muted/30">{["Request No", "Category", "Building", "Contact", "Priority", "Due Date", "Created", "Status", "Action"].map(h => <th key={h} className="px-4 py-2 text-left font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {requests.map((sr, i) => {
                const urg = sr.priority_actual === "P1 - Critical";
                const dot = PDOT[sr.priority_actual || ""] || "bg-gray-400";
                return (
                  <tr key={sr.name} className={`border-b border-border hover:bg-muted/30 transition-colors ${i === requests.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-4 py-2.5 font-semibold text-primary cursor-pointer hover:underline" onClick={() => onRequestClick(sr)}>{sr.name}</td>
                    <td className="px-4 py-2.5 text-foreground">{sr.fault_category || "—"}</td>
                    <td className="px-4 py-2.5 text-foreground">{sr.property_name || sr.property_code || "—"}</td>
                    <td className="px-4 py-2.5 text-foreground">{sr.reported_by || "—"}</td>
                    <td className="px-4 py-2.5"><span className={`w-7 h-7 rounded-full ${dot} flex items-center justify-center text-white font-bold text-[10px]`}>{sr.priority_actual?.split(" - ")[0] || "?"}</span></td>
                    <td className={`px-4 py-2.5 font-semibold ${urg ? "text-red-500" : "text-foreground"}`}>
                      {sr.appointment_date ? formatDate(sr.appointment_date) : (sr.raised_date ? formatDate(sr.raised_date) : "—")}
                      {sr.appointment_date && isToday(new Date(sr.appointment_date)) && <span className="text-primary ml-1.5 font-bold"> — TODAY</span>}
                      {!sr.appointment_date && sr.raised_date && isToday(new Date(sr.raised_date)) && <span className="text-primary ml-1.5 font-bold"> — TODAY</span>}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{sr.raised_date ? `${formatDate(sr.raised_date)} ${sr.raised_time || ""}` : ""}</td>
                    <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${urg ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`}>{sr.status || "Unassigned"}</span></td>
                    <td className="px-4 py-2.5">
                      {target === sr.name ? (
                        <div className="flex items-center gap-1.5">
                          <select value={techMap[sr.name] || ""} onChange={e => setTechMap(p => ({ ...p, [sr.name]: e.target.value }))} className="border border-border rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="">Select…</option>
                            {resources.map(r => <option key={r.name} value={r.name}>{r.resource_name}</option>)}
                          </select>
                          <button disabled={!techMap[sr.name]} onClick={() => { onAssign(sr.name, techMap[sr.name]); setTarget(null); }} className="px-2.5 py-1 rounded bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors">OK</button>
                          <button onClick={() => setTarget(null)} className="p-1 hover:bg-muted rounded transition-colors"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        </div>
                      ) : (
                        <button onClick={() => setTarget(sr.name)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${urg ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"}`}>
                          {urg ? "Assign NOW" : "Assign →"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CATEGORY LEGEND
═══════════════════════════════════════════ */
const LEGEND_ITEMS = [
  ["Cleaning Requests", "bg-[#06b6d4]"], ["Maintenance", "bg-[#22c55e]"], ["Inspections", "bg-[#f97316]"],
  ["Security", "bg-[#ec4899]"], ["Preventive Maintenance", "bg-[#6366f1]"], ["IT Requests", "bg-[#8b5cf6]"],
  ["Landscaping", "bg-[#84cc16]"], ["Pest Control", "bg-[#ef4444]"], ["Schedule Requests", "bg-[#f59e0b]"],
];

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
type ViewType = "Gantt" | "Month" | "Agenda";
const MODE_OPTIONS = ["Job Requests", "Call Tasks", "Both"] as const;
type ModeType = typeof MODE_OPTIONS[number];
const FALLBACK_RESOURCES: Resource[] = [
  { name: "r1", resource_name: "Raj Mehta", designation: "HVAC Tech", is_active: true },
  { name: "r2", resource_name: "Sunita Rao", designation: "Plumbing", is_active: true },
  { name: "r3", resource_name: "Arjun Nair", designation: "Electrical", is_active: true },
  { name: "r4", resource_name: "Priya Shah", designation: "Security / IT", is_active: true, branch_name: "South Mumbai" },
  { name: "r5", resource_name: "Mohammed Ali", designation: "Soft Services", is_active: true, branch_name: "Vihar" },
];

/* ═══════════════════════════════════════════
   FILTER COMPONENTS
═══════════════════════════════════════════ */
function FilterDropdown({ label, icon: Icon, value, defaultLabel, options, onChange }: { label: string, icon?: any, value: string, defaultLabel: string, options: string[], onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const active = value !== defaultLabel;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all duration-200 rounded-lg text-xs font-medium ${active ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border text-foreground hover:bg-muted hover:border-border/80"}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="truncate max-w-[120px]">{active ? value : label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] z-50 p-1.5 fade-in ring-1 ring-black/5">
          <button onClick={() => { onChange(defaultLabel); setOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors flex items-center justify-between ${!active ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-foreground hover:bg-muted font-medium'}`}>
            {defaultLabel}
            {!active && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
          </button>
          {options.length > 0 && <div className="h-px bg-border/60 my-1.5 mx-2" />}
          {options.map(opt => (
            <button key={opt} title={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-left px-3 py-2.5 text-xs rounded-lg transition-colors flex items-center justify-between group ${value === opt ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-foreground hover:bg-muted font-medium'}`}>
              <span className="truncate pr-2">{opt}</span>
              {value === opt && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
            </button>
          ))}
          {options.length === 0 && <div className="px-3 py-3 text-xs text-muted-foreground text-center italic">No options found</div>}
        </div>
      )}
    </div>
  );
}

export default function Scheduler() {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewType>("Gantt");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [mode, setMode] = useState<ModeType>("Job Requests");
  const [selected, setSelected] = useState<ScheduleItem | null>(null);
  const [search, setSearch] = useState("");

  const [shiftFilt, setShiftFilt] = useState("All Shifts");
  const [resFilt, setResFilt] = useState("All Resources");
  const [branchFilt, setBranchFilt] = useState("All Branches");
  const [propFilt, setPropFilt] = useState("All Properties");
  const [advFilt, setAdvFilt] = useState<{ status: string, priority: string, category: string }>({ status: "All", priority: "All", category: "All" });
  const [advOpen, setAdvOpen] = useState(false);
  const advRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (advRef.current && !advRef.current.contains(e.target as Node)) setAdvOpen(false);
    }
    if (advOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [advOpen]);

  const wkStart = getWeekStart(anchor);
  const wkEnd = addDays(wkStart, 6);
  const mStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const mEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const rs = dateKey(view === "Gantt" ? wkStart : mStart);
  const re = dateKey(view === "Gantt" ? wkEnd : mEnd);

  const [panelHeight, setPanelHeight] = useState(240);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 45 && newHeight < window.innerHeight * 0.8) {
        setPanelHeight(newHeight);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const { data: resources, loading: rL, error: rE, refetch: rR } = useFetch<Resource>("Resource", ["name", "resource_name", "designation", "is_active", "branch_code", "branch_name"], [], []);
  const { data: ppms, loading: pL, refetch: pR } = useFetch<PPMSchedule>("PPM Schedule",
    ["name", "pm_id", "pm_title", "pm_type", "frequency", "status", "asset_code", "asset_name", "asset_category", "service_group", "property_code", "property_name", "zone_code", "sub_zone_code", "client_code", "client_name", "contract_code", "contract_group", "last_done_date", "next_due_date", "overdue_by_days", "assigned_to", "assigned_technician", "ppm_wo_number", "planned_duration_hrs", "estimated_spares", "checklist_reference", "notes"],
    [["next_due_date", "between", [rs, re] as unknown as string]], [rs, re]);
  const { data: workOrders, loading: wL, refetch: wR } = useFetch<WorkOrder>("Work Orders",
    ["name", "wo_number", "wo_title", "wo_type", "status", "actual_priority", "assigned_to", "assigned_technician", "schedule_start_date", "schedule_start_time", "schedule_end_time", "planned_duration_min", "branch_code", "branch_name", "property_code", "property_name", "asset_code", "asset_name", "service_group", "fault_category", "client_code", "client_name", "response_sla_target", "response_sla_actual", "response_sla_breach", "resolution_sla_target", "resolution_sla_actual", "resolution_sla_breach", "work_done_notes"],
    [["schedule_start_date", "between", [rs, re] as unknown as string]], [rs, re]);
  const { data: unassignedSRs, refetch: sR } = useFetch<ServiceRequest>("Service Request",
    ["name", "sr_title", "fault_category", "branch_code", "branch_name", "property_name", "property_code", "reported_by", "priority_actual", "raised_date", "raised_time", "status", "appointment_date", "priority_default", "client_code", "client_name", "contract_code", "contract_group", "zone_code", "sub_zone_code", "base_unit_code", "asset_code", "service_group", "fault_code", "reporting_level", "business_type", "approval_criticality", "work_description", "response_sla_target", "resolution_sla_target", "location_full_path", "wo_source"],
    [["status", "=", "Open"], ["converted_to_wo", "=", 0]], []);

  const refetchAll = () => { pR(); wR(); sR(); rR(); };

  const isLoading = pL || wL || rL;
  const res = resources.length > 0 ? resources : FALLBACK_RESOURCES;

  const allItems: ScheduleItem[] = mode === "Job Requests" ? (workOrders as ScheduleItem[]) : mode === "Call Tasks" ? (ppms as ScheduleItem[]) : [...(workOrders as ScheduleItem[]), ...(ppms as ScheduleItem[])];

  const standardPriorities = ["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"];
  const uniqueBranches = (Array.from(new Set(allItems.map(it => (isPPM(it) ? it.branch_name : (it as WorkOrder).branch_name)).filter(Boolean))) as string[]).sort();
  const uniqueProps = (Array.from(new Set(allItems.map(it => (isPPM(it) ? it.property_name : (it as WorkOrder).property_name)).filter(Boolean))) as string[]).sort();
  const uniqueRes = (Array.from(new Set(res.map(r => r.resource_name).filter(Boolean))) as string[]).sort();
  const uniqueStatuses = (Array.from(new Set(allItems.map(it => it.status).filter(Boolean))) as string[]).sort();
  const uniquePriorities = (Array.from(new Set([...standardPriorities, ...workOrders.map(w => w.actual_priority).filter(Boolean)])) as string[]).sort();
  const baseCategories = ["Electrical", "Plumbing", "HVAC", "Civil", "Cleaning", "Security"];
  const dynamicCategories = allItems.map(it => (isPPM(it) ? it.asset_category : (it as WorkOrder).fault_category)).filter(Boolean) as string[];
  const uniqueCategories = (Array.from(new Set(dynamicCategories.length > 0 ? dynamicCategories : baseCategories)) as string[]).sort();
  const SHIFTS = ["Morning Shift (6AM-12PM)", "General Shift (9AM-6PM)", "Evening Shift (6PM-10PM)", "Night Shift (10PM-6AM)"];

  const filtered = allItems.filter(it => {
    if (search) {
      const q = search.toLowerCase();
      if (!itemTitle(it).toLowerCase().includes(q) && !itemTechName(it).toLowerCase().includes(q) && !((isPPM(it) ? it.property_name : (it as WorkOrder).property_name) || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    if (branchFilt !== "All Branches") {
      const b = isPPM(it) ? it.branch_name : (it as WorkOrder).branch_name;
      if (b !== branchFilt) return false;
    }
    if (resFilt !== "All Resources" && itemTechName(it) !== resFilt) return false;
    if (propFilt !== "All Properties") {
      const p = isPPM(it) ? it.property_name : (it as WorkOrder).property_name;
      if (p !== propFilt) return false;
    }
    if (shiftFilt !== "All Shifts") {
      const t = itemTime(it);
      if (t) {
        const hour = parseInt(t.split(':')[0], 10);
        if (shiftFilt.includes("Morning") && !(hour >= 6 && hour < 12)) return false;
        if (shiftFilt.includes("General") && !(hour >= 9 && hour < 18)) return false;
        if (shiftFilt.includes("Evening") && !(hour >= 18 && hour < 22)) return false;
        if (shiftFilt.includes("Night") && !(hour >= 22 || hour < 6)) return false;
      } else { return false; }
    }
    if (advFilt.status !== "All" && it.status !== advFilt.status) return false;
    if (advFilt.priority !== "All" && (it as WorkOrder).actual_priority !== advFilt.priority) return false;
    if (advFilt.category !== "All") {
      const cat = isPPM(it) ? it.asset_category : (it as WorkOrder).fault_category;
      if (cat !== advFilt.category) return false;
    }
    return true;
  });

  const filteredResources = res.filter(r => {
    if (branchFilt !== "All Branches" && r.branch_name !== branchFilt) return false;
    if (resFilt !== "All Resources" && r.resource_name !== resFilt) return false;
    return true;
  });

  function nav(dir: -1 | 1) {
    if (view === "Gantt") setAnchor(addDays(anchor, dir * 7));
    else setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
  }
  const navLabel = view === "Gantt" ? `Week of ${fmtShort(wkStart)}–${fmtShort(wkEnd)} ${wkStart.getFullYear()}` : `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`;

  async function handleAssign(srName: string, tech: string) {
    const sr = unassignedSRs.find(x => x.name === srName);
    if (!sr) return;

    try {
      const woNumber = generateID("WO");
      const woPayload = {
        wo_number: woNumber,
        wo_title: sr.sr_title,
        wo_type: "Reactive Maintenance",
        wo_source: "Service Request",
        status: "Open",
        actual_priority: sr.priority_actual,
        default_priority: sr.priority_default,
        client_code: sr.client_code,
        client_name: sr.client_name,
        contract_code: sr.contract_code,
        contract_group: sr.contract_group,
        property_code: sr.property_code,
        property_name: sr.property_name,
        zone_code: sr.zone_code,
        sub_zone_code: sr.sub_zone_code,
        base_unit_code: sr.base_unit_code,
        asset_code: sr.asset_code,
        service_group: sr.service_group,
        fault_category: sr.fault_category,
        fault_code: sr.fault_code,
        reporting_level: sr.reporting_level,
        business_type: sr.business_type,
        approval_criticality: sr.approval_criticality,
        sr_number: sr.name,
        location_full_path: sr.location_full_path,
        work_done_notes: sr.work_description,
        assigned_to: tech,
        schedule_start_date: sr.appointment_date || new Date().toISOString().split("T")[0],
        schedule_start_time: new Date().toTimeString().slice(0, 5),
        ...(sr.response_sla_target && { response_sla_target: sr.response_sla_target }),
        ...(sr.resolution_sla_target && { resolution_sla_target: sr.resolution_sla_target }),
      };

      await frappeCreate("Work Orders", woPayload);
      await frappeUpdate("Service Request", srName, {
        converted_to_wo: 1,
        status: "Converted",
        // Force a valid wo_source if the current one is "Email" or invalid to bypass broken validation
        ...((sr.wo_source === "Email" || !["Service Request", "PM Schedule", "Project", "Helpdesk", "Portal", "Phone", "Inspection", "Manual"].includes(sr.wo_source || "")) && { wo_source: "Service Request" })
      });

      sR(); // Refresh unassigned requests
      refetchAll(); // Refresh all data including main views
    } catch (e: unknown) {
      console.error("Assignment failed:", e);
      alert(`Assignment failed: ${(e as Error).message}`);
    }
  }

  function handleRequestClick(sr: ServiceRequest) {
    // Navigate to Requests page with the specific request name as parameter
    navigate(`/requests?request=${encodeURIComponent(sr.name)}`);
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Technician Scheduler</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {view === "Gantt" ? "Gantt dispatch view" : view === "Month" ? "Monthly calendar view" : "Agenda view"} · {navLabel}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search WOs, assets, technicians…"
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <button onClick={refetchAll} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Request
          </button>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors"><Bell className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-card shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={() => setAnchor(new Date())} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">Today</button>
          <button onClick={() => nav(1)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
          <span className="text-sm font-bold text-foreground">{navLabel}</span>
          <div className="flex bg-muted rounded-lg overflow-hidden border border-border">
            {MODE_OPTIONS.map(v => (
              <button key={v} onClick={() => setMode(v)} className={`px-4 py-1.5 text-xs font-semibold transition-colors ${mode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            {([{ id: "Gantt" as ViewType, icon: <LayoutGrid className="w-4 h-4" />, label: "Gantt" }, { id: "Month" as ViewType, icon: <Calendar className="w-4 h-4" />, label: "Month" }, { id: "Agenda" as ViewType, icon: <List className="w-4 h-4" />, label: "Agenda" }]).map(({ id, icon, label }) => (
              <button key={id} onClick={() => setView(id)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>{icon} {label}</button>
            ))}
          </div>
          <FilterDropdown label="General Shift" icon={Clock} value={shiftFilt} defaultLabel="All Shifts" options={SHIFTS} onChange={setShiftFilt} />
          <FilterDropdown label="All Resources" icon={User} value={resFilt} defaultLabel="All Resources" options={uniqueRes} onChange={setResFilt} />
          <FilterDropdown label="All Branches" icon={Building2} value={branchFilt} defaultLabel="All Branches" options={uniqueBranches} onChange={setBranchFilt} />
          <FilterDropdown label="All Properties" icon={MapPin} value={propFilt} defaultLabel="All Properties" options={uniqueProps} onChange={setPropFilt} />

          <div className="relative" ref={advRef}>
            <button onClick={() => setAdvOpen(!advOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 border transition-all duration-200 rounded-lg text-xs font-medium ${(advFilt.status !== 'All' || advFilt.priority !== 'All' || advFilt.category !== 'All') ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border text-foreground hover:bg-muted hover:border-border/80"}`}><Filter className="w-3.5 h-3.5" />More Filters</button>
            {advOpen && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-card/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-[0_15px_50px_-12px_rgba(0,0,0,0.25)] z-50 p-5 fade-in ring-1 ring-black/5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Filter className="w-4 h-4 text-primary" /> Advanced Filters</h3>
                  <button onClick={() => {
                    setAdvFilt({ status: "All", priority: "All", category: "All" });
                    setShiftFilt("All Shifts");
                    setResFilt("All Resources");
                    setBranchFilt("All Branches");
                    setPropFilt("All Properties");
                    setSearch("");
                  }} className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground hover:text-primary transition-colors bg-muted hover:bg-primary/10 px-2 py-1 rounded">Reset All</button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Status</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["All", ...uniqueStatuses].map(s => (
                        <button key={s} onClick={() => setAdvFilt(p => ({ ...p, status: s }))} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${advFilt.status === s ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'bg-muted/50 border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{s}</button>
                      ))}
                      {uniqueStatuses.length === 0 && <span className="text-xs text-muted-foreground italic">No statuses found</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Priority</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["All", ...uniquePriorities].map(p => (
                        <button key={p} onClick={() => setAdvFilt(prev => ({ ...prev, priority: p }))} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${advFilt.priority === p ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'bg-muted/50 border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{p.split(" - ")[0]}</button>
                      ))}
                      {uniquePriorities.length === 0 && <span className="text-xs text-muted-foreground italic">No priorities found</span>}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Category</label>
                    <div className="flex flex-wrap gap-1.5">
                      {["All", ...uniqueCategories].map(c => (
                        <button key={c} onClick={() => setAdvFilt(prev => ({ ...prev, category: c }))} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${advFilt.category === c ? 'bg-primary text-primary-foreground shadow-md scale-105' : 'bg-muted/50 border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{c}</button>
                      ))}
                      {uniqueCategories.length === 0 && <span className="text-xs text-muted-foreground italic">No categories found</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex items-center gap-4 px-5 py-2 border-b border-border bg-card flex-wrap shrink-0">
        {LEGEND_ITEMS.map(([label, dot]) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />{label}
          </span>
        ))}
      </div>

      {rE && <ErrMsg msg={rE} />}
      {isLoading && filtered.length === 0 && <Spin />}

      {/* MAIN VIEW */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "Gantt" && <GanttView resources={filteredResources} items={filtered} weekAnchor={wkStart} onItemClick={setSelected} />}
        {view === "Month" && <MonthView items={filtered} anchor={anchor} onItemClick={setSelected} />}
        {view === "Agenda" && <AgendaView items={filtered} onItemClick={setSelected} />}
      </div>

      {/* UNASSIGNED PANEL */}
      <UnassignedPanel
        requests={unassignedSRs}
        resources={res}
        onAssign={handleAssign}
        onRequestClick={handleRequestClick}
        height={panelHeight}
        setHeight={setPanelHeight}
        onResizeStart={startResizing}
      />

      {/* DETAIL MODAL */}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} onStatusChange={() => { pR(); wR(); }} />}
    </div>
  );
}