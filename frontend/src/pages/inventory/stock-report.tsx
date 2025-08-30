import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import {
  CalendarIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface StockReportItem {
  item_id: string;
  item_name: string;
  item_category: string;
  uom: string;
  batch_no: string;
  location_type: string;
  location_id: string;
  location_name: string;
  current_qty: number;
  rate_per_unit: number;
  total_value: number;
  mfg_date: string | null;
  expiry_date: string | null;
  is_expired: boolean;
  days_to_expiry: number | null;
}

interface GroupedStockItem {
  item_id: string;
  item_name: string;
  item_category: string;
  uom: string;
  total_quantity: number;
  total_value: number;
  location_name: string;
  details: StockReportItem[];
}

interface StockReportSummary {
  total_items: number;
  total_value: number;
  expired_items: number;
  expiring_soon: number;
}

interface StockReportResponse {
  success: boolean;
  data: StockReportItem[];
  summary: StockReportSummary;
}

const StockReport: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<StockReportItem[]>([]);
  const [groupedData, setGroupedData] = useState<GroupedStockItem[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<StockReportSummary>({
    total_items: 0,
    total_value: 0,
    expired_items: 0,
    expiring_soon: 0
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [items, setItems] = useState<Array<{id: string, name: string, category: string}>>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items
  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Leads', href: '/leads', icon: UsersIcon },
    { name: 'Inventory', href: '/inventory', icon: CubeIcon },
    { name: 'Branches', href: '/branches', icon: BuildingOfficeIcon },
    { name: 'Reports', href: '/reports', icon: ChartPieIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon }
  ];

  // Handle navigation
  const handleNavClick = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };
  
  // Filter states
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    location_type: '',
    location_id: '',
    item_category: '',
    item_id: '',
    include_expired: 'false'
  });
  
  const [categories, setCategories] = useState<string[]>([]);

  // Group stock data by item name and location
  const groupStockData = (data: StockReportItem[]): GroupedStockItem[] => {
    const grouped = new Map<string, GroupedStockItem>();
    
    data.forEach(item => {
      const key = `${item.item_id}-${item.location_id}`;
      
      if (grouped.has(key)) {
        const existing = grouped.get(key)!;
        existing.total_quantity += parseFloat(item.current_qty.toString());
        existing.total_value += parseFloat(item.total_value.toString());
        existing.details.push(item);
      } else {
        grouped.set(key, {
          item_id: item.item_id,
          item_name: item.item_name,
          item_category: item.item_category,
          uom: item.uom,
          total_quantity: parseFloat(item.current_qty.toString()),
          total_value: parseFloat(item.total_value.toString()),
          location_name: item.location_name,
          details: [item]
        });
      }
    });
    
    return Array.from(grouped.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  };

  // Toggle row expansion
  const toggleRowExpansion = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  // Fetch branches for location filter
  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('Branches API response:', data);
      if (data.success && data.data && Array.isArray(data.data.branches)) {
        console.log('Setting branches:', data.data.branches);
        setBranches(data.data.branches);
      } else {
        console.log('Branches data is not valid array:', data);
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  // Fetch items for item filter
  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory/items', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setItems(data.data);
        const uniqueCategories = [...new Set(data.data.map((item: any) => item.category))];
        setCategories(uniqueCategories);
      } else {
        setItems([]);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
      setCategories([]);
    }
  };

  // Fetch stock report data
  const fetchStockReport = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await fetch(`/api/inventory/reports/stock-report?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data: StockReportResponse = await response.json();
      
      if (data.success) {
        setReportData(data.data);
        setSummary(data.summary);
        setGroupedData(groupStockData(data.data));
      } else {
        toast.error('Failed to fetch stock report');
      }
    } catch (error) {
      console.error('Error fetching stock report:', error);
      toast.error('Error fetching stock report');
    } finally {
      setLoading(false);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Item Name',
      'Category',
      'UOM',
      'Batch No',
      'Location',
      'Current Qty',
      'Rate per Unit',
      'Total Value',
      'Mfg Date',
      'Expiry Date',
      'Days to Expiry',
      'Status'
    ];

    const csvData = reportData.map(item => [
      item.item_name,
      item.item_category,
      item.uom,
      item.batch_no,
      item.location_name,
      item.current_qty,
      item.rate_per_unit,
      item.total_value.toFixed(2),
      item.mfg_date ? new Date(item.mfg_date).toLocaleDateString() : 'N/A',
      item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A',
      item.days_to_expiry || 'N/A',
      item.is_expired ? 'Expired' : item.days_to_expiry && item.days_to_expiry <= 30 ? 'Expiring Soon' : 'Good'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stock-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get status badge
  const getStatusBadge = (item: StockReportItem) => {
    if (item.is_expired) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }
    
    if (item.days_to_expiry && item.days_to_expiry <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <ClockIcon className="w-3 h-3 mr-1" />
          Critical
        </span>
      );
    }
    
    if (item.days_to_expiry && item.days_to_expiry <= 30) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="w-3 h-3 mr-1" />
          Warning
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        Good
      </span>
    );
  };

  useEffect(() => {
    fetchBranches();
    fetchItems();
    fetchStockReport();
  }, []);

  const sidebarClasses = `fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={sidebarClasses}>
        <div className="flex items-center justify-between h-16 px-4 bg-slate-800">
          <h1 className="text-white font-bold text-lg">PestControl</h1>
          {user?.company && (
            <p className="text-xs text-slate-300 truncate">
              {user.company.name}
              {user?.branch?.name && ` (${user.branch.name})`}
            </p>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <button
                    onClick={() => handleNavClick(item.href)}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-300 rounded-lg hover:text-white hover:bg-slate-700 transition-colors duration-200"
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 w-full p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-300 rounded-lg hover:text-white hover:bg-slate-700 transition-colors duration-200"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-4 text-gray-600 hover:text-gray-900"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Stock Report</h1>
                  <p className="text-sm text-gray-600">
                    Comprehensive inventory stock report with filtering options
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  Filters
                </button>
                <button
                  onClick={exportToCSV}
                  disabled={reportData.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">T</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.total_items}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">₹</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                    <dd className="text-lg font-medium text-gray-900">₹{summary.total_value.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expired Items</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.expired_items}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <ClockIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Expiring Soon</dt>
                    <dd className="text-lg font-medium text-gray-900">{summary.expiring_soon}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white shadow rounded-lg mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Type
                  </label>
                  <select
                    value={filters.location_type}
                    onChange={(e) => setFilters({...filters, location_type: e.target.value, location_id: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Locations</option>
                    <option value="BRANCH">Branch</option>
                  </select>
                </div>
                
                {filters.location_type === 'BRANCH' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <select
                      value={filters.location_id}
                      onChange={(e) => setFilters({...filters, location_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Branches</option>
                      {branches.map(branch => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.item_category}
                    onChange={(e) => setFilters({...filters, item_category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item
                  </label>
                  <select
                    value={filters.item_id}
                    onChange={(e) => setFilters({...filters, item_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Items</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Include Expired
                  </label>
                  <select
                    value={filters.include_expired}
                    onChange={(e) => setFilters({...filters, include_expired: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setFilters({
                    start_date: '',
                    end_date: '',
                    location_type: '',
                    location_id: '',
                    item_category: '',
                    item_id: '',
                    include_expired: 'false'
                  })}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
                <button
                  onClick={fetchStockReport}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stock Report Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Stock Report Data
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Detailed inventory stock information with expiry tracking
            </p>
          </div>
          
          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading stock report...</p>
            </div>
          ) : groupedData.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-gray-500">No stock data found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupedData.map((groupedItem) => {
                    const rowKey = `${groupedItem.item_id}-${groupedItem.location_name}`;
                    const isExpanded = expandedRows.has(rowKey);
                    
                    return (
                      <React.Fragment key={rowKey}>
                        {/* Main grouped row */}
                        <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleRowExpansion(rowKey)}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {isExpanded ? (
                                <ChevronDownIcon className="h-5 w-5 text-gray-400 mr-2" />
                              ) : (
                                <ChevronRightIcon className="h-5 w-5 text-gray-400 mr-2" />
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{groupedItem.item_name}</div>
                                <div className="text-sm text-gray-500">{groupedItem.item_category}</div>
                                <div className="text-xs text-gray-400">{groupedItem.uom}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{groupedItem.location_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {groupedItem.total_quantity.toFixed(2)} {groupedItem.uom}
                            </div>
                            <div className="text-xs text-gray-500">
                              {groupedItem.details.length} batch{groupedItem.details.length !== 1 ? 'es' : ''}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              ₹{groupedItem.total_value.toFixed(2)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRowExpansion(rowKey);
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              {isExpanded ? 'Collapse' : 'Expand'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded detail rows */}
                        {isExpanded && groupedItem.details.map((detail, detailIndex) => (
                          <tr key={`${rowKey}-detail-${detailIndex}`} className="bg-gray-50">
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="pl-7">
                                <div className="text-sm text-gray-900">Batch: {detail.batch_no}</div>
                                {detail.mfg_date && (
                                  <div className="text-xs text-gray-500">
                                    Mfg: {new Date(detail.mfg_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{detail.location_type}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{detail.current_qty} {detail.uom}</div>
                              <div className="text-xs text-gray-500">₹{detail.rate_per_unit}/unit</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">₹{detail.total_value.toFixed(2)}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="flex flex-col space-y-1">
                                {getStatusBadge(detail)}
                                {detail.expiry_date && (
                                  <div className="text-xs text-gray-500">
                                    Exp: {new Date(detail.expiry_date).toLocaleDateString()}
                                    {detail.days_to_expiry !== null && (
                                      <span className="block">
                                        {detail.days_to_expiry > 0 
                                          ? `${detail.days_to_expiry} days left`
                                          : `Expired ${Math.abs(detail.days_to_expiry)} days ago`
                                        }
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </main>
      </div>
    </div>
  );
};

export default StockReport;