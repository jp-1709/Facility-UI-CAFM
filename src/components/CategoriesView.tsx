import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Edit, Trash2, X
} from 'lucide-react';
import Pagination from './Pagination';

interface Category {
    name: string;
    item_group_name: string;
    description?: string;
    parent_item_group?: string;
    is_group?: boolean;
    lft?: number;
    rgt?: number;
    old_parent?: string;
}

interface CategoriesViewProps {
    onNavigateBack: () => void;
}

const CategoriesView: React.FC<CategoriesViewProps> = ({ onNavigateBack }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [categoryItemCounts, setCategoryItemCounts] = useState<{ [key: string]: number }>({});
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);

    // Modals state
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newCategory, setNewCategory] = useState({
        name: '',
        item_group_name: '',
        description: '',
        parent_item_group: '',
        is_group: false
    });

    const [editCategory, setEditCategory] = useState<{
        name: string,
        item_group_name: string,
        description: string,
        parent_item_group: string,
        is_group: boolean
    } | null>(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching categories...');
            
            // Fetch from Item Group doctype with only list-permitted fields
            // description, lft, rgt, old_parent are NOT permitted in list queries
            const response = await fetch('/api/resource/Item Group?fields=["name","item_group_name","parent_item_group","is_group"]&limit=500');
            console.log('Categories response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Categories API Error:', errorText);
                throw new Error(`Failed to fetch categories: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Categories data:', data);
            const categories = data.data || [];
            setCategories(categories);
            
            // Fetch item counts for each category
            const itemCounts: { [key: string]: number } = {};
            await Promise.all(categories.map(async (category: any) => {
                try {
                    const itemResponse = await fetch(`/api/resource/Item?filters=[["item_group","=","${category.name}"]]&fields=["name"]&limit=100`);
                    if (itemResponse.ok) {
                        const itemData = await itemResponse.json();
                        itemCounts[category.name] = itemData.data?.length || 0;
                    }
                } catch (e) {
                    itemCounts[category.name] = 0;
                }
            }));
            setCategoryItemCounts(itemCounts);
        } catch (err: any) {
            setError(err.message || 'Error loading categories');
            console.error('Error in fetchCategories:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                name: newCategory.name,
                item_group_name: newCategory.item_group_name,
                description: newCategory.description,
                parent_item_group: newCategory.parent_item_group || undefined,
                is_group: newCategory.is_group
            };

            const res = await fetch('/api/resource/Item Group', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                let errMsg = errData.message || 'Failed to create category';
                if (errData._server_messages) {
                    try {
                        const msgs = JSON.parse(errData._server_messages);
                        errMsg = JSON.parse(msgs[0]).message || errMsg;
                    } catch (e) { }
                }
                throw new Error(errMsg);
            }

            setShowAddModal(false);
            fetchCategories();
            setNewCategory({
                name: '',
                item_group_name: '',
                description: '',
                parent_item_group: '',
                is_group: false
            });
        } catch (err: any) {
            console.error(err);
            alert('Error creating category: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (categoryName: string) => {
        try {
            const response = await fetch(`/api/resource/Item Group/${categoryName}`);
            if (!response.ok) {
                throw new Error('Failed to fetch category');
            }
            const data = await response.json();
            setEditCategory(data.data);
            setShowEditModal(true);
        } catch (err: any) {
            console.error('Error fetching category for edit', err);
            alert('Could not fetch category details.');
        }
    };

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editCategory) return;
        setIsSubmitting(true);

        try {
            const payload = {
                item_group_name: editCategory.item_group_name,
                description: editCategory.description,
                parent_item_group: editCategory.parent_item_group || undefined,
                is_group: editCategory.is_group
            };

            const res = await fetch(`/api/resource/Item Group/${editCategory.name}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json();
                let errMsg = errData.message || 'Failed to update category';
                if (errData._server_messages) {
                    try {
                        const msgs = JSON.parse(errData._server_messages);
                        errMsg = JSON.parse(msgs[0]).message || errMsg;
                    } catch (e) { }
                }
                throw new Error(errMsg);
            }

            setShowEditModal(false);
            fetchCategories();
        } catch (err: any) {
            console.error(err);
            alert('Error updating category: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (categoryName: string) => {
        if (!confirm(`Are you sure you want to delete ${categoryName}?`)) return;
        try {
            const res = await fetch(`/api/resource/Item Group/${categoryName}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });
            if (!res.ok) {
                const errData = await res.json();
                if (errData.exc_type === 'LinkExistsError') {
                    throw new Error(`Cannot delete ${categoryName} because it has existing items or sub-categories. Please disable it instead.`);
                }
                let errMsg = errData.message || 'Failed to delete category';
                if (errData._server_messages) {
                    try {
                        const msgs = JSON.parse(errData._server_messages);
                        errMsg = JSON.parse(msgs[0]).message || errMsg;
                    } catch (e) { }
                }
                throw new Error(errMsg);
            }
            fetchCategories();
        } catch (e: any) {
            console.error(e);
            alert(e.message);
        }
    };

    const filteredCategories = categories.filter((category: any) => {
        const matchesSearch = category.item_group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (category.description && category.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    // Pagination logic
    const paginatedCategories = filteredCategories.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, itemsPerPage]);

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
                        <h1 className="text-2xl font-semibold text-foreground">Categories</h1>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-background">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-semibold leading-none tracking-tight">Item Categories</h3>
                                <p className="text-sm text-muted-foreground mt-1">Manage inventory item categories to organize your stock</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 flex items-center gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Category
                                </button>
                                <button
                                    onClick={fetchCategories}
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
                                    placeholder="Search categories..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
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
                                <button onClick={fetchCategories} className="mt-4 text-sm text-blue-500 underline">Try Again</button>
                            </div>
                        ) : filteredCategories.length === 0 ? (
                            <div className="text-center text-muted-foreground p-8">No categories found</div>
                        ) : (
                            <>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                    {paginatedCategories.map(category => (
                                        <div key={category.name} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <h3 className="font-medium">{category.item_group_name || category.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{category.description || 'No description available'}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground">
                                                                {categoryItemCounts[category.name] || 0} items
                                                            </span>
                                                            {category.parent_item_group && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    • Parent: {category.parent_item_group}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                                            {category.is_group ? 'Group' : 'Category'}
                                                        </div>
                                                        {category.is_group && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Can have sub-categories
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(category.name)}
                                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.name)}
                                                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="mt-6">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={setCurrentPage}
                                            itemsPerPage={itemsPerPage}
                                            totalItems={filteredCategories.length}
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
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Add New Category</h2>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors rounded-sm opacity-70 ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleAddCategory}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="name">Category Name *</label>
                                <input
                                    id="name"
                                    type="text"
                                    required
                                    value={newCategory.name}
                                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                    placeholder="e.g., Beverages, Dry Goods, Frozen Items"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="display_name">Display Name</label>
                                <input
                                    id="display_name"
                                    type="text"
                                    value={newCategory.item_group_name}
                                    onChange={(e) => setNewCategory({ ...newCategory, item_group_name: e.target.value })}
                                    placeholder="Display name for this category"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    rows={3}
                                    value={newCategory.description}
                                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                                    placeholder="Optional description for this category"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="parent">Parent Category</label>
                                <select
                                    id="parent"
                                    value={newCategory.parent_item_group}
                                    onChange={(e) => setNewCategory({ ...newCategory, parent_item_group: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">None (Root Category)</option>
                                    {categories.filter(c => !c.parent_item_group).map(c => (
                                        <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="is_group"
                                    type="checkbox"
                                    checked={newCategory.is_group}
                                    onChange={(e) => setNewCategory({ ...newCategory, is_group: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="is_group" className="text-sm font-medium leading-none">
                                    This is a group category (can have sub-categories)
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
                                    {isSubmitting ? 'Adding...' : 'Add Category'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editCategory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-background border rounded-lg p-6 shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold leading-none tracking-tight">Edit Category</h2>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors rounded-sm opacity-70 ring-offset-background hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>

                        <form className="space-y-4" onSubmit={handleUpdateCategory}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_name">Category Name *</label>
                                <input
                                    id="edit_name"
                                    type="text"
                                    required
                                    value={editCategory.name}
                                    readOnly
                                    disabled
                                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-base ring-offset-background focus-visible:disabled:cursor-not-allowed disabled:opacity-50 text-muted-foreground md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_display_name">Display Name</label>
                                <input
                                    id="edit_display_name"
                                    type="text"
                                    value={editCategory.item_group_name}
                                    onChange={(e) => setEditCategory({ ...editCategory, item_group_name: e.target.value })}
                                    placeholder="Display name for this category"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_description">Description</label>
                                <textarea
                                    id="edit_description"
                                    rows={3}
                                    value={editCategory.description || ''}
                                    onChange={(e) => setEditCategory({ ...editCategory, description: e.target.value })}
                                    placeholder="Optional description for this category"
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none" htmlFor="edit_parent">Parent Category</label>
                                <select
                                    id="edit_parent"
                                    value={editCategory.parent_item_group || ''}
                                    onChange={(e) => setEditCategory({ ...editCategory, parent_item_group: e.target.value })}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">None (Root Category)</option>
                                    {categories.filter(c => !c.parent_item_group && c.name !== editCategory.name).map(c => (
                                        <option key={c.name} value={c.name}>{c.item_group_name || c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    id="edit_is_group"
                                    type="checkbox"
                                    checked={editCategory.is_group}
                                    onChange={(e) => setEditCategory({ ...editCategory, is_group: e.target.checked })}
                                    className="h-4 w-4 rounded border border-input bg-background text-primary focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                />
                                <label htmlFor="edit_is_group" className="text-sm font-medium leading-none">
                                    This is a group category (can have sub-categories)
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

export default CategoriesView;
