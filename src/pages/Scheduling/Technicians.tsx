/**
 * Technicians.tsx  ·  CAFM Facility-UI
 * Full technician roster + profile + skills/certifications management.
 * 100% dynamic — all data from Frappe REST API via resource.json schema.
 * Schema references: Resource (parent) + Resource Skill (child table).
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Search, Plus, X, Loader2, AlertCircle, RefreshCw, ChevronRight,
  ChevronDown, Phone, Mail, MapPin, Shield, Award, Clock, User,
  Wrench, Star, CheckCircle2, AlertTriangle, Pencil, MoreVertical,
  Activity, Building2, Zap, Tag, Calendar, Check, Trash2,
  Upload, Camera, Users, Filter, ChevronLeft, Copy, ExternalLink,
  BadgeCheck, Layers, Smartphone, BookOpen,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   GLOBAL CSS  (injected once)
════════════════════════════════════════════════════════════════ */
const TECH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes techFadeUp   { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes techSlideIn  { from{opacity:0;transform:translateX(18px)}            to{opacity:1;transform:translateX(0)}         }
@keyframes techSlideLeft{ from{opacity:0;transform:translateX(-18px)}           to{opacity:1;transform:translateX(0)}         }
@keyframes techPulse    { 0%,100%{opacity:1} 50%{opacity:.45} }
@keyframes techShimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes cardIn       { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
@keyframes scaleIn      { from{opacity:0;transform:scale(.9)}        to{opacity:1;transform:scale(1)}      }
@keyframes ringPop      { 0%{transform:scale(.8);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
@keyframes badgeSlide   { from{opacity:0;transform:translateX(10px)} to{opacity:1;transform:translateX(0)} }
@keyframes progressFill { from{width:0%} to{width:var(--tw)} }
@keyframes dotBeat      { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }

.t-fade-up    { animation: techFadeUp   .32s cubic-bezier(.22,1,.36,1) both }
.t-slide-in   { animation: techSlideIn  .28s cubic-bezier(.22,1,.36,1) both }
.t-slide-left { animation: techSlideLeft .28s cubic-bezier(.22,1,.36,1) both }
.t-scale-in   { animation: scaleIn      .22s cubic-bezier(.22,1,.36,1) both }
.t-ring-pop   { animation: ringPop      .4s  cubic-bezier(.22,1,.36,1) both }

.t-stagger > * { animation: cardIn .28s cubic-bezier(.22,1,.36,1) both }
.t-stagger > *:nth-child(1){ animation-delay: 0ms   }
.t-stagger > *:nth-child(2){ animation-delay: 50ms  }
.t-stagger > *:nth-child(3){ animation-delay: 100ms }
.t-stagger > *:nth-child(4){ animation-delay: 150ms }
.t-stagger > *:nth-child(5){ animation-delay: 200ms }
.t-stagger > *:nth-child(6){ animation-delay: 250ms }

.shimmer-cell {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: techShimmer 1.4s ease infinite;
  border-radius: 6px;
}

.tech-card { transition: transform .17s cubic-bezier(.22,1,.36,1), box-shadow .17s ease, border-color .17s ease; }
.tech-card:hover  { transform: translateY(-1px) scale(1.006); box-shadow: 0 4px 20px rgba(0,0,0,.08); }
.tech-card.active { transform: translateY(-1px) scale(1.01);  box-shadow: 0 6px 24px rgba(0,0,0,.1); }

.prog-bar { animation: progressFill .9s cubic-bezier(.4,0,.2,1) forwards }

.status-dot { position: relative; }
.status-dot::after {
  content: '';
  position: absolute; inset: 0; border-radius: 50%;
  background: inherit;
  animation: dotBeat 2s ease-in-out infinite;
}

.drag-over { border-color: #6366f1 !important; background: #eef2ff !important; }
`;

function useTechStyles() {
  useEffect(() => {
    if (document.getElementById("tech-css")) return;
    const s = document.createElement("style");
    s.id = "tech-css"; s.textContent = TECH_CSS;
    document.head.appendChild(s);
  }, []);
}

/* ════════════════════════════════════════════════════════════════
   FRAPPE API
════════════════════════════════════════════════════════════════ */
const BASE = "";
type FF = [string, string, string | number][];

function csrf() { return (document.cookie.match(/csrf_token=([^;]+)/) || [])[1] || ""; }

async function fGet<T>(doctype: string, fields: string[], filters: FF = [], limit = 500, orderBy = ""): Promise<T[]> {
  const p = new URLSearchParams({ fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit_page_length: String(limit), ...(orderBy ? { order_by: orderBy } : {}) });
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}?${p}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}: ${r.statusText}`);
  return (await r.json()).data as T[];
}

async function fGetDoc<T>(doctype: string, name: string): Promise<T> {
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { credentials: "include" });
  if (!r.ok) throw new Error(`GET ${doctype}/${name}: ${r.statusText}`);
  return (await r.json()).data as T;
}

async function fCreate<T>(doctype: string, payload: Partial<T>): Promise<T> {
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as {exc_type?:string}).exc_type || "Save failed"); }
  return (await r.json()).data as T;
}

async function fUpdate<T>(doctype: string, name: string, payload: Partial<T>): Promise<T> {
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "PUT", credentials: "include",
    headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as {exc_type?:string}).exc_type || "Update failed"); }
  return (await r.json()).data as T;
}

async function fDelete(doctype: string, name: string): Promise<void> {
  const r = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: "DELETE", credentials: "include",
    headers: { "X-Frappe-CSRF-Token": csrf() },
  });
  if (!r.ok) throw new Error("Delete failed");
}

async function uploadFile(file: File, doctype: string, docname: string, fieldname: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  fd.append("is_private", "0");
  fd.append("folder", "Home/Attachments");
  fd.append("doctype", doctype);
  fd.append("docname", docname);
  fd.append("fieldname", fieldname);
  const r = await fetch("/api/method/upload_file", { method: "POST", credentials: "include", headers: { "X-Frappe-CSRF-Token": csrf() }, body: fd });
  if (!r.ok) throw new Error("Upload failed");
  const j = await r.json();
  return j.message?.file_url || "";
}

/* ════════════════════════════════════════════════════════════════
   TYPES  (mirrors resource.json + resource_skill.json exactly)
════════════════════════════════════════════════════════════════ */
interface ResourceSkill {
  name?: string;
  service_group_code: string;
  certification?: string;
  expiry_date?: string;
  /** local-only temp id for unsaved rows */
  _localId?: string;
}

