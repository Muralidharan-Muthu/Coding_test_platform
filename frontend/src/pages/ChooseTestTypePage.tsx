import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCheck, FiRefreshCw, FiSave, FiUsers, FiSearch, FiX } from 'react-icons/fi'
import {
  getCandidates,
  setCandidateTestType,
  shuffleCandidateQuestions,
  bulkSaveCandidateTestTypes,
  bulkShuffleCandidateQuestions,
  getQuestionTypes,
} from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import Spinner from '../components/ui/Spinner'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from '../constants/data'
import './CandidateOTP.css'
import './ChooseTestTypePage.css'

// Default system topic definitions
const SYSTEM_TOPICS = [
  { slug: 'python', display_name: 'Python', color: '#3b82f6' },
  { slug: 'sql', display_name: 'SQL', color: '#f59e0b' },
  { slug: 'mcq', display_name: 'MCQ', color: '#10b981' },
]

/**
 * Parse candidate test_type string into an array of topic slugs
 */
function parseTopicsFromType(testType = 'both', allTopicSlugs = ['python', 'sql', 'mcq']) {
  const raw = String(testType || 'both').trim().toLowerCase()
  if (raw === 'both') return ['python', 'sql']
  if (raw === 'full') return ['python', 'sql', 'mcq']
  if (raw === 'python_mcq' || raw === 'python+mcq') return ['python', 'mcq']
  if (raw === 'sql_mcq' || raw === 'sql+mcq') return ['sql', 'mcq']
  if (raw === 'all') return [...allTopicSlugs]
  
  // Custom delimiters
  const parts = raw.split(/[\+,\s\/&]+/).map(p => p.trim()).filter(Boolean)
  return parts.length > 0 ? Array.from(new Set(parts)) : ['python', 'sql']
}

/**
 * Serialize an array of topic slugs into a standardized test_type string
 */
function serializeTopicsToType(topicSlugs = []) {
  if (!topicSlugs || topicSlugs.length === 0) return 'both'
  const set = new Set(topicSlugs.map(s => s.toLowerCase()))
  if (set.size === 2 && set.has('python') && set.has('sql')) return 'both'
  if (set.size === 3 && set.has('python') && set.has('sql') && set.has('mcq')) return 'full'
  if (set.size === 2 && set.has('python') && set.has('mcq')) return 'python_mcq'
  if (set.size === 2 && set.has('sql') && set.has('mcq')) return 'sql_mcq'
  return topicSlugs.join('+')
}

function ChooseTestTypePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [candidates, setCandidates] = useState([])
  const [dynamicTypes, setDynamicTypes] = useState([])
  const [candidateTopics, setCandidateTopics] = useState({}) // { [email]: ['python', 'sql'] }
  const [shuffledState, setShuffledState] = useState({})
  const [saving, setSaving] = useState({})
  const [shuffling, setShuffling] = useState({})
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkShuffling, setBulkShuffling] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Build unified topic list (Python, SQL, MCQ + any custom registered question types)
  const allTopics = useMemo(() => {
    const list = [...SYSTEM_TOPICS]
    const customTypes = dynamicTypes.filter(t => t.is_system === 0)
    customTypes.forEach(t => {
      const slug = (t.slug || t.name || '').toLowerCase()
      if (!list.some(item => item.slug === slug)) {
        list.push({
          slug,
          display_name: t.display_name || t.name || slug,
          color: '#8b5cf6',
        })
      }
    })
    return list
  }, [dynamicTypes])

  const allTopicSlugs = useMemo(() => allTopics.map(t => t.slug), [allTopics])

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }

    setAdminName(name || 'Admin User')
    loadInitialData()
  }, [navigate])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      const [candRes, typesRes] = await Promise.allSettled([
        getCandidates(),
        getQuestionTypes(),
      ])

      const candidateRows = candRes.status === 'fulfilled' ? (candRes.value.candidates || []) : []
      const typesList = typesRes.status === 'fulfilled' ? (typesRes.value || []) : []

      setCandidates(candidateRows)
      setDynamicTypes(typesList)

      const initialTopicSlugs = allTopics.map(t => t.slug)
      const nextTopics = {}
      const nextShuffled = {}

      candidateRows.forEach((candidate) => {
        nextTopics[candidate.email] = parseTopicsFromType(candidate.test_type, initialTopicSlugs)
        nextShuffled[candidate.email] = Boolean(candidate.is_shuffled)
      })

      setCandidateTopics(nextTopics)
      setShuffledState(nextShuffled)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to load test types and candidates')
    } finally {
      setLoading(false)
    }
  }

  // Deduplicate candidate rows
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

  // Filter candidates by search query
  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return dedupedCandidates.rows

    return dedupedCandidates.rows.filter((c) => {
      const username = (c.username || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      const assigned = (candidateTopics[c.email] || []).join(' ')
      return username.includes(query) || email.includes(query) || assigned.includes(query)
    })
  }, [dedupedCandidates.rows, searchQuery, candidateTopics])

  // Summary counts per topic
  const summary = useMemo(() => {
    const counts = { total: dedupedCandidates.rows.length }
    allTopics.forEach(t => { counts[t.slug] = 0 })

    dedupedCandidates.rows.forEach((candidate) => {
      const topics = candidateTopics[candidate.email] || []
      topics.forEach(slug => {
        if (counts[slug] !== undefined) counts[slug] += 1
      })
    })

    return counts
  }, [dedupedCandidates.rows, candidateTopics, allTopics])

  // Toggle single topic button for a candidate
  const handleToggleTopic = (email, slug) => {
    setCandidateTopics((prev) => {
      const current = prev[email] || []
      const exists = current.includes(slug)
      let next
      if (exists) {
        // Remove if more than 1 topic, otherwise keep at least 1
        next = current.filter(s => s !== slug)
        if (next.length === 0) next = [slug] // don't let it become completely empty
      } else {
        next = [...current, slug]
      }
      return {
        ...prev,
        [email]: next,
      }
    })

    setShuffledState((prev) => ({
      ...prev,
      [email]: false,
    }))
  }

  // Quick action: Select All topics for candidate
  const handleSelectAllTopics = (email) => {
    setCandidateTopics((prev) => ({
      ...prev,
      [email]: [...allTopicSlugs],
    }))
    setShuffledState((prev) => ({ ...prev, [email]: false }))
  }

  // Save single candidate assignment
  const handleSaveCandidate = async (candidate) => {
    const topics = candidateTopics[candidate.email] || ['python', 'sql']
    const testTypeString = serializeTopicsToType(topics)
    setSaving((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      await setCandidateTestType(candidate.email, testTypeString)
      setCandidates((prev) => prev.map((row) => (
        row.email === candidate.email
          ? { ...row, test_type: testTypeString }
          : row
      )))
      const topicNames = topics.map(s => {
        const found = allTopics.find(t => t.slug === s)
        return found ? found.display_name : s
      }).join(' + ')
      toast.success(`Saved (${topicNames}) for ${candidate.username}.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to save topics for ${candidate.username}`)
    } finally {
      setSaving((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  // Shuffle single candidate
  const handleShuffleCandidate = async (candidate) => {
    const topics = candidateTopics[candidate.email] || ['python', 'sql']
    const testTypeString = serializeTopicsToType(topics)
    setShuffling((prev) => ({ ...prev, [candidate.email]: true }))

    try {
      const response = await shuffleCandidateQuestions(candidate.email, testTypeString)
      setCandidates((prev) => prev.map((row) => (
        row.email === candidate.email
          ? { ...row, test_type: testTypeString }
          : row
      )))
      setShuffledState((prev) => ({ ...prev, [candidate.email]: true }))
      toast.success(`Shuffled ${response.saved} questions for ${candidate.username}.`)
    } catch (err) {
      toast.error(err.response?.data?.detail || `Failed to shuffle questions for ${candidate.username}`)
    } finally {
      setShuffling((prev) => ({ ...prev, [candidate.email]: false }))
    }
  }

  // Bulk Shuffle
  const handleShuffleAll = async () => {
    if (dedupedCandidates.rows.length === 0) return
    setBulkShuffling(true)

    try {
      const payload = dedupedCandidates.rows.map((c) => ({
        email: c.email,
        test_type: serializeTopicsToType(candidateTopics[c.email] || ['python', 'sql']),
      }))
      await bulkShuffleCandidateQuestions(payload)

      const updatedShuffled = {}
      dedupedCandidates.rows.forEach((c) => {
        updatedShuffled[c.email] = true
      })
      setShuffledState((prev) => ({ ...prev, ...updatedShuffled }))

      toast.success(`Successfully shuffled questions for all ${dedupedCandidates.rows.length} candidates!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to shuffle questions for all candidates')
    } finally {
      setBulkShuffling(false)
    }
  }

  // Bulk Save
  const handleSaveAll = async () => {
    if (dedupedCandidates.rows.length === 0) return
    setBulkSaving(true)

    try {
      const assignments = dedupedCandidates.rows.map((c) => ({
        email: c.email,
        test_type: serializeTopicsToType(candidateTopics[c.email] || ['python', 'sql']),
      }))
      await bulkSaveCandidateTestTypes(assignments)

      setCandidates((prev) => prev.map((row) => ({
        ...row,
        test_type: serializeTopicsToType(candidateTopics[row.email] || ['python', 'sql']),
      })))

      toast.success(`Saved topic selections for all ${dedupedCandidates.rows.length} candidates!`)
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
      <div className="otp-content ctt-content">

        {/* ── Compact Assignment Summary Card ── */}
        <div className="mc-card ctt-summary-box">
          <div className="mc-card-header">
            <div>
              <h3 className="mc-card-title">Topic Assignment Summary</h3>
              <p className="mc-card-subtitle">
                {dedupedCandidates.duplicateCount > 0 ? `${dedupedCandidates.duplicateCount} duplicate rows hidden — ` : ''}
                Candidate enrollment per question topic.
              </p>
            </div>
          </div>

          <div className="ctt-stats-grid">
            <div className="ctt-stat-chip total">
              <span className="ctt-stat-label">Total Candidates</span>
              <span className="ctt-stat-val">{summary.total}</span>
            </div>
            {allTopics.map((topic) => (
              <div key={topic.slug} className={`ctt-stat-chip type-${topic.slug}`}>
                <span className="ctt-stat-label">{topic.display_name}</span>
                <span className="ctt-stat-val">{summary[topic.slug] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Candidate Topic Assignment Table Card ── */}
        <div className="mc-table-card">
          <div className="ctt-table-header">
            <div className="ctt-header-title-wrap">
              <h3 className="mc-card-title">Candidate Test Type Assignment ({filteredCandidates.length})</h3>
              <p className="mc-card-subtitle" style={{ marginTop: '2px' }}>
                Toggle topic buttons for each candidate, or search and bulk shuffle.
              </p>
            </div>

            {/* Search Bar */}
            <div className="ctt-search-wrapper">
              <FiSearch className="ctt-search-icon" />
              <input
                type="text"
                className="ctt-search-input"
                placeholder="Search candidates by name, email, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="ctt-search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            <div className="ctt-bulk-actions">
              <button
                type="button"
                className="ctt-btn-shuffle-all"
                disabled={bulkShuffling || bulkSaving || dedupedCandidates.rows.length === 0}
                onClick={handleShuffleAll}
              >
                <FiRefreshCw style={{ marginRight: '6px' }} />
                {bulkShuffling ? 'Shuffling...' : 'Shuffle All'}
              </button>
              <button
                type="button"
                className="ctt-btn-save-all"
                disabled={bulkSaving || bulkShuffling || dedupedCandidates.rows.length === 0}
                onClick={handleSaveAll}
              >
                <FiSave style={{ marginRight: '6px' }} />
                {bulkSaving ? 'Saving...' : 'Save All Changes'}
              </button>
            </div>
          </div>

          {loading ? (
            <Spinner label="Loading candidates & topics…" size={40} />
          ) : filteredCandidates.length === 0 ? (
            <div className="mc-empty-state">
              <div className="mc-empty-icon"><FiUsers /></div>
              <h4>{searchQuery ? 'No Matching Candidates' : 'No Candidates Found'}</h4>
              <p>{searchQuery ? `No candidates matched "${searchQuery}". Try a different keyword.` : 'Add candidates first in Manage Candidates to assign test formats.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="mc-table ctt-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th style={{ minWidth: '280px' }}>Assigned Topics (Click to Toggle)</th>
                    <th>Description</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>Shuffle</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Save</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((candidate, index) => {
                    const selected = candidateTopics[candidate.email] || ['python', 'sql']
                    const isCandidateShuffled = Boolean(shuffledState[candidate.email])
                    const topicNames = selected.map(s => {
                      const found = allTopics.find(t => t.slug === s)
                      return found ? found.display_name : s
                    })

                    return (
                      <tr key={candidate.email}>
                        <td className="mc-col-num">#{index + 1}</td>
                        <td><span className="mc-username-text">{candidate.username}</span></td>
                        <td className="email-cell"><span className="mc-email-text">{candidate.email}</span></td>
                        <td>
                          {/* Multi-select topic toggle button group */}
                          <div className="ctt-topic-buttons-wrap">
                            {allTopics.map((topic) => {
                              const isActive = selected.includes(topic.slug)
                              return (
                                <button
                                  key={topic.slug}
                                  type="button"
                                  className={`ctt-topic-btn ${topic.slug} ${isActive ? 'active' : ''}`}
                                  onClick={() => handleToggleTopic(candidate.email, topic.slug)}
                                  disabled={Boolean(saving[candidate.email]) || bulkSaving || bulkShuffling}
                                  title={`Toggle ${topic.display_name}`}
                                >
                                  {isActive && <FiCheck size={12} className="ctt-check-icon" />}
                                  <span>{topic.display_name}</span>
                                </button>
                              )
                            })}
                            <button
                              type="button"
                              className="ctt-topic-btn all-btn"
                              onClick={() => handleSelectAllTopics(candidate.email)}
                              title="Select all available topics"
                            >
                              All
                            </button>
                          </div>
                        </td>
                        <td className="ctt-desc-cell">
                          <span className="ctt-topic-summary-tag">
                            Candidate gets <strong>{topicNames.join(' + ')}</strong> question set ({selected.length} {selected.length === 1 ? 'topic' : 'topics'}).
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className={`ctt-btn-shuffle ${isCandidateShuffled ? 'shuffled' : ''}`}
                            disabled={Boolean(shuffling[candidate.email]) || Boolean(saving[candidate.email]) || bulkShuffling || bulkSaving}
                            onClick={() => handleShuffleCandidate(candidate)}
                          >
                            {shuffling[candidate.email] ? (
                              '...'
                            ) : isCandidateShuffled ? (
                              <><FiCheck size={12} style={{ marginRight: '4px' }} /> Shuffled</>
                            ) : (
                              'Shuffle'
                            )}
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="mc-btn-save-sm"
                            disabled={Boolean(saving[candidate.email]) || Boolean(shuffling[candidate.email]) || bulkSaving || bulkShuffling}
                            onClick={() => handleSaveCandidate(candidate)}
                          >
                            {saving[candidate.email] ? '...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminSidebarLayout>
  )
}

export default ChooseTestTypePage