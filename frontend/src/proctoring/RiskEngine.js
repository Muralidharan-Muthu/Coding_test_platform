/**
 * RiskEngine.js
 * 
 * Rule-based scoring engine with:
 * - Per-event-type score weights (from ProctoringConfig)
 * - Per-event-type cooldowns (same event type doesn't score again within window)
 * - Grace period state machine for face detection
 * - Risk level classification
 */

/** @typedef {import('./ProctoringTypes').ProctoringEvent} ProctoringEvent */
/** @typedef {import('./ProctoringTypes').RiskLevel} RiskLevel */

/**
 * Face detection state machine states.
 * @typedef {'OK' | 'WARNING' | 'VIOLATION'} FaceState
 */

export class RiskEngine {
  /** @type {number} */
  #score = 0
  /** @type {Record<string, number>} Last timestamp each event type was scored */
  #lastScoredAt = {}
  /** @type {object} */
  #config = {}
  /** @type {FaceState} */
  #faceState = 'OK'
  /** @type {number|null} Timestamp when face was first lost */
  #faceGoneAt = null
  /** Head turn tracking */
  #headTurnState = {
    /** @type {string|null} */
    direction: null,
    /** @type {number} */
    startedAt: 0,
  }

  /**
   * @param {object} config - Full ProctoringConfig
   */
  constructor(config) {
    this.#config = config
  }

  /**
   * Process a proctoring event and determine if it should be scored.
   * Returns the event (possibly modified) if it should be tracked, or null if deduplicated.
   * 
   * @param {ProctoringEvent} event
   * @returns {ProctoringEvent|null}
   */
  processEvent(event) {
    const { type, timestamp } = event

    // Skip non-scorable informational events
    if (type === 'WINDOW_FOCUS' || type === 'FACE_DETECTED') {
      return event // Track but don't score
    }

    // Check cooldown
    const cooldownMs = this.#config.cooldowns?.[type] ?? this.#config.defaultCooldownMs ?? 5000
    const lastScored = this.#lastScoredAt[type] || 0

    if (timestamp - lastScored < cooldownMs) {
      return null // Deduplicated — too soon
    }

    // Score the event
    const weight = this.#config.score?.[type] ?? 0
    if (weight > 0) {
      this.#score += weight
      this.#lastScoredAt[type] = timestamp
    }

    return event
  }

  /**
   * Process face detection result with grace period state machine.
   * 
   * State transitions:
   *   OK → (no face for warningMs) → WARNING
   *   WARNING → (no face for violationMs) → fires NO_FACE event
   *   Any → (face returns) → OK
   * 
   * @param {number} faceCount
   * @param {number} timestamp
   * @returns {ProctoringEvent|null} - Event to emit, or null
   */
  processFaceDetection(faceCount, timestamp) {
    // Multiple faces — always a violation (no grace period)
    if (faceCount > 1) {
      this.#faceState = 'OK'
      this.#faceGoneAt = null
      return this.processEvent({
        type: 'MULTIPLE_FACES',
        timestamp,
        severity: 'HIGH',
        metadata: { faceCount },
      })
    }

    // Face detected — reset state
    if (faceCount === 1) {
      this.#faceState = 'OK'
      this.#faceGoneAt = null
      return null
    }

    // No face detected (faceCount === 0)
    const warningMs = this.#config.face?.noFaceWarningMs ?? 3000
    const violationMs = this.#config.face?.noFaceViolationMs ?? 10000

    if (this.#faceState === 'OK') {
      // Start tracking
      this.#faceGoneAt = timestamp
      this.#faceState = 'WARNING'
      return null // Grace period — don't fire yet
    }

    const elapsed = timestamp - (this.#faceGoneAt || timestamp)

    if (elapsed >= violationMs) {
      this.#faceState = 'VIOLATION'
      return this.processEvent({
        type: 'NO_FACE',
        timestamp,
        duration: elapsed,
        severity: 'HIGH',
        metadata: { message: 'No face detected for extended period.' },
      })
    }

    if (elapsed >= warningMs && this.#faceState === 'WARNING') {
      return this.processEvent({
        type: 'NO_FACE_WARNING',
        timestamp,
        duration: elapsed,
        severity: 'LOW',
        metadata: { message: 'Face not detected. Please stay in view.' },
      })
    }

    return null
  }

  /**
   * Process head pose for sustained looking-away detection.
   * 
   * @param {import('./ProctoringTypes').HeadPose|null} headPose
   * @param {number} timestamp
   * @returns {ProctoringEvent|null}
   */
  processHeadPose(headPose, timestamp) {
    if (!headPose || !headPose.direction) {
      // Head is centered — reset tracking
      this.#headTurnState = { direction: null, startedAt: 0 }
      return null
    }

    const sustainedMs = this.#config.headPose?.sustainedTurnMs ?? 5000

    if (this.#headTurnState.direction !== headPose.direction) {
      // Direction changed — start new tracking
      this.#headTurnState = {
        direction: headPose.direction,
        startedAt: timestamp,
      }
      return null
    }

    // Same direction — check if sustained
    const elapsed = timestamp - this.#headTurnState.startedAt
    if (elapsed >= sustainedMs) {
      const eventType = `HEAD_${headPose.direction}`
      // Reset to allow re-triggering
      this.#headTurnState = {
        direction: headPose.direction,
        startedAt: timestamp,
      }
      return this.processEvent({
        type: /** @type {import('./ProctoringTypes').ProctoringEventType} */ (eventType),
        timestamp,
        duration: elapsed,
        severity: headPose.direction === 'UP' ? 'LOW' : 'MEDIUM',
        metadata: {
          yawRatio: headPose.yawRatio,
          pitchRatio: headPose.pitchRatio,
          message: `Head turned ${headPose.direction.toLowerCase()} for ${Math.round(elapsed / 1000)}s.`,
        },
      })
    }

    return null
  }

  /**
   * Current cumulative risk score.
   * @returns {number}
   */
  getScore() {
    return this.#score
  }

  /**
   * Current risk level based on score boundaries.
   * @returns {RiskLevel}
   */
  getRiskLevel() {
    const levels = this.#config.riskLevels
    if (!levels) return 'NORMAL'

    if (this.#score >= (levels.CRITICAL?.min ?? 15)) return 'CRITICAL'
    if (this.#score >= (levels.HIGH_RISK?.min ?? 10)) return 'HIGH_RISK'
    if (this.#score >= (levels.SUSPICIOUS?.min ?? 5)) return 'SUSPICIOUS'
    return 'NORMAL'
  }

  /**
   * Reset the engine (e.g., for a new session).
   */
  reset() {
    this.#score = 0
    this.#lastScoredAt = {}
    this.#faceState = 'OK'
    this.#faceGoneAt = null
    this.#headTurnState = { direction: null, startedAt: 0 }
  }
}
