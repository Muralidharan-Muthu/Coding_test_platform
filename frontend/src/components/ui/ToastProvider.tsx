import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

const DEFAULT_DURATION = 4500
const ERROR_DURATION = 6500
// Errors are worth reading; keep more of them on screen than passing successes.
const MAX_VISIBLE = 4

let nextId = 0

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

function Toast({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef(null)
  const remainingRef = useRef(toast.duration)
  const startedRef = useRef(0)

  const beginExit = useCallback(() => {
    setLeaving(true)
    // Matches the .toast--leaving animation; the toast is removed from state
    // after it finishes so the exit is actually visible.
    window.setTimeout(() => onDismiss(toast.id), 180)
  }, [onDismiss, toast.id])

  const resume = useCallback(() => {
    if (toast.duration === Infinity) return
    startedRef.current = Date.now()
    timerRef.current = window.setTimeout(beginExit, remainingRef.current)
  }, [beginExit, toast.duration])

  const pause = useCallback(() => {
    if (timerRef.current === null) return
    window.clearTimeout(timerRef.current)
    timerRef.current = null
    remainingRef.current -= Date.now() - startedRef.current
  }, [])

  useEffect(() => {
    resume()
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [resume])

  const isError = toast.variant === 'error'

  return (
    <div
      className={`toast toast--${toast.variant}${leaving ? ' toast--leaving' : ''}`}
      role={isError ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span className="toast-icon" aria-hidden="true">
        {ICONS[toast.variant] || ICONS.info}
      </span>
      <div className="toast-body">
        {toast.title && <p className="toast-title">{toast.title}</p>}
        <p className="toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={beginExit}
        aria-label="Dismiss notification"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, options = {}) => {
    // Ignore empty calls so `showToast(err.response?.data?.detail)` can't
    // produce a blank toast when the field is missing.
    if (message === null || message === undefined || message === '') return null

    const variant = options.variant || 'info'
    const id = ++nextId

    setToasts((current) => {
      const next = [...current, {
        id,
        message: String(message),
        title: options.title || '',
        variant,
        duration: options.duration
          ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION),
      }]
      // Drop the oldest so a burst of failures can't bury the screen.
      return next.slice(-MAX_VISIBLE)
    })

    return id
  }, [])

  const api = useMemo(() => ({
    toast: push,
    dismiss,
    success: (message, options) => push(message, { ...options, variant: 'success' }),
    error: (message, options) => push(message, { ...options, variant: 'error' }),
    warning: (message, options) => push(message, { ...options, variant: 'warning' }),
    info: (message, options) => push(message, { ...options, variant: 'info' }),
  }), [push, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used inside a <ToastProvider>')
  }
  return ctx
}

export default ToastProvider
