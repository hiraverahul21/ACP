import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface LeadService {
  id?: string
  service_type: string
  description?: string
  frequency?: string
}

interface Lead {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  address: string
  city: string
  state: string
  pincode: string
  area?: string
  service_type: string
  property_type: string
  urgency_level: string
  status: string
  created_at: string
  assigned_to?: string
  assigned_staff_name?: string
  lead_generated_by?: string
  generated_by_staff_name?: string
  description?: string
  lead_type?: string
  preferred_date?: string
  preferred_time?: string
  lead_services?: LeadService[]
}

interface LeadFormProps {
  lead?: Lead | null
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  customer_name: string
  customer_email: string
  customer_phone: string
  address: string
  city: string
  state: string
  pincode: string
  area: string
  service_type: string
  property_type: string
  urgency_level: string
  description: string
  preferred_date: string
  preferred_time: string
  branch_id: string
  lead_generated_by: string
  lead_type: string
  lead_services: LeadService[]
}

interface FormErrors {
  [key: string]: string
}

const LeadForm: React.FC<LeadFormProps> = ({ lead, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    area: '',
    service_type: '',
    property_type: '',
    urgency_level: 'MEDIUM',
    description: '',
    preferred_date: '',
    preferred_time: '',
    branch_id: '',
    lead_generated_by: '',
    lead_type: '',
    lead_services: [{ service_type: '', description: '', frequency: '' }],
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Array<{id: string, name: string, city: string, state: string}>>([])
  const [staff, setStaff] = useState<Array<{id: string, name: string, role: string}>>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [loadingStaff, setLoadingStaff] = useState(false)

  // Fetch branches for current user's company
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingBranches(true)
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/branches/my-company', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setBranches(data.data.branches || [])
        } else {
          console.error('Failed to fetch branches')
        }
      } catch (error) {
        console.error('Error fetching branches:', error)
      } finally {
        setLoadingBranches(false)
      }
    }

    fetchBranches()
  }, [])

  // Fetch staff members for lead_generated_by dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setLoadingStaff(true)
        const token = localStorage.getItem('token')
        const response = await fetch('/api/leads/staff', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          setStaff(data.data || [])
        } else {
          console.error('Failed to fetch staff')
        }
      } catch (error) {
        console.error('Error fetching staff:', error)
      } finally {
        setLoadingStaff(false)
      }
    }

    fetchStaff()
  }, [])

  useEffect(() => {
    if (lead) {
      // Format preferred_date for input field (YYYY-MM-DD)
      let formattedDate = '';
      if (lead.preferred_date) {
        const date = new Date(lead.preferred_date);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toISOString().split('T')[0];
        }
      }

      setFormData({
        customer_name: lead.customer_name || '',
        customer_email: lead.customer_email || '',
        customer_phone: lead.customer_phone || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        pincode: lead.pincode || '',
        area: lead.area || '',
        service_type: lead.service_type || '',
        property_type: lead.property_type || '',
        urgency_level: lead.urgency_level || 'MEDIUM',
        description: lead.description || '',
        preferred_date: formattedDate,
        preferred_time: lead.preferred_time || '',
        branch_id: (lead as any).branch_id || '',
        lead_generated_by: lead.lead_generated_by || '',
        lead_type: lead.lead_type || '',
        lead_services: lead.lead_services && lead.lead_services.length > 0 
          ? lead.lead_services 
          : [{ service_type: lead.service_type || '', description: '', frequency: '' }],
      })
    }
  }, [lead])

  const serviceTypes = [
    { value: 'RESIDENTIAL_PEST_CONTROL', label: 'Residential Pest Control' },
    { value: 'COMMERCIAL_PEST_CONTROL', label: 'Commercial Pest Control' },
    { value: 'TERMITE_CONTROL', label: 'Termite Control' },
    { value: 'RODENT_CONTROL', label: 'Rodent Control' },
    { value: 'COCKROACH_CONTROL', label: 'Cockroach Control' },
    { value: 'ANT_CONTROL', label: 'Ant Control' },
    { value: 'MOSQUITO_CONTROL', label: 'Mosquito Control' },
    { value: 'BED_BUG_CONTROL', label: 'Bed Bug Control' },
    { value: 'BIRD_CONTROL', label: 'Bird Control' },
    { value: 'SNAKE_CONTROL', label: 'Snake Control' },
  ]

  const propertyTypes = [
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'INDEPENDENT_HOUSE', label: 'Independent House' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'SHOP', label: 'Shop' },
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'FACTORY', label: 'Factory' },
    { value: 'HOSPITAL', label: 'Hospital' },
    { value: 'SCHOOL', label: 'School' },
    { value: 'OTHER', label: 'Other' },
  ]

  const urgencyLevels = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'EMERGENCY', label: 'Emergency' },
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Handle lead services management
  const addLeadService = () => {
    setFormData(prev => ({
      ...prev,
      lead_services: [...prev.lead_services, { service_type: '', description: '', frequency: '' }]
    }))
  }

  const removeLeadService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      lead_services: prev.lead_services.filter((_, i) => i !== index)
    }))
  }

  const updateLeadService = (index: number, field: keyof LeadService, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      lead_services: prev.lead_services.map((service, i) => 
        i === index ? { ...service, [field]: value } : service
      )
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Customer name is required'
    } else if (formData.customer_name.trim().length < 2) {
      newErrors.customer_name = 'Customer name must be at least 2 characters'
    }

    if (!formData.customer_phone.trim()) {
      newErrors.customer_phone = 'Phone number is required'
    } else if (!/^[+]?[0-9]{10,15}$/.test(formData.customer_phone.replace(/\s/g, ''))) {
      newErrors.customer_phone = 'Please enter a valid phone number'
    }

    if (formData.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customer_email)) {
      newErrors.customer_email = 'Please enter a valid email address'
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required'
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters'
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required'
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required'
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required'
    } else if (!/^[0-9]{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'Pincode must be 6 digits'
    }

    if (!formData.lead_type.trim()) {
      newErrors.lead_type = 'Lead type is required'
    }

    // Validate lead services
    if (formData.lead_services.length === 0) {
      newErrors.lead_services = 'At least one service is required'
    } else {
      formData.lead_services.forEach((service, index) => {
        if (!service.service_type) {
          newErrors[`lead_service_${index}_type`] = 'Service type is required'
        }
      })
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      const token = localStorage.getItem('token')
      const url = lead ? `/api/leads/${lead.id}` : '/api/leads'
      const method = lead ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: formData.customer_name.trim(),
          customer_email: formData.customer_email.trim() || undefined,
          customer_phone: formData.customer_phone.trim(),
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          pincode: formData.pincode.trim(),
          area: formData.area.trim() || undefined,
          service_type: formData.lead_services[0]?.service_type || formData.service_type,
          property_type: formData.property_type,
          urgency_level: formData.urgency_level,
          description: formData.description.trim() || undefined,
          preferred_date: formData.preferred_date || undefined,
          preferred_time: formData.preferred_time || undefined,
          branch_id: formData.branch_id || undefined,
          lead_generated_by: formData.lead_generated_by || undefined,
          lead_type: formData.lead_type,
          lead_services: formData.lead_services.filter(service => service.service_type),
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const errorData = await response.json()
        console.error('Failed to save lead:', errorData)
        // Handle validation errors from server
        if (errorData.errors) {
          const serverErrors: FormErrors = {}
          errorData.errors.forEach((error: any) => {
            if (error.path) {
              serverErrors[error.path] = error.msg
            }
          })
          setErrors(serverErrors)
        }
      }
    } catch (error) {
      console.error('Error saving lead:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {lead ? 'Edit Lead' : 'Add New Lead'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      id="customer_name"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.customer_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter customer name"
                    />
                    {errors.customer_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="customer_phone"
                      name="customer_phone"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.customer_phone ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter phone number"
                    />
                    {errors.customer_phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_phone}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="customer_email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.customer_email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address (optional)"
                    />
                    {errors.customer_email && (
                      <p className="mt-1 text-sm text-red-600">{errors.customer_email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Location Information</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <textarea
                      id="address"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.address ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter complete address"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.city ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter city"
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.state ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter state"
                      />
                      {errors.state && (
                        <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                        Pincode *
                      </label>
                      <input
                        type="text"
                        id="pincode"
                        name="pincode"
                        value={formData.pincode}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                          errors.pincode ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Enter pincode"
                        maxLength={6}
                      />
                      {errors.pincode && (
                        <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="area" className="block text-sm font-medium text-gray-700 mb-1">
                      Area
                    </label>
                    <input
                      type="text"
                      id="area"
                      name="area"
                      value={formData.area}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.area ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter area/locality"
                    />
                    {errors.area && (
                      <p className="mt-1 text-sm text-red-600">{errors.area}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Service Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Branch
                    </label>
                    <select
                      id="branch_id"
                      name="branch_id"
                      value={formData.branch_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      disabled={loadingBranches}
                    >
                      <option value="">Select Branch (Optional)</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name} - {branch.city}, {branch.state}
                        </option>
                      ))}
                    </select>
                    {loadingBranches && (
                      <p className="mt-1 text-sm text-gray-500">Loading branches...</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lead_generated_by" className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Generated By
                    </label>
                    <select
                      id="lead_generated_by"
                      name="lead_generated_by"
                      value={formData.lead_generated_by}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      disabled={loadingStaff}
                    >
                      <option value="">Select Staff Member (Optional)</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.role.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    {loadingStaff && (
                      <p className="mt-1 text-sm text-gray-500">Loading staff...</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lead_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="lead_type"
                      name="lead_type"
                      value={formData.lead_type || ''}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.lead_type ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    >
                      <option value="">Select Lead Type</option>
                      <option value="ONCALL">Oncall</option>
                      <option value="AMC">AMC</option>
                    </select>
                    {errors.lead_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.lead_type}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="property_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Property Type *
                    </label>
                    <select
                      id="property_type"
                      name="property_type"
                      value={formData.property_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {propertyTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="urgency_level" className="block text-sm font-medium text-gray-700 mb-1">
                      Urgency Level *
                    </label>
                    <select
                      id="urgency_level"
                      name="urgency_level"
                      value={formData.urgency_level}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {urgencyLevels.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Services Required Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Services Required *</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLeadService}
                    className="text-xs"
                  >
                    Add Service
                  </Button>
                </div>
                {errors.lead_services && (
                  <p className="text-red-500 text-sm mb-2">{errors.lead_services}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Type *
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Frequency
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.lead_services.map((service, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <select
                              value={service.service_type}
                              onChange={(e) => updateLeadService(index, 'service_type', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                              required
                            >
                              <option value="">Select Service Type</option>
                              {serviceTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                  {type.label}
                                </option>
                              ))}
                            </select>
                            {errors[`lead_service_${index}_type`] && (
                              <p className="text-red-500 text-xs mt-1">{errors[`lead_service_${index}_type`]}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={service.frequency || ''}
                              onChange={(e) => updateLeadService(index, 'frequency', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                            >
                              <option value="">Select Frequency</option>
                              <option value="ONE_TIME">One Time</option>
                              <option value="WEEKLY">Weekly</option>
                              <option value="MONTHLY">Monthly</option>
                              <option value="QUARTERLY">Quarterly</option>
                              <option value="HALF_YEARLY">Half Yearly</option>
                              <option value="YEARLY">Yearly</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <textarea
                              value={service.description || ''}
                              onChange={(e) => updateLeadService(index, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                              rows={2}
                              placeholder="Describe the specific service requirements"
                            />
                          </td>
                          <td className="px-4 py-3">
                            {formData.lead_services.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeLeadService(index)}
                                className="text-red-600 hover:text-red-700 text-xs"
                              >
                                Remove
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
                {formData.lead_type === 'ONCALL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="preferred_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        id="preferred_date"
                        name="preferred_date"
                        value={formData.preferred_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-700 mb-1">
                        Preferred Time
                      </label>
                      <input
                        type="time"
                        id="preferred_time"
                        name="preferred_time"
                        value={formData.preferred_time}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe the pest problem or service requirements..."
                    maxLength={1000}
                  />
                </div>
              </div>


              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {lead ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    lead ? 'Update Lead' : 'Create Lead'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeadForm