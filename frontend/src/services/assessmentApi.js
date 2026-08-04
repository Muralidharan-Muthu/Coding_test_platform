import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Get all assessment results with optional filters
 * @param {Object} filters - Filter options
 * @param {string} filters.date_from - Start date (YYYY-MM-DD)
 * @param {string} filters.date_to - End date (YYYY-MM-DD)
 * @param {string} filters.verdict - Good | Average | Below Average
 * @param {string} filters.submission_type - Manual | Auto
 */
export const getAssessmentResults = async (filters = {}) => {
  const params = new URLSearchParams()
  
  if (filters.date_from) params.append('date_from', filters.date_from)
  if (filters.date_to) params.append('date_to', filters.date_to)
  if (filters.verdict && filters.verdict !== 'All') params.append('verdict', filters.verdict)
  if (filters.submission_type && filters.submission_type !== 'All') params.append('submission_type', filters.submission_type)
  if (filters.test_location && filters.test_location !== 'All') params.append('test_location', filters.test_location)

  const queryString = params.toString()
  const url = `/api/assessment/results${queryString ? `?${queryString}` : ''}`
  
  const response = await api.get(url)
  return response.data
}

/**
 * Get completed assessments enriched with proctoring logs and trust score
 * @param {Object} filters - Same filter options as getAssessmentResults
 */
export const getProctoringReports = async (filters = {}) => {
  const params = new URLSearchParams()

  if (filters.date_from) params.append('date_from', filters.date_from)
  if (filters.date_to) params.append('date_to', filters.date_to)
  if (filters.verdict && filters.verdict !== 'All') params.append('verdict', filters.verdict)
  if (filters.submission_type && filters.submission_type !== 'All') params.append('submission_type', filters.submission_type)
  if (filters.test_location && filters.test_location !== 'All') params.append('test_location', filters.test_location)

  const queryString = params.toString()
  const url = `/api/reports/proctoring/${queryString ? `?${queryString}` : ''}`

  const response = await api.get(url)
  return {
    success: true,
    total: Array.isArray(response.data) ? response.data.length : 0,
    data: Array.isArray(response.data) ? response.data : []
  }
}

/**
 * Post a new assessment result
 * @param {Object} data - Candidate assessment data
 */
export const postAssessmentResult = async (data) => {
  const response = await api.post('/api/assessment/results', data)
  return response.data
}

/**
 * Export assessment results as Excel file
 * @param {Object} filters - Same filter options as getAssessmentResults
 */
export const exportAssessmentResults = async (filters = {}) => {
  const params = new URLSearchParams()
  
  if (filters.date_from) params.append('date_from', filters.date_from)
  if (filters.date_to) params.append('date_to', filters.date_to)
  if (filters.verdict && filters.verdict !== 'All') params.append('verdict', filters.verdict)
  if (filters.submission_type && filters.submission_type !== 'All') params.append('submission_type', filters.submission_type)
  if (filters.test_location && filters.test_location !== 'All') params.append('test_location', filters.test_location)

  const queryString = params.toString()
  const url = `/api/assessment/export${queryString ? `?${queryString}` : ''}`
  
  const response = await api.get(url, {
    responseType: 'blob'
  })
  
  // Trigger file download
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const downloadUrl = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.setAttribute('download', `HR_Assessment_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(downloadUrl)
}

/**
 * Initialize sample data (for testing)
 */
export const initSampleData = async () => {
  const response = await api.post('/api/assessment/init-sample-data')
  return response.data
}

/**
 * Get all submissions for a specific candidate
 * @param {string} email - Candidate's email address
 */
export const getCandidateSubmissions = async (email) => {
  const response = await api.get(`/api/candidates/${encodeURIComponent(email)}/submissions`)
  return response.data
}

export default {
  getProctoringReports,
  getAssessmentResults,
  postAssessmentResult,
  exportAssessmentResults,
  initSampleData,
  getCandidateSubmissions
}
