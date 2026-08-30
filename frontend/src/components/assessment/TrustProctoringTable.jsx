import './TestSummaryTable.css'
import './TrustProctoringTable.css'

const MAX_TRUST_SCORE = 100

const TRUST_DEDUCTIONS = {
  // Local & browser events
  face_missing: 2,
  no_face_detected: 3,
  webcam_unavailable: 10,
  gaze_warning: 2,
  looking_away: 2,
  window_blur: 3,
  tab_switch: 4,
  fullscreen_exit: 5,
  copy_attempt: 2,
  paste_attempt: 2,
  devtools_attempt: 10,
  screenshot_attempt: 10,
  mouth_open: 5,
  head_turn: 3,
  multiple_faces: 15,
  external_screen: 15,
  mobile_phone_detected: 25,
  phone_detected: 25,
  headphones_detected: 10,
  notes_detected: 15,
  suspicious_activity: 10,
  // AI scan events
  ai_scan_critical: 20,
  ai_scan_high: 12,
  ai_scan_medium: 6,
  ai_scan_low: 2,
  ai_scan_clean: 0,
}

function TrustScore({ score }) {
  const numericScore = Number.isFinite(Number(score)) ? Number(score) : null
  if (numericScore === null) {
    return <span className="trust-score-value">-</span>
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(numericScore)))

  return (
    <span className={`trust-score-value${boundedScore < 70 ? ' trust-score-critical' : ''}`}>
      {boundedScore}/100
    </span>
  )
}

function LogCountPill({ count }) {
  const numericCount = Number.isFinite(Number(count)) ? Number(count) : 0
  return <span className="log-count-pill">{numericCount}</span>
}

function getUniqueLogCount(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return 0
  }

  const seen = new Map()

  logs.forEach((log) => {
    const violationType = String(log?.violation_type || '').trim().replace(/\s+/g, ' ').toLowerCase()
    const message = String(log?.message || '').trim().replace(/\s+/g, ' ').toLowerCase()
    const key = `${violationType}|${message}`
    const count = Number.isFinite(Number(log?.count)) ? Number(log.count) : 1

    seen.set(key, (seen.get(key) || 0) + count)
  })

  return seen.size
}

function getTotalLogCount(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return 0
  }

  return logs.reduce((sum, log) => {
    const count = Number.isFinite(Number(log?.count)) ? Number(log.count) : 1
    return sum + count
  }, 0)
}

function getTrustScoreFromLogs(logs = []) {
  if (!Array.isArray(logs) || logs.length === 0) {
    return MAX_TRUST_SCORE
  }

  let score = MAX_TRUST_SCORE

  logs.forEach((log) => {
    const rawType = String(log?.violation_type || '').trim().toLowerCase()
    const type = rawType.replace(/\s+/g, '_')
    let deduction = TRUST_DEDUCTIONS[type]

    if (deduction === undefined) {
      if (type.includes('critical')) deduction = 20
      else if (type.includes('high')) deduction = 12
      else if (type.includes('medium')) deduction = 6
      else if (type.includes('phone')) deduction = 25
      else if (type.includes('face')) deduction = 5
      else deduction = 2
    }

    const count = Number.isFinite(Number(log?.count)) ? Number(log.count) : 1
    const normalizedCount = count > 0 ? count : 1
    score -= deduction * normalizedCount
  })

  return Math.max(0, Math.min(MAX_TRUST_SCORE, score))
}

function TrustProctoringTable({ data, onViewLogs }) {
  if (!data || data.length === 0) {
    return <div className="no-data trust-no-data">No data available</div>
  }

  return (
    <div className="table-scroll-container">
      <table className="trust-proctoring-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            <th className="trust-header">Trust Score</th>
            <th className="logs-header">Unique Logs</th>
            <th className="total-logs-header">Total Logs</th>
            <th className="proctoring-header">PROCTORING</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const uniqueLogs = getUniqueLogCount(row.logs || [])
            const totalLogs = getTotalLogCount(row.logs || [])
            const trustScore = getTrustScoreFromLogs(row.logs || [])

            return (
              <tr key={row.candidate_id || idx}>
                <td className="id-cell">{row.candidate_id}</td>
                <td className="name-cell">{row.name}</td>
                <td className="trust-col">
                  <TrustScore score={trustScore} />
                </td>
                <td className="logs-col">
                  <LogCountPill count={uniqueLogs} />
                </td>
                <td className="total-logs-col">
                  <LogCountPill count={totalLogs} />
                </td>
                <td className="proctoring-col">
                  <button
                    type="button"
                    className="view-logs-button"
                    onClick={() => onViewLogs?.(row.logs || [], row.name)}
                  >
                    View Logs ({totalLogs})
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default TrustProctoringTable