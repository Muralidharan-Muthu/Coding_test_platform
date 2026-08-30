import { FiSearch, FiX, FiFilter, FiDownload, FiRotateCcw } from 'react-icons/fi'
import './FilterBar.css'

function FilterBar({
  searchQuery,
  onSearchChange,
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
        {/* ── Real-time Search Bar ── */}
        <div className="filter-search-box">
          <FiSearch className="filter-search-icon" size={15} />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search candidate name or email…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="filter-search-clear"
              onClick={() => onSearchChange('')}
              title="Clear search"
            >
              <FiX size={13} />
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div className="filter-group">
          <select
            id="fb-verdict"
            value={filters.verdict}
            onChange={(e) => {
              handleChange('verdict', e.target.value)
              setTimeout(onApply, 0)
            }}
            className="filter-select"
            title="Filter by Performance Verdict"
          >
            <option value="All">All Verdicts</option>
            <option value="Good">Good (≥70%)</option>
            <option value="Average">Average (40-69%)</option>
            <option value="Below Average">Below Average (&lt;40%)</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            id="fb-type"
            value={filters.submission_type}
            onChange={(e) => {
              handleChange('submission_type', e.target.value)
              setTimeout(onApply, 0)
            }}
            className="filter-select"
            title="Filter by Submission Type"
          >
            <option value="All">All Submissions</option>
            <option value="Manual">Manual Submit</option>
            <option value="Auto">Auto (Time Up)</option>
          </select>
        </div>

        <div className="filter-group">
          <input
            id="fb-from"
            type="date"
            value={filters.date_from}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="filter-input"
            title="From Date"
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>to</span>
          <input
            id="fb-to"
            type="date"
            value={filters.date_to}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="filter-input"
            title="To Date"
          />
        </div>

        {/* Action Buttons */}
        <div className="filter-actions">
          <button onClick={onApply} className="btn-apply" title="Apply date filters">
            <FiFilter size={12} /> Apply
          </button>
          <button onClick={onReset} className="btn-reset" title="Reset all filters">
            <FiRotateCcw size={12} /> Reset
          </button>
        </div>

        <div className="filter-spacer" />

        {/* Count badge */}
        <div className="filter-count-chip">
          Showing <strong>{displayCount}</strong> of <strong>{totalCount}</strong> candidates
        </div>

        {/* Export */}
        <button
          onClick={onExport}
          className="btn-export"
          disabled={exporting || displayCount === 0}
          title="Download Excel Report"
        >
          {exporting ? (
            <>
              <svg className="fb-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              Exporting…
            </>
          ) : (
            <>
              <FiDownload size={13} /> Download Excel
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default FilterBar