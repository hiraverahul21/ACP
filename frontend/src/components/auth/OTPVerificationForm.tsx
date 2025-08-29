import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/context/AuthContext'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface OTPVerificationFormData {
  otp: string
}

interface OTPVerificationFormProps {
  email: string
  signupToken: string
  onVerificationSuccess: () => void
  onBackToSignUp: () => void
}

const OTPVerificationForm: React.FC<OTPVerificationFormProps> = ({
  email,
  signupToken,
  onVerificationSuccess,
  onBackToSignUp,
}) => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [canResend, setCanResend] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { verifyOTP, resendOTP } = useAuth()

  const {
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OTPVerificationFormData>()

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [countdown])

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return

    const newOtpValues = [...otpValues]
    newOtpValues[index] = value.slice(-1) // Only take the last digit
    setOtpValues(newOtpValues)

    // Update form value
    setValue('otp', newOtpValues.join(''))

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newOtpValues = [...otpValues]
    
    for (let i = 0; i < 6; i++) {
      newOtpValues[i] = pastedData[i] || ''
    }
    
    setOtpValues(newOtpValues)
    setValue('otp', newOtpValues.join(''))
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtpValues.findIndex(val => !val)
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()
  }

  const onSubmit = async (data: OTPVerificationFormData) => {
    if (data.otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP')
      return
    }

    try {
      setError(null)
      setIsLoading(true)
      await verifyOTP(email, data.otp, signupToken)
      onVerificationSuccess()
    } catch (err: any) {
      setError(err.message || 'Invalid OTP. Please try again.')
      // Clear OTP on error
      setOtpValues(['', '', '', '', '', ''])
      setValue('otp', '')
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      setError(null)
      setIsResending(true)
      await resendOTP(signupToken)
      setCountdown(30)
      setCanResend(false)
      // Clear current OTP
      setOtpValues(['', '', '', '', '', ''])
      setValue('otp', '')
      inputRefs.current[0]?.focus()
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP')
    } finally {
      setIsResending(false)
    }
  }

  // Mask email for display
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <Alert
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
          <CheckCircleIcon className="h-8 w-8 text-primary-600" />
        </div>
        <p className="text-sm text-gray-600 mb-2">
          We've sent a 6-digit verification code to:
        </p>
        <p className="text-lg font-medium text-gray-900 mb-4">
          {maskedEmail}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Enter Verification Code
        </label>
        <div className="flex justify-center space-x-3">
          {otpValues.map((value, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={value}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              disabled={isLoading}
            />
          ))}
        </div>
        {errors.otp && (
          <p className="mt-2 text-sm text-red-600">{errors.otp.message}</p>
        )}
      </div>

      <div>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          disabled={isLoading || otpValues.join('').length !== 6}
        >
          {isLoading ? 'Verifying...' : 'Verify & Complete Registration'}
        </Button>
      </div>

      <div className="text-center space-y-3">
        <div>
          {canResend ? (
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={isResending}
              className="text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend OTP'}
            </button>
          ) : (
            <p className="text-sm text-gray-500">
              Resend OTP in {countdown} seconds
            </p>
          )}
        </div>
        
        <button
          type="button"
          onClick={onBackToSignUp}
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Sign Up
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Didn't receive the code?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check if your mobile number is correct</li>
            <li>Make sure you have good network coverage</li>
            <li>Wait a few minutes for the SMS to arrive</li>
            <li>Check your SMS inbox and spam folder</li>
          </ul>
        </div>
      </div>
    </form>
  )
}

export default OTPVerificationForm