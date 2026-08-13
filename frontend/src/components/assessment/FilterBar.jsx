import './FilterBar.css'

function FilterBar({
  filters,
  setFilters,
  onApply,
  onReset,
  onExport,
  exporting,
  displayCount,
  totalCount
}) {
  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="filter-bar">
      <div className="filter-main-row">
        {/* Date Range */}
        <div className="filter-group">
          <label htmlFor="fb-from">From</label>
          <input
            id="fb-from"
            type="date"
            value={filters.date_from}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="fb-to">To</label>
          <input
            id="fb-to"
            type="date"
            value={filters.date_to}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="fb-verdict">Verdict</label>
          <select
            id="fb-verdict"
            value={filters.verdict}
            onChange={(e) => handleChange('verdict', e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Below Average">Below Average</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fb-type">Submission Type</label>
          <select
            id="fb-type"
            value={filters.submission_type}
            onChange={(e) => handleChange('submission_type', e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="Manual">Manual</option>
            <option value="Auto">Auto (Time Up)</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="fb-location">Test Location</label>
          <select
            id="fb-location"
            value={filters.test_location}
            onChange={(e) => handleChange('test_location', e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="home">From Home</option>
            <option value="office">From Office</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="filter-group filter-actions-group">
          <label className="filter-label-spacer">&nbsp;</label>
          <div className="filter-actions">
            <button onClick={onApply} className="btn-apply">Apply Filter</button>
            <button onClick={onReset} className="btn-reset">Reset</button>
          </div>
        </div>

        {/* Spacer */}
        <div className="filter-spacer" />

        {/* Count badge */}
        <div className="filter-count-chip">
          Displaying <strong>{displayCount}</strong> of <strong>{totalCount}</strong> candidates
        </div>

        {/* Export */}
        <div className="filter-group filter-export-group">
          <label className="filter-label-spacer">&nbsp;</label>
          <button
            onClick={onExport}
            className="btn-export"
            disabled={exporting || displayCount === 0}
          >
            {exporting ? (
              <>
                <svg className="fb-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                Exporting…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
