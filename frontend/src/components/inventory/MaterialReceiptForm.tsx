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
  base_uom: string
  secondary_uom?: string
}

interface Branch {
  id: string
  name: string
  city: string
  state: string
}

interface ReceiptItem {
  item_id: string
  item_name?: string
  batch_no: string
  mfg_date: string
  expiry_date: string
  quantity: string
  uom: string
  rate_per_unit: string
  gst_percentage: string
}

interface MaterialReceiptFormProps {
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  receipt_date: string
  vendor_name: string
  vendor_invoice_no: string
  vendor_invoice_date: string
  from_location_type?: string
  from_location_id?: string
  to_location_id: string
  to_location_type: string
  items: ReceiptItem[]
}

interface FormErrors {
  [key: string]: string
}

const MaterialReceiptForm: React.FC<MaterialReceiptFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth()
  
  // Don't render the form until user data is loaded
  if (!user) {
    return <LoadingSpinner />
  }
  
  const getDefaultLocationType = () => {
    if (user?.role === 'SUPERADMIN') return 'WAREHOUSE'
    if (user?.role === 'ADMIN' && (user?.branch?.branch_type === 'MAIN_BRANCH' || user?.branch?.branch_type === 'MAIN')) {
      return 'WAREHOUSE'
    }
    return 'BRANCH'
  }
  
  const [formData, setFormData] = useState<FormData>({
    receipt_date: new Date().toISOString().split('T')[0],
    vendor_name: '',
    vendor_invoice_no: '',
    vendor_invoice_date: '',
    from_location_type: undefined, // Don't set for external vendor purchases
    from_location_id: undefined,
    to_location_id: '',
    to_location_type: getDefaultLocationType(),
    items: [{
      item_id: '',
      batch_no: '',
      mfg_date: '',
      expiry_date: '',
      quantity: '',
      uom: '',
      rate_per_unit: '',
      gst_percentage: '18'
    }]
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [mainBranch, setMainBranch] = useState<Branch | null>(null)
  const [loadingMainBranch, setLoadingMainBranch] = useState(false)
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [selectingItemIndex, setSelectingItemIndex] = useState<number | null>(null)

  // Location types based on user role
  const getLocationTypes = () => {
    if (user?.role === 'SUPERADMIN') {
      return [
        { value: 'WAREHOUSE', label: 'Central Store' },
        { value: 'BRANCH', label: 'Branch' }
      ]
    }
    // Allow ADMIN users from MAIN_BRANCH to access warehouse
    if (user?.role === 'ADMIN' && (user?.branch?.branch_type === 'MAIN_BRANCH' || user?.branch?.branch_type === 'MAIN')) {
      return [
        { value: 'WAREHOUSE', label: 'Central Store' },
        { value: 'BRANCH', label: 'Branch' }
      ]
    }
    return [
      { value: 'BRANCH', label: 'Branch' }
    ]
  }

  const locationTypes = getLocationTypes()

  const uomOptions = [
    'pcs', 'kg', 'litre', 'meter', 'box', 'packet', 'bottle', 'gallon', 'gm', 'ml'
  ]

  useEffect(() => {
    if (formData.to_location_type === 'BRANCH') {
      fetchBranches()
    } else if (formData.to_location_type === 'WAREHOUSE') {
      fetchMainBranch()
    }
  }, [formData.to_location_type])

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
        let availableBranches = data.data.branches || []
        
        // Filter branches based on user role
        if (user?.role === 'ADMIN') {
          // ADMIN users from MAIN_BRANCH can see all branches including main branch
          // Other ADMIN users see all branches except main branch
          if (user?.branch?.branch_type !== 'MAIN_BRANCH' && user?.branch?.branch_type !== 'MAIN') {
            availableBranches = availableBranches.filter((branch: Branch) => branch.branch_type !== 'MAIN_BRANCH' && branch.branch_type !== 'MAIN')
          }
        }
        // SUPERADMIN users see all branches (no filtering needed)
        
        setBranches(availableBranches)
      } else {
        console.error('Failed to fetch branches')
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      setLoadingBranches(false)
    }
  }

  const fetchMainBranch = async () => {
    try {
      setLoadingMainBranch(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/branches/my-company', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        const branches = data.data.branches || []
        const mainBranch = branches.find((branch: any) => branch.branch_type === 'MAIN_BRANCH')
        setMainBranch(mainBranch || null)
      } else {
        console.error('Failed to fetch main branch')
      }
    } catch (error) {
      console.error('Error fetching main branch:', error)
    } finally {
      setLoadingMainBranch(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Handle location type change
    if (name === 'to_location_type') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        to_location_id: '' // Reset location selection when type changes
      }))
      
      // Fetch branches or main branch based on selection
      if (value === 'BRANCH') {
        fetchBranches()
        setMainBranch(null) // Reset main branch when switching to branch
      } else if (value === 'WAREHOUSE') {
        fetchMainBranch()
        setBranches([]) // Reset branches when switching to warehouse
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
    
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
        batch_no: '',
        mfg_date: '',
        expiry_date: '',
        quantity: '',
        uom: '',
        rate_per_unit: '',
        gst_percentage: '18'
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

  const handleItemSelect = (item: Item) => {
    if (selectingItemIndex !== null) {
      handleItemChange(selectingItemIndex, 'item_id', item.id)
      handleItemChange(selectingItemIndex, 'item_name', item.name)
      handleItemChange(selectingItemIndex, 'uom', item.base_uom)
      setShowItemSelector(false)
      setSelectingItemIndex(null)
    }
  }

  const openItemSelector = (index: number) => {
    setSelectingItemIndex(index)
    setShowItemSelector(true)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.receipt_date) {
      newErrors.receipt_date = 'Receipt date is required'
    }

    if (!formData.vendor_name.trim()) {
      newErrors.vendor_name = 'Vendor name is required'
    }

    if (!formData.to_location_id) {
      newErrors.to_location_id = 'Destination location is required'
    }

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.item_id) {
        newErrors[`items.${index}.item_id`] = 'Item is required'
      }
      if (!item.batch_no.trim()) {
        newErrors[`items.${index}.batch_no`] = 'Batch number is required'
      }
      if (!item.quantity || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
        newErrors[`items.${index}.quantity`] = 'Valid quantity is required'
      }
      if (!item.uom) {
        newErrors[`items.${index}.uom`] = 'UOM is required'
      }
      if (!item.rate_per_unit || isNaN(Number(item.rate_per_unit)) || Number(item.rate_per_unit) <= 0) {
        newErrors[`items.${index}.rate_per_unit`] = 'Valid rate is required'
      }
      if (!item.mfg_date) {
        newErrors[`items.${index}.mfg_date`] = 'Manufacturing date is required'
      }
      if (item.expiry_date && new Date(item.expiry_date) <= new Date(item.mfg_date)) {
        newErrors[`items.${index}.expiry_date`] = 'Expiry date must be after manufacturing date'
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
      const payload = {
        ...formData,
        approved_by: null, // Will be set by backend based on user role
        items: formData.items.map(item => ({
          ...item,
          issued_uom: item.uom, // Map uom to issued_uom for backend
          quantity: Number(item.quantity),
          rate_per_unit: Number(item.rate_per_unit),
          gst_percentage: Number(item.gst_percentage)
        }))
      }

      const response = await fetch('/api/inventory/receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        onSuccess()
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
          // Display the actual API error message
          const errorMessage = data.error?.message || data.message || 'Failed to create material receipt'
          setErrors({ general: errorMessage })
        }
      }
    } catch (error) {
      console.error('Error creating material receipt:', error)
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateItemTotal = (item: ReceiptItem) => {
    const quantity = Number(item.quantity) || 0
    const rate = Number(item.rate_per_unit) || 0
    const gst = Number(item.gst_percentage) || 0
    const subtotal = quantity * rate
    const gstAmount = (subtotal * gst) / 100
    return subtotal + gstAmount
  }

  const calculateGrandTotal = () => {
    return formData.items.reduce((total, item) => total + calculateItemTotal(item), 0)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Material Receipt
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

          {/* Receipt Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <Input
                label="Receipt Date *"
                name="receipt_date"
                type="date"
                value={formData.receipt_date}
                onChange={handleInputChange}
                error={errors.receipt_date}
              />
            </div>

            <div>
              <Input
                label="Vendor Name *"
                name="vendor_name"
                value={formData.vendor_name}
                onChange={handleInputChange}
                error={errors.vendor_name}
                placeholder="Enter vendor name"
              />
            </div>

            <div>
              <Input
                label="Vendor Invoice No"
                name="vendor_invoice_no"
                value={formData.vendor_invoice_no}
                onChange={handleInputChange}
                error={errors.vendor_invoice_no}
                placeholder="Enter invoice number"
              />
            </div>

            <div>
              <Input
                label="Vendor Invoice Date"
                name="vendor_invoice_date"
                type="date"
                value={formData.vendor_invoice_date}
                onChange={handleInputChange}
                error={errors.vendor_invoice_date}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Type *
              </label>
              <select
                name="to_location_type"
                value={formData.to_location_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {locationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination Location *
              </label>
              {formData.to_location_type === 'WAREHOUSE' ? (
                <select
                  name="to_location_id"
                  value={formData.to_location_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingMainBranch}
                >
                  <option value="">Select Warehouse</option>
                  {mainBranch ? (
                    <option value={mainBranch.id}>
                      {mainBranch.name} - {mainBranch.city} (Main Branch)
                    </option>
                  ) : (
                    !loadingMainBranch && <option value="" disabled>No main branch found</option>
                  )}
                </select>
              ) : (
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
                      {branch.name} - {branch.city}
                    </option>
                  ))}
                </select>
              )}
              {errors.to_location_id && (
                <p className="mt-1 text-sm text-red-600">{errors.to_location_id}</p>
              )}
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Batch No *
                      </label>
                      <input
                        type="text"
                        value={item.batch_no}
                        onChange={(e) => handleItemChange(index, 'batch_no', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Batch number"
                      />
                      {errors[`items.${index}.batch_no`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.batch_no`]}</p>
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
                        UOM *
                      </label>
                      <select
                        value={item.uom}
                        onChange={(e) => handleItemChange(index, 'uom', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select UOM</option>
                        {uomOptions.map(uom => (
                          <option key={uom} value={uom}>{uom}</option>
                        ))}
                      </select>
                      {errors[`items.${index}.uom`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.uom`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.rate_per_unit}
                        onChange={(e) => handleItemChange(index, 'rate_per_unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                      {errors[`items.${index}.rate_per_unit`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.rate_per_unit`]}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mfg Date *
                      </label>
                      <input
                        type="date"
                        value={item.mfg_date}
                        onChange={(e) => handleItemChange(index, 'mfg_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors[`items.${index}.mfg_date`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.mfg_date`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="date"
                        value={item.expiry_date}
                        onChange={(e) => handleItemChange(index, 'expiry_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {errors[`items.${index}.expiry_date`] && (
                        <p className="mt-1 text-sm text-red-600">{errors[`items.${index}.expiry_date`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.gst_percentage}
                        onChange={(e) => handleItemChange(index, 'gst_percentage', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="18.00"
                      />
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Amount
                        </label>
                        <div className="text-lg font-semibold text-gray-900">
                          ₹{calculateItemTotal(item).toFixed(2)}
                        </div>
                      </div>
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
                </div>
              ))}
            </div>

            {/* Grand Total */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Grand Total:</span>
                <span className="text-xl font-bold text-gray-900">
                  ₹{calculateGrandTotal().toFixed(2)}
                </span>
              </div>
            </div>
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
                'Create Receipt'
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
              <ItemsList onItemSelect={handleItemSelect} selectionMode={true} />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MaterialReceiptForm