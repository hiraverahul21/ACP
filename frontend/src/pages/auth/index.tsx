import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { useAuth } from '@/context/AuthContext'
import SignInForm from '@/components/auth/SignInForm'
import SuperAdminSignInForm from '@/components/auth/SuperAdminSignInForm'
import SignUpForm from '@/components/auth/SignUpForm'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import OTPVerificationForm from '@/components/auth/OTPVerificationForm'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

type AuthMode = 'signin' | 'superadmin' | 'signup' | 'forgot-password' | 'otp-verification'

interface OTPData {
  email: string
  signupToken: string
}

const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin')
  const [otpData, setOTPData] = useState<OTPData | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Handle URL query parameters
  useEffect(() => {
    const { mode: queryMode } = router.query
    if (queryMode && typeof queryMode === 'string') {
      if (['signin', 'superadmin', 'signup', 'forgot-password'].includes(queryMode)) {
        setMode(queryMode as AuthMode)
      }
    }
  }, [router.query])

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode)
    router.push(`/auth?mode=${newMode}`, undefined, { shallow: true })
  }

  const handleSignUpSuccess = (data: OTPData) => {
    setOTPData(data)
    setMode('otp-verification')
  }

  const handleOTPSuccess = () => {
    router.push('/dashboard')
  }

  const handleBackToSignUp = () => {
    setOTPData(null)
    setMode('signup')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user) {
    return null // Will redirect
  }

  const getTitle = () => {
    switch (mode) {
      case 'signin':
        return 'Sign In to Your Account'
      case 'superadmin':
        return 'Super Admin Login'
      case 'signup':
        return 'Create New Account'
      case 'forgot-password':
        return 'Reset Your Password'
      case 'otp-verification':
        return 'Verify Your Mobile Number'
      default:
        return 'Authentication'
    }
  }

  const getSubtitle = () => {
    switch (mode) {
      case 'signin':
        return 'Welcome back! Please sign in to continue.'
      case 'superadmin':
        return 'Access the administrative dashboard.'
      case 'signup':
        return 'Join our pest control management system.'
      case 'forgot-password':
        return 'Enter your email to receive a new password.'
      case 'otp-verification':
        return 'We sent a verification code to your mobile number.'
      default:
        return ''
    }
  }

  return (
    <>
      <Head>
        <title>{getTitle()} - Pest Control Management</title>
        <meta name="description" content="Sign in to access your pest control management dashboard" />
      </Head>

      <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="max-w-md">
              <h1 className="text-4xl font-bold mb-6">
                Pest Control
                <br />
                Management System
              </h1>
              <p className="text-xl text-primary-100 mb-8">
                Streamline your pest control operations with our comprehensive management platform.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-300 rounded-full" />
                  <span className="text-primary-100">Efficient lead management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-300 rounded-full" />
                  <span className="text-primary-100">Real-time service tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-300 rounded-full" />
                  <span className="text-primary-100">Team collaboration tools</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-300 rounded-full" />
                  <span className="text-primary-100">Comprehensive reporting</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/30 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary-400/20 rounded-full translate-y-48 -translate-x-48" />
        </div>

        {/* Right side - Auth Forms */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:max-w-md">
            {/* Logo for mobile */}
            <div className="lg:hidden text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">
                Pest Control Management
              </h1>
            </div>

            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                {getTitle()}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {getSubtitle()}
              </p>
            </div>

            {/* Auth Forms */}
            <div className="space-y-6">
              {mode === 'signin' && (
                <SignInForm
                  onSwitchToSignUp={() => handleModeChange('signup')}
                  onSwitchToForgotPassword={() => handleModeChange('forgot-password')}
                  onSwitchToSuperAdmin={() => handleModeChange('superadmin')}
                />
              )}

              {mode === 'superadmin' && (
                <SuperAdminSignInForm
                  onSwitchToStaffLogin={() => handleModeChange('signin')}
                />
              )}

              {mode === 'signup' && (
                <SignUpForm
                  onSwitchToSignIn={() => handleModeChange('signin')}
                  onSignUpSuccess={handleSignUpSuccess}
                />
              )}

              {mode === 'forgot-password' && (
                <ForgotPasswordForm
                  onSwitchToSignIn={() => handleModeChange('signin')}
                />
              )}

              {mode === 'otp-verification' && otpData && (
                <OTPVerificationForm
                  email={otpData.email}
                  signupToken={otpData.signupToken}
                  onVerificationSuccess={handleOTPSuccess}
                  onBackToSignUp={handleBackToSignUp}
                />
              )}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                By signing in, you agree to our{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default AuthPage