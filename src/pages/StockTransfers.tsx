import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Eye, Package, ArrowUpDown, Plus, Edit2, X, PlusCircle, MinusCircle, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../components/Pagination';

// Types
interface StockEntry {
  name: string;
  stock_entry_type: string;
  posting_date: string;
  posting_time: string;
  company: string;
  from_warehouse: string;
  to_warehouse: string;
  total_amount: number;
  items: StockEntryItem[];
  // Status will be determined based on docstatus (0=Draft, 1=Submitted, 2=Cancelled)
  docstatus?: number;
  // total_qty will be calculated from items array
  // remark field not available in API query
}

interface StockEntryItem {
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  from_warehouse?: string;
  to_warehouse?: string;
  basic_rate: number;
  amount: number;
}

interface NewTransferItem {
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  basic_rate: number;
  amount: number;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

interface Item {
  name: string;
  item_code: string;
  item_name: string;
  stock_uom: string;
  valuation_rate: number;
}

// Frappe helpers
const getCsrfToken = (): string => {
  if (typeof window !== 'undefined') {
    const f = (window as any).frappe;
    if (f?.csrf_token && f.csrf_token !== 'Guest') return f.csrf_token;
  }
  const m = document.cookie.match(/(?:^|;\s*)X-Frappe-CSRF-Token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
};

const erpFetch = async (url: string, options?: RequestInit) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Frappe-CSRF-Token': getCsrfToken(),
    ...options?.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
};

const StockTransfers: React.FC = () => {
  const navigate = useNavigate();
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<StockEntry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Filter entries
  const filteredEntries = stockEntries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.from_warehouse?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.to_warehouse.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || getStatusFromDocstatus(entry.docstatus) === statusFilter;
    const matchesWarehouse = warehouseFilter === '' || 
      entry.from_warehouse === warehouseFilter || 
      entry.to_warehouse === warehouseFilter;

    return matchesSearch && matchesStatus && matchesWarehouse;
  });
  
  // Pagination logic
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  
  // New transfer modal state
  const [showNewTransferModal, setShowNewTransferModal] = useState(false);
  const [newTransfer, setNewTransfer] = useState({
    remark: '',
    from_warehouse: '',
    to_warehouse: '',
    posting_date: new Date().toISOString().split('T')[0],
    posting_time: new Date().toTimeString().slice(0, 5)
  });
  const [transferItems, setTransferItems] = useState<NewTransferItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);

  // Button constants for consistent blue theme
  const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2';
  const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2';

  // Fetch stock entries with Material Transfer type
  const fetchStockEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching stock entries...');
      
      // Use Frappe API method to get complete data with child tables
      const response = await erpFetch('/api/method/frappe.client.get_list?doctype=Stock Entry&fields=["name","stock_entry_type","posting_date","posting_time","company","from_warehouse","to_warehouse","total_amount","docstatus"]&filters=[["stock_entry_type","=","Material Transfer"]]&order_by=posting_date desc&limit=20');
      
      console.log('Material Transfer response:', response);

      if (response.message && Array.isArray(response.message)) {
        console.log(`Found ${response.message.length} Material Transfer entries`);
        
        // Fetch complete Stock Entry documents with items using get_doc
        const entriesWithItems = await Promise.all(
          response.message.map(async (entry: StockEntry) => {
            try {
              const docResponse = await erpFetch(`/api/resource/Stock%20Entry/${entry.name}?fields=["*"]`);
              console.log(`Complete document for ${entry.name}:`, docResponse);
              return {
                ...entry,
                items: docResponse.data?.items || []
              };
            } catch (itemErr) {
              console.error(`Error fetching complete document for ${entry.name}:`, itemErr);
              return {
                ...entry,
                items: []
              };
            }
          })
        );
        
        setStockEntries(entriesWithItems);
        
        // If no Material Transfer entries found, show all entries for debugging
        if (response.message.length === 0) {
          console.log('No Material Transfer entries found. Showing all Stock Entries for debugging...');
          const allEntriesResponse = await erpFetch('/api/method/frappe.client.get_list?doctype=Stock Entry&fields=["name","stock_entry_type","posting_date","posting_time","company","from_warehouse","to_warehouse","total_amount","docstatus"]&order_by=posting_date desc&limit=20');
          console.log('All Stock Entries:', allEntriesResponse);
          if (allEntriesResponse.message && Array.isArray(allEntriesResponse.message)) {
            console.log(`Found ${allEntriesResponse.message.length} total Stock Entries`);
            const materialTransfers = allEntriesResponse.message.filter((entry: any) => 
              entry.stock_entry_type === 'Material Transfer'
            );
            console.log(`Filtered to ${materialTransfers.length} Material Transfers from all entries`);
            
            // Fetch complete documents for these entries too
            const entriesWithItems = await Promise.all(
              materialTransfers.map(async (entry: StockEntry) => {
                try {
                  const docResponse = await erpFetch(`/api/resource/Stock%20Entry/${entry.name}?fields=["*"]`);
                  return {
                    ...entry,
                    items: docResponse.data?.items || []
                  };
                } catch (itemErr) {
                  console.error(`Error fetching complete document for ${entry.name}:`, itemErr);
                  return {
                    ...entry,
                    items: []
                  };
                }
              })
            );
            
            setStockEntries(entriesWithItems);
          } else {
            console.log('No Stock Entries found');
            setStockEntries([]);
          }
        }
      } else {
        console.log('No stock entries found or invalid response format');
        setStockEntries([]);
      }
    } catch (err: any) {
      console.error('Error fetching stock entries:', err);
      setError(err.message || 'Failed to fetch stock transfer data');
      setStockEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get status from docstatus
  const getStatusFromDocstatus = (docstatus?: number): string => {
    switch (docstatus) {
      case 0: return 'Draft';
      case 1: return 'Submitted';
      case 2: return 'Cancelled';
      default: return 'Draft';
    }
  };

  // Helper function to calculate total quantity from items
  const getTotalQty = (items?: StockEntryItem[]): number => {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.qty || 0), 0);
  };

  useEffect(() => {
    fetchStockEntries();
    fetchWarehouses();
    fetchItems();
  }, []);

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const response = await erpFetch('/api/resource/Warehouse?fields=["name","warehouse_name"]&order_by=warehouse_name');
      console.log('Warehouses response:', response);
      if (response.data && Array.isArray(response.data)) {
        setWarehouses(response.data);
      } else {
        setWarehouses([]);
      }
    } catch (err: any) {
      console.error('Error fetching warehouses:', err);
      setWarehouses([]);
    }
  };

  // Fetch items
  const fetchItems = async () => {
    try {
      const response = await erpFetch('/api/resource/Item?fields=["item_code","item_name","stock_uom","valuation_rate"]&order_by=item_name');
      console.log('Items response:', response);
      if (response.data && Array.isArray(response.data)) {
        setItems(response.data);
      } else {
        setItems([]);
      }
    } catch (err: any) {
      console.error('Error fetching items:', err);
      setItems([]);
    }
  };

  // Add item to transfer
  const addTransferItem = () => {
    const newItem: NewTransferItem = {
      item_code: '',
      item_name: '',
      qty: 0,
      uom: '',
      basic_rate: 0,
      amount: 0
    };
    setTransferItems([...transferItems, newItem]);
  };

  // Remove item from transfer
  const removeTransferItem = (index: number) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  // Update transfer item
  const updateTransferItem = (index: number, field: keyof NewTransferItem, value: any) => {
    const updatedItems = [...transferItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate amount if qty or basic_rate changes
    if (field === 'qty' || field === 'basic_rate') {
      updatedItems[index].amount = updatedItems[index].qty * updatedItems[index].basic_rate;
    }
    
    // Set item_name and uom when item_code changes
    if (field === 'item_code') {
      const selectedItem = items.find(item => item.item_code === value);
      if (selectedItem) {
        updatedItems[index].item_name = selectedItem.item_name;
        updatedItems[index].uom = selectedItem.stock_uom;
        updatedItems[index].basic_rate = selectedItem.valuation_rate || 0;
        updatedItems[index].amount = updatedItems[index].qty * updatedItems[index].basic_rate;
      }
    }
    
    setTransferItems(updatedItems);
  };

  // Save new transfer
  const saveNewTransfer = async () => {
    if (!newTransfer.from_warehouse || !newTransfer.to_warehouse) {
      alert('Please select both source and destination warehouses');
      return;
    }
    
    if (transferItems.length === 0 || transferItems.some(item => !item.item_code || item.qty <= 0)) {
      alert('Please add valid items with quantity');
      return;
    }

    try {
      setSaving(true);
      
      const payload = {
        stock_entry_type: 'Material Transfer',
        posting_date: newTransfer.posting_date,
        posting_time: newTransfer.posting_time,
        from_warehouse: newTransfer.from_warehouse,
        to_warehouse: newTransfer.to_warehouse,
        remark: newTransfer.remark,
        company: 'Quantbit Restro', // Add company to fix warehouse validation
        custom_send_stock_info_to_etims: 0, // Add this field to prevent Kenya eTIMS error
        items: transferItems.map(item => ({
          item_code: item.item_code,
          qty: item.qty,
          uom: item.uom,
          basic_rate: item.basic_rate,
          s_warehouse: newTransfer.from_warehouse,
          t_warehouse: newTransfer.to_warehouse
        }))
      };

      const response = await erpFetch('/api/resource/Stock%20Entry', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.data) {
        // Submit the stock entry
        await erpFetch(`/api/resource/Stock%20Entry/${encodeURIComponent(response.data.name)}`, {
          method: 'PUT',
          body: JSON.stringify({ docstatus: 1 })
        });

        // Reset form and refresh data
        setShowNewTransferModal(false);
        setNewTransfer({
          remark: '',
          from_warehouse: '',
          to_warehouse: '',
          posting_date: new Date().toISOString().split('T')[0],
          posting_time: new Date().toTimeString().slice(0, 5)
        });
        setTransferItems([]);
        fetchStockEntries();
        
        alert('Stock transfer created successfully!');
      }
    } catch (err: any) {
      console.error('Error creating stock transfer:', err);
      alert('Error creating stock transfer: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // View entry details
  const viewEntryDetails = (entry: StockEntry) => {
    setSelectedEntry(entry);
    setShowDetailsModal(true);
  };

  return (
    <div className="p-6 space-y-6 relative h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-gray-50">
      {/* Header */}
      <div className="shrink-0 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stock Transfers</h1>
              <p className="text-gray-600">Material Transfer entries between warehouses</p>
            </div>
          </div>
          <button onClick={() => setShowNewTransferModal(true)} className={BTN_P}>
            <Plus className="h-4 w-4" />
            New Transfer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transfers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Submitted">Submitted</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Warehouses</option>
            {/* Dynamically populate warehouses from entries */}
            {[...new Set(stockEntries.flatMap(e => [e.from_warehouse, e.to_warehouse]).filter(Boolean))].map(warehouse => (
              <option key={warehouse} value={warehouse}>{warehouse}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="shrink-0 bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock transfers...</p>
        </div>
      )}

      {/* Debug Info */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">Debug Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Loading:</span> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">Error:</span> {error || 'None'}
          </div>
          <div>
            <span className="font-medium">Stock Entries Count:</span> {stockEntries.length}
          </div>
          <div>
            <span className="font-medium">Filtered Count:</span> {filteredEntries.length}
          </div>
        </div>
        <div className="mt-2">
          <p className="text-xs text-blue-600">Check browser console for detailed API responses</p>
        </div>
      </div> */}

      {/* Error State */}
      {error && (
        <div className="shrink-0 bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-red-600 mb-4">
            <X className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Error loading stock transfers</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchStockEntries}
            className={BTN_P}
          >
            Retry
          </button>
        </div>
      )}

      {/* Stock Entries List */}
      {!loading && !error && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No stock transfers found</p>
              <p className="text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || warehouseFilter
                  ? 'Try adjusting your filters'
                  : 'No material transfers have been created yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="shrink-0 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entry ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      To Warehouse
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedEntries.map((entry, idx) => (
                    <tr key={entry.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(entry.posting_date)}</div>
                        <div className="text-xs text-gray-500">{entry.posting_time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{entry.from_warehouse || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{entry.to_warehouse || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{getTotalQty(entry.items)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(entry.total_amount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(getStatusFromDocstatus(entry.docstatus))}`}>
                          {getStatusFromDocstatus(entry.docstatus)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => viewEntryDetails(entry)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/inventory?transfer=${entry.name}`)}
                            className="p-1 hover:bg-gray-100 rounded"
                            title="Create Similar Transfer"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, paginatedEntries.length)} of {filteredEntries.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
            <select
              value={itemsPerPage}
              onChange={e => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedEntry && (
        <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Stock Transfer Details - {selectedEntry.name}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Header Information */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Transfer Information</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Entry ID:</dt>
                      <dd className="text-sm font-medium">{selectedEntry.name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Date:</dt>
                      <dd className="text-sm">{formatDate(selectedEntry.posting_date)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Time:</dt>
                      <dd className="text-sm">{selectedEntry.posting_time}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Status:</dt>
                      <dd>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(getStatusFromDocstatus(selectedEntry.docstatus))}`}>
                          {getStatusFromDocstatus(selectedEntry.docstatus)}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Warehouse Details</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">From:</dt>
                      <dd className="text-sm font-medium">{selectedEntry.from_warehouse || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">To:</dt>
                      <dd className="text-sm font-medium">{selectedEntry.to_warehouse || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Total Quantity:</dt>
                      <dd className="text-sm font-medium">{getTotalQty(selectedEntry.items)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">Total Amount:</dt>
                      <dd className="text-sm font-medium">{formatCurrency(selectedEntry.total_amount || 0)}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              
              {/* Items Table */}
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">Transfer Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedEntry.items?.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{item.item_code}</td>
                          <td className="px-4 py-2 text-sm">{item.item_name}</td>
                          <td className="px-4 py-2 text-sm">{item.qty}</td>
                          <td className="px-4 py-2 text-sm">{item.uom}</td>
                          <td className="px-4 py-2 text-sm">{formatCurrency(item.basic_rate)}</td>
                          <td className="px-4 py-2 text-sm font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={6} className="px-4 py-2 text-center text-sm text-gray-500">
                            No items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Transfer Modal */}
      {showNewTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">New Stock Transfer</h2>
                <button
                  onClick={() => setShowNewTransferModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Transfer Information */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Transfer Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Transfer Description
                      </label>
                      <input
                        type="text"
                        value={newTransfer.remark}
                        onChange={(e) => setNewTransfer({ ...newTransfer, remark: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Enter transfer description"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Warehouse
                      </label>
                      <select
                        value={newTransfer.from_warehouse}
                        onChange={(e) => setNewTransfer({ ...newTransfer, from_warehouse: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select warehouse</option>
                        {warehouses.map(warehouse => (
                          <option key={warehouse.name} value={warehouse.name}>
                            {warehouse.warehouse_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To Warehouse
                      </label>
                      <select
                        value={newTransfer.to_warehouse}
                        onChange={(e) => setNewTransfer({ ...newTransfer, to_warehouse: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select warehouse</option>
                        {warehouses.map(warehouse => (
                          <option key={warehouse.name} value={warehouse.name}>
                            {warehouse.warehouse_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posting Date
                      </label>
                      <input
                        type="date"
                        value={newTransfer.posting_date}
                        onChange={(e) => setNewTransfer({ ...newTransfer, posting_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posting Time
                      </label>
                      <input
                        type="time"
                        value={newTransfer.posting_time}
                        onChange={(e) => setNewTransfer({ ...newTransfer, posting_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Transfer Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{transferItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Quantity:</span>
                      <span className="font-medium">
                        {transferItems.reduce((sum, item) => sum + item.qty, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(transferItems.reduce((sum, item) => sum + item.amount, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Items */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Transfer Items</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2">
                            <select
                              value={item.item_code}
                              onChange={(e) => updateTransferItem(index, 'item_code', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Select item</option>
                              {items.map(itemOption => (
                                <option key={itemOption.name} value={itemOption.name}>
                                  {itemOption.item_name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={item.qty}
                              onChange={(e) => updateTransferItem(index, 'qty', Number(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              min="1"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm text-gray-900">{item.uom}</span>
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => removeTransferItem(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Remove item"
                            >
                              <MinusCircle className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={addTransferItem}
                  className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <PlusCircle className="h-4 w-4 inline-block mr-2" />
                  Add Item
                </button>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Amount:</span> {formatCurrency(transferItems.reduce((sum, item) => sum + item.amount, 0))}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNewTransferModal(false)}
                    className={BTN_O}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveNewTransfer}
                    disabled={saving}
                    className={BTN_P}
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Creating...' : 'Create Transfer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};

export default StockTransfers;
