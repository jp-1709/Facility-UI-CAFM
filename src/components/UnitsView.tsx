import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Edit, Trash2, X
} from 'lucide-react';
import Pagination from './Pagination';

interface Unit {
    name: string;
    uom_name?: string;
    description?: string;
    enabled?: boolean;
    must_be_whole_number?: boolean;
    allow_fractional_quantities?: boolean;
}

interface UnitsViewProps {
    onNavigateBack: () => void;
}

const UnitsView: React.FC<UnitsViewProps> = ({ onNavigateBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Modals state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUnit, setNewUnit] = useState({
        name: '',
        uom_name: '',
        description: '',
        enabled: true,
        must_be_whole_number: false,
        allow_fractional_quantities: true
    });

    const [editUnit, setEditUnit] = useState<{
        name: string,
        uom_name: string,
        description: string,
        enabled: boolean,
        must_be_whole_number: boolean,
        allow_fractional_quantities: boolean
    } | null>(null);

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching units...');
            
            // Fetch from UOM doctype with only list-permitted fields
            // description and allow_fractional_quantities are NOT permitted in list queries
            const response = await fetch('/api/resource/UOM?fields=["name","uom_name","enabled","must_be_whole_number"]&limit=500');
            console.log('Units response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Units API Error:', errorText);
                throw new Error(`Failed to fetch units: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Units data:', data);
            const units = data.data || [];
            setUnits(units);
        } catch (err: any) {
            setError(err.message || 'Error loading units');
            console.error('Error in fetchUnits:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: newUnit.name,
                uom_name: newUnit.uom_name,
                description: newUnit.description,
                enabled: newUnit.enabled,
                must_be_whole_number: newUnit.must_be_whole_number,
                allow_fractional_quantities: newUnit.allow_fractional_quantities
            };

            const res = await fetch('/api/resource/UOM', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                let errMsg = errData.message || 'Failed to create unit';
                if (errData._server_messages) {
                    try {
                        const msgs = JSON.parse(errData._server_messages);
                        errMsg = JSON.parse(msgs[0]).message || errMsg;
                    } catch (e) { }
                }
                throw new Error(errMsg);
            }

            setShowAddModal(false);
            fetchUnits();
            setNewUnit({
                name: '',
                uom_name: '',
                description: '',
                enabled: true,
                must_be_whole_number: false,
                allow_fractional_quantities: true
            });
        } catch (err: any) {
            console.error(err);
            alert('Error creating unit: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (unitName: string) => {
        try {
            const response = await fetch(`/api/resource/UOM/${unitName}`);
            if (!response.ok) {
                throw new Error('Failed to fetch unit');
            }
            const data = await response.json();
            setEditUnit(data.data);
            setShowEditModal(true);
        } catch (err: any) {
            console.error('Error fetching unit for edit', err);
            alert('Could not fetch unit details.');
        }
    };

    const handleUpdateUnit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUnit) return;
        setIsSubmitting(true);

        try {
            const payload = {
                uom_name: editUnit.uom_name,
                description: editUnit.description,
                enabled: editUnit.enabled,
                must_be_whole_number: editUnit.must_be_whole_number,
                allow_fractional_quantities: editUnit.allow_fractional_quantities
            };

            const res = await fetch(`/api/resource/UOM/${editUnit.name}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                let errMsg = errData.message || 'Failed to update unit';
                if (errData._server_messages) {
                    try {
                        const msgs = JSON.parse(errData._server_messages);
                        errMsg = JSON.parse(msgs[0]).message || errMsg;
                    } catch (e) { }
                }
                throw new Error(errMsg);
            }

            setShowEditModal(false);
            fetchUnits();
        } catch (err: any) {
            console.error(err);
            alert('Error updating unit: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (unitName: string) => {
        if (!confirm(`Are you sure you want to delete ${unitName}?`)) return;
        try {
            const res = await fetch(`/api/resource/UOM/${unitName}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                const errData = await res.json();
                if (errData.exc_type === 'LinkExistsError') {
                    throw new Error(`Cannot delete ${unitName} because it is used in existing items. Please disable it instead.`);
                }
                let errMsg = errData.message || 'Failed to delete unit';
                if (errData._server_messages) {
                    try {
                        const msgs = JSON.parse(errData._server_messages);
                        errMsg = JSON.parse(msgs[0]).message || errMsg;
                    } catch (e) { }
                }
                throw new Error(errMsg);
            }
            fetchUnits();
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        }
    };

    const filteredUnits = units.filter((unit: any) => {
        const matchesSearch = unit.uom_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (unit.description && unit.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesCategory = selectedCategory === 'all' || 
            (selectedCategory === 'Weight' && ['g', 'kg', 'lb', 'oz'].includes(unit.name.toLowerCase())) ||
            (selectedCategory === 'Volume' && ['ml', 'l', 'gal', 'oz'].includes(unit.name.toLowerCase())) ||
            (selectedCategory === 'Count' && ['pcs', 'pairs', 'dozen', 'pack'].includes(unit.name.toLowerCase())) ||
            (selectedCategory === 'Custom' && !['g', 'kg', 'lb', 'oz', 'ml', 'l', 'gal', 'pcs', 'pairs', 'dozen', 'pack'].includes(unit.name.toLowerCase()));
        
        return matchesSearch && matchesCategory;
    });

    // Pagination logic
    const paginatedUnits = filteredUnits.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, itemsPerPage]);

    const getUnitCategory = (unitName: string): string => {
        const name = unitName.toLowerCase();
        if (['g', 'kg', 'lb', 'oz'].includes(name)) return 'Weight';
        if (['ml', 'l', 'gal'].includes(name)) return 'Volume';
        if (['pcs', 'pairs', 'dozen', 'pack'].includes(name)) return 'Count';
        return 'Custom';
    };

    return (
        <section className="flex-1 bg-background min-h-screen">
            <div className="border-b border-border bg-background sticky top-0 z-10">
                <div className="flex h-16 items-center px-6 justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onNavigateBack}
                            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                        >
                            ← Back to Stock Items
                        </button>
                        <h1 className="text-2xl font-semibold text-foreground">Units</h1>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-background">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-semibold leading-none tracking-tight">Units Manager</h3>
                                <p className="text-sm text-muted-foreground mt-1">Manage measurement units for inventory items</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Custom Unit
                                </button>
                                <button
                                    onClick={fetchUnits}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-9"
                                    placeholder="Search units..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[180px]"
                            >
                                <option value="all">All Categories</option>
                                <option value="Weight">Weight</option>
                                <option value="Volume">Volume</option>
                                <option value="Count">Count</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-6 pt-0">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : error ? (
                            <div className="text-center text-red-500 p-8">
                                {error}
                                <br />
                                <button onClick={fetchUnits} className="mt-4 text-sm text-blue-500 underline">Try Again</button>
                            </div>
                        ) : filteredUnits.length === 0 ? (
                            <div className="text-center text-muted-foreground p-8">No units found</div>
                        ) : (
                            <>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                    {paginatedUnits.map(unit => {
                                        const category = getUnitCategory(unit.name);
                                        return (
                                            <div key={unit.name} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                                                <div className="flex items-center gap-2">
                                                    <div>
                                                        <div className="font-medium">{unit.uom_name || unit.name}</div>
                                                        <div className="text-sm text-muted-foreground">Code: {unit.name}</div>
                                                        {unit.description && (
                                                            <div className="text-xs text-muted-foreground mt-1">{unit.description}</div>
                                                        )}
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {unit.must_be_whole_number && (
                                                                <span className="text-xs text-muted-foreground">• Whole numbers only</span>
                                                            )}
                                                            {unit.allow_fractional_quantities && (
                                                                <span className="text-xs text-muted-foreground">• Fractions allowed</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                            {category}
                                                        </div>
                                                        {unit.enabled ? (
                                                            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-800">
                                                                Active
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-red-100 text-red-800">
                                                                Disabled
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(unit.name)}
                                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(unit.name)}
                                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-6">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={setCurrentPage}
                                            itemsPerPage={itemsPerPage}
                                            totalItems={filteredUnits.length}
                                            onItemsPerPageChange={setItemsPerPage}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background border rounded-lg p-6 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Add New Unit</h2>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors rounded-sm opacity-70 ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleAddUnit}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="name">Unit Code *</label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={newUnit.name}
                                    onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                                    placeholder="e.g., kg, l, pcs"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="uom_name">Unit Name *</label>
                                <input
                                    id="uom_name"
                                    type="text"
                                    required
                                    value={newUnit.uom_name}
                                    onChange={(e) => setNewUnit({ ...newUnit, uom_name: e.target.value })}
                                    placeholder="e.g., Kilogram, Liter, Pieces"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    value={newUnit.description}
                                    onChange={(e) => setNewUnit({ ...newUnit, description: e.target.value })}
                                    placeholder="Optional description for this unit"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="must_be_whole_number"
                                    type="checkbox"
                                    checked={newUnit.must_be_whole_number}
                                    onChange={(e) => setNewUnit({ ...newUnit, must_be_whole_number: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="must_be_whole_number" className="text-sm font-medium leading-none">
                                    Must be whole numbers (no fractions)
                                </label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="allow_fractional_quantities"
                                    type="checkbox"
                                    checked={newUnit.allow_fractional_quantities}
                                    onChange={(e) => setNewUnit({ ...newUnit, allow_fractional_quantities: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="allow_fractional_quantities" className="text-sm font-medium leading-none">
                                    Allow fractional quantities
                                </label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="enabled"
                                    type="checkbox"
                                    checked={newUnit.enabled}
                                    onChange={(e) => setNewUnit({ ...newUnit, enabled: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="enabled" className="text-sm font-medium leading-none">
                                    Enable this unit for use
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                                >
                                    {isSubmitting ? 'Adding...' : 'Add Unit'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editUnit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background border rounded-lg p-6 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Edit Unit</h2>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors rounded-sm opacity-70 ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleUpdateUnit}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_name">Unit Code *</label>
                                <input
                                    id="edit_name"
                                    type="text"
                                    required
                                    value={editUnit.name}
                                    readOnly
                                    disabled
                                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-base ring-offset-background focus-visible:disabled:cursor-not-allowed disabled:opacity-50 text-muted-foreground md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_uom_name">Unit Name *</label>
                                <input
                                    id="edit_uom_name"
                                    type="text"
                                    required
                                    value={editUnit.uom_name}
                                    onChange={(e) => setEditUnit({ ...editUnit, uom_name: e.target.value })}
                                    placeholder="e.g., Kilogram, Liter, Pieces"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_description">Description</label>
                                <textarea
                                    id="edit_description"
                                    rows={3}
                                    value={editUnit.description || ''}
                                    onChange={(e) => setEditUnit({ ...editUnit, description: e.target.value })}
                                    placeholder="Optional description for this unit"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="edit_must_be_whole_number"
                                    type="checkbox"
                                    checked={editUnit.must_be_whole_number}
                                    onChange={(e) => setEditUnit({ ...editUnit, must_be_whole_number: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="edit_must_be_whole_number" className="text-sm font-medium leading-none">
                                    Must be whole numbers (no fractions)
                                </label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="edit_allow_fractional_quantities"
                                    type="checkbox"
                                    checked={editUnit.allow_fractional_quantities}
                                    onChange={(e) => setEditUnit({ ...editUnit, allow_fractional_quantities: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="edit_allow_fractional_quantities" className="text-sm font-medium leading-none">
                                    Allow fractional quantities
                                </label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="edit_enabled"
                                    type="checkbox"
                                    checked={editUnit.enabled}
                                    onChange={(e) => setEditUnit({ ...editUnit, enabled: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="edit_enabled" className="text-sm font-medium leading-none">
                                    Enable this unit for use
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default UnitsView;
