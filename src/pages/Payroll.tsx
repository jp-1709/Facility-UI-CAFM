import React, { useState, useEffect } from 'react';
import {
    Search, RefreshCw, Eye, X, Users, DollarSign, FileText,
    AlertCircle, CheckCircle, TrendingUp, Settings, Save, Plus, Trash2,
    LayoutList, UserCheck, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/PageLayout';

/* ─────────────── INTERFACES ─────────────── */

interface PayrollEntry {
    name: string;
    posting_date: string;
    company: string;
    status: string;
    payroll_frequency: string;
    start_date: string;
    end_date: string;
    number_of_employees: number;
    salary_slips_created: number;
    salary_slips_submitted: number;
    branch: string;
    department: string;
    designation: string;
    creation: string;
    modified: string;
}

interface SalarySlip {
    name: string;
    employee: string;
    employee_name: string;
    company: string;
    department: string;
    designation: string;
    branch: string;
    posting_date: string;
    status: string;
    currency: string;
    exchange_rate: number;
    payroll_frequency: string;
    start_date: string;
    end_date: string;
    salary_structure: string;
    payroll_entry: string;
    mode_of_payment: string;
    total_working_days: number;
    payment_days: number;
    absent_days: number;
    leave_without_pay: number;
    gross_pay: number;
    total_deduction: number;
    net_pay: number;
    rounded_total: number;
    total_in_words: string;
    creation: string;
    modified: string;
}

interface SalaryStructure {
    name: string;
    company: string;
    currency: string;
    is_active: string;
    payroll_frequency: string;
    salary_slip_based_on_timesheet: number;
    leave_encashment_amount_per_day: number;
    max_benefits: number;
    mode_of_payment: string;
    payment_account: string;
    creation: string;
    modified: string;
}

interface SalaryDetail {
    id: string;
    salary_component: string;
    abbr: string;
    amount: string;
    formula: string;
    condition: string;
    depends_on_payment_days: number;
    statistical_component: number;
    do_not_include_in_total: number;
}

interface NewSalaryStructure {
    company: string;
    letter_head: string;
    is_active: string;
    currency: string;
    salary_slip_based_on_timesheet: number;
    payroll_frequency: string;
    salary_component: string;
    hour_rate: string;
    leave_encashment_amount_per_day: string;
    max_benefits: string;
    mode_of_payment: string;
    payment_account: string;
}

interface PayrollSettings {
    payroll_based_on: string;
    consider_unmarked_attendance_as: string;
    include_holidays_in_total_working_days: number;
    consider_marked_attendance_on_holidays: number;
    max_working_hours_against_timesheet: number;
    daily_wages_fraction_for_half_day: number;
    disable_rounded_total: number;
    show_leave_balances_in_salary_slip: number;
    email_salary_slip_to_employee: number;
    encrypt_salary_slips_in_emails: number;
    process_payroll_accounting_entry_based_on_employee: number;
    sender?: string;
    email_template?: string;
}

interface NewPayrollEntry {
    posting_date: string;
    company: string;
    currency: string;
    exchange_rate: number;
    payroll_payable_account: string;
    salary_slip_based_on_timesheet: number;
    payroll_frequency: string;
    start_date: string;
    end_date: string;
    deduct_tax_for_unclaimed_employee_benefits: number;
    deduct_tax_for_unsubmitted_tax_exemption_proof: number;
    branch: string;
    department: string;
    designation: string;
    cost_center: string;
    project: string;
    bank_account: string;
    payment_account: string;
    validate_attendance: number;
}

interface PayrollStatus {
    value: string;
    label: string;
}

interface SalaryStructureAssignment {
    name: string;
    employee: string;
    employee_name: string;
    department: string;
    designation: string;
    grade: string;
    salary_structure: string;
    from_date: string;
    income_tax_slab: string;
    company: string;
    payroll_payable_account: string;
    currency: string;
    base: number;
    variable: number;
    docstatus: number;
    creation: string;
    modified: string;
}

interface PayrollEmployee {
    name: string;
    employee_name: string;
    department: string;
    designation: string;
    branch: string;
    company: string;
    date_of_joining: string;
    selected: boolean;
}

interface NewSalaryStructureAssignment {
    employee: string;
    salary_structure: string;
    from_date: string;
    company: string;
    income_tax_slab: string;
    payroll_payable_account: string;
    base: string;
    variable: string;
    taxable_earnings_till_date: string;
    tax_deducted_till_date: string;
}
const TODAY = new Date().toISOString().split('T')[0];

const DEFAULT_NEW_ASSIGNMENT: NewSalaryStructureAssignment = {
    
    employee: '',
    salary_structure: '',
    from_date: TODAY,
    company: '',
    income_tax_slab: '',
    payroll_payable_account: '',
    base: '',
    variable: '',
    taxable_earnings_till_date: '',
    tax_deducted_till_date: '',
};


const DEFAULT_NEW_ENTRY: NewPayrollEntry = {
    posting_date: TODAY,
    company: '',
    currency: '',
    exchange_rate: 1,
    payroll_payable_account: '',
    salary_slip_based_on_timesheet: 0,
    payroll_frequency: 'Monthly',
    start_date: '',
    end_date: '',
    deduct_tax_for_unclaimed_employee_benefits: 0,
    deduct_tax_for_unsubmitted_tax_exemption_proof: 0,
    branch: '',
    department: '',
    designation: '',
    cost_center: '',
    project: '',
    bank_account: '',
    payment_account: '',
    validate_attendance: 0,
};

const DEFAULT_NEW_STRUCTURE: NewSalaryStructure = {
    company: '',
    letter_head: '',
    is_active: 'Yes',
    currency: '',
    salary_slip_based_on_timesheet: 0,
    payroll_frequency: 'Monthly',
    salary_component: '',
    hour_rate: '',
    leave_encashment_amount_per_day: '',
    max_benefits: '',
    mode_of_payment: '',
    payment_account: '',
};

const newSalaryDetailRow = (): SalaryDetail => ({
    id: Math.random().toString(36).slice(2),
    salary_component: '',
    abbr: '',
    amount: '',
    formula: '',
    condition: '',
    depends_on_payment_days: 1,
    statistical_component: 0,
    do_not_include_in_total: 0,
});

/* ─────────────── COMPONENT ─────────────── */

const PayrollPage: React.FC = () => {
    const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
    const [salarySlips, setSalarySlips] = useState<SalarySlip[]>([]);
    const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
    const [salaryStructureAssignments, setSalaryStructureAssignments] = useState<SalaryStructureAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrequency, setFilterFrequency] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [selectedTab, setSelectedTab] = useState<'payroll' | 'salary' | 'structures' | 'assignments' | 'components' | 'settings'>('payroll');

    // Detail modals
    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [showSalaryModal, setShowSalaryModal] = useState(false);
    const [selectedPayrollEntry, setSelectedPayrollEntry] = useState<PayrollEntry | null>(null);
    const [selectedSalarySlip, setSelectedSalarySlip] = useState<SalarySlip | null>(null);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Create Payroll Entry modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newEntry, setNewEntry] = useState<NewPayrollEntry>({ ...DEFAULT_NEW_ENTRY });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

    // Create Salary Structure modal
    const [showCreateStructureModal, setShowCreateStructureModal] = useState(false);
    const [newStructure, setNewStructure] = useState<NewSalaryStructure>({ ...DEFAULT_NEW_STRUCTURE });
    const [structureName, setStructureName] = useState('');
    const [earningsRows, setEarningsRows] = useState<SalaryDetail[]>([newSalaryDetailRow()]);
    const [deductionRows, setDeductionRows] = useState<SalaryDetail[]>([newSalaryDetailRow()]);
    const [creatingStructure, setCreatingStructure] = useState(false);
    const [createStructureError, setCreateStructureError] = useState<string | null>(null);
    const [createStructureSuccess, setCreateStructureSuccess] = useState<string | null>(null);

    // Create Salary Structure Assignment modal
    const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false);
    const [newAssignment, setNewAssignment] = useState<NewSalaryStructureAssignment>({ ...DEFAULT_NEW_ASSIGNMENT });
    const [creatingAssignment, setCreatingAssignment] = useState(false);
    const [createAssignmentError, setCreateAssignmentError] = useState<string | null>(null);
    const [createAssignmentSuccess, setCreateAssignmentSuccess] = useState<string | null>(null);

    // Create Salary Component modal
    const [showCreateComponentModal, setShowCreateComponentModal] = useState(false);
    const [newComponent, setNewComponent] = useState({
        salary_component: '',
        salary_component_abbr: '',
        type: 'Earning',
        description: '',
        depends_on_payment_days: 1,
        is_tax_applicable: 0,
        deduct_full_tax_on_selected_payroll_date: 0,
        variable_based_on_taxable_salary: 0,
        is_income_tax_component: 0,
        exempted_from_income_tax: 0,
        round_to_the_nearest_integer: 0,
        statistical_component: 0,
        do_not_include_in_total: 0,
        do_not_include_in_accounts: 0,
        remove_if_zero_valued: 1,
        disabled: 0,
        amount: 0,
        amount_based_on_formula: 0,
        is_flexible_benefit: 0,
        max_benefit_amount: 0,
        pay_against_benefit_claim: 0,
        only_tax_impact: 0,
        create_separate_payment_entry_against_benefit_claim: 0
    });
    const [creatingComponent, setCreatingComponent] = useState(false);
    const [createComponentError, setCreateComponentError] = useState<string | null>(null);
    const [createComponentSuccess, setCreateComponentSuccess] = useState<string | null>(null);

    // Salary Components list
    const [componentsList, setComponentsList] = useState<Array<any>>([]);
    const [componentsLoading, setComponentsLoading] = useState(false);
    const [componentsError, setComponentsError] = useState<string | null>(null);
    // Fetched read-only fields populated after employee selection
    const [assignmentEmployeeName, setAssignmentEmployeeName] = useState('');
    const [assignmentDepartment, setAssignmentDepartment] = useState('');
    const [assignmentDesignation, setAssignmentDesignation] = useState('');
    const [assignmentCurrency, setAssignmentCurrency] = useState('');
    const [fetchingEmployee, setFetchingEmployee] = useState(false);

    // Employee selection for payroll
    const [showEmployeeSelectionModal, setShowEmployeeSelectionModal] = useState(false);
    const [availableEmployees, setAvailableEmployees] = useState<PayrollEmployee[]>([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [employeesError, setEmployeesError] = useState<string | null>(null);
    const [creatingSalarySlips, setCreatingSalarySlips] = useState(false);
    const [salarySlipCreationResult, setSalarySlipCreationResult] = useState<string | null>(null);
    const [currentPayrollEntryName, setCurrentPayrollEntryName] = useState<string | null>(null);

    // Dropdown options for payroll entry form
    const [companies, setCompanies] = useState<Array<{name: string, company_name: string, default_payroll_payable_account?: string}>>([]);
    const [currencies, setCurrencies] = useState<Array<{name: string, currency_name: string}>>([]);
    const [costCenters, setCostCenters] = useState<Array<{name: string, cost_center_name: string}>>([]);
    const [modesOfPayment, setModesOfPayment] = useState<Array<{name: string, mode_of_payment_name: string}>>([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    // Dropdown options for salary structure assignment form
    const [employees, setEmployees] = useState<Array<{name: string, employee_name: string, department?: string, designation?: string, company?: string}>>([]);
    const [salaryStructuresList, setSalaryStructuresList] = useState<Array<{name: string, company?: string, currency?: string}>>([]);
    const [salaryComponents, setSalaryComponents] = useState<Array<{name: string, salary_component_name?: string}>>([]);

    // Status / frequency options
    const [payrollStatuses, setPayrollStatuses] = useState<PayrollStatus[]>([]);
    const [salarySlipStatuses, setSalarySlipStatuses] = useState<PayrollStatus[]>([]);
    const [payrollFrequencies, setPayrollFrequencies] = useState<string[]>([]);

    // Payroll Settings
    const [settings, setSettings] = useState<PayrollSettings>({
        payroll_based_on: 'Leave',
        consider_unmarked_attendance_as: 'Present',
        include_holidays_in_total_working_days: 0,
        consider_marked_attendance_on_holidays: 0,
        max_working_hours_against_timesheet: 0,
        daily_wages_fraction_for_half_day: 0.5,
        disable_rounded_total: 0,
        show_leave_balances_in_salary_slip: 0,
        email_salary_slip_to_employee: 1,
        encrypt_salary_slips_in_emails: 0,
        process_payroll_accounting_entry_based_on_employee: 0,
        sender: '',
        email_template: '',
    });
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [settingsSaving, setSettingsSaving] = useState(false);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

    /* ── Fetch helpers ── */

    const fetchPayrollEntries = async () => {
        try {
            setLoading(true); setError(null);
            const res = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_payroll_entries', {
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const result = await res.json();
                const data = result.message || result;
                if (data.success) setPayrollEntries(data.payroll_entries);
                else { setError(data.error || 'Failed'); setPayrollEntries([]); }
            } else { setError('Failed to fetch payroll entries'); setPayrollEntries([]); }
        } catch { setError('An error occurred while fetching payroll entries'); setPayrollEntries([]); }
        finally { setLoading(false); }
    };

    const fetchSalarySlips = async () => {
        try {
            setLoading(true); setError(null);
            const res = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_salary_slips', {
                headers: { 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                const result = await res.json();
                const data = result.message || result;
                if (data.success) setSalarySlips(data.salary_slips);
                else { setError(data.error || 'Failed'); setSalarySlips([]); }
            } else { setError('Failed to fetch salary slips'); setSalarySlips([]); }
        } catch { setError('An error occurred while fetching salary slips'); setSalarySlips([]); }
        finally { setLoading(false); }
    };

    const fetchSalaryStructures = async () => {
        try {
            setLoading(true); setError(null);
            const res = await fetch(
                '/api/resource/Salary Structure?fields=["name","company","currency","is_active","payroll_frequency","salary_slip_based_on_timesheet","leave_encashment_amount_per_day","max_benefits","mode_of_payment","payment_account","creation","modified"]&limit=100',
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.ok) {
                const result = await res.json();
                setSalaryStructures(result.data || []);
            } else { setError('Failed to fetch salary structures'); setSalaryStructures([]); }
        } catch { setError('An error occurred while fetching salary structures'); setSalaryStructures([]); }
        finally { setLoading(false); }
    };

    const fetchSalaryStructureAssignments = async () => {
        try {
            setLoading(true); setError(null);
            const res = await fetch(
                '/api/resource/Salary Structure Assignment?fields=["name","employee","employee_name","department","designation","grade","salary_structure","from_date","income_tax_slab","company","payroll_payable_account","currency","base","variable","docstatus","creation","modified"]&limit=200&order_by=modified desc',
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.ok) {
                const result = await res.json();
                setSalaryStructureAssignments(result.data || []);
            } else { setError('Failed to fetch salary structure assignments'); setSalaryStructureAssignments([]); }
        } catch { setError('An error occurred while fetching salary structure assignments'); setSalaryStructureAssignments([]); }
        finally { setLoading(false); }
    };

    const fetchEmployeeDetails = async (employeeId: string) => {
        if (!employeeId.trim()) {
            setAssignmentEmployeeName(''); setAssignmentDepartment('');
            setAssignmentDesignation(''); setAssignmentCurrency('');
            updateAssignment('company', '');
            return;
        }
        try {
            setFetchingEmployee(true);
            const res = await fetch(
                `/api/resource/Employee/${encodeURIComponent(employeeId)}?fields=["employee_name","department","designation","company"]`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.ok) {
                const r = await res.json();
                const d = r.data || {};
                setAssignmentEmployeeName(d.employee_name || '');
                setAssignmentDepartment(d.department || '');
                setAssignmentDesignation(d.designation || '');
                setNewAssignment(prev => ({ ...prev, company: d.company || '' }));
            }
        } catch { /* ignore */ }
        finally { setFetchingEmployee(false); }
    };

    const fetchStructureCurrency = async (structureName: string) => {
        if (!structureName.trim()) { setAssignmentCurrency(''); return; }
        try {
            const res = await fetch(
                `/api/resource/Salary Structure/${encodeURIComponent(structureName)}?fields=["currency"]`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.ok) {
                const r = await res.json();
                setAssignmentCurrency((r.data || {}).currency || '');
            }
        } catch { /* ignore */ }
    };

    const fetchPayrollStatuses = async () => {
        try {
            const res = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_payroll_statuses', { headers: { 'Content-Type': 'application/json' } });
            if (res.ok) { const r = await res.json(); const d = r.message || r; if (d.success) setPayrollStatuses(d.statuses.map((s: string) => ({ value: s, label: s }))); }
        } catch { /* ignore */ }
    };

    const fetchSalarySlipStatuses = async () => {
        try {
            const res = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_salary_slip_statuses', { headers: { 'Content-Type': 'application/json' } });
            if (res.ok) { const r = await res.json(); const d = r.message || r; if (d.success) setSalarySlipStatuses(d.statuses.map((s: string) => ({ value: s, label: s }))); }
        } catch { /* ignore */ }
    };

    const fetchPayrollFrequencies = async () => {
        try {
            const res = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_payroll_frequencies', { headers: { 'Content-Type': 'application/json' } });
            if (res.ok) { const r = await res.json(); const d = r.message || r; if (d.success) setPayrollFrequencies(d.frequencies); }
        } catch { /* ignore */ }
    };

    const fetchEmployeesForPayroll = async (payrollEntryData?: any) => {
        try {
            setLoadingEmployees(true);
            setEmployeesError(null);
            
            const params = new URLSearchParams();
            if (payrollEntryData?.company) params.append('company', payrollEntryData.company);
            if (payrollEntryData?.department) params.append('department', payrollEntryData.department);
            if (payrollEntryData?.designation) params.append('designation', payrollEntryData.designation);
            if (payrollEntryData?.branch) params.append('branch', payrollEntryData.branch);
            
            const res = await fetch(
                `/api/method/quantbit_ury_customization.ury_customization.employee_api.get_employees_for_payroll?${params.toString()}`,
                { headers: { 'Content-Type': 'application/json' } }
            );
            
            if (res.ok) {
                const result = await res.json();
                const data = result.message || result;
                if (data.success) {
                    const employeesWithSelection = data.employees.map((emp: any) => ({
                        ...emp,
                        selected: false
                    }));
                    setAvailableEmployees(employeesWithSelection);
                } else {
                    setEmployeesError(data.message || 'Failed to fetch employees');
                    setAvailableEmployees([]);
                }
            } else {
                setEmployeesError('Failed to fetch employees');
                setAvailableEmployees([]);
            }
        } catch (error) {
            setEmployeesError('An error occurred while fetching employees');
            setAvailableEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const addEmployeesToPayroll = async (payrollEntryName: string) => {
        try {
            // Get selected employees
            const selectedEmployeesList = availableEmployees.filter(emp => emp.selected).map(emp => emp.name);
            
            if (selectedEmployeesList.length === 0) {
                setEmployeesError('Please select at least one employee');
                return false;
            }
            
            const res = await fetch(
                '/api/method/quantbit_ury_customization.ury_customization.employee_api.add_employees_to_payroll',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        payroll_entry_name: payrollEntryName,
                        employees: selectedEmployeesList 
                    }),
                }
            );
            
            if (res.ok) {
                const result = await res.json();
                const data = result.message || result;
                if (!data.success) {
                    setEmployeesError(data.message || 'Failed to add employees to payroll entry');
                    return false;
                }
            } else {
                setEmployeesError('Failed to add employees to payroll entry');
                return false;
            }
            
            return true;
        } catch (error) {
            setEmployeesError('An error occurred while adding employees to payroll entry');
            return false;
        }
    };

    const createSalarySlipsForPayroll = async (payrollEntryName: string) => {
        try {
            setCreatingSalarySlips(true);
            setSalarySlipCreationResult(null);
            setEmployeesError(null);
            
            // First add selected employees to payroll entry
            const employeesAdded = await addEmployeesToPayroll(payrollEntryName);
            if (!employeesAdded) {
                return; // Error already set by addEmployeesToPayroll
            }
            
            // Now create salary slips
            const res = await fetch(
                '/api/method/quantbit_ury_customization.ury_customization.employee_api.create_salary_slips_for_payroll',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ payroll_entry_name: payrollEntryName }),
                }
            );
            
            if (res.ok) {
                const result = await res.json();
                const data = result.message || result;
                if (data.success) {
                    setSalarySlipCreationResult(data.message);
                    fetchSalarySlips(); // Refresh salary slips list
                    setTimeout(() => setSalarySlipCreationResult(null), 5000);
                } else {
                    setSalarySlipCreationResult(data.message || 'Failed to create salary slips');
                }
            } else {
                setSalarySlipCreationResult('Failed to create salary slips');
            }
        } catch (error) {
            setSalarySlipCreationResult('An error occurred while creating salary slips');
        } finally {
            setCreatingSalarySlips(false);
        }
    };

    const fetchPayrollEntryDetails = async (name: string) => {
        try {
            setLoadingDetails(true);
            const res = await fetch(`/api/method/quantbit_ury_customization.ury_customization.get_payroll_entry_details?entry_name=${encodeURIComponent(name)}`, { headers: { 'Content-Type': 'application/json' } });
            if (res.ok) { const r = await res.json(); const d = r.message || r; if (d.success) { setSelectedPayrollEntry(d.entry); setShowPayrollModal(true); } else alert(d.error); }
            else alert('Failed to fetch payroll entry details');
        } catch { alert('An error occurred'); }
        finally { setLoadingDetails(false); }
    };

    const fetchSalarySlipDetails = async (name: string) => {
        try {
            setLoadingDetails(true);
            const res = await fetch(`/api/method/quantbit_ury_customization.ury_customization.get_salary_slip_details?slip_name=${encodeURIComponent(name)}`, { headers: { 'Content-Type': 'application/json' } });
            if (res.ok) { const r = await res.json(); const d = r.message || r; if (d.success) { setSelectedSalarySlip(d.slip); setShowSalaryModal(true); } else alert(d.error); }
            else alert('Failed to fetch salary slip details');
        } catch { alert('An error occurred'); }
        finally { setLoadingDetails(false); }
    };

    /* ── Payroll Settings ── */

    const fetchPayrollSettings = async () => {
        try {
            setSettingsLoading(true); setSettingsError(null);
            const res = await fetch('/api/resource/Payroll Settings/Payroll Settings', { headers: { 'Content-Type': 'application/json' } });
            if (res.ok) {
                const result = await res.json();
                const data = result.data || result.message;
                if (data) setSettings({
                    payroll_based_on: data.payroll_based_on || 'Leave',
                    consider_unmarked_attendance_as: data.consider_unmarked_attendance_as || 'Present',
                    include_holidays_in_total_working_days: data.include_holidays_in_total_working_days ? 1 : 0,
                    consider_marked_attendance_on_holidays: data.consider_marked_attendance_on_holidays ? 1 : 0,
                    max_working_hours_against_timesheet: data.max_working_hours_against_timesheet || 0,
                    daily_wages_fraction_for_half_day: data.daily_wages_fraction_for_half_day ?? 0.5,
                    disable_rounded_total: data.disable_rounded_total ? 1 : 0,
                    show_leave_balances_in_salary_slip: data.show_leave_balances_in_salary_slip ? 1 : 0,
                    email_salary_slip_to_employee: data.email_salary_slip_to_employee ? 1 : 0,
                    encrypt_salary_slips_in_emails: data.encrypt_salary_slips_in_emails ? 1 : 0,
                    process_payroll_accounting_entry_based_on_employee: data.process_payroll_accounting_entry_based_on_employee ? 1 : 0,
                    sender: data.sender || '',
                    email_template: data.email_template || '',
                });
            } else {
                const e = await res.json().catch(() => ({}));
                setSettingsError(e?.exc_type || 'Failed to fetch payroll settings');
            }
        } catch { setSettingsError('An error occurred while fetching payroll settings'); }
        finally { setSettingsLoading(false); }
    };

    const savePayrollSettings = async () => {
        try {
            setSettingsSaving(true); setSettingsError(null); setSettingsSuccess(null);
            const res = await fetch('/api/resource/Payroll Settings/Payroll Settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { ...settings, doctype: 'Payroll Settings', name: 'Payroll Settings' } })
            });
            if (res.ok) {
                const r = await res.json();
                if (r.data || r.message) { setSettingsSuccess('Payroll settings saved successfully!'); setTimeout(() => setSettingsSuccess(null), 4000); }
                else setSettingsError('Failed to save payroll settings');
            } else {
                const e = await res.json().catch(() => ({}));
                setSettingsError(e?.exc_type || e?.message || 'Failed to save payroll settings');
            }
        } catch { setSettingsError('An error occurred while saving payroll settings'); }
        finally { setSettingsSaving(false); }
    };

    /* ── Fetch Dropdown Options ── */

    const fetchDropdownOptions = async () => {
        try {
            setLoadingDropdowns(true);
            
            // Fetch Companies with default payroll payable account
            const companiesRes = await fetch('/api/resource/Company?fields=["name","company_name","default_payroll_payable_account"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (companiesRes.ok) {
                const companiesData = await companiesRes.json();
                setCompanies(companiesData.data || []);
            }
            
            // Fetch Currencies
            const currenciesRes = await fetch('/api/resource/Currency?fields=["name","currency_name"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (currenciesRes.ok) {
                const currenciesData = await currenciesRes.json();
                setCurrencies(currenciesData.data || []);
            }
            
            // Fetch Cost Centers
            const costCentersRes = await fetch('/api/resource/Cost Center?fields=["name","cost_center_name"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (costCentersRes.ok) {
                const costCentersData = await costCentersRes.json();
                setCostCenters(costCentersData.data || []);
            }
            
            // Fetch Modes of Payment
            const modesOfPaymentRes = await fetch('/api/resource/Mode of Payment?fields=["name"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (modesOfPaymentRes.ok) {
                const modesOfPaymentData = await modesOfPaymentRes.json();
                setModesOfPayment(modesOfPaymentData.data || []);
            }
            
            // Fetch Employees for assignment
            const employeesRes = await fetch('/api/resource/Employee?fields=["name","employee_name","department","designation","company"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (employeesRes.ok) {
                const employeesData = await employeesRes.json();
                setEmployees(employeesData.data || []);
            }
            
            // Fetch Salary Structures for assignment
            const salaryStructuresRes = await fetch('/api/resource/Salary Structure?fields=["name","company","currency"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (salaryStructuresRes.ok) {
                const salaryStructuresData = await salaryStructuresRes.json();
                setSalaryStructuresList(salaryStructuresData.data || []);
            }
            
            // Fetch Salary Components for salary structure creation
            const salaryComponentsRes = await fetch('/api/resource/Salary Component?fields=["name"]&limit=100', { headers: { 'Content-Type': 'application/json' } });
            if (salaryComponentsRes.ok) {
                const salaryComponentsData = await salaryComponentsRes.json();
                setSalaryComponents(salaryComponentsData.data || []);
            }
            
        } catch (error) {
            console.error('Error fetching dropdown options:', error);
        } finally {
            setLoadingDropdowns(false);
        }
    };

    /* ── Handle Company Change for Assignment ── */

    const handleAssignmentCompanyChange = (companyName: string) => {
        updateAssignment('company', companyName);
        
        // Find the selected company and set its default payroll payable account
        const selectedCompany = companies.find(c => c.name === companyName);
        if (selectedCompany && selectedCompany.default_payroll_payable_account) {
            updateAssignment('payroll_payable_account', selectedCompany.default_payroll_payable_account);
        } else {
            updateAssignment('payroll_payable_account', '');
        }
    };

    /* ── Handle Employee Change for Assignment ── */

    const handleAssignmentEmployeeChange = (employeeName: string) => {
        updateAssignment('employee', employeeName);
        
        // Find the selected employee and auto-fill their details
        const selectedEmployee = employees.find(e => e.name === employeeName);
        if (selectedEmployee) {
            setAssignmentEmployeeName(selectedEmployee.employee_name || '');
            setAssignmentDepartment(selectedEmployee.department || '');
            setAssignmentDesignation(selectedEmployee.designation || '');
            updateAssignment('company', selectedEmployee.company || '');
            
            // Also set payroll payable account based on employee's company
            if (selectedEmployee.company) {
                const employeeCompany = companies.find(c => c.name === selectedEmployee.company);
                if (employeeCompany && employeeCompany.default_payroll_payable_account) {
                    updateAssignment('payroll_payable_account', employeeCompany.default_payroll_payable_account);
                }
            }
        } else {
            setAssignmentEmployeeName('');
            setAssignmentDepartment('');
            setAssignmentDesignation('');
        }
    };

    /* ── Handle Salary Structure Change for Assignment ── */

    const handleAssignmentStructureChange = (structureName: string) => {
        updateAssignment('salary_structure', structureName);
        
        // Find the selected structure and auto-fill currency
        const selectedStructure = salaryStructuresList.find(s => s.name === structureName);
        if (selectedStructure && selectedStructure.currency) {
            setAssignmentCurrency(selectedStructure.currency);
        } else {
            setAssignmentCurrency('');
        }
    };

    /* ── Handle Company Change ── */

    const handleCompanyChange = (companyName: string) => {
        // Update the company field
        updateNew('company', companyName);
        
        // Find the selected company and set its default payroll payable account
        const selectedCompany = companies.find(comp => comp.name === companyName);
        if (selectedCompany?.default_payroll_payable_account) {
            updateNew('payroll_payable_account', selectedCompany.default_payroll_payable_account);
        } else {
            updateNew('payroll_payable_account', '');
        }
    };

    /* ── Create Payroll Entry ── */

    const createPayrollEntry = async () => {
        setCreateError(null);
        if (!newEntry.company) return setCreateError('Company is required.');
        if (!newEntry.currency) return setCreateError('Currency is required.');
        if (!newEntry.payroll_payable_account) return setCreateError('Payroll Payable Account is required.');
        if (!newEntry.start_date) return setCreateError('Start Date is required.');
        if (!newEntry.end_date) return setCreateError('End Date is required.');
        if (newEntry.salary_slip_based_on_timesheet === 0 && !newEntry.payroll_frequency) return setCreateError('Payroll Frequency is required.');
        if (!newEntry.cost_center) return setCreateError('Cost Center is required.');

        try {
            setCreating(true);
            const payload: Record<string, any> = {
                doctype: 'Payroll Entry',
                posting_date: newEntry.posting_date,
                company: newEntry.company,
                currency: newEntry.currency,
                exchange_rate: newEntry.exchange_rate,
                payroll_payable_account: newEntry.payroll_payable_account,
                salary_slip_based_on_timesheet: newEntry.salary_slip_based_on_timesheet,
                payroll_frequency: newEntry.salary_slip_based_on_timesheet ? '' : newEntry.payroll_frequency,
                start_date: newEntry.start_date,
                end_date: newEntry.end_date,
                deduct_tax_for_unclaimed_employee_benefits: newEntry.deduct_tax_for_unclaimed_employee_benefits,
                deduct_tax_for_unsubmitted_tax_exemption_proof: newEntry.deduct_tax_for_unsubmitted_tax_exemption_proof,
                cost_center: newEntry.cost_center,
                validate_attendance: newEntry.validate_attendance,
            };

            if (newEntry.branch) payload.branch = newEntry.branch;
            if (newEntry.department) payload.department = newEntry.department;
            if (newEntry.designation) payload.designation = newEntry.designation;
            if (newEntry.project) payload.project = newEntry.project;
            if (newEntry.bank_account) payload.bank_account = newEntry.bank_account;
            if (newEntry.payment_account) payload.payment_account = newEntry.payment_account;

            const res = await fetch('/api/resource/Payroll Entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload }),
            });

            if (res.ok) {
                const result = await res.json();
                const doc = result.data || result.message;
                if (doc && doc.name) {
                    setCreateSuccess(`Payroll Entry ${doc.name} created successfully!`);
                    setShowCreateModal(false);
                    setNewEntry({ ...DEFAULT_NEW_ENTRY });
                    fetchPayrollEntries();
                    
                    // Fetch employees for this payroll and create salary slips
                    fetchEmployeesForPayroll({
                        company: newEntry.company,
                        department: newEntry.department,
                        designation: newEntry.designation,
                        branch: newEntry.branch
                    }).then(() => {
                        // Show employee selection modal
                        setShowEmployeeSelectionModal(true);
                        setCurrentPayrollEntryName(doc.name);
                    });
                    
                    setTimeout(() => setCreateSuccess(null), 5000);
                } else {
                    setCreateError('Unexpected response from server.');
                }
            } else {
                const e = await res.json().catch(() => ({}));
                let msg = e?.exc_type || e?.message || 'Failed to create payroll entry';
                if (e?._server_messages) {
                    try { msg = JSON.parse(e._server_messages).map((m: any) => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join('\n'); } catch { /* fallback */ }
                }
                setCreateError(msg);
            }
        } catch { setCreateError('An error occurred while creating the payroll entry.'); }
        finally { setCreating(false); }
    };

    /* ── Fetch Salary Components List ── */

    const fetchSalaryComponentsList = async () => {
        try {
            setComponentsLoading(true);
            setComponentsError(null);
            const res = await fetch(
                '/api/resource/Salary Component?fields=["name","salary_component","salary_component_abbr","type","description","depends_on_payment_days","is_tax_applicable","statistical_component","do_not_include_in_total","remove_if_zero_valued","disabled","amount"]&limit=100&order_by=modified desc',
                { headers: { 'Content-Type': 'application/json' } }
            );
            if (res.ok) {
                const result = await res.json();
                setComponentsList(result.data || []);
            } else {
                setComponentsError('Failed to fetch salary components');
                setComponentsList([]);
            }
        } catch {
            setComponentsError('An error occurred while fetching salary components');
            setComponentsList([]);
        } finally {
            setComponentsLoading(false);
        }
    };

    /* ── Create Salary Component ── */

    const createSalaryComponent = async () => {
        setCreateComponentError(null);
        
        if (!newComponent.salary_component.trim()) {
            setCreateComponentError('Salary Component name is required.');
            return;
        }
        if (!newComponent.salary_component_abbr.trim()) {
            setCreateComponentError('Salary Component abbreviation is required.');
            return;
        }
        if (!newComponent.type) {
            setCreateComponentError('Type is required.');
            return;
        }

        try {
            setCreatingComponent(true);
            const payload = {
                doctype: 'Salary Component',
                salary_component: newComponent.salary_component,
                salary_component_abbr: newComponent.salary_component_abbr,
                type: newComponent.type,
                description: newComponent.description || '',
                depends_on_payment_days: newComponent.depends_on_payment_days,
                is_tax_applicable: newComponent.is_tax_applicable,
                deduct_full_tax_on_selected_payroll_date: newComponent.deduct_full_tax_on_selected_payroll_date,
                variable_based_on_taxable_salary: newComponent.variable_based_on_taxable_salary,
                is_income_tax_component: newComponent.is_income_tax_component,
                exempted_from_income_tax: newComponent.exempted_from_income_tax,
                round_to_the_nearest_integer: newComponent.round_to_the_nearest_integer,
                statistical_component: newComponent.statistical_component,
                do_not_include_in_total: newComponent.do_not_include_in_total,
                do_not_include_in_accounts: newComponent.do_not_include_in_accounts,
                remove_if_zero_valued: newComponent.remove_if_zero_valued,
                disabled: newComponent.disabled,
                amount: newComponent.amount,
                amount_based_on_formula: newComponent.amount_based_on_formula,
                is_flexible_benefit: newComponent.is_flexible_benefit,
                max_benefit_amount: newComponent.max_benefit_amount,
                pay_against_benefit_claim: newComponent.pay_against_benefit_claim,
                only_tax_impact: newComponent.only_tax_impact,
                create_separate_payment_entry_against_benefit_claim: newComponent.create_separate_payment_entry_against_benefit_claim
            };

            const res = await fetch('/api/resource/Salary Component', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload }),
            });

            if (res.ok) {
                const result = await res.json();
                const doc = result.data || result.message;
                if (doc && doc.name) {
                    setCreateComponentSuccess(`Salary Component ${doc.name} created successfully!`);
                    setShowCreateComponentModal(false);
                    setNewComponent({
                        salary_component: '',
                        salary_component_abbr: '',
                        type: 'Earning',
                        description: '',
                        depends_on_payment_days: 1,
                        is_tax_applicable: 0,
                        deduct_full_tax_on_selected_payroll_date: 0,
                        variable_based_on_taxable_salary: 0,
                        is_income_tax_component: 0,
                        exempted_from_income_tax: 0,
                        round_to_the_nearest_integer: 0,
                        statistical_component: 0,
                        do_not_include_in_total: 0,
                        do_not_include_in_accounts: 0,
                        remove_if_zero_valued: 1,
                        disabled: 0,
                        amount: 0,
                        amount_based_on_formula: 0,
                        is_flexible_benefit: 0,
                        max_benefit_amount: 0,
                        pay_against_benefit_claim: 0,
                        only_tax_impact: 0,
                        create_separate_payment_entry_against_benefit_claim: 0
                    });
                    // Refresh salary components dropdown
                    fetchDropdownOptions();
                    // Refresh components list
                    fetchSalaryComponentsList();
                    setTimeout(() => setCreateComponentSuccess(null), 5000);
                } else {
                    setCreateComponentError('Unexpected response from server.');
                }
            } else {
                const e = await res.json().catch(() => ({}));
                let msg = e?.exc_type || e?.message || 'Failed to create salary component';
                if (e?._server_messages) {
                    try { msg = JSON.parse(e._server_messages).map((m: any) => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join('\n'); } catch { /* fallback */ }
                }
                setCreateComponentError(msg);
            }
        } catch (error) {
            setCreateComponentError('An error occurred while creating salary component.');
        } finally {
            setCreatingComponent(false);
        }
    };

    /* ── Create Salary Structure Assignment ── */

    const createSalaryStructureAssignment = async () => {
        setCreateAssignmentError(null);
        if (!newAssignment.employee) return setCreateAssignmentError('Employee is required.');
        if (!newAssignment.salary_structure) return setCreateAssignmentError('Salary Structure is required.');
        if (!newAssignment.from_date) return setCreateAssignmentError('From Date is required.');
        if (!newAssignment.company) return setCreateAssignmentError('Company is required (auto-populated from employee).');

        try {
            setCreatingAssignment(true);
            const payload: Record<string, any> = {
                doctype: 'Salary Structure Assignment',
                employee: newAssignment.employee,
                salary_structure: newAssignment.salary_structure,
                from_date: newAssignment.from_date,
                company: newAssignment.company,
            };
            if (newAssignment.income_tax_slab) payload.income_tax_slab = newAssignment.income_tax_slab;
            if (newAssignment.payroll_payable_account) payload.payroll_payable_account = newAssignment.payroll_payable_account;
            if (newAssignment.base) payload.base = parseFloat(newAssignment.base);
            if (newAssignment.variable) payload.variable = parseFloat(newAssignment.variable);
            if (newAssignment.taxable_earnings_till_date) payload.taxable_earnings_till_date = parseFloat(newAssignment.taxable_earnings_till_date);
            if (newAssignment.tax_deducted_till_date) payload.tax_deducted_till_date = parseFloat(newAssignment.tax_deducted_till_date);

            const res = await fetch('/api/resource/Salary Structure Assignment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload }),
            });

            if (res.ok) {
                const result = await res.json();
                const doc = result.data || result.message;
                if (doc && doc.name) {
                    // Submit the salary structure assignment after creation
                    const submitRes = await fetch(`/api/resource/Salary Structure Assignment/${doc.name}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            docstatus: 1
                        }),
                    });
                    
                    if (submitRes.ok) {
                        setCreateAssignmentSuccess(`Salary Structure Assignment ${doc.name} created and submitted successfully!`);
                    } else {
                        setCreateAssignmentSuccess(`Salary Structure Assignment ${doc.name} created successfully! (Note: Could not auto-submit)`);
                    }
                    
                    setShowCreateAssignmentModal(false);
                    setNewAssignment({ ...DEFAULT_NEW_ASSIGNMENT });
                    setAssignmentEmployeeName(''); setAssignmentDepartment('');
                    setAssignmentDesignation(''); setAssignmentCurrency('');
                    fetchSalaryStructureAssignments();
                    setTimeout(() => setCreateAssignmentSuccess(null), 5000);
                } else {
                    setCreateAssignmentError('Unexpected response from server.');
                }
            } else {
                const e = await res.json().catch(() => ({}));
                let msg = e?.exc_type || e?.message || 'Failed to create assignment';
                if (e?._server_messages) {
                    try { msg = JSON.parse(e._server_messages).map((m: any) => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join('\n'); } catch { /* fallback */ }
                }
                setCreateAssignmentError(msg);
            }
        } catch { setCreateAssignmentError('An error occurred while creating the assignment.'); }
        finally { setCreatingAssignment(false); }
    };

    /* ── Create Salary Structure ── */

    const createSalaryStructure = async () => {
        setCreateStructureError(null);
        if (!structureName.trim()) return setCreateStructureError('Structure Name is required.');
        if (!newStructure.company) return setCreateStructureError('Company is required.');
        if (!newStructure.currency) return setCreateStructureError('Currency is required.');
        if (!newStructure.is_active) return setCreateStructureError('Is Active is required.');
        if (newStructure.salary_slip_based_on_timesheet === 0 && !newStructure.payroll_frequency)
            return setCreateStructureError('Payroll Frequency is required when not based on Timesheet.');

        const validEarnings = earningsRows.filter(r => r.salary_component.trim());
        const validDeductions = deductionRows.filter(r => r.salary_component.trim());

        const buildRows = (rows: SalaryDetail[], parentField: string) =>
            rows.map(r => ({
                doctype: 'Salary Detail',
                parentfield: parentField,
                salary_component: r.salary_component,
                abbr: r.abbr,
                amount: r.amount ? parseFloat(r.amount) : 0,
                formula: r.formula,
                condition: r.condition,
                depends_on_payment_days: r.depends_on_payment_days,
                statistical_component: r.statistical_component,
                do_not_include_in_total: r.do_not_include_in_total,
            }));

        try {
            setCreatingStructure(true);
            const payload: Record<string, any> = {
                doctype: 'Salary Structure',
                name: structureName.trim(),
                company: newStructure.company,
                is_active: newStructure.is_active,
                currency: newStructure.currency,
                salary_slip_based_on_timesheet: newStructure.salary_slip_based_on_timesheet,
                payroll_frequency: newStructure.salary_slip_based_on_timesheet ? '' : newStructure.payroll_frequency,
                earnings: buildRows(validEarnings, 'earnings'),
                deductions: buildRows(validDeductions, 'deductions'),
            };

            if (newStructure.letter_head) payload.letter_head = newStructure.letter_head;
            if (newStructure.salary_component) payload.salary_component = newStructure.salary_component;
            if (newStructure.hour_rate) payload.hour_rate = parseFloat(newStructure.hour_rate);
            if (newStructure.leave_encashment_amount_per_day) payload.leave_encashment_amount_per_day = parseFloat(newStructure.leave_encashment_amount_per_day);
            if (newStructure.max_benefits) payload.max_benefits = parseFloat(newStructure.max_benefits);
            if (newStructure.mode_of_payment) payload.mode_of_payment = newStructure.mode_of_payment;
            if (newStructure.payment_account) payload.payment_account = newStructure.payment_account;

            const res = await fetch('/api/resource/Salary Structure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload }),
            });

            if (res.ok) {
                const result = await res.json();
                const doc = result.data || result.message;
                if (doc && doc.name) {
                    // Submit the salary structure after creation
                    const submitRes = await fetch(`/api/resource/Salary Structure/${doc.name}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            docstatus: 1
                        }),
                    });
                    
                    if (submitRes.ok) {
                        setCreateStructureSuccess(`Salary Structure ${doc.name} created and submitted successfully!`);
                    } else {
                        setCreateStructureSuccess(`Salary Structure ${doc.name} created successfully! (Note: Could not auto-submit)`);
                    }
                    
                    setShowCreateStructureModal(false);
                    setNewStructure({ ...DEFAULT_NEW_STRUCTURE });
                    setStructureName('');
                    setEarningsRows([newSalaryDetailRow()]);
                    setDeductionRows([newSalaryDetailRow()]);
                    fetchSalaryStructures();
                    setTimeout(() => setCreateStructureSuccess(null), 5000);
                } else {
                    setCreateStructureError('Unexpected response from server.');
                }
            } else {
                const e = await res.json().catch(() => ({}));
                let msg = e?.exc_type || e?.message || 'Failed to create salary structure';
                if (e?._server_messages) {
                    try { msg = JSON.parse(e._server_messages).map((m: any) => (typeof m === 'string' ? JSON.parse(m).message : m.message)).join('\n'); } catch { /* fallback */ }
                }
                setCreateStructureError(msg);
            }
        } catch { setCreateStructureError('An error occurred while creating the salary structure.'); }
        finally { setCreatingStructure(false); }
    };

    /* ── Salary Detail row helpers ── */

    const updateDetailRow = (
        rows: SalaryDetail[],
        setRows: React.Dispatch<React.SetStateAction<SalaryDetail[]>>,
        id: string,
        key: keyof SalaryDetail,
        value: any
    ) => setRows(rows.map(r => r.id === id ? { ...r, [key]: value } : r));

    const addDetailRow = (setRows: React.Dispatch<React.SetStateAction<SalaryDetail[]>>) =>
        setRows(prev => [...prev, newSalaryDetailRow()]);

    const removeDetailRow = (
        rows: SalaryDetail[],
        setRows: React.Dispatch<React.SetStateAction<SalaryDetail[]>>,
        id: string
    ) => {
        if (rows.length === 1) return;
        setRows(rows.filter(r => r.id !== id));
    };

    /* ── Effects ── */

    useEffect(() => {
        if (selectedTab === 'payroll') { fetchPayrollEntries(); fetchPayrollStatuses(); fetchPayrollFrequencies(); }
        else if (selectedTab === 'salary') { fetchSalarySlips(); fetchSalarySlipStatuses(); fetchPayrollFrequencies(); }
        else if (selectedTab === 'structures') { fetchSalaryStructures(); }
        else if (selectedTab === 'assignments') { fetchSalaryStructureAssignments(); }
        else if (selectedTab === 'components') { fetchSalaryComponentsList(); }
        else if (selectedTab === 'settings') { fetchPayrollSettings(); }
    }, [selectedTab]);

    useEffect(() => {
        // Fetch dropdown options once on component mount
        fetchDropdownOptions();
    }, []);

    /* ── Derived data ── */

    const filteredPayrollEntries = payrollEntries.filter(e => {
        const ms = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.company.toLowerCase().includes(searchTerm.toLowerCase());
        return ms && (!filterStatus || e.status === filterStatus) && (!filterFrequency || e.payroll_frequency === filterFrequency)
            && (!filterFromDate || new Date(e.posting_date) >= new Date(filterFromDate))
            && (!filterToDate || new Date(e.posting_date) <= new Date(filterToDate));
    });

    const filteredSalarySlips = salarySlips.filter(s => {
        const ms = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.employee.toLowerCase().includes(searchTerm.toLowerCase());
        return ms && (!filterStatus || s.status === filterStatus) && (!filterFrequency || s.payroll_frequency === filterFrequency)
            && (!filterFromDate || new Date(s.posting_date) >= new Date(filterFromDate))
            && (!filterToDate || new Date(s.posting_date) <= new Date(filterToDate));
    });

    const filteredStructures = salaryStructures.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.company || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAssignments = salaryStructureAssignments.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.employee || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.salary_structure || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const assignmentSummary = {
        total: salaryStructureAssignments.length,
        submitted: salaryStructureAssignments.filter(a => a.docstatus === 1).length,
        draft: salaryStructureAssignments.filter(a => a.docstatus === 0).length,
        totalBase: salaryStructureAssignments.reduce((s, a) => s + (a.base || 0), 0),
    };

    const payrollSummary = {
        totalEntries: payrollEntries.length,
        submittedEntries: payrollEntries.filter(e => e.status === 'Submitted').length,
        totalEmployees: payrollEntries.reduce((s, e) => s + e.number_of_employees, 0),
        totalSalarySlips: payrollEntries.reduce((s, e) => s + e.salary_slips_created, 0),
    };

    const salarySummary = {
        totalSlips: salarySlips.length,
        submittedSlips: salarySlips.filter(s => s.status === 'Submitted').length,
        totalNetPay: salarySlips.reduce((s, sl) => s + sl.net_pay, 0),
        averageNetPay: salarySlips.length > 0 ? salarySlips.reduce((s, sl) => s + sl.net_pay, 0) / salarySlips.length : 0,
    };

    const structuresSummary = {
        total: salaryStructures.length,
        active: salaryStructures.filter(s => s.is_active === 'Yes').length,
        timesheetBased: salaryStructures.filter(s => s.salary_slip_based_on_timesheet === 1).length,
    };

    /* ── Helpers ── */

    const formatCurrency = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2 }).format(n);
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'Submitted': return 'bg-[#E4B315]/10 text-[#C69A11]';
            case 'Draft': return 'bg-gray-100 text-gray-800';
            case 'Cancelled': return 'bg-red-100 text-red-800';
            case 'Completed': return 'bg-green-100 text-green-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getActiveBadge = (val: string) =>
        val === 'Yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';

    const updateNew = (key: keyof NewPayrollEntry, value: any) => setNewEntry(prev => ({ ...prev, [key]: value }));
    const updateSetting = (key: keyof PayrollSettings, value: any) => setSettings(prev => ({ ...prev, [key]: value }));
    const updateStructure = (key: keyof NewSalaryStructure, value: any) => setNewStructure(prev => ({ ...prev, [key]: value }));
    const updateAssignment = (key: keyof NewSalaryStructureAssignment, value: any) => setNewAssignment(prev => ({ ...prev, [key]: value }));

    /* ── Sub-components ── */

    const CheckboxField = ({ id, label, description, checked, onChange }: {
        id: string; label: string; description?: string; checked: boolean; onChange: (v: number) => void;
    }) => (
        <div className="flex items-start gap-3">
            <input type="checkbox" id={id} checked={checked} onChange={e => onChange(e.target.checked ? 1 : 0)} className="mt-1 w-4 h-4 rounded border-border" />
            <div>
                <label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</label>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </div>
    );

    const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
        <div>
            <label className="text-sm font-medium block mb-1.5">
                {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
        </div>
    );

    const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50 bg-white text-sm text-[#2D2A26] transition-colors";

    /* ── Salary Detail Table ── */

    const SalaryDetailTable = ({
        title, rows, setRows, color
    }: {
        title: string;
        rows: SalaryDetail[];
        setRows: React.Dispatch<React.SetStateAction<SalaryDetail[]>>;
        color: 'green' | 'red';
    }) => {
        const headerCls = color === 'green'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800';
        const addBtnCls = color === 'green'
            ? 'text-green-700 hover:text-green-900 border-green-300 hover:bg-green-50'
            : 'text-red-700 hover:text-red-900 border-red-300 hover:bg-red-50';

        return (
            <div className="border border-border rounded-lg overflow-hidden">
                <div className={`px-4 py-3 flex items-center justify-between border-b ${headerCls}`}>
                    <h4 className="text-sm font-semibold">{title}</h4>
                    <button
                        type="button"
                        onClick={() => addDetailRow(setRows)}
                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium border rounded-md transition-colors ${addBtnCls}`}
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-muted">
                            <tr>
                                {['Component', 'Abbr', 'Amount', 'Formula', 'Condition', 'Pd Days', 'Stat.', 'Excl.', ''].map((h, i) => (
                                    <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {rows.map(row => (
                                <tr key={row.id} className="group hover:bg-muted/30">
                                    <td className="px-2 py-1.5">
                                        <select
                                            value={row.salary_component}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'salary_component', e.target.value)}
                                            className="w-32 px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            <option value="">Select...</option>
                                            {salaryComponents.map(component => (
                                                <option key={component.name} value={component.name}>
                                                    {component.salary_component_name || component.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="text"
                                            value={row.abbr}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'abbr', e.target.value)}
                                            placeholder="B"
                                            className="w-14 px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="number"
                                            value={row.amount}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'amount', e.target.value)}
                                            placeholder="0"
                                            className="w-24 px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="text"
                                            value={row.formula}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'formula', e.target.value)}
                                            placeholder="base * 0.5"
                                            className="w-28 px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="text"
                                            value={row.condition}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'condition', e.target.value)}
                                            placeholder="e.g. base > 10000"
                                            className="w-32 px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.depends_on_payment_days === 1}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'depends_on_payment_days', e.target.checked ? 1 : 0)}
                                            className="w-3.5 h-3.5"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.statistical_component === 1}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'statistical_component', e.target.checked ? 1 : 0)}
                                            className="w-3.5 h-3.5"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={row.do_not_include_in_total === 1}
                                            onChange={e => updateDetailRow(rows, setRows, row.id, 'do_not_include_in_total', e.target.checked ? 1 : 0)}
                                            className="w-3.5 h-3.5"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <button
                                            type="button"
                                            onClick={() => removeDetailRow(rows, setRows, row.id)}
                                            disabled={rows.length === 1}
                                            className="text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="px-4 py-2 bg-muted/40 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Use <code className="bg-muted px-1 rounded">formula</code> for dynamic values (e.g. <code className="bg-muted px-1 rounded">base * 0.12</code>) or enter a fixed <code className="bg-muted px-1 rounded">amount</code>. Formula takes precedence.
                    </p>
                </div>
            </div>
        );
    };

    /* ═══════════════════════════════════════
       RENDER
    ═══════════════════════════════════════ */

    return (
        <PageLayout
          title="Payroll Management"
          subtitle="Manage payroll entries, salary slips and structures"
          actions={<div className="flex gap-2">
                    {selectedTab === 'payroll' && (
                        <>
                            <button
                                onClick={() => { setNewEntry({ ...DEFAULT_NEW_ENTRY }); setCreateError(null); setShowCreateModal(true); }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 text-sm font-bold">
                                <Plus className="w-4 h-4" /> New Payroll Entry
                            </button>
                            <button onClick={fetchPayrollEntries} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] text-sm font-medium text-gray-600 bg-white shadow-sm transition-colors">
                                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                            </button>
                        </>
                    )}
                    {selectedTab === 'salary' && (
                        <button onClick={fetchSalarySlips} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] text-sm font-medium text-gray-600 bg-white shadow-sm transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                            <RefreshCw className="w-4 h-4" /> Refresh
                        </button>
                    )}
                    {selectedTab === 'structures' && (
                        <>
                            <button
                                onClick={() => {
                                    setNewStructure({ ...DEFAULT_NEW_STRUCTURE });
                                    setStructureName('');
                                    setEarningsRows([newSalaryDetailRow()]);
                                    setDeductionRows([newSalaryDetailRow()]);
                                    setCreateStructureError(null);
                                    setShowCreateStructureModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 text-sm font-bold">
                                <Plus className="w-4 h-4" /> New Salary Structure
                            </button>
                            <button onClick={fetchSalaryStructures} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] text-sm font-medium text-gray-600 bg-white shadow-sm transition-colors">
                                <RefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </>
                    )}
                    {selectedTab === 'assignments' && (
                        <>
                            <button
                                onClick={() => {
                                    setNewAssignment({ ...DEFAULT_NEW_ASSIGNMENT });
                                    setAssignmentEmployeeName(''); setAssignmentDepartment('');
                                    setAssignmentDesignation(''); setAssignmentCurrency('');
                                    setCreateAssignmentError(null);
                                    setShowCreateAssignmentModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 text-sm font-bold">
                                <Plus className="w-4 h-4" /> New Assignment
                            </button>
                            <button onClick={fetchSalaryStructureAssignments} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] text-sm font-medium text-gray-600 bg-white shadow-sm transition-colors">
                                <RefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </>
                    )}
                    {selectedTab === 'components' && (
                        <>
                            <button
                                onClick={() => {
                                    setNewComponent({
                                        salary_component: '',
                                        salary_component_abbr: '',
                                        type: 'Earning',
                                        description: '',
                                        depends_on_payment_days: 1,
                                        is_tax_applicable: 0,
                                        deduct_full_tax_on_selected_payroll_date: 0,
                                        variable_based_on_taxable_salary: 0,
                                        is_income_tax_component: 0,
                                        exempted_from_income_tax: 0,
                                        round_to_the_nearest_integer: 0,
                                        statistical_component: 0,
                                        do_not_include_in_total: 0,
                                        do_not_include_in_accounts: 0,
                                        remove_if_zero_valued: 1,
                                        disabled: 0,
                                        amount: 0,
                                        amount_based_on_formula: 0,
                                        is_flexible_benefit: 0,
                                        max_benefit_amount: 0,
                                        pay_against_benefit_claim: 0,
                                        only_tax_impact: 0,
                                        create_separate_payment_entry_against_benefit_claim: 0
                                    });
                                    setCreateComponentError(null);
                                    setShowCreateComponentModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 text-sm font-bold"
                            >
                                <Plus className="w-4 h-4" /> New Salary Component
                            </button>
                        </>
                    )}
                    {selectedTab === 'settings' && (
                        <button onClick={savePayrollSettings} disabled={settingsSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-60 text-sm font-bold">
                            {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {settingsSaving ? 'Saving...' : 'Save'}
                        </button>
                    )}
            </div>}
        >
        <div className="overflow-y-auto px-6 py-5 space-y-5 h-full">

            {/* Success banners */}
            {createSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-green-800 text-sm">{createSuccess}</span>
                </div>
            )}
            {createStructureSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-green-800 text-sm">{createStructureSuccess}</span>
                </div>
            )}
            {createComponentSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-green-800 text-sm">{createComponentSuccess}</span>
                </div>
            )}
            {createAssignmentSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                    <span className="text-green-800 text-sm">{createAssignmentSuccess}</span>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex border-b border-border">
                <button onClick={() => setSelectedTab('payroll')} className={`px-4 py-2 font-medium transition-colors ${selectedTab === 'payroll' ? 'border-b-2 border-[#E4B315] text-[#C69A11] font-bold' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                    Payroll Entries
                </button>
                <button onClick={() => setSelectedTab('salary')} className={`px-4 py-2 font-medium transition-colors ${selectedTab === 'salary' ? 'border-b-2 border-[#E4B315] text-[#C69A11] font-bold' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                    Salary Slips
                </button>
                <button onClick={() => setSelectedTab('structures')} className={`px-4 py-2 font-medium transition-colors flex items-center gap-1.5 ${selectedTab === 'structures' ? 'border-b-2 border-[#E4B315] text-[#C69A11] font-bold' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                    <LayoutList className="w-4 h-4" /> Salary Structures
                </button>
                <button onClick={() => setSelectedTab('assignments')} className={`px-4 py-2 font-medium transition-colors flex items-center gap-1.5 ${selectedTab === 'assignments' ? 'border-b-2 border-[#E4B315] text-[#C69A11] font-bold' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                    <UserCheck className="w-4 h-4" /> Structure Assignments
                </button>
                <button onClick={() => setSelectedTab('components')} className={`px-4 py-2 font-medium transition-colors ${selectedTab === 'components' ? 'border-b-2 border-[#E4B315] text-[#C69A11] font-bold' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                    Salary Components
                </button>
                <button onClick={() => setSelectedTab('settings')} className={`px-4 py-2 font-medium transition-colors flex items-center gap-1.5 ${selectedTab === 'settings' ? 'border-b-2 border-[#E4B315] text-[#C69A11] font-bold' : 'text-gray-400 hover:text-[#2D2A26]'}`}>
                    <Settings className="w-4 h-4" /> Payroll Settings
                </button>
            </div>

            {/* ══ SETTINGS TAB ══ */}
            {selectedTab === 'settings' && (
                <div className="space-y-4">
                    {settingsSuccess && <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl"><CheckCircle className="w-5 h-5 text-green-600 shrink-0" /><span className="text-green-800 text-sm">{settingsSuccess}</span></div>}
                    {settingsError && <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"><AlertCircle className="w-5 h-5 text-destructive shrink-0" /><span className="text-destructive text-sm">{settingsError}</span></div>}

                    {settingsLoading ? (
                        <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-primary" /><span className="ml-2">Loading settings...</span></div>
                    ) : (
                        <div className="space-y-4">
                            <div className="border border-border rounded-lg overflow-hidden">
                                <div className="px-6 py-4 bg-muted border-b border-border"><h2 className="text-base font-semibold">Working Days and Hours</h2></div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-5">
                                        <FormField label="Calculate Payroll Working Days Based On">
                                            <select value={settings.payroll_based_on} onChange={e => updateSetting('payroll_based_on', e.target.value)} className={inputCls}>
                                                <option value="Leave">Leave</option>
                                                <option value="Attendance">Attendance</option>
                                            </select>
                                        </FormField>
                                        <CheckboxField id="inc_holidays" label="Include holidays in Total no. of Working Days" description="If enabled, total no. of working days will include holidays, and this will reduce the value of Salary Per Day" checked={settings.include_holidays_in_total_working_days === 1} onChange={v => updateSetting('include_holidays_in_total_working_days', v)} />
                                        <CheckboxField id="marked_holidays" label="Consider Marked Attendance on Holidays" checked={settings.consider_marked_attendance_on_holidays === 1} onChange={v => updateSetting('consider_marked_attendance_on_holidays', v)} />
                                        <FormField label="Consider Unmarked Attendance As">
                                            <select value={settings.consider_unmarked_attendance_as} onChange={e => updateSetting('consider_unmarked_attendance_as', e.target.value)} className={inputCls}>
                                                <option value="Present">Present</option>
                                                <option value="Absent">Absent</option>
                                            </select>
                                        </FormField>
                                    </div>
                                    <div className="space-y-5">
                                        <FormField label="Max working hours against Timesheet">
                                            <input type="number" step="0.001" value={settings.max_working_hours_against_timesheet} onChange={e => updateSetting('max_working_hours_against_timesheet', parseFloat(e.target.value) || 0)} className={inputCls} />
                                        </FormField>
                                        <FormField label="Fraction of Daily Salary for Half Day">
                                            <input type="number" step="0.001" min="0" max="1" value={settings.daily_wages_fraction_for_half_day} onChange={e => updateSetting('daily_wages_fraction_for_half_day', parseFloat(e.target.value) || 0)} className={inputCls} />
                                            <p className="text-xs text-muted-foreground mt-1">The fraction of daily wages to be paid for half-day attendance</p>
                                        </FormField>
                                    </div>
                                </div>
                            </div>

                            <div className="border border-border rounded-lg overflow-hidden">
                                <div className="px-6 py-4 bg-muted border-b border-border"><h2 className="text-base font-semibold">Salary Slip</h2></div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <CheckboxField id="dis_rounded" label="Disable Rounded Total" description="If checked, hides and disables Rounded Total field in Salary Slips" checked={settings.disable_rounded_total === 1} onChange={v => updateSetting('disable_rounded_total', v)} />
                                    <CheckboxField id="show_leave" label="Show Leave Balances in Salary Slip" checked={settings.show_leave_balances_in_salary_slip === 1} onChange={v => updateSetting('show_leave_balances_in_salary_slip', v)} />
                                </div>
                            </div>

                            <div className="border border-border rounded-lg overflow-hidden">
                                <div className="px-6 py-4 bg-muted border-b border-border"><h2 className="text-base font-semibold">Email</h2></div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-5">
                                        <CheckboxField id="email_slip" label="Email Salary Slip to Employee" description="Emails salary slip to employee based on preferred email selected in Employee" checked={settings.email_salary_slip_to_employee === 1} onChange={v => updateSetting('email_salary_slip_to_employee', v)} />
                                        <FormField label="Sender"><input type="text" value={settings.sender || ''} onChange={e => updateSetting('sender', e.target.value)} placeholder="e.g. payroll@company.com" className={inputCls} /></FormField>
                                        <FormField label="Email Template"><input type="text" value={settings.email_template || ''} onChange={e => updateSetting('email_template', e.target.value)} placeholder="Email template name" className={inputCls} /></FormField>
                                    </div>
                                    <CheckboxField id="encrypt_slip" label="Encrypt Salary Slips in Emails" description="The salary slip emailed to the employee will be password protected, the password will be generated based on the password policy." checked={settings.encrypt_salary_slips_in_emails === 1} onChange={v => updateSetting('encrypt_salary_slips_in_emails', v)} />
                                </div>
                            </div>

                            <div className="border border-border rounded-lg overflow-hidden">
                                <div className="px-6 py-4 bg-muted border-b border-border"><h2 className="text-base font-semibold">Other Settings</h2></div>
                                <div className="p-6">
                                    <CheckboxField id="proc_payroll" label="Process Payroll Accounting Entry based on Employee" description="If checked, Payroll Payable will be booked against each employee" checked={settings.process_payroll_accounting_entry_based_on_employee === 1} onChange={v => updateSetting('process_payroll_accounting_entry_based_on_employee', v)} />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={savePayrollSettings} disabled={settingsSaving} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-60 font-medium">
                                    {settingsSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {settingsSaving ? 'Saving...' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══ SALARY STRUCTURES TAB ══ */}
            {selectedTab === 'structures' && (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><LayoutList className="w-5 h-5 text-blue-500" /><h3 className="font-medium">Total Structures</h3></div>
                            <p className="text-2xl font-bold mt-2">{structuresSummary.total}</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><h3 className="font-medium">Active</h3></div>
                            <p className="text-2xl font-bold mt-2">{structuresSummary.active}</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-purple-500" /><h3 className="font-medium">Timesheet Based</h3></div>
                            <p className="text-2xl font-bold mt-2">{structuresSummary.timesheetBased}</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-4 border border-border rounded-lg">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type="text" placeholder="Search structures..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                        </div>
                    </div>

                    {loading && <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /><span className="ml-2">Loading...</span></div>}
                    {error && <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"><AlertCircle className="w-5 h-5 text-destructive" /><span className="text-destructive">{error}</span></div>}

                    {!loading && !error && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto overflow-y-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            {['Name', 'Company', 'Currency', 'Active', 'Frequency', 'Timesheet', 'Max Benefits', 'Mode of Payment', 'Modified'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-sm font-medium">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredStructures.length === 0 ? (
                                            <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No salary structures found</td></tr>
                                        ) : filteredStructures.map(s => (
                                            <tr key={s.name} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                                                <td className="px-4 py-3 text-sm">{s.company}</td>
                                                <td className="px-4 py-3 text-sm">{s.currency}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActiveBadge(s.is_active)}`}>{s.is_active}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">{s.salary_slip_based_on_timesheet ? '—' : (s.payroll_frequency || '—')}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {s.salary_slip_based_on_timesheet
                                                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Yes</span>
                                                        : <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No</span>}
                                                </td>
                                                <td className="px-4 py-3 text-sm">{s.max_benefits ? formatCurrency(s.max_benefits) : '—'}</td>
                                                <td className="px-4 py-3 text-sm">{s.mode_of_payment || '—'}</td>
                                                <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(s.modified)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══ ASSIGNMENTS TAB ══ */}
            {selectedTab === 'assignments' && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-blue-500" /><h3 className="font-medium">Total Assignments</h3></div>
                            <p className="text-2xl font-bold mt-2">{assignmentSummary.total}</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><h3 className="font-medium">Submitted</h3></div>
                            <p className="text-2xl font-bold mt-2">{assignmentSummary.submitted}</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-yellow-500" /><h3 className="font-medium">Draft</h3></div>
                            <p className="text-2xl font-bold mt-2">{assignmentSummary.draft}</p>
                        </div>
                        <div className="p-4 border border-border rounded-lg">
                            <div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-purple-500" /><h3 className="font-medium">Total Base Pay</h3></div>
                            <p className="text-2xl font-bold mt-2">{formatCurrency(assignmentSummary.totalBase)}</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="p-4 border border-border rounded-lg">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by employee or structure..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                            />
                        </div>
                    </div>

                    {loading && <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /><span className="ml-2">Loading...</span></div>}
                    {error && <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"><AlertCircle className="w-5 h-5 text-destructive" /><span className="text-destructive">{error}</span></div>}

                    {!loading && !error && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto overflow-y-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            {['ID', 'Employee', 'Department', 'Designation', 'Salary Structure', 'From Date', 'Base', 'Variable', 'Currency', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredAssignments.length === 0 ? (
                                            <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No salary structure assignments found</td></tr>
                                        ) : filteredAssignments.map(a => (
                                            <tr key={a.name} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium text-muted-foreground">{a.name}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium">{a.employee_name || a.employee}</div>
                                                    {a.employee_name && <div className="text-xs text-muted-foreground">{a.employee}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-sm">{a.department || '—'}</td>
                                                <td className="px-4 py-3 text-sm">{a.designation || '—'}</td>
                                                <td className="px-4 py-3 text-sm font-medium">{a.salary_structure}</td>
                                                <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(a.from_date)}</td>
                                                <td className="px-4 py-3 text-sm">{a.base ? formatCurrency(a.base) : '—'}</td>
                                                <td className="px-4 py-3 text-sm">{a.variable ? formatCurrency(a.variable) : '—'}</td>
                                                <td className="px-4 py-3 text-sm">{a.currency || '—'}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    {a.docstatus === 1
                                                        ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Submitted</span>
                                                        : a.docstatus === 2
                                                            ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>
                                                            : <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Draft</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══ CREATE SALARY STRUCTURE ASSIGNMENT MODAL ══ */}
            {showCreateAssignmentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

                        {/* Modal header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="text-lg font-bold">New Salary Structure Assignment</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Assign a salary structure to an employee</p>
                            </div>
                            <button onClick={() => setShowCreateAssignmentModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                            {createAssignmentError && (
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <span className="text-destructive text-sm whitespace-pre-line">{createAssignmentError}</span>
                                </div>
                            )}

                            {/* Employee & Structure */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Employee &amp; Structure</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Employee ID */}
                                    <FormField label="Employee ID" required>
                                        <select 
                                            value={newAssignment.employee} 
                                            onChange={e => handleAssignmentEmployeeChange(e.target.value)} 
                                            className={inputCls}
                                        >
                                            <option value="">Select Employee...</option>
                                            {employees.map(employee => (
                                                <option key={employee.name} value={employee.name}>
                                                    {employee.name} - {employee.employee_name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">Employee details will be auto-filled</p>
                                    </FormField>

                                    {/* Employee Name (read-only) */}
                                    <FormField label="Employee Name">
                                        <input
                                            type="text"
                                            value={assignmentEmployeeName}
                                            readOnly
                                            placeholder="Auto-filled from Employee"
                                            className={`${inputCls} bg-muted cursor-not-allowed text-muted-foreground`}
                                        />
                                    </FormField>

                                    {/* Department (read-only) */}
                                    <FormField label="Department">
                                        <input
                                            type="text"
                                            value={assignmentDepartment}
                                            readOnly
                                            placeholder="Auto-filled from Employee"
                                            className={`${inputCls} bg-muted cursor-not-allowed text-muted-foreground`}
                                        />
                                    </FormField>

                                    {/* Designation (read-only) */}
                                    <FormField label="Designation">
                                        <input
                                            type="text"
                                            value={assignmentDesignation}
                                            readOnly
                                            placeholder="Auto-filled from Employee"
                                            className={`${inputCls} bg-muted cursor-not-allowed text-muted-foreground`}
                                        />
                                    </FormField>

                                    {/* Salary Structure */}
                                    <FormField label="Salary Structure" required>
                                        <select 
                                            value={newAssignment.salary_structure} 
                                            onChange={e => handleAssignmentStructureChange(e.target.value)} 
                                            className={inputCls}
                                        >
                                            <option value="">Select Salary Structure...</option>
                                            {salaryStructuresList.map(structure => (
                                                <option key={structure.name} value={structure.name}>
                                                    {structure.name}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1">Currency will be auto-filled</p>
                                    </FormField>

                                    {/* Currency (read-only) */}
                                    <FormField label="Currency">
                                        <input
                                            type="text"
                                            value={assignmentCurrency}
                                            readOnly
                                            placeholder="Auto-filled from Salary Structure"
                                            className={`${inputCls} bg-muted cursor-not-allowed text-muted-foreground`}
                                        />
                                    </FormField>
                                </div>
                            </section>

                            {/* Dates & Company */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Dates &amp; Company</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="From Date" required>
                                        <input
                                            type="date"
                                            value={newAssignment.from_date}
                                            onChange={e => updateAssignment('from_date', e.target.value)}
                                            className={inputCls}
                                        />
                                    </FormField>

                                    <FormField label="Company" required>
                                        <select 
                                            value={newAssignment.company} 
                                            onChange={e => handleAssignmentCompanyChange(e.target.value)} 
                                            className={inputCls}
                                        >
                                            <option value="">Select Company...</option>
                                            {companies.map(company => (
                                                <option key={company.name} value={company.name}>
                                                    {company.company_name || company.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>

                                    <FormField label="Income Tax Slab">
                                        <input
                                            type="text"
                                            value={newAssignment.income_tax_slab}
                                            onChange={e => updateAssignment('income_tax_slab', e.target.value)}
                                            placeholder="e.g. Standard Tax Slab"
                                            className={inputCls}
                                        />
                                    </FormField>

                                    <FormField label="Payroll Payable Account">
                                        <input
                                            type="text"
                                            value={newAssignment.payroll_payable_account}
                                            readOnly
                                            className={`${inputCls} bg-muted cursor-not-allowed`}
                                            placeholder="Auto-set from company default"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Automatically set from selected company's default payroll payable account</p>
                                    </FormField>
                                </div>
                            </section>

                            {/* Base & Variable Pay */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Base &amp; Variable Pay</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Base">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={newAssignment.base}
                                            onChange={e => updateAssignment('base', e.target.value)}
                                            placeholder="0.00"
                                            className={inputCls}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Used as <code className="bg-muted px-1 rounded">base</code> variable in salary formulas</p>
                                    </FormField>

                                    <FormField label="Variable">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={newAssignment.variable}
                                            onChange={e => updateAssignment('variable', e.target.value)}
                                            placeholder="0.00"
                                            className={inputCls}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Used as <code className="bg-muted px-1 rounded">variable</code> variable in salary formulas</p>
                                    </FormField>
                                </div>
                            </section>

                            {/* Opening Balances */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 pb-1 border-b border-border">
                                    Opening Balances <span className="normal-case font-normal">(optional — for mid-year joiners)</span>
                                </h3>
                                <p className="text-xs text-muted-foreground mb-4">Set opening balances for earnings and taxes carried forward from a previous employer.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Taxable Earnings Till Date">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={newAssignment.taxable_earnings_till_date}
                                            onChange={e => updateAssignment('taxable_earnings_till_date', e.target.value)}
                                            placeholder="0.00"
                                            className={inputCls}
                                        />
                                    </FormField>

                                    <FormField label="Tax Deducted Till Date">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={newAssignment.tax_deducted_till_date}
                                            onChange={e => updateAssignment('tax_deducted_till_date', e.target.value)}
                                            placeholder="0.00"
                                            className={inputCls}
                                        />
                                    </FormField>
                                </div>
                            </section>
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                            <button
                                onClick={() => setShowCreateAssignmentModal(false)}
                                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createSalaryStructureAssignment}
                                disabled={creatingAssignment}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-60 text-sm font-bold"
                            >
                                {creatingAssignment
                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                                    : <><UserCheck className="w-4 h-4" /> Create Assignment</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ COMPONENTS TAB ══ */}
            {selectedTab === 'components' && (
                <>
                    {/* Header with create button */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold">Salary Components</h2>
                            <p className="text-muted-foreground">Manage salary components for payroll calculations</p>
                        </div>
                        <button
                            onClick={() => {
                                setNewComponent({
                                    salary_component: '',
                                    salary_component_abbr: '',
                                    type: 'Earning',
                                    description: '',
                                    depends_on_payment_days: 1,
                                    is_tax_applicable: 0,
                                    deduct_full_tax_on_selected_payroll_date: 0,
                                    variable_based_on_taxable_salary: 0,
                                    is_income_tax_component: 0,
                                    exempted_from_income_tax: 0,
                                    round_to_the_nearest_integer: 0,
                                    statistical_component: 0,
                                    do_not_include_in_total: 0,
                                    do_not_include_in_accounts: 0,
                                    remove_if_zero_valued: 1,
                                    disabled: 0,
                                    amount: 0,
                                    amount_based_on_formula: 0,
                                    is_flexible_benefit: 0,
                                    max_benefit_amount: 0,
                                    pay_against_benefit_claim: 0,
                                    only_tax_impact: 0,
                                    create_separate_payment_entry_against_benefit_claim: 0
                                });
                                setCreateComponentError(null);
                                setShowCreateComponentModal(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 text-sm font-bold"
                        >
                            <Plus className="w-4 h-4" /> New Component
                        </button>
                    </div>

                    {/* Components List */}
                    {componentsLoading && (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                            <span className="ml-2">Loading salary components...</span>
                        </div>
                    )}
                    
                    {componentsError && (
                        <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            <span className="text-destructive">{componentsError}</span>
                        </div>
                    )}

                    {!componentsLoading && !componentsError && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto overflow-y-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Component Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Abbreviation</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Payment Days</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Tax Applicable</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Statistical</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium">Disabled</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {componentsList.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                                                    No salary components found. Create your first component to get started.
                                                </td>
                                            </tr>
                                        ) : (
                                            componentsList.map((component) => (
                                                <tr key={component.name} className="hover:bg-muted/50">
                                                    <td className="px-4 py-3">
                                                        <div>
                                                            <div className="font-medium">{component.salary_component}</div>
                                                            <div className="text-xs text-muted-foreground">{component.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-1 bg-muted rounded text-xs font-mono">
                                                            {component.salary_component_abbr}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            component.type === 'Earning' 
                                                                ? 'bg-green-100 text-green-800' 
                                                                : 'bg-red-100 text-red-800'
                                                        }`}>
                                                            {component.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-muted-foreground">
                                                        {component.description || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        {component.amount ? formatCurrency(component.amount) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            component.depends_on_payment_days === 1 
                                                                ? 'bg-blue-100 text-blue-800' 
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {component.depends_on_payment_days === 1 ? 'Yes' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            component.is_tax_applicable === 1 
                                                                ? 'bg-purple-100 text-purple-800' 
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {component.is_tax_applicable === 1 ? 'Yes' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            component.statistical_component === 1 
                                                                ? 'bg-orange-100 text-orange-800' 
                                                                : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                            {component.statistical_component === 1 ? 'Yes' : 'No'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                            component.disabled === 1 
                                                                ? 'bg-red-100 text-red-800' 
                                                                : 'bg-green-100 text-green-800'
                                                        }`}>
                                                            {component.disabled === 1 ? 'Disabled' : 'Active'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══ EMPLOYEE SELECTION FOR PAYROLL ══ */}
            {showEmployeeSelectionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">

                        {/* Modal header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="text-lg font-bold">Select Employees for Payroll</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Choose employees to include in payroll entry {currentPayrollEntryName || ''}</p>
                            </div>
                            <button onClick={() => setShowEmployeeSelectionModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                            {salarySlipCreationResult && (
                                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-100 rounded-2xl">
                                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                                    <span className="text-green-800 text-sm">{salarySlipCreationResult}</span>
                                </div>
                            )}

                            {employeesError && (
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <span className="text-destructive text-sm whitespace-pre-line">{employeesError}</span>
                                </div>
                            )}

                            {loadingEmployees ? (
                                <div className="flex items-center justify-center py-8">
                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                    <span className="ml-2">Loading employees...</span>
                                </div>
                            ) : (
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <div className="overflow-x-auto overflow-y-auto max-h-80">
                                        <table className="w-full">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">
                                                        <input
                                                            type="checkbox"
                                                            checked={availableEmployees.length > 0 && availableEmployees.every(emp => emp.selected)}
                                                            onChange={(e) => {
                                                                const updated = availableEmployees.map(employee => ({ ...employee, selected: e.target.checked }));
                                                                setAvailableEmployees(updated);
                                                            }}
                                                            className="rounded"
                                                        />
                                                    </th>
                                                    {['Employee ID', 'Employee Name', 'Department', 'Designation', 'Branch', 'Company', 'Joining Date'].map(h => (
                                                        <th key={h} className="px-4 py-3 text-left text-sm font-medium whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {availableEmployees.length === 0 ? (
                                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No employees found</td></tr>
                                                ) : availableEmployees.map(emp => (
                                                    <tr key={emp.name} className="hover:bg-muted/50">
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="checkbox"
                                                                checked={emp.selected}
                                                                onChange={(e) => {
                                                                    const updated = availableEmployees.map(employee => 
                                                                        employee.name === emp.name ? { ...employee, selected: e.target.checked } : employee
                                                                    );
                                                                    setAvailableEmployees(updated);
                                                                }}
                                                                className="rounded"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium">{emp.name}</td>
                                                        <td className="px-4 py-3 text-sm font-medium">{emp.employee_name}</td>
                                                        <td className="px-4 py-3 text-sm">{emp.department || '—'}</td>
                                                        <td className="px-4 py-3 text-sm">{emp.designation || '—'}</td>
                                                        <td className="px-4 py-3 text-sm">{emp.branch || '—'}</td>
                                                        <td className="px-4 py-3 text-sm">{emp.company}</td>
                                                        <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(emp.date_of_joining)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                            <button
                                onClick={() => setShowEmployeeSelectionModal(false)}
                                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
                            >
                                Close
                            </button>
                            {currentPayrollEntryName && (
                                <button
                                    onClick={() => {
                                        createSalarySlipsForPayroll(currentPayrollEntryName);
                                    }}
                                    disabled={creatingSalarySlips || availableEmployees.filter(emp => emp.selected).length === 0}
                                    className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-60 text-sm font-bold"
                                >
                                    {creatingSalarySlips
                                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating Salary Slips...</>
                                        : <><FileText className="w-4 h-4" /> Create Salary Slips ({availableEmployees.filter(emp => emp.selected).length})</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ CREATE SALARY COMPONENT MODAL ══ */}
            {showCreateComponentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[94vh] flex flex-col">

                        {/* Modal header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="text-lg font-bold">New Salary Component</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Create a new salary component for payroll calculations</p>
                            </div>
                            <button onClick={() => setShowCreateComponentModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                            {createComponentError && (
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <span className="text-destructive text-sm whitespace-pre-line">{createComponentError}</span>
                                </div>
                            )}

                            {/* Basic Details */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Basic Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Component Name" required>
                                        <input
                                            type="text"
                                            value={newComponent.salary_component}
                                            onChange={e => setNewComponent({...newComponent, salary_component: e.target.value})}
                                            placeholder="e.g. Basic Salary"
                                            className={inputCls}
                                        />
                                    </FormField>
                                    <FormField label="Abbreviation" required>
                                        <input
                                            type="text"
                                            value={newComponent.salary_component_abbr}
                                            onChange={e => setNewComponent({...newComponent, salary_component_abbr: e.target.value})}
                                            placeholder="e.g. BS"
                                            className={inputCls}
                                        />
                                    </FormField>
                                    <FormField label="Type" required>
                                        <select value={newComponent.type} onChange={e => setNewComponent({...newComponent, type: e.target.value})} className={inputCls}>
                                            <option value="Earning">Earning</option>
                                            <option value="Deduction">Deduction</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Description">
                                        <input
                                            type="text"
                                            value={newComponent.description}
                                            onChange={e => setNewComponent({...newComponent, description: e.target.value})}
                                            placeholder="Component description"
                                            className={inputCls}
                                        />
                                    </FormField>
                                </div>
                            </section>

                            {/* Calculation Settings */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Calculation Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Amount">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={newComponent.amount}
                                            onChange={e => setNewComponent({...newComponent, amount: parseFloat(e.target.value) || 0})}
                                            placeholder="0.00"
                                            className={inputCls}
                                        />
                                    </FormField>
                                    <FormField label="Depends on Payment Days">
                                        <select value={newComponent.depends_on_payment_days} onChange={e => setNewComponent({...newComponent, depends_on_payment_days: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                        </select>
                                    </FormField>
                                </div>
                            </section>

                            {/* Tax Settings */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Tax Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Is Tax Applicable">
                                        <select value={newComponent.is_tax_applicable} onChange={e => setNewComponent({...newComponent, is_tax_applicable: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Is Income Tax Component">
                                        <select value={newComponent.is_income_tax_component} onChange={e => setNewComponent({...newComponent, is_income_tax_component: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </FormField>
                                </div>
                            </section>

                            {/* Display Settings */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Display Settings</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Statistical Component">
                                        <select value={newComponent.statistical_component} onChange={e => setNewComponent({...newComponent, statistical_component: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Do Not Include in Total">
                                        <select value={newComponent.do_not_include_in_total} onChange={e => setNewComponent({...newComponent, do_not_include_in_total: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Remove if Zero Valued">
                                        <select value={newComponent.remove_if_zero_valued} onChange={e => setNewComponent({...newComponent, remove_if_zero_valued: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Disabled">
                                        <select value={newComponent.disabled} onChange={e => setNewComponent({...newComponent, disabled: parseInt(e.target.value)})} className={inputCls}>
                                            <option value="0">No</option>
                                            <option value="1">Yes</option>
                                        </select>
                                    </FormField>
                                </div>
                            </section>
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                            <button
                                onClick={() => setShowCreateComponentModal(false)}
                                className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createSalaryComponent}
                                disabled={creatingComponent}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-60 text-sm font-bold"
                            >
                                {creatingComponent
                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                                    : <><Plus className="w-4 h-4" /> Create Component</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ PAYROLL / SALARY TABS ══ */}
            {(selectedTab === 'payroll' || selectedTab === 'salary') && (
                <>
                    {/* Summary Cards */}
                    {selectedTab === 'payroll' ? (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /><h3 className="font-medium">Total Entries</h3></div><p className="text-2xl font-bold mt-2">{payrollSummary.totalEntries}</p></div>
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><h3 className="font-medium">Submitted</h3></div><p className="text-2xl font-bold mt-2">{payrollSummary.submittedEntries}</p></div>
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" /><h3 className="font-medium">Total Employees</h3></div><p className="text-2xl font-bold mt-2">{payrollSummary.totalEmployees}</p></div>
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-orange-500" /><h3 className="font-medium">Salary Slips</h3></div><p className="text-2xl font-bold mt-2">{payrollSummary.totalSalarySlips}</p></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /><h3 className="font-medium">Total Slips</h3></div><p className="text-2xl font-bold mt-2">{salarySummary.totalSlips}</p></div>
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /><h3 className="font-medium">Submitted</h3></div><p className="text-2xl font-bold mt-2">{salarySummary.submittedSlips}</p></div>
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-500" /><h3 className="font-medium">Total Net Pay</h3></div><p className="text-2xl font-bold mt-2">{formatCurrency(salarySummary.totalNetPay)}</p></div>
                            <div className="p-4 border border-border rounded-lg"><div className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-purple-500" /><h3 className="font-medium">Average Net Pay</h3></div><p className="text-2xl font-bold mt-2">{formatCurrency(salarySummary.averageNetPay)}</p></div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="p-4 border border-border rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input type="text" placeholder={`Search ${selectedTab === 'payroll' ? 'payroll entries' : 'salary slips'}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm" />
                            </div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inputCls}>
                                <option value="">All Statuses</option>
                                {(selectedTab === 'payroll' ? payrollStatuses : salarySlipStatuses).map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <select value={filterFrequency} onChange={e => setFilterFrequency(e.target.value)} className={inputCls}>
                                <option value="">All Frequencies</option>
                                {payrollFrequencies.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <input type="date" value={filterFromDate} onChange={e => setFilterFromDate(e.target.value)} className={inputCls} />
                            <input type="date" value={filterToDate} onChange={e => setFilterToDate(e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {loading && <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /><span className="ml-2">Loading...</span></div>}
                    {error && <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg"><AlertCircle className="w-5 h-5 text-destructive" /><span className="text-destructive">{error}</span></div>}

                    {/* Payroll Entries Table */}
                    {!loading && !error && selectedTab === 'payroll' && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto overflow-y-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            {['Entry ID', 'Posting Date', 'Company', 'Status', 'Frequency', 'Period', 'Employees', 'Salary Slips', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-sm font-medium">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredPayrollEntries.length === 0 ? (
                                            <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No payroll entries found</td></tr>
                                        ) : filteredPayrollEntries.map(e => (
                                            <tr key={e.name} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                                                <td className="px-4 py-3 text-sm">{formatDate(e.posting_date)}</td>
                                                <td className="px-4 py-3 text-sm">{e.company}</td>
                                                <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(e.status)}`}>{e.status}</span></td>
                                                <td className="px-4 py-3 text-sm">{e.payroll_frequency}</td>
                                                <td className="px-4 py-3 text-sm">{formatDate(e.start_date)} – {formatDate(e.end_date)}</td>
                                                <td className="px-4 py-3 text-sm">{e.number_of_employees}</td>
                                                <td className="px-4 py-3 text-sm">{e.salary_slips_created}</td>
                                                <td className="px-4 py-3 text-sm"><button onClick={() => fetchPayrollEntryDetails(e.name)} className="text-primary hover:text-primary/80"><Eye className="w-4 h-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Salary Slips Table */}
                    {!loading && !error && selectedTab === 'salary' && (
                        <div className="border border-border rounded-lg overflow-hidden">
                            <div className="overflow-x-auto overflow-y-auto max-h-96">
                                <table className="w-full">
                                    <thead className="bg-muted">
                                        <tr>
                                            {['Slip ID', 'Employee', 'Department', 'Designation', 'Posting Date', 'Status', 'Payment Days', 'Net Pay', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-sm font-medium">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredSalarySlips.length === 0 ? (
                                            <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No salary slips found</td></tr>
                                        ) : filteredSalarySlips.map(s => (
                                            <tr key={s.name} className="hover:bg-muted/50">
                                                <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                                                <td className="px-4 py-3 text-sm"><div><div className="font-medium">{s.employee_name}</div><div className="text-xs text-muted-foreground">{s.employee}</div></div></td>
                                                <td className="px-4 py-3 text-sm">{s.department}</td>
                                                <td className="px-4 py-3 text-sm">{s.designation}</td>
                                                <td className="px-4 py-3 text-sm">{formatDate(s.posting_date)}</td>
                                                <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(s.status)}`}>{s.status}</span></td>
                                                <td className="px-4 py-3 text-sm">{s.payment_days}/{s.total_working_days}</td>
                                                <td className="px-4 py-3 text-sm font-medium">{formatCurrency(s.net_pay)}</td>
                                                <td className="px-4 py-3 text-sm"><button onClick={() => fetchSalarySlipDetails(s.name)} className="text-primary hover:text-primary/80"><Eye className="w-4 h-4" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ══ CREATE PAYROLL ENTRY MODAL ══ */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
                            <h2 className="text-lg font-bold">New Payroll Entry</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                            {createError && (
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <span className="text-destructive text-sm whitespace-pre-line">{createError}</span>
                                </div>
                            )}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Overview</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Posting Date" required><input type="date" value={newEntry.posting_date} onChange={e => updateNew('posting_date', e.target.value)} className={inputCls} /></FormField>
                                    <FormField label="Company" required>
                                        <select value={newEntry.company} onChange={e => handleCompanyChange(e.target.value)} className={inputCls}>
                                            <option value="">Select Company...</option>
                                            {companies.map(company => (
                                                <option key={company.name} value={company.name}>
                                                    {company.company_name || company.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Currency" required>
                                        <select value={newEntry.currency} onChange={e => updateNew('currency', e.target.value)} className={inputCls}>
                                            <option value="">Select Currency...</option>
                                            {currencies.map(currency => (
                                                <option key={currency.name} value={currency.name}>
                                                    {currency.currency_name || currency.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Exchange Rate" required><input type="number" step="0.000000001" min="0" value={newEntry.exchange_rate} onChange={e => updateNew('exchange_rate', parseFloat(e.target.value) || 1)} className={inputCls} /></FormField>
                                    <FormField label="Payroll Payable Account" required>
                                        <input 
                                            type="text" 
                                            value={newEntry.payroll_payable_account} 
                                            readOnly 
                                            className={`${inputCls} bg-muted cursor-not-allowed`} 
                                            placeholder="Auto-set from company default"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Automatically set from selected company's default payroll payable account</p>
                                    </FormField>
                                </div>
                                <div className="mt-4"><CheckboxField id="slip_timesheet" label="Salary Slip Based on Timesheet" checked={newEntry.salary_slip_based_on_timesheet === 1} onChange={v => updateNew('salary_slip_based_on_timesheet', v)} /></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {newEntry.salary_slip_based_on_timesheet === 0 && (
                                        <FormField label="Payroll Frequency" required>
                                            <select value={newEntry.payroll_frequency} onChange={e => updateNew('payroll_frequency', e.target.value)} className={inputCls}>
                                                <option value="">Select...</option>
                                                <option value="Monthly">Monthly</option>
                                                <option value="Fortnightly">Fortnightly</option>
                                                <option value="Bimonthly">Bimonthly</option>
                                                <option value="Weekly">Weekly</option>
                                                <option value="Daily">Daily</option>
                                            </select>
                                        </FormField>
                                    )}
                                    <FormField label="Start Date" required><input type="date" value={newEntry.start_date} onChange={e => updateNew('start_date', e.target.value)} className={inputCls} /></FormField>
                                    <FormField label="End Date" required><input type="date" value={newEntry.end_date} onChange={e => updateNew('end_date', e.target.value)} className={inputCls} /></FormField>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <CheckboxField id="deduct_unclaimed" label="Deduct Tax For Unclaimed Employee Benefits" checked={newEntry.deduct_tax_for_unclaimed_employee_benefits === 1} onChange={v => updateNew('deduct_tax_for_unclaimed_employee_benefits', v)} />
                                    <CheckboxField id="deduct_unsubmitted" label="Deduct Tax For Unsubmitted Tax Exemption Proof" checked={newEntry.deduct_tax_for_unsubmitted_tax_exemption_proof === 1} onChange={v => updateNew('deduct_tax_for_unsubmitted_tax_exemption_proof', v)} />
                                </div>
                            </section>
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Filter Employees <span className="normal-case font-normal">(optional)</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField label="Branch"><input type="text" value={newEntry.branch} onChange={e => updateNew('branch', e.target.value)} placeholder="Branch name" className={inputCls} /></FormField>
                                    <FormField label="Department"><input type="text" value={newEntry.department} onChange={e => updateNew('department', e.target.value)} placeholder="Department" className={inputCls} /></FormField>
                                    <FormField label="Designation"><input type="text" value={newEntry.designation} onChange={e => updateNew('designation', e.target.value)} placeholder="Designation" className={inputCls} /></FormField>
                                </div>
                                <div className="mt-4"><CheckboxField id="val_attendance" label="Validate Attendance" checked={newEntry.validate_attendance === 1} onChange={v => updateNew('validate_attendance', v)} /></div>
                            </section>
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Accounting &amp; Payment</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Cost Center" required>
                                        <select value={newEntry.cost_center} onChange={e => updateNew('cost_center', e.target.value)} className={inputCls}>
                                            <option value="">Select Cost Center...</option>
                                            {costCenters.map(costCenter => (
                                                <option key={costCenter.name} value={costCenter.name}>
                                                    {costCenter.cost_center_name || costCenter.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Project"><input type="text" value={newEntry.project} onChange={e => updateNew('project', e.target.value)} placeholder="Project (optional)" className={inputCls} /></FormField>
                                    <FormField label="Bank Account"><input type="text" value={newEntry.bank_account} onChange={e => updateNew('bank_account', e.target.value)} placeholder="Bank account name" className={inputCls} /></FormField>
                                    <FormField label="Payment Account"><input type="text" value={newEntry.payment_account} onChange={e => updateNew('payment_account', e.target.value)} placeholder="Payment account name" className={inputCls} /></FormField>
                                </div>
                            </section>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors">Cancel</button>
                            <button onClick={createPayrollEntry} disabled={creating}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-60 text-sm font-bold">
                                {creating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Payroll Entry</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ CREATE SALARY STRUCTURE MODAL ══ */}
            {showCreateStructureModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-5xl max-h-[94vh] flex flex-col">

                        {/* Modal header */}
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border shrink-0">
                            <div>
                                <h2 className="text-lg font-bold">New Salary Structure</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Define earnings, deductions and pay structure settings</p>
                            </div>
                            <button onClick={() => setShowCreateStructureModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>

                        {/* Modal body */}
                        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                            {createStructureError && (
                                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                    <span className="text-destructive text-sm whitespace-pre-line">{createStructureError}</span>
                                </div>
                            )}

                            {/* Basic Details */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Basic Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Structure Name" required>
                                        <input
                                            type="text"
                                            value={structureName}
                                            onChange={e => setStructureName(e.target.value)}
                                            placeholder="e.g. Senior Engineer Pay"
                                            className={inputCls}
                                        />
                                    </FormField>
                                    <FormField label="Company" required>
                                        <select value={newStructure.company} onChange={e => updateStructure('company', e.target.value)} className={inputCls}>
                                            <option value="">Select Company...</option>
                                            {companies.map(company => (
                                                <option key={company.name} value={company.name}>
                                                    {company.company_name || company.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Currency" required>
                                        <select value={newStructure.currency} onChange={e => updateStructure('currency', e.target.value)} className={inputCls}>
                                            <option value="">Select Currency...</option>
                                            {currencies.map(currency => (
                                                <option key={currency.name} value={currency.name}>
                                                    {currency.currency_name || currency.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Is Active" required>
                                        <select value={newStructure.is_active} onChange={e => updateStructure('is_active', e.target.value)} className={inputCls}>
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </FormField>
                                    <FormField label="Letter Head">
                                        <input type="text" value={newStructure.letter_head} onChange={e => updateStructure('letter_head', e.target.value)} placeholder="Letter head name" className={inputCls} />
                                    </FormField>
                                </div>
                            </section>

                            {/* Payroll Configuration */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Payroll Configuration</h3>
                                <div className="mb-4">
                                    <CheckboxField
                                        id="struct_timesheet"
                                        label="Salary Slip Based on Timesheet"
                                        description="When enabled, salary is calculated based on timesheet hours rather than a fixed frequency"
                                        checked={newStructure.salary_slip_based_on_timesheet === 1}
                                        onChange={v => updateStructure('salary_slip_based_on_timesheet', v)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {newStructure.salary_slip_based_on_timesheet === 0 && (
                                        <FormField label="Payroll Frequency" required>
                                            <select value={newStructure.payroll_frequency} onChange={e => updateStructure('payroll_frequency', e.target.value)} className={inputCls}>
                                                <option value="">Select...</option>
                                                <option value="Monthly">Monthly</option>
                                                <option value="Fortnightly">Fortnightly</option>
                                                <option value="Bimonthly">Bimonthly</option>
                                                <option value="Weekly">Weekly</option>
                                                <option value="Daily">Daily</option>
                                            </select>
                                        </FormField>
                                    )}
                                    {newStructure.salary_slip_based_on_timesheet === 1 && (
                                        <>
                                            <FormField label="Salary Component (for Timesheet)">
                                                <input type="text" value={newStructure.salary_component} onChange={e => updateStructure('salary_component', e.target.value)} placeholder="Component for timesheet earnings" className={inputCls} />
                                            </FormField>
                                            <FormField label="Hour Rate">
                                                <input type="number" step="0.01" min="0" value={newStructure.hour_rate} onChange={e => updateStructure('hour_rate', e.target.value)} placeholder="0.00" className={inputCls} />
                                            </FormField>
                                        </>
                                    )}
                                    <FormField label="Leave Encashment Amount Per Day">
                                        <input type="number" step="0.01" min="0" value={newStructure.leave_encashment_amount_per_day} onChange={e => updateStructure('leave_encashment_amount_per_day', e.target.value)} placeholder="0.00" className={inputCls} />
                                    </FormField>
                                    <FormField label="Max Benefits (Amount)">
                                        <input type="number" step="0.01" min="0" value={newStructure.max_benefits} onChange={e => updateStructure('max_benefits', e.target.value)} placeholder="0.00" className={inputCls} />
                                    </FormField>
                                </div>
                            </section>

                            {/* Payment */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Payment Account</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Mode of Payment">
                                        <select value={newStructure.mode_of_payment} onChange={e => updateStructure('mode_of_payment', e.target.value)} className={inputCls}>
                                            <option value="">Select Mode of Payment...</option>
                                            {modesOfPayment.map(mode => (
                                                <option key={mode.name} value={mode.name}>
                                                    {mode.mode_of_payment_name || mode.name}
                                                </option>
                                            ))}
                                        </select>
                                    </FormField>
                                    <FormField label="Payment Account">
                                        <input type="text" value={newStructure.payment_account} onChange={e => updateStructure('payment_account', e.target.value)} placeholder="e.g. Bank - AL" className={inputCls} />
                                    </FormField>
                                </div>
                            </section>

                            {/* Earnings & Deductions */}
                            <section>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 pb-1 border-b border-border">Earnings &amp; Deductions</h3>
                                <div className="space-y-4">
                                    <SalaryDetailTable
                                        title="Earnings"
                                        rows={earningsRows}
                                        setRows={setEarningsRows}
                                        color="green"
                                    />
                                    <SalaryDetailTable
                                        title="Deductions"
                                        rows={deductionRows}
                                        setRows={setDeductionRows}
                                        color="red"
                                    />
                                </div>

                                {/* Legend */}
                                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    <span><strong>Pd Days</strong> — Depends on Payment Days</span>
                                    <span><strong>Stat.</strong> — Statistical Component (not counted in totals)</span>
                                    <span><strong>Excl.</strong> — Do Not Include in Total</span>
                                </div>
                            </section>
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
                            <button onClick={() => setShowCreateStructureModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors">Cancel</button>
                            <button
                                onClick={createSalaryStructure}
                                disabled={creatingStructure}
                                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 disabled:opacity-60 text-sm font-bold"
                            >
                                {creatingStructure
                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating...</>
                                    : <><Plus className="w-4 h-4" /> Create Salary Structure</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ PAYROLL ENTRY DETAIL MODAL ══ */}
            {showPayrollModal && selectedPayrollEntry && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Payroll Entry Details</h2>
                            <button onClick={() => setShowPayrollModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /><span className="ml-2">Loading details...</span></div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-medium mb-3">Basic Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Entry ID</label><p className="font-medium">{selectedPayrollEntry.name}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Posting Date</label><p className="font-medium">{formatDate(selectedPayrollEntry.posting_date)}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Company</label><p className="font-medium">{selectedPayrollEntry.company}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Status</label><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedPayrollEntry.status)}`}>{selectedPayrollEntry.status}</span></p></div>
                                            <div><label className="text-sm text-muted-foreground">Payroll Frequency</label><p className="font-medium">{selectedPayrollEntry.payroll_frequency}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Branch</label><p className="font-medium">{selectedPayrollEntry.branch || 'N/A'}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-3">Period Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Start Date</label><p className="font-medium">{formatDate(selectedPayrollEntry.start_date)}</p></div>
                                            <div><label className="text-sm text-muted-foreground">End Date</label><p className="font-medium">{formatDate(selectedPayrollEntry.end_date)}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-3">Summary</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Number of Employees</label><p className="font-medium">{selectedPayrollEntry.number_of_employees}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Department</label><p className="font-medium">{selectedPayrollEntry.department || 'N/A'}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Salary Slips Created</label><p className="font-medium">{selectedPayrollEntry.salary_slips_created}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Salary Slips Submitted</label><p className="font-medium">{selectedPayrollEntry.salary_slips_submitted}</p></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ══ SALARY SLIP DETAIL MODAL ══ */}
            {showSalaryModal && selectedSalarySlip && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Salary Slip Details</h2>
                            <button onClick={() => setShowSalaryModal(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6">
                            {loadingDetails ? (
                                <div className="flex items-center justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-primary" /><span className="ml-2">Loading details...</span></div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="font-medium mb-3">Employee Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Employee</label><p className="font-medium">{selectedSalarySlip.employee_name}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Employee ID</label><p className="font-medium">{selectedSalarySlip.employee}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Department</label><p className="font-medium">{selectedSalarySlip.department}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Designation</label><p className="font-medium">{selectedSalarySlip.designation}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Branch</label><p className="font-medium">{selectedSalarySlip.branch}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Salary Structure</label><p className="font-medium">{selectedSalarySlip.salary_structure}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-3">Payroll Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Posting Date</label><p className="font-medium">{formatDate(selectedSalarySlip.posting_date)}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Status</label><p><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedSalarySlip.status)}`}>{selectedSalarySlip.status}</span></p></div>
                                            <div><label className="text-sm text-muted-foreground">Payroll Frequency</label><p className="font-medium">{selectedSalarySlip.payroll_frequency}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Mode of Payment</label><p className="font-medium">{selectedSalarySlip.mode_of_payment}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Payroll Entry</label><p className="font-medium">{selectedSalarySlip.payroll_entry}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Currency</label><p className="font-medium">{selectedSalarySlip.currency}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-3">Attendance Information</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Total Working Days</label><p className="font-medium">{selectedSalarySlip.total_working_days}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Payment Days</label><p className="font-medium">{selectedSalarySlip.payment_days}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Absent Days</label><p className="font-medium">{selectedSalarySlip.absent_days}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Leave Without Pay</label><p className="font-medium">{selectedSalarySlip.leave_without_pay}</p></div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-3">Salary Summary</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="text-sm text-muted-foreground">Gross Pay</label><p className="font-medium">{formatCurrency(selectedSalarySlip.gross_pay)}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Total Deduction</label><p className="font-medium">{formatCurrency(selectedSalarySlip.total_deduction)}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Net Pay</label><p className="font-medium text-lg">{formatCurrency(selectedSalarySlip.net_pay)}</p></div>
                                            <div><label className="text-sm text-muted-foreground">Total in Words</label><p className="font-medium">{selectedSalarySlip.total_in_words}</p></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </PageLayout>
    );
};

export default PayrollPage;