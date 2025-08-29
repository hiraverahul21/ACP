import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import { companiesApi, apiUtils } from '@/utils/api'

interface Company {
  id?: string
  name: string
  email: string
  phone?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gst_number?: string
  pan_number?: string
  subscription_plan?: 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
  subscription_expires_at?: string
  is_active?: boolean
  created_at?: string
}

interface CompanyFormProps {
  company?: Company | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CompanyForm: React.FC<CompanyFormProps> = ({ company, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<Company>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
    subscription_plan: 'BASIC',
    subscription_expires_at: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (company) {
      setFormData({
        ...company,
        subscription_expires_at: company.subscription_expires_at 
          ? new Date(company.subscription_expires_at).toISOString().split('T')[0]
          : '',
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
        gst_number: '',
        pan_number: '',
        subscription_plan: 'BASIC',
        subscription_expires_at: '',
      })
    }
    setError('')
  }, [company, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    // Format GST number to uppercase and validate format
    if (name === 'gst_number') {
      const formattedValue = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
      setFormData(prev => ({ ...prev, [name]: formattedValue }))
    } else if (name === 'pan_number') {
      // Format PAN number to uppercase
      const formattedValue = value.toUpperCase().replace(/[^0-9A-Z]/g, '')
      setFormData(prev => ({ ...prev, [name]: formattedValue }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const validateGSTNumber = (gst: string) => {
    if (!gst) return true // Optional field
    const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstPattern.test(gst)
  }

  const validatePANNumber = (pan: string) => {
    if (!pan) return true // Optional field
    const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panPattern.test(pan)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Client-side validation
    if (formData.gst_number && !validateGSTNumber(formData.gst_number)) {
      setError('Please provide a valid GST number (Format: 22AAAAA0000A1Z5)')
      setLoading(false)
      return
    }

    if (formData.pan_number && !validatePANNumber(formData.pan_number)) {
      setError('Please provide a valid PAN number (Format: AAAAA0000A)')
      setLoading(false)
      return
    }

    try {
      const submitData = {
        ...formData,
        subscription_expires_at: formData.subscription_expires_at 
          ? new Date(formData.subscription_expires_at).toISOString()
          : undefined,
      }

      if (company?.id) {
        await companiesApi.updateCompany(company.id, submitData)
      } else {
        await companiesApi.createCompany(submitData)
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
            {company ? 'Edit Company' : 'Add New Company'}
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
              <Input
                label="Company Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="Enter company name"
              />
            </div>

            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="company@example.com"
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
                placeholder="Enter company address"
              />
            </div>

            <Input
              label="City"
              name="city"
              value={formData.city || ''}
              onChange={handleInputChange}
              placeholder="Enter city"
            />

            <Input
              label="State"
              name="state"
              value={formData.state || ''}
              onChange={handleInputChange}
              placeholder="Enter state"
            />

            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode || ''}
              onChange={handleInputChange}
              placeholder="Enter pincode"
            />

            <div>
              <Input
                label="GST Number (Optional)"
                name="gst_number"
                value={formData.gst_number || ''}
                onChange={handleInputChange}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit/letter + Z + 1 digit/letter
              </p>
              {formData.gst_number && !validateGSTNumber(formData.gst_number) && (
                <p className="mt-1 text-xs text-red-600">
                  Invalid GST format. Example: 22AAAAA0000A1Z5
                </p>
              )}
            </div>

            <div>
              <Input
                label="PAN Number (Optional)"
                name="pan_number"
                value={formData.pan_number || ''}
                onChange={handleInputChange}
                placeholder="AAAAA0000A"
                maxLength={10}
              />
              <p className="mt-1 text-xs text-gray-500">
                Format: 5 letters + 4 digits + 1 letter
              </p>
              {formData.pan_number && !validatePANNumber(formData.pan_number) && (
                <p className="mt-1 text-xs text-red-600">
                  Invalid PAN format. Example: AAAAA0000A
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Plan
              </label>
              <select
                name="subscription_plan"
                value={formData.subscription_plan || 'BASIC'}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="BASIC">Basic</option>
                <option value="PREMIUM">Premium</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>

            <Input
              label="Subscription Expires At"
              name="subscription_expires_at"
              type="date"
              value={formData.subscription_expires_at || ''}
              onChange={handleInputChange}
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
              disabled={loading}
            >
              {company ? 'Update Company' : 'Create Company'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CompanyForm