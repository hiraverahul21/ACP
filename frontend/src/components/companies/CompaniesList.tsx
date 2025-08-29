import React, { useState, useEffect } from 'react'
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { companiesApi, apiUtils } from '@/utils/api'
import CompanyForm from './CompanyForm'
import DeleteConfirmModal from './DeleteConfirmModal'

interface Company {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gst_number?: string
  pan_number?: string
  subscription_plan: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  subscription_expires_at?: string
  is_active: boolean
  created_at: string
  total_branches?: number
  active_branches?: number
  total_staff?: number
  active_staff?: number
}

interface CompaniesListProps {
  onCompanySelect?: (company: Company) => void
}

const CompaniesList: React.FC<CompaniesListProps> = ({ onCompanySelect }) => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [pagination, setPagination] = useState<any>({})
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      const response = await companiesApi.getCompanies({
        search: searchTerm || undefined,
        active_only: showActiveOnly || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      })
      // Handle nested response structure: response.data.companies
      setCompanies(response.data?.companies || [])
      setPagination(response.data?.pagination || {})
      setError('')
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [searchTerm, showActiveOnly, sortBy, sortOrder])

  const handleEdit = (company: Company) => {
    setSelectedCompany(company)
    setShowForm(true)
  }

  const handleAdd = () => {
    setSelectedCompany(null)
    setShowForm(true)
  }

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!companyToDelete) return

    try {
      setActionLoading(companyToDelete.id)
      await companiesApi.deleteCompany(companyToDelete.id)
      await fetchCompanies()
      setShowDeleteModal(false)
      setCompanyToDelete(null)
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setActionLoading(null)
    }
  }

  const handleToggleStatus = async (company: Company) => {
    try {
      setActionLoading(company.id)
      if (company.is_active) {
        await companiesApi.deactivateCompany(company.id)
      } else {
        await companiesApi.activateCompany(company.id)
      }
      await fetchCompanies()
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setActionLoading(null)
    }
  }

  const handleFormSuccess = () => {
    fetchCompanies()
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
    if (sortBy !== column) {
      return null
    }
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

  const getSubscriptionBadgeColor = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-800'
      case 'PREMIUM':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
      <div className="flex justify-end">
        <Button onClick={handleAdd} className="flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
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

      {/* Companies Table */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Company
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Contact
                    {getSortIcon('email')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('subscription_plan')}
                >
                  <div className="flex items-center gap-1">
                    Subscription
                    {getSortIcon('subscription_plan')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branches/Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('is_active')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon('is_active')}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {getSortIcon('created_at')}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || showActiveOnly ? 'No companies found matching your criteria.' : 'No companies found. Add your first company to get started.'}
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr
                    key={company.id}
                    className={`hover:bg-gray-50 ${onCompanySelect ? 'cursor-pointer' : ''}`}
                    onClick={() => onCompanySelect?.(company)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        {company.gst_number && (
                          <div className="text-sm text-gray-500">GST: {company.gst_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{company.email}</div>
                        {company.phone && (
                          <div className="text-sm text-gray-500">{company.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSubscriptionBadgeColor(company.subscription_plan)}`}>
                          {company.subscription_plan}
                        </span>
                        {company.subscription_expires_at && (
                          <div className="text-xs text-gray-500 mt-1">
                            Expires: {formatDate(company.subscription_expires_at)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {`${company.active_branches || 0} / ${company.active_staff || 0}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        company.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(company.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(company)
                          }}
                          className="text-primary-600 hover:text-primary-900 transition-colors"
                          title="Edit company"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(company)
                          }}
                          disabled={actionLoading === company.id}
                          className={`transition-colors ${
                            company.is_active
                              ? 'text-red-600 hover:text-red-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={company.is_active ? 'Deactivate company' : 'Activate company'}
                        >
                          {actionLoading === company.id ? (
                            <LoadingSpinner size="sm" />
                          ) : company.is_active ? (
                            <XCircleIcon className="h-4 w-4" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(company)
                          }}
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete company"
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

      {/* Company Form Modal */}
      <CompanyForm
        company={selectedCompany}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Company"
        message={`Are you sure you want to delete "${companyToDelete?.name}"? This action cannot be undone and will affect all associated branches and staff.`}
        loading={actionLoading === companyToDelete?.id}
      />
    </div>
  )
}

export default CompaniesList