import { useEffect, useState } from 'react'
import { getCandidateSubmissions } from '../../services/assessmentApi'
import Spinner from '../ui/Spinner'
import './CodeReviewModal.css'

function CodeReviewModal({ isOpen, onClose, candidate }) {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSubmission, setSelectedSubmission] = useState(null)

  useEffect(() => {
    if (isOpen && candidate) {
      loadSubmissions()
    }
  }, [isOpen, candidate])

  const loadSubmissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getCandidateSubmissions(candidate.email)
      setSubmissions(data.submissions || [])
      if (data.submissions && data.submissions.length > 0) {
        setSelectedSubmission(data.submissions[0])
      }
    } catch (err) {
      console.error('Error loading submissions:', err)
      setError('Failed to load submissions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const getVerdictClass = (verdict) => {
    if (!verdict) return 'verdict-unknown'
    const v = verdict.toLowerCase()
    if (v.includes('pass') || v.includes('accepted')) return 'verdict-pass'
    if (v.includes('fail') || v.includes('wrong')) return 'verdict-fail'
    return 'verdict-unknown'
  }

  return (
    <div className="code-review-backdrop" onClick={handleBackdropClick}>
      <div className="code-review-modal">
        <div className="code-review-header">
          <div className="code-review-title">
            <h2>Code Review</h2>
            <p className="candidate-info">
              {candidate?.name} <span>({candidate?.email})</span>
            </p>
          </div>
          <button className="code-review-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="code-review-content">
          {loading && (
            <div className="code-review-loading">
              <Spinner label="Loading submissions…" size={36} />
            </div>
          )}

          {error && (
            <div className="code-review-error">
              <p>{error}</p>
              <button onClick={loadSubmissions}>Retry</button>
            </div>
          )}

          {!loading && !error && submissions.length === 0 && (
            <div className="code-review-empty">
              <p>No submissions found for this candidate.</p>
            </div>
          )}

          {!loading && !error && submissions.length > 0 && (
            <>
              <div className="code-review-sidebar">
                <h3>Submissions ({submissions.length})</h3>
                <div className="submission-list">
                  {submissions.map((sub, idx) => (
                    <div
                      key={sub.submission_id || idx}
                      className={`submission-item ${selectedSubmission?.submission_id === sub.submission_id ? 'active' : ''}`}
                      onClick={() => setSelectedSubmission(sub)}
                    >
                      <div className="submission-problem">{sub.problem_title || sub.problem_id}</div>
                      <div className="submission-meta">
                        <span className={`submission-lang ${sub.language}`}>{sub.language}</span>
                        <span className={`submission-score ${getVerdictClass(sub.verdict)}`}>
                          {sub.passed_tests}/{sub.total_tests}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="code-review-main">
                {selectedSubmission && (
                  <>
                    <div className="code-review-problem-header">
                      <h3>{selectedSubmission.problem_title || selectedSubmission.problem_id}</h3>
                      <div className="code-review-problem-meta">
                        <span className={`lang-badge ${selectedSubmission.language}`}>
                          {selectedSubmission.language}
                        </span>
                        <span className={`difficulty-badge ${selectedSubmission.difficulty?.toLowerCase()}`}>
                          {selectedSubmission.difficulty}
                        </span>
                        <span className="marks-badge">{selectedSubmission.marks} marks</span>
                        <span className={`score-badge ${getVerdictClass(selectedSubmission.verdict)}`}>
                          {selectedSubmission.passed_tests}/{selectedSubmission.total_tests} tests passed
                        </span>
                        <span className="time-badge">
                          {selectedSubmission.time_taken ? `${selectedSubmission.time_taken}s` : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="code-review-code-container">
                      <div className="code-review-code-header">
                        <span>Submitted Code</span>
                        <span className="exec-time">
                          {selectedSubmission.execution_time_ms ? `${selectedSubmission.execution_time_ms.toFixed(2)}ms` : ''}
                        </span>
                      </div>
                      <pre className="code-review-code">
                        <code>{selectedSubmission.code}</code>
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CodeReviewModal
