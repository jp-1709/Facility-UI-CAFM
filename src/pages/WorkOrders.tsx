/**
 * WorkOrders.tsx
 * Facility-UI — Work Orders module
 * 100% dynamic from Frappe REST API. Schema: work_orders.json
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  Search, Plus, Filter, MapPin, ChevronDown, ChevronUp, ChevronRight,
  MoreVertical, Pencil, X, Loader2, AlertCircle, RefreshCw,
  Camera, User, Users, Calendar, Clock, DollarSign,
  Shield, FileText, CheckCircle2, Link2, MessageSquare,
  Lock, RotateCcw, Zap, Star, Trash2, Copy, ChevronLeft,
} from "lucide-react";

/* ═══════════════════════════════════════════
   FRAPPE API
═══════════════════════════════════════════ */
const FRAPPE_BASE = "";
type FF = [string, string, (string | number | (string | number)[])][];

async function frappeGet<T>(doctype: string, fields: string[], filters: FF = [], orderBy = "", limit = 500): Promise<T[]> {
  const p = new URLSearchParams({
    fields: JSON.stringify(fields), filters: JSON.stringify(filters),
    limit_page_length: String(limit), ...(orderBy ? { order_by: orderBy } : {}),
  });
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${p}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}: ${r.statusText}`);
  return (await r.json()).data as T[];
}

async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}/${name}: ${r.statusText}`);
  return (await r.json()).data as T;
}

async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { exc_type?: string }).exc_type || "Save failed"); }
  return (await r.json()).data as T;
}

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const r = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as { exc_type?: string }).exc_type || "Update failed"); }
  return (await r.json()).data as T;
}

function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════
   TYPES — mirrors work_orders.json
═══════════════════════════════════════════ */
interface WOListItem {
  name: string; wo_number?: string; wo_title: string;
  wo_type?: string; wo_sub_type?: string; wo_source?: string;
  status: string; actual_priority?: string; default_priority?: string;
  client_code?: string; client_name?: string;
  contract_code?: string; contract_group?: string;
  property_code?: string; property_name?: string;
  zone_code?: string; sub_zone_code?: string; base_unit_code?: string;
  asset_code?: string; asset_name?: string;
  asset_category?: string; asset_master_category?: string;
  service_group?: string; fault_category?: string; fault_code?: string;
  assigned_to?: string; assigned_technician?: string;
  secondary_tech?: string; secondary_technician_name?: string;
  schedule_start_date?: string; schedule_start_time?: string;
  schedule_end_time?: string; planned_duration_min?: number;
  actual_start?: string; actual_end?: string; labor_hours?: number;
  response_sla_target?: string; response_sla_actual?: string; response_sla_breach?: 0 | 1;
  resolution_sla_target?: string; resolution_sla_actual?: string; resolution_sla_breach?: 0 | 1;
  extension_date?: string; extension_reason?: string;
  spares_amount?: number; service_amount?: number; total_wo_cost?: number;
  work_done_notes?: string; customer_rating?: string;
  sr_number?: string; parent_wo_number?: string;
  location_full_path?: string; business_type?: string;
  reporting_level?: string; approval_criticality?: string;
  assignment_mode?: string; material_request_status?: string;
  closed_by?: string; final_approver?: string; amended_from?: string;
  creation?: string; modified?: string;
}

/* ═══════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════ */
function useList<T>(doctype: string, fields: string[], filters: FF, deps: unknown[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters, "schedule_start_date desc")); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useDoc<T>(doctype: string, name: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true); setError(null);
    frappeGetDoc<T>(doctype, name)
      .then(d => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctype, name]);
  return { data, loading, error };
}

