import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSqlProblems, getExamStatus, submitExam } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { DatabaseIcon, TimerIcon } from '../components/ui/Branding'
import Spinner from '../components/ui/Spinner'
import { FiArrowLeft, FiCheck } from 'react-icons/fi'
import './SectionProblems.css'

function SQLProblems() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [problems, setProblems] = useState([])
  const [remainingTime, setRemainingTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const handleAutoSubmit = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    const answersList = Object.entries(answers).map(([problemId, data]) => ({
      problem_id: problemId,
      code: data.code || '',
      language: data.language || 'sql',
      selected_option: data.selected_option ?? null,
    }))
    try {
      await submitExam(sessionId, answersList, true)
      localStorage.removeItem('exam_answers')
      localStorage.removeItem('exam_start_time')
      localStorage.removeItem('exam_remaining')
      navigate('/submission-complete?auto=true')
    } catch (err) {
      console.error('Auto submit failed', err)
    }
  }, [navigate])

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')
    if (!name || !sessionId) { navigate('/'); return }
    setUserName(name)
    loadData()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [navigate])

    useEffect(() => {
    const handlePenalty = (e) => {
      const penaltySeconds = e.detail?.penaltySeconds || 60
      setRemainingTime(prev => Math.max(0, prev - penaltySeconds))
    }
    window.addEventListener('exam_time_penalty', handlePenalty)
    return () => window.removeEventListener('exam_time_penalty', handlePenalty)
  }, [])

  useEffect(() => {
    if (remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleAutoSubmit(); return 0 }
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [remainingTime, handleAutoSubmit])

  const loadData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')

      const status = await getExamStatus(sessionId)
      if (status.status === 'not_started') { navigate('/dashboard'); return }
      if (status.status === 'completed') { navigate('/submission-complete'); return }
      if (status.status === 'expired') { handleAutoSubmit(); return }
      setRemainingTime(status.remaining_seconds)
      const problemsData = await getSqlProblems(sessionId)
      setProblems(problemsData)
    } catch (err) {
      console.error('Failed to load problems', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'timer critical'
    if (remainingTime <= 900) return 'timer warning'
    return 'timer'
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'hard': return '#ef4444'
      default: return '#9e9e9e'
    }
  }

  const isAnswered = (problemId) => {
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    return !!answers[problemId]
  }

  if (loading) return <Spinner label="Loading problems…" size={40} fullPage />

  return (
    <div className="section-problems-page sql-section">
      <header className="header">
        <div className="header-left">
          <button onClick={() => navigate('/test-structure')} className="btn-back" aria-label="Back to sections">
            <FiArrowLeft /> Back
          </button>
          <h1><DatabaseIcon size={20} /> SQL Problems</h1>
        </div>
        <div className="header-right">
          <div className={getTimerClass()} aria-label={`Time remaining: ${formatTime(remainingTime)}`}>
            <span className="timer-icon" aria-hidden="true"><TimerIcon size={16} /></span>
            <span className="timer-value">{formatTime(remainingTime)}</span>
          </div>
          <ThemeToggle />
          <span className="user-name">{userName}</span>
        </div>
      </header>

      <div className="problems-content">
        <div className="problems-list">
          {problems.map((problem, index) => (
            <div
              key={problem.id}
              className={`problem-item${isAnswered(problem.id) ? ' answered' : ''}`}
              onClick={() => navigate(`/coding/${problem.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/coding/${problem.id}`)}
              aria-label={`${problem.title}, ${problem.difficulty}, ${problem.marks} marks`}
            >
              <div className="problem-number">{index + 1}</div>
              <div className="problem-info">
                <h3>{problem.title}</h3>
                <div className="problem-meta">
                  <span className="difficulty-badge" style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}>
                    {problem.difficulty}
                  </span>
                  <span className="marks">{problem.marks} marks</span>
                  <span className="time-limit">{problem.time_limit} mins</span>
                </div>
              </div>
              <div className="problem-status">
                {isAnswered(problem.id)
                  ? <span className="status-answered"><FiCheck /> Answered</span>
                  : <span className="status-pending">Not answered</span>}
              </div>
              {isAnswered(problem.id) ? (
                <button className="btn-review" tabIndex={-1} aria-hidden="true">Review</button>
              ) : (
                <button className="btn-solve" tabIndex={-1} aria-hidden="true">Solve</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default SQLProblems

