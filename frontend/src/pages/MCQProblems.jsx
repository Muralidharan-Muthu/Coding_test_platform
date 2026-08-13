import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExamStatus, getMcqProblems, submitExam } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { ChecklistIcon, TimerIcon } from '../components/ui/Branding'
import Spinner from '../components/ui/Spinner'
import { FiArrowLeft } from 'react-icons/fi'
import './SectionProblems.css'
import './MCQProblems.css'

function MCQProblems() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [questions, setQuestions] = useState([])
  const [selectedAnswers, setSelectedAnswers] = useState({})
  const [remainingTime, setRemainingTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const handleAutoSubmit = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    const answersList = Object.entries(answers).map(([problemId, data]) => ({
      problem_id: problemId,
      code: data.code || '',
      language: data.language || 'python',
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

    if (!name || !sessionId) {
      navigate('/')
      return
    }

    setUserName(name)
    setSelectedAnswers(JSON.parse(localStorage.getItem('exam_answers') || '{}'))
    loadData()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [navigate])

  useEffect(() => {
    if (remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleAutoSubmit()
            return 0
          }
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [remainingTime, handleAutoSubmit])

  const loadData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')

      const status = await getExamStatus(sessionId)

      if (status.status === 'not_started') {
        navigate('/dashboard')
        return
      }

      if (status.status === 'completed') {
        navigate('/submission-complete')
        return
      }

      if (status.status === 'expired') {
        handleAutoSubmit()
        return
      }

      setRemainingTime(status.remaining_seconds)
      const questionsData = await getMcqProblems(sessionId)
      setQuestions(Array.isArray(questionsData) ? questionsData : [])
    } catch (err) {
      console.error('Failed to load MCQ questions', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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

  const getSelectedOption = (questionId) => {
    const answer = selectedAnswers[questionId]
    if (!answer) return null

    const selectedOption = answer.selected_option
    if (typeof selectedOption === 'number') return selectedOption

    const parsed = Number.parseInt(String(answer.code ?? ''), 10)
    return Number.isInteger(parsed) ? parsed : null
  }

  const handleSelectOption = (questionId, optionIndex) => {
    const nextAnswers = {
      ...selectedAnswers,
      [questionId]: {
        code: String(optionIndex),
        language: 'mcq',
        selected_option: optionIndex,
      },
    }

    setSelectedAnswers(nextAnswers)
    localStorage.setItem('exam_answers', JSON.stringify(nextAnswers))
  }

  if (loading) {
    return <Spinner label="Loading MCQ questions…" size={40} fullPage />
  }

  return (
    <div className="section-problems-page mcq-section">
      <header className="header">
        <div className="header-left">
          <button onClick={() => navigate('/test-structure')} className="btn-back" aria-label="Back to sections">
            <FiArrowLeft /> Back
          </button>
          <h1><ChecklistIcon size={20} /> MCQ Questions</h1>
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

      <div className="problems-content mcq-problems-content">
        {questions.length === 0 ? (
          <div className="mcq-empty-state">
            <h2>No MCQ questions assigned</h2>
            <p>Return to the assessment sections page and contact Admin if this looks unexpected.</p>
          </div>
        ) : (
          <>
            <div className="mcq-section-intro">
              <h2>Answer the Multiple-Choice Questions</h2>
              <p>Each selection is saved instantly. You can return and change any answer before the final exam submission.</p>
            </div>

            <div className="mcq-question-list">
              {questions.map((question, index) => {
                const selectedOption = getSelectedOption(question.id)
                const isAnswered = selectedOption !== null

                return (
                  <article key={question.id} className={`mcq-question-card${isAnswered ? ' answered' : ''}`}>
                    <div className="mcq-question-top">
                      <div className="mcq-question-number">{index + 1}</div>
                      <div className="mcq-question-main">
                        <div className="mcq-question-heading">
                          <h3>{question.question_title}</h3>
                          <span className="mcq-answer-state">{isAnswered ? 'Answered' : 'Not answered'}</span>
                        </div>
                        <div className="problem-meta mcq-meta">
                          <span className="difficulty-badge" style={{ backgroundColor: getDifficultyColor(question.difficulty) }}>
                            {question.difficulty}
                          </span>
                          <span className="marks">{question.marks} marks</span>
                          <span className="time-limit">{question.time_limit || question.time} mins</span>
                          <span className="mcq-topic-pill">{question.topic}</span>
                        </div>
                        <p className="mcq-question-text">{question.question}</p>
                      </div>
                    </div>

                    <div className="mcq-options-grid">
                      {question.options.map((option, optionIndex) => (
                        <button
                          key={`${question.id}-${optionIndex}`}
                          type="button"
                          className={`mcq-option-button${selectedOption === optionIndex ? ' selected' : ''}`}
                          onClick={() => handleSelectOption(question.id, optionIndex)}
                        >
                          <span className="mcq-option-label">{String.fromCharCode(65 + optionIndex)}</span>
                          <span className="mcq-option-text">{option}</span>
                        </button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MCQProblems
