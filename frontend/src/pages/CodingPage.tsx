import Editor from '@monaco-editor/react'
import api, { getExamStatus, getExamSummary, getPracticeProblems, getProblem, getPythonProblems, getSqlProblems, previewSubmitCode, previewSubmitSql, runCode, runSql, saveExamAnswer, submitCode, submitExam, submitSql } from '../api'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'
import Spinner from '../components/ui/Spinner'
import { clearCandidateSession, clearAdminSession, clearPracticeSession } from '../utils/sessionStorage'
import { FiFileText, FiBookOpen, FiClock, FiThumbsUp, FiThumbsDown, FiMessageSquare, FiStar, FiShare2, FiAlignLeft, FiRefreshCw, FiMaximize, FiPlay, FiUploadCloud, FiCheckSquare, FiTerminal, FiCode, FiChevronUp, FiChevronDown, FiAlertTriangle, FiArrowLeft, FiArrowRight, FiCheck, FiX } from 'react-icons/fi'
import { FaLightbulb } from 'react-icons/fa'
import { ProctoringProvider } from '../components/Proctoring/ProctoringProvider'
import { useProctoring } from '../components/Proctoring/useProctoring'

import { ProctoringStatus } from '../components/Proctoring/ProctoringStatus'
import { FormattedContent, parseSqlFromDdlDml } from '../components/ui/TableRenderer'
import { PlatformLogoSmall } from '../components/ui/Branding'

const EXAM_SECURE_MODE_KEY = 'exam_secure_mode_started'
const VIOLATION_ALERT_MS = 4000

