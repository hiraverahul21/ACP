import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PermissionGate } from '../../context/PermissionContext';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  TagIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

interface Item {
  id: string;
  name: string;
  category: string;
  base_uom: string; // Primary field from API response
  uom?: string; // Legacy field for backward compatibility
  description: string | null;
  min_stock_level: number;
  max_stock_level: number;
  reorder_level: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  current_stock?: number;
  total_value?: number;
  batches_count?: number;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_records: number;
  per_page: number;
}

interface ItemsResponse {
  success: boolean;
  data: Item[];
  pagination: PaginationInfo;
}

const ItemManagement: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 20
  });
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    name: '',
    category: '',
    is_active: '',
    page: 1,
    limit: 20
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  
  // Form state for create/edit
  const [itemForm, setItemForm] = useState({
    name: '',
    category: '',
    uom: '',
    description: '',
    min_stock_level: 0,
    max_stock_level: 0,
    reorder_level: 0,
    is_active: true
  });

  // Common UOM options
  const uomOptions = [
    'PCS', 'KG', 'GRAM', 'LITER', 'ML', 'METER', 'CM', 'BOX', 'PACK', 'BOTTLE', 'TABLET', 'CAPSULE'
  ];

  // Fetch unique categories
  const fetchCategories = async () => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      const response = await fetch('/api/inventory/items/categories', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch items
  const fetchItems = async (page = 1) => {
    if (!isAuthenticated) {
      return;
    }
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      Object.entries({...filters, page}).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/inventory/items?${queryParams}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data: ItemsResponse = await response.json();
      
      if (data.success) {
        setItems(data.data || []);
        setPagination({
          current_page: data.pagination?.page || 1,
          per_page: data.pagination?.limit || 10,
          total_pages: data.pagination?.pages || 1,
          total_records: data.pagination?.total || 0
        });
      } else {
        toast.error(data.message || 'Failed to fetch items');
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      toast.error('Error fetching items');
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchTerm) {
      setFilters({...filters, name: searchTerm, page: 1});
    }
    fetchItems(1);
  };

  // Handle create item
  const handleCreateItem = () => {
    setItemForm({
      name: '',
      category: '',
      uom: '',
      description: '',
      min_stock_level: 0,
      max_stock_level: 0,
      reorder_level: 0,
      is_active: true
    });
    setShowCreateModal(true);
  };

  // Handle edit item
  const handleEditItem = (item: Item) => {
    setSelectedItem(item);
    setItemForm({
      name: item.name,
      category: item.category,
      uom: item.base_uom, // Use base_uom from API response
      description: item.description || '',
      min_stock_level: item.min_stock_level,
      max_stock_level: item.max_stock_level,
      reorder_level: item.reorder_level,
      is_active: item.is_active
    });
    setShowEditModal(true);
  };

  // Handle delete item
  const handleDeleteItem = (item: Item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  // Create item
  const createItem = async () => {
    try {
      // Transform form data to match backend API expectations
      const requestData = {
        ...itemForm,
        uom_id: itemForm.uom, // Backend expects uom_id
        uom: undefined // Remove uom field
      };
      
      const response = await fetch('/api/inventory/items', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Item created successfully');
        setShowCreateModal(false);
        fetchItems(pagination.current_page);
        fetchCategories(); // Refresh categories
      } else {
        toast.error(data.message || 'Failed to create item');
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Error creating item');
    }
  };

  // Update item
  const updateItem = async () => {
    if (!selectedItem) return;
    
    try {
      // Transform form data to match backend API expectations
      const requestData = {
        ...itemForm,
        uom_id: itemForm.uom, // Backend expects uom_id
        uom: undefined // Remove uom field
      };
      
      const response = await fetch(`/api/inventory/items/${selectedItem.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Item updated successfully');
        setShowEditModal(false);
        fetchItems(pagination.current_page);
        fetchCategories(); // Refresh categories
      } else {
        toast.error(data.message || 'Failed to update item');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error updating item');
    }
  };

  // Delete item
  const deleteItem = async () => {
    if (!selectedItem) return;
    
    try {
      const response = await fetch(`/api/inventory/items/${selectedItem.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Item deleted successfully');
        setShowDeleteModal(false);
        fetchItems(pagination.current_page);
      } else {
        toast.error(data.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error deleting item');
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Name',
      'Category',
      'UOM',
      'Description',
      'Min Stock',
      'Max Stock',
      'Reorder Level',
      'Current Stock',
      'Total Value',
      'Status',
      'Created Date'
    ];

    const csvData = items.map(item => [
      item.name,
      item.category,
      item.uom,
      item.description || 'N/A',
      item.min_stock_level,
      item.max_stock_level,
      item.reorder_level,
      item.current_stock || 0,
      item.total_value ? `₹${item.total_value.toFixed(2)}` : '₹0.00',
      item.is_active ? 'Active' : 'Inactive',
      new Date(item.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `items-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setFilters({...filters, page: newPage});
    fetchItems(newPage);
  };

  // Get stock status
  const getStockStatus = (item: Item) => {
    const currentStock = item.current_stock || 0;
    if (currentStock <= item.min_stock_level) {
      return { status: 'Low Stock', color: 'text-red-600 bg-red-100' };
    } else if (currentStock <= item.reorder_level) {
      return { status: 'Reorder', color: 'text-yellow-600 bg-yellow-100' };
    } else {
      return { status: 'Good', color: 'text-green-600 bg-green-100' };
    }
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchCategories();
      fetchItems();
    }
  }, [authLoading, isAuthenticated]);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">You need to log in to access the inventory management system. This is why the UOM data is not displaying.</p>
          <button 
            onClick={() => window.location.href = '/auth'}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium"
          >
            Go to Login Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Item Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage inventory items, stock levels, and item details
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
                <PermissionGate module="REPORT" action="EXPORT">
                  <button
                    onClick={exportToCSV}
                    disabled={items.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </PermissionGate>
                <PermissionGate module="INVENTORY" action="CREATE">
                  <button
                    onClick={handleCreateItem}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Add Item
                  </button>
                </PermissionGate>
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
                placeholder="Search items by name..."
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({...filters, category: e.target.value})}
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
                    Status
                  </label>
                  <select
                    value={filters.is_active}
                    onChange={(e) => setFilters({...filters, is_active: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setFilters({
                      name: '',
                      category: '',
                      is_active: '',
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
                  onClick={() => fetchItems(1)}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Items
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Showing {pagination.total_records} total items
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
              <p className="mt-2 text-sm text-gray-500">Loading items...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No items found for the selected filters.</p>
              <PermissionGate module="INVENTORY" action="CREATE">
                <button
                  onClick={handleCreateItem}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add First Item
              </button>
              </PermissionGate>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UOM
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Levels
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
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
                    {items.map((item) => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {item.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <TagIcon className="w-4 h-4 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900">{item.category}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{item.base_uom || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>Min: {item.min_stock_level}</div>
                              <div>Max: {item.max_stock_level}</div>
                              <div>Reorder: {item.reorder_level}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {item.current_stock || 0} {item.base_uom || 'N/A'}
                              </div>
                              {item.total_value && (
                                <div className="text-xs text-gray-500">
                                  Value: ₹{item.total_value.toFixed(2)}
                                </div>
                              )}
                              {item.batches_count && (
                                <div className="text-xs text-gray-500">
                                  {item.batches_count} batch(es)
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                item.is_active ? 'text-green-800 bg-green-100' : 'text-red-800 bg-red-100'
                              }`}>
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <div>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}>
                                  {stockStatus.status}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <PermissionGate module="INVENTORY" action="EDIT">
                                <button
                                  onClick={() => handleEditItem(item)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Edit Item"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                              <PermissionGate module="INVENTORY" action="DELETE">
                                <button
                                  onClick={() => handleDeleteItem(item)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete Item"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Item</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    list="categories"
                    required
                  />
                  <datalist id="categories">
                    {categories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={itemForm.uom}
                    onChange={(e) => setItemForm({...itemForm, uom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select UOM</option>
                    {uomOptions.map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={itemForm.is_active.toString()}
                    onChange={(e) => setItemForm({...itemForm, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.min_stock_level}
                    onChange={(e) => setItemForm({...itemForm, min_stock_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.max_stock_level}
                    onChange={(e) => setItemForm({...itemForm, max_stock_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.reorder_level}
                    onChange={(e) => setItemForm({...itemForm, reorder_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={createItem}
                disabled={!itemForm.name || !itemForm.category || !itemForm.uom}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Item - {selectedItem.name}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    list="categories"
                    required
                  />
                  <datalist id="categories">
                    {categories.map(category => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={itemForm.uom}
                    onChange={(e) => setItemForm({...itemForm, uom: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select UOM</option>
                    {uomOptions.map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={itemForm.is_active.toString()}
                    onChange={(e) => setItemForm({...itemForm, is_active: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.min_stock_level}
                    onChange={(e) => setItemForm({...itemForm, min_stock_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.max_stock_level}
                    onChange={(e) => setItemForm({...itemForm, max_stock_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.reorder_level}
                    onChange={(e) => setItemForm({...itemForm, reorder_level: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
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
                onClick={updateItem}
                disabled={!itemForm.name || !itemForm.category || !itemForm.uom}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Delete Item</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete <strong>{selectedItem.name}</strong>? 
                  This action cannot be undone and will remove all associated stock records.
                </p>
                {selectedItem.current_stock && selectedItem.current_stock > 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-xs text-yellow-800">
                      Warning: This item has current stock of {selectedItem.current_stock} {selectedItem.uom}.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteItem}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemManagement;