import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Users, Mail, Phone, Calendar, Briefcase,
  DollarSign, Eye, RefreshCw, UserCheck, AlertCircle,
  Edit2, X, ChevronRight, ChevronLeft, Check,
  Shield, CreditCard, FileText, UserPlus, Loader2,
  ClipboardList, Clock, TriangleAlert, Plus, CheckCircle2
} from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────
interface Employee {
  name: string; employee_name: string; first_name: string; last_name: string;
  middle_name?: string; company: string; department: string; designation: string;
  branch: string; holiday_list?: string; status: string; date_of_joining: string; date_of_birth: string;
  gender: string; cell_number: string; personal_email: string; company_email: string;
  reports_to: string; employment_type: string; basic_salary?: number;
  creation: string; modified: string;
  pan_number?: string; pf_number?: string; esi_number?: string;
  bank_name?: string; bank_ac_no?: string; ifsc_code?: string; user_id?: string;
  nationality?: string;
}

interface Department { name: string; department_name?: string; }
interface Designation { name: string; designation_name?: string; }
interface Branch { name: string; branch?: string; }
interface HolidayList { name: string; holiday_list_name?: string; }
interface Company { name: string; company_name?: string; }

interface ContractFulfilmentItem {
  name: string; idx: number; fulfilled: number;
  requirement: string; notes: string; parent: string; doctype: string;
}

// ERPNext Contract doctype — party_type = Employee
interface Contract {
  name: string; party_type: string; party_name: string; party_full_name: string;
  party_user?: string; status: string; fulfilment_status?: string;
  start_date: string; end_date?: string; contract_terms?: string;
  requires_fulfilment?: number; fulfilment_deadline?: string;
  is_signed?: number; signee?: string; signed_on?: string;
  signee_company?: string; signed_by_company?: string;
  docstatus: number; creation: string; modified: string;
  fulfilment_terms?: ContractFulfilmentItem[];
}

interface ContractForm {
  party_name: string; start_date: string; end_date: string; status: string;
  contract_terms: string; requires_fulfilment: boolean; fulfilment_deadline: string;
  is_signed: boolean; signee: string; signee_company: string;
  fulfilment_terms: { requirement: string; notes: string; fulfilled: boolean }[];
}

interface EmployeeForm {
  first_name: string; last_name: string; middle_name: string;
  date_of_birth: string; gender: string; nationality: string;
  pan_number: string; pf_number: string; esi_number: string;
  bank_name: string; bank_ac_no: string; ifsc_code: string;
  personal_email: string; company_email: string; cell_number: string;
  department: string; designation: string; branch: string; holiday_list: string; company: string;
  employment_type: string; date_of_joining: string; reports_to: string;
  contract_type: string; contract_end_date: string; notice_number_of_days: string;
}

interface EmployeeApiResponse {
  success: boolean;
  message: string;
  error?: string;
  data?: Employee;
}

const EMPTY_EMP_FORM: EmployeeForm = {
  first_name: '', last_name: '', middle_name: '', date_of_birth: '', gender: '', nationality: 'Kenyan',
  pan_number: '', pf_number: '', esi_number: '',
  bank_name: '', bank_ac_no: '', ifsc_code: '',
  personal_email: '', company_email: '', cell_number: '',
  department: '', designation: '', branch: '', holiday_list: '', company: '', employment_type: 'Full-time',
  date_of_joining: '', reports_to: '',
  contract_type: '', contract_end_date: '', notice_number_of_days: '',
};

const EMPTY_CONTRACT_FORM: ContractForm = {
  party_name: '', start_date: '', end_date: '', status: 'Active',
  contract_terms: '', requires_fulfilment: false, fulfilment_deadline: '',
  is_signed: false, signee: '', signee_company: '', fulfilment_terms: [],
};

// ─────────────────────────────────────────────────────────────
// ERPNext API helpers
// ─────────────────────────────────────────────────────────────
const API_BASE = '/api/resource';

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

const fetchEmployees = async (): Promise<Employee[]> => {
  const fields = [
    'name','employee_name','first_name','last_name','middle_name','company','department','designation',
    'branch','holiday_list','status','date_of_joining','date_of_birth','gender','cell_number',
    'personal_email','company_email','reports_to','employment_type','creation','modified',
    'user_id','bank_name','bank_ac_no'
  ];
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    limit: '500',
    order_by: 'creation desc',
  });
  const data = await erpFetch(`${API_BASE}/Employee?${params}`);
  return data.data || [];
};

const fetchEmployeesForReportsTo = async (): Promise<Employee[]> => {
  const fields = ['name','employee_name','first_name','last_name','department','designation'];
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify({ status: 'Active' }),
    limit: '500',
    order_by: 'employee_name asc',
  });
  const data = await erpFetch(`${API_BASE}/Employee?${params}`);
  return data.data || [];
};

const fetchDepartments = async (): Promise<Department[]> => {
  const data = await erpFetch(`${API_BASE}/Department?fields=["name","department_name"]&limit=100`);
  return data.data || [];
};

const fetchDesignations = async (): Promise<Designation[]> => {
  const data = await erpFetch(`${API_BASE}/Designation?fields=["name","designation_name"]&limit=100`);
  return data.data || [];
};

const fetchBranches = async (): Promise<Branch[]> => {
  const data = await erpFetch(`${API_BASE}/Branch?fields=["name","branch"]&limit=100`);
  return data.data || [];
};

const fetchHolidayLists = async (): Promise<HolidayList[]> => {
  const data = await erpFetch(`${API_BASE}/Holiday%20List?fields=["name","holiday_list_name"]&limit=100`);
  return data.data || [];
};

const fetchCompanies = async (): Promise<Company[]> => {
  const data = await erpFetch(`${API_BASE}/Company?fields=["name","company_name"]&limit=100`);
  return data.data || [];
};