const examGateContainerStyle = {
  minHeight: 'calc(100vh - 48px)',
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

function CodingPage() {
  const { problemId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const requestedMode = new URLSearchParams(location.search).get('mode')
  const isAdminPreviewMode = Boolean(localStorage.getItem('admin_logged_in'))
    && requestedMode === 'admin-preview'
  const isPracticeMode = localStorage.getItem('practice_logged_in') === 'true'
    && requestedMode === 'practice'
  const isStatelessMode = isAdminPreviewMode || isPracticeMode
  const buildCodingPath = (id) => {
    if (isAdminPreviewMode) return `/coding/${id}?mode=admin-preview`
    if (isPracticeMode) return `/coding/${id}?mode=practice`
    return `/coding/${id}`
  }

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
  const [runResult, setRunResult] = useState(null)
  const [userName, setUserName] = useState('')
  const [showInputRequired, setShowInputRequired] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [isExamMode, setIsExamMode] = useState(false)
  const [isExamActive, setIsExamActive] = useState(() => {
    return localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' && Boolean(document.fullscreenElement)
  })
  const [sqlDialect, setSqlDialect] = useState('sql')
  const [problemList, setProblemList] = useState<any[]>([])
  const [currentProblemIndex, setCurrentProblemIndex] = useState(-1)
  const [examSequence, setExamSequence] = useState<Array<{
    id: string
    title: string
    language: string
    path: string
    isMcq?: boolean
  }>>([])

  const currentSeqIndex = examSequence.findIndex(item => item.id === problemId)
  const isLastQuestion = examSequence.length > 0 && currentSeqIndex === examSequence.length - 1
  const nextQuestion = currentSeqIndex >= 0 && currentSeqIndex < examSequence.length - 1 ? examSequence[currentSeqIndex + 1] : null
  const prevQuestion = currentSeqIndex > 0 ? examSequence[currentSeqIndex - 1] : null

  // UI state for the LeetCode-style layout
  const [leftTab, setLeftTab] = useState('description')
  const [bottomTab, setBottomTab] = useState('testcase')
  const [selectedTestCase, setSelectedTestCase] = useState(0)
  const [selectedResultCase, setSelectedResultCase] = useState(0)

  // Resizer & Collapse State
  const [leftWidth, setLeftWidth] = useState(42)
  const [bottomHeight, setBottomHeight] = useState(260)
  const [bottomCollapsed, setBottomCollapsed] = useState(false)

  const handleHorizontalResizeStart = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = leftWidth
    const mainSplit = document.querySelector('.main-split')
    const containerWidth = mainSplit ? mainSplit.getBoundingClientRect().width : window.innerWidth

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / containerWidth) * 100
      const newWidth = Math.min(Math.max(startWidth + deltaPercent, 18), 75)
      setLeftWidth(newWidth)
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleVerticalResizeStart = (e) => {
    e.preventDefault()
    const startY = e.clientY
    const startHeight = bottomHeight
    const rightPanel = document.querySelector('.right-panel')
    const containerHeight = rightPanel ? rightPanel.getBoundingClientRect().height : window.innerHeight

    const onMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY
      const newHeight = Math.min(Math.max(startHeight - deltaY, 40), containerHeight - 120)
      setBottomHeight(newHeight)
      if (newHeight > 50 && bottomCollapsed) {
        setBottomCollapsed(false)
      }
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)
  const [examGateError, setExamGateError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)
  const toastTimeoutRef = useRef(null)

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

    // Penalty time listener
  useEffect(() => {
    const handlePenalty = (e) => {
      const ps = e.detail?.penaltySeconds || 60
      setRemainingTime(prev => {
        const next = Math.max(0, prev - ps)
        localStorage.setItem('exam_remaining', next.toString())
        return next
      })
    }
    window.addEventListener('exam_time_penalty', handlePenalty)
    return () => window.removeEventListener('exam_time_penalty', handlePenalty)
  }, [])

  const handleReturnToExamHub = useCallback(() => {
    navigate('/test-structure')
  }, [navigate])

  // --- Effects ---------------------------------------------------------------

  useEffect(() => {
    if (isPracticeMode) {
      setUserName(localStorage.getItem('practice_name') || '')
      loadProblem()
      return () => {
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      }
    }

    const name = localStorage.getItem('user_name')
    const adminName = localStorage.getItem('admin_name')
    if (!name && !adminName) { navigate('/'); return }
    setUserName(name || adminName)
    checkExamStatus()
    loadProblem()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [problemId, navigate, isPracticeMode])

  useEffect(() => {
    if (!isExamMode) {
      setIsExamActive(false)
      return
    }
    const secureModeActive = localStorage.getItem(EXAM_SECURE_MODE_KEY) === 'true' && Boolean(document.fullscreenElement)
    setIsExamActive(secureModeActive)
  }, [isExamMode])

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
        setExamGateError('Fullscreen mode was exited. Return to the assessment hub to re-enable secure exam mode.')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [isExamMode, isExamActive])

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

  // --- Handlers --------------------------------------------------------------

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
    // BUG FIX: Clear previous problem's output state when switching problems
    setOutput('')
    setOutputType('text')
    setSubmitResult(null)
    setTableHeaders([])
    setTableRows([])
    setError('')
    setShowInputRequired(false)
    setSelectedTestCase(0)
    setSelectedResultCase(0)
    setBottomTab('testcase')

    try {
      const data = await getProblem(problemId)
      setProblem(data)
      const answers = isPracticeMode
        ? {}
        : JSON.parse(localStorage.getItem('exam_answers') || '{}')
      
      const stripDriver = (codeStr) => {
        if (!codeStr || typeof codeStr !== 'string') return ''
        const idx = codeStr.search(/\n\s*(import sys|lines\s*=|line\s*=|if\s+__name__)/i)
        return idx !== -1 ? codeStr.substring(0, idx).trimEnd() : codeStr
      }

      const rawStarter = data.starter_code || ''
      let cleanStarter = rawStarter
      if (data.language === 'python') {
        cleanStarter = stripDriver(rawStarter)
      } else if (data.language === 'sql') {
        if (!cleanStarter.trim() || /^\s*SELECT\b/i.test(cleanStarter.trim())) {
          cleanStarter = '-- Write your SQL query here\n'
        }
      }
      const savedCode = answers[problemId] ? answers[problemId].code : null
      setCode(savedCode ? (data.language === 'python' ? stripDriver(savedCode) : savedCode) : cleanStarter)
      setStarterCode(cleanStarter)
      if (data.language === 'python') setCustomInput(data.sample_input)
      await loadProblemList(data.language)
    } catch (err) {
      setError('Failed to load problem')
      console.error(err)
    }
  }

  const loadProblemList = async (language: string) => {
    try {
      if (isPracticeMode) {
        const problems = await getPracticeProblems(language)
        setProblemList(problems || [])
        setCurrentProblemIndex((problems || []).findIndex((p: any) => p.id === problemId))
        setExamSequence((problems || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          language: p.language || language,
          path: buildCodingPath(p.id),
          isMcq: false
        })))
      } else if (isAdminPreviewMode) {
        const response = await api.get('/admin/problems')
        const problems = (response.data || []).filter((item: any) => item.language === language)
        setProblemList(problems || [])
        setCurrentProblemIndex((problems || []).findIndex((p: any) => p.id === problemId))
        setExamSequence((problems || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          language: p.language || language,
          path: buildCodingPath(p.id),
          isMcq: false
        })))
      } else {
        const sessionId = localStorage.getItem('session_id') || ''
        const [pyProblems, sqlProblems, summary] = await Promise.all([
          getPythonProblems(sessionId).catch(() => []),
          getSqlProblems(sessionId).catch(() => []),
          getExamSummary(sessionId).catch(() => null)
        ])

        const pyItems = (Array.isArray(pyProblems) ? pyProblems : []).map((p: any) => ({
          id: p.id,
          title: p.title,
          language: 'python',
          path: buildCodingPath(p.id),
          isMcq: false
        }))

        const sqlItems = (Array.isArray(sqlProblems) ? sqlProblems : []).map((p: any) => ({
          id: p.id,
          title: p.title,
          language: 'sql',
          path: buildCodingPath(p.id),
          isMcq: false
        }))

        const hasMcq = (summary?.mcq_questions || 0) > 0
        const mcqItems = hasMcq ? [{
          id: 'mcq',
          title: 'MCQ Round',
          language: 'mcq',
          path: '/problems/mcq',
          isMcq: true
        }] : []

        const fullSequence = [...pyItems, ...sqlItems, ...mcqItems]
        setExamSequence(fullSequence)

        const problems = language === 'python' ? pyProblems : sqlProblems
        setProblemList(Array.isArray(problems) ? problems : [])
        setCurrentProblemIndex((Array.isArray(problems) ? problems : []).findIndex((p: any) => p.id === problemId))
      }
    } catch (err) {
      console.error('Failed to load problem list:', err)
    }
  }

  const handleBack = () => {
    if (isPracticeMode) {
      navigate('/practice/problems')
    }
    else if (isAdminPreviewMode) {
      navigate('/admin/questions', {
        state: { activeTab: problem?.language === 'sql' ? 'sql' : 'python' }
      })
    }
    else if (problem?.language === 'sql') navigate('/problems/sql')
    else navigate('/problems/python')
  }

  const handleRun = async () => {
    setLoading(true); setOutput(''); setError(''); setSubmitResult(null); setRunResult(null); setShowInputRequired(false)
    setBottomTab('result')
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
    }
  }

  const handleUseSampleInput = () => {
    setCustomInput(problem.sample_input); setShowInputRequired(false)
    setTimeout(() => handleRun(), 100)
  }

  const handleSubmit = async () => {
    const sessionId = localStorage.getItem('session_id')
    if (!problem) { setError('Problem not loaded. Please refresh the page.'); return }
    if (!sessionId && !isStatelessMode) { navigate('/'); return }
    setLoading(true); setOutput(''); setError(''); setSubmitResult(null); setRunResult(null); setShowInputRequired(false)
    setBottomTab('result')
    try {
      let result
      if (problem.language === 'sql') {
        result = isStatelessMode
          ? await previewSubmitSql(problemId, code, sqlDialect)
          : await submitSql(sessionId, problemId, code, remainingTime > 0 ? 9000 - remainingTime : 0, sqlDialect)
      } else {
        result = isStatelessMode
          ? await previewSubmitCode(problemId, code)
          : await submitCode(sessionId, problemId, code, remainingTime > 0 ? 9000 - remainingTime : 0)
      }
      setSubmitResult(result); setOutputType('submit'); setOutput(''); setTableHeaders([]); setTableRows([])
      setSelectedResultCase(0)
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

  const handleReset = () => { setCode(starterCode); setOutput(''); setError(''); setSubmitResult(null); setOutputType('text') }

  const saveCurrentDraft = async () => {
    if (!problemId) return
    try {
      const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
      answers[problemId] = {
        code,
        language: problem?.language || 'python',
        selected_option: null
      }
      localStorage.setItem('exam_answers', JSON.stringify(answers))
    } catch (e) {
      console.warn('Failed to save to localStorage', e)
    }

    const sessionId = localStorage.getItem('session_id')
    if (isExamMode && sessionId && problem) {
      try {
        await saveExamAnswer(sessionId, problemId, code, problem.language)
      } catch (err) {
        console.warn('Failed to save answer to server:', err)
      }
    }
  }

  const handleGoToNext = async () => {
    await saveCurrentDraft()
    if (nextQuestion) {
      navigate(nextQuestion.path)
    } else if (currentProblemIndex < problemList.length - 1) {
      handleNext()
    }
  }

  const handleGoToPrev = async () => {
    await saveCurrentDraft()
    if (prevQuestion) {
      navigate(prevQuestion.path)
    } else if (currentProblemIndex > 0) {
      handlePrevious()
    }
  }

  const handleFinishExam = async () => {
    await saveCurrentDraft()
    if (isPracticeMode) {
      navigate('/practice/problems')
      return
    }
    if (isAdminPreviewMode) {
      navigate('/admin/questions')
      return
    }
    navigate('/test-structure?confirm=true')
  }

  const handlePrevious = () => {
    if (currentProblemIndex > 0) navigate(buildCodingPath(problemList[currentProblemIndex - 1].id))
  }

  const handleNext = () => {
    if (currentProblemIndex < problemList.length - 1) navigate(buildCodingPath(problemList[currentProblemIndex + 1].id))
  }

  const handleLogout = () => {
    if (isPracticeMode) {
      clearPracticeSession()
      navigate('/practice')
      return
    }

    localStorage.removeItem(EXAM_SECURE_MODE_KEY)
    if (isAdminPreviewMode) {
      clearAdminSession()
      navigate('/admin')
      return
    }

    clearCandidateSession()
    navigate('/')
  }

  // --- SQL Helpers (unchanged) -----------------------------------------------

  const parseSqlInputFormat = (inputFormat, schemaSql, seedSql, tables) => {
    if (tables && Array.isArray(tables) && tables.length > 0) {
      const firstTable = tables[0]
      return {
        tableName: firstTable.table_name || '',
        columns: firstTable.columns || [],
        rows: firstTable.rows || []
      }
    }

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

  // --- Derived state ---------------------------------------------------------

  const showExamGate = isExamMode && !isExamActive
  const showExamWorkspace = !isExamMode || isExamActive

  // Get test cases for display in the Testcase tab
  const testCases = problem?.test_cases || []
  const displayTestCases = testCases.length > 0
    ? testCases
    : (problem?.sample_input ? [{ input: problem.sample_input, expected_output: problem.sample_output }] : [])

  if (!problem) {
    return <Spinner label="Loading problem..." size={40} fullPage />
  }

  // --- Render Helpers --------------------------------------------------------

  const renderSqlInputFormat = () => {
    const tables = problem.tables || []
    const normalizedTables = normalizeSqlTables(problem)
    const schemaData = parseSqlInputFormat(problem.input_format, problem.schema_sql, problem.seed_sql, tables)
    const backendPreviewColumns = problem.input_preview_columns || []
    const backendPreviewRows = problem.input_preview_rows || []
    const tablesFieldRows = (tables && tables.length > 0) ? tables[0].rows || [] : []
    const oldFormatRows = (problem.input_format && typeof problem.input_format === 'object' &&
                          problem.input_format.tables && problem.input_format.tables.length > 0)
                         ? problem.input_format.tables[0].rows || [] : []
    const fallbackPreview = getFallbackSqlPreview(typeof problem.input_format === 'string' ? problem.input_format : '')
    const ddlDmlData = parseSqlFromDdlDml(problem.schema_sql, problem.seed_sql)

    if (normalizedTables.length > 0) {
      return (
        <>
          {normalizedTables.map((table) => (
            <div key={table.key} className="sql-input-table-block">
              {table.tableName && <div className="table-name-header">{table.tableName}</div>}
              <div className="sample-table-container">
                <table className="sample-table">
                  <thead>
                    <tr>{table.columns.map((col, idx) => <th key={idx}>{col}</th>)}</tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, ri) => (
                      <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )
    }

    // If DDL/DML parsed columns and sample rows from seed_sql exist, prioritize them!
    if (ddlDmlData.columns.length > 0 && ddlDmlData.rows.length > 0) {
      return (
        <div className="sql-input-table-block">
          {ddlDmlData.tableName && <div className="table-name-header">{ddlDmlData.tableName} table:</div>}
          <div className="sample-table-container">
            <table className="sample-table">
              <thead><tr>{ddlDmlData.columns.map((col, idx) => <th key={idx}>{col}</th>)}</tr></thead>
              <tbody>{ddlDmlData.rows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )
    }

    const previewColumns = tables.length > 0 && tables[0].columns
      ? tables[0].columns.map(c => c.name || c)
      : backendPreviewColumns.length > 0 ? backendPreviewColumns
      : schemaData.columns.length > 0 ? schemaData.columns.map(c => c.name || c)
      : ddlDmlData.columns.length > 0 ? ddlDmlData.columns
      : fallbackPreview.columns
    const previewRows = tablesFieldRows.length > 0 ? tablesFieldRows
      : oldFormatRows.length > 0 ? oldFormatRows
      : backendPreviewRows.length > 0 ? backendPreviewRows
      : fallbackPreview.rows

    if (previewColumns.length > 0 && previewRows.length > 0) {
      return (
        <>
          {schemaData.tableName && <div className="table-name-header">{schemaData.tableName}</div>}
          <div className="sample-table-container">
            <table className="sample-table">
              <thead><tr>{previewColumns.map((col, idx) => <th key={idx}>{col}</th>)}</tr></thead>
              <tbody>{previewRows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )
    }

    if (schemaData.columns.length > 0) {
      return (
        <div className="sample-table-container">
          <table className="sample-table">
            <thead><tr><th>Column</th><th>Type</th></tr></thead>
            <tbody>
              {schemaData.columns.map((column, idx) => (
                <tr key={idx}><td>{column.name || column}</td><td>{column.type || '-'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    if (typeof problem.input_format === 'string' && problem.input_format.includes('|')) {
      return <FormattedContent text={problem.input_format} />
    }

    return <pre className="format-text">{typeof problem.input_format === 'string' ? problem.input_format : JSON.stringify(problem.input_format, null, 2)}</pre>
  }

  const renderSqlExpectedOutput = () => {
    const newFormatExpectedOutput = (problem.expected_output && typeof problem.expected_output === 'object' && problem.expected_output.columns && problem.expected_output.rows)
      ? problem.expected_output : null
    const backendOutputColumns = problem.output_preview_columns || []
    const backendOutputRows = problem.output_preview_rows || []

    const firstTc = problem.test_cases?.[0]?.expected_output
    const tcExpOutput = (firstTc && typeof firstTc === 'object' && Array.isArray(firstTc.columns) && Array.isArray(firstTc.rows))
      ? firstTc
      : (Array.isArray(firstTc) && firstTc.length > 0 && typeof firstTc[0] === 'object')
        ? { columns: Object.keys(firstTc[0]), rows: firstTc.map(r => Object.values(r)) }
        : null

    const expOutputToRender = newFormatExpectedOutput || tcExpOutput

    if (expOutputToRender && expOutputToRender.columns.length > 0 && expOutputToRender.rows.length > 0) {
      return (
        <>
          <h3 className="section-heading">Expected Output</h3>
          <div className="sample-table-container">
            <table className="sample-table">
              <thead><tr>{expOutputToRender.columns.map((col, idx) => <th key={idx}>{col}</th>)}</tr></thead>
              <tbody>{expOutputToRender.rows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )
    }

    if (backendOutputColumns.length > 0 && backendOutputRows.length > 0) {
      return (
        <>
          <h3 className="section-heading">Expected Output</h3>
          <div className="sample-table-container">
            <table className="sample-table">
              <thead><tr>{backendOutputColumns.map((col, idx) => <th key={idx}>{col}</th>)}</tr></thead>
              <tbody>{backendOutputRows.map((row, ri) => (
                <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell !== null ? cell : 'NULL'}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )
    }

    if (problem.sample_output) {
      if (problem.sample_output.includes('+') || problem.sample_output.includes('|')) {
        return (
          <>
            <h3 className="section-heading">Expected Output</h3>
            <FormattedContent text={problem.sample_output} />
          </>
        )
      }
      const parsedTable = parsePipeTable(problem.sample_output)
      if (parsedTable.length > 0) {
        return (
          <>
            <h3 className="section-heading">Expected Output</h3>
            <div className="sample-table-container">
              <table className="sample-table">
                <tbody>{parsedTable.map((row, i) => (
                  <tr key={i}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )
      }
    }

    return null
  }

  // --- Render ----------------------------------------------------------------

  const proctoringSessionId = localStorage.getItem('session_id') || 'session_default'
  const proctoringCandidateId = localStorage.getItem('user_id') || userName || 'candidate_default'

  return (
    <ProctoringProvider
      testId={proctoringSessionId}
      candidateId={proctoringCandidateId}
      enabled={isExamMode && isExamActive}
    >
      <div className="coding-page">
        {/* === Top Toolbar === */}
        <div className="coding-toolbar">
          <div className="toolbar-left">
            <PlatformLogoSmall onClick={!isExamMode ? () => navigate('/dashboard') : undefined} className="mr-2.5" />
            {(isExamMode || isStatelessMode) && (
              <button onClick={handleBack} className="btn-back-coding" aria-label="Go back"><FiArrowLeft /> Back</button>
            )}
            <span className="toolbar-title" title={problem.title}>{problem.title}</span>
            {isPracticeMode && <span className="practice-mode-badge">Practice</span>}
            {examSequence.length > 0 ? (
              <div className="toolbar-nav-arrows">
                <button
                  type="button"
                  onClick={handleGoToPrev}
                  disabled={currentSeqIndex <= 0}
                  className="btn-nav-arrow"
                  aria-label="Previous question"
                  title={prevQuestion ? `Back to ${prevQuestion.title}` : undefined}
                >
                  &larr;
                </button>
                <span className="problem-counter-badge">
                  {currentSeqIndex >= 0 ? currentSeqIndex + 1 : 1}/{examSequence.length}
                </span>
                <button
                  type="button"
                  onClick={handleGoToNext}
                  disabled={isLastQuestion}
                  className="btn-nav-arrow"
                  aria-label="Next question"
                  title={nextQuestion ? `Next: ${nextQuestion.title}` : undefined}
                >
                  &rarr;
                </button>
              </div>
            ) : problemList.length > 0 ? (
              <div className="toolbar-nav-arrows">
                <button onClick={handlePrevious} disabled={currentProblemIndex <= 0} className="btn-nav-arrow" aria-label="Previous problem">&larr;</button>
                <span className="problem-counter-badge">{currentProblemIndex + 1}/{problemList.length}</span>
                <button onClick={handleNext} disabled={currentProblemIndex >= problemList.length - 1} className="btn-nav-arrow" aria-label="Next problem">&rarr;</button>
              </div>
            ) : null}
          </div>

          <div className="toolbar-center" />

          <div className="toolbar-right">
            <button onClick={handleRun} disabled={loading} className="btn-run-toolbar">
              <span className="toolbar-btn-icon"><FiPlay /></span> {loading ? 'Running...' : 'Run'}
            </button>
            <button onClick={handleSubmit} disabled={loading} className="btn-submit-toolbar">
              <span className="toolbar-btn-icon"><FiUploadCloud /></span> {loading ? 'Submitting...' : 'Submit'}
            </button>

            {/* Candidate Next / Finish Top-Right Action Button */}
            {isExamMode && examSequence.length > 0 && (
              isLastQuestion ? (
                <button
                  type="button"
                  onClick={handleFinishExam}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer ring-2 ring-emerald-400/40 disabled:opacity-50"
                  title="Finish exam and proceed to submission confirmation"
                >
                  <FiCheck className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Finish Test</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleGoToNext}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-pointer disabled:opacity-50"
                  title={nextQuestion ? `Proceed to ${nextQuestion.title}` : 'Next Question'}
                >
                  <span>{nextQuestion?.isMcq ? 'Next: MCQ Round' : 'Next Question'}</span>
                  <FiArrowRight className="w-3.5 h-3.5" />
                </button>
              )
            )}

            {isExamMode && (
              <div className={getTimerClass()} aria-label={`Time remaining: ${formatTime(remainingTime)}`}>
                <span className="timer-icon" aria-hidden="true"><FiClock /></span>
                <span className="timer-value">{formatTime(remainingTime)}</span>
              </div>
            )}
            <ThemeToggle />
            <span className="user-display">{userName}</span>
            {!isExamMode && (
              <button onClick={handleLogout} className="btn-logout">Logout</button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {showToast && (
          <div style={toastStyle} role="alert" aria-live="polite">
            <FiAlertTriangle style={{ fontSize: '18px', color: '#f59e0b' }} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modular Camera Preview Overlay */}
        

      {/* === Main Content === */}
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
              <div style={examGateErrorStyle}>{examGateError}</div>
            )}
            <button type="button" onClick={handleReturnToExamHub} style={examGateButtonStyle}>
              Return To Test Structure
            </button>
          </div>
        </div>
      ) : showExamWorkspace ? (
        <div className="main-split">
          {/* === Left Panel — Description === */}
          <div 
  className="left-panel" 
  style={{ width: `${leftWidth}%` }}
  onCopy={(e) => { e.preventDefault(); e.stopPropagation(); }}
  onCut={(e) => { e.preventDefault(); e.stopPropagation(); }}
  onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
  onDragStart={(e) => e.preventDefault()}
>
            <div className="left-panel-tabs">
              <button className="left-tab active">
                <span className="tab-icon-svg"><FiFileText /></span> Description
              </button>
            </div>

            <div className="left-panel-content">
              <div className="problem-title-section">
                <h2>{problem.title}</h2>
                {problem.difficulty && (
                  <span className={`difficulty-badge ${(problem.difficulty || 'medium').toLowerCase()}`}>
                    {problem.difficulty}
                  </span>
                )}
              </div>

              <div className="problem-statement">
                <FormattedContent text={problem.description || problem.statement} />
              </div>

              <h3 className="section-heading">Input Format</h3>
              {problem.language === 'sql' ? (
                <div className="sql-input-format">{renderSqlInputFormat()}</div>
              ) : (
                <pre className="format-text">{problem.input_format}</pre>
              )}

              {problem.language !== 'sql' && (
                <>
                  <h3 className="section-heading">Output Format</h3>
                  <pre className="format-text">{problem.output_format}</pre>
                </>
              )}

              {problem.language === 'sql' ? (
                renderSqlExpectedOutput()
              ) : (
                <>
                  <h3 className="section-heading">Sample Input</h3>
                  <pre className="sample-text">{problem.sample_input}</pre>
                  <h3 className="section-heading">Sample Output</h3>
                  <pre className="sample-text">{problem.sample_output}</pre>
                </>
              )}
            </div>
          </div>

          {/* === Horizontal Resizer === */}
          <div
            className="resizer-horizontal"
            onMouseDown={handleHorizontalResizeStart}
            title="Drag to resize description panel"
          />

          {/* === Right Panel — Editor + Bottom Panel === */}
          <div className="right-panel">
            {/* Code Header */}
            <div className="code-header">
              <div className="code-header-left">
                <span className="code-label">
                  <span className="code-label-icon"><FiCode /></span> Code
                </span>
                {problem.language === 'sql' ? (
                  <div className="sql-dialect-selector">
                    <select value={sqlDialect} onChange={(e) => setSqlDialect(e.target.value)} className="dialect-select" aria-label="SQL dialect">
                      <option value="sql">Standard SQL</option>
                      <option value="mysql">MySQL</option>
                      <option value="postgresql">PostgreSQL</option>
                    </select>
                  </div>
                ) : (
                  <div className="sql-dialect-selector">
                    <select className="dialect-select" defaultValue="python3" aria-label="Language">
                      <option value="python3">Python3</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                )}
                {isExamMode && <span className="auto-save-indicator" aria-live="polite">Auto-saving...</span>}
              </div>
              <div className="code-header-right">
                <button className="utility-btn" aria-label="Format"><FiAlignLeft /></button>
                <button onClick={handleReset} disabled={loading} className="utility-btn" aria-label="Reset Code"><FiRefreshCw /></button>
                <button className="utility-btn" aria-label="Fullscreen"><FiMaximize /></button>
              </div>
            </div>

            {/* Editor */}
            <div className="editor-area">
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

            {/* === Vertical Resizer === */}
            {!bottomCollapsed && (
              <div
                className="resizer-vertical"
                onMouseDown={handleVerticalResizeStart}
                title="Drag to resize testcase window"
              />
            )}

            {/* === Bottom Panel — Testcase / Test Result === */}
            <div
              className={`bottom-panel${bottomCollapsed ? ' is-collapsed' : ''}`}
              style={{ height: bottomCollapsed ? '38px' : `${bottomHeight}px` }}
            >
              <div className="bottom-panel-tabs">
                <div className="bottom-tabs-left">
                  <button className={`bottom-tab${bottomTab === 'testcase' ? ' active' : ''}`} onClick={() => { setBottomTab('testcase'); setBottomCollapsed(false); }}>
                    <span className="bottom-tab-icon"><FiCheckSquare /></span> Testcase
                  </button>
                  <button className={`bottom-tab${bottomTab === 'result' ? ' active' : ''}`} onClick={() => { setBottomTab('result'); setBottomCollapsed(false); }}>
                    <span className="bottom-tab-icon"><FiTerminal /></span> Test Result
                    {submitResult && (
                      <span className={`result-dot ${submitResult.verdict === 'Accepted' ? 'pass' : 'fail'}`}></span>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-toggle-collapse"
                  onClick={() => setBottomCollapsed(prev => !prev)}
                  title={bottomCollapsed ? "Expand Testcases" : "Collapse Testcases"}
                  aria-label={bottomCollapsed ? "Expand Testcases" : "Collapse Testcases"}
                >
                  {bottomCollapsed ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              </div>

              {!bottomCollapsed && (
                <div className="bottom-panel-content">
                {/* --- Testcase Tab --- */}
                {bottomTab === 'testcase' && (
                  <>
                    {problem.language === 'python' && displayTestCases.length > 0 && (
                      <>
                        <div className="testcase-pills">
                          {displayTestCases.map((_, i) => (
                            <button key={i} className={`case-pill${selectedTestCase === i ? ' active' : ''}`} onClick={() => setSelectedTestCase(i)}>
                              Case {i + 1}
                            </button>
                          ))}
                        </div>
                        <div className="testcase-detail">
                          {displayTestCases[selectedTestCase] && (
                            <>
                              <div>
                                <div className="testcase-field-label">input =</div>
                                <div className="testcase-field-value">{displayTestCases[selectedTestCase].input}</div>
                              </div>
                              {displayTestCases[selectedTestCase].expected_output && (
                                <div>
                                  <div className="testcase-field-label">expected output =</div>
                                  <div className="testcase-field-value">{displayTestCases[selectedTestCase].expected_output}</div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}

                    {problem.language === 'python' && (
                      <div className="custom-input-section">
                        <label htmlFor="custom-input">Custom Input</label>
                        <textarea
                          id="custom-input"
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                          placeholder="Enter custom input here..."
                          rows={3}
                        />
                      </div>
                    )}

                    {problem.language === 'sql' && (
                      <div className="empty-result">SQL problems use the table schema shown in the description.</div>
                    )}
                  </>
                )}

                {/* --- Test Result Tab --- */}
                {bottomTab === 'result' && (
                  <>
                    {error && <div className="error-output" role="alert">{error}</div>}

                    {showInputRequired && (
                      <div className="input-required-message" role="alert">
                        <p>Input is required to run the code.</p>
                        <button onClick={handleUseSampleInput} className="btn-use-sample">
                          Use Sample Input &amp; Run
                        </button>
                      </div>
                    )}

                    {outputType === 'run' && runResult ? (
                      <div className="leetcode-run-result">
                        <div className={`result-status-line ${runResult.status === 'Accepted' ? 'pass' : 'fail'}`}>
                          {runResult.status === 'Accepted' ? <FiCheck /> : <FiX />} {runResult.status}
                        </div>

                        {runResult.input && (
                          <div className="leetcode-field-group">
                            <label>Input</label>
                            <pre className="acp-code-block">{runResult.input}</pre>
                          </div>
                        )}

                        {runResult.stdout && (
                          <div className="leetcode-field-group">
                            <label>Stdout (print)</label>
                            <pre className="acp-code-block stdout-text">{runResult.stdout}</pre>
                          </div>
                        )}

                        <div className="leetcode-field-group">
                          <label>Output (return value)</label>
                          <pre className="acp-code-block">{runResult.output}</pre>
                        </div>

                        {runResult.expected && (
                          <div className="leetcode-field-group">
                            <label>Expected</label>
                            <pre className="acp-code-block">{runResult.expected}</pre>
                          </div>
                        )}

                        {runResult.error && (
                          <div className="leetcode-field-group">
                            <label>Runtime Error</label>
                            <pre className="acp-error-block">{runResult.error}</pre>
                          </div>
                        )}
                      </div>
                    ) : outputType === 'submit' && submitResult ? (
                      <>
                        {/* Verdict Summary */}
                        <div className="result-summary">
                          <div className={`verdict-badge verdict-${(submitResult.verdict || 'failed').toLowerCase().replace(' ', '-')}`}>
                            {submitResult.verdict === 'Accepted' ? <FiCheck /> : <FiX />} {submitResult.verdict}
                          </div>
                          <div className="result-scores">
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
                              <span className="score-value">{submitResult.passed_tests}/{submitResult.total_tests}</span>
                            </div>
                          </div>
                          {submitResult.is_new_best && (
                            <div className="new-best-badge">New Best Score!</div>
                          )}
                        </div>

                        {/* Per-case pills */}
                        <div className="result-case-pills">
                          {Array.from({ length: submitResult.total_tests }, (_, i) => {
                            const failed = submitResult.failed_details?.find(d => d.test_case === i + 1)
                            const passed = !failed
                            return (
                              <button
                                key={i}
                                className={`result-case-pill${selectedResultCase === i ? ' active' : ''} ${passed ? 'pass' : 'fail'}`}
                                onClick={() => setSelectedResultCase(i)}
                              >
                                Case {i + 1}
                              </button>
                            )
                          })}
                        </div>

                        {/* Selected case detail */}
                        {(() => {
                          const caseIndex = selectedResultCase
                          const failed = submitResult.failed_details?.find(d => d.test_case === caseIndex + 1)
                          const passed = !failed
                          return (
                            <div className="result-case-detail">
                              <div className={`result-status-line ${passed ? 'pass' : 'fail'}`}>
                                {passed ? <><FiCheck /> Accepted</> : failed?.error ? <><FiX /> Runtime Error</> : <><FiX /> Wrong Answer</>}
                              </div>
                              {failed?.error && (
                                <div className="result-error-msg">{failed.error}</div>
                              )}
                            </div>
                          )
                        })()}
                      </>
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
                      output ? (
                        <pre className="output-content">{output}</pre>
                      ) : !error && !showInputRequired ? (
                        <div className="empty-result">Run or submit your code to see results here.</div>
                      ) : null
                    )}
                  </>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
    </ProctoringProvider>
  )
}

export default CodingPage
