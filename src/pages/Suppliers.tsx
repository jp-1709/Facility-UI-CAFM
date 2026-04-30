import React, { useState, useEffect } from 'react';
import {
    Plus, Search, X, Edit2, Trash2, Phone, Mail,
    Building, ChevronDown, Package, ShoppingCart,
    RefreshCw, ArrowLeft, Printer,
} from 'lucide-react';

// ─── Frappe CSRF helper ───────────────────────────────────────────────────────
const getCsrfToken = (): string => {
    if (typeof window !== 'undefined') {
        const f = (window as any).frappe;
        if (f?.csrf_token && f.csrf_token !== 'Guest') return f.csrf_token;
    }
    const m = document.cookie.match(/(?:^|;\s*)X-Frappe-CSRF-Token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : (window as any).csrf_token || '';
};

// ─── Button / input constants (mirrors PurchaseOrders) ───────────────────────
const BTN_P =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20 hover:opacity-90 hover:-translate-y-px h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_O =
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-gray-200 bg-white text-gray-700 hover:border-[#E4B315]/40 hover:text-[#C69A11] h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';
const INPUT =
    'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Supplier {
    disabled: any;
    name: string;
    supplier_name: string;
    supplier_type?: string;
    email?: string;
    mobile_no?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    contact_person?: string;
    contact_designation?: string;
    contact_email?: string;
    contact_phone?: string;
    supplier_group?: string;
    tax_id?: string;
    pan?: string;
    gst_category?: string;
    gstin?: string;
    is_active?: boolean;
    default_price_list?: string;
    payment_terms?: string;
    credit_limit?: number;
    billing_address?: string;
    shipping_address?: string;
    lead_time?: number;
}

interface SupplierGroup {
    name: string;
    supplier_group_name: string;
    parent_supplier_group?: string;
    is_group: number;
    payment_terms?: string;
}

interface PaymentTerm {
    name: string;
    payment_term: string;
    credit_days?: number;
    description?: string;
}

interface PriceList {
    name: string;
    price_list_name: string;
    currency: string;
    enabled: number;
}

// ─── Modal tab labels ─────────────────────────────────────────────────────────
const TAB_MODAL = ['Basic Info', 'Financial Terms', 'Operations'] as const;
type ModalTab = (typeof TAB_MODAL)[number];

// ─── Metric Card (mirrors PurchaseOrders MetricCard) ──────────────────────────
const MetricCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
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

// ─── Main Component ───────────────────────────────────────────────────────────
const Suppliers: React.FC = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierGroups, setSupplierGroups] = useState<SupplierGroup[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([]);
    const [priceLists, setPriceLists] = useState<PriceList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<ModalTab>('Basic Info');

    const [formData, setFormData] = useState<Partial<Supplier>>({
        supplier_name: '', email: '', mobile_no: '', phone: '', address: '',
        city: '', state: '', country: 'Kenya', pincode: '', contact_person: '',
        contact_designation: '', contact_email: '', contact_phone: '',
        supplier_group: 'General', tax_id: '', disabled: false,
        default_price_list: '', payment_terms: '30 days', credit_limit: 0,
        lead_time: 0,
    });

    // ── Data fetching ─────────────────────────────────────────────────────────
    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = () => {
        fetchSuppliers();
        fetchSupplierGroups();
        fetchPaymentTerms();
        fetchPriceLists();
    };

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            let allSuppliers: Supplier[] = [];
            let start = 0;
            let hasMore = true;
            while (hasMore) {
                const res = await fetch(
                    `/api/resource/Supplier?fields=["*"]&limit_start=${start}&limit_page_length=100`
                );
                const data = await res.json();
                if (data.data && data.data.length > 0) {
                    allSuppliers = [...allSuppliers, ...data.data];
                    start += data.data.length;
                    hasMore = data.data.length === 100;
                } else { hasMore = false; }
            }
            setSuppliers(allSuppliers);
        } catch { setError('Failed to load suppliers'); }
        finally { setLoading(false); }
    };

    const fetchSupplierGroups = async () => {
        try {
            const res = await fetch(`/api/resource/Supplier Group?fields=["*"]&limit_page_length=100`);
            const data = await res.json();
            if (data.data) setSupplierGroups(data.data.filter((g: SupplierGroup) => !g.is_group));
        } catch { /* non-fatal */ }
    };

    const fetchPaymentTerms = async () => {
        try {
            const res = await fetch(
                `/api/resource/Payment Terms Template?fields=["name","template_name","terms.payment_term","terms.credit_days","terms.description"]&limit_page_length=100`
            );
            const data = await res.json();
            if (data.data) {
                const terms = data.data.map((template: any) => ({
                    name: template.name,
                    payment_term: template.payment_term || template.name,
                    credit_days: template.credit_days || 0,
                    description: template.description || '',
                }));
                setPaymentTerms(terms);
            }
        } catch { /* non-fatal */ }
    };

    const fetchPriceLists = async () => {
        try {
            const res = await fetch(
                `/api/resource/Price List?fields=["name","price_list_name","currency","enabled"]&limit_page_length=100`
            );
            const data = await res.json();
            if (data.data) setPriceLists(data.data.filter((pl: PriceList) => pl.enabled === 1));
        } catch { /* non-fatal */ }
    };

    // ── Derived stats ─────────────────────────────────────────────────────────
    const activeCount = suppliers.filter(s => !s.disabled).length;

    const filteredSuppliers = suppliers.filter(s =>
        (s.supplier_name || s.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.contact_person || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.mobile_no || s.phone || '').toLowerCase().includes(search.toLowerCase())
    );

    // ── Modal helpers ─────────────────────────────────────────────────────────
    const openModal = (supplier?: Supplier) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData(supplier);
        } else {
            setEditingSupplier(null);
            setFormData({
                supplier_name: '', email: '', mobile_no: '', address: '', city: '',
                country: 'Kenya', contact_person: '', contact_phone: '',
                supplier_group: 'General', disabled: false,
                credit_limit: 0, payment_terms: '30 days', lead_time: 0,
            });
        }
        setActiveTab('Basic Info');
        setShowModal(true);
    };

    const saveSupplier = async () => {
        if (!formData.supplier_name?.trim()) { alert('Supplier name is required'); return; }
        setSaving(true);
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': getCsrfToken(),
        };
        try {
            let res;
            if (editingSupplier) {
                res = await fetch(`/api/resource/Supplier/${encodeURIComponent(editingSupplier.name)}`, {
                    method: 'PUT', headers, body: JSON.stringify(formData),
                });
            } else {
                res = await fetch('/api/resource/Supplier', {
                    method: 'POST', headers, body: JSON.stringify(formData),
                });
            }
            const data = await res.json();
            if (!res.ok) throw new Error(data?.exception || data?.message || 'Failed to save');
            if (editingSupplier) {
                setSuppliers(prev => prev.map(s => s.name === editingSupplier.name ? { ...s, ...data.data } : s));
            } else {
                setSuppliers(prev => [{ ...data.data }, ...prev]);
            }
            setShowModal(false);
        } catch (err: any) { alert('Failed to save supplier: ' + err.message); }
        finally { setSaving(false); }
    };

    const deleteSupplier = async (supplier: Supplier) => {
        if (!window.confirm(`Delete "${supplier.supplier_name || supplier.name}"?`)) return;
        try {
            const res = await fetch(`/api/resource/Supplier/${encodeURIComponent(supplier.name)}`, {
                method: 'DELETE',
                headers: { 'X-Frappe-CSRF-Token': getCsrfToken() },
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d?.message); }
            setSuppliers(prev => prev.filter(s => s.name !== supplier.name));
        } catch (err: any) { alert('Failed to delete: ' + err.message); }
    };

    // ── Loading / error states ────────────────────────────────────────────────
    if (loading) return (
        <div className="flex h-full items-center justify-center bg-gray-50/80">
            <div className="text-center">
                <div className="relative w-10 h-10 mx-auto mb-3">
                    <div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" />
                </div>
                <p className="text-sm text-gray-400">Loading suppliers...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex h-full items-center justify-center bg-gray-50/80">
            <div className="text-center">
                <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#2D2A26] mb-2">Error Loading Suppliers</h3>
                <p className="text-sm text-gray-500 mb-4">{error}</p>
                <button onClick={fetchAll} className={BTN_P}>Try Again</button>
            </div>
        </div>
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <main className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50/80">

            {/* Page header */}
            <div className="border-b border-gray-100 bg-white sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 mb-6 shadow-sm">
                <div className="flex h-16 items-center justify-between">
                    <h1 className="text-xl font-extrabold text-[#2D2A26] tracking-tight">Suppliers</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.location.href = '/pos'}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 font-semibold text-sm transition-colors shadow-sm">
                            <ArrowLeft className="h-4 w-4" />
                            Back to POS
                        </button>
                        <button
                            onClick={fetchAll}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white hover:border-[#E4B315]/40 hover:text-[#C69A11] text-gray-400 transition-colors shadow-sm">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => openModal()} className={BTN_P}>
                            <Plus className="h-4 w-4" /> New Supplier
                        </button>
                    </div>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <MetricCard
                    icon={<Building className="h-5 w-5 text-blue-600" />}
                    label="Total Suppliers"
                    value={suppliers.length}
                    sub="Registered suppliers"
                />
                <MetricCard
                    icon={<span className="text-lg">☆</span>}
                    label="Active Suppliers"
                    value={activeCount}
                    sub="Currently active"
                    accent="text-[#C69A11]"
                />
                <MetricCard
                    icon={<ShoppingCart className="h-5 w-5 text-purple-600" />}
                    label="Pending Orders"
                    value={0}
                    sub="Awaiting delivery"
                />
            </div>

            {/* Supplier List Card */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">

                {/* List header */}
                <div className="flex flex-col space-y-1.5 p-5 pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C69A11]">Suppliers List</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Manage your restaurant's suppliers and vendor relationships</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className={BTN_O}>
                                <Printer className="h-4 w-4" /> Print
                            </button>
                            <button className={BTN_O}>
                                <Package className="h-4 w-4" /> Inventory
                            </button>
                            <button className={BTN_O}>
                                <ShoppingCart className="h-4 w-4" /> Purchase Orders
                            </button>
                        </div>
                    </div>

                    {/* Search row */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                className={INPUT + ' pl-9'}
                                placeholder="Search by name, email or phone…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <button className={BTN_O + ' gap-1'}>
                            All Suppliers <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Grid body */}
                <div className="p-6 pt-0">
                    {filteredSuppliers.length === 0 ? (
                        <div className="text-center p-12 text-gray-400">
                            <Building className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium text-[#2D2A26]">No Suppliers Found</p>
                            <p className="text-sm mt-1">
                                {search ? 'Try adjusting your search' : 'Add your first supplier to get started'}
                            </p>
                            {!search && (
                                <button onClick={() => openModal()} className={BTN_P + ' mt-4'}>
                                    <Plus className="h-4 w-4" /> Add Supplier
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                            {filteredSuppliers.map(supplier => (
                                <div
                                    key={supplier.name}
                                    className="rounded-2xl border border-gray-100 bg-white p-4 hover:border-[#E4B315]/30 hover:shadow-md transition-all cursor-default"
                                >
                                    {/* Card header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-start gap-3">
                                            <div className="rounded-md bg-amber-50 border border-amber-200 p-2 shrink-0 mt-0.5">
                                                <Building className="h-4 w-4 text-amber-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#2D2A26] text-sm leading-tight">
                                                    {supplier.supplier_name || supplier.name}
                                                </p>
                                                {supplier.supplier_group && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{supplier.supplier_group}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0 ${supplier.disabled
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                            {supplier.disabled ? 'Inactive' : 'Active'}
                                        </span>
                                    </div>

                                    {/* Contact info */}
                                    <div className="flex flex-col gap-1.5 mb-3">
                                        {supplier.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span className="text-xs text-gray-500 truncate">{supplier.email}</span>
                                            </div>
                                        )}
                                        {(supplier.mobile_no || supplier.phone) && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                <span className="text-xs text-gray-500">{supplier.mobile_no || supplier.phone}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Payment / Lead time */}
                                    <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-3 mb-3">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Payment Terms</p>
                                            <p className="text-xs font-semibold text-[#2D2A26]">
                                                {supplier.payment_terms || <span className="text-gray-300">—</span>}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Lead Time</p>
                                            <p className="text-xs font-semibold text-[#2D2A26]">
                                                {supplier.lead_time
                                                    ? `${supplier.lead_time} days`
                                                    : <span className="text-gray-300">— days</span>
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex gap-2 border-t border-gray-50 pt-3">
                                        <button
                                            onClick={() => openModal(supplier)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 hover:border-[#E4B315]/40 hover:text-[#C69A11] text-xs font-semibold h-8 transition-colors">
                                            <Edit2 className="h-3 w-3" /> Edit
                                        </button>
                                        <button
                                            onClick={() => deleteSupplier(supplier)}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold h-8 px-3 transition-colors">
                                            <Trash2 className="h-3 w-3" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal ────────────────────────────────────────────────────── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">

                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-0">
                            <div className="flex items-center gap-2">
                                <div className="rounded-md bg-amber-50 border border-amber-200 p-1.5">
                                    <Building className="h-4 w-4 text-amber-600" />
                                </div>
                                <h2 className="text-base font-bold text-[#2D2A26]">
                                    {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal tabs */}
                        <div className="flex gap-0 border-b border-gray-100 mx-6 mt-4">
                            {TAB_MODAL.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${activeTab === tab
                                        ? 'border-[#E4B315] text-[#C69A11]'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 space-y-4">

                            {/* ── Basic Info ── */}
                            {activeTab === 'Basic Info' && (
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-[#2D2A26]">Basic Information</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">Enter the supplier's contact and business information</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Supplier Name *</label>
                                            <input className={INPUT} value={formData.supplier_name || ''} onChange={e => setFormData({ ...formData, supplier_name: e.target.value })} placeholder="Enter supplier name" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Contact Person</label>
                                            <input className={INPUT} value={formData.contact_person || ''} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} placeholder="Contact person name" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Email</label>
                                            <input className={INPUT} type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Email address" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Phone</label>
                                            <input className={INPUT} value={formData.mobile_no || ''} onChange={e => setFormData({ ...formData, mobile_no: e.target.value })} placeholder="Phone number" />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Address</label>
                                            <input className={INPUT} value={formData.address || ''} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Street address" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">City</label>
                                            <input className={INPUT} value={formData.city || ''} onChange={e => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Country</label>
                                            <input className={INPUT} value={formData.country || ''} onChange={e => setFormData({ ...formData, country: e.target.value })} placeholder="Country" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Tax ID</label>
                                            <input className={INPUT} value={formData.tax_id || ''} onChange={e => setFormData({ ...formData, tax_id: e.target.value })} placeholder="Tax ID" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Supplier Group</label>
                                            <select className={INPUT + ' appearance-none'} value={formData.supplier_group || ''} onChange={e => setFormData({ ...formData, supplier_group: e.target.value })}>
                                                <option value="">Select Group</option>
                                                {supplierGroups.map(g => <option key={g.name} value={g.name}>{g.supplier_group_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Financial Terms ── */}
                            {activeTab === 'Financial Terms' && (
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-[#2D2A26]">Financial Terms</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">Set payment and credit terms for this supplier</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Payment Terms</label>
                                            <select
                                                className={INPUT + ' appearance-none'}
                                                value={formData.payment_terms || ''}
                                                onChange={e => {
                                                    const selected = paymentTerms.find(t => t.name === e.target.value);
                                                    setFormData({ ...formData, payment_terms: e.target.value, credit_limit: selected?.credit_days || 0 });
                                                }}>
                                                <option value="">Select Payment Terms</option>
                                                {paymentTerms.map(t => <option key={t.name} value={t.name}>{t.payment_term}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Credit Limit (KES)</label>
                                            <input className={INPUT} type="number" min="0" value={formData.credit_limit || ''} onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })} placeholder="0" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Default Price List</label>
                                            <select className={INPUT + ' appearance-none'} value={formData.default_price_list || ''} onChange={e => setFormData({ ...formData, default_price_list: e.target.value })}>
                                                <option value="">Select Price List</option>
                                                {priceLists.map(pl => <option key={pl.name} value={pl.name}>{pl.price_list_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Operations ── */}
                            {activeTab === 'Operations' && (
                                <div>
                                    <div className="mb-4">
                                        <h3 className="text-sm font-bold text-[#2D2A26]">Operations</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">Logistics and operational details</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Lead Time (days)</label>
                                            <input className={INPUT} type="number" min="0" value={formData.lead_time || ''} onChange={e => setFormData({ ...formData, lead_time: parseInt(e.target.value) || 0 })} placeholder="0" />
                                        </div>
                                        <div className="flex items-end pb-1">
                                            <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    id="disabled-toggle"
                                                    checked={!formData.disabled}
                                                    onChange={e => setFormData({ ...formData, disabled: !e.target.checked })}
                                                    className="h-4 w-4 rounded accent-[#E4B315]"
                                                />
                                                <span className="text-sm text-gray-600 font-medium">Enable Supplier</span>
                                            </label>
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Billing Address</label>
                                            <textarea
                                                className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors min-h-[72px] resize-vertical"
                                                value={formData.billing_address || ''}
                                                onChange={e => setFormData({ ...formData, billing_address: e.target.value })}
                                                placeholder="Billing address"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-xs font-medium text-gray-400">Shipping Address</label>
                                            <textarea
                                                className="flex w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors min-h-[72px] resize-vertical"
                                                value={formData.shipping_address || ''}
                                                onChange={e => setFormData({ ...formData, shipping_address: e.target.value })}
                                                placeholder="Shipping address"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal footer */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                                <button onClick={() => setShowModal(false)} disabled={saving} className={BTN_O}>
                                    Cancel
                                </button>
                                <button
                                    onClick={saveSupplier}
                                    disabled={saving || !formData.supplier_name?.trim()}
                                    className={BTN_P}>
                                    {saving && (
                                        <div className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                                    )}
                                    <Building className="h-4 w-4" />
                                    {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Suppliers;