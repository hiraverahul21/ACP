import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { branchesApi, companiesApi, apiUtils } from '@/utils/api'

interface Branch {
  id?: string
  name: string
  email: string
  phone?: string
  address: string
  city: string
  state: string
  pincode: string
  company_id: string
  branch_type?: 'MAIN_BRANCH' | 'GENERAL_BRANCH'
  is_active?: boolean
  created_at?: string
  company?: {
    id: string
    name: string
  }
}

interface Company {
  id: string
  name: string
  is_active: boolean
}

interface BranchFormProps {
  branch?: Branch | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedCompanyId?: string
}

const BranchForm: React.FC<BranchFormProps> = ({ 
  branch, 
  isOpen, 
  onClose, 
  onSuccess, 
  preselectedCompanyId 
}) => {
  const [formData, setFormData] = useState<Branch>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    company_id: preselectedCompanyId || '',
    branch_type: 'GENERAL_BRANCH',
  })
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(false)
  const [companiesLoading, setCompaniesLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      fetchCompanies()
    }
  }, [isOpen])

  useEffect(() => {
    if (branch) {
      setFormData({
        ...branch,
        company_id: branch.company_id || preselectedCompanyId || '',
        branch_type: branch.branch_type || 'GENERAL_BRANCH',
      })
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        company_id: preselectedCompanyId || '',
        branch_type: 'GENERAL_BRANCH',
      })
    }
    setError('')
  }, [branch, isOpen, preselectedCompanyId])

  const fetchCompanies = async () => {
    try {
      setCompaniesLoading(true)
      const response = await companiesApi.getActiveCompanies()
      setCompanies(response.data || [])
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setCompaniesLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Clean up form data - remove empty optional fields only (phone and email are optional)
      const cleanedData = { ...formData }
      
      // Remove empty optional fields to avoid validation errors
      if (!cleanedData.phone || cleanedData.phone.trim() === '') {
        delete cleanedData.phone
      }

      if (branch?.id) {
        await branchesApi.updateBranch(branch.id, cleanedData)
      } else {
        await branchesApi.createBranch(cleanedData)
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      setError(apiUtils.handleError(error))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {branch ? 'Edit Branch' : 'Add New Branch'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <Alert variant="error" message={error} />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company *
              </label>
              {companiesLoading ? (
                <div className="flex items-center justify-center py-2">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <select
                  name="company_id"
                  value={formData.company_id}
                  onChange={handleInputChange}
                  required
                  disabled={!!preselectedCompanyId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Type *
              </label>
              <select
                name="branch_type"
                value={formData.branch_type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="GENERAL_BRANCH">General Branch</option>
                <option value="MAIN_BRANCH">Main Branch (Central Store)</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Main Branch serves as the central store for inventory management
              </p>
            </div>

            <div className="md:col-span-2">
              <Input
                label="Branch Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter branch name"
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="branch@example.com"
            />

            <Input
              label="Phone"
              name="phone"
              value={formData.phone || ''}
              onChange={handleInputChange}
              placeholder="Enter phone number"
            />

            <div className="md:col-span-2">
              <Input
                label="Address"
                name="address"
                value={formData.address || ''}
                onChange={handleInputChange}
                required
                placeholder="Enter branch address (minimum 10 characters)"
              />
            </div>

            <Input
              label="City"
              name="city"
              value={formData.city || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter city"
            />

            <Input
              label="State"
              name="state"
              value={formData.state || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter state"
            />

            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode || ''}
              onChange={handleInputChange}
              required
              placeholder="Enter 6-digit pincode"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={loading || companiesLoading}
            >
              {branch ? 'Update Branch' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BranchForm