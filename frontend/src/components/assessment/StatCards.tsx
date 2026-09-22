import './StatCards.css'

function StatCards({ stats }) {
  return (
    <div className="stat-cards">
      <div className="stat-card">
        <div className="stat-icon total-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM2.25 12a9.75 9.75 0 1119.5 0 9.75 9.75 0 01-19.5 0z" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Candidates</span>
        </div>
      </div>

      <div className="stat-card good">
        <div className="stat-icon good-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-value">{stats.good}</span>
          <span className="stat-label">Good</span>
        </div>
      </div>

      <div className="stat-card average">
        <div className="stat-icon average-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.25 12a.75.75 0 01.75-.75h6a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-value">{stats.average}</span>
          <span className="stat-label">Average</span>
        </div>
      </div>

      <div className="stat-card below-average">
        <div className="stat-icon below-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-value">{stats.belowAverage}</span>
          <span className="stat-label">Below Average</span>
        </div>
      </div>

      <div className="stat-card auto">
        <div className="stat-icon auto-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-value">{stats.autoSubmitted}</span>
          <span className="stat-label">Auto-Submitted</span>
        </div>
      </div>
    </div>
  )
}

export default StatCards
