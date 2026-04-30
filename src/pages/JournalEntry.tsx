import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, RefreshCw, Eye, Download, FileText, X, Save, Calculator } from 'lucide-react';
import Pagination from '../components/Pagination';

interface JournalEntry {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    posting_date: string;
    voucher_type: string;
    company: string;
    inter_company_journal_entry_reference: string | null;
    user_remark: string;
    amended_from: string | null;
    total_debit: number;
    total_credit: number;
    difference: number;
    is_opening: string;
    title: string;
    cheque_no: string | null;
    cheque_date: string | null;
    clearance_date: string | null;
    bill_no: string | null;
    bill_date: string | null;
    due_date: string | null;
    mode_of_payment: string | null;
    payment_order: string | null;
    multi_currency: number;
    status: string;
}

interface JournalEntryAccount {
    name: string;
    parent: string;
    parentfield: string;
    parenttype: string;
    idx: number;
    account: string;
    party_type: string;
    party: string;
    cost_center: string;
    debit_in_account_currency: number;
    credit_in_account_currency: number;
    debit: number;
    credit: number;
    account_currency: string;
    against: string;
    project: string;
    is_advance: string;
    reference_type: string;
    reference_name: string;
    reference_date: string;
    reference_no: string;
    user_remark: string;
    doctype: string;
    __last_sync_on: string;
}

interface Account {
    name: string;
    account_name: string;
    account_type: string;
    root_type: string;
    is_group: boolean;
    company: string;
    account_currency: string;
}

interface NewJournalEntryAccount {
    account: string;
    party_type?: string;
    party?: string;
    cost_center: string;
    debit: number;
    credit: number;
    against?: string;
    project?: string;
    user_remark?: string;
}

interface NewJournalEntry {
    posting_date: string;
    company: string;
    title: string;
    user_remark: string;
    accounts: NewJournalEntryAccount[];
}

