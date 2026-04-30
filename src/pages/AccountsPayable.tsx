import React, { useState, useEffect } from 'react';
import { Plus, X, Receipt, DollarSign, Search, TrendingUp, TrendingDown, CheckCircle, CheckCircle2, Edit, Trash2, RefreshCw } from 'lucide-react';
import Pagination from '../components/Pagination';

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

const fmtCurrency = (n: number) =>
    `KSh ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PurchaseReceipt {
    name: string;
    supplier: string;
    supplier_name?: string;
    posting_date: string;
    due_date?: string;
    net_total?: number;
    taxes_and_charges_added?: number;
    payment_terms_template?: string;
    grand_total: number;
    status: string;
    docstatus: number;
}

type ModalType = 'PAYMENT' | 'EDIT' | 'CREATE' | null;

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const INPUT = 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const LABEL = 'block text-xs font-bold uppercase tracking-wider text-[#C69A11] mb-1.5';
const INPUT_BASE = 'flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors';

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const cfg: Record<string, string> = {
        'To Bill': 'bg-[#E4B315]/10 text-[#C69A11] border-[#E4B315]/30',
        'Partly Billed': 'bg-blue-100 text-blue-700 border-blue-200',
        'Completed': 'bg-green-100 text-green-700 border-green-200',
        'Draft': 'bg-gray-100 text-gray-600 border-gray-200',
    };
    const cls = cfg[status] || cfg['Draft'];
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
            {status}
        </span>
    );
};

// ─── Component ─────────────────────────────────────────────────────────────────
const AccountsPayable: React.FC = () => {
    // State
    const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Dynamic Lists State
    const [suppliers, setSuppliers] = useState<{ name: string, supplier_name: string }[]>([]);
    const [paymentTermsList, setPaymentTermsList] = useState<{ name: string }[]>([]);
    const [modesOfPayment, setModesOfPayment] = useState<{ name: string }[]>([]);
    const [accounts, setAccounts] = useState<{ name: string }[]>([]);
    const [supplierInvoices, setSupplierInvoices] = useState<{ name: string, grand_total: number }[]>([]);
    const [latestInvoice, setLatestInvoice] = useState('');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Modal State
    const [modalType, setModalType] = useState<ModalType>(null);
    const [selectedReceipt, setSelectedReceipt] = useState<PurchaseReceipt | null>(null);

    // Form states
    const [paymentForm, setPaymentForm] = useState<any>({});
    const [billForm, setBillForm] = useState<any>({});

    // Metrics
    const totalPayable = purchaseReceipts.reduce((sum, receipt) => sum + (receipt.grand_total || 0), 0);
    const toBillCount = purchaseReceipts.filter(receipt => receipt.status === 'To Bill').length;
    const partlyBilledCount = purchaseReceipts.filter(receipt => receipt.status === 'Partly Billed').length;

    // Filter receipts
    const filteredReceipts = purchaseReceipts.filter(receipt => {
        const matchesSearch = receipt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (receipt.supplier_name || receipt.supplier).toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    // Get paginated receipts for display
    const paginatedReceipts = filteredReceipts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

    // Reset to page 1 when search or itemsPerPage change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, itemsPerPage]);

    // API calls
    const fetchPurchaseReceipts = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/resource/Purchase%20Receipt?fields=["*"]&limit_page_length=50', {
                headers: mutationHeaders()
            });

            if (!response.ok) {
                setError('Failed to fetch purchase receipts');
                setLoading(false);
                return;
            }

            const data = await response.json();
            if (data.data && Array.isArray(data.data)) {
                const payables = data.data.filter((receipt: any) =>
                    receipt.status === 'To Bill' || receipt.status === 'Partly Billed' || receipt.status === 'Completed'
                );

                setTimeout(() => {
                    setPurchaseReceipts([...payables]);
                    setLoading(false);
                }, 200);
            } else {
                setPurchaseReceipts([]);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error:', error);
            setError('An error occurred while fetching data');
            setPurchaseReceipts([]);
            setLoading(false);
        }
    };

    const fetchDataDependencies = async () => {
        try {
            const [suppRes, ptRes, mopRes, accRes, invRes] = await Promise.all([
                fetch('/api/resource/Supplier?fields=["name","supplier_name"]&limit_page_length=1000', { headers: mutationHeaders() }),
                fetch('/api/resource/Payment%20Terms%20Template?fields=["name"]&limit_page_length=100', { headers: mutationHeaders() }),
                fetch('/api/resource/Mode%20of%20Payment?fields=["name"]&limit_page_length=100', { headers: mutationHeaders() }),
                fetch('/api/resource/Account?filters=[["is_group","=",0]]&fields=["name","account_name"]&limit_page_length=1000', { headers: mutationHeaders() }),
                fetch('/api/resource/Purchase%20Invoice?fields=["name"]&order_by=creation%20desc&limit_page_length=1', { headers: mutationHeaders() })
            ]);

            if (suppRes.ok) { const d = await suppRes.json(); setSuppliers(d.data || []); }
            if (ptRes.ok) { const d = await ptRes.json(); setPaymentTermsList(d.data || []); }
            if (mopRes.ok) { const d = await mopRes.json(); setModesOfPayment(d.data || []); }
            if (accRes.ok) { const d = await accRes.json(); setAccounts(d.data || []); }
            if (invRes.ok) {
                const d = await invRes.json();
                if (d.data && d.data.length > 0) {
                    const last = d.data[0].name;
                    const match = last.match(/^(.*?)(\d+)$/);
                    if (match) {
                        const nextNum = String(parseInt(match[2], 10) + 1).padStart(match[2].length, '0');
                        setLatestInvoice(match[1] + nextNum);
                    } else {
                        setLatestInvoice(last + '-1');
                    }
                } else {
                    setLatestInvoice('MAT-PRE-2025-00001');
                }
            }
        } catch (err) {
            console.error("Error fetching dependencies", err);
        }
    };

    const fetchSupplierInvoices = async (supplier: string) => {
        if (!supplier) {
            setSupplierInvoices([]);
            return;
        }
        try {
            const res = await fetch(`/api/resource/Purchase%20Invoice?filters=[["supplier","=","${supplier}"]]&fields=["name","grand_total"]&limit_page_length=100`, { headers: mutationHeaders() });
            if (res.ok) {
                const d = await res.json();
                setSupplierInvoices(d.data || []);
            }
        } catch (err) {
            console.error("Error fetching supplier invoices:", err);
        }
    };

    // Load data on mount
    useEffect(() => {
        fetchPurchaseReceipts();
        fetchDataDependencies();
    }, []);

    const handleDelete = async (receipt: PurchaseReceipt) => {
        if (!window.confirm(`Are you sure you want to cancel receipt ${receipt.name}?`)) return;
        try {
            const res = await fetch(`/api/resource/Purchase%20Receipt/${receipt.name}`, {
                method: 'PUT',
                headers: mutationHeaders(),
                body: JSON.stringify({ docstatus: 2 })
            });
            if (res.ok) {
                fetchPurchaseReceipts();
            } else {
                const err = await res.json();
                console.error(err);
                alert('Failed to cancel receipt');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred');
        }
    };

    const submitPayment = async () => {
        if (!selectedReceipt) return;
        try {
            const payload = {
                payment_type: "Pay",
                party_type: "Supplier",
                party: selectedReceipt.supplier,
                paid_to: paymentForm.paid_to,
                posting_date: paymentForm.posting_date || selectedReceipt.posting_date,
                mode_of_payment: paymentForm.mode_of_payment,
                paid_amount: paymentForm.paid_amount || selectedReceipt.grand_total,
                received_amount: paymentForm.paid_amount || selectedReceipt.grand_total,
                source_exchange_rate: 1, // Fixes Frappe validation error
                target_exchange_rate: 1, // Fixes Frappe validation error
                reference_doctype: "Purchase Receipt", // Make sure to refer correctly
                reference_name: selectedReceipt.name
            };

            const res = await fetch('/api/resource/Payment%20Entry', {
                method: 'POST',
                headers: mutationHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Payment Entry created successfully');
                closeModal();
                fetchPurchaseReceipts();
            } else {
                const err = await res.json();
                alert('Failed to create Payment Entry. Check console.');
                console.error(err);
            }
        } catch (e) {
            console.error(e);
            alert('Error submitting payment');
        }
    };

    const submitBill = async () => {
        try {
            let endpoint = '/api/resource/Purchase%20Invoice';
            let method = 'POST';

            if (modalType === 'EDIT') {
                if (billForm.purchase_invoice_reference) {
                    endpoint = `/api/resource/Purchase%20Invoice/${billForm.purchase_invoice_reference}`;
                } else if (selectedReceipt) {
                    endpoint = `/api/resource/Purchase%20Receipt/${selectedReceipt.name}`;
                }
                method = 'PUT';
            }

            let payload: any = {
                supplier: billForm.supplier || (selectedReceipt ? selectedReceipt.supplier : ''),
                posting_date: billForm.posting_date || (selectedReceipt ? selectedReceipt.posting_date : ''),
                due_date: billForm.due_date || (selectedReceipt ? selectedReceipt.due_date : ''),
                payment_terms_template: billForm.payment_terms_template || (selectedReceipt ? selectedReceipt.payment_terms_template : ''),
                bill_no: billForm.invoice_number, // User defined editable invoice #
                remarks: billForm.notes
            };

            // For new bills mapped from PR
            if (modalType === 'CREATE') {
                if (selectedReceipt) {
                    const mapRes = await fetch('/api/method/erpnext.buying.doctype.purchase_receipt.purchase_receipt.make_purchase_invoice', {
                        method: 'POST',
                        headers: mutationHeaders(),
                        body: JSON.stringify({ source_name: selectedReceipt.name })
                    });

                    if (mapRes.ok) {
                        const mapData = await mapRes.json();
                        const mappedDoc = mapData.message;
                        Object.assign(mappedDoc, payload);
                        mappedDoc.docstatus = 0; // Draft
                        delete mappedDoc.name;
                        payload = mappedDoc;
                    } else {
                        throw new Error('Could not map Purchase Receipt into Invoice automatically.');
                    }
                } else {
                    // Try standalone creation (might need an explicit default item setup or expense account)
                    payload.items = [{
                        item_code: '...', // Fallback that might fail if strict validation is on
                        qty: 1,
                        rate: billForm.subtotal || 0,
                    }];
                }
            }

            const res = await fetch(endpoint, {
                method,
                headers: mutationHeaders(),
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`${modalType === 'CREATE' ? 'Created' : 'Updated'} Bill successfully`);
                closeModal();
                fetchPurchaseReceipts();
            } else {
                const err = await res.json();
                let errMsg = err.exception || 'Unknown Error';
                if (err._server_messages) {
                    try { errMsg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch (e) { }
                }
                alert(`Failed to ${modalType === 'CREATE' ? 'create' : 'update'} bill: ${errMsg}. Check console.`);
                console.error(err);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error submitting bill. ${e.message || e}`);
        }
    };

    const openRecordPayment = (receipt: PurchaseReceipt) => {
        setSelectedReceipt(receipt);
        setPaymentForm({
            paid_to: '',
            posting_date: receipt.posting_date,
            mode_of_payment: '',
            paid_amount: receipt.grand_total,
        });
        setModalType('PAYMENT');
    };

    const openEditBill = (receipt: PurchaseReceipt) => {
        setSelectedReceipt(receipt);
        setBillForm({
            supplier: receipt.supplier,
            posting_date: receipt.posting_date,
            due_date: receipt.due_date,
            payment_terms_template: receipt.payment_terms_template,
            subtotal: receipt.net_total || receipt.grand_total,
            vat: receipt.taxes_and_charges_added || 0,
            notes: '',
            invoice_number: receipt.name,
            purchase_invoice_reference: ''
        });
        if (receipt.supplier) {
            fetchSupplierInvoices(receipt.supplier);
        }
        setModalType('EDIT');
    };

    const openCreateBill = () => {
        setSelectedReceipt(null);
        setBillForm({
            supplier: '',
            posting_date: '',
            due_date: '',
            payment_terms_template: '',
            subtotal: 0,
            vat: 0,
            notes: '',
            invoice_number: latestInvoice
        });
        setModalType('CREATE');
    };

    const closeModal = () => {
        setModalType(null);
        setSelectedReceipt(null);
        setSupplierInvoices([]);
        setPaymentForm({});
        setBillForm({});
    };

    return (
        <>
            {/* Header Actions */}
            <button onClick={openCreateBill}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white font-bold rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity text-sm mb-4">
              <Plus className="h-4 w-4" />New Bill
            </button>

        <div className="overflow-auto px-6 py-5 space-y-5 h-full">

            {/* Error */}
            {error && (
                <div className="p-4 border border-red-100 bg-red-50 rounded-2xl shrink-0">
                    <p className="text-red-700">{error}</p>
                    <button
                        onClick={fetchPurchaseReceipts}
                        className="mt-2 text-sm text-red-600 underline"
                    >
                        Try again
                    </button>
                </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#E4B315]/30 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Payable</p>
                            <p className="text-2xl font-bold">{fmtCurrency(totalPayable)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-500" />
                    </div>
                </div>
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#E4B315]/30 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">To Bill</p>
                            <p className="text-2xl font-extrabold text-[#C69A11]">{toBillCount}</p>
                        </div>
                        <Receipt className="h-8 w-8 text-yellow-500" />
                    </div>
                </div>
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#E4B315]/30 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Partly Billed</p>
                            <p className="text-2xl font-bold text-blue-600">{partlyBilledCount}</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-500" />
                    </div>
                </div>
                <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#E4B315]/30 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Receipts</p>
                            <p className="text-2xl font-bold">{purchaseReceipts.length}</p>
                        </div>
                        <TrendingDown className="h-8 w-8 text-gray-500" />
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4 shrink-0">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search receipts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`${INPUT} pl-10`}
                    />
                </div>
            </div>

            {/* Table wrapper with scroll */}
            <div className="border border-gray-100 rounded-2xl bg-white shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50/80 text-gray-400 sticky top-0 z-10">
                            <tr>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Receipt / Bill #</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Supplier</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Date</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Status</th>
                                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest">Amount</th>
                                <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-widest sticky right-0 bg-gray-50/80">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        Loading purchase receipts...
                                    </td>
                                </tr>
                            ) : filteredReceipts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                        {purchaseReceipts.length === 0 ? 'No purchase receipts found' : 'No receipts match your search'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedReceipts.map((receipt) => (
                                    <tr key={receipt.name} className="hover:bg-[#E4B315]/3 transition-colors">
                                        <td className="px-4 py-3.5 text-sm font-bold text-[#2D2A26]">{receipt.name}</td>
                                        <td className="px-4 py-3.5 text-sm text-gray-500">{receipt.supplier_name || receipt.supplier}</td>
                                        <td className="px-4 py-3.5 text-sm text-gray-500">{receipt.posting_date}</td>
                                        <td className="px-4 py-3.5 text-sm text-gray-500">
                                            <StatusBadge status={receipt.status} />
                                        </td>
                                        <td className="px-4 py-3.5 text-sm font-bold text-[#2D2A26] tabular-nums whitespace-nowrap">{fmtCurrency(receipt.grand_total || 0)}</td>
                                        <td className="px-4 py-3.5 sticky right-0 bg-white">
                                            <div className="flex items-center justify-center gap-4">
                                                <button className="p-1.5 hover:bg-[#E4B315]/10 rounded-lg text-gray-400 hover:text-[#C69A11] transition-colors" title="Verify / Double Check">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </button>

                                                {/* Pop up for Record payment on green check mark click */}
                                                <button
                                                    className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                                                    title="Record Payment / Approve"
                                                    onClick={() => openRecordPayment(receipt)}
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>

                                                <button
                                                    className="p-1.5 hover:bg-[#E4B315]/10 rounded-lg text-gray-400 hover:text-[#C69A11] transition-colors"
                                                    title="Edit Bill"
                                                    onClick={() => openEditBill(receipt)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>

                                                {/* Cancel on delete click */}
                                                <button
                                                    className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                                                    title="Delete/Cancel"
                                                    onClick={() => handleDelete(receipt)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                        totalItems={filteredReceipts.length}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                )}
            </div>

            {/* Modals Overlay */}
            {modalType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    {/* Record Payment Modal */}
                    {modalType === 'PAYMENT' && selectedReceipt && (
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Record Payment</h2>
                                    <p className="text-sm text-gray-500">Payment Entry Document</p>
                                </div>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-5 flex flex-col items-stretch text-left">
                                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                    <div>
                                        <label className={LABEL}>Payment Type</label>
                                        <input type="text" readOnly value="Pay" className={`${INPUT_BASE} bg-gray-50 text-gray-600`} />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Party Type</label>
                                        <input type="text" readOnly value="Supplier" className={`${INPUT_BASE} bg-gray-50 text-gray-600`} />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Party (Supplier)</label>
                                        <input type="text" readOnly value={selectedReceipt.supplier} className={`${INPUT_BASE} bg-gray-50 text-gray-600`} />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Account Paid To</label>
                                        <select
                                            className={INPUT_BASE}
                                            value={paymentForm.paid_to}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, paid_to: e.target.value })}
                                        >
                                            <option value="">Select Account</option>
                                            {accounts.map(acc => (
                                                <option key={acc.name} value={acc.name}>{acc.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={LABEL}>Payment Date</label>
                                            <input
                                                type="date"
                                                className={INPUT_BASE}
                                                value={paymentForm.posting_date}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, posting_date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className={LABEL}>Mode of Payment</label>
                                            <select
                                                className={INPUT_BASE}
                                                value={paymentForm.mode_of_payment}
                                                onChange={(e) => setPaymentForm({ ...paymentForm, mode_of_payment: e.target.value })}
                                            >
                                                <option value="">Select Method</option>
                                                {modesOfPayment.map((mop) => (
                                                    <option key={mop.name} value={mop.name}>{mop.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={LABEL}>Payment Reference</label>
                                        <input type="text" readOnly value={`Against: Purchase Invoice / Purchase Receipt - ${selectedReceipt.name}`} className={`${INPUT_BASE} bg-gray-50`} />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Payment Amount</label>
                                        <input
                                            type="number"
                                            className={INPUT_BASE}
                                            value={paymentForm.paid_amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t">
                                    <button
                                        className="px-4 py-2 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                        onClick={closeModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-6 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white font-bold rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity"
                                        onClick={submitPayment}
                                    >
                                        Submit Payment Entry
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Bill / Create Bill Modal */}
                    {(modalType === 'EDIT' || modalType === 'CREATE') && (
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {modalType === 'CREATE' ? 'Create New Bill' : 'Edit Bill'}
                                </h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="space-y-5 text-left">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>Invoice Number</label>
                                        <input
                                            type="text"
                                            className={`${INPUT_BASE} border-yellow-400 focus:ring-yellow-400`}
                                            value={billForm.invoice_number || ''}
                                            onChange={(e) => setBillForm({ ...billForm, invoice_number: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Supplier</label>
                                        <select
                                            className={INPUT_BASE}
                                            value={billForm.supplier}
                                            onChange={(e) => {
                                                setBillForm({ ...billForm, supplier: e.target.value });
                                                fetchSupplierInvoices(e.target.value);
                                            }}
                                        >
                                            <option value="">Select supplier</option>
                                            {suppliers.map(s => (
                                                <option key={s.name} value={s.name}>{s.supplier_name || s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {modalType === 'EDIT' && (
                                    <div>
                                        <label className={LABEL}>Purchase Invoice (Reference)</label>
                                        <select
                                            className={INPUT_BASE}
                                            value={billForm.purchase_invoice_reference || ''}
                                            onChange={(e) => setBillForm({ ...billForm, purchase_invoice_reference: e.target.value })}
                                        >
                                            <option value="">Select reference...</option>
                                            {supplierInvoices.map(inv => (
                                                <option key={inv.name} value={inv.name}>{inv.name} - {fmtCurrency(inv.grand_total)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>Invoice Date</label>
                                        <input
                                            type="date"
                                            className={INPUT_BASE}
                                            value={billForm.posting_date}
                                            onChange={(e) => setBillForm({ ...billForm, posting_date: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>Due Date</label>
                                        <input
                                            type="date"
                                            className={INPUT_BASE}
                                            value={billForm.due_date}
                                            onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>Subtotal</label>
                                        <input
                                            type="number"
                                            className={INPUT_BASE}
                                            value={billForm.subtotal}
                                            onChange={(e) => setBillForm({ ...billForm, subtotal: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>VAT Amount</label>
                                        <input
                                            type="number"
                                            className={INPUT_BASE}
                                            value={billForm.vat}
                                            onChange={(e) => setBillForm({ ...billForm, vat: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={LABEL}>Payment Terms</label>
                                    <select
                                        className={INPUT_BASE}
                                        value={billForm.payment_terms_template}
                                        onChange={(e) => setBillForm({ ...billForm, payment_terms_template: e.target.value })}
                                    >
                                        <option value="">Select Terms</option>
                                        {paymentTermsList.map(pt => (
                                            <option key={pt.name} value={pt.name}>{pt.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={LABEL}>Notes</label>
                                    <textarea
                                        rows={3}
                                        placeholder={modalType === 'EDIT' ? "Auto-created from Goods Receipt..." : "Additional notes..."}
                                        className={`${INPUT_BASE} h-auto resize-none py-3`}
                                        value={billForm.notes}
                                        onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                                    />
                                </div>

                                {modalType === 'EDIT' && selectedReceipt && (
                                    <div className="border border-gray-200 rounded-lg p-3.5 flex justify-between items-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium text-sm text-gray-700">Receipt Reference</span>
                                            <span className="bg-cyan-400 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
                                                {selectedReceipt.name}
                                            </span>
                                        </div>
                                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                                    <button
                                        className="px-5 py-2.5 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                        onClick={closeModal}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="px-6 py-2.5 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white font-bold rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity"
                                        onClick={submitBill}
                                    >
                                        {modalType === 'CREATE' ? 'Create Bill' : 'Update Bill'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        </>
    );
};

export default AccountsPayable;