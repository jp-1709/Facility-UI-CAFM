import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Filter, Download, Upload, Folder, FolderOpen, Circle } from 'lucide-react';

interface ChartOfAccount {
    name: string;
    parent_account: string;
    account_name: string;
    account_type: string;
    root_type: string;
    is_group: boolean;
    company: string;
    disabled: boolean;
    freeze_account: string;
    account_currency: string;
    opening_balance: number;
    balance_must_be: string;
    tax_rate: number;
    allow_in_reconciliation: boolean;
    include_in_gst: boolean;
    gst_hsn_code: string;
    account_number: string;
    lft: number;
    rgt: number;
    old_parent: string;
    children?: ChartOfAccount[];
}

import {
  getChartAccounts,
  getAccountBalances,
  getExistingAccountCodes,
  getChartParentAccounts,
  getCompanies,
  createAccount,
  updateAccount,
  deleteAccount,
  Account,
  AccountFormData,
} from '../lib/api';

const ChartOfAccounts = () => {
    const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
    const [formData, setFormData] = useState<Partial<ChartOfAccount>>({});
    const [viewMode, setViewMode] = useState<'list' | 'tree'>('list');
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    // Fetch Chart of Accounts
    const fetchAccounts = async () => {
        try {
            setLoading(true);
            console.log('Fetching Chart of Accounts...');

            // Use only permitted fields - removed opening_balance
            const response = await fetch('/api/resource/Account?fields=["name","account_name","parent_account","account_type","root_type","is_group","company","disabled","account_currency","account_number"]&order_by=account_name asc&limit_page_length=500', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Accounts data:', data);

            if (data.data && Array.isArray(data.data)) {
                console.log(`Found ${data.data.length} accounts`);
                setAccounts(data.data);
            } else {
                console.log('No accounts data found, response:', data);
                setAccounts([]);
            }
        } catch (err) {
            console.error('Error fetching accounts:', err);
            setAccounts([]);
            alert('Failed to fetch Chart of Accounts. Please check console for details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Create/Update Account
    const handleSaveAccount = async () => {
        try {
            // Basic validation
            if (!formData.account_name) {
                alert('Account Name is required');
                return;
            }
            // if (!formData.parent_account) {
            //     alert('Parent Account is required');
            //     return;
            // }
            // if (!formData.account_type) {
            //     alert('Account Type is required');
            //     return;
            // }

            // Validate parent account company
            const parentAccount = accounts.find(acc => acc.name === formData.parent_account);
            if (parentAccount && parentAccount.company !== 'Quantbit Restro') {
                alert(`Parent account "${parentAccount.account_name}" belongs to company "${parentAccount.company}". Please select a parent account from Quantbit Restro.`);
                return;
            }

            const payload = {
                doctype: 'Account',
                account_name: formData.account_name,
                parent_account: formData.parent_account,
                account_type: formData.account_type,
                root_type: formData.root_type,
                is_group: formData.is_group || false,
                company: 'Quantbit Restro',
                disabled: formData.disabled || false,
                freeze_account: formData.freeze_account || 'No',
                account_currency: formData.account_currency || 'KES',
                balance_must_be: formData.balance_must_be || 'Debit',
                tax_rate: formData.tax_rate || 0,
                gst_hsn_code: formData.gst_hsn_code || '',
                account_number: formData.account_number || '',
                allow_in_reconciliation: formData.allow_in_reconciliation || false,
                include_in_gst: formData.include_in_gst || false
            };

            const url = editingAccount
                ? `/api/resource/Account/${editingAccount.name}`
                : '/api/resource/Account';

            const method = editingAccount ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': 'None'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                await fetchAccounts();
                setShowCreateModal(false);
                setEditingAccount(null);
                setFormData({});
                alert(editingAccount ? 'Account updated successfully!' : 'Account created successfully!');
            } else {
                const error = await response.json();
                console.error('Save error:', error);
                let errorMessage = 'Unknown error occurred';

                if (error.exc_type === 'ValidationError') {
                    errorMessage = error.exception || 'Validation error occurred';
                } else if (error.exc_type === 'DataError') {
                    errorMessage = error.exception || 'Data error occurred';
                } else if (error.message) {
                    errorMessage = error.message;
                }

                alert(`Error: ${errorMessage}`);
            }
        } catch (err) {
            console.error('Error saving account:', err);
            alert('An unexpected error occurred while saving the account.');
        }
    };

    // Delete Account
    const handleDeleteAccount = async (accountName: string) => {
        if (!confirm('Are you sure you want to delete this account? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/resource/Account/${accountName}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Frappe-CSRF-Token': 'token' // Add actual CSRF token
                }
            });

            if (response.ok) {
                await fetchAccounts();
                alert('Account deleted successfully!');
            } else {
                const error = await response.json();
                alert(`Error: ${error.exc_type || 'Cannot delete account'}`);
            }
        } catch (err) {
            console.error('Error deleting account:', err);
            alert('An unexpected error occurred');
        }
    };

    // Filter accounts
    const filteredAccounts = accounts.filter(account =>
        account.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.account_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Tree view helper functions
    const toggleNode = (nodeName: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeName)) {
            newExpanded.delete(nodeName);
        } else {
            newExpanded.add(nodeName);
        }
        setExpandedNodes(newExpanded);
    };

    const expandAll = () => {
        const allGroupAccounts = accounts.filter(acc => acc.is_group).map(acc => acc.name);
        setExpandedNodes(new Set(allGroupAccounts));
    };

    const collapseAll = () => {
        setExpandedNodes(new Set());
    };

    const buildTreeStructure = (accounts: ChartOfAccount[]): ChartOfAccount[] => {
        const accountMap = new Map<string, ChartOfAccount>();
        const rootAccounts: ChartOfAccount[] = [];

        // Create map of all accounts
        accounts.forEach(account => {
            accountMap.set(account.name, { ...account, children: [] });
        });

        // Build tree structure
        accounts.forEach(account => {
            const accountNode = accountMap.get(account.name)!;

            if (!account.parent_account || account.parent_account === '') {
                rootAccounts.push(accountNode);
            } else {
                const parent = accountMap.get(account.parent_account);
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(accountNode);
                }
            }
        });

        return rootAccounts;
    };

    const renderTreeNode = (account: ChartOfAccount, level: number = 0): React.ReactElement => {
        const isExpanded = expandedNodes.has(account.name);

        return (
            <div key={account.name} className="select-none">
                <div
                    className={`flex items-center py-1.5 px-3 hover:bg-muted/50 cursor-pointer transition-colors group ${selectedAccount === account.name ? 'bg-primary/5' : ''
                        }`}
                    style={{ paddingLeft: `${level * 24 + 12}px` }}
                    onClick={() => {
                        setSelectedAccount(account.name);
                        if (account.is_group) {
                            toggleNode(account.name);
                        }
                    }}
                >
                    {account.is_group ? (
                        isExpanded ? (
                            <FolderOpen className="w-4 h-4 mr-2 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        ) : (
                            <Folder className="w-4 h-4 mr-2 text-muted-foreground shrink-0" strokeWidth={1.5} />
                        )
                    ) : (
                        <Circle className="w-2 h-2 mr-3 ml-1 text-muted-foreground shrink-0" strokeWidth={2} />
                    )}

                    <div className="flex-1 flex items-center justify-between min-w-0">
                        <div className="flex items-center space-x-2 truncate pr-4">
                            <span className={`text-sm truncate ${account.disabled ? 'text-muted-foreground line-through' : 'text-foreground'
                                }`}>
                                {account.account_number ? `${account.account_number} - ` : ''}{account.account_name}
                            </span>
                        </div>

                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 bg-background/80 backdrop-blur-sm px-2 rounded">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(account);
                                }}
                                className="px-2 py-1 text-xs border border-border rounded hover:bg-muted transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAccount(account.name);
                                }}
                                className="px-2 py-1 text-xs border border-border rounded hover:bg-destructive/10 text-destructive transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>

                {Boolean(account.is_group) && isExpanded && account.children && (
                    <div>
                        {account.children.map((child: ChartOfAccount) => renderTreeNode(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Open edit modal
    const openEditModal = (account: ChartOfAccount) => {
        setEditingAccount(account);
        setFormData(account);
        setShowCreateModal(true);
    };

    // Open create modal
    const openCreateModal = () => {
        setEditingAccount(null);
        setFormData({
            is_group: false,
            disabled: false,
            freeze_account: 'No',
            balance_must_be: 'Debit',
            allow_in_reconciliation: true,
            include_in_gst: false,
            company: 'Quantbit Restro'
        });
        setShowCreateModal(true);
    };

    // Account types
    const accountTypes = [
        'Asset', 'Liability', 'Equity', 'Income', 'Expense', 'Asset Receivable',
        'Liability Payable', 'Bank', 'Cash', 'Stock', 'Tax', 'Fixed Asset'
    ];

    const rootTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

    return (
        <div className="p-6 bg-background">
            {/* Header */}
            <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Chart of Accounts</h1>
                        <p className="text-muted-foreground">Manage your company's chart of accounts</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-3 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                        >
                            <Filter className="h-4 w-4" />
                            Filter
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Add Account
                        </button>
                    </div>
                </div>

                {/* Search and View Toggle */}
                <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                }`}
                        >
                            List View
                        </button>
                        <button
                            onClick={() => setViewMode('tree')}
                            className={`px-3 py-2 rounded-md transition-colors ${viewMode === 'tree' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                                }`}
                        >
                            Tree View
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            {showFilters && (
                <div className="mb-4 p-4 border border-border rounded-md bg-muted/30">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Account Type</label>
                            <select className="w-full p-2 border border-border rounded-md">
                                <option value="">All Types</option>
                                {accountTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Root Type</label>
                            <select className="w-full p-2 border border-border rounded-md">
                                <option value="">All Root Types</option>
                                {rootTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Company</label>
                            <select className="w-full p-2 border border-border rounded-md">
                                <option value="Quantbit Restro">Quantbit Restro</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Accounts Display */}
            <div className="bg-card border border-border rounded-lg">
                {viewMode === 'list' ? (
                    <div className="overflow-x-auto" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="w-full sticky top-0">
                            <thead className="sticky top-0 bg-card border-b border-border z-10">
                                <tr className="border-b border-border">
                                    <th className="text-left p-3 font-medium text-sm bg-card">Account Name</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Account Code</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Account Type</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Root Type</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Is Group</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Currency</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Status</th>
                                    <th className="text-left p-3 font-medium text-sm bg-card">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="text-center p-8">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                            <p className="mt-2 text-muted-foreground">Loading accounts...</p>
                                        </td>
                                    </tr>
                                ) : filteredAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center p-8">
                                            <p className="text-muted-foreground">No accounts found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAccounts.map((account) => (
                                        <tr key={account.name} className="border-b border-border hover:bg-muted/30 transition-colors">
                                            <td className="p-3">
                                                <div>
                                                    <div className="font-medium">{account.account_name}</div>
                                                    <div className="text-sm text-muted-foreground">{account.name}</div>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm">{account.account_number || '-'}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm">{account.account_type || '-'}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm">{account.root_type}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${account.is_group ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {account.is_group ? 'Group' : 'Ledger'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className="text-sm">{account.account_currency || 'KES'}</span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${account.disabled ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {account.disabled ? 'Disabled' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => openEditModal(account)}
                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAccount(account.name)}
                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
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
                ) : (
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {loading ? (
                            <div className="text-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                <p className="mt-2 text-muted-foreground">Loading accounts...</p>
                            </div>
                        ) : filteredAccounts.length === 0 ? (
                            <div className="text-center p-8">
                                <p className="text-muted-foreground">No accounts found</p>
                            </div>
                        ) : (
                            <div>
                                {/* Tree View Controls */}
                                <div className="p-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-muted-foreground">
                                            {filteredAccounts.length} accounts • {filteredAccounts.filter(acc => acc.is_group).length} groups
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={expandAll}
                                                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                                            >
                                                Expand All
                                            </button>
                                            <button
                                                onClick={collapseAll}
                                                className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                                            >
                                                Collapse All
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Tree Content */}
                                <div className="p-4">
                                    {buildTreeStructure(filteredAccounts).map(account => renderTreeNode(account))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Account count indicator */}
                {!loading && filteredAccounts.length > 0 && (
                    <div className="border-t border-border p-3 bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                            Showing {filteredAccounts.length} of {accounts.length} accounts
                        </p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-border">
                            <h2 className="text-xl font-semibold">
                                {editingAccount ? 'Edit Account' : 'Create New Account'}
                            </h2>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Name *</label>
                                    <input
                                        type="text"
                                        value={formData.account_name || ''}
                                        onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={formData.account_number || ''}
                                        onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Parent Account *</label>
                                    <select
                                        value={formData.parent_account || ''}
                                        onChange={(e) => setFormData({ ...formData, parent_account: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    >
                                        <option value="">Select Parent Account</option>
                                        {accounts.filter(acc => acc.is_group && acc.company === 'Quantbit Restro').map(account => (
                                            <option key={account.name} value={account.name}>
                                                {account.account_name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Only accounts from Quantbit Restro company are shown
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Type *</label>
                                    <select
                                        value={formData.account_type || ''}
                                        onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        required
                                    >
                                        <option value="">Select Account Type</option>
                                        {accountTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Root Type</label>
                                    <select
                                        value={formData.root_type || ''}
                                        onChange={(e) => setFormData({ ...formData, root_type: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="">Select Root Type</option>
                                        {rootTypes.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Currency</label>
                                    <select
                                        value={formData.account_currency || 'INR'}
                                        onChange={(e) => setFormData({ ...formData, account_currency: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="INR">INR</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Opening Balance</label>
                                    <input
                                        type="number"
                                        value={formData.opening_balance || ''}
                                        onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Balance Must Be</label>
                                    <select
                                        value={formData.balance_must_be || 'Debit'}
                                        onChange={(e) => setFormData({ ...formData, balance_must_be: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="Debit">Debit</option>
                                        <option value="Credit">Credit</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.tax_rate || ''}
                                        onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">GST HSN Code</label>
                                    <input
                                        type="text"
                                        value={formData.gst_hsn_code || ''}
                                        onChange={(e) => setFormData({ ...formData, gst_hsn_code: e.target.value })}
                                        className="w-full p-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="is_group"
                                        checked={formData.is_group || false}
                                        onChange={(e) => setFormData({ ...formData, is_group: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="is_group" className="text-sm font-medium">Is Group Account</label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="disabled"
                                        checked={formData.disabled || false}
                                        onChange={(e) => setFormData({ ...formData, disabled: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="disabled" className="text-sm font-medium">Disabled</label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="allow_reconciliation"
                                        checked={formData.allow_in_reconciliation || false}
                                        onChange={(e) => setFormData({ ...formData, allow_in_reconciliation: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="allow_reconciliation" className="text-sm font-medium">Allow in Reconciliation</label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="include_gst"
                                        checked={formData.include_in_gst || false}
                                        onChange={(e) => setFormData({ ...formData, include_in_gst: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="include_gst" className="text-sm font-medium">Include in GST</label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-border">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAccount}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                {editingAccount ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChartOfAccounts;
