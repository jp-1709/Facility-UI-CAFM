import React, { useState, useEffect } from 'react';
import {
    Search, Plus, CircleHelp,
    Package, Tags, Ruler, Truck, FileText, Package2, PackageMinus,
    ArrowUpDown, ChartColumn, ClipboardList, TriangleAlert,
    Edit2, Trash2, X,
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
 * Item Group Doctype.
 * NOTE: 'description' is intentionally excluded from list queries —
 * it is fetched only in the individual document GET (handleEdit).
 */
interface Category {
    name: string;
    item_group_name: string;
    parent_item_group?: string;
    is_group?: boolean | number;
    description?: string; // populated only after individual fetch
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

// ─── CategoriesManagement ─────────────────────────────────────────────────────
interface Props {
    onNavigateBack?: () => void;
    onNavigateUnits?: () => void;
    onNavigateStock?: () => void;
}

const CategoriesManagement: React.FC<Props> = ({ onNavigateBack, onNavigateUnits, onNavigateStock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Add form: category_code → item_group_name; display_order REMOVED
    const [newCat, setNewCat] = useState({ category_code: '', description: '', parent_item_group: '' });
    const [editCat, setEditCat] = useState<{ name: string; item_group_name: string; description: string; parent_item_group: string } | null>(null);

    useEffect(() => { fetchCategories(); }, []);

    // ── Fetch categories ──────────────────────────────────────────────────────
    // IMPORTANT: 'description' is NOT a permitted field in Frappe list queries
    // for Item Group. Only fetch: name, item_group_name, parent_item_group, is_group.
    const fetchCategories = async () => {
        try {
            setLoading(true); setError(null);
            // Permitted list fields only – NO description
            const fields = encodeURIComponent(JSON.stringify(['name', 'item_group_name', 'parent_item_group', 'is_group']));
            const res = await fetch(`/api/resource/Item%20Group?fields=${fields}&limit=500`);
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Failed to fetch categories: ${res.status} - ${JSON.stringify(e)}`); }
            const list: Category[] = (await res.json()).data || [];
            setCategories(list);

            // Item counts (is_stock_item = 1 only)
            const counts: Record<string, number> = {};
            await Promise.all(list.map(async cat => {
                try {
                    const f = encodeURIComponent(JSON.stringify([['item_group', '=', cat.name], ['is_stock_item', '=', '1']]));
                    const r = await fetch(`/api/resource/Item?filters=${f}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=1`);
                    if (r.ok) counts[cat.name] = ((await r.json()).data || []).length;
                } catch { counts[cat.name] = 0; }
            }));
            setItemCounts(counts);
        } catch (err: any) { setError(err.message || 'Error loading categories'); }
        finally { setLoading(false); }
    };

    // ── Add category ──────────────────────────────────────────────────────────
    // category_code → item_group_name; display_order intentionally OMITTED
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload: any = {
                item_group_name: newCat.category_code, // category_code maps to item_group_name
                description: newCat.description,
                is_group: 0,
                ...(newCat.parent_item_group && { parent_item_group: newCat.parent_item_group }),
            };
            const res = await fetch('/api/resource/Item%20Group', { method: 'POST', headers: mutationHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            setShowAddModal(false);
            setNewCat({ category_code: '', description: '', parent_item_group: '' });
            fetchCategories();
        } catch (err: any) { alert('Error creating category: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Open edit modal ────────────────────────────────────────────────────────
    // Individual document fetch — description IS available here
    const handleEdit = async (name: string) => {
        try {
            const res = await fetch(`/api/resource/Item%20Group/${encodeURIComponent(name)}`);
            if (!res.ok) throw new Error('Failed to fetch category');
            const det = (await res.json()).data;
            setEditCat({ name: det.name, item_group_name: det.item_group_name, description: det.description || '', parent_item_group: det.parent_item_group || '' });
            setShowEditModal(true);
        } catch (err: any) { alert('Could not fetch category: ' + err.message); }
    };

    // ── Update category ───────────────────────────────────────────────────────
    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editCat) return; setIsSubmitting(true);
        try {
            const payload: any = {
                item_group_name: editCat.item_group_name,
                description: editCat.description,
                ...(editCat.parent_item_group && { parent_item_group: editCat.parent_item_group }),
            };
            const res = await fetch(`/api/resource/Item%20Group/${encodeURIComponent(editCat.name)}`, { method: 'PUT', headers: mutationHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            setShowEditModal(false); fetchCategories();
        } catch (err: any) { alert('Error updating category: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Delete category ───────────────────────────────────────────────────────
    const handleDelete = async (name: string) => {
        const cat = categories.find(c => c.name === name);
        const label = cat?.item_group_name || name;
        if (!confirm(`Delete "${label}"? This cannot be undone.`)) return;
        try {
            await frappeDelete('Item Group', name);
            setCategories(prev => prev.filter(c => c.name !== name));
            setItemCounts(prev => { const n = { ...prev }; delete n[name]; return n; });
        } catch (err: any) {
            const msg = err.message || '';
            alert(msg.toLowerCase().includes('link') || msg.toLowerCase().includes('exist')
                ? `Cannot delete "${label}" — it has linked items or sub-categories.`
                : 'Error deleting: ' + msg);
        }
    };

    const filtered = categories.filter(cat => {
        const t = searchTerm.toLowerCase();
        return (cat.item_group_name || '').toLowerCase().includes(t) || cat.name.toLowerCase().includes(t);
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
            title="Categories"
            subtitle="Manage item categories and master data"
        >
            <section className="flex-1 bg-background h-full overflow-y-auto">
                        <div className="border-b border-border bg-background sticky top-0 z-10">
                            <div className="flex h-16 items-center px-6 justify-between">
                                <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
                                <button className="inline-flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground text-gray-500" title="Help"><CircleHelp className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                <div className="flex flex-col space-y-1.5 p-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-semibold leading-none tracking-tight">Categories</h3>
                                            <p className="text-sm text-muted-foreground mt-1">Manage item group categories (Item Group Doctype)</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setShowAddModal(true)} className={BTN_P}><Plus className="h-4 w-4" />Add Category</button>
                                            <button onClick={fetchCategories} className={BTN_O}>Refresh</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                        <div className="relative flex-1 max-w-sm">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <input className={INPUT + ' pl-9'} placeholder="Search categories..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 pt-0">
                                    {loading ? (
                                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                                    ) : error ? (
                                        <div className="text-center text-destructive p-8">{error}<br /><button onClick={fetchCategories} className="mt-4 text-sm text-primary underline">Try Again</button></div>
                                    ) : filtered.length === 0 ? (
                                        <div className="text-center text-muted-foreground p-8">No categories found</div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {filtered.map(cat => (
                                                <div key={cat.name} className="flex items-start justify-between p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <Tags className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-foreground">{cat.item_group_name || cat.name}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5 font-mono">Code: {cat.name}</div>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                <span className="text-xs text-muted-foreground">{itemCounts[cat.name] ?? 0} stock items</span>
                                                                {cat.parent_item_group && <span className="text-xs text-muted-foreground">· Parent: {cat.parent_item_group}</span>}
                                                            </div>
                                                        </div>
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground ml-2 shrink-0">{cat.is_group ? 'Group' : 'Category'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                                        <button onClick={() => handleEdit(cat.name)} title="Edit" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                                                        <button onClick={() => handleDelete(cat.name)} title="Delete" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-destructive"><Trash2 className="h-4 w-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

            {/* ADD MODAL */}
            {showAddModal && (
                <Modal title="Add New Category" onClose={() => setShowAddModal(false)}>
                    <form className="space-y-4" onSubmit={handleAddCategory}>
                        {/* category_code → item_group_name; display_order REMOVED */}
                        <F label="Category Code *" hint="Maps to item_group_name in Item Group Doctype" id="ac_code">
                            <input id="ac_code" type="text" required className={INPUT} placeholder="e.g., Beverages, Dry Goods" value={newCat.category_code} onChange={e => setNewCat({ ...newCat, category_code: e.target.value })} />
                        </F>
                        <F label="Description" id="ac_desc">
                            <textarea id="ac_desc" rows={3} className={TEXTAREA} placeholder="Optional description" value={newCat.description} onChange={e => setNewCat({ ...newCat, description: e.target.value })} />
                        </F>
                        <F label="Parent Category" id="ac_parent">
                            <select id="ac_parent" className={INPUT} value={newCat.parent_item_group} onChange={e => setNewCat({ ...newCat, parent_item_group: e.target.value })}>
                                <option value="">None (Root Category)</option>
                                {categories.filter(c => c.is_group).map(c => <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>)}
                            </select>
                        </F>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" className={BTN_O} onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button type="submit" className={BTN_P} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Category'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* EDIT MODAL */}
            {showEditModal && editCat && (
                <Modal title="Edit Category" onClose={() => setShowEditModal(false)}>
                    <form className="space-y-4" onSubmit={handleUpdateCategory}>
                        <F label="Category Code" hint="Frappe document name — read-only" id="ec_code">
                            <input id="ec_code" type="text" readOnly disabled className={INPUT + ' bg-muted text-muted-foreground'} value={editCat.name} />
                        </F>
                        <F label="Category Name *" id="ec_name">
                            <input id="ec_name" type="text" required className={INPUT} value={editCat.item_group_name} onChange={e => setEditCat({ ...editCat, item_group_name: e.target.value })} />
                        </F>
                        <F label="Description" id="ec_desc">
                            <textarea id="ec_desc" rows={3} className={TEXTAREA} value={editCat.description} onChange={e => setEditCat({ ...editCat, description: e.target.value })} />
                        </F>
                        <F label="Parent Category" id="ec_parent">
                            <select id="ec_parent" className={INPUT} value={editCat.parent_item_group} onChange={e => setEditCat({ ...editCat, parent_item_group: e.target.value })}>
                                <option value="">None (Root Category)</option>
                                {categories.filter(c => c.is_group && c.name !== editCat.name).map(c => <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>)}
                            </select>
                        </F>
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

export default CategoriesManagement;