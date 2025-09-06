import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { PermissionGate } from '../../context/PermissionContext';
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface StockValuationItem {
  id: string;
  name: string;
  category: string;
  uom: string;
  current_qty: number;
  rate_per_unit: number;
  total_value: number;
  location_name: string;
  expiry_date: string | null;
}

interface StockValuationSummary {
  total_items: number;
  total_value: number;
}

interface StockValuationResponse {
  success: boolean;
  data: StockValuationItem[];
  summary: StockValuationSummary;
}

interface TransferDetail {
  type: 'IN' | 'OUT';
  quantity: number;
  from_location: string;
  to_location: string;
  date: string;
}

interface MovementAnalysisItem {
  item_id: string;
  item_name: string;
  item_category: string;
  uom: string;
  total_receipts: number;
  total_issues: number;
  total_returns: number;
  total_transfers_in: number;
  total_transfers_out: number;
  total_consumption: number;
  net_movement: number;
  current_stock: number;
  transfer_details: TransferDetail[];
}

interface MovementAnalysisResponse {
  success: boolean;
  data: MovementAnalysisItem[];
}

interface ExpiryReportItem {
  id: string;
  item_name: string;
  item_category: string;
  uom: string;
  batch_no: string;
  expiry_date: string;
  current_qty: number;
  rate_per_unit: number;
  total_value: number;
  location_name: string;
  days_to_expiry: number;
  status: 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'GOOD';
}

interface ExpiryReportSummary {
  expired_items: number;
  critical_items: number;
  warning_items: number;
  good_items: number;
  total_expired_value: number;
  total_critical_value: number;
}

interface ExpiryReportResponse {
  success: boolean;
  data: ExpiryReportItem[];
  summary: ExpiryReportSummary;
}

