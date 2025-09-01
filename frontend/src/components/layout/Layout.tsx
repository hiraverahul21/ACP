import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import Navigation from './Navigation'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

const Layout: React.FC<LayoutProps> = ({ children, title, subtitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleNavClick = (href: string) => {
    router.push(href)
    setSidebarOpen(false)
  }

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Navigation
        currentPath={router.pathname}
        onNavClick={handleNavClick}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
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
                  {title && (
                    <h1 className="text-2xl font-bold text-gray-900">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-gray-600">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {user && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{user.role}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout