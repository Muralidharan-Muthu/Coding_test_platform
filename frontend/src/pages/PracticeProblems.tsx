import { formatTimeWithLabel } from '../utils/timeUtils'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPracticeProblems } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { DatabaseIcon, PythonIcon, ChecklistIcon, PlatformLogoSmall } from '../components/ui/Branding'
import Spinner from '../components/ui/Spinner'
import { clearPracticeSession } from '../utils/sessionStorage'
import { FiCheckCircle, FiXCircle, FiHelpCircle, FiCode, FiTerminal } from 'react-icons/fi'

const TABS = [
  { key: 'python', label: 'Python', Icon: PythonIcon },
  { key: 'sql', label: 'SQL', Icon: DatabaseIcon },
  { key: 'mcq', label: 'MCQ Questions', Icon: ChecklistIcon },
]

function PracticeProblems() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [activeTab, setActiveTab] = useState('python')
  const [problems, setProblems] = useState({ python: [], sql: [], mcq: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMcqAnswers, setSelectedMcqAnswers] = useState({})
  const [revealedExplanations, setRevealedExplanations] = useState({})

  const loadProblems = useCallback(async () => {
    try {
      const data = await getPracticeProblems()
      if (Array.isArray(data)) {
        const python = data.filter((p) => (p.language || '').toLowerCase() === 'python')
        const sql = data.filter((p) => (p.language || '').toLowerCase() === 'sql')
        const mcq = data.filter((p) => (p.language || '').toLowerCase() === 'mcq')
        setProblems({ python, sql, mcq })
      } else if (data && typeof data === 'object') {
        setProblems({
          python: Array.isArray(data.python) ? data.python : (data.python?.problems || []),
          sql: Array.isArray(data.sql) ? data.sql : (data.sql?.problems || []),
          mcq: Array.isArray(data.mcq) ? data.mcq : (data.mcq?.questions || []),
        })
      }
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
    setUserName(localStorage.getItem('practice_name') || 'Learner')
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
    navigate('/practice/coding/' + problemId)
  }

  const handleSelectMcqOption = (questionId, optionIndex) => {
    setSelectedMcqAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }))
  }

  const toggleExplanation = (questionId) => {
    setRevealedExplanations((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }))
  }

  if (loading) {
    return <Spinner label="Loading practice questions...�" size={40} fullPage />
  }

  const activeProblems = problems[activeTab] || []

  return (
    <div className="section-problems-page">
      <header className="header">
        <div className="header-left flex items-center gap-3">
          <PlatformLogoSmall onClick={() => navigate('/practice/problems')} />
          <div>
            <h1>Practice Sandbox</h1>
            <span className="practice-badge">Untimed & Unproctored</span>
          </div>
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
            className={`practice-tab ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={16} />
            <span>{label}</span>
            <span className="practice-tab-count">{(problems[key] || []).length}</span>
          </button>
        ))}
      </div>

      <div className="problems-content practice-content-wrap">
        {error && <p className="practice-error" role="alert">{error}</p>}

        {!error && activeProblems.length === 0 && (
          <div className="practice-empty-card">
            <h3>No {activeTab.toUpperCase()} questions available</h3>
            <p>Admin has not added any active {activeTab} questions yet.</p>
          </div>
        )}

        {/* Python & SQL Problem List */}
        {activeTab !== 'mcq' && (
          <div className="problems-list">
            {activeProblems.map((problem, index) => (
              <div
                key={problem.id}
                className="problem-item"
                onClick={() => openProblem(problem.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openProblem(problem.id)}
                aria-label={problem.title + ', ' + problem.difficulty + ', ' + problem.marks + ' marks'}
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
                    <span className="time-limit">{formatTimeWithLabel(problem.time_limit, true)}</span>
                  </div>
                </div>
                <button className="btn-solve" tabIndex={-1} aria-hidden="true">
                  <FiCode style={{ marginRight: '6px' }} /> Practice
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Interactive MCQ Practice Section */}
        {activeTab === 'mcq' && (
          <div className="practice-mcq-list">
            {activeProblems.map((question, index) => {
              const selectedOption = selectedMcqAnswers[question.id]
              const isAnswered = selectedOption !== undefined
              const options = Array.isArray(question.options)
                ? question.options
                : [question.option_a, question.option_b, question.option_c, question.option_d].filter(Boolean)
              
              const correctIdx = typeof question.correct_answer === 'number'
                ? question.correct_answer
                : (question.correct_option === 'B' ? 1 : question.correct_option === 'C' ? 2 : question.correct_option === 'D' ? 3 : 0)

              const isCorrect = isAnswered && selectedOption === correctIdx
              const showExp = revealedExplanations[question.id] || isAnswered

              return (
                <article key={question.id} className={'mcq-question-card practice-mcq-card ' + (isAnswered ? (isCorrect ? 'practice-correct' : 'practice-incorrect') : '')}>
                  <div className="mcq-question-top">
                    <div className="mcq-question-number">{index + 1}</div>
                    <div className="mcq-question-main">
                      <div className="mcq-question-heading">
                        <h3>{question.title || question.question_title || ("Question " + (index + 1))}</h3>
                        {isAnswered && (
                          <span className={'practice-result-badge ' + (isCorrect ? 'correct' : 'incorrect')}>
                            {isCorrect ? <><FiCheckCircle /> Correct</> : <><FiXCircle /> Incorrect</>}
                          </span>
                        )}
                      </div>
                      <div className="problem-meta mcq-meta">
                        <span className="difficulty-badge" style={{ backgroundColor: getDifficultyColor(question.difficulty) }}>
                          {question.difficulty}
                        </span>
                        <span className="marks">{question.marks} marks</span>
                        <span className="mcq-topic-pill">{question.topic || 'General'}</span>
                      </div>
                      <p className="mcq-question-text">{question.question_text || question.question}</p>
                    </div>
                  </div>

                  <div className="mcq-options-grid">
                    {options.map((opt, optIdx) => {
                      let optClass = 'mcq-option-button'
                      if (selectedOption === optIdx) {
                        optClass += isCorrect ? ' practice-opt-correct' : ' practice-opt-wrong'
                      } else if (isAnswered && optIdx === correctIdx) {
                        optClass += ' practice-opt-correct'
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          className={optClass}
                          onClick={() => handleSelectMcqOption(question.id, optIdx)}
                        >
                          <span className="mcq-option-label">{String.fromCharCode(65 + optIdx)}</span>
                          <span className="mcq-option-text">{opt}</span>
                        </button>
                      )
                    })}
                  </div>

                  {showExp && (
                    <div className="practice-explanation-box">
                      <strong>Explanation:</strong>
                      <p>{question.explanation || ('The correct answer is Option ' + String.fromCharCode(65 + correctIdx) + ': ' + options[correctIdx])}</p>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PracticeProblems
