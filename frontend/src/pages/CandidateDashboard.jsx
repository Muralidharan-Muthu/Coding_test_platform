import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExamStatus, getExamSummary } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { DecisionMindsLogoSmall, ClockIcon, ChecklistIcon, PythonIcon, DatabaseIcon } from '../components/ui/Branding'
import { clearCandidateSession } from '../utils/sessionStorage'
import './CandidateDashboard.css'

function CandidateDashboard() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [examSummary, setExamSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [examStarted, setExamStarted] = useState(false)
  const [startingExam, setStartingExam] = useState(false)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')

    if (!name || !sessionId) {
      navigate('/')
      return
    }

    setUserName(name)
    loadExamData()
  }, [navigate])

  const loadExamData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id') || ''
      const summary = await getExamSummary(sessionId)
      setExamSummary(summary)

      // Check if exam already started
      const status = await getExamStatus(sessionId)
      
      if (status.status === 'active') {
        setExamStarted(true)
        // Store remaining time
        localStorage.setItem('exam_remaining', status.remaining_seconds)
        localStorage.setItem('exam_start_time', status.start_time)
      } else if (status.status === 'completed') {
        navigate('/submission-complete')
      }
    } catch (err) {
      console.error('Failed to load exam data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = async () => {
    setStartingExam(true)
    setActionError('')
    try {
      localStorage.removeItem('exam_secure_mode_started')
      if (!localStorage.getItem('exam_answers')) {
        localStorage.setItem('exam_answers', JSON.stringify({}))
      }
      navigate('/candidate-verification')
    } catch (err) {
      console.error('Failed to open exam flow', err)
      setActionError('Unable to open the test flow. Please try again.')
    } finally {
      setStartingExam(false)
    }
  }

  const handleContinueExam = () => {
    navigate('/candidate-verification')
  }

  const handleLogout = () => {
    clearCandidateSession()
    navigate('/')
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#4caf50'
      case 'medium': return '#ff9800'
      case 'hard': return '#f44336'
      default: return '#9e9e9e'
    }
  }

  const renderLanguageBadge = (language) => {
    if (language === 'python') {
      return <span className="lang-badge python"><PythonIcon size={14} /> Python</span>
    }
    if (language === 'sql') {
      return <span className="lang-badge sql"><DatabaseIcon size={14} /> SQL</span>
    }
    return <span className="lang-badge mcq"><ChecklistIcon size={14} /> MCQ</span>
  }

  if (loading) {
    return (
      <div className="loading">
        <span className="loading-spinner" aria-hidden="true"></span>
        Loading exam details...
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="header">
        <div className="header-logo">
          <DecisionMindsLogoSmall onClick={() => navigate('/dashboard')} />
        </div>
        <div className="header-right">
          <ThemeToggle />
          <div className="user-info">
            <div className="user-avatar" aria-hidden="true">{userName.charAt(0).toUpperCase()}</div>
            <span className="user-name-text">{userName}</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {userName}!</h2>
          <p className="welcome-subtitle">You are about to begin your coding assessment</p>
        </div>

        <div className="instructions-card">
          <h3>Assessment Instructions</h3>
          
          <div className="instruction-grid">
            <div className="instruction-item">
              <span className="instruction-icon" aria-hidden="true"><ClockIcon size={24} /></span>
              <div>
                <strong>Total Duration</strong>
                <p>2 Hours 30 Minutes</p>
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon" aria-hidden="true"><ChecklistIcon size={24} /></span>
              <div>
                <strong>Total Questions</strong>
                <p>{examSummary?.total_questions || 0} Questions</p>
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon" aria-hidden="true"><PythonIcon size={24} /></span>
              <div>
                <strong>Python Problems</strong>
                <p>{examSummary?.python_questions || 0} Questions</p>
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon" aria-hidden="true"><DatabaseIcon size={24} /></span>
              <div>
                <strong>SQL Problems</strong>
                <p>{examSummary?.sql_questions || 0} Questions</p>
              </div>
            </div>

            <div className="instruction-item">
              <span className="instruction-icon" aria-hidden="true"><ChecklistIcon size={24} /></span>
              <div>
                <strong>MCQ Questions</strong>
                <p>{examSummary?.mcq_questions || 0} Questions</p>
              </div>
            </div>
          </div>

          <div className="rules-section">
            <h4>Important Rules</h4>
            <ul>
              <li>Timer cannot be paused once the test starts</li>
              <li>Auto submission will occur when time expires</li>
              <li>You can manually submit anytime before time runs out</li>
              <li>Navigate freely between problems during the test</li>
              <li>Your progress is auto-saved while you type</li>
            </ul>
          </div>

          <div className="difficulty-legend">
            <h4>Difficulty Levels</h4>
            <div className="legend-items">
              <span className="legend-item"><span className="dot easy" aria-hidden="true"></span> Easy — 10 marks</span>
              <span className="legend-item"><span className="dot medium" aria-hidden="true"></span> Medium — 20 marks</span>
              <span className="legend-item"><span className="dot hard" aria-hidden="true"></span> Hard — 40 marks</span>
            </div>
          </div>
        </div>

        <div className="problems-overview">
          <h3>Questions Overview</h3>
          <div className="problems-table">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Language</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  <th>Est. Time</th>
                </tr>
              </thead>
              <tbody>
                {examSummary?.problems?.map((problem, index) => (
                  <tr key={problem.id}>
                    <td>{problem.title}</td>
                    <td>{renderLanguageBadge(problem.language)}</td>
                    <td>
                      <span 
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}
                      >
                        {problem.difficulty}
                      </span>
                    </td>
                    <td>{problem.marks}</td>
                    <td>{problem.time_limit} mins</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td><strong>{examSummary?.total_marks || 0}</strong></td>
                  <td><strong>150 mins</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="action-section">
          {examStarted ? (
            <button onClick={handleContinueExam} className="btn-take-test continue" disabled={startingExam}>
              {startingExam ? 'Opening Test...' : 'Continue Test'}
            </button>
          ) : (
            <button onClick={handleStartExam} className="btn-take-test" disabled={startingExam}>
              {startingExam ? 'Opening Test...' : 'Take Test'}
            </button>
          )}
          {actionError && (
            <div className="exam-action-error" role="alert">{actionError}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboard
