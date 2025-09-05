import React, { useState, useEffect } from 'react'
import { XMarkIcon, CheckIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useAuth } from '@/context/AuthContext'

interface ApprovalItem {
  id: string
  original_quantity: number
  original_uom: string
  original_base_amount: number
  original_gst_amount: number
  original_total_amount: number
  approved_quantity?: number
  approved_uom?: string
  approved_base_amount?: number
  approved_gst_amount?: number
  approved_total_amount?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  issue_item: {
    id: string
    quantity: number
    issued_uom: string
    purpose: string
    item: {
      id: string
      name: string
      category: string
      base_uom: string
      uom_conversions: {
        id: string
        from_uom: string
        to_uom: string
        conversion_factor: number
      }[]
    }
    batch: {
      id: string
      batch_no: string
      expiry_date: string
      gst_percentage: number
      rate_per_unit: number
    }
  }
}

interface MaterialApproval {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PARTIAL'
  assigned_to_type: 'BRANCH' | 'TECHNICIAN'
  assigned_to_id: string
  created_at: string
  approved_at?: string
  approved_by?: string
  remarks?: string
  rejection_reason?: string
  issue: {
    id: string
    issue_no: string
    issue_date: string
    purpose: string
    notes?: string
    status: string
    from_branch: {
      name: string
      city: string
      address?: string
    }
    created_by_staff: {
      name: string
      email: string
      mobile?: string
    }
  }
  approval_items: ApprovalItem[]
  approved_by_staff?: {
    name: string
    email: string
  }
}

interface MaterialApprovalFormProps {
  approvalId: string
  onClose: () => void
  onSuccess: () => void
}

interface ItemUpdate {
  approval_item_id: string
  status: 'APPROVED' | 'REJECTED'
  approved_quantity?: number
  approved_uom?: string
  approved_gst_amount?: number
  approved_total_amount?: number
}

