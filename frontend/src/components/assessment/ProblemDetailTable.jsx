import './ProblemDetailTable.css'

const SCORE_KEY_PATTERN = /^P(\d+)_(py|sql)$/i
const PYTHON_SLOT_COUNT = 5
const SQL_SLOT_COUNT = 5

function ScoreChip({ score }) {
  const numericScore = Number(score)
  const displayScore = Number.isFinite(numericScore) ? numericScore : 0

  let colorClass = 'chip-gray'
  if (displayScore === 5) colorClass = 'chip-green'
  else if (displayScore === 4) colorClass = 'chip-blue'
  else if (displayScore === 3) colorClass = 'chip-yellow'
  else if (displayScore === 2) colorClass = 'chip-orange'
  else if (displayScore === 1) colorClass = 'chip-red'

  return <span className={`score-chip ${colorClass}`}>{displayScore}</span>
}

function normalizeProblemScores(problemScores) {
  const grouped = {
    py: [],
    sql: [],
  }

  const entries = problemScores && typeof problemScores === 'object'
    ? Object.entries(problemScores)
    : []

  entries.forEach(([key, value]) => {
    const match = key.match(SCORE_KEY_PATTERN)
    if (!match) {
      return
    }

    const order = Number(match[1])
    const language = match[2].toLowerCase()
    const numericValue = Number(value)
    const normalizedValue = Number.isFinite(numericValue) ? numericValue : 0

    grouped[language].push({
      key,
      order,
      value: normalizedValue,
    })
  })

  const sortByOrder = (left, right) => left.order - right.order || left.key.localeCompare(right.key)
  grouped.py.sort(sortByOrder)
  grouped.sql.sort(sortByOrder)

  return grouped
}

function ProblemDetailTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

  const normalizedRows = data.map(row => normalizeProblemScores(row.problem_scores))

  return (
    <div className="table-scroll-container">
      <div className="test-case-note">
        <span className="note-icon">i</span>
        <span>Each question has <strong>5 test cases</strong> by default. Scores are shown in fixed PY1-PY5 and SQL1-SQL5 slots.</span>
      </div>
      <table className="problem-detail-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            {Array.from({ length: PYTHON_SLOT_COUNT }, (_, index) => (
              <th key={`python-${index}`} className="python-header">PY{index + 1}</th>
            ))}
            {Array.from({ length: SQL_SLOT_COUNT }, (_, index) => (
              <th key={`sql-${index}`} className="sql-header">SQL{index + 1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const scores = normalizedRows[idx]

            return (
              <tr key={row.candidate_id || idx}>
                <td className="id-cell">{row.candidate_id}</td>
                <td className="name-cell">{row.name}</td>
                {Array.from({ length: PYTHON_SLOT_COUNT }, (_, index) => (
                  <td key={`python-${index}`} className="python-col">
                    <ScoreChip score={scores.py[index]?.value ?? 0} />
                  </td>
                ))}
                {Array.from({ length: SQL_SLOT_COUNT }, (_, index) => (
                  <td key={`sql-${index}`} className="sql-col">
                    <ScoreChip score={scores.sql[index]?.value ?? 0} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ProblemDetailTable
