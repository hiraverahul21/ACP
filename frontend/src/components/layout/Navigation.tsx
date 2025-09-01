import React from 'react'
import { useRouter } from 'next/router'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CubeIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import { PermissionGate, usePermissionContext } from '@/context/PermissionContext'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  module?: string
  action?: string
  resource?: string
  roleCheck?: (role: string) => boolean
}

interface NavigationProps {
  currentPath: string
  onNavClick: (href: string) => void
  onLogout: () => void
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

const Navigation: React.FC<NavigationProps> = ({
  currentPath,
  onNavClick,
  onLogout,
  sidebarOpen,
  setSidebarOpen
}) => {
  const { user } = useAuth()
  const router = useRouter()

  // Define navigation items with permission requirements
  const navigationItems: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      module: 'DASHBOARD',
      action: 'VIEW'
    },
    {
      name: 'Leads',
      href: '/leads',
      icon: ClipboardDocumentListIcon,
      module: 'LEAD',
      action: 'VIEW'
    },
    {
      name: 'Staff',
      href: '/staff',
      icon: UsersIcon,
      module: 'STAFF',
      action: 'VIEW'
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: CubeIcon,
      module: 'INVENTORY',
      action: 'VIEW'
    },
    {
      name: 'Material Approval',
      href: '/inventory/material-approval',
      icon: CheckCircleIcon,
      module: 'MATERIAL',
      action: 'APPROVE'
    },
    {
      name: 'Companies',
      href: '/companies',
      icon: BuildingOfficeIcon,
      module: 'COMPANY',
      action: 'VIEW'
    },
    {
      name: 'Branches',
      href: '/branches',
      icon: BuildingOfficeIcon,
      module: 'BRANCH',
      action: 'VIEW'
    },
    {
      name: 'Role Management',
      href: '/roles',
      icon: ShieldCheckIcon,
      module: 'ROLE',
      action: 'VIEW'
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: ChartPieIcon,
      module: 'REPORTS',
      action: 'VIEW'
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Cog6ToothIcon,
      module: 'SYSTEM',
      action: 'VIEW'
    }
  ]

  const NavigationItem: React.FC<{ item: NavigationItem }> = ({ item }) => {
    const Icon = item.icon
    const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')

    const handleClick = () => {
      onNavClick(item.href)
      if (setSidebarOpen) {
        setSidebarOpen(false)
      }
    }

    return (
      <li>
        <button
          onClick={handleClick}
          className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
            isActive
              ? 'bg-slate-800 text-white'
              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Icon className="mr-3 h-5 w-5" />
          {item.name}
        </button>
      </li>
    )
  }

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <div>
              <h2 className="text-xl font-bold text-white">APC System</h2>
              {user && (
                <p className="text-sm text-slate-300">
                  {user.company?.name}
                  {user?.branch?.name && ` (${user.branch.name})`}
                </p>
              )}
            </div>
            {setSidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-white hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>
          
          {/* Navigation */}
          <nav className="mt-8 px-4 flex-1">
            <ul className="space-y-2">
              {navigationItems.map((item) => {
                // If item has permission requirements, wrap in PermissionGate
                if (item.module && item.action) {
                  return (
                    <PermissionGate
                      key={item.name}
                      module={item.module}
                      action={item.action}
                      resource={item.resource}
                    >
                      <NavigationItem item={item} />
                    </PermissionGate>
                  )
                }
                
                // For items without permission requirements, show to all authenticated users
                return <NavigationItem key={item.name} item={item} />
              })}
            </ul>
          </nav>
          
          {/* User info and logout */}
          <div className="mt-auto p-4 border-t border-slate-700">
            {user && (
              <div className="mb-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Account
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-slate-400">{user.email}</p>
                <p className="text-xs text-slate-400">{user.role}</p>
              </div>
            )}
            <button
              onClick={onLogout}
              className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default Navigation