import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Calendar, Users, UserCheck, Plus, LogIn, LogOut,
  Coffee, ChevronDown, Search, X, CheckCircle, XCircle,
  RefreshCw, Briefcase, BarChart2, Bell,
  Loader2, Hash, Sun,
  Eye
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';

// ─────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────
interface Employee {
  name: string;
  employee_name: string;
  status: string;
  department?: string;
  designation?: string;
  company?: string;
  image?: string;
}

interface AttendanceRecord {
  name: string;
  employee: string;
  employee_name: string;
  attendance_date: string;
  status: string;
  in_time?: string;
  out_time?: string;
  working_hours?: number | string;
  shift?: string;
  late_entry?: number;
  early_exit?: number;
  docstatus?: number;
}

interface ShiftType {
  name: string;
  start_time: string;
  end_time: string;
  begin_check_in_before_shift_start_time?: number;
  allow_check_out_after_shift_end_time?: number;
  enable_auto_attendance?: number;
  holiday_list?: string;
  determine_check_in_and_check_out?: string;
  working_hours_calculation_based_on?: string;
  color?: string;
}

interface ShiftAssignment {
  name: string;
  employee: string;
  employee_name: string;
  shift_type: string;
  start_date: string;
  end_date?: string;
  status: string;
  company?: string;
}

interface LeaveType {
  name: string;
  leave_type_name?: string;
  max_leaves_allowed?: number;
  is_carry_forward?: number;
  is_lwp?: number;
  is_earned_leave?: number;
  include_holiday?: number;
  is_compensatory?: number;
  allow_encashment?: number;
}

interface LeaveApplication {
  name: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  total_leave_days: number;
  status: string;
  description?: string;
  half_day?: number;
  half_day_date?: string;
  posting_date?: string;
  docstatus?: number;
}

interface LeaveAllocation {
  name: string;
  employee: string;
  employee_name: string;
  leave_type: string;
  from_date: string;
  to_date: string;
  new_leaves_allocated: number;
  total_leaves_allocated?: number;
  docstatus?: number;
  // Enhanced fields from Leave Ledger Entry
  total_leave_allocated?: number;
  used_leaves?: number;
  unused_leaves?: number;
  expired_leaves?: number;
  available_leaves?: number;
  leave_balance?: number;
  pending_leaves?: number;
  carry_forward_leaves?: number;
}

interface Holiday {
  name?: string;
  holiday_date: string;
  description: string;
  weekly_off?: number;
}

interface HolidayList {
  name: string;
  holiday_list_name: string;
  from_date: string;
  to_date: string;
  weekly_off?: string;
  total_holidays?: number;
  holidays: Holiday[];
  country?: string;
  subdivision?: string;
}

interface CheckInLog {
  name?: string;
  employee: string;
  employee_name?: string;
  time: string;
  log_type: 'IN' | 'OUT';
  device_id?: string;
  shift?: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ─────────────────────────────────────────────────────
// FRAPPE API HELPERS
// ─────────────────────────────────────────────────────
const getCSRFToken = (): string =>
  (window as any).csrf_token ||
  document.cookie.split('; ').find(r => r.startsWith('csrf_token='))?.split('=')[1] ||
  '';

const frappeFetch = async <T = any>(url: string, options?: RequestInit): Promise<T> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const csrf = getCSRFToken();
  if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

  const res = await fetch(url, { credentials: 'include', headers, ...options });
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = json?.exc_type || json?.message || json?._server_messages || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  if (json.exc) throw new Error(json.exc);
  return json as T;
};

// Resource API
const resourceGet = (doctype: string, fields: string[], filters?: any[], limit = 200) => {
  const encoded = encodeURIComponent(doctype);
  const params = new URLSearchParams({
    fields: JSON.stringify(fields),
    limit: String(limit),
    ...(filters ? { filters: JSON.stringify(filters) } : {}),
  });
  return frappeFetch<{ data: any[] }>(`/api/resource/${encoded}?${params}`).then(r => r.data || []);
};

