import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExamStatus, getExamSummary, startExam, submitExam } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { PlatformLogoSmall, PythonIcon, DatabaseIcon, TimerIcon, ChecklistIcon } from '../components/ui/Branding'
import { useToast } from '../components/ui/ToastProvider'
import { clearCandidateSession } from '../utils/sessionStorage'
import './TestStructure.css'

const EXAM_SECURE_MODE_KEY = 'exam_secure_mode_started'
const EXAM_DURATION_SECONDS = 150 * 60

const secureExamGateWrapStyle = {
  display: 'flex',
  justifyContent: 'center',
  padding: '56px 20px 24px',
}

const secureExamGateCardStyle = {
  width: 'min(620px, 100%)',
  padding: '36px 32px',
  borderRadius: '24px',
  border: '1px solid rgba(96, 165, 250, 0.2)',
  background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))',
  color: '#f8fafc',
  boxShadow: '0 26px 80px rgba(15, 23, 42, 0.34)',
  textAlign: 'center',
}

const secureExamButtonStyle = {
  marginTop: '24px',
  padding: '14px 28px',
  border: 'none',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #f97316, #ea580c)',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 16px 36px rgba(234, 88, 12, 0.32)',
}

const secureExamErrorStyle = {
  marginTop: '18px',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'rgba(127, 29, 29, 0.92)',
  color: '#fee2e2',
  fontSize: '13px',
  fontWeight: 600,
  lineHeight: 1.5,
}

