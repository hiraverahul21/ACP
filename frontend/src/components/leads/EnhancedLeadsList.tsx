import React, { useState, useEffect } from 'react'
import {
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import DeleteConfirmModal from './DeleteConfirmModal'
import { PermissionGate } from '@/context/PermissionContext'

interface Lead {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  address: string
  city: string
  state: string
  pincode: string
  service_type: string
  property_type: string
  urgency_level: string
  status: string
  created_at: string
  assigned_to?: string
  assigned_staff_name?: string
  description?: string
  lead_type?: string
  branch?: {
    id: string
    name: string
    city: string
  }
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalRecords: number
  hasNext: boolean
  hasPrev: boolean
}

interface EnhancedLeadsListProps {
  leads: Lead[]
  pagination: PaginationInfo
  onEdit: (lead: Lead) => void
  onDelete: (leadId: string) => void
  onPageChange: (page: number) => void
  onSearch: (query: string) => void
  onSort: (field: string, direction: 'asc' | 'desc') => void
  userRole: string
  isDeleting?: boolean
  isLoading?: boolean
}

type SortField = 'customer_name' | 'created_at' | 'status' | 'urgency_level' | 'lead_type'
type SortDirection = 'asc' | 'desc'

const EnhancedLeadsList: React.FC<EnhancedLeadsListProps> = ({
  leads,
  pagination,
  onEdit,
  onDelete,
  onPageChange,
  onSearch,
  onSort,
  userRole,
  isDeleting = false,
  isLoading = false
}) => {
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; lead: Lead | null }>({
    isOpen: false,
    lead: null,
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const handleDeleteClick = (lead: Lead) => {
    setDeleteModal({ isOpen: true, lead })
  }

  const handleDeleteConfirm = () => {
    if (deleteModal.lead) {
      onDelete(deleteModal.lead.id)
      setDeleteModal({ isOpen: false, lead: null })
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, lead: null })
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch(query)
  }

  const handleSort = (field: SortField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
    onSort(field, newDirection)
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    )
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      NEW: 'bg-blue-100 text-blue-800',
      CONTACTED: 'bg-yellow-100 text-yellow-800',
      QUALIFIED: 'bg-purple-100 text-purple-800',
      PROPOSAL_SENT: 'bg-indigo-100 text-indigo-800',
      NEGOTIATION: 'bg-orange-100 text-orange-800',
      CLOSED_WON: 'bg-green-100 text-green-800',
      CLOSED_LOST: 'bg-red-100 text-red-800',
      FOLLOW_UP: 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.replace(/_/g, ' ')}
      </span>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyColors = {
      LOW: 'bg-green-100 text-green-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        urgencyColors[urgency as keyof typeof urgencyColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {urgency}
      </span>
    )
  }

  const getLeadTypeBadge = (leadType: string) => {
    const typeColors = {
      ONCALL: 'bg-blue-100 text-blue-800 border-blue-200',
      AMC: 'bg-green-100 text-green-800 border-green-200',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        typeColors[leadType as keyof typeof typeColors] || 'bg-gray-100 text-gray-800 border-gray-200'
      }`}>
        {leadType || 'Not Specified'}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatServiceType = (serviceType: string) => {
    return serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  // Group leads by branch and then by lead type
  const groupedLeads = leads.reduce((acc, lead) => {
    const branchName = lead.branch?.name || 'Unassigned Branch'
    const leadType = lead.lead_type || 'Not Specified'
    
    if (!acc[branchName]) {
      acc[branchName] = {}
    }
    
    if (!acc[branchName][leadType]) {
      acc[branchName][leadType] = []
    }
    
    acc[branchName][leadType].push(lead)
    return acc
  }, {} as Record<string, Record<string, Lead[]>>)

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 5
    const startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1)

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-2 text-sm font-medium rounded-md ${
            i === pagination.currentPage
              ? 'bg-primary-600 text-white'
              : 'text-gray-700 hover:bg-gray-50 border border-gray-300'
          }`}
        >
          {i}
        </button>
      )
    }

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalRecords)} of {pagination.totalRecords} results
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(pagination.currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="flex space-x-1">
            {pages}
          </div>
          <button
            onClick={() => onPageChange(pagination.currentPage + 1)}
            disabled={!pagination.hasNext}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    )
  }

  if (leads.length === 0 && !isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search criteria.' : 'Get started by creating your first lead.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Search and Controls */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Total: {pagination.totalRecords} leads
          </div>
        </div>
      </div>

      {/* Grouped Leads Display */}
      <div className="divide-y divide-gray-200">
        {Object.entries(groupedLeads).map(([branchName, leadTypes]) => (
          <div key={branchName} className="">
            {/* Branch Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{branchName}</h3>
            </div>
            
            {/* Lead Types within Branch */}
            {Object.entries(leadTypes).map(([leadType, typeLeads]) => (
              <div key={`${branchName}-${leadType}`} className="">
                {/* Lead Type Sub-header */}
                <div className="bg-gray-25 px-6 py-2 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Lead Type:</span>
                    {getLeadTypeBadge(leadType)}
                    <span className="text-xs text-gray-500">({typeLeads.length} leads)</span>
                  </div>
                </div>
                
                {/* Desktop Table */}
                <div className="hidden lg:block">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('customer_name')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Customer</span>
                            {getSortIcon('customer_name')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('status')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Status</span>
                            {getSortIcon('status')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('urgency_level')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Urgency</span>
                            {getSortIcon('urgency_level')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('created_at')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Created</span>
                            {getSortIcon('created_at')}
                          </button>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {typeLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{lead.customer_name}</div>
                              <div className="text-sm text-gray-500">{lead.customer_phone}</div>
                              {lead.customer_email && (
                                <div className="text-sm text-gray-500">{lead.customer_email}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{lead.city}, {lead.state}</div>
                            <div className="text-sm text-gray-500">{lead.pincode}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatServiceType(lead.service_type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(lead.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getUrgencyBadge(lead.urgency_level)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <PermissionGate module="LEAD" action="EDIT">
                                <button
                                  onClick={() => onEdit(lead)}
                                  className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                                  title="Edit Lead"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                              <PermissionGate module="LEAD" action="DELETE">
                                <button
                                  onClick={() => handleDeleteClick(lead)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded"
                                  title="Delete Lead"
                                  disabled={isDeleting}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {typeLeads.map((lead) => (
                    <div key={lead.id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          #{lead.id.slice(-8).toUpperCase()}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(lead.status)}
                          {getUrgencyBadge(lead.urgency_level)}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="text-lg font-medium text-gray-900">{lead.customer_name}</div>
                        <div className="text-sm text-gray-500">{lead.customer_phone}</div>
                        {lead.customer_email && (
                          <div className="text-sm text-gray-500">{lead.customer_email}</div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <div className="text-gray-500">Location</div>
                          <div className="text-gray-900">{lead.city}, {lead.state}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Service</div>
                          <div className="text-gray-900">{formatServiceType(lead.service_type)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Created</div>
                          <div className="text-gray-900">{formatDate(lead.created_at)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Lead Type</div>
                          <div>{getLeadTypeBadge(lead.lead_type || 'Not Specified')}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                        <PermissionGate module="LEAD" action="EDIT">
                          <Button
                            onClick={() => onEdit(lead)}
                            variant="outline"
                            size="sm"
                            className="text-indigo-600 border-indigo-600 hover:bg-indigo-50"
                          >
                            <PencilIcon className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </PermissionGate>
                        <PermissionGate module="LEAD" action="DELETE">
                          <Button
                            onClick={() => handleDeleteClick(lead)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            disabled={isDeleting}
                          >
                            <TrashIcon className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </PermissionGate>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && renderPagination()}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        leadName={deleteModal.lead?.customer_name || ''}
        isDeleting={isDeleting}
      />
    </div>
  )
}

export default EnhancedLeadsList