import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import './AdminLogin.css'

function AdminLogin() {
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
      localStorage.setItem('admin_name', response.name)
      localStorage.setItem('admin_logged_in', 'true')
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

            <button type="submit" disabled={loading} className="admin-login-btn">
              {loading ? (
                <>
                  <span className="admin-btn-spinner" aria-hidden="true"></span>
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
