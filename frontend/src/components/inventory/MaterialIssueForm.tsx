import React, { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ItemsList from './ItemsList'
import { useAuth } from '@/context/AuthContext'

interface Item {
  id: string
  name: string
  category: string
  base_uom: string
  hsn_code: string
  available_quantity: number
  available_uoms: string[]
  uom_conversions: {
    id: string
    from_uom: string
    to_uom: string
    conversion_factor: number
  }[]
}

interface Branch {
  id: string
  name: string
  city: string
  state: string
}

interface Technician {
  id: string
  name: string
  email: string
  mobile: string
  branch_id: string
  branch?: {
    id: string
    name: string
    branch_type: string
  }
}

interface IssueItem {
  item_id: string
  item_name?: string
  quantity: string
  issued_uom: string
  purpose: string
  batch_id?: string
  batch_no?: string
  expiry_date?: string
  balance_qty?: number
  rate_per_unit?: number
  gst_percentage?: number
  total_amount?: number
}

interface BatchInfo {
  id: string
  batch_no: string
  mfg_date: string
  expiry_date: string
  current_qty: number
  rate_per_unit: number
  gst_percentage: number
  days_until_expiry: number
  is_expiring_soon: boolean
}

interface MaterialIssueFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  issue_date: string
  from_location_id: string
  from_location_type: string
  to_location_id: string
  to_location_type: string
  issued_to_type: string // New field for BRANCH or TECHNICIAN
  issued_to: string
  purpose: string
  notes: string
  items: IssueItem[]
}

interface FormErrors {
  [key: string]: string
}

