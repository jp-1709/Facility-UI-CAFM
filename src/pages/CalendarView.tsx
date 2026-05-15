/**
 * CalendarView.tsx  ·  Facility-UI
 * Fully dynamic CAFM Calendar — 5 features:
 *  1. Multi-View  : Month · Week · Grid/List · Resource (timeline)
 *  2. Filter Sidebar: Building · Location · Request Type · Status · Assignee · Save defaults
 *  3. Quick-Create  : Click any empty slot → pre-filled New Event modal
 *  4. Color Coding  : event-type + status palette
 *  5. Declutter Mode: hides Low/Scheduled items on toggle
 *
 * Data: PPM Schedule + Work Orders + Service Requests (Frappe REST)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Search, Filter, X, Loader2,
  Calendar, List, LayoutGrid, Users, ChevronDown, ChevronUp,
  RefreshCw, CheckCircle2, Clock, AlertTriangle, MapPin, User,
  Wrench, Building2, Tag, Star, EyeOff, Eye, Save, Sliders,
  MoreVertical, Edit2, Trash2, Check, Copy, ExternalLink,
  Activity, Zap, Package, Shield,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════
   FRAPPE API
═══════════════════════════════════════════════════════ */
const BASE = "";
type FF = [string, string, string | number | string[]][];

