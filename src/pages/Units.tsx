import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ruler,
  Save,
  X,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  ChevronRight,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { showToast } from '@/components/ui/toast';
import { cn } from "@/lib/utils";
import { frappeFetch } from '@/lib/frappe-sdk';

/* ═══════════════════════════════════════════
   GLOBAL STYLES & ANIMATIONS
═══════════════════════════════════════════ */

const UNITS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap');

@keyframes unitsFadeUp {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes unitsSlideR {
  from { opacity: 0; transform: translateX(-10px); }
  to   { opacity: 1; transform: translateX(0); }
}

.u-fade-up   { animation: unitsFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }
.u-stagger > * { animation: unitsFadeUp 0.3s cubic-bezier(.22,1,.36,1) both; }

.units-rich-card {
  position: relative;
  transition: transform 0.18s cubic-bezier(.22,1,.36,1),
              box-shadow 0.18s cubic-bezier(.22,1,.36,1),
              border-color 0.18s ease;
  will-change: transform;
}
.units-rich-card:hover {
  transform: translateY(-1px) scale(1.008);
  box-shadow: 0 6px 24px rgba(79, 70, 229, 0.08), 0 1px 4px rgba(79, 70, 229, 0.04);
}
.units-rich-card.selected {
  border-color: #4F46E5;
  background-color: #4F46E508;
  transform: translateY(-1px) scale(1.010);
  box-shadow: 0 8px 30px rgba(79, 70, 229, 0.12);
}

.units-card-row:hover .units-arrow { opacity: 1; transform: translateX(3px); }
.units-arrow { opacity: 0; transition: opacity .14s, transform .14s; }

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

interface UnitMeasure {
  name: string;
  uom_name: string;
}

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

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */

const Units: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<UnitMeasure[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitMeasure | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<UnitMeasure>({
    name: '', uom_name: ''
  });

  // Inject styles
  useEffect(() => {
    const id = 'units-setup-styles';
    if (!document.getElementById(id)) {
      const s = document.createElement('style');
      s.id = id;
      s.textContent = UNITS_CSS;
      document.head.appendChild(s);
    }
  }, []);

  const fetchUnits = useCallback(async () => {
    setLoading(true);
    try {
      const response = await frappeFetch('/api/method/frappe.client.get_list', {
        method: 'POST',
        body: JSON.stringify({
          doctype: 'Unit Measure',
          fields: ['name', 'uom_name'],
          limit_page_length: 500,
          order_by: 'uom_name asc'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setUnits(data.message || []);
      }
    } catch (error) { showToast.error('Error fetching units'); }
    finally { setLoading(false); }
  }, []);

  const fetchUnitDetails = async (name: string) => {
    setLoading(true);
    try {
      const response = await frappeFetch('/api/method/frappe.client.get', {
        method: 'POST',
        body: JSON.stringify({ doctype: 'Unit Measure', name })
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(data.message);
        setSelectedUnit(data.message);
      }
    } catch (error) { showToast.error('Error fetching details'); }
    finally { setLoading(false); }
  };

  const saveUnit = async () => {
    if (!formData.uom_name) {
      showToast.error('UOM Name is required');
      return;
    }
    setSaving(true);
    try {
      const isUpdate = !!formData.name;
      const res = await frappeFetch(isUpdate ? '/api/method/frappe.client.save' : '/api/method/frappe.client.insert', {
        method: 'POST',
        body: JSON.stringify({
          doc: { ...formData, doctype: 'Unit Measure' }
        })
      });
      if (res.ok) {
        showToast.success(isUpdate ? 'Unit updated' : 'Unit created');
        fetchUnits();
        resetForm();
      } else {
        const result = await res.json();
        showToast.error(result._server_messages ? JSON.parse(JSON.parse(result._server_messages)[0]).message : 'Save failed');
      }
    } catch (error) { showToast.error('Error saving unit'); }
    finally { setSaving(false); }
  };

  const deleteUnit = async (name: string) => {
    if (!confirm(`Are you sure you want to delete this unit?`)) return;
    try {
      const res = await frappeFetch('/api/method/frappe.client.delete', {
        method: 'POST',
        body: JSON.stringify({ doctype: 'Unit Measure', name })
      });
      if (res.ok) {
        showToast.success('Unit deleted');
        fetchUnits();
        resetForm();
      }
    } catch (error) { showToast.error('Delete failed'); }
  };

  const resetForm = () => {
    setSelectedUnit(null);
    setFormData({ name: '', uom_name: '' });
  };

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredUnits = useMemo(() => units.filter(u =>
    u.uom_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ), [units, searchQuery]);

  const stats = [
    { label: "Total Units", value: units.length, icon: <Ruler className="w-4 h-4" />, color: "#4F46E5", bg: "#4F46E515" },
    { label: "Active", value: units.length, icon: <CheckCircle2 className="w-4 h-4" />, color: "#10b981", bg: "#10b98115" },
    { label: "Setup", value: "Ready", icon: <Activity className="w-4 h-4" />, color: "#6366f1", bg: "#6366f115" },
  ];

  return (
    <div className={s("flex flex-col h-screen bg-muted/20 overflow-hidden")}>
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#4F46E5] to-[#3730A3] flex items-center justify-center shadow-lg shadow-[#4F46E5]/20">
              <Ruler className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground tracking-tight leading-none">Units of Measure</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">Master Data Management</p>
            </div>
          </div>

          <div className="flex-1 max-w-sm ml-6">
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-[#4F46E5]" />
              <input
                type="text" placeholder="Search units..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-muted/40 border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchUnits} className="rounded-xl h-10 border-border group">
              <RefreshCw className={cn("w-4 h-4 transition-transform group-hover:rotate-180", loading && "animate-spin")} />
            </Button>
            <Button
              onClick={() => { resetForm(); setSelectedUnit({} as any); }}
              className="bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-xl h-10 px-6 font-bold shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" /> New Unit
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex max-w-[1600px] mx-auto w-full px-6 py-6 gap-6">
        <div className="w-[400px] flex flex-col shrink-0">
          <StatsBar items={stats} loading={loading} />

          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3 u-stagger">
            {filteredUnits.map(unit => (
              <button
                key={unit.name}
                onClick={() => fetchUnitDetails(unit.name)}
                className={cn(
                  "w-full text-left p-4 rounded-3xl border units-rich-card units-card-row transition-all",
                  selectedUnit?.name === unit.name ? "selected" : "bg-card border-border/60 hover:border-[#4F46E5]/30"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-border/30 bg-[#4F46E5]/10 text-[#4F46E5] text-base font-bold">
                    <Ruler className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-foreground truncate">{unit.uom_name}</p>
                    <p className="text-[11px] text-muted-foreground truncate opacity-70">ID: {unit.name}</p>
                  </div>
                  <ChevronRight className="units-arrow w-4 h-4 text-[#4F46E5]" />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 bg-card rounded-[40px] border border-border/80 shadow-2xl shadow-muted flex flex-col u-fade-up">
          {!selectedUnit ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-24 h-24 rounded-[40px] bg-gradient-to-br from-white to-[#4F46E5]/5 flex items-center justify-center mb-8 shadow-xl shadow-muted/50 border border-border/60">
                <Ruler className="w-10 h-10 text-[#4F46E5] opacity-30" />
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">Select a Unit</h2>
              <p className="text-sm text-muted-foreground max-w-[340px] mt-4 leading-relaxed font-medium">
                Choose a unit from the list on the left to edit or create a new one.
              </p>
            </div>
          ) : (
            <>
              <div className="shrink-0 px-10 py-8 border-b border-border/40 bg-muted/5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#3730A3] flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-[#4F46E5]/20">
                    <Ruler className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-foreground tracking-tight">
                      {formData.uom_name || 'New Unit'}
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 mt-1">Unit Measure Details</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {selectedUnit?.name && (
                    <Button
                      variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-2xl px-4 font-bold"
                      onClick={() => deleteUnit(selectedUnit!.name)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  )}
                  <Button variant="outline" className="rounded-2xl px-6 border-border font-bold" onClick={resetForm}>Cancel</Button>
                  <Button className="bg-[#4F46E5] hover:bg-[#3730A3] text-white rounded-2xl px-8 font-extrabold shadow-lg shadow-[#4F46E5]/10" onClick={saveUnit} disabled={saving}>
                    {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 scrollbar-thin">
                <div className="max-w-3xl mx-auto">
                  <SectionCard accentColor="#4F46E5" icon={<Ruler className="w-4 h-4" />} title="General Information" subtitle="Primary unit settings">
                    <div className="mb-6">
                      <DataRow label="Internal ID" value={formData.name || 'Auto-generated'} mono />
                    </div>
                    <EditInput
                      label="UOM Name"
                      value={formData.uom_name}
                      onChange={(v: string) => setFormData({ ...formData, uom_name: v })}
                      placeholder="e.g. Kilograms, Liters, Pieces"
                      required
                    />
                  </SectionCard>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Units;
