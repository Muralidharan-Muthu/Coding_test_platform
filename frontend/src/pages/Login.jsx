import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, getCandidates } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { DecisionMindsLogoOnly, HouseIcon, BuildingIcon } from '../components/ui/Branding'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [gmail, setGmail] = useState('')
  const [otp, setOtp] = useState('')
  const [testLocation, setTestLocation] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleOtpChange = (e) => {
    const value = e.target.value
    // Only allow numeric digits and limit to 6 characters
    const numericValue = value.replace(/[^0-9]/g, '')
    setOtp(numericValue.slice(0, 6))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const usernameValue = username.trim()
    const gmailValue = gmail.trim()
    const testLocationValue = testLocation
    const otpValue = otp.trim() // OTP for candidates
    setLoading(true)

    try {
      const candidateResponse = await getCandidates()
      const candidates = candidateResponse.candidates || []
      const newErrors = {}
      const user = candidates.find((candidate) => candidate.username === usernameValue)
      const emailMatch = candidates.find((candidate) => candidate.email === gmailValue)
      const otpMatch = candidates.find(
        (candidate) => (candidate.otp ?? candidate.otp_code) === otpValue
      )

      if (!usernameValue) {
        newErrors.username = 'Enter username'
      } else if (!user) {
        newErrors.username = 'Invalid username'
      }

      if (!gmailValue) {
        newErrors.email = 'Enter email'
      } else if (!emailMatch) {
        newErrors.email = 'Invalid email'
      }

      if (!otpValue) {
        newErrors.otp = 'Enter OTP'
      } else if (!otpMatch) {
        newErrors.otp = 'Invalid OTP'
      }

      if (!testLocationValue) {
        newErrors.location = 'Select test location'
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      setErrors({})
    
      console.log('Login attempt:', {
        username: usernameValue,
        email: gmailValue,
        otp: otpValue,
        testLocation: testLocationValue
      })

      const response = await login(usernameValue, gmailValue, otpValue, testLocationValue)
      localStorage.setItem('session_id', response.session_id)
      localStorage.setItem('user_id', response.user_id)
      localStorage.setItem('user_name', response.name)
      localStorage.setItem('user_email', response.email)
      localStorage.setItem('test_location', response.test_location)
      
      // Always go to dashboard first - exam timer starts only when user clicks "Take Test"
      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      const detail = err.response?.data?.detail || 'Login failed. Please try again.'

      if (typeof detail === 'string' && detail.includes('Candidate not found')) {
        setErrors({
          username: 'Invalid username',
          email: 'Invalid email'
        })
        return
      }

      if (typeof detail === 'string' && detail.includes('OTP')) {
        setErrors({
          otp: detail.includes('Invalid OTP') ? 'Invalid OTP' : detail
        })
        return
      }

      setErrors({
        email: detail
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-theme-corner">
        <ThemeToggle />
      </div>

      {/* Brand Panel */}
      <aside className="login-brand" aria-label="Platform branding">
        <div className="brand-content">
          <div className="brand-header">
            <div className="brand-title-row">
              <h2 className="brand-title">DM Recruit</h2>
            </div>
            <div className="brand-powered">
              <span className="brand-powered-text">Powered by</span>
              <div className="brand-logo">
                <DecisionMindsLogoOnly size="small" />
              </div>
            </div>
          </div>
          <p className="brand-desc">Decision Minds partners with enterprises to modernize platforms, scale AI adoption, and deliver outcomes aligned to real business priorities. Our team combines deep technical expertise with strategic insight to unlock the full potential of your data ecosystem.</p>
          <ul className="brand-features" aria-label="Platform features">
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              Cloud-native data platform modernization
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              AI-first product engineering and accelerators
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              Multi-cloud architecture and governance
            </li>
            <li>
              <span className="feature-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              Business intelligence and KPI frameworks
            </li>
          </ul>
        </div>
        <div className="brand-decoration" aria-hidden="true">
          <div className="deco-circle deco-circle-1"></div>
          <div className="deco-circle deco-circle-2"></div>
        </div>
      </aside>

      {/* Form Panel */}
      <main className="login-form-panel">
        <div className="login-box">
          <div className="login-header">
            <h1>Welcome</h1>
            <p className="subtitle">Sign in to start your coding test</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="username">User Name</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your User Name"
                disabled={loading}
                autoComplete="name"
              />
              {errors.username && <p className="error">{errors.username}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="gmail">Gmail</label>
              <input
                id="gmail"
                type="text"
                value={gmail}
                onChange={(e) => setGmail(e.target.value)}
                placeholder="Enter your Gmail"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="otp">OTP Code <span className="label-hint">(if provided by HR)</span></label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                disabled={loading}
                autoComplete="one-time-code"
              />
              {errors.otp && <p className="error">{errors.otp}</p>}
            </div>

            <div className="form-group">
              <label>Test Location</label>
              <div className="location-options">
                <label className={`location-option${testLocation === 'home' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="testLocation"
                    value="home"
                    checked={testLocation === 'home'}
                    onChange={(e) => setTestLocation(e.target.value)}
                    disabled={loading}
                  />
                  <span className="location-icon" aria-hidden="true"><HouseIcon size={18} /></span>
                  <span className="location-text">Home</span>
                </label>
                <label className={`location-option${testLocation === 'office' ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    name="testLocation"
                    value="office"
                    checked={testLocation === 'office'}
                    onChange={(e) => setTestLocation(e.target.value)}
                    disabled={loading}
                  />
                  <span className="location-icon" aria-hidden="true"><BuildingIcon size={18} /></span>
                  <span className="location-text">Office</span>
                </label>
              </div>
              {errors.location && <p className="error">{errors.location}</p>}
            </div>
            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true"></span>
                  Verifying...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="login-footer-note">
            Are you HR? <a href="/hr">Access HR Portal →</a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default Login
