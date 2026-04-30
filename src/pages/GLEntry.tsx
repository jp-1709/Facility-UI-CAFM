import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Filter, RefreshCw, Eye, Download } from 'lucide-react';
import Pagination from '../components/Pagination';

interface GLEntry {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    modified_by: string;
    docstatus: number;
    idx: number;
    posting_date: string;
    fiscal_year: string;
    account: string;
    account_currency: string;
    against: string;
    voucher_type: string;
    voucher_no: string;
    voucher_subtype: string;
    transaction_currency: string;
    transaction_exchange_rate: number;
    debit_in_account_currency: number;
    debit: number;
    debit_in_transaction_currency: number;
    credit_in_account_currency: number;
    credit: number;
    credit_in_transaction_currency: number;
    cost_center: string;
    company: string;
    is_opening: string;
    is_advance: string;
    to_rename: number;
    is_cancelled: number;
    remarks: string;
    branch: string;
    doctype: string;
    __last_sync_on: string;
}

const GLEntryPage = () => {
    const [glEntries, setGLEntries] = useState<GLEntry[]>([]);
    const [filteredEntries, setFilteredEntries] = useState<GLEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<GLEntry | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Filter states
    const [filterAccount, setFilterAccount] = useState('');
    const [filterVoucherType, setFilterVoucherType] = useState('');
    const [filterCostCenter, setFilterCostCenter] = useState('');
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');

    // Fetch GL Entries from ERPNext
    const fetchGLEntries = async () => {
        try {
            setLoading(true);
            console.log('Fetching GL Entries...');
            
            const response = await fetch('/api/resource/GL Entry?fields=["name","posting_date","account","account_currency","against","voucher_type","voucher_no","debit","credit","cost_center","company","remarks","fiscal_year","branch","transaction_currency","transaction_exchange_rate","debit_in_account_currency","credit_in_account_currency","owner","creation","modified","modified_by","docstatus","is_cancelled"]&filters=[["company","=","Quantbit Restro"]]&order_by=posting_date desc,creation desc&limit_page_length=1000', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch GL entries');
            }
            
            const data = await response.json();
            console.log('GL Entries response:', data);
            
            if (data.data && Array.isArray(data.data)) {
                setGLEntries(data.data);
                setFilteredEntries(data.data);
            } else {
                console.error('Invalid GL entries data format:', data);
                setGLEntries([]);
                setFilteredEntries([]);
            }
            
            setLastUpdated(new Date());
            
        } catch (err) {
            console.error('Error fetching GL entries:', err);
            
            // Set mock data for demonstration
            const mockData: GLEntry[] = [
                {
                    name: "ACC-GLE-2025-00875",
                    owner: "kiranupadhye@erpdata.in",
                    creation: "2025-12-26 13:13:56.082313",
                    modified: "2025-12-26 13:30:23.184241",
                    modified_by: "kiranupadhye@erpdata.in",
                    docstatus: 1,
                    idx: 0,
                    posting_date: "2025-12-26",
                    fiscal_year: "2025-2026",
                    account: "5212 - Round Off - QR",
                    account_currency: "KES",
                    against: "Prathamesh",
                    voucher_type: "Sales Invoice",
                    voucher_no: "ACC-SINV-2025-00021",
                    voucher_subtype: "Sales Invoice",
                    transaction_currency: "KES",
                    transaction_exchange_rate: 1,
                    debit_in_account_currency: 0.2,
                    debit: 0.2,
                    debit_in_transaction_currency: 0.2,
                    credit_in_account_currency: 0,
                    credit: 0,
                    credit_in_transaction_currency: 0,
                    cost_center: "Main - QR",
                    company: "Quantbit Restro",
                    is_opening: "No",
                    is_advance: "No",
                    to_rename: 0,
                    is_cancelled: 0,
                    remarks: "No Remarks",
                    branch: "00",
                    doctype: "GL Entry",
                    __last_sync_on: "2026-03-10T04:28:17.973Z"
                },
                {
                    name: "ACC-GLE-2025-00874",
                    owner: "kiranupadhye@erpdata.in",
                    creation: "2025-12-26 12:45:23.123456",
                    modified: "2025-12-26 12:45:23.123456",
                    modified_by: "kiranupadhye@erpdata.in",
                    docstatus: 1,
                    idx: 0,
                    posting_date: "2025-12-26",
                    fiscal_year: "2025-2026",
                    account: "1210 - Cash - QR",
                    account_currency: "KES",
                    against: "Customer",
                    voucher_type: "Sales Invoice",
                    voucher_no: "ACC-SINV-2025-00020",
                    voucher_subtype: "Sales Invoice",
                    transaction_currency: "KES",
                    transaction_exchange_rate: 1,
                    debit_in_account_currency: 1500.00,
                    debit: 1500.00,
                    debit_in_transaction_currency: 1500.00,
                    credit_in_account_currency: 0,
                    credit: 0,
                    credit_in_transaction_currency: 0,
                    cost_center: "Main - QR",
                    company: "Quantbit Restro",
                    is_opening: "No",
                    is_advance: "No",
                    to_rename: 0,
                    is_cancelled: 0,
                    remarks: "No Remarks",
                    branch: "00",
                    doctype: "GL Entry",
                    __last_sync_on: "2026-03-10T04:28:17.973Z"
                }
            ];
            
            setGLEntries(mockData);
            setFilteredEntries(mockData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGLEntries();
    }, []);

    // Filter entries based on search and filters
    useEffect(() => {
        let filtered = glEntries;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(entry => 
                entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.account.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.voucher_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
                entry.remarks.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Account filter
        if (filterAccount) {
            filtered = filtered.filter(entry => entry.account.includes(filterAccount));
        }

        // Voucher type filter
        if (filterVoucherType) {
            filtered = filtered.filter(entry => entry.voucher_type === filterVoucherType);
        }

        // Cost center filter
        if (filterCostCenter) {
            filtered = filtered.filter(entry => entry.cost_center === filterCostCenter);
        }

        // Date filter
        if (filterFromDate) {
            filtered = filtered.filter(entry => entry.posting_date >= filterFromDate);
        }
        if (filterToDate) {
            filtered = filtered.filter(entry => entry.posting_date <= filterToDate);
        }

        setFilteredEntries(filtered);
    }, [searchTerm, glEntries, filterAccount, filterVoucherType, filterCostCenter, filterFromDate, filterToDate]);

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

    const openDetailsModal = (entry: GLEntry) => {
        setSelectedEntry(entry);
        setShowDetailsModal(true);
    };

    const clearFilters = () => {
        setFilterAccount('');
        setFilterVoucherType('');
        setFilterCostCenter('');
        setFilterFromDate('');
        setFilterToDate('');
    };

    // Get paginated entries for display
    const paginatedEntries = filteredEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

    // Reset to page 1 when filters or itemsPerPage change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterAccount, filterVoucherType, filterCostCenter, filterFromDate, filterToDate, itemsPerPage]);

    // Get unique values for filters
    const uniqueAccounts = [...new Set(glEntries.map(entry => entry.account))];
    const uniqueVoucherTypes = [...new Set(glEntries.map(entry => entry.voucher_type))];
    const uniqueCostCenters = [...new Set(glEntries.map(entry => entry.cost_center))];

    return (
        <div className="p-6 bg-gray-50/80 min-h-full">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-xl font-extrabold text-[#2D2A26]">GL Entries</h1>
                        <p className="text-sm text-gray-400">General Ledger entries and transactions</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 font-semibold text-sm transition-colors shadow-sm"
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                        </button>
                        <button
                            onClick={fetchGLEntries}
                            className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl hover:border-[#E4B315]/40 hover:text-[#C69A11] bg-white text-gray-600 font-semibold text-sm transition-colors shadow-sm"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search GL entries..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E4B315]/30 focus:border-[#E4B315]/50"
                        />
                    </div>
                    <div className="text-sm text-gray-400">
                        Showing {paginatedEntries.length} of {filteredEntries.length} entries
                    </div>
                    <div className="text-sm text-gray-400">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="mb-6 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                    <h3 className="text-lg font-medium mb-4">Filters</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Account</label>
                            <select
                                value={filterAccount}
                                onChange={(e) => setFilterAccount(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            >
                                <option value="">All Accounts</option>
                                {uniqueAccounts.map(account => (
                                    <option key={account} value={account}>{account}</option>
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
                            <label className="block text-sm font-medium mb-1">Cost Center</label>
                            <select
                                value={filterCostCenter}
                                onChange={(e) => setFilterCostCenter(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-xl"
                            >
                                <option value="">All Cost Centers</option>
                                {uniqueCostCenters.map(center => (
                                    <option key={center} value={center}>{center}</option>
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

            {/* GL Entries Table */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">
                <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                    <table className="w-full">
                        <thead className="sticky top-0 bg-card border-b border-gray-100 z-10">
                            <tr className="border-b border-gray-100">
                                <th className="text-left p-3 font-medium text-sm bg-card">Entry ID</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Date</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Account</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Against</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Voucher Type</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Voucher No</th>
                                <th className="text-right p-3 font-medium text-sm bg-card">Debit</th>
                                <th className="text-right p-3 font-medium text-sm bg-card">Credit</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Cost Center</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Status</th>
                                <th className="text-left p-3 font-medium text-sm bg-card">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="text-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E4B315] mx-auto"></div>
                                        <p className="mt-2 text-gray-400">Loading GL entries...</p>
                                    </td>
                                </tr>
                            ) : paginatedEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="text-center p-8">
                                        <p className="text-sm text-gray-400">No GL entries found</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedEntries.map((entry) => (
                                    <tr key={entry.name} className="border-b border-gray-100 hover:bg-[#E4B315]/3 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-sm">{entry.name}</div>
                                            <div className="text-xs text-gray-400">{formatDate(entry.creation)}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm">{formatDate(entry.posting_date)}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="max-w-xs">
                                                <div className="font-medium text-sm">{entry.account}</div>
                                                <div className="text-xs text-gray-400">{entry.account_currency}</div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm">{entry.against || '-'}</span>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm">{entry.voucher_type}</span>
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm font-medium">{entry.voucher_no}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {entry.debit > 0 ? (
                                                <span className="text-sm font-medium text-red-600">
                                                    {formatCurrency(entry.debit)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {entry.credit > 0 ? (
                                                <span className="text-sm font-medium text-green-600">
                                                    {formatCurrency(entry.credit)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm">{entry.cost_center}</span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                                entry.docstatus === 1 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {entry.docstatus === 1 ? 'Submitted' : 'Draft'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openDetailsModal(entry)}
                                                    className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 text-gray-400 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                                                    title="Delete"
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
                        totalItems={filteredEntries.length}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedEntry && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white border border-gray-100 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-semibold">GL Entry Details</h2>
                            <button
                                onClick={() => setShowDetailsModal(false)}
                                className="text-gray-400 hover:bg-gray-50 p-2 rounded-md transition-colors"
                            >
                                ×
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Basic Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Basic Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Entry ID:</span>
                                            <span className="font-medium">{selectedEntry.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Posting Date:</span>
                                            <span className="font-medium">{formatDate(selectedEntry.posting_date)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Fiscal Year:</span>
                                            <span className="font-medium">{selectedEntry.fiscal_year}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Company:</span>
                                            <span className="font-medium">{selectedEntry.company}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Branch:</span>
                                            <span className="font-medium">{selectedEntry.branch}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Cost Center:</span>
                                            <span className="font-medium">{selectedEntry.cost_center}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Account Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Account:</span>
                                            <span className="font-medium">{selectedEntry.account}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Account Currency:</span>
                                            <span className="font-medium">{selectedEntry.account_currency}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Against:</span>
                                            <span className="font-medium">{selectedEntry.against}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Remarks:</span>
                                            <span className="font-medium">{selectedEntry.remarks}</span>
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
                                            <span className="text-sm text-gray-400">Voucher No:</span>
                                            <span className="font-medium">{selectedEntry.voucher_no}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Voucher Subtype:</span>
                                            <span className="font-medium">{selectedEntry.voucher_subtype || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Transaction Currency:</span>
                                            <span className="font-medium">{selectedEntry.transaction_currency}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Exchange Rate:</span>
                                            <span className="font-medium">{selectedEntry.transaction_exchange_rate}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Amount Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Amount Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Debit:</span>
                                            <span className="font-medium text-red-600">
                                                {selectedEntry.debit > 0 ? formatCurrency(selectedEntry.debit) : '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Credit:</span>
                                            <span className="font-medium text-green-600">
                                                {selectedEntry.credit > 0 ? formatCurrency(selectedEntry.credit) : '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Debit (Account Currency):</span>
                                            <span className="font-medium">
                                                {selectedEntry.debit_in_account_currency > 0 ? formatCurrency(selectedEntry.debit_in_account_currency) : '-'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Credit (Account Currency):</span>
                                            <span className="font-medium">
                                                {selectedEntry.credit_in_account_currency > 0 ? formatCurrency(selectedEntry.credit_in_account_currency) : '-'}
                                            </span>
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

                                {/* Additional Information */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Additional Information</h3>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Is Opening:</span>
                                            <span className="font-medium">{selectedEntry.is_opening}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Is Advance:</span>
                                            <span className="font-medium">{selectedEntry.is_advance}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Is Cancelled:</span>
                                            <span className="font-medium">{selectedEntry.is_cancelled === 1 ? 'Yes' : 'No'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-400">Document Type:</span>
                                            <span className="font-medium">{selectedEntry.doctype}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GLEntryPage;