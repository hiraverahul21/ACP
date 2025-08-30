import React, { useState, useEffect } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import CompaniesList from '@/components/companies/CompaniesList'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

const CompaniesPage: React.FC = () => {
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
      current: false,
    },
    {
      name: 'Leads',
      href: '/leads',
      icon: ClipboardDocumentListIcon,
      current: false,
    },
    ...((user?.role === 'SUPERADMIN' || user?.role === 'ADMIN') ? [
      {
        name: 'Staff',
        href: '/staff',
        icon: UsersIcon,
        current: false,
      }
    ] : []),
    ...(user?.role === 'SUPERADMIN' ? [
      {
        name: 'Companies',
        href: '/companies',
        icon: BuildingOfficeIcon,
        current: true,
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

  // Only superadmin can access this page
  if (user.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Company Master - APC Management</title>
        <meta name="description" content="Manage companies and their subscriptions" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="flex items-center justify-between h-16 px-4 bg-slate-800">
            <div className="flex items-center">
              <div className="text-white font-bold text-lg">APC Management</div>
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
                      Company Master
                    </h1>
                    <p className="text-sm text-gray-600">
                      Manage companies and their subscriptions
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
            <CompaniesList />
          </main>
        </div>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // You can add server-side authentication checks here if needed
  return {
    props: {},
  }
}

export default CompaniesPage