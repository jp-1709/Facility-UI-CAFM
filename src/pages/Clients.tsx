import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search, Plus, Filter, ChevronDown, ChevronRight,
  MoreVertical, Pencil, X, Loader2, AlertCircle, RefreshCw,
  Building2, CheckCircle, Users, Mail, Phone, MapPin, 
  Globe, Briefcase, Award, CreditCard, Send, Activity,
  ChevronLeft, Trash2, Check, Landmark, Shield
} from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

const CLIENT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes clientFadeUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes clientSlideR {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}

.c-fade-up   { animation: clientFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.c-slide-r   { animation: clientSlideR 0.22s cubic-bezier(.4,0,.2,1) both; }
.c-stagger > * { animation: clientFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.c-stagger > *:nth-child(1)  { animation-delay: 0ms; }
.c-stagger > *:nth-child(2)  { animation-delay: 50ms; }
.c-stagger > *:nth-child(3)  { animation-delay: 100ms; }
.c-stagger > *:nth-child(4)  { animation-delay: 150ms; }

.client-card-row { transition: background .14s; }
.client-card-row:hover .client-arrow { opacity: 1; transform: translateX(3px); }
.client-arrow { opacity: 0; transition: opacity .14s, transform .14s; }

.client-rich-card {
  position: relative;
  transition: transform 0.18s cubic-bezier(.22,1,.36,1),
              box-shadow 0.18s cubic-bezier(.22,1,.36,1),
              border-color 0.18s ease;
  will-change: transform;
  font-family: 'DM Sans', sans-serif;
}
.client-rich-card:hover {
  transform: translateY(-1px) scale(1.008);
  box-shadow: 0 6px 24px rgba(0,0,0,0.09), 0 1px 4px rgba(0,0,0,0.06);
}
.client-rich-card .card-shine {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
  opacity: 0; transition: opacity 0.2s;
}
.client-rich-card:hover .card-shine { opacity: 1; }
`;

function useClientStyles() {
  useEffect(() => {
    if (document.getElementById("client-css")) return;
    const s = document.createElement("style");
    s.id = "client-css";
    s.textContent = CLIENT_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ═══════════════════════════════════════════
   FRAPPE API HELPERS
   ═══════════════════════════════════════════ */

const FRAPPE_BASE = "";
type FrappeFilters = [string, string, string | number | boolean][];

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
    throw new Error(e.exc_type || "POST failed"); 
  }
  return (await res.json()).data as T;
}

async function frappeUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const res = await fetch(`${FRAPPE_BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": getCsrfToken() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Update failed");
  return (await res.json()).data as T;
}

function getCsrfToken() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

/* ═══════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════ */

function useFrappeList<T>(doctype: string, fields: string[], filters: FrappeFilters, deps: unknown[], skip = false, order_by?: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch_ = useCallback(async () => {
    if (skip) { setData([]); return; }
    setLoading(true); setError(null);
    try { setData(await frappeGet<T>(doctype, fields, filters, 500, order_by)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
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
      .catch((e: any) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [doctype, name, refreshKey]);
  return { data, loading, error };
}

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface ClientListItem {
  name: string;
  client_code: string;
  client_name: string;
  client_short_name?: string;
  industry?: string;
  sla_tier?: string;
  country?: string;
  city_code?: string;
  primary_contact?: string;
  contact_phone?: string;
  contact_email?: string;
  account_manager?: string;
  payment_terms?: string;
  preferred_request_mode?: string;
  is_active: 0 | 1;
}

/* ═══════════════════════════════════════════
   COLOUR / ICON MAPS
   ═══════════════════════════════════════════ */

const SLA_CFG: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Platinum: { bg: "bg-slate-100", text: "text-slate-700", dot: "bg-slate-400", border: "#64748b" },
  Gold: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", border: "#f59e0b" },
  Silver: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", border: "#9ca3af" },
  Bronze: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400", border: "#fb923c" },
};

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  Banking: <Landmark className="w-4 h-4" />,
  Insurance: <Shield className="w-4 h-4" />,
  "Real Estate": <Building2 className="w-4 h-4" />,
  Government: <Globe className="w-4 h-4" />,
  Healthcare: <Activity className="w-4 h-4" />,
  Retail: <CreditCard className="w-4 h-4" />,
  Other: <Briefcase className="w-4 h-4" />,
};

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

function SLABadge({ tier }: { tier?: string }) {
  if (!tier) return null;
  const c = SLA_CFG[tier] || SLA_CFG["Silver"];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} /> {tier}
    </span>
  );
}

function InfoRow({ label, value, link, mono }: { label: string; value?: string | null; link?: boolean; mono?: boolean }) {
  if (!value) return (
    <div className="flex flex-col py-1.5 border-b border-border/40 last:border-0 relative z-10 group">
      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/50 mb-0.5 transition-colors group-hover:text-muted-foreground">{label}</span>
      <span className="text-[12px] text-muted-foreground/30 font-medium">—</span>
    </div>
  );
  return (
    <div className="flex flex-col py-1.5 border-b border-border/40 last:border-0 relative z-10 group">
      <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/50 mb-0.5 transition-colors group-hover:text-muted-foreground/90">{label}</span>
      {link
        ? <span className="text-[12px] text-primary font-bold cursor-pointer hover:underline">{value}</span>
        : <span className={`text-[12px] font-bold text-foreground ${mono ? "font-mono text-[10px]" : ""}`}>{value}</span>}
    </div>
  );
}

function SectionCard({ title, icon, children, className }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`client-rich-card rounded-xl border border-border/70 bg-card overflow-hidden flex flex-col ${className || ""}`}>
      <div className="card-shine" />
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center gap-2 bg-gradient-to-r from-muted/30 to-transparent relative z-10 shrink-0">
        {icon && <div className="p-1 px-1.5 rounded-md bg-background border border-border/50 shadow-sm text-primary">{icon}</div>}
        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">{title}</p>
      </div>
      <div className="px-4 py-2 relative z-10">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR
   ═══════════════════════════════════════════ */

interface ClientStats { total: number; active: number; platinum: number; gold: number; }

function StatsBar({ stats, loading }: { stats: ClientStats; loading: boolean }) {
  const items = [
    { label: "Total Clients", value: stats.total, icon: <Users className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115", border: "#6366f130" },
    { label: "Active", value: stats.active, icon: <CheckCircle className="w-4 h-4" />, color: "#10b981", bg: "#10b98115", border: "#10b98130" },
    { label: "Platinum", value: stats.platinum, icon: <Award className="w-4 h-4" />, color: "#64748b", bg: "#64748b15", border: "#64748b30" },
    { label: "Gold Tier", value: stats.gold, icon: <Award className="w-4 h-4" />, color: "#f59e0b", bg: "#f59e0b15", border: "#f59e0b30" },
  ];

  return (
    <div className="flex items-stretch border-b border-border bg-card/80 backdrop-blur-sm c-stagger" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {items.map(({ label, value, icon, color, bg, border }) => (
        <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3.5 border-r border-border/40 last:border-r-0 relative overflow-hidden group cursor-default">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" style={{ background: bg }} />
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10 transition-transform duration-200 group-hover:scale-110"
            style={{ background: bg, color, border: `1px solid ${border}` }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin opacity-50" /> : icon}
          </div>
          <div className="relative z-10">
            <p className="text-[22px] font-bold text-foreground leading-none tracking-tight">{loading ? "—" : value}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wide">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CLIENT CARD
   ═══════════════════════════════════════════ */

function ClientCard({ c, selected, onClick }: { c: ClientListItem; selected: boolean; onClick: (name: string) => void }) {
  const industryIcon = INDUSTRY_ICONS[c.industry || "Other"] || <Briefcase className="w-4 h-4" />;
  
  return (
    <button
      onClick={() => onClick(c.name)}
      className={`client-card-row w-full text-left px-4 py-3.5 border-b border-border/60 flex gap-3 transition-all
        ${selected ? "bg-primary/5" : "hover:bg-muted/30"}`}
      style={{ borderLeft: `3px solid ${selected ? "var(--primary)" : "transparent"}` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
        {industryIcon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{c.client_name}</p>
        <p className="text-[10px] font-mono text-muted-foreground/70 mt-0.5">{c.client_code}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <SLABadge tier={c.sla_tier} />
          {c.industry && (
             <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border/50 text-muted-foreground">
               {c.industry}
             </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
         <span className={`w-2 h-2 rounded-full ${c.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
         <ChevronRight className="client-arrow w-3.5 h-3.5 text-muted-foreground mt-auto" />
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   FORMS
   ═══════════════════════════════════════════ */

const FormInput = ({ label, value, onChange, type = "text", placeholder, required }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
  </div>
);

const FormSelect = ({ label, value, onChange, opts, required }: any) => (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-foreground mb-1.5">{label}{required && <span className="text-destructive ml-1">*</span>}</label>
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
      <option value="">Select…</option>
      {opts.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);

function NewClientForm({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) {
  const [form, setForm] = useState<Partial<ClientListItem>>({ is_active: 1 });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const set = (k: keyof ClientListItem) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  const { data: users } = useFrappeList<{ name: string; full_name: string }>("User", ["name", "full_name"], [["enabled", "=", 1]], [], false, "full_name asc");

  const handleSubmit = async () => {
    if (!form.client_name || !form.client_code) { setSaveError("Name and Code are required."); return; }
    setSaving(true); setSaveError(null);
    try {
      const result = await frappeCreate<ClientListItem>('Client', form);
      sonnerToast.success("Client created successfully");
      onCreated(result.name);
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  const STEPS = ["Identity", "Details", "Contact"];

  return (
    <div className="max-w-2xl mx-auto py-6 px-6 c-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-xl font-bold text-foreground">New Client</h2><p className="text-xs text-muted-foreground mt-0.5">Add a new FM service recipient</p></div>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex items-center gap-0 mb-6 rounded-xl overflow-hidden border border-border">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`flex-1 py-2 text-xs font-semibold text-center transition-all border-r border-border last:border-r-0
              ${step === i ? "bg-primary text-primary-foreground" : step > i ? "bg-primary/10 text-primary" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}>
            <span className="mr-1 opacity-60">{i + 1}.</span>{s}
          </button>
        ))}
      </div>
      {saveError && <ErrorBanner message={saveError} />}
      {step === 0 && (
        <div className="c-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Client Code" value={form.client_code || ""} onChange={set('client_code')} placeholder="CLT-001" required />
            <FormInput label="Client Name" value={form.client_name || ""} onChange={set('client_name')} placeholder="Global Bank Corp" required />
          </div>
          <FormInput label="Short Name" value={form.client_short_name || ""} onChange={set('client_short_name')} placeholder="GBC" />
        </div>
      )}
      {step === 1 && (
        <div className="c-fade-up">
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Industry" value={form.industry || ""} onChange={set('industry')} opts={["Banking", "Insurance", "Real Estate", "Government", "Healthcare", "Retail", "Other"].map(v => ({ v, l: v }))} />
            <FormSelect label="SLA Tier" value={form.sla_tier || ""} onChange={set('sla_tier')} opts={["Platinum", "Gold", "Silver", "Bronze"].map(v => ({ v, l: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Country" value={form.country || ""} onChange={set('country')} placeholder="Oman" />
            <FormInput label="City" value={form.city_code || ""} onChange={set('city_code')} placeholder="Muscat" />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="c-fade-up">
          <FormInput label="Primary Contact Name" value={form.primary_contact || ""} onChange={set('primary_contact')} />
          <div className="grid grid-cols-2 gap-3">
             <FormInput label="Phone" value={form.contact_phone || ""} onChange={set('contact_phone')} />
             <FormInput label="Email" value={form.contact_email || ""} onChange={set('contact_email')} />
          </div>
          <FormSelect label="Account Manager" value={form.account_manager || ""} onChange={set('account_manager')} opts={users.map(u => ({ v: u.name, l: u.full_name }))} />
        </div>
      )}
      <div className="flex items-center gap-3 mt-6">
        {step > 0 && <button onClick={() => setStep(step - 1)} className="flex items-center gap-1.5 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /> Back</button>}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(step + 1)} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">Next: {STEPS[step + 1]} <ChevronRight className="w-4 h-4" /></button>
        ) : (
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Plus className="w-4 h-4" /> Create Client</>}
          </button>
        )}
      </div>
    </div>
  );
}

function EditClientDrawer({ client, onClose, onSaved }: { client: ClientListItem; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<ClientListItem>>(client);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const set = (k: keyof ClientListItem) => (v: any) => setForm(f => ({ ...f, [k]: v }));

  const { data: users } = useFrappeList<{ name: string; full_name: string }>("User", ["name", "full_name"], [["enabled", "=", 1]], [], false, "full_name asc");

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      await frappeUpdate('Client', client.name, form);
      sonnerToast.success("Client updated");
      onSaved();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
        <div><h3 className="text-lg font-bold text-foreground">Edit Client</h3><p className="text-xs text-muted-foreground">{client.client_code}</p></div>
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {saveError && <ErrorBanner message={saveError} />}
        <div className="space-y-4">
          <FormInput label="Client Name" value={form.client_name || ""} onChange={set('client_name')} required />
          <FormInput label="Short Name" value={form.client_short_name || ""} onChange={set('client_short_name')} />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Industry" value={form.industry || ""} onChange={set('industry')} opts={["Banking", "Insurance", "Real Estate", "Government", "Healthcare", "Retail", "Other"].map(v => ({ v, l: v }))} />
            <FormSelect label="SLA Tier" value={form.sla_tier || ""} onChange={set('sla_tier')} opts={["Platinum", "Gold", "Silver", "Bronze"].map(v => ({ v, l: v }))} />
          </div>
          <div className="pt-4 border-t border-border">
             <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Contact Info</h4>
             <FormInput label="Primary Contact" value={form.primary_contact || ""} onChange={set('primary_contact')} />
             <div className="grid grid-cols-2 gap-3">
               <FormInput label="Phone" value={form.contact_phone || ""} onChange={set('contact_phone')} />
               <FormInput label="Email" value={form.contact_email || ""} onChange={set('contact_email')} />
             </div>
             <FormSelect label="Account Manager" value={form.account_manager || ""} onChange={set('account_manager')} opts={users.map(u => ({ v: u.name, l: u.full_name }))} />
          </div>
          <div className="pt-4 border-t border-border">
             <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Commercials</h4>
             <FormSelect label="Payment Terms" value={form.payment_terms || ""} onChange={set('payment_terms')} opts={["Net 30", "Net 45", "Net 60", "Net 90", "Immediate"].map(v => ({ v, l: v }))} />
             <FormSelect label="Preferred Request Mode" value={form.preferred_request_mode || ""} onChange={set('preferred_request_mode')} opts={["Portal", "Phone", "Email", "Mobile App", "On-Site"].map(v => ({ v, l: v }))} />
          </div>
          <div className="pt-4 flex items-center gap-2">
             <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active')(e.target.checked ? 1 : 0)} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" id="is_active" />
             <label htmlFor="is_active" className="text-sm font-medium text-foreground">Is Active Client</label>
          </div>
        </div>
      </div>
      <div className="p-6 border-t border-border bg-muted/20 shrink-0">
        <button onClick={handleSave} disabled={saving} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save Changes
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function Clients() {
  useClientStyles();
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "new">("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: rawClients, loading, refetch } = useFrappeList<ClientListItem>("Client", 
    ["name", "client_code", "client_name", "client_short_name", "industry", "sla_tier", "is_active"], [], [refreshKey], false, "client_name asc");

  const clients = useMemo(() => {
    return rawClients.filter(c => 
      c.client_name.toLowerCase().includes(search.toLowerCase()) || 
      c.client_code.toLowerCase().includes(search.toLowerCase())
    );
  }, [rawClients, search]);

  const stats = useMemo(() => {
    return {
      total: rawClients.length,
      active: rawClients.filter(c => c.is_active).length,
      platinum: rawClients.filter(c => c.sla_tier === "Platinum").length,
      gold: rawClients.filter(c => c.sla_tier === "Gold").length,
    };
  }, [rawClients]);

  const { data: selectedDoc, loading: docLoading } = useFrappeDoc<ClientListItem>("Client", selectedId || "", refreshKey);

  const handleCreated = (name: string) => {
    setView("list");
    setSelectedId(name);
    setRefreshKey(prev => prev + 1);
  };

  if (view === "new") return <NewClientForm onClose={() => setView("list")} onCreated={handleCreated} />;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <StatsBar stats={stats} loading={loading} />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar List */}
        <div className="w-[380px] flex flex-col border-r border-border bg-card/50">
          <div className="p-4 border-b border-border bg-card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-foreground">Clients</h1>
              {can("clients", "full") && (
                <button onClick={() => setView("new")} className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-sm">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search clients…"
                className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none">
            {loading ? <LoadingSpinner /> : clients.map(c => <ClientCard key={c.name} c={c} selected={selectedId === c.name} onClick={setSelectedId} />)}
            {!loading && clients.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground opacity-50">
                <Users className="w-12 h-12 mb-2" />
                <p className="text-sm font-medium">No clients found</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
          {selectedId ? (
            docLoading ? <LoadingSpinner /> : selectedDoc && (
              <div className="max-w-4xl mx-auto space-y-6 c-fade-up">
                <div className="bg-card border border-border/60 rounded-2xl p-5 mb-6 flex items-center justify-between shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                      {INDUSTRY_ICONS[selectedDoc.industry || "Other"] || <Building2 className="w-7 h-7" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-0.5">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">{selectedDoc.client_name}</h2>
                        <SLABadge tier={selectedDoc.sla_tier} />
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-[11px] font-mono font-medium text-muted-foreground/80 bg-muted/50 px-2 py-0.5 rounded-md border border-border/40 uppercase tracking-wider">{selectedDoc.client_code}</p>
                        {selectedDoc.industry && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            <Briefcase className="w-3 h-3 opacity-60" />
                            {selectedDoc.industry}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {selectedDoc.is_active ? "Active Partner" : "Inactive"}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-muted/30 border border-border/40 rounded-xl p-1 shrink-0">
                      <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 hover:bg-background hover:shadow-sm rounded-lg transition-all text-muted-foreground hover:text-primary" title="Refresh">
                        <RefreshCw className={`w-3.5 h-3.5 ${docLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    {can("clients", "full") && (
                       <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-background rounded-xl text-[13px] font-bold hover:opacity-90 transition-all shadow-md active:scale-95">
                         <Pencil className="w-3.5 h-3.5" /> Edit Details
                       </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 items-start">
                  <div className="col-span-2 space-y-5">
                    <SectionCard title="General Information" icon={<Building2 className="w-4 h-4" />}>
                      <div className="grid grid-cols-2 gap-x-8">
                        <InfoRow label="Client Name" value={selectedDoc.client_name} />
                        <InfoRow label="Short Name" value={selectedDoc.client_short_name} />
                        <InfoRow label="Industry" value={selectedDoc.industry} />
                        <InfoRow label="SLA Tier" value={selectedDoc.sla_tier} />
                        <InfoRow label="Status" value={selectedDoc.is_active ? "Active" : "Inactive"} />
                      </div>
                    </SectionCard>

                    <div className="grid grid-cols-2 gap-5">
                      <SectionCard title="Location & Address" icon={<MapPin className="w-4 h-4" />}>
                        <InfoRow label="Country" value={selectedDoc.country} />
                        <InfoRow label="City" value={selectedDoc.city_code} />
                      </SectionCard>

                      <SectionCard title="Commercials" icon={<CreditCard className="w-4 h-4" />}>
                        <InfoRow label="Payment Terms" value={selectedDoc.payment_terms} />
                        <InfoRow label="Request Mode" value={selectedDoc.preferred_request_mode} />
                      </SectionCard>
                    </div>

                    <SectionCard title="Primary Contact" icon={<Mail className="w-4 h-4" />}>
                      <div className="grid grid-cols-2 gap-x-8">
                        <InfoRow label="Contact Person" value={selectedDoc.primary_contact} />
                        <InfoRow label="Email" value={selectedDoc.contact_email} />
                        <InfoRow label="Phone" value={selectedDoc.contact_phone} />
                        <InfoRow label="Account Manager" value={selectedDoc.account_manager} />
                      </div>
                    </SectionCard>
                  </div>

                  <div className="space-y-5">
                    <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col items-center text-center shadow-sm">
                       <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                          <Send className="w-6 h-6" />
                       </div>
                       <h4 className="text-sm font-bold text-foreground mb-1.5">Quick Actions</h4>
                       <p className="text-[11px] text-muted-foreground mb-5 leading-relaxed">Instantly raise a new service request for this client</p>
                       <button className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20 active:scale-95">New Request</button>
                    </div>

                    <div className="p-5 rounded-2xl border border-border/60 bg-card flex flex-col gap-3">
                       <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Overview</h4>
                       <div className="space-y-3">
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-muted-foreground">Active Work Orders</span>
                             <span className="text-xs font-bold text-foreground">—</span>
                          </div>
                          <div className="flex items-center justify-between">
                             <span className="text-xs text-muted-foreground">Open Requests</span>
                             <span className="text-xs font-bold text-foreground">—</span>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30">
              <Building2 className="w-20 h-20 mb-4" />
              <p className="text-lg font-bold">Select a client to view details</p>
            </div>
          )}
        </div>
      </div>

      {view === "list" && isEditing && (
        <div className={`fixed inset-0 z-[100] pointer-events-none ${isEditing ? "visible" : "invisible"}`}>
           <div className={`absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-auto ${isEditing ? "opacity-100" : "opacity-0"}`} onClick={() => setIsEditing(false)} />
           <div className={`absolute inset-y-0 right-0 w-[500px] bg-card shadow-2xl transition-transform duration-300 pointer-events-auto transform ${isEditing ? "translate-x-0" : "translate-x-full"}`}>
              {docLoading ? <LoadingSpinner /> : selectedDoc && <EditClientDrawer client={selectedDoc} onClose={() => setIsEditing(false)} onSaved={() => { setRefreshKey(k => k + 1); setIsEditing(false); }} />}
           </div>
        </div>
      )}
    </div>
  );
}
