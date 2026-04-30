import React, { useState, useEffect } from 'react';
import {
    Search, Plus, CircleHelp,
    Package, Tags, Ruler, Truck, FileText, Package2, PackageMinus,
    ArrowUpDown, ChartColumn, ClipboardList, TriangleAlert,
    Edit2, Trash2, X, CheckCircle2, XCircle,
} from 'lucide-react';

import { PageLayout } from '../components/PageLayout';

// ─── Frappe helpers ───────────────────────────────────────────────────────────
const getCsrfToken = (): string => {
    if (typeof window !== 'undefined') {
        const f = (window as any).frappe;
        if (f?.csrf_token && f.csrf_token !== 'Guest') return f.csrf_token;
    }
    const m = document.cookie.match(/(?:^|;\s*)X-Frappe-CSRF-Token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
};

const mutationHeaders = (): HeadersInit => ({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Frappe-CSRF-Token': getCsrfToken(),
});

const parseFrappeError = (errData: any): string => {
    if (errData._server_messages) {
        try { const m = JSON.parse(errData._server_messages); return JSON.parse(m[0]).message || errData.message || 'Error'; } catch { /* */ }
    }
    return errData.exception || errData.message || errData.exc || 'An error occurred';
};

const frappeDelete = async (doctype: string, name: string): Promise<void> => {
    if (typeof window !== 'undefined' && (window as any).frappe?.call) {
        return new Promise((resolve, reject) => {
            (window as any).frappe.call({
                method: 'frappe.client.delete',
                args: { doctype, name },
                callback: (r: any) => { if (r.exc) reject(new Error(r.exc)); else resolve(); },
                error: (r: any) => reject(new Error(r.message || 'Delete failed')),
            });
        });
    }
    const res = await fetch(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        { method: 'DELETE', headers: mutationHeaders() });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
};

// ─── Types ────────────────────────────────────────────────────────────────────
/**
 * UOM Doctype.
 * NOTE: 'description' and 'allow_fractional_quantities' are NOT permitted in
 * Frappe's list queries. They are only fetched in the individual doc GET.
 */
interface Unit {
    name: string;
    uom_name?: string;
    enabled?: boolean | number;
    must_be_whole_number?: boolean | number;
    // populated only after individual doc fetch:
    description?: string;
    allow_fractional_quantities?: boolean | number;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const INPUT = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2';
const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2';

// ─── Sub-components ───────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-background border rounded-lg p-6 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
                <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
                    <X className="h-4 w-4" /><span className="sr-only">Close</span>
                </button>
            </div>
            {children}
        </div>
    </div>
);

const F: React.FC<{ label: string; hint?: string; id?: string; children: React.ReactNode }> = ({ label, hint, id, children }) => (
    <div className="space-y-2">
        <label className="text-sm font-medium leading-none" htmlFor={id}>
            {label}{hint && <span className="text-xs text-muted-foreground block mt-0.5">{hint}</span>}
        </label>
        {children}
    </div>
);

const CB: React.FC<{ id: string; label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ id, label, checked, onChange }) => (
    <div className="flex items-center space-x-2">
        <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
            className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2" />
        <label htmlFor={id} className="text-sm font-medium leading-none cursor-pointer">{label}</label>
    </div>
);

// ─── UnitsManagement ─────────────────────────────────────────────────────────
interface Props {
    onNavigateBack?: () => void;
    onNavigateCategories?: () => void;
    onNavigateStock?: () => void;
}

const EMPTY_UNIT = { uom_name: '', description: '', enabled: true, must_be_whole_number: false, allow_fractional_quantities: true };

