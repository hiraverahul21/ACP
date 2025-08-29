import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/router'
import {
  PlusIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CubeIcon,
  ClipboardDocumentListIcon,
  RectangleStackIcon,
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ItemsList from '@/components/inventory/ItemsList'
import ItemForm from '@/components/inventory/ItemForm'
import MaterialReceiptForm from '@/components/inventory/MaterialReceiptForm'
import MaterialIssueForm from '@/components/inventory/MaterialIssueForm'

interface DashboardStats {
  total_items: number
  low_stock_items: number
  expiring_items: number
  total_stock_value: number
}

interface ExpiryAlert {
  id: string
  item_name: string
  batch_no: string
  expiry_date: string
  quantity: number
  uom: string
  days_to_expiry: number
}

const InventoryDashboard: React.FC = () => {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [showIssueForm, setShowIssueForm] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      router.push('/auth')
    } catch (error) {
      console.error('Logout error:', error)
      router.push('/auth')
    }
  }

  const handleNavClick = (href: string) => {
    router.push(href)
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
      name: 'Inventory',
      href: '/inventory',
      icon: CubeIcon,
      current: true,
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

  useEffect(() => {
    if (user) {
      fetchDashboardStats()
      fetchExpiryAlerts()
    }
  }, [user])

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      } else {
        console.error('Failed to fetch dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  const fetchExpiryAlerts = async () => {
    try {
      setLoadingAlerts(true)
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory/expiry-alerts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setExpiryAlerts(data.data || [])
      } else {
        console.error('Failed to fetch expiry alerts')
      }
    } catch (error) {
      console.error('Error fetching expiry alerts:', error)
    } finally {
      setLoadingAlerts(false)
    }
  }

  const handleFormSuccess = () => {
    fetchDashboardStats()
    fetchExpiryAlerts()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getExpiryStatusColor = (daysToExpiry: number) => {
    if (daysToExpiry <= 7) return 'text-red-600 bg-red-100'
    if (daysToExpiry <= 30) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getExpiryStatusText = (daysToExpiry: number) => {
    if (daysToExpiry < 0) return 'Expired'
    if (daysToExpiry === 0) return 'Expires Today'
    if (daysToExpiry === 1) return 'Expires Tomorrow'
    return `${daysToExpiry} days left`
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const sidebarClasses = `fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0`

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={sidebarClasses}>
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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="lg:ml-64">
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
                    Inventory Management
                  </h1>
                  <p className="text-sm text-gray-600">
                    Manage your inventory, track stock levels, and monitor material movements
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button
                onClick={() => setShowReceiptForm(true)}
                className="flex items-center justify-center p-4 bg-green-600 hover:bg-green-700"
              >
                <ArrowRightIcon className="h-5 w-5 mr-2" />
                Material Receipt
              </Button>
              <Button
                onClick={() => setShowIssueForm(true)}
                className="flex items-center justify-center p-4 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Material Issue
              </Button>
              <Button
                onClick={() => router.push('/inventory/transfer')}
                className="flex items-center justify-center p-4 bg-purple-600 hover:bg-purple-700"
              >
                <ArrowsRightLeftIcon className="h-5 w-5 mr-2" />
                Transfer
              </Button>
              <Button
                onClick={() => router.push('/inventory/reports')}
                className="flex items-center justify-center p-4 bg-gray-600 hover:bg-gray-700"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                Reports
              </Button>
            </div>
          </div>

          {loadingStats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CubeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_items}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Low Stock</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.low_stock_items}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.expiring_items}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Stock Value</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_stock_value)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('items')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'items'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Items
                </button>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'alerts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Expiry Alerts
                  {expiryAlerts.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {expiryAlerts.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <button
                        onClick={() => setShowItemForm(true)}
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <PlusIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Add New Item</p>
                      </button>
                      <button
                        onClick={() => router.push('/inventory/stock-ledger')}
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <ClipboardDocumentListIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">View Stock Ledger</p>
                      </button>
                      <button
                        onClick={() => router.push('/inventory/stock-report')}
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <RectangleStackIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Stock Status</p>
                      </button>
                      <button
                        onClick={() => router.push('/inventory/reports')}
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Generate Reports</p>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'items' && (
                <ItemsList />
              )}

              {activeTab === 'alerts' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Expiry Alerts</h3>
                  {loadingAlerts ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-gray-200 rounded"></div>
                        </div>
                      ))}
                    </div>
                  ) : expiryAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No expiry alerts at the moment</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {expiryAlerts.map((alert) => (
                        <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">{alert.item_name}</h4>
                              <p className="text-sm text-gray-600">Batch: {alert.batch_no}</p>
                              <p className="text-sm text-gray-600">Quantity: {alert.quantity} {alert.uom}</p>
                              <p className="text-sm text-gray-600">Expiry: {new Date(alert.expiry_date).toLocaleDateString()}</p>
                            </div>
                            <div className="ml-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getExpiryStatusColor(alert.days_to_expiry)
                              }`}>
                                {getExpiryStatusText(alert.days_to_expiry)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {showItemForm && (
        <ItemForm
          onClose={() => setShowItemForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showReceiptForm && (
        <MaterialReceiptForm
          onClose={() => setShowReceiptForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}

      {showIssueForm && (
        <MaterialIssueForm
          onClose={() => setShowIssueForm(false)}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}

export default InventoryDashboard