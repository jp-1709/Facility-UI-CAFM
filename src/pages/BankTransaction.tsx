import React, { useState, useEffect } from 'react';
import { Search, Plus, Building, CreditCard, Eye, Filter, RefreshCw, AlertCircle, CheckCircle, X, ArrowUpDown, Calendar, DollarSign, FileText, Trash2 } from 'lucide-react';
import Pagination from '../components/Pagination';

interface BankTransaction {
    name: string;
    date: string;
    status: string;
    bank_account: string;
    bank_account_name: string;
    bank_account_no: string;
    company: string;
    deposit: number;
    withdrawal: number;
    currency: string;
    description: string;
    reference_number: string;
    transaction_type: string;
    allocated_amount: number;
    unallocated_amount: number;
    party_type: string;
    party: string;
    bank_party_name: string;
    bank_party_account_number: string;
    docstatus: number;
    creation: string;
    modified: string;
    payment_entries_count: number;
}

interface TransactionPayment {
    name: string;
    payment_document: string;
    payment_entry: string;
    allocated_amount: number;
    clearance_date?: string;
}

interface PaymentDocument {
    doctype: string;
    label: string;
}

interface PaymentEntry {
    name: string;
    customer?: string;
    supplier?: string;
    party?: string;
    party_type?: string;
    grand_total?: number;
    outstanding_amount?: number;
    paid_amount?: number;
    unpaid_amount?: number;
    total_debit?: number;
    total_credit?: number;
    user_remark?: string;
    posting_date: string;
}

interface NewPaymentEntry {
    payment_document: string;
    payment_entry: string;
    allocated_amount: number;
}

interface Party {
    name: string;
    customer_name?: string;
    supplier_name?: string;
    employee_name?: string;
}

interface TransactionStatus {
    value: string;
    label: string;
}

