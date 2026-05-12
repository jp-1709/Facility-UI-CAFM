import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Tag,
  Save,
  X,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  ChevronRight,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Activity,
  LayoutGrid,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { cn } from "@/lib/utils";
import { frappeFetch } from '@/lib/frappe-sdk';

/* ═══════════════════════════════════════════
   GLOBAL STYLES & ANIMATIONS
═══════════════════════════════════════════ */

const CATS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes catsFadeUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.u-fade-up   { animation: catsFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.u-stagger > * { animation: catsFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }

.cats-rich-card {
  position: relative;
  transition: transform 0.18s cubic-bezier(.22,1,.36,1),
              box-shadow 0.18s cubic-bezier(.22,1,.36,1),
              border-color 0.18s ease;
  will-change: transform;
}
.cats-rich-card:hover {
  transform: translateY(-1px) scale(1.008);
  box-shadow: 0 6px 24px rgba(79, 70, 229, 0.08), 0 1px 4px rgba(79, 70, 229, 0.04);
}
.cats-rich-card.selected {
  border-color: #4F46E5;
  background-color: #4F46E508;
  transform: translateY(-1px) scale(1.010);
  box-shadow: 0 8px 30px rgba(79, 70, 229, 0.12);
}

.cats-card-row:hover .cats-arrow { opacity: 1; transform: translateX(3px); }
.cats-arrow { opacity: 0; transition: opacity .14s, transform .14s; }

.section-card-wrap { transition: box-shadow .18s, transform .18s; }
.section-card-wrap:hover { transform:translateY(-1px); box-shadow:0 6px 24px rgba(0,0,0,.08); }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #4F46E530; border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: #4F46E5; }
`;

const s = (cls: string) => cn("font-['DM_Sans']", cls);

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */

interface ServiceGroup {
  name: string;
  service_group_code: string;
  service_group_name: string;
  description?: string;
  is_active: number;
}

interface FaultCategory {
  name: string;
  fault_category_code: string;
  fault_category_name: string;
  service_group: string;
  description?: string;
  is_active: number;
}

interface FaultName {
  name: string;
  fault_name_code: string;
  fault_name_title: string;
  fault_category: string;
  service_group: string;
  description?: string;
  is_active: number;
}

type TabType = 'service_group' | 'fault_category' | 'fault_name';

/* ═══════════════════════════════════════════
   UI COMPONENTS
═══════════════════════════════════════════ */

function SectionCard({
  accentColor, icon, title, subtitle, children, className = "",
}: {
  accentColor: string; icon: React.ReactNode; title: string; subtitle?: string;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`section-card-wrap u-fade-up rounded-2xl border border-border/70 bg-card overflow-hidden mb-5 ${className}`}>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${accentColor},${accentColor}55)` }} />
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
          ? <span className="text-[11px] text-[#4F46E5] font-semibold cursor-pointer hover:underline text-right">{value}</span>
          : <span className={`text-[11px] font-semibold text-right ${mono ? "font-mono" : ""}`}
            style={valueColor ? { color: valueColor } : undefined}>{value}</span>
      }
    </div>
  );
}

const StatsBar = ({ items, loading }: { items: { label: string, value: any, icon: any, color: string, bg: string }[], loading?: boolean }) => (
  <div className="flex items-stretch border-b border-border bg-card u-stagger">
    {items.map(({ label, value, icon, color, bg }) => (
      <div key={label} className="flex-1 flex items-center gap-3 px-5 py-3 border-r border-border/50 last:border-r-0 relative overflow-hidden">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
          {loading ? <RefreshCw className="w-4 h-4 animate-spin opacity-40" /> : icon}
        </div>
        <div>
          <p className="text-xl font-bold text-foreground leading-none">{loading ? "—" : value}</p>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wider">{label}</p>
        </div>
      </div>
    ))}
  </div>
);

const EditInput = ({ label, value, onChange, placeholder, type = "text", disabled = false, required = false }: any) => (
  <div className="mb-4">
    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] mb-1.5 ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        "w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    />
  </div>
);

