import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheck, FiRefreshCw, FiSave } from 'react-icons/fi'
import {
  getCandidates,
  setCandidateTestType,
  shuffleCandidateQuestions,
  bulkSaveCandidateTestTypes,
  bulkShuffleCandidateQuestions,
} from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import Spinner from '../components/ui/Spinner'
import { ADMIN_NAV_ITEMS as NAV_ITEMS, TEST_TYPES, normalizeTestType } from '../constants/data'
import './CandidateOTP.css'
import './ChooseTestTypePage.css'

function ChooseTestTypePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [candidates, setCandidates] = useState([])
  const [selectedTypes, setSelectedTypes] = useState({})
  const [shuffledState, setShuffledState] = useState({})
  const [saving, setSaving] = useState({})
  const [shuffling, setShuffling] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkShuffling, setBulkShuffling] = useState(false)
  const [loading, setLoading] = useState(true)

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
    try {
      setLoading(true)
      const response = await getCandidates()
      const candidateRows = response.candidates || []
      setCandidates(candidateRows)

      const nextTypes = {}
      const nextShuffled = {}
      candidateRows.forEach((candidate) => {
        nextTypes[candidate.email] = normalizeTestType(candidate.test_type)
        nextShuffled[candidate.email] = Boolean(candidate.is_shuffled)
      })
      setSelectedTypes(nextTypes)
      setShuffledState(nextShuffled)
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
      if (!key || seen.has(key)) continue
      seen.add(key)
      unique.push(candidate)
    }

    return {
      rows: unique,
      duplicateCount: Math.max(candidates.length - unique.length, 0),
    }
  }, [candidates])

  const summary = useMemo(() => {
    const counts = Object.keys(TEST_TYPES).reduce((accumulator, key) => ({
      ...accumulator,
      [key]: 0,
    }), {
      total: dedupedCandidates.rows.length,
    })

    dedupedCandidates.rows.forEach((candidate) => {
      counts[normalizeTestType(selectedTypes[candidate.email] || candidate.test_type)] += 1
    })

    return counts
  }, [dedupedCandidates.rows, selectedTypes])

  const handleTypeChange = (email, value) => {
    const normalized = normalizeTestType(value)
    setSelectedTypes((prev) => ({
      ...prev,
      [email]: normalized,
    }))
    // Release the shuffle status for this candidate when test type is changed
    setShuffledState((prev) => ({
      ...prev,
      [email]: false,
    }))
  }

  const handleSaveCandidate = async (candidate) => {
    const nextType = normalizeTestType(selectedTypes[candidate.email] || candidate.test_type)
    setSaving((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      await setCandidateTestType(candidate.email, nextType)
      setCandidates((prev) => prev.map((row) => (
        row.email === candidate.email
          ? { ...row, test_type: nextType }
          : row
      )))
      toast.success(`Saved ${TEST_TYPES[nextType].label} for ${candidate.username}.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to save test type for ${candidate.username}`)
    } finally {
      setSaving((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleShuffleCandidate = async (candidate) => {
    const nextType = normalizeTestType(selectedTypes[candidate.email] || candidate.test_type)
    setShuffling((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      const response = await shuffleCandidateQuestions(candidate.email, nextType)
      setCandidates((prev) => prev.map((row) => (
        row.email === candidate.email
          ? { ...row, test_type: nextType }
          : row
      )))
      setShuffledState((prev) => ({ ...prev, [candidate.email]: true }))
      toast.success(`Shuffled ${response.saved} questions for ${candidate.username} (${TEST_TYPES[nextType].label}).`)
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to shuffle questions for ${candidate.username}`)
    } finally {
      setShuffling((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  const handleShuffleAll = async () => {
    if (dedupedCandidates.rows.length === 0) return
    setBulkShuffling(true)

    try {
      const payload = dedupedCandidates.rows.map((c) => ({
        email: c.email,
        test_type: normalizeTestType(selectedTypes[c.email] || c.test_type),
      }))
      const response = await bulkShuffleCandidateQuestions(payload)

      const updatedShuffled = {}
      dedupedCandidates.rows.forEach((c) => {
        updatedShuffled[c.email] = true
      })
      setShuffledState((prev) => ({ ...prev, ...updatedShuffled }))

      toast.success(`Successfully shuffled questions for all ${dedupedCandidates.rows.length} candidates!`, {
        title: 'Bulk Shuffle Complete',
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to shuffle questions for all candidates')
    } finally {
      setBulkShuffling(false)
    }
  }

  const handleSaveAll = async () => {
    if (dedupedCandidates.rows.length === 0) return
    setBulkSaving(true)

    try {
      const assignments = dedupedCandidates.rows.map((c) => ({
        email: c.email,
        test_type: normalizeTestType(selectedTypes[c.email] || c.test_type),
      }))
      await bulkSaveCandidateTestTypes(assignments)

      setCandidates((prev) => prev.map((row) => ({
        ...row,
        test_type: normalizeTestType(selectedTypes[row.email] || row.test_type),
      })))

      toast.success(`Saved test types for all ${dedupedCandidates.rows.length} candidates!`, {
        title: 'Bulk Save Complete',
      })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save test types for candidates')
    } finally {
      setBulkSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  return (
    <AdminSidebarLayout
      className="choose-test-type-page"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <main className="otp-content ctt-content">

        <section className="ctt-card">
          <h2>Choose Test Type For Individual Candidates</h2>
          <p className="ctt-subtitle">
            Assign a test format for each candidate separately. The selected type will be used when that candidate logs in and starts the test.
          </p>
          {dedupedCandidates.duplicateCount > 0 && (
            <p className="ctt-help">
              Duplicate candidate rows hidden on this page: {dedupedCandidates.duplicateCount}
            </p>
          )}
        </section>

        <section className="ctt-summary-card">
          <h3>Assignment Summary</h3>
          <div className="ctt-summary-grid">
            <div className="ctt-stat">
              <span className="ctt-stat-label">Total Candidates</span>
              <strong>{summary.total}</strong>
            </div>
            {Object.entries(TEST_TYPES).map(([key, config]) => (
              <div key={key} className="ctt-stat">
                <span className="ctt-stat-label">{config.label}</span>
                <strong>{summary[key]}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="otp-table-section">
          <div className="ctt-table-header">
            <div>
              <h3 style={{ margin: 0 }}>Candidate Test Type Assignment ({dedupedCandidates.rows.length})</h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Configure test formats, shuffle questions, or save changes for all candidates.
              </p>
            </div>
            <div className="ctt-bulk-actions">
              <button
                type="button"
                className="ctt-btn-shuffle-all"
                disabled={bulkShuffling || bulkSaving || dedupedCandidates.rows.length === 0}
                onClick={handleShuffleAll}
              >
                <FiRefreshCw style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                {bulkShuffling ? 'Shuffling All...' : 'Shuffle All Candidates'}
              </button>
              <button
                type="button"
                className="ctt-btn-save-all"
                disabled={bulkSaving || bulkShuffling || dedupedCandidates.rows.length === 0}
                onClick={handleSaveAll}
              >
                <FiSave style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                {bulkSaving ? 'Saving All...' : 'Save All Changes'}
              </button>
            </div>
          </div>

          {loading ? (
            <Spinner label="Loading candidates…" size={40} />
          ) : dedupedCandidates.rows.length === 0 ? (
            <p className="otp-no-data">No candidates found. Add candidates first in Manage Candidates.</p>
          ) : (
            <div className="table-responsive">
              <table className="otp-table ctt-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Assigned Test Type</th>
                    <th>Description</th>
                    <th>Shuffle</th>
                    <th>Save</th>
                  </tr>
                </thead>
                <tbody>
                  {dedupedCandidates.rows.map((candidate) => {
                    const selectedType = normalizeTestType(selectedTypes[candidate.email] || candidate.test_type)
                    const isCandidateShuffled = Boolean(shuffledState[candidate.email])
                    return (
                      <tr key={candidate.email}>
                        <td>{candidate.username}</td>
                        <td className="email-cell">{candidate.email}</td>
                        <td>
                          <select
                            className="ctt-select"
                            value={selectedType}
                            onChange={(e) => handleTypeChange(candidate.email, e.target.value)}
                            disabled={Boolean(saving[candidate.email]) || bulkSaving || bulkShuffling}
                          >
                            {Object.entries(TEST_TYPES).map(([key, config]) => (
                              <option key={key} value={key}>{config.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="ctt-description-cell">{TEST_TYPES[selectedType].description}</td>
                        <td>
                          <button
                            type="button"
                            className={`otp-btn-shuffle ${isCandidateShuffled ? 'otp-btn-shuffled' : ''}`}
                            disabled={Boolean(shuffling[candidate.email]) || Boolean(saving[candidate.email]) || bulkShuffling || bulkSaving}
                            onClick={() => handleShuffleCandidate(candidate)}
                          >
                            {shuffling[candidate.email] ? (
                              'Shuffling...'
                            ) : isCandidateShuffled ? (
                              <>
                                <FiCheck style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                Shuffled
                              </>
                            ) : (
                              'Shuffle'
                            )}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ctt-save-btn"
                            disabled={Boolean(saving[candidate.email]) || Boolean(shuffling[candidate.email]) || bulkSaving || bulkShuffling}
                            onClick={() => handleSaveCandidate(candidate)}
                          >
                            {saving[candidate.email] ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </AdminSidebarLayout>
  )
}

export default ChooseTestTypePage

