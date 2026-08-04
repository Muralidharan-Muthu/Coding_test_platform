import '@mediapipe/face_mesh'
import Editor from '@monaco-editor/react'
import api, { getExamStatus, getProblem, getPythonProblems, getSqlProblems, previewSubmitCode, previewSubmitSql, runCode, runSql, submitCode, submitExam, submitSql } from '../api'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'
import * as tf from '@tensorflow/tfjs'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Webcam from 'react-webcam'
import ThemeToggle from '../components/ui/ThemeToggle'
import { clearCandidateSession, clearHrSession } from '../utils/sessionStorage'
import './CodingPage.css'

const PROCTORING_EXAM_ID = 1
const PROCTORING_SCAN_INTERVAL_MS = 2000
const VIOLATION_COOLDOWN_MS = 5000
const VIOLATION_ALERT_MS = 4000
const VIOLATION_AUDIO_URL = 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3'
const EXAM_SECURE_MODE_KEY = 'exam_secure_mode_started'
const DEFAULT_CAMERA_POSITION = { x: 16, y: 16 }
const SUSTAINED_HEAD_TURN_MS = 5000
const EXTREME_HEAD_TURN_RATIO_MIN = 0.2
const EXTREME_HEAD_TURN_RATIO_MAX = 5
const MEDIAPIPE_FACE_MESH_SOLUTION_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
const NOSE_TIP_INDEX = 1
const LEFT_FACE_EDGE_INDEX = 234
const RIGHT_FACE_EDGE_INDEX = 454

const examGateContainerStyle = {
  minHeight: 'calc(100vh - 52px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px 20px',
  background: 'radial-gradient(circle at top, rgba(34, 197, 94, 0.18), transparent 45%), var(--color-bg)',
}

const examGateCardStyle = {
  width: 'min(560px, 100%)',
  padding: '32px',
  borderRadius: '20px',
  border: '1px solid rgba(34, 197, 94, 0.22)',
  background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(15, 23, 42, 0.88))',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
  color: '#f8fafc',
  textAlign: 'center',
}

const examGateButtonStyle = {
  marginTop: '24px',
  padding: '14px 28px',
  border: 'none',
  borderRadius: '999px',
  background: 'linear-gradient(135deg, #22c55e, #15803d)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 14px 32px rgba(21, 128, 61, 0.28)',
}

const examGateErrorStyle = {
  marginTop: '18px',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'rgba(127, 29, 29, 0.9)',
  color: '#fee2e2',
  fontSize: '13px',
  fontWeight: 600,
}

const violationModalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 200,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'rgba(15, 23, 42, 0.45)',
}

const violationModalStyle = {
  width: 'min(560px, 100%)',
  borderRadius: '18px',
  padding: '24px 26px',
  background: 'linear-gradient(180deg, #dc2626, #991b1b)',
  color: '#ffffff',
  boxShadow: '0 24px 80px rgba(127, 29, 29, 0.5)',
  textAlign: 'center',
}

const toastStyle = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  zIndex: 9999,
  padding: '14px 20px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, #dc2626, #991b1b)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  boxShadow: '0 8px 32px rgba(127, 29, 29, 0.5)',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  maxWidth: '360px',
  animation: 'slideInRight 0.3s ease-out',
}

const recordingIndicatorStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  position: 'fixed',
  top: '16px',
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1000,
  padding: '8px 16px',
  borderRadius: '999px',
  background: 'rgba(15, 23, 42, 0.9)',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
}

const pulsatingDotStyle = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: '#22c55e',
  boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
  animation: 'pulse 2s infinite',
}

const webcamFeedStyle = {
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
}

const VIOLATION_ALERT_COPY = {
  head_turn: {
    title: 'Face Turn Detected',
    guidance: 'Please keep your face oriented toward the exam screen.',
  },
  external_screen: {
    title: 'External Screen Suspected',
    guidance: 'Keep your eyes on the primary exam window only.',
  },
}

const getKeypoint = (keypoints, index) => keypoints?.[index] || null
const hasKeypointCoordinates = (point) => Boolean(
  point
  && Number.isFinite(point.x)
  && Number.isFinite(point.y)
)

const getViolationAlertContent = (violation) => {
  if (!violation) return null

  const alertCopy = VIOLATION_ALERT_COPY[violation.type]
  if (!alertCopy) {
    return {
      title: 'Proctoring Violation',
      message: violation.message,
      guidance: '',
    }
  }

  return {
    title: alertCopy.title,
    message: violation.message,
    guidance: alertCopy.guidance,
  }
}

const getHeadTurnRatio = (keypoints) => {
  const nose = getKeypoint(keypoints, NOSE_TIP_INDEX)
  const leftEdge = getKeypoint(keypoints, LEFT_FACE_EDGE_INDEX)
  const rightEdge = getKeypoint(keypoints, RIGHT_FACE_EDGE_INDEX)

  if (
    !hasKeypointCoordinates(nose)
    || !hasKeypointCoordinates(leftEdge)
    || !hasKeypointCoordinates(rightEdge)
  )
  {
    return null
  }

  const leftDistance = nose.x - leftEdge.x
  const rightDistance = rightEdge.x - nose.x
  if (Math.abs(rightDistance) < 0.0001) return null

  return leftDistance / rightDistance
}

const getExtremeHeadTurnDirection = (headTurnRatio) => {
  if (!Number.isFinite(headTurnRatio)) return null
  if (headTurnRatio <= EXTREME_HEAD_TURN_RATIO_MIN) return 'extreme'
  if (headTurnRatio >= EXTREME_HEAD_TURN_RATIO_MAX) return 'extreme'
  return null
}

