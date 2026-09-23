import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExamStatus, getExamSummary, startExam, submitExam } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { PlatformLogoSmall, PythonIcon, DatabaseIcon, TimerIcon, ChecklistIcon } from '../components/ui/Branding'
import { useToast } from '../components/ui/ToastProvider'
import { clearCandidateSession } from '../utils/sessionStorage'

const EXAM_SECURE_MODE_KEY = 'exam_secure_mode_started'
const EXAM_DURATION_SECONDS = 150 * 60

function TestStructure() {
  const navigate = useNavigate()
  const toast = useToast()
  const [userName, setUserName] = useState('')
  const [remainingTime, setRemainingTime] = useState(0)
  const [examSummary, setExamSummary] = useState(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [examSessionStarted, setExamSessionStarted] = useState(false)
  const [initError, setInitError] = useState('')
  const timerRef = useRef(null)
  const initRef = useRef(false)

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

  // On mount: validate session, load data, auto-start fullscreen + exam
  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')
    if (!name || !sessionId) { navigate('/'); return }
    setUserName(name)
    initExam()

    const params = new URLSearchParams(window.location.search)
    if (params.get('confirm') === 'true') {
      setShowSubmitConfirm(true)
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [navigate])

  // Timer effect
  useEffect(() => {
    if (examSessionStarted && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleAutoSubmit(); return 0 }
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [examSessionStarted, remainingTime, handleAutoSubmit])

  // Time penalty listener
  useEffect(() => {
    const handlePenalty = (e) => {
      const ps = e.detail?.penaltySeconds || 60
      setRemainingTime(prev => Math.max(0, prev - ps))
    }
    window.addEventListener('exam_time_penalty', handlePenalty)
    return () => window.removeEventListener('exam_time_penalty', handlePenalty)
  }, [])

  const initExam = async () => {
    if (initRef.current) return
    initRef.current = true

    try {
      const sessionId = localStorage.getItem('session_id')
      const status = await getExamStatus(sessionId)

      if (status.status === 'completed') {
        navigate('/submission-complete')
        return
      }
      if (status.status === 'expired') {
        handleAutoSubmit()
        return
      }

      // Load summary
      const summary = await getExamSummary(sessionId)
      setExamSummary(summary)

      if (status.status === 'active') {
        // Exam already started — resume
        setExamSessionStarted(true)
        setRemainingTime(status.remaining_seconds)
        localStorage.setItem(EXAM_SECURE_MODE_KEY, 'true')
        // Re-enter fullscreen if not already
        if (!document.fullscreenElement) {
          try { await document.documentElement.requestFullscreen() } catch {}
        }
      } else {
        // Not started — auto-start
        await autoStartExam(sessionId)
      }
    } catch (err) {
      console.error('Failed to init exam', err)
      setInitError('Failed to initialize exam. Please go back and try again.')
    }
  }

  const autoStartExam = async (sessionId) => {
    try {
      // Safely attempt fullscreen without letting permission rejections abort the exam
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen()
        } catch (fsErr) {
          console.warn('Fullscreen gesture deferred:', fsErr)
        }
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
    } catch (err) {
      console.error('Auto-start exam error:', err)
      setInitError(err.response?.data?.detail || err.message || 'Could not start exam session. Please try again.')
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0')
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'ts-timer critical'
    if (remainingTime <= 900) return 'ts-timer warning'
    return 'ts-timer'
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
      toast.error(err.response?.data?.detail || 'Submit failed. Try again.')
    } finally {
      setSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }

  const handleOpenSection = (path) => navigate(path)

  const getAnsweredCount = (language) => {
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    return Object.values(answers).filter(a => a.language === language).length
  }

  // Error state
  if (initError) {
    return (
      <div className="ts-page">
        <div className="ts-error-card">
          <h2>Initialization Error</h2>
          <p>{initError}</p>
          <button onClick={() => { initRef.current = false; setInitError(''); initExam() }} className="ts-btn-retry">
            Retry
          </button>
          <button onClick={() => navigate('/dashboard')} className="ts-btn-back">
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ts-page">
      <header className="ts-header">
        <div className="ts-header-left">
          <PlatformLogoSmall />
        </div>
        <div className="ts-header-right">
          {examSessionStarted && (
            <div className={getTimerClass()}>
              <TimerIcon size={15} />
              <span>{formatTime(remainingTime)}</span>
            </div>
          )}
          <ThemeToggle />
          <span className="ts-user">{userName}</span>
          <button onClick={() => setShowSubmitConfirm(true)} className="ts-btn-submit">
            Submit Exam
          </button>
        </div>
      </header>

      <div className="ts-content">
        <h2 className="ts-title">Choose Section</h2>

        <div className="ts-grid">
          {(examSummary?.python_questions || 0) > 0 && (
            <div className="ts-card python" onClick={() => handleOpenSection('/problems/python')} role="button" tabIndex={0}>
              <PythonIcon size={28} />
              <h3>Python</h3>
              <p>{examSummary.python_questions} Questions</p>
              <span className="ts-answered">{getAnsweredCount('python')} done</span>
            </div>
          )}

          {(examSummary?.sql_questions || 0) > 0 && (
            <div className="ts-card sql" onClick={() => handleOpenSection('/problems/sql')} role="button" tabIndex={0}>
              <DatabaseIcon size={28} />
              <h3>SQL</h3>
              <p>{examSummary.sql_questions} Questions</p>
              <span className="ts-answered">{getAnsweredCount('sql')} done</span>
            </div>
          )}

          {(examSummary?.mcq_questions || 0) > 0 && (
            <div className="ts-card mcq" onClick={() => handleOpenSection('/problems/mcq')} role="button" tabIndex={0}>
              <ChecklistIcon size={28} />
              <h3>MCQ</h3>
              <p>{examSummary.mcq_questions} Questions</p>
              <span className="ts-answered">{getAnsweredCount('mcq')} done</span>
            </div>
          )}
        </div>

        <div className="ts-tips">
          <span>Switch sections anytime</span>
          <span>Progress auto-saved</span>
          <span>Watch the timer</span>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <ChecklistIcon size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Submit Exam</h3>
              <p className="text-sm text-slate-300">
                Are you ready to submit your assessment? Once submitted, your answers will be finalized.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 flex items-center justify-around">
              <div>
                <span className="block text-slate-400">Time Remaining</span>
                <span className="font-mono text-sm font-bold text-amber-400">{formatTime(remainingTime)}</span>
              </div>
              <div className="h-8 w-px bg-slate-700" />
              <div>
                <span className="block text-slate-400">Answered</span>
                <span className="text-sm font-bold text-emerald-400">
                  {[(examSummary?.python_questions || 0) > 0 && `${getAnsweredCount('python')} Python`,
                    (examSummary?.sql_questions || 0) > 0 && `${getAnsweredCount('sql')} SQL`,
                    (examSummary?.mcq_questions || 0) > 0 && `${getAnsweredCount('mcq')} MCQ`
                  ].filter(Boolean).join(' • ') || 'Answers saved'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                Review Answers
              </button>
              <button
                type="button"
                onClick={handleManualSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-lg transition cursor-pointer ring-2 ring-emerald-400/30 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Yes, Submit Exam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestStructure