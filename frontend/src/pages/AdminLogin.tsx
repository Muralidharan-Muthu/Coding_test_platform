import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import Spinner from '../components/ui/Spinner'

function AdminLogin() {
  const [email, setEmail] = useState('muralidharanm@meptrasoftai.com')
  const [password, setPassword] = useState('admin@1234')
  const [showPassword, setShowPassword] = useState(false)
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
      localStorage.setItem('admin_name', response.name)
      localStorage.setItem('admin_logged_in', 'true')
      navigate('/admin/dashboard/assessment')
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
    <div className="admin-login-page admin-login-page--centered">
      <div className="admin-login-theme-corner">
        <ThemeToggle />
      </div>

      <main className="admin-login-center-panel">
        <div className="admin-login-center-box">
          <div className="admin-login-center-logo" aria-label="Platform logo">
            <img
              src="/assets/meptrasoft-logo.png"
              alt="Coding Platform"
              className="admin-login-center-logo-img"
            />
          </div>

          <div className="admin-login-center-header">
            <h1>Admin Sign In</h1>
            <p className="admin-login-center-sub">
              Sign in to manage coding assessments and candidates.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="admin-login-center-form">
            <div className="admin-form-group">
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

            <div className="admin-form-group">
              <label htmlFor="adminPassword">Password</label>
              <div className="admin-password-wrapper">
                <input
                  id="adminPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="error">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="admin-login-btn">
              {loading ? (
                <>
                  <Spinner size={16} />
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

export default AdminLogin
