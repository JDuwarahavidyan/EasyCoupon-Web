import { useState, useContext, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext.jsx'
import { login, forgotPasswordSendOtp, forgotPasswordVerifyOtp } from '../api/auth.js'
import { Eye, EyeOff, Loader2, ArrowLeft, Mail } from 'lucide-react'
import logo from '../assets/logo.png'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60

const OtpInput = ({ value, onChange }) => {
  const inputRefs = useRef([])

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return

    const digit = val.slice(-1)
    const newOtp = value.split('')
    newOtp[index] = digit
    onChange(newOtp.join(''))

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newOtp = value.split('')
      if (newOtp[index]) {
        newOtp[index] = ''
        onChange(newOtp.join(''))
      } else if (index > 0) {
        newOtp[index - 1] = ''
        onChange(newOtp.join(''))
        inputRefs.current[index - 1]?.focus()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH)
    if (pasted) {
      onChange(pasted.padEnd(OTP_LENGTH, '').slice(0, OTP_LENGTH))
      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1)
      inputRefs.current[focusIndex]?.focus()
    }
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-13 border border-gray-200 rounded-xl text-center text-lg font-bold font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-colors"
        />
      ))}
    </div>
  )
}

const Login = () => {
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { isFetching, dispatch } = useContext(AuthContext)
  const navigate = useNavigate()

  // Forgot password state: 'email' | 'otp' | 'success'
  const [forgotStep, setForgotStep] = useState(null)
  const [forgotEmail, setForgotEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')

  // Resend cooldown
  const [resendTimer, setResendTimer] = useState(0)
  const timerRef = useRef(null)

  const startResendTimer = useCallback(() => {
    setResendTimer(RESEND_COOLDOWN)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          timerRef.current = null
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!userName.trim() || !password.trim()) {
      setError('Please fill in all fields')
      return
    }

    dispatch({ type: 'LOGIN_START' })

    try {
      const data = await login({ userName: userName.trim(), password })

      if (data.isFirstTime) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { ...data, isFirstTime: true },
        })
        navigate(`/pwreset?uid=${data.uid}`)
      } else {
        dispatch({ type: 'LOGIN_SUCCESS', payload: data })
        navigate('/')
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.'
      setError(msg)
      dispatch({ type: 'LOGIN_FAILURE', payload: msg })
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')

    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address')
      return
    }

    setForgotLoading(true)

    try {
      await forgotPasswordSendOtp({ email: forgotEmail.trim() })
      setForgotStep('otp')
      setForgotSuccess('If this email is registered, an OTP has been sent. Check your inbox.')
      startResendTimer()
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setForgotError('')
    setForgotSuccess('')

    const trimmedOtp = otp.replace(/\s/g, '')
    if (trimmedOtp.length !== OTP_LENGTH) {
      setForgotError('Please enter the complete 6-digit OTP')
      return
    }

    setForgotLoading(true)

    try {
      const data = await forgotPasswordVerifyOtp({ email: forgotEmail.trim(), otp: trimmedOtp })
      setForgotStep('success')
      setForgotSuccess(data.message || 'Password has been reset. Check your email for the new credentials.')
      setOtp('')
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Invalid OTP. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setForgotError('')
    setForgotSuccess('')
    setForgotLoading(true)

    try {
      await forgotPasswordSendOtp({ email: forgotEmail.trim() })
      setForgotSuccess('A new OTP has been sent to your email.')
      setOtp('')
      startResendTimer()
    } catch (err) {
      setForgotError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const switchToForgot = () => {
    setForgotStep('email')
    setError('')
    setForgotError('')
    setForgotSuccess('')
    setForgotEmail('')
    setOtp('')
    setResendTimer(0)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const switchToLogin = () => {
    setForgotStep(null)
    setForgotError('')
    setForgotSuccess('')
    setForgotEmail('')
    setOtp('')
    setResendTimer(0)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  const getHeader = () => {
    if (!forgotStep) return { title: 'Welcome Back', subtitle: 'Sign in to Easy Coupon Admin' }
    if (forgotStep === 'email') return { title: 'Reset Password', subtitle: 'Enter your email to receive a verification code' }
    if (forgotStep === 'otp') return { title: 'Verify OTP', subtitle: `Enter the code sent to ${forgotEmail}` }
    return { title: 'Password Reset', subtitle: 'Your password has been reset successfully' }
  }

  const { title, subtitle } = getHeader()

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary-500 via-primary-600 to-primary-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="Easy Coupon" className="w-16 h-16 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500 mt-1 text-center">{subtitle}</p>
          </div>

          {/* Login Form */}
          {!forgotStep && (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Username
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={switchToForgot}
                      className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-colors pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isFetching}
                  className="w-full bg-primary-400 hover:bg-primary-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isFetching ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            </>
          )}

          {/* Forgot Password - Step 1: Email */}
          {forgotStep === 'email' && (
            <>
              {forgotError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {forgotError}
                </div>
              )}

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400 transition-colors"
                    />
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-primary-400 hover:bg-primary-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>

                <button
                  type="button"
                  onClick={switchToLogin}
                  className="w-full flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </button>
              </form>
            </>
          )}

          {/* Forgot Password - Step 2: OTP Verification */}
          {forgotStep === 'otp' && (
            <>
              {forgotError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {forgotError}
                </div>
              )}

              {forgotSuccess && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600">
                  {forgotSuccess}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                    Verification Code
                  </label>
                  <OtpInput value={otp} onChange={setOtp} />
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-primary-400 hover:bg-primary-500 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Reset Password'
                  )}
                </button>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </button>
                  {resendTimer > 0 ? (
                    <span className="text-sm text-gray-400 font-medium tabular-nums">
                      Resend in {resendTimer}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={forgotLoading}
                      className="text-sm text-primary-500 hover:text-primary-600 font-medium transition-colors disabled:opacity-60"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            </>
          )}

          {/* Forgot Password - Step 3: Success */}
          {forgotStep === 'success' && (
            <div className="space-y-5">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-600 text-center">
                {forgotSuccess}
              </div>

              <p className="text-sm text-gray-500 text-center">
                Check your email for your new temporary password, then log in and change it.
              </p>

              <button
                type="button"
                onClick={switchToLogin}
                className="w-full bg-primary-400 hover:bg-primary-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          Easy Coupon Admin Panel
        </p>
      </div>
    </div>
  )
}

export default Login
