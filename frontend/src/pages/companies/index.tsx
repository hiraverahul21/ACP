import React from 'react'
import { GetServerSideProps } from 'next'
import Layout from '@/components/layout/Layout'
import CompaniesList from '@/components/companies/CompaniesList'

const CompaniesPage: React.FC = () => {
  return (
    <Layout
      title="Company Master"
      subtitle="Manage companies and their subscriptions"
      pageTitle="Company Master - APC Management"
      metaDescription="Manage companies and their subscriptions"
    >
      <CompaniesList />
    </Layout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // You can add server-side authentication checks here if needed
  return {
    props: {},
  }
}

export default CompaniesPage