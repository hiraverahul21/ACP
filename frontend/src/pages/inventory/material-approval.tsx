import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import { useAuth } from '@/context/AuthContext'
import { PermissionGate } from '@/context/PermissionContext'
import { useRouter } from 'next/router'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CubeIcon,
  BuildingOfficeIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline'

interface MaterialIssueItem {
  id: string
  quantity: number
  item: {
    name: string
    category: string
    base_uom: string
  }
  batch: {
    batch_no: string
    expiry_date: string
  }
}

interface MaterialIssue {
  id: string
  issue_no: string
  issue_date: string
  from_location_type: string
  to_location_type: string
  status: string
  remarks?: string
  created_by_staff: {
    name: string
    role: string
  }
  from_branch?: {
    name: string
  }
  issue_items: MaterialIssueItem[]
}

interface PaginationInfo {
  current_page: number
  total_pages: number
  total_records: number
  per_page: number
}

const MaterialApprovalPage: React.FC = () => {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [issues, setIssues] = useState<MaterialIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_records: 0,
    per_page: 20
  })
  const [selectedIssue, setSelectedIssue] = useState<MaterialIssue | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [remarks, setRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  const handleNavClick = (href: string) => {
    router.push(href)
  }

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
      current: false,
    },
    ...((user?.role === 'ADMIN' || user?.role === 'TECHNICIAN') ? [
      {
        name: 'Material Approval',
        href: '/inventory/material-approval',
        icon: CheckCircleIcon,
        current: true,
      }
    ] : []),
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
  ]

  const fetchPendingIssues = async (page = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/inventory/issues/pending?page=${page}&limit=20`, {
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending issues')
      }
      
      const data = await response.json()
      setIssues(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching pending issues:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = (issue: MaterialIssue) => {
    setSelectedIssue(issue)
    setActionType('approve')
    setRemarks('')
    setShowModal(true)
  }

  const handleReject = (issue: MaterialIssue) => {
    setSelectedIssue(issue)
    setActionType('reject')
    setRejectionReason('')
    setShowModal(true)
  }

  const processAction = async () => {
    if (!selectedIssue || !actionType) return

    try {
      setProcessing(true)
      const endpoint = actionType === 'approve' ? 'approve' : 'reject'
      const body = actionType === 'approve' 
        ? { remarks }
        : { rejection_reason: rejectionReason }

      const response = await fetch(`/api/inventory/issues/${selectedIssue.id}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error(`Failed to ${actionType} material issue`)
      }

      // Refresh the list
      await fetchPendingIssues(pagination.current_page)
      setShowModal(false)
      setSelectedIssue(null)
      setActionType(null)
    } catch (error) {
      console.error(`Error ${actionType}ing material issue:`, error)
      alert(`Failed to ${actionType} material issue. Please try again.`)
    } finally {
      setProcessing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getLocationTypeLabel = (locationType: string) => {
    switch (locationType) {
      case 'CENTRAL_STORE':
        return 'Central Store'
      case 'BRANCH':
        return 'Branch Store'
      case 'TECHNICIAN':
        return 'Technician'
      default:
        return locationType
    }
  }

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'TECHNICIAN')) {
      fetchPendingIssues()
    } else if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user.role !== 'ADMIN' && user.role !== 'TECHNICIAN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Material Approval - Pest Control Management</title>
        <meta name="description" content="Approve or reject pending material issues" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}>
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
                const Icon = item.icon
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
                )
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

        {/* Overlay for mobile */}
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
                    <h1 className="text-2xl font-bold text-gray-900">
                      Material Approval
                    </h1>
                    <p className="text-sm text-gray-600">
                      Review and approve pending material issues
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{user.role}</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="px-4 sm:px-6 lg:px-8 py-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">Pending Approvals</h3>
                      <p className="text-sm text-gray-600">Material issues awaiting your approval</p>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {pagination.total_records}
                    </div>
                  </div>
                </div>

                {/* Issues List */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  {issues.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No pending approvals</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        All material issues have been processed.
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
                              From/To
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Items
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Issued By
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {issues.map((issue) => (
                            <tr key={issue.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {issue.issue_no}
                                  </div>
                                  <div className="text-sm text-gray-500 flex items-center">
                                    <CalendarIcon className="h-4 w-4 mr-1" />
                                    {formatDate(issue.issue_date)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  <div className="flex items-center">
                                    <BuildingStorefrontIcon className="h-4 w-4 mr-1 text-gray-400" />
                                    {getLocationTypeLabel(issue.from_location_type)}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">↓</div>
                                  <div className="flex items-center">
                                    <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                                    {getLocationTypeLabel(issue.to_location_type)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900">
                                  {issue.issue_items.length} item(s)
                                </div>
                                <div className="text-xs text-gray-500 max-w-xs">
                                  {issue.issue_items.slice(0, 2).map((item, idx) => (
                                    <div key={idx}>
                                      {item.item.name} ({item.quantity} {item.item.base_uom})
                                    </div>
                                  ))}
                                  {issue.issue_items.length > 2 && (
                                    <div className="text-blue-600">+{issue.issue_items.length - 2} more</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {issue.created_by_staff.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {issue.created_by_staff.role}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <PermissionGate module="MATERIAL" action="APPROVE">
                                  <Button
                                    onClick={() => handleApprove(issue)}
                                    variant="success"
                                    size="sm"
                                  >
                                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </PermissionGate>
                                <PermissionGate module="MATERIAL" action="APPROVE">
                                  <Button
                                    onClick={() => handleReject(issue)}
                                    variant="danger"
                                    size="sm"
                                  >
                                    <XCircleIcon className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </PermissionGate>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 rounded-lg shadow">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <Button
                        onClick={() => fetchPendingIssues(pagination.current_page - 1)}
                        disabled={pagination.current_page === 1}
                        variant="outline"
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={() => fetchPendingIssues(pagination.current_page + 1)}
                        disabled={pagination.current_page === pagination.total_pages}
                        variant="outline"
                      >
                        Next
                      </Button>
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
                          {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => fetchPendingIssues(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === pagination.current_page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Approval/Rejection Modal */}
        {showModal && selectedIssue && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${
                      actionType === 'approve' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {actionType === 'approve' ? (
                        <CheckCircleIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircleIcon className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {actionType === 'approve' ? 'Approve' : 'Reject'} Material Issue
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500 mb-4">
                          Issue No: <span className="font-medium">{selectedIssue.issue_no}</span>
                        </p>
                        
                        {/* Issue Items */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
                          <div className="max-h-32 overflow-y-auto">
                            {selectedIssue.issue_items.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-b-0">
                                <div className="font-medium">{item.item.name}</div>
                                <div>Qty: {item.quantity} {item.item.base_uom} | Batch: {item.batch.batch_no}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {actionType === 'approve' ? (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Remarks (Optional)
                            </label>
                            <textarea
                              value={remarks}
                              onChange={(e) => setRemarks(e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Add any remarks for this approval..."
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rejection Reason *
                            </label>
                            <textarea
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              rows={3}
                              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Please provide a reason for rejection..."
                              required
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    onClick={processAction}
                    disabled={processing || (actionType === 'reject' && !rejectionReason.trim())}
                    variant={actionType === 'approve' ? 'success' : 'danger'}
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    {processing ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowModal(false)
                      setSelectedIssue(null)
                      setActionType(null)
                      setRemarks('')
                      setRejectionReason('')
                    }}
                    variant="outline"
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default MaterialApprovalPage