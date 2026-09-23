import { FiCamera, FiCheck, FiAlertTriangle, FiVideoOff, FiCpu } from 'react-icons/fi'
import { useProctoring } from './useProctoring'

export function ProctoringStatus({ aiStatus = 'clean', riskScore = 0 }) {
  const proctoring = useProctoring()
  if (!proctoring || proctoring.status === 'idle' || proctoring.status === 'stopped') return null

  const isActive = proctoring.status === 'active'
  const faceOk = proctoring.faceCount === 1

  const aiColor =
    aiStatus === 'critical' ? '#ef4444' :
    aiStatus === 'warning' ? '#f59e0b' :
    aiStatus === 'scanning' ? '#3b82f6' :
    '#10b981'

  const aiText =
    aiStatus === 'scanning' ? 'AI: Scanning…' :
    aiStatus === 'critical' ? `AI: Risk ${riskScore}` :
    aiStatus === 'warning' ? `AI: Risk ${riskScore}` :
    'AI: Verified'

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 850,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '4px 14px',
      borderRadius: '0 0 10px 10px',
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderTop: 'none',
      fontSize: '11px',
      fontWeight: 600,
      color: 'var(--color-text-muted)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: isActive ? '#10b981' : '#f59e0b',
          boxShadow: isActive ? '0 0 6px #10b981' : 'none',
        }} />
        {isActive ? 'Proctoring' : 'Starting...'}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        {proctoring.cameraEnabled ? <FiCamera size={11} /> : <FiVideoOff size={11} />}
        {proctoring.cameraEnabled ? 'Cam OK' : 'Cam Off'}
      </span>
      {isActive && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: faceOk ? '#10b981' : '#ef4444' }}>
          {faceOk ? <FiCheck size={11} /> : <FiAlertTriangle size={11} />}
          {faceOk ? 'Face OK' : 'No Face'}
        </span>
      )}
      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: aiColor }}>
        <FiCpu size={11} />
        {aiText}
      </span>
    </div>
  )
}