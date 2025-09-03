import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface UomConversion {
  id?: string
  from_uom: string
  to_uom: string
  conversion_factor: number
}

interface Item {
  id: string
  name: string
  description?: string
  category: string
  subcategory?: string
  brand?: string
  model?: string
  hsn_code?: string
  primary_uom: string
  secondary_uom?: string
  min_stock_level?: number
  max_stock_level?: number
  reorder_level?: number
  is_active: boolean
  uom_conversions?: UomConversion[]
}

interface ItemFormProps {
  item?: Item | null
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  name: string
  description: string
  category: string
  subcategory: string
  brand: string
  model: string
  hsn_code: string
  primary_uom: string
  secondary_uom: string
  min_stock_level: string
  max_stock_level: string
  reorder_level: string
  is_active: boolean
  uom_conversions: UomConversion[]
}

interface FormErrors {
  [key: string]: string
}

const ItemForm: React.FC<ItemFormProps> = ({ item, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    brand: '',
    model: '',
    hsn_code: '',
    primary_uom: 'PCS',
    secondary_uom: '',
    min_stock_level: '',
    max_stock_level: '',
    reorder_level: '',
    is_active: true,
    uom_conversions: []
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = [
    'CHEMICALS', 'EQUIPMENT', 'CONSUMABLES', 'SPARE_PARTS', 'TOOLS', 'OTHER'
  ]

  const uomOptions = [
    'PCS', 'KG', 'LITER', 'METER', 'BOX', 'PACKET', 'BOTTLE', 'GALLON', 'GRAM', 'ML'
  ]

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        subcategory: item.subcategory || '',
        brand: item.brand || '',
        model: item.model || '',
        hsn_code: item.hsn_code || '',
        primary_uom: item.primary_uom || 'PCS',
        secondary_uom: item.secondary_uom || '',
        min_stock_level: item.min_stock_level?.toString() || '',
        max_stock_level: item.max_stock_level?.toString() || '',
        reorder_level: item.reorder_level?.toString() || '',
        is_active: item.is_active ?? true,
        uom_conversions: item.uom_conversions || []
      })
    }
  }, [item])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const addUomConversion = () => {
    setFormData(prev => ({
      ...prev,
      uom_conversions: [...prev.uom_conversions, { from_uom: '', to_uom: '', conversion_factor: 1 }]
    }))
  }

  const removeUomConversion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      uom_conversions: prev.uom_conversions.filter((_, i) => i !== index)
    }))
  }

  const updateUomConversion = (index: number, field: keyof UomConversion, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      uom_conversions: prev.uom_conversions.map((conv, i) => 
        i === index ? { ...conv, [field]: value } : conv
      )
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Item name is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.primary_uom) {
      newErrors.primary_uom = 'Primary UOM is required'
    }

    if (formData.min_stock_level && isNaN(Number(formData.min_stock_level))) {
      newErrors.min_stock_level = 'Must be a valid number'
    }

    if (formData.max_stock_level && isNaN(Number(formData.max_stock_level))) {
      newErrors.max_stock_level = 'Must be a valid number'
    }

    if (formData.reorder_level && isNaN(Number(formData.reorder_level))) {
      newErrors.reorder_level = 'Must be a valid number'
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
      const url = item ? `/api/inventory/items/${item.id}` : '/api/inventory/items'
      const method = item ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        uom_id: formData.primary_uom, // Map primary_uom to uom_id for backend
        min_stock_level: formData.min_stock_level ? Number(formData.min_stock_level) : null,
        max_stock_level: formData.max_stock_level ? Number(formData.max_stock_level) : null,
        reorder_level: formData.reorder_level ? Number(formData.reorder_level) : null,
        uom_conversions: formData.uom_conversions.filter(conv => 
          conv.from_uom && conv.to_uom && conv.conversion_factor > 0
        )
      }
      
      // Remove primary_uom from payload since backend expects uom_id
      delete payload.primary_uom

      const response = await fetch(url, {
        method,
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
          setErrors({ general: data.message || 'Failed to save item' })
        }
      }
    } catch (error) {
      console.error('Error saving item:', error)
      setErrors({ general: 'Network error. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {item ? 'Edit Item' : 'Add New Item'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Item Name *"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                error={errors.name}
                placeholder="Enter item name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category}</p>
              )}
            </div>

            <div>
              <Input
                label="Subcategory"
                name="subcategory"
                value={formData.subcategory}
                onChange={handleInputChange}
                error={errors.subcategory}
                placeholder="Enter subcategory"
              />
            </div>

            <div>
              <Input
                label="Brand"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                error={errors.brand}
                placeholder="Enter brand"
              />
            </div>

            <div>
              <Input
                label="Model"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                error={errors.model}
                placeholder="Enter model"
              />
            </div>

            <div>
              <Input
                label="HSN Code"
                name="hsn_code"
                value={formData.hsn_code}
                onChange={handleInputChange}
                error={errors.hsn_code}
                placeholder="Enter HSN code"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary UOM *
              </label>
              <select
                name="primary_uom"
                value={formData.primary_uom}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {uomOptions.map(uom => (
                  <option key={uom} value={uom}>{uom}</option>
                ))}
              </select>
              {errors.primary_uom && (
                <p className="mt-1 text-sm text-red-600">{errors.primary_uom}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary UOM
              </label>
              <select
                name="secondary_uom"
                value={formData.secondary_uom}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Secondary UOM</option>
                {uomOptions.map(uom => (
                  <option key={uom} value={uom}>{uom}</option>
                ))}
              </select>
            </div>

            <div>
              <Input
                label="Minimum Stock Level"
                name="min_stock_level"
                type="number"
                value={formData.min_stock_level}
                onChange={handleInputChange}
                error={errors.min_stock_level}
                placeholder="Enter minimum stock level"
              />
            </div>

            <div>
              <Input
                label="Maximum Stock Level"
                name="max_stock_level"
                type="number"
                value={formData.max_stock_level}
                onChange={handleInputChange}
                error={errors.max_stock_level}
                placeholder="Enter maximum stock level"
              />
            </div>

            <div>
              <Input
                label="Reorder Level"
                name="reorder_level"
                type="number"
                value={formData.reorder_level}
                onChange={handleInputChange}
                error={errors.reorder_level}
                placeholder="Enter reorder level"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Active
              </label>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter item description"
            />
          </div>

          {/* UOM Conversions */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">UOM Conversions</h3>
              <Button
                type="button"
                variant="outline"
                onClick={addUomConversion}
              >
                Add Conversion
              </Button>
            </div>

            {formData.uom_conversions.map((conversion, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From UOM
                  </label>
                  <select
                    value={conversion.from_uom}
                    onChange={(e) => updateUomConversion(index, 'from_uom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select UOM</option>
                    {uomOptions.map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To UOM
                  </label>
                  <select
                    value={conversion.to_uom}
                    onChange={(e) => updateUomConversion(index, 'to_uom', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select UOM</option>
                    {uomOptions.map(uom => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conversion Factor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={conversion.conversion_factor}
                    onChange={(e) => updateUomConversion(index, 'conversion_factor', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1.0"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeUomConversion(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
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
                  <span className="ml-2">{item ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                item ? 'Update Item' : 'Create Item'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ItemForm