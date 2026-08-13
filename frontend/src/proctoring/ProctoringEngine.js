/**
 * ProctoringEngine.js
 * 
 * Orchestrator that ties together:
 * - FaceDetectorModule (MediaPipe face detection + head pose)
 * - BrowserMonitor (tab/window/clipboard/keyboard events)
 * - RiskEngine (scoring + grace periods)
 * - ViolationTracker (event batching + backend flush)
 * 
 * Manages the webcam MediaStream and the detection loop.
 */

import { FaceDetectorModule } from './FaceDetector'
import { BrowserMonitor } from './BrowserMonitor'
import { RiskEngine } from './RiskEngine'
import { ViolationTracker } from './ViolationTracker'
import { DEFAULT_PROCTORING_CONFIG } from './ProctoringConfig'

/** @typedef {import('./ProctoringTypes').ProctoringEvent} ProctoringEvent */
/** @typedef {import('./ProctoringTypes').ProctoringStatus} ProctoringStatus */
/** @typedef {import('./ProctoringTypes').ProctoringState} ProctoringState */

export class ProctoringEngine {
  /** @type {object} Merged config */
  #config
  /** @type {FaceDetectorModule|null} */
  #faceDetector = null
  /** @type {BrowserMonitor|null} */
  #browserMonitor = null
  /** @type {RiskEngine|null} */
  #riskEngine = null
  /** @type {ViolationTracker|null} */
  #violationTracker = null
  /** @type {MediaStream|null} */
  #mediaStream = null
  /** @type {HTMLVideoElement|null} */
  #videoElement = null
  /** @type {number} requestAnimationFrame ID */
  #rafId = 0
  /** @type {ProctoringStatus} */
  #status = 'idle'
  /** @type {number} */
  #faceCount = 0
  /** @type {import('./ProctoringTypes').HeadPose|null} */
  #headPose = null
  /** @type {string|null} */
  #cameraError = null
  /** @type {string|null} */
  #sessionId = null
  /** @type {((state: ProctoringState) => void)|null} */
  #onStateChange = null
  /** @type {((event: ProctoringEvent) => void)|null} */
  #onViolation = null
  /** @type {(events: ProctoringEvent[], sessionId: string, riskScore: number) => Promise<void>} */
  #sendEventsFn

  /**
   * @param {object} [configOverrides] - Partial config to merge with defaults
   * @param {(events: ProctoringEvent[], sessionId: string, riskScore: number) => Promise<void>} sendEventsFn
   */
  constructor(configOverrides = {}, sendEventsFn) {
    this.#config = this.#mergeConfig(configOverrides)
    this.#sendEventsFn = sendEventsFn
  }

  /**
   * Register state change callback (called by ProctoringProvider).
   * @param {(state: ProctoringState) => void} callback
   */
  onStateChange(callback) {
    this.#onStateChange = callback
  }

  /**
   * Register violation callback for UI alerts (toasts, banners).
   * @param {(event: ProctoringEvent) => void} callback
   */
  onViolation(callback) {
    this.#onViolation = callback
  }

  /**
   * Get the video element for the camera preview.
   * @returns {HTMLVideoElement|null}
   */
  getVideoElement() {
    return this.#videoElement
  }

  /**
   * Start the proctoring engine.
   * 1. Acquire webcam
   * 2. Initialize FaceDetector model
   * 3. Start BrowserMonitor
   * 4. Start detection loop
   * 
   * @returns {Promise<void>}
   */
  async start() {
    if (this.#status === 'active' || this.#status === 'initializing') return

    this.#status = 'initializing'
    this.#emitState()

    try {
      // 1. Acquire webcam
      await this.#acquireCamera()

      // 2. Initialize face detector
      this.#faceDetector = new FaceDetectorModule(this.#config.face)
      this.#faceDetector.setHeadPoseConfig(this.#config.headPose)
      await this.#faceDetector.init()

      // 3. Initialize risk engine
      this.#riskEngine = new RiskEngine(this.#config)

      // 4. Initialize violation tracker
      this.#violationTracker = new ViolationTracker(
        this.#config.batch,
        this.#sendEventsFn,
        () => this.#riskEngine?.getScore() ?? 0
      )

      // 5. Start browser monitor
      this.#browserMonitor = new BrowserMonitor()
      this.#browserMonitor.onEvent((event) => this.#handleEvent(event))
      this.#browserMonitor.start()

      // 6. Start violation tracker flush timer
      this.#violationTracker.start()

      // 7. Start detection loop
      this.#status = 'active'
      this.#emitState()
      this.#runDetectionLoop()

    } catch (err) {
      console.error('[ProctoringEngine] Failed to start:', err)
      this.#status = 'error'
      this.#cameraError = err instanceof Error ? err.message : 'Failed to start proctoring'
      this.#emitState()
      throw err
    }
  }

  /**
   * Set the backend session ID (called after POST /proctoring/session/start).
   * @param {string} sessionId
   */
  setSessionId(sessionId) {
    this.#sessionId = sessionId
    this.#violationTracker?.setSessionId(sessionId)
  }