interface Resource {
  name: string;
  staff_code: string;
  resource_name: string;
  designation?: string;
  department?: string;
  employment_type?: string;
  ps_type?: string;
  shift?: string;
  allocation_mode?: string;
  is_pda_user?: 0 | 1;
  phone?: string;
  email?: string;
  user_id?: string;
  branch_code?: string;
  branch_name?: string;
  primary_area_group?: string;
  secondary_area_groups?: string;
  is_active?: 0 | 1;
  skills?: ResourceSkill[];
  /** profile photo — Frappe Attach Image field (add to schema if needed) */
  profile_image?: string;
}

type ResourceListItem = Omit<Resource, "skills">;

/* ════════════════════════════════════════════════════════════════
   HOOKS
════════════════════════════════════════════════════════════════ */
function useList(deps: unknown[]) {
  const [data, setData]       = useState<ResourceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      setData(await fGet<ResourceListItem>("Resource", [
        "name","staff_code","resource_name","designation","department",
        "employment_type","ps_type","shift","allocation_mode","is_pda_user",
        "phone","email","user_id","branch_code","branch_name",
        "primary_area_group","secondary_area_groups",
        "is_active","profile_image",
      ], [], 500, "resource_name asc"));
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { data, loading, error, refetch: fetch_ };
}

function useDoc(name: string, refreshKey = 0) {
  const [data, setData]       = useState<Resource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    setLoading(true); setError(null);
    fGetDoc<Resource>("Resource", name)
      .then(d => { if (!cancelled) setData(d); })
      .catch((e: unknown) => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [name, refreshKey]);

  return { data, loading, error };
}

function useSimple<T>(doctype: string, fields: string[], filters: FF = [], skip = false) {
  const [data, setData] = useState<T[]>([]);
  const f = useCallback(async () => {
    if (skip) return;
    try { setData(await fGet<T>(doctype, fields, filters)); }
    catch { /* silent */ }
  }, [doctype, skip]); // eslint-disable-line
  useEffect(() => { f(); }, [f]);
  return data;
}

/* ════════════════════════════════════════════════════════════════
   CONFIG MAPS  (all derived from schema options)
════════════════════════════════════════════════════════════════ */
const DEPARTMENTS = ["Technical","Soft Services","Operations","Management","Admin","HSEQ"];
const EMP_TYPES   = ["Staff","Subcontractor","Casual","Third Party"];
const PS_TYPES    = ["Primary","Secondary","Float"];
const SHIFTS      = ["Day Shift","Night Shift","24 Hours Shift","Rotating"];
const ALLOC_MODES = ["Manual","Auto","Pool"];

const DEPT_CFG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  "Technical":     { color: "#3b82f6", bg: "#eff6ff", icon: <Wrench className="w-3.5 h-3.5" /> },
  "Soft Services": { color: "#8b5cf6", bg: "#f5f3ff", icon: <Star   className="w-3.5 h-3.5" /> },
  "Operations":    { color: "#f59e0b", bg: "#fffbeb", icon: <Activity className="w-3.5 h-3.5" /> },
  "Management":    { color: "#10b981", bg: "#ecfdf5", icon: <Building2 className="w-3.5 h-3.5" /> },
  "Admin":         { color: "#6b7280", bg: "#f9fafb", icon: <Tag     className="w-3.5 h-3.5" /> },
  "HSEQ":          { color: "#ef4444", bg: "#fef2f2", icon: <Shield  className="w-3.5 h-3.5" /> },
};

const EMP_CFG: Record<string, { cls: string; dot: string }> = {
  "Staff":        { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "#10b981" },
  "Subcontractor":{ cls: "bg-blue-100 text-blue-700 border-blue-200",         dot: "#3b82f6" },
  "Casual":       { cls: "bg-amber-100 text-amber-700 border-amber-200",       dot: "#f59e0b" },
  "Third Party":  { cls: "bg-violet-100 text-violet-700 border-violet-200",   dot: "#8b5cf6" },
};