const UnitsManagement: React.FC<Props> = ({ onNavigateBack, onNavigateCategories, onNavigateStock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newUnit, setNewUnit] = useState({ ...EMPTY_UNIT });
    const [editUnit, setEditUnit] = useState<{ name: string; uom_name: string; description: string; enabled: boolean; must_be_whole_number: boolean; allow_fractional_quantities: boolean } | null>(null);

    useEffect(() => { fetchUnits(); }, []);

    // ── Fetch UOMs ────────────────────────────────────────────────────────────
    // IMPORTANT: 'description' and 'allow_fractional_quantities' are NOT permitted
    // in Frappe list queries for UOM. Fetch only: name, uom_name, enabled, must_be_whole_number.
    const fetchUnits = async () => {
        try {
            setLoading(true); setError(null);
            // Only safe list-permitted fields — NO description, NO allow_fractional_quantities
            const fields = encodeURIComponent(JSON.stringify(['name', 'uom_name', 'enabled', 'must_be_whole_number']));
            const res = await fetch(`/api/resource/UOM?fields=${fields}&limit=500`);
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Failed to fetch units: ${res.status} - ${JSON.stringify(e)}`); }
            setUnits((await res.json()).data || []);
        } catch (err: any) { setError(err.message || 'Error loading units'); }
        finally { setLoading(false); }
    };

    // ── Add UOM ───────────────────────────────────────────────────────────────
    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload = {
                uom_name: newUnit.uom_name,
                description: newUnit.description,
                enabled: newUnit.enabled ? 1 : 0,
                must_be_whole_number: newUnit.must_be_whole_number ? 1 : 0,
                allow_fractional_quantities: newUnit.allow_fractional_quantities ? 1 : 0,
            };
            const res = await fetch('/api/resource/UOM', { method: 'POST', headers: mutationHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            setShowAddModal(false); setNewUnit({ ...EMPTY_UNIT }); fetchUnits();
        } catch (err: any) { alert('Error creating unit: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Open edit modal ────────────────────────────────────────────────────────
    // Individual doc fetch — description and allow_fractional_quantities available here
    const handleEdit = async (name: string) => {
        try {
            const res = await fetch(`/api/resource/UOM/${encodeURIComponent(name)}`);
            if (!res.ok) throw new Error('Failed to fetch unit');
            const d = (await res.json()).data;
            setEditUnit({ name: d.name, uom_name: d.uom_name || d.name, description: d.description || '', enabled: !!d.enabled, must_be_whole_number: !!d.must_be_whole_number, allow_fractional_quantities: !!d.allow_fractional_quantities });
            setShowEditModal(true);
        } catch (err: any) { alert('Could not fetch unit: ' + err.message); }
    };

    // ── Update UOM ────────────────────────────────────────────────────────────
    const handleUpdateUnit = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editUnit) return; setIsSubmitting(true);
        try {
            const payload = {
                uom_name: editUnit.uom_name, description: editUnit.description,
                enabled: editUnit.enabled ? 1 : 0,
                must_be_whole_number: editUnit.must_be_whole_number ? 1 : 0,
                allow_fractional_quantities: editUnit.allow_fractional_quantities ? 1 : 0,
            };
            const res = await fetch(`/api/resource/UOM/${encodeURIComponent(editUnit.name)}`, { method: 'PUT', headers: mutationHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            setShowEditModal(false); fetchUnits();
        } catch (err: any) { alert('Error updating unit: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Delete UOM ────────────────────────────────────────────────────────────
    const handleDelete = async (name: string) => {
        const unit = units.find(u => u.name === name);
        const label = unit?.uom_name || name;
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
        try {
            await frappeDelete('UOM', name);
            setUnits(prev => prev.filter(u => u.name !== name));
        } catch (err: any) {
            const msg = err.message || '';
            alert(msg.toLowerCase().includes('link') || msg.toLowerCase().includes('exist')
                ? `Cannot delete "${label}" — it is used by existing Items. Disable it instead.`
                : 'Error deleting: ' + msg);
        }
    };

    const filtered = units.filter(u => {
        const t = searchTerm.toLowerCase();
        return (u.uom_name || '').toLowerCase().includes(t) || u.name.toLowerCase().includes(t);
    });

    // ── Sidebar nav ───────────────────────────────────────────────────────────
    const Nav: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }> = ({ icon, label, active, onClick }) => (
        <li>
            <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 justify-start px-3 py-2 rounded-md transition-colors ${active ? 'bg-muted text-foreground border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                {icon}<span className="text-sm">{label}</span>
            </button>
        </li>
    );

    return (
        <PageLayout
            title="Units"
            subtitle="Manage units of measure and master data"
        >
            <section className="flex-1 bg-background h-full overflow-y-auto">
                        <div className="border-b border-border bg-background sticky top-0 z-10">
                            <div className="flex h-16 items-center px-6 justify-between">
                                <h1 className="text-2xl font-semibold text-foreground">Units</h1>
                                <button className="inline-flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground text-gray-500" title="Help"><CircleHelp className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="flex flex-col space-y-1.5 p-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-semibold leading-none tracking-tight">Units</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Manage units of measure (UOM Doctype)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowAddModal(true)} className={BTN_P}><Plus className="h-4 w-4" />Add Unit</button>
                                            <button onClick={fetchUnits} className={BTN_O}>Refresh</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <input className={INPUT + ' pl-9'} placeholder="Search units..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 pt-0">
                                    {loading ? (
                                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                                    ) : error ? (
                                        <div className="text-center text-destructive p-8">{error}<br /><button onClick={fetchUnits} className="mt-4 text-sm text-primary underline">Try Again</button></div>
                                    ) : filtered.length === 0 ? (
                                        <div className="text-center text-muted-foreground p-8">No units found</div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {filtered.map(unit => {
                                                const enabled = !!unit.enabled;
                                                const whole = !!unit.must_be_whole_number;
                                                return (
                                                    <div key={unit.name} className="flex items-start justify-between p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow">
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            <Ruler className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="font-semibold text-foreground">{unit.uom_name || unit.name}</span>
                                                                    {enabled
                                                                        ? <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3" />Enabled</span>
                                                                        : <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground"><XCircle className="h-3 w-3" />Disabled</span>}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground mt-0.5 font-mono">{unit.name}</div>
                                                                {whole && <div className="text-xs text-muted-foreground mt-0.5">Whole numbers only</div>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                                            <button onClick={() => handleEdit(unit.name)} title="Edit" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                                                            <button onClick={() => handleDelete(unit.name)} title="Delete" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-destructive"><Trash2 className="h-4 w-4" /></button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

            {/* ADD MODAL */}
            {showAddModal && (
                <Modal title="Add New Unit" onClose={() => setShowAddModal(false)}>
                    <form className="space-y-4" onSubmit={handleAddUnit}>
                        <F label="Unit Name *" hint="Maps to uom_name in UOM Doctype" id="au_name">
                            <input id="au_name" type="text" required className={INPUT} placeholder="e.g., Kilogram, Litre, Piece" value={newUnit.uom_name} onChange={e => setNewUnit({ ...newUnit, uom_name: e.target.value })} />
                        </F>
                        <F label="Description" id="au_desc">
                            <textarea id="au_desc" rows={2} className={TEXTAREA} placeholder="Optional description" value={newUnit.description} onChange={e => setNewUnit({ ...newUnit, description: e.target.value })} />
                        </F>
                        <div className="space-y-3 pt-1">
                            <CB id="au_enabled" label="Enabled" checked={newUnit.enabled} onChange={v => setNewUnit({ ...newUnit, enabled: v })} />
                            <CB id="au_whole" label="Must be a whole number" checked={newUnit.must_be_whole_number} onChange={v => setNewUnit({ ...newUnit, must_be_whole_number: v })} />
                            <CB id="au_frac" label="Allow fractional quantities" checked={newUnit.allow_fractional_quantities} onChange={v => setNewUnit({ ...newUnit, allow_fractional_quantities: v })} />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" className={BTN_O} onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button type="submit" className={BTN_P} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Unit'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* EDIT MODAL */}
            {showEditModal && editUnit && (
                <Modal title="Edit Unit" onClose={() => setShowEditModal(false)}>
                    <form className="space-y-4" onSubmit={handleUpdateUnit}>
                        <F label="Unit ID" hint="Frappe document name — read-only" id="eu_id">
                            <input id="eu_id" type="text" readOnly disabled className={INPUT + ' bg-muted text-muted-foreground'} value={editUnit.name} />
                        </F>
                        <F label="Unit Name *" id="eu_name">
                            <input id="eu_name" type="text" required className={INPUT} value={editUnit.uom_name} onChange={e => setEditUnit({ ...editUnit, uom_name: e.target.value })} />
                        </F>
                        <F label="Description" id="eu_desc">
                            <textarea id="eu_desc" rows={2} className={TEXTAREA} value={editUnit.description} onChange={e => setEditUnit({ ...editUnit, description: e.target.value })} />
                        </F>
                        <div className="space-y-3 pt-1">
                            <CB id="eu_enabled" label="Enabled" checked={editUnit.enabled} onChange={v => setEditUnit({ ...editUnit, enabled: v })} />
                            <CB id="eu_whole" label="Must be a whole number" checked={editUnit.must_be_whole_number} onChange={v => setEditUnit({ ...editUnit, must_be_whole_number: v })} />
                            <CB id="eu_frac" label="Allow fractional quantities" checked={editUnit.allow_fractional_quantities} onChange={v => setEditUnit({ ...editUnit, allow_fractional_quantities: v })} />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" className={BTN_O} onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="submit" className={BTN_P} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </PageLayout>
    );
};

export default UnitsManagement;