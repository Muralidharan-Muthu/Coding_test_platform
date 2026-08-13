/**
 * FaceDetector.js
 * 
 * Wraps @mediapipe/tasks-vision FaceLandmarker for:
 * - Face count detection (0, 1, 2+)
 * - Head pose estimation (yaw/pitch from 478 landmarks)
 * 
 * Runs on main thread via WASM. Inference is throttled to ~4 FPS.
 */

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'

/** @typedef {import('./ProctoringTypes').FaceDetectionResult} FaceDetectionResult */
/** @typedef {import('./ProctoringTypes').HeadPose} HeadPose */

// MediaPipe landmark indices for head pose estimation
const NOSE_TIP = 1
const LEFT_FACE_EDGE = 234
const RIGHT_FACE_EDGE = 454
const FOREHEAD = 10
const CHIN = 152

export class FaceDetectorModule {
  /** @type {FaceLandmarker|null} */
  #landmarker = null
  /** @type {boolean} */
  #initializing = false
  /** @type {number} */
  #lastDetectionTime = 0
  /** @type {number} */
  #minIntervalMs = 250 // ~4 FPS default

  /**
   * @param {object} config - face config from ProctoringConfig
   */
  constructor(config) {
    this.config = config
    this.#minIntervalMs = Math.round(1000 / (config.inferenceFpsTarget || 4))
  }

  /**
   * Initialize the FaceLandmarker model.
   * Downloads WASM runtime from CDN and model from public/models/.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.#landmarker || this.#initializing) return
    this.#initializing = true

    try {
      const vision = await FilesetResolver.forVisionTasks(this.config.wasmBasePath)

      this.#landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: this.config.modelAssetPath,
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: this.config.maxFaces || 2,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      })
    } finally {
      this.#initializing = false
    }
  }

  /**
   * Whether the model is loaded and ready for inference.
   * @returns {boolean}
   */
  get isReady() {
    return this.#landmarker !== null
  }

  /**
   * Run face detection on the current video frame.
   * Returns null if called too soon (throttled) or model not ready.
   * 
   * @param {HTMLVideoElement} video
   * @returns {FaceDetectionResult|null}
   */
  detect(video) {
    if (!this.#landmarker) return null
    if (!video || video.readyState < 3) return null // HAVE_FUTURE_DATA

    const now = performance.now()
    if (now - this.#lastDetectionTime < this.#minIntervalMs) return null
    this.#lastDetectionTime = now

    // Use performance.now() for the timestamp parameter
    const result = this.#landmarker.detectForVideo(video, now)

    const faceCount = result.faceLandmarks?.length ?? 0

    /** @type {HeadPose|null} */
    let headPose = null

    if (faceCount === 1 && result.faceLandmarks[0]) {
      headPose = this.#estimateHeadPose(result.faceLandmarks[0])
    }

    return {
      faceCount,
      headPose,
      timestamp: Date.now(),
    }
  }

  /**
   * Estimate head pose (yaw and pitch) from 478 normalized landmarks.
   * Uses geometric ratios — not a perfect 3D solver, but effective for
   * detecting sustained head turning.
   * 
   * @param {Array<{x: number, y: number, z: number}>} landmarks
   * @returns {HeadPose}
   */
  #estimateHeadPose(landmarks) {
    const nose = landmarks[NOSE_TIP]
    const leftEdge = landmarks[LEFT_FACE_EDGE]
    const rightEdge = landmarks[RIGHT_FACE_EDGE]
    const forehead = landmarks[FOREHEAD]
    const chin = landmarks[CHIN]

    // Yaw: ratio of nose-to-left vs nose-to-right horizontal distance
    const leftDist = Math.abs(nose.x - leftEdge.x)
    const rightDist = Math.abs(rightEdge.x - nose.x)
    const yawRatio = rightDist > 0.0001 ? leftDist / rightDist : 1.0

    // Pitch: ratio of nose-to-forehead vs nose-to-chin vertical distance
    const upDist = Math.abs(nose.y - forehead.y)
    const downDist = Math.abs(chin.y - nose.y)
    const pitchRatio = downDist > 0.0001 ? upDist / downDist : 1.0

    // Determine direction based on config thresholds
    let direction = null
    const { yawThresholdMin, yawThresholdMax, pitchThresholdMin, pitchThresholdMax } = this.config
      ? { ...{ yawThresholdMin: 0.20, yawThresholdMax: 5.0, pitchThresholdMin: 0.35, pitchThresholdMax: 3.0 } }
      : {}

    // These thresholds come from ProctoringConfig.headPose but we read from the
    // parent config passed to the constructor via ProctoringEngine
    const yMin = this.headPoseConfig?.yawThresholdMin ?? 0.20
    const yMax = this.headPoseConfig?.yawThresholdMax ?? 5.0
    const pMin = this.headPoseConfig?.pitchThresholdMin ?? 0.35
    const pMax = this.headPoseConfig?.pitchThresholdMax ?? 3.0

    if (yawRatio <= yMin) {
      direction = 'RIGHT' // Nose is closer to left edge = looking right
    } else if (yawRatio >= yMax) {
      direction = 'LEFT' // Nose is closer to right edge = looking left
    } else if (pitchRatio <= pMin) {
      direction = 'DOWN'
    } else if (pitchRatio >= pMax) {
      direction = 'UP'
    }

    return { yawRatio, pitchRatio, direction }
  }

  /**
   * Set head pose thresholds (called by ProctoringEngine after config merge).
   * @param {object} headPoseConfig
   */
  setHeadPoseConfig(headPoseConfig) {
    this.headPoseConfig = headPoseConfig
  }

  /**
   * Release resources.
   */
  destroy() {
    if (this.#landmarker) {
      this.#landmarker.close()
      this.#landmarker = null
    }
  }
}
