import React, { useState, useEffect } from 'react';
import {
  Plus, X, Receipt, DollarSign, Search, TrendingDown,
  AlertCircle, CheckCircle, RefreshCw, Eye,
} from 'lucide-react';
import Pagination from '../components/Pagination';

// ─── Frappe helpers ────────────────────────────────────────────────────────────
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
  `KSh ${(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SalesInvoice {
  name: string;
  customer: string;
  customer_name: string;
  posting_date: string;
  due_date: string;
  grand_total: number;
  outstanding_amount: number;
  status: string;
  docstatus: number;
}

interface InvoiceItem {
  _id: string;
  item_name: string;
  item_code: string;
  uom: string;
  qty: number;
  rate: number;
  income_account: string;
  amount: number;
}

interface NewInvoiceForm {
  customer: string;
  posting_date: string;
  due_date: string;
  payment_terms_template: string;
  remarks: string;
  branch: string;
  items: InvoiceItem[];
}

type ModalType = 'CREATE' | 'PAYMENT' | 'VIEW' | null;

// ─── Shared CSS ────────────────────────────────────────────────────────────────
const INPUT   = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#2D2A26] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors';
const LABEL   = 'block text-xs font-bold uppercase tracking-wider text-[#C69A11] mb-1.5';
const BTN_PRI = 'flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white font-bold rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity text-sm';
const BTN_SEC = 'flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white text-gray-600 font-semibold rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors text-sm shadow-sm';

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg: Record<string, string> = {
    'Unpaid':      'bg-red-100 text-red-700 border-red-200',
    'Partly Paid': 'bg-[#E4B315]/10 text-[#C69A11] border-[#E4B315]/30',
    'Overdue':     'bg-red-200 text-red-800 border-red-300',
    'Paid':        'bg-green-100 text-green-700 border-green-200',
    'Draft':       'bg-gray-100 text-gray-600 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg[status] ?? cfg['Draft']}`}>
      {status}
    </span>
  );
};

const newItem = (): InvoiceItem => ({
  _id: Math.random().toString(36).slice(2),
  item_name: '', item_code: '', uom: 'Nos', qty: 1, rate: 0, income_account: '', amount: 0,
});

const EMPTY_FORM: NewInvoiceForm = {
  customer: '', posting_date: new Date().toISOString().split('T')[0],
  due_date: '', payment_terms_template: '', remarks: '', branch: '', items: [newItem()],
};