  /**
   * Stop the proctoring engine and release all resources.
   * @returns {Promise<void>}
   */
  async stop() {
    // Stop detection loop
    if (this.#rafId) {
      cancelAnimationFrame(this.#rafId)
      this.#rafId = 0
    }

    // Stop browser monitor
    this.#browserMonitor?.stop()

    // Flush remaining events
    if (this.#violationTracker) {
      await this.#violationTracker.flushAndStop()
      this.#violationTracker.destroy()
    }

    // Release face detector
    this.#faceDetector?.destroy()

    // Release camera
    this.#releaseCamera()

    // Reset state
    this.#faceDetector = null
    this.#browserMonitor = null
    this.#riskEngine = null
    this.#violationTracker = null
    this.#faceCount = 0
    this.#headPose = null
    this.#cameraError = null
    this.#sessionId = null
    this.#status = 'stopped'
    this.#emitState()
  }

  /**
   * Get current state snapshot.
   * @returns {ProctoringState}
   */
  getState() {
    return {
      status: this.#status,
      riskScore: this.#riskEngine?.getScore() ?? 0,
      riskLevel: this.#riskEngine?.getRiskLevel() ?? 'NORMAL',
      recentEvents: this.#violationTracker?.getRecentEvents() ?? [],
      faceCount: this.#faceCount,
      headPose: this.#headPose,
      isFullscreen: this.#browserMonitor?.isFullscreen ?? false,
      cameraEnabled: this.#mediaStream !== null,
      cameraError: this.#cameraError,
      sessionId: this.#sessionId,
    }
  }

  // ── Private ──────────────────────────────────────────────────────

  /**
   * Acquire webcam MediaStream and attach to a hidden video element.
   */
  async #acquireCamera() {
    try {
      this.#mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
        audio: false,
      })

      this.#videoElement = document.createElement('video')
      this.#videoElement.srcObject = this.#mediaStream
      this.#videoElement.setAttribute('playsinline', 'true')
      this.#videoElement.muted = true
      await this.#videoElement.play()
      this.#cameraError = null
    } catch (err) {
      this.#cameraError = 'Webcam access denied or unavailable.'
      throw err
    }
  }

  /**
   * Release webcam MediaStream and video element.
   */
  #releaseCamera() {
    if (this.#mediaStream) {
      this.#mediaStream.getTracks().forEach(track => track.stop())
      this.#mediaStream = null
    }
    if (this.#videoElement) {
      this.#videoElement.srcObject = null
      this.#videoElement = null
    }
  }

  /**
   * Main detection loop using requestAnimationFrame.
   * The FaceDetector internally throttles to configured FPS.
   */
  #runDetectionLoop() {
    if (this.#status !== 'active') return

    const loop = () => {
      if (this.#status !== 'active') return

      this.#detectFrame()
      this.#rafId = requestAnimationFrame(loop)
    }

    this.#rafId = requestAnimationFrame(loop)
  }

  /**
   * Process a single video frame.
   */
  #detectFrame() {
    if (!this.#faceDetector?.isReady || !this.#videoElement) return
    if (document.hidden) return // Don't process when tab is hidden

    const result = this.#faceDetector.detect(this.#videoElement)
    if (!result) return // Throttled — too soon

    this.#faceCount = result.faceCount
    this.#headPose = result.headPose

    // Process face count through risk engine
    const faceEvent = this.#riskEngine?.processFaceDetection(result.faceCount, result.timestamp)
    if (faceEvent) {
      this.#handleScoredEvent(faceEvent)
    }

    // Process head pose through risk engine
    if (result.faceCount === 1 && result.headPose) {
      const headEvent = this.#riskEngine?.processHeadPose(result.headPose, result.timestamp)
      if (headEvent) {
        this.#handleScoredEvent(headEvent)
      }
    }

    // Emit state update (throttled — rAF handles timing)
    this.#emitState()
  }

  /**
   * Handle a browser monitor event.
   * @param {ProctoringEvent} event
   */
  #handleEvent(event) {
    const scored = this.#riskEngine?.processEvent(event)
    if (scored) {
      this.#handleScoredEvent(scored)
    }
    this.#emitState()
  }

  /**
   * Handle an event that passed scoring/dedup.
   * @param {ProctoringEvent} event
   */
  #handleScoredEvent(event) {
    // Add to batch queue
    this.#violationTracker?.addEvent(event)

    // Notify UI for toast/banner
    this.#onViolation?.(event)
  }

  /**
   * Emit current state to the React provider.
   */
  #emitState() {
    this.#onStateChange?.(this.getState())
  }

  /**
   * Deep merge config with defaults.
   * @param {object} overrides
   * @returns {object}
   */
  #mergeConfig(overrides) {
    const merged = { ...DEFAULT_PROCTORING_CONFIG }
    for (const key of Object.keys(overrides)) {
      if (typeof overrides[key] === 'object' && overrides[key] !== null && !Array.isArray(overrides[key])) {
        merged[key] = { ...(merged[key] || {}), ...overrides[key] }
      } else {
        merged[key] = overrides[key]
      }
    }
    return merged
  }
}
