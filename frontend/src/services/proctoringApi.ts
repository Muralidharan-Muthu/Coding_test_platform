/**
 * proctoringApi.js
 * 
 * REST API client for proctoring backend endpoints.
 */

import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Start a new proctoring session on the backend.
 * @param {string} testId
 * @param {string} candidateId
 * @returns {Promise<{sessionId: string, status: string}>}
 */
export const startProctoringSession = async (testId, candidateId) => {
  const response = await api.post('/proctoring/session/start', {
    testId,
    candidateId,
  })
  return response.data
}

/**
 * Send a batch of proctoring events to the backend.
 * @param {import('../proctoring/ProctoringTypes').ProctoringEvent[]} events
 * @param {string} sessionId
 * @param {number} riskScore
 * @returns {Promise<{received: number}>}
 */
export const sendProctoringEvents = async (events, sessionId, riskScore) => {
  const response = await api.post('/proctoring/events', {
    sessionId,
    events,
    riskScore,
  })
  return response.data
}

/**
 * End a proctoring session.
 * @param {string} sessionId
 * @param {number} riskScore
 * @param {string} riskLevel
 * @returns {Promise<{status: string}>}
 */
export const endProctoringSession = async (sessionId, riskScore, riskLevel) => {
  const response = await api.post('/proctoring/session/end', {
    sessionId,
    riskScore,
    riskLevel,
  })
  return response.data
}

/**
 * Get proctoring session details (admin view).
 * @param {string} sessionId
 * @returns {Promise<{session: object, events: object[]}>}
 */
export const getProctoringSession = async (sessionId) => {
  const response = await api.get(`/proctoring/session/${sessionId}`)
  return response.data
}

/**
 * Get proctoring reports for admin dashboard.
 * @param {object} [filters]
 * @param {string} [filters.candidateId]
 * @param {string} [filters.testId]
 * @returns {Promise<object[]>}
 */
export const getProctoringReports = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.candidateId) params.append('candidate_id', filters.candidateId)
  if (filters.testId) params.append('test_id', filters.testId)
  const queryString = params.toString()
  const url = `/admin/proctoring/reports${queryString ? `?${queryString}` : ''}`
  const response = await api.get(url)
  return response.data
}

export default {
  startProctoringSession,
  sendProctoringEvents,
  endProctoringSession,
  getProctoringSession,
  getProctoringReports,
}
