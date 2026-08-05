import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import CodeReviewModal from '../components/assessment/CodeReviewModal'
import ColorLegend from '../components/assessment/ColorLegend'
import DifficultyTable from '../components/assessment/DifficultyTable'
import FilterBar from '../components/assessment/FilterBar'
import ProblemDetailTable from '../components/assessment/ProblemDetailTable'
import StatCards from '../components/assessment/StatCards'
import TestSummaryTable from '../components/assessment/TestSummaryTable'
import TrustProctoringTable from '../components/assessment/TrustProctoringTable'
import HRSidebarLayout from '../components/hr/HRSidebarLayout'
import { exportAssessmentResults, getProctoringReports } from '../services/assessmentApi'
import './AssessmentDashboard.css'

/* ─── Nav Items (matches HRDashboard) ─── */
const NAV_ITEMS = [
  {
    label: 'Assessment Dashboard',
    href: '/dashboard/assessment',
    activePaths: ['/dashboard/assessment'],
  },
  { label: 'Questions', href: '/hr/questions', activePaths: ['/hr/questions'] },
  {
    label: 'Manage Candidates',
    href: '/hr/otp',
    activePaths: ['/hr/otp'],
    children: [
      { label: 'Choose Test Type', href: '/hr/test-type', activePaths: ['/hr/test-type'] },
      { label: 'Send Mail', href: '/hr/send-mail', activePaths: ['/hr/send-mail'] },
    ],
  },
]

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 220,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'rgba(15, 23, 42, 0.58)',
}

const modalCardStyle = {
  width: 'min(720px, 100%)',
  maxHeight: '80vh',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  borderRadius: '18px',
  background: 'var(--color-surface, #ffffff)',
  color: 'var(--color-text, #0f172a)',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
  border: '1px solid var(--color-border, rgba(148, 163, 184, 0.25))',
}

const modalCornerCloseButtonStyle = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  zIndex: 3,
  width: '34px',
  height: '34px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'var(--color-surface-2, #f8fafc)',
  color: 'var(--color-text, #0f172a)',
  fontSize: '18px',
  fontWeight: 800,
  lineHeight: 1,
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
}

const modalHeaderSectionStyle = {
  padding: '24px 24px 14px',
  flexShrink: 0,
  borderBottom: '1px solid var(--color-border, rgba(148, 163, 184, 0.25))',
}

const modalBodyScrollAreaStyle = {
  padding: '14px 24px 20px',
  overflowY: 'auto',
  minHeight: 0,
  flex: 1,
}

const logCardStyle = {
  borderRadius: '14px',
  padding: '14px 16px',
  background: 'var(--color-surface-2, #f8fafc)',
  border: '1px solid var(--color-border, rgba(148, 163, 184, 0.22))',
}

const logCardTopRowStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
  gap: '12px',
}

const logCardBodyRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '16px',
  alignItems: 'center',
}

const modalSummaryRowStyle = {
  marginTop: '12px',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px',
}

const modalSummaryChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '7px 12px',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  background: 'var(--color-surface-2, #f8fafc)',
  fontSize: '12px',
  fontWeight: 800,
  color: 'var(--color-text-subtle, #475569)',
}

const modalSummaryValueStyle = {
  fontSize: '14px',
  fontWeight: 900,
  color: 'var(--color-text, #0f172a)',
}

const logRepeatedNoteBaseStyle = {
  marginTop: '6px',
  fontSize: '13px',
  fontWeight: 800,
  color: 'var(--color-text-subtle, #64748b)',
}

const logCountPanelBaseStyle = {
  minWidth: '58px',
  height: '58px',
  borderRadius: '12px',
  display: 'grid',
  placeItems: 'center',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  boxShadow: '0 6px 12px rgba(15, 23, 42, 0.12)',
}

const logCountPanelNumberStyle = {
  fontSize: '17px',
  lineHeight: 1,
  fontWeight: 900,
  letterSpacing: '-0.01em',
}

const logCountPanelLabelStyle = {
  marginTop: '1px',
  fontSize: '9px',
  letterSpacing: '0.06em',
  fontWeight: 800,
}

const repeatedLogTheme = {
  noteColor: '#334155',
  cardBorderAccent: '4px solid #94a3b8',
  cardShadow: '0 10px 20px rgba(148, 163, 184, 0.22)',
  panelBackground: 'linear-gradient(135deg, rgba(226, 232, 240, 0.9), rgba(241, 245, 249, 0.9))',
  panelBorder: '1px solid rgba(148, 163, 184, 0.45)',
  panelText: '#0f172a',
}

const normalizeLogValue = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()

