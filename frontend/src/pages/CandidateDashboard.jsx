import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { getExamStatus, getExamSummary } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import { PlatformLogoSmall, ClockIcon, ChecklistIcon, PythonIcon, DatabaseIcon } from '../components/ui/Branding'
import Spinner from '../components/ui/Spinner'
import { clearCandidateSession } from '../utils/sessionStorage'
import { FiCamera, FiShield, FiMonitor, FiAlertTriangle, FiClock, FiRefreshCw } from 'react-icons/fi'
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

  const handleStartExam = () => {
    setStartingExam(true)
    setActionError('')
    try {
      if (!localStorage.getItem('exam_answers')) {
        localStorage.setItem('exam_answers', JSON.stringify({}))
      }
      navigate('/test-structure')
    } catch (err) {
      setActionError('Unable to start. Please try again.')
    } finally {
      setStartingExam(false)
    }
  }

  const handleContinueExam = () => navigate('/test-structure')
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
    if (lang === 'python') return <span className="cd-lang python"><PythonIcon size={12} /> Python</span>
    if (lang === 'sql') return <span className="cd-lang sql"><DatabaseIcon size={12} /> SQL</span>
    return <span className="cd-lang mcq"><ChecklistIcon size={12} /> MCQ</span>
  }

  if (loading) return <Spinner label="Loading..." size={40} fullPage />

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
          {/* Stats Row */}
          <div className="cd-stats">
            <div className="cd-stat">
              <ClockIcon size={18} />
              <div>
                <span className="cd-stat-val">150 min</span>
                <span className="cd-stat-lbl">Duration</span>
              </div>
            </div>
            <div className="cd-stat">
              <ChecklistIcon size={18} />
              <div>
                <span className="cd-stat-val">{examSummary?.total_questions || 0}</span>
                <span className="cd-stat-lbl">Questions</span>
              </div>
            </div>
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
          </div>

          {/* Rules */}
          <div className="cd-rules">
            <h4>Exam Rules</h4>
            <div className="cd-rule"><FiCamera size={16} /><span><b>Camera:</b> Stay visible. 5s absence = lose 1 of 3 lives.</span></div>
            <div className="cd-rule"><FiMonitor size={16} /><span><b>Fullscreen:</b> Must stay in fullscreen throughout the test.</span></div>
            <div className="cd-rule"><FiAlertTriangle size={16} /><span><b>Shortcuts:</b> PrintScreen, DevTools, Alt+Tab = 60s penalty each.</span></div>
            <div className="cd-rule"><FiClock size={16} /><span><b>Auto-submit:</b> Timer runs out or 0 lives = exam submitted.</span></div>
          </div>

          {/* Questions Table */}
          {examSummary?.problems?.length > 0 && (
            <div className="cd-table-wrap">
              <h4>Questions</h4>
              <table className="cd-table">
                <thead>
                  <tr><th>Title</th><th>Type</th><th>Level</th><th>Marks</th></tr>
                </thead>
                <tbody>
                  {examSummary.problems.map((p) => (
                    <tr key={p.id}>
                      <td>{p.title}</td>
                      <td>{renderLangBadge(p.language)}</td>
                      <td><span className="cd-diff" style={{ background: getDifficultyColor(p.difficulty) }}>{p.difficulty}</span></td>
                      <td>{p.marks}</td>
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