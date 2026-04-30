import React, { useState, useEffect } from 'react';
import { Search, Filter, Package, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import Pagination from '../components/Pagination';

interface StockLedgerEntry {
  name: string;
  posting_date: string;
  posting_time: string;
  item_code: string;
  item_name: string;
  warehouse: string;
  actual_qty: number;
  qty_after_transaction: number;
  valuation_rate: number;
  stock_value: number;
  voucher_type: string;
  voucher_no: string;
  company: string;
  is_cancelled: string;
}

interface Warehouse {
  name: string;
  warehouse_name: string;
}

const StockTracking: React.FC = () => {
  const [stockEntries, setStockEntries] = useState<StockLedgerEntry[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Fetch stock ledger entries
  const fetchStockEntries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching stock ledger entries...');
      
      // Fetch Stock Ledger Entries with permitted fields only
      const response = await fetch('/api/resource/Stock%20Ledger%20Entry?fields=["name","posting_date","posting_time","item_code","warehouse","actual_qty","qty_after_transaction","valuation_rate","stock_value","voucher_type","voucher_no","company","is_cancelled"]&order_by=posting_date desc,posting_time desc&limit=100', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      console.log('Stock Ledger response:', data);

      if (data.data && Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} Stock Ledger entries`);
        
        // Fetch item names separately for each entry
        const entriesWithItemNames = await Promise.all(
          data.data.map(async (entry: any) => {
            try {
              // Fetch item details to get item_name - simplified API call
              const itemResponse = await fetch(`/api/resource/Item/${entry.item_code}?fields=["item_name"]`, {
                headers: {
                  'Content-Type': 'application/json',
                }
              });
              
              if (itemResponse.ok) {
                const itemData = await itemResponse.json();
                return {
                  ...entry,
                  item_name: itemData.data?.item_name || entry.item_code
                };
              } else {
                // If API call fails, fallback to item code
                return {
                  ...entry,
                  item_name: entry.item_code
                };
              }
            } catch (itemErr) {
              console.error(`Error fetching item name for ${entry.item_code}:`, itemErr);
              return {
                ...entry,
                item_name: entry.item_code // Fallback to item code
              };
            }
          })
        );
        
        setStockEntries(entriesWithItemNames);
      } else {
        console.log('No stock ledger entries found or invalid response format');
        setStockEntries([]);
      }
    } catch (err: any) {
      console.error('Error fetching stock ledger entries:', err);
      setError(err.message || 'Failed to fetch stock tracking data');
      setStockEntries([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const response = await fetch('/api/resource/Warehouse?fields=["name","warehouse_name"]&order_by=warehouse_name', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        setWarehouses(data.data);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  // Filter entries
  const filteredEntries = stockEntries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.voucher_no.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWarehouse = !selectedWarehouse || entry.warehouse === selectedWarehouse;
    
    return matchesSearch && matchesWarehouse;
  });

  // Pagination logic
  const paginatedStockEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWarehouse, itemsPerPage]);

  // Fetch data on component mount
  useEffect(() => {
    fetchStockEntries();
  }, []);

  // Get unique warehouses from entries
  const uniqueWarehouses = Array.from(new Set(stockEntries.map(entry => entry.warehouse)));

  // Calculate totals
  const totalInward = filteredEntries
    .filter(entry => entry.actual_qty > 0)
    .reduce((sum, entry) => sum + Math.abs(entry.actual_qty), 0);

  const totalOutward = filteredEntries
    .filter(entry => entry.actual_qty < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.actual_qty), 0);

  // Button constants for consistent blue theme
  const BTN_P = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2';
  const BTN_O = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString ? timeString.substring(0, 5) : '';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6 relative h-[calc(100vh-64px)] overflow-hidden flex flex-col max-w-7xl mx-auto">
      {/* Header */}
      <div className="shrink-0 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stock Tracking</h1>
        <p className="text-gray-600">Monitor stock movements and inventory levels across warehouses</p>
      </div>

      {/* Summary Cards */}
      <div className="shrink-0 grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">{filteredEntries.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Inward</p>
              <p className="text-2xl font-bold text-green-600">{formatNumber(totalInward)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outward</p>
              <p className="text-2xl font-bold text-red-600">{formatNumber(totalOutward)}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Warehouses</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueWarehouses.length}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="shrink-0 bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Items
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by item code, name, or voucher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Warehouse
            </label>
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full"
            >
              <option value="">All Warehouses</option>
              {uniqueWarehouses.map(warehouse => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedWarehouse('');
              }}
              className={BTN_O}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="shrink-0 bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock tracking data...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="shrink-0 bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-red-600 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Error loading stock data</p>
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

      {/* Stock Entries Table */}
      {!loading && !error && (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No stock entries found</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="shrink-0 bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Movement</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voucher</th>
                    <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedStockEntries.map((entry, idx) => (
                    <tr key={entry.name} className={idx < paginatedStockEntries.length - 1 ? 'border-b border-gray-100' : 'border-b border-transparent'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div className="font-medium text-gray-900">{formatDate(entry.posting_date)}</div>
                          <div className="text-xs text-gray-500">{formatTime(entry.posting_time)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">{entry.item_code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">{entry.item_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">{entry.warehouse}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`font-medium ${
                          entry.actual_qty > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {entry.actual_qty > 0 ? '+' : ''}{formatNumber(entry.actual_qty)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-medium text-gray-900">{formatNumber(entry.qty_after_transaction)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div style={{ fontSize: 13, color: '#374151' }}>{formatCurrency(entry.stock_value)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div>
                          <div>{entry.voucher_type}</div>
                          <div className="text-xs text-gray-500">{entry.voucher_no}</div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, paginatedStockEntries.length)} of {filteredEntries.length} entries
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: '#374151', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13 }}
                >
                  Next
                </button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Items per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, color: '#374151' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}
  </div>
)};

export default StockTracking;

// ... (rest of the code remains the same)
