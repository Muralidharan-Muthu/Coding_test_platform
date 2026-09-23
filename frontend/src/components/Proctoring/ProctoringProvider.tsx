/**
 * ProctoringProvider.jsx
 * 
 * React context provider that manages the ProctoringEngine lifecycle.
 * Wrap your exam page with this to enable proctoring.
 * 
 * Usage:
 * <ProctoringProvider testId="..." candidateId="..." enabled={true}>
 *   <CodingPage />
 * </ProctoringProvider>
 */

import { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { ProctoringEngine } from '../../proctoring/ProctoringEngine'
import { sendProctoringEvents, startProctoringSession, endProctoringSession } from '../../services/proctoringApi'

/** @typedef {import('../../proctoring/ProctoringTypes').ProctoringState} ProctoringState */
/** @typedef {import('../../proctoring/ProctoringTypes').ProctoringEvent} ProctoringEvent */

/**
 * @type {ProctoringState}
 */
const INITIAL_STATE = {
  status: 'idle',
  riskScore: 0,
  riskLevel: 'NORMAL',
  recentEvents: [],
  faceCount: 0,
  headPose: null,
  isFullscreen: false,
  cameraEnabled: false,
  cameraError: null,
  sessionId: null,
}

export const ProctoringContext = createContext(/** @type {ProctoringState & { violation: ProctoringEvent|null, videoElement: HTMLVideoElement|null }} */ ({
  ...INITIAL_STATE,
  violation: null,
  videoElement: null,
}))

/**
 * @param {object} props
 * @param {string} props.testId - Exam/session ID
 * @param {string} props.candidateId - Candidate user ID
 * @param {boolean} props.enabled - Whether proctoring should be active
 * @param {object} [props.config] - Partial config overrides
 * @param {React.ReactNode} props.children
 */
export function ProctoringProvider({ testId, candidateId, enabled, config, children }) {
  const [state, setState] = useState(INITIAL_STATE)
  const [violation, setViolation] = useState(/** @type {ProctoringEvent|null} */ (null))
  const [videoElement, setVideoElement] = useState(/** @type {HTMLVideoElement|null} */ (null))

  const engineRef = useRef(/** @type {ProctoringEngine|null} */ (null))
  const violationTimerRef = useRef(0)
  const sessionStartedRef = useRef(false)

  // Violation banner auto-dismiss
  const showViolation = useCallback((event) => {
    setViolation(event)
    if (violationTimerRef.current) clearTimeout(violationTimerRef.current)
    violationTimerRef.current = window.setTimeout(() => setViolation(null), 4000)
  }, [])

  // Send events function for the engine
  const sendEvents = useCallback(async (events, sessionId, riskScore) => {
    try {
      await sendProctoringEvents(events, sessionId, riskScore)
    } catch (err) {
      console.error('[ProctoringProvider] Failed to send events:', err)
      throw err
    }
  }, [])

  // Start/stop engine based on `enabled` prop
  useEffect(() => {
    if (!enabled) {
      // Stop engine if running
      if (engineRef.current) {
        const engine = engineRef.current
        const currentState = engine.getState()
        engineRef.current = null
        sessionStartedRef.current = false

        engine.stop().then(() => {
          // End session on backend
          if (currentState.sessionId) {
            endProctoringSession(
              currentState.sessionId,
              currentState.riskScore,
              currentState.riskLevel
            ).catch(err => console.error('[ProctoringProvider] Failed to end session:', err))
          }
        })

        setState(INITIAL_STATE)
        setVideoElement(null)
        setViolation(null)
      }
      return
    }

    // Don't start if already running
    if (engineRef.current) return

    const engine = new ProctoringEngine(config || {}, sendEvents)

    engine.onStateChange((newState) => {
      setState(newState)
    })

    engine.onViolation((event) => {
      showViolation(event)

      // Play alert audio
      try {
        const audio = new Audio('https://www.soundjay.com/buttons/sounds/beep-01a.mp3')
        audio.play().catch(() => {})
      } catch {
        // Audio playback can fail silently
      }
    })

    engineRef.current = engine

    const initEngine = async () => {
      try {
        await engine.start()
        setVideoElement(engine.getVideoElement())

        // Start backend session
        if (!sessionStartedRef.current) {
          sessionStartedRef.current = true
          try {
            const response = await startProctoringSession(testId, candidateId)
            engine.setSessionId(response.sessionId)
          } catch (err) {
            console.error('[ProctoringProvider] Failed to start backend session:', err)
            // Engine continues working — events will be queued and flushed when session ID is set
          }
        }
      } catch (err) {
        console.error('[ProctoringProvider] Failed to start engine:', err)
      }
    }

    initEngine()

    // Cleanup on unmount
    return () => {
      if (engineRef.current === engine) {
        const currentState = engine.getState()
        engineRef.current = null
        sessionStartedRef.current = false

        engine.stop().then(() => {
          if (currentState.sessionId) {
            endProctoringSession(
              currentState.sessionId,
              currentState.riskScore,
              currentState.riskLevel
            ).catch(() => {})
          }
        })
      }
    }
  }, [enabled, testId, candidateId, config, sendEvents, showViolation])

  // Cleanup violation timer on unmount
  useEffect(() => {
    return () => {
      if (violationTimerRef.current) clearTimeout(violationTimerRef.current)
    }
  }, [])

  const contextValue = {
    ...state,
    violation,
    videoElement,
  }

  return (
    <ProctoringContext.Provider value={contextValue}>
      {children}
    </ProctoringContext.Provider>
  )
}
