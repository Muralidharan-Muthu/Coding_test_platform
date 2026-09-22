import './ProblemDetailTable.css'

const PYTHON_SLOT_COUNT = 5
const SQL_SLOT_COUNT = 5

function ScoreChip({ score }) {
  const numericScore = Number(score)
  const displayScore = Number.isFinite(numericScore) ? numericScore : 0

  let colorClass = 'chip-gray'
  if (displayScore >= 5) colorClass = 'chip-green'
  else if (displayScore === 4) colorClass = 'chip-blue'
  else if (displayScore === 3) colorClass = 'chip-yellow'
  else if (displayScore === 2) colorClass = 'chip-orange'
  else if (displayScore === 1) colorClass = 'chip-red'

  return <span className={`score-chip ${colorClass}`}>{displayScore}</span>
}

function normalizeProblemScores(row) {
  const grouped = {
    py: Array(PYTHON_SLOT_COUNT).fill(0),
    sql: Array(SQL_SLOT_COUNT).fill(0),
  }

  const problemScores = row.problem_scores || {}
  const problemTestcases = row.problem_testcases || {}

  let pyIdx = 0
  let sqlIdx = 0

  // 1. Check explicit P1_py / P1_sql keys
  Object.entries(problemScores).forEach(([key, val]) => {
    const match = key.match(/^P(\d+)_(py|sql)$/i)
    if (match) {
      const order = Number(match[1]) - 1
      const lang = match[2].toLowerCase()
      if (order >= 0 && order < 5) {
        grouped[lang][order] = Number(val) || 0
      }
    }
  })

  // 2. If slots still 0, check problem_testcases entries
  Object.entries(problemTestcases).forEach(([key, data]) => {
    if (key.includes('easy_') || key.includes('medium_') || key.includes('hard_')) return
    const passed = Number(data?.passed) || 0
    const total = Number(data?.total) || 5
    const scoreVal = total > 0 ? Math.round((passed / total) * 5) : 0

    const isSql = String(key).toLowerCase().includes('sql')
    if (isSql) {
      if (sqlIdx < SQL_SLOT_COUNT && grouped.sql[sqlIdx] === 0) {
        grouped.sql[sqlIdx] = scoreVal
        sqlIdx++
      }
    } else {
      if (pyIdx < PYTHON_SLOT_COUNT && grouped.py[pyIdx] === 0) {
        grouped.py[pyIdx] = scoreVal
        pyIdx++
      }
    }
  })

  return grouped
}

function ProblemDetailTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

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
            const scores = normalizeProblemScores(row)

            return (
              <tr key={row.id ? `detail_${row.id}` : `${row.candidate_id || 'cand'}_${idx}`}>
                <td className="id-cell">{row.candidate_id}</td>
                <td className="name-cell">{row.name}</td>
                {Array.from({ length: PYTHON_SLOT_COUNT }, (_, index) => (
                  <td key={`python-${index}`} className="python-col">
                    <ScoreChip score={scores.py[index] ?? 0} />
                  </td>
                ))}
                {Array.from({ length: SQL_SLOT_COUNT }, (_, index) => (
                  <td key={`sql-${index}`} className="sql-col">
                    <ScoreChip score={scores.sql[index] ?? 0} />
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