async function fGet<T>(doctype: string, fields: string[], filters: FF = [], orderBy = "", limit = 500): Promise<T[]> {
  const p = new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: String(limit), ...(orderBy ? { order_by: orderBy } : {}) });
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}?${p}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}: ${r.statusText}`);
  return (await r.json()).data as T[];
}

async function fCreate<T>(doctype: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.exc_type || `POST ${doctype} failed`); }
  const json = await res.json(); return json.data as T;
}

async function fUpdate<T>(doctype: string, name: string, data: Partial<T>): Promise<T> {
  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include", headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.exc_type || `PUT ${doctype} failed`); }
  const json = await res.json(); return json.data as T;
}

function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

function useFetch<T>(doctype: string, fields: string[], filters: FF, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fGet<T>(doctype, fields, filters)); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useSimple<T>(doctype: string, fields: string[], filters: FF = [], skip = false) {
  const [data, setData] = useState<T[]>([]);
  const f = useCallback(async () => { if (skip) return; try { setData(await fGet<T>(doctype, fields, filters)); } catch { /* */ } }, [doctype, skip]); // eslint-disable-line
  useEffect(() => { f(); }, [f]);
  return data;
}

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
interface PPM {
  name: string; pm_id: string; pm_title: string;
  pm_type?: string; frequency?: string; status: string;
  asset_code?: string; asset_name?: string; asset_category?: string; service_group?: string;
  property_code?: string; property_name?: string;
  zone_code?: string; sub_zone_code?: string; base_unit_code?: string;
  client_code?: string; client_name?: string;
  contract_code?: string; contract_group?: string;
  last_done_date?: string; next_due_date: string; overdue_by_days?: number;
  assigned_to?: string; assigned_technician?: string;
  planned_duration_hrs?: number; estimated_spares?: number;
  checklist_reference?: string; notes?: string; ppm_wo_number?: string;
}

interface WO {
  name: string; wo_number?: string; wo_title: string;
  wo_type?: string; status: string; actual_priority?: string;
  assigned_to?: string; assigned_technician?: string;
  schedule_start_date?: string; schedule_start_time?: string; schedule_end_time?: string;
  planned_duration_min?: number;
  property_code?: string; property_name?: string;
  zone_code?: string; sub_zone_code?: string;
  asset_code?: string; asset_name?: string;
  service_group?: string; fault_category?: string;
  client_code?: string; client_name?: string;
  work_done_notes?: string;
}

interface SR {
  name: string; sr_title?: string; status: string; wo_source?: string;
  fault_category?: string; priority_actual?: string;
  property_code?: string; property_name?: string;
  reported_by?: string; raised_date?: string; raised_time?: string;
  assigned_to?: string; client_code?: string;
}

interface Resource { name: string; resource_name: string; }
interface Property { name: string; property_code: string; property_name: string; contract_code?: string; }
interface Asset { name: string; asset_code: string; asset_name: string; }
interface Client { name: string; client_code: string; client_name: string; }
interface Contract { name: string; contract_title: string; }

/* ═══════════════════════════════════════════════════════
   CALENDAR EVENT (unified type)
═══════════════════════════════════════════════════════ */
type EventType = "PPM" | "Work Order" | "Service Request" | "Inspection" | "Facility Rental" | "Other";
type EventStatus = "Scheduled" | "Overdue" | "In Progress" | "Completed" | "Open" | "Pending Approval" | "Cancelled" | "Deferred";
type EventPriority = "P1 - Critical" | "P2 - High" | "P3 - Medium" | "P4 - Low" | "";

interface CalEvent {
  id: string;
  title: string;
  date: string;          // YYYY-MM-DD
  startTime?: string;    // HH:MM
  endTime?: string;
  durationHrs?: number;
  type: EventType;
  status: EventStatus;
  priority: EventPriority;
  assignee?: string;
  assigneeKey?: string;
  property?: string;
  propertyKey?: string;
  zone?: string;
  subZone?: string;
  asset?: string;
  serviceGroup?: string;
  frequency?: string;
  notes?: string;
  source: "ppm" | "wo" | "sr";
  rawName: string;
}

/* ═══════════════════════════════════════════════════════
   COLOUR SYSTEM
═══════════════════════════════════════════════════════ */
const TYPE_PALETTE: Record<EventType, { bg: string; text: string; border: string; dot: string; hex: string }> = {
  "PPM": { bg: "bg-violet-500", text: "text-white", border: "border-violet-600", dot: "bg-violet-500", hex: "#8b5cf6" },
  "Work Order": { bg: "bg-blue-500", text: "text-white", border: "border-blue-600", dot: "bg-blue-500", hex: "#3b82f6" },
  "Service Request": { bg: "bg-amber-500", text: "text-white", border: "border-amber-600", dot: "bg-amber-500", hex: "#f59e0b" },
  "Inspection": { bg: "bg-orange-500", text: "text-white", border: "border-orange-600", dot: "bg-orange-500", hex: "#f97316" },
  "Facility Rental": { bg: "bg-teal-500", text: "text-white", border: "border-teal-600", dot: "bg-teal-500", hex: "#14b8a6" },
  "Other": { bg: "bg-slate-500", text: "text-white", border: "border-slate-600", dot: "bg-slate-500", hex: "#64748b" },
};

const STATUS_PALETTE: Record<string, { chip: string; dot: string }> = {
  Scheduled: { chip: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  Overdue: { chip: "bg-red-100 text-red-700", dot: "bg-red-500" },
  "In Progress": { chip: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  Completed: { chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  Open: { chip: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  "Pending Approval": { chip: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  Cancelled: { chip: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  Deferred: { chip: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
};

const PRIORITY_PALETTE: Record<string, string> = {
  "P1 - Critical": "bg-red-500 text-white",
  "P2 - High": "bg-orange-400 text-white",
  "P3 - Medium": "bg-amber-400 text-black",
  "P4 - Low": "bg-green-400 text-white",
};

function typeFromPPM(ppm: PPM): EventType {
  const t = ppm.pm_type || "";
  if (t.includes("Inspection")) return "Inspection";
  return "PPM";
}
function typeFromWO(wo: WO): EventType {
  const t = wo.wo_type || "";
  if (t.includes("Inspection")) return "Inspection";
  return "Work Order";
}

function ppmToEvent(ppm: PPM): CalEvent {
  return {
    id: `ppm-${ppm.name}`,
    title: ppm.pm_title,
    date: ppm.next_due_date,
    startTime: undefined,
    durationHrs: ppm.planned_duration_hrs,
    type: typeFromPPM(ppm),
    status: (ppm.status as EventStatus) || "Scheduled",
    priority: "",
    assignee: ppm.assigned_technician,
    assigneeKey: ppm.assigned_to,
    property: ppm.property_name || ppm.property_code,
    propertyKey: ppm.property_code,
    zone: ppm.zone_code,
    subZone: ppm.sub_zone_code,
    asset: ppm.asset_name || ppm.asset_code,
    serviceGroup: ppm.service_group,
    frequency: ppm.frequency,
    notes: ppm.notes,
    source: "ppm",
    rawName: ppm.name,
  };
}

function woToEvent(wo: WO): CalEvent {
  return {
    id: `wo-${wo.name}`,
    title: wo.wo_title,
    date: wo.schedule_start_date || "",
    startTime: wo.schedule_start_time?.slice(0, 5),
    endTime: wo.schedule_end_time?.slice(0, 5),
    durationHrs: wo.planned_duration_min ? wo.planned_duration_min / 60 : undefined,
    type: typeFromWO(wo),
    status: (wo.status as EventStatus),
    priority: (wo.actual_priority as EventPriority) || "",
    assignee: wo.assigned_technician,
    assigneeKey: wo.assigned_to,
    property: wo.property_name || wo.property_code,
    propertyKey: wo.property_code,
    zone: wo.zone_code,
    asset: wo.asset_name || wo.asset_code,
    serviceGroup: wo.service_group,
    notes: wo.work_done_notes,
    source: "wo",
    rawName: wo.name,
  };
}

function srToEvent(sr: SR): CalEvent {
  return {
    id: `sr-${sr.name}`,
    title: sr.sr_title || sr.name,
    date: sr.raised_date || "",
    startTime: sr.raised_time?.slice(0, 5),
    type: "Service Request",
    status: (sr.status as EventStatus),
    priority: (sr.priority_actual as EventPriority) || "",
    assignee: undefined,
    assigneeKey: sr.assigned_to,
    property: sr.property_name || sr.property_code,
    propertyKey: sr.property_code,
    serviceGroup: sr.fault_category,
    source: "sr",
    rawName: sr.name,
  };
}

/* ═══════════════════════════════════════════════════════
   DATE HELPERS
═══════════════════════════════════════════════════════ */
function weekStart(d: Date): Date {
  const s = new Date(d); const day = s.getDay();
  s.setDate(s.getDate() - (day === 0 ? 6 : day - 1)); s.setHours(0, 0, 0, 0); return s;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function dateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
function isToday(d: Date): boolean { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); }
function fmtLong(d: Date): string { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); }
function fmtShort(d: Date): string { return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); }
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ═══════════════════════════════════════════════════════
   MINI HELPERS
═══════════════════════════════════════════════════════ */
function Spin({ small }: { small?: boolean }) {
  return <div className={`flex items-center justify-center ${small ? "py-4" : "py-12"}`}><Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-5 h-5"}`} /></div>;
}
function ErrMsg({ msg }: { msg: string }) {
  return <div className="flex items-center gap-2 m-3 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive"><AlertTriangle className="w-4 h-4 shrink-0" />{msg}</div>;
}
function Avatar({ name, size = "sm" }: { name?: string; size?: "sm" | "md" }) {
  const i = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const cols = ["bg-blue-500", "bg-violet-500", "bg-teal-500", "bg-amber-500", "bg-pink-500", "bg-orange-500", "bg-sky-500", "bg-green-500"];
  const c = cols[(i.charCodeAt(0) || 0) % cols.length];
  const sz = size === "md" ? "w-7 h-7 text-xs" : "w-5 h-5 text-[10px]";
  return <div className={`${sz} rounded-full ${c} flex items-center justify-center text-white font-bold shrink-0`}>{i}</div>;
}
function StatusChip({ status }: { status: string }) {
  const c = STATUS_PALETTE[status] || { chip: "bg-muted text-muted-foreground", dot: "bg-gray-400" };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.chip}`}><span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{status}</span>;
}
function TypeChip({ type }: { type: EventType }) {
  const c = TYPE_PALETTE[type];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>{type}</span>;
}

/* ═══════════════════════════════════════════════════════
   EVENT BLOCK (inside calendar cells / week rows)
═══════════════════════════════════════════════════════ */
function EventBlock({ ev, onClick, compact = false, onDragStart }: { ev: CalEvent; onClick: (e: React.MouseEvent) => void; compact?: boolean; onDragStart?: (e: React.DragEvent) => void }) {
  const p = TYPE_PALETTE[ev.type];
  return (
    <button onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      className={`w-full text-left ${p.bg} ${p.text} rounded px-2 py-0.5 mb-0.5 last:mb-0 hover:opacity-90 transition-opacity group overflow-hidden ${onDragStart ? "cursor-move" : ""}`}>
      <div className="flex items-center gap-1 min-w-0">
        {ev.startTime && <span className="text-[10px] opacity-80 shrink-0">{ev.startTime}</span>}
        <span className={`font-semibold truncate ${compact ? "text-[10px]" : "text-[11px]"}`}>{ev.title}</span>
        {ev.priority === "P1 - Critical" && <span className="w-1.5 h-1.5 rounded-full bg-red-300 shrink-0 ml-auto" />}
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════
   QUICK-CREATE MODAL
═══════════════════════════════════════════════════════ */
interface QuickCreateProps {
  date: string;
  time?: string;
  resourceKey?: string;
  properties: Property[];
  resources: Resource[];
  assets: Asset[];
  clients: Client[];
  contracts: Contract[];
  onClose: () => void;
  onCreated: () => void;
}

function QuickCreateModal({ date, time, resourceKey, properties, resources, assets, clients, contracts, onClose, onCreated }: QuickCreateProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"ppm" | "wo" | "sr">("wo");
  const [priority, setPriority] = useState("P3 - Medium");
  const [propertyCode, setPropertyCode] = useState("");
  const [assignedTo, setAssignedTo] = useState(resourceKey || "");
  const [startTime, setStartTime] = useState(time || "09:00");
  const [notes, setNotes] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [contractCode, setContractCode] = useState("");
  const [frequency, setFrequency] = useState("");
  const [woSource, setWoSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function generateID(prefix: string) {
    const now = new Date();
    const date = now.toISOString().split("T")[0].replace(/-/g, "");
    const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
    return `${prefix}-${date}-${time}-${rand}`;
  }

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    if (type === "ppm" && (!assetCode.trim() || !clientCode.trim() || !contractCode.trim() || !frequency.trim())) {
      setErr("Asset, Client, Contract, and Frequency are required for PPM Schedule."); return;
    }
    if ((type === "wo" || type === "sr") && (!clientCode.trim() || !contractCode.trim())) {
      setErr("Client and Contract are required for Work Orders and Service Requests."); return;
    }
    if (type === "sr" && !woSource.trim()) {
      setErr("Request Mode is required for Service Requests."); return;
    }
    setSaving(true); setErr(null);
    try {
      if (type === "ppm") {
        // Generate PM ID from title and date
        const pmId = `PPM-${title.replace(/\s+/g, '-').toUpperCase()}-${new Date(date).toISOString().split('T')[0]}`;
        await fCreate("PPM Schedule", {
          pm_id: pmId, pm_title: title, pm_type: "Planned Preventive", frequency: frequency,
          status: "Open", next_due_date: date,
          asset_code: assetCode, client_code: clientCode, contract_code: contractCode,
          property_code: propertyCode || undefined, assigned_to: assignedTo || undefined, notes,
        });
      } else if (type === "wo") {
        const woNumber = generateID("WO");
        await fCreate("Work Orders", {
          wo_number: woNumber, wo_title: title, wo_type: "Planned Preventive", status: "Open",
          actual_priority: priority, schedule_start_date: date, schedule_start_time: startTime,
          client_code: clientCode, contract_code: contractCode,
          property_code: propertyCode || undefined, assigned_to: assignedTo || undefined, work_done_notes: notes,
        });
      } else {
        const srNumber = generateID("SR");
        await fCreate("Service Request", {
          sr_number: srNumber, sr_title: title, status: "Open", priority_actual: priority,
          wo_source: woSource, client_code: clientCode, contract_code: contractCode,
          raised_date: date, raised_time: startTime,
          property_code: propertyCode || undefined, notes,
        });
      }
      onCreated();
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  const TYPE_OPTS = [
    { id: "wo" as const, label: "Work Order", icon: <Wrench className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { id: "ppm" as const, label: "PPM Schedule", icon: <Package className="w-3.5 h-3.5" />, color: "text-violet-600 bg-violet-50 border-violet-200" },
    { id: "sr" as const, label: "Service Request", icon: <Activity className="w-3.5 h-3.5" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card rounded-2xl shadow-2xl border border-border fade-in">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <h3 className="text-lg font-bold text-foreground">Quick Create Event</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
              <Calendar className="w-3 h-3" />{new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "long" })}
              {time && <><Clock className="w-3 h-3 ml-1" />{time}</>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="px-6 py-5">
          {err && <div className="mb-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">{err}</div>}

          {/* Type selector */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Event Type</p>
            <div className="grid grid-cols-3 gap-3">
              {TYPE_OPTS.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  className={`flex flex-col items-center gap-2 py-3 px-4 rounded-xl border-2 text-xs font-semibold transition-all transform hover:scale-105 ${type === t.id ? `border-current ${t.color} shadow-lg` : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/50"}`}>
                  <div className="p-2 rounded-lg bg-background">{t.icon}</div>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-12 gap-4">
            {/* Title - spans full width */}
            <div className="col-span-12">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Title <span className="text-destructive">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter event title..."
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50 transition-colors" />
            </div>

            {/* Time */}
            <div className="col-span-4">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            {/* Priority */}
            {type !== "ppm" && (
              <div className="col-span-4">
                <label className="block text-xs font-semibold text-foreground mb-1.5">Priority</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  {["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
            )}


            {/* PPM Specific Fields */}
            {type === "ppm" && (
              <>
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Asset <span className="text-destructive">*</span></label>
                  <select value={assetCode} onChange={e => setAssetCode(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select asset...</option>
                    {assets.map(a => <option key={a.name} value={a.asset_code}>{a.asset_name}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Frequency <span className="text-destructive">*</span></label>
                  <select value={frequency} onChange={e => setFrequency(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select frequency...</option>
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </>
            )}

            {/* Client and Contract - shown for all types */}
            <div className="col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Client <span className="text-destructive">*</span></label>
              <select value={clientCode} onChange={e => setClientCode(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select client...</option>
                {clients.map(c => <option key={c.name} value={c.client_code}>{c.client_name}</option>)}
              </select>
            </div>
            <div className="col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Contract <span className="text-destructive">*</span></label>
              <select value={contractCode} onChange={e => setContractCode(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select contract...</option>
                {contracts.map(c => <option key={c.name} value={c.name}>{c.contract_title}</option>)}
              </select>
            </div>

            {/* Service Request Specific Fields */}
            {type === "sr" && (
              <div className="col-span-12">
                <label className="block text-xs font-semibold text-foreground mb-1.5">Request Mode <span className="text-destructive">*</span></label>
                <select value={woSource} onChange={e => setWoSource(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select request mode...</option>
                  <option value="Portal">Portal</option>
                  <option value="Phone">Phone</option>
                  <option value="Email">Email</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="On-Site">On-Site</option>
                  <option value="System">System</option>
                </select>
              </div>
            )}

            {/* Property */}
            <div className="col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Property</label>
              <select value={propertyCode} onChange={e => setPropertyCode(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Select property...</option>
                {properties.filter(p => !contractCode || p.contract_code === contractCode).map(p => <option key={p.name} value={p.name}>{p.property_name}</option>)}
              </select>
            </div>

            {/* Assign to */}
            <div className="col-span-6">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Assign To</label>
              <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Unassigned</option>
                {resources.map(r => <option key={r.name} value={r.name}>{r.resource_name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div className="col-span-12">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Optional notes..."
                className="w-full px-4 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : <><Plus className="w-4 h-4" />Create Event</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EVENT DETAIL POPOVER / MODAL
═══════════════════════════════════════════════════════ */
function EventDetail({ ev, onClose }: { ev: CalEvent; onClose: () => void }) {
  const p = TYPE_PALETTE[ev.type];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border fade-in">
        {/* colored header strip */}
        <div className={`px-5 pt-5 pb-4 ${p.bg} rounded-t-2xl`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold opacity-80 text-white">{ev.source === "ppm" ? ev.rawName : ev.id.split("-")[1]}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white">{ev.type}</span>
              </div>
              <h3 className="text-lg font-bold text-white leading-tight">{ev.title}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StatusChip status={ev.status} />
            {ev.priority && <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_PALETTE[ev.priority] || "bg-white/20 text-white"}`}>{ev.priority}</span>}
            {ev.frequency && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">{ev.frequency}</span>}
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {[
            { icon: <Calendar className="w-4 h-4 text-muted-foreground" />, label: "Date", val: ev.date ? new Date(ev.date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) : "—" },
            { icon: <Clock className="w-4 h-4 text-muted-foreground" />, label: "Time", val: [ev.startTime, ev.endTime].filter(Boolean).join(" – ") || (ev.durationHrs ? `${ev.durationHrs}h planned` : "—") },
            { icon: <MapPin className="w-4 h-4 text-muted-foreground" />, label: "Location", val: [ev.property, ev.zone, ev.subZone].filter(Boolean).join(" › ") || "—" },
            { icon: <User className="w-4 h-4 text-muted-foreground" />, label: "Assignee", val: ev.assignee || "Unassigned" },
            { icon: <Package className="w-4 h-4 text-muted-foreground" />, label: "Asset", val: ev.asset || "—" },
            { icon: <Tag className="w-4 h-4 text-muted-foreground" />, label: "Service Group", val: ev.serviceGroup || "—" },
          ].map(({ icon, label, val }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{icon}</div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-sm text-foreground">{val}</p>
              </div>
            </div>
          ))}
          {ev.notes && (
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm text-foreground leading-relaxed">{ev.notes}</div>
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            <Copy className="w-3 h-3" /> Duplicate
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border rounded-lg hover:bg-muted transition-colors">
            <ExternalLink className="w-3 h-3" /> Open Record
          </button>
          <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FILTER SIDEBAR
═══════════════════════════════════════════════════════ */
export interface FilterState {
  buildings: string[];
  eventTypes: EventType[];
  statuses: string[];
  assignees: string[];
  priorities: string[];
  showDeclutter: boolean;
}

const DEFAULT_FILTERS: FilterState = {
  buildings: [], eventTypes: [], statuses: [], assignees: [], priorities: [], showDeclutter: false,
};

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  properties: Property[];
  resources: Resource[];
  onClose: () => void;
}

function FilterSidebar({ filters, onChange, properties, resources, onClose }: FilterSidebarProps) {
  const [local, setLocal] = useState<FilterState>(filters);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [savedName, setSavedName] = useState("");
  const [showSave, setShowSave] = useState(false);
  const toggle = (k: string) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  const EVENT_TYPES: EventType[] = ["PPM", "Work Order", "Service Request", "Inspection", "Facility Rental", "Other"];
  const STATUSES = ["Scheduled", "Overdue", "In Progress", "Completed", "Open", "Pending Approval", "Cancelled", "Deferred"];
  const PRIORITIES = ["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"];

  function applyAndClose() { onChange(local); onClose(); }
  function resetAll() { setLocal(DEFAULT_FILTERS); }

  const FilterGroup = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => (
    <div className="border-b border-border">
      <button onClick={() => toggle(id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</span>
        {collapsed[id] ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {!collapsed[id] && <div className="px-4 pb-3 fade-in">{children}</div>}
    </div>
  );

  const CheckRow = ({ label, checked, onChange: onCh, dot }: { label: string; checked: boolean; onChange: (v: boolean) => void; dot?: string }) => (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer hover:text-foreground group">
      <div onClick={() => onCh(!checked)}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"}`}>
        {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
      </div>
      {dot && <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />}
      <span className="text-sm text-foreground truncate">{label}</span>
    </label>
  );

  const activeCount = (local.buildings.length + local.eventTypes.length + local.statuses.length + local.assignees.length + local.priorities.length);

  return (
    <div className="w-[280px] min-w-[280px] border-r border-border flex flex-col h-full bg-card overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{activeCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted">Reset</button>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {/* Declutter toggle */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {local.showDeclutter ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="text-xs font-bold text-foreground">Declutter Mode</p>
              <p className="text-[10px] text-muted-foreground">Hide low-priority items</p>
            </div>
          </div>
          <button onClick={() => setLocal(f => ({ ...f, showDeclutter: !f.showDeclutter }))}
            className={`w-10 h-5 rounded-full transition-colors relative ${local.showDeclutter ? "bg-amber-500" : "bg-muted"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${local.showDeclutter ? "left-5.5 translate-x-0.5" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {/* filter groups */}
      <div className="flex-1 overflow-y-auto">
        <FilterGroup id="building" title="Building / Property">
          {properties.length === 0 && <p className="text-xs text-muted-foreground py-1">Loading…</p>}
          {properties.map(p => (
            <CheckRow key={p.name} label={p.property_name} checked={local.buildings.includes(p.name)}
              onChange={() => setLocal(f => ({ ...f, buildings: toggleArr(f.buildings, p.name) }))} />
          ))}
        </FilterGroup>

        <FilterGroup id="type" title="Request Type">
          {EVENT_TYPES.map(et => {
            const c = TYPE_PALETTE[et];
            return <CheckRow key={et} label={et} dot={c.dot} checked={local.eventTypes.includes(et)}
              onChange={() => setLocal(f => ({ ...f, eventTypes: toggleArr(f.eventTypes, et) }))} />;
          })}
        </FilterGroup>

        <FilterGroup id="status" title="Status">
          {STATUSES.map(s => {
            const c = STATUS_PALETTE[s];
            return <CheckRow key={s} label={s} dot={c?.dot} checked={local.statuses.includes(s)}
              onChange={() => setLocal(f => ({ ...f, statuses: toggleArr(f.statuses, s) }))} />;
          })}
        </FilterGroup>

        <FilterGroup id="priority" title="Priority">
          {PRIORITIES.map(pr => (
            <CheckRow key={pr} label={pr} checked={local.priorities.includes(pr)}
              onChange={() => setLocal(f => ({ ...f, priorities: toggleArr(f.priorities, pr) }))} />
          ))}
        </FilterGroup>

        <FilterGroup id="assignee" title="Assignee">
          {resources.length === 0 && <p className="text-xs text-muted-foreground py-1">Loading…</p>}
          {resources.map(r => (
            <CheckRow key={r.name} label={r.resource_name} checked={local.assignees.includes(r.name)}
              onChange={() => setLocal(f => ({ ...f, assignees: toggleArr(f.assignees, r.name) }))} />
          ))}
        </FilterGroup>
      </div>

      {/* save / apply */}
      <div className="border-t border-border px-4 py-3 bg-card space-y-2">
        {showSave ? (
          <div className="flex gap-2">
            <input value={savedName} onChange={e => setSavedName(e.target.value)} placeholder="Filter preset name…"
              className="flex-1 px-2 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            <button onClick={() => { localStorage.setItem(`cal_filter_${savedName}`, JSON.stringify(local)); setShowSave(false); setSavedName(""); }}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors">
              <Save className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button onClick={() => setShowSave(true)}
            className="w-full flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <Star className="w-3.5 h-3.5" /> Save as Default Filter
          </button>
        )}
        <button onClick={applyAndClose}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
          <Filter className="w-4 h-4" /> Apply Filters{activeCount > 0 && ` (${activeCount})`}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MONTH VIEW
═══════════════════════════════════════════════════════ */
function MonthView({ events, anchor, onSlotClick, onEventClick, onEventDrop }: {
  events: CalEvent[]; anchor: Date;
  onSlotClick: (date: string) => void;
  onEventClick: (ev: CalEvent) => void;
  onEventDrop: (evId: string, date: string) => void;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const year = anchor.getFullYear(); const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  let gs = new Date(firstDay); const dow = gs.getDay();
  gs.setDate(gs.getDate() - (dow === 0 ? 6 : dow - 1));
  const cells: Date[] = []; let cur = new Date(gs);
  while (cur <= new Date(year, month + 1, 0) || cells.length % 7 !== 0) {
    cells.push(new Date(cur)); cur.setDate(cur.getDate() + 1); if (cells.length > 42) break;
  }
  const byDay: Record<string, CalEvent[]> = {};
  events.forEach(ev => { const dk = ev.date; if (!byDay[dk]) byDay[dk] = []; byDay[dk].push(ev); });

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 shrink-0 sticky top-0 z-10">
        {DAYS_SHORT.map(d => <div key={d} className="py-2 text-center text-xs font-bold text-muted-foreground border-r last:border-r-0 border-border">{d}</div>)}
      </div>
      {/* cells */}
      <div className="grid grid-cols-7 flex-1">
        {cells.map((day, idx) => {
          const dk = dateKey(day); const dayEvs = byDay[dk] || [];
          const inMonth = day.getMonth() === month; const today = isToday(day);
          const isExpanded = expandedDays.has(dk);
          const vis = isExpanded ? dayEvs : dayEvs.slice(0, 3);
          const overflow = dayEvs.length - 3;
          return (
            <div key={idx} onClick={() => onSlotClick(dk)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const evId = e.dataTransfer.getData("text/plain"); if (evId) onEventDrop(evId, dk); }}
              className={`min-h-[100px] border-b border-r border-border last:border-r-0 p-1.5 cursor-pointer transition-colors hover:bg-primary/3
                ${!inMonth ? "bg-muted/10" : "bg-background"} ${today ? "bg-primary/5" : ""}`}>
              <div className="mb-1">
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold
                  ${today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"}`}>
                  {day.getDate()}
                </span>
              </div>
              {vis.map(ev => (
                <EventBlock key={ev.id} ev={ev} compact onClick={e => { e.stopPropagation(); onEventClick(ev); }} onDragStart={e => e.dataTransfer.setData("text/plain", ev.id)} />
              ))}
              {overflow > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); toggleDayExpansion(dk); }}
                  className="text-[10px] font-semibold text-primary pl-1 cursor-pointer hover:underline text-left"
                >
                  {isExpanded ? `Show ${overflow} less` : `+${overflow} more`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   WEEK VIEW
═══════════════════════════════════════════════════════ */
function WeekView({ events, anchor, onSlotClick, onEventClick, onEventDrop }: {
  events: CalEvent[]; anchor: Date;
  onSlotClick: (date: string, time?: string) => void;
  onEventClick: (ev: CalEvent) => void;
  onEventDrop: (evId: string, date: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const byDay: Record<string, CalEvent[]> = {};
  events.forEach(ev => { const dk = ev.date; if (!byDay[dk]) byDay[dk] = []; byDay[dk].push(ev); });

  return (
    <div className="flex-1 overflow-auto">
      {/* day headers */}
      <div className="grid grid-cols-8 sticky top-0 z-10 bg-card border-b border-border">
        <div className="border-r border-border py-2 px-2 text-xs text-muted-foreground text-center">Time</div>
        {days.map((day, i) => (
          <div key={i} className={`py-2 text-center border-r last:border-r-0 border-border ${isToday(day) ? "bg-primary/5" : ""}`}>
            <p className={`text-xs font-bold ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>{DAYS_SHORT[(day.getDay())]}</p>
            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"}`}>{day.getDate()}</span>
            <p className="text-[10px] text-muted-foreground">{day.toLocaleDateString("en-GB", { month: "short" })}</p>
          </div>
        ))}
      </div>

      {/* all-day row */}
      <div className="grid grid-cols-8 border-b border-border bg-muted/10">
        <div className="border-r border-border px-2 py-1 text-[10px] text-muted-foreground text-center">All day</div>
        {days.map((day, i) => {
          const dk = dateKey(day);
          const allDay = (byDay[dk] || []).filter(ev => !ev.startTime);
          return (
            <div key={i} className={`border-r last:border-r-0 border-border px-1 py-1 min-h-[32px] ${isToday(day) ? "bg-primary/5" : ""}`} onClick={() => onSlotClick(dk)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const evId = e.dataTransfer.getData("text/plain"); if (evId) onEventDrop(evId, dk); }}>
              {allDay.map(ev => <EventBlock key={ev.id} ev={ev} compact onClick={e => { e.stopPropagation(); onEventClick(ev); }} onDragStart={e => e.dataTransfer.setData("text/plain", ev.id)} />)}
            </div>
          );
        })}
      </div>

      {/* hourly rows */}
      <div>
        {HOURS.map(h => (
          <div key={h} className="grid grid-cols-8 border-b border-border" style={{ minHeight: "52px" }}>
            <div className="border-r border-border px-2 py-1 text-[10px] text-muted-foreground text-right shrink-0">
              {String(h).padStart(2, "0")}:00
            </div>
            {days.map((day, i) => {
              const dk = dateKey(day);
              const hourEvs = (byDay[dk] || []).filter(ev => ev.startTime && parseInt(ev.startTime.split(":")[0]) === h);
              return (
                <div key={i}
                  className={`border-r last:border-r-0 border-border px-1 py-0.5 cursor-pointer hover:bg-primary/3 transition-colors ${isToday(day) ? "bg-primary/3" : ""}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const evId = e.dataTransfer.getData("text/plain"); if (evId) onEventDrop(evId, dk); }}
                  onClick={() => onSlotClick(dk, `${String(h).padStart(2, "0")}:00`)}>
                  {hourEvs.map(ev => <EventBlock key={ev.id} ev={ev} onClick={e => { e.stopPropagation(); onEventClick(ev); }} onDragStart={e => e.dataTransfer.setData("text/plain", ev.id)} />)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   GRID / LIST VIEW
═══════════════════════════════════════════════════════ */
type SortCol = "date" | "title" | "type" | "status" | "priority" | "assignee" | "property";

function GridView({ events, onEventClick }: { events: CalEvent[]; onEventClick: (ev: CalEvent) => void }) {
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortAsc(v => !v); else { setSortCol(col); setSortAsc(true); }
  }

  const filtered = events.filter(ev => {
    if (!search) return true;
    const q = search.toLowerCase();
    return ev.title.toLowerCase().includes(q) || (ev.property || "").toLowerCase().includes(q) || (ev.assignee || "").toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = "", bv = "";
    if (sortCol === "date") { av = a.date; bv = b.date; }
    else if (sortCol === "title") { av = a.title; bv = b.title; }
    else if (sortCol === "type") { av = a.type; bv = b.type; }
    else if (sortCol === "status") { av = a.status; bv = b.status; }
    else if (sortCol === "priority") { av = a.priority || ""; bv = b.priority || ""; }
    else if (sortCol === "assignee") { av = a.assignee || ""; bv = b.assignee || ""; }
    else if (sortCol === "property") { av = a.property || ""; bv = b.property || ""; }
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const Th = ({ col, label }: { col: SortCol; label: string }) => (
    <th className="px-4 py-3 text-left cursor-pointer hover:bg-muted/50 transition-colors select-none" onClick={() => handleSort(col)}>
      <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {label}
        {sortCol === col ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
      </div>
    </th>
  );

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      {/* search + count */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
            className="pl-8 pr-3 py-2 border border-border rounded-lg text-sm bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <span className="text-xs text-muted-foreground">{sorted.length} event{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-muted/50">
            <tr className="border-b border-border">
              <Th col="date" label="Date" />
              <Th col="title" label="Title" />
              <Th col="type" label="Type" />
              <Th col="status" label="Status" />
              <Th col="priority" label="Priority" />
              <Th col="assignee" label="Assignee" />
              <Th col="property" label="Property" />
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground text-sm">No events match your filters.</td></tr>
            )}
            {sorted.map((ev, i) => {
              const tc = TYPE_PALETTE[ev.type];
              return (
                <tr key={ev.id} onClick={() => onEventClick(ev)}
                  className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                  <td className="px-4 py-3 text-sm text-foreground whitespace-nowrap">
                    {ev.date ? new Date(ev.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    {ev.startTime && <span className="ml-1.5 text-xs text-muted-foreground">{ev.startTime}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${tc.dot}`} />
                      <p className="text-sm font-semibold text-foreground truncate max-w-[220px]">{ev.title}</p>
                    </div>
                    {ev.asset && <p className="text-xs text-muted-foreground mt-0.5 pl-4">{ev.asset}</p>}
                  </td>
                  <td className="px-4 py-3"><TypeChip type={ev.type} /></td>
                  <td className="px-4 py-3"><StatusChip status={ev.status} /></td>
                  <td className="px-4 py-3">
                    {ev.priority ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PRIORITY_PALETTE[ev.priority] || "bg-muted text-muted-foreground"}`}>{ev.priority.split(" - ")[0]}</span> : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {ev.assignee ? <><Avatar name={ev.assignee} size="sm" /><span className="text-sm text-foreground truncate max-w-[100px]">{ev.assignee}</span></> : <span className="text-xs text-muted-foreground">Unassigned</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" /><span className="truncate max-w-[120px]">{ev.property || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); onEventClick(ev); }}>
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RESOURCE VIEW (timeline per technician)
═══════════════════════════════════════════════════════ */
function ResourceView({ events, resources, anchor, onSlotClick, onEventClick, onEventDrop }: {
  events: CalEvent[]; resources: Resource[]; anchor: Date;
  onSlotClick: (date: string, resourceKey?: string) => void;
  onEventClick: (ev: CalEvent) => void;
  onEventDrop: (evId: string, date: string, resourceKey: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(anchor, i));

  // group events by assigneeKey + date
  const grid: Record<string, Record<string, CalEvent[]>> = {};
  events.forEach(ev => {
    const rk = ev.assigneeKey || "__unassigned";
    const dk = ev.date;
    if (!grid[rk]) grid[rk] = {};
    if (!grid[rk][dk]) grid[rk][dk] = [];
    grid[rk][dk].push(ev);
  });

  const unassigned = grid["__unassigned"] || {};
  const resourceRows = resources.filter(r => grid[r.name]);
  if (Object.keys(unassigned).length > 0 && !resourceRows.find(r => r.name === "__unassigned")) {
    // will render separately
  }

  const AVAIL_COLORS = ["bg-emerald-50 border-emerald-200", "bg-sky-50 border-sky-200", "bg-violet-50 border-violet-200", "bg-amber-50 border-amber-200", "bg-pink-50 border-pink-200"];

  const ResourceRow = ({ rKey, rName, idx }: { rKey: string; rName: string; idx: number }) => {
    const dayData = grid[rKey] || {};
    const totalBooked = Object.values(dayData).reduce((s, evs) => s + evs.reduce((ss, ev) => ss + (ev.durationHrs || 1), 0), 0);
    const capacity = 8;
    const pct = Math.min(100, Math.round((totalBooked / (capacity * 7)) * 100));

    return (
      <tr className="border-b border-border hover:bg-muted/20 transition-colors">
        {/* resource info cell */}
        <td className="w-[200px] min-w-[200px] border-r border-border p-3 align-top bg-card">
          <div className="flex items-center gap-2.5 mb-2">
            <Avatar name={rName} size="md" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{rName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{pct}%</span>
          </div>
        </td>

        {/* day cells */}
        {days.map((day, di) => {
          const dk = dateKey(day);
          const dayEvs = dayData[dk] || [];
          const booked = dayEvs.reduce((s, ev) => s + (ev.durationHrs || 1), 0);
          const free = capacity - booked;
          const availCls = AVAIL_COLORS[idx % AVAIL_COLORS.length];

          return (
            <td key={di}
              className={`border-r last:border-r-0 border-border align-top p-1 cursor-pointer min-w-[150px] ${isToday(day) ? "bg-primary/3" : ""}`}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const evId = e.dataTransfer.getData("text/plain"); if (evId) onEventDrop(evId, dk, rKey); }}
              onClick={() => onSlotClick(dk, rKey)}>
              {/* available bar */}
              {free > 0 && dayEvs.length === 0 && (
                <div className={`rounded-lg border px-2 py-1.5 text-[10px] text-center font-medium ${availCls}`}>
                  Available · {free}h free
                </div>
              )}
              {dayEvs.map(ev => (
                <button key={ev.id} onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                  draggable={true}
                  onDragStart={e => e.dataTransfer.setData("text/plain", ev.id)}
                  className={`w-full text-left rounded-lg px-2 py-1.5 mb-1 last:mb-0 ${TYPE_PALETTE[ev.type].bg} ${TYPE_PALETTE[ev.type].text} hover:opacity-90 transition-opacity cursor-move`}>
                  {ev.startTime && <p className="text-[10px] opacity-80 font-bold">{ev.startTime}</p>}
                  <p className="text-[11px] font-semibold truncate">{ev.title}</p>
                  {ev.durationHrs && <p className="text-[10px] opacity-80">{ev.durationHrs}h</p>}
                </button>
              ))}
              {dayEvs.length > 0 && free > 0 && (
                <div className={`rounded border px-1.5 py-1 text-[10px] text-center opacity-60 ${availCls}`}>{free}h free</div>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse" style={{ minWidth: "1200px" }}>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border">
            <th className="w-[200px] min-w-[200px] px-3 py-3 text-left border-r border-border">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resource</span>
              </div>
            </th>
            {days.map((day, i) => (
              <th key={i} className={`px-3 py-3 text-center border-r last:border-r-0 border-border min-w-[150px] ${isToday(day) ? "bg-primary/5" : ""}`}>
                <p className={`text-xs font-bold ${isToday(day) ? "text-primary" : "text-foreground"}`}>
                  {DAYS_SHORT[day.getDay()]} {day.getDate()} {day.toLocaleDateString("en-GB", { month: "short" })}
                </p>
                {isToday(day) && <span className="text-[9px] text-primary font-semibold">Today</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resources.map((res, idx) => (
            <ResourceRow key={res.name} rKey={res.name} rName={res.resource_name} idx={idx} />
          ))}
          {Object.keys(unassigned).length > 0 && (
            <ResourceRow key="__unassigned" rKey="__unassigned" rName="Unassigned" idx={resources.length} />
          )}
          {resources.length === 0 && (
            <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No resources found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LEGEND ROW
═══════════════════════════════════════════════════════ */
function QuickTypeFilters({ selected, onToggle, onClear }: { selected: EventType[]; onToggle: (t: EventType) => void; onClear: () => void }) {
  const items = Object.entries(TYPE_PALETTE) as [EventType, typeof TYPE_PALETTE[EventType]][];
  return (
    <div className="flex items-center gap-2 px-5 py-2.5 border-b border-border bg-card/50 backdrop-blur-sm flex-wrap shrink-0">
      <div className="flex items-center gap-1.5 mr-3">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Filter:</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {items.map(([type, c]) => {
          const isActive = selected.includes(type);
          return (
            <button
              key={type}
              onClick={() => onToggle(type)}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border
                ${isActive
                  ? `${c.bg} ${c.text} ${c.border} shadow-md scale-105 ring-2 ring-offset-2 ring-offset-background ${c.border.replace('border-', 'ring-')}`
                  : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:bg-muted/50 hover:scale-105"}`}
            >
              <span className={`w-2 h-2 rounded-full transition-transform duration-200 ${isActive ? "bg-white scale-110" : c.bg} group-hover:scale-125`} />
              {type}
              {isActive && (
                <X className="w-3 h-3 ml-0.5 opacity-80 hover:opacity-100" />
              )}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          onClick={onClear}
          className="ml-auto flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/5 rounded-md transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Clear Types
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
type ViewType = "Month" | "Week" | "Grid" | "Resource";

export default function CalendarView() {
  const [view, setView] = useState<ViewType>("Month");
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEv, setSelectedEv] = useState<CalEvent | null>(null);
  const [quickCreate, setQuickCreate] = useState<{ date: string; time?: string; resourceKey?: string } | null>(null);

  /* range for fetching */
  const wkStart = weekStart(anchor);
  const rangeStart = view === "Month"
    ? new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    : view === "Week" ? wkStart : wkStart;
  const rangeEnd = view === "Month"
    ? new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
    : addDays(wkStart, 6);
  const rs = dateKey(rangeStart); const re = dateKey(rangeEnd);

  /* fetch data */
  const { data: ppms, loading: pL, error: pE, refetch: pR } = useFetch<PPM>("PPM Schedule",
    ["name", "pm_id", "pm_title", "pm_type", "frequency", "status", "asset_code", "asset_name", "asset_category", "service_group",
      "property_code", "property_name", "zone_code", "sub_zone_code", "base_unit_code", "client_code", "client_name",
      "contract_code", "contract_group", "last_done_date", "next_due_date", "overdue_by_days", "assigned_to",
      "assigned_technician", "ppm_wo_number", "planned_duration_hrs", "estimated_spares", "checklist_reference", "notes"],
    [["next_due_date", "between", [rs, re] as unknown as string]], [rs, re, view]);

  const { data: wos, loading: wL, error: wE, refetch: wR } = useFetch<WO>("Work Orders",
    ["name", "wo_number", "wo_title", "wo_type", "status", "actual_priority", "assigned_to", "assigned_technician",
      "schedule_start_date", "schedule_start_time", "schedule_end_time", "planned_duration_min",
      "property_code", "property_name", "zone_code", "sub_zone_code", "asset_code", "asset_name",
      "service_group", "fault_category", "client_code", "client_name", "work_done_notes"],
    [["schedule_start_date", "between", [rs, re] as unknown as string]], [rs, re, view]);

  const { data: srs, loading: sL, error: sE, refetch: sR } = useFetch<SR>("Service Request",
    ["name", "sr_title", "status", "wo_source", "fault_category", "priority_actual",
      "property_code", "property_name", "reported_by", "raised_date", "raised_time", "client_code"],
    [["raised_date", "between", [rs, re] as unknown as string]], [rs, re, view]);

  const resources = useSimple<Resource>("Resource", ["name", "resource_name"], []);
  const properties = useSimple<Property>("Property", ["name", "property_code", "property_name", "contract_code"], []);
  const assets = useSimple<Asset>("CFAM Asset", ["name", "asset_code", "asset_name"], [["asset_status", "=", "Active"]]);
  const clients = useSimple<Client>("Client", ["name", "client_code", "client_name"], []);
  const contracts = useSimple<Contract>("FM Contract", ["name", "contract_title"], [["status", "=", "Active"]]);

  /* merge into unified events */
  const allEvents: CalEvent[] = [
    ...ppms.map(ppmToEvent),
    ...wos.filter(wo => wo.schedule_start_date).map(woToEvent),
    ...srs.filter(sr => sr.raised_date).map(srToEvent),
  ];

  /* apply filters */
  const filteredEvents = allEvents.filter(ev => {
    if (filters.buildings.length > 0 && !filters.buildings.includes(ev.propertyKey || "")) return false;
    if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(ev.type)) return false;
    if (filters.statuses.length > 0 && !filters.statuses.includes(ev.status)) return false;
    if (filters.assignees.length > 0 && !filters.assignees.includes(ev.assigneeKey || "")) return false;
    if (filters.priorities.length > 0 && !filters.priorities.includes(ev.priority)) return false;
    // Declutter: hide Low priority Scheduled items
    if (filters.showDeclutter && ev.status === "Scheduled" && (ev.priority === "P4 - Low" || ev.priority === "")) return false;
    return true;
  });

  const refetchAll = () => { pR(); wR(); sR(); };

  /* drag and drop logic */
  const handleEventDrop = async (evId: string, targetDate: string, targetAssignee?: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDate);

      const ev = allEvents.find(e => e.id === evId);
      if (!ev) return;

      if (target < today) {
        alert("Cannot move event to past dates.");
        return;
      }

      let doctypeToUpdate = "";
      let payload: any = {};

      if (ev.source === "sr") { doctypeToUpdate = "Service Request"; payload.raised_date = targetDate; }
      else if (ev.source === "ppm") { doctypeToUpdate = "PPM Schedule"; payload.next_due_date = targetDate; }
      else if (ev.source === "wo") { doctypeToUpdate = "Work Orders"; payload.schedule_start_date = targetDate; }
      else if ((ev.source as any) === "inspection") { doctypeToUpdate = "Inspection"; payload.inspection_date = targetDate; }
      else if ((ev.source as any) === "rental") { doctypeToUpdate = "Facility Rental"; payload.start_date = targetDate; }
      else { return; }

      if (targetAssignee && targetAssignee !== "__unassigned") {
        payload.assigned_to = targetAssignee;
      }

      await fUpdate(doctypeToUpdate, ev.rawName, payload);
      refetchAll();
    } catch (e: any) {
      alert("Failed to move event: " + e.message);
    }
  };

  const isLoading = pL || wL || sL;
  const errors = [pE, wE, sE].filter(Boolean);

  /* navigation */
  function nav(dir: -1 | 1) {
    if (view === "Month") setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    else setAnchor(addDays(anchor, dir * 7));
  }

  const navLabel = view === "Month"
    ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
    : `${fmtShort(wkStart)} – ${fmtShort(addDays(wkStart, 6))} ${wkStart.getFullYear()}`;

  const activeFilterCount = filters.buildings.length + filters.eventTypes.length + filters.statuses.length + filters.assignees.length + filters.priorities.length;

  const VIEW_OPTS: { id: ViewType; icon: React.ReactNode; label: string }[] = [
    { id: "Month", icon: <Calendar className="w-4 h-4" />, label: "Month" },
    { id: "Week", icon: <LayoutGrid className="w-4 h-4" />, label: "Week" },
    { id: "Grid", icon: <List className="w-4 h-4" />, label: "Grid" },
    { id: "Resource", icon: <Users className="w-4 h-4" />, label: "Resource" },
  ];

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{view} view · {navLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetchAll} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setQuickCreate({ date: dateKey(new Date()) })}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* ══ CONTROLS BAR ══ */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-card shrink-0 gap-3 flex-wrap">
        {/* left: nav + filter toggle */}
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
          <button onClick={() => setAnchor(new Date())} className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted transition-colors">Today</button>
          <button onClick={() => nav(1)} className="p-1.5 rounded-lg border border-border hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
          <span className="text-sm font-bold text-foreground ml-1">{navLabel}</span>

          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
              ${showFilters ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            <Sliders className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">{activeFilterCount}</span>
            )}
          </button>

          {/* Declutter quick toggle */}
          <button onClick={() => setFilters(f => ({ ...f, showDeclutter: !f.showDeclutter }))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
              ${filters.showDeclutter ? "border-amber-500 bg-amber-50 text-amber-700" : "border-border text-muted-foreground hover:bg-muted"}`}>
            {filters.showDeclutter ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {filters.showDeclutter ? "Decluttered" : "Declutter"}
          </button>
        </div>

        {/* right: view toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          {VIEW_OPTS.map(({ id, icon, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors
                ${view === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Type Filters */}
      <QuickTypeFilters
        selected={filters.eventTypes}
        onToggle={(t) => setFilters(f => ({ ...f, eventTypes: f.eventTypes.includes(t) ? f.eventTypes.filter(x => x !== t) : [...f.eventTypes, t] }))}
        onClear={() => setFilters(f => ({ ...f, eventTypes: [] }))}
      />

      {/* errors */}
      {errors.map((e, i) => e && <ErrMsg key={i} msg={e} />)}

      {/* ══ BODY: sidebar + main ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* FILTER SIDEBAR */}
        {showFilters && (
          <FilterSidebar filters={filters} onChange={setFilters} properties={properties} resources={resources} onClose={() => setShowFilters(false)} />
        )}

        {/* MAIN VIEW */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading && filteredEvents.length === 0 && <Spin />}

          {view === "Month" && (
            <MonthView events={filteredEvents} anchor={anchor}
              onSlotClick={date => setQuickCreate({ date })}
              onEventClick={setSelectedEv}
              onEventDrop={handleEventDrop} />
          )}
          {view === "Week" && (
            <WeekView events={filteredEvents} anchor={wkStart}
              onSlotClick={(date, time) => setQuickCreate({ date, time })}
              onEventClick={setSelectedEv}
              onEventDrop={handleEventDrop} />
          )}
          {view === "Grid" && (
            <GridView events={filteredEvents} onEventClick={setSelectedEv} />
          )}
          {view === "Resource" && (
            <ResourceView events={filteredEvents} resources={resources} anchor={wkStart}
              onSlotClick={(date, resourceKey) => setQuickCreate({ date, resourceKey })}
              onEventClick={setSelectedEv}
              onEventDrop={handleEventDrop} />
          )}
        </div>
      </div>

      {/* QUICK CREATE MODAL */}
      {quickCreate && (
        <QuickCreateModal
          date={quickCreate.date}
          time={quickCreate.time}
          resourceKey={quickCreate.resourceKey}
          properties={properties}
          resources={resources}
          assets={assets}
          clients={clients}
          contracts={contracts}
          onClose={() => setQuickCreate(null)}
          onCreated={() => { setQuickCreate(null); refetchAll(); }}
        />
      )}

      {/* EVENT DETAIL MODAL */}
      {selectedEv && <EventDetail ev={selectedEv} onClose={() => setSelectedEv(null)} />}
    </div>
  );
}