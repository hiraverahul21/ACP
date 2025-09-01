import React, { useState, useEffect } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ItemForm from './ItemForm'
import DeleteConfirmModal from './DeleteConfirmModal'
import { PermissionGate } from '@/context/PermissionContext'

interface Item {
  id: string
  name: string
  description?: string
  category: string
  subcategory?: string
  brand?: string
  model?: string
  hsn_code?: string
  primary_uom: string
  secondary_uom?: string
  min_stock_level?: number
  max_stock_level?: number
  reorder_level?: number
  is_active: boolean
  created_at: string
  updated_at: string
  current_stock?: number
  stock_value?: number
}

interface ItemsListProps {
  onItemSelect?: (item: Item) => void
  selectionMode?: boolean
}

const ItemsList: React.FC<ItemsListProps> = ({ onItemSelect, selectionMode = false }) => {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingItem, setDeletingItem] = useState<Item | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 10

  const categories = [
    'CHEMICALS', 'EQUIPMENT', 'CONSUMABLES', 'SPARE_PARTS', 'TOOLS', 'OTHER'
  ]

  const fetchItems = async (page = 1) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      })

      const response = await fetch(`/api/inventory/items?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setItems(data.data || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalItems(data.pagination?.total || 0)
        setCurrentPage(page)
      } else {
        console.error('Failed to fetch items')
        setItems([])
      }
    } catch (error) {
      console.error('Error fetching items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems(1)
  }, [searchTerm, categoryFilter, statusFilter])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const handleCategoryFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleStatusFilter = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value)
    setCurrentPage(1)
  }

  const handleAddItem = () => {
    setEditingItem(null)
    setShowForm(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setShowForm(true)
  }

  const handleDeleteItem = (item: Item) => {
    setDeletingItem(item)
    setShowDeleteModal(true)
  }

  const handleItemClick = (item: Item) => {
    if (selectionMode && onItemSelect) {
      onItemSelect(item)
    }
  }

  const confirmDelete = async () => {
    if (!deletingItem) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/inventory/items/${deletingItem.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchItems(currentPage)
        setShowDeleteModal(false)
        setDeletingItem(null)
      } else {
        console.error('Failed to delete item')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleFormSuccess = () => {
    fetchItems(currentPage)
    setShowForm(false)
    setEditingItem(null)
  }

  const handlePageChange = (page: number) => {
    fetchItems(page)
  }

  const getStockStatus = (item: Item) => {
    if (!item.current_stock) return 'unknown'
    if (item.reorder_level && item.current_stock <= item.reorder_level) return 'low'
    if (item.min_stock_level && item.current_stock <= item.min_stock_level) return 'critical'
    return 'normal'
  }

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'low': return 'text-yellow-600 bg-yellow-100'
      case 'normal': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
          <p className="text-gray-600">Manage your inventory items and stock levels</p>
        </div>
        {!selectionMode && (
          <PermissionGate module="INVENTORY" action="CREATE">
            <Button onClick={handleAddItem}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Item
            </Button>
          </PermissionGate>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={handleCategoryFilter}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={handleStatusFilter}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <FunnelIcon className="h-4 w-4 mr-1" />
            {totalItems} items found
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                  Stock Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {!selectionMode && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const stockStatus = getStockStatus(item)
                return (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50 ${selectionMode ? 'cursor-pointer' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {item.brand && `${item.brand} `}
                          {item.model && `- ${item.model}`}
                        </div>
                        {item.hsn_code && (
                          <div className="text-xs text-gray-400">
                            HSN: {item.hsn_code}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.category.replace('_', ' ')}
                      </div>
                      {item.subcategory && (
                        <div className="text-sm text-gray-500">
                          {item.subcategory}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.primary_uom}
                      </div>
                      {item.secondary_uom && (
                        <div className="text-sm text-gray-500">
                          Alt: {item.secondary_uom}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        Current: {item.current_stock || 0}
                      </div>
                      {item.reorder_level && (
                        <div className="text-sm text-gray-500">
                          Reorder: {item.reorder_level}
                        </div>
                      )}
                      {stockStatus !== 'normal' && stockStatus !== 'unknown' && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
                          <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                          {stockStatus === 'critical' ? 'Critical' : 'Low Stock'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {!selectionMode && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <PermissionGate module="INVENTORY" action="EDIT">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditItem(item)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit item"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                          <PermissionGate module="INVENTORY" action="DELETE">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteItem(item)
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Delete item"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {items.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              {searchTerm || categoryFilter || statusFilter !== 'all' 
                ? 'No items found matching your criteria.' 
                : 'No items found. Add your first item to get started.'}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'outline'}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              )
            })}
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <ItemForm
          item={editingItem}
          onClose={() => {
            setShowForm(false)
            setEditingItem(null)
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDeleteModal && deletingItem && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setDeletingItem(null)
          }}
          onConfirm={confirmDelete}
          title="Delete Item"
          message={`Are you sure you want to delete "${deletingItem.name}"? This action cannot be undone.`}
        />
      )}
    </div>
  )
}

export default ItemsList