const toTimestampNumber = (timestamp) => {
  const value = new Date(timestamp || '').getTime()
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

const groupLogsForDisplay = (logs = []) => {
  const grouped = new Map()

  logs.forEach((log) => {
    const violationType = normalizeLogValue(log?.violation_type)
    const message = normalizeLogValue(log?.message)
    const key = `${violationType}|${message}`
    const normalizedCount = Number.isFinite(Number(log?.count)) ? Number(log.count) : 1

    if (!grouped.has(key)) {
      grouped.set(key, {
        ...log,
        count: normalizedCount,
      })
      return
    }

    const existing = grouped.get(key)
    const existingTime = toTimestampNumber(existing?.timestamp)
    const incomingTime = toTimestampNumber(log?.timestamp)

    grouped.set(key, {
      ...existing,
      count: (Number(existing?.count) || 0) + normalizedCount,
      timestamp: incomingTime < existingTime ? log?.timestamp : existing?.timestamp,
    })
  })

  return [...grouped.values()].sort((left, right) => toTimestampNumber(left?.timestamp) - toTimestampNumber(right?.timestamp))
}

function AssessmentDashboard() {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [hrName, setHrName] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedLogs, setSelectedLogs] = useState([])
  const [selectedCandidateName, setSelectedCandidateName] = useState('')
  // Code review modal state
  const [isCodeReviewOpen, setIsCodeReviewOpen] = useState(false)
  const [codeReviewCandidate, setCodeReviewCandidate] = useState(null)
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    verdict: 'All',
    submission_type: 'All',
    test_location: 'All'
  })

  useEffect(() => {
    const loggedIn = localStorage.getItem('hr_logged_in')
    const name = localStorage.getItem('hr_name')
    if (!loggedIn) { navigate('/hr'); return }
    setHrName(name || 'Admin User')
    loadResults()
  }, [navigate])

  const loadResults = async (currentFilters = {}) => {
    setLoading(true)
    try {
      const response = await getProctoringReports(currentFilters)
      setResults(response.data || [])
      setFilteredCount(response.total || 0)
      if (
        Object.keys(currentFilters).length === 0 ||
        (currentFilters.verdict === 'All' && currentFilters.submission_type === 'All' &&
         currentFilters.test_location === 'All' && !currentFilters.date_from && !currentFilters.date_to)
      ) {
        setTotalCount(response.total || 0)
      }
    } catch (err) {
      console.error('Failed to load results:', err)
      setResults([]); setFilteredCount(0); setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenLogs = (logs = [], candidateName = '') => {
    const groupedLogs = Array.isArray(logs) ? groupLogsForDisplay(logs) : []
    setSelectedLogs(groupedLogs)
    setSelectedCandidateName(candidateName || '')
    setIsModalOpen(true)
  }

  const handleCloseLogs = () => {
    setIsModalOpen(false)
    setSelectedLogs([])
    setSelectedCandidateName('')
  }

  // Code review modal handlers
  const handleOpenCodeReview = (candidate) => {
    setCodeReviewCandidate(candidate)
    setIsCodeReviewOpen(true)
  }

  const handleCloseCodeReview = () => {
    setIsCodeReviewOpen(false)
    setCodeReviewCandidate(null)
  }

  const formatLogTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown time'
    const parsedDate = new Date(timestamp)
    if (Number.isNaN(parsedDate.getTime())) return timestamp
    return parsedDate.toLocaleString()
  }

  const handleApplyFilter = () => loadResults(filters)

  const handleResetFilter = () => {
    const resetFilters = { date_from: '', date_to: '', verdict: 'All', submission_type: 'All', test_location: 'All' }
    setFilters(resetFilters)
    loadResults(resetFilters)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAssessmentResults(filters)
    } catch (err) {
      console.error('Failed to export:', err)
      alert('Failed to export Excel report')
    } finally {
      setExporting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hr_name')
    localStorage.removeItem('hr_logged_in')
    navigate('/hr')
  }

  const stats = {
    total: results.length,
    good: results.filter(r => r.overall_verdict === 'Good').length,
    average: results.filter(r => r.overall_verdict === 'Average').length,
    belowAverage: results.filter(r => r.overall_verdict === 'Below Average').length,
    autoSubmitted: results.filter(r => (r.submission_type || '').toLowerCase() === 'auto').length
  }

  const modalUniqueCount = selectedLogs.length
  const modalMaxCount = selectedLogs.reduce((max, log) => {
    const count = Number(log?.count)
    return count > max ? count : max
  }, 0)

  return (
    <HRSidebarLayout
      className="asd-page"
      hrName={hrName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >

      {/* ── Filter Bar ── */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilter}
        onReset={handleResetFilter}
        onExport={handleExport}
        exporting={exporting}
        displayCount={filteredCount}
        totalCount={totalCount}
      />

      {/* ── Page Content ── */}
      <main className="asd-content">

        {/* Page Heading */}
        <div className="asd-page-heading">
          <h2>Assessment Results</h2>
        </div>

        {loading ? (
          <div className="asd-loading" aria-live="polite">
            <div className="asd-spinner" aria-hidden="true" />
            <p>Loading assessment data…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="asd-empty">
            <div className="asd-empty-icon" aria-hidden="true">📊</div>
            <h2>No Assessments Yet</h2>
            <p>Candidates who complete the assessment will appear here automatically.</p>
          </div>
        ) : (
          <>
            <StatCards stats={stats} />
            <ColorLegend />

            <div className="asd-table-card">
              <div className="asd-table-header">
                <h3>Test Summary</h3>
                <span className="asd-table-tag">candidate_test_summary</span>
              </div>
              <TestSummaryTable data={results} onViewCode={handleOpenCodeReview} />
            </div>

            <div className="asd-table-card">
              <div className="asd-table-header">
                <h3>Trust & Proctoring</h3>
                <span className="asd-table-tag">candidate_proctoring_logs</span>
              </div>
              <TrustProctoringTable data={results} onViewLogs={handleOpenLogs} />
            </div>

            <div className="asd-table-card">
              <div className="asd-table-header">
                <div className="asd-title-row">
                  <h3>Difficulty Breakdown</h3>
                  <div className="asd-diff-badges">
                    <span className="asd-diff-badge asd-diff-easy">Easy 4 Qs</span>
                    <span className="asd-diff-badge asd-diff-medium">Medium 4 Qs</span>
                    <span className="asd-diff-badge asd-diff-hard">Hard 2 Qs</span>
                  </div>
                </div>
                <span className="asd-table-tag">candidate_problem_testcases</span>
              </div>
              <DifficultyTable data={results} />
            </div>

            <div className="asd-table-card">
              <div className="asd-table-header">
                <h3>Problem-wise Performance</h3>
                <span className="asd-table-tag">candidate_problem_testcase_details</span>
              </div>
              <ProblemDetailTable data={results} />
            </div>
          </>
        )}
      </main>

      {isModalOpen && (
        <div style={modalBackdropStyle} role="dialog" aria-modal="true" aria-label="Candidate proctoring logs">
          <div style={modalCardStyle}>
            <button
              type="button"
              onClick={handleCloseLogs}
              style={modalCornerCloseButtonStyle}
              aria-label="Close proctoring logs"
              title="Close"
            >
              X
            </button>
            <div style={modalHeaderSectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-subtle, #475569)' }}>
                    Proctoring Logs
                  </div>
                  <h3 style={{ margin: '10px 0 0', fontSize: '24px', lineHeight: 1.2 }}>
                    {selectedCandidateName || 'Candidate'}
                  </h3>
                  <p style={{ margin: '8px 0 0', fontSize: '13px', lineHeight: 1.5, color: 'var(--color-text-subtle, #64748b)' }}>
                    Repeated identical violations are grouped into a single card.
                  </p>
                  <div style={modalSummaryRowStyle}>
                    <span style={modalSummaryChipStyle}>
                      Unique Logs
                      <span style={modalSummaryValueStyle}>{modalUniqueCount}</span>
                    </span>
                    <span style={modalSummaryChipStyle}>
                      Highest Count
                      <span style={modalSummaryValueStyle}>{modalMaxCount}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={modalBodyScrollAreaStyle}>
              {selectedLogs.length === 0 ? (
                <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7 }}>
                  No violations detected.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedLogs.map((log, index) => {
                    const parsedCount = Number(log?.count)
                    const count = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 1
                    const countText = count === 1 ? 'Occurred 1 time' : `Occurred ${count} times`

                    return (
                      <div
                        key={log.id || `${log.timestamp}-${index}`}
                        style={{
                          ...logCardStyle,
                          borderLeft: repeatedLogTheme.cardBorderAccent,
                          boxShadow: repeatedLogTheme.cardShadow,
                        }}
                      >
                        <div style={logCardTopRowStyle}>
                          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-subtle, #64748b)' }}>
                            {formatLogTimestamp(log.timestamp)}
                          </div>
                        </div>
                        <div style={{ ...logCardBodyRowStyle, marginTop: '6px' }}>
                          <div>
                            <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                              {log.message}
                            </div>
                            <div
                              style={{
                                ...logRepeatedNoteBaseStyle,
                                color: repeatedLogTheme.noteColor,
                              }}
                            >
                              {countText}
                            </div>
                          </div>
                          <div
                            style={{
                              ...logCountPanelBaseStyle,
                              background: repeatedLogTheme.panelBackground,
                              border: repeatedLogTheme.panelBorder,
                            }}
                            title={`${count} events`}
                          >
                            <div style={{ textAlign: 'center', color: repeatedLogTheme.panelText }}>
                              <div style={logCountPanelNumberStyle}>{count}</div>
                              <div style={logCountPanelLabelStyle}>COUNT</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Code Review Modal */}
      <CodeReviewModal
        isOpen={isCodeReviewOpen}
        onClose={handleCloseCodeReview}
        candidate={codeReviewCandidate}
      />
    </HRSidebarLayout>
  )
}

export default AssessmentDashboard



