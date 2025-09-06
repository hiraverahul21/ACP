import React from 'react'
import Head from 'next/head'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/router'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Button from '@/components/ui/Button'
import Layout from '@/components/layout/Layout'
import MaterialApprovals from './MaterialApprovals'

const MaterialApprovalPage: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()

  // Check if user has access to material approvals
  const hasAccess = user && (user.role === 'SUPERADMIN' || user.role === 'ADMIN' || user.role === 'INVENTORY_MANAGER' || user.role === 'OPERATION_MANAGER' || user.role === 'SUPERVISOR' || user.role === 'TECHNICIAN')

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>Material Approval - Pest Control Management</title>
        <meta name="description" content="Approve or reject pending material issues" />
      </Head>
      <Layout
        title="Material Approval"
        subtitle="Review and approve pending material requests"
      >
        <MaterialApprovals />
      </Layout>
    </>
  )
}

export default MaterialApprovalPage