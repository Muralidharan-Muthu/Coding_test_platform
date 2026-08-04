import './TestSummaryTable.css'
import './TrustProctoringTable.css'

const MAX_TRUST_SCORE = 100
const TRUST_DEDUCTIONS = {
  face_missing: 1,
  webcam_unavailable: 10,
  gaze_warning: 5,
  window_blur: 5,
  tab_switch: 5,
  fullscreen_exit: 5,
  copy_attempt: 3,
  paste_attempt: 3,
  mouth_open: 10,
  head_turn: 10,
  external_screen: 20,
  multiple_faces: 20,
  phone_detected: 20,
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
    const type = String(log?.violation_type || '').trim().toLowerCase()
    const deduction = TRUST_DEDUCTIONS[type] || 0
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
                      View Logs
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
