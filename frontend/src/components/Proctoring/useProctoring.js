/**
 * useProctoring.js
 * 
 * React hook to consume proctoring state from ProctoringProvider.
 * Returns null if used outside ProctoringProvider (e.g., practice/admin mode).
 */

import { useContext } from 'react'
import { ProctoringContext } from './ProctoringProvider'

/**
 * @returns {import('../../proctoring/ProctoringTypes').ProctoringState & {
 *   violation: import('../../proctoring/ProctoringTypes').ProctoringEvent|null,
 *   videoElement: HTMLVideoElement|null
 * } | null}
 */
export function useProctoring() {
  const context = useContext(ProctoringContext)
  // If status is 'idle' and there's no session, we might be outside the provider
  // But we still return context — components check status themselves
  return context
}
