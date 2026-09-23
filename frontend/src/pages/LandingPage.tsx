import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'
import { PlatformLogoOnly } from '../components/ui/Branding'

function LandingPage() {
  const navigate = useNavigate()

  const handleCandidate = () => {
    navigate('/login')
  }

  const handleAdmin = () => {
    navigate('/admin')
  }

  return (
    <div className="landing-page">
      {/* Theme toggle */}
      <div className="landing-theme-corner">
        <ThemeToggle />
      </div>

      {/* Animated background blobs */}
      <div className="landing-bg" aria-hidden="true">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
      </div>

      <div className="landing-content">
        {/* Header / Logo */}
        <header className="landing-header">
          <div className="landing-logo-wrap">
            <PlatformLogoOnly size="medium" />
          </div>
          <div className="landing-badge">Assessment Platform</div>
        </header>

        {/* Hero text */}
        <section className="landing-hero">
          <h1 className="landing-title">
            Welcome to <span className="landing-title-accent">DM Recruit</span>
          </h1>
          <p className="landing-subtitle">
            A modern technical assessment platform designed to evaluate
            candidates through real-world coding challenges.
          </p>
        </section>

        {/* Portal cards */}
        <section className="landing-portals" aria-label="Portal selection">
          {/* Candidate card */}
          <button
            id="portal-candidate"
            className="portal-card portal-candidate"
            onClick={handleCandidate}
            aria-label="Enter as Candidate"
          >
            <div className="portal-icon-wrap" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="portal-body">
              <h2 className="portal-title">Candidate</h2>
              <p className="portal-desc">
                Take your coding assessment — Python, SQL, or MCQ challenges
                assigned by your recruiter.
              </p>
              <div className="portal-features">
                <span className="pf-tag">Python</span>
                <span className="pf-tag">SQL</span>
                <span className="pf-tag">MCQ</span>
              </div>
            </div>
            <div className="portal-arrow" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
            <div className="portal-shine" aria-hidden="true" />
          </button>

          {/* Divider */}
          <div className="portal-divider" aria-hidden="true">
            <span>or</span>
          </div>

          {/* Admin card */}
          <button
            id="portal-admin"
            className="portal-card portal-admin"
            onClick={handleAdmin}
            aria-label="Enter as Admin"
          >
            <div className="portal-icon-wrap" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="portal-body">
              <h2 className="portal-title">Admin Portal</h2>
              <p className="portal-desc">
                Manage candidates, send OTPs, configure assessments, and
                review results from one dashboard.
              </p>
              <div className="portal-features">
                <span className="pf-tag pf-tag-admin">Manage</span>
                <span className="pf-tag pf-tag-admin">Invite</span>
                <span className="pf-tag pf-tag-admin">Reports</span>
              </div>
            </div>
            <div className="portal-arrow" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </div>
            <div className="portal-shine" aria-hidden="true" />
          </button>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© 2025 Coding Platform India Pvt. Ltd. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

export default LandingPage
