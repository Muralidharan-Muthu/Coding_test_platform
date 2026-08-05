import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPracticeProblems } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { DatabaseIcon, PythonIcon } from '../components/ui/Branding'
import { clearPracticeSession } from '../utils/sessionStorage'
import './SectionProblems.css'
import './PracticeProblems.css'

const TABS = [
  { key: 'python', label: 'Python', Icon: PythonIcon },
  { key: 'sql', label: 'SQL', Icon: DatabaseIcon },
]

function PracticeProblems() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [activeTab, setActiveTab] = useState('python')
  const [problems, setProblems] = useState({ python: [], sql: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadProblems = useCallback(async () => {
    try {
      const data = await getPracticeProblems()
      setProblems({ python: data.python || [], sql: data.sql || [] })
    } catch (err) {
      console.error('Failed to load practice problems', err)
      setError('Could not load the practice questions. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (localStorage.getItem('practice_logged_in') !== 'true') {
      navigate('/practice', { replace: true })
      return
    }
    setUserName(localStorage.getItem('practice_name') || '')
    loadProblems()
  }, [navigate, loadProblems])

  const handleLogout = () => {
    clearPracticeSession()
    navigate('/practice')
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'hard': return '#ef4444'
      default: return '#9e9e9e'
    }
  }

  const openProblem = (problemId) => {
    navigate(`/coding/${problemId}?mode=practice`)
  }

  if (loading) {
    return (
      <div className="loading">
        <span className="loading-spinner" aria-hidden="true"></span>
        Loading practice questions...
      </div>
    )
  }

  const activeProblems = problems[activeTab] || []

  return (
    <div className={`section-problems-page${activeTab === 'sql' ? ' sql-section' : ''}`}>
      <header className="header">
        <div className="header-left">
          <h1>Practice</h1>
          <span className="practice-badge">Untimed</span>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <span className="user-name">{userName}</span>
          <button onClick={handleLogout} className="btn-practice-logout">Logout</button>
        </div>
      </header>

      <div className="practice-tabs" role="tablist" aria-label="Practice sections">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            className={`practice-tab${activeTab === key ? ' active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} />
            <span>{label}</span>
            <span className="practice-tab-count">{(problems[key] || []).length}</span>
          </button>
        ))}
      </div>

      <div className="problems-content">
        {error && <p className="practice-error" role="alert">{error}</p>}

        {!error && activeProblems.length === 0 && (
          <p className="practice-empty">
            No {activeTab === 'sql' ? 'SQL' : 'Python'} questions have been added by the Admin yet.
          </p>
        )}

        <div className="problems-list">
          {activeProblems.map((problem, index) => (
            <div
              key={problem.id}
              className="problem-item"
              onClick={() => openProblem(problem.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && openProblem(problem.id)}
              aria-label={`${problem.title}, ${problem.difficulty}, ${problem.marks} marks`}
            >
              <div className="problem-number">{index + 1}</div>
              <div className="problem-info">
                <h3>{problem.title}</h3>
                <div className="problem-meta">
                  <span
                    className="difficulty-badge"
                    style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}
                  >
                    {problem.difficulty}
                  </span>
                  <span className="marks">{problem.marks} marks</span>
                </div>
              </div>
              <button className="btn-solve" tabIndex={-1} aria-hidden="true">Solve</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PracticeProblems
