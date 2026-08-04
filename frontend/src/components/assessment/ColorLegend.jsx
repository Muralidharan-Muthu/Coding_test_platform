import './ColorLegend.css'

function ColorLegend() {
  return (
    <div className="color-legend">
      <h3 className="legend-title">Color Guide</h3>
      <div className="legend-sections">
        {/* Score Legend */}
        <div className="legend-section">
          <span className="section-label">Problem Scores:</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-chip chip-5">5</span>
              <span className="legend-text">Excellent</span>
            </div>
            <div className="legend-item">
              <span className="legend-chip chip-4">4</span>
              <span className="legend-text">Good</span>
            </div>
            <div className="legend-item">
              <span className="legend-chip chip-3">3</span>
              <span className="legend-text">Average</span>
            </div>
            <div className="legend-item">
              <span className="legend-chip chip-2">2</span>
              <span className="legend-text">Below Avg</span>
            </div>
            <div className="legend-item">
              <span className="legend-chip chip-1">1</span>
              <span className="legend-text">Poor</span>
            </div>
          </div>
        </div>

        {/* Column Legend */}
        <div className="legend-section">
          <span className="section-label">Columns:</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-bar bar-python"></span>
              <span className="legend-text">Python</span>
            </div>
            <div className="legend-item">
              <span className="legend-bar bar-sql"></span>
              <span className="legend-text">SQL</span>
            </div>
            <div className="legend-item">
              <span className="legend-bar bar-total"></span>
              <span className="legend-text">Overall/Total</span>
            </div>
          </div>
        </div>

        {/* Difficulty Legend */}
        <div className="legend-section">
          <span className="section-label">Difficulty:</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-bar bar-easy"></span>
              <span className="legend-text">Easy</span>
            </div>
            <div className="legend-item">
              <span className="legend-bar bar-medium"></span>
              <span className="legend-text">Medium</span>
            </div>
            <div className="legend-item">
              <span className="legend-bar bar-hard"></span>
              <span className="legend-text">Hard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ColorLegend
