/**
 * BrowserMonitor.js
 * 
 * Monitors browser-level events that indicate potential exam integrity issues:
 * - Tab visibility changes
 * - Window blur/focus
 * - Fullscreen exit
 * - Clipboard operations (copy/cut/paste blocked)
 * - Text selection / Drag & drop blocked
 * - Context menu blocked
 * - Screenshot shortcuts (PrintScreen, Snipping tool, Alt+PrtScn, Win+Shift+S, Ctrl+P, Ctrl+S)
 * - DevTools blocked (F12, Ctrl+Shift+I/J/C)
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
    this.#editorSelector = options.editorSelector || '.monaco-editor, .custom-input-textarea, textarea, input'
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

    // Window focus / blur (Anti-Snip shield)
    window.addEventListener('blur', this.#handleWindowBlur, { signal })
    window.addEventListener('focus', this.#handleWindowFocus, { signal })

    // Fullscreen
    document.addEventListener('fullscreenchange', this.#handleFullscreen, { signal })

    // Clipboard (capture phase to intercept before anything else)
    document.addEventListener('copy', this.#handleCopy, { capture: true, signal })
    document.addEventListener('cut', this.#handleCut, { capture: true, signal })
    document.addEventListener('paste', this.#handlePaste, { capture: true, signal })

    // Selection & Dragging prevention on question text
    document.addEventListener('selectstart', this.#handleSelectStart, { capture: true, signal })
    document.addEventListener('dragstart', this.#handleDragStart, { capture: true, signal })

    // Context menu (right-click)
    document.addEventListener('contextmenu', this.#handleContextMenu, { capture: true, signal })

    // Keyboard shortcuts (DevTools, Screenshots, Print)
    document.addEventListener('keydown', this.#handleKeyDown, { capture: true, signal })
    window.addEventListener('keyup', this.#handleKeyUp, { capture: true, signal })
  }

  /**
   * Stop monitoring and remove all listeners.
   */
  stop() {
    if (!this.#isRunning) return
    this.#isRunning = false
    document.body.classList.remove('window-blurred')
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

  /**
   * Clear OS clipboard
   */
  #clearClipboard() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {})
      }
    } catch {}
  }

  // ─── Private event handlers ──────────────────────────────────────────

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
      severity: EVENT_SEVERITY_MAP[type] || 'HIGH',
      metadata: { message, ...metadata },
    })
  }

  /**
   * Check if an event target is inside the Monaco editor or custom input.
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
      this.#clearClipboard()
      document.body.classList.add('window-blurred')
      this.#emit('TAB_SWITCH', 'Tab switch detected. Candidate left the exam tab.')
    } else {
      document.body.classList.remove('window-blurred')
    }
  }

  #handleWindowBlur = () => {
    this.#clearClipboard()
    document.body.classList.add('window-blurred')
    this.#emit('WINDOW_BLUR', 'Window lost focus. Anti-screenshot shield activated.')
  }

  #handleWindowFocus = () => {
    document.body.classList.remove('window-blurred')
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
   * Block text selection on question areas
   */
  #handleSelectStart = (event) => {
    if (!this.#isInsideEditor(event)) {
      event.preventDefault()
    }
  }

  /**
   * Block dragging text or images
   */
  #handleDragStart = (event) => {
    if (!this.#isInsideEditor(event)) {
      event.preventDefault()
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
      this.#clearClipboard()
      this.#emit('COPY', 'Copy attempt detected on question content.')
    }
  }

  /**
   * @param {ClipboardEvent} event
   */
  #handleCut = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
      event.stopPropagation()
      this.#clearClipboard()
      this.#emit('CUT', 'Cut attempt detected outside editor.')
    }
  }

  /**
   * @param {ClipboardEvent} event
   */
  #handlePaste = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('PASTE', 'Paste attempt detected outside editor.')
    }
  }

  /**
   * @param {MouseEvent} event
   */
  #handleContextMenu = (event) => {
    const insideEditor = this.#isInsideEditor(event)
    if (!insideEditor) {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('CONTEXT_MENU', 'Right-click context menu attempt.')
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  #handleKeyUp = (event) => {
    // Catch PrintScreen on keyup as well (some browsers fire keyup for PrtScn)
    if (event.key === 'PrintScreen' || event.keyCode === 44) {
      this.#clearClipboard()
      this.#emit('SCREENSHOT_ATTEMPT', 'PrintScreen key detected.')
    }
  }

  /**
   * @param {KeyboardEvent} event
   */
  #handleKeyDown = (event) => {
    const key = event.key?.toLowerCase()
    const ctrl = event.ctrlKey || event.metaKey
    const shift = event.shiftKey
    const alt = event.altKey

    // 1. PrintScreen key (any combination)
    if (event.key === 'PrintScreen' || event.keyCode === 44 || key === 'printscreen') {
      event.preventDefault()
      event.stopPropagation()
      this.#clearClipboard()
      this.#emit('SCREENSHOT_ATTEMPT', 'PrintScreen key screenshot attempt.')
      return
    }

    // 2. Windows Snipping Tool (Win + Shift + S) or Mac Screenshot (Cmd + Shift + 3/4/5)
    if ((ctrl || event.metaKey) && shift && (key === 's' || key === '3' || key === '4' || key === '5')) {
      event.preventDefault()
      event.stopPropagation()
      this.#clearClipboard()
      this.#emit('SCREENSHOT_ATTEMPT', 'Snipping tool / Screenshot shortcut detected.')
      return
    }

    // 3. Alt + PrintScreen
    if (alt && (event.key === 'PrintScreen' || event.keyCode === 44)) {
      event.preventDefault()
      event.stopPropagation()
      this.#clearClipboard()
      this.#emit('SCREENSHOT_ATTEMPT', 'Alt+PrintScreen screenshot attempt.')
      return
    }

    // 4. Ctrl + P (Print to PDF / Printer)
    if (ctrl && key === 'p') {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('SCREENSHOT_ATTEMPT', 'Ctrl+P (Print page) attempt detected.')
      return
    }

    // 5. Ctrl + S (Save page)
    if (ctrl && key === 's') {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('SCREENSHOT_ATTEMPT', 'Ctrl+S (Save webpage) attempt detected.')
      return
    }

    // 6. F12 — DevTools
    if (event.key === 'F12') {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('DEVTOOLS_ATTEMPT', 'F12 (DevTools) key detected.')
      return
    }

    // 7. Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C — DevTools
    if (ctrl && shift && (key === 'i' || key === 'j' || key === 'c')) {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('DEVTOOLS_ATTEMPT', `Ctrl+Shift+${key.toUpperCase()} (DevTools) shortcut detected.`)
      return
    }

    // 8. Ctrl+U (View Source)
    if (ctrl && key === 'u') {
      event.preventDefault()
      event.stopPropagation()
      this.#emit('DEVTOOLS_ATTEMPT', 'Ctrl+U (View Source) detected.')
      return
    }

    // 9. Ctrl+C/X/A outside editor — clipboard/selection shortcuts
    if (ctrl && !shift && !this.#isInsideEditor(event)) {
      if (key === 'c') {
        event.preventDefault()
        event.stopPropagation()
        this.#clearClipboard()
        this.#emit('COPY', 'Ctrl+C detected on question text.')
      } else if (key === 'x') {
        event.preventDefault()
        event.stopPropagation()
        this.#clearClipboard()
        this.#emit('CUT', 'Ctrl+X detected on question text.')
      } else if (key === 'a') {
        event.preventDefault()
        event.stopPropagation()
      }
    }
  }
}