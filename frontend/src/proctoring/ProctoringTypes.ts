/**
 * ProctoringTypes.js
 * 
 * JSDoc type definitions for the proctoring system.
 * These are documentation-only — no runtime code.
 */

/**
 * All proctoring event types.
 * @typedef {'WINDOW_BLUR' | 'WINDOW_FOCUS' | 'TAB_SWITCH' | 'FULLSCREEN_EXIT' |
 *   'COPY' | 'PASTE' | 'CUT' | 'CONTEXT_MENU' | 'DEVTOOLS_ATTEMPT' |
 *   'NO_FACE_WARNING' | 'NO_FACE' | 'MULTIPLE_FACES' | 'FACE_DETECTED' |
 *   'HEAD_LEFT' | 'HEAD_RIGHT' | 'HEAD_UP' | 'HEAD_DOWN' |
 *   'WEBCAM_ERROR'} ProctoringEventType
 */

/**
 * Severity levels.
 * @typedef {'LOW' | 'MEDIUM' | 'HIGH'} Severity
 */

/**
 * A single proctoring event.
 * @typedef {Object} ProctoringEvent
 * @property {ProctoringEventType} type
 * @property {number} timestamp - Unix ms
 * @property {number} [duration] - Duration in ms for sustained events
 * @property {Severity} severity
 * @property {Record<string, unknown>} [metadata]
 */

/**
 * Proctoring engine status.
 * @typedef {'idle' | 'initializing' | 'active' | 'error' | 'stopped'} ProctoringStatus
 */

/**
 * Risk levels derived from cumulative score.
 * @typedef {'NORMAL' | 'SUSPICIOUS' | 'HIGH_RISK' | 'CRITICAL'} RiskLevel
 */

/**
 * Head pose estimation from face landmarks.
 * @typedef {Object} HeadPose
 * @property {number} yawRatio - Left/right ratio (1.0 = centered)
 * @property {number} pitchRatio - Up/down ratio (1.0 = centered)
 * @property {string|null} direction - 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | null
 */

/**
 * Face detection result from a single frame.
 * @typedef {Object} FaceDetectionResult
 * @property {number} faceCount
 * @property {HeadPose|null} headPose
 * @property {number} timestamp
 */

/**
 * Full proctoring state exposed to React components.
 * @typedef {Object} ProctoringState
 * @property {ProctoringStatus} status
 * @property {number} riskScore
 * @property {RiskLevel} riskLevel
 * @property {ProctoringEvent[]} recentEvents - Last N events
 * @property {number} faceCount
 * @property {HeadPose|null} headPose
 * @property {boolean} isFullscreen
 * @property {boolean} cameraEnabled
 * @property {string|null} cameraError
 * @property {string|null} sessionId - Backend proctoring session ID
 */

/**
 * Configuration override shape (partial of DEFAULT_PROCTORING_CONFIG).
 * @typedef {Object} ProctoringConfigOverride
 * @property {Partial<typeof import('./ProctoringConfig').DEFAULT_PROCTORING_CONFIG>} [config]
 */

// Export empty object to make this a module
export {}
