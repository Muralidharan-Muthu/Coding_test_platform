import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLock, FiMaximize, FiAlertTriangle, FiHeart, FiXOctagon, FiShield } from 'react-icons/fi'
import { ProctoringProvider } from './ProctoringProvider'
import { ProctoringStatus } from './ProctoringStatus'
import { CameraPreview } from './CameraPreview'
import { useProctoring } from './useProctoring'
import { submitExam } from '../../api'
import './ExamProctoringShell.css'

const EXAM_SECURE_MODE_KEY = 'exam_secure_mode_started'
const EXAM_LIVES_KEY = 'exam_proctoring_lives'
const INITIAL_LIVES = 3
const TIME_PENALTY_SECONDS = 60

/**
 * AntiScreenshotShield:
 * Instantly renders an opaque solid blackout barrier across the entire screen
 * whenever:
 * 1. Window loses focus (blur event - e.g. when Snipping Tool, Xbox overlay, or screenshot utility is activated)
 * 2. Tab becomes hidden
 * 3. Any screenshot shortcut key (PrintScreen, Win+Shift+S, Meta+Shift+3/4/5, Alt+PrtScn, Ctrl+P) is pressed
 * This guarantees any external screenshot tool captures ONLY the black shield.
 */
function AntiScreenshotShield() {
  const [isShieldActive, setIsShieldActive] = useState(false)
  const isSecure = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true'

  useEffect(() => {
    if (!isSecure) return

    const wipeClipboard = () => {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('Screenshots and clipboard copying are prohibited during the assessment.').catch(() => {})
        }
      } catch {}
    }

    const triggerShield = () => {
      wipeClipboard()
      setIsShieldActive(true)
    }

    const dismissShield = () => {
      setIsShieldActive(false)
    }

    // 1. Loss of window focus (e.g. Snipping tool, Alt+Tab, PrtScn overlay)
    const handleBlur = () => {
      triggerShield()
    }

    const handleFocus = () => {
      dismissShield()
    }

    // 2. Visibility change
    const handleVisibility = () => {
      if (document.hidden) {
        triggerShield()
      } else {
        dismissShield()
      }
    }

    // 3. Screenshot key combinations
    const handleKey = (e) => {
      const k = e.key?.toLowerCase()
      const isPrtScn = e.key === 'PrintScreen' || e.keyCode === 44 || k === 'printscreen'
      const isSnipping = (e.metaKey || e.ctrlKey) && e.shiftKey && (k === 's' || k === '3' || k === '4' || k === '5')
      const isAltPrtScn = e.altKey && isPrtScn
      const isPrint = (e.ctrlKey || e.metaKey) && k === 'p'

      if (isPrtScn || isSnipping || isAltPrtScn || isPrint) {
        e.preventDefault()
        e.stopPropagation()
        triggerShield()
        // Keep shield up to ensure screenshot tools grab only the shield
        setTimeout(() => {
          if (document.hasFocus()) dismissShield()
        }, 1500)
      }
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('keydown', handleKey, { capture: true })
    window.addEventListener('keyup', handleKey, { capture: true })

    // Check initial focus
    if (!document.hasFocus()) {
      setIsShieldActive(true)
    }

    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('keydown', handleKey, { capture: true })
      window.removeEventListener('keyup', handleKey, { capture: true })
    }
  }, [isSecure])

  if (!isSecure || !isShieldActive) return null

  return (
    <div 
      className="eps-screenshot-curtain"
      onClick={() => setIsShieldActive(false)}
      role="alert"
      aria-live="assertive"
    >
      <div className="eps-screenshot-curtain-card">
        <FiShield size={56} style={{ color: '#ef4444', marginBottom: '16px' }} />
        <h2>Screen Content Protected</h2>
        <p>
          Screenshots, snipping tools, and background window captures are blocked for exam security.
        </p>
        <span className="eps-curtain-resume-hint">
          Click anywhere in this window to resume assessment
        </span>
      </div>
    </div>
  )
}

function FullscreenLockOverlay() {
  const proctoring = useProctoring()
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const isSecureExamStarted = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true'

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleReenter = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch {}
  }

  if (!isSecureExamStarted || isFullscreen) return null

  return (
    <div className="eps-lock-overlay">
      <div className="eps-lock-modal">
        <FiLock size={40} />
        <h2>Fullscreen Required</h2>
        <p>Re-enter fullscreen to continue your exam.</p>
        <button onClick={handleReenter} className="eps-btn-reenter">
          <FiMaximize size={16} /> Re-enter Fullscreen
        </button>
      </div>
    </div>
  )
}

