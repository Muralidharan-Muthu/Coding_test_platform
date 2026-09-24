import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { FiAlertTriangle, FiTrash2, FiInfo } from 'react-icons/fi'

interface ConfirmOptions {
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setDialogState({
        title: options.title || 'Are you sure?',
        message: options.message || 'Please confirm this action.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger',
      })
    })
  }, [])

  const handleClose = useCallback((result: boolean) => {
    if (resolveRef.current) {
      resolveRef.current(result)
      resolveRef.current = null
    }
    setDialogState(null)
  }, [])

  useEffect(() => {
    if (!dialogState) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose(false)
      } else if (e.key === 'Enter') {
        handleClose(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogState, handleClose])

  const renderIcon = (type = 'danger') => {
    if (type === 'danger') return <FiTrash2 size={24} className="text-rose-500" />
    if (type === 'warning') return <FiAlertTriangle size={24} className="text-amber-500" />
    return <FiInfo size={24} className="text-[#ffa116]" />
  }

  const getIconBg = (type = 'danger') => {
    if (type === 'danger') return 'bg-rose-500/10'
    if (type === 'warning') return 'bg-amber-500/10'
    return 'bg-[#ffa116]/10'
  }

  const getConfirmBtnClass = (type = 'danger') => {
    if (type === 'danger') return 'bg-rose-600 hover:bg-rose-700 text-white'
    if (type === 'warning') return 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
    return 'bg-[#ffa116] hover:bg-[#e88f0a] text-slate-900 font-bold'
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          onClick={() => handleClose(false)}
        >
          <div
            className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#3e3e3e] rounded-2xl p-6 shadow-2xl max-w-md w-full space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getIconBg(dialogState.type)}`}>
              {renderIcon(dialogState.type)}
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#eff1f6]">
                {dialogState.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#b0b0b0] leading-relaxed">
                {dialogState.message}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#eff1f6] bg-slate-100 hover:bg-slate-200 dark:bg-[#333333] dark:hover:bg-[#3e3e3e] rounded-xl transition cursor-pointer"
                onClick={() => handleClose(false)}
                autoFocus
              >
                {dialogState.cancelText}
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${getConfirmBtnClass(dialogState.type)}`}
                onClick={() => handleClose(true)}
              >
                {dialogState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

export default ConfirmProvider