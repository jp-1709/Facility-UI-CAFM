import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Search, Plus, CircleHelp,
    Package, Tags, Ruler, Truck, FileText, Package2, PackageMinus,
    ArrowUpDown, ChartColumn, ClipboardList, TriangleAlert, X,
    Edit2, Trash2, SlidersHorizontal,
} from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import CategoriesView from '../components/CategoriesView';
import UnitsView from '../components/UnitsView';
import Pagination from '../components/Pagination';
import Suppliers from './Suppliers';
import PurchaseOrders from './PurchaseOrders';
import GoodsReceipts from './GoodsReceipts';
import SupplierReturns from './SupplierReturns';
import StockTransfers from './StockTransfers';
import StockTracking from './StockTracking';

// ─── Frappe helpers ───────────────────────────────────────────────────────────

/**
 * Retrieve the Frappe CSRF token.
 * All POST / PUT / DELETE requests MUST include X-Frappe-CSRF-Token
 * or the server will silently reject / return 403.
 */
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
        try {
            const msgs = JSON.parse(errData._server_messages);
            return JSON.parse(msgs[0]).message || errData.message || 'An error occurred';
        } catch { /* fall through */ }
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
    const res = await fetch(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        { method: 'DELETE', headers: mutationHeaders() }
    );
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(parseFrappeError(errData));
    }
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface StockItem {
    item_code: string; item_name: string; description: string;
    item_group: string; stock_uom: string; warehouse: string;
    actual_qty: number; min_order_qty: number; valuation_rate: number;
    conversion_factor: number; minimum_stock: number; supplier_id: string;
    in_stock: boolean;
}
interface NewItemForm {
    item_name: string; description: string; item_group: string;
    stock_uom: string; warehouse: string; conversion_factor: number;
    current_stock: number; minimum_stock: number; supplier_id: string;
}
interface EditItemForm extends NewItemForm { item_code: string; actual_qty: number; }
interface AdjustStockForm {
    item_code: string; warehouse: string;
    stock_entry_type: string; qty: number; conversion_factor: number;
    company: string; branch: string;
}

const STOCK_ENTRY_TYPES = ['Material Receipt', 'Material Issue', 'Material Transfer', 'Stock Reconciliation'];
const EMPTY_NEW: NewItemForm = {
    item_name: '', description: '', item_group: '', stock_uom: '',
    warehouse: '', conversion_factor: 0, current_stock: 0, minimum_stock: 0, supplier_id: '',
};

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const INPUT = 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2A26] placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA = 'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20 hover:opacity-90 hover:-translate-y-px h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-gray-200 bg-white text-gray-700 hover:border-[#E4B315]/40 hover:text-[#C69A11] h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Small components ─────────────────────────────────────────────────────────
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
            {label}
            {hint && <span className="text-xs text-muted-foreground block mt-0.5">{hint}</span>}
        </label>
        {children}
    </div>
);

