import './DifficultyTable.css'

function SolvedScore({ solved, total }) {
  if (total === 0) return <span className="solved-score score-gray">—</span>
  const percentage = (solved / total) * 100
  let colorClass = 'score-red'
  if (percentage >= 70) colorClass = 'score-green'
  else if (percentage >= 35) colorClass = 'score-yellow'

  return (
    <span className={`solved-score ${colorClass}`}>
      {solved}/{total}
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
            let easySolved   = Number(tc.easy_solved) || 0
            let easyTotal    = Number(tc.easy_total) || 0
            let mediumSolved = Number(tc.medium_solved) || 0
            let mediumTotal  = Number(tc.medium_total) || 0
            let hardSolved   = Number(tc.hard_solved) || 0
            let hardTotal    = Number(tc.hard_total) || 0

            // If totals are 0, fallback to calculating from testcase entries or total questions
            if (easyTotal === 0 && mediumTotal === 0 && hardTotal === 0) {
              const totalQ = Number(row.total_questions) || 0
              if (totalQ > 0) {
                // Distribute standard 4-4-2 ratio or actual count
                easyTotal = Math.min(4, totalQ) * 5
                mediumTotal = Math.max(0, Math.min(4, totalQ - 4)) * 5
                hardTotal = Math.max(0, totalQ - 8) * 5
                const overallPct = Number(row.overall_percentage) || 0
                const totalTests = easyTotal + mediumTotal + hardTotal
                const totalSolved = Math.round((overallPct / 100) * totalTests)
                easySolved = Math.min(easyTotal, totalSolved)
                mediumSolved = Math.min(mediumTotal, Math.max(0, totalSolved - easySolved))
                hardSolved = Math.min(hardTotal, Math.max(0, totalSolved - easySolved - mediumSolved))
              }
            }

            const totalSolved  = easySolved + mediumSolved + hardSolved
            const totalTests   = easyTotal + mediumTotal + hardTotal

            return (
              <tr key={row.id ? `difficulty_${row.id}` : `${row.candidate_id || 'cand'}_${idx}`}>
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