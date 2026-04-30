import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Package, X, AlertCircle, CheckCircle, BarChart2, Clock,
  TrendingUp, Filter, Monitor, Factory,
} from 'lucide-react';
import PageLayout from '../components/PageLayout';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface BOM { name: string; item_name: string; item: string; description?: string; quantity: number; uom: string; total_cost?: number; items: BOMItem[]; is_active?: boolean; docstatus?: number; }
interface BOMItem { name?: string; item_code: string; item_name: string; description?: string; qty: number; uom: string; rate?: number; amount?: number; }
interface StockInfo { item_code: string; item_name: string; available_qty: number; uom: string; valuation_rate?: number; }
interface ProductionOrderItem { bom_item: BOMItem; required_qty: number; available_qty: number; cost: number; status: 'sufficient' | 'insufficient'; }
interface ProductionOrder { name: string; item_name: string; category?: string; planned_qty: number; actual_qty?: number; status: string; department?: string; date: string; cost?: number; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(n || 0);
const formatQty = (n: number, uom: string) => `${new Intl.NumberFormat('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)} ${uom}`;

// ── Shared input styles ───────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#2D2A26] outline-none bg-white focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors appearance-none";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-[#C69A11] mb-1.5";

// ── Status badge helper ───────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const cls = status === 'Completed'
    ? 'bg-green-100 text-green-700'
    : status === 'In Process' || status === 'In Progress'
      ? 'bg-[#E4B315]/10 text-[#C69A11]'
      : 'bg-gray-100 text-gray-600';
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{status}</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub: string; icon: any; accent?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl p-5 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg ${accent ? 'bg-gradient-to-br from-[#E4B315] to-[#C69A11] shadow-md shadow-[#E4B315]/20' : 'bg-white border border-gray-100 shadow-sm'
      }`}>
      {accent && <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-6 translate-x-6" />}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider ${accent ? 'text-white/80' : 'text-gray-400'}`}>{label}</span>
        <span className={`p-2 rounded-xl ${accent ? 'bg-white/20 text-white' : 'bg-[#E4B315]/10 text-[#C69A11]'}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className={`text-3xl font-extrabold mb-1 tracking-tight ${accent ? 'text-white' : 'text-[#2D2A26]'}`}>{value}</div>
      <div className={`text-xs font-medium ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</div>
    </div>
  );
}

