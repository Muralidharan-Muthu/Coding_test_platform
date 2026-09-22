import { formatTimeWithLabel } from '../utils/timeUtils'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { getExamStatus, getExamSummary } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { PlatformLogoSmall, ClockIcon, ChecklistIcon, PythonIcon, DatabaseIcon } from '../components/ui/Branding'
import Spinner from '../components/ui/Spinner'
import { clearCandidateSession } from '../utils/sessionStorage'
import { FiCamera, FiShield, FiMonitor, FiLock, FiClock, FiRefreshCw, FiCode, FiEye } from 'react-icons/fi'
import './CandidateDashboard.css'

const webcamConstraints = { facingMode: 'user' }

function CandidateDashboard() {
  const navigate = useNavigate()
  const webcamRef = useRef(null)
  const [userName, setUserName] = useState('')
  const [examSummary, setExamSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [examStarted, setExamStarted] = useState(false)
  const [startingExam, setStartingExam] = useState(false)
  const [actionError, setActionError] = useState('')
  const [capturedImage, setCapturedImage] = useState('')
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')
    if (!name || !sessionId) { navigate('/'); return }
    setUserName(name)
    loadExamData()
  }, [navigate])

  const loadExamData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id') || ''
      const summary = await getExamSummary(sessionId)
      setExamSummary(summary)
      const status = await getExamStatus(sessionId)
      if (status.status === 'active') {
        setExamStarted(true)
        localStorage.setItem('exam_remaining', status.remaining_seconds)
        localStorage.setItem('exam_start_time', status.start_time)
      } else if (status.status === 'completed') {
        navigate('/submission-complete')
      }
    } catch (err) {
      console.error('Failed to load exam data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCapture = () => {
    const image = webcamRef.current?.getScreenshot()
    if (!image) {
      setCameraError('Camera capture failed. Allow camera access and try again.')
      return
    }
    setCameraError('')
    setCapturedImage(image)
    localStorage.setItem('candidate_photo_verified', 'true')
  }

  const handleRetake = () => {
    setCapturedImage('')
    setCameraError('')
    localStorage.removeItem('candidate_photo_verified')
  }

  const handleStartExam = async () => {
    setStartingExam(true)
    setActionError('')
    try {
      if (!localStorage.getItem('exam_answers')) {
        localStorage.setItem('exam_answers', JSON.stringify({}))
      }
      // Enter fullscreen directly on user gesture
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try { await document.documentElement.requestFullscreen() } catch {}
      }
      navigate('/test-structure')
    } catch (err) {
      setActionError('Unable to start. Please try again.')
    } finally {
      setStartingExam(false)
    }
  }

  const handleContinueExam = async () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try { await document.documentElement.requestFullscreen() } catch {}
    }
    navigate('/test-structure')
  }

  const handleLogout = () => { clearCandidateSession(); navigate('/') }

  const getDifficultyColor = (d) => {
    switch (d?.toLowerCase()) {
      case 'easy': return '#10b981'
      case 'medium': return '#f59e0b'
      case 'hard': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const renderLangBadge = (lang) => {
    const l = (lang || '').toLowerCase()
    if (l === 'python') return <span className="cd-lang python"><PythonIcon size={12} /> Python</span>
    if (l === 'sql') return <span className="cd-lang sql"><DatabaseIcon size={12} /> SQL</span>
    if (l === 'mcq') return <span className="cd-lang mcq"><ChecklistIcon size={12} /> MCQ</span>
    return <span className="cd-lang" style={{ background: '#8b5cf6', color: '#fff' }}><FiCode size={12} /> {l.toUpperCase()}</span>
  }

  // Dynamic breakdown of languages present in questions
  const languageStats = useMemo(() => {
    const problems = examSummary?.problems || []
    const counts = {}
    problems.forEach((p) => {
      const lang = (p.language || 'python').toLowerCase()
      counts[lang] = (counts[lang] || 0) + 1
    })
    return counts
  }, [examSummary])

  if (loading) return <Spinner label="Loading exam data…" size={40} fullPage />

  const photoReady = !!capturedImage || examStarted

  return (
    <div className="cd-page">
      <header className="cd-header">
        <PlatformLogoSmall />
        <div className="cd-header-right">
          <ThemeToggle />
          <div className="cd-user">
            <div className="cd-avatar">{userName.charAt(0).toUpperCase()}</div>
            <span>{userName}</span>
          </div>
          <button onClick={handleLogout} className="cd-btn-logout">Logout</button>
        </div>
      </header>

      <div className="cd-body">
        <div className="cd-main">
          {/* Dynamic Stats Row */}
          <div className="cd-stats">
            <div className="cd-stat">
              <ClockIcon size={18} />
              <div>
                <span className="cd-stat-val">
                  {examSummary?.total_duration_minutes ? `${examSummary.total_duration_minutes} min` : '60 min'}
                </span>
                <span className="cd-stat-lbl">Duration</span>
              </div>
            </div>
            <div className="cd-stat">
              <ChecklistIcon size={18} />
              <div>
                <span className="cd-stat-val">{examSummary?.total_questions || (examSummary?.problems?.length || 0)}</span>
                <span className="cd-stat-lbl">Questions</span>
              </div>
            </div>

            {Object.keys(languageStats).length > 0 ? (
              Object.entries(languageStats).map(([lang, count]) => (
                <div key={lang} className="cd-stat">
                  {lang === 'python' && <PythonIcon size={18} />}
                  {lang === 'sql' && <DatabaseIcon size={18} />}
                  {lang === 'mcq' && <ChecklistIcon size={18} />}
                  {!['python', 'sql', 'mcq'].includes(lang) && <FiCode size={18} style={{ color: '#8b5cf6' }} />}
                  <div>
                    <span className="cd-stat-val">{count}</span>
                    <span className="cd-stat-lbl">{lang.toUpperCase()}</span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="cd-stat">
                  <PythonIcon size={18} />
                  <div>
                    <span className="cd-stat-val">{examSummary?.python_questions || 0}</span>
                    <span className="cd-stat-lbl">Python</span>
                  </div>
                </div>
                <div className="cd-stat">
                  <DatabaseIcon size={18} />
                  <div>
                    <span className="cd-stat-val">{examSummary?.sql_questions || 0}</span>
                    <span className="cd-stat-lbl">SQL</span>
                  </div>
                </div>
                <div className="cd-stat">
                  <ChecklistIcon size={18} />
                  <div>
                    <span className="cd-stat-val">{examSummary?.mcq_questions || 0}</span>
                    <span className="cd-stat-lbl">MCQ</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Current Professional AI Proctoring Rules */}
          <div className="cd-rules">
            <h4>Assessment Guidelines & Security Rules</h4>
            <div className="cd-rule">
              <FiEye size={16} />
              <span><b>AI Vision Proctoring:</b> Continuous automated monitoring for candidate face visibility, multi-person detection, mobile phones, and external aids via sequential Groq AI models.</span>
            </div>
            <div className="cd-rule">
              <FiMonitor size={16} />
              <span><b>Fullscreen Security:</b> The assessment must remain in locked fullscreen mode throughout. Tab switching or exiting fullscreen logs a fraud infraction.</span>
            </div>
            <div className="cd-rule">
              <FiLock size={16} />
              <span><b>Screen Content Protection:</b> Screenshots, Snipping Tool, PrintScreen, DevTools, and shortcut keys are strictly blocked and screen content is automatically blurred.</span>
            </div>
            <div className="cd-rule">
              <FiClock size={16} />
              <span><b>Timed Auto-Submission:</b> When the {examSummary?.total_duration_minutes || 60}-minute exam timer reaches zero or upon manual completion, your assessment is automatically submitted.</span>
            </div>
          </div>

          {/* Questions Table */}
          {examSummary?.problems?.length > 0 && (
            <div className="cd-table-wrap">
              <h4>Assigned Questions Overview</h4>
              <table className="cd-table">
                <thead>
                  <tr><th>Title</th><th>Type</th><th>Level</th><th>Time Limit</th><th>Marks</th></tr>
                </thead>
                <tbody>
                  {examSummary.problems.map((p) => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{renderLangBadge(p.language)}</td>
                      <td><span className="cd-diff" style={{ background: getDifficultyColor(p.difficulty) }}>{p.difficulty}</span></td>
                      <td><span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #94a3b8)' }}>{formatTimeWithLabel(p.time_limit, p.language !== 'mcq')}</span></td>
                      <td><strong>{p.marks}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel — Photo Capture */}
        <div className="cd-side">
          <div className="cd-photo-card">
            <h4><FiShield size={16} /> Identity Verification</h4>
            <p className="cd-photo-hint">Capture your photo before starting the exam.</p>

            <div className="cd-cam-stage">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="cd-cam-img" />
              ) : (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  videoConstraints={webcamConstraints}
                  className="cd-cam-feed"
                  onUserMediaError={() => setCameraError('Camera access denied. Allow permission and reload.')}
                />
              )}
            </div>

            {cameraError && <div className="cd-cam-error">{cameraError}</div>}

            <div className="cd-cam-actions">
              {capturedImage ? (
                <button className="cd-btn-retake" onClick={handleRetake}><FiRefreshCw size={14} /> Retake</button>
              ) : (
                <button className="cd-btn-capture" onClick={handleCapture}><FiCamera size={14} /> Capture Photo</button>
              )}
            </div>
          </div>

          {/* Start Button */}
          <div className="cd-action">
            {examStarted ? (
              <button onClick={handleContinueExam} className="cd-btn-start" disabled={startingExam}>
                {startingExam ? 'Opening...' : 'Resume Test'}
              </button>
            ) : (
              <button
                onClick={handleStartExam}
                className="cd-btn-start"
                disabled={!photoReady || startingExam}
              >
                {startingExam ? 'Starting...' : 'Start Test'}
              </button>
            )}
            {!photoReady && !examStarted && (
              <p className="cd-action-hint">Capture your photo to enable</p>
            )}
            {actionError && <div className="cd-action-error">{actionError}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboard