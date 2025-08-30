import axios, { AxiosInstance, AxiosResponse } from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8765/api',
  timeout: 10000,
  withCredentials: true, // Important for HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = Cookies.get('jwt')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      Cookies.remove('jwt')
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth'
      }
    } else if (error.response?.status === 403) {
      // Forbidden
      toast.error('Access denied')
    } else if (error.response?.status === 500) {
      // Server error
      toast.error('Server error. Please try again later.')
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      toast.error('Request timeout. Please try again.')
    } else if (!error.response) {
      // Network error
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

// API response types
interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  errors?: string[]
  pagination?: {
    currentPage: number
    totalPages: number
    totalRecords: number
    hasNext: boolean
    hasPrev: boolean
  }
}

interface LoginData {
  email: string
  password: string
}

interface SignupData {
  name: string
  email: string
  mobile: string
  role: string
  password: string
  branch_id?: string
}

interface VerifyOTPData {
  email: string
  otp: string
  signupToken: string
}

interface ForgotPasswordData {
  email: string
}

interface ResendOTPData {
  email: string
  signupToken: string
}

// Auth API functions
export const authApi = {
  // Login
  login: async (data: LoginData): Promise<ApiResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  // Signup
  signup: async (data: SignupData): Promise<ApiResponse> => {
    const response = await api.post('/auth/signup', data)
    return response.data
  },

  // Verify OTP
  verifyOTP: async (data: VerifyOTPData): Promise<ApiResponse> => {
    const response = await api.post('/auth/verify-otp', data)
    return response.data
  },

  // Forgot Password
  forgotPassword: async (data: ForgotPasswordData): Promise<ApiResponse> => {
    const response = await api.post('/auth/forgot-password', data)
    return response.data
  },

  // Resend OTP
  resendOTP: async (data: ResendOTPData): Promise<ApiResponse> => {
    const response = await api.post('/auth/resend-otp', data)
    return response.data
  },

  // Logout
  logout: async (): Promise<ApiResponse> => {
    const response = await api.post('/auth/logout')
    return response.data
  },

  // Get Profile
  getProfile: async (): Promise<ApiResponse> => {
    const response = await api.get('/auth/me')
    return response.data
  },
}

// Leads API functions
export const leadsApi = {
  // Get all leads
  getLeads: async (params?: {
    page?: number
    limit?: number
    status?: string
    service_type?: string
    urgency_level?: string
    city?: string
    assigned_to?: string
    date_from?: string
    date_to?: string
    search?: string
  }): Promise<ApiResponse> => {
    const response = await api.get('/leads', { params })
    return response.data
  },

  // Get single lead
  getLead: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/leads/${id}`)
    return response.data
  },

  // Create lead
  createLead: async (data: any): Promise<ApiResponse> => {
    const response = await api.post('/leads', data)
    return response.data
  },

  // Update lead
  updateLead: async (id: string, data: any): Promise<ApiResponse> => {
    const response = await api.put(`/leads/${id}`, data)
    return response.data
  },

  // Delete lead
  deleteLead: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/leads/${id}`)
    return response.data
  },

  // Assign lead
  assignLead: async (id: string, staffId: string): Promise<ApiResponse> => {
    const response = await api.post(`/leads/${id}/assign`, { staff_id: staffId })
    return response.data
  },

  // Get dashboard stats
  getDashboardStats: async (params?: {
    date_from?: string
    date_to?: string
  }): Promise<ApiResponse> => {
    const response = await api.get('/leads/stats/dashboard', { params })
    return response.data
  },
}

// Staff API functions
export const staffApi = {
  // Get all staff
  getStaff: async (params?: {
    page?: number
    limit?: number
    role?: string
    is_active?: boolean
    branch_id?: string
    search?: string
  }): Promise<ApiResponse> => {
    const response = await api.get('/staff', { params })
    return response.data
  },

  // Get single staff member
  getStaffMember: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/staff/${id}`)
    return response.data
  },

  // Create staff member
  createStaffMember: async (data: any): Promise<ApiResponse> => {
    const response = await api.post('/staff', data)
    return response.data
  },

  // Update staff member
  updateStaffMember: async (id: string, data: any): Promise<ApiResponse> => {
    const response = await api.put(`/staff/${id}`, data)
    return response.data
  },

  // Delete staff member
  deleteStaffMember: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/staff/${id}`)
    return response.data
  },

  // Activate staff member
  activateStaffMember: async (id: string): Promise<ApiResponse> => {
    const response = await api.post(`/staff/${id}/activate`)
    return response.data
  },

  // Change password
  changePassword: async (data: {
    current_password: string
    new_password: string
  }): Promise<ApiResponse> => {
    const response = await api.post('/staff/change-password', data)
    return response.data
  },

  // Get staff dashboard stats
  getStaffDashboardStats: async (): Promise<ApiResponse> => {
    const response = await api.get('/staff/stats/dashboard')
    return response.data
  },
}

