import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCandidates, setCandidateTestType, shuffleCandidateQuestions } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import './CandidateOTP.css'
import './ChooseTestTypePage.css'

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

const TEST_TYPES = {
  both: {
    label: 'Python + SQL',
    description: 'Candidate gets both coding and SQL question sets.',
  },
  python: {
    label: 'Python Only',
    description: 'Candidate gets only Python coding questions.',
  },
  sql: {
    label: 'SQL Only',
    description: 'Candidate gets only SQL query questions.',
  },
  mcq: {
    label: 'MCQ Only',
    description: 'Candidate gets only multiple-choice questions.',
  },
  python_mcq: {
    label: 'Python + MCQ',
    description: 'Candidate gets Python coding questions and MCQ questions.',
  },
  sql_mcq: {
    label: 'SQL + MCQ',
    description: 'Candidate gets SQL query questions and MCQ questions.',
  },
  full: {
    label: 'Python + SQL + MCQ',
    description: 'Candidate gets Python, SQL, and MCQ question sets.',
  },
}

function normalizeTestType(testType) {
  const normalized = String(testType || 'both').trim().toLowerCase()
  const aliasMap = {
    'python + sql': 'both',
    'mcq only': 'mcq',
    'mcq_only': 'mcq',
    'python + mcq': 'python_mcq',
    'python+mcq': 'python_mcq',
    'sql + mcq': 'sql_mcq',
    'sql+mcq': 'sql_mcq',
    'python + sql + mcq': 'full',
    'python+sql+mcq': 'full',
    'all': 'full',
  }
  const resolved = aliasMap[normalized] || normalized
  if (!TEST_TYPES[resolved]) return 'both'
  return resolved
}

function ChooseTestTypePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [candidates, setCandidates] = useState([])
  const [selectedTypes, setSelectedTypes] = useState({})
  const [saving, setSaving] = useState({})
  const [shuffling, setShuffling] = useState({})
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
      candidateRows.forEach((candidate) => {
        nextTypes[candidate.email] = normalizeTestType(candidate.test_type)
      })
      setSelectedTypes(nextTypes)
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
    setSelectedTypes((prev) => ({
      ...prev,
      [email]: normalizeTestType(value),
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
      toast.success(`Shuffled ${response.saved} questions for ${candidate.username} (${TEST_TYPES[nextType].label}).`)
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to shuffle questions for ${candidate.username}`)
    } finally {
      setShuffling((prev) => ({ ...prev, [candidate.email]: false }))
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
            <h3>Candidate Test Type Assignment ({dedupedCandidates.rows.length})</h3>
          </div>

          {loading ? (
            <p>Loading candidates...</p>
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
                    return (
                      <tr key={candidate.email}>
                        <td>{candidate.username}</td>
                        <td className="email-cell">{candidate.email}</td>
                        <td>
                          <select
                            className="ctt-select"
                            value={selectedType}
                            onChange={(e) => handleTypeChange(candidate.email, e.target.value)}
                            disabled={Boolean(saving[candidate.email])}
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
                            className="otp-btn-shuffle"
                            disabled={Boolean(shuffling[candidate.email]) || Boolean(saving[candidate.email])}
                            onClick={() => handleShuffleCandidate(candidate)}
                          >
                            {shuffling[candidate.email] ? 'Shuffling...' : 'Shuffle'}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="ctt-save-btn"
                            disabled={Boolean(saving[candidate.email]) || Boolean(shuffling[candidate.email])}
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
