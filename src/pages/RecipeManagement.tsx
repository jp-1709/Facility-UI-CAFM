import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Printer, Search, X, Package, Loader, Monitor, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import PageLayout from '../components/PageLayout';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface ItemOption { item_code: string; item_name: string; stock_uom?: string; valuation_rate?: number; }
interface BOMItem { name: string; item_code: string; item_name: string; description: string; qty: number; uom: string; rate: number; amount: number; stock_qty: number; stock_uom: string; include_item_in_manufacturing: number; is_stock_item: number; }
interface BOM { name: string; item_name: string; item: string; description: string; company: string; uom: string; quantity: number; is_active: boolean; is_default: boolean; allow_alternative_item: boolean; total_cost: number; raw_material_cost: number; operating_cost: number; scrap_material_cost: number; items: BOMItem[]; exploded_items: BOMItem[]; sell_price?: number; prep_time?: number; cook_time?: number; serving_size?: number; production_category?: string; linked_menu_item?: string; status?: string; }

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n ?? 0);

const grossMargin = (cost: number, sell: number): string => {
  if (!sell || sell === 0) return '0.0';
  return (((sell - cost) / sell) * 100).toFixed(1);
};

const marginBadge = (pct: string) => {
  const n = parseFloat(pct);
  if (n >= 60) return 'bg-green-100 text-green-700';
  if (n >= 0) return 'bg-[#E4B315]/10 text-[#C69A11]';
  return 'bg-red-100 text-red-700';
};

// ── Shared input styles ───────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#2D2A26] outline-none bg-white focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-[#C69A11] mb-1.5";

// ── Item Search Typeahead ─────────────────────────────────────────────────────
interface ItemSearchProps { value: string; placeholder?: string; onSelect: (item: ItemOption) => void; onClear?: () => void; className?: string; }

