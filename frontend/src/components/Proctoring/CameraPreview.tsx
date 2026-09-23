import { useEffect, useRef, useState, useCallback } from 'react'
import { useProctoring } from './useProctoring'
import { FiCpu, FiEye, FiAlertTriangle } from 'react-icons/fi'

export function CameraPreview({ aiStatus = 'clean', aiReason = '', riskScore = 0 }) {
  const proctoring = useProctoring()
  const videoContainerRef = useRef(null)
  const [pos, setPos] = useState({ x: window.innerWidth - 170, y: window.innerHeight - 150 })
  const dragRef = useRef(null)

  // Attach video element from the proctoring engine
  useEffect(() => {
    const container = videoContainerRef.current
    const video = proctoring?.videoElement
    if (!container || !video) return

    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'cover'
    video.style.borderRadius = '10px'
    video.style.transform = 'scaleX(-1)'

    if (video.parentElement !== container) {
      container.innerHTML = ''
      container.appendChild(video)
    }
  }, [proctoring?.videoElement])

  // Draggable window handlers
  const onDown = useCallback((e) => {
    const pt = 'touches' in e ? e.touches[0] : e
    dragRef.current = { sx: pt.clientX, sy: pt.clientY, ox: pos.x, oy: pos.y }
  }, [pos])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      const pt = 'touches' in e ? e.touches[0] : e
      setPos({
        x: Math.min(Math.max(10, dragRef.current.ox + (pt.clientX - dragRef.current.sx)), window.innerWidth - 170),
        y: Math.min(Math.max(10, dragRef.current.oy + (pt.clientY - dragRef.current.sy)), window.innerHeight - 150),
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  if (!proctoring || proctoring.status === 'idle' || proctoring.status === 'stopped') return null

  // Border & status color based on AI fraud detection & face presence
  let borderColor = '#10b981' // Clean green
  if (aiStatus === 'critical' || proctoring.faceCount === 0 || riskScore >= 80) {
    borderColor = '#ef4444' // Critical red
  } else if (aiStatus === 'warning' || proctoring.faceCount > 1 || riskScore >= 40) {
    borderColor = '#f59e0b' // Warning amber
  } else if (aiStatus === 'scanning') {
    borderColor = '#3b82f6' // Scanning blue
  }

  const aiBadgeLabel =
    aiStatus === 'scanning' ? 'AI Scanning…' :
    aiStatus === 'critical' ? `AI Alert (${riskScore})` :
    aiStatus === 'warning' ? `AI Flag (${riskScore})` :
    'AI Verified'

  return (
    <div
      onMouseDown={onDown}
      onTouchStart={onDown}
      title={aiReason ? `AI Proctor: ${aiReason}` : 'Camera actively verified by AI proctoring tool'}
      style={{
        position: 'fixed',
        left: pos.x + 'px',
        top: pos.y + 'px',
        width: '150px',
        height: '115px',
        zIndex: 850,
        borderRadius: '12px',
        border: '2px solid ' + borderColor,
        overflow: 'hidden',
        cursor: 'grab',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        background: '#090d16',
        transition: 'border-color 0.3s ease',
        userSelect: 'none',
      }}
    >
      {/* Video stream container */}
      <div ref={videoContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Top AI Live Badge */}
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 6px',
        borderRadius: '6px',
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(4px)',
        fontSize: '9.5px',
        fontWeight: 800,
        color: borderColor,
        letterSpacing: '0.02em',
        pointerEvents: 'none',
      }}>
        <span style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: borderColor,
          boxShadow: `0 0 5px ${borderColor}`,
        }} />
        {aiBadgeLabel}
      </div>

      {/* Bottom Status Bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '3px 6px',
        background: 'linear-gradient(transparent, rgba(15, 23, 42, 0.95))',
        fontSize: '9px',
        fontWeight: 600,
        color: '#e2e8f0',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        textAlign: 'center',
        pointerEvents: 'none',
      }}>
        {aiReason || (proctoring.faceCount === 1 ? 'Candidate verified' : 'No face in frame')}
      </div>
    </div>
  )
}