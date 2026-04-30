import React, { useState, useEffect } from 'react';
import { Search, Plus, Building, CreditCard, Eye, Filter, RefreshCw, AlertCircle, CheckCircle, X, Edit, Trash2, Save } from 'lucide-react';
import Pagination from '../components/Pagination';

interface BankAccount {
    name: string;
    account_name: string;
    account: string;
    bank_name: string;
    bank: string;
    bank_account_no: string;
    account_type: string;
    account_subtype: string;
    is_default: boolean;
    is_company_account: boolean;
    company: string;
    branch_code: string;
    disabled: boolean;
    parent_account: string;
    account_currency: string;
}

interface Bank {
    name: string;
    bank_name: string;
}

interface BankAccountType {
    name: string;
    account_type: string;
}

const BankAccountPage: React.FC = () => {
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [allBankAccounts, setAllBankAccounts] = useState<BankAccount[]>([]);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [accountTypes, setAccountTypes] = useState<BankAccountType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAllAccounts, setShowAllAccounts] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBank, setSelectedBank] = useState('');
    const [selectedAccountType, setSelectedAccountType] = useState('');
    const [showCompanyOnly, setShowCompanyOnly] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
    
    // Create/Edit states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [newAccount, setNewAccount] = useState({
        account_name: '',
        bank: '',
        account: '',
        bank_account_no: '',
        account_type: '',
        account_subtype: '',
        is_company_account: true,
        company: 'Quantbit Restro',
        branch_code: '',
        disabled: false
    });
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

    // Filter states
    const [filterBank, setFilterBank] = useState('');
    const [filterAccountType, setFilterAccountType] = useState('');
    const [filterCompanyOnly, setFilterCompanyOnly] = useState(true);

    // Fetch bank accounts
    const fetchBankAccounts = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const endpoint = showCompanyOnly 
                ? '/api/method/quantbit_ury_customization.ury_customization.get_bank_accounts'
                : '/api/method/quantbit_ury_customization.ury_customization.get_all_bank_accounts';
            
            const response = await fetch(endpoint, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch bank accounts');
            }
            
            const data = await response.json();
            const accounts = data.message || data;
            
            if (accounts && Array.isArray(accounts)) {
                if (showCompanyOnly) {
                    setBankAccounts(accounts);
                } else {
                    setAllBankAccounts(accounts);
                }
            } else {
                console.error('Invalid bank accounts data format:', data);
                if (showCompanyOnly) {
                    setBankAccounts([]);
                } else {
                    setAllBankAccounts([]);
                }
            }
            
            setLastUpdated(new Date());
            
        } catch (err) {
            console.error('Error fetching bank accounts:', err);
            setError('Failed to load bank accounts');
            if (showCompanyOnly) {
                setBankAccounts([]);
            } else {
                setAllBankAccounts([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Fetch banks
    const fetchBanks = async () => {
        try {
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_banks', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const banks = data.message || data;
                if (banks && Array.isArray(banks)) {
                    setBanks(banks);
                }
            }
        } catch (err) {
            console.error('Error fetching banks:', err);
        }
    };

    // Fetch account types
    const fetchAccountTypes = async () => {
        try {
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_bank_account_types', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const types = data.message || data;
                if (types && Array.isArray(types)) {
                    setAccountTypes(types);
                }
            }
        } catch (err) {
            console.error('Error fetching account types:', err);
        }
    };

    // Initialize data
    useEffect(() => {
        fetchBankAccounts();
        fetchBanks();
        fetchAccountTypes();
    }, [showCompanyOnly]);

    // Filter accounts
    const filteredAccounts = (showCompanyOnly ? bankAccounts : allBankAccounts).filter(account => {
        const matchesSearch = searchTerm === '' || 
            account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.bank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.bank_account_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
            account.account.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesBank = filterBank === '' || account.bank_name === filterBank;
        const matchesType = filterAccountType === '' || account.account_type === filterAccountType;
        const matchesCompany = !filterCompanyOnly || account.is_company_account;
        
        return matchesSearch && matchesBank && matchesType && matchesCompany;
    });

    // Get paginated accounts for display
    const paginatedAccounts = filteredAccounts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);

    // Reset to page 1 when filters or itemsPerPage change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, showCompanyOnly, filterBank, filterAccountType, itemsPerPage]);

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-KE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Open details modal
    const openDetailsModal = (account: BankAccount) => {
        setSelectedAccount(account);
        setShowDetailsModal(true);
    };

    // Close details modal
    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedAccount(null);
    };

    // Open create modal
    const openCreateModal = () => {
        setNewAccount({
            account_name: '',
            bank: '',
            account: '',
            bank_account_no: '',
            account_type: '',
            account_subtype: '',
            is_company_account: true,
            company: 'Quantbit Restro',
            branch_code: '',
            disabled: false
        });
        setShowCreateModal(true);
    };

    // Close create modal
    const closeCreateModal = () => {
        setShowCreateModal(false);
        setNewAccount({
            account_name: '',
            bank: '',
            account: '',
            bank_account_no: '',
            account_type: '',
            account_subtype: '',
            is_company_account: true,
            company: 'Quantbit Restro',
            branch_code: '',
            disabled: false
        });
    };

    // Open edit modal
    const openEditModal = (account: BankAccount) => {
        setEditingAccount(account);
        setShowEditModal(true);
    };

    // Close edit modal
    const closeEditModal = () => {
        setShowEditModal(false);
        setEditingAccount(null);
    };

    // Create new bank account
    const createBankAccount = async () => {
        try {
            setIsSubmitting(true);
            
            // Validate required fields
            if (!newAccount.account_name) {
                alert('Account Name is required');
                return;
            }
            
            if (!newAccount.bank) {
                alert('Bank is required');
                return;
            }
            
            if (!newAccount.account) {
                alert('Account is required');
                return;
            }
            
            // Create bank account
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.create_bank_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newAccount)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Bank Account created:', result);
                
                const data = result.message || result;
                
                if (data.success) {
                    // Reset form
                    closeCreateModal();
                    
                    // Refresh accounts
                    fetchBankAccounts();
                    
                    alert('Bank Account created successfully!');
                } else {
                    alert(`Failed to create bank account: ${data.error}`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.exc || 'Failed to create bank account';
                alert(`Error creating Bank Account: ${errorMsg}`);
            }
            
        } catch (err) {
            console.error('Error creating bank account:', err);
            alert('An unexpected error occurred while creating the Bank Account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update bank account
    const updateBankAccount = async () => {
        try {
            setIsSubmitting(true);
            
            if (!editingAccount) {
                alert('No account selected for editing');
                return;
            }
            
            // Validate required fields
            if (!editingAccount.account_name) {
                alert('Account Name is required');
                return;
            }
            
            if (!editingAccount.bank) {
                alert('Bank is required');
                return;
            }
            
            if (!editingAccount.account) {
                alert('Account is required');
                return;
            }
            
            // Update bank account
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.update_bank_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: editingAccount.name,
                    account_name: editingAccount.account_name,
                    bank: editingAccount.bank,
                    bank_account_no: editingAccount.bank_account_no,
                    account_type: editingAccount.account_type,
                    account_subtype: editingAccount.account_subtype,
                    is_company_account: editingAccount.is_company_account ? 1 : 0,
                    company: editingAccount.company,
                    branch_code: editingAccount.branch_code,
                    disabled: editingAccount.disabled ? 1 : 0
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Bank Account updated:', result);
                
                const data = result.message || result;
                
                if (data.success) {
                    // Reset form
                    closeEditModal();
                    
                    // Refresh accounts
                    fetchBankAccounts();
                    
                    alert('Bank Account updated successfully!');
                } else {
                    alert(`Failed to update bank account: ${data.error}`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.exc || 'Failed to update bank account';
                alert(`Error updating Bank Account: ${errorMsg}`);
            }
            
        } catch (err) {
            console.error('Error updating bank account:', err);
            alert('An unexpected error occurred while updating the Bank Account.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Delete bank account
    const deleteBankAccount = async (accountName: string) => {
        try {
            if (!confirm('Are you sure you want to delete this bank account? This action cannot be undone.')) {
                return;
            }
            
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.delete_bank_account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    bank_account_name: accountName
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                const data = result.message || result;
                
                if (data.success) {
                    // Refresh accounts
                    fetchBankAccounts();
                    
                    alert('Bank Account deleted successfully!');
                } else {
                    alert(`Failed to delete bank account: ${data.error}`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.exc || 'Failed to delete bank account';
                alert(`Error deleting Bank Account: ${errorMsg}`);
            }
            
        } catch (err) {
            console.error('Error deleting bank account:', err);
            alert('An unexpected error occurred while deleting the Bank Account.');
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bank Accounts</h1>
                    <p className="text-muted-foreground">Manage bank accounts and financial information</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Bank Account
                    </button>
                    <button
                        onClick={() => setShowCompanyOnly(!showCompanyOnly)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            showCompanyOnly 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        }`}
                    >
                        {showCompanyOnly ? 'Company Accounts' : 'All Accounts'}
                    </button>
                    <button
                        onClick={fetchBankAccounts}
                        className="p-2 hover:bg-muted rounded-md transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    
                    <select
                        value={filterBank}
                        onChange={(e) => setFilterBank(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">All Banks</option>
                        {banks.map(bank => (
                            <option key={bank.name} value={bank.bank_name}>
                                {bank.bank_name}
                            </option>
                        ))}
                    </select>
                    
                    <select
                        value={filterAccountType}
                        onChange={(e) => setFilterAccountType(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">All Account Types</option>
                        {accountTypes.map(type => (
                            <option key={type.name} value={type.account_type}>
                                {type.account_type}
                            </option>
                        ))}
                    </select>
                    
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="companyOnly"
                            checked={filterCompanyOnly}
                            onChange={(e) => setFilterCompanyOnly(e.target.checked)}
                            className="rounded border-border"
                        />
                        <label htmlFor="companyOnly" className="text-sm text-muted-foreground">
                            Company accounts only
                        </label>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-md">
                            <Building className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Accounts</p>
                            <p className="text-2xl font-bold">{filteredAccounts.length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-md">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Company Accounts</p>
                            <p className="text-2xl font-bold">
                                {filteredAccounts.filter(acc => acc.is_company_account).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-md">
                            <CreditCard className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Default Account</p>
                            <p className="text-2xl font-bold">
                                {filteredAccounts.filter(acc => acc.is_default).length}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-md">
                            <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Banks</p>
                            <p className="text-2xl font-bold">{banks.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Accounts Table */}
            <div className="bg-card rounded-lg border">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Bank Accounts</h2>
                </div>
                
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="ml-2 text-muted-foreground">Loading bank accounts...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center p-8">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                        <p className="text-muted-foreground">No bank accounts found</p>
                    </div>
                ) : (
                    <div>
                        <div className="border border-border rounded-lg overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-sm">Account Name</th>
                                        <th className="text-left p-3 font-medium text-sm">Bank</th>
                                        <th className="text-left p-3 font-medium text-sm">Account Number</th>
                                        <th className="text-left p-3 font-medium text-sm">Account Type</th>
                                        <th className="text-left p-3 font-medium text-sm">Currency</th>
                                        <th className="text-left p-3 font-medium text-sm">Company</th>
                                        <th className="text-left p-3 font-medium text-sm">Status</th>
                                        <th className="text-center p-3 font-medium text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedAccounts.map((account) => (
                                    <tr key={account.name} className="border-b border-border hover:bg-muted/30 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-sm">{account.account_name}</div>
                                            <div className="text-xs text-muted-foreground">{account.account}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-sm">{account.bank_name}</div>
                                            <div className="text-xs text-muted-foreground">{account.branch_code}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-mono text-sm">{account.bank_account_no}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-sm">{account.account_type}</div>
                                            {account.account_subtype && (
                                                <div className="text-xs text-muted-foreground">{account.account_subtype}</div>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <span className="text-sm font-medium">{account.account_currency}</span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {account.is_company_account ? (
                                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                        Company
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                                                        Personal
                                                    </span>
                                                )}
                                                {account.is_default && (
                                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                {account.disabled ? (
                                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                                        Disabled
                                                    </span>
                                                ) : (
                                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openDetailsModal(account)}
                                                    className="p-1 hover:bg-muted rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(account)}
                                                    className="p-1 hover:bg-muted rounded transition-colors"
                                                    title="Edit Account"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => deleteBankAccount(account.name)}
                                                    className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                                                    title="Delete Account"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
                                totalItems={filteredAccounts.length}
                                onItemsPerPageChange={setItemsPerPage}
                            />
                        )}
                    </div>
                )}
                
                {lastUpdated && (
                    <div className="p-4 border-t border-border text-xs text-muted-foreground">
                        Last updated: {lastUpdated.toLocaleString()}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedAccount && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Bank Account Details</h3>
                                <button
                                    onClick={closeDetailsModal}
                                    className="p-1 hover:bg-muted rounded-md transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Name</label>
                                    <p className="font-medium">{selectedAccount.account_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account ID</label>
                                    <p className="font-mono text-sm">{selectedAccount.account}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank Name</label>
                                    <p className="font-medium">{selectedAccount.bank_name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                                    <p className="font-mono text-sm">{selectedAccount.bank_account_no}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                                    <p className="font-medium">{selectedAccount.account_type}</p>
                                    {selectedAccount.account_subtype && (
                                        <p className="text-sm text-muted-foreground">{selectedAccount.account_subtype}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Currency</label>
                                    <p className="font-medium">{selectedAccount.account_currency}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                                    <p className="font-medium">{selectedAccount.company}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Branch Code</label>
                                    <p className="font-medium">{selectedAccount.branch_code}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Parent Account</label>
                                    <p className="font-medium">{selectedAccount.parent_account}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="flex items-center gap-2">
                                        {selectedAccount.disabled ? (
                                            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
                                                Disabled
                                            </span>
                                        ) : (
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                                Active
                                            </span>
                                        )}
                                        {selectedAccount.is_company_account && (
                                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                                Company Account
                                            </span>
                                        )}
                                        {selectedAccount.is_default && (
                                            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                                                Default Account
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Bank Account Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Create New Bank Account</h3>
                                <button
                                    onClick={closeCreateModal}
                                    className="p-1 hover:bg-muted rounded-md transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Name *</label>
                                    <input
                                        type="text"
                                        value={newAccount.account_name}
                                        onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank *</label>
                                    <select
                                        value={newAccount.bank}
                                        onChange={(e) => setNewAccount({...newAccount, bank: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select Bank</option>
                                        {banks.map(bank => (
                                            <option key={bank.name} value={bank.name}>
                                                {bank.bank_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account *</label>
                                    <select
                                        value={newAccount.account}
                                        onChange={(e) => setNewAccount({...newAccount, account: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select Account</option>
                                        <option value="Bank Account - QR">Bank Account - QR</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                                    <input
                                        type="text"
                                        value={newAccount.bank_account_no}
                                        onChange={(e) => setNewAccount({...newAccount, bank_account_no: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                                    <select
                                        value={newAccount.account_type}
                                        onChange={(e) => setNewAccount({...newAccount, account_type: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">Select Type</option>
                                        {accountTypes.map(type => (
                                            <option key={type.name} value={type.account_type}>
                                                {type.account_type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Subtype</label>
                                    <input
                                        type="text"
                                        value={newAccount.account_subtype}
                                        onChange={(e) => setNewAccount({...newAccount, account_subtype: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Branch Code</label>
                                    <input
                                        type="text"
                                        value={newAccount.branch_code}
                                        onChange={(e) => setNewAccount({...newAccount, branch_code: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="is_company_account"
                                                checked={newAccount.is_company_account}
                                                onChange={(e) => setNewAccount({...newAccount, is_company_account: e.target.checked})}
                                                className="rounded border-border"
                                            />
                                            <label htmlFor="is_company_account" className="text-sm text-muted-foreground">
                                                Company Account
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="disabled"
                                                checked={newAccount.disabled}
                                                onChange={(e) => setNewAccount({...newAccount, disabled: e.target.checked})}
                                                className="rounded border-border"
                                            />
                                            <label htmlFor="disabled" className="text-sm text-muted-foreground">
                                                Disabled
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-border flex justify-end gap-2">
                            <button
                                onClick={closeCreateModal}
                                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createBankAccount}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Bank Account Modal */}
            {showEditModal && editingAccount && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Edit Bank Account</h3>
                                <button
                                    onClick={closeEditModal}
                                    className="p-1 hover:bg-muted rounded-md transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Name *</label>
                                    <input
                                        type="text"
                                        value={editingAccount.account_name}
                                        onChange={(e) => setEditingAccount({...editingAccount, account_name: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank *</label>
                                    <select
                                        value={editingAccount.bank}
                                        onChange={(e) => setEditingAccount({...editingAccount, bank: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select Bank</option>
                                        {banks.map(bank => (
                                            <option key={bank.name} value={bank.name}>
                                                {bank.bank_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account *</label>
                                    <input
                                        type="text"
                                        value={editingAccount.account}
                                        onChange={(e) => setEditingAccount({...editingAccount, account: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                        disabled
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Number</label>
                                    <input
                                        type="text"
                                        value={editingAccount.bank_account_no}
                                        onChange={(e) => setEditingAccount({...editingAccount, bank_account_no: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                                    <select
                                        value={editingAccount.account_type}
                                        onChange={(e) => setEditingAccount({...editingAccount, account_type: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">Select Type</option>
                                        {accountTypes.map(type => (
                                            <option key={type.name} value={type.account_type}>
                                                {type.account_type}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Account Subtype</label>
                                    <input
                                        type="text"
                                        value={editingAccount.account_subtype}
                                        onChange={(e) => setEditingAccount({...editingAccount, account_subtype: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Branch Code</label>
                                    <input
                                        type="text"
                                        value={editingAccount.branch_code}
                                        onChange={(e) => setEditingAccount({...editingAccount, branch_code: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Company</label>
                                    <input
                                        type="text"
                                        value={editingAccount.company}
                                        onChange={(e) => setEditingAccount({...editingAccount, company: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="edit_is_company_account"
                                                checked={editingAccount.is_company_account}
                                                onChange={(e) => setEditingAccount({...editingAccount, is_company_account: e.target.checked})}
                                                className="rounded border-border"
                                            />
                                            <label htmlFor="edit_is_company_account" className="text-sm text-muted-foreground">
                                                Company Account
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="edit_disabled"
                                                checked={editingAccount.disabled}
                                                onChange={(e) => setEditingAccount({...editingAccount, disabled: e.target.checked})}
                                                className="rounded border-border"
                                            />
                                            <label htmlFor="edit_disabled" className="text-sm text-muted-foreground">
                                                Disabled
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-border flex justify-end gap-2">
                            <button
                                onClick={closeEditModal}
                                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={updateBankAccount}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Updating...' : 'Update Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankAccountPage;