// Companies API functions
export const companiesApi = {
  // Get all companies with filtering and pagination
  getCompanies: async (params?: {
    page?: number
    limit?: number
    search?: string
    active_only?: boolean
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<ApiResponse> => {
    const response = await api.get('/companies', { params })
    return response.data
  },

  // Get active companies for dropdown
  getActiveCompanies: async (): Promise<ApiResponse> => {
    const response = await api.get('/companies/active')
    return response.data
  },

  // Get company by ID
  getCompany: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/companies/${id}`)
    return response.data
  },

  // Create new company
  createCompany: async (data: any): Promise<ApiResponse> => {
    const response = await api.post('/companies', data)
    return response.data
  },

  // Update company
  updateCompany: async (id: string, data: any): Promise<ApiResponse> => {
    const response = await api.put(`/companies/${id}`, data)
    return response.data
  },

  // Activate company
  activateCompany: async (id: string): Promise<ApiResponse> => {
    const response = await api.patch(`/companies/${id}/activate`)
    return response.data
  },

  // Deactivate company
  deactivateCompany: async (id: string): Promise<ApiResponse> => {
    const response = await api.patch(`/companies/${id}/deactivate`)
    return response.data
  },

  // Delete company (soft delete)
  deleteCompany: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/companies/${id}`)
    return response.data
  },

  // Get company statistics
  getCompanyStats: async (): Promise<ApiResponse> => {
    const response = await api.get('/companies/stats/overview')
    return response.data
  },
}

export const branchesApi = {
  // Get all branches with filtering and pagination
  getBranches: async (params?: {
    page?: number
    limit?: number
    search?: string
    company_id?: string
    active_only?: boolean
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<ApiResponse> => {
    const response = await api.get('/branches', { params })
    return response.data
  },

  // Get branches by company ID
  getBranchesByCompany: async (companyId: string): Promise<ApiResponse> => {
    const response = await api.get(`/branches/by-company/${companyId}/public`)
    return response.data
  },

  // Get active branches for dropdown
  getActiveBranches: async (companyId?: string): Promise<ApiResponse> => {
    const params = companyId ? { company_id: companyId } : {}
    const response = await api.get('/branches/active', { params })
    return response.data
  },

  // Get branch by ID
  getBranch: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/branches/${id}`)
    return response.data
  },

  // Create new branch
  createBranch: async (data: any): Promise<ApiResponse> => {
    const response = await api.post('/branches', data)
    return response.data
  },

  // Update branch
  updateBranch: async (id: string, data: any): Promise<ApiResponse> => {
    const response = await api.put(`/branches/${id}`, data)
    return response.data
  },

  // Activate branch
  activateBranch: async (id: string): Promise<ApiResponse> => {
    const response = await api.patch(`/branches/${id}/activate`)
    return response.data
  },

  // Deactivate branch
  deactivateBranch: async (id: string): Promise<ApiResponse> => {
    const response = await api.patch(`/branches/${id}/deactivate`)
    return response.data
  },

  // Delete branch (soft delete)
  deleteBranch: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/branches/${id}`)
    return response.data
  },

  // Get branch statistics
  getBranchStats: async (): Promise<ApiResponse> => {
    const response = await api.get('/branches/stats/overview')
    return response.data
  },
}

// Utility functions
export const apiUtils = {
  // Handle API errors
  handleError: (error: any): string => {
    if (error.response?.data?.message) {
      return error.response.data.message
    } else if (error.response?.data?.errors?.length > 0) {
      return error.response.data.errors[0]
    } else if (error.message) {
      return error.message
    } else {
      return 'An unexpected error occurred'
    }
  },

  // Format API errors for display
  formatErrors: (errors: string[]): string => {
    if (errors.length === 1) {
      return errors[0]
    }
    return errors.map((error, index) => `${index + 1}. ${error}`).join('\n')
  },
}

export default api