const resourceCreate = (doctype: string, data: Record<string, any>) =>
  frappeFetch<{ data: any }>(`/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => r.data);

const resourceUpdate = (doctype: string, name: string, data: Record<string, any>) =>
  frappeFetch<{ data: any }>(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }).then(r => r.data);

// Frappe method call
const callMethod = <T = any>(method: string, args: Record<string, any> = {}) =>
  frappeFetch<{ message: T }>(`/api/method/${method}`, {
    method: 'POST',
    body: JSON.stringify(args),
  }).then(r => r.message);

// ─── HRMS Specific APIs ─────────────────────────────

const fetchEmployees = (): Promise<Employee[]> =>
  resourceGet('Employee', ['name', 'employee_name', 'status', 'department', 'designation', 'company', 'image'], [['status', '=', 'Active']]);

const fetchAttendance = (month?: string, year?: string): Promise<AttendanceRecord[]> => {
  const now = new Date();
  const m = month ?? String(now.getMonth() + 1).padStart(2, '0');
  const y = year ?? String(now.getFullYear());
  const from = `${y}-${m}-01`;
  const to = new Date(Number(y), Number(m), 0).toISOString().split('T')[0];
  return resourceGet(
    'Attendance',
    ['name', 'employee', 'employee_name', 'attendance_date', 'status', 'in_time', 'out_time', 'working_hours', 'shift', 'late_entry', 'early_exit', 'docstatus'],
    [['attendance_date', 'between', [from, to]]],
    500
  );
};

const fetchShiftTypes = (): Promise<ShiftType[]> =>
  resourceGet('Shift Type', ['name', 'name', 'start_time', 'end_time', 'begin_check_in_before_shift_start_time', 'allow_check_out_after_shift_end_time', 'enable_auto_attendance', 'holiday_list']);

const fetchShiftAssignments = (): Promise<ShiftAssignment[]> =>
  resourceGet('Shift Assignment', ['name', 'employee', 'employee_name', 'shift_type', 'start_date', 'end_date', 'status', 'company'], [['status', '=', 'Active']], 300);

const fetchLeaveTypes = (): Promise<LeaveType[]> =>
  resourceGet('Leave Type', ['name', 'max_leaves_allowed']);

const fetchLeaveApplications = (): Promise<LeaveApplication[]> =>
  resourceGet(
    'Leave Application',
    ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status', 'description', 'half_day', 'docstatus'],
    [],
    300
  );

const fetchLeaveAllocations = (): Promise<LeaveAllocation[]> => {
  // First fetch basic leave allocation data
  return resourceGet('Leave Allocation',
    ['name', 'employee', 'employee_name', 'leave_type', 'from_date', 'to_date', 'new_leaves_allocated', 'total_leaves_allocated', 'docstatus']
  ).then(async (allocations) => {
    // For each allocation, fetch detailed leave ledger information
    const enhancedAllocations = await Promise.all(
      allocations.map(async (allocation) => {
        try {
          console.log(`Processing allocation: ${allocation.name} for employee: ${allocation.employee}, leave type: ${allocation.leave_type}`);

          // Fetch leave ledger entries for this employee and leave type
          const ledgerEntries = await resourceGet('Leave Ledger Entry',
            ['name', 'employee', 'employee_name', 'leave_type', 'transaction_type', 'transaction_name', 'from_date', 'to_date', 'leaves', 'is_expired', 'is_carry_forward', 'docstatus'],
            [['employee', '=', allocation.employee], ['leave_type', '=', allocation.leave_type]],
            1000
          );

          console.log(`Found ${ledgerEntries.length} ledger entries for ${allocation.employee} - ${allocation.leave_type}:`, ledgerEntries);

          // Calculate leave statistics from ledger entries
          const totalAllocated = ledgerEntries
            .filter(entry => entry.transaction_type === 'Leave Allocation')
            .reduce((sum, entry) => sum + Math.abs(entry.leaves || 0), 0);

          const totalUsed = ledgerEntries
            .filter(entry =>
              entry.transaction_type === 'Leave Encashment' ||
              entry.transaction_type === 'Leave Application'
            )
            .reduce((sum, entry) => sum + Math.abs(entry.leaves || 0), 0);

          const expiredLeaves = ledgerEntries
            .filter(entry => entry.is_expired === 1)
            .reduce((sum, entry) => sum + Math.abs(entry.leaves || 0), 0);

          const carryForwardLeaves = ledgerEntries
            .filter(entry => entry.is_carry_forward === 1)
            .reduce((sum, entry) => sum + Math.abs(entry.leaves || 0), 0);

          // Get approved leave applications for actual usage
          const approvedApplications = await resourceGet('Leave Application',
            ['name', 'employee', 'leave_type', 'total_leave_days', 'status', 'from_date', 'to_date'],
            [['employee', '=', allocation.employee], ['leave_type', '=', allocation.leave_type], ['status', 'in', ['Approved', 'Open']]],
            100
          );

          const usedLeavesFromApplications = approvedApplications
            .filter(app => app.status === 'Approved')
            .reduce((sum, app) => sum + (app.total_leave_days || 0), 0);

          const pendingLeaves = approvedApplications
            .filter(app => app.status === 'Open')
            .reduce((sum, app) => sum + (app.total_leave_days || 0), 0);

          console.log(`Calculated for ${allocation.employee} - ${allocation.leave_type}:`, {
            totalAllocated,
            totalUsed,
            usedLeavesFromApplications,
            expiredLeaves,
            carryForwardLeaves,
            pendingLeaves,
            originalAllocation: allocation.new_leaves_allocated
          });

          // Use the greater of ledger calculation or original allocation
          const finalAllocated = totalAllocated > 0 ? totalAllocated : (allocation.total_leaves_allocated || allocation.new_leaves_allocated || 0);
          const finalUsed = totalUsed > 0 ? totalUsed : usedLeavesFromApplications;

          // Calculate available balance
          const availableBalance = finalAllocated - finalUsed - expiredLeaves;

          return {
            ...allocation,
            total_leave_allocated: finalAllocated,
            used_leaves: finalUsed,
            unused_leaves: availableBalance,
            expired_leaves: expiredLeaves,
            available_leaves: availableBalance,
            leave_balance: availableBalance,
            pending_leaves: pendingLeaves,
            carry_forward_leaves: carryForwardLeaves
          };
        } catch (error) {
          console.error(`Error fetching leave ledger for allocation ${allocation.name}:`, error);
          // Return original allocation if ledger fetch fails
          const originalAllocated = allocation.total_leaves_allocated || allocation.new_leaves_allocated || 0;
          return {
            ...allocation,
            total_leave_allocated: originalAllocated,
            used_leaves: 0,
            unused_leaves: originalAllocated,
            expired_leaves: 0,
            available_leaves: originalAllocated,
            leave_balance: originalAllocated,
            pending_leaves: 0,
            carry_forward_leaves: 0
          };
        }
      })
    );

    return enhancedAllocations;
  });
};

const fetchHolidayLists = async (): Promise<HolidayList[]> => {
  try {
    console.log('Fetching holiday lists...');
    const res = await callMethod('quantbit_ury_customization.ury_customization.holiday_list_api.get_all_holiday_lists');
    console.log('Holiday lists response:', res);
    const result = res || [];
    console.log('Final holiday lists result:', result);
    return result;
  } catch (e: any) {
    console.error('Failed to fetch holiday lists:', e);
    return [];
  }
};

const fetchCheckins = (): Promise<CheckInLog[]> =>
  resourceGet('Employee Checkin', ['name', 'employee', 'employee_name', 'time', 'log_type', 'device_id', 'shift'], [], 500);

const getHolidayListMethods = async () => {
  try {
    const res = await callMethod('quantbit_ury_customization.ury_customization.holiday_list_api.get_supported_countries');
    return res || { countries: [], subdivisions_by_country: {} };
  } catch (e: any) {
    console.error('Failed to get holiday list methods:', e);
    return { countries: [], subdivisions_by_country: {} };
  }
};

const runHolidayListMethod = async (doc: any, method: string) => {
  try {
    const method_map: Record<string, string> = {
      get_weekly_off_dates: 'quantbit_ury_customization.ury_customization.holiday_list_api.get_weekly_off_dates',
      get_local_holidays: 'quantbit_ury_customization.ury_customization.holiday_list_api.get_local_holidays',
    };
    const res = await callMethod(method_map[method], { doc: JSON.stringify(doc) });
    return res;
  } catch (e: any) {
    console.error(`Failed to run ${method}:`, e);
    return null;
  }
};

const fetchSupportedCountries = async (): Promise<any> => {
  try {
    const res = await callMethod('quantbit_ury_customization.ury_customization.holiday_list_api.get_supported_countries');
    return res || { countries: [], subdivisions_by_country: {} };
  } catch (e: any) {
    console.error('Failed to fetch supported countries:', e);
    return { countries: [], subdivisions_by_country: {} };
  }
};

const submitHolidayList = async (data: Partial<HolidayList>) => {
  try {
    console.log('Submitting holiday list with data:', data);
    const res = await callMethod('quantbit_ury_customization.ury_customization.holiday_list_api.create_holiday_list', {
      holiday_list_name: data.holiday_list_name,
      from_date: data.from_date,
      to_date: data.to_date,
      country: data.country || '',
      subdivision: data.subdivision || '',
      weekly_off: data.weekly_off || '',
      holidays: JSON.stringify(data.holidays || [])
    });
    console.log('Holiday list creation response:', res);
    return res;
  } catch (e: any) {
    console.error('Failed to submit holiday list:', e);
    throw new Error(e.message || 'Failed to create holiday list');
  }
};

// Mark attendance via HRMS method (preferred over direct doc creation)
const markAttendance = async (employee: string, date: string, status: string, inTime?: string, outTime?: string): Promise<any> => {
  // Try HRMS method first
  try {
    return await callMethod('hrms.hr.doctype.attendance.attendance.mark_attendance', {
      employee,
      attendance_date: date,
      status,
      ...(inTime ? { in_time: inTime } : {}),
      ...(outTime ? { out_time: outTime } : {}),
    });
  } catch {
    // Fallback: direct resource creation
    return resourceCreate('Attendance', {
      employee,
      attendance_date: date,
      status,
      ...(inTime ? { in_time: inTime } : {}),
      ...(outTime ? { out_time: outTime } : {}),
      docstatus: 1,
    });
  }
};

// Employee Checkin (HRMS preferred way for check-in/out)
const createCheckin = async (employee: string, logType: 'IN' | 'OUT', shift?: string): Promise<any> => {
  const now = new Date();
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  return resourceCreate('Employee Checkin', {
    employee,
    log_type: logType,
    time,
    ...(shift ? { shift } : {}),
  });
};

const submitLeaveApplication = async (data: Partial<LeaveApplication>): Promise<any> => {
  const doc = await resourceCreate('Leave Application', { ...data, docstatus: 0 });
  // Submit
  return resourceUpdate('Leave Application', doc.name, { docstatus: 1 });
};

const submitLeaveAllocation = async (data: Partial<LeaveAllocation>): Promise<any> => {
  const doc = await resourceCreate('Leave Allocation', { ...data, docstatus: 0 });
  return resourceUpdate('Leave Allocation', doc.name, { docstatus: 1 });
};

const approveLeave = (name: string) =>
  resourceUpdate('Leave Application', name, { status: 'Approved', docstatus: 1 });

const rejectLeave = (name: string) =>
  resourceUpdate('Leave Application', name, { status: 'Rejected', docstatus: 2 });

// ─────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────
const formatDate = (d?: string) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const formatTime = (t?: string) => {
  if (!t) return '—';
  try {
    const base = t.includes('T') ? t : `1970-01-01T${t}`;
    return new Date(base).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return t; }
};

const today = () => new Date().toISOString().split('T')[0];

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    Present: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Absent: 'bg-rose-50 text-rose-700 border border-rose-200',
    'Half Day': 'bg-amber-50 text-amber-700 border border-amber-200',
    'On Leave': 'bg-sky-50 text-sky-700 border border-sky-200',
    Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
    Open: 'bg-[#E4B315]/8 text-[#C69A11] border border-[#E4B315]/30',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Inactive: 'bg-gray-50 text-gray-500 border border-gray-200',
  };
  return map[status] ?? 'bg-gray-50 text-gray-500 border border-gray-200';
};

const initials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const avatarColor = (name: string) => {
  const colors = [
    'bg-[#E4B315]/80', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// ─────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────
const ToastContainer: React.FC<{ toasts: Toast[]; remove: (id: string) => void }> = ({ toasts, remove }) => (
  <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(t => (
      <div
        key={t.id}
        onClick={() => remove(t.id)}
        style={{ animation: 'slideIn .25s ease' }}
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium cursor-pointer max-w-sm
          ${t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-gray-800 text-white'}`}
      >
        {t.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> :
          t.type === 'error' ? <XCircle className="w-4 h-4 flex-shrink-0" /> :
            <Bell className="w-4 h-4 flex-shrink-0" />}
        {t.message}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────
