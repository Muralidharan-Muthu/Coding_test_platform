import { createPortal } from 'react-dom'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiLock, FiMaximize, FiAlertTriangle, FiXOctagon, FiShield, FiAlertCircle } from 'react-icons/fi'
import { ProctoringProvider } from './ProctoringProvider'
import { ProctoringStatus } from './ProctoringStatus'
import { CameraPreview } from './CameraPreview'
import { useProctoring } from './useProctoring'
import { submitExam, analyzeProctorFrame, applyExamPenalty } from '../../api'
import './ExamProctoringShell.css'

const EXAM_SECURE_MODE_KEY = 'exam_secure_mode_started'
const AI_SCAN_INTERVAL_MS = 20000 // Periodic background scan every 20s
const MAX_CRITICAL_FLAGS = 5     // Max critical fraud flags before auto-submit

/**
 * AntiScreenshotShield:
 * Protects test content by blurring on snipping tool, print screen, and tab switches.
 */
function AntiScreenshotShield() {
  const [isShieldActive, setIsShieldActive] = useState(false)

  const wipeClipboard = useCallback(() => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {})
      }
    } catch {}
  }, [])

  const triggerShield = useCallback(() => {
    wipeClipboard()
    document.body.classList.add('eps-page-blur')
    setIsShieldActive(true)
  }, [wipeClipboard])

  const dismissShield = useCallback(() => {
    document.body.classList.remove('eps-page-blur')
    setIsShieldActive(false)
    setTimeout(() => window.focus(), 50)
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      const k = (e.key || '').toLowerCase()
      const code = (e.code || '').toLowerCase()
      const isPrtScn = e.key === 'PrintScreen' || e.keyCode === 44 || k === 'printscreen' || code === 'printscreen'
      const isSnipping = (e.metaKey || e.ctrlKey) && e.shiftKey && (k === 's' || k === '3' || k === '4' || k === '5')
      const isAltPrtScn = e.altKey && isPrtScn
      const isPrint = (e.ctrlKey || e.metaKey) && k === 'p'

      if (isPrtScn || isSnipping || isAltPrtScn || isPrint) {
        try { e.preventDefault(); e.stopPropagation() } catch {}
        triggerShield()
      }
    }

    const handleVisibility = () => {
      if (document.hidden) triggerShield()
    }

    window.addEventListener('keydown', handleKey, { capture: true })
    window.addEventListener('keyup', handleKey, { capture: true })
    document.addEventListener('visibilitychange', handleVisibility, { capture: true })

    return () => {
      document.body.classList.remove('eps-page-blur')
      window.removeEventListener('keydown', handleKey, { capture: true })
      window.removeEventListener('keyup', handleKey, { capture: true })
      document.removeEventListener('visibilitychange', handleVisibility, { capture: true })
    }
  }, [triggerShield])

  if (!isShieldActive) return null

  return createPortal(
    <div
      className="eps-blur-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) dismissShield() }}
    >
      <div className="eps-blur-card" onClick={(e) => e.stopPropagation()}>
        <div className="eps-blur-icon-wrap">
          <FiShield size={32} />
        </div>
        <h2>Screen Content Protected</h2>
        <p>Screenshots, snipping tools, and screen capture are restricted during this assessment.</p>
        <button type="button" className="eps-btn-continue" onClick={dismissShield} autoFocus>
          OK to Continue
        </button>
      </div>
    </div>,
    document.body
  )
}

function FullscreenLockOverlay() {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const isSecureExamStarted = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true'

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleReenter = async () => {
    try { await document.documentElement.requestFullscreen() } catch {}
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

/**
 * Inner shell that connects the proctoring camera control with AI Vision verification.
 */
function ExamProctoringShellInner({ children }) {
  const navigate = useNavigate()
  const proctoring = useProctoring()
  const [isDisqualified, setIsDisqualified] = useState(false)
  const [aiStatus, setAiStatus] = useState('idle') // idle | scanning | clean | warning | critical
  const [aiReason, setAiReason] = useState('')
  const [riskScore, setRiskScore] = useState(0)
  const [criticalCount, setCriticalCount] = useState(0)
  const [warningMessage, setWarningMessage] = useState('')
  const scanTimerRef = useRef(null)
  const lastScanTimeRef = useRef(0)
  const isSecure = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true'

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
      navigate('/submission-complete?reason=ai_fraud_detected')
    }
  }, [navigate])

  // Capture frame from the camera feed controlled by the proctoring engine
  const captureFrame = useCallback(() => {
    const video = proctoring?.videoElement
    if (!video || video.readyState < 2 || video.videoWidth === 0) return null

    const canvas = document.createElement('canvas')
    canvas.width = Math.min(video.videoWidth, 640)
    canvas.height = Math.min(video.videoHeight, 480)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.6)
  }, [proctoring?.videoElement])

  const showWarning = useCallback((msg) => {
    setWarningMessage(msg)
    setTimeout(() => setWarningMessage(''), 6000)
  }, [])

  // Execute AI vision analysis on the camera frame
  const executeAIScan = useCallback(async () => {
    if (!isSecure || proctoring?.status !== 'active') return
    const now = Date.now()
    if (now - lastScanTimeRef.current < 5000) return // Throttle min 5s between scans
    lastScanTimeRef.current = now

    const frame = captureFrame()
    if (!frame) return

    setAiStatus('scanning')
    try {
      const candidateId = localStorage.getItem('user_id') || localStorage.getItem('user_name') || 'unknown'
      const sessionId = localStorage.getItem('session_id') || 'unknown'
      const result = await analyzeProctorFrame(frame, candidateId, sessionId)
      
      setRiskScore(result.risk_score)
      setAiReason(result.reason)

      if (result.risk_score >= 80) {
        setAiStatus('critical')
        setCriticalCount(prev => {
          const next = prev + 1
          if (next >= MAX_CRITICAL_FLAGS) handleDisqualification()
          return next
        })
        showWarning(`🚨 AI Fraud Alert: ${result.reason}`)
      } else if (result.risk_score >= 40) {
        setAiStatus('warning')
        showWarning(`⚠️ AI Warning: ${result.reason}`)
      } else {
        setAiStatus('clean')
      }
    } catch (err) {
      console.error('[AI Proctor] Scan error:', err)
      setAiStatus('idle')
    }
  }, [isSecure, proctoring?.status, captureFrame, handleDisqualification, showWarning])

  // Trigger immediate AI verification if camera face detector notices anomalies
  useEffect(() => {
    if (!isSecure || proctoring?.status !== 'active') return
    if (proctoring.faceCount === 0 || proctoring.faceCount > 1) {
      executeAIScan()
    }
  }, [isSecure, proctoring?.status, proctoring?.faceCount, executeAIScan])

  // Periodic AI verification loop
  useEffect(() => {
    if (!isSecure || proctoring?.status !== 'active') return

    const initialTimeout = setTimeout(executeAIScan, 4000)
    scanTimerRef.current = setInterval(executeAIScan, AI_SCAN_INTERVAL_MS)

    return () => {
      clearTimeout(initialTimeout)
      if (scanTimerRef.current) clearInterval(scanTimerRef.current)
    }
  }, [isSecure, proctoring?.status, executeAIScan])

  // Time penalty for browser violations
  const lastViolationRef = useRef(null)
  useEffect(() => {
    if (!isSecure || !proctoring?.violation) return
    const v = proctoring.violation
    if (lastViolationRef.current === v.timestamp) return
    lastViolationRef.current = v.timestamp

    const penalize = ['SCREENSHOT_ATTEMPT', 'DEVTOOLS_ATTEMPT', 'APP_SWITCH_ATTEMPT', 'TAB_SWITCH', 'FULLSCREEN_EXIT']
    if (penalize.includes(v.type)) {
      const sessionId = localStorage.getItem('session_id')
      if (sessionId) {
        applyExamPenalty(sessionId, 60, v.type).catch(err => console.error('Penalty sync failed:', err))
      }
      const curr = parseInt(localStorage.getItem('exam_remaining') || '0', 10)
      if (curr > 0) {
        const next = Math.max(0, curr - 60)
        localStorage.setItem('exam_remaining', next.toString())
        window.dispatchEvent(new CustomEvent('exam_time_penalty', { detail: { penaltySeconds: 60, reason: v.type, remainingSeconds: next } }))
      }
      showWarning(`⚠️ ${v.type.replace(/_/g, ' ')} — 60s time penalty`)
      // Trigger AI scan on violation to see candidate screen/action
      executeAIScan()
    }
  }, [isSecure, proctoring?.violation, showWarning, executeAIScan])

  if (isDisqualified) {
    return (
      <div className="eps-lock-overlay">
        <div className="eps-lock-modal eps-disqualified">
          <FiXOctagon size={44} />
          <h2>Exam Terminated</h2>
          <p>Multiple critical fraud indicators detected by AI vision proctoring. Your exam has been auto-submitted.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="eps-shell">
      {/* Top Proctoring Bar with live AI verification indicator */}
      <ProctoringStatus aiStatus={aiStatus} riskScore={riskScore} />

      {/* Main Workspace */}
      {children}

      {/* Draggable Camera Preview using the proctoring engine stream */}
      <CameraPreview aiStatus={aiStatus} aiReason={aiReason} riskScore={riskScore} />

      {/* Overlays */}
      <FullscreenLockOverlay />
      <AntiScreenshotShield />

      {/* AI Fraud Warning Toast */}
      {warningMessage && (
        <div className={`eps-ai-warning ${aiStatus === 'critical' ? 'critical' : 'warning'}`}>
          <FiAlertCircle size={18} />
          <span>{warningMessage}</span>
          <span className="eps-ai-flags">{criticalCount}/{MAX_CRITICAL_FLAGS} flags</span>
        </div>
      )}
    </div>
  )
}

export function ExamProctoringShell({ children }) {
  const sessionId = localStorage.getItem('session_id') || 'default'
  const candidateId = localStorage.getItem('user_id') || localStorage.getItem('user_name') || 'default'

  return (
    <ProctoringProvider testId={sessionId} candidateId={candidateId} enabled={true}>
      <ExamProctoringShellInner>{children}</ExamProctoringShellInner>
    </ProctoringProvider>
  )
}

export default ExamProctoringShell