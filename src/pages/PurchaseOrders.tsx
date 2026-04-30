import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Plus, X, Trash2, ShoppingCart, Clock, DollarSign,
    TrendingUp, FileText, ChevronRight, Search, RefreshCw,
    AlertCircle, Package, CheckCircle2, TriangleAlert, Info, ArrowLeft,
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

const fmtCurrency = (n: number) =>
    `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

// Button constants for consistent blue theme
const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20 hover:opacity-90 hover:-translate-y-px h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-gray-200 bg-white text-gray-700 hover:border-[#E4B315]/40 hover:text-[#C69A11] h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Types ────────────────────────────────────────────────────────────────────
interface POItem {
    id: string;
    item_code: string;
    item_name: string;
    qty: number;
    rate: number;
    discount_type: string;
    discount_value: number;
    amount: number;
    notes: string;
}

interface PurchaseOrder {
    name: string;
    supplier: string;
    supplier_name?: string;
    transaction_date: string;
    schedule_date: string;
    status: string;
    docstatus: number;
    grand_total: number;
    items_count: number;
}

interface DashboardMetrics {
    total_orders: number;
    pending_orders: number;
    monthly_spend: number;
    on_time_delivery_pct: number;
}

interface ItemOption {
    item_code: string;
    item_name: string;
    opening_stock: number;
    valuation_rate: number;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const INPUT = 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA = 'flex w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]';

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; docstatus: number }> = ({ status, docstatus }) => {
    const cfg: Record<string, string> = {
        Draft: 'bg-gray-100 text-gray-600 border-gray-200',
        'To Receive and Bill': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'To Bill': 'bg-blue-100 text-blue-700 border-blue-200',
        'To Receive': 'bg-purple-100 text-purple-700 border-purple-200',
        Completed: 'bg-green-100 text-green-700 border-green-200',
        Cancelled: 'bg-red-100 text-red-700 border-red-200',
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

// ─── Searchable Item Select Component ────────────────────────────────────────
const ItemSearchSelect: React.FC<{
    value: string;
    onChange: (item_code: string) => void;
    items: ItemOption[];
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, items, placeholder = "Select item", className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredItems = items.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedItem = items.find(i => i.item_code === value);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            setHighlightedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            setHighlightedIndex(prev => Math.max(prev - 1, 0));
            e.preventDefault();
        } else if (e.key === 'Enter') {
            if (highlightedIndex >= 0 && filteredItems[highlightedIndex]) {
                onChange(filteredItems[highlightedIndex].item_code);
                setSearchTerm(filteredItems[highlightedIndex].item_name);
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
            e.preventDefault();
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightedIndex(-1);
        }
    };

    return (
        <div className="relative" ref={inputRef}>
            <input
                type="text"
                value={isOpen ? searchTerm : (selectedItem?.item_name || '')}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(-1);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={`${INPUT} appearance-none pr-8 ${className}`}
                style={{ borderColor: value ? undefined : '#f59e0b' }}
            />
            <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />

            {isOpen && (
                <div className="absolute w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                        <div className="p-3 text-center text-gray-400 text-sm">
                            {searchTerm ? 'No items found' : 'Type to search items...'}
                        </div>
                    ) : (
                        filteredItems.map((item, index) => (
                            <div
                                key={item.item_code}
                                className={`px-3 py-2 cursor-pointer text-sm border-b border-gray-50 last:border-b-0 ${index === highlightedIndex ? 'bg-amber-50 text-amber-700' : 'hover:bg-gray-50'
                                    } ${value === item.item_code ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}
                                onClick={() => {
                                    onChange(item.item_code);
                                    setSearchTerm(item.item_name);
                                    setIsOpen(false);
                                    setHighlightedIndex(-1);
                                }}
                            >
                                <div className="font-medium">{item.item_name}</div>
                                <div className="text-xs text-gray-400">{item.item_code}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Item row ─────────────────────────────────────────────────────────────────
const DISCOUNT_TYPES = ['No discount', 'Percentage', 'Fixed Amount'];

