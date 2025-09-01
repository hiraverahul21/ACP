import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/router'
import { PermissionGate } from '@/context/PermissionContext'
import Navigation from '@/components/layout/Navigation'
import EnhancedLeadsList from '@/components/leads/EnhancedLeadsList'
import LeadForm from '@/components/leads/LeadForm'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { PlusIcon, Bars3Icon } from '@heroicons/react/24/outline'

interface Lead {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone: string
  address: string
  city: string
  state: string
  pincode: string
  service_type: string
  property_type: string
  urgency_level: string
  status: string
  created_at: string
  assigned_to?: string
  assigned_staff_name?: string
  description?: string
  lead_type?: string
  branch?: {
    id: string
    name: string
    city: string
  }
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalRecords: number
  hasNext: boolean
  hasPrev: boolean
}

const LeadsPage: React.FC = () => {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchLeads()
    }
  }, [user, searchQuery, sortField, sortDirection])

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



  const fetchLeads = async (page: number = 1) => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        sortField,
        sortDirection
      })
      
      const response = await fetch(`/api/leads?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLeads(data.data || [])
        setPagination(data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalRecords: 0,
          hasNext: false,
          hasPrev: false
        })
      } else {
        console.error('Failed to fetch leads')
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLead = () => {
    setEditingLead(null)
    setShowForm(true)
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setShowForm(true)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handleSort = (field: string, direction: 'asc' | 'desc') => {
    setSortField(field)
    setSortDirection(direction)
    setPagination(prev => ({ ...prev, currentPage: 1 }))
  }

  const handlePageChange = (page: number) => {
    fetchLeads(page)
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) {
      return
    }

    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // Remove the deleted lead from the state
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId))
      } else {
        const errorData = await response.json()
        console.error('Failed to delete lead:', errorData)
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingLead(null)
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingLead(null)
    fetchLeads(pagination.currentPage)
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
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
                    Leads Management
                  </h1>
                  <p className="text-sm text-gray-600">
                    Manage and track your leads
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <PermissionGate module="LEAD" action="CREATE">
                  <Button
                    onClick={handleAddLead}
                    className="flex items-center space-x-2"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Add Lead</span>
                  </Button>
                </PermissionGate>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <EnhancedLeadsList
             leads={leads}
             onEdit={handleEditLead}
             onDelete={handleDeleteLead}
             isLoading={loading}
             pagination={pagination}
             onPageChange={handlePageChange}
             onSearch={handleSearch}
             onSort={handleSort}
           />

          {/* Lead Form Modal */}
           {showForm && (
             <LeadForm
               lead={editingLead}
               onClose={() => {
                 setShowForm(false)
                 setEditingLead(null)
               }}
               onSuccess={() => {
                 setShowForm(false)
                 setEditingLead(null)
                 fetchLeads(pagination.currentPage)
               }}
             />
           )}
        </main>
      </div>
    </div>
  )
}

export default LeadsPage