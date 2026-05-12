import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import {
  Search, Plus, Filter, MapPin, Zap, CheckCircle2, ChevronDown, ChevronUp,
  MoreVertical, Pencil, Camera, Send, Link2, QrCode, Copy, X,
  Clock, Mail, Smartphone, MessageSquare, FileText, ChevronRight, ChevronLeft,
  RefreshCw, AlertCircle, Loader2, Activity, Plus as PlusIcon, RotateCcw,
  ArrowRight, ExternalLink, Eye, Trash2, Settings, Globe, Shield,
  Edit3, Package, Building2,
} from "lucide-react";
import { Switch } from "../components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../components/ui/sheet";
import { showToast } from "../components/ui/toast";
import { toast as sonnerToast } from "sonner";

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS
═══════════════════════════════════════════ */

const FRAPPE_BASE = ""; // same-origin; set to "https://your-site.com" if cross-origin

type FrappeFilters = [string, string, string | number | boolean][];

async function frappeGet<T>(
  doctype: string,
  fields: string[],
  filters: FrappeFilters = [],
  orderBy = "",
  limit = 0
): Promise<T[]> {
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: String(limit || 500),
    ...(orderBy ? { order_by: orderBy } : {}),
  });
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}?${params}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`GET ${doctype} failed: ${res.statusText}`);
  const json = await res.json();
  return json.data as T[];
}

async function frappeGetDoc<T>(doctype: string, name: string): Promise<T> {
  const res = await fetch(
    `${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error(`GET ${doctype}/${name} failed: ${res.statusText}`);
  const json = await res.json();
  return json.data as T;
}

async function frappeCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.exc_type || `POST ${doctype} failed`);
  }
  const json = await res.json();
  return json.data as T;
}

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Frappe-CSRF-Token": getCsrfToken(),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.exc_type || `PUT ${doctype} failed`);
  }
  const json = await res.json();
  return json.data as T;
}

async function frappeDelete(doctype: string, name: string): Promise<void> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "X-Frappe-CSRF-Token": getCsrfToken() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.exc_type || `DELETE ${doctype} failed`);
  }
}

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;)\s*(csrf_token|X-Frappe-CSRF-Token)=([^;]+)/);
  const cookieToken = match ? decodeURIComponent(match[2]) : "";
  const windowToken = typeof window !== "undefined" ? (window as any).csrf_token : "";
  return cookieToken || windowToken || "";
}

/* ═══════════════════════════════════════════
   TYPES — mirrors Frappe doctypes
═══════════════════════════════════════════ */

interface SRListItem {
  name: string;
  sr_number: string;
  sr_title: string;
  status: string;
  priority_actual: string;
  branch_code?: string;
  branch_name?: string;
  property_code?: string;
  property_name?: string;
  business_type?: string;
  zone_code?: string;
  zone_name?: string;
  sub_zone_code?: string;
  sub_zone_name?: string;
  base_unit_code?: string;
  base_unit_name?: string;
  client_code: string;
  client_name?: string;
  raised_date: string;
  raised_time?: string;
  wo_source: string;
  response_sla_status?: string;
  resolution_sla_status?: string;
  converted_to_wo?: 0 | 1;
  photo?: string;
  location_full_path?: string;
  requested_by?: string;
}

interface SRDetail extends SRListItem {
  sr_number: string;
  contract_code?: string;
  contract_group?: string;
  sub_zone_code?: string;
  base_unit_code?: string;
  asset_code?: string;
  service_group?: string;
  fault_category?: string;
  fault_code?: string;
  priority_default?: string;
  priority_change_reason?: string;
  approval_criticality?: string;
  reported_by?: string;
  contact_phone?: string;
  requester_email?: string;
  notification_email?: 0 | 1;
  notification_sms?: 0 | 1;
  special_instructions?: string;
  raised_date: string;
  wo_source: string;
  appointment_date?: string;
  preferred_datetime?: string;
  location_full_path?: string;
  work_description?: string;
  response_sla_target?: string;
  resolution_sla_target?: string;
  business_type?: string;
  response_sla_actual?: string;
  resolution_sla_actual?: string;
  customer_rating?: string;
  remarks?: string;
  initiator_type?: string;
  reporting_level?: string;
  amended_from?: string;
}



interface RequestPortal {
  name: string;
  portal_name: string;
  description?: string;
  preset_property?: string;
  preset_property_name?: string;
  preset_asset?: string;
  preset_asset_name?: string;
  notification_email?: string;
  is_active?: 0 | 1;
  portal_token: string;
  creation?: string;
  modified?: string;
}

interface FrappeOption { value: string; label: string; }

interface VersionEntry {
  name: string;
  owner: string;
  creation: string;
  data: string; /* JSON string */
}

interface ActivityItem {
  id: string;
  user: string;
  action: "updated" | "created" | "worklog" | "comment" | "status";
  timestamp: string;
  changes?: { field: string; from: string; to: string }[];
  message?: string;
  subject?: string;
}

/* ═══════════════════════════════════════════
   REUSABLE HOOKS
═══════════════════════════════════════════ */

function useFrappeList<T>(
  doctype: string,
  fields: string[],
  filters: FrappeFilters,
  deps: unknown[],
  skip = false
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await frappeGet<T>(doctype, fields, filters);
      setData(rows);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useFrappeDoc<T>(doctype: string, name: string, refreshKey = 0, skip = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name || skip) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    frappeGetDoc<T>(doctype, name)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctype, name, skip, refreshKey]);

  return { data, loading, error };
}

/* ═══════════════════════════════════════════
   COLOUR / BADGE MAPS
═══════════════════════════════════════════ */

const statusColor: Record<string, string> = {
  Open: "text-emerald-600", "In Progress": "text-blue-600",
  "Pending Approval": "text-amber-600", Converted: "text-violet-600",
  Closed: "text-muted-foreground", Cancelled: "text-red-500",
};
const statusDot: Record<string, string> = {
  Open: "bg-emerald-500", "In Progress": "bg-blue-500",
  "Pending Approval": "bg-amber-500", Converted: "bg-violet-500",
  Closed: "bg-gray-400", Cancelled: "bg-red-400",
};
const statusBadge: Record<string, string> = {
  Open: "bg-emerald-100 text-emerald-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Pending Approval": "bg-amber-100 text-amber-700",
  Converted: "bg-violet-100 text-violet-700",
  Closed: "bg-muted text-muted-foreground",
  Cancelled: "bg-red-100 text-red-700",
};
const priorityClass: Record<string, string> = {
  "P1 - Critical": "badge-critical", "P2 - High": "badge-high",
  "P3 - Medium": "badge-medium", "P4 - Low": "badge-low",
};
const priorityShort: Record<string, string> = {
  "P1 - Critical": "Critical", "P2 - High": "High",
  "P3 - Medium": "Medium", "P4 - Low": "Low",
};
const slaBadge: Record<string, string> = {
  Pending: "bg-amber-100 text-amber-700",
  Met: "bg-emerald-100 text-emerald-700", // Handle legacy backend values
  Fulfilled: "bg-emerald-100 text-emerald-700",
  Breached: "bg-red-100 text-red-700",
};

/* ═══════════════════════════════════════════
   HELPER COMPONENTS
═══════════════════════════════════════════ */

function generateID(prefix: string) {
  const now = new Date();
  const date = now.toISOString().split("T")[0].replace(/-/g, "");
  const time = now.toTimeString().split(" ")[0].replace(/:/g, "");
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}-${date}-${time}-${rand}`;
}

function Field({
  label, value, link, badge, badgeClass,
}: { label: string; value?: string | null; link?: boolean; badge?: boolean; badgeClass?: string }) {
  return (
    <div className="flex flex-col py-3 px-4 hover:bg-muted/30 transition-all rounded-xl group border border-transparent hover:border-border/50">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">{label}</span>
      <div className="flex items-center">
        {badge ? (
          <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${badgeClass}`}>{value || "—"}</span>
        ) : link ? (
          <span className="text-sm text-primary font-semibold cursor-pointer hover:underline decoration-primary/30 underline-offset-4 flex items-center gap-1.5">
            {value || "—"}
            {value && <Link2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </span>
        ) : (
          <span className="text-sm text-foreground font-semibold break-words">{value || "—"}</span>
        )}
      </div>
    </div>
  );
}

function FrappeSelect({
  label, value, onChange, options, placeholder, required, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: FrappeOption[]; placeholder?: string; required?: boolean; disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      >
        <option value="">{placeholder || `Select ${label}…`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function FrappeInput({
  label, value, onChange, placeholder, required, type = "text", disabled
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-foreground mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:bg-muted"
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg mx-4 my-3">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-semibold text-destructive underline">Retry</button>
      )}
    </div>
  );
}

/* Helper functions */
function normalizeSlaStatus(status?: string): string {
  if (!status) return status || "";
  // Convert backend "Met" to display "Fulfilled"
  return status === "Met" ? "Fulfilled" : status;
}

function timeAgo(dateStr: string, timeStr?: string): string {
  if (!dateStr) return "—";

  try {
    const base = timeStr ? `${dateStr}T${timeStr}` : dateStr;
    const date = new Date(base);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "—";
    }

    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60_000);

    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  } catch (error) {
    return "—";
  }
}

const ACTIVITY_ICON_CFG: Record<ActivityItem["action"], { icon: React.ReactNode; bg: string; text: string }> = {
  updated: { icon: <RotateCcw className="w-4 h-4" />, bg: "bg-sky-100", text: "text-sky-600" },
  created: { icon: <PlusIcon className="w-4 h-4" />, bg: "bg-emerald-100", text: "text-emerald-600" },
  worklog: { icon: <FileText className="w-4 h-4" />, bg: "bg-violet-100", text: "text-violet-600" },
  comment: { icon: <MessageSquare className="w-4 h-4" />, bg: "bg-amber-100", text: "text-amber-600" },
  status: { icon: <Activity className="w-4 h-4" />, bg: "bg-blue-100", text: "text-blue-600" },
};

function parseVersionData(entry: VersionEntry): ActivityItem {
  let changes: { field: string; from: string; to: string }[] = [];
  let action: ActivityItem["action"] = "updated";
  let message: string | undefined;
  let subject: string | undefined;

  try {
    const data = JSON.parse(entry.data);
    if (data.changed) {
      changes = data.changed.map(([field, from, to]: [string, string, string]) => ({
        field: field.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        from: from ?? "---", to: to ?? "---",
      }));
    }
    if (data.doctype === "Comment") { action = "comment"; message = data.content; }
    else if (data.doctype === "Worklog") { action = "worklog"; message = data.content; subject = data.subject; }
    else if (changes.some(c => c.field.toLowerCase().includes("status"))) { action = "status"; }
  } catch { /* ignore parse errors */ }

  return { id: entry.name, user: entry.owner || "System", action, timestamp: entry.creation, changes, message, subject };
}

/* ═══════════════════════════════════════════════════════════════
   QR CODE HELPER — inline SVG-based, zero dependencies
   Encodes a URL as a standard QR code placeholder image via
   the open-source api.qrserver.com endpoint
═══════════════════════════════════════════════════════════════ */

function QRDisplay({ url, size = 120 }: { url: string; size?: number }) {
  const encoded = encodeURIComponent(url);
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=2&format=svg`;
  return (
    <img
      src={src}
      alt="QR Code"
      width={size}
      height={size}
      className="rounded-xl border border-border shadow-sm bg-white"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════
   PORTAL FORM — Create / Edit a Request Portal
═══════════════════════════════════════════════════════════════ */

interface PortalFormData {
  portal_name: string;
  description: string;
  preset_property: string;
  preset_asset: string;
  notification_email: string;
  is_active: boolean;
}

const BLANK_PORTAL: PortalFormData = {
  portal_name: "", description: "", preset_property: "",
  preset_asset: "", notification_email: "", is_active: true,
};

function PortalForm({
  editPortal, onClose, onSaved,
}: {
  editPortal?: RequestPortal;
  onClose: () => void;
  onSaved: (portal: RequestPortal) => void;
}) {
  const [form, setForm] = useState<PortalFormData>(
    editPortal
      ? {
        portal_name: editPortal.portal_name,
        description: editPortal.description || "",
        preset_property: editPortal.preset_property || "",
        preset_asset: editPortal.preset_asset || "",
        notification_email: editPortal.notification_email || "",
        is_active: editPortal.is_active !== 0,
      }
      : BLANK_PORTAL
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof PortalFormData) => (v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  const { data: properties } = useFrappeList<{ name: string; property_name: string }>(
    "Property", ["name", "property_name"], [["is_active", "=", "1"]], []
  );
  const { data: assets } = useFrappeList<{ name: string; asset_code: string; asset_name: string }>(
    "CFAM Asset", ["name", "asset_code", "asset_name"],
    form.preset_property ? [["property_code", "=", form.preset_property], ["asset_status", "=", "Active"]] : [["asset_status", "=", "Active"]],
    [form.preset_property]
  );

  const handleSubmit = async () => {
    if (!form.portal_name.trim()) { setErr("Portal name is required."); return; }
    setSaving(true); setErr(null);
    try {
      const token = editPortal?.portal_token || `portal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      const payload: Partial<RequestPortal> = {
        portal_name: form.portal_name.trim(),
        description: form.description || undefined,
        preset_property: form.preset_property || undefined,
        preset_asset: form.preset_asset || undefined,
        notification_email: form.notification_email || undefined,
        is_active: (form.is_active ? 1 : 0) as 0 | 1,
        portal_token: token,
      };
      let result: RequestPortal;
      if (editPortal) {
        result = await frappeUpdate<RequestPortal>("Request Portal", editPortal.name, payload);
      } else {
        result = await frappeCreate<RequestPortal>("Request Portal", payload);
      }
      onSaved(result);
    } catch (e: unknown) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-foreground">
          {editPortal ? "Edit Portal" : "Create Request Portal"}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {err && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {err}
        </div>
      )}

      <div className="space-y-4">
        {/* Portal Name */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            Portal Name <span className="text-destructive">*</span>
          </label>
          <input
            value={form.portal_name}
            onChange={(e) => set("portal_name")(e.target.value)}
            placeholder="e.g. Lobby Request Portal"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description")(e.target.value)}
            rows={2}
            placeholder="Describe what this portal is for…"
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Preset Location */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            <MapPin className="w-3 h-3 inline mr-1 text-muted-foreground" />
            Preset Location
          </label>
          <select
            value={form.preset_property}
            onChange={(e) => { set("preset_property")(e.target.value); set("preset_asset")(""); }}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Any location (not preset)</option>
            {properties.map((p) => (
              <option key={p.name} value={p.name}>{p.property_name}</option>
            ))}
          </select>
        </div>

        {/* Preset Asset */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            <Package className="w-3 h-3 inline mr-1 text-muted-foreground" />
            Preset Asset
          </label>
          <select
            value={form.preset_asset}
            onChange={(e) => set("preset_asset")(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={!form.preset_property}
          >
            <option value="">Any asset (not preset)</option>
            {assets.map((a) => (
              <option key={a.name} value={a.name}>{a.asset_code} — {a.asset_name}</option>
            ))}
          </select>
          {!form.preset_property && (
            <p className="text-[10px] text-muted-foreground mt-1">Select a location first to filter assets.</p>
          )}
        </div>

        {/* Notification Email */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1.5">
            <Mail className="w-3 h-3 inline mr-1 text-muted-foreground" />
            Notification Email
          </label>
          <input
            type="email"
            value={form.notification_email}
            onChange={(e) => set("notification_email")(e.target.value)}
            placeholder="ops-team@yourcompany.com"
            className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Receive an email each time someone submits via this portal.</p>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold text-foreground">Portal Active</p>
              <p className="text-[10px] text-muted-foreground">Inactive portals reject submissions</p>
            </div>
          </div>
          <button
            onClick={() => set("is_active")(!form.is_active)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_active ? "bg-primary" : "bg-muted-foreground/30"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow ${form.is_active ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-3 mt-5 pt-4 border-t border-border">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : editPortal ? "Update Portal" : "Create Portal"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PORTAL CARD — shows each portal in the drawer
═══════════════════════════════════════════════════════════════ */

const PORTAL_BASE_URL = typeof window !== "undefined" ? `${window.location.origin}/portal` : "/portal";

function PortalCard({
  portal,
  onEdit,
  onDelete,
  onToggle,
}: {
  portal: RequestPortal;
  onEdit: (p: RequestPortal) => void;
  onDelete: (name: string) => void;
  onToggle: (p: RequestPortal) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const portalUrl = `${PORTAL_BASE_URL}/${portal.portal_token}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback for http */
      const ta = document.createElement("textarea");
      ta.value = portalUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-xl border ${portal.is_active === 0 ? "border-border bg-muted/20 opacity-70" : "border-border bg-card"} p-4 mb-3 transition-all`}>
      <div className="flex items-start gap-3">
        {/* QR icon / preview toggle */}
        <button
          onClick={() => setShowQR((v) => !v)}
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-all ${showQR ? "border-primary bg-primary/5" : "border-border bg-muted/40 hover:bg-muted"}`}
          title="Show / hide QR code"
        >
          <QrCode className={`w-5 h-5 ${showQR ? "text-primary" : "text-muted-foreground"}`} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{portal.portal_name}</p>
              {portal.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{portal.description}</p>
              )}
            </div>
            {/* active indicator */}
            <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${portal.is_active !== 0 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${portal.is_active !== 0 ? "bg-emerald-500" : "bg-gray-400"}`} />
              {portal.is_active !== 0 ? "Active" : "Inactive"}
            </span>
          </div>

          {/* preset chips */}
          {(portal.preset_property_name || portal.preset_asset_name) && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {portal.preset_property_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-semibold text-blue-700">
                  <MapPin className="w-2.5 h-2.5" /> {portal.preset_property_name}
                </span>
              )}
              {portal.preset_asset_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-50 border border-violet-200 text-[10px] font-semibold text-violet-700">
                  <Package className="w-2.5 h-2.5" /> {portal.preset_asset_name}
                </span>
              )}
              {portal.notification_email && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-semibold text-amber-700">
                  <Mail className="w-2.5 h-2.5" /> Notify
                </span>
              )}
            </div>
          )}

          {/* actions */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <button
              onClick={copyLink}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              {copied ? <><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ExternalLink className="w-3 h-3" /> Open
            </a>
            <button
              onClick={() => onEdit(portal)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={() => onToggle(portal)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${portal.is_active !== 0 ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"}`}
            >
              {portal.is_active !== 0 ? <><Eye className="w-3 h-3" /> Deactivate</> : <><Globe className="w-3 h-3" /> Activate</>}
            </button>
            <button
              onClick={() => onDelete(portal.name)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* QR Code panel */}
      {showQR && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col items-center gap-3">
          <QRDisplay url={portalUrl} size={140} />
          <div className="text-center">
            <p className="text-[10px] font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg break-all">{portalUrl}</p>
            <p className="text-[9px] text-muted-foreground mt-1">Scan to open portal · No login required</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   REQUEST PORTALS DRAWER — full MaintainX-style
═══════════════════════════════════════════════════════════════ */

function RequestPortalsDrawer({ onClose }: { onClose: () => void }) {
  const { data: portals, loading, error, refetch } = useFrappeList<RequestPortal>(
    "Request Portal",
    ["name", "portal_name", "description", "preset_property", "preset_property_name",
      "preset_asset", "preset_asset_name", "notification_email", "is_active", "portal_token", "creation"],
    [],
    []
  );
  const [editPortal, setEditPortal] = useState<RequestPortal | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [searchPortal, setSearchPortal] = useState("");

  const filteredPortals = useMemo(() =>
    portals.filter((p) =>
      !searchPortal ||
      p.portal_name.toLowerCase().includes(searchPortal.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchPortal.toLowerCase())
    ),
    [portals, searchPortal]
  );

  const handleDelete = async (name: string) => {
    if (!window.confirm("Delete this portal? Existing links will stop working.")) return;
    setDeletingName(name);
    try {
      await frappeDelete("Request Portal", name);
      refetch();
    } catch { /* silent */ }
    finally { setDeletingName(null); }
  };

  const handleToggle = async (portal: RequestPortal) => {
    try {
      await frappeUpdate("Request Portal", portal.name, {
        is_active: (portal.is_active !== 0 ? 0 : 1) as 0 | 1,
      } as Partial<RequestPortal>);
      refetch();
    } catch { /* silent */ }
  };

  const handleSaved = (saved: RequestPortal) => {
    setShowForm(false);
    setEditPortal(undefined);
    refetch();
  };

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* drawer */}
      <div className="fixed right-0 top-0 h-full w-[460px] bg-card border-l border-border z-50 shadow-2xl flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Request Portals</h2>
              <p className="text-[11px] text-muted-foreground">{portals.length} portal{portals.length !== 1 ? "s" : ""} configured</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Refresh">
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* form mode */}
        {showForm ? (
          <div className="flex-1 overflow-y-auto">
            <PortalForm
              editPortal={editPortal}
              onClose={() => { setShowForm(false); setEditPortal(undefined); }}
              onSaved={handleSaved}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* description + features */}
            <div className="px-5 pt-4 pb-3 border-b border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Request Portals are customizable web-based forms where <strong>anyone</strong> can submit a
                request for your facility — no app or login required.
              </p>
              <div className="grid grid-cols-1 gap-1.5 mb-4">
                {[
                  { icon: <Link2 className="w-3.5 h-3.5 text-primary" />, text: "Shared via unique link or QR code" },
                  { icon: <MapPin className="w-3.5 h-3.5 text-primary" />, text: "Linked to a preset Asset or Location" },
                  { icon: <Mail className="w-3.5 h-3.5 text-primary" />, text: "Receive email notifications for each submission" },
                  { icon: <Shield className="w-3.5 h-3.5 text-primary" />, text: "Activate / deactivate without deleting the link" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-foreground">
                    {icon} {text}
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setEditPortal(undefined); setShowForm(true); }}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Create Request Portal
              </button>
            </div>

            {/* search portals */}
            {portals.length > 0 && (
              <div className="px-5 py-3 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    value={searchPortal}
                    onChange={(e) => setSearchPortal(e.target.value)}
                    placeholder="Search portals…"
                    className="w-full pl-8 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* portal list */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              )}
              {error && (
                <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </div>
              )}
              {!loading && !error && filteredPortals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-4 text-muted-foreground">
                  <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                    <QrCode className="w-8 h-8 opacity-50" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {searchPortal ? "No portals match" : "No portals yet"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchPortal ? "Try a different search" : "Create your first portal above"}
                    </p>
                  </div>
                </div>
              )}
              {!loading && filteredPortals.map((portal) => (
                <PortalCard
                  key={portal.name}
                  portal={portal}
                  onEdit={(p) => { setEditPortal(p); setShowForm(true); }}
                  onDelete={handleDelete}
                  onToggle={handleToggle}
                />
              ))}
            </div>

            {/* stats footer */}
            {!loading && portals.length > 0 && (
              <div className="px-5 py-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />{portals.filter((p) => p.is_active !== 0).length} active</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" />{portals.filter((p) => p.is_active === 0).length} inactive</span>
                <span className="ml-auto">{portals.length} total portals</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}


function ActivitySidebar({ srName, onClose }: { srName: string; onClose: () => void }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!srName) return;
    let cancelled = false;
    setLoading(true);
    frappeGet<VersionEntry>(
      "Version",
      ["name", "owner", "creation", "data"],
      [["ref_doctype", "=", "Service Request"], ["docname", "=", srName]],
      "creation desc",
      100
    )
      .then(rows => {
        if (!cancelled) setItems(rows.map(r => parseVersionData(r)));
      })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [srName]);

  async function addNote() {
    if (!newNote.trim()) return;
    setPosting(true);
    try {
      await frappeCreate("Comment", {
        comment_type: "Comment",
        reference_doctype: "Service Request",
        reference_name: srName,
        content: newNote.trim(),
      });
      setNewNote("");
      // add optimistic entry
      setItems(prev => [{
        id: `local-${Date.now()}`, user: "You", action: "comment",
        timestamp: new Date().toISOString(), message: newNote.trim(),
      }, ...prev]);
    } catch { /* silent */ }
    finally { setPosting(false); }
  }

  return (
    <div className="w-[360px] min-w-[360px] border-l border-border bg-card flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Activity Log</h3>
            <p className="text-[11px] text-muted-foreground">{items.length} events</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* add note */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="Add a note or comment…"
            rows={2}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={addNote}
            disabled={!newNote.trim() || posting}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-1 self-end">
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><PlusIcon className="w-3.5 h-3.5" />Add</>}
          </button>
        </div>
      </div>

      {/* timeline */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        )}
        {error && <ErrorBanner message={error} />}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Activity className="w-8 h-8 opacity-40" />
            <p className="text-sm">No activity yet</p>
          </div>
        )}

        {!loading && items.map((item, idx) => {
          const iconCfg = ACTIVITY_ICON_CFG[item.action];
          const isLast = idx === items.length - 1;

          return (
            <div key={item.id} className="flex gap-3 group">
              {/* timeline spine */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-8 h-8 rounded-full ${iconCfg.bg} ${iconCfg.text} flex items-center justify-center mt-0.5`}>
                  {iconCfg.icon}
                </div>
                {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-1" style={{ minHeight: "20px" }} />}
              </div>

              {/* content */}
              <div className={`flex-1 min-w-0 ${!isLast ? "pb-4" : "pb-2"}`}>
                {/* meta row */}
                <div className="flex items-baseline gap-2 flex-wrap mb-1">
                  <span className="text-xs font-bold text-primary">{item.user}</span>
                  <span className="text-xs text-muted-foreground">{item.action}</span>
                  {item.subject && <span className="text-xs font-semibold text-foreground">{item.subject}</span>}
                  <span className="text-[11px] text-muted-foreground ml-auto">{timeAgo(item.timestamp)}</span>
                </div>

                {/* field changes */}
                {item.changes && item.changes.length > 0 && (
                  <div className="bg-muted/40 rounded-lg px-3 py-2 space-y-1.5">
                    {item.changes.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-1.5 text-xs flex-wrap">
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-primary">{c.field}</span>
                        <span className="text-muted-foreground">changed</span>
                        <span className="font-semibold text-foreground bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {c.from || "---"}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-mono">
                          {c.to || "---"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* message / worklog */}
                {item.message && (
                  <div className={`text-xs text-foreground rounded-lg px-3 py-2 leading-relaxed mt-1
                    ${item.action === "comment" ? "bg-amber-50 border border-amber-200" : "bg-violet-50 border border-violet-200"}`}>
                    {item.message}
                  </div>
                )}

                {/* timestamp tooltip */}
                <p className="text-[10px] text-muted-foreground mt-1">{new Date(item.timestamp).toLocaleString()}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   NEW REQUEST FORM
═══════════════════════════════════════════ */


interface NewSRForm {
  sr_title: string; wo_source: string; initiator_type: string;
  initiator_client: string; requested_by: string;
  raised_date: string;
  raised_time: string; client_code: string; contract_code: string;
  branch_code: string; branch_name: string;
  property_code: string; property_name: string;
  zone_code: string; zone_name: string;
  sub_zone_code: string; sub_zone_name: string;
  base_unit_code: string; base_unit_name: string;
  reporting_level: string; location_full_path: string;
  asset_code: string; service_group: string; fault_category: string; fault_code: string;
  priority_actual: string; approval_criticality: string; reported_by: string; contact_phone: string;
  requester_email: string; special_instructions: string; notification_email: boolean;
  notification_sms: boolean; appointment_date: string; preferred_datetime: string;
  _pending_photo?: File;
}

const BLANK_FORM: NewSRForm = {
  sr_title: "", wo_source: "Portal", initiator_type: "Client",
  initiator_client: "", requested_by: "",
  raised_date: new Date().toISOString().split("T")[0],
  raised_time: new Date().toTimeString().slice(0, 5), client_code: "", contract_code: "",
  branch_code: "", branch_name: "", property_code: "", property_name: "",
  zone_code: "", zone_name: "", sub_zone_code: "", sub_zone_name: "",
  base_unit_code: "", base_unit_name: "",
  location_full_path: "", reporting_level: "Property",
  asset_code: "", service_group: "", fault_category: "", fault_code: "",
  priority_actual: "P3 - Medium", approval_criticality: "Normal", reported_by: "", contact_phone: "",
  requester_email: "", special_instructions: "", notification_email: true,
  notification_sms: false, appointment_date: "", preferred_datetime: "",
};

function RequestForm({
  editName, onClose, onSaved,
}: { editName?: string; onClose: () => void; onSaved: (name: string) => void }) {
  const [form, setForm] = useState<NewSRForm>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const { data: existingDoc } = useFrappeDoc<SRDetail>("Service Request", editName || "");
  useEffect(() => {
    if (editName && existingDoc) {
      setForm({
        sr_title: existingDoc.sr_title || "",
        wo_source: existingDoc.wo_source || "",
        initiator_type: existingDoc.initiator_type || "",
        initiator_client: (existingDoc as any).initiator_client || "",
        requested_by: (existingDoc as any).requested_by || "",
        raised_date: existingDoc.raised_date || new Date().toISOString().split("T")[0],
        raised_time: existingDoc.raised_time ? (existingDoc.raised_time.split(':').map(p => p.padStart(2, '0')).join(':')) : "",
        client_code: existingDoc.client_code || "",
        contract_code: existingDoc.contract_code || "",
        branch_code: existingDoc.branch_code || "",
        branch_name: existingDoc.branch_name || "",
        property_code: existingDoc.property_code || "",
        property_name: existingDoc.property_name || "",
        zone_code: existingDoc.zone_code || "",
        zone_name: existingDoc.zone_name || "",
        sub_zone_code: existingDoc.sub_zone_code || "",
        sub_zone_name: existingDoc.sub_zone_name || "",
        base_unit_code: existingDoc.base_unit_code || "",
        base_unit_name: existingDoc.base_unit_name || "",
        location_full_path: existingDoc.location_full_path || "",
        reporting_level: existingDoc.reporting_level || "",
        asset_code: existingDoc.asset_code || "",
        service_group: existingDoc.service_group || "",
        fault_category: existingDoc.fault_category || "",
        fault_code: existingDoc.fault_code || "",
        priority_actual: existingDoc.priority_actual || "",
        approval_criticality: existingDoc.approval_criticality || "",
        reported_by: existingDoc.reported_by || "",
        contact_phone: existingDoc.contact_phone || "",
        requester_email: existingDoc.requester_email || "",
        special_instructions: existingDoc.special_instructions || "",
        notification_email: !!existingDoc.notification_email,
        notification_sms: !!existingDoc.notification_sms,
        appointment_date: existingDoc.appointment_date || "",
        preferred_datetime: existingDoc.preferred_datetime || "",
      });
      if (existingDoc.photo) setPreviewPhoto(existingDoc.photo);
    }
  }, [editName, existingDoc]);

  const set = (key: keyof NewSRForm) => (val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  /* ── linked list data ── */
  const { data: clients } = useFrappeList<{ name: string; client_name: string }>(
    "Client", ["name", "client_name"], [], []
  );
  const { data: contracts } = useFrappeList<{ name: string; contract_title: string }>(
    "FM Contract", ["name", "contract_title"],
    form.client_code ? [["client_code", "=", form.client_code]] : [],
    [form.client_code]
  );

  // Debug: Log contracts data to help diagnose empty dropdown
  console.log("Contracts data:", contracts, "Client code:", form.client_code);
  const { data: branches } = useFrappeList<{ name: string; branch_name: string; branch_code: string }>(
    "Branch", ["name", "branch_name", "branch_code"], [["is_active", "=", "1"]], []
  );
  const { data: properties } = useFrappeList<{ name: string; property_name: string; property_code: string }>(
    "Property", ["name", "property_name", "property_code"],
    [
      ...(form.branch_code ? [["branch_code", "=", form.branch_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.branch_code]
  );
  const { data: zones } = useFrappeList<{ name: string; zone_name: string; zone_code: string }>(
    "Zone", ["name", "zone_name", "zone_code"],
    [
      ...(form.property_code ? [["property_code", "=", form.property_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.property_code]
  );

  // Debug: Log zones data to help diagnose empty dropdown
  console.log("Zones data:", zones, "Property code:", form.property_code);
  const { data: subZones } = useFrappeList<{ name: string; sub_zone_name: string; sub_zone_code: string }>(
    "Sub Zone", ["name", "sub_zone_name", "sub_zone_code"],
    [
      ...(form.zone_code ? [["zone_code", "=", form.zone_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.zone_code]
  );

  // Debug: Log sub-zones data to help diagnose empty dropdown
  console.log("Sub-zones data:", subZones, "Zone code:", form.zone_code);
  const { data: baseUnits } = useFrappeList<{ name: string; base_unit_name: string; base_unit_code: string }>(
    "Base Unit", ["name", "base_unit_name", "base_unit_code"],
    [
      ...(form.sub_zone_code ? [["sub_zone_code", "=", form.sub_zone_code] as [string, string, string]] : []),
      ["is_active", "=", "1"],
    ],
    [form.sub_zone_code]
  );

  // Debug: Log base units data to help diagnose empty dropdown
  console.log("Base units data:", baseUnits, "Sub-zone code:", form.sub_zone_code);
  const { data: assets } = useFrappeList<{ name: string; asset_name: string; asset_code: string }>(
    "CFAM Asset", ["name", "asset_code", "asset_name"],
    [
      ...(form.property_code ? [["property_code", "=", form.property_code] as [string, string, string]] : []),
      ["asset_status", "=", "Active"],
    ],
    [form.property_code]
  );

  // Debug: Log assets data to help diagnose empty dropdown
  console.log("Assets data:", assets, "Property code:", form.property_code);
  const { data: faultCodes } = useFrappeList<{ name: string }>(
    "Fault Code", ["name"], [], []
  );

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

  /* cascade resets */
  const handleClientChange = (v: string) => {
    setForm((f) => ({ ...f, client_code: v, contract_code: "", branch_code: "", property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "", asset_code: "" }));
  };
  const handleBranchChange = (v: string) => {
    setForm((f) => ({ ...f, branch_code: v, property_code: "", zone_code: "", sub_zone_code: "", base_unit_code: "", asset_code: "" }));
  };
  const handlePropertyChange = (v: string) => {
    setForm((f) => ({ ...f, property_code: v, zone_code: "", sub_zone_code: "", base_unit_code: "", asset_code: "" }));
  };
  const handleZoneChange = (v: string) => {
    setForm((f) => ({ ...f, zone_code: v, sub_zone_code: "", base_unit_code: "" }));
  };
  const handleSubZoneChange = (v: string) => {
    setForm((f) => ({ ...f, sub_zone_code: v, base_unit_code: "" }));
  };
  const { data: users } = useFrappeList<{ name: string; full_name?: string }>(
    "User", ["name", "full_name"], [["enabled", "=", "1"]], []
  );
  const { data: resources } = useFrappeList<{ name: string; resource_name: string }>(
    "Resource", ["name", "resource_name"], [], []
  );

  const handleInitiatorTypeChange = async (v: string) => {
    setForm(f => ({ ...f, initiator_type: v, initiator_client: "", requested_by: "" }));
    if (v === "System") {
      // In a real app, get current user name from session
      setForm(f => ({ ...f, requested_by: "Current User" }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setSaveError("File size exceeds 5MB"); return; }
    setPreviewPhoto(URL.createObjectURL(file));
    setForm(f => ({ ...f, _pending_photo: file }));
  };

  const handleSubmit = async () => {
    if (!form.sr_title || !form.client_code || !form.contract_code || !form.property_code || !form.priority_actual || !form.wo_source) {
      setSaveError("Please fill all required fields (Title, Client, Contract, Property, Priority, Request Mode).");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { _pending_photo, ...formToSave } = form;

      const payload = {
        ...formToSave,
        ...(editName ? {} : { sr_number: generateID("SR") }),
        notification_email: (formToSave.notification_email ? 1 : 0) as 0 | 1,
        notification_sms: (formToSave.notification_sms ? 1 : 0) as 0 | 1,
        status: editName ? undefined : "Open",
      };

      if (!form._pending_photo && !previewPhoto) {
        (payload as any).photo = "";
      }

      const doc = editName
        ? await frappeUpdate<SRDetail>("Service Request", editName, payload)
        : await frappeCreate<SRDetail>("Service Request", payload);

      // 🎉 Professional toast notification for service request creation/update
      if (editName) {
        // Service Request Updated - Show professional success animation
        sonnerToast.success(
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <RotateCcw className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-sm text-white leading-tight">Service Request Updated</span>
              <span className="text-xs text-white/80 leading-tight">#{doc.name} • Updated successfully</span>
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
      } else {
        // Service Request Created - Show professional celebration animation
        sonnerToast.success(
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-pulse border-2 border-white" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-base text-white leading-tight">Service Request Created</span>
              <span className="text-sm text-white/80 leading-tight">#{doc.name} • Submitted successfully</span>
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
      }

      if (form._pending_photo) {
        setUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', form._pending_photo, form._pending_photo.name);
        uploadFormData.append('is_private', '0');
        uploadFormData.append('folder', 'Home/Attachments');
        uploadFormData.append('doctype', 'Service Request');
        uploadFormData.append('docname', doc.name);
        uploadFormData.append('fieldname', 'photo');

        const r = await fetch('/api/method/upload_file', {
          method: 'POST', body: uploadFormData, credentials: 'include',
          headers: { 'X-Frappe-CSRF-Token': getCsrfToken() }
        });

        if (r.ok) {
          const upJson = await r.json();
          const msg = upJson.message;
          const newUrl: string | null = msg && typeof msg === 'object'
            ? (msg.file_url ?? msg.file_name ?? null)
            : typeof msg === 'string' ? msg : null;

          if (newUrl) {
            try {
              await frappeUpdate('Service Request', doc.name, { photo: newUrl });
            } catch (err) {
              console.warn('Field update failed after upload:', err);
            }
          }
        } else {
          throw new Error('Image upload failed');
        }
        setUploading(false);
      }

      onSaved(doc.name);
    } catch (e: unknown) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false); setUploading(false);
    }
  };

  const toOpts = (arr: { name: string; label?: string }[], labelKey?: string): FrappeOption[] =>
    arr.map((r) => ({ value: r.name, label: (r as Record<string, string>)[labelKey || ""] || r.name }));

  const STEPS = ["Details", "Location", "Scheduling", "Photos"];

  return (
    <div className="max-w-2xl mx-auto py-4 px-6 fade-in">
      {/* premium step indicator */}
      <div className="flex items-center gap-0 mb-8 rounded-xl overflow-hidden border border-border shadow-sm">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`flex-1 py-2.5 text-xs font-bold text-center transition-all border-r border-border last:border-r-0
              ${step === i ? "bg-primary text-primary-foreground" : step > i ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
            <span className="mr-1.5 opacity-60">{i + 1}</span>{s}
          </button>
        ))}
      </div>

      {saveError && <ErrorBanner message={saveError} onRetry={() => setSaveError(null)} />}

      {/* Step 0 - Details */}
      {step === 0 && (
        <div className="fade-in space-y-5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">Request Subject</label>
            <input value={form.sr_title} onChange={e => set("sr_title")(e.target.value)} placeholder="e.g. Broken AC in Room 302..."
              className="w-full px-4 py-3 border border-border rounded-xl text-lg font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FrappeSelect
              label="Request Mode" value={form.wo_source} onChange={set("wo_source")} required
              options={["Portal", "Phone", "Email", "Mobile App", "On-Site", "System"].map((v) => ({ value: v, label: v }))}
            />
            <FrappeSelect
              label="Initiator Type" value={form.initiator_type} onChange={handleInitiatorTypeChange} required
              options={["Helpdesk", "Client", "Technician", "System", "Inspection"].map((v) => ({ value: v, label: v }))}
            />
          </div>

          <div className="space-y-4">
            {form.initiator_type === "Client" && (
              <FrappeSelect
                label="Client Name" value={form.initiator_client}
                onChange={(v) => {
                  const c = (clients as any[]).find(x => x.name === v);
                  setForm(f => ({ ...f, initiator_client: v, requested_by: c?.client_name || v }));
                }}
                options={toOpts(clients, "client_name")} required
              />
            )}

            {(form.initiator_type === "Helpdesk" || form.initiator_type === "Inspection") && (
              <FrappeSelect
                label={`Select ${form.initiator_type} User`} value={form.requested_by}
                onChange={(v) => set("requested_by")(v)}
                options={toOpts(users.map(u => ({ name: u.full_name || u.name, label: u.full_name || u.name })), "label")} required
              />
            )}

            {form.initiator_type === "Technician" && (
              <FrappeSelect
                label="Select Technician" value={form.requested_by}
                onChange={(v) => set("requested_by")(v)}
                options={toOpts(resources.map(r => ({ name: r.resource_name || r.name, label: r.resource_name || r.name })), "label")} required
              />
            )}

            {form.initiator_type === "System" && (
              <FrappeInput label="Requested By" value={form.requested_by} onChange={set("requested_by")} disabled />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FrappeInput label="Raised Date" value={form.raised_date} onChange={set("raised_date")} type="date" required />
            <FrappeInput label="Raised Time" value={form.raised_time} onChange={set("raised_time")} type="time" />
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border pb-2">Priority</p>
            <div className="flex gap-2">
              {["P1 - Critical", "P2 - High", "P3 - Medium", "P4 - Low"].map((p) => (
                <button key={p} type="button" onClick={() => set("priority_actual")(p)}
                  className={`flex-1 py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${form.priority_actual === p ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20" : "border-border text-foreground hover:border-primary/40"}`}>
                  {priorityShort[p]}
                </button>
              ))}
            </div>
          </div>
          <FrappeSelect
            label="Approval Criticality" value={form.approval_criticality} onChange={set("approval_criticality")}
            options={["Normal", "High", "Critical", "Emergency"].map((v) => ({ value: v, label: v }))}
          />
        </div>
      )}

      {/* Step 1 - Location & Asset */}
      {step === 1 && (
        <div className="fade-in space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Client & Location</p>
            <div className="grid grid-cols-2 gap-4">
              <FrappeSelect
                label="Client" value={form.client_code} onChange={handleClientChange} required
                options={toOpts(clients as { name: string; label?: string }[], "client_name")}
              />
              <FrappeSelect
                label="Contract" value={form.contract_code} onChange={set("contract_code")}
                options={toOpts(contracts as { name: string; label?: string }[], "contract_title")}
                disabled={!form.client_code}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FrappeSelect
                label="Branch" value={form.branch_code} onChange={handleBranchChange}
                options={(branches as { name: string; branch_name: string; branch_code: string }[]).map(b => ({ value: b.name, label: `${b.branch_code} — ${b.branch_name}` }))}
              />
              <FrappeSelect
                label="Property" value={form.property_code} onChange={handlePropertyChange} required
                options={(properties as { name: string; property_name: string; property_code: string }[]).map(p => ({ value: p.name, label: `${p.property_code} — ${p.property_name}` }))}
                disabled={!form.client_code && !form.branch_code}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FrappeSelect
                label="Zone" value={form.zone_code} onChange={handleZoneChange}
                options={(zones as { name: string; zone_name: string; zone_code: string }[]).map(z => ({ value: z.name, label: `${z.zone_code} — ${z.zone_name}` }))}
                disabled={!form.property_code}
              />
              <FrappeSelect
                label="Sub Zone" value={form.sub_zone_code} onChange={handleSubZoneChange}
                options={(subZones as { name: string; sub_zone_name: string; sub_zone_code: string }[]).map(s => ({ value: s.name, label: `${s.sub_zone_code} — ${s.sub_zone_name}` }))}
                disabled={!form.zone_code}
              />
            </div>
            <FrappeSelect
              label="Base Unit" value={form.base_unit_code} onChange={set("base_unit_code")}
              options={(baseUnits as { name: string; base_unit_name: string; base_unit_code: string }[]).map(bu => ({ value: bu.name, label: `${bu.base_unit_code} — ${bu.base_unit_name}` }))}
              disabled={!form.sub_zone_code}
            />
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Technical Details</p>
            <FrappeSelect
              label="Asset" value={form.asset_code} onChange={set("asset_code")}
              options={(assets as { name: string; asset_code: string; asset_name: string }[]).map((a) => ({
                value: a.name, label: `${a.asset_code} — ${a.asset_name}`,
              }))}
              disabled={!form.property_code}
            />
            <div className="grid grid-cols-2 gap-4">
              <FrappeInput label="Service Group" value={form.service_group} onChange={set("service_group")} placeholder="e.g. MEP, Civil" />
              <FrappeInput label="Fault Category" value={form.fault_category} onChange={set("fault_category")} placeholder="e.g. HVAC, Plumbing" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2 - Contact & Scheduling */}
      {step === 2 && (
        <div className="fade-in space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Reporter Information</p>
            <div className="grid grid-cols-2 gap-4">
              <FrappeInput label="Reported By" value={form.reported_by} onChange={set("reported_by")} placeholder="Name" />
              <FrappeInput label="Contact Phone" value={form.contact_phone} onChange={set("contact_phone")} type="tel" />
            </div>
            <FrappeInput label="Requester Email" value={form.requester_email} onChange={set("requester_email")} type="email" />
            <div className="mt-4">
              <label className="block text-xs font-semibold text-foreground mb-1.5">Special Instructions</label>
              <textarea
                value={form.special_instructions} onChange={(e) => set("special_instructions")(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none"
              />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Scheduling</p>
            <div className="grid grid-cols-2 gap-4">
              <FrappeInput label="Appointment Date" value={form.appointment_date} onChange={set("appointment_date")} type="date" />
              <FrappeInput label="Preferred Date/Time" value={form.preferred_datetime} onChange={set("preferred_datetime")} type="datetime-local" />
            </div>
            <div className="flex flex-col gap-3 mt-4 p-4 bg-muted/30 rounded-2xl border border-border">
              <label className="flex items-center gap-3 text-sm cursor-pointer font-medium">
                <input type="checkbox" checked={form.notification_email} onChange={(e) => set("notification_email")(e.target.checked)} className="rounded border-border w-4 h-4" />
                <Mail className="w-4 h-4 text-primary" /> Send Email Notification
              </label>
              <label className="flex items-center gap-3 text-sm cursor-pointer font-medium">
                <input type="checkbox" checked={form.notification_sms} onChange={(e) => set("notification_sms")(e.target.checked)} className="rounded border-border w-4 h-4" />
                <Smartphone className="w-4 h-4 text-emerald-500" /> Send SMS Notification
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 - Photos */}
      {step === 3 && (
        <div className="fade-in space-y-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-4 border-b border-border pb-2">Support Evidence</p>
          <div className="max-w-sm mx-auto space-y-3">
            <label className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-foreground">Reference Image</span>
              {previewPhoto && <button onClick={() => { setPreviewPhoto(null); setForm(f => ({ ...f, _pending_photo: undefined })) }} className="text-[10px] font-bold text-destructive hover:underline uppercase tracking-tighter">Remove</button>}
            </label>
            <div className="relative group">
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`border-2 rounded-2xl h-64 flex flex-col items-center justify-center gap-3 transition-all
                  ${previewPhoto ? 'border-primary/20 bg-primary/5 shadow-inner' : 'border-dashed border-border text-muted-foreground bg-muted/20 group-hover:bg-muted/40'}
                  ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Uploading...</span>
                  </div>
                ) : previewPhoto ? (
                  <img src={previewPhoto.startsWith('http') || previewPhoto.startsWith('blob:') ? previewPhoto : `http://facility.quantcloud.in${previewPhoto}`} className="w-full h-full object-cover rounded-xl" alt="Preview" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-4 rounded-full bg-background shadow-sm"><Camera className="w-8 h-8 text-primary" /></div>
                    <span className="text-sm font-bold text-foreground">Add or drag pictures</span>
                    <span className="text-[11px] text-muted-foreground">Click to upload reference image</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8 pt-4 border-t border-border">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-6 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep(step + 1)}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
            Next Section <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={saving || uploading}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {(saving || uploading) ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploading ? 'Uploading...' : 'Saving...'} </> : editName ? "Update Request" : <><Send className="w-4 h-4" /> Submit Service Request</>}
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════ */

function DetailView({ srName, onClose, onEdit, refreshKey = 0 }: { srName: string; onClose: () => void; onEdit: (name: string) => void; refreshKey?: number }) {
  const { data: sr, loading, error } = useFrappeDoc<SRDetail>("Service Request", srName, refreshKey);
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const [converting, setConverting] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdWorkOrderNumber, setCreatedWorkOrderNumber] = useState("");

  const togglePanel = (key: string) =>
    setCollapsedPanels((p) => ({ ...p, [key]: !p[key] }));

  const CollapsibleSection = ({ title, id, children, defaultOpen = true }: { title: string; id: string; children: React.ReactNode; defaultOpen?: boolean }) => {
    const isOpen = collapsedPanels[id] === undefined ? defaultOpen : !collapsedPanels[id];
    return (
      <div className="mb-5 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden">
        <button
          onClick={() => togglePanel(id)}
          className="w-full flex items-center justify-between px-5 py-4 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <span className="text-sm font-bold text-foreground tracking-tight">{title}</span>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border shadow-sm">
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`} />
          </div>
        </button>
        <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Maps a Service Request's wo_source value to a valid Work Orders wo_source.
   *
   * SR valid sources  : Portal | Phone | Email | Mobile App | On-Site | System
   * WO valid sources  : Service Request | PM Schedule | Project | Helpdesk |
   *                     Portal | Phone | Inspection | Manual
   *
   * Because this WO is always created FROM a Service Request, "Service Request"
   * is the default fallback for any SR source that has no direct WO equivalent.
   */
  const mapSRSourceToWOSource = (srSource: string): string => {
    // Clean and normalize the input
    const cleanSource = (srSource || "").trim();

    // For all SR sources being converted to WO, default to "Service Request"
    // since the WO is always created FROM a Service Request
    const validWOSources = ["", "Service Request", "PM Schedule", "Project", "Helpdesk", "Portal", "Phone", "Inspection", "Manual"];

    // Only allow direct mapping if the source is already a valid WO source
    if (validWOSources.includes(cleanSource)) {
      console.log(`Direct mapping: SR source "${cleanSource}" is already a valid WO source`);
      return cleanSource;
    }

    // For all other SR sources (including Mobile App, Email, On-Site, System, etc.)
    // map to "Service Request" since the WO originates from a Service Request
    console.log(`Fallback mapping: SR source "${cleanSource}" → WO source "Service Request"`);
    return "Service Request";
  };

  const handleConvertToWorkOrder = async () => {
    if (!sr || converting) return;

    setConverting(true);
    try {
      // Generate work order number
      const woNumber = generateID("WO");

      // Create work order payload from service request data
      const woPayload = {
        wo_number: woNumber,
        wo_title: sr.sr_title,
        wo_type: "Reactive Maintenance",
        wo_source: mapSRSourceToWOSource(sr.wo_source),
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
        sr_number: sr.sr_number,
        location_full_path: sr.location_full_path,
        work_done_notes: sr.work_description,
        response_sla_target: sr.response_sla_target,
        resolution_sla_target: sr.resolution_sla_target,
        initiator_type: sr.initiator_type,
        requested_by: (sr as any).requested_by,
      };

      // Create the work order
      const workOrder = await frappeCreate("Work Orders", woPayload);

      // Update the service request to mark as converted
      await frappeUpdate("Service Request", srName, {
        converted_to_wo: 1,
        status: "Converted",
        request_mode: mapSRSourceToWOSource(sr.wo_source) // Also update request_mode to valid value
      });

      // Show success animation
      setCreatedWorkOrderNumber(woNumber);
      setShowSuccessModal(true);

      // Close the detail view after animation
      setTimeout(() => {
        setShowSuccessModal(false);
        onClose();
      }, 3000);

    } catch (error) {
      console.error("Failed to convert to work order:", error);
      alert(`Failed to convert to work order: ${(error as Error).message}`);
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!sr) return null;

  return (
    <div className="fade-in bg-muted/10 min-h-full pb-10">
      {/* Premium Header Container */}
      <div className="relative px-6 py-8 border-b border-border bg-gradient-to-br from-card to-muted/30 overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold shadow-sm ${statusBadge[sr.status] || "bg-muted text-muted-foreground"}`}>
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${statusDot[sr.status] || "bg-gray-400"}`} />
                {sr.status}
              </span>
              <span className="text-sm font-semibold text-muted-foreground tracking-wide">{sr.sr_number}</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight leading-tight">{sr.sr_title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Activity toggle */}
            <button
              onClick={() => setShowActivity(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-all
                ${showActivity ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}>
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Activity</span>
            </button>
            <button
              onClick={() => onEdit(srName)}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border/60 hover:border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-all rounded-xl shadow-sm">
              <Pencil className="w-4 h-4 text-muted-foreground" /> Edit
            </button>
            {/* <button className="flex items-center gap-2 px-4 py-2 bg-background border border-border/60 hover:border-border text-sm font-semibold text-foreground hover:bg-muted/50 transition-all rounded-xl shadow-sm">
              <MoreVertical className="w-4 h-4 text-muted-foreground" /> Actions
            </button> */}
          </div>
        </div>
      </div>

      {/* Top Stat Cards Row */}
      <div className="px-6 py-6 border-b border-border bg-card">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Priority</div>
            <div className={`text-sm font-bold ${priorityClass[sr.priority_actual]}`}>{priorityShort[sr.priority_actual] || sr.priority_actual}</div>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Response SLA</div>
            <div className={`text-sm font-bold ${slaBadge[sr.response_sla_status || ""] || "text-muted-foreground"}`}>{normalizeSlaStatus(sr.response_sla_status) || "—"}</div>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Created</div>
            <div className="text-sm font-bold text-foreground">{sr.raised_date ? timeAgo(sr.raised_date, sr.raised_time) : "—"}</div>
          </div>
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-1">Initiator</div>
            <div className="text-sm font-bold text-foreground">{sr.initiator_type || "—"}</div>
          </div>
        </div>
      </div>

      <div className="flex h-full overflow-hidden">
        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-8 max-w-6xl mx-auto">
            <CollapsibleSection title="Request Details" id="details">
              <Field label="Approval Criticality" value={sr.approval_criticality} />
              <Field label="Request Mode" value={sr.wo_source} />
              <Field label="Converted to WO" value={sr.converted_to_wo ? "Yes" : "No"} />
            </CollapsibleSection>

            <CollapsibleSection title="Client & Facility" id="client_location">
              <Field label="Client" value={sr.client_name || sr.client_code} link />
              <Field label="Contract" value={sr.contract_code} link />
              <Field label="Contract Group" value={sr.contract_group} />
              <Field label="Branch" value={sr.branch_name || sr.branch_code} />
              <Field label="Property" value={sr.property_name || sr.property_code} link />
              <Field label="Zone" value={sr.zone_name || sr.zone_code} />
              <Field label="Sub Zone" value={sr.sub_zone_name || sr.sub_zone_code} />
              <Field label="Base Unit" value={sr.base_unit_name || sr.base_unit_code} />
              <Field label="Reporting Level" value={sr.reporting_level} />
              <Field label="Business Type" value={sr.business_type} />
              {sr.location_full_path && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 px-4 py-3 bg-muted/20 rounded-xl border border-border/50 mt-2 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/80 font-bold mb-0.5">Location Path</p>
                    <p className="text-sm font-medium text-foreground">{sr.location_full_path}</p>
                  </div>
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Asset & Fault Mapping" id="asset">
              <Field label="Asset" value={sr.asset_code} link />
              <Field label="Service Group" value={sr.service_group} />
              <Field label="Fault Category" value={sr.fault_category} />
              <Field label="Fault Code" value={sr.fault_code} />
              <Field label="Priority (Default)" value={sr.priority_default} />
              {sr.priority_change_reason && (
                <Field label="Priority Change Reason" value={sr.priority_change_reason} />
              )}
            </CollapsibleSection>

            <CollapsibleSection title="Reporter & Contact Information" id="reporter">
              <Field label="Requested By" value={(sr as any).requested_by} />
              <Field label="Reported By" value={sr.reported_by} />
              <Field label="Contact Phone" value={sr.contact_phone} />
              <Field label="Email" value={sr.requester_email} link />
              {sr.special_instructions && (
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-[11px] uppercase tracking-wider text-amber-600/80 font-bold mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Special Instructions
                  </p>
                  <p className="text-sm text-foreground leading-relaxed font-medium">{sr.special_instructions}</p>
                </div>
              )}
            </CollapsibleSection>

            {sr.work_description && (
              <CollapsibleSection title="Work Description" id="desc">
                <div className="col-span-1 sm:col-span-2 lg:col-span-3 px-4 py-2">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{sr.work_description}</p>
                </div>
              </CollapsibleSection>
            )}

            <CollapsibleSection title="Photo Evidence" id="photos">
              <div className="col-span-1 sm:col-span-2 lg:col-span-3 px-4 py-2 flex justify-center">
                <div className="border border-border rounded-xl overflow-hidden max-w-sm w-full">
                  {sr.photo
                    ? <img src={sr.photo.startsWith('http') || sr.photo.startsWith('blob:') ? sr.photo : `http://facility.quantcloud.in${sr.photo}`} alt="Service Request Photo" className="w-full h-48 object-cover" />
                    : <div className="h-48 bg-muted/40 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <Camera className="w-6 h-6" /><p className="text-xs">No photo uploaded</p>
                    </div>}
                  <div className="px-3 py-2 bg-muted/30 border-t border-border text-center">
                    <p className="text-xs font-semibold text-foreground">Reference Image</p>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="SLA & Scheduling" id="sla" defaultOpen={false}>
              <Field label="Appointment Date" value={sr.appointment_date} />
              <Field label="Preferred Date & Time" value={sr.preferred_datetime} />
              <Field label="Response SLA Target" value={sr.response_sla_target} />
              <Field label="Response SLA Actual" value={sr.response_sla_actual} />
              <Field label="Resolution SLA Target" value={sr.resolution_sla_target} />
              <Field label="Resolution SLA Actual" value={sr.resolution_sla_actual} />
            </CollapsibleSection>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              {/* Notifications Panel */}
              <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-5">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" /> Notification Settings
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">Email Notifications</span>
                    </div>
                    <Switch checked={!!sr.notification_email} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">SMS Notifications</span>
                    </div>
                    <Switch checked={!!sr.notification_sms} />
                  </div>
                </div>
              </div>

              {/* Internal Notes Panel */}
              <div className="bg-card border border-border/60 rounded-2xl shadow-sm p-5 flex flex-col">
                <h3 className="text-sm font-bold text-foreground mb-3">Internal Notes</h3>
                <textarea
                  className="w-full flex-1 px-4 py-3 border border-border/50 rounded-xl text-sm bg-muted/10 hover:bg-muted/20 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors resize-none"
                  placeholder="Add internal notes for your team here..."
                />
              </div>
            </div>

            {(sr.customer_rating || sr.remarks) && (
              <CollapsibleSection title="Closure & Feedback" id="closure">
                <Field label="Customer Rating" value={sr.customer_rating} />
                <Field label="Remarks" value={sr.remarks} />
              </CollapsibleSection>
            )}

            {!sr.converted_to_wo && (
              <div className="mt-8 mb-4">
                <button
                  onClick={handleConvertToWorkOrder}
                  disabled={converting}
                  className="w-full relative group overflow-hidden py-4 rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary to-primary/80" />
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary/80 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <span className="relative z-10 flex items-center justify-center gap-2 text-primary-foreground">
                    {converting ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : <>Convert to Work Order <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" /></>}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── ACTIVITY SIDEBAR ── */}
        {showActivity && (
          <ActivitySidebar srName={srName} onClose={() => setShowActivity(false)} />
        )}
      </div>

      {/* SUCCESS ANIMATION MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative">
            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="confetti-container">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece absolute w-2 h-2 animate-bounce"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
                      animationDelay: `${Math.random() * 0.5}s`,
                      animationDuration: `${1 + Math.random() * 0.5}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Success card */}
            <div className="relative bg-white rounded-3xl p-12 shadow-2xl animate-scaleIn mx-4 max-w-sm w-full">
              {/* Animated checkmark */}
              <div className="flex justify-center mb-6">
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-pulse">
                  <svg
                    className="w-10 h-10 text-white animate-checkmark"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>

              {/* Success text */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2 animate-slideUp">
                  Work Order Created!
                </h2>
                <p className="text-gray-600 mb-4 animate-slideUp" style={{ animationDelay: '0.1s' }}>
                  Your service request has been successfully converted
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full font-semibold animate-slideUp" style={{ animationDelay: '0.2s' }}>
                  <span className="text-xs">WO#</span>
                  <span className="font-mono">{createdWorkOrderNumber}</span>
                </div>
              </div>

              {/* Loading dots */}
              <div className="flex justify-center gap-2 mt-6 animate-slideUp" style={{ animationDelay: '0.3s' }}>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN COMPONENT ──
═══════════════════════════════════════════ */

export default function Requests() {
  const [searchParams] = useSearchParams();
  const { scope, canDo } = usePermissions();
  const scopeFilters = scope.filtersFor("Service Request") as FrappeFilters;
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<"all" | "open" | "closed">("all");
  const [showPortals, setShowPortals] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editName, setEditName] = useState<string | null>(null);

  /* ── dynamic filter state ── */
  const [filterAsset, setFilterAsset] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [activeFilterKey, setActiveFilterKey] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  /* close dropdown on outside click */
  useEffect(() => {
    if (!activeFilterKey) return;
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setActiveFilterKey(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [activeFilterKey]);

  const toggleSection = (key: string) =>
    setCollapsedSections((p) => ({ ...p, [key]: !p[key] }));

  /* ── fetch SR list ── */
  const openStatuses = ["Open", "In Progress", "Pending Approval"];
  const closedStatuses = ["Converted", "Closed", "Cancelled"];

  const statusFilter =
    tab === "open"
      ? openStatuses
      : tab === "closed"
        ? closedStatuses
        : [...openStatuses, ...closedStatuses]; // ALL


  // const { data: srList, loading: listLoading, error: listError, refetch } = useFrappeList<SRListItem>(
  //   "Service Request",
  //   ["name", "sr_number", "sr_title", "status", "priority_actual", "photo", "location_full_path",
  //     "branch_code", "branch_name", "property_code", "property_name", "client_code", "client_name",
  //     "raised_date", "raised_time", "wo_source", "zone_code",
  //     "response_sla_status", "resolution_sla_status", "converted_to_wo", "requested_by"],
  //   [["status", "in", statusFilter.join(",")]],
  //   [tab]
  // );
  const scopeReady = scope.isResolved;

  const { data: srList, loading: listLoading, error: listError, refetch } = useFrappeList<SRListItem>(
    "Service Request",
    [
      "name", "sr_number", "sr_title", "status", "priority_actual", "photo", "location_full_path",
      "branch_code", "branch_name", "property_code", "property_name", "client_code", "client_name",
      "raised_date", "raised_time", "wo_source", "zone_code",
      "response_sla_status", "resolution_sla_status", "converted_to_wo", "requested_by",
    ],
    // ↓ merge scope filters with the existing status filter
    [["status", "in", statusFilter.join(",")], ...scopeFilters],
    // ↓ add scope to deps
    [tab, scopeReady, JSON.stringify(scopeFilters)]
  );

  /* ── derive unique filter options from live data ── */
  const allBranches = useMemo(() => Array.from(new Set(srList.map((r) => r.branch_name || r.branch_code).filter(Boolean))) as string[], [srList]);
  const allLocations = useMemo(() => Array.from(new Set(srList.map((r) => r.property_name || r.property_code).filter(Boolean))) as string[], [srList]);
  const allPriorities = useMemo(() => Array.from(new Set(srList.map((r) => r.priority_actual).filter(Boolean))) as string[], [srList]);
  const allStatuses = useMemo(() => Array.from(new Set(srList.map((r) => r.status).filter(Boolean))) as string[], [srList]);
  const allSources = useMemo(() => Array.from(new Set(srList.map((r) => r.wo_source).filter(Boolean))) as string[], [srList]);

  const activeFiltersCount = [filterBranch, filterAsset, filterLocation, filterPriority, filterStatus, filterSource].filter(Boolean).length;

  const clearAllFilters = () => {
    setFilterBranch(""); setFilterAsset(""); setFilterLocation(""); setFilterPriority("");
    setFilterStatus(""); setFilterSource(""); setActiveFilterKey(null);
  };

  /* filter by search + active chip filters */
  const filtered = srList.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        r.sr_title?.toLowerCase().includes(q) ||
        r.sr_number?.toLowerCase().includes(q) ||
        r.client_name?.toLowerCase().includes(q) ||
        r.property_name?.toLowerCase().includes(q);
      if (!matchSearch) return false;
    }
    if (filterBranch && (r.branch_name || r.branch_code) !== filterBranch) return false;
    if (filterLocation && (r.property_name || r.property_code) !== filterLocation) return false;
    if (filterPriority && r.priority_actual !== filterPriority) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterSource && r.wo_source !== filterSource) return false;
    return true;
  });

  /* handle URL parameter for specific request selection */
  useEffect(() => {
    const requestParam = searchParams.get('request');
    if (requestParam) {
      const decodedRequest = decodeURIComponent(requestParam);
      const foundRequest = filtered.find(r => r.name === decodedRequest);
      if (foundRequest) {
        setSelectedName(foundRequest.name);
        setShowForm(false);
      }
    }
  }, [searchParams, filtered]);

  /* select first on load */
  useEffect(() => {
    if (filtered.length > 0 && !selectedName && !showForm) {
      setSelectedName(filtered[0].name);
    }
  }, [filtered, selectedName, showForm]);

  /* ── request card ── */
  const RequestCard = ({ r }: { r: SRListItem }) => (
    <button
      onClick={() => { setSelectedName(r.name); setShowForm(false); }}
      className={`list-item-hover w-full text-left px-4 py-3 border-b border-border flex gap-3 ${selectedName === r.name && !showForm ? "selected" : ""}`}
    >
      <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 overflow-hidden transition-all group-hover:bg-muted/80">
        {r.photo ? (
          <img
            src={r.photo.startsWith('http') || r.photo.startsWith('blob:') ? r.photo : `http://facility.quantcloud.in${r.photo}`}
            className="w-full h-full object-cover"
            alt="SR"
          />
        ) : (
          <Camera className="w-5 h-5 text-muted-foreground/60" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{r.sr_title}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 max-w-full overflow-hidden">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{r.location_full_path || [r.property_name || r.property_code, r.zone_name || r.zone_code].filter(Boolean).join(" · ")}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`flex items-center gap-1 text-xs font-medium ${statusColor[r.status] || "text-muted-foreground"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot[r.status] || "bg-gray-400"}`} />
            {r.status}
          </span>
          <span className="text-xs text-muted-foreground">{r.sr_number}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={priorityClass[r.priority_actual] || "badge-low"}>
          {priorityShort[r.priority_actual] || r.priority_actual}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {r.raised_date ? timeAgo(r.raised_date, r.raised_time) : "—"}
        </span>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* ══ TOP BAR ══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
        <h1 className="text-2xl font-bold text-foreground">Requests</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPortals(true)}
            className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
          >
            <Link2 className="w-3.5 h-3.5" /> Request Portals
          </button>
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${listLoading ? "animate-spin" : ""}`} />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm bg-background w-56 focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search Requests…"
            />
          </div>
          {/* <button
            onClick={() => { setEditName(null); setShowForm(true); setSelectedName(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Request
          </button> */}
          {canDo("requests") && (
            <button
              onClick={() => { setShowForm(true); setEditName(null); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Request
            </button>
          )}

        </div>
      </div>

      {/* ══ DYNAMIC FILTER BAR ══ */}
      <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-card flex-wrap relative z-40" ref={filterRef}>
        {/* Filter label */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold select-none
          ${activeFiltersCount > 0 ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground bg-muted/30"}`}>
          <Filter className="w-3.5 h-3.5" /> Filters
          {activeFiltersCount > 0 && (
            <span className="ml-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {/* ─── Branch filter ─── */}
        {(() => {
          const key = "branch";
          const isOpen = activeFilterKey === key;
          const hasVal = !!filterBranch;
          return (
            <div className="relative">
              <button
                onClick={() => setActiveFilterKey(isOpen ? null : key)}
                className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-xs font-semibold transition-all
                  ${hasVal ? "border-primary bg-primary/8 text-primary" : "border-border text-foreground hover:bg-muted hover:border-primary/30"}`}
              >
                <Building2 className="w-3.5 h-3.5" />
                {hasVal ? (
                  <>
                    <span className="max-w-[120px] truncate">{filterBranch}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFilterBranch(""); setActiveFilterKey(null); }}
                      className="hover:text-destructive ml-0.5 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <><span>Branch</span><ChevronDown className="w-3 h-3 text-muted-foreground" /></>
                )}
              </button>
              {isOpen && (
                <div className="absolute top-8 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[200px] max-h-52 overflow-y-auto">
                  <button onClick={() => { setFilterBranch(""); setActiveFilterKey(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    All Branches
                  </button>
                  {allBranches.map((l) => (
                    <button key={l} onClick={() => { setFilterBranch(l); setActiveFilterKey(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-muted flex items-center justify-between ${filterBranch === l ? "text-primary font-semibold" : "text-foreground"}`}>
                      {l}
                      {filterBranch === l && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                  {allBranches.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No data yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── Location filter ─── */}
        {(() => {
          const key = "location";
          const isOpen = activeFilterKey === key;
          const hasVal = !!filterLocation;
          return (
            <div className="relative">
              <button
                onClick={() => setActiveFilterKey(isOpen ? null : key)}
                className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-xs font-semibold transition-all
                  ${hasVal ? "border-primary bg-primary/8 text-primary" : "border-border text-foreground hover:bg-muted hover:border-primary/30"}`}
              >
                <MapPin className="w-3.5 h-3.5" />
                {hasVal ? (
                  <>
                    <span className="max-w-[120px] truncate">{filterLocation}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFilterLocation(""); setActiveFilterKey(null); }}
                      className="hover:text-destructive ml-0.5 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <><span>Location</span><ChevronDown className="w-3 h-3 text-muted-foreground" /></>
                )}
              </button>
              {isOpen && (
                <div className="absolute top-8 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[200px] max-h-52 overflow-y-auto">
                  <button onClick={() => { setFilterLocation(""); setActiveFilterKey(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    All Locations
                  </button>
                  {allLocations.map((l) => (
                    <button key={l} onClick={() => { setFilterLocation(l); setActiveFilterKey(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-muted flex items-center justify-between ${filterLocation === l ? "text-primary font-semibold" : "text-foreground"}`}>
                      {l}
                      {filterLocation === l && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                  {allLocations.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No data yet</p>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── Priority filter ─── */}
        {(() => {
          const key = "priority";
          const isOpen = activeFilterKey === key;
          const hasVal = !!filterPriority;
          const priorityColors: Record<string, string> = {
            "P1 - Critical": "text-red-600", "P2 - High": "text-orange-600",
            "P3 - Medium": "text-amber-600", "P4 - Low": "text-emerald-600",
          };
          return (
            <div className="relative">
              <button
                onClick={() => setActiveFilterKey(isOpen ? null : key)}
                className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-xs font-semibold transition-all
                  ${hasVal ? "border-primary bg-primary/8 text-primary" : "border-border text-foreground hover:bg-muted hover:border-primary/30"}`}
              >
                <Zap className="w-3.5 h-3.5" />
                {hasVal ? (
                  <>
                    <span>{priorityShort[filterPriority] || filterPriority}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFilterPriority(""); setActiveFilterKey(null); }}
                      className="hover:text-destructive ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <><span>Priority</span><ChevronDown className="w-3 h-3 text-muted-foreground" /></>
                )}
              </button>
              {isOpen && (
                <div className="absolute top-8 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[160px]">
                  <button onClick={() => { setFilterPriority(""); setActiveFilterKey(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    All Priorities
                  </button>
                  {allPriorities.map((p) => (
                    <button key={p} onClick={() => { setFilterPriority(p); setActiveFilterKey(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-muted flex items-center justify-between ${filterPriority === p ? "bg-muted/50" : ""} ${priorityColors[p] || "text-foreground"}`}>
                      {priorityShort[p] || p}
                      {filterPriority === p && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                  {allPriorities.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No data yet</p>}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── Status filter ─── */}
        {(() => {
          const key = "status";
          const isOpen = activeFilterKey === key;
          const hasVal = !!filterStatus;
          return (
            <div className="relative">
              <button
                onClick={() => setActiveFilterKey(isOpen ? null : key)}
                className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-xs font-semibold transition-all
                  ${hasVal ? "border-primary bg-primary/8 text-primary" : "border-border text-foreground hover:bg-muted hover:border-primary/30"}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {hasVal ? (
                  <>
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDot[filterStatus] || "bg-gray-400"}`} />
                      {filterStatus}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); setFilterStatus(""); setActiveFilterKey(null); }}
                      className="hover:text-destructive ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <><span>Status</span><ChevronDown className="w-3 h-3 text-muted-foreground" /></>
                )}
              </button>
              {isOpen && (
                <div className="absolute top-8 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[180px]">
                  <button onClick={() => { setFilterStatus(""); setActiveFilterKey(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    All Statuses
                  </button>
                  {allStatuses.map((s) => (
                    <button key={s} onClick={() => { setFilterStatus(s); setActiveFilterKey(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-muted flex items-center justify-between
                        ${statusColor[s] || "text-foreground"} ${filterStatus === s ? "bg-muted/50" : ""}`}>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[s] || "bg-gray-400"}`} />
                        {s}
                      </span>
                      {filterStatus === s && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                  {allStatuses.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No data yet</p>}
                </div>
              )}
            </div>
          );
        })()}

        {/* ─── Source filter ─── */}
        {(() => {
          const key = "source";
          const isOpen = activeFilterKey === key;
          const hasVal = !!filterSource;
          return (
            <div className="relative">
              <button
                onClick={() => setActiveFilterKey(isOpen ? null : key)}
                className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border text-xs font-semibold transition-all
                  ${hasVal ? "border-primary bg-primary/8 text-primary" : "border-border text-foreground hover:bg-muted hover:border-primary/30"}`}
              >
                <Send className="w-3.5 h-3.5" />
                {hasVal ? (
                  <>
                    <span>{filterSource}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFilterSource(""); setActiveFilterKey(null); }}
                      className="hover:text-destructive ml-0.5">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </>
                ) : (
                  <><span>Source</span><ChevronDown className="w-3 h-3 text-muted-foreground" /></>
                )}
              </button>
              {isOpen && (
                <div className="absolute top-8 left-0 z-50 bg-card border border-border rounded-xl shadow-lg p-1 min-w-[160px]">
                  <button onClick={() => { setFilterSource(""); setActiveFilterKey(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                    All Sources
                  </button>
                  {allSources.map((s) => (
                    <button key={s} onClick={() => { setFilterSource(s); setActiveFilterKey(null); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-muted flex items-center justify-between text-foreground ${filterSource === s ? "bg-muted/50 text-primary font-semibold" : ""}`}>
                      {s}
                      {filterSource === s && <CheckCircle2 className="w-3 h-3 text-primary" />}
                    </button>
                  ))}
                  {allSources.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No data yet</p>}
                </div>
              )}
            </div>
          );
        })()}

        {/* clear all */}
        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/20 transition-all"
          >
            <X className="w-3 h-3" /> Clear all
          </button>
        )}

        {/* results count */}
        {activeFiltersCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground font-medium">
            {filtered.length}/{srList.length} requests
          </span>
        )}
      </div>

      {/* ══ BODY ══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT PANEL ── */}
        <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* tabs */}
          <div className="flex border-b border-border">
            {(["all", "open", "closed"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t === "all" ? "All" : t === "open" ? "Open" : "Closed"}
              </button>
            ))}
          </div>


          {/* sort hint */}
          <div className="px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
            Sort By: <span className="font-medium text-foreground">Raised Date: Newest First</span> <ChevronDown className="w-3 h-3" />
          </div>

          {/* list */}
          <div className="flex-1 overflow-y-auto">
            {listLoading && <LoadingSpinner />}
            {listError && <ErrorBanner message={listError} onRetry={refetch} />}
            {!listLoading && !listError && (
              <>
                {/* Assigned to Me — filtered as records where wo_source = "Portal" or any heuristic;
                    in production wire this to the logged-in user's assigned requests */}
                <button
                  onClick={() => toggleSection("me")}
                  className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide"
                >
                  <span>Assigned to Me ({filtered.filter((_, i) => i % 2 === 0).length})</span>
                  {collapsedSections.me
                    ? <ChevronRight className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {!collapsedSections.me &&
                  filtered.filter((_, i) => i % 2 === 0).map((r) => <RequestCard key={r.name} r={r} />)}

                <button
                  onClick={() => toggleSection("other")}
                  className="w-full flex items-center justify-between px-4 py-2 bg-muted/60 text-xs font-bold text-foreground uppercase tracking-wide"
                >
                  <span>Other Teams ({filtered.filter((_, i) => i % 2 !== 0).length})</span>
                  {collapsedSections.other
                    ? <ChevronRight className="w-3.5 h-3.5" />
                    : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
                {!collapsedSections.other &&
                  filtered.filter((_, i) => i % 2 !== 0).map((r) => <RequestCard key={r.name} r={r} />)}

                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                    <FileText className="w-8 h-8" />
                    <p className="text-sm">No requests found</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="border-t border-border py-3 text-center">
            <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer underline">
              All {tab === "all" ? "Requests" : tab === "open" ? "Open" : "Closed"} Requests ({filtered.length})
            </span>

          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-background">
          {selectedName ? (
            <DetailView
              srName={selectedName}
              onClose={() => setSelectedName(null)}
              onEdit={(name) => { setEditName(name); setShowForm(true); }}
              refreshKey={refreshKey}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MessageSquare className="w-10 h-10" />
              <p className="text-sm">Select a request to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Request Form Drawer */}
      <Sheet open={showForm} onOpenChange={setShowForm}>
        <SheetContent side="right" className="sm:max-w-[700px] p-0 overflow-y-auto">
          <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-20">
            <SheetTitle>{editName ? "Edit Service Request" : "New Service Request"}</SheetTitle>
            <SheetDescription>Form to create or edit a service request</SheetDescription>
          </SheetHeader>
          <RequestForm
            editName={editName || undefined}
            onClose={() => setShowForm(false)}
            onSaved={(name) => {
              setShowForm(false);
              refetch();
              setRefreshKey(k => k + 1);
              setSelectedName(name);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* ═══ REQUEST PORTALS DRAWER (dynamic) ═══ */}
      {showPortals && (
        <RequestPortalsDrawer onClose={() => setShowPortals(false)} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CUSTOM ANIMATIONS
═══════════════════════════════════════════ */

// Add these styles to your global CSS or in a style tag
const customStyles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes checkmark {
  0% {
    stroke-dasharray: 0 100;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 100 100;
    stroke-dashoffset: 0;
  }
  100% {
    stroke-dasharray: 100 100;
    stroke-dashoffset: 0;
  }
}

@keyframes confettiFall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s ease-out;
}

.animate-scaleIn {
  animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animate-slideUp {
  animation: slideUp 0.5s ease-out forwards;
  opacity: 0;
}

.animate-checkmark {
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: checkmark 0.6s ease-in-out 0.3s forwards;
}

.confetti-piece {
  animation: confettiFall 2s ease-in forwards;
}

.confetti-container {
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  pointer-events: none;
}
`;

// Inject styles into the document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = customStyles;
  document.head.appendChild(styleSheet);
}