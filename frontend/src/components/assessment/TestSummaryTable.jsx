import './TestSummaryTable.css'

function formatScore(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2).replace(/\.?0+$/, '')
}

function ScoreBar({ value, max = 100 }) {
  const numericValue = Number(value)
  const numericMax = Number(max)
  const safeValue = Number.isFinite(numericValue) ? numericValue : 0
  const safeMax = Number.isFinite(numericMax) && numericMax > 0 ? numericMax : 100
  const percentage = Math.max(0, Math.min((safeValue / safeMax) * 100, 100))
  let colorClass = 'bar-red'
  if (percentage >= 60) colorClass = 'bar-green'
  else if (percentage >= 40) colorClass = 'bar-yellow'

  return (
    <div className="score-cell">
      <span className="score-value">{formatScore(safeValue)}</span>
      <div className="score-bar-container">
        <div
          className={`score-bar ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function SubmissionType({ type }) {
  const normalizedType = typeof type === 'string' ? type.toLowerCase() : ''
  const label = normalizedType === 'auto' ? 'Auto' : normalizedType === 'manual' ? 'Manual' : (type || '-')
  const cls = normalizedType === 'auto' ? 'auto-warning' : 'manual-type'

  return (
    <span className={`submission-type ${cls}`}>
      {label}
      {normalizedType === 'auto' && <span className="warning-icon">!</span>}
    </span>
  )
}

function VerdictBadge({ verdict }) {
  const normalizedVerdict = typeof verdict === 'string' ? verdict.trim() : ''

  if (!normalizedVerdict) {
    return <span className="verdict-badge verdict-unknown">-</span>
  }

  let className = 'verdict-badge '
  if (normalizedVerdict === 'Good') className += 'verdict-good'
  else if (normalizedVerdict === 'Average') className += 'verdict-average'
  else if (normalizedVerdict === 'Below Average') className += 'verdict-below'
  else className += 'verdict-unknown'

  return <span className={className}>{normalizedVerdict}</span>
}

function TestSummaryTable({ data, onViewCode }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

  return (
    <div className="table-scroll-container">
      <table className="test-summary-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            <th>Email</th>
            <th>Test Date</th>
            <th>Login</th>
            <th>Submit</th>
            <th>Type</th>
            <th>Time (min)</th>
            <th>Location</th>
            <th>Questions</th>
            <th className="python-header">Python Q</th>
            <th className="sql-header">SQL Q</th>
            <th className="mcq-header">MCQ Q</th>
            <th className="python-header">Python Score</th>
            <th className="sql-header">SQL Score</th>
            <th className="mcq-header">MCQ Score</th>
            <th className="overall-header">Overall Score</th>
            <th className="verdict-header">Verdict</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const overallScoreMax = Number(row.max_possible_score) > 0 ? Number(row.max_possible_score) : 200

            return (
            <tr key={row.candidate_id || idx}>
              <td className="id-cell">{row.candidate_id}</td>
              <td className="name-cell">{row.name}</td>
              <td>{row.email}</td>
              <td>{row.test_date}</td>
              <td>{row.login_time}</td>
              <td>{row.submit_time}</td>
              <td><SubmissionType type={row.submission_type} /></td>
              <td>{row.time_taken_min}</td>
              <td>{row.test_location || 'home'}</td>
              <td>{row.total_questions}</td>
              <td className="python-col">{row.python_questions}</td>
              <td className="sql-col">{row.sql_questions}</td>
              <td className="mcq-col">{row.mcq_questions || 0}</td>
              <td className="python-col"><ScoreBar value={row.python_score} /></td>
              <td className="sql-col"><ScoreBar value={row.sql_score} /></td>
              <td className="mcq-col"><ScoreBar value={row.mcq_score} /></td>
              <td className="overall-col"><ScoreBar value={row.overall_score} max={overallScoreMax} /></td>
              <td className="verdict-col">
                <VerdictBadge verdict={row.overall_verdict} />
              </td>
              <td className="actions-cell">
                <button
                  className="view-code-btn"
                  onClick={() => onViewCode && onViewCode({ name: row.name, email: row.email })}
                  title="View submitted code"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                  </svg>
                  View Code
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

export default TestSummaryTable
