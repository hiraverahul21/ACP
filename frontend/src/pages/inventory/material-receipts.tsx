import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface MaterialReceipt {
  id: string;
  receipt_no: string;
  receipt_date: string;
  supplier_name: string;
  location_type: string;
  location_id: string;
  location_name: string;
  total_amount: number;
  gst_amount: number;
  discount_amount: number;
  net_amount: number;
  notes: string | null;
  created_at: string;
  created_by_name: string;
  batches: MaterialReceiptBatch[];
}

interface MaterialReceiptBatch {
  id: string;
  item_id: string;
  item_name: string;
  item_category: string;
  uom: string;
  batch_no: string;
  quantity: number;
  rate_per_unit: number;
  total_amount: number;
  expiry_date: string | null;
  manufacturing_date: string | null;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_records: number;
  per_page: number;
}

interface MaterialReceiptsResponse {
  success: boolean;
  data: MaterialReceipt[];
  pagination: PaginationInfo;
}

const MaterialReceipts: React.FC = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<MaterialReceipt[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 20
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<MaterialReceipt | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    receipt_no: '',
    supplier_name: '',
    location_id: '',
    start_date: '',
    end_date: '',
    page: 1,
    limit: 20
  });
  
  const [branches, setBranches] = useState<Array<{id: string, name: string}>>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    supplier_name: '',
    notes: '',
    batches: [] as MaterialReceiptBatch[]
  });

  // Fetch branches for location filter
  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Fetch material receipts
  const fetchMaterialReceipts = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries({...filters, page}).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/inventory/material-receipts?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data: MaterialReceiptsResponse = await response.json();
      
      if (data.success) {
        setReceipts(data.data);
        setPagination(data.pagination);
      } else {
        toast.error('Failed to fetch material receipts');
      }
    } catch (error) {
      console.error('Error fetching material receipts:', error);
      toast.error('Error fetching material receipts');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchTerm) {
      setFilters({...filters, receipt_no: searchTerm, page: 1});
    }
    fetchMaterialReceipts(1);
  };

  // Handle view receipt
  const handleViewReceipt = (receipt: MaterialReceipt) => {
    setSelectedReceipt(receipt);
    setShowViewModal(true);
  };

  // Handle edit receipt
  const handleEditReceipt = (receipt: MaterialReceipt) => {
    setSelectedReceipt(receipt);
    setEditForm({
      supplier_name: receipt.supplier_name,
      notes: receipt.notes || '',
      batches: receipt.batches
    });
    setShowEditModal(true);
  };

  // Handle delete receipt
  const handleDeleteReceipt = (receipt: MaterialReceipt) => {
    setSelectedReceipt(receipt);
    setShowDeleteModal(true);
  };

  // Update receipt
  const updateReceipt = async () => {
    if (!selectedReceipt) return;
    
    try {
      const response = await fetch(`/api/inventory/material-receipts/${selectedReceipt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          supplier_name: editForm.supplier_name,
          notes: editForm.notes,
          batches: editForm.batches.map(batch => ({
            id: batch.id,
            quantity: batch.quantity,
            rate_per_unit: batch.rate_per_unit,
            expiry_date: batch.expiry_date,
            manufacturing_date: batch.manufacturing_date
          }))
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Material receipt updated successfully');
        setShowEditModal(false);
        fetchMaterialReceipts(pagination.current_page);
      } else {
        toast.error(data.message || 'Failed to update material receipt');
      }
    } catch (error) {
      console.error('Error updating material receipt:', error);
      toast.error('Error updating material receipt');
    }
  };

  // Delete receipt
  const deleteReceipt = async () => {
    if (!selectedReceipt) return;
    
    try {
      const response = await fetch(`/api/inventory/material-receipts/${selectedReceipt.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Material receipt deleted successfully');
        setShowDeleteModal(false);
        fetchMaterialReceipts(pagination.current_page);
      } else {
        toast.error(data.message || 'Failed to delete material receipt');
      }
    } catch (error) {
      console.error('Error deleting material receipt:', error);
      toast.error('Error deleting material receipt');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Receipt No',
      'Date',
      'Supplier',
      'Location',
      'Total Amount',
      'GST Amount',
      'Discount',
      'Net Amount',
      'Created By',
      'Notes'
    ];

    const csvData = receipts.map(receipt => [
      receipt.receipt_no,
      new Date(receipt.receipt_date).toLocaleDateString(),
      receipt.supplier_name,
      receipt.location_name,
      receipt.total_amount.toFixed(2),
      receipt.gst_amount.toFixed(2),
      receipt.discount_amount.toFixed(2),
      receipt.net_amount.toFixed(2),
      receipt.created_by_name,
      receipt.notes || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `material-receipts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters({...filters, page: newPage});
    fetchMaterialReceipts(newPage);
  };

  // Update batch in edit form
  const updateBatchInForm = (batchId: string, field: string, value: any) => {
    setEditForm({
      ...editForm,
      batches: editForm.batches.map(batch => 
        batch.id === batchId ? { ...batch, [field]: value } : batch
      )
    });
  };

  useEffect(() => {
    fetchBranches();
    fetchMaterialReceipts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Material Receipts</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage and track all material receipt transactions
                </p>
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
                  disabled={receipts.length === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={() => window.location.href = '/inventory'}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search by receipt number..."
              />
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
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={filters.supplier_name}
                    onChange={(e) => setFilters({...filters, supplier_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter supplier name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <select
                    value={filters.location_id}
                    onChange={(e) => setFilters({...filters, location_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Locations</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
                
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
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setFilters({
                      receipt_no: '',
                      supplier_name: '',
                      location_id: '',
                      start_date: '',
                      end_date: '',
                      page: 1,
                      limit: 20
                    });
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
                </button>
                <button
                  onClick={() => fetchMaterialReceipts(1)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Material Receipts Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Material Receipts
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Showing {pagination.total_records} total receipts
              </p>
            </div>
            
            {/* Pagination Info */}
            <div className="text-sm text-gray-500">
              Page {pagination.current_page} of {pagination.total_pages}
            </div>
          </div>
          
          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Loading material receipts...</p>
            </div>
          ) : receipts.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-gray-500">No material receipts found for the selected filters.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receipt Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{receipt.receipt_no}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(receipt.receipt_date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {receipt.batches.length} item(s)
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{receipt.supplier_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{receipt.location_name}</div>
                          <div className="text-xs text-gray-500">{receipt.location_type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">₹{receipt.total_amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">GST: ₹{receipt.gst_amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">Discount: ₹{receipt.discount_amount.toFixed(2)}</div>
                          <div className="text-sm font-medium text-gray-900">Net: ₹{receipt.net_amount.toFixed(2)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{receipt.created_by_name}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(receipt.created_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewReceipt(receipt)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditReceipt(receipt)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit Receipt"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteReceipt(receipt)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Receipt"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination.total_pages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(pagination.current_page - 1)}
                      disabled={pagination.current_page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.current_page + 1)}
                      disabled={pagination.current_page === pagination.total_pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {(pagination.current_page - 1) * pagination.per_page + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(pagination.current_page * pagination.per_page, pagination.total_records)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{pagination.total_records}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(pagination.current_page - 1)}
                          disabled={pagination.current_page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronLeftIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                          const pageNum = Math.max(1, pagination.current_page - 2) + i;
                          if (pageNum > pagination.total_pages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.current_page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        
                        <button
                          onClick={() => handlePageChange(pagination.current_page + 1)}
                          disabled={pagination.current_page === pagination.total_pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRightIcon className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Modal */}
      {showViewModal && selectedReceipt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Receipt Details - {selectedReceipt.receipt_no}</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Receipt Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Receipt No:</span> {selectedReceipt.receipt_no}</div>
                  <div><span className="font-medium">Date:</span> {new Date(selectedReceipt.receipt_date).toLocaleDateString()}</div>
                  <div><span className="font-medium">Supplier:</span> {selectedReceipt.supplier_name}</div>
                  <div><span className="font-medium">Location:</span> {selectedReceipt.location_name}</div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Amount Details</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Total Amount:</span> ₹{selectedReceipt.total_amount.toFixed(2)}</div>
                  <div><span className="font-medium">GST Amount:</span> ₹{selectedReceipt.gst_amount.toFixed(2)}</div>
                  <div><span className="font-medium">Discount:</span> ₹{selectedReceipt.discount_amount.toFixed(2)}</div>
                  <div><span className="font-medium">Net Amount:</span> ₹{selectedReceipt.net_amount.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReceipt.batches.map((batch) => (
                      <tr key={batch.id}>
                        <td className="px-4 py-2 text-sm">
                          <div>{batch.item_name}</div>
                          <div className="text-xs text-gray-500">{batch.item_category}</div>
                        </td>
                        <td className="px-4 py-2 text-sm">{batch.batch_no}</td>
                        <td className="px-4 py-2 text-sm">{batch.quantity} {batch.uom}</td>
                        <td className="px-4 py-2 text-sm">₹{batch.rate_per_unit}</td>
                        <td className="px-4 py-2 text-sm">₹{batch.total_amount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm">
                          {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {selectedReceipt.notes && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600">{selectedReceipt.notes}</p>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedReceipt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Receipt - {selectedReceipt.receipt_no}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={editForm.supplier_name}
                    onChange={(e) => setEditForm({...editForm, supplier_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Mfg Date</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editForm.batches.map((batch) => (
                        <tr key={batch.id}>
                          <td className="px-4 py-2 text-sm">
                            <div>{batch.item_name}</div>
                            <div className="text-xs text-gray-500">{batch.batch_no}</div>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={batch.quantity}
                              onChange={(e) => updateBatchInForm(batch.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={batch.rate_per_unit}
                              onChange={(e) => updateBatchInForm(batch.id, 'rate_per_unit', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={batch.expiry_date ? batch.expiry_date.split('T')[0] : ''}
                              onChange={(e) => updateBatchInForm(batch.id, 'expiry_date', e.target.value || null)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={batch.manufacturing_date ? batch.manufacturing_date.split('T')[0] : ''}
                              onChange={(e) => updateBatchInForm(batch.id, 'manufacturing_date', e.target.value || null)}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={updateReceipt}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Update Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedReceipt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Receipt</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete receipt <strong>{selectedReceipt.receipt_no}</strong>? 
                  This action cannot be undone and will remove all associated batch records.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteReceipt}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Receipt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaterialReceipts;