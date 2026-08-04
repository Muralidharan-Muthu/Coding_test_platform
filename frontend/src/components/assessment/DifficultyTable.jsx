import './DifficultyTable.css'

// Question counts per difficulty (fixed for this platform)
const Q_EASY   = 4
const Q_MEDIUM = 4
const Q_HARD   = 2
const Q_TOTAL  = Q_EASY + Q_MEDIUM + Q_HARD

function QCountBadge({ count }) {
  return <span className="q-count-badge">{count} Qs</span>
}

function SolvedScore({ solved, total }) {
  const percentage = total > 0 ? (solved / total) * 100 : 0
  let colorClass = 'score-red'
  if (percentage >= 70) colorClass = 'score-green'
  else if (percentage >= 35) colorClass = 'score-yellow'

  return (
    <span className={`solved-score ${colorClass}`}>
      {total === 0 ? '—' : solved}
    </span>
  )
}

function DifficultyTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

  return (
    <div className="table-scroll-container">
      <table className="difficulty-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            <th>Easy</th>
            <th>Medium</th>
            <th>Hard</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const tc = row.problem_testcases || {}
            const easySolved   = tc.easy_solved   || 0
            const easyTotal    = tc.easy_total    || 0
            const mediumSolved = tc.medium_solved || 0
            const mediumTotal  = tc.medium_total  || 0
            const hardSolved   = tc.hard_solved   || 0
            const hardTotal    = tc.hard_total    || 0
            const totalSolved  = easySolved + mediumSolved + hardSolved
            const totalTests   = easyTotal + mediumTotal + hardTotal

            return (
              <tr key={row.candidate_id || idx}>
                <td className="id-cell">{row.candidate_id}</td>
                <td className="name-cell">{row.name}</td>
                <td><SolvedScore solved={easySolved}   total={easyTotal} /></td>
                <td><SolvedScore solved={mediumSolved} total={mediumTotal} /></td>
                <td><SolvedScore solved={hardSolved}   total={hardTotal} /></td>
                <td><SolvedScore solved={totalSolved}  total={totalTests} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default DifficultyTable