const createEmployee = async (form: EmployeeForm): Promise<EmployeeApiResponse> => {
  const payload = {
    first_name: form.first_name, 
    last_name: form.last_name, 
    middle_name: form.middle_name,
    date_of_birth: form.date_of_birth || undefined, 
    gender: form.gender,
    nationality: form.nationality,
    date_of_joining: form.date_of_joining || new Date().toISOString().split('T')[0],
    company: form.company || undefined,
    department: form.department || undefined, 
    designation: form.designation || undefined,
    branch: form.branch || undefined, 
    holiday_list: form.holiday_list || undefined,
    employment_type: form.employment_type,
    personal_email: form.personal_email, 
    company_email: form.company_email, 
    cell_number: form.cell_number,
    reports_to: form.reports_to || undefined,
 
    bank_name: form.bank_name, 
    bank_ac_no: form.bank_ac_no, 
    // bank_branch_name: form.bank_branch_name,
    status: 'Active',
  };
  
  const data = await erpFetch(`/api/method/quantbit_ury_customization.ury_customization.employee_api.create_employee_with_permissions`, {
    method: 'POST',
    body: JSON.stringify({ employee_data: payload }),
  });
  
  if (!data.message || !data.message.success) {
    // Extract the actual error message from server response
    const errorMessage = data.message?.message || data.message?.error || 'Failed to create employee';
    throw new Error(errorMessage);
  }
  
  return data.message;
};

const updateEmployee = async (name: string, form: EmployeeForm): Promise<Employee> => {
  const payload = {
    first_name: form.first_name, 
    last_name: form.last_name, 
    middle_name: form.middle_name,
    date_of_birth: form.date_of_birth || undefined, 
    gender: form.gender,
    nationality: form.nationality,
    date_of_joining: form.date_of_joining || undefined,
    department: form.department || undefined, 
    designation: form.designation || undefined,
    branch: form.branch || undefined,
    holiday_list: form.holiday_list || undefined,
    employment_type: form.employment_type,
    personal_email: form.personal_email, 
    company_email: form.company_email, 
    cell_number: form.cell_number,
    reports_to: form.reports_to || undefined,
  
    bank_name: form.bank_name, 
    bank_ac_no: form.bank_ac_no, 
   
    // bank_branch_name: form.bank_branch_name,
  };
  
  const data = await erpFetch(`/api/method/quantbit_ury_customization.ury_customization.employee_api.update_employee_with_permissions`, {
    method: 'POST',
    body: JSON.stringify({ 
      employee_name: name,
      employee_data: payload 
    }),
  });
  
  if (!data.message || !data.message.success) {
    // Extract the actual error message from server response
    const errorMessage = data.message?.message || data.message?.error || 'Failed to update employee';
    throw new Error(errorMessage);
  }
  
  return data.message.data;
};

// Contract APIs — uses ERPNext Contract doctype
const fetchContracts = async (): Promise<Contract[]> => {
  const fields = [
    'name','party_type','party_name','party_full_name','party_user','status',
    'fulfilment_status','start_date','end_date','contract_terms','requires_fulfilment',
    'fulfilment_deadline','is_signed','signee','signed_on','signee_company',
    'signed_by_company','docstatus','creation','modified',
  ];
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify([['party_type', '=', 'Employee']]),
    limit: '500',
    order_by: 'creation desc',
  });
  const data = await erpFetch(`${API_BASE}/Contract?${params}`);
  return data.data || [];
};

const fetchContractDetail = async (name: string): Promise<Contract> => {
  const data = await erpFetch(`${API_BASE}/Contract/${encodeURIComponent(name)}`);
  return data.data;
};

const createContract = async (form: ContractForm): Promise<Contract> => {
  const payload = {
    party_type: 'Employee',
    party_name: form.party_name,
    start_date: form.start_date,
    end_date: form.end_date || undefined,
    status: form.status,
    contract_terms: form.contract_terms,
    requires_fulfilment: form.requires_fulfilment ? 1 : 0,
    fulfilment_deadline: form.fulfilment_deadline || undefined,
    is_signed: form.is_signed ? 1 : 0,
    signee: form.signee,
    signee_company: form.signee_company,
    fulfilment_terms: form.fulfilment_terms.map((t, i) => ({
      idx: i + 1, requirement: t.requirement, notes: t.notes, fulfilled: t.fulfilled ? 1 : 0,
    })),
  };
  
  const data = await erpFetch(`/api/method/quantbit_ury_customization.ury_customization.contract_api.create_contract_with_permissions`, {
    method: 'POST',
    body: JSON.stringify({ contract_data: payload }),
  });
  
  if (!data.message || !data.message.success) {
    const errorMessage = data.message?.message || data.message?.error || 'Failed to create contract';
    throw new Error(errorMessage);
  }
  
  return data.message.data;
};

const updateContract = async (name: string, form: ContractForm): Promise<Contract> => {
  const payload = {
    start_date: form.start_date, end_date: form.end_date || undefined,
    status: form.status, contract_terms: form.contract_terms,
    requires_fulfilment: form.requires_fulfilment ? 1 : 0,
    fulfilment_deadline: form.fulfilment_deadline || undefined,
    is_signed: form.is_signed ? 1 : 0,
    signee: form.signee, signee_company: form.signee_company,
    fulfilment_terms: form.fulfilment_terms.map((t, i) => ({
      idx: i + 1, requirement: t.requirement, notes: t.notes, fulfilled: t.fulfilled ? 1 : 0,
    })),
  };
  
  const data = await erpFetch(`/api/method/quantbit_ury_customization.ury_customization.contract_api.update_contract_with_permissions`, {
    method: 'POST',
    body: JSON.stringify({ 
      contract_name: name,
      contract_data: payload 
    }),
  });
  
  if (!data.message || !data.message.success) {
    const errorMessage = data.message?.message || data.message?.error || 'Failed to update contract';
    throw new Error(errorMessage);
  }
  
  return data.message.data;
};

const cancelContract = async (name: string): Promise<void> => {
  await erpFetch(`/api/method/frappe.client.cancel`, {
    method: 'POST',
    body: JSON.stringify({ doctype: 'Contract', name }),
  });
};

