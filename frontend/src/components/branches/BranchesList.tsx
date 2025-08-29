import React, { useState, useEffect } from 'react'
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { branchesApi, companiesApi, apiUtils } from '@/utils/api'
import BranchForm from './BranchForm'
import DeleteConfirmModal from '../companies/DeleteConfirmModal'

interface Branch {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  company_id: string
  is_active: boolean
  created_at: string
  company: {
    id: string
    name: string
    is_active: boolean
  }
  total_staff?: number
  active_staff?: number
}

interface Company {
  id: string
  name: string
  is_active: boolean
}

interface BranchesListProps {
  onBranchSelect?: (branch: Branch) => void
  companyId?: string // If provided, only show branches for this company
}

const BranchesList: React.FC<BranchesListProps> = ({ onBranchSelect, companyId }) => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState(companyId || '')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchBranches = async () => {
    try {
      setLoading(true)
      const response = await branchesApi.getBranches({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        company_id: selectedCompanyId || undefined,
        active_only: showActiveOnly || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      setBranches(response.data?.branches || [])
      setTotalPages(response.data?.pagination?.total_pages || 1)
      setTotalCount(response.data?.pagination?.total_count || 0)
      setError('')
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanies = async () => {
    try {
      const response = await companiesApi.getActiveCompanies()
      setCompanies(response.data || [])
    } catch (error: any) {
      console.error('Failed to fetch companies:', error)
    }
  }

  useEffect(() => {
    if (!companyId) {
      fetchCompanies()
    }
  }, [companyId])

  useEffect(() => {
    fetchBranches()
  }, [searchTerm, selectedCompanyId, showActiveOnly, sortBy, sortOrder, currentPage])

  // Reset to first page when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchTerm, selectedCompanyId, showActiveOnly, sortBy, sortOrder])

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch)
    setShowForm(true)
  }

  const handleAdd = () => {
    setSelectedBranch(null)
    setShowForm(true)
  }

  const handleDeleteClick = (branch: Branch) => {
    setBranchToDelete(branch)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!branchToDelete) return

    try {
      setActionLoading(branchToDelete.id)
      await branchesApi.deleteBranch(branchToDelete.id)
      await fetchBranches()
      setShowDeleteModal(false)
      setBranchToDelete(null)
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (branch: Branch) => {
    try {
      setActionLoading(branch.id)
      if (branch.is_active) {
        await branchesApi.deactivateBranch(branch.id)
      } else {
        await branchesApi.activateBranch(branch.id)
      }
      await fetchBranches()
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setActionLoading(null)
    }
  }

  const handleFormSuccess = () => {
    fetchBranches()
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4" />
    ) : (
      <ChevronDownIcon className="h-4 w-4" />
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {companyId ? 'Company Branches' : 'Branch Master'}
          </h1>
          <p className="text-gray-600">
            {companyId ? 'Manage branches for the selected company' : 'Manage branches across all companies'}
          </p>
        </div>
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Branch
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
        
        {!companyId && (
          <div className="min-w-[200px]">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activeOnly"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="activeOnly" className="text-sm text-gray-700">
            Active only
          </label>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}

      {/* Branches Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Branch</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                {!companyId && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                )}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Contact</span>
                    {getSortIcon('email')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('city')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Location</span>
                    {getSortIcon('city')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('is_active')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    {getSortIcon('is_active')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Created</span>
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.length === 0 ? (
                <tr>
                  <td colSpan={companyId ? 7 : 8} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || selectedCompanyId || showActiveOnly 
                      ? 'No branches found matching your criteria.' 
                      : 'No branches found. Add your first branch to get started.'}
                  </td>
                </tr>
              ) : (
                branches.map((branch) => (
                  <tr
                    key={branch.id}
                    className={`hover:bg-gray-50 ${onBranchSelect ? 'cursor-pointer' : ''}`}
                    onClick={() => onBranchSelect?.(branch)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                          <div className="text-sm text-gray-500">{branch.email}</div>
                        </div>
                      </div>
                    </td>
                    {!companyId && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{branch.company.name}</div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            branch.company.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {branch.company.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {branch.phone && (
                          <div className="text-sm text-gray-900">{branch.phone}</div>
                        )}
                        {branch.address && (
                          <div className="text-sm text-gray-500">{branch.address}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {branch.city && (
                          <div className="text-sm text-gray-900">{branch.city}</div>
                        )}
                        {branch.state && branch.pincode && (
                          <div className="text-sm text-gray-500">{branch.state} - {branch.pincode}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {branch.active_staff || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        branch.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(branch.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(branch)
                          }}
                          className="text-primary-600 hover:text-primary-900 transition-colors"
                          title="Edit branch"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(branch)
                          }}
                          disabled={actionLoading === branch.id}
                          className={`transition-colors ${
                            branch.is_active
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={branch.is_active ? 'Deactivate branch' : 'Activate branch'}
                        >
                          {actionLoading === branch.id ? (
                            <LoadingSpinner size="sm" />
                          ) : branch.is_active ? (
                            <XCircleIcon className="h-4 w-4" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(branch)
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete branch"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">{Math.min((currentPage - 1) * 10 + 1, totalCount)}</span>
                {' '}to{' '}
                <span className="font-medium">{Math.min(currentPage * 10, totalCount)}</span>
                {' '}of{' '}
                <span className="font-medium">{totalCount}</span>
                {' '}results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === pageNum
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Branch Form Modal */}
      <BranchForm
        branch={selectedBranch}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
        preselectedCompanyId={companyId}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Branch"
        message={`Are you sure you want to delete "${branchToDelete?.name}"? This action cannot be undone and will affect all associated staff.`}
        loading={actionLoading === branchToDelete?.id}
      />
    </div>
  )
}

export default BranchesList