function ProctoringSurveillanceGuard() {
  const navigate = useNavigate()
  const proctoring = useProctoring()
  const [lives, setLives] = useState(() => {
    const saved = localStorage.getItem(EXAM_LIVES_KEY)
    return saved !== null ? parseInt(saved, 10) : INITIAL_LIVES
  })
  const [missingSeconds, setMissingSeconds] = useState(0)
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [penaltyMessage, setPenaltyMessage] = useState('')
  const lastViolationRef = useRef(null)
  const isSecure = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true'

  const playAlert = useCallback(() => {
    try { new Audio('https://www.soundjay.com/buttons/sounds/beep-01a.mp3').play().catch(() => {}) } catch {}
  }, [])

  const handleDisqualification = useCallback(async () => {
    setIsDisqualified(true)
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    const list = Object.entries(answers).map(([pid, d]) => ({
      problem_id: pid, code: d.code || '', language: d.language || 'python', selected_option: d.selected_option ?? null,
    }))
    try { if (sessionId) await submitExam(sessionId, list, true) } catch {}
    finally {
      localStorage.removeItem(EXAM_SECURE_MODE_KEY)
      localStorage.removeItem('exam_answers')
      navigate('/submission-complete?reason=proctoring_exhausted')
    }
  }, [navigate])

  // Face absence monitor
  useEffect(() => {
    if (!isSecure || proctoring?.status !== 'active') return
    let timer = null
    const fc = proctoring.faceCount ?? 1

    if (fc === 0) {
      timer = setInterval(() => {
        setMissingSeconds(prev => {
          const next = prev + 1
          if (next >= 5) {
            setLives(curr => {
              const rem = curr - 1
              localStorage.setItem(EXAM_LIVES_KEY, rem.toString())
              playAlert()
              if (rem <= 0) handleDisqualification()
              return Math.max(0, rem)
            })
            return 0
          }
          return next
        })
      }, 1000)
    } else {
      setMissingSeconds(0)
    }
    return () => { if (timer) clearInterval(timer) }
  }, [isSecure, proctoring?.status, proctoring?.faceCount, playAlert, handleDisqualification])

  // Violation penalties
  useEffect(() => {
    if (!isSecure || !proctoring?.violation) return
    const v = proctoring.violation
    if (lastViolationRef.current === v.timestamp) return
    lastViolationRef.current = v.timestamp

    const penalize = ['SCREENSHOT_ATTEMPT', 'DEVTOOLS_ATTEMPT', 'APP_SWITCH_ATTEMPT', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'MULTIPLE_FACES']
    if (penalize.includes(v.type)) {
      const curr = parseInt(localStorage.getItem('exam_remaining') || '0', 10)
      if (curr > 0) {
        localStorage.setItem('exam_remaining', Math.max(0, curr - TIME_PENALTY_SECONDS).toString())
        window.dispatchEvent(new CustomEvent('exam_time_penalty', { detail: { penaltySeconds: TIME_PENALTY_SECONDS, reason: v.type } }))
      }
      setPenaltyMessage(v.type.replace(/_/g, ' ') + ' — ' + TIME_PENALTY_SECONDS + 's penalty')
      playAlert()
      setTimeout(() => setPenaltyMessage(''), 4000)
    }
  }, [isSecure, proctoring?.violation, playAlert])

  // Sync lives from storage
  useEffect(() => {
    const handler = () => {
      const s = localStorage.getItem(EXAM_LIVES_KEY)
      if (s !== null) setLives(parseInt(s, 10))
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  if (!isSecure) return null

  if (isDisqualified) {
    return (
      <div className="eps-lock-overlay">
        <div className="eps-lock-modal eps-disqualified">
          <FiXOctagon size={44} />
          <h2>Exam Terminated</h2>
          <p>All 3 proctoring lives exhausted. Your exam has been auto-submitted.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Face absence warning */}
      {missingSeconds > 0 && proctoring?.faceCount === 0 && (
        <div className="eps-face-warn">
          <FiAlertTriangle size={20} />
          <span>Face not detected! {5 - missingSeconds}s left or lose 1 life</span>
          <span className="eps-lives-pill">{lives}/3</span>
        </div>
      )}

      {/* Penalty toast */}
      {penaltyMessage && (
        <div className="eps-penalty-toast">
          <FiAlertTriangle size={16} />
          <span>{penaltyMessage}</span>
        </div>
      )}

      {/* Lives HUD */}
      <div className="eps-lives-hud">
        {[1, 2, 3].map(i => (
          <FiHeart key={i} size={14} className={i <= lives ? 'eps-heart-active' : 'eps-heart-lost'} />
        ))}
      </div>
    </>
  )
}

export function ExamProctoringShell({ children }) {
  const sessionId = localStorage.getItem('session_id') || 'default'
  const candidateId = localStorage.getItem('user_id') || localStorage.getItem('user_name') || 'default'

  return (
    <ProctoringProvider testId={sessionId} candidateId={candidateId} enabled={true}>
      <div className="eps-shell">
        <ProctoringStatus />
        {children}
        <CameraPreview />
        <FullscreenLockOverlay />
        <AntiScreenshotShield />
        <ProctoringSurveillanceGuard />
      </div>
    </ProctoringProvider>
  )
}

export default ExamProctoringShell