const ItemCard: React.FC<StockItem & { onEdit: (c: string) => void; onDelete: (c: string) => void; onAdjust: (c: string) => void }> = (
    { item_code, item_name, item_group, in_stock, actual_qty, min_order_qty, conversion_factor, stock_uom, onEdit, onDelete, onAdjust }
) => (
    <div className="flex items-start justify-between p-4 border border-border rounded-lg bg-card hover:shadow-sm transition-shadow">
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{item_name}</span>
                {in_stock
                    ? <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-green-500 text-white">In Stock</span>
                    : <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-destructive text-destructive-foreground"><TriangleAlert className="h-3 w-3" />Out of Stock</span>}
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-border text-muted-foreground bg-secondary">{item_group || 'All Item Groups'}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{item_code}</div>
            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                <span>Total: {actual_qty.toFixed(2)}</span>
                <span>Min: {min_order_qty.toFixed(2)}</span>
                <span>Cost: KSh {conversion_factor.toFixed(2)}/{stock_uom || 'pc'}</span>
            </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
            <button onClick={() => onAdjust(item_code)} title="Adjust" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-blue-500"><SlidersHorizontal className="h-4 w-4" /></button>
            <button onClick={() => onEdit(item_code)} title="Edit" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
            <button onClick={() => onDelete(item_code)} title="Delete" className="inline-flex items-center justify-center h-9 rounded-md px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-destructive"><Trash2 className="h-4 w-4" /></button>
        </div>
    </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

// Material Request interfaces
interface MaterialRequestItem {
    item_code: string;
    item_name: string;
    qty: number;
    uom: string;
    description?: string;
}

interface MaterialRequestForm {
    warehouse: string;
    required_date: string;
    items: MaterialRequestItem[];
}

const InventoryManagement: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Map paths to views
    const getInitialView = () => {
        const path = location.pathname;
        if (path === '/suppliers') return 'suppliers';
        if (path === '/purchase-orders') return 'purchase-orders';
        if (path === '/goods-receipts') return 'goods-receipts';
        if (path === '/supplier-returns') return 'supplier-returns';
        if (path === '/stock-transfers') return 'stock-transfers';
        if (path === '/stock-tracking') return 'stock-tracking';
        if (path === '/categories') return 'categories';
        if (path === '/units') return 'units';
        return 'stock'; // default for /inventory
    };

    const [currentView, setCurrentView] = useState<'stock' | 'categories' | 'units' | 'suppliers' | 'purchase-orders' | 'goods-receipts' | 'supplier-returns' | 'stock-transfers' | 'stock-tracking' | 'requisitions'>(getInitialView());

    useEffect(() => {
        const newView = getInitialView();
        setCurrentView(newView);
    }, [location.pathname]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    const [categories, setCategories] = useState<{ name: string; item_group_name: string }[]>([]);
    const [uoms, setUoms] = useState<{ name: string }[]>([]);
    const [warehouses, setWarehouses] = useState<{ name: string }[]>([]);
    const [suppliers, setSuppliers] = useState<{ name: string; supplier_name: string }[]>([]);
    const [companies, setCompanies] = useState<{ name: string }[]>([]);
    const [branches, setBranches] = useState<{ name: string; branch?: string }[]>([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showRequisitionModal, setShowRequisitionModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newItem, setNewItem] = useState<NewItemForm>({ ...EMPTY_NEW });
    const [editItem, setEditItem] = useState<EditItemForm | null>(null);
    const [adjustForm, setAdjustForm] = useState<AdjustStockForm>({ item_code: '', warehouse: '', stock_entry_type: 'Material Receipt', qty: 0, conversion_factor: 0, company: '', branch: '' });
    const [requisitionForm, setRequisitionForm] = useState<MaterialRequestForm>({
        warehouse: '',
        required_date: '',
        items: []
    });

    const [itemSearchTerm, setItemSearchTerm] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [filteredItems, setFilteredItems] = useState<StockItem[]>([]);
    const searchDropdownRef = useRef<HTMLDivElement>(null);
    const [materialRequests, setMaterialRequests] = useState<any[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    // Filter items based on search term
    useEffect(() => {
        if (itemSearchTerm.trim() === '') {
            setFilteredItems([]);
            setShowItemDropdown(false);
        } else {
            const filtered = stockItems.filter(item =>
                item.item_name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
                item.item_code.toLowerCase().includes(itemSearchTerm.toLowerCase())
            ).slice(0, 10); // Limit to 10 results
            setFilteredItems(filtered);
            setShowItemDropdown(filtered.length > 0);
        }
    }, [itemSearchTerm, stockItems]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setShowItemDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => { fetchStockItems(); fetchMetadata(); }, []);

    // Fetch Material Requests when switching to requisitions view
    useEffect(() => {
        if (currentView === 'requisitions') {
            fetchMaterialRequests();
        }
    }, [currentView]);

    // ── Fetch Material Requests ─────────────────────────────────────────────────────
    const fetchMaterialRequests = async () => {
        try {
            setLoadingRequests(true);

            // Test with basic fields first to verify availability - removed per_completed field
            const response = await fetch('/api/resource/Material%20Request?fields=["name","status","company","schedule_date","creation","modified"]&filters=[["material_request_type","=","Material Transfer"]]&order_by=creation desc&limit=50', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();

            if (data.data && Array.isArray(data.data)) {
                console.log('Material Request data fetched successfully:', data.data);
                setMaterialRequests(data.data);
            } else {
                console.log('No Material Request data found:', data);
                setMaterialRequests([]);
            }
        } catch (err) {
            console.error('Error fetching material requests:', err);
            setMaterialRequests([]);
        } finally {
            setLoadingRequests(false);
        }
    };

    // ── Fetch stock items ─────────────────────────────────────────────────────
    // IMPORTANT: 'description' is NOT permitted in Frappe list queries.
    // It is fetched per-document only (in the detail call below).
    const fetchStockItems = async () => {
        try {
            setLoading(true); setError(null);
            const fields = encodeURIComponent(JSON.stringify(['name', 'item_code', 'item_name', 'item_group', 'stock_uom', 'valuation_rate']));
            const filters = encodeURIComponent(JSON.stringify([['is_stock_item', '=', '1']]));
            const res = await fetch(`/api/resource/Item?filters=${filters}&fields=${fields}&limit=500`);
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            const rawItems: any[] = (await res.json()).data || [];

            const enriched = await Promise.all(rawItems.map(async (item: any) => {
                // Current stock from Bin
                let actual_qty = 0;
                try {
                    const binF = encodeURIComponent(JSON.stringify([['item_code', '=', item.item_code]]));
                    const binFld = encodeURIComponent(JSON.stringify(['actual_qty']));
                    const br = await fetch(`/api/resource/Bin?filters=${binF}&fields=${binFld}&limit=100`);
                    if (br.ok) actual_qty = ((await br.json()).data || []).reduce((s: number, b: any) => s + (b.actual_qty || 0), 0);
                } catch { /* non-fatal */ }

                // Full item doc for child tables + description
                let conversion_factor = item.valuation_rate || 0, minimum_stock = 0, supplier_id = '', warehouse = '', description = '';
                try {
                    const dr = await fetch(`/api/resource/Item/${encodeURIComponent(item.item_code)}`);
                    if (dr.ok) {
                        const d = (await dr.json()).data;
                        description = d.description || '';
                        if (d.uoms?.length) conversion_factor = d.uoms[0].conversion_factor ?? conversion_factor;
                        if (d.reorder_levels?.length) { minimum_stock = d.reorder_levels[0].warehouse_reorder_level ?? 0; warehouse = d.reorder_levels[0].warehouse ?? ''; }
                        if (d.supplier_items?.length) supplier_id = d.supplier_items[0].supplier ?? '';
                    }
                } catch { /* non-fatal */ }

                return { item_code: item.item_code, item_name: item.item_name, description, item_group: item.item_group || '', stock_uom: item.stock_uom || '', warehouse, actual_qty, min_order_qty: minimum_stock || 1, valuation_rate: item.valuation_rate || 0, conversion_factor, minimum_stock, supplier_id, in_stock: actual_qty > 0 } as StockItem;
            }));
            setStockItems(enriched);
        } catch (err: any) { setError(err.message || 'Error loading stock items'); }
        finally { setLoading(false); }
    };

    // ── Fetch metadata ────────────────────────────────────────────────────────
    // Only safe list-permitted fields are requested here.
    const fetchMetadata = async () => {
        try {
            const [cR, uR, wR, sR, coR, bR] = await Promise.all([
                fetch(`/api/resource/Item%20Group?filters=${encodeURIComponent(JSON.stringify([['is_group', '=', '0']]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'item_group_name']))}&limit=200`),
                fetch(`/api/resource/UOM?filters=${encodeURIComponent(JSON.stringify([['enabled', '=', '1']]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'uom_name']))}&limit=200`),
                fetch(`/api/resource/Warehouse?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=200`),
                fetch(`/api/resource/Supplier?fields=${encodeURIComponent(JSON.stringify(['name', 'supplier_name']))}&limit=200`),
                fetch(`/api/resource/Company?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=200`),
                fetch('/api/method/frappe.client.get_list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        doctype: 'Branch',
                        fields: ['name', 'branch'],
                        limit_page_length: 200
                    })
                })
            ]);
            if (cR.ok) setCategories((await cR.json()).data || []);
            if (uR.ok) setUoms((await uR.json()).data || []);
            if (wR.ok) setWarehouses((await wR.json()).data || []);
            if (sR.ok) setSuppliers((await sR.json()).data || []);
            if (coR.ok) setCompanies((await coR.json()).data || []);
            if (bR.ok) {
                const branchData = await bR.json();
                setBranches(branchData.message || []);
            }
        } catch (err) { console.error('Metadata fetch error:', err); }
    };

    // ── Add stock item ────────────────────────────────────────────────────────
    const handleAddStockItem = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try {
            const payload: any = {
                item_name: newItem.item_name, item_code: newItem.item_name,
                description: newItem.description, item_group: newItem.item_group,
                stock_uom: newItem.stock_uom, is_stock_item: 1,
                has_serial_no: 0, has_batch_no: 0, include_item_in_manufacturing: 0,
                uoms: newItem.stock_uom ? [{ uom: newItem.stock_uom, conversion_factor: newItem.conversion_factor || 1 }] : [],
                reorder_levels: newItem.minimum_stock > 0 && newItem.warehouse ? [{ warehouse: newItem.warehouse, warehouse_reorder_level: newItem.minimum_stock, warehouse_reorder_qty: newItem.minimum_stock, material_request_type: 'Purchase' }] : [],
                supplier_items: newItem.supplier_id ? [{ supplier: newItem.supplier_id }] : [],
            };
            const res = await fetch('/api/resource/Item', { method: 'POST', headers: mutationHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            const created = (await res.json()).data;

            if (newItem.current_stock > 0 && newItem.warehouse) {
                // For new item creation, we should use the first available company and branch or require user to select
                const defaultCompany = companies.length > 0 ? companies[0].name : '';
                const defaultBranch = branches.length > 0 ? branches[0].name : '';
                if (!defaultCompany) {
                    alert('Error: No companies available. Please ensure companies are set up in the system.');
                    return;
                }
                if (!defaultBranch) {
                    alert('Error: No branches available. Please ensure branches are set up in the system.');
                    return;
                }
                await submitStockEntry({ item_code: created.item_code, warehouse: newItem.warehouse, stock_entry_type: 'Material Receipt', qty: newItem.current_stock, conversion_factor: newItem.conversion_factor || 0, company: defaultCompany, branch: defaultBranch });
            }
            setShowAddModal(false); setNewItem({ ...EMPTY_NEW }); fetchStockItems();
        } catch (err: any) { alert('Error creating stock item: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Open edit modal ───────────────────────────────────────────────────────
    const handleEdit = async (item_code: string) => {
        try {
            const res = await fetch(`/api/resource/Item/${encodeURIComponent(item_code)}`);
            if (!res.ok) throw new Error('Failed to fetch item');
            const det = (await res.json()).data;
            const ex = stockItems.find(i => i.item_code === item_code);
            setEditItem({
                item_code: det.item_code, item_name: det.item_name,
                description: det.description || '', item_group: det.item_group || '',
                stock_uom: det.stock_uom || '',
                warehouse: det.reorder_levels?.[0]?.warehouse || ex?.warehouse || '',
                conversion_factor: det.uoms?.[0]?.conversion_factor ?? ex?.conversion_factor ?? 0,
                minimum_stock: det.reorder_levels?.[0]?.warehouse_reorder_level ?? ex?.minimum_stock ?? 0,
                supplier_id: det.supplier_items?.[0]?.supplier ?? ex?.supplier_id ?? '',
                current_stock: ex?.actual_qty ?? 0, actual_qty: ex?.actual_qty ?? 0,
            });
            setShowEditModal(true);
        } catch (err: any) { alert('Could not fetch item details: ' + err.message); }
    };

    // ── Update stock item ─────────────────────────────────────────────────────
    const handleUpdateStockItem = async (e: React.FormEvent) => {
        e.preventDefault(); if (!editItem) return; setIsSubmitting(true);
        try {
            const payload: any = {
                item_name: editItem.item_name, description: editItem.description,
                item_group: editItem.item_group, stock_uom: editItem.stock_uom,
                uoms: editItem.stock_uom ? [{ uom: editItem.stock_uom, conversion_factor: editItem.conversion_factor || 1 }] : [],
                reorder_levels: editItem.warehouse ? [{ warehouse: editItem.warehouse, warehouse_reorder_level: editItem.minimum_stock, warehouse_reorder_qty: editItem.minimum_stock, material_request_type: 'Purchase' }] : [],
                supplier_items: editItem.supplier_id ? [{ supplier: editItem.supplier_id }] : [],
            };
            const res = await fetch(`/api/resource/Item/${encodeURIComponent(editItem.item_code)}`, { method: 'PUT', headers: mutationHeaders(), body: JSON.stringify(payload) });
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            setShowEditModal(false); fetchStockItems();
        } catch (err: any) { alert('Error updating item: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (item_code: string) => {
        if (!confirm(`Delete "${item_code}"? This cannot be undone.`)) return;
        try {
            await frappeDelete('Item', item_code);
            setStockItems(prev => prev.filter(i => i.item_code !== item_code));
        } catch (err: any) {
            const msg = err.message || '';
            alert(msg.toLowerCase().includes('link') || msg.toLowerCase().includes('exist')
                ? `Cannot delete "${item_code}" — it has linked records. Disable it instead.`
                : 'Error deleting: ' + msg);
        }
    };

    // ── Adjust stock ──────────────────────────────────────────────────────────
    const handleAdjust = (item_code: string) => {
        const item = stockItems.find(i => i.item_code === item_code);
        setAdjustForm({ item_code, warehouse: item?.warehouse || '', stock_entry_type: 'Material Receipt', qty: 0, conversion_factor: item?.conversion_factor ?? 0, company: '', branch: '' });
        setShowAdjustModal(true);
    };

    const submitStockEntry = async (params: AdjustStockForm) => {
        const isIn = ['Material Receipt', 'Stock Reconciliation'].includes(params.stock_entry_type);
        const payload: any = {
            stock_entry_type: params.stock_entry_type,
            company: params.company,
            branch: params.branch,
            items: [{ item_code: params.item_code, qty: params.qty, basic_rate: params.conversion_factor, ...(isIn ? { t_warehouse: params.warehouse } : { s_warehouse: params.warehouse }) }],
        };
        // Step 1: create draft
        const res = await fetch('/api/resource/Stock%20Entry', { method: 'POST', headers: mutationHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
        const created = (await res.json()).data;
        // Step 2: submit
        const subRes = await fetch(`/api/resource/Stock%20Entry/${encodeURIComponent(created.name)}`, { method: 'PUT', headers: mutationHeaders(), body: JSON.stringify({ docstatus: 1 }) });
        if (!subRes.ok) { const e = await subRes.json().catch(() => ({})); throw new Error('Submit failed: ' + parseFrappeError(e)); }
        return created;
    };

    const handleAdjustStock = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSubmitting(true);
        try { await submitStockEntry(adjustForm); setShowAdjustModal(false); fetchStockItems(); }
        catch (err: any) { alert('Error adjusting stock: ' + err.message); }
        finally { setIsSubmitting(false); }
    };

    // ── Material Request functions ───────────────────────────────────────────────
    const createMaterialRequest = async (formData: MaterialRequestForm) => {
        try {
            setIsSubmitting(true);

            // Create Material Request payload
            const payload = {
                doctype: 'Material Request',
                material_request_type: 'Material Transfer',
                purpose: 'Material Transfer',
                schedule_date: formData.required_date,
                from_warehouse: formData.warehouse,
                to_warehouse: 'Stores - QR',
                company: 'Quantbit Restro',
                status: 'Draft',
                items: formData.items.map(item => ({
                    item_code: item.item_code,
                    item_name: item.item_name,
                    qty: item.qty,
                    uom: item.uom,
                    description: item.description || '',
                    schedule_date: formData.required_date
                }))
            };

            const response = await fetch('/api/resource/Material%20Request', {
                method: 'POST',
                headers: mutationHeaders(),
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Material Request created successfully!');
                setShowRequisitionModal(false);
                setRequisitionForm({ warehouse: '', required_date: '', items: [] });
                // Refresh the Material Requests list
                fetchMaterialRequests();
            } else {
                const errorMsg = parseFrappeError(result);
                alert(`Error creating Material Request: ${errorMsg}`);
            }
        } catch (err) {
            console.error('Error creating Material Request:', err);
            alert('An unexpected error occurred while creating the Material Request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCreateRequisition = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await createMaterialRequest(requisitionForm);
            setShowRequisitionModal(false);
            setRequisitionForm({ warehouse: '', required_date: '', items: [] });
            alert('Material Request created successfully!');
        } catch (err: any) {
            alert('Error creating Material Request: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addRequisitionItem = (item: StockItem) => {
        const newItem: MaterialRequestItem = {
            item_code: item.item_code,
            item_name: item.item_name,
            qty: 1,
            uom: item.stock_uom || 'Nos'
        };

        setRequisitionForm(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    const removeRequisitionItem = (index: number) => {
        setRequisitionForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const updateRequisitionItem = (index: number, field: keyof MaterialRequestItem, value: string | number) => {
        setRequisitionForm(prev => ({
            ...prev,
            items: prev.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        }));
    };

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = stockItems.filter(i => {
        const t = searchTerm.toLowerCase();
        return (i.item_name.toLowerCase().includes(t) || i.item_code.toLowerCase().includes(t))
            && (!selectedCategory || i.item_group === selectedCategory)
            && (!selectedDepartment || i.warehouse === selectedDepartment);
    });

    // Pagination logic
    const paginatedItems = filtered.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filtered.length / itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, selectedDepartment, itemsPerPage]);

    // ── Sidebar nav item ──────────────────────────────────────────────────────
    const Nav: React.FC<{ icon: React.ReactNode; label: string; view?: 'stock' | 'categories' | 'units' | 'suppliers' | 'purchase-orders' | 'goods-receipts' | 'supplier-returns' | 'stock-transfers' | 'stock-tracking' | 'requisitions'; active?: boolean; onClick?: () => void }> = ({ icon, label, view, active, onClick }) => (
        <li>
            <button type="button" onClick={onClick || (view && (() => setCurrentView(view)))} aria-current={active ? 'page' : undefined}
                className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active
                    ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm shadow-[#E4B315]/25'
                    : 'text-gray-500 hover:bg-[#E4B315]/8 hover:text-[#C69A11]'
                    }`}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-white/80" />}
                <span className={active ? 'text-white' : 'text-[#C69A11]'}>{icon}</span>
                <span>{label}</span>
            </button>
        </li>
    );

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <PageLayout
            title="Inventory Management"
            subtitle="Manage stock items, suppliers, purchasing and operations"
        >
            <section className="flex-1 bg-gray-50/80 overflow-auto min-h-0">
                {currentView === 'stock' && (
                        <>
                            <div className="border-b border-border bg-background sticky top-0 z-10">
                                <div className="flex h-16 items-center px-6 justify-between">
                                    <h1 className="text-2xl font-semibold text-foreground">Stock Items</h1>
                                    <button className="inline-flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground text-gray-500" title="Help"><CircleHelp className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                    <div className="flex flex-col space-y-1.5 p-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-2xl font-semibold leading-none tracking-tight">Stock Items</h3>
                                                <p className="text-sm text-muted-foreground mt-1">Manage your restaurant's stock inventory</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setShowAddModal(true)} className={BTN_P}><Plus className="h-4 w-4" />Add Stock Item</button>
                                                <button onClick={fetchStockItems} className={BTN_O}>Refresh</button>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border flex-wrap">
                                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <input className={INPUT + ' pl-9'} placeholder="Search stock items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                            </div>
                                            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className={INPUT + ' w-[180px]'}>
                                                <option value="">All Categories</option>
                                                {categories.map(c => <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>)}
                                            </select>
                                            <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className={INPUT + ' w-[180px]'}>
                                                <option value="">All Departments</option>
                                                {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="p-6 pt-0">
                                        {loading ? (
                                            <div className="flex justify-center p-8"><div className="relative w-8 h-8"><div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20" /><div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" /></div></div>
                                        ) : error ? (
                                            <div className="text-center text-destructive p-8">{error}<br /><button onClick={fetchStockItems} className="mt-4 text-sm text-primary underline">Try Again</button></div>
                                        ) : filtered.length === 0 ? (
                                            <div className="text-center text-muted-foreground p-8">No stock items found</div>
                                        ) : (
                                            <>
                                                <div className="grid gap-4 max-h-[60vh] overflow-y-auto">
                                                    {paginatedItems.map(item => <ItemCard key={item.item_code} {...item} onEdit={handleEdit} onDelete={handleDelete} onAdjust={handleAdjust} />)}
                                                </div>

                                                {/* Pagination */}
                                                {totalPages > 1 && (
                                                    <div className="mt-6">
                                                        <Pagination
                                                            currentPage={currentPage}
                                                            totalPages={totalPages}
                                                            onPageChange={setCurrentPage}
                                                            itemsPerPage={itemsPerPage}
                                                            totalItems={filtered.length}
                                                            onItemsPerPageChange={setItemsPerPage}
                                                        />
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {currentView === 'categories' && <CategoriesView onNavigateBack={() => setCurrentView('stock')} />}
                    {currentView === 'units' && <UnitsView onNavigateBack={() => setCurrentView('stock')} />}
                    {currentView === 'requisitions' && (
                        <>
                            <div className="border-b border-border bg-background sticky top-0 z-10">
                                <div className="flex h-16 items-center px-6 justify-between">
                                    <h1 className="text-2xl font-semibold text-foreground">Material Requests</h1>
                                    <button className="inline-flex items-center justify-center h-10 w-10 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground text-gray-500" title="Help"><CircleHelp className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <div className="p-6">
                                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                                    <div className="flex flex-col space-y-1.5 p-6">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="text-2xl font-semibold leading-none tracking-tight">Material Transfer Requests</h3>
                                                <p className="text-sm text-muted-foreground mt-1">Manage material transfer requests between warehouses</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setShowRequisitionModal(true)} className={BTN_P}><Plus className="h-4 w-4" />New Requisition</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 pt-0">
                                        {loadingRequests ? (
                                            <div className="flex items-center justify-center p-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                <span className="ml-2 text-muted-foreground">Loading material requests...</span>
                                            </div>
                                        ) : materialRequests.length === 0 ? (
                                            <div className="text-center text-muted-foreground p-8">
                                                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                                <p className="text-lg font-medium mb-2">No Material Requests Found</p>
                                                <p className="text-sm mb-4">Create your first material transfer requisition to get started</p>
                                                <button onClick={() => setShowRequisitionModal(true)} className={BTN_P}>
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Create Requisition
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="border-b border-border">
                                                            <th className="text-left p-3 font-medium text-sm text-muted-foreground">Request ID</th>
                                                            <th className="text-left p-3 font-medium text-sm text-muted-foreground">Company</th>
                                                            <th className="text-left p-3 font-medium text-sm text-muted-foreground">Required Date</th>
                                                            <th className="text-left p-3 font-medium text-sm text-muted-foreground">Status</th>
                                                            <th className="text-left p-3 font-medium text-sm text-muted-foreground">Created</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {materialRequests.map((request, index) => (
                                                            <tr key={request.name} className={`border-b border-border hover:bg-muted/30 transition-colors ${index === 0 ? 'border-t' : ''}`}>
                                                                <td className="p-3">
                                                                    <div className="font-medium text-sm">{request.name}</div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="text-sm">{request.company || '-'}</div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="text-sm">{request.schedule_date ? new Date(request.schedule_date).toLocaleDateString() : '-'}</div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${request.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
                                                                        request.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                                                                            request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                                                request.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                                    request.status === 'Partially Fulfilled' ? 'bg-yellow-100 text-yellow-800' :
                                                                                        request.status === 'Fulfilled' ? 'bg-green-100 text-green-800' :
                                                                                            'bg-gray-100 text-gray-800'
                                                                        }`}>
                                                                        {request.status || 'Draft'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="text-sm">{new Date(request.creation).toLocaleDateString()}</div>
                                                                    <div className="text-xs text-muted-foreground">{new Date(request.creation).toLocaleTimeString()}</div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {currentView === 'suppliers' && <Suppliers />}
                    {currentView === 'purchase-orders' && <PurchaseOrders />}
                    {currentView === 'goods-receipts' && <GoodsReceipts />}
                    {currentView === 'supplier-returns' && <SupplierReturns />}
                    {currentView === 'stock-transfers' && <StockTransfers />}
                    {currentView === 'stock-tracking' && <StockTracking />}
                </section>
            {/* ADD MODAL */}
            {showAddModal && (
                <Modal title="Add New Stock Item" onClose={() => setShowAddModal(false)}>
                    <form className="space-y-4" onSubmit={handleAddStockItem}>
                        <F label="Stock Item Name *" id="a_name"><input id="a_name" type="text" required className={INPUT} placeholder="e.g., Tomatoes, Flour" value={newItem.item_name} onChange={e => setNewItem({ ...newItem, item_name: e.target.value })} /></F>
                        <F label="Description" id="a_desc"><textarea id="a_desc" rows={2} className={TEXTAREA} placeholder="Optional description" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} /></F>
                        <F label="Category *" id="a_cat"><select id="a_cat" required className={INPUT} value={newItem.item_group} onChange={e => setNewItem({ ...newItem, item_group: e.target.value })}><option value="">Select a category</option>{categories.map(c => <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>)}</select></F>
                        <F label="Unit *" hint="From UOM Doctype" id="a_uom"><select id="a_uom" required className={INPUT} value={newItem.stock_uom} onChange={e => setNewItem({ ...newItem, stock_uom: e.target.value })}><option value="">Select a unit</option>{uoms.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}</select></F>
                        <F label="Department (Warehouse)" id="a_wh"><select id="a_wh" className={INPUT} value={newItem.warehouse} onChange={e => setNewItem({ ...newItem, warehouse: e.target.value })}><option value="">Select warehouse</option>{warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}</select></F>
                        <div className="grid grid-cols-2 gap-4">
                            <F label="Cost Per Unit" hint="uoms[].conversion_factor" id="a_cost"><input id="a_cost" type="number" step="0.01" min="0" className={INPUT} placeholder="0.00" value={newItem.conversion_factor || ''} onChange={e => setNewItem({ ...newItem, conversion_factor: parseFloat(e.target.value) || 0 })} /></F>
                            <F label="Opening Stock" hint="Creates a Stock Entry" id="a_stock"><input id="a_stock" type="number" step="0.01" min="0" className={INPUT} placeholder="0.00" value={newItem.current_stock || ''} onChange={e => setNewItem({ ...newItem, current_stock: parseFloat(e.target.value) || 0 })} /></F>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <F label="Minimum Stock" hint="reorder_levels[0].warehouse_reorder_level" id="a_min"><input id="a_min" type="number" step="0.01" min="0" className={INPUT} placeholder="0.00" value={newItem.minimum_stock || ''} onChange={e => setNewItem({ ...newItem, minimum_stock: parseFloat(e.target.value) || 0 })} /></F>
                            <F label="Supplier" hint="supplier_items[0].supplier" id="a_sup"><select id="a_sup" className={INPUT} value={newItem.supplier_id} onChange={e => setNewItem({ ...newItem, supplier_id: e.target.value })}><option value="">Select supplier</option>{suppliers.map(s => <option key={s.name} value={s.name}>{s.supplier_name || s.name}</option>)}</select></F>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" className={BTN_O} onClick={() => setShowAddModal(false)}>Cancel</button>
                            <button type="submit" className={BTN_P} disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Stock Item'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* EDIT MODAL */}
            {showEditModal && editItem && (
                <Modal title="Edit Stock Item" onClose={() => setShowEditModal(false)}>
                    <form className="space-y-4" onSubmit={handleUpdateStockItem}>
                        <F label="Stock Item Name *" id="e_name"><input id="e_name" type="text" required className={INPUT} value={editItem.item_name} onChange={e => setEditItem({ ...editItem, item_name: e.target.value })} /></F>
                        <F label="Description" id="e_desc"><textarea id="e_desc" rows={2} className={TEXTAREA} value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></F>
                        <F label="Category *" id="e_cat"><select id="e_cat" required className={INPUT} value={editItem.item_group} onChange={e => setEditItem({ ...editItem, item_group: e.target.value })}><option value="">Select a category</option>{categories.map(c => <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>)}</select></F>
                        <F label="Unit *" id="e_uom"><select id="e_uom" required className={INPUT} value={editItem.stock_uom} onChange={e => setEditItem({ ...editItem, stock_uom: e.target.value })}><option value="">Select a unit</option>{uoms.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}</select></F>
                        <F label="Department (Warehouse)" id="e_wh"><select id="e_wh" className={INPUT} value={editItem.warehouse} onChange={e => setEditItem({ ...editItem, warehouse: e.target.value })}><option value="">Select warehouse</option>{warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}</select></F>
                        <div className="grid grid-cols-2 gap-4">
                            <F label="Cost Per Unit" id="e_cost"><input id="e_cost" type="number" step="0.01" min="0" className={INPUT} value={editItem.conversion_factor || ''} onChange={e => setEditItem({ ...editItem, conversion_factor: parseFloat(e.target.value) || 0 })} /></F>
                            <F label="Current Stock" hint="Live from Bin — read-only" id="e_qty"><input id="e_qty" type="number" readOnly disabled className={INPUT + ' bg-muted text-muted-foreground'} value={editItem.actual_qty} /></F>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <F label="Minimum Stock" id="e_min"><input id="e_min" type="number" step="0.01" min="0" className={INPUT} value={editItem.minimum_stock || ''} onChange={e => setEditItem({ ...editItem, minimum_stock: parseFloat(e.target.value) || 0 })} /></F>
                            <F label="Supplier" id="e_sup"><select id="e_sup" className={INPUT} value={editItem.supplier_id} onChange={e => setEditItem({ ...editItem, supplier_id: e.target.value })}><option value="">Select supplier</option>{suppliers.map(s => <option key={s.name} value={s.name}>{s.supplier_name || s.name}</option>)}</select></F>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" className={BTN_O} onClick={() => setShowEditModal(false)}>Cancel</button>
                            <button type="submit" className={BTN_P} disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* ADJUST MODAL */}
            {showAdjustModal && (
                <Modal title={`Adjust Stock — ${adjustForm.item_code}`} onClose={() => setShowAdjustModal(false)}>
                    <form className="space-y-4" onSubmit={handleAdjustStock}>
                        <F label="Company *" hint="Company for stock entry validation" id="adj_co"><select id="adj_co" required className={INPUT} value={adjustForm.company} onChange={e => setAdjustForm({ ...adjustForm, company: e.target.value })}><option value="">Select company</option>{companies.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}</select></F>
                        <F label="Branch *" hint="Branch for accounting dimension validation" id="adj_br"><select id="adj_br" required className={INPUT} value={adjustForm.branch} onChange={e => setAdjustForm({ ...adjustForm, branch: e.target.value })}><option value="">Select branch</option>{branches.map(b => <option key={b.name} value={b.name}>{b.branch || b.name}</option>)}</select></F>
                        <F label="Department (Warehouse) *" id="adj_wh"><select id="adj_wh" required className={INPUT} value={adjustForm.warehouse} onChange={e => setAdjustForm({ ...adjustForm, warehouse: e.target.value })}><option value="">Select warehouse</option>{warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}</select></F>
                        <F label="Transaction Type *" hint="Maps to Stock Entry Type" id="adj_type"><select id="adj_type" required className={INPUT} value={adjustForm.stock_entry_type} onChange={e => setAdjustForm({ ...adjustForm, stock_entry_type: e.target.value })}>{STOCK_ENTRY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></F>
                        <div className="grid grid-cols-2 gap-4">
                            <F label="Quantity *" id="adj_qty"><input id="adj_qty" type="number" step="0.01" min="0.01" required className={INPUT} placeholder="0.00" value={adjustForm.qty || ''} onChange={e => setAdjustForm({ ...adjustForm, qty: parseFloat(e.target.value) || 0 })} /></F>
                            <F label="Cost per pc" hint="UOM conversion_factor" id="adj_rate"><input id="adj_rate" type="number" step="0.01" min="0" className={INPUT} placeholder="0.00" value={adjustForm.conversion_factor || ''} onChange={e => setAdjustForm({ ...adjustForm, conversion_factor: parseFloat(e.target.value) || 0 })} /></F>
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                            <button type="button" className={BTN_O} onClick={() => setShowAdjustModal(false)}>Cancel</button>
                            <button type="submit" className={BTN_P} disabled={isSubmitting}>{isSubmitting ? 'Adjusting...' : 'Confirm Adjustment'}</button>
                        </div>
                    </form>
                </Modal>
            )}
            {/* MATERIAL REQUEST MODAL */}
            {showRequisitionModal && (
                <Modal title="Create Material Request" onClose={() => setShowRequisitionModal(false)}>
                    <form className="space-y-6" onSubmit={handleCreateRequisition}>
                        {/* Header Section */}
                        {/* <div className="bg-muted/30 rounded-lg p-4 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold text-foreground">Material Transfer Details</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">Create a material transfer request from selected warehouse to Stores - QR</p>
                        </div> */}

                        {/* Main Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        From Warehouse <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            className={INPUT}
                                            value={requisitionForm.warehouse}
                                            onChange={e => setRequisitionForm({ ...requisitionForm, warehouse: e.target.value })}
                                        >
                                            <option value="">Select source warehouse</option>
                                            {warehouses.map(w => <option key={w.name} value={w.name}>{w.name}</option>)}
                                        </select>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Material will be transferred from this warehouse</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Required Date <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        className={INPUT}
                                        value={requisitionForm.required_date}
                                        onChange={e => setRequisitionForm({ ...requisitionForm, required_date: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Date when materials are required</p>
                                </div>

                                {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-start gap-2">
                                        <Truck className="h-4 w-4 text-blue-600 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-900">Transfer Information</p>
                                            <p className="text-xs text-blue-700 mt-1">
                                                <strong>To:</strong> Stores - QR<br />
                                                <strong>Purpose:</strong> Material Transfer<br />
                                                <strong>Company:</strong> Quantbit Restro
                                            </p>
                                        </div>
                                    </div>
                                </div> */}
                            </div>

                            {/* Right Column - Item Search */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Search & Add Items <span className="text-destructive">*</span>
                                    </label>
                                    <div className="relative" ref={searchDropdownRef}>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                            <input
                                                type="text"
                                                placeholder="Search items by name or code..."
                                                className={INPUT + ' pl-9'}
                                                value={itemSearchTerm}
                                                onChange={e => setItemSearchTerm(e.target.value)}
                                                onFocus={() => setShowItemDropdown(filteredItems.length > 0)}
                                            />

                                            {/* Search Dropdown */}
                                            {showItemDropdown && filteredItems.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                                    {filteredItems.map((item) => (
                                                        <button
                                                            key={item.item_code}
                                                            type="button"
                                                            className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-b-0 flex items-center justify-between"
                                                            onClick={() => {
                                                                addRequisitionItem(item);
                                                                setItemSearchTerm('');
                                                                setShowItemDropdown(false);
                                                            }}
                                                        >
                                                            <div>
                                                                <div className="font-medium text-sm">{item.item_name}</div>
                                                                <div className="text-xs text-muted-foreground">{item.item_code}</div>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {item.stock_uom} | {item.actual_qty.toFixed(2)} in stock
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Add Section */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Quick Add Items</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {stockItems.slice(0, 6).map(item => (
                                            <button
                                                key={item.item_code}
                                                type="button"
                                                className="inline-flex items-center px-3 py-2 text-xs border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors justify-start"
                                                onClick={() => addRequisitionItem(item)}
                                            >
                                                <Plus className="h-3 w-3 mr-1 flex-shrink-0" />
                                                <span className="truncate text-left">{item.item_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Items Count */}
                                {/* <div className="bg-muted/50 rounded-lg p-3 border border-border">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">Items Added</span>
                                        <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
                                            {requisitionForm.items.length}
                                        </span>
                                    </div>
                                </div> */}
                            </div>
                        </div>

                        {/* Items Table Section */}
                        {requisitionForm.items.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-primary" />
                                    <h4 className="font-medium text-foreground">Requested Items</h4>
                                </div>

                                <div className="border border-border rounded-lg overflow-hidden">
                                    <div className="bg-muted/50 px-4 py-3 border-b border-border">
                                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
                                            <div className="col-span-5">Item Details</div>
                                            <div className="col-span-2">UOM</div>
                                            <div className="col-span-3">Quantity</div>
                                            <div className="col-span-2 text-right">Action</div>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-border">
                                        {requisitionForm.items.map((item, index) => (
                                            <div key={index} className="px-4 py-3 hover:bg-muted/30 transition-colors">
                                                <div className="grid grid-cols-12 gap-2 items-center">
                                                    <div className="col-span-5">
                                                        <div className="text-sm font-medium">{item.item_name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.item_code}</div>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="inline-flex items-center px-2 py-1 text-xs bg-muted rounded-md">
                                                            {item.uom}
                                                        </span>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            required
                                                            className={INPUT + ' text-sm'}
                                                            value={item.qty}
                                                            onChange={e => updateRequisitionItem(index, 'qty', parseFloat(e.target.value) || 0)}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRequisitionItem(index)}
                                                            className="inline-flex items-center justify-center p-1 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded transition-colors"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Form Actions */}
                        <div className="flex justify-between items-center pt-6 border-t border-border">
                            <div className="text-sm text-muted-foreground">
                                {requisitionForm.items.length === 0 && (
                                    <span>Please add at least one item to continue</span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button type="button" className={BTN_O} onClick={() => setShowRequisitionModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={BTN_P}
                                    disabled={isSubmitting || requisitionForm.items.length === 0}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <ClipboardList className="h-4 w-4 mr-2" />
                                            Create Requisition
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </PageLayout>
    );
};

export default InventoryManagement;