// ─── Component ─────────────────────────────────────────────────────────────────
const AccountsReceivable: React.FC = () => {
  const [invoices,      setInvoices]      = useState<SalesInvoice[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [error,         setError]         = useState<string | null>(null);
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null);
  const [submitting,    setSubmitting]    = useState(false);

  const [customers,        setCustomers]        = useState<{ name: string; customer_name: string }[]>([]);
  const [paymentTermsList, setPaymentTermsList] = useState<{ name: string }[]>([]);
  const [modesOfPayment,   setModesOfPayment]   = useState<{ name: string }[]>([]);
  const [bankAccounts,     setBankAccounts]     = useState<{ name: string }[]>([]);
  const [itemMaster,       setItemMaster]       = useState<{ name: string; item_name: string; stock_uom?: string; standard_rate?: number }[]>([]);
  const [incomeAccounts,   setIncomeAccounts]   = useState<{ name: string }[]>([]);
  const [branches,         setBranches]         = useState<{ name: string; branch?: string }[]>([]);

  const [currentPage,  setCurrentPage]  = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [modalType,       setModalType]       = useState<ModalType>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [invoiceForm,     setInvoiceForm]     = useState<NewInvoiceForm>({ ...EMPTY_FORM, items: [newItem()] });
  const [paymentForm,     setPaymentForm]     = useState<any>({});

  // ── Fetch All Submitted Sales Invoices ────────
  const fetchInvoices = async () => {
    setLoading(true); setError(null);
    try {
      const fields = JSON.stringify(['name','customer','customer_name','posting_date','due_date',
                                     'grand_total','outstanding_amount','status','docstatus']);
      const filters = JSON.stringify([['docstatus','=',1]]);
      const params = new URLSearchParams({ fields, filters, limit_page_length:'500', order_by:'posting_date desc' });
      const res = await fetch(`/api/resource/Sales%20Invoice?${params}`, { headers: mutationHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInvoices(data.data || []);
    } catch (e: any) {
      setError('Failed to fetch invoices. ' + (e?.message || ''));
      setInvoices([]);
    } finally { setLoading(false); }
  };

  const fetchDeps = async () => {
    try {
      const [custRes, ptRes, mopRes, bankRes, itemRes, incRes, branchRes] = await Promise.all([
        fetch('/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=1000', { headers: mutationHeaders() }),
        fetch('/api/resource/Payment%20Terms%20Template?fields=["name"]&limit_page_length=100', { headers: mutationHeaders() }),
        fetch('/api/resource/Mode%20of%20Payment?fields=["name"]&limit_page_length=100', { headers: mutationHeaders() }),
        fetch('/api/resource/Account?filters=[["account_type","in",["Bank","Cash"]],["is_group","=",0]]&fields=["name"]&limit_page_length=200', { headers: mutationHeaders() }),
        fetch('/api/resource/Item?fields=["name","item_name","stock_uom","standard_rate"]&limit_page_length=500&order_by=item_name%20asc', { headers: mutationHeaders() }),
        fetch('/api/resource/Account?filters=[["root_type","=","Income"],["is_group","=",0]]&fields=["name"]&limit_page_length=300&order_by=name%20asc', { headers: mutationHeaders() }),
        fetch('/api/method/frappe.client.get_list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...mutationHeaders() },
          body: JSON.stringify({
            doctype: 'Branch',
            fields: ['name'],
            limit_page_length: 200
          })
        }),
      ]);
      if (custRes.ok) setCustomers((await custRes.json()).data || []);
      if (ptRes.ok)   setPaymentTermsList((await ptRes.json()).data || []);
      if (mopRes.ok)  setModesOfPayment((await mopRes.json()).data || []);
      if (bankRes.ok) setBankAccounts((await bankRes.json()).data || []);
      if (itemRes.ok) setItemMaster((await itemRes.json()).data || []);
      if (incRes.ok)  setIncomeAccounts((await incRes.json()).data || []);
      if (branchRes.ok) {
        const branchData = await branchRes.json();
        setBranches(branchData.message || []);
      }
    } catch (e) { console.error('fetchDeps', e); }
  };

  useEffect(() => { fetchInvoices(); fetchDeps(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, itemsPerPage]);

  const totalReceivable = invoices.reduce((s, i) => s + (i.outstanding_amount || 0), 0);
  const totalOverdue    = invoices.filter(i => i.status === 'Overdue').reduce((s, i) => s + (i.outstanding_amount || 0), 0);

  const filtered   = invoices.filter(inv => {
    const q = searchQuery.toLowerCase();
    return (!q || inv.name.toLowerCase().includes(q) || (inv.customer_name || '').toLowerCase().includes(q))
        && (!statusFilter || inv.status === statusFilter);
  });
  const paginated  = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  // ── Item helpers ───────────────────────────────────────────────────────────
  const updateItemRow = (id: string, patch: Partial<InvoiceItem>) =>
    setInvoiceForm(f => ({
      ...f,
      items: f.items.map(it => {
        if (it._id !== id) return it;
        const m = { ...it, ...patch };
        m.amount = parseFloat(((m.qty || 0) * (m.rate || 0)).toFixed(2));
        return m;
      }),
    }));

  const handleItemPick = (id: string, itemName: string) => {
    const found = itemMaster.find(i => i.name === itemName);
    updateItemRow(id, { item_name: found?.item_name || itemName, uom: found?.stock_uom || 'Nos', rate: found?.standard_rate ?? 0 });
  };

  const grandTotal = invoiceForm.items.reduce((s, i) => s + (i.amount || 0), 0);

  // ── Modal openers ──────────────────────────────────────────────────────────
  const openCreate  = () => { setInvoiceForm({ ...EMPTY_FORM, posting_date: new Date().toISOString().split('T')[0], items: [newItem()] }); setModalType('CREATE'); };
  const openView    = (inv: SalesInvoice) => { setSelectedInvoice(inv); setModalType('VIEW'); };
  const openPayment = (inv: SalesInvoice) => {
    setSelectedInvoice(inv);
    setPaymentForm({ posting_date: new Date().toISOString().split('T')[0], mode_of_payment: '', paid_to: '', paid_amount: inv.outstanding_amount });
    setModalType('PAYMENT');
  };
  const closeModal  = () => { setModalType(null); setSelectedInvoice(null); setPaymentForm({}); setInvoiceForm({ ...EMPTY_FORM, items: [newItem()] }); };
  const toast       = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 5000); };

  // ── Submit new Sales Invoice ───────────────────────────────────────────────
  const submitInvoice = async () => {
    if (!invoiceForm.customer) { alert('Please select a customer.'); return; }
    if (!invoiceForm.branch) { alert('Please select a branch.'); return; }
    const validItems = invoiceForm.items.filter(it => it.item_name.trim());
    if (!validItems.length) { alert('Please add at least one item.'); return; }
    setSubmitting(true);
    try {
      const payload: Record<string,any> = {
        doctype: 'Sales Invoice',
        customer: invoiceForm.customer,
        posting_date: invoiceForm.posting_date,
        docstatus:1,
        due_date: invoiceForm.due_date || undefined,
        payment_terms_template: invoiceForm.payment_terms_template || undefined,
        remarks: invoiceForm.remarks || undefined,
        branch: invoiceForm.branch,  // Selected branch for accounting dimension validation
        items: validItems.map(it => ({
          item_name: it.item_name,
          uom: it.uom || 'Nos',
          qty: it.qty || 1,
          rate: it.rate || 0,
          income_account: it.income_account || undefined,
          amount: it.amount,
          // eTims mandatory fields
          custom_taxation_type_code: 'A', // Default taxation type
          custom_item_code_etims: it.item_code || 'DEFAULT', // Default item code if not provided
          custom_unit_of_quantity_code: 'NOS', // Default unit code
          custom_packaging_unit_code: 'NOS', // Default packaging code
        })),
      };
      const res = await fetch('/api/resource/Sales%20Invoice', { method:'POST', headers:mutationHeaders(), body:JSON.stringify(payload) });
      if (res.ok) {
        const d = await res.json();
        toast(`Invoice ${d.data?.name || ''} created successfully!`);
        closeModal(); fetchInvoices();
      } else {
        const err = await res.json().catch(()=>({}));
        let msg = err.exception || err.message || 'Failed to create invoice';
        if (err._server_messages) { try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch {} }
        alert('Error: ' + msg);
      }
    } catch (e: any) { alert('Error: ' + (e.message || e)); }
    finally { setSubmitting(false); }
  };

  // ── Submit Payment Entry ───────────────────────────────────────────────────
  const submitPayment = async () => {
    if (!selectedInvoice) return;
    if (!paymentForm.paid_to) { alert('Please select Account Paid To.'); return; }
    if (!paymentForm.paid_amount || Number(paymentForm.paid_amount) <= 0) { alert('Enter a valid amount.'); return; }
    setSubmitting(true);
    try {
      const amount = Number(paymentForm.paid_amount);
      const payload: Record<string,any> = {
        payment_type: 'Receive', party_type: 'Customer', party: selectedInvoice.customer,
        paid_to: paymentForm.paid_to,
        posting_date: paymentForm.posting_date,
        mode_of_payment: paymentForm.mode_of_payment || undefined,
        paid_amount: amount, received_amount: amount,
        docstatus:1,
        source_exchange_rate: 1, target_exchange_rate: 1,
        reference_no: selectedInvoice.name,  // Use invoice number as reference
        reference_date: paymentForm.posting_date,  // Use posting date as reference date
        references: [{ reference_doctype:'Sales Invoice', reference_name:selectedInvoice.name, allocated_amount:amount }],
      };
      const res = await fetch('/api/resource/Payment%20Entry', { method:'POST', headers:mutationHeaders(), body:JSON.stringify(payload) });
      if (res.ok) {
        toast(`Payment recorded for ${selectedInvoice.name}`);
        closeModal(); fetchInvoices();
      } else {
        const err = await res.json().catch(()=>({}));
        let msg = err.exception || err.message || 'Failed to create Payment Entry';
        if (err._server_messages) { try { msg = JSON.parse(JSON.parse(err._server_messages)[0]).message; } catch {} }
        alert('Error: ' + msg);
      }
    } catch (e: any) { alert('Error: ' + (e.message || e)); }
    finally { setSubmitting(false); }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header Actions */}
      <div className="flex gap-2 mb-4">
        <button onClick={fetchInvoices} className={BTN_SEC}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-[#E4B315]' : ''}`} /> Refresh
        </button>
        <button onClick={openCreate} className={BTN_PRI}>
          <Plus className="h-4 w-4" /> New Invoice
        </button>
      </div>

      <div className="overflow-auto px-6 py-5 space-y-5 h-full">

        {/* Banners */}
        {successMsg && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl text-sm text-green-700 shrink-0">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />{successMsg}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={fetchInvoices} className="ml-auto text-xs underline font-semibold">Retry</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 shrink-0">
          <div className="relative bg-gradient-to-br from-[#E4B315] to-[#C69A11] rounded-2xl p-5 shadow-md shadow-[#E4B315]/20 overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />
            <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-2">Total Receivable</p>
            <p className="text-2xl font-extrabold text-white">{fmtCurrency(totalReceivable)}</p>
            <DollarSign className="absolute bottom-4 right-4 h-8 w-8 text-white/20" />
          </div>
          <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Overdue Amount</p>
            <p className="text-2xl font-extrabold text-red-600">{fmtCurrency(totalOverdue)}</p>
            <TrendingDown className="mt-1 h-5 w-5 text-red-400" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Outstanding Invoices</p>
            <p className="text-2xl font-extrabold text-[#2D2A26]">{invoices.length}</p>
            <Receipt className="mt-1 h-5 w-5 text-[#C69A11]" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 shrink-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Search invoice # or customer…"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className={INPUT + ' pl-9'} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={INPUT + ' w-44'}>
            <option value="">All Status</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Partly Paid">Partly Paid</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="px-5 py-3.5 border-b border-gray-50 shrink-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">
              Invoices ({filtered.length}{filtered.length !== invoices.length ? ` of ${invoices.length}` : ''})
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20" />
                <div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" />
              </div>
              <p className="text-sm text-gray-400 font-medium">Loading invoices…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#E4B315]/10 flex items-center justify-center mb-4">
                <Receipt className="w-6 h-6 text-[#C69A11]" />
              </div>
              <p className="text-sm font-bold text-[#2D2A26] mb-1">No invoices found</p>
              <p className="text-xs text-gray-400">
                {statusFilter ? 'Try clearing the status filter' : 'No submitted sales invoices found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    {['Invoice #','Customer','Date','Due Date','Total','Outstanding','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(inv => (
                    <tr key={inv.name} className="hover:bg-[#E4B315]/3 transition-colors">
                      <td className="px-4 py-3.5">
                        <button onClick={() => openView(inv)} className="text-sm font-bold text-[#C69A11] hover:underline">{inv.name}</button>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[#2D2A26] font-medium">{inv.customer_name || inv.customer}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmtDate(inv.posting_date)}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">{fmtDate(inv.due_date)}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-[#2D2A26] tabular-nums whitespace-nowrap">{fmtCurrency(inv.grand_total)}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-red-600 tabular-nums whitespace-nowrap">{fmtCurrency(inv.outstanding_amount)}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openView(inv)} className="p-1.5 hover:bg-[#E4B315]/10 rounded-lg transition-colors text-gray-400 hover:text-[#C69A11]" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => openPayment(inv)} className="p-1.5 hover:bg-green-50 rounded-lg transition-colors text-gray-400 hover:text-green-600" title="Record Payment"><DollarSign className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-gray-50 shrink-0">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filtered.length} onItemsPerPageChange={setItemsPerPage} />
            </div>
          )}
        </div>
      </div>

      {/* ══ CREATE INVOICE MODAL ══ */}
      {modalType === 'CREATE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-extrabold text-[#2D2A26]">New Sales Invoice</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Customer + dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Customer *</label>
                  <select className={INPUT} value={invoiceForm.customer}
                    onChange={e => setInvoiceForm(f => ({ ...f, customer: e.target.value }))}>
                    <option value="">Select customer…</option>
                    {customers.map(c => <option key={c.name} value={c.name}>{c.customer_name || c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL}>Invoice Date</label>
                  <input type="date" className={INPUT} value={invoiceForm.posting_date}
                    onChange={e => setInvoiceForm(f => ({ ...f, posting_date: e.target.value }))} />
                </div>
                <div>
                  <label className={LABEL}>Due Date</label>
                  <input type="date" className={INPUT} value={invoiceForm.due_date}
                    onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={LABEL}>Payment Terms</label>
                <select className={INPUT} value={invoiceForm.payment_terms_template}
                  onChange={e => setInvoiceForm(f => ({ ...f, payment_terms_template: e.target.value }))}>
                  <option value="">Select terms (optional)…</option>
                  {paymentTermsList.map(pt => <option key={pt.name} value={pt.name}>{pt.name}</option>)}
                </select>
              </div>

              <div>
                <label className={LABEL}>Branch *</label>
                <select className={INPUT} value={invoiceForm.branch}
                  onChange={e => setInvoiceForm(f => ({ ...f, branch: e.target.value }))}>
                  <option value="">Select branch...</option>
                  {branches.map(b => <option key={b.name} value={b.name}>{b.branch || b.name}</option>)}
                </select>
              </div>

              {/* Items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={LABEL + ' mb-0'}>Invoice Items *</label>
                  <button onClick={() => setInvoiceForm(f => ({ ...f, items: [...f.items, newItem()] }))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E4B315]/10 text-[#C69A11] text-xs font-bold hover:bg-[#E4B315]/20 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add Row
                  </button>
                </div>

                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  {/* Column headers */}
                  <div className="grid grid-cols-[2fr_80px_80px_110px_2fr_110px_34px] bg-gray-50 border-b border-gray-100">
                    {['Item Name','UOM','Qty','Rate','Income Account','Amount',''].map(h => (
                      <div key={h} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
                    ))}
                  </div>

                  {/* Rows */}
                  <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                    {invoiceForm.items.map(it => (
                      <div key={it._id} className="grid grid-cols-[2fr_80px_80px_110px_2fr_110px_34px] items-center hover:bg-[#E4B315]/3 transition-colors">
                        {/* Item Name */}
                        <div className="p-2">
                          <select className={INPUT + ' text-xs py-1.5'} value={it.item_name}
                            onChange={e => handleItemPick(it._id, e.target.value)}>
                            <option value="">Select item…</option>
                            {itemMaster.map(i => <option key={i.name} value={i.name}>{i.item_name || i.name}</option>)}
                          </select>
                        </div>
                        {/* UOM */}
                        <div className="p-2">
                          <input className={INPUT + ' text-xs py-1.5 text-center'} value={it.uom}
                            onChange={e => updateItemRow(it._id, { uom: e.target.value })} placeholder="Nos" />
                        </div>
                        {/* Qty */}
                        <div className="p-2">
                          <input type="number" min="0.001" step="any"
                            className={INPUT + ' text-xs py-1.5 text-center'} value={it.qty}
                            onChange={e => updateItemRow(it._id, { qty: parseFloat(e.target.value) || 0 })} />
                        </div>
                        {/* Rate */}
                        <div className="p-2">
                          <input type="number" min="0" step="any"
                            className={INPUT + ' text-xs py-1.5'} value={it.rate}
                            onChange={e => updateItemRow(it._id, { rate: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00" />
                        </div>
                        {/* Income Account */}
                        <div className="p-2">
                          <select className={INPUT + ' text-xs py-1.5'} value={it.income_account}
                            onChange={e => updateItemRow(it._id, { income_account: e.target.value })}>
                            <option value="">Select account…</option>
                            {incomeAccounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                          </select>
                        </div>
                        {/* Amount (computed) */}
                        <div className="px-3 py-2 text-sm font-bold text-[#2D2A26] tabular-nums">{fmtCurrency(it.amount)}</div>
                        {/* Remove */}
                        <div className="flex items-center justify-center p-1">
                          <button onClick={() => { if (invoiceForm.items.length > 1) setInvoiceForm(f => ({ ...f, items: f.items.filter(i => i._id !== it._id) })); }}
                            disabled={invoiceForm.items.length <= 1}
                            className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors rounded-lg">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grand total footer */}
                  <div className="grid grid-cols-[2fr_80px_80px_110px_2fr_110px_34px] border-t border-gray-100 bg-[#E4B315]/6">
                    <div className="px-3 py-2.5 col-span-5 text-xs font-bold text-gray-500 text-right">Grand Total</div>
                    <div className="px-3 py-2.5 text-sm font-extrabold text-[#C69A11] tabular-nums">{fmtCurrency(grandTotal)}</div>
                    <div />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={LABEL}>Remarks</label>
                <textarea className={INPUT + ' min-h-[72px] resize-none'} rows={3}
                  value={invoiceForm.remarks}
                  onChange={e => setInvoiceForm(f => ({ ...f, remarks: e.target.value }))}
                  placeholder="Add any notes or comments…" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50 shrink-0">
              <button onClick={closeModal} className={BTN_SEC}>Cancel</button>
              <button onClick={submitInvoice} disabled={submitting} className={BTN_PRI + ' disabled:opacity-50'}>
                {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW MODAL ══ */}
      {modalType === 'VIEW' && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-extrabold text-[#2D2A26]">{selectedInvoice.name}</h2>
                <StatusBadge status={selectedInvoice.status} />
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-0.5">
              {([['Customer', selectedInvoice.customer_name||selectedInvoice.customer],['Invoice Date',fmtDate(selectedInvoice.posting_date)],['Due Date',fmtDate(selectedInvoice.due_date)],['Grand Total',fmtCurrency(selectedInvoice.grand_total)],['Outstanding',fmtCurrency(selectedInvoice.outstanding_amount)]] as [string,string][]).map(([label,value])=>(
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
                  <span className={`text-sm font-semibold ${label==='Outstanding'?'text-red-600':'text-[#2D2A26]'}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className={BTN_SEC}>Close</button>
              <button onClick={() => { closeModal(); openPayment(selectedInvoice); }} className={BTN_PRI}>
                <DollarSign className="h-4 w-4" /> Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYMENT MODAL ══ */}
      {modalType === 'PAYMENT' && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-extrabold text-[#2D2A26]">Record Payment</h2>
                <p className="text-xs text-gray-400 mt-0.5">Against {selectedInvoice.name}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Info strip */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[#E4B315]/6 border border-[#E4B315]/20 rounded-2xl">
                <div><p className="text-xs text-gray-400 mb-0.5">Customer</p><p className="text-sm font-semibold text-[#2D2A26]">{selectedInvoice.customer_name}</p></div>
                <div><p className="text-xs text-gray-400 mb-0.5">Outstanding</p><p className="text-sm font-bold text-red-600">{fmtCurrency(selectedInvoice.outstanding_amount)}</p></div>
              </div>
              {/* Read-only */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className={LABEL}>Payment Type</label><input readOnly value="Receive" className={INPUT + ' bg-gray-50 text-gray-500 cursor-default'} /></div>
                <div><label className={LABEL}>Party Type</label><input readOnly value="Customer" className={INPUT + ' bg-gray-50 text-gray-500 cursor-default'} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Payment Date</label>
                  <input type="date" className={INPUT} value={paymentForm.posting_date}
                    onChange={e => setPaymentForm({ ...paymentForm, posting_date: e.target.value })} />
                </div>
                <div>
                  <label className={LABEL}>Mode of Payment</label>
                  <select className={INPUT} value={paymentForm.mode_of_payment}
                    onChange={e => setPaymentForm({ ...paymentForm, mode_of_payment: e.target.value })}>
                    <option value="">Select…</option>
                    {modesOfPayment.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={LABEL}>Account Paid To *</label>
                <select className={INPUT} value={paymentForm.paid_to}
                  onChange={e => setPaymentForm({ ...paymentForm, paid_to: e.target.value })}>
                  <option value="">Select bank / cash account…</option>
                  {bankAccounts.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Payment Amount *</label>
                <input type="number" min="0.01" step="any" className={INPUT} value={paymentForm.paid_amount}
                  onChange={e => setPaymentForm({ ...paymentForm, paid_amount: e.target.value })} />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeModal} className={BTN_SEC}>Cancel</button>
              <button onClick={submitPayment} disabled={submitting} className={BTN_PRI + ' disabled:opacity-50'}>
                {submitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                Submit Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AccountsReceivable;