const ItemRow: React.FC<{
    item: POItem;
    items: ItemOption[];
    onChange: (id: string, field: keyof POItem, value: any) => void;
    onDelete: (id: string) => void;
    onSelectItem: (id: string, item_code: string) => void;
}> = ({ item, items, onChange, onDelete, onSelectItem }) => {

    const handleQtyOrRate = (field: 'qty' | 'rate', val: number) => {
        onChange(item.id, field, val);
    };

    return (
        <div className="rounded-lg border border-gray-100 bg-white p-4 space-y-3">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-3 items-end">
                {/* Ingredient */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Ingredient</label>
                    <ItemSearchSelect
                        value={item.item_code}
                        onChange={(item_code) => onSelectItem(item.id, item_code)}
                        items={items}
                        placeholder="Select ingredient"
                        className={item.item_code ? '' : 'border-amber-400 focus-visible:ring-amber-400'}
                    />
                </div>

                {/* Quantity */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Quantity</label>
                    <input type="number" step="0.01" min="0" className={INPUT}
                        value={item.qty || 0}
                        onChange={e => handleQtyOrRate('qty', parseFloat(e.target.value) || 0)} />
                </div>

                {/* Unit Price */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Unit Price</label>
                    <input type="number" step="0.01" min="0" className={INPUT}
                        value={item.rate || 0}
                        onChange={e => handleQtyOrRate('rate', parseFloat(e.target.value) || 0)} />
                </div>

                {/* Discount Type */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Discount Type</label>
                    <select className={INPUT} value={item.discount_type}
                        onChange={e => onChange(item.id, 'discount_type', e.target.value)}>
                        {DISCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {/* Discount Value */}
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

                {/* Total */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-400">Total</label>
                    <div className={INPUT + ' bg-muted text-gray-400 cursor-default flex items-center'}>
                        {fmtCurrency(item.amount)}
                    </div>
                </div>
            </div>

            {/* Notes row */}
            <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-400">Notes</label>
                    <input type="text" className={INPUT} placeholder="Notes..."
                        value={item.notes}
                        onChange={e => onChange(item.id, 'notes', e.target.value)} />
                </div>
                <div className="pt-5">
                    <button type="button" onClick={() => onDelete(item.id)}
                        className="inline-flex items-center justify-center h-10 w-16 rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Create PO Modal ──────────────────────────────────────────────────────────
interface CreatePOModalProps {
    onClose: () => void;
    onCreated: () => void;
    suppliers: { name: string; supplier_name: string }[];
    items: ItemOption[];
    companies: { name: string }[];
}

const genPoNumber = () => {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `PO-${String(n).padStart(4, '0')}`;
};

const newItemRow = (): POItem => ({
    id: Math.random().toString(36).slice(2),
    item_code: '', item_name: '', qty: 0, rate: 0,
    discount_type: 'No discount', discount_value: 0,
    amount: 0, notes: '',
});

const calcAmount = (item: POItem): number => {
    const gross = item.qty * item.rate;
    if (item.discount_type === 'Percentage') return gross * (1 - item.discount_value / 100);
    if (item.discount_type === 'Fixed Amount') return Math.max(0, gross - item.discount_value);
    return gross;
};

const CreatePOModal: React.FC<CreatePOModalProps> = ({ onClose, onCreated, suppliers, items, companies }) => {
    const [tab, setTab] = useState<'details' | 'items'>('details');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [itemsError, setItemsError] = useState(false);

    const [details, setDetails] = useState({
        po_number: genPoNumber(),
        supplier: '',
        company: '',
        status: 'Submitted',
        transaction_date: todayISO(),
        schedule_date: '',
        tax_amount: 0,
        shipping_cost: 0,
        notes: '',
        payment_status: 'Pending',
    });

    const [poItems, setPoItems] = useState<POItem[]>([]);

    const addItem = () => setPoItems(prev => [...prev, newItemRow()]);

    const handleItemChange = (id: string, field: keyof POItem, value: any) => {
        setPoItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            updated.amount = calcAmount(updated);
            return updated;
        }));
    };

    const handleSelectItem = (id: string, item_code: string) => {
        const found = items.find(i => i.item_code === item_code);
        setPoItems(prev => prev.map(row => {
            if (row.id !== id) return row;
            const updated: POItem = {
                ...row,
                item_code,
                item_name: found?.item_name || item_code,
                rate: found?.opening_stock || found?.valuation_rate || 0,
            };
            updated.amount = calcAmount(updated);
            return updated;
        }));
    };

    const handleDeleteItem = (id: string) => setPoItems(prev => prev.filter(i => i.id !== id));

    const subtotal = poItems.reduce((s, i) => s + i.amount, 0);
    const tax = details.tax_amount || 0;
    const shipping = details.shipping_cost || 0;
    const total = subtotal + tax + shipping;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (poItems.length === 0) {
            setItemsError(true);
            setTab('items');
            return;
        }
        setItemsError(false);
        setIsSubmitting(true);

        try {
            const payload: any = {
                naming_series: 'PO-',
                supplier: details.supplier,
                company: details.company,
                price_list: 'Standard Buying',
                transaction_date: details.transaction_date,
                schedule_date: details.schedule_date || details.transaction_date,
                docstatus: 1,
                items: poItems.map(item => {
                    const gross = item.qty * item.rate;
                    let discountAmount = 0;
                    let finalAmount = gross;

                    if (item.discount_type === 'Percentage' && item.discount_value > 0) {
                        discountAmount = gross * (item.discount_value / 100);
                        finalAmount = gross - discountAmount;
                    } else if (item.discount_type === 'Fixed Amount' && item.discount_value > 0) {
                        discountAmount = Math.min(item.discount_value, gross);
                        finalAmount = gross - discountAmount;
                    }

                    return {
                        item_code: item.item_code,
                        item_name: item.item_name,
                        qty: item.qty,
                        rate: item.rate,
                        amount: finalAmount,
                        description: item.notes || item.item_name,
                        schedule_date: details.schedule_date || details.transaction_date,
                        ...(item.discount_type === 'Percentage' ? { discount_percentage: item.discount_value || 0 } : {}),
                        ...(item.discount_type === 'Fixed Amount' ? { discount_amount: item.discount_value || 0 } : {}),
                    };
                }),
                taxes: details.tax_amount > 0 ? [{
                    charge_type: 'Actual',
                    account_head: 'Tax - ERPNext',
                    description: 'Tax',
                    tax_amount: details.tax_amount,
                }] : [],
                terms: details.notes,
            };

            const res = await fetch('/api/resource/Purchase%20Order', {
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
            alert('Error creating Purchase Order: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const itemCount = poItems.length;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-amber-50 p-1.5 border border-amber-200">
                            <FileText className="h-4 w-4 text-amber-600" />
                        </div>
                        <h2 className="text-base font-semibold text-[#2D2A26]">Create New Purchase Order</h2>
                    </div>
                    <button type="button" onClick={onClose}
                        className="rounded-sm text-gray-400 hover:text-[#2D2A26] opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex shrink-0 border-b border-gray-100">
                    <button type="button"
                        onClick={() => setTab('details')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative ${tab === 'details' ? 'text-[#2D2A26]' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                        Order Details
                        {tab === 'details' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />}
                    </button>
                    <button type="button"
                        onClick={() => setTab('items')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors relative flex items-center justify-center gap-1.5 ${tab === 'items' ? 'text-[#2D2A26]' : 'text-gray-400 hover:text-[#2D2A26]'} ${itemsError ? 'text-red-500' : ''}`}>
                        Items ({itemCount})
                        {itemsError && <AlertCircle className="h-3.5 w-3.5 text-red-500" />}
                        {tab === 'items' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />}
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto">
                    <form id="po-form" onSubmit={handleSubmit}>

                        {/* ── ORDER DETAILS TAB ── */}
                        {tab === 'details' && (
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">PO Number *</label>
                                        <input type="text" required className={INPUT}
                                            value={details.po_number}
                                            onChange={e => setDetails({ ...details, po_number: e.target.value })} />
                                    </div>
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

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Expected Delivery Date</label>
                                        <input type="date" className={INPUT}
                                            value={details.schedule_date}
                                            onChange={e => setDetails({ ...details, schedule_date: e.target.value })} />
                                        <p className="text-xs text-gray-400">Maps to <code className="font-mono">schedule_date</code></p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Order Date</label>
                                        <input type="date" className={INPUT}
                                            value={details.transaction_date}
                                            onChange={e => setDetails({ ...details, transaction_date: e.target.value })} />
                                        <p className="text-xs text-gray-400">Maps to <code className="font-mono">transaction_date</code></p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Tax Amount</label>
                                        <input type="number" step="0.01" min="0" className={INPUT} placeholder="0"
                                            value={details.tax_amount || ''}
                                            onChange={e => setDetails({ ...details, tax_amount: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Shipping Cost</label>
                                        <input type="number" step="0.01" min="0" className={INPUT} placeholder="0"
                                            value={details.shipping_cost || ''}
                                            onChange={e => setDetails({ ...details, shipping_cost: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Notes</label>
                                    <textarea className={TEXTAREA} placeholder="Additional notes for this purchase order..."
                                        value={details.notes}
                                        onChange={e => setDetails({ ...details, notes: e.target.value })} />
                                </div>
                            </div>
                        )}

                        {/* ── ITEMS TAB ── */}
                        {tab === 'items' && (
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-[#2D2A26]">Order Items</h3>
                                    <button type="button" onClick={addItem} className={BTN_P}>
                                        <Plus className="h-4 w-4" /> Add Item
                                    </button>
                                </div>

                                {itemsError && (
                                    <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        You must add at least one item to create a purchase order.
                                    </div>
                                )}

                                {poItems.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed border-gray-100 bg-muted/30 py-14 flex flex-col items-center justify-center gap-3">
                                        <div className="rounded-full border border-gray-100 bg-white p-3">
                                            <AlertCircle className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-400 text-center max-w-xs">
                                            No items added yet. You must add at least one item to create a purchase order.
                                        </p>
                                        <button type="button" onClick={addItem} className={BTN_P}>
                                            <Plus className="h-4 w-4" /> Add First Item
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {poItems.map(item => (
                                            <ItemRow key={item.id} item={item} items={items}
                                                onChange={handleItemChange}
                                                onDelete={handleDeleteItem}
                                                onSelectItem={handleSelectItem} />
                                        ))}
                                    </div>
                                )}

                                {/* Order Summary */}
                                <div className="rounded-xl border border-gray-100 bg-white p-5 space-y-3 mt-2">
                                    <h4 className="text-base font-semibold text-[#2D2A26]">Order Summary</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Subtotal:</span>
                                            <span className="font-medium">{fmtCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Tax:</span>
                                            <span className="font-medium">{fmtCurrency(tax)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Shipping:</span>
                                            <span className="font-medium">{fmtCurrency(shipping)}</span>
                                        </div>
                                        <div className="border-t border-gray-100 pt-2 flex justify-between">
                                            <span className="font-semibold text-base">Total:</span>
                                            <span className="font-bold text-base">{fmtCurrency(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-muted/20 shrink-0 rounded-b-xl">
                    <button type="button" onClick={onClose} className={BTN_O}>
                        Cancel
                    </button>
                    <button form="po-form" type="submit" disabled={isSubmitting} className={BTN_P}>
                        <FileText className="h-4 w-4" />
                        {isSubmitting ? 'Creating...' : 'Create PO'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main PurchaseOrders Component ───────────────────────────────────────────
const PurchaseOrders: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics>({ total_orders: 0, pending_orders: 0, monthly_spend: 0, on_time_delivery_pct: 0 });
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    const [suppliers, setSuppliers] = useState<{ name: string; supplier_name: string }[]>([]);
    const [items, setItems] = useState<ItemOption[]>([]);
    const [companies, setCompanies] = useState<{ name: string }[]>([]);

    useEffect(() => {
        fetchOrders();
        fetchMetrics();
        fetchDropdowns();
    }, []);

    // ── Fetch PO list ─────────────────────────────────────────────────────────
    const fetchOrders = async () => {
        try {
            setLoading(true); setError(null);
            const filters = encodeURIComponent(JSON.stringify([['docstatus', 'in', ['0', '1']]]));
            const fields = encodeURIComponent(JSON.stringify([
                'name', 'supplier', 'supplier_name', 'transaction_date',
                'schedule_date', 'status', 'docstatus', 'grand_total',
            ]));
            const res = await fetch(
                `/api/resource/Purchase%20Order?filters=${filters}&fields=${fields}&limit=200&order_by=transaction_date%20desc`
            );
            if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(parseFrappeError(e)); }
            const data = (await res.json()).data || [];
            const enriched = await Promise.all(data.map(async (po: any) => {
                let items_count = 0;
                try {
                    const r = await fetch(`/api/resource/Purchase%20Order/${encodeURIComponent(po.name)}`);
                    if (r.ok) {
                        const detail = (await r.json()).data;
                        items_count = detail.items?.length || 0;
                    }
                } catch { /* non-fatal */ }
                return { ...po, items_count } as PurchaseOrder;
            }));
            setOrders(enriched);
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    };

    // ── Dashboard Metrics ─────────────────────────────────────────────────────
    const fetchMetrics = async () => {
        setMetricsLoading(true);
        try {
            const totalRes = await fetch(
                `/api/resource/Purchase%20Order?filters=${encodeURIComponent(JSON.stringify([['docstatus', 'in', ['0', '1']]]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const totalData = totalRes.ok ? (await totalRes.json()).data || [] : [];
            const total_orders = totalData.length;

            const pendingRes = await fetch(
                `/api/resource/Purchase%20Order?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', '0']]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const pendingData = pendingRes.ok ? (await pendingRes.json()).data || [] : [];
            const pending_orders = pendingData.length;

            const lastMonth = new Date();
            lastMonth.setDate(lastMonth.getDate() - 30);
            const lmISO = lastMonth.toISOString().slice(0, 10);
            const spendRes = await fetch(
                `/api/resource/Purchase%20Order?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', '1'], ['transaction_date', '>=', lmISO]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'grand_total']))}&limit=500`
            );
            const spendData = spendRes.ok ? (await spendRes.json()).data || [] : [];
            const monthly_spend = spendData.reduce((s: number, po: any) => s + (po.grand_total || 0), 0);

            let on_time_delivery_pct = 0;
            try {
                const prFields = encodeURIComponent(JSON.stringify(['name', 'posting_date', 'purchase_order']));
                const prRes = await fetch(
                    `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', '1']]))}&fields=${prFields}&limit=200`
                );
                if (prRes.ok) {
                    const receipts: any[] = (await prRes.json()).data || [];
                    if (receipts.length > 0) {
                        let onTime = 0;
                        await Promise.all(receipts.map(async (pr: any) => {
                            try {
                                if (!pr.purchase_order) return;
                                const poRes = await fetch(`/api/resource/Purchase%20Order/${encodeURIComponent(pr.purchase_order)}`);
                                if (poRes.ok) {
                                    const po = (await poRes.json()).data;
                                    if (po.schedule_date && pr.posting_date <= po.schedule_date) onTime++;
                                }
                            } catch { /* non-fatal */ }
                        }));
                        on_time_delivery_pct = Math.round((onTime / receipts.length) * 100);
                    }
                }
            } catch { /* non-fatal */ }

            setMetrics({ total_orders, pending_orders, monthly_spend, on_time_delivery_pct });
        } catch (err) {
            console.error('Metrics fetch error:', err);
        } finally {
            setMetricsLoading(false);
        }
    };

    // ── Fetch dropdowns ───────────────────────────────────────────────────────
    const fetchDropdowns = async () => {
        try {
            const [suppRes, itemsRes, companiesRes] = await Promise.all([
                fetch(`/api/resource/Supplier?fields=${encodeURIComponent(JSON.stringify(['name', 'supplier_name']))}&limit=200`),
                fetch(`/api/resource/Item?filters=${encodeURIComponent(JSON.stringify([['is_stock_item', '=', '1']]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'item_code', 'item_name', 'valuation_rate']))}&limit=1000`),
                fetch(`/api/resource/Company?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit_page_length=9999`),
            ]);
            if (suppRes.ok) setSuppliers((await suppRes.json()).data || []);
            if (itemsRes.ok) {
                const rawItems = (await itemsRes.json()).data || [];
                const enriched: ItemOption[] = await Promise.all(
                    rawItems.map(async (i: any) => {
                        let opening_stock = i.valuation_rate || 0;
                        try {
                            const dr = await fetch(`/api/resource/Item/${encodeURIComponent(i.item_code)}`);
                            if (dr.ok) {
                                const d = (await dr.json()).data;
                                opening_stock = d.opening_stock ?? d.valuation_rate ?? 0;
                            }
                        } catch { /* non-fatal */ }
                        return { item_code: i.item_code, item_name: i.item_name, opening_stock, valuation_rate: i.valuation_rate || 0 };
                    })
                );
                setItems(enriched);
            }
            if (companiesRes.ok) setCompanies((await companiesRes.json()).data || []);
        } catch (err) { console.error('Dropdown fetch error:', err); }
    };

    // ── Filtered orders ───────────────────────────────────────────────────────
    const filtered = orders.filter(po => {
        const term = searchTerm.toLowerCase();
        const matchSearch = po.name.toLowerCase().includes(term) ||
            (po.supplier_name || po.supplier || '').toLowerCase().includes(term);
        const poStatus = po.docstatus === 0 ? 'Draft' : po.status;
        const matchStatus = !statusFilter || poStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleRefresh = () => { fetchOrders(); fetchMetrics(); };

    return (
        <main className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50/80">
            {/* Page header */}
            <div className="border-b border-gray-100 bg-white sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 mb-6 shadow-sm">
                <div className="flex h-16 items-center justify-between">
                    <h1 className="text-xl font-extrabold text-[#2D2A26] tracking-tight">Purchase Orders</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={() => window.location.href = '/pos'}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 font-semibold text-sm transition-colors shadow-sm">
                            <ArrowLeft className="h-4 w-4" />
                            Back to POS
                        </button>
                        <button onClick={handleRefresh}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white hover:border-[#E4B315]/40 hover:text-[#C69A11] text-gray-400 transition-colors shadow-sm">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowCreateModal(true)} className={BTN_P}>
                            <Plus className="h-4 w-4" /> New Purchase Order
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    icon={<ShoppingCart className="h-5 w-5 text-blue-600" />}
                    label="Total Orders"
                    value={metricsLoading ? '—' : String(metrics.total_orders)}
                    sub="Draft + Submitted"
                />
                <MetricCard
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    label="Pending Orders"
                    value={metricsLoading ? '—' : String(metrics.pending_orders)}
                    sub="Draft status"
                    accent="text-amber-600"
                />
                <MetricCard
                    icon={<DollarSign className="h-5 w-5 text-green-600" />}
                    label="Monthly Spend"
                    value={metricsLoading ? '—' : `KSh ${(metrics.monthly_spend / 1000).toFixed(1)}K`}
                    sub="Last 30 days"
                    accent="text-green-600"
                />
                <MetricCard
                    icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
                    label="On-Time Delivery"
                    value={metricsLoading ? '—' : `${metrics.on_time_delivery_pct}%`}
                    sub="Receipt ≤ PO schedule date"
                    accent={metrics.on_time_delivery_pct >= 80 ? 'text-green-600' : 'text-amber-600'}
                />
            </div>

            {/* PO List */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* List header */}
                <div className="flex flex-col space-y-1.5 p-5 pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C69A11]">Purchase Orders</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Showing Draft and Submitted orders</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input className={INPUT + ' pl-9'} placeholder="Search by PO number or supplier..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <select className={INPUT + ' w-[180px]'} value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="To Receive and Bill">To Receive and Bill</option>
                            <option value="To Bill">To Bill</option>
                            <option value="To Receive">To Receive</option>
                            <option value="Completed">Completed</option>
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
                            <button onClick={fetchOrders} className="mt-4 text-sm text-[#C69A11] underline">Try Again</button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-12 text-gray-400">
                            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">No purchase orders found</p>
                            <p className="text-sm mt-1">Create your first purchase order to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {filtered.map(po => (
                                <div key={po.name}
                                    className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white hover:border-[#E4B315]/30 hover:shadow-md transition-all cursor-default">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="rounded-md bg-amber-50 border border-amber-200 p-2 shrink-0 mt-0.5">
                                            <FileText className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-[#2D2A26]">{po.name}</span>
                                                <StatusBadge status={po.status} docstatus={po.docstatus} />
                                            </div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {po.supplier_name || po.supplier}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                                                <span>Order: {po.transaction_date}</span>
                                                {po.schedule_date && <span>Expected: {po.schedule_date}</span>}
                                                <span>{po.items_count} item{po.items_count !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <div className="font-bold text-[#2D2A26]">
                                            {fmtCurrency(po.grand_total || 0)}
                                        </div>
                                        {po.docstatus === 1 ? (
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

            {/* Create PO Modal */}
            {showCreateModal && (
                <CreatePOModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { fetchOrders(); fetchMetrics(); }}
                    suppliers={suppliers}
                    items={items}
                    companies={companies}
                />
            )}
        </main>
    );
};

export default PurchaseOrders;