// ─────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return 'N/A';
  try { return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const statusColor = (s: string) => ({
  Active: 'bg-green-100 text-green-700',
  Left: 'bg-red-100 text-red-600',
  Suspended: 'bg-yellow-100 text-yellow-700',
  Inactive: 'bg-gray-100 text-gray-500',
  Expired: 'bg-red-100 text-red-600',
}[s] ?? 'bg-gray-100 text-gray-600');

const contractBadgeColor = (c: Contract) => {
  if (c.docstatus === 2) return 'bg-red-100 text-red-600';
  if (c.status === 'Active') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-500';
};

const contractLabel = (c: Contract) => c.docstatus === 2 ? 'Terminated' : c.status;

const docStatusLabel = (s: number) => ['Draft', 'Submitted', 'Cancelled'][s] ?? 'Unknown';

const initials = (e: Employee) =>
  `${(e.first_name || e.employee_name || '?')[0]}${(e.last_name || '')[0] || ''}`.toUpperCase();

const stripHtml = (html: string) => (html || '').replace(/<[^>]+>/g, '').trim();

const isExpiringSoon = (end_date?: string) => {
  if (!end_date) return false;
  const diff = new Date(end_date).getTime() - Date.now();
  return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
};

// ─────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors bg-white text-[#2D2A26]';

const Fld: React.FC<{ label: string; req?: boolean; span?: boolean; children: React.ReactNode }> = ({ label, req, span, children }) => (
  <div className={span ? 'col-span-2' : ''}>
    <label className="block text-xs font-medium text-gray-600 mb-1">
      {label}{req && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// EMPLOYEE MODAL — 6-step wizard
// ─────────────────────────────────────────────────────────────
const EMP_STEPS = [
  { key: 'personal',   label: 'Personal',   Icon: Users },
  { key: 'compliance', label: 'Compliance', Icon: Shield },
  { key: 'banking',    label: 'Banking',    Icon: CreditCard },
  { key: 'contact',    label: 'Contact',    Icon: Phone },
  { key: 'employment', label: 'Employment', Icon: Briefcase },
  { key: 'contract',   label: 'Contract',   Icon: FileText },
];

const EmpStepIndicator: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-start gap-0 mb-5 overflow-x-auto pb-1">
    {EMP_STEPS.map(({ key, label, Icon }, i) => {
      const done = i < current, active = i === current;
      return (
        <React.Fragment key={key}>
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${done ? 'bg-gradient-to-br from-[#E4B315] to-[#C69A11] border-[#C69A11]' : active ? 'border-[#E4B315] bg-white' : 'border-gray-200 bg-white'}`}>
              {done ? <Check className="w-4 h-4 text-white" /> : <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#C69A11]' : 'text-gray-300'}`} />}
            </div>
            <p className={`text-[10px] font-semibold text-center ${active ? 'text-[#C69A11]' : done ? 'text-[#C69A11]' : 'text-gray-400'}`}>{label}</p>
          </div>
          {i < EMP_STEPS.length - 1 && <div className={`h-0.5 w-6 mt-4 flex-shrink-0 ${i < current ? 'bg-[#E4B315]' : 'bg-gray-200'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

const EmployeeModal: React.FC<{
  mode: 'add' | 'edit'; employee: Employee | null;
  departments: Department[]; designations: Designation[]; branches: Branch[]; holidayLists: HolidayList[]; companies: Company[]; employeesForReportsTo: Employee[];
  onClose: () => void; onSaved: (emp: Employee) => void;
}> = ({ mode, employee, departments, designations, branches, holidayLists, companies, employeesForReportsTo, onClose, onSaved }) => {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<EmployeeForm>(() => employee ? {
    first_name: employee.first_name || '', last_name: employee.last_name || '',
    middle_name: employee.middle_name || '', date_of_birth: employee.date_of_birth || '',
    gender: employee.gender || '', nationality: 'Kenyan',
    pan_number: employee.pan_number || '', pf_number: employee.pf_number || '', esi_number: employee.esi_number || '',
    bank_name: employee.bank_name || '', bank_ac_no: employee.bank_ac_no || '', ifsc_code: employee.ifsc_code || '',
    personal_email: employee.personal_email || '', company_email: employee.company_email || '',
    cell_number: employee.cell_number || '', department: employee.department || '',
    designation: employee.designation || '', branch: employee.branch || '', holiday_list: employee.holiday_list || '', company: employee.company || '',
    employment_type: employee.employment_type || 'Full-time', date_of_joining: employee.date_of_joining || '',
    reports_to: employee.reports_to || '', contract_type: '', contract_end_date: '', notice_number_of_days: '',
  } : { ...EMPTY_EMP_FORM });

  const set = (p: Partial<EmployeeForm>) => setForm(f => ({ ...f, ...p }));
  const progress = Math.round(((step + 1) / EMP_STEPS.length) * 100);

  const handleSave = async () => {
    if (!form.first_name.trim()) { setError('First name is required.'); return; }
    if (!form.date_of_joining) { setError('Date of joining is required.'); return; }
    setError(''); setSaving(true);
    try {
      if (mode === 'add') {
        const result = await createEmployee(form);
        // createEmployee returns EmployeeApiResponse
        if (result && result.success && result.data) {
          onSaved(result.data); onClose();
        } else {
          const errorMessage = result?.message || result?.error || 'Save failed.';
          setError(errorMessage);
        }
      } else {
        const result = await updateEmployee(employee!.name, form);
        // updateEmployee returns Employee directly
        if (result) {
          onSaved(result); onClose();
        } else {
          setError('Update failed.');
        }
      }
    } catch (e: any) { 
      let errorMessage = 'Save failed.';
      
      // Handle different error response structures
      if (typeof e === 'string') {
        errorMessage = e;
      } else if (e?.message) {
        // Check if message is nested
        if (typeof e.message === 'object' && e.message.message) {
          errorMessage = e.message.message;
        } else {
          errorMessage = e.message;
        }
      } else if (e?.error) {
        errorMessage = e.error;
      } else if (e?._server_messages) {
        try {
          const serverMessages = JSON.parse(e._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const firstMessage = JSON.parse(serverMessages[0]);
            errorMessage = firstMessage.message || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse _server_messages:', parseError);
        }
      } else if (typeof e === 'object') {
        errorMessage = JSON.stringify(e);
      }
      setError(errorMessage); 
    }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#E4B315]/10 border border-[#E4B315]/20 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-[#C69A11]" /></div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{mode === 'add' ? 'Add New Employee' : `Edit — ${employee?.employee_name}`}</p>
              <p className="text-[10px] text-gray-400">ERPNext · Employee Doctype</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-6 pt-4">
          <EmpStepIndicator current={step} />
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Step {step + 1} of {EMP_STEPS.length}</span><span>{progress}% Complete</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 mb-4">
            <div className="h-1.5 rounded-full bg-amber-400 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            {step === 0 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Employee Number</label>
                  <input disabled value="Auto-generated" className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Automatically generated</p>
                </div>
                <Fld label="First Name" req><input value={form.first_name} onChange={e => set({ first_name: e.target.value })} className={inp} /></Fld>
                <Fld label="Last Name" req><input value={form.last_name} onChange={e => set({ last_name: e.target.value })} className={inp} /></Fld>
                <Fld label="Middle Name"><input value={form.middle_name} onChange={e => set({ middle_name: e.target.value })} className={inp} /></Fld>
                <Fld label="Date of Birth"><input type="date" value={form.date_of_birth} onChange={e => set({ date_of_birth: e.target.value })} className={inp} /></Fld>
                <Fld label="Gender">
                  <select value={form.gender} onChange={e => set({ gender: e.target.value })} className={inp}>
                    <option value="">Select</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </Fld>
                <Fld label="Nationality" span><input value={form.nationality} onChange={e => set({ nationality: e.target.value })} className={inp} /></Fld>
              </div>
            )}
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                {([['pan_number','KRA PIN / PAN'],['pf_number','NSSF / PF Number'],['esi_number','NHIF / ESI Number']] as [keyof EmployeeForm, string][]).map(([k, l]) => (
                  <Fld key={k} label={l}><input value={form[k] as string} onChange={e => set({ [k]: e.target.value })} className={inp} /></Fld>
                ))}
              </div>
            )}
            {step === 2 && (
              <div className="grid grid-cols-2 gap-4">
                <Fld label="Bank Name" span><input value={form.bank_name} onChange={e => set({ bank_name: e.target.value })} className={inp} /></Fld>
                <Fld label="Account Number"><input value={form.bank_ac_no} onChange={e => set({ bank_ac_no: e.target.value })} className={inp} /></Fld>
                <Fld label="IFSC / Branch Code"><input value={form.ifsc_code} onChange={e => set({ ifsc_code: e.target.value })} className={inp} /></Fld>
                {/* <Fld label="Branch Name"><input value={form.bank_branch_name} onChange={e => set({ bank_branch_name: e.target.value })} className={inp} /></Fld> */}
              </div>
            )}
            {step === 3 && (
              <div className="grid grid-cols-2 gap-4">
                <Fld label="Personal Email"><input type="email" value={form.personal_email} onChange={e => set({ personal_email: e.target.value })} className={inp} /></Fld>
                <Fld label="Company Email"><input type="email" value={form.company_email} onChange={e => set({ company_email: e.target.value })} className={inp} /></Fld>
                <Fld label="Phone / Cell" span><input value={form.cell_number} onChange={e => set({ cell_number: e.target.value })} className={inp} /></Fld>
              </div>
            )}
            {step === 4 && (
              <div className="grid grid-cols-2 gap-4">
                <Fld label="Company">
                  <select value={form.company} onChange={e => set({ company: e.target.value })} className={inp}>
                    <option value="">Select</option>{companies.map(c => <option key={c.name} value={c.name}>{c.company_name || c.name}</option>)}
                  </select>
                </Fld>
                <Fld label="Department">
                  <select value={form.department} onChange={e => set({ department: e.target.value })} className={inp}>
                    <option value="">Select</option>{departments.map(d => <option key={d.name} value={d.name}>{d.department_name || d.name}</option>)}
                  </select>
                </Fld>
                <Fld label="Designation">
                  <select value={form.designation} onChange={e => set({ designation: e.target.value })} className={inp}>
                    <option value="">Select</option>{designations.map(d => <option key={d.name} value={d.name}>{d.designation_name || d.name}</option>)}
                  </select>
                </Fld>
                <Fld label="Branch">
                  <select value={form.branch} onChange={e => set({ branch: e.target.value })} className={inp}>
                    <option value="">Select</option>{branches.map(b => <option key={b.name} value={b.name}>{b.branch || b.name}</option>)}
                  </select>
                </Fld>
                <Fld label="Holiday List">
                  <select value={form.holiday_list} onChange={e => set({ holiday_list: e.target.value })} className={inp}>
                    <option value="">Select</option>{holidayLists.map(h => <option key={h.name} value={h.name}>{h.holiday_list_name || h.name}</option>)}
                  </select>
                </Fld>
                <Fld label="Employment Type">
                  <select value={form.employment_type} onChange={e => set({ employment_type: e.target.value })} className={inp}>
                    {['Full-time','Part-time','Contract','Intern','Probation'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Date of Joining" req><input type="date" value={form.date_of_joining} onChange={e => set({ date_of_joining: e.target.value })} className={inp} /></Fld>
                <Fld label="Reports To">
                  <select value={form.reports_to} onChange={e => set({ reports_to: e.target.value })} className={inp}>
                    <option value="">Select</option>
                    {employeesForReportsTo.map(emp => (
                      <option key={emp.name} value={emp.name}>
                        {emp.employee_name} ({emp.name}) - {emp.designation || 'No Designation'}
                      </option>
                    ))}
                  </select>
                </Fld>
              </div>
            )}
            {step === 5 && (
              <div className="grid grid-cols-2 gap-4">
                <Fld label="Contract Type">
                  <select value={form.contract_type} onChange={e => set({ contract_type: e.target.value })} className={inp}>
                    <option value="">Select</option>{['Permanent','Fixed Term','Casual'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </Fld>
                <Fld label="Contract End Date"><input type="date" value={form.contract_end_date} onChange={e => set({ contract_end_date: e.target.value })} className={inp} /></Fld>
                <Fld label="Notice Period (days)" span><input type="number" value={form.notice_number_of_days} onChange={e => set({ notice_number_of_days: e.target.value })} className={inp} /></Fld>
              </div>
            )}
          </div>
          {error && <div className="mt-3 flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"><ChevronLeft className="w-4 h-4" />Back</button>}
            {step < EMP_STEPS.length - 1
              ? <button onClick={() => setStep(s => s + 1)} className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600">Next<ChevronRight className="w-4 h-4" /></button>
              : <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-5 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Employee'}
                </button>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// EMPLOYEE DETAIL MODAL
// ─────────────────────────────────────────────────────────────
const EmployeeDetailModal: React.FC<{ employee: Employee; onClose: () => void; onEdit: () => void }> = ({ employee, onClose, onEdit }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold">{initials(employee)}</div>
          <div><p className="font-semibold text-gray-800">{employee.employee_name}</p><p className="text-xs text-gray-400">#{employee.name}</p></div>
          <span className={`ml-2 px-3 py-0.5 rounded-full text-xs font-semibold ${statusColor(employee.status)}`}>{employee.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"><Edit2 className="w-3.5 h-3.5" />Edit</button>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Personal', icon: Users, fields: [['Employee ID',employee.name],['Full Name',employee.employee_name],['DOB',formatDate(employee.date_of_birth)],['Gender',employee.gender||'N/A']] },
          { title: 'Employment', icon: Briefcase, fields: [['Company',employee.company],['Department',employee.department||'N/A'],['Designation',employee.designation||'N/A'],['Branch',employee.branch||'N/A'],['Type',employee.employment_type],['Reports To',employee.reports_to||'N/A']] },
          { title: 'Contact', icon: Phone, fields: [['Personal Email',employee.personal_email||'N/A'],['Company Email',employee.company_email||'N/A'],['Phone',employee.cell_number||'N/A']] },
          { title: 'Compliance', icon: Shield, fields: [['KRA PIN',employee.pan_number||'N/A'],['NSSF/PF',employee.pf_number||'N/A'],['NHIF/ESI',employee.esi_number||'N/A']] },
          { title: 'Banking', icon: CreditCard, fields: [['Bank Name',employee.bank_name||'N/A'],['Account Number',employee.bank_ac_no||'N/A'],['IFSC / Branch Code',employee.ifsc_code||'N/A']] },
          { title: 'Dates', icon: Calendar, fields: [['Joined',formatDate(employee.date_of_joining)],['Created',formatDate(employee.creation)],['Modified',formatDate(employee.modified)]] },
        ].map(({ title, icon: Icon, fields }) => (
          <div key={title} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3"><Icon className="w-4 h-4 text-amber-500" />{title}</h3>
            <div className="space-y-2">
              {fields.map(([l, v]) => (
                <div key={l} className="flex justify-between gap-2">
                  <span className="text-xs text-gray-400 flex-shrink-0">{l}</span>
                  <span className="text-xs font-medium text-gray-700 text-right">{v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// CONTRACT FORM MODAL — Create / Edit
// Maps directly to ERPNext Contract doctype fields
// ─────────────────────────────────────────────────────────────
const ContractFormModal: React.FC<{
  mode: 'add' | 'edit'; contract: Contract | null; employees: Employee[];
  onClose: () => void; onSaved: (c: Contract) => void;
}> = ({ mode, contract, employees, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<ContractForm>(() => contract ? {
    party_name: contract.party_name || '',
    start_date: contract.start_date || '',
    end_date: contract.end_date || '',
    status: contract.status || 'Active',
    contract_terms: stripHtml(contract.contract_terms || ''),
    requires_fulfilment: !!contract.requires_fulfilment,
    fulfilment_deadline: contract.fulfilment_deadline || '',
    is_signed: !!contract.is_signed,
    signee: contract.signee || '',
    signee_company: contract.signee_company || '',
    fulfilment_terms: (contract.fulfilment_terms || []).map(t => ({
      requirement: t.requirement, notes: t.notes, fulfilled: !!t.fulfilled,
    })),
  } : { ...EMPTY_CONTRACT_FORM });

  const set = (p: Partial<ContractForm>) => setForm(f => ({ ...f, ...p }));

  const addChecklist = () => set({ fulfilment_terms: [...form.fulfilment_terms, { requirement: '', notes: '', fulfilled: false }] });
  const removeChecklist = (i: number) => set({ fulfilment_terms: form.fulfilment_terms.filter((_, idx) => idx !== i) });
  const updateChecklist = (i: number, p: Partial<{ requirement: string; notes: string; fulfilled: boolean }>) => {
    const next = [...form.fulfilment_terms]; next[i] = { ...next[i], ...p }; set({ fulfilment_terms: next });
  };

  const handleSave = async () => {
    if (!form.party_name) { setError('Please select an employee.'); return; }
    if (!form.start_date) { setError('Start date is required.'); return; }
    setError(''); setSaving(true);
    try {
      const result = mode === 'add' ? await createContract(form) : await updateContract(contract!.name, form);
      onSaved(result); onClose();
    } catch (e: any) { 
      let errorMessage = 'Save failed.';
      if (typeof e === 'string') {
        errorMessage = e;
      } else if (e?.message) {
        errorMessage = e.message;
      } else if (e?.error) {
        errorMessage = e.error;
      } else if (e?._server_messages) {
        try {
          const serverMessages = JSON.parse(e._server_messages);
          if (Array.isArray(serverMessages) && serverMessages.length > 0) {
            const firstMessage = JSON.parse(serverMessages[0]);
            errorMessage = firstMessage.message || errorMessage;
          }
        } catch (parseError) {
          console.error('Failed to parse _server_messages:', parseError);
        }
      } else if (typeof e === 'object') {
        errorMessage = JSON.stringify(e);
      }
      setError(errorMessage); 
    }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#E4B315]/10 border border-[#E4B315]/20 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-amber-500" /></div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">{mode === 'add' ? 'Create New Contract' : `Edit Contract — ${contract?.name}`}</p>
              <p className="text-[10px] text-gray-400">ERPNext · Contract Doctype · party_type = Employee</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Fld label="Employee" req>
              <select value={form.party_name} onChange={e => set({ party_name: e.target.value })} className={inp} disabled={mode === 'edit'}>
                <option value="">Select employee</option>
                {employees.map(e => <option key={e.name} value={e.name}>{e.employee_name} — {e.name}</option>)}
              </select>
            </Fld>
            <Fld label="Contract Number">
              <input disabled value={contract?.name || 'Auto-generated'} className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`} />
            </Fld>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Fld label="Start Date" req><input type="date" value={form.start_date} onChange={e => set({ start_date: e.target.value })} className={inp} /></Fld>
            <Fld label="End Date (Optional)"><input type="date" value={form.end_date} onChange={e => set({ end_date: e.target.value })} className={inp} /></Fld>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Fld label="Status">
              <select value={form.status} onChange={e => set({ status: e.target.value })} className={inp}>
                {['Active','Inactive','Expired'].map(s => <option key={s}>{s}</option>)}
              </select>
            </Fld>
            <Fld label="Fulfilment Deadline">
              <input type="date" value={form.fulfilment_deadline} onChange={e => set({ fulfilment_deadline: e.target.value })} className={inp} />
            </Fld>
          </div>

          {/* Signing section */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.is_signed} onChange={e => set({ is_signed: e.target.checked })} className="rounded accent-amber-500" />
                Contract is signed
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.requires_fulfilment} onChange={e => set({ requires_fulfilment: e.target.checked })} className="rounded accent-amber-500" />
                Requires fulfilment checklist
              </label>
            </div>
            {form.is_signed && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Fld label="Signee Name"><input value={form.signee} onChange={e => set({ signee: e.target.value })} className={inp} /></Fld>
                <Fld label="Signee Company"><input value={form.signee_company} onChange={e => set({ signee_company: e.target.value })} className={inp} /></Fld>
              </div>
            )}
          </div>

          {/* Contract Terms */}
          <Fld label="Contract Terms & Conditions" span>
            <textarea value={form.contract_terms} onChange={e => set({ contract_terms: e.target.value })}
              rows={4} placeholder="Enter detailed contract terms and conditions..."
              className={`${inp} resize-none`} />
          </Fld>

          {/* Fulfilment Checklist */}
          {form.requires_fulfilment && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700">Fulfilment Checklist</p>
                <button onClick={addChecklist} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                  <Plus className="w-3.5 h-3.5" />Add Item
                </button>
              </div>
              {form.fulfilment_terms.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No items yet.</p>
              )}
              {form.fulfilment_terms.map((t, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <input type="checkbox" checked={t.fulfilled} onChange={e => updateChecklist(i, { fulfilled: e.target.checked })} className="mt-2.5 accent-amber-500" />
                  <input value={t.requirement} onChange={e => updateChecklist(i, { requirement: e.target.value })} placeholder="Requirement" className={`${inp} flex-1`} />
                  <input value={t.notes} onChange={e => updateChecklist(i, { notes: e.target.value })} placeholder="Notes" className={`${inp} flex-1`} />
                  <button onClick={() => removeChecklist(i)} className="mt-2 text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {error && <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? 'Saving to ERPNext...' : mode === 'add' ? 'Create Contract' : 'Update Contract'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CONTRACT DETAIL MODAL
// ─────────────────────────────────────────────────────────────
const ContractDetailModal: React.FC<{
  contract: Contract; onClose: () => void; onEdit: () => void; onTerminate: () => void;
}> = ({ contract, onClose, onEdit, onTerminate }) => {
  const [terminating, setTerminating] = useState(false);

  const handleTerminate = async () => {
    if (!window.confirm(`Terminate contract ${contract.name}? This action cannot be undone.`)) return;
    setTerminating(true);
    try { await cancelContract(contract.name); onTerminate(); onClose(); }
    catch (e: any) { alert('Termination failed: ' + e.message); }
    finally { setTerminating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Contract Details</p>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {[
              ['Employee', contract.party_full_name || contract.party_name],
              ['Contract Number', contract.name],
              ['Status', null],
              ['Doc Status', docStatusLabel(contract.docstatus)],
              ['Start Date', formatDate(contract.start_date)],
              ['End Date', contract.end_date ? formatDate(contract.end_date) : 'Permanent'],
              ['Signed', contract.is_signed ? `Yes${contract.signee ? ` — ${contract.signee}` : ''}` : 'No'],
              ['Fulfilment', contract.fulfilment_status || 'N/A'],
              ['Signed On', contract.signed_on ? formatDate(contract.signed_on) : 'N/A'],
              ['Fulfilment Deadline', contract.fulfilment_deadline ? formatDate(contract.fulfilment_deadline) : 'N/A'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                {label === 'Status'
                  ? <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${contractBadgeColor(contract)}`}>{contractLabel(contract)}</span>
                  : <p className={`text-sm font-medium ${label === 'Employee' ? 'text-amber-600' : 'text-gray-700'}`}>{value}</p>
                }
              </div>
            ))}
          </div>

          {contract.contract_terms && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-2">Contract Terms</p>
              <p className="text-sm text-gray-700 leading-relaxed">{stripHtml(contract.contract_terms)}</p>
            </div>
          )}

          {contract.fulfilment_terms && contract.fulfilment_terms.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 font-medium mb-3">Fulfilment Checklist</p>
              <div className="space-y-2">
                {contract.fulfilment_terms.map(t => (
                  <div key={t.name} className="flex items-start gap-2">
                    {t.fulfilled
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      : <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-sm text-gray-700 font-medium">{t.requirement}</p>
                      {t.notes && <p className="text-xs text-gray-400">{t.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <button onClick={handleTerminate} disabled={terminating || contract.docstatus === 2}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
              {terminating && <Loader2 className="w-4 h-4 animate-spin" />}
              Terminate Contract
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
              <button onClick={onEdit} disabled={contract.docstatus === 2} className="px-4 py-2 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50">Edit Contract</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CONTRACTS TAB
// ─────────────────────────────────────────────────────────────
const ContractsTab: React.FC<{ employees: Employee[] }> = ({ employees }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subTab, setSubTab] = useState<'Active' | 'Probation' | 'Expiring' | 'Terminated'>('Active');
  const [contractModal, setContractModal] = useState<{ mode: 'add' | 'edit'; contract: Contract | null } | null>(null);
  const [detailContract, setDetailContract] = useState<Contract | null>(null);

  const loadContracts = useCallback(async () => {
    setLoading(true); setError('');
    try { setContracts(await fetchContracts()); }
    catch (e: any) { setError('Failed to load contracts from ERPNext.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const handleView = async (c: Contract) => {
    try { setDetailContract(await fetchContractDetail(c.name)); }
    catch { setDetailContract(c); }
  };

  const active     = contracts.filter(c => c.status === 'Active' && c.docstatus !== 2);
  const expiring   = contracts.filter(c => isExpiringSoon(c.end_date) && c.docstatus !== 2);
  const terminated = contracts.filter(c => c.docstatus === 2 || c.status === 'Inactive' || c.status === 'Expired');

  const visibleMap = { Active: active, Probation: active, Expiring: expiring, Terminated: terminated };
  const visible = visibleMap[subTab] || [];

  const handleSaved = (c: Contract) =>
    setContracts(prev => {
      const idx = prev.findIndex(x => x.name === c.name);
      if (idx >= 0) { const next = [...prev]; next[idx] = c; return next; }
      return [c, ...prev];
    });

  return (
    <div>
      {/* Contract Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Active Contracts', value: active.length, Icon: ClipboardList, color: 'text-gray-700' },
          { label: 'On Probation', value: 0, Icon: Clock, color: 'text-blue-500' },
          { label: 'Expiring Soon', value: expiring.length, Icon: TriangleAlert, color: 'text-orange-500' },
          { label: 'Total Payroll', value: 'KSh —', Icon: DollarSign, color: 'text-gray-800' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start">
              <p className="text-xs text-gray-500 font-medium">{label}</p><Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`font-bold mt-2 ${typeof value === 'number' ? 'text-2xl' : 'text-lg'} ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs + New Contract button */}
      <div className="flex items-end justify-between border-b border-gray-200 mb-0">
        <div className="flex gap-0">
          {(['Active','Probation','Expiring','Terminated'] as const).map(tab => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${subTab === tab ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab === 'Active' ? 'Active Contracts' : tab === 'Expiring' ? 'Expiring Soon' : `${tab} Period`}
              {tab === 'Expiring' && expiring.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-600 rounded-full">{expiring.length}</span>}
              {tab === 'Terminated' && terminated.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-600 rounded-full">{terminated.length}</span>}
            </button>
          ))}
        </div>
        <button onClick={() => setContractModal({ mode: 'add', contract: null })}
          className="flex items-center gap-1.5 mb-1 px-4 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition-colors">
          <Plus className="w-4 h-4" /> New Contract
        </button>
      </div>

      {error && <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4" />{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-4">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">
            {subTab === 'Active' ? 'Active Employee Contracts'
              : subTab === 'Expiring' ? 'Contracts Expiring Soon'
              : subTab === 'Terminated' ? 'Terminated Contracts'
              : 'Probation Period Contracts'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <div className="max-h-[400px] overflow-y-auto border-t border-gray-100">
            <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Employee','Contract Number','Start Date','End Date','Fulfilment','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center"><div className="flex items-center justify-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading from ERPNext...</div></td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No contracts found</td></tr>
              ) : visible.map(c => (
                <tr key={c.name} className="hover:bg-[#E4B315]/3 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{c.party_full_name || c.party_name}</p>
                    <p className="text-xs text-gray-400">{c.party_name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">{c.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.start_date)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.end_date ? formatDate(c.end_date) : <span className="italic text-gray-400">Permanent</span>}</td>
                  <td className="px-4 py-3">
                    {c.requires_fulfilment
                      ? <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.fulfilment_status === 'Fulfilled' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                          {c.fulfilment_status || 'Pending'}
                        </span>
                      : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${contractBadgeColor(c)}`}>{contractLabel(c)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleView(c)} className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#C69A11] hover:bg-[#E4B315]/10 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setContractModal({ mode: 'edit', contract: c })} disabled={c.docstatus === 2} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-40" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        {visible.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
            Showing {visible.length} of {contracts.length} contracts
          </div>
        )}
      </div>

      {contractModal && (
        <ContractFormModal mode={contractModal.mode} contract={contractModal.contract} employees={employees}
          onClose={() => setContractModal(null)} onSaved={handleSaved} />
      )}
      {detailContract && (
        <ContractDetailModal contract={detailContract} onClose={() => setDetailContract(null)}
          onEdit={() => { setContractModal({ mode: 'edit', contract: detailContract }); setDetailContract(null); }}
          onTerminate={loadContracts} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN HR PAGE
// ─────────────────────────────────────────────────────────────
const HRPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [holidayLists, setHolidayLists] = useState<HolidayList[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employeesForReportsTo, setEmployeesForReportsTo] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'employees' | 'contracts'>('employees');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editModal, setEditModal] = useState<{ mode: 'add' | 'edit'; employee: Employee | null } | null>(null);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [emps, depts, desigs, branchs, holidays, comps, reportsToEmployees] = await Promise.all([fetchEmployees(), fetchDepartments(), fetchDesignations(), fetchBranches(), fetchHolidayLists(), fetchCompanies(), fetchEmployeesForReportsTo()]);
      setEmployees(emps); setDepartments(depts); setDesignations(desigs); setBranches(branchs); setHolidayLists(holidays); setCompanies(comps); setEmployeesForReportsTo(reportsToEmployees);
    } catch (e: any) { setError('Failed to load from ERPNext. Check your session/connection.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = employees.filter(e => {
    const q = searchTerm.toLowerCase();
    return (!q || [e.employee_name,e.name,e.personal_email,e.company_email,e.cell_number].some(v => v?.toLowerCase().includes(q)))
      && (!filterDept || e.department === filterDept)
      && (!filterStatus || e.status === filterStatus)
      && (!filterType || e.employment_type === filterType);
  });

  const stats = {
    total: employees.length,
    active: employees.filter(e => e.status === 'Active').length,
    left: employees.filter(e => e.status === 'Left').length,
    departments: departments.length,
  };

  const handleEmpSaved = (emp: Employee) =>
    setEmployees(prev => {
      const idx = prev.findIndex(e => e.name === emp.name);
      if (idx >= 0) { const next = [...prev]; next[idx] = emp; return next; }
      return [emp, ...prev];
    });

  return (
    <PageLayout
      title="Human Resources"
      subtitle="Manage employees and employment contracts"
      actions={
        <div className="flex gap-2">
          <button onClick={loadAll} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-100 bg-white text-gray-600 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors shadow-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#E4B315]' : ''}`} />Refresh
          </button>
          {activeTab === 'employees' && (
            <button onClick={() => setEditModal({ mode: 'add', employee: null })}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white text-sm font-bold rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity">
              <UserPlus className="w-4 h-4" />Add Employee
            </button>
          )}
        </div>
      }
    >
    <div className="overflow-auto px-6 py-5 space-y-5 h-full" style={{ fontFamily: 'DM Sans, sans-serif' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {error && <div className="shrink-0 mb-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {/* Summary Stats */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total Employees', value: stats.total, Icon: Users, color: 'text-gray-700' },
          { label: 'Active', value: stats.active, Icon: UserCheck, color: 'text-[#C69A11]', dot: true },
          { label: 'On Leave', value: 0, Icon: Calendar, color: 'text-blue-500' },
          { label: 'Pending Leaves', value: 0, Icon: FileText, color: 'text-orange-500' },
          { label: 'Today Present', value: 0, Icon: UserCheck, color: 'text-green-500' },
          { label: 'Monthly Salary', value: 'KSh —', Icon: DollarSign, color: 'text-gray-800', wide: true },
        ].map(({ label, value, Icon, color, dot, wide }: any) => (
          <div key={label} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-[#E4B315]/30 hover:shadow-md transition-all ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
            <div className="flex justify-between items-start">
              <p className="text-xs text-gray-500 font-medium">{label}</p><Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              {dot && <span className="w-2 h-2 rounded-full bg-[#E4B315]" />}
              <p className={`font-bold ${typeof value === 'string' ? 'text-lg' : 'text-2xl'} ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Tabs */}
      <div className="shrink-0 flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {(['employees', 'contracts'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20' : 'text-gray-500 hover:text-[#2D2A26]'}`}>
            {tab === 'employees' ? 'Employees' : 'Contracts'}
          </button>
        ))}
      </div>

      {/* ── EMPLOYEES TAB ── */}
      {activeTab === 'employees' && (
        <>
          <div className="shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search employees..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50" />
              </div>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.name} value={d.name}>{d.department_name || d.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white">
                <option value="">All Status</option>
                <option>Active</option><option>Left</option><option>Suspended</option>
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 bg-white">
                <option value="">All Types</option>
                {['Full-time','Part-time','Contract','Intern','Probation'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="shrink-0 px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Employee Directory</h2>
            </div>
            <div className="overflow-auto flex-1">
              <div className="max-h-[400px] overflow-y-auto border-t border-gray-100">
                <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Employee','Department','Designation','Status','Join Date','Email','Phone','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center"><div className="flex items-center justify-center gap-2 text-gray-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" />Loading from ERPNext...</div></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400 text-sm">No employees found</td></tr>
                  ) : filtered.map(emp => (
                    <tr key={emp.name} className="hover:bg-[#E4B315]/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#E4B315]/15 flex items-center justify-center text-[#C69A11] text-xs font-extrabold flex-shrink-0">{initials(emp)}</div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{emp.employee_name}</p>
                            <p className="text-xs text-gray-400">#{emp.name} · {emp.employment_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.department || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{emp.designation || 'N/A'}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor(emp.status)}`}>{emp.status}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(emp.date_of_joining)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600"><div className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{emp.company_email || emp.personal_email || '—'}</div></td>
                      <td className="px-4 py-3 text-xs text-gray-600"><div className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{emp.cell_number || '—'}</div></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setDetailEmployee(emp)} className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#C69A11] hover:bg-[#E4B315]/10 transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditModal({ mode: 'edit', employee: emp })} className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-[#C69A11] hover:bg-[#E4B315]/10 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-400">
                Showing {filtered.length} of {employees.length} employees
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CONTRACTS TAB ── */}
      {activeTab === 'contracts' && <ContractsTab employees={employees} />}

      {/* Employee Modals */}
      {editModal && (
        <EmployeeModal mode={editModal.mode} employee={editModal.employee}
          departments={departments} designations={designations} branches={branches} holidayLists={holidayLists} companies={companies} employeesForReportsTo={employeesForReportsTo}
          onClose={() => setEditModal(null)} onSaved={handleEmpSaved} />
      )}
      {detailEmployee && (
        <EmployeeDetailModal employee={detailEmployee} onClose={() => setDetailEmployee(null)}
          onEdit={() => { setEditModal({ mode: 'edit', employee: detailEmployee }); setDetailEmployee(null); }} />
      )}
    </div>
    </PageLayout>
  );
};

export default HRPage;