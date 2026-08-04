import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const login = async (name, email, otp, testLocation) => {
  const response = await api.post('/login', { 
    name, 
    email, 
    otp,
    test_location: testLocation 
  })
  return response.data
}

export const getProblem = async (problemId) => {
  const response = await api.get(`/problems/${problemId}`)
  return response.data
}

export const runCode = async (code, customInput) => {
  const response = await api.post('/run', { code, custom_input: customInput })
  return response.data
}

export const submitCode = async (sessionId, problemId, code, timeTaken) => {
  const response = await api.post('/submit', {
    session_id: sessionId,
    problem_id: problemId,
    code,
    time_taken: timeTaken || 0,
  })
  return response.data
}

export const previewSubmitCode = async (problemId, code) => {
  const response = await api.post('/hr/preview/submit', {
    problem_id: problemId,
    code,
  })
  return response.data
}

// SQL API functions
export const runSql = async (problemId, query, dialect = 'sql') => {
  const response = await api.post('/sql/run', { problem_id: problemId, query, dialect })
  return response.data
}

export const submitSql = async (sessionId, problemId, query, timeTaken, dialect = 'sql') => {
  const response = await api.post('/sql/submit', {
    session_id: sessionId,
    problem_id: problemId,
    query,
    time_taken: timeTaken || 0,
    dialect: dialect
  })
  return response.data
}

export const previewSubmitSql = async (problemId, query, dialect = 'sql') => {
  const response = await api.post('/hr/preview/sql-submit', {
    problem_id: problemId,
    query,
    dialect,
  })
  return response.data
}

// Exam session API functions
export const getExamSummary = async (sessionId = '') => {
  const suffix = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  const response = await api.get(`/exam/summary${suffix}`)
  return response.data
}

export const getPythonProblems = async (sessionId = '') => {
  const suffix = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  const response = await api.get(`/problems/python${suffix}`)
  return response.data
}

export const getSqlProblems = async (sessionId = '') => {
  const suffix = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  const response = await api.get(`/problems/sql${suffix}`)
  return response.data
}

export const getMcqProblems = async (sessionId = '') => {
  const suffix = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  const response = await api.get(`/problems/mcq${suffix}`)
  return response.data
}

export const startExam = async (sessionId) => {
  const response = await api.post('/exam/start', { session_id: sessionId })
  return response.data
}

export const getExamStatus = async (sessionId) => {
  const response = await api.get(`/exam/status?session_id=${sessionId}`)
  return response.data
}

export const saveExamAnswer = async (sessionId, problemId, code) => {
  const response = await api.post(`/exam/save-answer?session_id=${sessionId}&problem_id=${problemId}&code=${encodeURIComponent(code)}`)
  return response.data
}

export const submitExam = async (sessionId, answers, autoSubmit = false) => {
  const response = await api.post('/exam/submit', {
    session_id: sessionId,
    answers: answers,
    auto_submit: autoSubmit,
  })
  return response.data
}

// HR Candidate OTP Management APIs
export const getCandidates = async () => {
  const response = await api.get('/hr/candidates')
  return response.data
}

export const clearAllCandidates = async () => {
  const response = await api.delete('/hr/candidates/clear')
  return response.data
}

export const deleteCandidate = async (email) => {
  const response = await api.delete(`/hr/candidates/${encodeURIComponent(email)}`)
  return response.data
}

export const updateCandidate = async (currentEmail, username, email) => {
  const response = await api.put(`/hr/candidates/${encodeURIComponent(currentEmail)}`, {
    username,
    email,
  })
  return response.data
}

export const importCandidates = async (candidates) => {
  const response = await api.post('/hr/import-candidates', { candidates })
  return response.data
}

export const generateOTP = async (username, email) => {
  const response = await api.post('/hr/generate-otp', { username, email })
  return response.data
}

export const sendOTPEmail = async (username, email) => {
  const response = await api.post('/hr/send-otp-email', { username, email })
  return response.data
}

export const setCandidateTestType = async (email, testType) => {
  const response = await api.post('/hr/candidate-test-type', {
    email,
    test_type: testType,
  })
  return response.data
}

export const shuffleCandidateQuestions = async (email, testType) => {
  const response = await api.post('/hr/candidate-shuffle', {
    email,
    test_type: testType,
  })
  return response.data
}

export const getMcqQuestions = async () => {
  const response = await api.get('/api/mcq-questions')
  return response.data.questions || []
}

export const createMcqQuestion = async (payload) => {
  const response = await api.post('/hr/mcq-questions', payload)
  return response.data
}

export const deleteMcqQuestion = async (questionId) => {
  const response = await api.delete(`/hr/mcq-questions/${questionId}`)
  return response.data
}

export default api
