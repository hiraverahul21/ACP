import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/router'
import Cookies from 'js-cookie'
import { authApi } from '@/utils/api'
import toast from 'react-hot-toast'

interface User {
  id: string
  name: string
  email: string
  mobile: string
  role: 'SUPERADMIN' | 'ADMIN' | 'REGIONAL_MANAGER' | 'AREA_MANAGER' | 'TECHNICIAN'
  is_active: boolean
  branch_id?: string
  company_id?: string
  created_at: string
  last_login?: string
  branch?: {
    id: string
    name: string
    city: string
    state: string
  }
  company?: {
    id: string
    name: string
    is_active: boolean
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  signup: (data: SignupData) => Promise<{ success: boolean; signupToken?: string; message?: string }>
  verifyOTP: (email: string, otp: string, signupToken: string) => Promise<boolean>
  forgotPassword: (email: string) => Promise<boolean>
  resendOTP: (email: string, signupToken: string) => Promise<boolean>
  refreshUser: () => Promise<void>
  isAuthenticated: boolean
}

interface SignupData {
  name: string
  email: string
  mobile: string
  role: string
  password: string
  branch_id?: string
  company_id?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = Cookies.get('jwt')
      console.log('=== AUTH CHECK DEBUG ===');
      console.log('Token found:', !!token);
      if (!token) {
        console.log('No token found, user not authenticated');
        setLoading(false)
        return
      }

      console.log('Calling getProfile API...');
      const response = await authApi.getProfile()
      console.log('getProfile response:', response);
      if (response.success) {
        console.log('User authenticated successfully:', response.user);
        setUser(response.user)
      } else {
        console.log('getProfile failed, removing token');
        // Token is invalid, remove it
        Cookies.remove('jwt')
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      Cookies.remove('jwt')
    } finally {
      console.log('Auth check completed, loading set to false');
      setLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await authApi.login({ email, password })
      
      if (response.success) {
        setUser(response.user)
        // Token is set as HTTP-only cookie by the server
        toast.success('Login successful!')
        return true
      } else {
        toast.error(response.message || 'Login failed')
        return false
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.message || 'Login failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const signup = async (data: SignupData): Promise<{ success: boolean; signupToken?: string; message?: string }> => {
    try {
      setLoading(true)
      const response = await authApi.signup(data)
      
      if (response.success) {
        toast.success(response.message || 'OTP sent to your email address')
        return {
          success: true,
          signupToken: response.signupToken,
          message: response.message
        }
      } else {
        toast.error(response.message || 'Signup failed')
        return {
          success: false,
          message: response.message
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      const message = error.response?.data?.message || 'Signup failed'
      toast.error(message)
      return {
        success: false,
        message
      }
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async (email: string, otp: string, signupToken: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await authApi.verifyOTP({ email, otp, signupToken })
      
      if (response.success) {
        setUser(response.user)
        toast.success('Registration completed successfully!')
        return true
      } else {
        toast.error(response.message || 'OTP verification failed')
        return false
      }
    } catch (error: any) {
      console.error('OTP verification error:', error)
      toast.error(error.response?.data?.message || 'OTP verification failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      setLoading(true)
      const response = await authApi.forgotPassword({ email })
      
      if (response.success) {
        toast.success(response.message || 'Password reset email sent')
        return true
      } else {
        toast.error(response.message || 'Password reset failed')
        return false
      }
    } catch (error: any) {
      console.error('Forgot password error:', error)
      toast.error(error.response?.data?.message || 'Password reset failed')
      return false
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async (email: string, signupToken: string): Promise<boolean> => {
    try {
      const response = await authApi.resendOTP({ email, signupToken })
      
      if (response.success) {
        toast.success(response.message || 'New OTP sent')
        return true
      } else {
        toast.error(response.message || 'Failed to resend OTP')
        return false
      }
    } catch (error: any) {
      console.error('Resend OTP error:', error)
      toast.error(error.response?.data?.message || 'Failed to resend OTP')
      return false
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      Cookies.remove('jwt')
      toast.success('Logged out successfully')
      router.push('/auth')
    }
  }

  const refreshUser = async () => {
    try {
      const response = await authApi.getProfile()
      if (response.success) {
        setUser(response.user)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signup,
    verifyOTP,
    forgotPassword,
    resendOTP,
    refreshUser,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}