function CodingPage() {
  const { problemId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const isHrPreviewMode = Boolean(localStorage.getItem('hr_logged_in'))
    && new URLSearchParams(location.search).get('mode') === 'hr-preview'
  const buildCodingPath = (id) => (
    isHrPreviewMode ? `/coding/${id}?mode=hr-preview` : `/coding/${id}`
  )

  const [problem, setProblem] = useState(null)
  const [code, setCode] = useState('')
  const [starterCode, setStarterCode] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [output, setOutput] = useState('')
  const [outputType, setOutputType] = useState('text')
  const [tableHeaders, setTableHeaders] = useState([])
  const [tableRows, setTableRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitResult, setSubmitResult] = useState(null)
  const [userName, setUserName] = useState('')
  const [showInputRequired, setShowInputRequired] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [isExamMode, setIsExamMode] = useState(false)
  const [isExamActive, setIsExamActive] = useState(() => {
    return localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' && Boolean(document.fullscreenElement)
  })
  const [sqlDialect, setSqlDialect] = useState('sql')
  const [problemList, setProblemList] = useState([])
  const [currentProblemIndex, setCurrentProblemIndex] = useState(-1)
  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)
  const webcamRef = useRef(null)
  const proctoringFrameCanvasRef = useRef(null)
  const proctoringBusyRef = useRef(false)
  const faceDetectorRef = useRef(null)
  const faceDetectorLoadPromiseRef = useRef(null)
  const headTurnStateRef = useRef({
    direction: null,
    startedAt: 0,
  })
  const violationTimeoutRef = useRef(null)
  const lastViolationRef = useRef({})
  const [proctoringReady, setProctoringReady] = useState(false)
  const [webcamReady, setWebcamReady] = useState(false)
  const [proctoringError, setProctoringError] = useState('')
  const [violationBanner, setViolationBanner] = useState(null)
  const [examGateError, setExamGateError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const toastTimeoutRef = useRef(null)
  const [cameraPosition, setCameraPosition] = useState(DEFAULT_CAMERA_POSITION)
  const dragStateRef = useRef(null)

  const handleAutoSubmit = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    const answersList = Object.entries(answers).map(([pid, data]) => ({
      problem_id: pid,
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

  const logViolation = useCallback((type, message) => {
    if (!isExamMode) return

    // Show toast notification
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage(message)
    setShowToast(true)
    toastTimeoutRef.current = setTimeout(() => setShowToast(false), 3500)

    setViolationBanner({ type, message })
    if (violationTimeoutRef.current) clearTimeout(violationTimeoutRef.current)
    violationTimeoutRef.current = setTimeout(() => setViolationBanner(null), VIOLATION_ALERT_MS)

    const audio = new Audio(VIOLATION_AUDIO_URL)
    const playback = audio.play()
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {})
    }

    const now = Date.now()
    const lastLogged = lastViolationRef.current[type] || 0
    if (now - lastLogged < VIOLATION_COOLDOWN_MS) return
    lastViolationRef.current[type] = now

    const sessionId = localStorage.getItem('session_id') || ''
    const candidateId = localStorage.getItem('user_id') || ''

    fetch(`/api/exam/${PROCTORING_EXAM_ID}/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId,
        'X-Candidate-Id': candidateId,
      },
      keepalive: true,
      body: JSON.stringify({ violation_type: type, message })
    }).then((response) => {
      if (!response.ok) {
        throw new Error(`Log failed: ${response.status}`)
      }
    }).catch((err) => {
      console.error('Failed to log proctoring violation', err)
    })
  }, [isExamMode])

  const handleReturnToExamHub = useCallback(() => {
    navigate('/test-structure')
  }, [navigate])

  const startCameraDrag = useCallback((event) => {
    const isTouchEvent = 'touches' in event
    const point = isTouchEvent ? event.touches[0] : event
    dragStateRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      originX: cameraPosition.x,
      originY: cameraPosition.y,
    }
  }, [cameraPosition.x, cameraPosition.y])

  const handleWebcamReady = useCallback(() => {
    setWebcamReady(true)
    setProctoringError('')
  }, [])

  const handleWebcamError = useCallback((err) => {
    console.error('Webcam access failed', err)
    setWebcamReady(false)
    setProctoringError('Webcam access is blocked. Enable camera permissions to continue the exam.')
    logViolation('webcam_unavailable', 'Webcam access failed during the exam.')
  }, [logViolation])

  const resetAdaptiveTracking = useCallback(() => {
    headTurnStateRef.current = {
      direction: null,
      startedAt: 0,
    }
  }, [])

  const initializeFaceDetector = useCallback(async () => {
    if (faceDetectorRef.current) return faceDetectorRef.current
    if (faceDetectorLoadPromiseRef.current) return faceDetectorLoadPromiseRef.current

    const detectorConfig = {
      runtime: 'mediapipe',
      refineLandmarks: true,
      maxFaces: 2,
      solutionPath: MEDIAPIPE_FACE_MESH_SOLUTION_PATH,
    }

    const detectorPromise = faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      detectorConfig
    ).then((detector) => {
      faceDetectorRef.current = detector
      faceDetectorLoadPromiseRef.current = Promise.resolve(detector)
      return detector
    }).catch((err) => {
      faceDetectorLoadPromiseRef.current = null
      throw err
    })

    faceDetectorLoadPromiseRef.current = detectorPromise
    return detectorPromise
  }, [])

  const getProctoringFrameSource = useCallback(() => {
    const video = webcamRef.current?.video
    if (!video || video.readyState !== 4) return null

    const frameWidth = video.videoWidth || video.width || 0
    const frameHeight = video.videoHeight || video.height || 0
    if (!frameWidth || !frameHeight) return null

    let canvas = proctoringFrameCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      proctoringFrameCanvasRef.current = canvas
    }

    if (canvas.width !== frameWidth) canvas.width = frameWidth
    if (canvas.height !== frameHeight) canvas.height = frameHeight

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return null

    context.drawImage(video, 0, 0, frameWidth, frameHeight)
    return canvas
  }, [])

  const runProctoringAI = useCallback(async () => {
    if (document.hidden) return

    const video = webcamRef.current?.video
    if (!webcamReady || !video || video.readyState !== 4) return

    const frameSource = getProctoringFrameSource()
    if (!frameSource) return

    const detector = faceDetectorRef.current || await initializeFaceDetector()
    if (!detector) return

    const faces = await detector.estimateFaces(frameSource, { flipHorizontal: true, staticImageMode: false })

    if (!faces || faces.length === 0) {
      resetAdaptiveTracking()
      logViolation('face_missing', 'No face detected. Please stay in view.')
      return
    }

    if (faces.length > 1) {
      resetAdaptiveTracking()
      logViolation('multiple_faces', 'Multiple faces detected. Only one candidate is allowed.')
      return
    }

    const keypoints = faces[0]?.keypoints || []
    const headTurnRatio = getHeadTurnRatio(keypoints)
    const headTurnDirection = getExtremeHeadTurnDirection(headTurnRatio)

    if (!headTurnDirection) {
      resetAdaptiveTracking()
      return
    }

    const now = Date.now()
    const trackingState = headTurnStateRef.current

    if (trackingState.direction !== headTurnDirection) {
      headTurnStateRef.current = {
        direction: headTurnDirection,
        startedAt: now,
      }
      return
    }

    if (now - trackingState.startedAt >= SUSTAINED_HEAD_TURN_MS) {
      logViolation('head_turn', 'Candidate turned completely away from the screen for more than 5 seconds.')
      headTurnStateRef.current = {
        direction: headTurnDirection,
        startedAt: now,
      }
    }
  }, [getProctoringFrameSource, initializeFaceDetector, logViolation, resetAdaptiveTracking, webcamReady])

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const hrName = localStorage.getItem('hr_name')
    if (!name && !hrName) { navigate('/'); return }
    setUserName(name || hrName)
    checkExamStatus()
    loadProblem()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [problemId, navigate])

  useEffect(() => {
    if (!isExamMode) {
      setIsExamActive(false)
      return
    }
    const secureModeActive = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' && Boolean(document.fullscreenElement)
    setIsExamActive(secureModeActive)
  }, [isExamMode])

  useEffect(() => {
    return () => {
      if (violationTimeoutRef.current) clearTimeout(violationTimeoutRef.current)
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isExamMode) return
    const handleFullscreenChange = () => {
      const fullscreenActive = Boolean(document.fullscreenElement)
      if (fullscreenActive) {
        localStorage.setItem(EXAM_SECURE_MODE_KEY, 'true')
        setIsExamActive(true)
        setExamGateError('')
        return
      }

      if (isExamActive) {
        localStorage.removeItem(EXAM_SECURE_MODE_KEY)
        setIsExamActive(false)
        setWebcamReady(false)
        setExamGateError('Fullscreen mode was exited. Return to the assessment hub to re-enable secure exam mode.')
        logViolation('fullscreen_exit', 'Fullscreen mode was exited during the exam.')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isExamMode, isExamActive, logViolation])

  useEffect(() => {
    if (isExamMode && remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); handleAutoSubmit(); return 0 }
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isExamMode, remainingTime, handleAutoSubmit])

  useEffect(() => {
    if (!isExamMode || !isExamActive) return
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch', 'Tab switch detected. Please stay on the exam page.')
      }
    }
    const handleWindowBlur = () => {
      logViolation('tab_switch', 'Window lost focus. Please return to the exam window.')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
    }
  }, [isExamMode, isExamActive, logViolation])

  useEffect(() => {
    if (!isExamMode || !isExamActive) return

    const preventAction = (event, type, message) => {
      event.preventDefault()
      event.stopPropagation()
      logViolation(type, message)
    }

    const handleKeyDown = (event) => {
      const key = event.key?.toLowerCase()
      const isModifierPressed = event.ctrlKey || event.metaKey
      if (!isModifierPressed) return

      if (key === 'c') {
        preventAction(event, 'copy_attempt', 'Copy is disabled during the exam.')
      } else if (key === 'x') {
        preventAction(event, 'cut_attempt', 'Cut is disabled during the exam.')
      } else if (key === 'v') {
        preventAction(event, 'paste_attempt', 'Paste is disabled during the exam.')
      }
    }

    const handleCopy = (event) => preventAction(event, 'copy_attempt', 'Copy is disabled during the exam.')
    const handleCut = (event) => preventAction(event, 'cut_attempt', 'Cut is disabled during the exam.')
    const handlePaste = (event) => preventAction(event, 'paste_attempt', 'Paste is disabled during the exam.')
    const handleContextMenu = (event) => preventAction(event, 'context_menu', 'Right-click is disabled during the exam.')
    const handleDragStart = (event) => preventAction(event, 'drag_attempt', 'Dragging content is disabled during the exam.')
    const handleDrop = (event) => preventAction(event, 'drop_attempt', 'Dropping content is disabled during the exam.')

    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('copy', handleCopy, true)
    document.addEventListener('cut', handleCut, true)
    document.addEventListener('paste', handlePaste, true)
    document.addEventListener('contextmenu', handleContextMenu, true)
    document.addEventListener('dragstart', handleDragStart, true)
    document.addEventListener('drop', handleDrop, true)

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('copy', handleCopy, true)
      document.removeEventListener('cut', handleCut, true)
      document.removeEventListener('paste', handlePaste, true)
      document.removeEventListener('contextmenu', handleContextMenu, true)
      document.removeEventListener('dragstart', handleDragStart, true)
      document.removeEventListener('drop', handleDrop, true)
    }
  }, [isExamMode, isExamActive, logViolation])

  useEffect(() => {
    if (!isExamMode || !isExamActive) return

    const clampCameraPosition = (nextX, nextY) => {
      const maxX = Math.max(16, window.innerWidth - 176)
      const maxY = Math.max(16, window.innerHeight - 136)
      return {
        x: Math.min(Math.max(16, nextX), maxX),
        y: Math.min(Math.max(16, nextY), maxY),
      }
    }

    const handlePointerMove = (event) => {
      if (!dragStateRef.current) return
      const isTouchEvent = 'touches' in event
      const point = isTouchEvent ? event.touches[0] : event
      const nextX = dragStateRef.current.originX + (point.clientX - dragStateRef.current.startX)
      const nextY = dragStateRef.current.originY + (point.clientY - dragStateRef.current.startY)
      setCameraPosition(clampCameraPosition(nextX, nextY))
    }

    const stopDragging = () => {
      dragStateRef.current = null
    }

    const handleResize = () => {
      setCameraPosition((prev) => clampCameraPosition(prev.x, prev.y))
    }

    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', stopDragging)
    window.addEventListener('touchmove', handlePointerMove, { passive: true })
    window.addEventListener('touchend', stopDragging)
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', stopDragging)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('touchend', stopDragging)
      window.removeEventListener('resize', handleResize)
    }
  }, [isExamMode, isExamActive])

  useEffect(() => {
    if (isExamMode && problem && code !== starterCode) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      autoSaveRef.current = setTimeout(() => {
        const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
        answers[problemId] = { code, language: problem.language }
        localStorage.setItem('exam_answers', JSON.stringify(answers))
      }, 500)
    }
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [code, isExamMode, problemId, problem, starterCode])

  useEffect(() => {
    if (!isExamMode || !isExamActive) return
    let cancelled = false
    const loadModels = async () => {
      setProctoringReady(false)
      setProctoringError('')
      try {
        if (faceDetectorRef.current) {
          setProctoringReady(true)
          return
        }
        try {
          await tf.setBackend('webgl')
        } catch (err) {
          console.warn('WebGL backend not available, falling back to default backend', err)
        }
        await tf.ready()
        const detector = await initializeFaceDetector()
        if (cancelled) return
        faceDetectorRef.current = detector
        setProctoringReady(true)
      } catch (err) {
        console.error('Failed to initialize proctoring models', err)
        setProctoringError('AI proctoring could not start. Refresh the page or check browser compatibility.')
      }
    }
    loadModels()
    return () => {
      cancelled = true
    }
  }, [initializeFaceDetector, isExamMode, isExamActive])

  useEffect(() => {
    if (!isExamMode || !isExamActive) return
    const intervalId = setInterval(async () => {
      if (proctoringBusyRef.current) return
      proctoringBusyRef.current = true
      try {
        await runProctoringAI()
      } catch (err) {
        console.error('Proctoring detection failed', err)
      } finally {
        proctoringBusyRef.current = false
      }
    }, PROCTORING_SCAN_INTERVAL_MS)
    return () => clearInterval(intervalId)
  }, [isExamMode, isExamActive, runProctoringAI])

  useEffect(() => {
    if (isExamMode && isExamActive) return
    setWebcamReady(false)
    setProctoringReady(false)
    setProctoringError('')
    setCameraPosition(DEFAULT_CAMERA_POSITION)
    dragStateRef.current = null
    resetAdaptiveTracking()
    if (!isExamMode) {
      setViolationBanner(null)
      setExamGateError('')
    }
  }, [isExamMode, isExamActive, resetAdaptiveTracking])

  const checkExamStatus = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')
      const status = await getExamStatus(sessionId)
      if (status.status === 'active') {
        setIsExamMode(true)
        setRemainingTime(status.remaining_seconds)
        const secureModeActive = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' && Boolean(document.fullscreenElement)
        setIsExamActive(secureModeActive)
      }
      else if (status.status === 'expired') { handleAutoSubmit() }
    } catch (err) {
      console.log('Not in exam mode')
    }
  }

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'global-timer critical'
    if (remainingTime <= 900) return 'global-timer warning'
    return 'global-timer'
  }

  const loadProblem = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')

      // Guest bypass — inject mock problem data based on problemId
      if (sessionId === 'guest-session') {
        const MOCK_PROBLEMS = {
          'py-1': {
            id: 'py-1',
            title: 'Two Sum',
            language: 'python',
            difficulty: 'Easy',
            marks: 10,
            time_limit: 20,
            statement: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.\n\nYou may assume each input has exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]  (because nums[0] + nums[1] = 2 + 7 = 9)',
            input_format: 'Line 1: Space-separated integers (the array)\nLine 2: The target integer',
            output_format: 'A list of two indices [i, j] such that nums[i] + nums[j] == target',
            starter_code: 'def two_sum(nums, target):\n    # Write your solution here\n    pass\n\n# Read input\nnums = list(map(int, input().split()))\ntarget = int(input())\nprint(two_sum(nums, target))',
            sample_input: '2 7 11 15\n9',
            sample_output: '[0, 1]',
            test_cases: [{ input: '2 7 11 15\n9', expected_output: '[0, 1]' }],
          },
          'py-2': {
            id: 'py-2',
            title: 'Reverse a String',
            language: 'python',
            difficulty: 'Easy',
            marks: 10,
            time_limit: 20,
            statement: 'Write a function that reverses a string and returns it.\n\nExample:\nInput: "hello"\nOutput: "olleh"',
            input_format: 'A single line containing the string to reverse',
            output_format: 'The reversed string',
            starter_code: 'def reverse_string(s):\n    # Write your solution here\n    pass\n\ns = input()\nprint(reverse_string(s))',
            sample_input: 'hello',
            sample_output: 'olleh',
            test_cases: [{ input: 'hello', expected_output: 'olleh' }],
          },
          'py-3': {
            id: 'py-3',
            title: 'Fibonacci Series',
            language: 'python',
            difficulty: 'Medium',
            marks: 20,
            time_limit: 30,
            statement: 'Given a number n, return a list of the first n Fibonacci numbers.\n\nThe Fibonacci sequence starts with 0 and 1, and each subsequent number is the sum of the two preceding ones.\n\nExample:\nInput: 7\nOutput: [0, 1, 1, 2, 3, 5, 8]',
            input_format: 'A single integer n (1 ≤ n ≤ 50)',
            output_format: 'A list of the first n Fibonacci numbers',
            starter_code: 'def fibonacci(n):\n    # Write your solution here\n    pass\n\nn = int(input())\nprint(fibonacci(n))',
            sample_input: '7',
            sample_output: '[0, 1, 1, 2, 3, 5, 8]',
            test_cases: [{ input: '7', expected_output: '[0, 1, 1, 2, 3, 5, 8]' }],
          },
          'sql-1': {
            id: 'sql-1',
            title: 'Find All Customers',
            language: 'sql',
            difficulty: 'Easy',
            marks: 10,
            time_limit: 20,
            statement: 'Write a SQL query to fetch all records from the customers table.\n\nReturn all columns for every row in the table.',
            input_format: 'Table: customers\nColumns: id (INT), name (VARCHAR), email (VARCHAR), city (VARCHAR)',
            output_format: 'All rows and columns from the customers table',
            starter_code: '-- Write your SQL query here\nSELECT * FROM customers;',
            sample_input: '',
            sample_output: 'All rows from customers table',
            test_cases: [],
          },
          'sql-2': {
            id: 'sql-2',
            title: 'Sales Report Query',
            language: 'sql',
            difficulty: 'Medium',
            marks: 20,
            time_limit: 30,
            statement: 'Write a SQL query to get total sales per product, ordered by total sales in descending order.\n\nGroup by product_id and calculate the sum of the amount column.',
            input_format: 'Table: sales\nColumns: id (INT), product_id (INT), amount (DECIMAL), sale_date (DATE)',
            output_format: 'product_id and total_sales, ordered by total_sales DESC',
            starter_code: '-- Write your SQL query here\nSELECT product_id, SUM(amount) as total_sales\nFROM sales\nGROUP BY product_id\nORDER BY total_sales DESC;',
            sample_input: '',
            sample_output: 'Product sales summary',
            test_cases: [],
          },
        }

        const mockProblem = MOCK_PROBLEMS[problemId] || {
          id: problemId,
          title: `Problem ${problemId}`,
          language: problemId.startsWith('sql') ? 'sql' : 'python',
          difficulty: 'Medium',
          marks: 10,
          time_limit: 30,
          statement: 'Solve this problem.',
          input_format: '',
          output_format: '',
          starter_code: '# Write your solution here\n',
          sample_input: '',
          sample_output: '',
          test_cases: [],
        }

        const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
        setProblem(mockProblem)
        setCode(answers[problemId] ? answers[problemId].code : mockProblem.starter_code)
        setStarterCode(mockProblem.starter_code)
        if (mockProblem.language === 'python') setCustomInput(mockProblem.sample_input)

        // Set mock problem list for navigation
        const mockList = mockProblem.language === 'python'
          ? [
              { id: 'py-1', title: 'Two Sum', difficulty: 'Easy', marks: 10 },
              { id: 'py-2', title: 'Reverse a String', difficulty: 'Easy', marks: 10 },
              { id: 'py-3', title: 'Fibonacci Series', difficulty: 'Medium', marks: 20 },
            ]
          : [
              { id: 'sql-1', title: 'Find All Customers', difficulty: 'Easy', marks: 10 },
              { id: 'sql-2', title: 'Sales Report Query', difficulty: 'Medium', marks: 20 },
            ]
        setProblemList(mockList)
        setCurrentProblemIndex(mockList.findIndex(p => p.id === problemId))
        return
      }

      const data = await getProblem(problemId)
      setProblem(data)
      const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
      setCode(answers[problemId] ? answers[problemId].code : data.starter_code)
      setStarterCode(data.starter_code)
      if (data.language === 'python') setCustomInput(data.sample_input)
      await loadProblemList(data.language)
    } catch (err) {
      setError('Failed to load problem')
      console.error(err)
    }
  }

  const loadProblemList = async (language) => {
    try {
      let problems
      if (isHrPreviewMode) {
        const response = await api.get('/hr/problems')
        problems = (response.data || []).filter((item) => item.language === language)
      } else {
        problems = language === 'python' ? await getPythonProblems() : await getSqlProblems()
      }
      setProblemList(problems)
      setCurrentProblemIndex(problems.findIndex(p => p.id === problemId))
    } catch (err) {
      console.error('Failed to load problem list:', err)
    }
  }

  const handleBack = () => {
    if (isHrPreviewMode) {
      navigate('/hr/questions', {
        state: { activeTab: problem?.language === 'sql' ? 'sql' : 'python' }
      })
    }
    else if (problem?.language === 'sql') navigate('/problems/sql')
    else navigate('/problems/python')
  }

  const handleRun = async () => {
    setLoading(true); setOutput(''); setError(''); setSubmitResult(null); setShowInputRequired(false)
    try {
      if (problem.language === 'sql') {
        const result = await runSql(problemId, code, sqlDialect)
        if (result.status === 'success') {
          setOutputType('table')
          setTableHeaders(result.columns && result.columns.length > 0 ? result.columns : [])
          setTableRows(result.rows || [])
        } else {
          setOutputType('text'); setOutput(result.error || 'Unknown error')
        }
        return
      }
      const result = await runCode(code, customInput)
      setOutputType('text')
      if (result.error === 'INPUT_REQUIRED') { setShowInputRequired(true); setOutput(''); return }
      if (result.status === 'success') {
        setOutput(result.stdout || '(no output)')
        if (result.stderr) setOutput(prev => prev + '\n\nWarnings:\n' + result.stderr)
      } else {
        setOutput(result.stderr || result.stdout || 'Unknown error')
      }
    } catch (err) {
      setError('Failed to run code: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
      setTimeout(() => {
        const el = document.querySelector('.output-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
    }
  }

  const handleUseSampleInput = () => {
    setCustomInput(problem.sample_input); setShowInputRequired(false)
    setTimeout(() => handleRun(), 100)
  }

  const handleSubmit = async () => {
    const sessionId = localStorage.getItem('session_id')
    if (!problem) { setError('Problem not loaded. Please refresh the page.'); return }
    const isHRPreview = isHrPreviewMode
    if (!sessionId && !isHRPreview) { navigate('/'); return }
    setLoading(true); setOutput(''); setError(''); setSubmitResult(null); setShowInputRequired(false)
    try {
      let result
      if (problem.language === 'sql') {
        result = isHRPreview
          ? await previewSubmitSql(problemId, code, sqlDialect)
          : await submitSql(sessionId, problemId, code, remainingTime > 0 ? 9000 - remainingTime : 0, sqlDialect)
      } else {
        result = isHRPreview
          ? await previewSubmitCode(problemId, code)
          : await submitCode(sessionId, problemId, code, remainingTime > 0 ? 9000 - remainingTime : 0)
      }
      setSubmitResult(result); setOutputType('submit'); setOutput(''); setTableHeaders([]); setTableRows([])
      setTimeout(() => {
        const el = document.querySelector('.output-section')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, 100)
      if (isExamMode) {
        const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
        answers[problemId] = { code, language: problem.language }
        localStorage.setItem('exam_answers', JSON.stringify(answers))
      }
    } catch (err) {
      setError('Failed to submit code: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => { setCode(starterCode); setOutput(''); setError(''); setSubmitResult(null) }

  const handlePrevious = () => {
    if (currentProblemIndex > 0) navigate(buildCodingPath(problemList[currentProblemIndex - 1].id))
  }

  const handleNext = () => {
    if (currentProblemIndex < problemList.length - 1) navigate(buildCodingPath(problemList[currentProblemIndex + 1].id))
  }

  const handleLogout = () => {
    localStorage.removeItem(EXAM_SECURE_MODE_KEY)
    if (isHrPreviewMode) {
      clearHrSession()
      navigate('/hr')
      return
    }

    clearCandidateSession()
    navigate('/')
  }

  const parseSqlInputFormat = (inputFormat, schemaSql, seedSql, tables) => {
    // NEWEST FORMAT: Direct 'tables' array from API
    if (tables && Array.isArray(tables) && tables.length > 0) {
      const firstTable = tables[0]
      return {
        tableName: firstTable.table_name || '',
        columns: firstTable.columns || [],
        rows: firstTable.rows || []
      }
    }
    
    // NEW FORMAT: input_format is an object with tables array
    if (inputFormat && typeof inputFormat === 'object' && inputFormat.tables) {
      const tablesArray = inputFormat.tables
      if (tablesArray.length > 0) {
        const firstTable = tablesArray[0]
        return {
          tableName: firstTable.table_name || '',
          columns: firstTable.columns || [],
          rows: firstTable.rows || []
        }
      }
    }
    
    // OLD FORMAT: Parse from schema_sql
    if (schemaSql) {
      const match = schemaSql.trim().match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z_][\w]*)[`"']?\s*\((.*)\)/is)
      if (match) {
        const tableName = match[1]
        const columnDefs = match[2].split(',').map(def => {
          const parts = def.trim().split(/\s+/)
          return {
            name: parts[0],
            type: parts[1] || ''
          }
        }).filter(col => col.name && !['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT'].some(k => col.name.toUpperCase().startsWith(k)))
        
        return { tableName, columns: columnDefs }
      }
    }
    
    // OLD FORMAT: Fallback to parsing input_format string
    if (inputFormat && typeof inputFormat === 'string') {
      const match = inputFormat.match(/^([a-zA-Z_][\w]*)\s*\((.*)\)$/)
      if (match) {
        const tableName = match[1]
        const rawColumns = match[2].split(',')
          .map(item => item.trim())
          .filter(Boolean)
          .map(item => {
            const [name, ...typeParts] = item.split(/\s+/)
            return { name: name || '', type: typeParts.join(' ') || '' }
          })
          .filter(col => col.name)
        return { tableName, columns: rawColumns }
      }
    }
    
    return { tableName: '', columns: [], rows: [] }
  }

  const normalizeSqlTables = (problem) => {
    const directTables = Array.isArray(problem?.tables) ? problem.tables : []
    const inputFormatTables = (problem?.input_format && typeof problem.input_format === 'object' && Array.isArray(problem.input_format.tables))
      ? problem.input_format.tables
      : []
    const authoredTables = directTables.length > 0 ? directTables : inputFormatTables

    return authoredTables
      .map((table, index) => ({
        key: `${table?.table_name || 'table'}-${index}`,
        tableName: table?.table_name || `table_${index + 1}`,
        columns: Array.isArray(table?.columns) ? table.columns.map(col => col?.name || col).filter(Boolean) : [],
        rows: Array.isArray(table?.rows) ? table.rows : [],
      }))
      .filter(table => table.columns.length > 0 || table.rows.length > 0)
  }

  const parsePipeTable = (tableText) => {
    if (!tableText) return []
    return tableText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split('|').map((cell) => cell.trim()))
  }

  const getFallbackSqlPreview = (inputFormatText) => {
    const text = (inputFormatText || '').toLowerCase()
    if (text.includes('employees')) {
      return {
        columns: ['id', 'name', 'department', 'salary'],
        rows: [
          [1, 'Alice', 'HR', 50000],
          [2, 'Bob', 'IT', 70000],
          [3, 'Charlie', 'IT', 80000],
          [4, 'Diana', 'HR', 55000],
        ]
      }
    }
    return { columns: [], rows: [] }
  }

  const showExamGate = isExamMode && !isExamActive
  const showExamWorkspace = !isExamMode || isExamActive

  if (!problem) {
    return (
      <div className="loading">
        <span className="loading-spinner" aria-hidden="true"></span>
        Loading problem...
      </div>
    )
  }

  const violationAlertContent = getViolationAlertContent(violationBanner)

  return (
    <div className="coding-page">
      {/* Recording Indicator - Top Center */}
      {isExamMode && isExamActive && (
        <div style={recordingIndicatorStyle}>
          <div style={pulsatingDotStyle}></div>
          <span style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600 }}>Proctoring Active</span>
        </div>
      )}

      <header className="header">
        <div className="header-left">
          {(isExamMode || isHrPreviewMode) && (
            <button onClick={handleBack} className="btn-back-coding" aria-label="Go back">← Back</button>
          )}
          <h1 title={problem.title}>{problem.title}</h1>
        </div>
        <div className="user-info">
          {isExamMode && (
            <div className={getTimerClass()} aria-label={`Time remaining: ${formatTime(remainingTime)}`}>
              <span className="timer-icon" aria-hidden="true">⏱</span>
              <span className="timer-value">{formatTime(remainingTime)}</span>
            </div>
          )}
          <ThemeToggle />
          <span className="user-display">{userName}</span>
          {!isExamMode && (
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {showToast && (
        <div style={toastStyle} role="alert" aria-live="polite">
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {isExamMode && isExamActive && (
        <div
          className="proctoring-overlay"
          aria-live="polite"
          style={{ left: `${cameraPosition.x}px`, top: `${cameraPosition.y}px` }}
        >
          <div className="proctoring-hud">
            <span className={`proctoring-dot ${proctoringReady ? 'ready' : 'loading'}`} aria-hidden="true"></span>
            <span className="proctoring-text">
              {proctoringReady ? 'Proctoring active' : 'Proctoring starting...'}
            </span>
          </div>
          {proctoringError && (
            <div className="proctoring-status-error" role="status">
              {proctoringError}
            </div>
          )}
          <div className="webcam-preview" aria-label="Candidate webcam feed">
            <div
              className="webcam-drag-handle"
              onMouseDown={startCameraDrag}
              onTouchStart={startCameraDrag}
              role="button"
              tabIndex={0}
              aria-label="Move camera preview"
            >
              Move Camera
            </div>
            <Webcam
              ref={webcamRef}
              className="webcam-feed"
              audio={false}
              width={320}
              height={240}
              mirrored
              onUserMedia={handleWebcamReady}
              onUserMediaError={handleWebcamError}
              screenshotFormat="image/jpeg"
              videoConstraints={{ width: 320, height: 240, facingMode: 'user' }}
              style={webcamFeedStyle}
            />
          </div>
        </div>
      )}

      {showExamGate ? (
        <div style={examGateContainerStyle}>
          <div style={examGateCardStyle}>
            <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#86efac' }}>
              Exam Lock-In
            </div>
            <h2 style={{ margin: '14px 0 10px', fontSize: '32px', fontWeight: 800 }}>
              Secure Exam Required
            </h2>
            <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.7, color: 'rgba(248, 250, 252, 0.84)' }}>
              This question page does not start secure mode on its own. Begin or re-enable the secure exam from the assessment hub first.
            </p>
            <p style={{ margin: '16px 0 0', fontSize: '14px', lineHeight: 1.6, color: 'rgba(226, 232, 240, 0.88)' }}>
              Once secure mode is active on the test structure page, the coding pages continue inside the same exam session without asking again for every question.
            </p>
            {examGateError && (
              <div style={examGateErrorStyle}>
                {examGateError}
              </div>
            )}
            <button
              type="button"
              onClick={handleReturnToExamHub}
              style={examGateButtonStyle}
            >
              Return To Test Structure
            </button>
          </div>
        </div>
      ) : showExamWorkspace ? (
        <>
      <div className="main-content">
        {/* Problem Panel */}
        <div className="problem-panel">
          <div className="problem-content">
            <h2>Problem Statement</h2>
            <div className="problem-text">
              <pre>{problem.statement}</pre>
            </div>

            <h3>Input Format</h3>
            {problem.language === 'sql' ? (
              <div className="sql-input-format">
                {(() => {
                  // NEWEST FORMAT: Use authored 'tables' arrays from API/input_format.
                  // Supports multiple input tables for JOIN questions and keeps legacy fallbacks.
                  const tables = problem.tables || []
                  const normalizedTables = normalizeSqlTables(problem)
                  
                  // Parse schema from backend schema_sql or input_format (supports all formats)
                  const schemaData = parseSqlInputFormat(
                    problem.input_format, 
                    problem.schema_sql, 
                    problem.seed_sql,
                    tables
                  )
                  
                  // Priority order for preview data:
                  // 1. Tables field: Direct authored table data from API
                  // 2. New format: rows from input_format.tables[0].rows
                  // 3. Backend preview: Fallback when full table data is unavailable
                  // 4. Fallback: getFallbackSqlPreview
                  const backendPreviewColumns = problem.input_preview_columns || []
                  const backendPreviewRows = problem.input_preview_rows || []
                  
                  // Extract from 'tables' field (NEWEST FORMAT)
                  const tablesFieldRows = (tables && tables.length > 0) 
                    ? tables[0].rows || [] 
                    : []
                  
                  // Extract from old 'input_format.tables' structure
                  const oldFormatRows = (problem.input_format && typeof problem.input_format === 'object' && 
                                        problem.input_format.tables && problem.input_format.tables.length > 0) 
                                       ? problem.input_format.tables[0].rows || [] 
                                       : []
                  
                  const fallbackPreview = getFallbackSqlPreview(
                    typeof problem.input_format === 'string' ? problem.input_format : ''
                  )

                  if (normalizedTables.length > 0) {
                    return (
                      <>
                        {normalizedTables.map((table) => (
                          <div key={table.key} className="sql-input-table-block">
                            {table.tableName && <div className="table-name-header">{table.tableName}</div>}
                            <div className="sample-table-container">
                              <table className="sample-table">
                                <thead>
                                  <tr>
                                    {table.columns.map((col, idx) => <th key={idx}>{col}</th>)}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.map((row, ri) => (
                                    <tr key={ri}>
                                      {row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ))}
                      </>
                    )
                  }
                  
                  // Use full authored table data first so SQL questions show all rows.
                  const previewColumns = tables.length > 0 && tables[0].columns
                    ? tables[0].columns.map(c => c.name || c)
                    : backendPreviewColumns.length > 0 
                    ? backendPreviewColumns 
                    : schemaData.columns.length > 0 
                    ? schemaData.columns.map(c => c.name || c)
                    : fallbackPreview.columns
                  
                  const previewRows = tablesFieldRows.length > 0 
                    ? tablesFieldRows 
                    : oldFormatRows.length > 0 
                    ? oldFormatRows 
                    : backendPreviewRows.length > 0 
                    ? backendPreviewRows 
                    : fallbackPreview.rows

                  // Render table if we have columns AND rows
                  if (previewColumns.length > 0 && previewRows.length > 0) {
                    return (
                      <>
                        {schemaData.tableName && <div className="table-name-header">{schemaData.tableName}</div>}
                        <div className="sample-table-container">
                          <table className="sample-table">
                            <thead>
                              <tr>
                                {previewColumns.map((col, idx) => <th key={idx}>{col}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )
                  }

                  // Fallback: show schema structure (column names and types)
                  if (schemaData.columns.length > 0) {
                    return (
                      <div className="sample-table-container">
                        <table className="sample-table">
                          <thead>
                            <tr>
                              <th>Column</th>
                              <th>Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schemaData.columns.map((column, idx) => (
                              <tr key={idx}>
                                <td>{column.name || column}</td>
                                <td>{column.type || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }

                  // Last resort: show raw input_format
                  return (
                    <pre className="format-text">{typeof problem.input_format === 'string' ? problem.input_format : JSON.stringify(problem.input_format, null, 2)}</pre>
                  )
                })()}
              </div>
            ) : (
              <pre className="format-text">{problem.input_format}</pre>
            )}

            {problem.language !== 'sql' && (
              <>
                <h3>Output Format</h3>
                <pre className="format-text">{problem.output_format}</pre>
              </>
            )}

            {problem.language === 'sql' ? (
              <>
                {(() => {
                  // PRIORITY ORDER for Expected Output rendering:
                  // 1. NEW FORMAT: problem.expected_output with columns and rows
                  // 2. BACKEND GENERATED: output_preview_columns and output_preview_rows
                  // 3. FALLBACK: Parse sample_output text (pipe-separated tables)
                  
                  // Check for NEW FORMAT: problem.expected_output structure
                  const newFormatExpectedOutput = (problem.expected_output && 
                                                   typeof problem.expected_output === 'object' && 
                                                   problem.expected_output.columns && 
                                                   problem.expected_output.rows)
                                                  ? problem.expected_output
                                                  : null
                  
                  // Use backend generated preview if no new format
                  const backendOutputColumns = problem.output_preview_columns || []
                  const backendOutputRows = problem.output_preview_rows || []
                  
                  // Render NEW FORMAT expected output (full table with columns and rows)
                  if (newFormatExpectedOutput && newFormatExpectedOutput.columns.length > 0 && newFormatExpectedOutput.rows.length > 0) {
                    return (
                      <>
                        <h3>Expected Output</h3>
                        <div className="sample-table-container">
                          <table className="sample-table">
                            <thead>
                              <tr>
                                {newFormatExpectedOutput.columns.map((col, idx) => <th key={idx}>{col}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {newFormatExpectedOutput.rows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )
                  }
                  
                  // Render BACKEND GENERATED preview (dynamically executed from starter_code)
                  if (backendOutputColumns.length > 0 && backendOutputRows.length > 0) {
                    return (
                      <>
                        <h3>Expected Output</h3>
                        <div className="sample-table-container">
                          <table className="sample-table">
                            <thead>
                              <tr>
                                {backendOutputColumns.map((col, idx) => <th key={idx}>{col}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {backendOutputRows.map((row, ri) => (
                                <tr key={ri}>
                                  {row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )
                  }
                  
                  // FALLBACK: Parse sample_output text if structured data not available
                  if (problem.sample_output) {
                    const parsedTable = parsePipeTable(problem.sample_output)
                    if (parsedTable.length > 0) {
                      return (
                        <>
                          <h3>Expected Output</h3>
                          <div className="sample-table-container">
                            <table className="sample-table">
                              <tbody>
                                {parsedTable.map((row, i) => (
                                  <tr key={i}>
                                    {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )
                    }
                  }
                  
                  return null
                })()}
              </>
            ) : (
              <>
                <h3>Sample Input</h3>
                <pre className="sample-text">{problem.sample_input}</pre>
                <h3>Sample Output</h3>
                <pre className="sample-text">{problem.sample_output}</pre>
              </>
            )}
          </div>
        </div>

        {/* Editor Panel */}
        <div className="editor-panel">
          <div className="editor-header">
            {problem.language === 'sql' ? (
              <div className="sql-dialect-selector">
                <span>Language:</span>
                <select
                  value={sqlDialect}
                  onChange={(e) => setSqlDialect(e.target.value)}
                  className="dialect-select"
                  aria-label="SQL dialect"
                >
                  <option value="sql">Standard SQL</option>
                  <option value="mysql">MySQL</option>
                  <option value="postgresql">PostgreSQL</option>
                </select>
              </div>
            ) : (
              <span>Language: Python</span>
            )}
            {isExamMode && <span className="auto-save-indicator" aria-live="polite">Auto-saving...</span>}
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage={problem.language === 'sql' ? sqlDialect : 'python'}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                contextmenu: false,
                dragAndDrop: false,
                copyWithSyntaxHighlighting: false,
                fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
              }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section">
        <div className="action-buttons">
          <button onClick={handleRun} disabled={loading} className="btn-run">
            {loading ? 'Running...' : '▶ Run'}
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? 'Submitting...' : '✓ Submit'}
          </button>
          <button onClick={handleReset} disabled={loading} className="btn-reset">
            Reset Code
          </button>
        </div>

        {problem.language === 'python' && (
          <div className="custom-input-section">
            <label htmlFor="custom-input">Custom Input</label>
            <textarea
              id="custom-input"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter custom input here..."
              rows={4}
            />
          </div>
        )}

        <div className="output-section">
          <h3>Output</h3>
          {error && <div className="error-output" role="alert">{error}</div>}
          {showInputRequired && (
            <div className="input-required-message" role="alert">
              <p>Input is required to run the code.</p>
              <button onClick={handleUseSampleInput} className="btn-use-sample">
                Use Sample Input &amp; Run
              </button>
            </div>
          )}
          {outputType === 'submit' && submitResult ? (
            <div className="submission-result">
              <div className="submission-summary">
                <div className={`verdict-badge verdict-${(submitResult.verdict || 'failed').toLowerCase().replace(' ', '-')}`}>
                  {submitResult.verdict === 'Accepted' ? '✓' : '✗'} {submitResult.verdict}
                </div>
                <div className="submission-scores">
                  <div className="score-item">
                    <span className="score-label">Score</span>
                    <span className="score-value">{submitResult.score?.toFixed(2)}%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Best Score</span>
                    <span className="score-value">{submitResult.best_score?.toFixed(2)}%</span>
                  </div>
                  <div className="score-item">
                    <span className="score-label">Test Cases</span>
                    <span className="score-value">{submitResult.passed_tests}/{submitResult.total_tests} Passed</span>
                  </div>
                </div>
                {submitResult.is_new_best && (
                  <div className="new-best-badge">New Best Score!</div>
                )}
              </div>
              <div className="test-cases-list">
                {Array.from({ length: submitResult.total_tests }, (_, i) => {
                  const failed = submitResult.failed_details?.find(d => d.test_case === i + 1)
                  const passed = !failed
                  return (
                    <div key={i} className={`tc-row ${passed ? 'tc-passed' : 'tc-failed'}`}>
                      <span className="tc-number">Test Case {i + 1}</span>
                      <span className="tc-status-icon">{passed ? '✓' : '✗'}</span>
                      <span className={`tc-verdict ${passed ? 'tv-accepted' : 'tv-wrong'}`}>
                        {passed ? 'Accepted' : failed?.error ? 'Runtime Error' : 'Wrong Answer'}
                      </span>
                      {failed?.error && (
                        <span className="tc-error-msg">{failed.error}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : outputType === 'table' ? (
            <div className="sql-table-output">
              <table className="sql-results-table">
                <thead>
                  <tr>{tableHeaders.map((h, i) => <th key={i}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {tableRows.map((row, ri) => (
                    <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <pre className="output-content">{output || '// Output will appear here'}</pre>
          )}
        </div>

        {problemList.length > 0 && (
          <div className="problem-navigation">
            <button
              onClick={handlePrevious}
              disabled={currentProblemIndex <= 0}
              className={`btn-nav${currentProblemIndex <= 0 ? ' disabled' : ''}`}
              aria-label="Previous problem"
            >
              ← Previous Problem
            </button>
            <span className="problem-counter">
              Problem {currentProblemIndex + 1} of {problemList.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentProblemIndex >= problemList.length - 1}
              className={`btn-nav${currentProblemIndex >= problemList.length - 1 ? ' disabled' : ''}`}
              aria-label="Next problem"
            >
              Next Problem →
            </button>
          </div>
        )}
      </div>
        </>
      ) : null}
    </div>
  )
}

export default CodingPage
