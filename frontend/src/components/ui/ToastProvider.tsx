import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

interface ToastItem {
  id: number
  variant: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration: number
}

interface ToastContextValue {
  show: (message: string, options?: { variant?: ToastItem['variant']; title?: string; duration?: number }) => number
  success: (message: string, title?: string) => number
  error: (message: string, title?: string) => number
  warning: (message: string, title?: string) => number
  info: (message: string, title?: string) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DEFAULT_DURATION = 4500
const ERROR_DURATION = 6500
const MAX_VISIBLE = 4

let nextId = 0

const ICONS = {
  success: (
    <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<number | null>(null)
  const remainingRef = useRef(toast.duration)
  const startedRef = useRef(0)

  const beginExit = useCallback(() => {
    setLeaving(true)
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

  const variantStyles = {
    success: 'bg-emerald-950/90 text-emerald-100 border-emerald-800/80 shadow-emerald-950/40',
    error: 'bg-rose-950/90 text-rose-100 border-rose-800/80 shadow-rose-950/40',
    warning: 'bg-amber-950/90 text-amber-100 border-amber-800/80 shadow-amber-950/40',
    info: 'bg-slate-900/95 text-slate-100 border-slate-700/80 shadow-slate-950/40',
  }[toast.variant]

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 ${variantStyles} ${
        leaving ? 'opacity-0 translate-y-2 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
      role={isError ? 'alert' : 'status'}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
    >
      <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {ICONS[toast.variant] || ICONS.info}
      </span>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-xs font-bold leading-tight mb-0.5">{toast.title}</p>}
        <p className="text-xs leading-normal opacity-95 break-words">{toast.message}</p>
      </div>
      <button
        type="button"
        className="p-1 rounded-md opacity-60 hover:opacity-100 transition cursor-pointer text-current flex-shrink-0"
        onClick={beginExit}
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((message: string, options: { variant?: ToastItem['variant']; title?: string; duration?: number } = {}) => {
    const id = ++nextId
    const variant = options.variant || 'info'
    const duration = options.duration ?? (variant === 'error' ? ERROR_DURATION : DEFAULT_DURATION)

    const newToast: ToastItem = {
      id,
      variant,
      title: options.title,
      message,
      duration,
    }

    setToasts(prev => {
      const next = [...prev, newToast]
      if (next.length > MAX_VISIBLE) {
        return next.slice(next.length - MAX_VISIBLE)
      }
      return next
    })

    return id
  }, [])

  const success = useCallback((msg: string, title?: string) => show(msg, { variant: 'success', title }), [show])
  const error = useCallback((msg: string, title?: string) => show(msg, { variant: 'error', title }), [show])
  const warning = useCallback((msg: string, title?: string) => show(msg, { variant: 'warning', title }), [show])
  const info = useCallback((msg: string, title?: string) => show(msg, { variant: 'info', title }), [show])

  const value = useMemo(
    () => ({ show, success, error, warning, info, dismiss }),
    [show, success, error, warning, info, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