const BankTransactionPage: React.FC = () => {
    const [transactions, setTransactions] = useState<BankTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedBankAccount, setSelectedBankAccount] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
    const [transactionPayments, setTransactionPayments] = useState<TransactionPayment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [statuses, setStatuses] = useState<TransactionStatus[]>([]);
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    
    // Create transaction states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTransaction, setNewTransaction] = useState({
        date: new Date().toISOString().split('T')[0],
        bank_account: '',
        company: 'Quantbit Restro',
        description: '',
        reference_number: '',
        transaction_type: '',
        party_type: '',
        party: '',
        bank_party_name: '',
        bank_party_account_number: '',
        currency: 'KES',
        deposit: 0,
        withdrawal: 0
    });
    
    // Payment entries states
    const [paymentDocuments, setPaymentDocuments] = useState<PaymentDocument[]>([]);
    const [availablePaymentEntries, setAvailablePaymentEntries] = useState<PaymentEntry[]>([]);
    const [newPaymentEntries, setNewPaymentEntries] = useState<NewPaymentEntry[]>([]);
    const [loadingPaymentEntries, setLoadingPaymentEntries] = useState(false);
    
    // Party names state
    const [partyNames, setPartyNames] = useState<Party[]>([]);
    const [loadingPartyNames, setLoadingPartyNames] = useState(false);

    // Fetch bank transactions
    const fetchBankTransactions = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_bank_transactions', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch bank transactions');
            }
            
            const data = await response.json();
            const txData = data.message || data;
            
            if (txData && Array.isArray(txData)) {
                setTransactions(txData);
            } else {
                console.error('Invalid bank transactions data format:', data);
                setTransactions([]);
            }
            
            setLastUpdated(new Date());
            
        } catch (err) {
            console.error('Error fetching bank transactions:', err);
            setError('Failed to load bank transactions');
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch transaction statuses
    const fetchTransactionStatuses = async () => {
        try {
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_bank_transaction_statuses', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const statusData = data.message || data;
                if (statusData && Array.isArray(statusData)) {
                    setStatuses(statusData);
                }
            }
        } catch (err) {
            console.error('Error fetching transaction statuses:', err);
        }
    };

    // Fetch transaction payments
    const fetchTransactionPayments = async (transactionName: string) => {
        try {
            setLoadingPayments(true);
            
            const response = await fetch(`/api/method/quantbit_ury_customization.ury_customization.get_bank_transaction_payments?transaction_name=${encodeURIComponent(transactionName)}`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const payments = data.message || data;
                if (payments && Array.isArray(payments)) {
                    setTransactionPayments(payments);
                }
            }
        } catch (err) {
            console.error('Error fetching transaction payments:', err);
            setTransactionPayments([]);
        } finally {
            setLoadingPayments(false);
        }
    };

    // Initialize data
    useEffect(() => {
        fetchBankTransactions();
        fetchTransactionStatuses();
    }, []);

    // Filter transactions
    const filteredTransactions = transactions.filter(transaction => {
        const matchesSearch = searchTerm === '' || 
            transaction.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
            transaction.bank_account_name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = selectedStatus === '' || transaction.status === selectedStatus;
        const matchesBankAccount = selectedBankAccount === '' || transaction.bank_account === selectedBankAccount;
        const matchesDate = dateFilter === '' || transaction.date === dateFilter;
        
        return matchesSearch && matchesStatus && matchesBankAccount && matchesDate;
    });

    // Get paginated transactions for display
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

    // Reset to page 1 when filters or itemsPerPage change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedStatus, selectedBankAccount, dateFilter, itemsPerPage]);

    // Format currency
    const formatCurrency = (amount: number, currency: string = 'KES') => {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: currency,
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

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Settled':
                return 'bg-green-100 text-green-800';
            case 'Submitted':
                return 'bg-blue-100 text-blue-800';
            case 'Draft':
                return 'bg-gray-100 text-gray-800';
            case 'Cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Open details modal
    const openDetailsModal = (transaction: BankTransaction) => {
        setSelectedTransaction(transaction);
        setShowDetailsModal(true);
        fetchTransactionPayments(transaction.name);
    };

    // Close details modal
    const closeDetailsModal = () => {
        setShowDetailsModal(false);
        setSelectedTransaction(null);
        setTransactionPayments([]);
    };

    // Open create modal
    const openCreateModal = () => {
        setNewTransaction({
            date: new Date().toISOString().split('T')[0],
            bank_account: '',
            company: 'Quantbit Restro',
            description: '',
            reference_number: '',
            transaction_type: '',
            party_type: '',
            party: '',
            bank_party_name: '',
            bank_party_account_number: '',
            currency: 'KES',
            deposit: 0,
            withdrawal: 0
        });
        setNewPaymentEntries([]);
        setAvailablePaymentEntries([]);
        setPartyNames([]);
        setShowCreateModal(true);
        fetchPaymentDocuments();
    };

    // Close create modal
    const closeCreateModal = () => {
        setShowCreateModal(false);
        setNewTransaction({
            date: new Date().toISOString().split('T')[0],
            bank_account: '',
            company: 'Quantbit Restro',
            description: '',
            reference_number: '',
            transaction_type: '',
            party_type: '',
            party: '',
            bank_party_name: '',
            bank_party_account_number: '',
            currency: 'KES',
            deposit: 0,
            withdrawal: 0
        });
    };

    // Create new bank transaction
    const createBankTransaction = async () => {
        try {
            setIsSubmitting(true);
            
            // Validate required fields
            if (!newTransaction.bank_account) {
                alert('Bank Account is required');
                return;
            }
            
            if (!newTransaction.date) {
                alert('Date is required');
                return;
            }
            
            // Validate financial amounts
            if (newTransaction.deposit === 0 && newTransaction.withdrawal === 0) {
                alert('Either Deposit or Withdrawal amount must be provided');
                return;
            }
            
            if (newTransaction.deposit > 0 && newTransaction.withdrawal > 0) {
                alert('Cannot have both Deposit and Withdrawal in the same transaction');
                return;
            }
            
            // Validate payment entries
            for (let i = 0; i < newPaymentEntries.length; i++) {
                const entry = newPaymentEntries[i];
                if (!entry.payment_document) {
                    alert(`Payment Entry ${i + 1}: Payment Document is required`);
                    return;
                }
                if (!entry.payment_entry) {
                    alert(`Payment Entry ${i + 1}: Payment Entry is required`);
                    return;
                }
                if (!entry.allocated_amount || entry.allocated_amount <= 0) {
                    alert(`Payment Entry ${i + 1}: Allocated Amount must be greater than 0`);
                    return;
                }
            }
            
            // Prepare transaction data with payment entries
            const transactionData = {
                ...newTransaction,
                payment_entries: newPaymentEntries
            };
            
            // Create bank transaction
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.create_bank_transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transactionData)
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('Bank Transaction created:', result);
                
                const data = result.message || result;
                
                if (data.success) {
                    // Reset form
                    closeCreateModal();
                    
                    // Refresh transactions
                    fetchBankTransactions();
                    
                    alert('Bank Transaction created successfully!');
                } else {
                    alert(`Failed to create bank transaction: ${data.error}`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.message || errorData.exc || 'Failed to create bank transaction';
                alert(`Error creating Bank Transaction: ${errorMsg}`);
            }
            
        } catch (err) {
            console.error('Error creating bank transaction:', err);
            alert('An unexpected error occurred while creating the Bank Transaction.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch payment documents
    const fetchPaymentDocuments = async () => {
        try {
            const response = await fetch('/api/method/quantbit_ury_customization.ury_customization.get_payment_documents', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const data = result.message || result;
                
                if (data.success) {
                    setPaymentDocuments(data.documents);
                }
            }
        } catch (err) {
            console.error('Error fetching payment documents:', err);
        }
    };

    // Fetch payment entries for document type
    const fetchPaymentEntriesForDocument = async (documentType: string) => {
        try {
            setLoadingPaymentEntries(true);
            
            const response = await fetch(`/api/method/quantbit_ury_customization.ury_customization.get_payment_entries_for_document?document_type=${encodeURIComponent(documentType)}`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const data = result.message || result;
                
                if (data.success) {
                    setAvailablePaymentEntries(data.entries);
                }
            }
        } catch (err) {
            console.error('Error fetching payment entries:', err);
            setAvailablePaymentEntries([]);
        } finally {
            setLoadingPaymentEntries(false);
        }
    };

    // Fetch party names for party type
    const fetchPartyNamesForType = async (partyType: string) => {
        try {
            setLoadingPartyNames(true);
            
            const response = await fetch(`/api/method/quantbit_ury_customization.ury_customization.get_party_names_for_type?party_type=${encodeURIComponent(partyType)}`, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                const data = result.message || result;
                
                if (data.success) {
                    setPartyNames(data.parties);
                }
            }
        } catch (err) {
            console.error('Error fetching party names:', err);
            setPartyNames([]);
        } finally {
            setLoadingPartyNames(false);
        }
    };

    // Add payment entry
    const addPaymentEntry = () => {
        const newEntry: NewPaymentEntry = {
            payment_document: '',
            payment_entry: '',
            allocated_amount: 0
        };
        setNewPaymentEntries([...newPaymentEntries, newEntry]);
    };

    // Update payment entry
    const updatePaymentEntry = (index: number, field: keyof NewPaymentEntry, value: string | number) => {
        const updated = [...newPaymentEntries];
        updated[index] = { ...updated[index], [field]: value };
        
        // If document type changed, fetch payment entries and clear payment entry
        if (field === 'payment_document') {
            updated[index].payment_entry = '';
            if (value) {
                fetchPaymentEntriesForDocument(value as string);
            } else {
                setAvailablePaymentEntries([]);
            }
        }
        
        setNewPaymentEntries(updated);
    };

    // Remove payment entry
    const removePaymentEntry = (index: number) => {
        const updated = newPaymentEntries.filter((_, i) => i !== index);
        setNewPaymentEntries(updated);
    };

    // Get unique bank accounts for filter
    const uniqueBankAccounts = Array.from(new Set(transactions.map(tx => tx.bank_account)))
        .map(account => {
            const tx = transactions.find(t => t.bank_account === account);
            return {
                account: account,
                name: tx?.bank_account_name || account
            };
        });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bank Transactions</h1>
                    <p className="text-muted-foreground">Manage and view bank transaction records</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Transaction
                    </button>
                    <button
                        onClick={fetchBankTransactions}
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
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>
                    
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map(status => (
                            <option key={status.value} value={status.value}>
                                {status.label}
                            </option>
                        ))}
                    </select>
                    
                    <select
                        value={selectedBankAccount}
                        onChange={(e) => setSelectedBankAccount(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="">All Bank Accounts</option>
                        {uniqueBankAccounts.map(account => (
                            <option key={account.account} value={account.account}>
                                {account.name}
                            </option>
                        ))}
                    </select>
                    
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-md">
                            <ArrowUpDown className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Transactions</p>
                            <p className="text-2xl font-bold">{filteredTransactions.length}</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-md">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Deposits</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + tx.deposit, 0))}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-md">
                            <DollarSign className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                            <p className="text-2xl font-bold text-red-600">
                                {formatCurrency(filteredTransactions.reduce((sum, tx) => sum + tx.withdrawal, 0))}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-card rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-md">
                            <CheckCircle className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Settled</p>
                            <p className="text-2xl font-bold">
                                {filteredTransactions.filter(tx => tx.status === 'Settled').length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Transactions Table */}
            <div className="bg-card rounded-lg border">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-semibold">Bank Transactions</h2>
                </div>
                
                {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="ml-2 text-muted-foreground">Loading bank transactions...</p>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center p-8">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <p className="text-red-500">{error}</p>
                    </div>
                ) : filteredTransactions.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                        <p className="text-muted-foreground">No bank transactions found</p>
                    </div>
                ) : (
                    <div>
                        <div className="border border-border rounded-lg overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="text-left p-3 font-medium text-sm">Transaction ID</th>
                                        <th className="text-left p-3 font-medium text-sm">Date</th>
                                        <th className="text-left p-3 font-medium text-sm">Bank Account</th>
                                        <th className="text-left p-3 font-medium text-sm">Description</th>
                                        <th className="text-right p-3 font-medium text-sm">Deposit</th>
                                        <th className="text-right p-3 font-medium text-sm">Withdrawal</th>
                                        <th className="text-left p-3 font-medium text-sm">Party</th>
                                        <th className="text-left p-3 font-medium text-sm">Status</th>
                                        <th className="text-center p-3 font-medium text-sm">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTransactions.map((transaction) => (
                                    <tr key={transaction.name} className="border-b border-border hover:bg-muted/30 transition-colors">
                                        <td className="p-3">
                                            <div className="font-medium text-sm">{transaction.name}</div>
                                            <div className="text-xs text-muted-foreground">{formatDate(transaction.creation)}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm">{formatDate(transaction.date)}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="font-medium text-sm">{transaction.bank_account_name}</div>
                                            <div className="text-xs text-muted-foreground">{transaction.bank_account_no}</div>
                                        </td>
                                        <td className="p-3">
                                            <div className="max-w-xs">
                                                <div className="font-medium text-sm">{transaction.description}</div>
                                                {transaction.reference_number && (
                                                    <div className="text-xs text-muted-foreground">Ref: {transaction.reference_number}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-right">
                                            {transaction.deposit > 0 ? (
                                                <span className="text-sm font-medium text-green-600">
                                                    {formatCurrency(transaction.deposit, transaction.currency)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {transaction.withdrawal > 0 ? (
                                                <span className="text-sm font-medium text-red-600">
                                                    {formatCurrency(transaction.withdrawal, transaction.currency)}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div>
                                                <div className="text-sm font-medium">{transaction.party}</div>
                                                <div className="text-xs text-muted-foreground">{transaction.party_type}</div>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-xs px-2 py-1 rounded ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => openDetailsModal(transaction)}
                                                    className="p-1 hover:bg-muted rounded transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {transaction.payment_entries_count > 0 && (
                                                    <div className="relative">
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                                                            {transaction.payment_entries_count}
                                                        </span>
                                                    </div>
                                                )}
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
                                totalItems={filteredTransactions.length}
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
            {showDetailsModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg border shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Bank Transaction Details</h3>
                                <button
                                    onClick={closeDetailsModal}
                                    className="p-1 hover:bg-muted rounded-md transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Transaction Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Transaction ID</label>
                                    <p className="font-mono text-sm">{selectedTransaction.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date</label>
                                    <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <div className="mt-1">
                                        <span className={`text-xs px-2 py-1 rounded ${getStatusColor(selectedTransaction.status)}`}>
                                            {selectedTransaction.status}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Transaction Type</label>
                                    <p className="font-medium">{selectedTransaction.transaction_type}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank Account</label>
                                    <p className="font-medium">{selectedTransaction.bank_account_name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedTransaction.bank_account_no}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Reference Number</label>
                                    <p className="font-mono text-sm">{selectedTransaction.reference_number}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Deposit</label>
                                    <p className="font-medium text-green-600">
                                        {selectedTransaction.deposit > 0 ? formatCurrency(selectedTransaction.deposit, selectedTransaction.currency) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Withdrawal</label>
                                    <p className="font-medium text-red-600">
                                        {selectedTransaction.withdrawal > 0 ? formatCurrency(selectedTransaction.withdrawal, selectedTransaction.currency) : '-'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Allocated Amount</label>
                                    <p className="font-medium">{formatCurrency(selectedTransaction.allocated_amount, selectedTransaction.currency)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Unallocated Amount</label>
                                    <p className="font-medium">{formatCurrency(selectedTransaction.unallocated_amount, selectedTransaction.currency)}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Party</label>
                                    <p className="font-medium">{selectedTransaction.party}</p>
                                    <p className="text-sm text-muted-foreground">{selectedTransaction.party_type}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank Party</label>
                                    <p className="font-medium">{selectedTransaction.bank_party_name}</p>
                                    <p className="text-sm text-muted-foreground">{selectedTransaction.bank_party_account_number}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Description</label>
                                <p className="font-medium">{selectedTransaction.description}</p>
                            </div>

                            {/* Payment Entries */}
                            <div>
                                <h4 className="text-md font-semibold mb-3">Payment Entries</h4>
                                {loadingPayments ? (
                                    <div className="flex items-center justify-center p-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                        <p className="ml-2 text-sm text-muted-foreground">Loading payment entries...</p>
                                    </div>
                                ) : transactionPayments.length === 0 ? (
                                    <div className="text-center p-4 text-muted-foreground">
                                        No payment entries found
                                    </div>
                                ) : (
                                    <div className="border border-border rounded-lg overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-muted/30">
                                                <tr>
                                                    <th className="text-left p-3 font-medium text-sm">Document Type</th>
                                                    <th className="text-left p-3 font-medium text-sm">Payment Entry</th>
                                                    <th className="text-right p-3 font-medium text-sm">Allocated Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {transactionPayments.map((payment) => (
                                                    <tr key={payment.name} className="border-b border-border">
                                                        <td className="p-3">
                                                            <span className="text-sm font-medium">{payment.payment_document}</span>
                                                        </td>
                                                        <td className="p-3">
                                                            <span className="font-mono text-sm">{payment.payment_entry}</span>
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <span className="text-sm font-medium">
                                                                {formatCurrency(payment.allocated_amount, selectedTransaction.currency)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Bank Transaction Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Create New Bank Transaction</h3>
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
                                    <label className="text-sm font-medium text-muted-foreground">Date *</label>
                                    <input
                                        type="date"
                                        value={newTransaction.date}
                                        onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank Account *</label>
                                    <select
                                        value={newTransaction.bank_account}
                                        onChange={(e) => setNewTransaction({...newTransaction, bank_account: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        required
                                    >
                                        <option value="">Select Bank Account</option>
                                        {uniqueBankAccounts.map(account => (
                                            <option key={account.account} value={account.account}>
                                                {account.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Transaction Type</label>
                                    <input
                                        type="text"
                                        value={newTransaction.transaction_type}
                                        onChange={(e) => setNewTransaction({...newTransaction, transaction_type: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="e.g., Cash Deposit, ATM Withdrawal"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Reference Number</label>
                                    <input
                                        type="text"
                                        value={newTransaction.reference_number}
                                        onChange={(e) => setNewTransaction({...newTransaction, reference_number: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Check number, receipt number, etc."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Deposit Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newTransaction.deposit || ''}
                                        onChange={(e) => setNewTransaction({...newTransaction, deposit: parseFloat(e.target.value) || 0, withdrawal: 0})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Withdrawal Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newTransaction.withdrawal || ''}
                                        onChange={(e) => setNewTransaction({...newTransaction, withdrawal: parseFloat(e.target.value) || 0, deposit: 0})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Party Type</label>
                                    <select
                                        value={newTransaction.party_type}
                                        onChange={(e) => {
                                            setNewTransaction({...newTransaction, party_type: e.target.value, party: ''});
                                            if (e.target.value) {
                                                fetchPartyNamesForType(e.target.value);
                                            } else {
                                                setPartyNames([]);
                                            }
                                        }}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="">None</option>
                                        <option value="Customer">Customer</option>
                                        <option value="Supplier">Supplier</option>
                                        <option value="Employee">Employee</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Party Name</label>
                                    {newTransaction.party_type && newTransaction.party_type !== 'Other' ? (
                                        <select
                                            value={newTransaction.party}
                                            onChange={(e) => setNewTransaction({...newTransaction, party: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            disabled={loadingPartyNames}
                                        >
                                            <option value="">Select Party</option>
                                            {partyNames.map(party => (
                                                <option key={party.name} value={party.name}>
                                                    {party.customer_name || party.supplier_name || party.employee_name || party.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            value={newTransaction.party}
                                            onChange={(e) => setNewTransaction({...newTransaction, party: e.target.value})}
                                            className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                            placeholder="Party name"
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank Party Name</label>
                                    <input
                                        type="text"
                                        value={newTransaction.bank_party_name}
                                        onChange={(e) => setNewTransaction({...newTransaction, bank_party_name: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Bank party name"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Bank Party Account Number</label>
                                    <input
                                        type="text"
                                        value={newTransaction.bank_party_account_number}
                                        onChange={(e) => setNewTransaction({...newTransaction, bank_party_account_number: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Bank party account number"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                                    <textarea
                                        value={newTransaction.description}
                                        onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                                        className="w-full mt-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        rows={3}
                                        placeholder="Transaction description"
                                    />
                                </div>
                            </div>
                            
                            {/* Payment Entries Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-medium text-foreground">Payment Entries</h4>
                                    <button
                                        type="button"
                                        onClick={addPaymentEntry}
                                        className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Add Payment Entry
                                    </button>
                                </div>
                                
                                {newPaymentEntries.length > 0 && (
                                    <div className="space-y-2">
                                        {newPaymentEntries.map((entry, index) => (
                                            <div key={index} className="grid grid-cols-4 gap-2 p-3 border border-border rounded-md">
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Payment Document</label>
                                                    <select
                                                        value={entry.payment_document}
                                                        onChange={(e) => updatePaymentEntry(index, 'payment_document', e.target.value)}
                                                        className="w-full mt-1 px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    >
                                                        <option value="">Select Document</option>
                                                        {paymentDocuments.map(doc => (
                                                            <option key={doc.doctype} value={doc.doctype}>
                                                                {doc.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Payment Entry</label>
                                                    <select
                                                        value={entry.payment_entry}
                                                        onChange={(e) => updatePaymentEntry(index, 'payment_entry', e.target.value)}
                                                        className="w-full mt-1 px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                        disabled={!entry.payment_document || loadingPaymentEntries}
                                                    >
                                                        <option value="">Select Entry</option>
                                                        {availablePaymentEntries.map(payment => (
                                                            <option key={payment.name} value={payment.name}>
                                                                {payment.name} - {
                                                                    payment.customer || payment.supplier || payment.party || 'N/A'
                                                                } ({payment.posting_date})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div>
                                                    <label className="text-xs font-medium text-muted-foreground">Allocated Amount</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={entry.allocated_amount || ''}
                                                        onChange={(e) => updatePaymentEntry(index, 'allocated_amount', parseFloat(e.target.value) || 0)}
                                                        className="w-full mt-1 px-2 py-1 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePaymentEntry(index)}
                                                        className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
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
                                onClick={createBankTransaction}
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isSubmitting ? 'Creating...' : 'Create Transaction'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankTransactionPage;
