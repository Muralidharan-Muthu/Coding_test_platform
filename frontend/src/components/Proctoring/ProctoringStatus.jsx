/**
 * ProctoringStatus.jsx
 * 
 * Top-bar proctoring indicator showing:
 * - Recording dot
 * - Camera status
 * - Face detection status
 * - Fullscreen status
 */

import { FiAlertTriangle, FiCamera, FiCheck, FiMaximize2, FiMinus, FiSquare, FiVideoOff } from 'react-icons/fi'
import { useProctoring } from './useProctoring'

export function ProctoringStatus() {
  const proctoring = useProctoring()

  if (!proctoring || proctoring.status === 'idle' || proctoring.status === 'stopped') {
    return null
  }

  const isActive = proctoring.status === 'active'
  const isError = proctoring.status === 'error'
  const faceOk = proctoring.faceCount === 1
  const faceWarning = proctoring.faceCount === 0
  const faceMultiple = proctoring.faceCount > 1

  return (
    <div className="proctoring-status-bar" role="status" aria-live="polite">
      {/* Recording indicator */}
      <div className="proctoring-status-item">
        <span
          className={`proctoring-status-dot ${isActive ? 'active' : isError ? 'error' : 'loading'}`}
          aria-hidden="true"
        />
        <span className="proctoring-status-label">
          {isActive ? 'Proctoring Active' : isError ? 'Proctoring Error' : 'Starting...'}
        </span>
      </div>

      {/* Camera */}
      <div className="proctoring-status-item">
        <span className="proctoring-status-icon">
          {proctoring.cameraEnabled ? <FiCamera /> : <FiVideoOff />}
        </span>
        <span className="proctoring-status-label">
          Camera: {proctoring.cameraEnabled ? 'OK' : 'Off'}
        </span>
      </div>

      {/* Face */}
      {isActive && (
        <div className="proctoring-status-item">
          <span className="proctoring-status-icon">
            {faceOk ? <FiCheck /> : faceWarning ? <FiAlertTriangle /> : faceMultiple ? <FiAlertTriangle /> : <FiMinus />}
          </span>
          <span className={`proctoring-status-label ${faceOk ? 'ok' : 'warn'}`}>
            Face: {faceOk ? 'Detected' : faceWarning ? 'Not Found' : `${proctoring.faceCount} Detected`}
          </span>
        </div>
      )}

      {/* Fullscreen */}
      <div className="proctoring-status-item">
        <span className="proctoring-status-icon">
          {proctoring.isFullscreen ? <FiMaximize2 /> : <FiSquare />}
        </span>
        <span className="proctoring-status-label">
          Fullscreen: {proctoring.isFullscreen ? 'Active' : 'Inactive'}
        </span>
      </div>
    </div>
  )
}