// ── Manufacturing Component ───────────────────────────────────────────────────
const Manufacturing: React.FC = () => {
  const navigate = useNavigate();
  const [boms, setBoms] = useState<BOM[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const [showModal, setShowModal] = useState(false);
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [productionQty, setProductionQty] = useState<number | ''>('');
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('Main Store (default)');
  const [batchNumber, setBatchNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [stockInfo, setStockInfo] = useState<StockInfo[]>([]);
  const [productionItems, setProductionItems] = useState<ProductionOrderItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // ── Fetch BOMs ────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBOMs = async () => {
      try {
        setLoading(true);
        let allBOMs: BOM[] = []; let start = 0; let hasMore = true;
        while (hasMore) {
          const res = await fetch(`/api/resource/BOM?fields=["*"]&limit_start=${start}&limit_page_length=100&filters=[["is_active","=",1],["docstatus","=",1]]`);
          const data = await res.json();
          if (data.data?.length > 0) { allBOMs = [...allBOMs, ...data.data]; start += data.data.length; hasMore = data.data.length === 100; }
          else hasMore = false;
        }
        const fullBOMs = await Promise.all(allBOMs.map(async bom => {
          try { const res = await fetch(`/api/resource/BOM/${encodeURIComponent(bom.name)}`); const data = await res.json(); return data.data || bom; } catch { return bom; }
        }));
        setBoms(fullBOMs);
      } catch (err: any) { setError('Failed to fetch BOMs: ' + err.message); }
      finally { setLoading(false); }
    };
    fetchBOMs();
  }, []);

  // ── Fetch production orders ───────────────────────────────────────────
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`/api/resource/Work Order?fields=["*"]&limit_page_length=50&order_by=creation desc`);
        const data = await res.json();
        if (data.data) setProductionOrders(data.data.map((o: any) => ({ name: o.name, item_name: o.production_item_name || o.production_item, planned_qty: o.qty, actual_qty: o.produced_qty, status: o.status, date: o.planned_start_date || o.creation?.split(' ')[0], cost: o.total_operating_cost })));
      } catch { /* silently fail */ }
    };
    fetchOrders();
  }, []);

  // ── Fetch stock for BOM ───────────────────────────────────────────────
  const fetchStockForBOM = async (bom: BOM) => {
    if (!bom.items?.length) return;
    setStockLoading(true);
    try {
      const itemCodes = bom.items.map(i => `"${i.item_code}"`).join(',');
      const res = await fetch(`/api/resource/Bin?fields=["item_code","actual_qty","stock_uom","valuation_rate"]&filters=[["item_code","in",[${itemCodes}]]]&limit_page_length=200`);
      const data = await res.json();
      const stockMap: { [k: string]: StockInfo } = {};
      (data.data || []).forEach((bin: any) => {
        const k = bin.item_code;
        if (!stockMap[k] || bin.actual_qty > stockMap[k].available_qty)
          stockMap[k] = { item_code: bin.item_code, item_name: bin.item_code, available_qty: bin.actual_qty || 0, uom: bin.stock_uom, valuation_rate: bin.valuation_rate || 0 };
      });
      setStockInfo(Object.values(stockMap));
    } catch (err) { console.error('Failed to fetch stock:', err); }
    finally { setStockLoading(false); }
  };

  // ── Recalculate production items ──────────────────────────────────────
  useEffect(() => {
    if (!selectedBOM || stockInfo.length === 0) { setProductionItems([]); return; }
    const qty = Number(productionQty) || 1;
    setProductionItems((selectedBOM.items || []).map(bomItem => {
      const stock = stockInfo.find(s => s.item_code === bomItem.item_code);
      const requiredQty = (bomItem.qty || 0) * qty; const availableQty = stock?.available_qty || 0;
      const rate = stock?.valuation_rate || bomItem.rate || 0;
      return { bom_item: bomItem, required_qty: requiredQty, available_qty: availableQty, cost: rate * requiredQty, status: availableQty >= requiredQty ? 'sufficient' : 'insufficient' };
    }));
  }, [selectedBOM, stockInfo, productionQty]);

  const handleBOMSelect = async (bomName: string) => {
    if (!bomName) { setSelectedBOM(null); setProductionItems([]); setStockInfo([]); return; }
    const bom = boms.find(b => b.name === bomName);
    if (!bom) return;
    if (bom.docstatus !== 1) { alert(`BOM ${bom.name} is not submitted.`); setSelectedBOM(null); setProductionItems([]); setStockInfo([]); return; }
    setSelectedBOM(bom); setStockInfo([]); setProductionItems([]); await fetchStockForBOM(bom);
  };

  const openModal = () => {
    setSelectedBOM(null); setProductionQty(''); setProductionDate(new Date().toISOString().split('T')[0]);
    setDepartment('Main Store (default)'); setBatchNumber(''); setNotes(''); setStockInfo([]); setProductionItems([]); setShowModal(true);
  };

  const createProductionOrder = async () => {
    if (!selectedBOM || creatingOrder) return;
    if (selectedBOM.docstatus !== 1) { alert(`BOM ${selectedBOM.name} is not submitted.`); return; }
    const qty = Number(productionQty) || 1;
    if (productionItems.some(i => i.status === 'insufficient')) { alert('Cannot create: Some ingredients have insufficient stock.'); return; }
    setCreatingOrder(true);
    try {
      const woPayload = { production_item: selectedBOM.item, bom_no: selectedBOM.name, qty, planned_start_date: productionDate, fg_warehouse: 'Finished Goods - QR', wip_warehouse: 'Work In Progress - QR', status: 'In Process', docstatus: 1 };
      const woRes = await fetch('/api/resource/Work Order', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' }, body: JSON.stringify(woPayload) });
      const woData = await woRes.json();
      if (!woRes.ok) throw new Error(woData?.exception || woData?.message || 'Failed to create Work Order');
      const sePayload = { purpose: 'Material Consumption for Manufacture', stock_entry_type: 'Manufacture', work_order: woData.data.name, from_warehouse: 'Stores - QR', to_warehouse: 'Work In Progress - QR', fg_completed_qty: qty, items: [...productionItems.map(item => ({ item_code: item.bom_item.item_code, qty: item.required_qty, uom: item.bom_item.uom, basic_rate: item.bom_item.rate || 0, s_warehouse: 'Stores - QR', t_warehouse: 'Work In Progress - QR' })), { item_code: selectedBOM.item, item_name: selectedBOM.item_name, qty, uom: selectedBOM.uom, basic_rate: 0, s_warehouse: 'Work In Progress - QR', t_warehouse: 'Finished Goods - QR', is_finished_item: 1 }], docstatus: 1 };
      const seRes = await fetch('/api/resource/Stock Entry', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' }, body: JSON.stringify(sePayload) });
      const seData = await seRes.json();
      if (!seRes.ok) throw new Error(seData?.exception || seData?.message || 'Failed to create Stock Entry');
      alert(`Production Order ${woData.data.name} created successfully!`);
      setShowModal(false);
      setProductionOrders(prev => [{ name: woData.data.name, item_name: selectedBOM.item_name, planned_qty: qty, status: 'In Process', date: productionDate, cost: productionItems.reduce((s, i) => s + i.cost, 0) }, ...prev]);
    } catch (err: any) { alert('Error: ' + err.message); }
    finally { setCreatingOrder(false); }
  };

  const totalCost = productionItems.reduce((s, i) => s + i.cost, 0);
  const hasInsufficient = productionItems.some(i => i.status === 'insufficient');
  const canCreate = selectedBOM && Number(productionQty) >= 1 && !hasInsufficient && !stockLoading;
  const todayOrders = productionOrders.filter(o => o.date === new Date().toISOString().split('T')[0]).length;
  const inProgress = productionOrders.filter(o => ['In Process', 'In Progress'].includes(o.status)).length;
  const completedWeek = productionOrders.filter(o => { const w = new Date(); w.setDate(w.getDate() - 7); return o.status === 'Completed' && new Date(o.date) >= w; }).length;

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#E4B315]/10 flex items-center justify-center mx-auto mb-4"><Package size={24} className="text-[#C69A11]" /></div>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl px-5 py-2.5 font-bold text-sm shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">Try Again</button>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Manufacturing & Production"
      subtitle="Manage batch production, prep work, and production orders"
      actions={
        <button onClick={openModal}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">
          <Plus size={15} /> New Production Order
        </button>
      }
    >
      <div className="flex flex-col h-full overflow-hidden bg-gray-50/80">

        <div className="px-6 py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard accent label="Today's Orders" value={todayOrders} sub="Production orders for today" icon={BarChart2} />
            <StatCard label="In Progress" value={inProgress} sub="Currently being produced" icon={Clock} />
            <StatCard label="Completed This Week" value={completedWeek} sub="Last 7 days" icon={CheckCircle} />
            <StatCard label="Production Efficiency" value="100%" sub="Actual vs planned output" icon={TrendingUp} />
          </div>

          {/* Production Orders Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Production Orders</p>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-500 cursor-pointer hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors bg-white">
                <Filter size={12} /> All Categories
              </div>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] px-5 py-2.5 border-b border-gray-50">
              {['Production #', 'Recipe/Item', 'Category', 'Planned Qty', 'Actual Qty', 'Status', 'Department', 'Date', 'Cost'].map(h => (
                <div key={h} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {productionOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#E4B315]/10 flex items-center justify-center mb-4"><Factory size={24} className="text-[#C69A11]" /></div>
                <p className="text-sm font-bold text-[#2D2A26] mb-1">No Production Orders</p>
                <p className="text-xs text-gray-400">Create your first production order to get started.</p>
              </div>
            ) : (
              productionOrders.map(order => (
                <div key={order.name} className="grid grid-cols-[1.2fr_1.5fr_1fr_1fr_1fr_1fr_1fr_1fr_80px] px-5 py-3.5 border-b border-gray-50 items-center hover:bg-[#E4B315]/3 transition-colors">
                  <div className="text-sm font-bold text-[#2D2A26]">{order.name}</div>
                  <div className="text-sm text-gray-600">{order.item_name}</div>
                  <div className="text-sm text-gray-400">{order.category || '—'}</div>
                  <div className="text-sm font-semibold text-[#2D2A26]">{order.planned_qty}</div>
                  <div className="text-sm text-gray-500">{order.actual_qty ?? '—'}</div>
                  <div><StatusPill status={order.status} /></div>
                  <div className="text-sm text-gray-400">{order.department || '—'}</div>
                  <div className="text-sm text-gray-400">{order.date}</div>
                  <div className="text-sm font-semibold text-[#2D2A26]">{order.cost ? formatCurrency(order.cost) : '—'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── New Production Order Modal ──────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">

              {/* Modal header */}
              <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
                <h2 className="text-base font-extrabold text-[#2D2A26]">New Production Order</h2>
                <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X size={18} /></button>
              </div>

              <div className="p-6 space-y-5">
                {/* BOM Select */}
                <div>
                  <label className={labelCls}>Recipe / Item to Produce</label>
                  <div className="relative">
                    <select
                      className={inputCls + ' pr-8'}
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C69A11' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', borderColor: selectedBOM ? '#E4B315' : '#e5e7eb' }}
                      value={selectedBOM?.name || ''}
                      onChange={e => handleBOMSelect(e.target.value)}
                    >
                      <option value="">Select recipe</option>
                      {boms.map(bom => <option key={bom.name} value={bom.name}>{bom.item_name}{bom.docstatus === 1 ? '' : ' (Draft)'}</option>)}
                    </select>
                  </div>
                </div>

                {/* Qty + Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Quantity to Produce</label>
                    <input className={inputCls} type="number" min="1" placeholder="1" value={productionQty}
                      onChange={e => setProductionQty(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div>
                    <label className={labelCls}>Production Date</label>
                    <input className={inputCls} type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} />
                  </div>
                </div>

                {/* Department + Batch */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Department (Optional)</label>
                    <div className="relative">
                      <select className={inputCls + ' pr-8'}
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                        value={department} onChange={e => setDepartment(e.target.value)}>
                        <option>Main Store (default)</option>
                        <option>Kitchen</option>
                        <option>Bakery</option>
                        <option>Cold Storage</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Batch Number (Optional)</label>
                    <input className={inputCls} type="text" placeholder="e.g. BATCH-001" value={batchNumber} onChange={e => setBatchNumber(e.target.value)} />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelCls}>Notes</label>
                  <textarea className={inputCls} style={{ minHeight: 72, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
                </div>

                {/* Ingredients table */}
                {selectedBOM && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#C69A11] mb-3">Required Ingredients</p>
                    {stockLoading ? (
                      <div className="flex items-center gap-2 justify-center py-6 text-sm text-gray-400">
                        <div className="w-4 h-4 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" />
                        Loading stock information…
                      </div>
                    ) : (
                      <>
                        {hasInsufficient && (
                          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-3">
                            <AlertCircle size={15} /> Some ingredients have insufficient stock.
                          </div>
                        )}
                        <div className="border border-gray-100 rounded-xl overflow-hidden">
                          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_50px] bg-gray-50 border-b border-gray-100">
                            {['Ingredient', 'Required', 'Available', 'Cost', ''].map(h => (
                              <div key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
                            ))}
                          </div>
                          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                            {productionItems.map((item, idx) => (
                              <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_50px] items-center">
                                <div className="px-3 py-2.5 text-sm font-semibold text-[#2D2A26]">{item.bom_item.item_name}</div>
                                <div className="px-3 py-2.5 text-sm text-gray-500">{formatQty(item.required_qty, item.bom_item.uom)}</div>
                                <div className={`px-3 py-2.5 text-sm font-semibold ${item.status === 'insufficient' ? 'text-red-600' : 'text-gray-500'}`}>
                                  {formatQty(item.available_qty, item.bom_item.uom)}
                                </div>
                                <div className="px-3 py-2.5 text-sm text-gray-500">{formatCurrency(item.cost)}</div>
                                <div className="px-3 py-2.5 flex items-center justify-center">
                                  {item.status === 'sufficient'
                                    ? <CheckCircle size={16} className="text-green-500" />
                                    : <AlertCircle size={16} className="text-red-500" />
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                          {productionItems.length > 0 && (
                            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_50px] border-t border-gray-100 bg-gray-50">
                              <div className="px-3 py-2.5 col-span-3 text-xs font-bold text-gray-400 text-right">Total Estimated Cost:</div>
                              <div className="px-3 py-2.5 text-sm font-extrabold text-[#C69A11]">{formatCurrency(totalCost)}</div>
                              <div />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1">
                  <button onClick={() => setShowModal(false)} disabled={creatingOrder}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={createProductionOrder} disabled={!canCreate || creatingOrder}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${canCreate && !creatingOrder
                        ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] shadow-md shadow-[#E4B315]/20 hover:opacity-90'
                        : 'bg-[#E4B315]/30 cursor-not-allowed'
                      }`}>
                    {creatingOrder && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    Create Production Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default Manufacturing;