import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { FiAlertTriangle, FiTrash2, FiInfo } from 'react-icons/fi'
import './ConfirmDialog.css'

const ConfirmContext = createContext(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setDialogState({
        title: options.title || 'Are you sure?',
        message: options.message || 'Please confirm this action.',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger', // 'danger' | 'warning' | 'info'
      })
    })
  }, [])

  const handleClose = useCallback((result) => {
    if (resolveRef.current) {
      resolveRef.current(result)
      resolveRef.current = null
    }
    setDialogState(null)
  }, [])

  // Keyboard navigation (Escape to cancel, Enter to confirm)
  useEffect(() => {
    if (!dialogState) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose(false)
      } else if (e.key === 'Enter') {
        handleClose(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dialogState, handleClose])

  const renderIcon = (type) => {
    if (type === 'danger') return <FiTrash2 size={24} />
    if (type === 'warning') return <FiAlertTriangle size={24} />
    return <FiInfo size={24} />
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState && (
        <div className="confirm-dialog-backdrop" onClick={() => handleClose(false)}>
          <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className={`confirm-dialog-icon-wrap ${dialogState.type}`}>
              {renderIcon(dialogState.type)}
            </div>
            <h3 className="confirm-dialog-title">{dialogState.title}</h3>
            <p className="confirm-dialog-message">{dialogState.message}</p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="confirm-dialog-btn-cancel"
                onClick={() => handleClose(false)}
                autoFocus
              >
                {dialogState.cancelText}
              </button>
              <button
                type="button"
                className={`confirm-dialog-btn-confirm ${dialogState.type}`}
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