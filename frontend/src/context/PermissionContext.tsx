import React, { createContext, useContext, ReactNode } from 'react'
import { usePermissions } from '../hooks/usePermissions'

interface Permission {
  id: string
  name: string
  module: string
  action: string
  resource?: string
  description?: string
}

interface PermissionContextType {
  permissions: Permission[]
  loading: boolean
  error: string | null
  hasPermission: (module: string, action: string, resource?: string) => boolean
  checkPermission: (module: string, action: string, resource?: string) => Promise<boolean>
  refetch: () => Promise<void>
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const permissionData = usePermissions()

  return (
    <PermissionContext.Provider value={permissionData}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermissionContext = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissionContext must be used within a PermissionProvider')
  }
  return context
}

// Convenience component for conditional rendering based on permissions
interface PermissionGateProps {
  module: string
  action: string
  resource?: string
  children: ReactNode
  fallback?: ReactNode
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action,
  resource,
  children,
  fallback = null
}) => {
  const { hasPermission } = usePermissionContext()
  
  if (hasPermission(module, action, resource)) {
    return <>{children}</>
  }
  
  return <>{fallback}</>
}

export default PermissionContext