const ItemSearch: React.FC<ItemSearchProps> = ({ value, placeholder = 'Search item…', onSelect, onClear, className = '' }) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ItemOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/resource/Item?fields=["item_code","item_name","stock_uom","valuation_rate"]&filters=[["item_name","like","%25${encodeURIComponent(q)}%25"]]&limit_page_length=9999`);
      const data = await res.json();
      setResults(data.data || []); setOpen(true);
    } catch { setResults([]); } finally { setLoading(false); }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value; setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q), 300);
  };

  const handleSelect = (item: ItemOption) => { setQuery(item.item_name); setOpen(false); setResults([]); onSelect(item); };
  const handleClear = () => { setQuery(''); setResults([]); setOpen(false); onClear?.(); };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <div className="relative">
        <input className={inputCls + ' pr-8'} value={query} placeholder={placeholder} onChange={handleChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }} autoComplete="off" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 flex items-center">
          {loading ? <Loader size={13} className="animate-spin" /> : query ? <X size={13} className="cursor-pointer hover:text-gray-600" onClick={handleClear} /> : <Search size={13} />}
        </span>
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
          {results.map(item => (
            <div key={item.item_code} onMouseDown={() => handleSelect(item)}
              className="px-3.5 py-2.5 cursor-pointer hover:bg-[#E4B315]/6 flex justify-between items-center border-b border-gray-50 last:border-0 transition-colors">
              <div>
                <div className="text-sm font-semibold text-[#2D2A26]">{item.item_name}</div>
                <div className="text-xs text-gray-400">{item.item_code} · {item.stock_uom || 'Nos'}</div>
              </div>
              {item.valuation_rate != null && item.valuation_rate > 0 && (
                <div className="text-xs text-gray-400 font-semibold shrink-0 ml-3">{formatCurrency(item.valuation_rate)}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {open && results.length === 0 && !loading && query.trim() && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl px-3.5 py-3 text-sm text-gray-400">
          No items found for "{query}"
        </div>
      )}
    </div>
  );
};

// ── Empty helpers ─────────────────────────────────────────────────────────────
const emptyIngredient = (): BOMItem => ({ name: '', item_code: '', item_name: '', description: '', qty: 1, uom: '', rate: 0, amount: 0, stock_qty: 0, stock_uom: '', include_item_in_manufacturing: 1, is_stock_item: 1 });
interface IngredientRow extends BOMItem { _id: number; }
interface RecipeForm { name: string; item_name: string; item: string; item_uom: string; description: string; quantity: number; uom: string; sell_price: number; linked_menu_item: string; linked_menu_item_name: string; status: string; company: string; items: IngredientRow[]; }
const emptyForm = (): RecipeForm => ({ name: '', item_name: '', item: '', item_uom: 'Nos', description: '', quantity: 1, uom: 'Nos', sell_price: 0, linked_menu_item: '', linked_menu_item_name: '', status: 'Available', company: '', items: [{ ...emptyIngredient(), _id: Date.now() }] });

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps { title: string; onClose: () => void; onSubmit: () => Promise<void>; submitLabel: string; form: RecipeForm; setForm: React.Dispatch<React.SetStateAction<RecipeForm>>; saving: boolean; companies: { name: string }[]; }

const RecipeModal: React.FC<ModalProps> = ({ title, onClose, onSubmit, submitLabel, form, setForm, saving, companies }) => {
  const addIngredient = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyIngredient(), _id: Date.now() + Math.random() }] }));
  const removeIngredient = (id: number) => setForm(f => ({ ...f, items: f.items.filter(i => i._id !== id) }));
  const updateIngredient = (id: number, patch: Partial<IngredientRow>) => setForm(f => ({ ...f, items: f.items.map(i => i._id === id ? { ...i, ...patch } : i) }));
  const totalCost = form.items.reduce((s, i) => s + (parseFloat(String(i.qty)) || 0) * (parseFloat(String(i.rate)) || 0), 0);
  const gm = grossMargin(totalCost, form.sell_price);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-extrabold text-[#2D2A26]">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Link */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Recipe Name *</label>
              <input className={inputCls} placeholder="e.g. Grilled Chicken" value={form.item_name}
                onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Link to Menu Item</label>
              <ItemSearch value={form.linked_menu_item_name} placeholder="Type to search…"
                onSelect={item => setForm(f => ({ ...f, linked_menu_item: item.item_code, linked_menu_item_name: item.item_name, item: item.item_code, item_uom: item.stock_uom || 'Nos', uom: item.stock_uom || 'Nos', item_name: f.item_name || item.item_name }))}
                onClear={() => setForm(f => ({ ...f, linked_menu_item: '', linked_menu_item_name: '', item: '' }))} />
            </div>
          </div>

          {/* Company + Description */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company *</label>
              <select className={inputCls} value={form.company} required
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}>
                <option value="">Select company</option>
                {companies.map((c: { name: string }) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input className={inputCls} placeholder="Short description (optional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          {/* Sell Price */}
          <div className="grid grid-cols-[180px_1fr] gap-4">
            <div>
              <label className={labelCls}>Sell Price (KES)</label>
              <input className={inputCls} type="number" min="0" placeholder="0" value={form.sell_price || ''}
                onChange={e => setForm(f => ({ ...f, sell_price: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div></div>
          </div>

          {/* Ingredients */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div>
                <span className="text-sm font-bold text-[#2D2A26]">Ingredients</span>
                <span className="ml-2 text-xs text-gray-400">· select item, enter qty</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E4B315]/10 text-[#C69A11]">Total: {formatCurrency(totalCost)}</span>
                <button onClick={addIngredient}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">
                  <Plus size={13} /> Add Row
                </button>
              </div>
            </div>

            {/* Column labels */}
            <div className="grid grid-cols-[2.5fr_80px_90px_100px_36px] bg-gray-50/50 border-b border-gray-50">
              {['Item', 'Qty', 'UOM', 'Line Cost', ''].map(h => (
                <div key={h} className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</div>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {form.items.map((ing, idx) => (
                <div key={ing._id} className="grid grid-cols-[2.5fr_80px_90px_100px_36px] items-center">
                  <div className="p-2"><ItemSearch value={ing.item_name || ing.item_code} placeholder="Search ingredient…"
                    onSelect={item => updateIngredient(ing._id, { item_code: item.item_code, item_name: item.item_name, uom: item.stock_uom || 'Nos', stock_uom: item.stock_uom || 'Nos', rate: item.valuation_rate || 0 })}
                    onClear={() => updateIngredient(ing._id, { item_code: '', item_name: '', uom: '', rate: 0 })} /></div>
                  <div className="p-2"><input className={inputCls + ' text-center px-2'} type="number" min="0" step="0.001"
                    value={ing.qty} onChange={e => updateIngredient(ing._id, { qty: parseFloat(e.target.value) || 0 })} /></div>
                  <div className="p-2"><input className={inputCls + ' px-2 text-gray-500'} value={ing.uom} placeholder="UOM"
                    onChange={e => updateIngredient(ing._id, { uom: e.target.value })} /></div>
                  <div className="px-3 py-2 text-sm font-bold text-[#2D2A26]">{formatCurrency((ing.qty || 0) * (ing.rate || 0))}</div>
                  <div className="flex items-center justify-center p-1">
                    <button onClick={() => removeIngredient(ing._id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded-lg"><X size={14} /></button>
                  </div>
                </div>
              ))}
              {form.items.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-400">No ingredients — click "Add Row"</div>
              )}
            </div>
          </div>

          {/* Margin summary */}
          {(totalCost > 0 || form.sell_price > 0) && (
            <div className="flex gap-6 p-3.5 bg-[#E4B315]/6 rounded-xl border border-[#E4B315]/20 text-sm flex-wrap">
              <span className="text-gray-500">Cost: <strong className="text-[#2D2A26]">{formatCurrency(totalCost)}</strong></span>
              <span className="text-gray-500">Sell: <strong className="text-[#2D2A26]">{formatCurrency(form.sell_price)}</strong></span>
              <span className="text-gray-500">Gross Margin: <strong className={parseFloat(gm) >= 0 ? 'text-green-600' : 'text-red-600'}>{gm}%</strong></span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onSubmit} disabled={saving || !form.item_name.trim() || !form.company.trim()}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all ${saving || !form.item_name.trim() || !form.company.trim()
              ? 'bg-[#E4B315]/40 cursor-not-allowed'
              : 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] shadow-md shadow-[#E4B315]/20 hover:opacity-90'
              }`}>
            {saving && <Loader size={14} className="animate-spin" />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const RecipeManagement: React.FC = () => {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<RecipeForm>(emptyForm());
  const [editForm, setEditForm] = useState<RecipeForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [companies, setCompanies] = useState<{ name: string }[]>([]);

  useEffect(() => { fetchRecipes(); fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      const res = await fetch('/api/resource/Company?fields=["name"]&limit_page_length=9999');
      const data = await res.json();
      setCompanies(data.data || []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const filtered = recipes.filter(r =>
    (r.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.item || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.description || '').toLowerCase().includes(search.toLowerCase())
  );
  const paginatedRecipes = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  const fetchRecipes = async () => {
    try {
      setLoading(true); setError(null);
      let all: BOM[] = []; let start = 0; let hasMore = true;
      while (hasMore) {
        const res = await fetch(`/api/resource/BOM?fields=["*"]&limit_start=${start}&limit_page_length=9999`);
        const data = await res.json();
        if (data.data?.length > 0) { all = [...all, ...data.data]; start += data.data.length; hasMore = data.data.length === 100; }
        else hasMore = false;
      }
      setRecipes(all);
    } catch (err: any) { setError('Failed to fetch recipes: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!addForm.item_name.trim() || !addForm.company.trim()) {
      alert('Please fill in the recipe name and select a company.');
      return;
    }
    setSaving(true);
    try {
      const itemCode = addForm.linked_menu_item || addForm.item_name;
      const payload = { item: itemCode, item_name: addForm.item_name, company: addForm.company, docstatus: 1, description: addForm.description || addForm.item_name, quantity: addForm.quantity || 1, uom: addForm.uom || 'Nos', is_active: 1, is_default: 1, items: addForm.items.filter(i => i.item_code.trim() !== '').map(i => ({ item_code: i.item_code, item_name: i.item_name, qty: i.qty, uom: i.uom || i.stock_uom || 'Nos', rate: i.rate || 0 })) };
      const res = await fetch('/api/resource/BOM', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.exception || data?.message || `HTTP ${res.status}`);
      if (data.data) setRecipes(rs => [{ ...data.data, sell_price: addForm.sell_price, linked_menu_item: addForm.linked_menu_item_name || addForm.linked_menu_item, status: 'Available' }, ...rs]);
      setShowAdd(false); setAddForm(emptyForm()); setTimeout(fetchRecipes, 800);
    } catch (err: any) { alert('Failed to create recipe:\n' + err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editTarget || !editForm.company.trim()) {
      alert('Please select a company.');
      return;
    }
    setSaving(true);
    try {
      const payload = { bom_name: editTarget, company: editForm.company, description: editForm.description, docstatus: 1, quantity: editForm.quantity, items: editForm.items.filter(i => i.item_code.trim() !== '').map(i => ({ item_code: i.item_code, item_name: i.item_name, qty: i.qty, uom: i.uom || i.stock_uom || 'Nos', rate: i.rate || 0 })) };
      const res = await fetch('/api/method/quantbit_ury_customization.ury_customization.bom_api.update_bom_with_items', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.message || data?.exception || `HTTP ${res.status}`);
      if (data.data) setRecipes(rs => rs.map(r => r.name === editTarget ? { ...r, ...data.data, sell_price: editForm.sell_price, description: editForm.description } : r));
      setEditTarget(null); setTimeout(fetchRecipes, 800);
    } catch (err: any) { alert('Failed to update recipe:\n' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete recipe "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/resource/BOM/${encodeURIComponent(name)}`, { method: 'DELETE', headers: { 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' } });
      if (!res.ok) { const d = await res.json(); throw new Error(d?.exception || d?.message || `HTTP ${res.status}`); }
      setRecipes(rs => rs.filter(r => r.name !== name));
    } catch (err: any) { alert('Failed to delete recipe:\n' + err.message); }
  };

  const openEdit = async (recipe: BOM) => {
    try {
      const res = await fetch(`/api/resource/BOM/${encodeURIComponent(recipe.name)}`);
      const data = await res.json(); const full: BOM = data.data ?? recipe;
      setEditForm({ name: full.name, item_name: full.item_name, item: full.item, item_uom: full.uom || 'Nos', description: full.description || '', quantity: full.quantity, uom: full.uom, sell_price: full.total_cost ?? full.sell_price ?? 0, linked_menu_item: full.item ?? '', linked_menu_item_name: full.item_name ?? '', status: full.status ?? 'Available', company: full.company || '', items: (full.items?.length > 0 ? full.items : [emptyIngredient()]).map(i => ({ ...emptyIngredient(), name: i.name || '', item_code: i.item_code || '', item_name: i.item_name || '', description: i.description || '', qty: i.qty ?? 1, uom: i.uom || i.stock_uom || '', rate: i.rate ?? 0, amount: i.amount ?? 0, stock_qty: i.stock_qty ?? 0, stock_uom: i.stock_uom || '', _id: Math.random() })) });
      setEditTarget(full.name);
    } catch (err: any) { alert('Failed to load recipe: ' + err.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="relative w-12 h-12 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-[#E4B315]/20" />
          <div className="absolute inset-0 rounded-full border-2 border-[#E4B315] border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Loading recipes…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#E4B315]/10 flex items-center justify-center mx-auto mb-4"><Package size={24} className="text-[#C69A11]" /></div>
        <p className="text-base font-bold text-[#2D2A26] mb-1">Error Loading Recipes</p>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <button onClick={fetchRecipes} className="bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white border-none rounded-xl px-5 py-2.5 font-bold text-sm shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">Try Again</button>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Recipe Management"
      subtitle={`${recipes.length} recipe${recipes.length !== 1 ? 's' : ''} · Manage BOMs and link to menu items`}
      actions={
        <>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors shadow-sm">
            <Printer size={15} /> Print
          </button>
          <button onClick={() => { setAddForm(emptyForm()); setShowAdd(true); }}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">
            <Plus size={15} /> Add Recipe
          </button>
        </>
      }
    >
      <div className="flex flex-col h-full overflow-hidden bg-gray-50/80">

        {/* Search */}
        <div className="shrink-0 px-6 pt-5">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className={inputCls + ' pl-9'} placeholder="Search recipes…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 flex flex-col min-h-0 px-6 py-4">
          {recipes.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#E4B315]/10 flex items-center justify-center mb-4"><BookOpen size={28} className="text-[#C69A11]" /></div>
              <h3 className="text-base font-bold text-[#2D2A26] mb-1">No Recipes Yet</h3>
              <p className="text-sm text-gray-400 mb-5">Create your first recipe to get started.</p>
              <button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white border-none rounded-xl px-6 py-2.5 font-bold text-sm shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">+ Add Recipe</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-auto flex-1">
                <table className="w-full" style={{ minWidth: 900 }}>
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      {['Recipe Name', 'Menu Item', 'Cost', 'Sell Price', 'Gross Margin', 'Ingredients', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedRecipes.map(recipe => {
                      const gm = grossMargin(recipe.total_cost || 0, recipe.sell_price || 0);
                      return (
                        <tr key={recipe.name} className="hover:bg-[#E4B315]/3 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="text-sm font-bold text-[#2D2A26]">{recipe.item_name}</div>
                            <div className="text-xs text-gray-400 font-mono">{recipe.item}</div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-gray-500">{recipe.linked_menu_item || '—'}</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-[#2D2A26] tabular-nums">{formatCurrency(recipe.total_cost || 0)}</td>
                          <td className="px-4 py-3.5 text-sm font-semibold text-[#2D2A26] tabular-nums">{formatCurrency(recipe.sell_price || 0)}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${marginBadge(gm)}`}>{gm}%</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600">{recipe.items?.length || 0}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEdit(recipe)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors bg-white">
                                <Edit2 size={12} /> Edit
                              </button>
                              <button onClick={() => handleDelete(recipe.name)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:border-red-200 hover:text-red-500 transition-colors bg-white">
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-5 py-3.5 border-t border-gray-50 flex items-center justify-between">
                  <div className="text-xs text-gray-400 font-medium">
                    Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors">
                      <ChevronLeft size={12} /> Prev
                    </button>
                    <span className="text-xs font-bold text-gray-500 px-2">Page {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 disabled:opacity-40 hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors">
                      Next <ChevronRight size={12} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    Per page:
                    <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:ring-2 focus:ring-[#E4B315]/30 outline-none">
                      {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showAdd && (
          <RecipeModal title="Add New Recipe" onClose={() => { setShowAdd(false); setAddForm(emptyForm()); }}
            onSubmit={handleAdd} submitLabel="Create Recipe" form={addForm} setForm={setAddForm} saving={saving} companies={companies} />
        )}
        {editTarget && (
          <RecipeModal title="Edit Recipe" onClose={() => { setEditTarget(null); setEditForm(emptyForm()); }}
            onSubmit={handleUpdate} submitLabel="Update Recipe" form={editForm} setForm={setEditForm} saving={saving} companies={companies} />
        )}
      </div>
    </PageLayout>
  );
};

export default RecipeManagement;