const MaterialIssueForm: React.FC<MaterialIssueFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth()
  
  const [formData, setFormData] = useState<FormData>(() => {
    const initialData: FormData = {
      issue_date: new Date().toISOString().split('T')[0],
      from_location_id: user?.branch_id || '',
      from_location_type: 'BRANCH',
      to_location_id: '',
      to_location_type: 'BRANCH',
      issued_to_type: 'BRANCH', // Default to BRANCH
      issued_to: '',
      purpose: '',
      notes: '',
      items: [{
        item_id: '',
        quantity: '',
        issued_uom: '',
        purpose: ''
      }]
    }

    return initialData
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [loadingTechnicians, setLoadingTechnicians] = useState(false)
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [selectingItemIndex, setSelectingItemIndex] = useState<number | null>(null)
  const [showBatchSelector, setShowBatchSelector] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [availableBatches, setAvailableBatches] = useState<BatchInfo[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [selectedTechnicianBranch, setSelectedTechnicianBranch] = useState<string | null>(null)
  const [availableItems, setAvailableItems] = useState<Item[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const locationTypes = [
    { value: 'BRANCH', label: 'Branch' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'STORE', label: 'Store' }
  ]



  useEffect(() => {
    // Load both branches and technicians since both options are available
    fetchBranches()
    fetchTechnicians()
  }, [user])

  useEffect(() => {
    // Fetch available items when source location changes
    if (formData.from_location_id && formData.from_location_type) {
      fetchAvailableItems()
    }
  }, [formData.from_location_id, formData.from_location_type])

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true)
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

  const fetchTechnicians = async () => {
    try {
      setLoadingTechnicians(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/staff/technicians', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTechnicians(data.data || [])
      } else {
        console.error('Failed to fetch technicians')
      }
    } catch (error) {
      console.error('Error fetching technicians:', error)
    } finally {
      setLoadingTechnicians(false)
    }
  }

  const fetchAvailableItems = async () => {
    try {
      setLoadingItems(true)
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        from_location_id: formData.from_location_id,
        from_location_type: formData.from_location_type
      })
      
      const response = await fetch(`/api/inventory/available-items?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAvailableItems(data.data || [])
      } else {
        console.error('Failed to fetch available items')
        setAvailableItems([])
      }
    } catch (error) {
      console.error('Error fetching available items:', error)
      setAvailableItems([])
    } finally {
      setLoadingItems(false)
    }
  }

  const getSelectedTechnicianBranchInfo = (technicianId: string) => {
    const selectedTech = technicians.find(tech => tech.id === technicianId)
    if (selectedTech && selectedTech.branch) {
      const isOwnBranch = selectedTech.branch.id === user?.branch_id
      return isOwnBranch 
        ? `Own Branch - ${selectedTech.branch.name}`
        : `Other Branch - ${selectedTech.branch.name}`
    }
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: value
      }
      
      // When issued_to_type changes, update to_location_type and clear to_location_id
      if (name === 'issued_to_type') {
        newData.to_location_type = value
        newData.to_location_id = ''
        setSelectedTechnicianBranch(null) // Clear branch info when changing type
      }
      
      // When technician is selected, update branch info
      if (name === 'to_location_id' && formData.issued_to_type === 'TECHNICIAN' && value) {
        const branchInfo = getSelectedTechnicianBranchInfo(value)
        setSelectedTechnicianBranch(branchInfo)
      } else if (name === 'to_location_id' && !value) {
        setSelectedTechnicianBranch(null)
      }
      
      return newData
    })
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleItemChange = (index: number, field: keyof IssueItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
    
    // Calculate total amount when quantity changes
    if (field === 'quantity' && typeof value === 'string') {
      setTimeout(() => calculateTotalAmount(index, value), 0)
    }
    
    const errorKey = `items.${index}.${field}`
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: '' }))
    }
  }

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        item_id: '',
        quantity: '',
        issued_uom: '',
        purpose: '',
        balance_qty: 0,
        rate_per_unit: 0,
        gst_percentage: 0,
        total_amount: 0
      }]
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  const handleItemSelect = async (item: Item) => {
    if (selectingItemIndex !== null) {
      setSelectedItem(item)
      setShowItemSelector(false)
      
      // Fetch available batches for the selected item
      await fetchItemBatches(item.id)
      setShowBatchSelector(true)
    }
  }

  const fetchItemBatches = async (itemId: string) => {
    try {
      setLoadingBatches(true)
      const params = new URLSearchParams({
        from_location_id: formData.from_location_id,
        from_location_type: formData.from_location_type
      })

      const response = await fetch(`/api/inventory/item-batches/${itemId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch batches')
      }

      const data = await response.json()
      setAvailableBatches(data.data || [])
    } catch (error) {
      console.error('Error fetching batches:', error)
      setAvailableBatches([])
    } finally {
      setLoadingBatches(false)
    }
  }

  const handleBatchSelect = (batch: BatchInfo) => {
    if (selectingItemIndex !== null && selectedItem) {
      handleItemChange(selectingItemIndex, 'item_id', selectedItem.id)
      handleItemChange(selectingItemIndex, 'item_name', selectedItem.name)
      handleItemChange(selectingItemIndex, 'uom', selectedItem.primary_uom)
      handleItemChange(selectingItemIndex, 'batch_id', batch.id)
      handleItemChange(selectingItemIndex, 'batch_no', batch.batch_no)
      handleItemChange(selectingItemIndex, 'expiry_date', batch.expiry_date)
      handleItemChange(selectingItemIndex, 'balance_qty', batch.current_qty)
      handleItemChange(selectingItemIndex, 'rate_per_unit', batch.rate_per_unit)
      handleItemChange(selectingItemIndex, 'gst_percentage', batch.gst_percentage)
      
      // Set initial quantity and calculate total amount
      handleItemChange(selectingItemIndex, 'quantity', '1')
      setTimeout(() => calculateTotalAmount(selectingItemIndex, '1'), 0)
      
      setShowBatchSelector(false)
      setSelectingItemIndex(null)
      setSelectedItem(null)
      setAvailableBatches([])
    }
  }

  const calculateTotalAmount = (index: number, quantity: string) => {
    const item = formData.items[index]
    if (item.rate_per_unit && quantity && !isNaN(Number(quantity))) {
      const qty = Number(quantity)
      const rate = item.rate_per_unit
      const gst = item.gst_percentage || 0
      
      const baseAmount = qty * rate
      const gstAmount = (baseAmount * gst) / 100
      const totalAmount = baseAmount + gstAmount
      
      handleItemChange(index, 'total_amount', totalAmount)
    } else {
      handleItemChange(index, 'total_amount', 0)
    }
  }

  const openItemSelector = (index: number) => {
    setSelectingItemIndex(index)
    setShowItemSelector(true)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required'
    }

    // Validate from_location_id for SUPERADMIN users
    if (user?.role === 'SUPERADMIN' && !formData.from_location_id) {
      newErrors.from_location_id = 'Source branch is required'
    }

    if (!formData.to_location_id) {
      if (formData.issued_to_type === 'BRANCH') {
        newErrors.to_location_id = 'Destination branch is required'
      } else if (formData.issued_to_type === 'TECHNICIAN') {
        newErrors.to_location_id = 'Technician is required'
      }
    }

    if (!formData.issued_to.trim()) {
      newErrors.issued_to = 'Issued to is required'
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required'
    }

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.item_id) {
        newErrors[`items.${index}.item_id`] = 'Item is required'
      }
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        newErrors[`items.${index}.quantity`] = 'Valid quantity is required'
      }
      if (!item.issued_uom) {
        newErrors[`items.${index}.issued_uom`] = 'UOM is required'
      }
    })

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
      
      // Prepare submission data based on role
      const submissionData = {
        ...formData,
        items: formData.items.filter(item => item.item_id && item.quantity).map(item => ({
          item_id: item.item_id,
          quantity: Number(item.quantity),
          issued_uom: item.issued_uom,
          purpose: item.purpose,
          ...(item.batch_id && { batch_id: item.batch_id })
        }))
      }

      // For SUPERADMIN, use the selected branch or user's branch as source
      if (user?.role === 'SUPERADMIN') {
        // Use the from_location_id from form data (should be a valid branch ID)
        submissionData.from_location_id = formData.from_location_id || user?.branch_id || ''
        submissionData.from_location_type = 'BRANCH'
      }

      const response = await fetch('/api/inventory/issue', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
        
        // Reset form to initial state
        const resetData: FormData = {
          issue_date: new Date().toISOString().split('T')[0],
          from_location_id: user?.branch_id || '',
          from_location_type: 'BRANCH',
          to_location_id: '',
          to_location_type: 'BRANCH',
          issued_to_type: 'BRANCH',
          issued_to: '',
          department: '',
          purpose: '',
          notes: '',
          items: [{
            item_id: '',
            quantity: '',
            issued_uom: '',
            purpose: ''
          }]
        }

        setFormData(resetData)
        onClose()
      } else {
        if (data.errors) {
          const fieldErrors: FormErrors = {}
          data.errors.forEach((error: any) => {
            if (error.path) {
              fieldErrors[error.path] = error.msg
            }
          })
          setErrors(fieldErrors)
        } else {
          setErrors({ general: data.message || 'Failed to create material issue' })
        }
      }
    } catch (error) {
      console.error('Error creating material issue:', error)
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Material Issue
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          {/* Issue Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <Input
                label="Issue Date *"
                name="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={handleInputChange}
                error={errors.issue_date}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issued To Type *
              </label>
              <select
                name="issued_to_type"
                value={formData.issued_to_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BRANCH">Branch</option>
                <option value="TECHNICIAN">Technician</option>
              </select>
              {errors.issued_to_type && (
                <p className="mt-1 text-sm text-red-600">{errors.issued_to_type}</p>
              )}
            </div>

            <div>
              <Input
                label="Issued To *"
                name="issued_to"
                value={formData.issued_to}
                onChange={handleInputChange}
                error={errors.issued_to}
                placeholder="Enter person/department name"
              />
            </div>



            {/* From Location */}
            {user?.role === 'SUPERADMIN' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Branch *
                </label>
                <select
                  name="from_location_id"
                  value={formData.from_location_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingBranches}
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.city}, {branch.state}
                    </option>
                  ))}
                </select>
                {errors.from_location_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.from_location_id}</p>
                )}
              </div>
            ) : (
              <div>
                <Input
                  label="From Branch"
                  name="from_location_display"
                  value={user?.branch?.name || 'Current Branch'}
                  disabled
                  className="bg-gray-50"
                />
              </div>
            )}

            {/* Dynamic To Location based on issued_to_type */}
            {formData.issued_to_type === 'BRANCH' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Branch *
                </label>
                <select
                  name="to_location_id"
                  value={formData.to_location_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingBranches}
                >
                  <option value="">Select Branch</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.city}, {branch.state}
                    </option>
                  ))}
                </select>
                {errors.to_location_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.to_location_id}</p>
                )}
              </div>
            )}

            {formData.issued_to_type === 'TECHNICIAN' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Technician *
                  </label>
                  <select
                    name="to_location_id"
                    value={formData.to_location_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTechnicians}
                  >
                    <option value="">Select Technician</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>
                        {tech.name} - {tech.email}
                      </option>
                    ))}
                  </select>
                  {errors.to_location_id && (
                    <p className="mt-1 text-sm text-red-600">{errors.to_location_id}</p>
                  )}
                </div>
                
                {/* Branch Information Display */}
                {selectedTechnicianBranch && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Branch Information
                    </label>
                    <div className={`px-3 py-2 border rounded-md bg-gray-50 text-sm font-medium ${
                      selectedTechnicianBranch.startsWith('Own Branch') 
                        ? 'border-green-300 text-green-700 bg-green-50' 
                        : 'border-blue-300 text-blue-700 bg-blue-50'
                    }`}>
                      {selectedTechnicianBranch}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-3">
              <Input
                label="Purpose *"
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                error={errors.purpose}
                placeholder="Enter purpose of material issue"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Items</h3>
              <Button type="button" variant="outline" onClick={addItem}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item *
                      </label>
                      <div className="flex">
                        <input
                          type="text"
                          value={item.item_name || ''}
                          readOnly
                          placeholder="Select item"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 focus:outline-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openItemSelector(index)}
                          className="rounded-l-none border-l-0"
                        >
                          Select
                        </Button>
                      </div>
                      {errors[`items.${index}.item_id`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.item_id`]}</p>
                      )}
                      {item.batch_no && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <div className="font-medium text-blue-900">Selected Batch: {item.batch_no}</div>
                          {item.balance_qty !== undefined && (
                            <div className="text-blue-700 mt-1">
                              Balance Quantity: {item.balance_qty} {(() => {
                                const selectedItem = availableItems.find(availItem => availItem.id === item.item_id);
                                return selectedItem?.base_uom || '';
                              })()}
                            </div>
                          )}
                          {item.expiry_date && (
                            <div className="text-blue-700 mt-1">
                              Expiry: {new Date(item.expiry_date).toLocaleDateString()}
                            </div>
                          )}
                          {item.rate_per_unit !== undefined && (
                             <div className="text-blue-700 mt-1">
                              Rate: ₹{Number(item.rate_per_unit).toFixed(2)} per {(() => {
                                const selectedItem = availableItems.find(availItem => availItem.id === item.item_id);
                                return selectedItem?.base_uom || '';
                              })()}
                            </div>
                           )}
                          {item.gst_percentage !== undefined && (
                            <div className="text-blue-700 mt-1">
                              GST: {item.gst_percentage}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                      {errors[`items.${index}.quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issued UOM *
                      </label>
                      <select
                        value={item.issued_uom}
                        onChange={(e) => handleItemChange(index, 'issued_uom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!item.item_id}
                      >
                        <option value="">Select UOM</option>
                        {item.item_id && (() => {
                          const selectedItem = availableItems.find(availItem => availItem.id === item.item_id);
                          return selectedItem?.available_uoms?.map(uom => (
                            <option key={uom} value={uom}>{uom}</option>
                          )) || [];
                        })()}
                      </select>
                      {errors[`items.${index}.issued_uom`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.issued_uom`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Cost
                      </label>
                      <input
                         type="text"
                         value={item.total_amount ? `₹${Number(item.total_amount).toFixed(2)}` : '₹0.00'}
                         readOnly
                         className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                         placeholder="₹0.00"
                       />
                    </div>

                    <div className="flex items-end">
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Purpose
                    </label>
                    <input
                      type="text"
                      value={item.purpose}
                      onChange={(e) => handleItemChange(index, 'purpose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Specific purpose for this item"
                    />
                  </div>
                </div>
              ))}
            </div>
            
            {/* Grand Total */}
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-700">Grand Total:</span>
                <span className="text-xl font-bold text-blue-600">
                   ₹{formData.items.reduce((total, item) => total + (Number(item.total_amount) || 0), 0).toFixed(2)}
                 </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any additional notes"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
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
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Creating...</span>
                </>
              ) : (
                'Create Issue'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Item Selector Modal */}
      {showItemSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Select Item</h3>
              <button
                onClick={() => {
                  setShowItemSelector(false)
                  setSelectingItemIndex(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <ItemsList 
                onItemSelect={handleItemSelect} 
                selectionMode={true}
                fromLocationId={formData.from_location_id}
                fromLocationType={formData.from_location_type}
              />
            </div>
          </div>
        </div>
      )}

      {/* Batch Selector Modal */}
      {showBatchSelector && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-70">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Select Batch</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Item: {selectedItem.name} | Available batches sorted by expiry date
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBatchSelector(false)
                  setSelectedItem(null)
                  setAvailableBatches([])
                  setSelectingItemIndex(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loadingBatches ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : availableBatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No available batches found for this item
                </div>
              ) : (
                <div className="space-y-3">
                  {availableBatches.map((batch) => (
                    <div
                      key={batch.id}
                      onClick={() => handleBatchSelect(batch)}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        batch.is_expiring_soon ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-gray-900">
                              Batch: {batch.batch_no}
                            </span>
                            {batch.is_expiring_soon && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                Expiring Soon
                              </span>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Available Qty:</span> {batch.current_qty}
                            </div>
                            <div>
                              <span className="font-medium">Expiry Date:</span> {new Date(batch.expiry_date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Mfg Date:</span> {new Date(batch.mfg_date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Days to Expiry:</span> 
                              <span className={batch.days_until_expiry <= 30 ? 'text-orange-600 font-medium' : ''}>
                                {batch.days_until_expiry} days
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            Rate: ₹{batch.rate_per_unit}
                          </div>
                          <div className="text-sm text-gray-500">
                            GST: {batch.gst_percentage}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialIssueForm