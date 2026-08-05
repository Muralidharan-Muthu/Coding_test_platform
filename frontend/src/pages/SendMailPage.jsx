import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateOTP, getCandidates, sendOTPEmail } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import './CandidateOTP.css'
import './SendMailPage.css'

const NAV_ITEMS = [
  {
    label: 'Assessment Dashboard',
    href: '/dashboard/assessment',
    activePaths: ['/dashboard/assessment'],
  },
  { label: 'Questions', href: '/admin/questions', activePaths: ['/admin/questions'] },
  {
    label: 'Manage Candidates',
    href: '/admin/otp',
    activePaths: ['/admin/otp'],
    children: [
      { label: 'Choose Test Type', href: '/admin/test-type', activePaths: ['/admin/test-type'] },
      { label: 'Send Mail', href: '/admin/send-mail', activePaths: ['/admin/send-mail'] },
    ],
  },
]

function SendMailPage() {
  const navigate = useNavigate()
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [candidates, setCandidates] = useState([])
  const [generating, setGenerating] = useState({})
  const [sending, setSending] = useState({})

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name || 'Admin User')
    loadCandidates()
  }, [navigate])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 4500)
    return () => clearTimeout(timer)
  }, [success])

  const loadCandidates = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await getCandidates()
      setCandidates(response.candidates || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }

  const dedupedCandidates = useMemo(() => {
    const seen = new Set()
    const unique = []

    for (const candidate of candidates) {
      const key = String(candidate.email || '').trim().toLowerCase()
      if (!key) continue
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(candidate)
    }

    return {
      rows: unique,
      duplicateCount: Math.max(candidates.length - unique.length, 0),
    }
  }, [candidates])

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  const getStatusBadge = (candidate) => {
    if (!candidate.otp_code) return <span className="status-badge status-no-otp">No OTP</span>
    if (candidate.is_expired) return <span className="status-badge status-expired">Expired</span>
    if (candidate.sent) return <span className="status-badge status-sent">Sent</span>
    return <span className="status-badge status-generated">Generated</span>
  }

  const handleGenerateOTP = async (candidate) => {
    setGenerating((prev) => ({ ...prev, [candidate.email]: true }))
    setError('')
    setSuccess('')

    try {
      const response = await generateOTP(candidate.username, candidate.email)
      setSuccess(`OTP generated for ${candidate.email}: ${response.otp}`)
      await loadCandidates()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate OTP')
    } finally {
      setGenerating((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleSendEmail = async (candidate) => {
    setSending((prev) => ({ ...prev, [candidate.email]: true }))
    setError('')
    setSuccess('')

    try {
      const response = await sendOTPEmail(candidate.username, candidate.email)
      if (response.delivered) {
        setSuccess(
          response.otp_regenerated
            ? `Email sent successfully to ${candidate.email} with a fresh OTP`
            : `Email sent successfully to ${candidate.email}`
        )
      } else if (response.status === 'warning') {
        const manualDetails = [
          response.message,
          response.otp ? `OTP: ${response.otp}` : '',
          response.login_link ? `Login: ${response.login_link}` : '',
        ].filter(Boolean).join(' ')
        setError(manualDetails)
      } else {
        setSuccess(`Email sent to ${candidate.email}`)
      }
      await loadCandidates()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || `Failed to send mail to ${candidate.email}`)
    } finally {
      setSending((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  return (
    <AdminSidebarLayout
      className="send-mail-page"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <div className="otp-content send-mail-content">
        {error && <div className="otp-error-msg">{error}</div>}
        {success && <div className="otp-success-msg">{success}</div>}

        <div className="otp-table-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>Imported Candidates ({dedupedCandidates.rows.length})</h3>
            {dedupedCandidates.duplicateCount > 0 && (
              <span className="send-mail-dedupe-note">
                Duplicate rows hidden: {dedupedCandidates.duplicateCount}
              </span>
            )}
          </div>

          {loading ? (
            <p>Loading...</p>
          ) : dedupedCandidates.rows.length === 0 ? (
            <p className="otp-no-data">No candidates found.</p>
          ) : (
            <div className="table-responsive">
              <table className="otp-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>OTP</th>
                    <th>Generated</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Generate OTP</th>
                    <th>Send Mail</th>
                    <th>View</th>
                  </tr>
                </thead>
                <tbody>
                  {dedupedCandidates.rows.map((candidate) => (
                    <tr key={candidate.email}>
                      <td>{candidate.username}</td>
                      <td className="email-cell">{candidate.email}</td>
                      <td className="otp-code">{candidate.otp_code || '-'}</td>
                      <td>{formatDate(candidate.created_at)}</td>
                      <td>{formatDate(candidate.expires_at)}</td>
                      <td>{getStatusBadge(candidate)}</td>
                      <td>
                        <button
                          type="button"
                          className="otp-btn-generate"
                          disabled={Boolean(generating[candidate.email]) || Boolean(sending[candidate.email])}
                          onClick={() => handleGenerateOTP(candidate)}
                        >
                          {generating[candidate.email] ? 'Generating...' : 'Generate OTP'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="otp-btn-send"
                          disabled={candidate.sent || Boolean(sending[candidate.email]) || Boolean(generating[candidate.email])}
                          onClick={() => handleSendEmail(candidate)}
                        >
                          {sending[candidate.email] ? 'Sending...' : 'Send Mail'}
                        </button>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="otp-btn-view"
                          onClick={() => navigate(`/admin/dashboard?candidate_email=${encodeURIComponent(candidate.email)}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default SendMailPage
