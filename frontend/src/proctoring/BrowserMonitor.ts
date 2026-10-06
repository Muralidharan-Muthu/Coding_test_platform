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
  /** @type {number} Timestamp when monitoring started */
  #startedAt = 0
  /** @type {number} Timestamp of the last TAB_SWITCH event */
  #lastTabSwitchAt = 0
  /** @type {number|null} Timer ID for debouncing window blur */
  #blurTimeout = null

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
   * Check if the exam is actively running (not submitted, not in initial warmup).
   * @returns {boolean}
   */
  #isExamActive() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return true
    // If exam was submitted or test ended, completely suppress all integrity events
    if (localStorage.getItem('exam_submitted') === 'true') return false
    // Warmup period: ignore browser focus / fullscreen flickers during the first 4 seconds of start
    if (this.#startedAt > 0 && Date.now() - this.#startedAt < 4000) return false
    return true
  }

  /**
   * Start monitoring browser events.
   */
  start() {
    if (this.#isRunning) return
    this.#isRunning = true
    this.#startedAt = Date.now()
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
    if (this.#blurTimeout) {
      clearTimeout(this.#blurTimeout)
      this.#blurTimeout = null
    }
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
    if (!this.#onEvent || !this.#isRunning || !this.#isExamActive()) return
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
    if (!this.#isRunning || !this.#isExamActive()) return
    if (document.hidden) {
      this.#lastTabSwitchAt = Date.now()
      if (this.#blurTimeout) {
        clearTimeout(this.#blurTimeout)
        this.#blurTimeout = null
      }
      this.#clearClipboard()
      document.body.classList.add('window-blurred')
      this.#emit('TAB_SWITCH', 'Tab switch detected. Candidate left the exam tab.')
    } else {
      document.body.classList.remove('window-blurred')
    }
  }

  #handleWindowBlur = () => {
    if (!this.#isRunning || !this.#isExamActive()) return
    // If TAB_SWITCH was just emitted within 2s, don't duplicate with WINDOW_BLUR
    if (Date.now() - this.#lastTabSwitchAt < 2000) return
    if (document.hidden) return // Already captured as tab switch

    this.#clearClipboard()
    document.body.classList.add('window-blurred')

    // Debounce micro-blurs: only emit if window stays unfocused for >= 1200ms
    if (this.#blurTimeout) clearTimeout(this.#blurTimeout)
    this.#blurTimeout = window.setTimeout(() => {
      if (!this.#isRunning || !this.#isExamActive()) return
      if (!document.hasFocus()) {
        this.#emit('WINDOW_BLUR', 'Browser window lost focus.')
      }
      this.#blurTimeout = null
    }, 1200)
  }

  #handleWindowFocus = () => {
    if (this.#blurTimeout) {
      clearTimeout(this.#blurTimeout)
      this.#blurTimeout = null
    }
    document.body.classList.remove('window-blurred')
    if (this.#isRunning && this.#isExamActive()) {
      this.#emit('WINDOW_FOCUS', 'Window regained focus.')
    }
  }

  #handleFullscreen = () => {
    const wasFullscreen = this.#isFullscreen
    this.#isFullscreen = Boolean(document.fullscreenElement)

    if (!this.#isRunning || !this.#isExamActive()) return

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