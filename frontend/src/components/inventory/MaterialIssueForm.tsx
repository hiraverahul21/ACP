import React, { useState, useEffect } from 'react'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ItemsList from './ItemsList'

interface Item {
  id: string
  name: string
  primary_uom: string
  secondary_uom?: string
}

interface Branch {
  id: string
  name: string
  city: string
  state: string
}

interface IssueItem {
  item_id: string
  item_name?: string
  quantity: string
  uom: string
  purpose: string
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
  issued_to: string
  department: string
  purpose: string
  notes: string
  items: IssueItem[]
}

interface FormErrors {
  [key: string]: string
}

const MaterialIssueForm: React.FC<MaterialIssueFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    issue_date: new Date().toISOString().split('T')[0],
    from_location_id: '',
    from_location_type: 'BRANCH',
    to_location_id: '',
    to_location_type: 'BRANCH',
    issued_to: '',
    department: '',
    purpose: '',
    notes: '',
    items: [{
      item_id: '',
      quantity: '',
      uom: '',
      purpose: ''
    }]
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [showItemSelector, setShowItemSelector] = useState(false)
  const [selectingItemIndex, setSelectingItemIndex] = useState<number | null>(null)

  const locationTypes = [
    { value: 'BRANCH', label: 'Branch' },
    { value: 'WAREHOUSE', label: 'Warehouse' },
    { value: 'STORE', label: 'Store' }
  ]

  const uomOptions = [
    'PCS', 'KG', 'LITER', 'METER', 'BOX', 'PACKET', 'BOTTLE', 'GALLON', 'GRAM', 'ML'
  ]

  const departments = [
    'Production', 'Maintenance', 'Quality Control', 'Administration', 'Sales', 'Marketing', 'HR', 'IT', 'Finance', 'Operations'
  ]

  useEffect(() => {
    fetchBranches()
  }, [])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleItemChange = (index: number, field: keyof IssueItem, value: string) => {
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
        quantity: '',
        uom: '',
        purpose: ''
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
      handleItemChange(selectingItemIndex, 'uom', item.primary_uom)
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

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required'
    }

    if (!formData.from_location_id) {
      newErrors.from_location_id = 'Source location is required'
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
      if (!item.uom) {
        newErrors[`items.${index}.uom`] = 'UOM is required'
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
        items: formData.items.map(item => ({
          ...item,
          quantity: Number(item.quantity)
        }))
      }

      const response = await fetch('/api/inventory/issue', {
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
              <Input
                label="Issued To *"
                name="issued_to"
                value={formData.issued_to}
                onChange={handleInputChange}
                error={errors.issued_to}
                placeholder="Enter person/department name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Location Type *
              </label>
              <select
                name="from_location_type"
                value={formData.from_location_type}
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
                From Location *
              </label>
              <select
                name="from_location_id"
                value={formData.from_location_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loadingBranches}
              >
                <option value="">Select Location</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} - {branch.city}
                  </option>
                ))}
              </select>
              {errors.from_location_id && (
                <p className="mt-1 text-sm text-red-600">{errors.from_location_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Location Type
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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <ItemsList onItemSelect={handleItemSelect} selectionMode={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MaterialIssueForm