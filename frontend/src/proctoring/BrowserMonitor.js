/**
 * BrowserMonitor.js
 * 
 * Monitors browser-level events that indicate potential exam integrity issues:
 * - Tab visibility changes
 * - Window blur/focus
 * - Fullscreen exit
 * - Clipboard operations (copy/cut/paste)
 * - Context menu
 * - Suspicious keyboard shortcuts (DevTools, Alt+Tab)
 */

import { EVENT_SEVERITY_MAP } from './ProctoringConfig'

/** @typedef {import('./ProctoringTypes').ProctoringEvent} ProctoringEvent */
/** @typedef {import('./ProctoringTypes').ProctoringEventType} ProctoringEventType */

export class BrowserMonitor {
  /** @type {((event: ProctoringEvent) => void)|null} */
  #onEvent = null
  /** @type {AbortController|null} */
  #abortController = null
  /** @type {boolean} */
  #isRunning = false
  /** @type {boolean} */
  #isFullscreen = false
  /** @type {string|null} Selector for the code editor container to exempt from clipboard blocking */
  #editorSelector = null

  /**
   * @param {object} [options]
   * @param {string} [options.editorSelector] - CSS selector for Monaco editor container
   */
  constructor(options = {}) {
    this.#editorSelector = options.editorSelector || '.monaco-editor'
  }

  /**
   * Register event callback.
   * @param {(event: ProctoringEvent) => void} callback
   */
  onEvent(callback) {
    this.#onEvent = callback
  }

  /**
   * Start monitoring browser events.
   */
  start() {
    if (this.#isRunning) return
    this.#isRunning = true
    this.#isFullscreen = Boolean(document.fullscreenElement)
    this.#abortController = new AbortController()
    const signal = this.#abortController.signal

    // Tab visibility
    document.addEventListener('visibilitychange', this.#handleVisibility, { signal })

    // Window focus
    window.addEventListener('blur', this.#handleWindowBlur, { signal })
    window.addEventListener('focus', this.#handleWindowFocus, { signal })

    // Fullscreen
    document.addEventListener('fullscreenchange', this.#handleFullscreen, { signal })

    // Clipboard (capture phase to intercept before editors)
    document.addEventListener('copy', this.#handleCopy, { capture: true, signal })
    document.addEventListener('cut', this.#handleCut, { capture: true, signal })
    document.addEventListener('paste', this.#handlePaste, { capture: true, signal })

    // Context menu
    document.addEventListener('contextmenu', this.#handleContextMenu, { capture: true, signal })

    // Keyboard shortcuts
    document.addEventListener('keydown', this.#handleKeyDown, { capture: true, signal })
  }

  /**
   * Stop monitoring and remove all listeners.
   */
  stop() {
    if (!this.#isRunning) return
    this.#isRunning = false
    if (this.#abortController) {
      this.#abortController.abort()
      this.#abortController = null
    }
  }

  /**
   * Current fullscreen state.
   * @returns {boolean}
   */
  get isFullscreen() {
    return this.#isFullscreen
  }

  // ── Private event handlers ──────────────────────────────────────

  /**
   * @param {ProctoringEventType} type
   * @param {string} [message]
   * @param {Record<string, unknown>} [metadata]
   */
  #emit(type, message = '', metadata = {}) {
    if (!this.#onEvent) return
    this.#onEvent({
      type,
      timestamp: Date.now(),
      severity: EVENT_SEVERITY_MAP[type] || 'MEDIUM',
      metadata: { message, ...metadata },
    })
  }

  /**
   * Check if an event target is inside the Monaco editor.
   * Clipboard events inside the editor are logged but not prevented.
   * @param {Event} event
   * @returns {boolean}
   */
  #isInsideEditor(event) {
    if (!this.#editorSelector) return false
    const target = /** @type {Element|null} */ (event.target)
    return target?.closest?.(this.#editorSelector) !== null
  }

  #handleVisibility = () => {
    if (document.hidden) {
      this.#emit('TAB_SWITCH', 'Tab switch detected. Candidate left the exam tab.')
    }
  }

  #handleWindowBlur = () => {
    this.#emit('WINDOW_BLUR', 'Window lost focus.')
  }

  #handleWindowFocus = () => {
    // Informational only — low severity, tracked but typically not scored
    this.#emit('WINDOW_FOCUS', 'Window regained focus.')
  }

  #handleFullscreen = () => {
    const wasFullscreen = this.#isFullscreen
    this.#isFullscreen = Boolean(document.fullscreenElement)

    if (wasFullscreen && !this.#isFullscreen) {
      this.#emit('FULLSCREEN_EXIT', 'Fullscreen mode was exited during the exam.')
    }
  }

  /**
   * @param {ClipboardEvent} event
   */
  #handleCopy = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
      event.stopPropagation()
    }
    this.#emit('COPY', 'Copy attempt detected.', { insideEditor })
  }

  /**
   * @param {ClipboardEvent} event
   */
  #handleCut = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
      event.stopPropagation()
    }
    this.#emit('CUT', 'Cut attempt detected.', { insideEditor })
  }

  /**
   * @param {ClipboardEvent} event
   */
  #handlePaste = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
      event.stopPropagation()
    }
    this.#emit('PASTE', 'Paste attempt detected.', { insideEditor })
  }

  /**
   * @param {MouseEvent} event
   */
  #handleContextMenu = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
    }
    this.#emit('CONTEXT_MENU', 'Right-click context menu attempt.', { insideEditor })
  }

  /**
   * @param {KeyboardEvent} event
   */
  #handleKeyDown = (event) => {
    const key = event.key?.toLowerCase()
    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey

    // F12 — DevTools
    if (event.key === 'F12') {
      event.preventDefault()
      this.#emit('DEVTOOLS_ATTEMPT', 'F12 (DevTools) key detected.')
      return
    }

    // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C — DevTools
    if (ctrl && shift && (key === 'i' || key === 'j' || key === 'c')) {
      event.preventDefault()
      this.#emit('DEVTOOLS_ATTEMPT', `Ctrl+Shift+${key.toUpperCase()} (DevTools) shortcut detected.`)
      return
    }

    // Ctrl+C/X/V outside editor — clipboard shortcuts
    if (ctrl && !shift && !this.#isInsideEditor(event)) {
      if (key === 'c') {
        event.preventDefault()
        this.#emit('COPY', 'Ctrl+C detected outside code editor.')
      } else if (key === 'x') {
        event.preventDefault()
        this.#emit('CUT', 'Ctrl+X detected outside code editor.')
      } else if (key === 'v') {
        event.preventDefault()
        this.#emit('PASTE', 'Ctrl+V detected outside code editor.')
      }
    }
  }
}

