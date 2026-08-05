import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { candidateLogin } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import './Login.css'

function PracticeLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('practice_logged_in') === 'true') {
      navigate('/practice/problems', { replace: true })
    }
  }, [navigate])

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

      localStorage.setItem('practice_logged_in', 'true')
      localStorage.setItem('practice_user_id', response.user_id)
      localStorage.setItem('practice_name', response.name)
      localStorage.setItem('practice_email', response.email)

      navigate('/practice/problems')
    } catch (err) {
      console.error('Practice login error:', err)
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
            <h1>Practice Sign In</h1>
            <p className="login-center-sub">
              Sign in with the credentials provided by the Admin to practice all available questions.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="login-center-form">
            <div className="form-group">
              <label htmlFor="practiceEmail">Email</label>
              <input
                id="practiceEmail"
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
              <label htmlFor="practicePassword">Password</label>
              <input
                id="practicePassword"
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
                'Start Practicing'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default PracticeLogin