function TestStructure() {
  const navigate = useNavigate()
  const toast = useToast()
  const [userName, setUserName] = useState('')
  const [remainingTime, setRemainingTime] = useState(0)
  const [examSummary, setExamSummary] = useState(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [examSessionStarted, setExamSessionStarted] = useState(false)
  const [isExamEnvironmentReady, setIsExamEnvironmentReady] = useState(false)
  const [startingSecureMode, setStartingSecureMode] = useState(false)
  const [secureModeError, setSecureModeError] = useState('')
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
      localStorage.removeItem(EXAM_SECURE_MODE_KEY)
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
    loadExamData()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [navigate])

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement)

      if (fullscreenActive) {
        localStorage.setItem(EXAM_SECURE_MODE_KEY, 'true')
        setIsExamEnvironmentReady(true)
        setSecureModeError('')
        return
      }

      if (localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' || isExamEnvironmentReady) {
        localStorage.removeItem(EXAM_SECURE_MODE_KEY)
        setIsExamEnvironmentReady(false)
        setSecureModeError('Fullscreen mode is required. Start the secure exam here before opening problems.')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isExamEnvironmentReady])

  useEffect(() => {
    if (examSessionStarted && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleAutoSubmit()
            return 0
          }
          // Update localStorage for persistence
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [examSessionStarted, remainingTime, handleAutoSubmit])

  const loadExamData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')

      // Get exam status to check remaining time
      const status = await getExamStatus(sessionId)
      
      if (status.status === 'not_started') {
        localStorage.removeItem(EXAM_SECURE_MODE_KEY)
        setExamSessionStarted(false)
        setIsExamEnvironmentReady(false)
        setRemainingTime(EXAM_DURATION_SECONDS)
      } else if (status.status === 'completed') {
        localStorage.removeItem(EXAM_SECURE_MODE_KEY)
        navigate('/submission-complete')
        return
      } else if (status.status === 'expired') {
        handleAutoSubmit()
        return
      } else {
        setExamSessionStarted(true)
        setRemainingTime(status.remaining_seconds)
        const secureModeActive = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' && Boolean(document.fullscreenElement)
        setIsExamEnvironmentReady(secureModeActive)
        if (!secureModeActive) {
          localStorage.removeItem(EXAM_SECURE_MODE_KEY)
        }
      }

      // Load exam summary
      const summary = await getExamSummary(sessionId)
      setExamSummary(summary)
      
    } catch (err) {
      console.error('Failed to load exam data', err)
    }
  }

  const handleStartSecureExam = async () => {
    setStartingSecureMode(true)
    setSecureModeError('')

    try {
      const sessionId = localStorage.getItem('session_id')

      if (!document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen) {
          throw new Error('Fullscreen is not supported in this browser.')
        }
        await document.documentElement.requestFullscreen()
      }

      const response = await startExam(sessionId)
      localStorage.setItem('exam_start_time', response.start_time)
      localStorage.setItem('exam_remaining', response.remaining_seconds)
      if (!localStorage.getItem('exam_answers')) {
        localStorage.setItem('exam_answers', JSON.stringify({}))
      }
      localStorage.setItem(EXAM_SECURE_MODE_KEY, 'true')
      setExamSessionStarted(true)
      setRemainingTime(response.remaining_seconds)
      setIsExamEnvironmentReady(true)
    } catch (err) {
      console.error('Failed to activate secure exam mode', err)
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
      setExamSessionStarted(false)
      setIsExamEnvironmentReady(false)
      localStorage.removeItem(EXAM_SECURE_MODE_KEY)
      setSecureModeError('Start the secure exam here to enable full-screen monitoring before you solve questions.')
    } finally {
      setStartingSecureMode(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'timer critical' // 5 mins
    if (remainingTime <= 900) return 'timer warning' // 15 mins
    return 'timer'
  }

  const handleManualSubmit = async () => {
    setSubmitting(true)
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    
    const answersList = Object.entries(answers).map(([problemId, data]) => ({
      problem_id: problemId,
      code: data.code || '',
      language: data.language || 'python',
      selected_option: data.selected_option ?? null,
    }))

    try {
      await submitExam(sessionId, answersList, false)
      localStorage.removeItem(EXAM_SECURE_MODE_KEY)
      localStorage.removeItem('exam_answers')
      localStorage.removeItem('exam_start_time')
      localStorage.removeItem('exam_remaining')
      navigate('/submission-complete')
    } catch (err) {
      console.error('Submit failed', err)
      toast.error(err.response?.data?.detail || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? Your exam progress will be lost.')) {
      localStorage.removeItem(EXAM_SECURE_MODE_KEY)
      clearCandidateSession()
      navigate('/')
    }
  }

  const handleOpenSection = (path) => {
    if (!isExamEnvironmentReady) {
      setSecureModeError('Start the secure exam on this page before opening assessment problems.')
      return
    }
    navigate(path)
  }

  const getAnsweredCount = (language) => {
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    return Object.values(answers).filter(a => a.language === language).length
  }

  return (
    <div className="test-structure-page">
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <PlatformLogoSmall onClick={() => navigate('/dashboard')} />
          </div>
        </div>
        <div className="header-right">
          <div className={getTimerClass()} aria-label={`Time remaining: ${formatTime(remainingTime)}`}>
            <span className="timer-icon" aria-hidden="true"><TimerIcon size={16} /></span>
            <span className="timer-value">{formatTime(remainingTime)}</span>
          </div>
          <ThemeToggle />
          <span className="user-name">{userName}</span>
          <button onClick={() => setShowSubmitConfirm(true)} className="btn-submit-exam">
            Submit Exam
          </button>
        </div>
      </header>

      <div className="test-structure-content">
        {!isExamEnvironmentReady ? (
          <div style={secureExamGateWrapStyle}>
            <div style={secureExamGateCardStyle}>
              <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#93c5fd' }}>
                Secure Exam Start
              </div>
              <h2 style={{ margin: '14px 0 10px', fontSize: '34px', fontWeight: 800, color: '#f8fafc' }}>
                Start Assessment Here
              </h2>
              <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7, color: 'rgba(226, 232, 240, 0.88)' }}>
                Full-screen mode and secure monitoring are armed from this page before the candidate opens Python, SQL, or MCQ questions.
              </p>
              <p style={{ margin: '16px 0 0', fontSize: '14px', lineHeight: 1.6, color: 'rgba(191, 219, 254, 0.86)' }}>
                Once secure mode is active, the rest of the exam pages continue inside the same exam session instead of re-starting per question.
              </p>
              {secureModeError && (
                <div style={secureExamErrorStyle}>
                  {secureModeError}
                </div>
              )}
              <button
                type="button"
                onClick={handleStartSecureExam}
                disabled={startingSecureMode}
                style={{
                  ...secureExamButtonStyle,
                  opacity: startingSecureMode ? 0.75 : 1,
                  cursor: startingSecureMode ? 'not-allowed' : 'pointer',
                }}
              >
                {startingSecureMode ? 'Starting Secure Exam...' : 'Start Secure Exam'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>Choose Assessment Section</h2>
            <p className="section-subtitle">Select a section to view and solve problems</p>

            <div className="sections-grid">
              {(examSummary?.python_questions || 0) > 0 && (
                <div 
                  className="section-card python"
                  onClick={() => handleOpenSection('/problems/python')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSection('/problems/python')}
                  aria-label="Python Problems section"
                >
                  <div className="section-icon" aria-hidden="true"><PythonIcon size={32} /></div>
                  <h3>Python Problems</h3>
                  <p className="section-count">
                    {examSummary?.python_questions || 0} Questions
                  </p>
                  <div className="section-progress">
                    <span className="answered">
                      {getAnsweredCount('python')} answered
                    </span>
                  </div>
                  <button className="btn-section" tabIndex={-1}>View Problems</button>
                </div>
              )}

              {(examSummary?.sql_questions || 0) > 0 && (
                <div 
                  className="section-card sql"
                  onClick={() => handleOpenSection('/problems/sql')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSection('/problems/sql')}
                  aria-label="SQL Problems section"
                >
                  <div className="section-icon" aria-hidden="true"><DatabaseIcon size={32} /></div>
                  <h3>SQL Problems</h3>
                  <p className="section-count">
                    {examSummary?.sql_questions || 0} Questions
                  </p>
                  <div className="section-progress">
                    <span className="answered">
                      {getAnsweredCount('sql')} answered
                    </span>
                  </div>
                  <button className="btn-section" tabIndex={-1}>View Problems</button>
                </div>
              )}

              {(examSummary?.mcq_questions || 0) > 0 && (
                <div
                  className="section-card mcq"
                  onClick={() => handleOpenSection('/problems/mcq')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleOpenSection('/problems/mcq')}
                  aria-label="MCQ Questions section"
                >
                  <div className="section-icon" aria-hidden="true"><ChecklistIcon size={32} /></div>
                  <h3>MCQ Questions</h3>
                  <p className="section-count">
                    {examSummary?.mcq_questions || 0} Questions
                  </p>
                  <div className="section-progress">
                    <span className="answered">
                      {getAnsweredCount('mcq')} answered
                    </span>
                  </div>
                  <button className="btn-section" tabIndex={-1}>Open MCQs</button>
                </div>
              )}
            </div>

            <div className="exam-tips">
              <h4>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                Tips
              </h4>
              <ul>
                <li>You can switch between sections anytime</li>
                <li>Your code and MCQ selections are auto-saved as you work</li>
                <li>Submit each problem individually or submit all at once</li>
                <li>Keep an eye on the timer above</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {showSubmitConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-content">
            <h3 id="modal-title">Submit Exam?</h3>
            <p>Are you sure you want to submit your exam? This action cannot be undone.</p>
            <p className="time-remaining">Time remaining: {formatTime(remainingTime)}</p>
            <div className="modal-buttons">
              <button 
                onClick={() => setShowSubmitConfirm(false)} 
                className="btn-cancel"
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit} 
                className="btn-confirm"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestStructure
