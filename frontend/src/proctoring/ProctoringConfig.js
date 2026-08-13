/**
 * ProctoringConfig.js
 * 
 * Centralized configuration for the proctoring system.
 * All thresholds, scoring weights, and timing constants are defined here.
 * Override by passing a partial config to ProctoringProvider.
 */

/** @typedef {import('./ProctoringTypes').ProctoringEventType} ProctoringEventType */

/**
 * Default proctoring configuration.
 * Merge with user overrides via { ...DEFAULT_PROCTORING_CONFIG, ...overrides }
 */
export const DEFAULT_PROCTORING_CONFIG = {
  // ── Face Detection ────────────────────────────────────────────────
  face: {
    /** Max faces the model should detect (2 = detect if >1 present) */
    maxFaces: 2,
    /** Inference FPS (~4 FPS = 250ms interval). Camera runs at native FPS. */
    inferenceFpsTarget: 4,
    /** Grace period before NO_FACE becomes a warning (ms) */
    noFaceWarningMs: 3000,
    /** Grace period before NO_FACE becomes a violation (ms) */
    noFaceViolationMs: 10000,
    /** Model asset path (relative to public/) */
    modelAssetPath: '/models/face_landmarker.task',
    /** WASM files CDN path for FilesetResolver */
    wasmBasePath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
  },

  // ── Head Pose ─────────────────────────────────────────────────────
  headPose: {
    /** Yaw threshold for looking left/right (ratio-based, 0-1 scale) */
    yawThresholdMin: 0.20,
    yawThresholdMax: 5.0,
    /** Pitch threshold for looking up/down (ratio-based) */
    pitchThresholdMin: 0.35,
    pitchThresholdMax: 3.0,
    /** Duration head must be turned before violation fires (ms) */
    sustainedTurnMs: 5000,
  },

  // ── Risk Score Weights ────────────────────────────────────────────
  score: {
    /** @type {Record<string, number>} */
    WINDOW_BLUR: 1,
    WINDOW_FOCUS: 0,
    TAB_SWITCH: 2,
    FULLSCREEN_EXIT: 2,
    COPY: 2,
    PASTE: 2,
    CUT: 2,
    CONTEXT_MENU: 1,
    DEVTOOLS_ATTEMPT: 3,
    NO_FACE_WARNING: 1,
    NO_FACE: 3,
    MULTIPLE_FACES: 5,
    HEAD_LEFT: 2,
    HEAD_RIGHT: 2,
    HEAD_UP: 1,
    HEAD_DOWN: 2,
    WEBCAM_ERROR: 2,
  },

  // ── Risk Level Boundaries ─────────────────────────────────────────
  riskLevels: {
    NORMAL: { min: 0, max: 4 },
    SUSPICIOUS: { min: 5, max: 9 },
    HIGH_RISK: { min: 10, max: 14 },
    CRITICAL: { min: 15, max: Infinity },
  },

  // ── Cooldowns & Deduplication ─────────────────────────────────────
  /** Default cooldown per event type (ms). Same event won't score again within this window. */
  defaultCooldownMs: 5000,
  /** Per-type cooldown overrides (ms) */
  cooldowns: {
    NO_FACE: 10000,
    MULTIPLE_FACES: 8000,
    HEAD_LEFT: 6000,
    HEAD_RIGHT: 6000,
    HEAD_UP: 6000,
    HEAD_DOWN: 6000,
    TAB_SWITCH: 3000,
    WINDOW_BLUR: 3000,
    FULLSCREEN_EXIT: 10000,
  },

  // ── Event Batching ────────────────────────────────────────────────
  batch: {
    /** Max events to buffer before auto-flushing to backend */
    maxSize: 10,
    /** Max time between flushes (ms) */
    flushIntervalMs: 30000,
    /** Max retry attempts for failed flush */
    maxRetries: 3,
  },

  // ── UI ────────────────────────────────────────────────────────────
  ui: {
    /** Duration to show violation toast/banner (ms) */
    violationBannerMs: 4000,
    /** Audio alert URL for violations */
    violationAudioUrl: 'https://www.soundjay.com/buttons/sounds/beep-01a.mp3',
    /** Show risk score to candidate (false = hide internal score) */
    showRiskScoreToCandidate: false,
  },
}

/**
 * Severity levels for proctoring events.
 */
export const SEVERITY = /** @type {const} */ ({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
})

/**
 * Map event types to default severity.
 * @type {Record<string, string>}
 */
export const EVENT_SEVERITY_MAP = {
  WINDOW_BLUR: SEVERITY.LOW,
  WINDOW_FOCUS: SEVERITY.LOW,
  TAB_SWITCH: SEVERITY.MEDIUM,
  FULLSCREEN_EXIT: SEVERITY.HIGH,
  COPY: SEVERITY.MEDIUM,
  PASTE: SEVERITY.MEDIUM,
  CUT: SEVERITY.MEDIUM,
  CONTEXT_MENU: SEVERITY.LOW,
  DEVTOOLS_ATTEMPT: SEVERITY.HIGH,
  SCREENSHOT_ATTEMPT: SEVERITY.HIGH,
  RESTRICTED_KEY: SEVERITY.MEDIUM,
  APP_SWITCH_ATTEMPT: SEVERITY.HIGH,
  NO_FACE_WARNING: SEVERITY.LOW,
  NO_FACE: SEVERITY.HIGH,
  MULTIPLE_FACES: SEVERITY.HIGH,
  HEAD_LEFT: SEVERITY.MEDIUM,
  HEAD_RIGHT: SEVERITY.MEDIUM,
  HEAD_UP: SEVERITY.LOW,
  HEAD_DOWN: SEVERITY.MEDIUM,
  WEBCAM_ERROR: SEVERITY.HIGH,
  FACE_DETECTED: SEVERITY.LOW,
}