const SHIFT_CFG: Record<string, { icon: React.ReactNode; color: string }> = {
  "Day Shift":      { icon: <Zap className="w-3 h-3" />,      color: "#f59e0b" },
  "Night Shift":    { icon: <Star className="w-3 h-3" />,     color: "#6366f1" },
  "24 Hours Shift": { icon: <Clock className="w-3 h-3" />,    color: "#ef4444" },
  "Rotating":       { icon: <RefreshCw className="w-3 h-3" />,color: "#0891b2" },
};

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = [
  "#4f46e5","#7c3aed","#0891b2","#059669","#d97706","#dc2626",
  "#db2777","#0284c7","#65a30d","#9333ea",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function formatDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isCertExpired(date?: string) { return !!date && new Date(date) < new Date(); }
function isCertExpiringSoon(date?: string) {
  if (!date) return false;
  const d = new Date(date); const now = new Date();
  now.setDate(now.getDate() + 60);
  return d >= new Date() && d <= now;
}

/* ════════════════════════════════════════════════════════════════
   MICRO COMPONENTS
════════════════════════════════════════════════════════════════ */
function Spin({ small }: { small?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${small ? "py-3" : "py-16"}`}>
      <Loader2 className={`animate-spin text-primary ${small ? "w-4 h-4" : "w-7 h-7"}`} />
    </div>
  );
}

function ErrMsg({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 m-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl">
      <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{msg}</span>
      {onRetry && <button onClick={onRetry} className="text-xs underline text-destructive font-semibold">Retry</button>}
    </div>
  );
}

function Avatar({ name, img, size = "md", ring }: { name: string; img?: string; size?: "sm"|"md"|"lg"|"xl"; ring?: boolean }) {
  const sz = { sm:"w-8 h-8 text-xs", md:"w-10 h-10 text-sm", lg:"w-14 h-14 text-base", xl:"w-20 h-20 text-xl" }[size];
  const ringCls = ring ? "ring-4 ring-white shadow-md" : "";
  const bg = avatarColor(name);
  const imgSrc = img ? (img.startsWith("http") ? img : `http://facility.quantcloud.in${img}`) : null;

  return (
    <div className={`${sz} ${ringCls} rounded-full shrink-0 flex items-center justify-center text-white font-bold relative overflow-hidden`}
      style={{ background: bg }}>
      {imgSrc
        ? <img src={imgSrc} alt={name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        : getInitials(name)}
    </div>
  );
}

function DeptBadge({ dept }: { dept?: string }) {
  if (!dept) return null;
  const c = DEPT_CFG[dept] || { color: "#6b7280", bg: "#f9fafb", icon: <Tag className="w-3.5 h-3.5" /> };
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border"
      style={{ color: c.color, background: c.bg, borderColor: `${c.color}30` }}>
      {c.icon} {dept}
    </span>
  );
}

function EmpBadge({ type }: { type?: string }) {
  if (!type) return null;
  const c = EMP_CFG[type] || { cls: "bg-muted text-muted-foreground border-border", dot: "#9ca3af" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />{type}
    </span>
  );
}

function ActiveDot({ active }: { active?: 0 | 1 }) {
  return (
    <span className={`status-dot w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
  );
}

function SkillPill({ skill }: { skill: ResourceSkill }) {
  const expired     = isCertExpired(skill.expiry_date);
  const expiringSoon = isCertExpiringSoon(skill.expiry_date);
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all
      ${expired ? "border-red-200 bg-red-50" : expiringSoon ? "border-amber-200 bg-amber-50" : "border-border bg-muted/30 hover:bg-muted/60"}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0
        ${expired ? "bg-red-100" : expiringSoon ? "bg-amber-100" : "bg-primary/10"}`}>
        <Award className={`w-3.5 h-3.5 ${expired ? "text-red-500" : expiringSoon ? "text-amber-600" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-xs leading-tight truncate">{skill.service_group_code}</p>
        {skill.certification && <p className="text-[10px] text-muted-foreground truncate">{skill.certification}</p>}
      </div>
      {skill.expiry_date && (
        <div className="text-right shrink-0">
          <p className={`text-[9px] font-bold ${expired ? "text-red-500" : expiringSoon ? "text-amber-600" : "text-muted-foreground"}`}>
            {expired ? "Expired" : expiringSoon ? "Exp. soon" : "Valid to"}
          </p>
          <p className={`text-[10px] font-semibold ${expired ? "text-red-600" : expiringSoon ? "text-amber-700" : "text-foreground"}`}>
            {formatDate(skill.expiry_date)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TECHNICIAN CARD  (left list)
════════════════════════════════════════════════════════════════ */
function TechCard({ t, selected, onClick }: { t: ResourceListItem; selected: boolean; onClick: () => void }) {
  const deptCfg = DEPT_CFG[t.department || ""] || { color: "#6b7280", bg: "#f9fafb" };

  return (
    <button onClick={onClick}
      className={`tech-card w-full text-left px-4 py-3.5 border-b border-border/60 flex gap-3 transition-all
        ${selected ? "bg-primary/5 border-l-[3px] border-l-primary" : "hover:bg-muted/40 border-l-[3px] border-l-transparent"}`}>
      <div className="relative shrink-0">
        <Avatar name={t.resource_name} img={t.profile_image} size="md" />
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
          style={{ background: t.is_active ? "#10b981" : "#9ca3af" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{t.resource_name}</p>
        <p className="text-[11px] font-mono text-muted-foreground/70">{t.staff_code}</p>
        {t.designation && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{t.designation}</p>}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <DeptBadge dept={t.department} />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <EmpBadge type={t.employment_type} />
        {t.shift && (
          <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"
            style={{ color: SHIFT_CFG[t.shift]?.color }}>
            {SHIFT_CFG[t.shift]?.icon} {t.shift.split(" ")[0]}
          </span>
        )}
        {t.is_pda_user === 1 && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded-full border border-violet-200">
            <Smartphone className="w-2.5 h-2.5" /> Mobile
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 mt-auto" />
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   STATS BAR
════════════════════════════════════════════════════════════════ */
function StatsBar({ data }: { data: ResourceListItem[] }) {
  const total     = data.length;
  const active    = data.filter(t => t.is_active).length;
  const mobile    = data.filter(t => t.is_pda_user).length;
  const subcon    = data.filter(t => t.employment_type === "Subcontractor").length;

  const items = [
    { label: "Total",          value: total,  color: "#6366f1", bg: "#eef2ff", icon: <Users   className="w-4 h-4" /> },
    { label: "Active",         value: active, color: "#10b981", bg: "#ecfdf5", icon: <CheckCircle2 className="w-4 h-4" /> },
    { label: "Mobile Users",   value: mobile, color: "#8b5cf6", bg: "#f5f3ff", icon: <Smartphone  className="w-4 h-4" /> },
    { label: "Subcontractors", value: subcon, color: "#f59e0b", bg: "#fffbeb", icon: <Building2    className="w-4 h-4" /> },
  ];

  return (
    <div className="flex border-b border-border bg-card/80 t-stagger">
      {items.map(({ label, value, color, bg, icon }) => (
        <div key={label} className="flex-1 flex items-center gap-2.5 px-4 py-3 border-r border-border/40 last:border-r-0 relative overflow-hidden group cursor-default">
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: bg }} />
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 relative z-10 transition-transform group-hover:scale-110"
            style={{ background: bg, color, border: `1px solid ${color}30` }}>
            {icon}
          </div>
          <div className="relative z-10">
            <p className="text-[22px] font-bold text-foreground leading-none" style={{ fontFamily: "Inter, sans-serif" }}>{value}</p>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   SKILL ROW EDITOR  (used in New / Edit form)
════════════════════════════════════════════════════════════════ */
function SkillRowEditor({
  skills, onChange,
}: { skills: ResourceSkill[]; onChange: (skills: ResourceSkill[]) => void }) {
  const [newSkill, setNewSkill] = useState<ResourceSkill>({ service_group_code: "", certification: "", expiry_date: "" });
  const [err, setErr] = useState("");

  function addRow() {
    if (!newSkill.service_group_code.trim()) { setErr("Service Group Code is required."); return; }
    setErr("");
    onChange([...skills, { ...newSkill, _localId: `loc-${Date.now()}` }]);
    setNewSkill({ service_group_code: "", certification: "", expiry_date: "" });
  }

  function removeRow(idx: number) {
    onChange(skills.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, k: keyof ResourceSkill, v: string) {
    onChange(skills.map((s, i) => i === idx ? { ...s, [k]: v } : s));
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
        <Award className="w-3.5 h-3.5 text-primary" /> Skills &amp; Certifications
      </p>

      {/* existing rows */}
      {skills.length > 0 && (
        <div className="space-y-2 mb-3">
          {skills.map((sk, idx) => {
            const expired     = isCertExpired(sk.expiry_date);
            const expiringSoon = isCertExpiringSoon(sk.expiry_date);
            return (
              <div key={sk._localId || sk.name || idx}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm
                  ${expired ? "border-red-200 bg-red-50" : expiringSoon ? "border-amber-200 bg-amber-50" : "border-border bg-muted/20"}`}>
                <Award className={`w-4 h-4 shrink-0 ${expired ? "text-red-400" : expiringSoon ? "text-amber-500" : "text-primary"}`} />
                <input key={`service-${sk._localId || sk.name || idx}`} value={sk.service_group_code} onChange={e => updateRow(idx, "service_group_code", e.target.value)}
                  placeholder="Service Group Code *"
                  className="flex-1 min-w-0 text-xs bg-transparent border-0 outline-none font-semibold text-foreground placeholder:text-muted-foreground" />
                <input key={`cert-${sk._localId || sk.name || idx}`} value={sk.certification || ""} onChange={e => updateRow(idx, "certification", e.target.value)}
                  placeholder="Certification"
                  className="flex-1 min-w-0 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground" />
                <input key={`expiry-${sk._localId || sk.name || idx}`} type="date" value={sk.expiry_date || ""} onChange={e => updateRow(idx, "expiry_date", e.target.value)}
                  className="text-xs bg-transparent border-0 outline-none text-muted-foreground w-28" />
                {expired && <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded shrink-0">Expired</span>}
                {expiringSoon && !expired && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded shrink-0">Soon</span>}
                <button onClick={() => removeRow(idx)} className="p-1 rounded-lg hover:bg-red-100 transition-colors shrink-0">
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* add row */}
      <div className="flex items-center gap-2 p-3 border-2 border-dashed border-border rounded-xl bg-muted/10 hover:border-primary/40 transition-colors">
        <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
        <input key="new-service" value={newSkill.service_group_code} onChange={e => setNewSkill(s => ({ ...s, service_group_code: e.target.value }))}
          placeholder="Service Group Code *" onKeyDown={e => e.key === "Enter" && addRow()}
          className="flex-1 min-w-0 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground" />
        <input key="new-cert" value={newSkill.certification || ""} onChange={e => setNewSkill(s => ({ ...s, certification: e.target.value }))}
          placeholder="Certification" onKeyDown={e => e.key === "Enter" && addRow()}
          className="flex-1 min-w-0 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground" />
        <input key="new-expiry" type="date" value={newSkill.expiry_date || ""} onChange={e => setNewSkill(s => ({ ...s, expiry_date: e.target.value }))}
          className="text-xs bg-transparent border-0 outline-none text-muted-foreground w-28" />
        <button onClick={addRow}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-[11px] font-bold hover:bg-primary/90 transition-colors shrink-0">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FORM (New + Edit)  — right-side slide-in drawer
════════════════════════════════════════════════════════════════ */
interface FormState {
  staff_code: string; resource_name: string;
  designation: string; department: string; employment_type: string;
  ps_type: string; shift: string; allocation_mode: string;
  is_pda_user: boolean;
  phone: string; email: string; user_id: string;
  branch_code: string;
  primary_area_group: string; secondary_area_groups: string;
  is_active: boolean;
  skills: ResourceSkill[];
  profile_image: string;
  _pendingFile?: File;
}

const BLANK_FORM: FormState = {
  staff_code: "", resource_name: "",
  designation: "", department: "", employment_type: "",
  ps_type: "", shift: "", allocation_mode: "",
  is_pda_user: false,
  phone: "", email: "", user_id: "",
  branch_code: "",
  primary_area_group: "", secondary_area_groups: "",
  is_active: true,
  skills: [], profile_image: "",
};

function resourceToForm(r: Resource): FormState {
  return {
    staff_code:           r.staff_code || "",
    resource_name:        r.resource_name || "",
    designation:          r.designation || "",
    department:           r.department || "",
    employment_type:      r.employment_type || "",
    ps_type:              r.ps_type || "",
    shift:                r.shift || "",
    allocation_mode:      r.allocation_mode || "",
    is_pda_user:          r.is_pda_user === 1,
    phone:                r.phone || "",
    email:                r.email || "",
    user_id:              r.user_id || "",
    branch_code:          r.branch_code || "",
    primary_area_group:   r.primary_area_group || "",
    secondary_area_groups:r.secondary_area_groups || "",
    is_active:            r.is_active !== 0,
    skills:               (r.skills || []).map(s => ({ ...s })),
    profile_image:        r.profile_image || "",
  };
}

/* ════════════════════════════════════════════════════════════════
   FORM HELPERS
════════════════════════════════════════════════════════════════ */
const Sec = React.memo(({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
      <span className="p-1 rounded-md bg-primary/10 text-primary">{icon}</span>
      <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">{title}</p>
    </div>
    {children}
  </div>
));

const FI = React.memo(({ label, fk, val, onUpdate, isDirty, type = "text", placeholder, req }: {
  label: string; fk: keyof FormState; val: string; onUpdate: (k: keyof FormState, v: any) => void; isDirty: boolean; type?: string; placeholder?: string; req?: boolean;
}) => (
  <div className="mb-3.5">
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
      {label} {req && <span className="text-destructive">*</span>}
      {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />}
    </label>
    <input key={fk} type={type} value={val} onChange={e => onUpdate(fk, e.target.value)} placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
        ${isDirty ? "border-amber-300 bg-amber-50/30" : "border-border"}`} />
  </div>
));

const FS = React.memo(({ label, fk, val, onUpdate, isDirty, opts, req }: {
  label: string; fk: keyof FormState; val: string; onUpdate: (k: keyof FormState, v: any) => void; isDirty: boolean; opts: { v: string; l: string }[]; req?: boolean;
}) => (
  <div className="mb-3.5">
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
      {label} {req && <span className="text-destructive">*</span>}
      {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />}
    </label>
    <select key={fk} value={val} onChange={e => onUpdate(fk, e.target.value)}
      className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
        ${isDirty ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
      <option value="">Select…</option>
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
));

function TechForm({
  editDoc, onClose, onSaved,
}: { editDoc?: Resource; onClose: () => void; onSaved: (name: string) => void }) {
  const isEdit = !!editDoc;
  const [form, setForm]     = useState<FormState>(() => editDoc ? resourceToForm(editDoc) : { ...BLANK_FORM });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState<string | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(
    editDoc?.profile_image
      ? (editDoc.profile_image.startsWith("http") ? editDoc.profile_image : `http://facility.quantcloud.in${editDoc.profile_image}`)
      : null
  );
  const [dirty, setDirty]   = useState<Set<string>>(new Set());
  const fileRef             = useRef<HTMLInputElement>(null);

  // linked area groups and branches
  const areaGroups = useSimple<{ name: string; area_group_name?: string }>("Area Group", ["name","area_group_name"]);
  const branches   = useSimple<{ name: string; branch_code?: string; branch_name?: string }>("Branch", ["name","branch_code","branch_name"]);

  const updateField = useCallback((k: keyof FormState, v: string | boolean | ResourceSkill[]) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(s => new Set([...s, k]));
  }, []);

  const handleImgChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("Please select an image."); return; }
    setImgPreview(URL.createObjectURL(file));
    setForm(f => ({ ...f, _pendingFile: file }));
    setDirty(s => new Set([...s, "profile_image"]));
  }, []);

  async function handleSave() {
    if (!form.resource_name.trim()) { setErr("Resource Name is required."); return; }
    if (!isEdit && !form.staff_code.trim()) { setErr("Staff Code is required."); return; }
    setSaving(true); setErr(null);

    try {
      let finalImg = form.profile_image;

      const payload: Partial<Resource> = {
        ...(isEdit ? {} : { staff_code: form.staff_code }),
        resource_name:         form.resource_name || undefined,
        designation:           form.designation   || undefined,
        department:            form.department    || undefined,
        employment_type:       form.employment_type || undefined,
        ps_type:               form.ps_type       || undefined,
        shift:                 form.shift         || undefined,
        allocation_mode:       form.allocation_mode || undefined,
        is_pda_user:           form.is_pda_user ? 1 : 0,
        phone:                 form.phone         || undefined,
        email:                 form.email         || undefined,
        user_id:               form.user_id       || undefined,
        branch_code:           form.branch_code   || undefined,
        primary_area_group:    form.primary_area_group || undefined,
        secondary_area_groups: form.secondary_area_groups || undefined,
        is_active:             form.is_active ? 1 : 0,
        skills:                form.skills.map(s => ({
          service_group_code: s.service_group_code,
          certification:      s.certification  || undefined,
          expiry_date:        s.expiry_date    || undefined,
        })),
      };

      let doc: Resource;
      if (isEdit) {
        doc = await fUpdate<Resource>("Resource", editDoc!.name, payload);
      } else {
        doc = await fCreate<Resource>("Resource", payload);
      }

      // upload photo after doc exists
      if (form._pendingFile) {
        finalImg = await uploadFile(form._pendingFile, "Resource", doc.name, "profile_image");
        await fUpdate("Resource", doc.name, { profile_image: finalImg });
      }

      onSaved(doc.name);
    } catch (e: unknown) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  const isDirtyAny = dirty.size > 0;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[540px] max-w-full bg-card shadow-2xl flex flex-col t-slide-in border-l border-border">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              {isEdit ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{isEdit ? "Edit Technician" : "Add New Technician"}</h3>
              {isEdit && <p className="text-[11px] text-muted-foreground font-mono">{editDoc?.staff_code}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDirtyAny && (
              <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {dirty.size} change{dirty.size !== 1 ? "s" : ""}
              </span>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {err && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />{err}
            </div>
          )}

          {/* Photo */}
          <Sec title="Profile Photo" icon={<Camera className="w-3.5 h-3.5" />}>
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="w-20 h-20 rounded-2xl border-2 border-border overflow-hidden flex items-center justify-center bg-muted/30">
                  {imgPreview
                    ? <img src={imgPreview} alt="" className="w-full h-full object-cover" />
                    : <User className="w-8 h-8 text-muted-foreground/40" />}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                {imgPreview && (
                  <button onClick={e => { e.stopPropagation(); setImgPreview(null); setForm(f => ({ ...f, profile_image: "", _pendingFile: undefined })); setDirty(s => new Set([...s, "profile_image"])); }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors z-10">
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImgChange} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-muted/20 transition-all mb-1.5">
                  <Upload className="w-4 h-4" /> {imgPreview ? "Change Photo" : "Upload Photo"}
                </button>
                <p className="text-[10px] text-muted-foreground text-center">PNG, JPG up to 10 MB</p>
              </div>
            </div>
          </Sec>

          {/* Identity */}
          <Sec title="Identity" icon={<User className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <FI label="Staff Code" fk="staff_code" val={form.staff_code} onUpdate={updateField} isDirty={dirty.has("staff_code")} placeholder="RES-001" req />
              <FI label="Resource Name" fk="resource_name" val={form.resource_name} onUpdate={updateField} isDirty={dirty.has("resource_name")} placeholder="Full Name" req />
            </div>
            <FI label="Designation" fk="designation" val={form.designation} onUpdate={updateField} isDirty={dirty.has("designation")} placeholder="e.g. Senior Technician" />
            <div className="grid grid-cols-2 gap-3">
              <FS label="Department" fk="department" val={form.department} onUpdate={updateField} isDirty={dirty.has("department")} opts={DEPARTMENTS.map(v => ({ v, l: v }))} />
              <FS label="Employment Type" fk="employment_type" val={form.employment_type} onUpdate={updateField} isDirty={dirty.has("employment_type")} opts={EMP_TYPES.map(v => ({ v, l: v }))} />
            </div>
            <FS label="Primary / Secondary Type" fk="ps_type" val={form.ps_type} onUpdate={updateField} isDirty={dirty.has("ps_type")} opts={PS_TYPES.map(v => ({ v, l: v }))} />
          </Sec>

          {/* Operations */}
          <Sec title="Operations" icon={<Layers className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <FS label="Shift" fk="shift" val={form.shift} onUpdate={updateField} isDirty={dirty.has("shift")} opts={SHIFTS.map(v => ({ v, l: v }))} />
              <FS label="Allocation Mode" fk="allocation_mode" val={form.allocation_mode} onUpdate={updateField} isDirty={dirty.has("allocation_mode")} opts={ALLOC_MODES.map(v => ({ v, l: v }))} />
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl border border-border mb-3.5">
              <div className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${form.is_pda_user ? "bg-primary" : "bg-muted"}`}
                onClick={() => updateField("is_pda_user", !form.is_pda_user)}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_pda_user ? "left-5" : "left-0.5"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Mobile / PDA User</p>
                <p className="text-[10px] text-muted-foreground">Resource uses mobile app for WO updates</p>
              </div>
              <Smartphone className={`w-4 h-4 ml-auto ${form.is_pda_user ? "text-primary" : "text-muted-foreground/40"}`} />
            </div>
          </Sec>

          {/* Coverage */}
          <Sec title="Branch & Area Coverage" icon={<MapPin className="w-3.5 h-3.5" />}>
            <div className="mb-3.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-foreground mb-1">
                Branch {dirty.has("branch_code") && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Modified" />}
              </label>
              <select value={form.branch_code} onChange={e => updateField("branch_code", e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-all
                  ${dirty.has("branch_code") ? "border-amber-300 bg-amber-50/30" : "border-border"}`}>
                <option value="">Select Branch…</option>
                {branches.map(b => (
                  <option key={b.name} value={b.name}>{b.branch_code ? `${b.branch_code} — ` : ""}{b.branch_name || b.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">Assign technician to a specific Branch for visibility and dispatching</p>
            </div>
            <FS label="Primary Area Group" fk="primary_area_group" val={form.primary_area_group} onUpdate={updateField} isDirty={dirty.has("primary_area_group")}
              opts={areaGroups.map(a => ({ v: a.name, l: a.area_group_name || a.name }))} />
            <FI label="Secondary Area Groups" fk="secondary_area_groups" val={form.secondary_area_groups} onUpdate={updateField} isDirty={dirty.has("secondary_area_groups")} placeholder="Comma-separated area group codes" />
          </Sec>

          {/* Contact */}
          <Sec title="Contact" icon={<Phone className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 gap-3">
              <FI label="Phone" fk="phone" val={form.phone} onUpdate={updateField} isDirty={dirty.has("phone")} placeholder="+968 9999 9999" type="tel" />
              <FI label="Email" fk="email" val={form.email} onUpdate={updateField} isDirty={dirty.has("email")} placeholder="tech@company.com" type="email" />
            </div>
            <FI label="System User (Frappe User ID)" fk="user_id" val={form.user_id} onUpdate={updateField} isDirty={dirty.has("user_id")} placeholder="user@company.com" />
          </Sec>

          {/* Status */}
          <Sec title="Status" icon={<Activity className="w-3.5 h-3.5" />}>
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl border border-border">
              <div className={`w-10 h-5 rounded-full transition-all cursor-pointer relative ${form.is_active ? "bg-emerald-500" : "bg-muted"}`}
                onClick={() => updateField("is_active", !form.is_active)}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.is_active ? "left-5" : "left-0.5"}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Active Resource</p>
                <p className="text-[10px] text-muted-foreground">Technician will appear in assignment lists</p>
              </div>
              <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${form.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                {form.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </Sec>

          {/* Skills */}
          <Sec title="Skills & Certifications" icon={<Award className="w-3.5 h-3.5" />}>
            <SkillRowEditor skills={form.skills} onChange={v => updateField("skills", v)} />
          </Sec>
        </div>

        {/* footer */}
        <div className="shrink-0 border-t border-border px-5 py-4 bg-card flex items-center gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || (!isDirtyAny && isEdit)}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : isEdit ? <><CheckCircle2 className="w-4 h-4" />Save Changes</>
              : <><Plus className="w-4 h-4" />Create Technician</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   PROFILE  (right panel detail view)
════════════════════════════════════════════════════════════════ */
function Profile({
  techName, onEdit, onDeleted, onRefresh,
}: { techName: string; onEdit: (doc: Resource) => void; onDeleted: () => void; onRefresh: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: t, loading, error } = useDoc(techName, refreshKey);
  const [deleting, setDeleting]     = useState(false);
  const [showDelConfirm, setShowDelConfirm] = useState(false);

  // expose refresh to parent via a custom event (simple approach)
  useEffect(() => {
    setRefreshKey(k => k + 1);
  }, [techName]);

  async function handleDelete() {
    setDeleting(true);
    try { await fDelete("Resource", techName); onDeleted(); }
    catch (e: unknown) { alert((e as Error).message); }
    finally { setDeleting(false); setShowDelConfirm(false); }
  }

  if (loading) return <Spin />;
  if (error)   return <ErrMsg msg={error} onRetry={() => setRefreshKey(k => k + 1)} />;
  if (!t)      return null;

  const deptCfg  = DEPT_CFG[t.department  || ""] || { color: "#6b7280", bg: "#f9fafb", icon: null };
  const expiredSkills   = (t.skills || []).filter(s => isCertExpired(s.expiry_date));
  const expiringSkills  = (t.skills || []).filter(s => isCertExpiringSoon(s.expiry_date) && !isCertExpired(s.expiry_date));

  const InfoRow = React.memo(({ label, val, icon, mono, link }: {
    label: string; val?: string | null; icon?: React.ReactNode; mono?: boolean; link?: boolean;
  }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0 group transition-colors hover:bg-muted/10 -mx-1 px-1 rounded-lg">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-5 h-5 rounded flex items-center justify-center bg-muted/40 text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary">
          {icon || <Tag className="w-3 h-3 opacity-30" />}
        </div>
        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider truncate">{label}</span>
      </div>
      <div className="flex-1 text-right pl-4 min-w-0">
        {link
          ? <span className="text-sm text-blue-600 font-bold cursor-pointer hover:underline truncate">{val || "—"}</span>
          : <span className={`text-sm font-bold text-foreground/90 ${mono ? "font-mono text-[12px] bg-muted/50 px-1.5 py-0.5 rounded shadow-sm" : "truncate"}`}>{val || "—"}</span>}
      </div>
    </div>
  ));

  const Card = React.memo(({ title, icon, children, accent }: {
    title: string; icon: React.ReactNode; children: React.ReactNode; accent?: string;
  }) => (
    <div className="rounded-2xl border border-border bg-card overflow-hidden mb-5 t-fade-up shadow-sm hover:shadow-md transition-all duration-300 border-l-[3.5px]"
      style={{ borderLeftColor: accent || "transparent" }}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border/40"
        style={{ background: accent ? `linear-gradient(90deg, ${accent}08 0%, transparent 100%)` : undefined }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform hover:scale-110" 
          style={{ background: accent ? `${accent}15` : "#f8fafc", color: accent || "#64748b" }}>
          {icon}
        </div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-foreground/60">{title}</p>
      </div>
      <div className="px-5 py-3.5 bg-gradient-to-b from-card to-muted/5">{children}</div>
    </div>
  ));

  return (
    <div className="t-fade-up overflow-y-auto h-full">
      {/* ── HERO HEADER ── */}
      <div className="sticky top-0 z-10 px-6 pt-6 pb-5 border-b border-border/60 bg-card/95 backdrop-blur-md"
        style={{ background: `linear-gradient(135deg, ${deptCfg.bg} 0%, transparent 80%)` }}>

        <div className="flex items-start gap-4 mb-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <Avatar name={t.resource_name} img={t.profile_image} size="xl" ring />
            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
              style={{ background: t.is_active ? "#10b981" : "#9ca3af" }}>
              {t.is_active ? <Check className="w-2.5 h-2.5 text-white" /> : <X className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-foreground leading-tight">{t.resource_name}</h2>
                <p className="text-[12px] font-mono text-muted-foreground mt-0.5">{t.staff_code}</p>
                {t.designation && <p className="text-sm text-muted-foreground mt-1">{t.designation}</p>}
              </div>
              {/* actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => onEdit(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-primary/30 rounded-lg text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => setShowDelConfirm(true)}
                  className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => setRefreshKey(k => k + 1)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-2">
          {t.is_active ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
              <span className="status-dot w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400" /> Inactive
            </span>
          )}
          <DeptBadge dept={t.department} />
          <EmpBadge  type={t.employment_type} />
          {t.ps_type && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-700 border border-sky-200">{t.ps_type}</span>
          )}
          {t.is_pda_user === 1 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
              <Smartphone className="w-3 h-3" /> Mobile User
            </span>
          )}
          {expiredSkills.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
              <AlertTriangle className="w-3 h-3" /> {expiredSkills.length} Cert{expiredSkills.length>1?"s":""} Expired
            </span>
          )}
          {expiringSkills.length > 0 && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
              <Clock className="w-3 h-3" /> {expiringSkills.length} Expiring Soon
            </span>
          )}
        </div>
      </div>

      {/* ── CARDS ── */}
      <div className="px-6 py-5">

        {/* Skills & Certs — featured first */}
        {(t.skills || []).length > 0 && (
          <Card title={`Skills & Certifications (${t.skills!.length})`} icon={<Award className="w-4 h-4" />} accent="#6366f1">
            <div className="grid grid-cols-1 gap-2 py-2">
              {(t.skills || []).map((sk, i) => (
                <SkillPill key={sk.name || i} skill={sk} />
              ))}
            </div>
          </Card>
        )}

        {(t.skills || []).length === 0 && (
          <div className="flex items-center gap-3 p-4 bg-muted/30 border border-dashed border-border rounded-2xl mb-4">
            <BookOpen className="w-6 h-6 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-semibold text-muted-foreground">No skills recorded</p>
              <p className="text-xs text-muted-foreground/60">Click Edit to add certifications and service group skills.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
          {/* Personal */}
          <div>
            <Card title="Personal Details" icon={<User className="w-4 h-4" />} accent="#3b82f6">
              <InfoRow label="Staff Code"   val={t.staff_code}   mono />
              <InfoRow label="Designation"  val={t.designation}  />
              <InfoRow label="Department"   val={t.department}   icon={<Building2 className="w-3.5 h-3.5" />} />
              <InfoRow label="Emp. Type"    val={t.employment_type} />
              <InfoRow label="P/S Type"     val={t.ps_type}      />
            </Card>
          </div>

          {/* Operations */}
          <div>
            <Card title="Operations" icon={<Layers className="w-4 h-4" />} accent="#10b981">
              <InfoRow label="Shift"          val={t.shift}          icon={<Clock className="w-3.5 h-3.5" />} />
              <InfoRow label="Allocation"     val={t.allocation_mode} />
              <InfoRow label="Area Group"     val={t.primary_area_group} icon={<MapPin className="w-3.5 h-3.5" />} />
              <InfoRow label="Secondary Areas" val={t.secondary_area_groups} />
              <InfoRow label="Mobile/PDA"     val={t.is_pda_user ? "Yes" : "No"} />
            </Card>
          </div>

          {/* Contact */}
          <div>
            <Card title="Contact" icon={<Phone className="w-4 h-4" />} accent="#f59e0b">
              <InfoRow label="Phone"       val={t.phone} icon={<Phone className="w-3.5 h-3.5" />} link />
              <InfoRow label="Email"       val={t.email} icon={<Mail  className="w-3.5 h-3.5" />} link />
              <InfoRow label="System User" val={t.user_id} />
            </Card>
          </div>

          {/* Compliance summary */}
          <div>
            <Card title="Certification Health" icon={<Shield className="w-4 h-4" />} accent="#8b5cf6">
              <div className="py-2 space-y-3">
                {[
                  { label: "Total Skills",     val: (t.skills||[]).length,              color: "#6366f1" },
                  { label: "Valid Certs",       val: (t.skills||[]).filter(s => s.expiry_date && !isCertExpired(s.expiry_date)).length, color: "#10b981" },
                  { label: "Expiring Soon",     val: expiringSkills.length,              color: "#f59e0b" },
                  { label: "Expired",           val: expiredSkills.length,               color: "#ef4444" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex items-center justify-between group py-0.5">
                    <span className="text-xs text-muted-foreground/80 font-medium group-hover:text-foreground transition-colors">{label}</span>
                    <span className="text-sm font-black transition-transform group-hover:scale-110" style={{ color }}>{val}</span>
                  </div>
                ))}
                {/* health bar */}
                {(t.skills||[]).length > 0 && (
                  <div className="pt-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="prog-bar h-full rounded-full"
                        style={{
                          "--tw": `${Math.round(((t.skills||[]).length - expiredSkills.length) / (t.skills||[]).length * 100)}%`,
                          width: `${Math.round(((t.skills||[]).length - expiredSkills.length) / (t.skills||[]).length * 100)}%`,
                          background: expiredSkills.length > 0 ? "#f59e0b" : "#10b981",
                        } as React.CSSProperties} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {Math.round(((t.skills||[]).length - expiredSkills.length) / (t.skills||[]).length * 100)}% certs valid
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete confirm */}
      {showDelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-border t-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-base font-bold text-foreground mb-1">Delete Technician?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              <strong>{t.resource_name}</strong> ({t.staff_code}) will be permanently removed from Frappe.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDelConfirm(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4" />Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FILTER DROPDOWN
════════════════════════════════════════════════════════════════ */
interface FilterDropProps { label: string; icon: React.ReactNode; opts: string[]; val: string; onChange: (v: string) => void; }
function FilterDrop({ label, icon, opts, val, onChange }: FilterDropProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all
          ${val ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        {icon}
        {val || label}
        {val
          ? <button onClick={e => { e.stopPropagation(); onChange(""); setOpen(false); }} className="ml-0.5"><X className="w-2.5 h-2.5" /></button>
          : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-card border border-border rounded-xl shadow-xl min-w-[160px] t-scale-in overflow-hidden">
          <div className="py-1">
            <button onClick={() => { onChange(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-muted flex items-center gap-2">
              <X className="w-3 h-3" /> Clear
            </button>
            <div className="h-px bg-border mx-2 my-1" />
            {opts.map(o => (
              <button key={o} onClick={() => { onChange(o); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2
                  ${val === o ? "text-primary bg-primary/5" : "text-foreground hover:bg-muted"}`}>
                {val === o && <Check className="w-3 h-3 shrink-0" />}
                <span className={val === o ? "" : "ml-5"}>{o}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function Technicians() {
  useTechStyles();

  const [refreshKey, setRefreshKey] = useState(0);
  const { data: all, loading, error, refetch } = useList([refreshKey]);

  const [selected,  setSelected]  = useState<string | null>(null);
  const [showForm,  setShowForm]  = useState(false);
  const [editDoc,   setEditDoc]   = useState<Resource | undefined>(undefined);
  const [search,    setSearch]    = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterEmp,  setFilterEmp]  = useState("");
  const [filterShift,setFilterShift]= useState("");
  const [filterActive,setFilterActive]= useState("");
  const [filterBranch,setFilterBranch]= useState("");

  // derive filter options from live data
  const deptOpts   = useMemo(() => [...new Set(all.map(t => t.department).filter(Boolean) as string[])].sort(), [all]);
  const empOpts    = useMemo(() => [...new Set(all.map(t => t.employment_type).filter(Boolean) as string[])].sort(), [all]);
  const shiftOpts  = useMemo(() => [...new Set(all.map(t => t.shift).filter(Boolean) as string[])].sort(), [all]);
  const branchOpts = useMemo(() => [...new Set(all.map(t => t.branch_name || t.branch_code).filter(Boolean) as string[])].sort(), [all]);

  const filtered = useMemo(() => all.filter(t => {
    if (filterDept   && t.department     !== filterDept)    return false;
    if (filterEmp    && t.employment_type !== filterEmp)    return false;
    if (filterShift  && t.shift          !== filterShift)   return false;
    if (filterActive === "Active"   && !t.is_active)        return false;
    if (filterActive === "Inactive" &&  t.is_active)        return false;
    if (filterBranch && (t.branch_name || t.branch_code) !== filterBranch) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return t.resource_name?.toLowerCase().includes(q) ||
      t.staff_code?.toLowerCase().includes(q) ||
      t.designation?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.phone?.toLowerCase().includes(q);
  }), [all, filterDept, filterEmp, filterShift, filterActive, filterBranch, search]);

  const activeFilters = [filterDept, filterEmp, filterShift, filterActive, filterBranch].filter(Boolean).length;

  // auto-select first on load
  useEffect(() => {
    if (filtered.length > 0 && !selected && !showForm) setSelected(filtered[0].name);
  }, [filtered, selected, showForm]);

  function openAdd()  { setEditDoc(undefined); setShowForm(true); setSelected(null); }
  function openEdit(doc: Resource) { setEditDoc(doc); setShowForm(true); }
  function handleSaved(name: string) {
    setShowForm(false); setEditDoc(undefined);
    setSelected(name);
    setRefreshKey(k => k + 1);
  }
  function handleDeleted() {
    setSelected(null);
    setRefreshKey(k => k + 1);
  }
  function clearAllFilters() { setFilterDept(""); setFilterEmp(""); setFilterShift(""); setFilterActive(""); setFilterBranch(""); }

  return (
    <div className="flex flex-col h-full bg-background" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shadow-sm shrink-0 relative z-40">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-tight">Technicians</h1>
              <p className="text-[10px] text-muted-foreground">Resource Management</p>
            </div>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-8 py-2 border border-border rounded-lg text-sm bg-background w-full focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Search name, code, email…" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterDrop label="Branch"     icon={<Building2 className="w-3 h-3" />}  opts={branchOpts} val={filterBranch}  onChange={setFilterBranch} />
            <FilterDrop label="Department" icon={<Building2 className="w-3 h-3" />}  opts={deptOpts}  val={filterDept}   onChange={setFilterDept} />
            <FilterDrop label="Emp. Type"  icon={<Tag className="w-3 h-3" />}         opts={empOpts}   val={filterEmp}    onChange={setFilterEmp}  />
            <FilterDrop label="Shift"      icon={<Clock className="w-3 h-3" />}       opts={shiftOpts} val={filterShift}  onChange={setFilterShift}/>
            <FilterDrop label="Status"     icon={<Activity className="w-3 h-3" />}    opts={["Active","Inactive"]} val={filterActive} onChange={setFilterActive} />
            {activeFilters > 0 && (
              <button onClick={clearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-destructive border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-all">
                <X className="w-2.5 h-2.5" /> Clear {activeFilters}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={refetch} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Add Technician
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <StatsBar data={all} />

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: list */}
        <div className="w-[380px] min-w-[380px] border-r border-border flex flex-col bg-card overflow-hidden">
          {/* count strip */}
          <div className="px-4 py-2 border-b border-border/50 bg-muted/20 flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground">
              {filtered.length} of {all.length} technician{all.length !== 1 ? "s" : ""}
            </span>
            {activeFilters > 0 && (
              <span className="text-[11px] text-primary font-semibold flex items-center gap-1">
                <Filter className="w-3 h-3" /> {activeFilters} filter{activeFilters>1?"s":""} active
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <Spin />}
            {error   && <ErrMsg msg={error} onRetry={refetch} />}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground t-fade-up">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <Users className="w-7 h-7 opacity-40" />
                </div>
                <p className="text-sm font-semibold">No technicians found</p>
                <p className="text-xs opacity-60">Adjust your search or filters</p>
              </div>
            )}
            {!loading && !error && filtered.map(t => (
              <TechCard key={t.name} t={t}
                selected={selected === t.name && !showForm}
                onClick={() => { setSelected(t.name); setShowForm(false); setEditDoc(undefined); }} />
            ))}
          </div>
        </div>

        {/* RIGHT: profile */}
        <div className="flex-1 overflow-hidden bg-background">
          {showForm ? (
            /* Full-page new form placeholder while drawer is open — blur existing profile */
            <div className="h-full flex items-center justify-center text-muted-foreground bg-muted/10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Plus className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">{editDoc ? "Editing Technician" : "New Technician"}</p>
                <p className="text-xs text-muted-foreground mt-1">Complete the form in the panel →</p>
              </div>
            </div>
          ) : selected ? (
            <Profile techName={selected}
              onEdit={openEdit}
              onDeleted={handleDeleted}
              onRefresh={() => setRefreshKey(k => k + 1)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground t-fade-up">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center border border-border/50">
                  <Users className="w-9 h-9 opacity-30" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ChevronRight className="w-3 h-3 text-primary/60" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground/70">Select a technician</p>
                <p className="text-xs opacity-50 mt-1">Click any card to view their full profile</p>
              </div>
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm mt-2">
                <Plus className="w-4 h-4" /> Add First Technician
              </button>
            </div>
          )}
        </div>
      </div>

      {/* FORM DRAWER */}
      {showForm && (
        <TechForm
          editDoc={editDoc}
          onClose={() => { setShowForm(false); setEditDoc(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
