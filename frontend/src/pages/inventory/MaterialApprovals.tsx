import React, { useState, useEffect } from 'react'
import { EyeIcon, ClockIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import MaterialApprovalForm from '@/components/inventory/MaterialApprovalForm'
import { useAuth } from '@/context/AuthContext'

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
    }
    created_by_staff: {
      name: string
      email: string
    }
  }
  approved_by_staff?: {
    name: string
    email: string
  }
  _count: {
    approval_items: number
  }
}

const MaterialApprovals: React.FC = () => {
  const { user } = useAuth()
  
  const [approvals, setApprovals] = useState<MaterialApproval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchApprovals()
  }, [])

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory/approvals', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setApprovals(data.data?.approvals || [])
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to fetch approvals')
      }
    } catch (error) {
      console.error('Error fetching approvals:', error)
      setError('Failed to fetch approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalSuccess = () => {
    setSelectedApprovalId(null)
    fetchApprovals() // Refresh the list
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

  const filteredApprovals = approvals.filter(approval => {
    const matchesStatus = statusFilter === 'ALL' || approval.status === statusFilter
    const matchesSearch = searchTerm === '' || 
      approval.issue.issue_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.issue.from_branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      approval.issue.purpose.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesStatus && matchesSearch
  })

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length
  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length
  const rejectedCount = approvals.filter(a => a.status === 'REJECTED').length
  const partialCount = approvals.filter(a => a.status === 'PARTIAL').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading material approvals...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div>


        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{approvedCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Rejected</p>
                <p className="text-2xl font-semibold text-gray-900">{rejectedCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Partial</p>
                <p className="text-2xl font-semibold text-gray-900">{partialCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by issue number, branch, or purpose..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ALL">All Status</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="PARTIAL">Partial</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Approvals Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredApprovals.length === 0 ? (
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No approvals found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {approvals.length === 0 
                  ? 'No material approvals have been assigned to you yet.'
                  : 'No approvals match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issue Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      From Branch
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredApprovals.map((approval) => (
                    <tr key={approval.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            #{approval.issue.issue_no}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(approval.issue.issue_date)}
                          </p>
                          {approval.issue.purpose && (
                            <p className="text-xs text-gray-400 mt-1">
                              {approval.issue.purpose.length > 30 
                                ? `${approval.issue.purpose.substring(0, 30)}...` 
                                : approval.issue.purpose}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">
                            {approval.issue.from_branch.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {approval.issue.from_branch.city}
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">
                            {approval.assigned_to_type === 'BRANCH' ? 'Branch' : 'Technician'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {approval.issue.created_by_staff.name}
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {approval._count.approval_items} items
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(approval.status)}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(approval.created_at)}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          onClick={() => setSelectedApprovalId(approval.id)}
                          variant="secondary"
                          size="sm"
                          className="inline-flex items-center"
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          {approval.status === 'PENDING' ? 'Review' : 'View'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Material Approval Form Modal */}
      {selectedApprovalId && (
        <MaterialApprovalForm
          approvalId={selectedApprovalId}
          onClose={() => setSelectedApprovalId(null)}
          onSuccess={handleApprovalSuccess}
        />
      )}
    </div>
  )
}

export default MaterialApprovals