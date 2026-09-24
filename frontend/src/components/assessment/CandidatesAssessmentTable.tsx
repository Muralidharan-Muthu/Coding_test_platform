import React, { useState, useMemo } from 'react'
import {
  FiCode,
  FiShield,
  FiChevronDown,
  FiChevronUp,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiClock,
  FiCalendar,
  FiLayers,
  FiArrowUp,
  FiArrowDown,
  FiX,
  FiAlertCircle
} from 'react-icons/fi'

interface CandidatesAssessmentTableProps {
  data: any[]
  totalRawCount?: number
  activeFilterLabel?: string
  onClearFilter?: () => void
  onViewCode: (candidate: any) => void
  onViewLogs: (logs: any[], candidateName: string) => void
}

type SortField = 'date' | 'name' | 'score' | 'trust'
type SortOrder = 'asc' | 'desc'

export default function CandidatesAssessmentTable({
  data = [],
  totalRawCount,
  activeFilterLabel,
  onClearFilter,
  onViewCode,
  onViewLogs,
}: CandidatesAssessmentTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Calculate proctoring trust score
  const calculateTrustScore = (logs: any[] = []) => {
    if (!Array.isArray(logs) || logs.length === 0) return 100
    let deductions = 0
    logs.forEach(log => {
      const count = Number(log?.count) || 1
      const type = String(log?.violation_type || '').toLowerCase()
      let weight = 2
      if (type.includes('phone') || type.includes('mobile')) weight = 25
      else if (type.includes('multiple_face') || type.includes('external')) weight = 15
      else if (type.includes('fullscreen') || type.includes('tab')) weight = 5
      deductions += weight * count
    })
    return Math.max(0, 100 - deductions)
  }

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortOrder(field === 'trust' ? 'asc' : 'desc') // By default: lowest trust first or newest/highest first
    }
    setCurrentPage(1)
  }

  // Sorted candidates
  const sortedData = useMemo(() => {
    const list = [...data]
    list.sort((a, b) => {
      let comparison = 0

      switch (sortField) {
        case 'name': {
          const nameA = (a.user_name || a.name || '').toLowerCase()
          const nameB = (b.user_name || b.name || '').toLowerCase()
          comparison = nameA.localeCompare(nameB)
          break
        }
        case 'date': {
          const dateA = new Date(a.test_date || a.created_at || a.submit_time || 0).getTime()
          const dateB = new Date(b.test_date || b.created_at || b.submit_time || 0).getTime()
          comparison = dateA - dateB
          break
        }
        case 'score': {
          const scoreA = Number(a.overall_percentage) || Number(a.overall_score) || 0
          const scoreB = Number(b.overall_percentage) || Number(b.overall_score) || 0
          comparison = scoreA - scoreB
          break
        }
        case 'trust': {
          const trustA = calculateTrustScore(a.logs)
          const trustB = calculateTrustScore(b.logs)
          comparison = trustA - trustB
          break
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })
    return list
  }, [data, sortField, sortOrder])

  // Pagination calculations
  const totalItems = sortedData.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure currentPage doesn't exceed totalPages if data shrinks
  const safeCurrentPage = Math.min(currentPage, totalPages)

  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return sortedData.slice(start, start + pageSize)
  }, [sortedData, safeCurrentPage, pageSize])

  const toggleExpand = (rowKey: string) => {
    setExpandedRows(prev => ({ ...prev, [rowKey]: !prev[rowKey] }))
  }

  const getInitials = (name = '') => {
    return name
      .split(' ')
      .map(part => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (Number.isNaN(d.getTime())) return dateStr
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return dateStr
    }
  }

  // Generate pagination page numbers
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    const maxButtons = 5
    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (safeCurrentPage > 3) {
        pages.push('...')
      }
      const start = Math.max(2, safeCurrentPage - 1)
      const end = Math.min(totalPages - 1, safeCurrentPage + 1)
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      if (safeCurrentPage < totalPages - 2) {
        pages.push('...')
      }
      pages.push(totalPages)
    }
    return pages
  }, [totalPages, safeCurrentPage])

  return (
    <div className="bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] rounded-2xl shadow-sm overflow-hidden transition">
      
      {/* ── Table Top Action & Summary Bar ── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#3e3e3e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-[#2a2a2a]/60">
        
        {/* Left: Summary & Active Filter Tag */}
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#eff1f6] tracking-tight">
            Assessment Records
          </h2>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-[#eff1f6] border border-slate-200 dark:border-[#3e3e3e]">
            {totalItems} {totalItems === 1 ? 'Candidate' : 'Candidates'}
            {typeof totalRawCount === 'number' && totalRawCount !== totalItems && ` of ${totalRawCount}`}
          </span>

          {activeFilterLabel && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30">
              <span>Filter: {activeFilterLabel}</span>
              {onClearFilter && (
                <button
                  type="button"
                  onClick={onClearFilter}
                  className="hover:text-amber-300 transition cursor-pointer"
                  title="Clear filter"
                >
                  <FiX size={12} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: Rows per page selector */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#b0b0b0]">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setCurrentPage(1)
            }}
            className="px-2.5 py-1 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3e3e3e] rounded-lg text-slate-800 dark:text-[#eff1f6] text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#ffa116] cursor-pointer"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {/* ── Table Content ── */}
      {totalItems === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1a1a1a] text-slate-400 flex items-center justify-center mx-auto">
            <FiAlertCircle size={22} />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-[#eff1f6]">No Assessments Found</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#b0b0b0] max-w-md mx-auto">
            No candidate assessments match your search criteria. Try modifying your search term or clearing the active filters.
          </p>
          {onClearFilter && (
            <button
              type="button"
              onClick={onClearFilter}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-[#ffa116] hover:bg-[#e88f0a] rounded-xl transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[#3e3e3e] bg-slate-50/70 dark:bg-[#1a1a1a]/80 text-[11px] font-semibold text-slate-400 dark:text-[#8a8a8a] uppercase tracking-wider select-none">
                <th className="py-4 px-4 w-12 text-center">#</th>
                
                {/* Candidate Name Sortable */}
                <th
                  onClick={() => handleSort('name')}
                  className="py-4 px-6 min-w-[220px] cursor-pointer hover:text-slate-700 dark:hover:text-[#eff1f6] transition"
                  title="Sort by Candidate Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Candidate</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <FiArrowUp size={12} className="text-[#ffa116]" /> : <FiArrowDown size={12} className="text-[#ffa116]" />
                    ) : (
                      <span className="opacity-0 hover:opacity-50">↕</span>
                    )}
                  </div>
                </th>

                {/* Date Sortable */}
                <th
                  onClick={() => handleSort('date')}
                  className="py-4 px-6 min-w-[190px] cursor-pointer hover:text-slate-700 dark:hover:text-[#eff1f6] transition"
                  title="Sort by Test Date"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date & Duration</span>
                    {sortField === 'date' ? (
                      sortOrder === 'asc' ? <FiArrowUp size={12} className="text-[#ffa116]" /> : <FiArrowDown size={12} className="text-[#ffa116]" />
                    ) : (
                      <span className="opacity-0 hover:opacity-50">↕</span>
                    )}
                  </div>
                </th>

                <th className="py-4 px-6 min-w-[220px]">Section Scores</th>

                {/* Score Sortable */}
                <th
                  onClick={() => handleSort('score')}
                  className="py-4 px-6 min-w-[150px] cursor-pointer hover:text-slate-700 dark:hover:text-[#eff1f6] transition"
                  title="Sort by Overall Score"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Overall Score</span>
                    {sortField === 'score' ? (
                      sortOrder === 'asc' ? <FiArrowUp size={12} className="text-[#ffa116]" /> : <FiArrowDown size={12} className="text-[#ffa116]" />
                    ) : (
                      <span className="opacity-0 hover:opacity-50">↕</span>
                    )}
                  </div>
                </th>

                <th className="py-4 px-6 w-32">Verdict</th>

                {/* Proctoring Sortable */}
                <th
                  onClick={() => handleSort('trust')}
                  className="py-4 px-6 min-w-[160px] cursor-pointer hover:text-slate-700 dark:hover:text-[#eff1f6] transition"
                  title="Sort by Proctoring Trust (find violations)"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proctoring</span>
                    {sortField === 'trust' ? (
                      sortOrder === 'asc' ? <FiArrowUp size={12} className="text-[#ffa116]" /> : <FiArrowDown size={12} className="text-[#ffa116]" />
                    ) : (
                      <span className="opacity-0 hover:opacity-50">↕</span>
                    )}
                  </div>
                </th>

                <th className="py-4 px-6 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#3e3e3e] text-xs sm:text-sm">
              {paginatedData.map((row: any, idx: number) => {
                const rowKey = row.id ? `assessment_${row.id}` : `${row.candidate_id || 'cand'}_${idx}`
                const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1
                const isExpanded = Boolean(expandedRows[rowKey])
                const candidateName = row.user_name || row.name || 'Candidate'
                const initials = getInitials(candidateName)

                const isAuto = (row.submission_type || '').toLowerCase() === 'auto'
                const overallPercentage = Math.round(Number(row.overall_percentage) || 0)
                const maxPossibleScore = Number(row.max_possible_score) || 200
                const overallScore = Number(row.overall_score) || 0
                const verdict = row.overall_verdict || (overallPercentage >= 70 ? 'Good' : overallPercentage >= 40 ? 'Average' : 'Below Average')

                // Proctoring metrics
                const logs = Array.isArray(row.logs) ? row.logs : []
                const violationCount = logs.reduce((acc: number, l: any) => acc + (Number(l?.count) || 1), 0)
                const trustScore = calculateTrustScore(logs)

                // Problem testcases
                const problemTestcases = row.problem_testcases || {}
                const hasProblems = Object.keys(problemTestcases).length > 0

                return (
                  <React.Fragment key={rowKey}>
                    <tr className="hover:bg-slate-50/80 dark:hover:bg-[#333333]/40 transition-colors">
                      {/* Row index */}
                      <td className="py-4 px-4 text-center font-mono text-xs text-slate-400">
                        {rowNumber}
                      </td>

                      {/* Candidate Avatar, Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/25 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 dark:text-[#eff1f6] block truncate">
                              {candidateName}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-[#8a8a8a] font-mono block truncate">
                              {row.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Test Date & Duration */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-700 dark:text-[#eff1f6] font-medium flex items-center gap-1.5">
                            <FiCalendar size={12} className="text-slate-400" />
                            <span>{formatDate(row.test_date || row.created_at || row.submit_time)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#8a8a8a]">
                            <FiClock size={11} className="text-slate-400" />
                            <span>{row.time_taken_minutes || row.duration || '—'} mins</span>
                            <span className="text-slate-400">•</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              isAuto 
                                ? 'bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30 font-semibold' 
                                : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a] border border-slate-200 dark:border-[#3e3e3e]'
                            }`}>
                              {isAuto ? 'Auto !' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Section Scores - Unified UI Design with Primary Accent */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          {row.python_score !== undefined && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#eff1f6] border border-slate-200 dark:border-[#3e3e3e]">
                              <span className="text-[#ffa116] font-semibold mr-1.5">PY</span> {row.python_score}
                            </span>
                          )}
                          {row.sql_score !== undefined && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#eff1f6] border border-slate-200 dark:border-[#3e3e3e]">
                              <span className="text-[#ffa116] font-semibold mr-1.5">SQL</span> {row.sql_score}
                            </span>
                          )}
                          {row.mcq_score !== undefined && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#eff1f6] border border-slate-200 dark:border-[#3e3e3e]">
                              <span className="text-[#ffa116] font-semibold mr-1.5">MCQ</span> {row.mcq_score}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Overall Score - Clean Primary Progress Indicator */}
                      <td className="py-4 px-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 dark:text-[#eff1f6]">
                              {overallPercentage}%
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {overallScore}/{maxPossibleScore}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-[#1a1a1a] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#ffa116]"
                              style={{ width: `${Math.min(100, Math.max(0, overallPercentage))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Verdict Badge */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          verdict.toLowerCase() === 'good'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/25'
                            : verdict.toLowerCase() === 'average'
                            ? 'bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30'
                            : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a] border border-slate-200 dark:border-[#3e3e3e]'
                        }`}>
                          {verdict}
                        </span>
                      </td>

                      {/* Proctoring Trust - Clean Neutral Pill with Brand Shield */}
                      <td className="py-4 px-6">
                        <button
                          type="button"
                          onClick={() => onViewLogs(logs, candidateName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#eff1f6] border border-slate-200 dark:border-[#3e3e3e] hover:border-[#ffa116]/50 hover:bg-slate-200/50 dark:hover:bg-[#282828] transition cursor-pointer"
                          title="Click to view proctoring violation logs"
                        >
                          <FiShield size={12} className="text-[#ffa116]" />
                          <span className="font-semibold">{trustScore}/100</span>
                          {violationCount > 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-[#8a8a8a] font-mono">
                              ({violationCount} flags)
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onViewCode(row)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-[#eff1f6] bg-slate-100 hover:bg-slate-200 dark:bg-[#1a1a1a] dark:hover:bg-[#333333] border border-slate-200 dark:border-[#3e3e3e] rounded-lg transition cursor-pointer"
                            title="Inspect candidate submission code"
                          >
                            <FiCode size={12} className="text-slate-400" />
                            <span>Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleExpand(rowKey)}
                            className={`p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#eff1f6] rounded-lg transition cursor-pointer ${
                              isExpanded ? 'bg-slate-200 dark:bg-[#3e3e3e] text-slate-800 dark:text-[#eff1f6]' : ''
                            }`}
                            title={isExpanded ? 'Collapse testcase breakdown' : 'Expand testcase breakdown'}
                          >
                            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* ── Inline Expandable Detail Drawer ── */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-[#1e1e1e] border-b border-slate-200 dark:border-[#3e3e3e]">
                        <td colSpan={8} className="p-4 sm:p-5">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#333333] pb-2">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8a8a8a] flex items-center gap-1.5">
                                <FiLayers size={13} className="text-[#ffa116]" />
                                <span>Problem & Evaluation Breakdown — {candidateName}</span>
                              </h4>
                              <button
                                type="button"
                                onClick={() => onViewCode(row)}
                                className="text-xs font-medium text-[#ffa116] hover:underline"
                              >
                                Open Code Review Modal →
                              </button>
                            </div>

                            {/* Problem Testcases Grid */}
                            <div>
                              <span className="text-[11px] font-bold text-slate-400 dark:text-[#8a8a8a] uppercase tracking-wider block mb-2">
                                Testcases & Solved Problems
                              </span>
                              {hasProblems ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {Object.entries(problemTestcases).map(([probKey, probData]: any) => {
                                    const passed = Number(probData?.passed) || 0
                                    const total = Number(probData?.total) || 5
                                    const isFullPass = passed === total
                                    return (
                                      <div
                                        key={probKey}
                                        className="p-3 rounded-xl bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#3e3e3e] flex items-center justify-between shadow-xs"
                                      >
                                        <div>
                                          <span className="text-xs font-bold text-slate-800 dark:text-[#eff1f6] block">
                                            {probKey.replace(/_/g, ' ').toUpperCase()}
                                          </span>
                                          <span className="text-[11px] text-slate-500 dark:text-[#8a8a8a]">
                                            {passed}/{total} Testcases Passed
                                          </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                                          isFullPass
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : passed > 0
                                            ? 'bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/20'
                                            : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a] border border-slate-200 dark:border-[#3e3e3e]'
                                        }`}>
                                          {Math.round((passed / total) * 100)}%
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 dark:text-[#8a8a8a]">
                                  No problem-level testcase details recorded for this session.
                                </p>
                              )}
                            </div>

                            {/* Proctoring Highlights */}
                            <div className="pt-2 border-t border-slate-200 dark:border-[#333333] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FiShield size={14} className={violationCount > 0 ? 'text-[#ffa116]' : 'text-emerald-500'} />
                                <span className="text-xs text-slate-700 dark:text-[#eff1f6]">
                                  {violationCount === 0 
                                    ? 'No proctoring violations recorded. Session integrity verified clean.' 
                                    : `${violationCount} proctoring violation event(s) recorded during this examination.`}
                                </span>
                              </div>
                              {logs.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => onViewLogs(logs, candidateName)}
                                  className="text-xs font-semibold text-[#ffa116] hover:underline cursor-pointer"
                                >
                                  View Proctoring Violation Logs →
                                </button>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Scalable Pagination Footer ── */}
      {totalItems > 0 && (
        <div className="p-4 border-t border-slate-100 dark:border-[#3e3e3e] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#8a8a8a] bg-slate-50/50 dark:bg-[#2a2a2a]/60">
          <div>
            Showing <strong className="text-slate-800 dark:text-[#eff1f6]">{(safeCurrentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-slate-800 dark:text-[#eff1f6]">{Math.min(safeCurrentPage * pageSize, totalItems)}</strong> of{' '}
            <strong className="text-slate-800 dark:text-[#eff1f6]">{totalItems}</strong> entries
          </div>

          <div className="flex items-center gap-1">
            {/* First Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#3e3e3e] hover:bg-white dark:hover:bg-[#333333] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="First Page"
            >
              <FiChevronsLeft size={14} />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={safeCurrentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#3e3e3e] hover:bg-white dark:hover:bg-[#333333] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Previous Page"
            >
              <FiChevronLeft size={14} />
            </button>

            {/* Numbered Page Buttons */}
            <div className="flex items-center gap-1 mx-1">
              {pageNumbers.map((page, idx) => {
                if (typeof page === 'string') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                      ...
                    </span>
                  )
                }
                const isActive = page === safeCurrentPage
                return (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-[#ffa116] text-slate-900 shadow-xs'
                        : 'border border-slate-200 dark:border-[#3e3e3e] hover:bg-white dark:hover:bg-[#333333] text-slate-700 dark:text-[#eff1f6]'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
            </div>

            {/* Next Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#3e3e3e] hover:bg-white dark:hover:bg-[#333333] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Next Page"
            >
              <FiChevronRight size={14} />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-[#3e3e3e] hover:bg-white dark:hover:bg-[#333333] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Last Page"
            >
              <FiChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
