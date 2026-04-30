import React, { useState, useEffect } from 'react';
import {
    Plus, X, Trash2, Package, Clock, DollarSign,
    TrendingUp, ChevronRight, Search, RefreshCw,
    AlertCircle, CheckCircle2, TriangleAlert,
} from 'lucide-react';

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
        try {
            const msgs = JSON.parse(errData._server_messages);
            return JSON.parse(msgs[0]).message || errData.message || 'Error';
        } catch { /* */ }
    }
    return errData.exception || errData.message || errData.exc || 'An error occurred';
};

const fmtCurrency = (n: number, currency: string = 'KSh') =>
    `${currency} ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20 hover:opacity-90 hover:-translate-y-px h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-gray-200 bg-white text-gray-700 hover:border-[#E4B315]/40 hover:text-[#C69A11] h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GRItem {
    id: string;
    item_code: string;
    item_name: string;
    received_qty: number;
    rate: number;
    discount_type: string;
    discount_value: number;
    amount: number;
    batch_no?: string;
    vat_exempt: boolean;
    notes: string;
}

interface GoodsReceipt {
    name: string;
    supplier: string;
    supplier_name?: string;
    purchase_order?: string;
    posting_date: string;
    set_warehouse: string;
    supplier_delivery_note: string;
    status: string;
    docstatus: number;
    grand_total: number;
    account_currency: string;
    items_count: number;
}

interface DashboardMetrics {
    total_receipts: number;
    pending_receipts: number;
    monthly_receipts: number;
    total_value: number;
    currency?: string;
}

interface ItemOption {
    item_code: string;
    item_name: string;
    opening_stock: number;
    valuation_rate: number;
    use_serial_batch_fields: boolean;
}

interface WarehouseOption {
    name: string;
}

interface PurchaseOrderOption {
    name: string;
    supplier: string;
    supplier_name?: string;
    grand_total: number;
    account_currency: string;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const INPUT = 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA = 'flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]';

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; docstatus: number }> = ({ status, docstatus }) => {
    const cfg: Record<string, string> = {
        Draft: 'bg-gray-100 text-gray-600 border-gray-200',
        'Partly Billed': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'To Bill': 'bg-blue-100 text-blue-700 border-blue-200',
        Completed: 'bg-green-100 text-green-700 border-green-200',
        'Return Issued': 'bg-purple-100 text-purple-700 border-purple-200',
        Cancelled: 'bg-red-100 text-red-700 border-red-200',
        Closed: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    const label = docstatus === 0 ? 'Draft' : status;
    const cls = cfg[label] || cfg['Draft'];
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
            {label}
        </span>
    );
};

// ─── Metric Card ──────────────────────────────────────────────────────────────
const MetricCard: React.FC<{
    icon: React.ReactNode; label: string; value: string;
    sub?: string; accent?: string;
}> = ({ icon, label, value, sub, accent = 'text-[#2D2A26]' }) => (
    <div className="rounded-lg border bg-white text-card-foreground shadow-sm p-5 flex items-start gap-4">
        <div className="rounded-md bg-muted p-2 shrink-0">{icon}</div>
        <div className="min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${accent}`}>{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Item row ─────────────────────────────────────────────────────────────────
const DISCOUNT_TYPES = ['No discount', 'Percentage', 'Fixed Amount'];

const ItemRow: React.FC<{
    item: GRItem;
    items: ItemOption[];
    onChange: (id: string, field: keyof GRItem, value: any) => void;
    onDelete: (id: string) => void;
    onSelectItem: (id: string, item_code: string) => void;
    currency: string;
}> = ({ item, items, onChange, onDelete, onSelectItem, currency }) => {

    const handleQtyOrRate = (field: 'received_qty' | 'rate', val: number) => {
        onChange(item.id, field, val);
    };

    return (
        <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-3">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Ingredient</label>
                    <div className="relative">
                        <select
                            value={item.item_code}
                            onChange={e => onSelectItem(item.id, e.target.value)}
                            className={INPUT + ' border-amber-400 focus-visible:ring-amber-400 appearance-none pr-8'}
                            style={{ borderColor: item.item_code ? undefined : '#f59e0b' }}
                        >
                            <option value="">Select ingredient</option>
                            {items.map(i => (
                                <option key={i.item_code} value={i.item_code}>{i.item_name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Received Qty</label>
                    <input type="number" step="0.01" min="0" className={INPUT}
                        value={item.received_qty || 0}
                        onChange={e => handleQtyOrRate('received_qty', parseFloat(e.target.value) || 0)} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Unit Price</label>
                    <input type="number" step="0.01" min="0" className={INPUT}
                        value={item.rate || 0}
                        onChange={e => handleQtyOrRate('rate', parseFloat(e.target.value) || 0)} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Discount Type</label>
                    <select className={INPUT} value={item.discount_type}
                        onChange={e => onChange(item.id, 'discount_type', e.target.value)}>
                        {DISCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {item.discount_type !== 'No discount' && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-400">
                            {item.discount_type === 'Percentage' ? 'Discount %' : 'Discount Amount'}
                        </label>
                        <input type="number" step="0.01" min="0" className={INPUT}
                            value={item.discount_value || 0}
                            onChange={e => onChange(item.id, 'discount_value', parseFloat(e.target.value) || 0)} />
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Total</label>
                    <div className={INPUT + ' bg-muted text-gray-400 cursor-default flex items-center'}>
                        {fmtCurrency(item.amount, currency)}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Batch Number</label>
                    <input type="text" className={INPUT} placeholder="Optional"
                        value={item.batch_no || ''}
                        onChange={e => onChange(item.id, 'batch_no', e.target.value)} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">VAT Exempt Item</label>
                    <div className="flex items-center h-10">
                        <input type="checkbox" id={`vat-${item.id}`} className="mr-2"
                            checked={item.vat_exempt}
                            onChange={e => onChange(item.id, 'vat_exempt', e.target.checked)} />
                        <label htmlFor={`vat-${item.id}`} className="text-sm">Exempt from VAT</label>
                    </div>
                </div>

                <div className="col-span-2 space-y-1">
                    <label className="text-xs font-medium text-gray-400">Notes</label>
                    <input type="text" className={INPUT} placeholder="Notes..."
                        value={item.notes}
                        onChange={e => onChange(item.id, 'notes', e.target.value)} />
                </div>
            </div>

            <div className="flex justify-end">
                <button type="button" onClick={() => onDelete(item.id)}
                    className="inline-flex items-center justify-center h-10 w-16 rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
};

// ─── Create GR Modal ──────────────────────────────────────────────────────────
interface CreateGRModalProps {
    onClose: () => void;
    onCreated: () => void;
    suppliers: { name: string; supplier_name: string }[];
    items: ItemOption[];
    warehouses: WarehouseOption[];
    companies: { name: string }[];
}

const newItemRow = (): GRItem => ({
    id: Math.random().toString(36).slice(2),
    item_code: '', item_name: '', received_qty: 0, rate: 0,
    discount_type: 'No discount', discount_value: 0,
    amount: 0, vat_exempt: false, notes: '',
});

const calcAmount = (item: GRItem): number => {
    const gross = item.received_qty * item.rate;
    if (item.discount_type === 'Percentage') return gross * (1 - item.discount_value / 100);
    if (item.discount_type === 'Fixed Amount') return Math.max(0, gross - item.discount_value);
    return gross;
};

const CreateGRModal: React.FC<CreateGRModalProps> = ({ onClose, onCreated, suppliers, items, warehouses, companies }) => {
    const [tab, setTab] = useState<'details' | 'items'>('details');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [itemsError, setItemsError] = useState(false);

    const [details, setDetails] = useState({
        supplier: '',
        purchase_order: '',
        set_warehouse: '',
        supplier_delivery_note: '',
        posting_date: todayISO(),
        notes: '',
        overall_notes: '',
        account_currency: 'KSh',
        company: '',
    });

    const [grItems, setGrItems] = useState<GRItem[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([]);

    useEffect(() => {
        if (details.supplier) {
            fetchPurchaseOrders(details.supplier);
        } else {
            setPurchaseOrders([]);
            setDetails(prev => ({ ...prev, purchase_order: '' }));
        }
    }, [details.supplier]);

    useEffect(() => {
        if (details.purchase_order) {
            fetchPurchaseOrderItems(details.purchase_order);
        }
    }, [details.purchase_order]);

    const fetchPurchaseOrders = async (supplier: string) => {
        try {
            const filters = encodeURIComponent(JSON.stringify([
                ['supplier', '=', supplier],
                ['docstatus', '=', '1'],
            ]));
            const fields = encodeURIComponent(JSON.stringify(['name', 'supplier', 'supplier_name', 'grand_total']));
            const res = await fetch(
                `/api/resource/Purchase%20Order?filters=${filters}&fields=${fields}&limit=50&order_by=transaction_date%20desc`
            );
            if (res.ok) {
                setPurchaseOrders((await res.json()).data || []);
            } else {
                setPurchaseOrders([]);
            }
        } catch (err) {
            console.error('Error fetching purchase orders:', err);
        }
    };

    const fetchPurchaseOrderItems = async (purchaseOrder: string) => {
        try {
            const res = await fetch(`/api/resource/Purchase%20Order/${purchaseOrder}?fields=["items"]`);
            if (res.ok) {
                const data = (await res.json()).data || {};
                const poItems = data.items || [];
                const grItemsFromPO = poItems.map((poItem: any) => ({
                    id: Math.random().toString(36).slice(2),
                    item_code: poItem.item_code,
                    item_name: poItem.item_name,
                    received_qty: poItem.qty,
                    rate: poItem.rate,
                    discount_type: poItem.additional_discount_percentage > 0 ? 'Percentage' :
                        (poItem.discount_amount > 0 ? 'Fixed Amount' : 'No discount'),
                    discount_value: poItem.additional_discount_percentage || poItem.discount_amount || 0,
                    amount: poItem.amount,
                    vat_exempt: false,
                    notes: poItem.description || '',
                }));
                setGrItems(prev => prev.length === 0 ? grItemsFromPO : [...prev, ...grItemsFromPO]);
            }
        } catch (err) {
            console.error('Error fetching PO items:', err);
        }
    };

    const addItem = () => setGrItems(prev => [...prev, newItemRow()]);

    const handleItemChange = (id: string, field: keyof GRItem, value: any) => {
        setGrItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            updated.amount = calcAmount(updated);
            return updated;
        }));
    };

    const handleSelectItem = (id: string, item_code: string) => {
        const found = items.find(i => i.item_code === item_code);
        setGrItems(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updated: GRItem = {
                ...row,
                item_code,
                item_name: found?.item_name || item_code,
                rate: found?.opening_stock || found?.valuation_rate || 0,
            };
            updated.amount = calcAmount(updated);
            return updated;
        }));
    };

    const handleDeleteItem = (id: string) => setGrItems(prev => prev.filter(i => i.id !== id));

    const subtotal = grItems.reduce((s, i) => s + i.amount, 0);
    const vat = grItems.filter(i => !i.vat_exempt).reduce((s, i) => s + (i.amount * 0.16), 0);
    const total = subtotal + vat;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (grItems.length === 0) {
            setItemsError(true);
            setTab('items');
            return;
        }
        setItemsError(false);
        setIsSubmitting(true);

        try {
            const payload: any = {
                supplier: details.supplier,
                company: details.company,
                purchase_order: details.purchase_order || undefined,
                set_warehouse: details.set_warehouse,
                supplier_delivery_note: details.supplier_delivery_note,
                posting_date: details.posting_date,
                docstatus: 1,
                items: grItems.map(item => {
                    const gross = item.received_qty * item.rate;
                    let finalAmount = gross;
                    if (item.discount_type === 'Percentage' && item.discount_value > 0) {
                        finalAmount = gross - gross * (item.discount_value / 100);
                    } else if (item.discount_type === 'Fixed Amount' && item.discount_value > 0) {
                        finalAmount = gross - Math.min(item.discount_value, gross);
                    }
                    return {
                        item_code: item.item_code,
                        item_name: item.item_name,
                        qty: item.received_qty,
                        rate: item.rate,
                        amount: finalAmount,
                        batch_no: item.batch_no || undefined,
                        description: item.notes || item.item_name,
                        ...(item.discount_type === 'Percentage' ? { discount_percentage: item.discount_value || 0 } : {}),
                        ...(item.discount_type === 'Fixed Amount' ? { discount_amount: item.discount_value || 0 } : {}),
                        other_charges_calculation: item.vat_exempt ? 1 : 0,
                    };
                }),
                terms: details.overall_notes,
            };

            const res = await fetch('/api/resource/Purchase%20Receipt', {
                method: 'POST',
                headers: mutationHeaders(),
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(parseFrappeError(errData));
            }

            onCreated();
            onClose();
        } catch (err: any) {
            alert('Error creating Goods Receipt: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const itemCount = grItems.length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-green-50 p-1.5 border border-green-200">
                            <Package className="h-4 w-4 text-green-600" />
                        </div>
                        <h2 className="text-base font-semibold text-[#2D2A26]">Receive Goods</h2>
                    </div>
                    <button type="button" onClick={onClose}
                        className="rounded-sm text-gray-400 hover:text-[#2D2A26] opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex shrink-0 border-b border-gray-100">
                    <button type="button" onClick={() => setTab('details')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${tab === 'details' ? 'text-[#2D2A26]' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                        Receipt Details
                        {tab === 'details' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#E4B315] to-[#C69A11] rounded-t-full" />}
                    </button>
                    <button type="button" onClick={() => setTab('items')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${tab === 'items' ? 'text-[#2D2A26]' : 'text-gray-400 hover:text-[#2D2A26]'} ${itemsError ? 'text-red-500' : ''}`}>
                        Receipt Items ({itemCount})
                        {itemsError && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        {tab === 'items' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#E4B315] to-[#C69A11] rounded-t-full" />}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <form id="gr-form" onSubmit={handleSubmit}>

                        {tab === 'details' && (
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Supplier *</label>
                                        <div className="relative">
                                            <select required className={INPUT + ' appearance-none pr-8'}
                                                value={details.supplier}
                                                onChange={e => setDetails({ ...details, supplier: e.target.value })}>
                                                <option value="">Select supplier</option>
                                                {suppliers.map(s => (
                                                    <option key={s.name} value={s.name}>{s.supplier_name || s.name}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Purchase Order</label>
                                        <div className="relative">
                                            <select className={INPUT + ' appearance-none pr-8'}
                                                value={details.purchase_order}
                                                onChange={e => setDetails({ ...details, purchase_order: e.target.value })}>
                                                <option value="">Select purchase order</option>
                                                {purchaseOrders.map(po => (
                                                    <option key={po.name} value={po.name}>
                                                        {po.name} ({fmtCurrency(po.grand_total, 'KSh')})
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Company *</label>
                                        <div className="relative">
                                            <select required className={INPUT + ' appearance-none pr-8'}
                                                value={details.company}
                                                onChange={e => setDetails({ ...details, company: e.target.value })}>
                                                <option value="">Select company</option>
                                                {companies.map(c => (
                                                    <option key={c.name} value={c.name}>{c.name}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Requesting Department (Warehouse)</label>
                                        <div className="relative">
                                            <select required className={INPUT + ' appearance-none pr-8'}
                                                value={details.set_warehouse}
                                                onChange={e => setDetails({ ...details, set_warehouse: e.target.value })}>
                                                <option value="">Select warehouse</option>
                                                {warehouses.map(w => (
                                                    <option key={w.name} value={w.name}>{w.name}</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Delivery Note Number</label>
                                        <input type="text" className={INPUT}
                                            value={details.supplier_delivery_note}
                                            onChange={e => setDetails({ ...details, supplier_delivery_note: e.target.value })} />
                                        <p className="text-xs text-gray-400">Maps to <code className="font-mono">supplier_delivery_note</code></p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Supplier Invoice Number</label>
                                        <input type="text" className={INPUT}
                                            value={details.notes}
                                            onChange={e => setDetails({ ...details, notes: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Invoice Date</label>
                                        <input type="date" className={INPUT}
                                            value={details.posting_date}
                                            onChange={e => setDetails({ ...details, posting_date: e.target.value })} />
                                        <p className="text-xs text-gray-400">Maps to <code className="font-mono">posting_date</code></p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Overall Notes (Supplier Performance)</label>
                                    <textarea className={TEXTAREA} placeholder="Notes about supplier performance, delivery quality, etc..."
                                        value={details.overall_notes}
                                        onChange={e => setDetails({ ...details, overall_notes: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {tab === 'items' && (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-[#2D2A26]">Receipt Items</h3>
                                    <button type="button" onClick={addItem} className={BTN_P}>
                                        <Plus className="h-4 w-4" /> Add Item
                                    </button>
                                </div>

                                {itemsError && (
                                    <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        You must add at least one item to create a goods receipt.
                                    </div>
                                )}

                                {grItems.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed border-gray-100 bg-muted/30 py-14 flex flex-col items-center justify-center gap-3">
                                        <div className="rounded-full border border-gray-100 bg-white p-3">
                                            <AlertCircle className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-400 text-center max-w-xs">
                                            No items added yet. You must add at least one item to create a goods receipt.
                                        </p>
                                        <button type="button" onClick={addItem} className={BTN_P}>
                                            <Plus className="h-4 w-4" /> Add First Item
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {grItems.map(item => (
                                            <ItemRow key={item.id} item={item} items={items}
                                                onChange={handleItemChange}
                                                onDelete={handleDeleteItem}
                                                onSelectItem={handleSelectItem}
                                                currency={details.account_currency} />
                                        ))}
                                    </div>
                                )}

                                <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-3 mt-2">
                                    <h4 className="text-base font-semibold text-[#2D2A26]">Receipt Summary</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Items Subtotal:</span>
                                            <span className="font-medium">{fmtCurrency(subtotal, details.account_currency)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Taxable Items:</span>
                                            <span className="font-medium">{grItems.filter(i => !i.vat_exempt).length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">VAT (16%):</span>
                                            <span className="font-medium">{fmtCurrency(vat, details.account_currency)}</span>
                                        </div>
                                        <div className="border-t border-gray-100 pt-2 flex justify-between">
                                            <span className="font-semibold text-base">Total:</span>
                                            <span className="font-bold text-base">{fmtCurrency(total, details.account_currency)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-muted/20 shrink-0 rounded-b-xl">
                    <button type="button" onClick={onClose} className={BTN_O}>
                        Cancel
                    </button>
                    <button form="gr-form" type="submit" disabled={isSubmitting} className={BTN_P}>
                        <Package className="h-4 w-4" />
                        {isSubmitting ? 'Creating...' : 'Create Receipt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main GoodsReceipts Component ─────────────────────────────────────────────
const GoodsReceipts: React.FC = () => {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics>({ total_receipts: 0, pending_receipts: 0, monthly_receipts: 0, total_value: 0 });
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [suppliers, setSuppliers] = useState<{ name: string; supplier_name: string }[]>([]);
    const [items, setItems] = useState<ItemOption[]>([]);
    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
    const [companies, setCompanies] = useState<{ name: string }[]>([]);

    useEffect(() => {
        fetchReceipts();
        fetchMetrics();
        fetchDropdowns();
    }, []);

    const fetchReceipts = async () => {
        try {
            setLoading(true); setError(null);
            const filters = encodeURIComponent(JSON.stringify([['docstatus', 'in', ['0', '1']]]));
            const fields = encodeURIComponent(JSON.stringify([
                'name', 'supplier', 'supplier_name',
                'posting_date', 'set_warehouse', 'supplier_delivery_note',
                'status', 'docstatus', 'grand_total',
            ]));
            const res = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${filters}&fields=${fields}&limit=200&order_by=posting_date%20desc`
            );
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            const data = (await res.json()).data || [];
            const enriched = await Promise.all(data.map(async (gr: any) => {
                let items_count = 0;
                let purchase_order = gr.purchase_order;
                let account_currency = 'KSh';
                try {
                    const r = await fetch(`/api/resource/Purchase%20Receipt/${encodeURIComponent(gr.name)}`);
                    if (r.ok) {
                        const detail = (await r.json()).data;
                        items_count = detail.items?.length || 0;
                        if (!purchase_order) {
                            purchase_order = detail.items?.[0]?.purchase_order || detail.purchase_order;
                        }
                        if (detail.taxes?.length > 0) {
                            account_currency = detail.taxes[0].account_currency || 'KSh';
                        }
                    }
                } catch { /* non-fatal */ }
                return { ...gr, items_count, purchase_order, account_currency } as GoodsReceipt;
            }));
            setReceipts(enriched);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    const fetchMetrics = async () => {
        setMetricsLoading(true);
        try {
            const totalRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', 'in', ['0', '1']]]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const totalData = totalRes.ok ? (await totalRes.json()).data || [] : [];
            const total_receipts = totalData.length;

            const pendingRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', '0']]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const pendingData = pendingRes.ok ? (await pendingRes.json()).data || [] : [];
            const pending_receipts = pendingData.length;

            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            const lmISO = lastMonth.toISOString().slice(0, 10);
            const monthlyRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', '1'], ['posting_date', '>=', lmISO]]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const monthlyData = monthlyRes.ok ? (await monthlyRes.json()).data || [] : [];
            const monthly_receipts = monthlyData.length;

            const valueRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', '1']]))}&fields=${encodeURIComponent(JSON.stringify(['grand_total', 'account_currency']))}&limit=500`
            );
            const valueData = valueRes.ok ? (await valueRes.json()).data || [] : [];
            const total_value = valueData.reduce((s: number, gr: any) => s + (gr.grand_total || 0), 0);
            const currency = valueData.length > 0 ? (valueData[0].account_currency || 'KSh') : 'KSh';

            setMetrics({ total_receipts, pending_receipts, monthly_receipts, total_value, currency });
        } catch (err) {
            console.error('Metrics fetch error:', err);
        } finally {
            setMetricsLoading(false);
        }
    };

    const fetchDropdowns = async () => {
        try {
            const [suppRes, itemsRes, whRes, companiesRes] = await Promise.all([
                fetch(`/api/resource/Supplier?fields=${encodeURIComponent(JSON.stringify(['name', 'supplier_name']))}&limit=200`),
                fetch(`/api/resource/Item?filters=${encodeURIComponent(JSON.stringify([['is_stock_item', '=', '1']]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'item_code', 'item_name', 'valuation_rate']))}&limit=500`),
                fetch(`/api/resource/Warehouse?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=200`),
                fetch(`/api/resource/Company?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit_page_length=9999`),
            ]);
            if (suppRes.ok) setSuppliers((await suppRes.json()).data || []);
            if (whRes.ok) setWarehouses((await whRes.json()).data || []);
            if (companiesRes.ok) setCompanies((await companiesRes.json()).data || []);
            if (itemsRes.ok) {
                const rawItems = (await itemsRes.json()).data || [];
                const enriched: ItemOption[] = await Promise.all(
                    rawItems.slice(0, 100).map(async (i: any) => {
                        let opening_stock = i.valuation_rate || 0;
                        let use_serial_batch_fields = false;
                        try {
                            const dr = await fetch(`/api/resource/Item/${encodeURIComponent(i.item_code)}`);
                            if (dr.ok) {
                                const d = (await dr.json()).data;
                                opening_stock = d.opening_stock ?? d.valuation_rate ?? 0;
                                use_serial_batch_fields = d.use_serial_batch_fields || false;
                            }
                        } catch { /* non-fatal */ }
                        return {
                            item_code: i.item_code,
                            item_name: i.item_name,
                            opening_stock,
                            valuation_rate: i.valuation_rate || 0,
                            use_serial_batch_fields,
                        };
                    })
                );
                setItems(enriched);
            }
        } catch (err) { console.error('Dropdown fetch error:', err); }
    };

    const filtered = receipts.filter(gr => {
        const term = searchTerm.toLowerCase();
        const matchSearch = gr.name.toLowerCase().includes(term) ||
            (gr.supplier_name || gr.supplier || '').toLowerCase().includes(term) ||
            (gr.purchase_order || '').toLowerCase().includes(term);
        const grStatus = gr.docstatus === 0 ? 'Draft' : gr.status;
        const matchStatus = !statusFilter || grStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleRefresh = () => { fetchReceipts(); fetchMetrics(); };

    return (
        <main className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50/80">
            <div className="border-b border-gray-100 bg-white sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 mb-6 shadow-sm">
                <div className="flex h-16 items-center justify-between">
                    <h1 className="text-xl font-extrabold text-[#2D2A26] tracking-tight">Goods Receipts</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={handleRefresh}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white hover:border-[#E4B315]/40 hover:text-[#C69A11] text-gray-400 transition-colors shadow-sm">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowCreateModal(true)} className={BTN_P}>
                            <Plus className="h-4 w-4" /> Receive Goods
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    icon={<Package className="h-5 w-5 text-blue-600" />}
                    label="Total Receipts"
                    value={metricsLoading ? '—' : String(metrics.total_receipts)}
                    sub="Draft + Submitted"
                />
                <MetricCard
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    label="Pending Receipts"
                    value={metricsLoading ? '—' : String(metrics.pending_receipts)}
                    sub="Draft status"
                    accent="text-amber-600"
                />
                <MetricCard
                    icon={<TrendingUp className="h-5 w-5 text-green-600" />}
                    label="Monthly Receipts"
                    value={metricsLoading ? '—' : String(metrics.monthly_receipts)}
                    sub="Last 30 days"
                    accent="text-green-600"
                />
                <MetricCard
                    icon={<DollarSign className="h-5 w-5 text-purple-600" />}
                    label="Total Value"
                    value={metricsLoading ? '—' : fmtCurrency(metrics.total_value, metrics.currency)}
                    sub="All receipts"
                    accent="text-purple-600"
                />
            </div>

            {/* GR List */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="flex flex-col space-y-1.5 p-5 pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C69A11]">Goods Receipts</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Track received goods and quality inspections</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input className={INPUT + ' pl-9'} placeholder="Search receipts..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <select className={INPUT + ' w-[180px]'} value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Partly Billed">Partly Billed</option>
                            <option value="To Bill">To Bill</option>
                            <option value="Completed">Completed</option>
                            <option value="Return Issued">Return Issued</option>
                            <option value="Cancelled">Cancelled</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </div>
                </div>

                {/* List body — correctly nested inside the card */}
                <div className="p-6 pt-0">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="relative w-8 h-8">
                                <div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20" />
                                <div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" />
                            </div>
                        </div>
                    ) : error ? (
                        <div className="text-center text-red-500 p-8">
                            {error}<br />
                            <button onClick={fetchReceipts} className="mt-4 text-sm text-[#C69A11] underline">Try Again</button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-12 text-gray-400">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">No goods receipts found</p>
                            <p className="text-sm mt-1">Create your first goods receipt to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {filtered.map(gr => (
                                <div key={gr.name}
                                    className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white hover:border-[#E4B315]/30 hover:shadow-md transition-all cursor-default">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="rounded-md bg-green-50 border border-green-200 p-2 shrink-0 mt-0.5">
                                            <Package className="h-4 w-4 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-[#2D2A26]">{gr.name}</span>
                                                <StatusBadge status={gr.status} docstatus={gr.docstatus} />
                                            </div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {gr.supplier_name || gr.supplier}
                                                {gr.purchase_order && <span className="ml-2">• PO: {gr.purchase_order}</span>}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                                                <span>Receipt: {gr.posting_date}</span>
                                                {gr.set_warehouse && <span>Warehouse: {gr.set_warehouse}</span>}
                                                <span>{gr.items_count} item{gr.items_count !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <div className="font-bold text-[#2D2A26]">
                                            {fmtCurrency(gr.grand_total || 0, gr.account_currency)}
                                        </div>
                                        {gr.docstatus === 1 ? (
                                            <span className="text-xs text-green-600 flex items-center gap-1 justify-end mt-0.5">
                                                <CheckCircle2 className="h-3 w-3" />Submitted
                                            </span>
                                        ) : (
                                            <span className="text-xs text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                                                <TriangleAlert className="h-3 w-3" />Draft
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showCreateModal && (
                <CreateGRModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { fetchReceipts(); fetchMetrics(); }}
                    suppliers={suppliers}
                    items={items}
                    warehouses={warehouses}
                    companies={companies}
                />
            )}
        </main>
    );
};

export default GoodsReceipts;