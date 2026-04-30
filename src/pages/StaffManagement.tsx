import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Users, Building, Mail, Phone, Calendar, Briefcase,
  DollarSign, Eye, RefreshCw, UserCheck, UserX, AlertCircle,
  Plus, Edit2, X, ChevronRight, ChevronLeft, Check,
  Shield, CreditCard, FileText, UserPlus, Loader2,
  ClipboardList, Clock, TriangleAlert, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────
interface EmployeeOnboarding {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  job_applicant: string;
  job_offer: string;
  company: string;
  boarding_status: string;
  project: string;
  employee_name: string;
  department: string;
  designation: string;
  holiday_list: string;
  date_of_joining: string;
  boarding_begins_on: string;
  notify_users_by_email: number;
  doctype: string;
  activities: any[];
  __last_sync_on: string;
}

interface OnboardingForm {
  employee_name: string;
  job_applicant: string;
  job_offer: string;
  company: string;
  boarding_status: string;
  project: string;
  department: string;
  designation: string;
  holiday_list: string;
  date_of_joining: string;
  boarding_begins_on: string;
  notify_users_by_email: boolean;
}

// ─────────────────────────────────────────────────────
// ERPNext API helpers
// ─────────────────────────────────────────────────────
const API_BASE = '/api/resource';

interface JobApplicant { name: string; applicant_name?: string; }
interface JobOffer { name: string; offer_name?: string; }
interface Company { name: string; company_name?: string; }
interface Department { name: string; department_name?: string; }
interface Designation { name: string; designation_name?: string; }
interface HolidayList { name: string; holiday_list_name?: string; }

