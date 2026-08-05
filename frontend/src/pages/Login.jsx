import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { candidateLogin } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const emailValue = email.trim().toLowerCase()
    const passwordValue = password.trim()
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
      const response = await candidateLogin(emailValue, passwordValue)

      localStorage.setItem('user_id', response.user_id)
      localStorage.setItem('user_name', response.name)
      localStorage.setItem('user_email', response.email)
      localStorage.setItem('test_location', 'office')

      navigate('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      const detail = err.response?.data?.detail || 'Login failed. Please try again.'
      if (err.response?.status === 401) {
        setErrors({ password: 'Invalid email or password' })
      } else if (err.response?.status === 403) {
        setErrors({ email: 'This email is not a candidate account' })
      } else {
        setErrors({ password: detail })
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
            <h1>Candidate Sign In</h1>
            <p className="login-center-sub">
              Your login credentials are provided by the Admin.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="login-center-form">
            <div className="form-group">
              <label htmlFor="candidateEmail">Email</label>
              <input
                id="candidateEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                disabled={loading}
                autoComplete="email"
              />
              {errors.email && <p className="error">{errors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="candidatePassword">Password</label>
              <input
                id="candidatePassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              {errors.password && <p className="error">{errors.password}</p>}
            </div>

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? (
                <>
                  <span className="btn-spinner" aria-hidden="true"></span>
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

export default Login
