// Reservations.tsx — mustard theme + PageLayout sidebar + back to EPOS
// All functionality (CRUD, calendar, waitlist, settings) preserved exactly.
// Only visual layer updated.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, List, Users, Clock, Settings, Plus, X, ChevronLeft,
  ChevronRight, Pencil, Trash2, Info, Mail, Phone, MapPin, Check,
} from 'lucide-react';
import {
  getReservations, getReservationsForDate, createReservation,
  updateReservation, deleteReservation,
  getTables, getWaitlist, addToWaitlist, updateWaitlistStatus, deleteWaitlistEntry,
  getSettings, saveSettings,
  generateTimeSlotsFromSettings,
  Reservation, ReservationForm, URYTable, WaitlistEntry, WaitlistForm,
  ReservationSettings,
} from '../lib/api/reservation-api';
import { PageLayout } from '../components/PageLayout';

// ─────────────────────────────────────────────────────────────────────────────
type TabId = 'calendar' | 'reservations' | 'tables' | 'waitlist' | 'settings';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar',     label: 'Calendar View', icon: <Calendar className="h-4 w-4" /> },
  { id: 'reservations', label: 'Reservations',  icon: <List     className="h-4 w-4" /> },
  { id: 'tables',       label: 'Table Status',  icon: <Users    className="h-4 w-4" /> },
  { id: 'waitlist',     label: 'Waitlist',       icon: <Clock    className="h-4 w-4" /> },
  { id: 'settings',     label: 'Settings',       icon: <Settings className="h-4 w-4" /> },
];

const PARTY_SIZES  = ['1 Guest','2 Guests','3 Guests','4 Guests','5 Guests','6 Guests','7 Guests','8 Guests','9 Guests','10 Guests'];
const DURATIONS    = ['1 hour','1.5 hours','2 hour','2.5 hours','3 hours'];
const STATUSES     = ['Pending','Confirmed','Completed','Cancelled','No Show'];
const WAIT_OPTIONS = ['15 Minutes','20 Minutes','30 Minutes','40 Minutes','50 minutes'];

const STATUS_STYLE: Record<string, string> = {
  Confirmed: 'bg-green-100 text-green-700', Pending: 'bg-[#E4B315]/10 text-[#C69A11]',
  Completed: 'bg-blue-100 text-blue-700',   Cancelled: 'bg-gray-100 text-gray-500',
  'No Show': 'bg-red-100 text-red-600',
};

const EMPTY_FORM: ReservationForm = {
  customer_name:'', email_address:'', phone_number:'',
  party_size:'2 Guests', reservation_date:'', reservation_time:'',
  duration:'2 hour', status:'Confirmed', assigned_table:'', special_requests:'',
};
const EMPTY_WAITLIST: WaitlistForm = {
  customer_name:'', party_size:'2 Guests', phone_number:'', estimated_wait:'15 Minutes', special_requests:'',
};

const fmtDate = (s: string) => {
  if (!s) return '';
  return new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric'}).format(new Date(s+'T00:00:00'));
};
const toIso = (d: Date) => d.toISOString().split('T')[0];