const Reports: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [activeReport, setActiveReport] = useState<'valuation' | 'movement' | 'expiry'>('valuation');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Stock Valuation State
  const [valuationData, setValuationData] = useState<StockValuationItem[]>([]);
  const [valuationSummary, setValuationSummary] = useState<StockValuationSummary>({
    total_items: 0,
    total_value: 0
  });
  
  // Movement Analysis State
  const [movementData, setMovementData] = useState<MovementAnalysisItem[]>([]);
  
  // Expiry Report State
  const [expiryData, setExpiryData] = useState<ExpiryReportItem[]>([]);
  const [expirySummary, setExpirySummary] = useState<ExpiryReportSummary>({
    expired_items: 0,
    critical_items: 0,
    warning_items: 0,
    good_items: 0,
    total_expired_value: 0,
    total_critical_value: 0
  });
  
  // Filter states
  const [filters, setFilters] = useState({
    location_id: '',
    start_date: '',
    end_date: ''
  });
  
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/auth');
    }
  };

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: false,
    },
    {
      name: 'Leads',
      href: '/leads',
      icon: ClipboardDocumentListIcon,
      current: false,
    },
    ...((user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') ? [
      {
        name: 'Staff',
        href: '/staff',
        icon: UsersIcon,
        current: false,
      }
    ] : []),
    {
      name: 'Inventory',
      href: '/inventory',
      icon: CubeIcon,
      current: true,
    },
    ...(user?.role === 'SUPERADMIN' ? [
      {
        name: 'Companies',
        href: '/companies',
        icon: BuildingOfficeIcon,
        current: false,
      },
      {
        name: 'Branches',
        href: '/branches',
        icon: BuildingOfficeIcon,
        current: false,
      },
      {
        name: 'Role Management',
        href: '/roles',
        icon: ShieldCheckIcon,
        current: false,
      }
    ] : []),
    {
      name: 'Reports',
      href: '/reports',
      icon: ChartPieIcon,
      current: false,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: false,
    },
  ];

  // Fetch branches for location filter
  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setBranches(data.data);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    }
  };

  // Fetch Stock Valuation Report
  const fetchStockValuation = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.location_id) queryParams.append('location_id', filters.location_id);
      
      const response = await fetch(`/api/inventory/reports/stock-valuation?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data: StockValuationResponse = await response.json();
      
      if (data.success) {
        setValuationData(data.data);
        setValuationSummary(data.summary);
      } else {
        toast.error('Failed to fetch stock valuation report');
      }
    } catch (error) {
      console.error('Error fetching stock valuation:', error);
      toast.error('Error fetching stock valuation report');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Movement Analysis Report
  const fetchMovementAnalysis = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.location_id) queryParams.append('location_id', filters.location_id);
      
      const response = await fetch(`/api/inventory/reports/movement-analysis?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data: MovementAnalysisResponse = await response.json();
      
      if (data.success) {
        setMovementData(data.data);
      } else {
        toast.error('Failed to fetch movement analysis report');
      }
    } catch (error) {
      console.error('Error fetching movement analysis:', error);
      toast.error('Error fetching movement analysis report');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Expiry Report
  const fetchExpiryReport = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.location_id) queryParams.append('location_id', filters.location_id);
      
      const response = await fetch(`/api/inventory/reports/expiry-report?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data: ExpiryReportResponse = await response.json();
      
      if (data.success) {
        setExpiryData(data.data);
        setExpirySummary(data.summary);
      } else {
        toast.error('Failed to fetch expiry report');
      }
    } catch (error) {
      console.error('Error fetching expiry report:', error);
      toast.error('Error fetching expiry report');
    } finally {
      setLoading(false);
    }
  };

  // Export functions
  const exportStockValuation = () => {
    const headers = ['Item Name', 'Category', 'UOM', 'Current Qty', 'Rate per Unit', 'Total Value', 'Location', 'Expiry Date'];
    const csvData = valuationData.map(item => [
      item.name,
      item.category,
      item.uom,
      item.current_qty,
      item.rate_per_unit,
      item.total_value.toFixed(2),
      item.location_name,
      item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'
    ]);
    
    exportToCSV(headers, csvData, 'stock-valuation-report');
  };

  const exportMovementAnalysis = () => {
    const headers = ['Item Name', 'Category', 'UOM', 'Receipts', 'Issues', 'Returns', 'Transfers In', 'Transfers Out', 'Consumption', 'Net Movement', 'Current Stock', 'Transfer Details'];
    const csvData = movementData.map(item => {
      const transferDetails = item.transfer_details?.map(transfer => 
        `${transfer.type}: ${transfer.quantity} ${item.uom} (${transfer.from_location} → ${transfer.to_location}) on ${new Date(transfer.date).toLocaleDateString()}`
      ).join('; ') || 'No transfers';
      
      return [
        item.item_name,
        item.item_category,
        item.uom,
        item.total_receipts,
        item.total_issues,
        item.total_returns,
        item.total_transfers_in,
        item.total_transfers_out,
        item.total_consumption,
        item.net_movement,
        item.current_stock,
        transferDetails
      ];
    });
    
    exportToCSV(headers, csvData, 'movement-analysis-report');
  };

  const exportExpiryReport = () => {
    const headers = ['Item Name', 'Category', 'UOM', 'Batch No', 'Expiry Date', 'Current Qty', 'Rate per Unit', 'Total Value', 'Location', 'Days to Expiry', 'Status'];
    const csvData = expiryData.map(item => [
      item.item_name,
      item.item_category,
      item.uom,
      item.batch_no,
      new Date(item.expiry_date).toLocaleDateString(),
      item.current_qty,
      item.rate_per_unit,
      item.total_value.toFixed(2),
      item.location_name,
      item.days_to_expiry,
      item.status
    ]);
    
    exportToCSV(headers, csvData, 'expiry-report');
  };

  const exportToCSV = (headers: string[], data: any[][], filename: string) => {
    const csvContent = [headers, ...data]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get expiry status badge
  const getExpiryStatusBadge = (status: string) => {
    const config = {
      'EXPIRED': { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      'CRITICAL': { color: 'bg-orange-100 text-orange-800', icon: ExclamationTriangleIcon },
      'WARNING': { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      'GOOD': { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon }
    };

    const { color, icon: Icon } = config[status as keyof typeof config] || 
      { color: 'bg-gray-100 text-gray-800', icon: CheckCircleIcon };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  // Load data based on active report
  const loadReportData = () => {
    switch (activeReport) {
      case 'valuation':
        fetchStockValuation();
        break;
      case 'movement':
        fetchMovementAnalysis();
        break;
      case 'expiry':
        fetchExpiryReport();
        break;
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [activeReport]);

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
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      item.current
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
          
          <div className="mt-8 pt-8 border-t border-slate-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Sign Out
            </button>
          </div>
        </nav>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
                  <h1 className="text-2xl font-bold text-gray-900">Inventory Reports</h1>
                  <p className="text-sm text-gray-600">
                    Comprehensive inventory analysis and reporting
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <PermissionGate module="REPORT" action="EXPORT">
                  <button
                    onClick={() => {
                      switch (activeReport) {
                        case 'valuation':
                          exportStockValuation();
                          break;
                        case 'movement':
                          exportMovementAnalysis();
                          break;
                        case 'expiry':
                          exportExpiryReport();
                          break;
                      }
                    }}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Type Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveReport('valuation')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeReport === 'valuation'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ChartBarIcon className="w-5 h-5 inline mr-2" />
                Stock Valuation
              </button>
              <button
                onClick={() => setActiveReport('movement')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeReport === 'movement'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TagIcon className="w-5 h-5 inline mr-2" />
                Movement Analysis
              </button>
              <button
                onClick={() => setActiveReport('expiry')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeReport === 'expiry'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ExclamationTriangleIcon className="w-5 h-5 inline mr-2" />
                Expiry Report
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <BuildingOfficeIcon className="w-4 h-4 inline mr-1" />
                  Location
                </label>
                <select
                  value={filters.location_id}
                  onChange={(e) => setFilters({...filters, location_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Locations</option>
                  {Array.isArray(branches) && branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              
              {activeReport === 'movement' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <CalendarIcon className="w-4 h-4 inline mr-1" />
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
                      <CalendarIcon className="w-4 h-4 inline mr-1" />
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setFilters({
                    location_id: '',
                    start_date: '',
                    end_date: ''
                  });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Filters
              </button>
              <button
                onClick={loadReportData}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Stock Valuation Report */}
        {activeReport === 'valuation' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TagIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Items</dt>
                        <dd className="text-lg font-medium text-gray-900">{valuationSummary.total_items}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartBarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                        <dd className="text-lg font-medium text-gray-900">₹{valuationSummary.total_value.toFixed(2)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Valuation Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Stock Valuation Details</h3>
              </div>
              
              {loading ? (
                <div className="px-4 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading stock valuation...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {valuationData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.category}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.current_qty} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.rate_per_unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{item.total_value.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.location_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Movement Analysis Report */}
        {activeReport === 'movement' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Movement Analysis</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Item-wise transaction summary for the selected period
              </p>
            </div>
            
            {loading ? (
              <div className="px-4 py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Loading movement analysis...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipts</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Returns</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transfers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consumption</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Movement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movementData.map((item) => (
                      <React.Fragment key={item.item_id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                              <div className="text-sm text-gray-500">{item.item_category}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            +{item.total_receipts} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            -{item.total_issues} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            +{item.total_returns} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="text-green-600">+{item.total_transfers_in}</div>
                            <div className="text-red-600">-{item.total_transfers_out}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                            -{item.total_consumption} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <span className={item.net_movement >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.net_movement >= 0 ? '+' : ''}{item.net_movement} {item.uom}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.current_stock} {item.uom}
                          </td>
                        </tr>
                        {/* Transfer Details Row */}
                        {item.transfer_details && item.transfer_details.length > 0 && (
                          <tr className="bg-gray-50">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="text-sm text-gray-700 font-medium mb-2">Transfer Details:</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {item.transfer_details.map((transfer, index) => (
                                  <div key={index} className="bg-white p-3 rounded-md border border-gray-200">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        transfer.type === 'IN' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {transfer.type === 'IN' ? '↓ IN' : '↑ OUT'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {new Date(transfer.date).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <div className="text-sm font-medium text-gray-900 mb-1">
                                      Qty: {transfer.quantity} {item.uom}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      <div className="flex items-center">
                                        <span className="font-medium">From:</span>
                                        <span className="ml-1">{transfer.from_location}</span>
                                      </div>
                                      <div className="flex items-center mt-1">
                                        <span className="font-medium">To:</span>
                                        <span className="ml-1">{transfer.to_location}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Expiry Report */}
        {activeReport === 'expiry' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <XCircleIcon className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Expired Items</dt>
                        <dd className="text-lg font-medium text-red-600">{expirySummary.expired_items}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Critical Items</dt>
                        <dd className="text-lg font-medium text-orange-600">{expirySummary.critical_items}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Warning Items</dt>
                        <dd className="text-lg font-medium text-yellow-600">{expirySummary.warning_items}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Good Items</dt>
                        <dd className="text-lg font-medium text-green-600">{expirySummary.good_items}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expiry Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Expiry Details</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Items sorted by expiry status and date
                </p>
              </div>
              
              {loading ? (
                <div className="px-4 py-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading expiry report...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {expiryData.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.item_name}</div>
                              <div className="text-sm text-gray-500">{item.item_category}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.batch_no}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>{new Date(item.expiry_date).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">
                              {item.days_to_expiry >= 0 ? `${item.days_to_expiry} days left` : `${Math.abs(item.days_to_expiry)} days ago`}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.current_qty} {item.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.total_value.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.location_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getExpiryStatusBadge(item.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default Reports;