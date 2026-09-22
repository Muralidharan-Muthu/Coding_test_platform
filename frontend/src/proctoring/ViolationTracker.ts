/**
 * ViolationTracker.js
 * 
 * Batches proctoring events and flushes them to the backend API.
 * - Queues events in memory
 * - Flushes when batch size reached or time interval elapsed
 * - Uses navigator.sendBeacon for session-end flush (page unload)
 * - Retry with exponential backoff on failure
 */

/** @typedef {import('./ProctoringTypes').ProctoringEvent} ProctoringEvent */

export class ViolationTracker {
  /** @type {ProctoringEvent[]} */
  #queue = []
  /** @type {ProctoringEvent[]} Recent events (capped for UI display) */
  #recentEvents = []
  /** @type {number} */
  #flushTimerId = 0
  /** @type {boolean} */
  #isFlushing = false
  /** @type {string|null} */
  #sessionId = null
  /** @type {object} */
  #batchConfig = {}
  /** @type {((events: ProctoringEvent[], sessionId: string, riskScore: number) => Promise<void>)|null} */
  #sendFn = null
  /** @type {(() => number)|null} */
  #getScoreFn = null
  /** @type {number} Max recent events to keep for UI */
  #maxRecent = 20

  /**
   * @param {object} batchConfig - batch config from ProctoringConfig
   * @param {(events: ProctoringEvent[], sessionId: string, riskScore: number) => Promise<void>} sendFn
   * @param {() => number} getScoreFn
   */
  constructor(batchConfig, sendFn, getScoreFn) {
    this.#batchConfig = batchConfig
    this.#sendFn = sendFn
    this.#getScoreFn = getScoreFn
  }

  /**
   * Set the backend session ID (set after session/start response).
   * @param {string} sessionId
   */
  setSessionId(sessionId) {
    this.#sessionId = sessionId
  }

  /**
   * Start the periodic flush timer.
   */
  start() {
    this.#startFlushTimer()
  }

  /**
   * Add an event to the batch queue.
   * Auto-flushes if batch size is reached.
   * @param {ProctoringEvent} event
   */
  addEvent(event) {
    this.#queue.push(event)

    // Keep recent events for UI (ring buffer)
    this.#recentEvents.push(event)
    if (this.#recentEvents.length > this.#maxRecent) {
      this.#recentEvents.shift()
    }

    // Auto-flush if batch size reached
    const maxSize = this.#batchConfig.maxSize ?? 10
    if (this.#queue.length >= maxSize) {
      this.#flush()
    }
  }

  /**
   * Get recent events for UI display.
   * @returns {ProctoringEvent[]}
   */
  getRecentEvents() {
    return [...this.#recentEvents]
  }

  /**
   * Flush all queued events to the backend and stop the timer.
   * Call this when the proctoring session ends.
   * @returns {Promise<void>}
   */
  async flushAndStop() {
    this.#stopFlushTimer()
    await this.#flush()
  }

  /**
   * Emergency flush using sendBeacon (for page unload).
   * @param {string} apiBaseUrl
   */
  beaconFlush(apiBaseUrl) {
    if (this.#queue.length === 0 || !this.#sessionId) return

    const payload = JSON.stringify({
      sessionId: this.#sessionId,
      events: this.#queue.splice(0),
      riskScore: this.#getScoreFn?.() ?? 0,
    })

    try {
      navigator.sendBeacon(`${apiBaseUrl}/proctoring/events`, new Blob([payload], { type: 'application/json' }))
    } catch {
      // sendBeacon can fail silently — nothing we can do
    }
  }

  /**
   * Stop and clean up.
   */
  destroy() {
    this.#stopFlushTimer()
    this.#queue = []
    this.#recentEvents = []
    this.#sessionId = null
  }

  // ── Private ──────────────────────────────────────────────────────

  #startFlushTimer() {
    this.#stopFlushTimer()
    const interval = this.#batchConfig.flushIntervalMs ?? 30000
    this.#flushTimerId = window.setInterval(() => this.#flush(), interval)
  }

  #stopFlushTimer() {
    if (this.#flushTimerId) {
      window.clearInterval(this.#flushTimerId)
      this.#flushTimerId = 0
    }
  }

  async #flush() {
    if (this.#isFlushing || this.#queue.length === 0 || !this.#sessionId || !this.#sendFn) return

    this.#isFlushing = true
    const batch = this.#queue.splice(0) // Take all queued events
    const maxRetries = this.#batchConfig.maxRetries ?? 3

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await this.#sendFn(batch, this.#sessionId, this.#getScoreFn?.() ?? 0)
        this.#isFlushing = false
        return
      } catch (err) {
        console.warn(`[ViolationTracker] Flush attempt ${attempt + 1} failed:`, err)
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        }
      }
    }

    // All retries failed — put events back in queue
    console.error('[ViolationTracker] All flush retries failed. Re-queuing events.')
    this.#queue.unshift(...batch)
    this.#isFlushing = false
  }
}
