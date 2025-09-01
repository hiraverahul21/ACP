import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

interface Permission {
  id: string
  name: string
  module: string
  action: string
  resource?: string
  description?: string
}

interface UsePermissionsReturn {
  permissions: Permission[]
  loading: boolean
  error: string | null
  hasPermission: (module: string, action: string, resource?: string) => boolean
  checkPermission: (module: string, action: string, resource?: string) => Promise<boolean>
  refetch: () => Promise<void>
}

export const usePermissions = (): UsePermissionsReturn => {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const response = await axios.get('/api/roles/user-permissions')
      
      if (response.data.success) {
        setPermissions(response.data.data || [])
      } else {
        throw new Error(response.data.message || 'Failed to fetch permissions')
      }
    } catch (err: any) {
      console.error('Error fetching permissions:', err)
      setError(err.response?.data?.message || err.message || 'Failed to fetch permissions')
      setPermissions([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const hasPermission = useCallback((module: string, action: string, resource?: string): boolean => {
    if (!user) return false
    
    // Superadmin has all permissions
    if (user.role === 'SUPERADMIN') return true
    
    // Check if user has the specific permission
    return permissions.some(permission => 
      permission.module.toLowerCase() === module.toLowerCase() &&
      permission.action.toLowerCase() === action.toLowerCase() &&
      (!resource || !permission.resource || permission.resource.toLowerCase() === resource.toLowerCase())
    )
  }, [user, permissions])

  const checkPermission = useCallback(async (module: string, action: string, resource?: string): Promise<boolean> => {
    if (!user) return false
    
    // Superadmin has all permissions
    if (user.role === 'SUPERADMIN') return true
    
    try {
      const params = new URLSearchParams({
        module,
        action,
        ...(resource && { resource })
      })
      
      const response = await axios.get(`/api/roles/check-permission?${params}`)
      
      return response.data.success && response.data.data.has_permission
    } catch (err) {
      console.error('Error checking permission:', err)
      return false
    }
  }, [user])

  return {
    permissions,
    loading,
    error,
    hasPermission,
    checkPermission,
    refetch: fetchPermissions
  }
}

export default usePermissions