import { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Download, Info } from 'lucide-react';
import {
    getTaxConfig,
    updateVatRate,
    updateCateringLevy,
    updatePayrollBrackets,
    TaxConfigData,
    PayrollBracket
} from '../../lib/api/tax-config-api';

const TaxConfiguration = () => {
    const [activeTab, setActiveTab] = useState<'vat' | 'payroll' | 'catering' | 'history'>('vat');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<TaxConfigData | null>(null);

    // Modals state
    const [showVatModal, setShowVatModal] = useState(false);
    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [showCateringModal, setShowCateringModal] = useState(false);

    // Form inputs
    const [newRate, setNewRate] = useState<number | ''>('');
    const [newEffectiveDate, setNewEffectiveDate] = useState('');
    const [editingBrackets, setEditingBrackets] = useState<PayrollBracket[]>([]);

    useEffect(() => {
        fetchTaxConfig();
    }, []);

    const fetchTaxConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getTaxConfig();
            setData(result);
        } catch (err: any) {
            console.error('Tax Config fetch error:', err);
            setError(err?.message || 'Failed to load tax configuration.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString || dateString === '-') return '-';
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit', month: 'short', year: 'numeric'
        }).format(new Date(dateString));
    };

    const formatCurrency = (amount: number | null | undefined) => {
        if (amount === undefined || amount === null) return '-';
        if (amount === -1) return 'No limit'; // Custom convention for infinity
        return new Intl.NumberFormat('en-KE', { style: 'decimal', maximumFractionDigits: 2 }).format(amount);
    };

    const handleUpdateVatRate = async () => {
        if (!newRate || !newEffectiveDate) return;
        try {
            await updateVatRate(Number(newRate), newEffectiveDate);
            setShowVatModal(false);
            fetchTaxConfig();
        } catch (err: any) {
            alert(err.message || 'Failed to update VAT rate');
        }
    };

    const handleUpdateCateringLevy = async () => {
        if (!newRate || !newEffectiveDate) return;
        try {
            await updateCateringLevy(Number(newRate), newEffectiveDate);
            setShowCateringModal(false);
            fetchTaxConfig();
        } catch (err: any) {
            alert(err.message || 'Failed to update Catering Levy');
        }
    };

    const handleUpdatePayrollBrackets = async () => {
        try {
            await updatePayrollBrackets(editingBrackets);
            setShowPayrollModal(false);
            fetchTaxConfig();
        } catch (err: any) {
            alert(err.message || 'Failed to update Payroll Brackets');
        }
    };

    const openPayrollModal = () => {
        if (data?.payroll_brackets) {
            setEditingBrackets(JSON.parse(JSON.stringify(data.payroll_brackets)));
        }
        setShowPayrollModal(true);
    };

    const handleBracketChange = (index: number, field: keyof PayrollBracket, value: string) => {
        const updated = [...editingBrackets];
        const numValue = value ? Number(value) : (field === 'to_amount' && value === '' ? -1 : 0);
        updated[index] = { ...updated[index], [field]: numValue } as any;
        setEditingBrackets(updated);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Tax Configuration
            </h1>
            <p className="text-sm text-muted-foreground">
                Manage statutory tax rates, brackets, and compliance settings for Clic Restaurant
            </p>

            <div className="bg-card border border-border rounded-lg">
                <div className="flex border-b border-border text-sm overflow-x-auto">
                    {[
                        { id: 'vat', label: 'VAT', icon: '💲' },
                        { id: 'payroll', label: 'Payroll Taxes', icon: '👥' },
                        { id: 'catering', label: 'Catering Levy', icon: '🍽️' },
                        { id: 'history', label: 'History', icon: '⏱️' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`px-6 py-3 font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === tab.id
                                ? 'border-b-2 border-primary text-foreground'
                                : 'text-muted-foreground hover:bg-muted'
                                }`}
                            onClick={() => setActiveTab(tab.id as any)}
                        >
                            <span className="opacity-70">{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">Loading configuration...</div>
                    ) : error ? (
                        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                            <Info className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : (
                        <>
                            {/* --- VAT TAB --- */}
                            {activeTab === 'vat' && (
                                <div className="space-y-6">
                                    <div className="border border-border rounded-lg p-6 bg-card box-shadow-sm flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground mb-1">Current VAT Rate</h3>
                                            <p className="text-sm text-muted-foreground mb-4">Active VAT rate for all transactions</p>
                                            <div className="text-4xl font-bold">{data?.vat_rate ?? 0}%</div>
                                            <div className="text-sm text-muted-foreground mt-2">
                                                Effective from: {formatDate(data?.vat_effective_date || '')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setNewRate(data?.vat_rate || 0); setNewEffectiveDate(''); setShowVatModal(true); }}
                                            className="px-4 py-2 bg-yellow-400 text-yellow-900 font-medium rounded-md hover:bg-yellow-500 transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" /> Add New Rate
                                        </button>
                                    </div>

                                    <div className="border border-border rounded-lg bg-card">
                                        <div className="p-4 border-b border-border">
                                            <h3 className="font-semibold text-lg">All VAT Rates</h3>
                                            <p className="text-sm text-muted-foreground">Historical and scheduled VAT rates</p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-muted/30 border-b border-border">
                                                    <tr>
                                                        <th className="p-4 font-medium">Rate</th>
                                                        <th className="p-4 font-medium">Effective Date</th>
                                                        <th className="p-4 font-medium">End Date</th>
                                                        <th className="p-4 font-medium">Description</th>
                                                        <th className="p-4 font-medium">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data?.vat_history?.map((h, i) => (
                                                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                                                            <td className="p-4 font-semibold">{h.rate}%</td>
                                                            <td className="p-4">{formatDate(h.effective_date)}</td>
                                                            <td className="p-4">{formatDate(h.end_date)}</td>
                                                            <td className="p-4 text-muted-foreground">{h.description}</td>
                                                            <td className="p-4">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                    {h.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {(!data?.vat_history || data.vat_history.length === 0) && (
                                                        <tr><td colSpan={5} className="text-center p-6 text-muted-foreground">No VAT history found</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- PAYROLL TAXES TAB --- */}
                            {activeTab === 'payroll' && (
                                <div className="space-y-6">
                                    <div className="border border-border rounded-lg bg-card text-left text-sm">
                                        <div className="p-4 border-b border-border flex justify-between items-center">
                                            <div>
                                                <h3 className="text-lg font-semibold">PAYE Tax Brackets</h3>
                                                <p className="text-muted-foreground">Income tax brackets for employee payroll</p>
                                            </div>
                                            <button
                                                onClick={openPayrollModal}
                                                className="px-3 py-1.5 border border-border rounded-md hover:bg-muted flex items-center gap-2 font-medium"
                                            >
                                                <Edit className="h-4 w-4" /> Edit Brackets
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto p-4">
                                            <table className="w-full">
                                                <thead className="text-muted-foreground border-b border-border/50">
                                                    <tr>
                                                        <th className="text-left font-medium pb-2">From</th>
                                                        <th className="text-left font-medium pb-2">To</th>
                                                        <th className="text-left font-medium pb-2">Rate</th>
                                                        <th className="text-left font-medium pb-2">Effective Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {data?.payroll_brackets?.map((b, i) => (
                                                        <tr key={i} className="border-b border-border/30 last:border-0">
                                                            <td className="py-3 pr-4">{formatCurrency(b.from_amount)}</td>
                                                            <td className="py-3 pr-4">{formatCurrency(b.to_amount)}</td>
                                                            <td className="py-3 font-medium">{b.percent_deduction}%</td>
                                                            <td className="py-3 text-muted-foreground">{formatDate(b.effective_from)}</td>
                                                        </tr>
                                                    ))}
                                                    {(!data?.payroll_brackets || data.payroll_brackets.length === 0) && (
                                                        <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No defined brackets</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- CATERING LEVY TAB --- */}
                            {activeTab === 'catering' && (
                                <div className="space-y-6">
                                    <div className="border border-border rounded-lg p-6 bg-card flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground mb-1">Current Catering Training Levy</h3>
                                            <p className="text-sm text-muted-foreground mb-4">Kenya Tourism Fund levy on gross food and beverage sales</p>
                                            <div className="text-4xl font-bold">{data?.catering_levy ?? 0}%</div>
                                            <div className="text-sm text-muted-foreground mt-2">
                                                Effective from: {formatDate(data?.catering_effective_date || '')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setNewRate(data?.catering_levy || 0); setNewEffectiveDate(''); setShowCateringModal(true); }}
                                            className="px-4 py-2 bg-yellow-400 text-yellow-900 font-medium rounded-md hover:bg-yellow-500 transition-colors flex items-center gap-2"
                                        >
                                            <Plus className="h-4 w-4" /> Update Rate
                                        </button>
                                    </div>

                                    <div className="border border-border rounded-lg p-6 bg-card text-sm">
                                        <h3 className="font-semibold text-lg mb-2">About Catering Training Levy</h3>
                                        <p className="text-muted-foreground mb-3">
                                            The Catering Training Levy is a statutory contribution typically 2% of gross sales from food and beverages.
                                            This levy is used to fund training programs for the hospitality industry.
                                        </p>
                                        <p className="font-medium text-foreground">Compliance: Monthly remittance required by the 20th of the following month</p>
                                    </div>
                                </div>
                            )}

                            {/* --- HISTORY TAB --- */}
                            {activeTab === 'history' && (
                                <div className="border border-border rounded-lg bg-card">
                                    <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                        <div>
                                            <h3 className="font-semibold text-lg">Tax Rate Change History</h3>
                                            <p className="text-sm text-muted-foreground">Complete audit trail of all tax rate changes</p>
                                        </div>
                                        <button className="px-3 py-1.5 border border-border rounded-md hover:bg-muted font-medium text-sm flex items-center gap-2">
                                            <Download className="h-4 w-4" /> Export
                                        </button>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/30 border-b border-border">
                                                <tr>
                                                    <th className="p-4 font-medium">Tax Type</th>
                                                    <th className="p-4 font-medium">Category</th>
                                                    <th className="p-4 font-medium">Rate/Amount</th>
                                                    <th className="p-4 font-medium">Effective Date</th>
                                                    <th className="p-4 font-medium">End Date</th>
                                                    <th className="p-4 font-medium">Description</th>
                                                    <th className="p-4 font-medium">Status</th>
                                                    <th className="p-4 font-medium">Created</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data?.history?.map((h, i) => (
                                                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/10">
                                                        <td className="p-4 font-medium text-primary">{h.tax_type}</td>
                                                        <td className="p-4">{h.category}</td>
                                                        <td className="p-4 font-semibold">{h.rate}</td>
                                                        <td className="p-4 whitespace-nowrap">{formatDate(h.effective_date)}</td>
                                                        <td className="p-4 whitespace-nowrap">{formatDate(h.end_date)}</td>
                                                        <td className="p-4 text-muted-foreground">{h.description}</td>
                                                        <td className="p-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${h.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {h.status}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 whitespace-nowrap text-muted-foreground">{formatDate(h.created)}</td>
                                                    </tr>
                                                ))}
                                                {(!data?.history || data.history.length === 0) && (
                                                    <tr><td colSpan={8} className="text-center p-8 text-muted-foreground">No tax rate history found</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* --- MODALS --- */}
            {/* VAT Modal */}
            {showVatModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h3 className="font-semibold text-lg mb-4">Add New VAT Rate</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">New Rate (%)</label>
                                <input type="number" value={newRate} onChange={e => setNewRate(Number(e.target.value))} className="w-full p-2 border border-border rounded-md text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Effective Date</label>
                                <input type="date" value={newEffectiveDate} onChange={e => setNewEffectiveDate(e.target.value)} className="w-full p-2 border border-border rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 justify-end">
                            <button onClick={() => setShowVatModal(false)} className="px-4 py-2 border border-border rounded-md hover:bg-muted text-sm font-medium">Cancel</button>
                            <button onClick={handleUpdateVatRate} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 font-medium text-sm">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Catering Modal */}
            {showCateringModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-sm p-6">
                        <h3 className="font-semibold text-lg mb-4">Update Catering Levy</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">New Rate (%)</label>
                                <input type="number" value={newRate} onChange={e => setNewRate(Number(e.target.value))} className="w-full p-2 border border-border rounded-md text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Effective Date</label>
                                <input type="date" value={newEffectiveDate} onChange={e => setNewEffectiveDate(e.target.value)} className="w-full p-2 border border-border rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6 justify-end">
                            <button onClick={() => setShowCateringModal(false)} className="px-4 py-2 border border-border rounded-md hover:bg-muted text-sm font-medium">Cancel</button>
                            <button onClick={handleUpdateCateringLevy} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 font-medium text-sm">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payroll Modal */}
            {showPayrollModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="font-semibold text-lg mb-4">Edit PAYE Tax Brackets</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1 text-muted-foreground">Effective Date (For New History record usually)</label>
                            <input type="date" className="w-full max-w-sm p-2 border border-border rounded-md text-sm" />
                        </div>

                        <div className="space-y-4">
                            {editingBrackets.map((bracket, idx) => (
                                <div key={idx} className="grid grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Min Amount</label>
                                        <input type="number" value={bracket.from_amount} onChange={(e) => handleBracketChange(idx, 'from_amount', e.target.value)} className="w-full p-2 border border-border rounded-md text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Max Amount</label>
                                        <input type="number" value={bracket.to_amount === -1 ? '' : bracket.to_amount === null ? '' : bracket.to_amount} placeholder="No limit" onChange={(e) => handleBracketChange(idx, 'to_amount', e.target.value)} className="w-full p-2 border border-border rounded-md text-sm" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1">
                                            <label className="block text-xs text-muted-foreground mb-1">Rate (%)</label>
                                            <input type="number" value={bracket.percent_deduction} onChange={(e) => handleBracketChange(idx, 'percent_deduction', e.target.value)} className="w-full p-2 border border-border rounded-md text-sm" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3 mt-8 justify-end">
                            <button onClick={() => setShowPayrollModal(false)} className="px-4 py-2 border border-border rounded-md hover:bg-muted text-sm font-medium">Cancel</button>
                            <button onClick={handleUpdatePayrollBrackets} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500 font-medium text-sm">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxConfiguration;
