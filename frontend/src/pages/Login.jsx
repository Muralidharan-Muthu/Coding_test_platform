import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleOtpChange = (e) => {
    // Digits only, capped at the 6-digit OTP length.
    setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const usernameValue = username.trim()
    const emailValue = email.trim().toLowerCase()
    const otpValue = otp.trim()
    const newErrors = {}

    if (!usernameValue) {
      newErrors.username = 'Enter the username from your invitation email'
    }

    if (!emailValue) {
      newErrors.email = 'Enter your email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      newErrors.email = 'Enter a valid email'
    }

    if (!otpValue) {
      newErrors.otp = 'Enter the 6-digit OTP'
    } else if (otpValue.length !== 6) {
      newErrors.otp = 'OTP must be 6 digits'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      // The OTP is verified server-side against candidate_otp; never fetch the
      // candidate list here, it would expose every candidate's OTP to the browser.
      const response = await login(usernameValue, emailValue, otpValue, 'office')

      localStorage.setItem('session_id', response.session_id)
      localStorage.setItem('user_id', response.user_id)
      localStorage.setItem('user_name', response.name)
      localStorage.setItem('user_email', response.email)
      localStorage.setItem('test_location', response.test_location)

      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      const detail = err.response?.data?.detail || 'Verification failed. Please try again.'

      if (typeof detail === 'string' && detail.includes('Candidate not found')) {
        setErrors({
          username: 'Username and email do not match any invitation',
          email: 'Username and email do not match any invitation',
        })
      } else if (typeof detail === 'string' && detail.toUpperCase().includes('OTP')) {
        setErrors({ otp: detail })
      } else {
        setErrors({ otp: detail })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page login-page--centered">
      <div className="login-theme-corner">
        <ThemeToggle />
      </div>

      <main className="login-center-panel">
        <div className="login-center-box">
          <div className="login-center-logo" aria-label="Platform logo">
            <img
              src="/assets/meptrasoft-logo.png"
              alt="Coding Platform"
              className="login-center-logo-img"
            />
          </div>

          <div className="login-center-header">
            <h1>Candidate Verification</h1>
            <p className="login-center-sub">
              Enter the username and OTP from your invitation email to start your assessment.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="login-center-form">
            <div className="form-group">
              <label htmlFor="candidateUsername">Username</label>
              <input
                id="candidateUsername"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username from your email"
                disabled={loading}
                autoComplete="username"
              />
              {errors.username && <p className="error">{errors.username}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="candidateEmail">Email</label>
              <input
                id="candidateEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email the invitation was sent to"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="candidateOtp">
                OTP <span className="login-label-hint">6 digits, valid 24 hours</span>
              </label>
              <input
                id="candidateOtp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                disabled={loading}
                autoComplete="one-time-code"
                className="otp-input"
              />
              {errors.otp && <p className="error">{errors.otp}</p>}
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true"></span>
                  Verifying...
                </>
              ) : (
                'Verify & Start'
              )}
            </button>
          </form>

          <p className="login-footer-note">
            Just want to practice? <a href="/practice">Go to Practice →</a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login
