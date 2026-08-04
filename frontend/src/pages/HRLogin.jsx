import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'
import { DecisionMindsLogoOnly } from '../components/ui/Branding'
import './HRLogin.css'

function HRLogin() {
  const [hrName, setHrName] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const hrNameValue = hrName.trim()
    const passwordValue = password
    const newErrors = {}

    if (!hrNameValue) {
      newErrors.hrName = 'Enter HR name'
    } else if (hrNameValue !== 'admin') {
      newErrors.hrName = 'Invalid HR name'
    }

    if (!passwordValue) {
      newErrors.password = 'Enter password'
    } else if (passwordValue !== 'admin123') {
      newErrors.password = 'Invalid password'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})

    // No validation - allow login with any input
    const storedHrName = hrNameValue || 'HR User'

    // Simple dummy login - just store and navigate
    localStorage.setItem('hr_name', storedHrName)
    localStorage.setItem('hr_logged_in', 'true')
    navigate('/dashboard/assessment')
  }

  return (
    <div className="hr-login-page">
      <div className="hr-login-theme-corner">
        <ThemeToggle />
      </div>

      {/* Brand Panel */}
      <aside className="hr-login-brand" aria-label="HR Portal branding">
        <div className="hr-brand-content">
          <div className="hr-brand-header">
            <div className="hr-brand-title-row">
              <h2 className="hr-brand-title">DM Recruit</h2>
            </div>
            <div className="hr-brand-powered">
              <span className="hr-brand-powered-text">Powered by</span>
              <div className="hr-brand-logo">
                <DecisionMindsLogoOnly size="small" />
              </div>
            </div>
          </div>
          <p className="hr-brand-desc">Manage coding assessments, invite candidates, and evaluate technical skills through an integrated assessment platform designed for efficient recruitment.</p>
          <div className="hr-brand-stats" aria-label="Platform features">
            <div className="hr-stat">
              <div className="hr-stat-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
              </div>
              <div className="hr-stat-text">
                <span className="hr-stat-value">Python &amp; SQL</span>
                <span className="hr-stat-label">Problem Library</span>
              </div>
            </div>
            <div className="hr-stat-divider" aria-hidden="true"></div>
            <div className="hr-stat">
              <div className="hr-stat-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <div className="hr-stat-text">
                <span className="hr-stat-value">Live Scoring</span>
                <span className="hr-stat-label">Real-time Engine</span>
              </div>
            </div>
            <div className="hr-stat-divider" aria-hidden="true"></div>
            <div className="hr-stat">
              <div className="hr-stat-icon-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="9" x2="9" y2="21"/>
                  <line x1="15" y1="9" x2="15" y2="21"/>
                </svg>
              </div>
              <div className="hr-stat-text">
                <span className="hr-stat-value">Excel Export</span>
                <span className="hr-stat-label">Reports &amp; Analytics</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hr-brand-decoration" aria-hidden="true">
          <div className="hr-deco-circle hr-deco-1"></div>
          <div className="hr-deco-circle hr-deco-2"></div>
        </div>
      </aside>

      {/* Form Panel */}
      <main className="hr-login-form-panel">
        <div className="hr-login-box">
          <div className="hr-login-header">
            <h1>HR Sign In</h1>
            <p className="hr-subtitle">Sign in to manage coding questions</p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="hr-form-group">
              <label htmlFor="hrName">HR Name</label>
              <input
                id="hrName"
                type="text"
                value={hrName}
                onChange={(e) => setHrName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
              />
              {errors.hrName && <p className="error">{errors.hrName}</p>}
            </div>

            <div className="hr-form-group">
              <label htmlFor="hrPassword">Password</label>
              <input
                id="hrPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              {errors.password && <p className="error">{errors.password}</p>}
            </div>

            <button type="submit" className="hr-login-btn">
              Sign In
            </button>
          </form>

          <p className="hr-login-footer-note">
            Candidate? <a href="/login">Go to Candidate Login →</a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default HRLogin
