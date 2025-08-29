import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'

interface ForgotPasswordFormData {
  email: string
}

interface ForgotPasswordFormProps {
  onSwitchToSignIn: () => void
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
  onSwitchToSignIn,
}) => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const { forgotPassword } = useAuth()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>()

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setError(null)
      setIsLoading(true)
      await forgotPassword(data.email)
      setEmail(data.email)
      setIsSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAgain = () => {
    setIsSuccess(false)
    setEmail('')
    setError(null)
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
          <CheckCircleIcon className="h-8 w-8 text-green-600" />
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Check Your Email
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            We've sent a new temporary password to:
          </p>
          <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
            {email}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Next Steps:</p>
            <ul className="list-disc list-inside space-y-1 text-left">
              <li>Check your email inbox (and spam folder)</li>
              <li>Use the temporary password to sign in</li>
              <li>Change your password after signing in</li>
            </ul>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={onSwitchToSignIn}
          >
            Back to Sign In
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleTryAgain}
          >
            Try Different Email
          </Button>
        </div>
      </div>
    )
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

      <div className="text-center mb-6">
        <p className="text-sm text-gray-600">
          Enter your email address and we'll send you a new temporary password.
        </p>
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

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="text-sm text-yellow-800">
          <p className="font-medium mb-1">Important:</p>
          <p>
            For security reasons, we'll send a temporary password to your email. 
            Please change it after signing in.
          </p>
        </div>
      </div>

      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send New Password'}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Remember your password?{' '}
          <button
            type="button"
            onClick={onSwitchToSignIn}
            className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
          >
            Back to sign in
          </button>
        </p>
      </div>
    </form>
  )
}

export default ForgotPasswordForm