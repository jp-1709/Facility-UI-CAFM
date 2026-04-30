import React, { useState, useEffect } from 'react';
import {
    Plus, X, Trash2, ArrowLeftRight, Clock, DollarSign,
    TrendingUp, ChevronRight, Search, RefreshCw,
    AlertCircle, CheckCircle2, TriangleAlert, Eye, Check,
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

// Button constants for consistent blue theme
const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20 hover:opacity-90 hover:-translate-y-px h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors border border-gray-200 bg-white text-gray-700 hover:border-[#E4B315]/40 hover:text-[#C69A11] h-10 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SupplierReturn {
    name: string;
    return_type: 'Invoice' | 'GRN';
    supplier: string;
    supplier_name?: string;
    posting_date: string;
    grand_total: number;
    account_currency: string;
    status: string;
    docstatus: number;
    items_count: number;
    source_document?: string;
}

interface DashboardMetrics {
    total_returns: number;
    pending_approvals: number;
    total_value: number;
    currency?: string;
}

interface SupplierOption {
    name: string;
    supplier_name: string;
}

interface InvoiceOption {
    name: string;
    supplier: string;
    supplier_name?: string;
    grand_total: number;
    account_currency: string;
}

interface GRNOption {
    name: string;
    supplier: string;
    supplier_name?: string;
    grand_total: number;
    account_currency: string;
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const INPUT = 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const TEXTAREA = 'flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; docstatus: number }> = ({ status, docstatus }) => {
    const cfg: Record<string, string> = {
        Draft: 'bg-gray-100 text-gray-600 border-gray-200',
        'Pending Approval': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'Approved': 'bg-green-100 text-green-700 border-green-200',
        'Rejected': 'bg-red-100 text-red-700 border-red-200',
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

// ─── Create Supplier Return Modal ─────────────────────────────────────────────
interface CreateReturnModalProps {
    onClose: () => void;
    onCreated: () => void;
    suppliers: SupplierOption[];
}

const CreateReturnModal: React.FC<CreateReturnModalProps> = ({ onClose, onCreated, suppliers }) => {
    const [returnMode, setReturnMode] = useState<'invoice' | 'grn'>('invoice');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [sourceDocuments, setSourceDocuments] = useState<InvoiceOption[] | GRNOption[]>([]);
    const [selectedSourceDoc, setSelectedSourceDoc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (selectedSupplier && returnMode) {
            fetchSourceDocuments(selectedSupplier, returnMode);
        } else {
            setSourceDocuments([]);
            setSelectedSourceDoc('');
        }
    }, [selectedSupplier, returnMode]);

    const fetchSourceDocuments = async (supplier: string, mode: 'invoice' | 'grn') => {
        try {
            const doctype = mode === 'invoice' ? 'Purchase%20Invoice' : 'Purchase%20Receipt';
            const filters = encodeURIComponent(JSON.stringify([
                ['supplier', '=', supplier],
                ['docstatus', '=', 1],
                ['is_return', '=', 0],
                ['status', 'not in', ['Return', 'Cancelled', 'Closed', 'Return Issued']]
            ]));
            const fields = encodeURIComponent(JSON.stringify([
                'name', 'supplier', 'supplier_name', 'grand_total', 'account_currency'
            ]));
            const res = await fetch(
                `/api/resource/${doctype}?filters=${filters}&fields=${fields}&limit=50&order_by=posting_date%20desc`
            );
            if (res.ok) {
                const data = (await res.json()).data || [];
                setSourceDocuments(data);
            } else {
                setSourceDocuments([]);
            }
        } catch (err) {
            console.error('Error fetching source documents:', err);
            setSourceDocuments([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplier || !selectedSourceDoc) {
            alert('Please select supplier and source document');
            return;
        }
        setIsSubmitting(true);

        try {
            const payload: any = {
                supplier: selectedSupplier,
                posting_date: todayISO(),
                ...(returnMode === 'invoice' ? {
                    return_against: selectedSourceDoc,
                    is_return: 1,
                } : {
                    purchase_receipt: selectedSourceDoc,
                    is_return: 1,
                }),
            };

            const doctype = returnMode === 'invoice' ? 'Purchase%20Invoice' : 'Purchase%20Receipt';

            const res = await fetch(`/api/resource/${doctype}`, {
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
            alert('Error creating supplier return: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-gray-100 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-md bg-orange-50 p-1.5 border border-orange-200">
                            <ArrowLeftRight className="h-4 w-4 text-orange-600" />
                        </div>
                        <h2 className="text-base font-semibold text-[#2D2A26]">Create Supplier Return</h2>
                    </div>
                    <button type="button" onClick={onClose}
                        className="rounded-sm text-gray-400 hover:text-[#2D2A26] opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Modal body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Return Mode Selection */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-[#2D2A26]">Return Mode</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReturnMode('invoice')}
                                    className={`p-4 border rounded-lg transition-colors ${returnMode === 'invoice'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-100 bg-white hover:bg-muted'
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="font-medium">Invoice-Based Return</div>
                                        <div className="text-xs text-gray-400 mt-1">Return against Purchase Invoice</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReturnMode('grn')}
                                    className={`p-4 border rounded-lg transition-colors ${returnMode === 'grn'
                                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                                        : 'border-gray-100 bg-white hover:bg-muted'
                                        }`}
                                >
                                    <div className="text-center">
                                        <div className="font-medium">GRN-Based Return</div>
                                        <div className="text-xs text-gray-400 mt-1">Return against Purchase Receipt</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Supplier Selection */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Search and select a supplier...</label>
                            <div className="relative">
                                <select
                                    required
                                    className={INPUT + ' appearance-none pr-8'}
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                >
                                    <option value="">Select supplier</option>
                                    {suppliers.map(s => (
                                        <option key={s.name} value={s.name}>
                                            {s.supplier_name || s.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                            </div>
                        </div>

                        {/* Source Document Selection */}
                        {selectedSupplier && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">
                                    Select {returnMode === 'invoice' ? 'Purchase Invoice' : 'Purchase Receipt'} to Return
                                </label>
                                <div className="relative">
                                    <select
                                        required
                                        className={INPUT + ' appearance-none pr-8'}
                                        value={selectedSourceDoc}
                                        onChange={e => setSelectedSourceDoc(e.target.value)}
                                    >
                                        <option value="">Select {returnMode === 'invoice' ? 'invoice' : 'receipt'}</option>
                                        {sourceDocuments.map(doc => (
                                            <option key={doc.name} value={doc.name}>
                                                {doc.name} ({fmtCurrency(doc.grand_total, doc.account_currency)})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronRight className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {/* Selected Document Info */}
                        {selectedSourceDoc && sourceDocuments.length > 0 && (
                            <div className="rounded-lg border border-gray-100 bg-muted/30 p-4">
                                <div className="text-sm">
                                    <div className="font-medium text-[#2D2A26]">
                                        {returnMode === 'invoice' ? 'Invoice' : 'Receipt'} Details
                                    </div>
                                    <div className="mt-2 space-y-1 text-gray-400">
                                        <div>Document: {selectedSourceDoc}</div>
                                        <div>Amount: {
                                            fmtCurrency(
                                                sourceDocuments.find(d => d.name === selectedSourceDoc)?.grand_total || 0,
                                                sourceDocuments.find(d => d.name === selectedSourceDoc)?.account_currency || 'KSh'
                                            )
                                        }</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Modal footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-muted/20 shrink-0 rounded-b-xl">
                    <button type="button" onClick={onClose} className={BTN_O}>
                        Cancel
                    </button>
                    <button
                        form="return-form"
                        type="submit"
                        disabled={isSubmitting || !selectedSupplier || !selectedSourceDoc}
                        className={BTN_P}
                        onClick={handleSubmit}
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                        {isSubmitting ? 'Creating...' : 'Create Return'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Main SupplierReturns Component ───────────────────────────────────────────
const SupplierReturns: React.FC = () => {
    const [returns, setReturns] = useState<SupplierReturn[]>([]);
    const [metrics, setMetrics] = useState<DashboardMetrics>({ total_returns: 0, pending_approvals: 0, total_value: 0 });
    const [loading, setLoading] = useState(true);
    const [metricsLoading, setMetricsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

    useEffect(() => {
        fetchReturns();
        fetchMetrics();
        fetchSuppliers();
    }, []);

    // ── Fetch Supplier Returns ────────────────────────────────────────────────
    const fetchReturns = async () => {
        try {
            setLoading(true); setError(null);

            const invoiceFilters = encodeURIComponent(JSON.stringify([
                ['docstatus', 'in', [0, 1]],
                ['is_return', '=', 1],
                ['status', 'like', '%Return%']
            ]));
            const invoiceFields = encodeURIComponent(JSON.stringify([
                'name', 'supplier', 'supplier_name', 'posting_date',
                'status', 'docstatus', 'grand_total', 'account_currency'
            ]));

            const receiptFilters = encodeURIComponent(JSON.stringify([
                ['docstatus', 'in', [0, 1]],
                ['is_return', '=', 1],
                ['status', '=', 'Return Issued']
            ]));
            const receiptFields = encodeURIComponent(JSON.stringify([
                'name', 'supplier', 'supplier_name', 'posting_date',
                'status', 'docstatus', 'grand_total', 'account_currency'
            ]));

            const responses = await Promise.all([
                fetch(`/api/resource/Purchase%20Invoice?filters=${invoiceFilters}&fields=${invoiceFields}&limit=200&order_by=posting_date%20desc`),
                fetch(`/api/resource/Purchase%20Receipt?filters=${receiptFilters}&fields=${receiptFields}&limit=200&order_by=posting_date%20desc`)
            ]);

            let invoiceReturns = [];
            let receiptReturns = [];

            if (responses[0].ok) {
                const invoiceData = await responses[0].json();
                invoiceReturns = invoiceData.data || [];
            }

            if (responses[1].ok) {
                const receiptData = await responses[1].json();
                receiptReturns = receiptData.data || [];
            }

            const allReturns: SupplierReturn[] = [
                ...invoiceReturns.map((ir: any) => ({
                    ...ir,
                    return_type: 'Invoice' as const,
                    source_document: ir.return_against,
                    items_count: 0
                })),
                ...receiptReturns.map((rr: any) => ({
                    ...rr,
                    return_type: 'GRN' as const,
                    source_document: rr.purchase_receipt,
                    items_count: 0
                }))
            ];

            const enriched = await Promise.all(allReturns.map(async (ret: any) => {
                let items_count = 0;
                try {
                    const doctype = ret.return_type === 'Invoice' ? 'Purchase%20Invoice' : 'Purchase%20Receipt';
                    const r = await fetch(`/api/resource/${doctype}/${encodeURIComponent(ret.name)}`);
                    if (r.ok) {
                        const detail = (await r.json()).data;
                        items_count = detail.items?.length || 0;
                    }
                } catch { /* non-fatal */ }
                return { ...ret, items_count };
            }));

            setReturns(enriched);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Dashboard Metrics ─────────────────────────────────────────────────────
    const fetchMetrics = async () => {
        setMetricsLoading(true);
        try {
            const invoiceTotalRes = await fetch(
                `/api/resource/Purchase%20Invoice?filters=${encodeURIComponent(JSON.stringify([['docstatus', 'in', [0, 1]], ['is_return', '=', 1], ['status', 'like', '%Return%']]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const receiptTotalRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', 'in', [0, 1]], ['is_return', '=', 1], ['status', '=', 'Return Issued']]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );

            const invoiceData = invoiceTotalRes.ok ? (await invoiceTotalRes.json()).data || [] : [];
            const receiptData = receiptTotalRes.ok ? (await receiptTotalRes.json()).data || [] : [];
            const total_returns = invoiceData.length + receiptData.length;

            const invoicePendingRes = await fetch(
                `/api/resource/Purchase%20Invoice?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', 0], ['is_return', '=', 1], ['status', 'like', '%Return%']]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );
            const receiptPendingRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', 0], ['is_return', '=', 1], ['status', '=', 'Return Issued']]))}&fields=${encodeURIComponent(JSON.stringify(['name']))}&limit=500`
            );

            const invoicePending = invoicePendingRes.ok ? (await invoicePendingRes.json()).data || [] : [];
            const receiptPending = receiptPendingRes.ok ? (await receiptPendingRes.json()).data || [] : [];
            const pending_approvals = invoicePending.length + receiptPending.length;

            const invoiceValueRes = await fetch(
                `/api/resource/Purchase%20Invoice?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', 1], ['is_return', '=', 1], ['status', 'like', '%Return%']]))}&fields=${encodeURIComponent(JSON.stringify(['grand_total', 'account_currency']))}&limit=500`
            );
            const receiptValueRes = await fetch(
                `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(JSON.stringify([['docstatus', '=', 1], ['is_return', '=', 1], ['status', '=', 'Return Issued']]))}&fields=${encodeURIComponent(JSON.stringify(['grand_total', 'account_currency']))}&limit=500`
            );

            const invoiceValueData = invoiceValueRes.ok ? (await invoiceValueRes.json()).data || [] : [];
            const receiptValueData = receiptValueRes.ok ? (await receiptValueRes.json()).data || [] : [];

            const total_value = [...invoiceValueData, ...receiptValueData].reduce((s: number, r: any) => s + (r.grand_total || 0), 0);
            const currency = invoiceValueData.length > 0 ? (invoiceValueData[0].account_currency || 'KSh') : 'KSh';

            setMetrics({ total_returns, pending_approvals, total_value, currency });
        } catch (err) {
            console.error('Metrics fetch error:', err);
        } finally {
            setMetricsLoading(false);
        }
    };

    // ── Fetch Suppliers ───────────────────────────────────────────────────────
    const fetchSuppliers = async () => {
        try {
            const res = await fetch(
                `/api/resource/Supplier?fields=${encodeURIComponent(JSON.stringify(['name', 'supplier_name']))}&limit=200`
            );
            if (res.ok) {
                setSuppliers((await res.json()).data || []);
            }
        } catch (err) {
            console.error('Suppliers fetch error:', err);
        }
    };

    // ── Filtered returns ──────────────────────────────────────────────────────
    const filtered = returns.filter(ret => {
        const term = searchTerm.toLowerCase();
        const matchSearch = ret.name.toLowerCase().includes(term) ||
            (ret.supplier_name || ret.supplier || '').toLowerCase().includes(term);
        const retStatus = ret.docstatus === 0 ? 'Draft' : ret.status;
        const matchStatus = !statusFilter || retStatus === statusFilter;
        return matchSearch && matchStatus;
    });

    const handleRefresh = () => { fetchReturns(); fetchMetrics(); };

    const handleApprove = async (returnDoc: SupplierReturn) => {
        try {
            const doctype = returnDoc.return_type === 'Invoice' ? 'Purchase%20Invoice' : 'Purchase%20Receipt';
            const res = await fetch(`/api/resource/${doctype}/${encodeURIComponent(returnDoc.name)}`, {
                method: 'PUT',
                headers: mutationHeaders(),
                body: JSON.stringify({ docstatus: 1, status: 'Approved' }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(parseFrappeError(errData));
            }

            fetchReturns();
            fetchMetrics();
        } catch (err: any) {
            alert('Error approving return: ' + err.message);
        }
    };

    return (
        <main className="h-full overflow-y-auto p-4 md:p-6 bg-gray-50/80">
            {/* Page header */}
            <div className="border-b border-gray-100 bg-white sticky top-0 z-10 -mx-4 md:-mx-6 px-4 md:px-6 mb-6 shadow-sm">
                <div className="flex h-16 items-center justify-between">
                    <h1 className="text-xl font-extrabold text-[#2D2A26] tracking-tight">Supplier Returns</h1>
                    <div className="flex items-center gap-2">
                        <button onClick={handleRefresh}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 bg-white hover:border-[#E4B315]/40 hover:text-[#C69A11] text-gray-400 transition-colors shadow-sm">
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button onClick={() => setShowCreateModal(true)} className={BTN_P}>
                            <Plus className="h-4 w-4" /> Create Return
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Metric Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <MetricCard
                    icon={<ArrowLeftRight className="h-5 w-5 text-blue-600" />}
                    label="Total Returns"
                    value={metricsLoading ? '—' : String(metrics.total_returns)}
                    sub="Invoice + GRN returns"
                />
                <MetricCard
                    icon={<Clock className="h-5 w-5 text-amber-600" />}
                    label="Pending Approvals"
                    value={metricsLoading ? '—' : String(metrics.pending_approvals)}
                    sub="Draft status"
                    accent="text-amber-600"
                />
                <MetricCard
                    icon={<DollarSign className="h-5 w-5 text-green-600" />}
                    label="Total Value"
                    value={metricsLoading ? '—' : fmtCurrency(metrics.total_value, metrics.currency)}
                    sub="All returns"
                    accent="text-green-600"
                />
            </div>

            {/* Returns List */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
                {/* List header */}
                <div className="flex flex-col space-y-1.5 p-5 pb-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-[#C69A11]">Supplier Returns</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Manage supplier returns and approvals</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input className={INPUT + ' pl-9'} placeholder="Search by return number or supplier..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <select className={INPUT + ' w-[180px]'} value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}>
                            <option value="">All Statuses</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* List body — fixed: now correctly inside the card div */}
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
                            <button onClick={fetchReturns} className="mt-4 text-sm text-[#C69A11] underline">Try Again</button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-12 text-gray-400">
                            <ArrowLeftRight className="h-10 w-10 mx-auto mb-3 opacity-40" />
                            <p className="font-medium">No supplier returns found</p>
                            <p className="text-sm mt-1">Create your first supplier return to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {filtered.map(ret => (
                                <div key={ret.name}
                                    className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white hover:border-[#E4B315]/30 hover:shadow-md transition-all cursor-default">
                                    <div className="flex items-start gap-4 flex-1 min-w-0">
                                        <div className="rounded-md bg-orange-50 border border-orange-200 p-2 shrink-0 mt-0.5">
                                            <ArrowLeftRight className="h-4 w-4 text-orange-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-[#2D2A26]">{ret.name}</span>
                                                <StatusBadge status={ret.status} docstatus={ret.docstatus} />
                                                <span className="text-xs text-gray-400 bg-muted px-2 py-1 rounded">
                                                    {ret.return_type}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mt-0.5">
                                                {ret.supplier_name || ret.supplier}
                                                {ret.source_document && <span className="ml-2">• Source: {ret.source_document}</span>}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                                                <span>Date: {ret.posting_date}</span>
                                                <span>{ret.items_count} item{ret.items_count !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0 ml-4">
                                        <div className="font-bold text-[#2D2A26]">
                                            {fmtCurrency(ret.grand_total || 0, ret.account_currency)}
                                        </div>
                                        <div className="flex items-center gap-1 justify-end mt-1">
                                            <button className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-input bg-white hover:bg-accent text-gray-400 hover:text-[#2D2A26] transition-colors">
                                                <Eye className="h-3 w-3" />
                                            </button>
                                            {ret.docstatus === 0 && (
                                                <button
                                                    onClick={() => handleApprove(ret)}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-green-600 bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 transition-colors"
                                                    title="Approve Return"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Return Modal */}
            {showCreateModal && (
                <CreateReturnModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { fetchReturns(); fetchMetrics(); }}
                    suppliers={suppliers}
                />
            )}
        </main>
    );
};

export default SupplierReturns;