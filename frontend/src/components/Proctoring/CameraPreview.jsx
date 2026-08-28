import { useEffect, useRef, useState, useCallback } from 'react'
import { useProctoring } from './useProctoring'

export function CameraPreview() {
  const proctoring = useProctoring()
  const videoContainerRef = useRef(null)
  const [pos, setPos] = useState({ x: window.innerWidth - 146, y: window.innerHeight - 126 })
  const dragRef = useRef(null)

  // Attach video element
  useEffect(() => {
    const container = videoContainerRef.current
    const video = proctoring?.videoElement
    if (!container || !video) return

    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'cover'
    video.style.borderRadius = '8px'
    video.style.transform = 'scaleX(-1)'

    if (video.parentElement !== container) {
      container.innerHTML = ''
      container.appendChild(video)
    }
  }, [proctoring?.videoElement])

  // Drag
  const onDown = useCallback((e) => {
    const pt = 'touches' in e ? e.touches[0] : e
    dragRef.current = { sx: pt.clientX, sy: pt.clientY, ox: pos.x, oy: pos.y }
  }, [pos])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      const pt = 'touches' in e ? e.touches[0] : e
      setPos({
        x: Math.min(Math.max(0, dragRef.current.ox + (pt.clientX - dragRef.current.sx)), window.innerWidth - 130),
        y: Math.min(Math.max(0, dragRef.current.oy + (pt.clientY - dragRef.current.sy)), window.innerHeight - 110),
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

  const borderColor = proctoring.faceCount === 1 ? '#10b981' : proctoring.faceCount === 0 ? '#ef4444' : '#f59e0b'

  return (
    <div
      onMouseDown={onDown}
      onTouchStart={onDown}
      style={{
        position: 'fixed',
        left: pos.x + 'px',
        top: pos.y + 'px',
        width: '120px',
        height: '90px',
        zIndex: 850,
        borderRadius: '10px',
        border: '2px solid ' + borderColor,
        overflow: 'hidden',
        cursor: 'grab',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        background: '#000',
        transition: 'border-color 0.3s ease',
      }}
    >
      <div ref={videoContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}