const JournalEntryPage = () => {
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [entryAccounts, setEntryAccounts] = useState<JournalEntryAccount[]>([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    
    // New entry creation state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newEntry, setNewEntry] = useState<NewJournalEntry>({
        posting_date: new Date().toISOString().split('T')[0],
        company: 'Quantbit Restro',
        title: '',
        user_remark: '',
        accounts: [
            { account: '', cost_center: 'Main - QR', debit: 0, credit: 0 },
            { account: '', cost_center: 'Main - QR', debit: 0, credit: 0 }
        ]
    });

    // Filter states
    const [filterCompany, setFilterCompany] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterVoucherType, setFilterVoucherType] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Fetch Journal Entries from Python API
    const fetchJournalEntries = async () => {
        try {
            setLoading(true);
            console.log('Fetching Journal Entries...');
            
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_journal_entries', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch journal entries');
            }
            
            const data = await response.json();
            console.log('Journal Entries response:', data);
            
            // Handle both direct array and message property formats
            const entries = data.message || data;
            
            if (entries && Array.isArray(entries)) {
                setJournalEntries(entries);
                setFilteredEntries(entries);
            } else {
                console.error('Invalid journal entries data format:', data);
                setJournalEntries([]);
                setFilteredEntries([]);
            }
            
            setLastUpdated(new Date());
            
        } catch (err) {
            console.error('Error fetching journal entries:', err);
            
            // Handle permission errors gracefully
            if (err instanceof Error && err.message.includes('PermissionError')) {
                console.warn('Permission denied - user may not have access to Journal Entry data');
                setJournalEntries([]);
                setFilteredEntries([]);
            } else {
                // For other errors, also set empty arrays
                setJournalEntries([]);
                setFilteredEntries([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch entry accounts for selected entry
    const fetchEntryAccounts = async (entryName: string) => {
        try {
            const response = await fetch(`/api/method/quantbit_ury_customization.ury_customization.get_journal_entry_accounts?entry_name=${encodeURIComponent(entryName)}`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Handle both direct array and message property formats
                const accounts = data.message || data;
                if (accounts && Array.isArray(accounts)) {
                    setEntryAccounts(accounts);
                }
            }
        } catch (err) {
            console.error('Error fetching entry accounts:', err);
            setEntryAccounts([]);
        }
    };

    // Fetch accounts for dropdown
    const fetchAccounts = async () => {
        try {
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_accounts', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                // Handle both direct array and message property formats
                const accounts = data.message || data;
                if (accounts && Array.isArray(accounts)) {
                    setAccounts(accounts);
                }
            }
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    };

    // Create new journal entry
    const createJournalEntry = async () => {
        try {
            setIsSubmitting(true);
            
            // Validate entry
            if (!newEntry.title) {
                alert('Title is required');
                return;
            }
            
            if (newEntry.accounts.length < 2) {
                alert('At least 2 accounts are required');
                return;
            }
            
            // Check if entry is balanced
            const totalDebit = newEntry.accounts.reduce((sum, acc) => sum + (acc.debit || 0), 0);
            const totalCredit = newEntry.accounts.reduce((sum, acc) => sum + (acc.credit || 0), 0);
            
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                alert('Journal Entry must be balanced');
                return;
            }
            
            // Create journal entry
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.create_journal_entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: newEntry.title,
                    posting_date: newEntry.posting_date,
                    user_remark: newEntry.user_remark,
                    accounts: newEntry.accounts.map(acc => ({
                        account: acc.account,
                        party_type: acc.party_type,
                        party: acc.party,
                        cost_center: acc.cost_center,
                        debit: acc.debit || 0,
                        credit: acc.credit || 0,
                        user_remark: acc.user_remark
                    }))
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Journal Entry created:', result);
                
                // Handle both direct response and message property formats
                const data = result.message || result;
                
                if (data.success) {
                    // Reset form
                    setShowCreateModal(false);
                    setNewEntry({
                        title: '',
                        posting_date: new Date().toISOString().split('T')[0],
                        user_remark: '',
                        accounts: [],
                        company: 'Quantbit Restro'
                    });
                    
                    // Refresh entries
                    fetchJournalEntries();
                    
                    alert('Journal Entry created successfully!');
                } else {
                    alert(`Failed to create journal entry: ${data.error}`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.exc || 'Failed to create journal entry';
                alert(`Error creating Journal Entry: ${errorMsg}`);
            }
            
        } catch (err) {
            console.error('Error creating journal entry:', err);
            alert('An unexpected error occurred while creating the Journal Entry.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add new account row
    const addAccountRow = () => {
        setNewEntry(prev => ({
            ...prev,
            accounts: [...prev.accounts, { account: '', cost_center: 'Main - QR', debit: 0, credit: 0 }]
        }));
    };

    // Remove account row
    const removeAccountRow = (index: number) => {
        if (newEntry.accounts.length > 2) {
            setNewEntry(prev => ({
                ...prev,
                accounts: prev.accounts.filter((_, i) => i !== index)
            }));
        }
    };

    // Update account row
    const updateAccountRow = (index: number, field: keyof NewJournalEntryAccount, value: any) => {
        setNewEntry(prev => ({
            ...prev,
            accounts: prev.accounts.map((acc, i) => 
                i === index ? { ...acc, [field]: value } : acc
            )
        }));
    };

    // Calculate totals
    const calculateTotals = () => {
        const totalDebit = newEntry.accounts.reduce((sum, acc) => sum + acc.debit, 0);
        const totalCredit = newEntry.accounts.reduce((sum, acc) => sum + acc.credit, 0);
        const difference = totalDebit - totalCredit;
        return { totalDebit, totalCredit, difference };
    };

    useEffect(() => {
        fetchJournalEntries();
        fetchAccounts();
    }, []);

    // Filter entries
    useEffect(() => {
        let filtered = journalEntries;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(entry => 
                entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.user_remark.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Company filter
        if (filterCompany) {
            filtered = filtered.filter(entry => entry.company === filterCompany);
        }

        // Status filter
        if (filterStatus) {
            filtered = filtered.filter(entry => entry.status === filterStatus);
        }

        // Voucher type filter
        if (filterVoucherType) {
            filtered = filtered.filter(entry => entry.voucher_type === filterVoucherType);
        }

        // Date filter
        if (filterFromDate) {
            filtered = filtered.filter(entry => entry.posting_date >= filterFromDate);
        }
        if (filterToDate) {
            filtered = filtered.filter(entry => entry.posting_date <= filterToDate);
        }

        setFilteredEntries(filtered);
    }, [searchTerm, journalEntries, filterCompany, filterStatus, filterVoucherType, filterFromDate, filterToDate]);

    // Get paginated entries for display
    const paginatedEntries = filteredEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

    // Reset to page 1 when filters or itemsPerPage change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterCompany, filterStatus, filterVoucherType, filterFromDate, filterToDate, itemsPerPage]);

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-KS', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string): string => {
        return new Date(dateString).toLocaleString('en-KE');
    };

    const openDetailsModal = async (entry: JournalEntry) => {
        setSelectedEntry(entry);
        await fetchEntryAccounts(entry.name);
        setShowDetailsModal(true);
    };

    const clearFilters = () => {
        setFilterCompany('');
        setFilterStatus('');
        setFilterVoucherType('');
        setFilterFromDate('');
        setFilterToDate('');
    };

    // Get unique values for filters
    const uniqueCompanies = [...new Set(journalEntries.map(entry => entry.company))];
    const uniqueStatuses = [...new Set(journalEntries.map(entry => entry.status))];
    const uniqueVoucherTypes = [...new Set(journalEntries.map(entry => entry.voucher_type))];

    return (
        <div className="p-6 bg-gray-50/80 min-h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-extrabold text-[#2D2A26]">Journal Entries</h1>
                        <p className="text-sm text-gray-400">Journal vouchers and accounting entries</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity"
                        >
                            <Plus className="h-4 w-4" />
                            Create Journal Entry
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 transition-colors"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                        <button
                            onClick={fetchJournalEntries}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 transition-colors"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search journal entries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50"
                        />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Showing {filteredEntries.length} of {journalEntries.length} entries
                    </div>
                    <div className="text-sm text-muted-foreground">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="mb-4 p-4 border border-gray-200 rounded-xl bg-muted/30">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Company</label>
                            <select
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            >
                                <option value="">All Companies</option>
                                {uniqueCompanies.map(company => (
                                    <option key={company} value={company}>{company}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            >
                                <option value="">All Statuses</option>
                                {uniqueStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Voucher Type</label>
                            <select
                                value={filterVoucherType}
                                onChange={(e) => setFilterVoucherType(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            >
                                <option value="">All Types</option>
                                {uniqueVoucherTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">From Date</label>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">To Date</label>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={clearFilters}
                            className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>
            )}

            {/* Journal Entries Table */}
            <div className="bg-card border border-border rounded-lg">
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="w-full">
                        <thead className="sticky top-0 bg-card border-b border-border z-10">
                            <tr className="border-b border-border">
                                <th className="text-left p-3 font-medium text-sm bg-card">Entry ID</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Date</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Title</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Company</th>
                                <th className="text-right p-3 font-medium text-sm bg-card">Total Debit</th>
                                <th className="text-right p-3 font-medium text-sm bg-card">Total Credit</th>
                                <th className="text-right p-3 font-medium text-sm bg-card">Difference</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Status</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E4B315] mx-auto"></div>
                                        <p className="mt-2 text-muted-foreground">Loading journal entries...</p>
                                    </td>
                                </tr>
                            ) : paginatedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center p-8">
                                        <p className="text-sm text-gray-400">No journal entries found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedEntries.map((entry) => (
                                    <tr key={entry.name} className="border-b border-border hover:bg-[#E4B315]/3 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-sm">{entry.name}</div>
                                            <div className="text-xs text-muted-foreground">{formatDate(entry.creation)}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm">{formatDate(entry.posting_date)}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="max-w-xs">
                                                <div className="font-medium text-sm">{entry.title}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {entry.user_remark || 'No remarks'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm">{entry.company}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="text-sm font-medium text-red-600">
                                                {formatCurrency(entry.total_debit)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className="text-sm font-medium text-green-600">
                                                {formatCurrency(entry.total_credit)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <span className={`text-sm font-medium ${
                                                Math.abs(entry.difference) > 0.01 ? 'text-orange-600' : 'text-gray-600'
                                            }`}>
                                                {formatCurrency(entry.difference)}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {entry.docstatus === 1 ? (
                                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                        Submitted
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                                        Draft
                                                    </span>
                                                )}
                                                {entry.status === 'Cancelled' && (
                                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                                        Cancelled
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openDetailsModal(entry)}
                                                    className="p-1 hover:bg-muted rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
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
                        totalItems={filteredEntries.length}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedEntry && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h2 className="text-xl font-semibold">Journal Entry Details</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Basic Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Posting Date:</span>
                                            <span className="font-medium">{formatDate(selectedEntry.posting_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Title:</span>
                                            <span className="font-medium">{selectedEntry.title}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Company:</span>
                                            <span className="font-medium">{selectedEntry.company}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">User Remark:</span>
                                            <span className="font-medium">{selectedEntry.user_remark || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Amount Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Total Debit:</span>
                                            <span className="font-medium text-red-600">
                                                {formatCurrency(selectedEntry.total_debit)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Total Credit:</span>
                                            <span className="font-medium text-green-600">
                                                {formatCurrency(selectedEntry.total_credit)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Difference:</span>
                                            <span className={`font-medium ${
                                                Math.abs(selectedEntry.difference) > 0.01 ? 'text-orange-600' : 'text-gray-600'
                                            }`}>
                                                {formatCurrency(selectedEntry.difference)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Multi Currency:</span>
                                            <span className="font-medium">{selectedEntry.multi_currency}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Voucher Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Voucher Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Voucher Type:</span>
                                            <span className="font-medium">{selectedEntry.voucher_type}</span>
                                        </div>
                                                                                                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Is Opening:</span>
                                            <span className="font-medium">{selectedEntry.is_opening}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Amended From:</span>
                                            <span className="font-medium">{selectedEntry.amended_from || '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* System Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">System Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Owner:</span>
                                            <span className="font-medium">{selectedEntry.owner}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Created:</span>
                                            <span className="font-medium">{formatDateTime(selectedEntry.creation)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Modified By:</span>
                                            <span className="font-medium">{selectedEntry.modified_by}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Modified:</span>
                                            <span className="font-medium">{formatDateTime(selectedEntry.modified)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Document Status:</span>
                                            <span className="font-medium">{selectedEntry.docstatus === 1 ? 'Submitted' : 'Draft'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Entry Accounts */}
                            <div className="mt-6">
                                <h3 className="text-lg font-medium mb-4">Entry Accounts</h3>
                                <div className="border border-border rounded-lg">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-muted/30">
                                                <tr>
                                                    <th className="text-left p-3 font-medium text-sm">Account</th>
                                                    <th className="text-left p-3 font-medium text-sm">Party</th>
                                                    <th className="text-left p-3 font-medium text-sm">Cost Center</th>
                                                    <th className="text-right p-3 font-medium text-sm">Debit</th>
                                                    <th className="text-right p-3 font-medium text-sm">Credit</th>
                                                    <th className="text-left p-3 font-medium text-sm">Against</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entryAccounts.map((account, index) => (
                                                    <tr key={index} className="border-b border-border">
                                                        <td className="p-3">
                                                            <span className="text-sm font-medium">{account.account}</span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="text-sm">{account.party || '-'}</span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="text-sm">{account.cost_center}</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {account.debit > 0 ? (
                                                                <span className="text-sm font-medium text-red-600">
                                                                    {formatCurrency(account.debit)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {account.credit > 0 ? (
                                                                <span className="text-sm font-medium text-green-600">
                                                                    {formatCurrency(account.credit)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-sm text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="text-sm">{account.against || '-'}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Journal Entry Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h2 className="text-xl font-semibold">Create Journal Entry</h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Posting Date *</label>
                                    <input
                                        type="date"
                                        value={newEntry.posting_date}
                                        onChange={(e) => setNewEntry(prev => ({ ...prev, posting_date: e.target.value }))}
                                        className="w-full p-2 border border-gray-200 rounded-xl"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Company *</label>
                                    <input
                                        type="text"
                                        value={newEntry.company}
                                        disabled
                                        className="w-full p-2 border border-gray-200 rounded-xl bg-muted"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={newEntry.title}
                                        onChange={(e) => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                                        placeholder="Enter journal entry title"
                                        className="w-full p-2 border border-gray-200 rounded-xl"
                                        required
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium mb-1">User Remark</label>
                                    <textarea
                                        value={newEntry.user_remark}
                                        onChange={(e) => setNewEntry(prev => ({ ...prev, user_remark: e.target.value }))}
                                        placeholder="Enter remarks"
                                        rows={2}
                                        className="w-full p-2 border border-gray-200 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Accounts Table */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-medium">Accounts</h3>
                                    <button
                                        onClick={addAccountRow}
                                        className="flex items-center gap-2 px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Account
                                    </button>
                                </div>

                                <div className="border border-border rounded-lg overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/30">
                                            <tr>
                                                <th className="text-left p-3 font-medium text-sm">Account *</th>
                                                <th className="text-left p-3 font-medium text-sm">Party Type</th>
                                                <th className="text-left p-3 font-medium text-sm">Party</th>
                                                <th className="text-left p-3 font-medium text-sm">Cost Center *</th>
                                                <th className="text-right p-3 font-medium text-sm">Debit</th>
                                                <th className="text-right p-3 font-medium text-sm">Credit</th>
                                                <th className="text-left p-3 font-medium text-sm">Against</th>
                                                <th className="text-center p-3 font-medium text-sm">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {newEntry.accounts.map((account, index) => (
                                                <tr key={index} className="border-b border-border">
                                                    <td className="p-3">
                                                        <select
                                                            value={account.account}
                                                            onChange={(e) => updateAccountRow(index, 'account', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                                                            required
                                                        >
                                                            <option value="">Select Account</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc.name} value={acc.name}>
                                                                    {acc.account_name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            value={account.party_type || ''}
                                                            onChange={(e) => updateAccountRow(index, 'party_type', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                                                        >
                                                            <option value="">None</option>
                                                            <option value="Customer">Customer</option>
                                                            <option value="Supplier">Supplier</option>
                                                            <option value="Employee">Employee</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            value={account.party || ''}
                                                            onChange={(e) => updateAccountRow(index, 'party', e.target.value)}
                                                            placeholder="Party name"
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <select
                                                            value={account.cost_center}
                                                            onChange={(e) => updateAccountRow(index, 'cost_center', e.target.value)}
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                                                            required
                                                        >
                                                            <option value="Main - QR">Main - QR</option>
                                                            <option value="Operations - QR">Operations - QR</option>
                                                            <option value="Administration - QR">Administration - QR</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            value={account.debit || ''}
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value) || 0;
                                                                updateAccountRow(index, 'debit', value);
                                                                updateAccountRow(index, 'credit', 0); // Clear credit when debit is entered
                                                            }}
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            min="0"
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm text-right"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="number"
                                                            value={account.credit || ''}
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value) || 0;
                                                                updateAccountRow(index, 'credit', value);
                                                                updateAccountRow(index, 'debit', 0); // Clear debit when credit is entered
                                                            }}
                                                            placeholder="0.00"
                                                            step="0.01"
                                                            min="0"
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm text-right"
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input
                                                            type="text"
                                                            value={account.against || ''}
                                                            onChange={(e) => updateAccountRow(index, 'against', e.target.value)}
                                                            placeholder="Against account"
                                                            className="w-full p-2 border border-gray-200 rounded-xl text-sm"
                                                        />
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {newEntry.accounts.length > 2 && (
                                                            <button
                                                                onClick={() => removeAccountRow(index)}
                                                                className="p-1 hover:bg-muted rounded transition-colors text-red-600"
                                                                title="Remove Account"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border border-border rounded-lg p-4 bg-muted/30">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Total Debit</div>
                                        <div className="text-lg font-semibold text-red-600">
                                            {formatCurrency(calculateTotals().totalDebit)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Total Credit</div>
                                        <div className="text-lg font-semibold text-green-600">
                                            {formatCurrency(calculateTotals().totalCredit)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground">Difference</div>
                                        <div className={`text-lg font-semibold ${
                                            Math.abs(calculateTotals().difference) > 0.01 ? 'text-orange-600' : 'text-gray-600'
                                        }`}>
                                            {formatCurrency(calculateTotals().difference)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={createJournalEntry}
                                    disabled={isSubmitting || Math.abs(calculateTotals().difference) > 0.01}
                                    className="px-4 py-2 bg-gradient-to-r from-[#E4B315] to-[#C69A11] text-white rounded-xl shadow-md shadow-[#E4B315]/20 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Creating...' : 'Create Journal Entry'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default JournalEntryPage;