const erpFetch = async (url: string, options?: RequestInit) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const csrfToken = (window as any).csrf_token;
  if (csrfToken) headers['X-Frappe-CSRF-Token'] = csrfToken;
  const res = await fetch(url, { headers, credentials: 'include', ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
};

const fetchJobApplicants = async (): Promise<{name: string; label: string}[]> => {
  try {
    const data = await erpFetch(`${API_BASE}/Job%20Applicant?fields=["name","applicant_name"]&limit=100`);
    return data.data?.map((item: JobApplicant) => ({ name: item.name, label: item.applicant_name || item.name })) || [];
  } catch (e: any) { throw new Error(`Failed to load Job Applicants (${e?.message || 'Unknown error'}).`); }
};

const fetchJobOffers = async (): Promise<{name: string; label: string}[]> => {
  try {
    const data = await erpFetch(`${API_BASE}/Job%20Offer?fields=["name"]&limit=100`);
    return data.data?.map((item: JobOffer) => ({ name: item.name, label: item.name })) || [];
  } catch (e: any) { throw new Error(`Failed to load Job Offers (${e?.message || 'Unknown error'}).`); }
};

const fetchCompanies = async (): Promise<{name: string; label: string}[]> => {
  try {
    const data = await erpFetch(`${API_BASE}/Company?fields=["name"]&limit=100`);
    return data.data?.map((item: Company) => ({ name: item.name, label: item.name })) || [];
  } catch (e: any) { throw new Error(`Failed to load Companies (${e?.message || 'Unknown error'}).`); }
};

const fetchDepartments = async (): Promise<{name: string; label: string}[]> => {
  try {
    const data = await erpFetch(`${API_BASE}/Department?fields=["name"]&limit=100`);
    return data.data?.map((item: Department) => ({ name: item.name, label: item.name })) || [];
  } catch (e: any) { throw new Error(`Failed to load Departments (${e?.message || 'Unknown error'}).`); }
};

const fetchDesignations = async (): Promise<{name: string; label: string}[]> => {
  try {
    const data = await erpFetch(`${API_BASE}/Designation?fields=["name"]&limit=100`);
    return data.data?.map((item: Designation) => ({ name: item.name, label: item.name })) || [];
  } catch (e: any) { throw new Error(`Failed to load Designations (${e?.message || 'Unknown error'}).`); }
};

const fetchHolidayLists = async (): Promise<{name: string; label: string}[]> => {
  try {
    const data = await erpFetch(`${API_BASE}/Holiday%20List?fields=["name"]&limit=100`);
    return data.data?.map((item: HolidayList) => ({ name: item.name, label: item.name })) || [];
  } catch (e: any) { throw new Error(`Failed to load Holiday Lists (${e?.message || 'Unknown error'}).`); }
};

const fetchOnboardingRecords = async (): Promise<EmployeeOnboarding[]> => {
  const fields = [
    'name','owner','creation','modified','modified_by','docstatus','idx',
    'job_applicant','job_offer','company','boarding_status','project','employee_name',
    'department','designation','holiday_list','date_of_joining','boarding_begins_on',
    'notify_users_by_email','doctype'
  ];
  const params = new URLSearchParams({ fields: JSON.stringify(fields), limit: '500', order_by: 'creation desc' });
  const data = await erpFetch(`${API_BASE}/Employee%20Onboarding?${params}`);
  return data.data || [];
};

const createOnboardingRecord = async (form: OnboardingForm): Promise<EmployeeOnboarding> => {
  const payload = {
    doctype: 'Employee Onboarding',
    employee_name: form.employee_name,
    job_applicant: form.job_applicant,
    job_offer: form.job_offer,
    company: form.company,
    docstatus: 1,
    boarding_status: form.boarding_status,
    project: form.project,
    department: form.department,
    designation: form.designation,
    holiday_list: form.holiday_list,
    date_of_joining: form.date_of_joining,
    boarding_begins_on: form.boarding_begins_on,
    notify_users_by_email: form.notify_users_by_email ? 1 : 0,
  };
  const data = await erpFetch(`${API_BASE}/Employee%20Onboarding`, { method: 'POST', body: JSON.stringify(payload) });
  return data.data;
};

const updateOnboardingRecord = async (name: string, form: OnboardingForm): Promise<EmployeeOnboarding> => {
  const payload = {
    employee_name: form.employee_name,
    job_applicant: form.job_applicant,
    job_offer: form.job_offer,
    company: form.company,
    boarding_status: form.boarding_status,
    project: form.project,
    department: form.department,
    designation: form.designation,
    holiday_list: form.holiday_list,
    date_of_joining: form.date_of_joining,
    boarding_begins_on: form.boarding_begins_on,
    notify_users_by_email: form.notify_users_by_email ? 1 : 0,
  };
  const data = await erpFetch(`${API_BASE}/Employee%20Onboarding/${encodeURIComponent(name)}`, { method: 'PUT', body: JSON.stringify(payload) });
  return data.data;
};

// ─────────────────────────────────────────────────────
// QUICK CREATE: JOB OFFER MODAL
// ─────────────────────────────────────────────────────
interface QuickJobOfferForm {
  job_applicant: string;
  offer_date: string;
  valid_till: string;
  designation: string;
  company: string;
}

const QuickCreateJobOfferModal: React.FC<{
  jobApplicants: {name: string; label: string}[];
  designations: {name: string; label: string}[];
  companies: {name: string; label: string}[];
  onClose: () => void;
  onCreated: (offer: {name: string; label: string}) => void;
}> = ({ jobApplicants, designations, companies, onClose, onCreated }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<QuickJobOfferForm>({
    job_applicant: '',
    offer_date: '',
    valid_till: '',
    designation: '',
    company: '',
  });
  const set = (p: Partial<QuickJobOfferForm>) => setForm(f => ({ ...f, ...p }));

  const handleCreate = async () => {
    if (!form.job_applicant) { setError('Job applicant is required.'); return; }
    if (!form.offer_date) { setError('Offer date is required.'); return; }
    if (!form.company) { setError('Company is required.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        doctype: 'Job Offer',
        job_applicant: form.job_applicant,
        offer_date: form.offer_date,
        valid_till: form.valid_till || undefined,
        designation: form.designation || undefined,
        company: form.company,
        status: 'Awaiting Response',
      };
      const data = await erpFetch(`${API_BASE}/Job%20Offer`, { method: 'POST', body: JSON.stringify(payload) });
      const created = data.data;
      onCreated({ name: created.name, label: created.name });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create job offer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#E4B315]/10 border border-[#E4B315]/20 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Quick Create — Job Offer</p>
              <p className="text-[10px] text-gray-400">ERPNext · Job Offer Doctype</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Field label="Job Applicant" req>
            <select value={form.job_applicant} onChange={e => set({ job_applicant: e.target.value })} className={inp}>
              <option value="">Select Job Applicant</option>
              {jobApplicants.map(a => <option key={a.name} value={a.name}>{a.label}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Offer Date" req>
              <input type="date" value={form.offer_date} onChange={e => set({ offer_date: e.target.value })} className={inp} />
            </Field>
            <Field label="Valid Till">
              <input type="date" value={form.valid_till} onChange={e => set({ valid_till: e.target.value })} className={inp} />
            </Field>
          </div>
          <Field label="Designation">
            <select value={form.designation} onChange={e => set({ designation: e.target.value })} className={inp}>
              <option value="">Select Designation</option>
              {designations.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
            </select>
          </Field>
          <Field label="Company" req>
            <select value={form.company} onChange={e => set({ company: e.target.value })} className={inp}>
              <option value="">Select Company</option>
              {companies.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
            </select>
          </Field>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-50 transition-opacity">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Creating...' : 'Create Job Offer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// QUICK CREATE: DESIGNATION MODAL
// ─────────────────────────────────────────────────────
const QuickCreateDesignationModal: React.FC<{
  onClose: () => void;
  onCreated: (designation: {name: string; label: string}) => void;
}> = ({ onClose, onCreated }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [designationName, setDesignationName] = useState('');

  const handleCreate = async () => {
    if (!designationName.trim()) { setError('Designation name is required.'); return; }
    setError(''); setSaving(true);
    try {
      const payload = {
        doctype: 'Designation',
        designation_name: designationName.trim(),
      };
      const data = await erpFetch(`${API_BASE}/Designation`, { method: 'POST', body: JSON.stringify(payload) });
      const created = data.data;
      onCreated({ name: created.name, label: created.designation_name || created.name });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create designation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Quick Create — Designation</p>
              <p className="text-[10px] text-gray-400">ERPNext · Designation Doctype</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <Field label="Designation Name" req>
            <input
              value={designationName}
              onChange={e => setDesignationName(e.target.value)}
              placeholder="e.g. Accountant, Software Engineer"
              className={inp}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </Field>
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Creating...' : 'Create Designation'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const statusColor = (status: string) => ({
  'Completed': 'bg-green-100 text-green-700',
  'In Process': 'bg-blue-100 text-blue-700',
  'Pending': 'bg-yellow-100 text-yellow-700',
  'Not Started': 'bg-gray-100 text-gray-600',
}[status] ?? 'bg-gray-100 text-gray-600');

const docStatusColor = (docstatus: number) => ({
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-green-100 text-green-700',
  2: 'bg-red-100 text-red-600',
}[docstatus] ?? 'bg-gray-100 text-gray-600');

// ─────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white';

const Field: React.FC<{ label: string; req?: boolean; span?: boolean; children: React.ReactNode }> = ({ label, req, span, children }) => (
  <div className={span ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────
// ONBOARDING FORM MODAL
// ─────────────────────────────────────────────────────
const OnboardingModal: React.FC<{
  mode: 'add' | 'edit';
  onboarding: EmployeeOnboarding | null;
  onClose: () => void;
  onSaved: (record: EmployeeOnboarding) => void;
  jobApplicants: {name: string; label: string}[];
  jobOffers: {name: string; label: string}[];
  companies: {name: string; label: string}[];
  departments: {name: string; label: string}[];
  designations: {name: string; label: string}[];
  holidayLists: {name: string; label: string}[];
  onJobOfferCreated: (offer: {name: string; label: string}) => void;
  onDesignationCreated: (designation: {name: string; label: string}) => void;
}> = ({
  mode, onboarding, onClose, onSaved,
  jobApplicants, jobOffers, companies, departments, designations, holidayLists,
  onJobOfferCreated, onDesignationCreated,
}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showQuickJobOffer, setShowQuickJobOffer] = useState(false);
  const [showQuickDesignation, setShowQuickDesignation] = useState(false);

  const [form, setForm] = useState<OnboardingForm>(() => onboarding ? {
    employee_name: onboarding.employee_name || '',
    job_applicant: onboarding.job_applicant || '',
    job_offer: onboarding.job_offer || '',
    company: onboarding.company || '',
    boarding_status: onboarding.boarding_status || 'Pending',
    project: onboarding.project || '',
    department: onboarding.department || '',
    designation: onboarding.designation || '',
    holiday_list: onboarding.holiday_list || '',
    date_of_joining: onboarding.date_of_joining || '',
    boarding_begins_on: onboarding.boarding_begins_on || '',
    notify_users_by_email: !!onboarding.notify_users_by_email,
  } : {
    employee_name: '',
    job_applicant: '',
    job_offer: '',
    company: '',
    boarding_status: 'Pending',
    project: '',
    department: '',
    designation: '',
    holiday_list: '',
    date_of_joining: '',
    boarding_begins_on: '',
    notify_users_by_email: false,
  });

  const set = (p: Partial<OnboardingForm>) => setForm(f => ({ ...f, ...p }));

  const handleSave = async () => {
    if (!form.employee_name.trim()) { setError('Employee name is required.'); return; }
    if (!form.date_of_joining) { setError('Date of joining is required.'); return; }
    setError(''); setSaving(true);
    try {
      const result = mode === 'add'
        ? await createOnboardingRecord(form)
        : await updateOnboardingRecord(onboarding!.name, form);
      onSaved(result); onClose();
    } catch (e: any) { setError(e?.message || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleJobOfferCreated = (offer: {name: string; label: string}) => {
    onJobOfferCreated(offer);
    set({ job_offer: offer.name });
  };

  const handleDesignationCreated = (designation: {name: string; label: string}) => {
    onDesignationCreated(designation);
    set({ designation: designation.name });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">
                  {mode === 'add' ? 'Create Staff Record' : `Edit Staff Record — ${onboarding?.name}`}
                </p>
                <p className="text-[10px] text-gray-400">ERPNext · Employee Onboarding Doctype</p>
              </div>
            </div>
            <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Name" req>
                <input value={form.employee_name} onChange={e => set({ employee_name: e.target.value })} className={inp} />
              </Field>
              <Field label="Job Applicant">
                <select value={form.job_applicant} onChange={e => set({ job_applicant: e.target.value })} className={inp}>
                  <option value="">Select Job Applicant</option>
                  {jobApplicants.map(a => <option key={a.name} value={a.name}>{a.label}</option>)}
                </select>
              </Field>

              {/* Job Offer with quick create */}
              <Field label="Job Offer">
                <select
                  value={form.job_offer}
                  onChange={e => {
                    if (e.target.value === '__create__') {
                      setShowQuickJobOffer(true);
                    } else {
                      set({ job_offer: e.target.value });
                    }
                  }}
                  className={inp}
                >
                  <option value="">Select Job Offer</option>
                  {jobOffers.map(o => <option key={o.name} value={o.name}>{o.label}</option>)}
                  <option disabled>──────────────</option>
                  <option value="__create__">+ Create New Job Offer</option>
                </select>
              </Field>

              <Field label="Company">
                <select value={form.company} onChange={e => set({ company: e.target.value })} className={inp}>
                  <option value="">Select Company</option>
                  {companies.map(c => <option key={c.name} value={c.name}>{c.label}</option>)}
                </select>
              </Field>
              <Field label="Boarding Status">
                <select value={form.boarding_status} onChange={e => set({ boarding_status: e.target.value })} className={inp}>
                  <option value="Pending">Pending</option>
                  <option value="In Process">In Process</option>
                  <option value="Completed">Completed</option>
                  <option value="Not Started">Not Started</option>
                </select>
              </Field>
              <Field label="Project">
                <input value={form.project} onChange={e => set({ project: e.target.value })} className={inp} />
              </Field>
              <Field label="Department">
                <select value={form.department} onChange={e => set({ department: e.target.value })} className={inp}>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
                </select>
              </Field>

              {/* Designation with quick create */}
              <Field label="Designation">
                <select value={form.designation} onChange={e => set({ designation: e.target.value })} className={inp}>
                  <option value="">Select Designation</option>
                  {designations.map(d => <option key={d.name} value={d.name}>{d.label}</option>)}
                </select>
                {designations.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowQuickDesignation(true)}
                    className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 border border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    No designations found — Quick Create Designation
                  </button>
                )}
              </Field>

              <Field label="Holiday List">
                <select value={form.holiday_list} onChange={e => set({ holiday_list: e.target.value })} className={inp}>
                  <option value="">Select Holiday List</option>
                  {holidayLists.map(h => <option key={h.name} value={h.name}>{h.label}</option>)}
                </select>
              </Field>
              <Field label="Date of Joining" req>
                <input type="date" value={form.date_of_joining} onChange={e => set({ date_of_joining: e.target.value })} className={inp} />
              </Field>
              <Field label="Boarding Begins On">
                <input type="date" value={form.boarding_begins_on} onChange={e => set({ boarding_begins_on: e.target.value })} className={inp} />
              </Field>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notify_users_by_email}
                  onChange={e => set({ notify_users_by_email: e.target.checked })}
                  className="rounded accent-amber-500"
                />
                Notify users by email
              </label>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving...' : mode === 'add' ? 'Create Record' : 'Update Record'}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Create Modals rendered at z-[60] above the onboarding modal */}
      {showQuickJobOffer && (
        <QuickCreateJobOfferModal
          jobApplicants={jobApplicants}
          designations={designations}
          companies={companies}
          onClose={() => setShowQuickJobOffer(false)}
          onCreated={handleJobOfferCreated}
        />
      )}
      {showQuickDesignation && (
        <QuickCreateDesignationModal
          onClose={() => setShowQuickDesignation(false)}
          onCreated={handleDesignationCreated}
        />
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────────────
const DetailModal: React.FC<{
  record: EmployeeOnboarding;
  onClose: () => void;
  onEdit: () => void;
}> = ({ record, onClose, onEdit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
            {record.employee_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">{record.employee_name}</p>
            <p className="text-xs text-gray-400">#{record.name}</p>
          </div>
          <span className={`ml-2 px-3 py-0.5 rounded-full text-xs font-semibold ${statusColor(record.boarding_status)}`}>{record.boarding_status}</span>
          <span className={`ml-2 px-3 py-0.5 rounded-full text-xs font-semibold ${docStatusColor(record.docstatus)}`}>
            {record.docstatus === 0 ? 'Draft' : record.docstatus === 1 ? 'Submitted' : 'Cancelled'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors">
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Basic Information', icon: Users, fields: [
            ['Record ID', record.name],
            ['Employee Name', record.employee_name],
            ['Job Applicant', record.job_applicant || 'N/A'],
            ['Job Offer', record.job_offer || 'N/A'],
            ['Company', record.company],
            ['Boarding Status', record.boarding_status],
            ['Project', record.project || 'N/A'],
          ]},
          { title: 'Employment Details', icon: Briefcase, fields: [
            ['Department', record.department || 'N/A'],
            ['Designation', record.designation || 'N/A'],
            ['Holiday List', record.holiday_list || 'N/A'],
            ['Date of Joining', formatDate(record.date_of_joining)],
            ['Boarding Begins On', formatDate(record.boarding_begins_on)],
            ['Notify by Email', record.notify_users_by_email ? 'Yes' : 'No'],
          ]},
          { title: 'System Information', icon: FileText, fields: [
            ['Created On', formatDate(record.creation)],
            ['Modified On', formatDate(record.modified)],
            ['Modified By', record.modified_by],
            ['Document Status', record.docstatus === 0 ? 'Draft' : record.docstatus === 1 ? 'Submitted' : 'Cancelled'],
            ['Owner', record.owner],
          ]},
        ].map(({ title, icon: Icon, fields }) => (
          <div key={title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Icon className="w-4 h-4 text-amber-500" /> {title}
            </h3>
            <div className="space-y-2">
              {fields.map(([label, value]) => (
                <div key={label} className="flex justify-between items-start gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-xs font-medium text-gray-700 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// MAIN STAFF MANAGEMENT PAGE
// ─────────────────────────────────────────────────────
const StaffManagementPage: React.FC = () => {
  const [records, setRecords] = useState<EmployeeOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState('');
  const [onboardingModal, setOnboardingModal] = useState<{ mode: 'add' | 'edit'; record: EmployeeOnboarding | null } | null>(null);
  const [detailRecord, setDetailRecord] = useState<EmployeeOnboarding | null>(null);

  const [jobApplicants, setJobApplicants] = useState<{name: string; label: string}[]>([]);
  const [jobOffers, setJobOffers] = useState<{name: string; label: string}[]>([]);
  const [companies, setCompanies] = useState<{name: string; label: string}[]>([]);
  const [departments, setDepartments] = useState<{name: string; label: string}[]>([]);
  const [designations, setDesignations] = useState<{name: string; label: string}[]>([]);
  const [holidayLists, setHolidayLists] = useState<{name: string; label: string}[]>([]);

  const loadRecords = useCallback(async () => {
    setLoading(true); setError('');
    try { setRecords(await fetchOnboardingRecords()); }
    catch (e: any) { setError('Failed to load staff records from ERPNext.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [applicants, offers, comps, depts, desigs, holidays] = await Promise.all([
          fetchJobApplicants(), fetchJobOffers(), fetchCompanies(),
          fetchDepartments(), fetchDesignations(), fetchHolidayLists()
        ]);
        setJobApplicants(applicants);
        setJobOffers(offers);
        setCompanies(comps);
        setDepartments(depts);
        setDesignations(desigs);
        setHolidayLists(holidays);
      } catch (e: any) {
        setError('Failed to load dropdown data. Please check your network connection.');
      }
    };
    loadDropdownData();
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const filtered = records.filter(r => {
    const q = searchTerm.toLowerCase();
    return (!q || [r.employee_name, r.name, r.department, r.designation, r.company].some(v => v?.toLowerCase().includes(q)))
      && (!filterStatus || r.boarding_status === filterStatus);
  });

  const stats = {
    total: records.length,
    completed: records.filter(r => r.boarding_status === 'Completed').length,
    inProgress: records.filter(r => r.boarding_status === 'In Process').length,
    pending: records.filter(r => r.boarding_status === 'Pending').length,
  };

  const handleSaved = (record: EmployeeOnboarding) =>
    setRecords(prev => {
      const idx = prev.findIndex(r => r.name === record.name);
      if (idx >= 0) { const next = [...prev]; next[idx] = record; return next; }
      return [record, ...prev];
    });

  // Handlers to add newly created items to dropdown lists
  const handleJobOfferCreated = (offer: {name: string; label: string}) =>
    setJobOffers(prev => [...prev, offer]);

  const handleDesignationCreated = (designation: {name: string; label: string}) =>
    setDesignations(prev => [...prev, designation]);

  return (
    <PageLayout
      title="Staff Management"
      subtitle="Manage employee onboarding and staff records"
      actions={
        <div className="flex gap-2">
          <button onClick={loadRecords} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-100 bg-white text-gray-600 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E4B315]' : ''}`} /> Refresh
          </button>
          <button onClick={() => setOnboardingModal({ mode: 'add', record: null })} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90">
            <UserPlus className="w-4 h-4" /> Add Staff Record
          </button>
        </div>
      }
    >
    <div className="overflow-auto px-6 py-5 space-y-5 h-full" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {error && (
        <div className="mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Records', value: stats.total, Icon: Users, color: 'text-gray-700' },
          { label: 'Completed', value: stats.completed, Icon: UserCheck, color: 'text-green-600' },
          { label: 'In Process', value: stats.inProgress, Icon: Clock, color: 'text-blue-500' },
          { label: 'Pending', value: stats.pending, Icon: TriangleAlert, color: 'text-orange-500' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#E4B315]/30 hover:shadow-md transition-all">
            <div className="flex justify-between items-start">
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-2xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search staff records..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 bg-white transition-colors">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Process">In Process</option>
            <option value="Completed">Completed</option>
            <option value="Not Started">Not Started</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#C69A11]">Staff Onboarding Records</h3>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full sticky">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Employee','Department','Designation','Status','Join Date','Boarding Date','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" /> Loading from ERPNext...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No staff records found</td>
                </tr>
              ) : filtered.map(record => (
                <tr key={record.name} className="hover:bg-[#E4B315]/3 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E4B315]/15 flex items-center justify-center text-[#C69A11] text-xs font-extrabold flex-shrink-0">
                        {record.employee_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{record.employee_name}</p>
                        <p className="text-xs text-gray-400">#{record.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.department || 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{record.designation || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(record.boarding_status)}`}>
                      {record.boarding_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(record.date_of_joining)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(record.boarding_begins_on)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setDetailRecord(record)} className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#C69A11] hover:bg-[#E4B315]/10 transition-colors" title="View">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setOnboardingModal({ mode: 'edit', record })} className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#C69A11] hover:bg-[#E4B315]/10 transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
            Showing {filtered.length} of {records.length} records
          </div>
        )}
      </div>

      {/* Modals */}
      {onboardingModal && (
        <OnboardingModal
          mode={onboardingModal.mode}
          onboarding={onboardingModal.record}
          onClose={() => setOnboardingModal(null)}
          onSaved={handleSaved}
          jobApplicants={jobApplicants}
          jobOffers={jobOffers}
          companies={companies}
          departments={departments}
          designations={designations}
          holidayLists={holidayLists}
          onJobOfferCreated={handleJobOfferCreated}
          onDesignationCreated={handleDesignationCreated}
        />
      )}
      {detailRecord && (
        <DetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onEdit={() => {
            setOnboardingModal({ mode: 'edit', record: detailRecord });
            setDetailRecord(null);
          }}
        />
      )}
    </div>
    </PageLayout>
  );
};

export default StaffManagementPage;