const CANDIDATE_SESSION_KEYS = [
  'session_id',
  'user_id',
  'user_name',
  'user_email',
  'test_location',
  'exam_answers',
  'exam_start_time',
  'exam_remaining',
  'exam_secure_mode_started',
]

const ADMIN_SESSION_KEYS = [
  'admin_name',
  'admin_logged_in',
]

const PRACTICE_SESSION_KEYS = [
  'practice_logged_in',
  'practice_name',
  'practice_email',
  'practice_user_id',
]

export function clearCandidateSession() {
  CANDIDATE_SESSION_KEYS.forEach((key) => localStorage.removeItem(key))
}

export function clearAdminSession() {
  ADMIN_SESSION_KEYS.forEach((key) => localStorage.removeItem(key))
}

export function clearPracticeSession() {
  PRACTICE_SESSION_KEYS.forEach((key) => localStorage.removeItem(key))
}
