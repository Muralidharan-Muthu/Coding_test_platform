import React, { useState, useEffect } from 'react'
import { ProctoringProvider } from './ProctoringProvider'
import { useProctoring } from './useProctoring'
import { CameraPreview } from './CameraPreview'
import { ProctoringStatus } from './ProctoringStatus'
import { FiLock, FiMaximize, FiAlertTriangle } from 'react-icons/fi'
import './ExamProctoringShell.css'

function FullscreenLockOverlay() {
  const proctoring = useProctoring()
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement)
      setIsFullscreen(active)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  const handleReenterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen()
      }
    } catch (err) {
      console.error('Failed to enter fullscreen:', err)
    }
  }

  if (isFullscreen) return null

  return (
    <div className="eps-lock-overlay" role="dialog" aria-modal="true">
      <div className="eps-lock-modal">
        <div className="eps-lock-icon">
          <FiLock size={48} />
        </div>
        <h2>Fullscreen Lockdown Required</h2>
        <p>
          You have exited fullscreen mode. For exam security and integrity, you must remain in fullscreen mode while taking the assessment.
        </p>
        <div className="eps-warning-box">
          <FiAlertTriangle size={18} />
          <span>Exiting fullscreen mode is recorded as a proctoring security violation.</span>
        </div>
        <button onClick={handleReenterFullscreen} className="eps-btn-reenter">
          <FiMaximize size={18} /> Re-enter Fullscreen Mode
        </button>
      </div>
    </div>
  )
}

export function ExamProctoringShell({ children }) {
  const sessionId = localStorage.getItem('session_id') || 'session_default'
  const candidateId = localStorage.getItem('user_id') || localStorage.getItem('user_name') || 'candidate_default'

  return (
    <ProctoringProvider testId={sessionId} candidateId={candidateId} enabled={true}>
      <div className="exam-proctoring-shell">
        <div className="eps-top-bar">
          <ProctoringStatus />
        </div>
        {children}
        <CameraPreview position="bottom-right" size="small" collapsible />
        <FullscreenLockOverlay />
      </div>
    </ProctoringProvider>
  )
}

export default ExamProctoringShell
