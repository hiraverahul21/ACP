import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import { companiesApi, branchesApi } from '@/utils/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

interface SignUpFormData {
  name: string
  email: string
  mobile: string
  role: string
  company_id: string
  branch_id: string
  password: string
  confirmPassword: string
  terms: boolean
}

interface SignUpFormProps {
  onSwitchToSignIn: () => void
  onSignUpSuccess: (data: { email: string; signupToken: string }) => void
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  onSwitchToSignIn,
  onSignUpSuccess,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [companies, setCompanies] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const [loadingBranches, setLoadingBranches] = useState(false)
  const { signup } = useAuth()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>()

  const password = watch('password')
  const selectedCompanyId = watch('company_id')

  // Fetch companies on component mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true)
        const response = await companiesApi.getActiveCompanies()
        if (response.success) {
          setCompanies(response.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch companies:', error)
      } finally {
        setLoadingCompanies(false)
      }
    }
    fetchCompanies()
  }, [])

  // Fetch branches when company is selected
  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedCompanyId) {
        setBranches([])
        return
      }
      
      try {
        setLoadingBranches(true)
        const response = await branchesApi.getBranchesByCompany(selectedCompanyId)
        if (response.success) {
          setBranches(response.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error)
        setBranches([])
      } finally {
        setLoadingBranches(false)
      }
    }
    fetchBranches()
  }, [selectedCompanyId])

  const formatMobileNumber = (value: string) => {
    // Remove all non-digits and limit to 10 digits
    const digits = value.replace(/\D/g, '').slice(0, 10)
    return digits
  }

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setError(null)
      setIsLoading(true)
      
      const formattedData = {
        name: data.name,
        email: data.email,
        mobile: data.mobile.replace(/\s/g, ''), // Remove spaces for API
        role: data.role,
        company_id: data.company_id,
        branch_id: data.branch_id,
        password: data.password,
      }
      
      const result = await signup(formattedData)
      onSignUpSuccess({
        email: data.email,
        signupToken: result.signupToken,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div>
        <Input
          label="Full Name"
          type="text"
          autoComplete="name"
          placeholder="Enter your full name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Full name is required',
            minLength: {
              value: 2,
              message: 'Name must be at least 2 characters',
            },
            maxLength: {
              value: 50,
              message: 'Name must be less than 50 characters',
            },
          })}
        />
      </div>

      <div>
        <Input
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address',
            },
          })}
        />
      </div>

      <div>
        <Input
          label="Mobile Number"
          type="tel"
          autoComplete="tel"
          placeholder="Enter 10-digit mobile number"
          error={errors.mobile?.message}
          {...register('mobile', {
            required: 'Mobile number is required',
            validate: {
              format: (value) => {
                const cleaned = value.replace(/\s/g, '')
                return /^[6-9]\d{9}$/.test(cleaned) || 'Please enter a valid 10-digit mobile number'
              },
            },
            onChange: (e) => {
              e.target.value = formatMobileNumber(e.target.value)
            },
          })}
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
          Role
        </label>
        <select
          id="role"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          {...register('role', {
            required: 'Please select a role',
          })}
        >
          <option value="">Select your role</option>
          <option value="ADMIN">Admin</option>
          <option value="REGIONAL_MANAGER">Regional Manager</option>
          <option value="AREA_MANAGER">Area Manager</option>
          <option value="TECHNICIAN">Technician</option>
        </select>
        {errors.role && (
          <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="company_id" className="block text-sm font-medium text-gray-700 mb-1">
          Company
        </label>
        <select
          id="company_id"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          disabled={loadingCompanies}
          {...register('company_id', {
            required: 'Please select a company',
          })}
        >
          <option value="">
            {loadingCompanies ? 'Loading companies...' : 'Select a company'}
          </option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        {errors.company_id && (
          <p className="mt-1 text-sm text-red-600">{errors.company_id.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="branch_id" className="block text-sm font-medium text-gray-700 mb-1">
          Branch
        </label>
        <select
          id="branch_id"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          disabled={!selectedCompanyId || loadingBranches}
          {...register('branch_id', {
            required: 'Please select a branch',
          })}
        >
          <option value="">
            {!selectedCompanyId 
              ? 'Select a company first'
              : loadingBranches 
              ? 'Loading branches...' 
              : 'Select a branch'
            }
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name} - {branch.city}
            </option>
          ))}
        </select>
        {errors.branch_id && (
          <p className="mt-1 text-sm text-red-600">{errors.branch_id.message}</p>
        )}
      </div>

      <div>
        <div className="relative">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Create a password"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters',
              },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: 'Password must contain uppercase, lowercase, number and special character',
              },
            })}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div>
        <div className="relative">
          <Input
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Confirm your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            })}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? (
              <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            ) : (
              <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center">
        <input
          id="terms"
          name="terms"
          type="checkbox"
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          {...register('terms', {
            required: 'You must accept the terms and conditions',
          })}
        />
        <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
          I agree to the{' '}
          <a href="#" className="text-primary-600 hover:text-primary-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-primary-600 hover:text-primary-500">
            Privacy Policy
          </a>
        </label>
      </div>
      {errors.terms && (
        <p className="text-sm text-red-600">{errors.terms.message}</p>
      )}

      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            Sign in here
          </button>
        </p>
      </div>
    </form>
  )
}

export default SignUpForm