function useSimpleList<T>(doctype: string, fields: string[], filters: FF, skip = false) {
  const [data, setData] = useState<T[]>([]);
  const fetch_ = useCallback(async () => {
    if (skip) return;
    try { setData(await frappeGet<T>(doctype, fields, filters)); }
    catch { /* silent */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctype, skip, JSON.stringify(filters)]);
  useEffect(() => { fetch_(); }, [fetch_]);
  return data;
}

/* ═══════════════════════════════════════════
   COLOUR MAPS
═══════════════════════════════════════════ */
const STATUS_FLOW = ["Open", "On Hold", "In Progress", "Completed"] as const;

const STATUS_CFG: Record<string, { bg: string; text: string; dot: string; icon: React.ReactNode }> = {
  Draft: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", icon: <Lock className="w-3.5 h-3.5" /> },
  Open: { bg: "bg-sky-100", text: "text-sky-700", dot: "bg-sky-500", icon: <RotateCcw className="w-3.5 h-3.5" /> },
  Assigned: { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", icon: <User className="w-3.5 h-3.5" /> },
  "In Progress": { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary", icon: <RotateCcw className="w-3.5 h-3.5" /> },
  "On Hold": { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", icon: <Clock className="w-3.5 h-3.5" /> },
  "Pending Parts": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500", icon: <Clock className="w-3.5 h-3.5" /> },
  "Not Dispatched": { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", icon: <Clock className="w-3.5 h-3.5" /> },
  "Pending Approval": { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", icon: <Shield className="w-3.5 h-3.5" /> },
  Completed: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Closed: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-gray-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  Cancelled: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500", icon: <X className="w-3.5 h-3.5" /> },
};

const PRIORITY_CFG: Record<string, { bg: string; text: string; label: string }> = {
  "P1 - Critical": { bg: "bg-red-500", text: "text-white", label: "Critical" },
  "P2 - High": { bg: "bg-orange-500", text: "text-white", label: "High" },
  "P3 - Medium": { bg: "bg-amber-400", text: "text-black", label: "Medium" },
  "P4 - Low": { bg: "bg-emerald-500", text: "text-white", label: "Low" },
};

const WO_TYPE_ICONS: Record<string, string> = {
  "Reactive Maintenance": "🔧", "Planned Preventive": "📋", "Project": "🏗️", "Inspection": "🔍", "Callout": "📞",
};

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function isOverdue(d?: string) { return !!d && new Date(d) < new Date(); }

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function Spinner() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
}
function ErrBanner({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 m-3 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-lg">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{msg}</span>
      {onRetry && <button onClick={onRetry} className="text-xs underline text-destructive">Retry</button>}
    </div>
  );
}
function PriBadge({ pri }: { pri?: string }) {
  if (!pri) return null;
  const c = PRIORITY_CFG[pri];
  if (!c) return null;
  return <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
}
function StatBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || STATUS_CFG["Draft"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{status}
    </span>
  );
}
function generateID(prefix: string) {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${date}-${time}-${rand}`;
}
function Avatar({ name, size = "sm" }: { name?: string; size?: "sm" | "md" }) {
  const initials = (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-sky-500"];
  const c = colors[(initials.charCodeAt(0) || 0) % colors.length];
  const sz = size === "md" ? "w-8 h-8 text-sm" : "w-6 h-6 text-[10px]";
  return <div className={`${sz} rounded-full ${c} flex items-center justify-center text-white font-bold shrink-0`}>{initials}</div>;
}

/* ═══════════════════════════════════════════
   WO CARD (left list)
═══════════════════════════════════════════ */
function WOCard({ wo, selected, onClick }: { wo: WOListItem; selected: boolean; onClick: () => void }) {
  const overdue = isOverdue(wo.schedule_start_date) && wo.status !== "Completed" && wo.status !== "Closed";
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-border flex gap-3 transition-colors
        ${selected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"}`}>
      {/* thumbnail */}
      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0 text-xl">
        {WO_TYPE_ICONS[wo.wo_type || ""] || "📋"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{wo.wo_title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          Requested by {wo.assigned_technician || wo.assigned_to || "—"}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${STATUS_CFG[wo.status]?.text || "text-muted-foreground"}`}>
            {STATUS_CFG[wo.status]?.icon}
            <span>{wo.status}</span>
            <ChevronDown className="w-3 h-3" />
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        {wo.assigned_to && <Avatar name={wo.assigned_technician || wo.assigned_to} />}
        <span className="text-[11px] text-muted-foreground font-mono">#{wo.wo_number || wo.name}</span>
        <div className="flex items-center gap-1 flex-wrap justify-end">
          {overdue && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white">Overdue</span>}
          <PriBadge pri={wo.actual_priority} />
        </div>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   STATUS CLICK-TO-UPDATE BAR (detail top)
═══════════════════════════════════════════ */
function StatusBar({ current, onChange }: { current: string; onChange: (s: string) => void }) {
  const steps = ["Open", "On Hold", "In Progress", "Completed"];
  return (
    <div className="flex items-center gap-2">
      {steps.map(s => {
        const c = STATUS_CFG[s];
        const active = current === s;
        return (
          <button key={s} onClick={() => onChange(s)}
            className={`flex flex-col items-center gap-1 px-5 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all
              ${active ? `border-primary bg-primary text-primary-foreground` : `border-border text-muted-foreground hover:border-primary/40`}`}>
            <span className="text-base">{c?.icon}</span>
            {s}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */
function DetailView({
  woName,
  onStatusChange,
}: {
  woName: string;
  onStatusChange: () => void;
}) {
  const { data: wo, loading, error } = useDoc<WOListItem>(
    "Work Orders",
    woName
  );

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!wo) return;

    setUpdatingStatus(true);

    try {
      await frappeUpdate("Work Orders", woName, {
        status: newStatus,
      });

      onStatusChange();
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePrint = () => {
    if (!wo) return;

    const win = window.open("", "", "width=900,height=700");

    if (!win) return;

    win.document.write(`
<html>

<head>

<title>Service Report</title>

<style>

body{
font-family: Arial;
padding:40px;
}

h2{
text-align:center;
margin-bottom:20px;
}

table{
width:100%;
border-collapse:collapse;
margin-bottom:20px;
}

td{
border:1px solid #ddd;
padding:8px;
font-size:13px;
}

.section-title{
background:#eee;
font-weight:bold;
padding:6px;
margin-top:20px;
}

img{
max-width:100%;
margin-top:15px;
page-break-inside:avoid;
}

footer{
margin-top:40px;
font-size:12px;
}

</style>

</head>

<body>

<h2>Service Report – Reactive Maintenance</h2>

<div class="section-title">Work Order Details</div>

<table>

<tr>
<td>Work Order</td>
<td>${wo.wo_number ?? "-"}</td>
<td>Status</td>
<td>${wo.status ?? "-"}</td>
</tr>

<tr>
<td>Priority</td>
<td>${wo.actual_priority ?? "-"}</td>
<td>Assigned To</td>
<td>${wo.assigned_technician ?? "-"}</td>
</tr>

<tr>
<td>Location</td>
<td>${wo.property_name ?? "-"}</td>
<td>Asset</td>
<td>${wo.asset_name ?? "-"}</td>
</tr>

<tr>
<td>Service Group</td>
<td>${wo.service_group ?? "-"}</td>
<td>Fault Category</td>
<td>${wo.fault_category ?? "-"}</td>
</tr>

<tr>
<td>Fault Code</td>
<td>${wo.fault_code ?? "-"}</td>
<td>Duration</td>
<td>${wo.planned_duration_min ?? "-"}</td>
</tr>

</table>


<div class="section-title">Description</div>

<p>
${wo.work_done_notes ?? "-"}
</p>


<div class="section-title">Time & Cost</div>

<table>

<tr>
<td>Spares</td>
<td>${wo.spares_amount ?? "-"}</td>
<td>Service Cost</td>
<td>${wo.service_amount ?? "-"}</td>
</tr>

<tr>
<td>Total Cost</td>
<td>${wo.total_wo_cost ?? "-"}</td>
<td>Labour Hours</td>
<td>${wo.labor_hours ?? "-"}</td>
</tr>

</table>


<footer>

This is a system generated service report and does not require signature.

</footer>

</body>

</html>
`);

    win.document.close();
    win.print();
  };

  if (loading) return <Spinner />;

  if (error) return <ErrBanner msg={error} />;

  if (!wo) return null;

  return (
    <div className="fade-in">
      {/* HEADER */}

      <div className="px-6 pt-5 pb-4 border-b border-border bg-card">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-foreground">
            {wo.wo_title}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
            >
              🖨 Print
            </button>

            <button
              onClick={() => setShowComments((v) => !v)}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted"
            >
              Comments
            </button>
          </div>
        </div>

        <StatusBar
          current={wo.status}
          onChange={handleStatusChange}
        />
      </div>

      {/* DETAILS */}

      <div className="px-6 py-5 space-y-4 text-sm">
        <div>
          <strong>Work Order:</strong>{" "}
          {wo.wo_number ?? "-"}
        </div>

        <div>
          <strong>Priority:</strong>{" "}
          {wo.actual_priority ?? "-"}
        </div>

        <div>
          <strong>Assigned Technician:</strong>{" "}
          {wo.assigned_technician ?? "-"}
        </div>

        <div>
          <strong>Location:</strong>{" "}
          {wo.property_name ?? "-"}
        </div>

        <div>
          <strong>Asset:</strong>{" "}
          {wo.asset_name ?? "-"}
        </div>

        <div>
          <strong>Service Group:</strong>{" "}
          {wo.service_group ?? "-"}
        </div>

        <div>
          <strong>Fault Category:</strong>{" "}
          {wo.fault_category ?? "-"}
        </div>

        <div>
          <strong>Fault Code:</strong>{" "}
          {wo.fault_code ?? "-"}
        </div>

        <div>
          <strong>Duration:</strong>{" "}
          {wo.planned_duration_min ?? "-"}
        </div>

        <div>
          <strong>Description:</strong>{" "}
          {wo.work_done_notes ?? "-"}
        </div>
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════
   NEW / EDIT WO FORM
═══════════════════════════════════════════ */
const SCHEDULE_FREQS = ["None", "Daily", "Weekly", "Monthly", "Yearly"] as const;
type SchedFreq = typeof SCHEDULE_FREQS[number];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WOForm {
  wo_title: string; wo_type: string; wo_sub_type: string; wo_source: string;
  client_code: string; contract_code: string;
  property_code: string; zone_code: string; sub_zone_code: string; base_unit_code: string;
  asset_code: string; service_group: string; fault_category: string; fault_code: string;
  actual_priority: string; approval_criticality: string;
  assigned_to: string; secondary_tech: string;
  schedule_start_date: string; schedule_start_time: string; schedule_end_time: string;
  planned_duration_min: string;
  sr_number: string;
  schedFreq: SchedFreq; schedDays: number[]; schedEvery: string;
  description: string; status: string;
}

const BLANK_FORM: WOForm = {
  wo_title: "", wo_type: "", wo_sub_type: "", wo_source: "",
  client_code: "", contract_code: "",
  property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "",
  asset_code: "", service_group: "", fault_category: "", fault_code: "",
  actual_priority: "", approval_criticality: "",
  assigned_to: "", secondary_tech: "",
  schedule_start_date: "", schedule_start_time: "", schedule_end_time: "",
  planned_duration_min: "", sr_number: "",
  schedFreq: "None", schedDays: [], schedEvery: "1",
  description: "", status: "Open",
};

function WOForm({ editName, onClose, onSaved }: { editName?: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [form, setForm] = useState<WOForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof WOForm) => (v: string | number[] | string[]) => setForm(f => ({ ...f, [k]: v }));

  /* existing doc for edit */
  const { data: existingDoc } = useDoc<WOListItem>("Work Orders", editName || "");
  useEffect(() => {
    if (editName && existingDoc) {
      setForm(f => ({
        ...f,
        wo_title: existingDoc.wo_title || "",
        wo_type: existingDoc.wo_type || "",
        wo_sub_type: existingDoc.wo_sub_type || "",
        wo_source: existingDoc.wo_source || "",
        client_code: existingDoc.client_code || "",
        contract_code: existingDoc.contract_code || "",
        property_code: existingDoc.property_code || "",
        zone_code: existingDoc.zone_code || "",
        asset_code: existingDoc.asset_code || "",
        service_group: existingDoc.service_group || "",
        fault_category: existingDoc.fault_category || "",
        actual_priority: existingDoc.actual_priority || "",
        approval_criticality: existingDoc.approval_criticality || "",
        assigned_to: existingDoc.assigned_to || "",
        secondary_tech: existingDoc.secondary_tech || "",
        schedule_start_date: existingDoc.schedule_start_date || "",
        schedule_start_time: existingDoc.schedule_start_time || "",
        schedule_end_time: existingDoc.schedule_end_time || "",
        planned_duration_min: existingDoc.planned_duration_min ? String(existingDoc.planned_duration_min) : "",
        status: existingDoc.status || "Open",
        description: existingDoc.work_done_notes || "",
      }));
    }
  }, [editName, existingDoc]);

  /* linked data */
  const clients = useSimpleList<{ name: string; client_name: string }>("Client", ["name", "client_name"], []);
  const properties = useSimpleList<{ name: string; property_code: string; property_name: string }>(
    "Property", ["name", "property_code", "property_name"], [["is_active", "=", 1]]);
  const zones = useSimpleList<{ name: string; zone_code: string; zone_name: string }>(
    "Zone", ["name", "zone_code", "zone_name"],
    form.property_code ? [["property_code", "=", form.property_code]] : [], !form.property_code);
  const subZones = useSimpleList<{ name: string; sub_zone_code: string; sub_zone_name: string }>(
    "Sub Zone", ["name", "sub_zone_code", "sub_zone_name"],
    form.zone_code ? [["zone_code", "=", form.zone_code]] : [], !form.zone_code);
  const assets = useSimpleList<{ name: string; asset_code: string; asset_name: string }>(
    "CFAM Asset", ["name", "asset_code", "asset_name"],
    form.property_code ? [["property_code", "=", form.property_code], ["asset_status", "=", "Active"]] : [], !form.property_code);
  const contracts = useSimpleList<{ name: string; contract_title: string }>(
    "FM Contract", ["name", "contract_title"],
    form.client_code ? [["client_code", "=", form.client_code], ["status", "=", "Active"]] : [], !form.client_code);
  const technicians = useSimpleList<{ name: string; resource_name: string }>("Resource", ["name", "resource_name"], []);
  const faultCodes = useSimpleList<{ name: string }>("Fault Code", ["name"], []);

  const toggleSchedDay = (d: number) => {
    const cur = form.schedDays as number[];
    set("schedDays")(cur.includes(d) ? cur.filter(x => x !== d) : [...cur, d]);
  };

  const handleSubmit = async () => {
    if (!form.wo_title || !form.actual_priority) { setErr("Title and Priority are required."); return; }
    setSaving(true); setErr(null);
    try {
      const payload: Partial<WOListItem> = {
        wo_number: editName ? undefined : generateID("WO"),
        wo_title: form.wo_title, wo_type: form.wo_type || undefined, wo_sub_type: form.wo_sub_type || undefined,
        wo_source: form.wo_source || undefined, client_code: form.client_code || undefined,
        contract_code: form.contract_code || undefined, property_code: form.property_code || undefined,
        zone_code: form.zone_code || undefined, sub_zone_code: form.sub_zone_code || undefined,
        base_unit_code: form.base_unit_code || undefined, asset_code: form.asset_code || undefined,
        service_group: form.service_group || undefined, fault_category: form.fault_category || undefined,
        fault_code: form.fault_code || undefined, actual_priority: form.actual_priority,
        approval_criticality: form.approval_criticality || undefined,
        assigned_to: form.assigned_to || undefined, secondary_tech: form.secondary_tech || undefined,
        schedule_start_date: form.schedule_start_date || undefined,
        schedule_start_time: form.schedule_start_time || undefined,
        schedule_end_time: form.schedule_end_time || undefined,
        planned_duration_min: form.planned_duration_min ? Number(form.planned_duration_min) : undefined,
        work_done_notes: form.description || undefined, status: form.status || "Open",
        sr_number: form.sr_number || (editName ? undefined : generateID("SR")),
      };
      let doc: WOListItem;
      if (editName) { doc = await frappeUpdate<WOListItem>("Work Orders", editName, payload); }
      else { doc = await frappeCreate<WOListItem>("Work Orders", payload); }
      onSaved(doc.name);
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const Inp = ({ label, fk, type = "text", placeholder, req }: { label: string; fk: keyof WOForm; type?: string; placeholder?: string; req?: boolean }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}{req && <span className="text-destructive ml-1">*</span>}</label>
      <input type={type} value={String(form[fk])} onChange={e => set(fk)(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
  const Sel = ({ label, fk, opts, req, disabled }: { label: string; fk: keyof WOForm; opts: { v: string; l: string }[]; req?: boolean; disabled?: boolean }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">{label}{req && <span className="text-destructive ml-1">*</span>}</label>
      <select value={String(form[fk])} onChange={e => set(fk)(e.target.value)} disabled={disabled}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
        <option value="">Select…</option>
        {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );

  const [showPrintModal, setShowPrintModal] = useState(false);

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 fade-in">
      {/* header */}

      <button
        onClick={() => setShowPrintModal(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
      >
        🖨 Print
      </button>
      <div className="flex items-center gap-2 mb-6">
        {editName && <button onClick={onClose} className="p-1 hover:bg-muted rounded"><ChevronLeft className="w-5 h-5" /></button>}
        <h2 className="text-xl font-bold text-foreground flex-1">{editName ? "Edit work order" : "New Work Order"}</h2>
        {!editName && <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5" /></button>}
      </div>

      {err && <ErrBanner msg={err} onRetry={() => setErr(null)} />}

      {/* WO Title — underline style like screenshot */}
      <div className="mb-5">
        <input value={form.wo_title} onChange={e => set("wo_title")(e.target.value)} placeholder="Work order title…"
          className="w-full px-0 py-2 border-0 border-b-2 border-primary text-lg font-semibold bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/50" />
      </div>

      {/* photo */}
      <div className="mb-5">
        <div className="border-2 border-dashed border-border rounded-xl py-10 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer bg-muted/10">
          <Camera className="w-6 h-6" />
          <span className="text-sm">Add or drag pictures</span>
        </div>
      </div>

      {/* Description */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-foreground mb-1.5">Description</label>
        <textarea value={form.description} onChange={e => set("description")(e.target.value)}
          rows={3} placeholder="Add a description"
          className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
      </div>

      {/* Procedure placeholder */}
      <div className="mb-5">
        <label className="block text-sm font-semibold text-foreground mb-2">Procedure</label>
        <div className="border border-border rounded-xl p-5 flex flex-col items-center gap-3 text-muted-foreground bg-muted/20">
          <p className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Create or attach new Form, Procedure or Checklist</p>
          <button className="px-4 py-2 border border-primary text-primary rounded-lg text-sm font-semibold hover:bg-primary/5 transition-colors">
            + Add Procedure
          </button>
        </div>
      </div>

      {/* Type & Source */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">WO Classification</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="WO Type" fk="wo_type" opts={["Reactive Maintenance", "Planned Preventive", "Project", "Inspection", "Callout"].map(v => ({ v, l: v }))} req />
        <Sel label="WO Sub Type" fk="wo_sub_type" opts={["Reactive Maintenance", "Planned Preventive", "Scheduled", "Emergency", "AdHoc"].map(v => ({ v, l: v }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="WO Source" fk="wo_source" opts={["Service Request", "PM Schedule", "Project", "Helpdesk", "Portal", "Phone", "Inspection", "Manual"].map(v => ({ v, l: v }))} />
        <Inp label="Service Request #" fk="sr_number" placeholder="SR-00001" />
      </div>

      {/* Assign to */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Assign to</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Primary Technician" fk="assigned_to"
          opts={technicians.map(t => ({ v: t.name, l: t.resource_name }))} req />
        <Sel label="Secondary Technician" fk="secondary_tech"
          opts={technicians.map(t => ({ v: t.name, l: t.resource_name }))} />
      </div>

      {/* Client & Contract */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Client & Contract</p>
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Client" fk="client_code" opts={clients.map(c => ({ v: c.name, l: c.client_name }))} req
        />
        <Sel label="Contract" fk="contract_code" opts={contracts.map(c => ({ v: c.name, l: c.contract_title }))}
          disabled={!form.client_code} />
      </div>

      {/* Location cascade */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Location</p>
      <Sel label="Property" fk="property_code" req
        opts={properties.map(p => ({ v: p.name, l: `${p.property_code} — ${p.property_name}` }))} />
      <div className="grid grid-cols-2 gap-3">
        <Sel label="Zone" fk="zone_code" opts={zones.map(z => ({ v: z.name, l: `${z.zone_code} — ${z.zone_name}` }))} disabled={!form.property_code} />
        <Sel label="Sub Zone" fk="sub_zone_code" opts={subZones.map(s => ({ v: s.name, l: `${s.sub_zone_code} — ${s.sub_zone_name}` }))} disabled={!form.zone_code} />
      </div>

      {/* Asset & Fault */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Asset & Fault</p>
      <Sel label="Asset" fk="asset_code"
        opts={assets.map(a => ({ v: a.name, l: `${a.asset_code} — ${a.asset_name}` }))} disabled={!form.property_code} />
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Service Group" fk="service_group" placeholder="MEP, Civil…" />
        <Inp label="Fault Category" fk="fault_category" placeholder="HVAC, Plumbing…" />
      </div>
      <Sel label="Fault Code" fk="fault_code" opts={faultCodes.map(f => ({ v: f.name, l: f.name }))} />

      {/* Due Date */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Due Date</p>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="Scheduled Start Date" fk="schedule_start_date" type="date" />
        <Inp label="Start Time" fk="schedule_start_time" type="time" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Inp label="End Time" fk="schedule_end_time" type="time" />
        <Inp label="Planned Duration (min)" fk="planned_duration_min" type="number" placeholder="120" />
      </div>

      {/* Schedule */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Schedule</p>
      <div className="mb-4">
        <div className="flex gap-2 mb-3">
          {SCHEDULE_FREQS.map(f => (
            <button key={f} onClick={() => set("schedFreq")(f)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                ${form.schedFreq === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
              {f}
            </button>
          ))}
        </div>
        {form.schedFreq === "Weekly" && (
          <div className="fade-in">
            <p className="text-sm text-foreground mb-2">Every <input type="number" value={form.schedEvery} onChange={e => set("schedEvery")(e.target.value)} className="w-12 border border-border rounded px-1 py-0.5 text-sm text-center mx-1" /> week on</p>
            <div className="flex gap-2 mb-2">
              {DAYS.map((d, i) => (
                <button key={d} onClick={() => toggleSchedDay(i)}
                  className={`w-10 h-10 rounded-full text-xs font-bold border-2 transition-all
                    ${(form.schedDays as number[]).includes(i) ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
                  {d}
                </button>
              ))}
            </div>
            {(form.schedDays as number[]).length > 0 && (
              <p className="text-xs text-muted-foreground">
                Repeats every {form.schedEvery} week on {(form.schedDays as number[]).map(d => DAYS[d]).join(", ")} after completion.
              </p>
            )}
          </div>
        )}
        {form.schedFreq === "Monthly" && (
          <p className="text-xs text-muted-foreground fade-in">Repeats every 1 month on the scheduled day of the month.</p>
        )}
      </div>

      {/* Priority */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Priority <span className="text-destructive">*</span></p>
      <div className="flex gap-2 mb-4">
        {["", "P4 - Low", "P3 - Medium", "P2 - High", "P1 - Critical"].map(p => {
          const label = p ? PRIORITY_CFG[p]?.label : "None";
          const active = form.actual_priority === p;
          return (
            <button key={p || "none"} onClick={() => set("actual_priority")(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                ${active ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground hover:border-primary/40"}`}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Status */}
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 mt-1">Status</p>
      <Sel label="" fk="status"
        opts={["Draft", "Open", "Assigned", "In Progress", "Pending Parts", "Not Dispatched", "Pending Approval", "Completed", "Closed", "Cancelled"].map(v => ({ v, l: v }))} />

      {/* Approval Criticality */}
      <Sel label="Approval Criticality" fk="approval_criticality"
        opts={["Normal", "High", "Critical", "Emergency"].map(v => ({ v, l: v }))} />

      <button onClick={handleSubmit} disabled={saving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-4">
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : editName ? "Update" : <><Plus className="w-4 h-4" />Create Work Order</>}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
type ListTab = "To Do" | "Done";
type SortKey = "Priority: Highest First" | "Creation Date: Newest First" | "Due Date: Soonest First";

const TODO_STATUSES = ["Draft", "Open", "Assigned", "In Progress", "Pending Parts", "Not Dispatched", "Pending Approval"];
const DONE_STATUSES = ["Completed", "Closed", "Cancelled"];

export default function WorkOrders() {
  const [tab, setTab] = useState<ListTab>("To Do");
  const { user } = useAuth();
  const [sort, setSort] = useState<SortKey>("Priority: Highest First");
  const [showSort, setShowSort] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editName, setEditName] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const sortRef = useRef<HTMLDivElement>(null);

  const statusFilter: FF = [[
    "status", "in",
    (tab === "To Do" ? TODO_STATUSES : DONE_STATUSES)
  ]];

  const { data: allWOs, loading, error, refetch } = useList<WOListItem>(
    "Work Orders",
    ["name", "wo_number", "wo_title", "wo_type", "wo_sub_type", "wo_source", "status",
      "actual_priority", "default_priority", "client_code", "client_name",
      "property_code", "property_name", "asset_code", "asset_name",
      "assigned_to", "assigned_technician", "secondary_tech", "secondary_technician_name",
      "schedule_start_date", "schedule_start_time", "planned_duration_min",
      "labor_hours", "spares_amount", "service_amount", "total_wo_cost",
      "response_sla_breach", "resolution_sla_breach", "sr_number", "creation", "modified"],
    statusFilter, [tab]
  );

  /* search */
  const filtered = allWOs.filter(wo => {
    if (!search) return true;
    const q = search.toLowerCase();
    return wo.wo_title?.toLowerCase().includes(q) ||
      wo.wo_number?.toLowerCase().includes(q) ||
      wo.property_name?.toLowerCase().includes(q) ||
      wo.assigned_technician?.toLowerCase().includes(q);
  });

  /* sort */
  const PRIORITY_ORDER: Record<string, number> = { "P1 - Critical": 0, "P2 - High": 1, "P3 - Medium": 2, "P4 - Low": 3, "": 4 };
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Priority: Highest First") return (PRIORITY_ORDER[a.actual_priority || ""] ?? 4) - (PRIORITY_ORDER[b.actual_priority || ""] ?? 4);
    if (sort === "Creation Date: Newest First") return (b.creation || "").localeCompare(a.creation || "");
    return (a.schedule_start_date || "").localeCompare(b.schedule_start_date || "");
  });

  /* group */
  const ME = "Assigned to You";
  const TEAM = "Assigned to Others";
  const ALL = "Unassigned / Others";
  
  const myWOs = sorted.filter(wo => (wo.assigned_to && wo.assigned_to === user?.email) || (wo.assigned_technician && wo.assigned_technician === user?.full_name));
  const teamWOs = sorted.filter(wo => !myWOs.includes(wo) && (wo.assigned_to || wo.assigned_technician));
  const restWOs = sorted.filter(wo => !myWOs.includes(wo) && !teamWOs.includes(wo));
  const groups = [[ME, myWOs], [TEAM, teamWOs], [ALL, restWOs]] as [string, WOListItem[]][];

  const toggleGroup = (k: string) => setCollapsedGroups(p => ({ ...p, [k]: !p[k] }));

  /* auto-select */
  useEffect(() => {
    if (sorted.length > 0 && !selectedName && !showForm) setSelectedName(sorted[0].name);
  }, [sorted, selectedName, showForm]);

  /* close sort dropdown on outside click */
  useEffect(() => {
    if (!showSort) return;
    const h = (e: MouseEvent) => { if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSort(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showSort]);

  const FILTER_CHIPS = [
    { icon: <Filter className="w-3.5 h-3.5" />, label: "Filters" },
    { icon: <User className="w-3.5 h-3.5" />, label: "Assigned To" },
    { icon: <Calendar className="w-3.5 h-3.5" />, label: "Due Date" },
    { icon: <MapPin className="w-3.5 h-3.5" />, label: "Location" },
    { icon: <Zap className="w-3.5 h-3.5" />, label: "Priority" },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Status" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Work Orders</h1>
          {/* view icons */}
          <div className="flex items-center gap-1 ml-1">
            {["⊞", "⊟", "▦"].map(ic => (
              <button key={ic} className="w-7 h-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground text-lg">{ic}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-64 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Work Orders…" />
          </div>
          <button onClick={() => { setShowForm(true); setEditName(undefined); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        </div>
      </div>

      {/* filter bar */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTER_CHIPS.map(({ icon, label }) => (
            <button key={label} className="filter-chip">{icon} {label}</button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
          <Star className="w-3.5 h-3.5" /> My Filters
        </button>
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT LIST ── */}
        <div className="w-[400px] min-w-[400px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* To Do / Done */}
          <div className="flex border-b border-border">
            {(["To Do", "Done"] as ListTab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors
                  ${tab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          {/* sort */}
          <div ref={sortRef} className="relative px-4 py-2 border-b border-border flex items-center justify-between text-xs">
            <button onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
              Sort By: <span className="font-semibold text-primary ml-1">{sort}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>
            {showSort && (
              <div className="absolute top-8 left-3 z-30 bg-card border border-border rounded-xl shadow-lg p-1 w-64 fade-in">
                {(["Priority: Highest First", "Creation Date: Newest First", "Due Date: Soonest First"] as SortKey[]).map(s => (
                  <button key={s} onClick={() => { setSort(s); setShowSort(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-muted ${sort === s ? "text-primary font-semibold" : ""}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {loading && <Spinner />}
            {error && <ErrBanner msg={error} onRetry={refetch} />}
            {!loading && !error && sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
                <FileText className="w-8 h-8" /><p className="text-sm">No work orders found</p>
              </div>
            )}
            {!loading && !error && groups.map(([groupName, items]) => (
              items.length === 0 ? null : (
                <div key={groupName}>
                  <button onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center justify-between px-4 py-2 bg-muted/40 border-b border-border text-xs font-bold text-foreground uppercase tracking-wide">
                    <span>{groupName} ({items.length})</span>
                    {collapsedGroups[groupName]
                      ? <ChevronRight className="w-3.5 h-3.5" />
                      : <ChevronUp className="w-3.5 h-3.5" />}
                  </button>
                  {!collapsedGroups[groupName] && items.map(wo => (
                    <WOCard key={wo.name} wo={wo}
                      selected={selectedName === wo.name && !showForm}
                      onClick={() => { setSelectedName(wo.name); setShowForm(false); setEditName(undefined); }} />
                  ))}
                </div>
              )
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {showForm ? (
            <WOForm editName={editName} onClose={() => { setShowForm(false); setEditName(undefined); }}
              onSaved={name => { setShowForm(false); setEditName(undefined); setSelectedName(name); refetch(); }} />
          ) : selectedName ? (
            <DetailView woName={selectedName}
              onStatusChange={() => { refetch(); }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <FileText className="w-10 h-10" />
              <p className="text-sm">Select a work order to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}