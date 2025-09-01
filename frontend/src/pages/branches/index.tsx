import React, { useEffect } from 'react'
import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAuth } from '@/context/AuthContext'
import BranchesList from '@/components/branches/BranchesList'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Layout from '@/components/layout/Layout'

const BranchesPage: React.FC = () => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

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

  return (
    <>
      <Head>
        <title>Branch Master - APC Management</title>
        <meta name="description" content="Manage branches across all companies" />
      </Head>

      <Layout
        title="Branch Master"
        subtitle="Manage branches across all companies"
      >
        <BranchesList />
      </Layout>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // You can add server-side authentication checks here if needed
  return {
    props: {},
  }
}

export default BranchesPage