const SelectInput = ({ label, value, onChange, options, disabled = false, required = false }: any) => (
  <div className="mb-4">
    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] mb-1.5 ml-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <option value="">Select {label}</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

const Categories: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('service_group');
  const [searchQuery, setSearchQuery] = useState('');

  // Data States
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([]);
  const [faultCategories, setFaultCategories] = useState<FaultCategory[]>([]);
  const [faultNames, setFaultNames] = useState<FaultName[]>([]);

  // Selected Item
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Form States
  const [sgFormData, setSgFormData] = useState<ServiceGroup>({ name: '', service_group_code: '', service_group_name: '', is_active: 1 });
  const [fcFormData, setFcFormData] = useState<FaultCategory>({ name: '', fault_category_code: '', fault_category_name: '', service_group: '', is_active: 1 });
  const [fnFormData, setFnFormData] = useState<FaultName>({ name: '', fault_name_code: '', fault_name_title: '', fault_category: '', service_group: '', is_active: 1 });

  // Inject styles
  useEffect(() => {
    const id = 'cats-setup-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = CATS_CSS;
      document.head.appendChild(s);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all three for links/filters
      const [sgRes, fcRes, fnRes] = await Promise.all([
        frappeFetch('/api/method/frappe.client.get_list', { method: 'POST', body: JSON.stringify({ doctype: 'Service Group', fields: ['*'], limit_page_length: 500 }) }),
        frappeFetch('/api/method/frappe.client.get_list', { method: 'POST', body: JSON.stringify({ doctype: 'Fault Category', fields: ['*'], limit_page_length: 500 }) }),
        frappeFetch('/api/method/frappe.client.get_list', { method: 'POST', body: JSON.stringify({ doctype: 'Fault Name', fields: ['*'], limit_page_length: 500 }) }),
      ]);

      if (sgRes.ok) setServiceGroups((await sgRes.json()).message || []);
      if (fcRes.ok) setFaultCategories((await fcRes.json()).message || []);
      if (fnRes.ok) setFaultNames((await fnRes.json()).message || []);
    } catch (error) { showToast.error('Error fetching categories'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelect = async (item: any) => {
    setLoading(true);
    try {
      const doctype = activeTab === 'service_group' ? 'Service Group' : activeTab === 'fault_category' ? 'Fault Category' : 'Fault Name';
      const res = await frappeFetch('/api/method/frappe.client.get', {
        method: 'POST',
        body: JSON.stringify({ doctype, name: item.name })
      });
      if (res.ok) {
        const data = (await res.json()).message;
        setSelectedItem(data);
        if (activeTab === 'service_group') setSgFormData(data);
        else if (activeTab === 'fault_category') setFcFormData(data);
        else setFnFormData(data);
      }
    } catch (error) { showToast.error('Error fetching details'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    let doctype = '';
    let doc: any = {};

    if (activeTab === 'service_group') {
      if (!sgFormData.service_group_code || !sgFormData.service_group_name) return showToast.error('Code and Name are required');
      doctype = 'Service Group';
      doc = sgFormData;
    } else if (activeTab === 'fault_category') {
      if (!fcFormData.fault_category_code || !fcFormData.fault_category_name || !fcFormData.service_group) return showToast.error('Code, Name, and Service Group are required');
      doctype = 'Fault Category';
      doc = fcFormData;
    } else {
      if (!fnFormData.fault_name_code || !fnFormData.fault_name_title || !fnFormData.fault_category) return showToast.error('Code, Title, and Fault Category are required');
      doctype = 'Fault Name';
      doc = fnFormData;
    }

    setSaving(true);
    try {
      const isUpdate = !!doc.name;
      const res = await frappeFetch(isUpdate ? '/api/method/frappe.client.save' : '/api/method/frappe.client.insert', {
        method: 'POST',
        body: JSON.stringify({ doc: { ...doc, doctype } })
      });
      if (res.ok) {
        showToast.success(isUpdate ? 'Saved successfully' : 'Created successfully');
        fetchData();
        resetForm();
      } else {
        const result = await res.json();
        showToast.error(result._server_messages ? JSON.parse(JSON.parse(result._server_messages)[0]).message : 'Save failed');
      }
    } catch (error) { showToast.error('Error saving'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selectedItem?.name) return;
    if (!confirm(`Are you sure you want to delete this entry?`)) return;
    try {
      const doctype = activeTab === 'service_group' ? 'Service Group' : activeTab === 'fault_category' ? 'Fault Category' : 'Fault Name';
      const res = await frappeFetch('/api/method/frappe.client.delete', {
        method: 'POST',
        body: JSON.stringify({ doctype, name: selectedItem.name })
      });
      if (res.ok) {
        showToast.success('Deleted successfully');
        fetchData();
        resetForm();
      }
    } catch (error) { showToast.error('Delete failed'); }
  };

  const resetForm = () => {
    setSelectedItem(null);
    setSgFormData({ name: '', service_group_code: '', service_group_name: '', is_active: 1 });
    setFcFormData({ name: '', fault_category_code: '', fault_category_name: '', service_group: '', is_active: 1 });
    setFnFormData({ name: '', fault_name_code: '', fault_name_title: '', fault_category: '', service_group: '', is_active: 1 });
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === 'service_group') return serviceGroups.filter(i => i.service_group_name.toLowerCase().includes(q) || i.service_group_code.toLowerCase().includes(q));
    if (activeTab === 'fault_category') return faultCategories.filter(i => i.fault_category_name.toLowerCase().includes(q) || i.fault_category_code.toLowerCase().includes(q));
    return faultNames.filter(i => i.fault_name_title.toLowerCase().includes(q) || i.fault_name_code.toLowerCase().includes(q));
  }, [activeTab, searchQuery, serviceGroups, faultCategories, faultNames]);

  const stats = [
    { label: "Total", value: filteredItems.length, icon: <Layers className="w-4 h-4" />, color: "#4F46E5", bg: "#4F46E515" },
    { label: "Active", value: filteredItems.filter(i => i.is_active).length, icon: <CheckCircle2 className="w-4 h-4" />, color: "#10b981", bg: "#10b98115" },
    { label: "Setup", value: "Ready", icon: <Activity className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115" },
  ];

  return (
    <div className={s("flex flex-col h-screen bg-muted/20 overflow-hidden")}>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#3730A3] flex items-center justify-center shadow-lg shadow-[#4F46E5]/20">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-none">Categories Setup</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">Classification Management</p>
            </div>
          </div>

          <div className="flex items-center bg-muted/40 p-1.5 rounded-2xl border border-border/60 ml-8">
            <button onClick={() => { setActiveTab('service_group'); resetForm(); }} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider", activeTab === 'service_group' ? "bg-white text-[#4F46E5] shadow-sm" : "hover:bg-muted/60 text-muted-foreground")}>Service Groups</button>
            <button onClick={() => { setActiveTab('fault_category'); resetForm(); }} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider", activeTab === 'fault_category' ? "bg-white text-[#4F46E5] shadow-sm" : "hover:bg-muted/60 text-muted-foreground")}>Fault Categories</button>
            <button onClick={() => { setActiveTab('fault_name'); resetForm(); }} className={cn("px-4 py-2 rounded-xl text-[10px] font-bold transition-all uppercase tracking-wider", activeTab === 'fault_name' ? "bg-white text-[#4F46E5] shadow-sm" : "hover:bg-muted/60 text-muted-foreground")}>Fault Names</button>
          </div>

          <div className="flex-1 max-w-sm ml-6">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[#4F46E5]" />
              <input type="text" placeholder={`Search ${activeTab.replace('_', ' ')}s...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:bg-white transition-all" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData} className="rounded-xl h-10 border-border group">
              <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:rotate-180", loading && "animate-spin")} />
            </Button>
            <Button onClick={() => { resetForm(); setSelectedItem({} as any); }} className="bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-xl h-10 px-6 font-bold shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> New {activeTab === 'service_group' ? 'Group' : activeTab === 'fault_category' ? 'Category' : 'Name'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex max-w-[1600px] mx-auto w-full px-6 py-6 gap-6">
        <div className="w-[400px] flex flex-col shrink-0">
          <StatsBar items={stats} loading={loading} />
          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3 u-stagger">
            {filteredItems.map(item => (
              <button key={item.name} onClick={() => handleSelect(item)} className={cn("w-full text-left p-4 rounded-3xl border cats-rich-card cats-card-row transition-all", selectedItem?.name === item.name ? "selected" : "bg-card border-border/60 hover:border-[#4F46E5]/30")}>
                <div className="flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 text-base font-bold", item.is_active ? "bg-[#4F46E5]/10 text-[#4F46E5]" : "bg-muted text-muted-foreground")}>
                    {activeTab === 'service_group' ? <LayoutGrid className="w-5 h-5" /> : activeTab === 'fault_category' ? <Shield className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-extrabold text-foreground truncate">{activeTab === 'fault_name' ? item.fault_name_title : activeTab === 'fault_category' ? item.fault_category_name : item.service_group_name}</p>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", item.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100")}>{item.is_active ? "Active" : "Disabled"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate opacity-70">Code: {activeTab === 'fault_name' ? item.fault_name_code : activeTab === 'fault_category' ? item.fault_category_code : item.service_group_code}</p>
                  </div>
                  <ChevronRight className="cats-arrow w-4 h-4 text-[#4F46E5]" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-card rounded-[40px] border border-border/80 shadow-2xl shadow-muted flex flex-col u-fade-up">
          {!selectedItem ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-white to-[#4F46E5]/5 flex items-center justify-center mb-8 shadow-xl shadow-muted/50 border border-border/60">
                {activeTab === 'service_group' ? <LayoutGrid className="w-10 h-10 text-[#4F46E5] opacity-30" /> : activeTab === 'fault_category' ? <Shield className="w-10 h-10 text-[#4F46E5] opacity-30" /> : <Activity className="w-10 h-10 text-[#4F46E5] opacity-30" />}
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Select an Entry</h2>
              <p className="text-sm text-muted-foreground max-w-[340px] mt-4 leading-relaxed font-medium">Choose a record from the left to view details or create a new classification.</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 px-10 py-8 border-b border-border/40 bg-muted/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#3730A3] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-[#4F46E5]/20">
                    {activeTab === 'service_group' ? <LayoutGrid className="w-8 h-8" /> : activeTab === 'fault_category' ? <Shield className="w-8 h-8" /> : <Activity className="w-8 h-8" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                      {activeTab === 'service_group' ? (sgFormData.service_group_name || 'New Service Group') : activeTab === 'fault_category' ? (fcFormData.fault_category_name || 'New Fault Category') : (fnFormData.fault_name_title || 'New Fault Name')}
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">{activeTab.replace('_', ' ')} Details</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedItem?.name && (
                    <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-2xl px-4 font-bold" onClick={handleDelete}><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
                  )}
                  <Button variant="outline" className="rounded-2xl px-6 border-border font-bold" onClick={resetForm}>Cancel</Button>
                  <Button className="bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-2xl px-8 font-extrabold shadow-lg shadow-[#4F46E5]/10" onClick={handleSave} disabled={saving}>
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Changes
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">
                <div className="max-w-3xl mx-auto">
                  {activeTab === 'service_group' && (
                    <SectionCard accentColor="#4F46E5" icon={<LayoutGrid className="w-4 h-4" />} title="Service Group Details">
                      <DataRow label="Associated ID" value={sgFormData.name} mono />
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <EditInput label="Group Code" value={sgFormData.service_group_code} onChange={(v: string) => setSgFormData({ ...sgFormData, service_group_code: v })} required disabled={!!selectedItem.name} />
                        <EditInput label="Group Name" value={sgFormData.service_group_name} onChange={(v: string) => setSgFormData({ ...sgFormData, service_group_name: v })} required />
                      </div>
                      <EditInput label="Description" value={sgFormData.description || ''} onChange={(v: string) => setSgFormData({ ...sgFormData, description: v })} />
                      <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl mt-4">
                        <div><p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Is Active</p></div>
                        <div className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", sgFormData.is_active ? "bg-[#4F46E5]" : "bg-muted")} onClick={() => setSgFormData({ ...sgFormData, is_active: sgFormData.is_active ? 0 : 1 })}>
                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", sgFormData.is_active ? "translate-x-6" : "translate-x-0")} />
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {activeTab === 'fault_category' && (
                    <SectionCard accentColor="#6366f1" icon={<Shield className="w-4 h-4" />} title="Fault Category Details">
                      <DataRow label="Associated ID" value={fcFormData.name} mono />
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <EditInput label="Category Code" value={fcFormData.fault_category_code} onChange={(v: string) => setFcFormData({ ...fcFormData, fault_category_code: v })} required disabled={!!selectedItem.name} />
                        <EditInput label="Category Name" value={fcFormData.fault_category_name} onChange={(v: string) => setFcFormData({ ...fcFormData, fault_category_name: v })} required />
                      </div>
                      <SelectInput label="Service Group" value={fcFormData.service_group} onChange={(v: string) => setFcFormData({ ...fcFormData, service_group: v })} options={serviceGroups.map(sg => ({ label: sg.service_group_name, value: sg.name }))} required />
                      <EditInput label="Description" value={fcFormData.description || ''} onChange={(v: string) => setFcFormData({ ...fcFormData, description: v })} />
                      <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl mt-4">
                        <div><p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Is Active</p></div>
                        <div className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", fcFormData.is_active ? "bg-[#4F46E5]" : "bg-muted")} onClick={() => setFcFormData({ ...fcFormData, is_active: fcFormData.is_active ? 0 : 1 })}>
                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", fcFormData.is_active ? "translate-x-6" : "translate-x-0")} />
                        </div>
                      </div>
                    </SectionCard>
                  )}

                  {activeTab === 'fault_name' && (
                    <SectionCard accentColor="#f59e0b" icon={<Activity className="w-4 h-4" />} title="Fault Name Details">
                      <DataRow label="Associated ID" value={fnFormData.name} mono />
                      <div className="grid grid-cols-2 gap-4 mt-6">
                        <EditInput label="Fault Code" value={fnFormData.fault_name_code} onChange={(v: string) => setFnFormData({ ...fnFormData, fault_name_code: v })} required disabled={!!selectedItem.name} />
                        <EditInput label="Fault Title" value={fnFormData.fault_name_title} onChange={(v: string) => setFnFormData({ ...fnFormData, fault_name_title: v })} required />
                      </div>
                      <SelectInput 
                        label="Fault Category" 
                        value={fnFormData.fault_category} 
                        onChange={(v: string) => {
                          const cat = faultCategories.find(c => c.name === v);
                          setFnFormData({ ...fnFormData, fault_category: v, service_group: cat?.service_group || '' });
                        }} 
                        options={faultCategories.map(fc => ({ label: fc.fault_category_name, value: fc.name }))} 
                        required 
                      />
                      <DataRow label="Linked Service Group" value={serviceGroups.find(sg => sg.name === fnFormData.service_group)?.service_group_name} valueColor="#4F46E5" />
                      <EditInput label="Description" value={fnFormData.description || ''} onChange={(v: string) => setFnFormData({ ...fnFormData, description: v })} />
                      <div className="flex items-center justify-between p-4 bg-muted/20 border border-border/80 rounded-2xl mt-4">
                        <div><p className="text-[11px] font-black uppercase text-foreground mb-0.5 tracking-tight">Is Active</p></div>
                        <div className={cn("w-12 h-6 rounded-full p-1 cursor-pointer transition-colors", fnFormData.is_active ? "bg-[#4F46E5]" : "bg-muted")} onClick={() => setFnFormData({ ...fnFormData, is_active: fnFormData.is_active ? 0 : 1 })}>
                          <div className={cn("w-4 h-4 bg-white rounded-full transition-transform shadow-sm", fnFormData.is_active ? "translate-x-6" : "translate-x-0")} />
                        </div>
                      </div>
                    </SectionCard>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Categories;
