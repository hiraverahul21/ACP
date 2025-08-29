import React, { useState } from 'react'
import Head from 'next/head'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import {
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingOfficeIcon,
  CubeIcon,
} from '@heroicons/react/24/outline'

const Dashboard: React.FC = () => {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  const handleLogout = async () => {
    await logout()
    router.push('/auth')
  }

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
      current: true,
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
      name: 'Inventory',
      href: '/inventory',
      icon: CubeIcon,
      current: false,
    },
    ...(user?.role === 'SUPERADMIN' ? [
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
      }
    ] : []),
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

  const handleNavClick = (href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  const stats = [
    {
      name: 'Total Leads',
      value: '0',
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Active Staff',
      value: '0',
      icon: UserGroupIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Completed Services',
      value: '0',
      icon: ChartBarIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Pending Tasks',
      value: '0',
      icon: CogIcon,
      color: 'bg-orange-500',
    },
  ]

  const quickActions = [
    {
      name: 'Add New Lead',
      description: 'Create a new customer lead',
      href: '/leads/new',
      color: 'bg-primary-600 hover:bg-primary-700',
    },
    {
      name: 'Manage Staff',
      description: 'View and manage staff members',
      href: '/staff',
      color: 'bg-secondary-600 hover:bg-secondary-700',
    },
    {
      name: 'View Reports',
      description: 'Access analytics and reports',
      href: '/reports',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      name: 'Settings',
      description: 'Configure system settings',
      href: '/settings',
      color: 'bg-gray-600 hover:bg-gray-700',
    },
  ]

  return (
    <>
      <Head>
        <title>Dashboard - Pest Control Management</title>
        <meta name="description" content="Pest control management dashboard" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-white">APC Management</h1>
              {user?.role !== 'SUPERADMIN' && user?.company?.name && (
                <p className="text-xs text-slate-300 mt-1">
                  {user.company.name}
                  {user?.branch?.name && ` (${user.branch.name})`}
                </p>
              )}
            </div>
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
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
              >
                <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
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
                      Dashboard
                    </h1>
                    <p className="text-sm text-gray-600">
                      Welcome back, {user.name}!
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
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.name}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">
                        {stat.name}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <button
                  key={action.name}
                  onClick={() => router.push(action.href)}
                  className={`p-4 rounded-lg text-left transition-colors ${action.color} text-white`}
                >
                  <h3 className="font-medium mb-1">{action.name}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h2>
            <div className="text-center py-8">
              <p className="text-gray-500">
                No recent activity to display.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Start by adding leads or managing staff to see activity here.
              </p>
            </div>
          </div>
          </main>
        </div>
      </div>
    </>
  )
}

export default Dashboard