const MaterialApprovalForm: React.FC<MaterialApprovalFormProps> = ({ 
  approvalId, 
  onClose, 
  onSuccess 
}) => {
  const { user } = useAuth()
  
  const [approval, setApproval] = useState<MaterialApproval | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [remarks, setRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [itemUpdates, setItemUpdates] = useState<ItemUpdate[]>([])
  const [isPartialMode, setIsPartialMode] = useState(false)

  useEffect(() => {
    fetchApprovalDetails()
  }, [approvalId])

  const fetchApprovalDetails = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/inventory/approvals/${approvalId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setApproval(data.data)
        
        // Initialize item updates with current values
        const initialUpdates = data.data.approval_items.map((item: ApprovalItem) => ({
          approval_item_id: item.id,
          status: 'APPROVED' as const,
          approved_quantity: item.original_quantity,
          approved_uom: item.original_uom,
          approved_gst_amount: item.original_gst_amount,
          approved_total_amount: item.original_total_amount
        }))
        setItemUpdates(initialUpdates)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch approval details')
      }
    } catch (error) {
      console.error('Error fetching approval details:', error)
      setError('Failed to fetch approval details')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      setProcessing(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/inventory/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remarks })
      })
      
      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to approve material issue')
      }
    } catch (error) {
      console.error('Error approving material issue:', error)
      setError('Failed to approve material issue')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required')
      return
    }

    try {
      setProcessing(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/inventory/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          rejection_reason: rejectionReason,
          remarks 
        })
      })
      
      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to reject material issue')
      }
    } catch (error) {
      console.error('Error rejecting material issue:', error)
      setError('Failed to reject material issue')
    } finally {
      setProcessing(false)
    }
  }

  const handlePartialAccept = async () => {
    // Validate quantities before submission
    for (const itemUpdate of itemUpdates) {
      if (itemUpdate.status === 'APPROVED') {
        const approvalItem = approval?.approval_items.find(ai => ai.id === itemUpdate.approval_item_id)
        if (approvalItem && itemUpdate.approved_quantity) {
          if (itemUpdate.approved_quantity > approvalItem.original_quantity) {
            setError(`Approved quantity (${itemUpdate.approved_quantity}) cannot exceed requested quantity (${approvalItem.original_quantity}) for item ${approvalItem.issue_item.item.name}`)
            return
          }
          if (itemUpdate.approved_quantity <= 0) {
            setError(`Approved quantity must be greater than 0 for item ${approvalItem.issue_item.item.name}`)
            return
          }
        }
      }
    }

    try {
      setProcessing(true)
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/inventory/approvals/${approvalId}/partial-accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          items: itemUpdates,
          remarks 
        })
      })
      
      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to process partial acceptance')
      }
    } catch (error) {
      console.error('Error processing partial acceptance:', error)
      setError('Failed to process partial acceptance')
    } finally {
      setProcessing(false)
    }
  }

  const updateItemStatus = (itemId: string, status: 'APPROVED' | 'REJECTED') => {
    setItemUpdates(prev => 
      prev.map(item => 
        item.approval_item_id === itemId 
          ? { ...item, status }
          : item
      )
    )
  }

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setItemUpdates(prev => 
      prev.map(item => {
        if (item.approval_item_id === itemId) {
          const approvalItem = approval?.approval_items.find(ai => ai.id === itemId)
          if (approvalItem) {
            const ratePerUnit = approvalItem.issue_item.batch.rate_per_unit
            const gstPercentage = approvalItem.issue_item.batch.gst_percentage
            
            // Get conversion factor for UOM conversion
            let conversionFactor = 1
            const originalUom = approvalItem.original_uom
            const baseUom = approvalItem.issue_item.item.base_uom
            
            // Get conversion info using the same logic as display
            const conversionInfo = getConversionInfo(approvalItem)
            let baseQuantityInBaseUom = quantity
            if (conversionInfo) {
              // For direct conversion (original to base), multiply by factor
              // For reverse conversion (base to original stored), divide by factor
              baseQuantityInBaseUom = conversionInfo.isDirect 
                ? quantity * conversionInfo.factor
                : quantity / conversionInfo.factor
            }
            
            // Calculate base amount using converted quantity
            const baseAmount = baseQuantityInBaseUom * ratePerUnit
            const gstAmount = baseAmount * gstPercentage / 100
            const totalAmount = baseAmount + gstAmount
            
            return {
              ...item,
              approved_quantity: quantity,
              approved_gst_amount: gstAmount,
              approved_total_amount: totalAmount
            }
          }
        }
        return item
      })
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING': { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon, text: 'Pending' },
      'APPROVED': { color: 'bg-green-100 text-green-800', icon: CheckIcon, text: 'Approved' },
      'REJECTED': { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Rejected' },
      'PARTIAL': { color: 'bg-blue-100 text-blue-800', icon: ClockIcon, text: 'Partial' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING
    const Icon = config.icon
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount)
  }

  const getConversionInfo = (approvalItem: ApprovalItem) => {
    const originalUom = approvalItem.original_uom
    const baseUom = approvalItem.issue_item.item.base_uom
    
    if (originalUom === baseUom) {
      return null
    }
    
    // First try to find direct conversion from original to base
    let conversion = approvalItem.issue_item.item.uom_conversions?.find(
      conv => conv.from_uom === originalUom && conv.to_uom === baseUom
    )
    
    if (conversion) {
      return {
        factor: conversion.conversion_factor,
        fromUom: originalUom,
        toUom: baseUom,
        isDirect: true
      }
    }
    
    // If not found, try reverse conversion (from base to original)
    conversion = approvalItem.issue_item.item.uom_conversions?.find(
      conv => conv.from_uom === baseUom && conv.to_uom === originalUom
    )
    
    if (conversion) {
      return {
        factor: conversion.conversion_factor,
        fromUom: originalUom,
        toUom: baseUom,
        isDirect: false
      }
    }
    
    return null
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading approval details...</p>
        </div>
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="text-center">
            <XCircleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Approval Not Found</h3>
            <p className="text-gray-600 mb-4">{error || 'The requested approval could not be found.'}</p>
            <Button onClick={onClose} variant="secondary">
              Close
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Material Issue Approval
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Issue #{approval.issue.issue_no}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Header Section */}
          <div className="p-6 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Issue ID
                </label>
                <p className="text-sm text-gray-900 font-mono">{approval.issue.issue_no}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Branch
                </label>
                <p className="text-sm text-gray-900">
                  {approval.issue.from_branch.name}, {approval.issue.from_branch.city}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {approval.assigned_to_type === 'BRANCH' ? 'To Branch' : 'To Technician'}
                </label>
                <p className="text-sm text-gray-900">
                  {approval.assigned_to_type === 'BRANCH' ? 'Branch Assignment' : 'Technician Assignment'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date
                </label>
                <p className="text-sm text-gray-900">
                  {formatDate(approval.issue.issue_date)}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div>{getStatusBadge(approval.status)}</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Created By
                </label>
                <p className="text-sm text-gray-900">
                  {approval.issue.created_by_staff.name}
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <p className="text-sm text-gray-900">
                  {approval.issue.purpose || 'Not specified'}
                </p>
              </div>
            </div>
            
            {approval.issue.notes && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <p className="text-sm text-gray-900 bg-white p-3 rounded border">
                  {approval.issue.notes}
                </p>
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items for Approval</h3>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GST %
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amounts
                    </th>
                    {isPartialMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approval.approval_items.map((item, index) => {
                    const itemUpdate = itemUpdates.find(u => u.approval_item_id === item.id)
                    return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {item.issue_item.item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {item.issue_item.item.category}
                            </p>
                            <p className="text-xs text-gray-400">
                              Purpose: {item.issue_item.purpose}
                            </p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm text-gray-900">
                              {item.issue_item.batch.batch_no}
                            </p>
                            <p className="text-sm text-gray-500">
                              Exp: {new Date(item.issue_item.batch.expiry_date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isPartialMode && itemUpdate?.status === 'APPROVED' ? (
                            <div>
                              <Input
                                type="number"
                                value={itemUpdate.approved_quantity || item.original_quantity}
                                onChange={(e) => updateItemQuantity(item.id, parseFloat(e.target.value) || 0)}
                                min="0"
                                max={item.original_quantity}
                                step="0.01"
                                className="w-24 text-sm"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {item.original_uom}
                              </p>
                              {(() => {
                                const conversionInfo = getConversionInfo(item)
                                if (conversionInfo) {
                                  const currentQty = itemUpdate.approved_quantity || item.original_quantity
                                  // For direct conversion (original to base), multiply by factor
                                  // For reverse conversion (base to original stored), divide by factor
                                  const baseQty = conversionInfo.isDirect 
                                    ? currentQty * conversionInfo.factor
                                    : currentQty / conversionInfo.factor
                                  return (
                                    <p className="text-xs text-blue-600 mt-1">
                                      = {baseQty.toFixed(3)} {conversionInfo.toUom}
                                    </p>
                                  )
                                }
                                return null
                              })()}
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-gray-900">
                                {item.original_quantity} {item.original_uom}
                              </p>
                              <p className="text-xs text-gray-500">
                                Base: {(() => {
                                  const conversionInfo = getConversionInfo(item)
                                  if (conversionInfo) {
                                    // For direct conversion (original to base), multiply by factor
                                    // For reverse conversion (base to original stored), divide by factor
                                    const baseQty = conversionInfo.isDirect 
                                      ? item.original_quantity * conversionInfo.factor
                                      : item.original_quantity / conversionInfo.factor
                                    return `${baseQty.toFixed(3)} ${conversionInfo.toUom}`
                                  }
                                  return `${item.original_quantity} ${item.issue_item.item.base_uom}`
                                })()}
                              </p>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {item.issue_item.batch.gst_percentage}%
                          </p>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <p className="text-gray-900">
                              Base: {formatCurrency(itemUpdate?.approved_gst_amount ? 
                                (itemUpdate.approved_total_amount! - itemUpdate.approved_gst_amount) : 
                                item.original_base_amount)}
                            </p>
                            <p className="text-gray-600">
                              GST: {formatCurrency(itemUpdate?.approved_gst_amount || item.original_gst_amount)}
                            </p>
                            <p className="text-gray-900 font-medium">
                              Total: {formatCurrency(itemUpdate?.approved_total_amount || item.original_total_amount)}
                            </p>
                          </div>
                        </td>
                        
                        {isPartialMode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => updateItemStatus(item.id, 'APPROVED')}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  itemUpdate?.status === 'APPROVED'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                                }`}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => updateItemStatus(item.id, 'REJECTED')}
                                className={`px-3 py-1 rounded text-xs font-medium ${
                                  itemUpdate?.status === 'REJECTED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                                }`}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Section */}
          {approval.status === 'PENDING' && (
            <div className="p-6 bg-gray-50 border-t border-gray-200">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any remarks or comments..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason {isPartialMode ? '(for rejected items)' : '(required for rejection)'}
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={isPartialMode ? "Reason for rejecting specific items..." : "Reason for rejecting this material issue..."}
                  />
                </div>
                
                <div className="flex flex-wrap gap-3">
                  {!isPartialMode ? (
                    <>
                      <Button
                        onClick={handleApprove}
                        loading={processing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckIcon className="w-4 h-4 mr-2" />
                        Approve All
                      </Button>
                      
                      <Button
                        onClick={() => setIsPartialMode(true)}
                        variant="secondary"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        Partial Accept
                      </Button>
                      
                      <Button
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            setError('Please provide a rejection reason')
                            return
                          }
                          handleReject()
                        }}
                        loading={processing}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XCircleIcon className="w-4 h-4 mr-2" />
                        Reject All
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={handlePartialAccept}
                        loading={processing}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Process Partial Acceptance
                      </Button>
                      
                      <Button
                        onClick={() => setIsPartialMode(false)}
                        variant="secondary"
                      >
                        Cancel Partial Mode
                      </Button>
                    </>
                  )}
                  
                  <Button
                    onClick={onClose}
                    variant="secondary"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MaterialApprovalForm