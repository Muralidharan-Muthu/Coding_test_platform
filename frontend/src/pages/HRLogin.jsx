import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import './HRLogin.css'

function HRLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const emailValue = email.trim().toLowerCase()
    const passwordValue = password
    const newErrors = {}

    if (!emailValue) {
      newErrors.email = 'Enter your email'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      newErrors.email = 'Enter a valid email'
    }

    if (!passwordValue) {
      newErrors.password = 'Enter your password'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const response = await adminLogin(emailValue, passwordValue)
      localStorage.setItem('hr_name', response.name)
      localStorage.setItem('hr_logged_in', 'true')
      navigate('/dashboard/assessment')
    } catch (err) {
      console.error('Admin login error:', err)
      if (err.response?.status === 401) {
        setErrors({ password: 'Invalid email or password' })
      } else if (err.response?.status === 403) {
        setErrors({ email: 'This email is not an admin account' })
      } else {
        setErrors({ password: err.response?.data?.detail || 'Login failed' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="hr-login-page hr-login-page--centered">
      <div className="hr-login-theme-corner">
        <ThemeToggle />
      </div>

      <main className="hr-login-center-panel">
        <div className="hr-login-center-box">
          <div className="hr-login-center-logo" aria-label="Platform logo">
            <img
              src="/assets/meptrasoft-logo.png"
              alt="Coding Platform"
              className="hr-login-center-logo-img"
            />
          </div>

          <div className="hr-login-center-header">
            <h1>Admin Sign In</h1>
            <p className="hr-login-center-sub">
              Sign in to manage coding assessments and candidates.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="hr-login-center-form">
            <div className="hr-form-group">
              <label htmlFor="adminEmail">Email</label>
              <input
                id="adminEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="hr-form-group">
              <label htmlFor="adminPassword">Password</label>
              <input
                id="adminPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              {errors.password && <p className="error">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="hr-login-btn">
              {loading ? (
                <>
                  <span className="hr-btn-spinner" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default HRLogin