// ─── Shared form inputs ───────────────────────────────────────────────────────
const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors bg-white text-[#2D2A26]";
const labelCls = "block text-xs font-bold uppercase tracking-wider text-[#C69A11] mb-1.5";

// ─── Toggle ───────────────────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button type="button" onClick={() => onChange(!checked)}
    className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${checked ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11]' : 'bg-gray-200'}`}>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}/>
  </button>
);

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const MiniCalendar = ({ selected, onSelect }: { selected: string; onSelect: (date: string) => void }) => {
  const [view, setView] = useState(() => {
    const d = selected ? new Date(selected+'T00:00:00') : new Date();
    return { year:d.getFullYear(), month:d.getMonth() };
  });
  const today = toIso(new Date());
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const firstDay = new Date(view.year,view.month,1).getDay();
  const daysInMonth = new Date(view.year,view.month+1,0).getDate();
  const prev = () => setView(v => v.month===0 ? {year:v.year-1,month:11} : {year:v.year,month:v.month-1});
  const next = () => setView(v => v.month===11 ? {year:v.year+1,month:0} : {year:v.year,month:v.month+1});
  const prevDays = new Date(view.year,view.month,0).getDate();
  const cells: { day:number; cur:boolean }[] = [];
  for (let i=firstDay-1;i>=0;i--) cells.push({day:prevDays-i,cur:false});
  for (let i=1;i<=daysInMonth;i++) cells.push({day:i,cur:true});
  const remaining = 42 - cells.length;
  for (let i=1;i<=remaining;i++) cells.push({day:i,cur:false});

  return (
    <div className="border border-gray-100 rounded-2xl p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prev} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"><ChevronLeft className="h-4 w-4"/></button>
        <span className="font-bold text-sm text-[#2D2A26]">{MONTHS[view.month]} {view.year}</span>
        <button onClick={next} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors"><ChevronRight className="h-4 w-4"/></button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d=><div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell,i) => {
          const iso = toIso(new Date(view.year, view.month+(cell.cur?0:i<firstDay?-1:1), cell.day));
          const isSel = iso === selected; const isToday = iso === today;
          return (
            <button key={i} onClick={()=>cell.cur&&onSelect(iso)} disabled={!cell.cur}
              className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-sm transition-colors ${
                isSel ? 'bg-gradient-to-br from-[#E4B315] to-[#C69A11] text-white font-bold shadow-sm shadow-[#E4B315]/25'
                : isToday ? 'border-2 border-[#E4B315] text-[#C69A11] font-semibold'
                : cell.cur ? 'hover:bg-[#E4B315]/8 cursor-pointer text-[#2D2A26]'
                : 'text-gray-300 cursor-default'
              }`}>{cell.day}</button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Reservation Form Modal ───────────────────────────────────────────────────
interface ReservationModalProps {
  initial?: Partial<ReservationForm>; editName?: string; tables: URYTable[];
  timeSlots: string[]; onClose: ()=>void; onSaved: ()=>void;
}

const ReservationModal = ({ initial, editName, tables, timeSlots, onClose, onSaved }: ReservationModalProps) => {
  const [form, setForm] = useState<ReservationForm>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string|null>(null);
  const set = (k: keyof ReservationForm, v: string) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (editName) await updateReservation(editName, form);
      else await createReservation(form);
      onSaved(); onClose();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <h2 className="text-base font-extrabold text-[#2D2A26]">{editName ? 'Edit Reservation' : 'New Reservation'}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"><X className="h-4 w-4"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Customer Name *</label><input required className={inputCls} value={form.customer_name} onChange={e=>set('customer_name',e.target.value)} placeholder="Full name"/></div>
            <div><label className={labelCls}>Phone Number</label><input className={inputCls} value={form.phone_number} onChange={e=>set('phone_number',e.target.value)} placeholder="+1 (555) 000-0000"/></div>
            <div><label className={labelCls}>Email Address</label><input type="email" className={inputCls} value={form.email_address} onChange={e=>set('email_address',e.target.value)} placeholder="email@example.com"/></div>
            <div><label className={labelCls}>Party Size</label><select className={inputCls} value={form.party_size} onChange={e=>set('party_size',e.target.value)}>{PARTY_SIZES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className={labelCls}>Date *</label><input required type="date" className={inputCls} value={form.reservation_date} onChange={e=>set('reservation_date',e.target.value)}/></div>
            <div><label className={labelCls}>Time *</label><select required className={inputCls} value={form.reservation_time} onChange={e=>set('reservation_time',e.target.value)}><option value="">Select time…</option>{timeSlots.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className={labelCls}>Duration</label><select className={inputCls} value={form.duration} onChange={e=>set('duration',e.target.value)}>{DURATIONS.map(d=><option key={d}>{d}</option>)}</select></div>
            <div><label className={labelCls}>Status</label><select className={inputCls} value={form.status} onChange={e=>set('status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className={labelCls}>Assigned Table</label><select className={inputCls} value={form.assigned_table} onChange={e=>set('assigned_table',e.target.value)}><option value="">No preference</option>{tables.map(t=><option key={t.name} value={t.name}>{t.table_name||t.name}</option>)}</select></div>
          </div>
          <div><label className={labelCls}>Special Requests</label><textarea className={inputCls} rows={3} value={form.special_requests} onChange={e=>set('special_requests',e.target.value)} placeholder="Any special requirements…"/></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-50">
              {saving&&<div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>}
              {editName ? 'Update' : 'Create'} Reservation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Waitlist Modal ───────────────────────────────────────────────────────────
const WaitlistModal = ({ onClose, onSaved }: { onClose:()=>void; onSaved:()=>void }) => {
  const [form, setForm] = useState<WaitlistForm>({ ...EMPTY_WAITLIST });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof WaitlistForm, v: string) => setForm(f=>({...f,[k]:v}));
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await addToWaitlist(form); onSaved(); onClose(); }
    catch { /* handled silently */ } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-extrabold text-[#2D2A26]">Add to Waitlist</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400"><X className="h-4 w-4"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className={labelCls}>Customer Name *</label><input required className={inputCls} value={form.customer_name} onChange={e=>set('customer_name',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Party Size</label><select className={inputCls} value={form.party_size} onChange={e=>set('party_size',e.target.value)}>{PARTY_SIZES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div><label className={labelCls}>Phone</label><input className={inputCls} value={form.phone_number} onChange={e=>set('phone_number',e.target.value)}/></div>
          </div>
          <div><label className={labelCls}>Est. Wait Time</label><select className={inputCls} value={form.estimated_wait} onChange={e=>set('estimated_wait',e.target.value)}>{WAIT_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div>
          <div><label className={labelCls}>Special Requests</label><textarea className={inputCls} rows={2} value={form.special_requests} onChange={e=>set('special_requests',e.target.value)}/></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-50">Add to Waitlist</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Reservations Component ──────────────────────────────────────────────
const Reservations = () => {
  const [activeTab,         setActiveTab]         = useState<TabId>('calendar');
  const [reservations,      setReservations]      = useState<Reservation[]>([]);
  const [dateReservations,  setDateReservations]  = useState<Reservation[]>([]);
  const [tables,            setTables]            = useState<URYTable[]>([]);
  const [waitlist,          setWaitlist]          = useState<WaitlistEntry[]>([]);
  const [localSettings,     setLocalSettings]     = useState<Partial<ReservationSettings>>({});
  const [timeSlots,         setTimeSlots]         = useState<string[]>([]);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState<string|null>(null);
  const [selectedDate,      setSelectedDate]      = useState(() => toIso(new Date()));
  const [showAddReservation,setShowAddReservation]= useState(false);
  const [editReservation,   setEditReservation]   = useState<Reservation|null>(null);
  const [deleteTarget,      setDeleteTarget]      = useState<string|null>(null);
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [statusFilter,      setStatusFilter]      = useState('All Status');
  const [dateFilter,        setDateFilter]        = useState('All Dates');
  const [waitlistFilter,    setWaitlistFilter]    = useState('all');
  const [savingSettings,    setSavingSettings]    = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [rs, ts, ws, s] = await Promise.all([getReservations(), getTables(), getWaitlist(), getSettings()]);
      setReservations(rs); setTables(ts); setWaitlist(ws);
      if (s) { setLocalSettings(s); setTimeSlots(generateTimeSlotsFromSettings(s)); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);

  const loadDateReservations = useCallback(async (date: string) => {
    try { setDateReservations(await getReservationsForDate(date)); }
    catch { setDateReservations([]); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { loadDateReservations(selectedDate); }, [selectedDate, loadDateReservations]);

  const setSetting = (k: string, v: string | number) => setLocalSettings((prev) => ({ ...prev, [k]: v }));

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try { await saveSettings(localSettings as ReservationSettings); setLocalSettings(localSettings); setTimeSlots(generateTimeSlotsFromSettings(localSettings as ReservationSettings)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to save settings'); }
    finally { setSavingSettings(false); }
  };

  const filteredWaitlist = waitlist.filter(w => {
    if (waitlistFilter === 'waiting') return w.status === 'Waiting';
    if (waitlistFilter === 'seated')  return w.status === 'Seated';
    return true;
  });

  const filteredReservations = reservations.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.customer_name.toLowerCase().includes(q) || r.phone_number?.toLowerCase().includes(q) || r.email_address?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All Status' || r.status === statusFilter;
    const today = toIso(new Date());
    const matchDate = dateFilter==='All Dates' ? true : dateFilter==='Today' ? r.reservation_date===today : dateFilter==='Upcoming' ? r.reservation_date>=today : dateFilter==='Past' ? r.reservation_date<today : true;
    return matchSearch && matchStatus && matchDate;
  });

  const ReservationCard = ({ r }: { r: Reservation }) => (
    <div className="border border-gray-100 rounded-2xl p-5 bg-white hover:border-[#E4B315]/30 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-[#2D2A26]">{r.customer_name}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[r.status]??'bg-gray-100 text-gray-600'}`}>{r.status}</span>
          <span className="flex items-center gap-1 px-2 py-0.5 border border-gray-200 rounded-full text-xs text-gray-500"><Users className="h-3 w-3"/> Party of {r.party_size?.split(' ')[0]}</span>
        </div>
        <div className="flex gap-1 shrink-0 ml-2">
          <button onClick={() => setEditReservation(r)} className="p-1.5 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors text-gray-400"><Pencil className="h-3.5 w-3.5"/></button>
          <button onClick={() => setDeleteTarget(r.name)} className="p-1.5 border border-gray-200 rounded-xl hover:border-red-200 hover:text-red-500 transition-colors text-gray-400"><Trash2 className="h-3.5 w-3.5"/></button>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm mb-2">
        <div className="flex items-center gap-2 text-gray-400"><Calendar className="h-3.5 w-3.5 shrink-0"/><div><div className="text-xs">Date</div><div className="text-[#2D2A26] font-semibold text-xs">{fmtDate(r.reservation_date)}</div></div></div>
        <div className="flex items-center gap-2 text-gray-400"><Clock className="h-3.5 w-3.5 shrink-0"/><div><div className="text-xs">Time</div><div className="text-[#2D2A26] font-semibold text-xs">{r.reservation_time?.slice(0,5)}</div></div></div>
        {r.assigned_table&&<div className="flex items-center gap-2 text-gray-400"><MapPin className="h-3.5 w-3.5 shrink-0"/><div><div className="text-xs">Table</div><div className="text-[#2D2A26] font-semibold text-xs">{r.assigned_table}</div></div></div>}
        {r.email_address&&<div className="flex items-center gap-2 text-gray-400 col-span-1"><Mail className="h-3.5 w-3.5 shrink-0"/><span className="text-xs truncate">{r.email_address}</span></div>}
        {r.phone_number&&<div className="flex items-center gap-2 text-gray-400 col-span-1"><Phone className="h-3.5 w-3.5 shrink-0"/><span className="text-xs">{r.phone_number}</span></div>}
      </div>
      {r.special_requests&&<p className="text-xs text-gray-400"><span className="font-semibold text-[#2D2A26]">Notes:</span> {r.special_requests}</p>}
    </div>
  );

  return (
    <PageLayout title="Reservation System" subtitle="Manage table reservations, bookings, and waitlist efficiently">
      <div className="overflow-auto px-6 py-5 space-y-4 max-w-5xl mx-auto w-full">

        {error && <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl text-sm"><Info className="h-4 w-4 mt-0.5 shrink-0"/> {error}</div>}

        {/* Tab bar */}
        <div className="flex bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm p-1 gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 ${
                activeTab===tab.id
                  ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20'
                  : 'text-gray-400 hover:text-[#2D2A26] hover:bg-gray-50'
              }`}>
              {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Calendar tab ── */}
        {activeTab==='calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div><h3 className="font-bold text-[#2D2A26] mb-3">Select Date</h3>
              <MiniCalendar selected={selectedDate} onSelect={d=>{ setSelectedDate(d); loadDateReservations(d); }}/>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[#2D2A26]">{fmtDate(selectedDate)}</h3>
                <button onClick={() => setShowAddReservation(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-sm shadow-[#E4B315]/25 hover:opacity-90 transition-opacity">
                  <Plus className="h-4 w-4"/> Add
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center py-10"><div className="h-6 w-6 border-2 border-[#E4B315] border-t-transparent rounded-full animate-spin"/></div>
              ) : dateReservations.length===0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                  <Clock className="h-10 w-10 opacity-30"/><p className="font-medium text-sm">No reservations</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dateReservations.map(r => (
                    <div key={r.name} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[#E4B315]/30 transition-colors">
                      <div><div className="font-semibold text-sm text-[#2D2A26]">{r.customer_name}</div><div className="text-xs text-gray-400">{r.reservation_time?.slice(0,5)} · {r.party_size}</div></div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[r.status]??''}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Reservations list tab ── */}
        {activeTab==='reservations' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input type="text" placeholder="Search reservations…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  className={`${inputCls} pl-4`}/>
              </div>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className={inputCls + ' max-w-[180px]'}>
                {['All Status',...STATUSES].map(s=><option key={s}>{s}</option>)}
              </select>
              <select value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className={inputCls + ' max-w-[160px]'}>
                {['All Dates','Today','Upcoming','Past'].map(d=><option key={d}>{d}</option>)}
              </select>
              <button onClick={() => setShowAddReservation(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-sm shadow-[#E4B315]/25 hover:opacity-90 shrink-0">
                <Plus className="h-4 w-4"/> New
              </button>
            </div>
            {filteredReservations.length===0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400"><Calendar className="h-10 w-10 opacity-30 mb-3"/><p className="text-sm font-medium">No reservations found</p></div>
            ) : (
              <div className="space-y-3">{filteredReservations.map(r=><ReservationCard key={r.name} r={r}/>)}</div>
            )}
          </div>
        )}

        {/* ── Table Status tab ── */}
        {activeTab==='tables' && (
          <div>
            {tables.length===0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400"><Users className="h-10 w-10 opacity-30 mb-3"/><p className="text-sm">No tables configured</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map(t => (
                  <div key={t.name} className={`rounded-2xl p-4 border text-center shadow-sm ${t.status==='Occupied'?'border-red-200 bg-red-50':t.status==='Reserved'?'border-[#E4B315]/40 bg-[#E4B315]/8':'border-green-200 bg-green-50'}`}>
                    <div className="text-lg font-extrabold text-[#2D2A26] mb-1">{t.table_name||t.name}</div>
                    <div className="text-xs text-gray-500 mb-2">Capacity: {t.seating_capacity||'—'}</div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${t.status==='Occupied'?'bg-red-100 text-red-700':t.status==='Reserved'?'bg-[#E4B315]/15 text-[#C69A11]':'bg-green-100 text-green-700'}`}>{t.status||'Available'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Waitlist tab ── */}
        {activeTab==='waitlist' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-center">
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {[['all','All'],['waiting','Waiting'],['seated','Seated']].map(([v,l])=>(
                  <button key={v} onClick={()=>setWaitlistFilter(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${waitlistFilter===v?'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-sm':'text-gray-500 hover:text-[#2D2A26]'}`}>{l}</button>
                ))}
              </div>
              <button onClick={()=>setShowWaitlistModal(true)}
                className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-sm shadow-[#E4B315]/25 hover:opacity-90">
                <Plus className="h-4 w-4"/> Add to Waitlist
              </button>
            </div>
            {filteredWaitlist.length===0 ? (
              <div className="flex flex-col items-center py-16 text-gray-400"><Clock className="h-10 w-10 opacity-30 mb-3"/><p className="text-sm font-medium">Waitlist is empty</p></div>
            ) : (
              <div className="space-y-3">
                {filteredWaitlist.map((w,i) => (
                  <div key={w.name} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-[#E4B315]/10 text-[#C69A11] text-sm font-extrabold flex items-center justify-center">{i+1}</span>
                      <div>
                        <div className="font-bold text-sm text-[#2D2A26]">{w.customer_name}</div>
                        <div className="text-xs text-gray-400">{w.party_size} · {w.estimated_wait} wait · {w.phone_number}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${w.status==='Seated'?'bg-green-100 text-green-700':'bg-[#E4B315]/10 text-[#C69A11]'}`}>{w.status}</span>
                      {w.status!=='Seated'&&<button onClick={async()=>{ await updateWaitlistStatus(w.name,'Seated'); loadAll(); }} className="p-1.5 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-green-600 transition-colors"><Check className="h-3.5 w-3.5"/></button>}
                      <button onClick={async()=>{ await deleteWaitlistEntry(w.name); loadAll(); }} className="p-1.5 border border-gray-200 rounded-lg hover:border-red-200 hover:text-red-500 text-gray-400 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings tab ── */}
        {activeTab==='settings' && (
          <div className="space-y-5">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-[#2D2A26] flex items-center gap-2 mb-4"><Clock className="h-4 w-4 text-[#C69A11]"/> Operating Hours</h4>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCls}>Opening Time</label><input type="time" value={localSettings.opening_time?.slice(0,5)} onChange={e=>setSetting('opening_time',e.target.value+':00')} className={inputCls}/></div>
                <div><label className={labelCls}>Closing Time</label><input type="time" value={localSettings.closing_time?.slice(0,5)} onChange={e=>setSetting('closing_time',e.target.value+':00')} className={inputCls}/></div>
                <div><label className={labelCls}>Default Duration (min)</label><select value={localSettings.default_reservation_duration} onChange={e=>setSetting('default_reservation_duration',e.target.value)} className={inputCls}><option value="60">1 hour</option><option value="90">1.5 hours</option><option value="120">2 hours</option></select></div>
                <div><label className={labelCls}>Time Slot Interval</label><select value={localSettings.time_slot_interval} onChange={e=>setSetting('time_slot_interval',e.target.value)} className={inputCls}><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">60 minutes</option></select></div>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-[#2D2A26] flex items-center gap-2 mb-4"><Users className="h-4 w-4 text-[#C69A11]"/> Booking Rules</h4>
              <div className="space-y-4">
                <div><label className={labelCls}>Maximum Party Size</label><select value={localSettings.maximum_party_size} onChange={e=>setSetting('maximum_party_size',e.target.value)} className={inputCls}>{PARTY_SIZES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50"><div><div className="text-sm font-semibold text-[#2D2A26]">Allow Same Day Booking</div><div className="text-xs text-gray-400">Customers can book for today</div></div><Toggle checked={Boolean(localSettings.all_same_day_booking)} onChange={v=>setSetting('all_same_day_booking',v?1:0)}/></div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50"><div><div className="text-sm font-semibold text-[#2D2A26]">Require Phone Number</div><div className="text-xs text-gray-400">Make phone number mandatory</div></div><Toggle checked={Boolean(localSettings.require_phone_number)} onChange={v=>setSetting('require_phone_number',v?1:0)}/></div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50"><div><div className="text-sm font-semibold text-[#2D2A26]">Auto-confirm Reservations</div><div className="text-xs text-gray-400">Automatically confirm new reservations</div></div><Toggle checked={Boolean(localSettings.auto_confirm_reservation)} onChange={v=>setSetting('auto_confirm_reservation',v?1:0)}/></div>
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-gray-50"><div><div className="text-sm font-semibold text-[#2D2A26]">Enable Waitlist</div><div className="text-xs text-gray-400">Allow customers to join waitlist</div></div><Toggle checked={Boolean(localSettings.enable_waitlist)} onChange={v=>setSetting('enable_waitlist',v?1:0)}/></div>
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={handleSaveSettings} disabled={savingSettings}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-50">
                {savingSettings&&<div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>}
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {(showAddReservation||editReservation) && (
        <ReservationModal initial={editReservation?{...editReservation} as ReservationForm:{reservation_date:selectedDate}}
          editName={editReservation?.name} tables={tables} timeSlots={timeSlots}
          onClose={()=>{ setShowAddReservation(false); setEditReservation(null); }}
          onSaved={()=>{ loadAll(); loadDateReservations(selectedDate); }}/>
      )}
      {showWaitlistModal && <WaitlistModal onClose={()=>setShowWaitlistModal(false)} onSaved={loadAll}/>}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="font-bold text-[#2D2A26] mb-2">Delete Reservation?</h3>
            <p className="text-sm text-gray-400 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={async()=>{ await deleteReservation(deleteTarget); setDeleteTarget(null); loadAll(); loadDateReservations(selectedDate); }}
                className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Reservations;