/**
 * CameraPreview.jsx
 * 
 * Small draggable webcam overlay that shows the candidate's camera feed
 * and proctoring status during an exam.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useProctoring } from './useProctoring'

const DEFAULT_POSITION = { x: 16, y: 16 }

export function CameraPreview() {
  const proctoring = useProctoring()
  const [position, setPosition] = useState(DEFAULT_POSITION)
  const dragRef = useRef(null)
  const videoContainerRef = useRef(null)

  // Attach video element to container when available
  useEffect(() => {
    const container = videoContainerRef.current
    const video = proctoring?.videoElement
    if (!container || !video) return

    // Style the video element
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'cover'
    video.style.borderRadius = '8px'
    video.style.transform = 'scaleX(-1)' // Mirror

    // Only append if not already a child
    if (video.parentElement !== container) {
      container.innerHTML = ''
      container.appendChild(video)
    }

    return () => {
      // Don't remove video on cleanup — ProctoringEngine owns the element
    }
  }, [proctoring?.videoElement])

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    const isTouchEvent = 'touches' in e
    const point = isTouchEvent ? e.touches[0] : e
    dragRef.current = {
      startX: point.clientX,
      startY: point.clientY,
      originX: position.x,
      originY: position.y,
    }
  }, [position])

  useEffect(() => {
    const handleMove = (e) => {
      if (!dragRef.current) return
      const isTouchEvent = 'touches' in e
      const point = isTouchEvent ? e.touches[0] : e
      const maxX = Math.max(16, window.innerWidth - 176)
      const maxY = Math.max(16, window.innerHeight - 136)
      setPosition({
        x: Math.min(Math.max(16, dragRef.current.originX + (point.clientX - dragRef.current.startX)), maxX),
        y: Math.min(Math.max(16, dragRef.current.originY + (point.clientY - dragRef.current.startY)), maxY),
      })
    }

    const handleUp = () => { dragRef.current = null }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: true })
    window.addEventListener('touchend', handleUp)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [])

  if (!proctoring || proctoring.status === 'idle' || proctoring.status === 'stopped') {
    return null
  }

  const statusClass = proctoring.status === 'active'
    ? 'ready'
    : proctoring.status === 'error'
      ? 'error'
      : 'loading'

  return (
    <div
      className="proctoring-overlay"
      aria-live="polite"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Status HUD */}
      <div className="proctoring-hud">
        <span className={`proctoring-dot ${statusClass}`} aria-hidden="true" />
        <span className="proctoring-text">
          {proctoring.status === 'active' ? 'Proctoring active' :
           proctoring.status === 'initializing' ? 'Proctoring starting...' :
           proctoring.status === 'error' ? 'Proctoring error' : 'Proctoring'}
        </span>
      </div>

      {/* Camera Error */}
      {proctoring.cameraError && (
        <div className="proctoring-status-error" role="status">
          {proctoring.cameraError}
        </div>
      )}

      {/* Camera Preview */}
      <div className="webcam-preview" aria-label="Candidate webcam feed">
        <div
          className="webcam-drag-handle"
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          role="button"
          tabIndex={0}
          aria-label="Move camera preview"
        >
          Move Camera
        </div>
        <div ref={videoContainerRef} className="webcam-video-container" />
      </div>
    </div>
  )
}
