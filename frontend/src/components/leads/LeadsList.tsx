import React, { useState } from 'react'
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
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
}

interface LeadsListProps {
  leads: Lead[]
  onEdit: (lead: Lead) => void
  onDelete: (leadId: string) => void
  userRole: string
  isDeleting?: boolean
}

const LeadsList: React.FC<LeadsListProps> = ({ leads, onEdit, onDelete, userRole, isDeleting = false }) => {
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; lead: Lead | null }>({
    isOpen: false,
    lead: null,
  })

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
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'NEW': 'bg-blue-100 text-blue-800',
      'CONTACTED': 'bg-yellow-100 text-yellow-800',
      'QUALIFIED': 'bg-purple-100 text-purple-800',
      'QUOTED': 'bg-indigo-100 text-indigo-800',
      'CONVERTED': 'bg-green-100 text-green-800',
      'LOST': 'bg-red-100 text-red-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.replace('_', ' ')}
      </span>
    )
  }

  const getUrgencyBadge = (urgency: string) => {
    const urgencyColors = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'EMERGENCY': 'bg-red-100 text-red-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        urgencyColors[urgency as keyof typeof urgencyColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {urgency}
      </span>
    )
  }

  const formatServiceType = (serviceType: string) => {
    return serviceType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (leads.length === 0) {
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
            Get started by creating your first lead.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden lg:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer Details
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Urgency
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lead Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  #{lead.id.slice(-8).toUpperCase()}
                </td>
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {lead.lead_type || 'Not Specified'}
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
      <div className="lg:hidden">
        <div className="divide-y divide-gray-200">
          {leads.map((lead) => (
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
                  <div className="text-gray-900">{lead.lead_type || 'Not Specified'}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                <PermissionGate module="LEAD" action="EDIT">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(lead)}
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </PermissionGate>
                <PermissionGate module="LEAD" action="DELETE">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(lead)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        leadName={deleteModal.lead?.customer_name || ''}
      />
    </div>
  )
}

export default LeadsList