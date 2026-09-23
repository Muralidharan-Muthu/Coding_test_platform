import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCandidates, sendOTPEmail } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import Spinner from '../components/ui/Spinner'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from '../constants/data'
import { FiMail, FiEye, FiUsers } from 'react-icons/fi'

function SendMailPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
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

  const loadCandidates = async () => {
    setLoading(true)
    try {
      const response = await getCandidates()
      setCandidates(response.candidates || [])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load candidates')
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

  const formatDate = (isoString) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      return date.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return '-'
    }
  }

  const handleSendEmail = async (candidate) => {
    setSending((prev) => ({ ...prev, [candidate.email]: true }))
    try {
      const response = await sendOTPEmail(candidate.username, candidate.email)
      if (response.delivered) {
        toast.success(`Access pass & OTP sent successfully to ${candidate.email}`)
      } else if (response.status === 'warning') {
        const manualDetails = [
          response.message,
          response.otp ? `OTP: ${response.otp}` : '',
          response.login_link ? `Login: ${response.login_link}` : '',
        ].filter(Boolean).join(' ')
        toast.warning(manualDetails, { duration: Infinity })
      } else {
        toast.success(`Access email dispatched to ${candidate.email}`)
      }
      await loadCandidates()
    } catch (err) {
      toast.error(
        err.response?.data?.detail || err.message || `Failed to send mail to ${candidate.email}`
      )
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
        <div className="mc-table-card">
          <div className="mc-table-header">
            <div>
              <h3 className="mc-card-title">Candidate Credentials & Mail ({dedupedCandidates.rows.length})</h3>
              <p className="mc-card-subtitle" style={{ marginTop: '2px' }}>
                {dedupedCandidates.duplicateCount > 0 ? `${dedupedCandidates.duplicateCount} duplicate rows hidden — ` : ''}
                Send instant access passes with automatically generated OTP credentials.
              </p>
            </div>
          </div>

          {loading ? (
            <Spinner label="Loading candidates…" size={40} />
          ) : dedupedCandidates.rows.length === 0 ? (
            <div className="mc-empty-state">
              <div className="mc-empty-icon"><FiUsers /></div>
              <h4>No Candidates Found</h4>
              <p>Add candidates first in Manage Candidates to send credentials.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="mc-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th style={{ width: '110px' }}>OTP</th>
                    <th>Generated Date & Time</th>
                    <th>Expires Date & Time</th>
                    <th style={{ width: '130px', textAlign: 'center' }}>Send Mail</th>
                    <th style={{ width: '70px', textAlign: 'center' }}>View</th>
                  </tr>
                </thead>
                <tbody>
                  {dedupedCandidates.rows.map((candidate, index) => (
                    <tr key={candidate.email}>
                      <td className="mc-col-num">#{index + 1}</td>
                      <td><span className="mc-username-text">{candidate.username}</span></td>
                      <td className="email-cell"><span className="mc-email-text">{candidate.email}</span></td>
                      <td>
                        <span className="sm-otp-code">{candidate.otp_code || '—'}</span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatDate(candidate.created_at)}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatDate(candidate.expires_at)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="sm-btn-action send"
                          disabled={Boolean(sending[candidate.email])}
                          onClick={() => handleSendEmail(candidate)}
                        >
                          <FiMail size={12} style={{ marginRight: '4px' }} />
                          {sending[candidate.email] ? 'Sending...' : 'Send Mail'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="sm-btn-view"
                          title="View Assessment"
                          onClick={() => navigate(`/admin/dashboard?candidate_email=${encodeURIComponent(candidate.email)}`)}
                        >
                          <FiEye size={13} />
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