// MODAL
// ─────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; open: boolean; onClose: () => void; children: React.ReactNode }> = ({ title, open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: 'popIn .2s ease' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-base">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// SELECT
// ─────────────────────────────────────────────────────
const Select: React.FC<{
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string; className?: string;
}> = ({ value, onChange, options, placeholder = 'Select…', className = '' }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-violet-400 transition"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <ChevronDown className="absolute right-2.5 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
  </div>
);

// ─────────────────────────────────────────────────────
// COMPACT STAT
// ─────────────────────────────────────────────────────
const CompactStat: React.FC<{ label: string; value: number | string; sub?: string; icon: React.ReactNode; accent: string; gold?: boolean }> = ({ label, value, sub, icon, accent, gold }) => (
  <div className="flex items-center gap-3">
    <div className={`w-4 h-4 rounded flex items-center justify-center ${gold ? 'bg-[#E4B315]/20' : accent}`}>
      {icon}
    </div>
    <div className="flex flex-col">
      <p className={`text-xl font-bold ${gold ? 'text-[#C69A11]' : 'text-gray-800'}`}>{value}</p>
      <p className={`text-xs ${gold ? 'text-[#C69A11]/70' : 'text-gray-500'}`}>{label}</p>
      {sub && <p className={`text-xs ${gold ? 'text-[#C69A11]/50' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────
const WorkspaceManagement: React.FC = () => {
  type Tab = 'attendance' | 'shifts' | 'leaves' | 'checkins' | 'holidays';
  const [tab, setTab] = useState<Tab>('attendance');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [leaveAllocations, setLeaveAllocations] = useState<LeaveAllocation[]>([]);
  const [holidayLists, setHolidayLists] = useState<HolidayList[]>([]);
  const [checkins, setCheckins] = useState<CheckInLog[]>([]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  // Pagination state
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceItemsPerPage, setAttendanceItemsPerPage] = useState(25);
  const [shiftsPage, setShiftsPage] = useState(1);
  const [shiftsItemsPerPage, setShiftsItemsPerPage] = useState(25);
  const [leavesPage, setLeavesPage] = useState(1);
  const [leavesItemsPerPage, setLeavesItemsPerPage] = useState(25);
  const [checkinsPage, setCheckinsPage] = useState(1);
  const [checkinsItemsPerPage, setCheckinsItemsPerPage] = useState(25);

  // Modals

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, att, stypes, sassign, ltypes, lapps, lalloc, hlist, checkinsData] = await Promise.allSettled([
        fetchEmployees(),
        fetchAttendance(selectedMonth, selectedYear),
        fetchShiftTypes(),
        fetchShiftAssignments(),
        fetchLeaveTypes(),
        fetchLeaveApplications(),
        fetchLeaveAllocations(),
        fetchHolidayLists(),
        fetchCheckins(),
      ]);
      if (emps.status === 'fulfilled') setEmployees(emps.value);
      if (att.status === 'fulfilled') setAttendance(att.value);
      if (stypes.status === 'fulfilled') setShiftTypes(stypes.value);
      if (sassign.status === 'fulfilled') setShiftAssignments(sassign.value);
      if (ltypes.status === 'fulfilled') setLeaveTypes(ltypes.value);
      if (lapps.status === 'fulfilled') setLeaveApplications(lapps.value);
      if (lalloc.status === 'fulfilled') setLeaveAllocations(lalloc.value);
      if (hlist.status === 'fulfilled') setHolidayLists(hlist.value);
      if (checkinsData.status === 'fulfilled') setCheckins(checkinsData.value);
    } catch {
      addToast('error', 'Failed to load some data. Check ERPNext connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, addToast]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const todayStr = today();
  const todayAtt = attendance.filter(a => a.attendance_date === todayStr);
  const presentToday = todayAtt.filter(a => a.status === 'Present').length;
  const pendingLeaves = leaveApplications.filter(l => l.status === 'Open' || l.status === 'Pending').length;
  const activeShifts = shiftAssignments.length;

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((m, i) => ({
    value: m,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }));

  const years = Array.from({ length: 5 }, (_, i) => {
    const y = String(new Date().getFullYear() - 2 + i);
    return { value: y, label: y };
  });

  return (
    <PageLayout
      title="Workspace Management"
      subtitle="Attendance, shifts, leaves and HRMS dashboard"
      actions={
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-mono text-xs font-medium text-gray-700">
              {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
          <button
            onClick={loadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-100 rounded-xl text-gray-600 hover:border-[#E4B315]/40 hover:text-[#C69A11] transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#E4B315]' : ''}`} />
            Refresh
          </button>
        </div>
      }
    >
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        * { font-family: 'Sora', sans-serif; }
        code, .mono { font-family: 'JetBrains Mono', monospace; }
        @keyframes slideIn { from { opacity:0; transform:translateX(24px); } to { opacity:1; transform:none; } }
        @keyframes popIn  { from { opacity:0; transform:scale(.95); } to { opacity:1; transform:scale(1); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #fde68a; border-radius: 10px; }
      `}</style>

      <ToastContainer toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />

      <div className="px-4 sm:px-6 py-4 space-y-4 h-screen max-h-[calc(100vh-80px)] overflow-hidden flex flex-col bg-gray-50/80">

        <div className="flex-1 overflow-hidden">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {/* ── Stats ─────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between mb-4">
              <CompactStat label="Total Employees" value={employees.length} icon={<Users className="w-4 h-4 text-white" />} accent="bg-[#E4B315]/20" gold />
              <CompactStat label="Present Today" value={presentToday} sub={`of ${employees.length}`} icon={<UserCheck className="w-4 h-4 text-emerald-600" />} accent="bg-emerald-100" />
              <CompactStat label="Shift Assignments" value={activeShifts} icon={<BarChart2 className="w-4 h-4 text-sky-600" />} accent="bg-sky-100" />
              <CompactStat label="Pending Leaves" value={pendingLeaves} icon={<Calendar className="w-4 h-4 text-[#C69A11]" />} accent="bg-[#E4B315]/20" />
            </div>

            {/* ── Quick Check In/Out ────────────────── */}
            <div className="shrink-0 mb-3">
              <QuickCheckin employees={employees} onCheckin={createCheckin} onSuccess={() => { loadAll(); addToast('success', 'Check-in recorded'); }} onError={msg => addToast('error', msg)} />
            </div>

            {/* ── Tabs ──────────────────────────────── */}
            <div className="shrink-0 mb-3">
              <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 w-fit flex-wrap">
                {([
                  { key: 'attendance', label: 'Attendance', icon: Clock },
                  { key: 'shifts', label: 'Shifts', icon: Calendar },
                  { key: 'leaves', label: 'Leaves', icon: Coffee },
                  { key: 'holidays', label: 'Holidays', icon: Sun },
                  { key: 'checkins', label: 'Check-in Log', icon: Hash },
                ] as { key: Tab; label: string; icon: React.FC<any> }[]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === key ? 'bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white shadow-md shadow-[#E4B315]/20' : 'text-gray-500 hover:text-[#2D2A26]'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Tab Content (Scrollable) ─────────────── */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                {tab === 'attendance' && (
                  <AttendanceTab
                    attendance={attendance}
                    employees={employees}
                    loading={loading}
                    months={months}
                    years={years}
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onMonthChange={setSelectedMonth}
                    onYearChange={setSelectedYear}
                    currentPage={attendancePage}
                    itemsPerPage={attendanceItemsPerPage}
                    onPageChange={setAttendancePage}
                    onItemsPerPageChange={setAttendanceItemsPerPage}
                    onMarkAttendance={(emp, date, status) =>
                      markAttendance(emp, date, status)
                        .then(() => { loadAll(); addToast('success', 'Attendance marked'); })
                        .catch(e => addToast('error', e.message))
                    }
                  />
                )}
                {tab === 'shifts' && (
                  <ShiftsTab
                    shiftTypes={shiftTypes}
                    shiftAssignments={shiftAssignments}
                    employees={employees}
                    loading={loading}
                    onAssign={(emp, shiftType, startDate) =>
                      resourceCreate('Shift Assignment', { employee: emp, shift_type: shiftType, start_date: startDate, status: 'Active' })
                        .then(() => { loadAll(); addToast('success', 'Shift assigned'); })
                        .catch(e => addToast('error', e.message))
                    }
                    onCreateShiftType={data =>
                      resourceCreate('Shift Type', data)
                        .then(() => { loadAll(); addToast('success', 'Shift Type created'); })
                        .catch(e => addToast('error', e.message))
                    }
                  />
                )}
                {tab === 'holidays' && (
                  <HolidaysTab
                    holidayLists={holidayLists}
                    loading={loading}
                    onCreate={data =>
                      submitHolidayList(data)
                        .then(() => { loadAll(); addToast('success', 'Holiday list created'); })
                        .catch(e => addToast('error', e.message))
                    }
                  />
                )}
                {tab === 'leaves' && (
                  <LeavesTab
                    leaveApplications={leaveApplications}
                    leaveAllocations={leaveAllocations}
                    leaveTypes={leaveTypes}
                    employees={employees}
                    loading={loading}
                    currentPage={leavesPage}
                    itemsPerPage={leavesItemsPerPage}
                    onPageChange={setLeavesPage}
                    onItemsPerPageChange={setLeavesItemsPerPage}
                    onApprove={name => approveLeave(name).then(() => { loadAll(); addToast('success', 'Leave approved'); }).catch(e => addToast('error', e.message))}
                    onReject={name => rejectLeave(name).then(() => { loadAll(); addToast('info', 'Leave rejected'); }).catch(e => addToast('error', e.message))}
                    onApply={data =>
                      submitLeaveApplication(data)
                        .then(() => { loadAll(); addToast('success', 'Leave application submitted'); })
                        .catch(e => addToast('error', e.message))
                    }
                    onCreateLeaveType={data =>
                      resourceCreate('Leave Type', data)
                        .then(() => { loadAll(); addToast('success', 'Leave type created'); })
                        .catch(e => addToast('error', e.message))
                    }
                    onAllocate={data =>
                      submitLeaveAllocation(data)
                        .then(() => { loadAll(); addToast('success', 'Leave allocated'); })
                        .catch(e => addToast('error', e.message))
                    }
                  />
                )}
                {tab === 'checkins' && (
                  <CheckinLogTab 
                    checkins={checkins} 
                    employees={employees} 
                    loading={loading}
                  />
                )}
              </div>

              {/* Pagination - Fixed at bottom */}
              {/* {tab === 'attendance' && attendance.length > 0 && (
                <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
                  <Pagination
                    currentPage={attendancePage}
                    totalPages={Math.ceil(attendance.length / attendanceItemsPerPage)}
                    onPageChange={setAttendancePage}
                    itemsPerPage={attendanceItemsPerPage}
                    totalItems={attendance.length}
                    onItemsPerPageChange={setAttendanceItemsPerPage}
                  />
                </div>
              )}
              {tab === 'shifts' && shiftAssignments.length > 0 && (
                <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
                  <Pagination
                    currentPage={shiftsPage}
                    totalPages={Math.ceil(shiftAssignments.length / shiftsItemsPerPage)}
                    onPageChange={setShiftsPage}
                    itemsPerPage={shiftsItemsPerPage}
                    totalItems={shiftAssignments.length}
                    onItemsPerPageChange={setShiftsItemsPerPage}
                  />
                </div>
              )}
              {tab === 'leaves' && leaveApplications.length > 0 && (
                <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
                  <Pagination
                    currentPage={leavesPage}
                    totalPages={Math.ceil(leaveApplications.length / leavesItemsPerPage)}
                    onPageChange={setLeavesPage}
                    itemsPerPage={leavesItemsPerPage}
                    totalItems={leaveApplications.length}
                    onItemsPerPageChange={setLeavesItemsPerPage}
                  />
                </div>
              )}
              {tab === 'checkins' && checkins.length > 0 && (
                <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-white">
                  <Pagination
                    currentPage={checkinsPage}
                    totalPages={Math.ceil(checkins.length / checkinsItemsPerPage)}
                    onPageChange={setCheckinsPage}
                    itemsPerPage={checkinsItemsPerPage}
                    totalItems={checkins.length}
                    onItemsPerPageChange={setCheckinsItemsPerPage}
                  />
                </div>
              )} */}
            </div>
          </div>
          </div>
        </div>
    </>
    </PageLayout>
  );
};

// ─────────────────────────────────────────────────────
// HOLIDAYS TAB
// ─────────────────────────────────────────────────────
const HolidaysTab: React.FC<{
  holidayLists: HolidayList[];
  loading: boolean;
  onCreate: (data: Partial<HolidayList>) => void;
}> = ({ holidayLists, loading, onCreate }) => {
  const [createModal, setCreateModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedHolidays, setSelectedHolidays] = useState<{name: string, holidays: any[]} | null>(null);
  const [form, setForm] = useState({
    holiday_list_name: '',
    from_date: today(),
    to_date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
    country: '',
    subdivision: '',
    weekly_off: '',
    holidays: [] as { holiday_date: string; description: string }[],
  });
  const [countries, setCountries] = useState<{ value: string; label: string }[]>([]);
  const [subdivisionsByCountry, setSubdivisionsByCountry] = useState<Record<string, string[]>>({});
  const [newHoliday, setNewHoliday] = useState({ date: today(), description: '' });

  useEffect(() => {
    fetchSupportedCountries().then(res => {
      setCountries(res.countries || []);
      setSubdivisionsByCountry(res.subdivisions_by_country || {});
    }).catch(console.error);
  }, []);

  const getWeeklyOffs = async () => {
    if (!form.weekly_off) return;
    try {
      const result = await runHolidayListMethod(form, 'get_weekly_off_dates');
      if (result && result.holidays) {
        setForm(f => ({ ...f, holidays: result.holidays }));
      }
    } catch (e: any) {
      console.error('Failed to get weekly offs:', e);
      // Fallback: Add basic weekly offs manually
      const weeklyOffDates: { holiday_date: string; description: string; }[] = [];
      const start = new Date(form.from_date);
      const end = new Date(form.to_date);
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        if (currentDate.getDay() === new Date(form.weekly_off).getDay()) {
          weeklyOffDates.push({
            holiday_date: currentDate.toISOString().split('T')[0],
            description: `${form.weekly_off} Weekly Off`
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setForm(f => ({ ...f, holidays: [...f.holidays, ...weeklyOffDates].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)) }));
    }
  };

  const getLocalHolidays = async () => {
    if (!form.country) return;
    try {
      const result = await runHolidayListMethod(form, 'get_local_holidays');
      if (result && result.holidays) {
        setForm(f => ({ ...f, holidays: result.holidays }));
      }
    } catch (e: any) {
      console.error('Failed to get local holidays:', e);
      // Silently fail - user can add holidays manually
    }
  };

  const addHoliday = () => {
    if (newHoliday.date && newHoliday.description) {
      setForm(f => ({
        ...f,
        holidays: [...f.holidays, { holiday_date: newHoliday.date, description: newHoliday.description }].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
      }));
      setNewHoliday({ date: today(), description: '' });
    }
  };

  const removeHoliday = (index: number) => {
    setForm(f => ({
      ...f,
      holidays: f.holidays.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 380px)' }}>
      <TableCard title="Holiday Lists" count={holidayLists.length}
        action={
          <button onClick={() => setCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition">
            <Plus className="w-3 h-3" />New Holiday List
          </button>
        }
      >
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr><Th>Name</Th><Th>From Date</Th><Th>To Date</Th><Th>Country</Th><Th>Total Holidays</Th><Th>Actions</Th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <LoadingRow cols={6} /> :
              holidayLists.length === 0 ? <EmptyRow cols={6} /> :
                holidayLists.map(h => (
                  <tr key={h.name} className="hover:bg-[#E4B315]/8/20 transition-colors">
                    <Td><span className="font-semibold text-gray-800">{h.holiday_list_name}</span></Td>
                    <Td className="mono text-xs">{formatDate(h.from_date)}</Td>
                    <Td className="mono text-xs">{formatDate(h.to_date)}</Td>
                    <Td>{h.country || '—'}</Td>
                    <Td className="font-semibold text-[#C69A11]">{h.holidays?.length || 0}</Td>
                    <Td>
                      <button
                        onClick={() => {
                          const holidays = h.holidays || [];
                          setSelectedHolidays({
                            name: h.holiday_list_name,
                            holidays: holidays
                          });
                          setViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                        title="View Holidays"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </Td>
                  </tr>
                ))}
          </tbody>
        </table>
      </TableCard>

      <Modal title="Create Holiday List" open={createModal} onClose={() => setCreateModal(false)}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Holiday List Name</label>
            <input type="text" value={form.holiday_list_name} onChange={e => setForm(f => ({ ...f, holiday_list_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors"
              placeholder="e.g. India 2024 Holidays" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date</label>
              <input type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date</label>
              <input type="date" value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Country</label>
              <Select value={form.country} onChange={v => setForm(f => ({ ...f, country: v, subdivision: '' }))}
                options={countries} placeholder="Select country…" />
            </div>
            {form.country && subdivisionsByCountry[form.country]?.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subdivision</label>
                <Select value={form.subdivision} onChange={v => setForm(f => ({ ...f, subdivision: v }))}
                  options={subdivisionsByCountry[form.country].map(s => ({ value: s, label: s }))} placeholder="Select subdivision…" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Weekly Off</label>
              <div className="flex gap-2">
                <Select className="flex-1" value={form.weekly_off} onChange={v => setForm(f => ({ ...f, weekly_off: v }))}
                  options={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => ({ value: d, label: d }))}
                  placeholder="Day…" />
                <button onClick={getWeeklyOffs} disabled={!form.weekly_off}
                  className="px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition">
                  Add Weekly
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Local Holidays</label>
              <button onClick={getLocalHolidays} disabled={!form.country}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition">
                Add from Country
              </button>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Holidays ({form.holidays.length})</h3>
            <div className="space-y-2 mb-3">
              {form.holidays.map((h, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  <span className="mono text-xs font-medium text-gray-700 flex-shrink-0">{formatDate(h.holiday_date)}</span>
                  <span className="text-sm text-gray-600 flex-1">{h.description}</span>
                  <button onClick={() => removeHoliday(i)} className="text-rose-500 hover:text-rose-700 transition">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="date" value={newHoliday.date} onChange={e => setNewHoliday(h => ({ ...h, date: e.target.value }))}
                className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
              <input type="text" value={newHoliday.description} onChange={e => setNewHoliday(h => ({ ...h, description: e.target.value }))}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors"
                placeholder="Holiday description" />
              <button onClick={addHoliday} disabled={!newHoliday.date || !newHoliday.description}
                className="px-3 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition">
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setCreateModal(false)}
              className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => {
                onCreate(form);
                setCreateModal(false);
                setForm({
                  holiday_list_name: '', from_date: today(), to_date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0],
                  country: '', subdivision: '', weekly_off: '', holidays: []
                });
              }}
              disabled={!form.holiday_list_name}
              className="flex-1 px-4 py-2 text-sm font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm shadow-[#E4B315]/20">
              Create
            </button>
          </div>
        </div>
      </Modal>
      {/* Holiday View Modal */}
<Modal title={`Holidays - ${selectedHolidays?.name || ''}`} open={viewModal} onClose={() => setViewModal(false)}>
  <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
    {selectedHolidays?.holidays && selectedHolidays.holidays.length > 0 ? (
      <div className="space-y-2">
        <div className="text-sm text-gray-600 mb-3">
          Total Holidays: {selectedHolidays.holidays.length}
        </div>
        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto">
          {selectedHolidays.holidays.map((holiday: any, index: number) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex-shrink-0 w-20 text-sm font-medium text-gray-700">
                {formatDate(holiday.holiday_date)}
              </div>
              <div className="flex-1 text-sm text-gray-600">
                {holiday.description}
                {holiday.weekly_off && (
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                    Weekly Off
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">
        No holidays found for this list.
      </div>
    )}
  </div>
</Modal>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// QUICK CHECK-IN WIDGET
// ─────────────────────────────────────────────────────
const QuickCheckin: React.FC<{
  employees: Employee[];
  onCheckin: (emp: string, type: 'IN' | 'OUT', shift?: string) => Promise<any>;
  onSuccess: () => void;
  onError: (msg: string) => void;
}> = ({ employees, onCheckin, onSuccess, onError }) => {
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<{ name: string; type: 'IN' | 'OUT'; time: string }[]>([]);

  const act = async (type: 'IN' | 'OUT') => {
    if (!selected) { onError('Please select an employee'); return; }
    setBusy(true);
    try {
      await onCheckin(selected, type);
      const empName = employees.find(e => e.name === selected)?.employee_name ?? selected;
      setRecent(p => [{ name: empName, type, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) }, ...p].slice(0, 5));
      onSuccess();
    } catch (e: any) {
      onError(e.message ?? 'Check-in failed');
    } finally { setBusy(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 mb-2">
      <h2 className="text-sm font-semibold text-gray-800 mb-3">Quick Check In / Out</h2>
      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={selected}
          onChange={setSelected}
          options={employees.map(e => ({ value: e.name, label: e.employee_name }))}
          placeholder="Select employee…"
          className="flex-1"
        />
        <button
          onClick={() => act('IN')}
          disabled={busy}
          className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 disabled:opacity-60 transition"
        >
          {busy ? <Loader2 className="w-4 h-4 spin" /> : <LogIn className="w-4 h-4" />}
          Check In
        </button>
        <button
          onClick={() => act('OUT')}
          disabled={busy}
          className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold bg-rose-500 text-white rounded-xl hover:bg-rose-600 disabled:opacity-60 transition"
        >
          {busy ? <Loader2 className="w-4 h-4 spin" /> : <LogOut className="w-4 h-4" />}
          Check Out
        </button>
      </div>

      {recent.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold text-gray-600 mb-2">Recent Check-ins</h3>
          <div className="max-h-24 overflow-y-auto overflow-x-hidden flex flex-wrap gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100">
            {recent.map((r, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${r.type === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {r.type === 'IN' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                {r.name} · {r.time}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// TABLE WRAPPER
// ─────────────────────────────────────────────────────
const TableCard: React.FC<{
  title: string; action?: React.ReactNode; children: React.ReactNode; count?: number;
}> = ({ title, action, children, count }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
    <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {count !== undefined && (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">{count}</span>
        )}
      </div>
      {action}
    </div>
    <div className="overflow-auto flex-1">{children}</div>
  </div>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">{children}</th>
);
const Td: React.FC<{ children: React.ReactNode; className?: string; title?: string; colSpan?: number }> = ({ children, className = '', title, colSpan }) => (
  <td className={`px-4 py-3 text-sm text-gray-600 ${className}`} title={title} colSpan={colSpan}>{children}</td>
);

const EmptyRow: React.FC<{ cols: number; msg?: string }> = ({ cols, msg = 'No records found' }) => (
  <tr><td colSpan={cols} className="px-4 py-12 text-center text-sm text-slate-400">{msg}</td></tr>
);

const LoadingRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr><td colSpan={cols} className="px-4 py-12 text-center"><Loader2 className="w-5 h-5 spin text-[#C69A11] 400 mx-auto" /></td></tr>
);

// Avatar cell
const AvatarCell: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex items-center gap-2.5">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(name)}`}>
      {initials(name)}
    </div>
    <span className="font-medium text-gray-800 whitespace-nowrap">{name}</span>
  </div>
);

// ─────────────────────────────────────────────────────
// ATTENDANCE TAB
// ─────────────────────────────────────────────────────
const AttendanceTab: React.FC<{
  attendance: AttendanceRecord[];
  employees: Employee[];
  loading: boolean;
  months: { value: string; label: string }[];
  years: { value: string; label: string }[];
  selectedMonth: string;
  selectedYear: string;
  onMonthChange: (v: string) => void;
  onYearChange: (v: string) => void;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onMarkAttendance: (emp: string, date: string, status: string) => void;
}> = ({ attendance, employees, loading, months, years, selectedMonth, selectedYear, onMonthChange, onYearChange, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange, onMarkAttendance }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [markModal, setMarkModal] = useState(false);
  const [form, setForm] = useState({ employee: '', attendance_date: today(), status: 'Present' });

  const filtered = attendance.filter(a =>
    (!search || a.employee_name.toLowerCase().includes(search.toLowerCase())) &&
    (!statusFilter || a.status === statusFilter)
  );

  // Pagination logic
  const paginatedData = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-violet-400" />
        </div>
        <Select value={statusFilter} onChange={setStatusFilter} className="w-40"
          options={[{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }, { value: 'Half Day', label: 'Half Day' }, { value: 'On Leave', label: 'On Leave' }]}
          placeholder="All statuses" />
        <Select value={selectedMonth} onChange={onMonthChange} options={months} className="w-36" />
        <Select value={selectedYear} onChange={onYearChange} options={years} className="w-28" />
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden mt-4" style={{ maxHeight: 'calc(100vh - 420px)' }}>
        <TableCard title="Attendance Records" count={filtered.length}>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr><Th>Employee</Th><Th>Date</Th><Th>Status</Th><Th>Check In</Th><Th>Check Out</Th><Th>Hours</Th><Th>Shift</Th><Th>Actions</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <LoadingRow cols={8} /> :
                filtered.length === 0 ? <EmptyRow cols={8} /> :
                  paginatedData.map(r => (
                    <tr key={`${r.employee}-${r.attendance_date}`} className="hover:bg-[#E4B315]/8/20 transition-colors">
                      <Td><AvatarCell name={r.employee_name} /></Td>
                      <Td className="mono text-xs">{formatDate(r.attendance_date)}</Td>
                      <Td>
                        <span className={`flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPill(r.status)}`}>
                          {r.status}
                        </span>
                      </Td>
                      <Td className="mono text-xs">{r.in_time || '—'}</Td>
                      <Td className="mono text-xs">{r.out_time || '—'}</Td>
                      <Td className="mono text-xs">{r.working_hours || '—'}</Td>
                      <Td>{r.shift || '—'}</Td>
                      <Td>
                        <button onClick={() => onMarkAttendance(r.employee, r.attendance_date, r.status === 'Present' ? 'Absent' : 'Present')}
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition" title="Mark attendance">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </Td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </TableCard>
      </div>

      <Modal title="Mark Attendance" open={markModal} onClose={() => setMarkModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee</label>
            <Select value={form.employee} onChange={v => setForm(f => ({ ...f, employee: v }))}
              options={employees.map(e => ({ value: e.name, label: e.employee_name }))} placeholder="Select employee…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Date</label>
            <input type="date" value={form.attendance_date} max={today()}
              onChange={e => setForm(f => ({ ...f, attendance_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
            <Select value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
              options={['Present', 'Absent', 'Half Day', 'On Leave'].map(s => ({ value: s, label: s }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setMarkModal(false)}
              className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => { onMarkAttendance(form.employee, form.attendance_date, form.status); setMarkModal(false); }}
              disabled={!form.employee}
              className="flex-1 px-4 py-2 text-sm font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm shadow-[#E4B315]/20">
              Submit
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// SHIFTS TAB
// ─────────────────────────────────────────────────────
const ShiftsTab: React.FC<{
  shiftTypes: ShiftType[];
  shiftAssignments: ShiftAssignment[];
  employees: Employee[];
  loading: boolean;
  onAssign: (emp: string, shift: string, date: string) => void;
  onCreateShiftType: (data: Partial<ShiftType>) => void;
}> = ({ shiftTypes, shiftAssignments, employees, loading, onAssign, onCreateShiftType }) => {
  const [assignModal, setAssignModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [assignForm, setAssignForm] = useState({ employee: '', shift_type: '', start_date: '' });
  const [typeForm, setTypeForm] = useState({
    name: '', start_time: '09:00:00', end_time: '18:00:00',
    begin_check_in_before_shift_start_time: 60, allow_check_out_after_shift_end_time: 60,
    enable_auto_attendance: 1,
    determine_check_in_and_check_out: 'Alternating entries as IN and OUT during the same shift',
    working_hours_calculation_based_on: 'First Check-in and Last Check-out'
  });
  const [activeSection, setActiveSection] = useState<'assignments' | 'types'>('assignments');

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-4 flex-shrink-0">
        {[{ k: 'assignments', l: 'Assignments' }, { k: 'types', l: 'Shift Types' }].map(({ k, l }) => (
          <button key={k} onClick={() => setActiveSection(k as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeSection === k ? 'bg-white shadow text-gray-900' : 'text-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        {activeSection === 'assignments' && (
          <TableCard title="Shift Assignments" count={shiftAssignments.length}
            action={
              <button onClick={() => setAssignModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition">
                <Plus className="w-3 h-3" />Assign
              </button>
            }
          >
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Employee</Th><Th>Shift Type</Th><Th>Start Date</Th><Th>Status</Th><Th>Actions</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <LoadingRow cols={5} /> :
                  shiftAssignments.length === 0 ? <EmptyRow cols={5} /> :
                    shiftAssignments.map(sa => (
                      <tr key={sa.name} className="hover:bg-[#E4B315]/8/20 transition-colors">
                        <Td><AvatarCell name={sa.employee_name} /></Td>
                        <Td>{sa.shift_type}</Td>
                        <Td className="mono text-xs">{formatDate(sa.start_date)}</Td>
                        <Td><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sa.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>{sa.status}</span></Td>
                        <Td>
                          <button onClick={() => {
                            if (confirm(`Delete assignment for ${sa.employee_name}?`)) {
                              // Handle delete
                            }
                          }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="Delete">
                            <X className="w-4 h-4" />
                          </button>
                        </Td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </TableCard>
        )}

        {activeSection === 'types' && (
          <TableCard title="Shift Types" count={shiftTypes.length}
            action={
              <button onClick={() => setTypeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition">
                <Plus className="w-3 h-3" />New Type
              </button>
            }
          >
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Name</Th><Th>Start Time</Th><Th>End Time</Th><Th>Actions</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <LoadingRow cols={4} /> :
                  shiftTypes.length === 0 ? <EmptyRow cols={4} /> :
                    shiftTypes.map(st => (
                      <tr key={st.name} className="hover:bg-[#E4B315]/8/20 transition-colors">
                        <Td className="font-semibold">{st.name}</Td>
                        <Td className="mono text-xs">{st.start_time}</Td>
                        <Td className="mono text-xs">{st.end_time}</Td>
                        <Td>
                          <button onClick={() => {
                            if (confirm(`Delete shift type "${st.name}"?`)) {
                              // Handle delete
                            }
                          }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="Delete">
                            <X className="w-4 h-4" />
                          </button>
                        </Td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>

      <Modal title="Assign Shift" open={assignModal} onClose={() => setAssignModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee</label>
            <Select value={assignForm.employee} onChange={v => setAssignForm(f => ({ ...f, employee: v }))}
              options={employees.map(e => ({ value: e.name, label: e.employee_name }))} placeholder="Select employee…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Shift Type</label>
            <Select value={assignForm.shift_type} onChange={v => setAssignForm(f => ({ ...f, shift_type: v }))}
              options={shiftTypes.map(t => ({ value: t.name, label: t.name }))} placeholder="Select shift type…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
            <input type="date" value={assignForm.start_date} onChange={e => setAssignForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setAssignModal(false)}
              className="flex-1 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => {
              if (assignForm.employee && assignForm.shift_type && assignForm.start_date) {
                onAssign(assignForm.employee, assignForm.shift_type, assignForm.start_date);
                setAssignModal(false);
                setAssignForm({ employee: '', shift_type: '', start_date: '' });
              }
            }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-[#E4B315]/20">Assign</button>
          </div>
        </div>
      </Modal>

      <Modal title="Create Shift Type" open={typeModal} onClose={() => setTypeModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Shift Name</label>
            <input type="text" value={typeForm.name} onChange={e => setTypeForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" placeholder="e.g., Morning Shift" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Time</label>
              <input type="time" value={typeForm.start_time} onChange={e => setTypeForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Time</label>
              <input type="time" value={typeForm.end_time} onChange={e => setTypeForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Begin Check-in Before (min)</label>
              <input type="number" value={typeForm.begin_check_in_before_shift_start_time}
                onChange={e => setTypeForm(f => ({ ...f, begin_check_in_before_shift_start_time: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Allow Check-out After (min)</label>
              <input type="number" value={typeForm.allow_check_out_after_shift_end_time}
                onChange={e => setTypeForm(f => ({ ...f, allow_check_out_after_shift_end_time: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setTypeModal(false)}
              className="flex-1 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => {
              if (typeForm.name && typeForm.start_time && typeForm.end_time) {
                onCreateShiftType(typeForm);
                setTypeModal(false);
                setTypeForm({
                  name: '', start_time: '09:00:00', end_time: '18:00:00',
                  begin_check_in_before_shift_start_time: 60, allow_check_out_after_shift_end_time: 60,
                  enable_auto_attendance: 1,
                  determine_check_in_and_check_out: 'Alternating entries as IN and OUT during the same shift',
                  working_hours_calculation_based_on: 'First Check-in and Last Check-out'
                });
              }
            }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-[#E4B315]/20">Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// LEAVES TAB
// ─────────────────────────────────────────────────────
const LeavesTab: React.FC<{
  leaveApplications: LeaveApplication[];
  leaveAllocations: LeaveAllocation[];
  leaveTypes: LeaveType[];
  employees: Employee[];
  loading: boolean;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onApprove: (name: string) => void;
  onReject: (name: string) => void;
  onApply: (data: Partial<LeaveApplication>) => void;
  onCreateLeaveType: (data: Partial<LeaveType>) => void;
  onAllocate: (data: Partial<LeaveAllocation>) => void;
}> = ({ leaveApplications, leaveAllocations, leaveTypes, employees, loading, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange, onApprove, onReject, onApply, onCreateLeaveType, onAllocate }) => {
  const [applyModal, setApplyModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [allocateModal, setAllocateModal] = useState(false);
  const [activeSection, setActiveSection] = useState<'applications' | 'allocations'>('applications');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    employee: '', leave_type: '', from_date: today(), to_date: today(), description: '', half_day: 0,
  });
  const [typeForm, setTypeForm] = useState({
    leave_type_name: '', max_leaves_allowed: 0, is_carry_forward: 0, is_lwp: 0, is_earned_leave: 0, include_holiday: 1,
    is_compensatory: 0, allow_encashment: 0
  });
  const [allocateForm, setAllocateForm] = useState({
    employee: '', leave_type: '', from_date: today(), to_date: new Date(new Date().getFullYear(), 11, 31).toISOString().split('T')[0], new_leaves_allocated: 0
  });

  const filtered = leaveApplications.filter(l => !statusFilter || l.status === statusFilter);

  // Pagination logic for leave applications
  const paginatedApplications = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-4 flex-shrink-0">
        {[{ k: 'applications', l: 'Applications' }, { k: 'allocations', l: 'Allocations' }].map(({ k, l }) => (
          <button key={k} onClick={() => setActiveSection(k as any)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${activeSection === k ? 'bg-white shadow text-gray-900' : 'text-slate-500'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        {activeSection === 'applications' && (
          <>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <Select value={statusFilter} onChange={setStatusFilter} className="w-44"
                options={[{ value: 'Open', label: 'Open' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }]}
                placeholder="All statuses" />
            </div>
            <TableCard title="Leave Applications" count={filtered.length}
              action={
                <button onClick={() => setApplyModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition">
                  <Plus className="w-3 h-3" />Apply
                </button>
              }
            >
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr><Th>Employee</Th><Th>Leave Type</Th><Th>From</Th><Th>To</Th><Th>Days</Th><Th>Status</Th><Th>description</Th><Th>Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? <LoadingRow cols={8} /> :
                    filtered.length === 0 ? <EmptyRow cols={8} /> :
                      filtered.map(l => (
                        <tr key={l.name} className="hover:bg-[#E4B315]/8/20 transition-colors">
                          <Td><AvatarCell name={l.employee_name} /></Td>
                          <Td>{l.leave_type}</Td>
                          <Td className="mono text-xs">{formatDate(l.from_date)}</Td>
                          <Td className="mono text-xs">{formatDate(l.to_date)}</Td>
                          <Td><span className="font-semibold text-[#C69A11]">{l.total_leave_days}</span></Td>
                          <Td><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusPill(l.status)}`}>{l.status}</span></Td>
                          <Td className="max-w-[160px] truncate" title={l.description}>{l.description || '—'}</Td>
                          <Td>
                            {(l.status === 'Open' || l.status === 'Pending') && (
                              <div className="flex gap-1">
                                <button onClick={() => onApprove(l.name)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition" title="Approve">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => onReject(l.name)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="Reject">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </Td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </TableCard>
          </>
        )}

        {activeSection === 'allocations' && (
          <TableCard title="Leave Allocations" count={leaveAllocations.length}
            action={
              <div className="flex gap-2">
                <button onClick={() => setTypeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition">
                  <Plus className="w-3 h-3" />New Type
                </button>
                <button onClick={() => setAllocateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition">
                  <Plus className="w-3 h-3" />Allocate
                </button>
              </div>
            }
          >
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><Th>Leave Type</Th><Th>Max Leaves</Th><Th>Employee</Th><Th>Allocated</Th><Th>From</Th><Th>To</Th><Th>Actions</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <LoadingRow cols={7} /> :
                  leaveTypes.length === 0 ? <EmptyRow cols={7} /> :
                    leaveTypes.map(lt => {
                      const allocations = leaveAllocations.filter(la => la.leave_type === lt.name);
                      return (
                        <tr key={lt.name} className="hover:bg-[#E4B315]/8/20 transition-colors">
                          <Td className="font-semibold">{lt.name}</Td>
                          <Td><span className="text-gray-600">{lt.max_leaves_allowed || 'Unlimited'}</span></Td>
                          {allocations.length > 0 ? (
                            allocations.map((allocation, idx) => (
                              <React.Fragment key={allocation.name}>
                                {idx === 0 && <Td><AvatarCell name={allocation.employee_name} /></Td>}
                                {idx === 0 && <Td><span className="font-semibold text-[#C69A11]">{allocation.new_leaves_allocated}</span></Td>}
                                {idx === 0 && <Td className="mono text-xs">{formatDate(allocation.from_date)}</Td>}
                                {idx === 0 && <Td className="mono text-xs">{formatDate(allocation.to_date)}</Td>}
                                {idx === 0 && (
                                  <Td>
                                    <button onClick={() => {
                                      if (confirm(`Delete allocation for ${allocation.employee_name}?`)) {
                                        // Handle delete
                                      }
                                    }}
                                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="Delete">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </Td>
                                )}
                                {idx > 0 && (
                                  <>
                                    <Td colSpan={5} className="text-xs text-gray-500 py-2">
                                      <div className="flex items-center gap-2">
                                        <AvatarCell name={allocation.employee_name} />
                                        <span>Allocated: {allocation.new_leaves_allocated} ({formatDate(allocation.from_date)} - {formatDate(allocation.to_date)})</span>
                                        <button onClick={() => {
                                          if (confirm(`Delete allocation for ${allocation.employee_name}?`)) {
                                            // Handle delete
                                          }
                                        }}
                                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 transition" title="Delete">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </Td>
                                  </>
                                )}
                              </React.Fragment>
                            ))
                          ) : (
                            <>
                              <Td colSpan={5} className="text-gray-400 text-sm">
                                <div className="flex items-center justify-between">
                                  <span>No allocations yet</span>
                                  <button 
                                    onClick={() => setAllocateModal(true)}
                                    className="text-xs text-[#C69A11] hover:text-[#E4B315] font-medium"
                                  >
                                    Allocate Now
                                  </button>
                                </div>
                              </Td>
                            </>
                          )}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </TableCard>
        )}
      </div>

      <Modal title="Apply for Leave" open={applyModal} onClose={() => setApplyModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee</label>
            <Select value={form.employee} onChange={v => setForm(f => ({ ...f, employee: v }))}
              options={employees.map(e => ({ value: e.name, label: e.employee_name }))} placeholder="Select employee…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Leave Type</label>
            <Select value={form.leave_type} onChange={v => setForm(f => ({ ...f, leave_type: v }))}
              options={leaveTypes.map(t => ({ value: t.name, label: t.name }))} placeholder="Select leave type…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date</label>
              <input type="date" value={form.from_date} onChange={e => setForm(f => ({ ...f, from_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date</label>
              <input type="date" value={form.to_date} onChange={e => setForm(f => ({ ...f, to_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" rows={3}
              placeholder="Enter reason for leave…" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setApplyModal(false)}
              className="flex-1 px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => {
              if (form.employee && form.leave_type && form.from_date && form.to_date) {
                onApply(form);
                setApplyModal(false);
                setForm({ employee: '', leave_type: '', from_date: '', to_date: '', description: '', half_day: 0 });
              }
            }}
              className="flex-1 px-3 py-2 text-xs font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-[#E4B315]/20">Apply</button>
          </div>
        </div>
      </Modal>

      <Modal title="Allocate Leave" open={allocateModal} onClose={() => setAllocateModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee</label>
            <Select value={allocateForm.employee} onChange={v => setAllocateForm(f => ({ ...f, employee: v }))}
              options={employees.map(e => ({ value: e.name, label: e.employee_name }))} placeholder="Select employee…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Leave Type</label>
            <Select value={allocateForm.leave_type} onChange={v => setAllocateForm(f => ({ ...f, leave_type: v }))}
              options={leaveTypes.map(t => ({ value: t.name, label: t.name }))} placeholder="Select leave type…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">From Date</label>
              <input type="date" value={allocateForm.from_date} onChange={e => setAllocateForm(f => ({ ...f, from_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">To Date</label>
              <input type="date" value={allocateForm.to_date} onChange={e => setAllocateForm(f => ({ ...f, to_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">New Leaves Allocated</label>
            <input type="number" value={allocateForm.new_leaves_allocated} onChange={e => setAllocateForm(f => ({ ...f, new_leaves_allocated: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setAllocateModal(false)}
              className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => {
                onAllocate(allocateForm);
                setAllocateModal(false);
              }}
              disabled={!allocateForm.employee || !allocateForm.leave_type}
              className="flex-1 px-4 py-2 text-sm font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm shadow-[#E4B315]/20">
              Allocate
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Create Leave Type" open={typeModal} onClose={() => setTypeModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Leave Type Name</label>
            <input type="text" value={typeForm.leave_type_name} onChange={e => setTypeForm(f => ({ ...f, leave_type_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" 
              placeholder="e.g., Casual Leave" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Max Leaves Allowed</label>
            <input type="number" value={typeForm.max_leaves_allowed} onChange={e => setTypeForm(f => ({ ...f, max_leaves_allowed: parseFloat(e.target.value) || 0 }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="carry_forward" checked={typeForm.is_carry_forward === 1} onChange={e => setTypeForm(f => ({ ...f, is_carry_forward: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-[#E4B315] border-slate-300 rounded focus:ring-[#E4B315]/30" />
              <label htmlFor="carry_forward" className="text-xs font-medium text-gray-700">Carry Forward</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="lwp" checked={typeForm.is_lwp === 1} onChange={e => setTypeForm(f => ({ ...f, is_lwp: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-[#E4B315] border-slate-300 rounded focus:ring-[#E4B315]/30" />
              <label htmlFor="lwp" className="text-xs font-medium text-gray-700">Without Pay</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="earned_leave" checked={typeForm.is_earned_leave === 1} onChange={e => setTypeForm(f => ({ ...f, is_earned_leave: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-[#E4B315] border-slate-300 rounded focus:ring-[#E4B315]/30" />
              <label htmlFor="earned_leave" className="text-xs font-medium text-gray-700">Earned Leave</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="include_holiday" checked={typeForm.include_holiday === 1} onChange={e => setTypeForm(f => ({ ...f, include_holiday: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-[#E4B315] border-slate-300 rounded focus:ring-[#E4B315]/30" />
              <label htmlFor="include_holiday" className="text-xs font-medium text-gray-700">Include Holidays</label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="compensatory" checked={typeForm.is_compensatory === 1} onChange={e => setTypeForm(f => ({ ...f, is_compensatory: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-[#E4B315] border-slate-300 rounded focus:ring-[#E4B315]/30" />
              <label htmlFor="compensatory" className="text-xs font-medium text-gray-700">Compensatory</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="encashment" checked={typeForm.allow_encashment === 1} onChange={e => setTypeForm(f => ({ ...f, allow_encashment: e.target.checked ? 1 : 0 }))}
                className="w-4 h-4 text-[#E4B315] border-slate-300 rounded focus:ring-[#E4B315]/30" />
              <label htmlFor="encashment" className="text-xs font-medium text-gray-700">Allow Encashment</label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setTypeModal(false)}
              className="flex-1 px-4 py-2 text-sm font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={() => {
                if (typeForm.leave_type_name) {
                  onCreateLeaveType(typeForm);
                  setTypeModal(false);
                  setTypeForm({
                    leave_type_name: '', max_leaves_allowed: 0, is_carry_forward: 0, is_lwp: 0, is_earned_leave: 0, include_holiday: 1,
                    is_compensatory: 0, allow_encashment: 0
                  });
                }
              }}
              disabled={!typeForm.leave_type_name}
              className="flex-1 px-4 py-2 text-sm font-bold bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm shadow-[#E4B315]/20">
              Create
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─────────────────────────────────────────────────────
// CHECK-IN LOG TAB
// ─────────────────────────────────────────────────────
const CheckinLogTab: React.FC<{ 
  checkins: CheckInLog[]; 
  employees: Employee[]; 
  loading: boolean;
}> = ({ checkins, employees, loading }) => {
  const [search, setSearch] = useState('');
  const filtered = checkins.filter(c =>
    !search ||
    (c.employee_name ?? employees.find(e => e.name === c.employee)?.employee_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 transition-colors" />
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        <TableCard title="Employee Check-in Log" count={filtered.length}>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr><Th>Employee</Th><Th>Time</Th><Th>Type</Th><Th>Shift</Th><Th>Device</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <LoadingRow cols={5} /> :
                filtered.length === 0 ? <EmptyRow cols={5} /> :
                  filtered.map((c, i) => {
                    const empName = c.employee_name ?? employees.find(e => e.name === c.employee)?.employee_name ?? c.employee;
                    return (
                      <tr key={c.name ?? i} className="hover:bg-[#E4B315]/8/20 transition-colors">
                        <Td><AvatarCell name={empName} /></Td>
                        <Td className="mono text-xs">
                          {(() => {
                            try { return new Date(c.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }); }
                            catch { return c.time; }
                          })()}
                        </Td>
                        <Td>
                          <span className={`flex items-center gap-1.5 w-fit px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.log_type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            {c.log_type === 'IN' ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                            {c.log_type}
                          </span>
                        </Td>
                        <Td>{c.shift || '—'}</Td>
                        <Td className="mono text-xs">{c.device_id || '—'}</Td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </TableCard>
      </div>
    </div>
  );
};

export default WorkspaceManagement;