import React, { useState } from 'react'
import Head from 'next/head'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import { PermissionGate } from '@/context/PermissionContext'
import Navigation from '@/components/layout/Navigation'
import {
  UserGroupIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
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
        <Navigation
          currentPath={router.pathname}
          onNavClick={handleNavClick}
          onLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

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
              <PermissionGate module="LEAD" action="CREATE">
                <button
                  onClick={() => router.push('/leads/new')}
                  className="p-4 rounded-lg text-left transition-colors bg-primary-600 hover:bg-primary-700 text-white"
                >
                  <h3 className="font-medium mb-1">Add New Lead</h3>
                  <p className="text-sm opacity-90">Create a new customer lead</p>
                </button>
              </PermissionGate>
              <PermissionGate module="STAFF" action="VIEW">
                <button
                  onClick={() => router.push('/staff')}
                  className="p-4 rounded-lg text-left transition-colors bg-secondary-600 hover:bg-secondary-700 text-white"
                >
                  <h3 className="font-medium mb-1">Manage Staff</h3>
                  <p className="text-sm opacity-90">View and manage staff members</p>
                </button>
              </PermissionGate>
              <PermissionGate module="REPORT" action="VIEW">
                <button
                  onClick={() => router.push('/reports')}
                  className="p-4 rounded-lg text-left transition-colors bg-green-600 hover:bg-green-700 text-white"
                >
                  <h3 className="font-medium mb-1">View Reports</h3>
                  <p className="text-sm opacity-90">Access analytics and reports</p>
                </button>
              </PermissionGate>
              <button
                onClick={() => router.push('/settings')}
                className="p-4 rounded-lg text-left transition-colors bg-gray-600 hover:bg-gray-700 text-white"
              >
                <h3 className="font-medium mb-1">Settings</h3>
                <p className="text-sm opacity-90">Configure system settings</p>
              </button>
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