import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../../context/AuthContext'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CubeIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  XMarkIcon,
  Bars3Icon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import axios from 'axios'

interface Permission {
  id: string
  name: string
  module: string
  action: string
  description?: string
}

interface RolePermission {
  id: string
  role: string
  permission_id: string
  permission: Permission
}

const STAFF_ROLES = [
  { value: 'SUPERADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
  { value: 'AREA_MANAGER', label: 'Area Manager' },
  { value: 'TECHNICIAN', label: 'Technician' }
]

const RolesPage: React.FC = () => {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<string, RolePermission[]>>({})
  const [selectedRole, setSelectedRole] = useState<string>('ADMIN')
  const [showPermissionMatrix, setShowPermissionMatrix] = useState(false)

  // Check if user is superadmin
  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.push('/dashboard')
      return
    }
    if (user) {
      fetchPermissions()
      fetchRolePermissions()
    }
  }, [user, router])

  const fetchPermissions = async () => {
    try {
      const response = await axios.get('/api/roles/permissions')
      setPermissions(response.data.data)
    } catch (error) {
      console.error('Error fetching permissions:', error)
      toast.error('Failed to load permissions')
    }
  }

  const fetchRolePermissions = async () => {
    try {
      setLoading(true)
      const rolePermissionsData: Record<string, RolePermission[]> = {}
      
      for (const role of STAFF_ROLES) {
        const response = await axios.get(`/api/roles/role-permissions/${role.value}`)
        rolePermissionsData[role.value] = response.data.data
      }
      
      setRolePermissions(rolePermissionsData)
    } catch (error) {
      console.error('Error fetching role permissions:', error)
      toast.error('Failed to load role permissions')
    } finally {
      setLoading(false)
    }
  }

  const handlePermissionToggle = async (role: string, permissionId: string, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        // Remove permission
        await axios.delete(`/api/roles/role-permissions/${role}/${permissionId}`)
        toast.success('Permission removed successfully')
      } else {
        // Add permission
        // Get current permissions for this role
        const currentPermissions = rolePermissions[role] || []
        const newPermissionIds = [...currentPermissions.map(p => p.permission_id), permissionId]
        
        await axios.post(`/api/roles/role-permissions`, 
          { role, permission_ids: newPermissionIds }
        )
        toast.success('Permission added successfully')
      }
      
      // Refresh role permissions
      fetchRolePermissions()
    } catch (error) {
      console.error('Error updating permission:', error)
      toast.error('Failed to update permission')
    }
  }

  const handleNavClick = (href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: false,
    },
    {
      name: 'Leads',
      href: '/leads',
      icon: ClipboardDocumentListIcon,
      current: false,
    },
    {
      name: 'Staff',
      href: '/staff',
      icon: UsersIcon,
      current: false,
    },
    {
      name: 'Companies',
      href: '/companies',
      icon: BuildingOfficeIcon,
      current: false,
    },
    {
      name: 'Branches',
      href: '/branches',
      icon: BuildingOfficeIcon,
      current: false,
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: CubeIcon,
      current: false,
    },
    {
      name: 'Role Management',
      href: '/roles',
      icon: ShieldCheckIcon,
      current: true,
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: ChartPieIcon,
      current: false,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      current: false,
    },
  ]

  const groupPermissionsByModule = (permissions: Permission[]) => {
    if (!permissions || permissions.length === 0) {
      return {}
    }
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = []
      }
      acc[permission.module].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  const hasPermission = (role: string, permissionId: string) => {
    return rolePermissions[role]?.some(rp => rp.permission_id === permissionId) || false
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const groupedPermissions = groupPermissionsByModule(permissions)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-4 bg-slate-800">
          <h1 className="text-white font-bold text-lg">PestControl</h1>
          {user?.company && (
            <p className="text-xs text-slate-300 truncate">
              {user.company.name}
              {user?.branch?.name && ` (${user.branch.name})`}
            </p>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <button
                    onClick={() => handleNavClick(item.href)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      item.current
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                </li>
              )
            })}
          </ul>
          
          <div className="mt-8 pt-8 border-t border-slate-700">
            <div className="px-4 py-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Account
              </p>
              <p className="text-sm text-slate-300 mt-1">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full mt-4 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
            >
              Sign Out
            </button>
          </div>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-4 text-gray-600 hover:text-gray-900"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Role Management
                  </h1>
                  <p className="text-sm text-gray-600">
                    Manage role permissions and access control
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Role Selection */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Select Role to Manage</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {STAFF_ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => setSelectedRole(role.value)}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        selectedRole === role.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-center">
                        <ShieldCheckIcon className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">{role.label}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {rolePermissions[role.value]?.length || 0} permissions
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission Matrix */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Permissions for {STAFF_ROLES.find(r => r.value === selectedRole)?.label}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Toggle permissions for this role. Changes are saved automatically.
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="space-y-8">
                    {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                      <div key={module} className="border rounded-lg p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4 capitalize">
                          {module.toLowerCase().replace('_', ' ')} Module
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {modulePermissions.map((permission) => {
                            const hasThisPermission = hasPermission(selectedRole, permission.id)
                            return (
                              <div
                                key={permission.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {permission.action.toLowerCase()}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {permission.description || permission.name}
                                  </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={hasThisPermission}
                                    onChange={() => handlePermissionToggle(
                                      selectedRole,
                                      permission.id,
                                      hasThisPermission
                                    )}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default RolesPage