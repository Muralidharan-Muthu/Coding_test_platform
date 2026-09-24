import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import CandidatesAssessmentTable from '../components/assessment/CandidatesAssessmentTable'
import CodeReviewModal from '../components/assessment/CodeReviewModal'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../components/ui/ToastProvider'
import { exportAssessmentResults, getProctoringReports } from '../services/assessmentApi'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from '../constants/data'
import {
  FiUsers,
  FiCheckCircle,
  FiMinusCircle,
  FiXCircle,
  FiClock,
  FiCalendar,
  FiFilter,
  FiRotateCcw,
  FiDownload,
  FiX,
  FiSearch
} from 'react-icons/fi'

export default function AssessmentDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [adminName, setAdminName] = useState('')

  // Top level search & filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeVerdictTab, setActiveVerdictTab] = useState('All')
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    verdict: 'All',
    submission_type: 'All',
    test_location: 'All'
  })

  // Modals state
  const [isCodeReviewOpen, setIsCodeReviewOpen] = useState(false)
  const [codeReviewCandidate, setCodeReviewCandidate] = useState<any>(null)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [selectedLogs, setSelectedLogs] = useState<any[]>([])
  const [selectedCandidateName, setSelectedCandidateName] = useState('')

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name || 'Admin User')
    loadResults()
  }, [navigate])

  // Hide side scrollbars on assessment page while keeping natural scroll behavior
  useEffect(() => {
    document.documentElement.classList.add('no-scrollbar')
    document.body.classList.add('no-scrollbar')
    return () => {
      document.documentElement.classList.remove('no-scrollbar')
      document.body.classList.remove('no-scrollbar')
    }
  }, [])

  const loadResults = async (customFilters = filters) => {
    setLoading(true)
    try {
      const response = await getProctoringReports(customFilters)
      setResults(response.data || [])
    } catch (err) {
      console.error('Failed to load assessment results:', err)
      toast.error('Failed to load assessment data')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilter = () => {
    loadResults(filters)
  }

  const handleResetFilter = () => {
    const reset = {
      date_from: '',
      date_to: '',
      verdict: 'All',
      submission_type: 'All',
      test_location: 'All'
    }
    setFilters(reset)
    setSearchQuery('')
    setActiveVerdictTab('All')
    loadResults(reset)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAssessmentResults(filters)
      toast.success('Excel report downloaded successfully.')
    } catch (err: any) {
      console.error('Failed to export:', err)
      toast.error(err.response?.data?.detail || 'Failed to export Excel report.')
    } finally {
      setExporting(false)
    }
  }

  const handleOpenCodeReview = (candidate: any) => {
    setCodeReviewCandidate({
      name: candidate.user_name || candidate.name || 'Candidate',
      email: candidate.email
    })
    setIsCodeReviewOpen(true)
  }

  const handleCloseCodeReview = () => {
    setIsCodeReviewOpen(false)
    setCodeReviewCandidate(null)
  }

  const handleOpenLogs = (logs: any[], candidateName: string) => {
    setSelectedLogs(logs || [])
    setSelectedCandidateName(candidateName)
    setIsLogModalOpen(true)
  }

  const handleCloseLogs = () => {
    setIsLogModalOpen(false)
    setSelectedLogs([])
    setSelectedCandidateName('')
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  // Summary Metrics
  const stats = useMemo(() => {
    const total = results.length
    const good = results.filter(r => (r.overall_verdict || '').toLowerCase() === 'good').length
    const average = results.filter(r => (r.overall_verdict || '').toLowerCase() === 'average').length
    const belowAverage = results.filter(r => (r.overall_verdict || '').toLowerCase() === 'below average').length
    const autoSubmitted = results.filter(r => (r.submission_type || '').toLowerCase() === 'auto').length
    return { total, good, average, belowAverage, autoSubmitted }
  }, [results])

  // Filtered dataset combining global filters & card filter
  const displayedResults = useMemo(() => {
    return results.filter(row => {
      // Quick card filter
      if (activeVerdictTab !== 'All') {
        if (activeVerdictTab === 'auto') {
          if ((row.submission_type || '').toLowerCase() !== 'auto') return false
        } else {
          if ((row.overall_verdict || '').toLowerCase() !== activeVerdictTab.toLowerCase()) return false
        }
      }

      // Top dropdown verdict filter
      if (filters.verdict !== 'All') {
        if ((row.overall_verdict || '').toLowerCase() !== filters.verdict.toLowerCase()) return false
      }

      // Top dropdown submission filter
      if (filters.submission_type !== 'All') {
        const type = (row.submission_type || '').toLowerCase()
        if (filters.submission_type.toLowerCase() === 'auto' && type !== 'auto') return false
        if (filters.submission_type.toLowerCase() === 'manual' && type !== 'manual') return false
      }

      // Search filter
      const q = searchQuery.trim().toLowerCase()
      if (q) {
        const name = (row.user_name || row.name || '').toLowerCase()
        const email = (row.email || '').toLowerCase()
        const id = (row.candidate_id || '').toLowerCase()
        if (!name.includes(q) && !email.includes(q) && !id.includes(q)) return false
      }

      return true
    })
  }, [results, activeVerdictTab, filters.verdict, filters.submission_type, searchQuery])

  // Active filter chip label for the table
  const activeFilterLabel = useMemo(() => {
    if (activeVerdictTab !== 'All') {
      return activeVerdictTab === 'auto' ? 'Auto-Submitted' : activeVerdictTab
    }
    if (filters.verdict !== 'All') return `Verdict: ${filters.verdict}`
    if (filters.submission_type !== 'All') return `Type: ${filters.submission_type}`
    if (searchQuery.trim()) return `Search: "${searchQuery.trim()}"`
    return undefined
  }, [activeVerdictTab, filters.verdict, filters.submission_type, searchQuery])

  // Card click toggles quick filter
  const handleStatCardClick = (verdictKey: string) => {
    setActiveVerdictTab(prev => (prev === verdictKey ? 'All' : verdictKey))
  }

  return (
    <AdminSidebarLayout
      className="asd-page no-scrollbar bg-slate-50/60 dark:bg-[#1a1a1a] min-h-screen text-slate-800 dark:text-[#eff1f6]"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Top Header & Global Controls ── */}
        <div className="bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
                  Assessment Dashboard
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30">
                  {results.length} Completed
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#b0b0b0] mt-1">
                Candidate evaluation results, test performance metrics, and proctoring integrity.
              </p>
            </div>

            {/* Quick Action Export */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || results.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-[#ffa116] hover:bg-[#e88f0a] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                title="Download Excel Assessment Report"
              >
                <FiDownload size={14} />
                <span>{exporting ? 'Exporting Report...' : 'Download Excel'}</span>
              </button>
            </div>
          </div>

          {/* ── Aligned Executive Filter Bar ── */}
          <div className="pt-3 border-t border-slate-100 dark:border-[#3e3e3e] flex flex-wrap items-center gap-2.5">
            {/* Real-time search */}
            <div className="relative flex-1 min-w-[240px]">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search candidate name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3e3e3e] rounded-xl text-slate-800 dark:text-[#eff1f6] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ffa116]/30 focus:border-[#ffa116] transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-[#eff1f6]"
                >
                  <FiX size={13} />
                </button>
              )}
            </div>

            {/* Verdict Filter */}
            <select
              value={filters.verdict}
              onChange={(e) => setFilters(f => ({ ...f, verdict: e.target.value }))}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3e3e3e] rounded-xl text-slate-800 dark:text-[#eff1f6] focus:outline-none focus:ring-2 focus:ring-[#ffa116]/30 focus:border-[#ffa116] transition cursor-pointer"
            >
              <option value="All">All Verdicts</option>
              <option value="Good">Good (≥70%)</option>
              <option value="Average">Average (40–69%)</option>
              <option value="Below Average">Below Average (&lt;40%)</option>
            </select>

            {/* Submission Type */}
            <select
              value={filters.submission_type}
              onChange={(e) => setFilters(f => ({ ...f, submission_type: e.target.value }))}
              className="px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3e3e3e] rounded-xl text-slate-800 dark:text-[#eff1f6] focus:outline-none focus:ring-2 focus:ring-[#ffa116]/30 focus:border-[#ffa116] transition cursor-pointer"
            >
              <option value="All">All Submissions</option>
              <option value="Manual">Manual Submit</option>
              <option value="Auto">Auto (Time Up)</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3e3e3e] px-2.5 py-1.5 rounded-xl text-xs">
              <FiCalendar className="text-slate-400" size={13} />
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
                className="bg-transparent text-slate-700 dark:text-[#eff1f6] focus:outline-none text-xs"
                title="From Date"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
                className="bg-transparent text-slate-700 dark:text-[#eff1f6] focus:outline-none text-xs"
                title="To Date"
              />
            </div>

            {/* Filter & Reset Buttons */}
            <button
              type="button"
              onClick={handleApplyFilter}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-[#ffa116] hover:bg-[#e88f0a] active:bg-[#d97706] rounded-xl transition cursor-pointer shadow-xs"
            >
              <FiFilter size={13} />
              <span>Apply</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilter}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-[#b0b0b0] dark:hover:text-[#eff1f6] hover:bg-slate-100 dark:hover:bg-[#333333] rounded-xl transition cursor-pointer"
              title="Reset all filters"
            >
              <FiRotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* ── Clean & Aligned KPI Stat Cards (Unified Palette) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Candidates */}
          <div
            onClick={() => handleStatCardClick('All')}
            className={`p-4 rounded-2xl bg-white dark:bg-[#282828] border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
              activeVerdictTab === 'All'
                ? 'border-[#ffa116] ring-2 ring-[#ffa116]/20 bg-[#ffa116]/[0.02]'
                : 'border-slate-200/80 dark:border-[#3e3e3e] hover:border-slate-300 dark:hover:border-[#4d4d4d]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-[#8a8a8a] block">
                Total Candidates
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
                {stats.total}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
              activeVerdictTab === 'All'
                ? 'bg-[#ffa116]/15 text-[#ffa116]'
                : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a]'
            }`}>
              <FiUsers size={18} />
            </div>
          </div>

          {/* Card 2: Good */}
          <div
            onClick={() => handleStatCardClick('Good')}
            className={`p-4 rounded-2xl bg-white dark:bg-[#282828] border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
              activeVerdictTab === 'Good'
                ? 'border-[#ffa116] ring-2 ring-[#ffa116]/20 bg-[#ffa116]/[0.02]'
                : 'border-slate-200/80 dark:border-[#3e3e3e] hover:border-slate-300 dark:hover:border-[#4d4d4d]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-[#8a8a8a] block">
                Good (≥70%)
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
                {stats.good}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
              activeVerdictTab === 'Good'
                ? 'bg-[#ffa116]/15 text-[#ffa116]'
                : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a]'
            }`}>
              <FiCheckCircle size={18} />
            </div>
          </div>

          {/* Card 3: Average */}
          <div
            onClick={() => handleStatCardClick('Average')}
            className={`p-4 rounded-2xl bg-white dark:bg-[#282828] border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
              activeVerdictTab === 'Average'
                ? 'border-[#ffa116] ring-2 ring-[#ffa116]/20 bg-[#ffa116]/[0.02]'
                : 'border-slate-200/80 dark:border-[#3e3e3e] hover:border-slate-300 dark:hover:border-[#4d4d4d]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-[#8a8a8a] block">
                Average (40–69%)
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
                {stats.average}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
              activeVerdictTab === 'Average'
                ? 'bg-[#ffa116]/15 text-[#ffa116]'
                : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a]'
            }`}>
              <FiMinusCircle size={18} />
            </div>
          </div>

          {/* Card 4: Below Average */}
          <div
            onClick={() => handleStatCardClick('Below Average')}
            className={`p-4 rounded-2xl bg-white dark:bg-[#282828] border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
              activeVerdictTab === 'Below Average'
                ? 'border-[#ffa116] ring-2 ring-[#ffa116]/20 bg-[#ffa116]/[0.02]'
                : 'border-slate-200/80 dark:border-[#3e3e3e] hover:border-slate-300 dark:hover:border-[#4d4d4d]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-[#8a8a8a] block">
                Below Average (&lt;40%)
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
                {stats.belowAverage}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
              activeVerdictTab === 'Below Average'
                ? 'bg-[#ffa116]/15 text-[#ffa116]'
                : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a]'
            }`}>
              <FiXCircle size={18} />
            </div>
          </div>

          {/* Card 5: Auto-Submitted */}
          <div
            onClick={() => handleStatCardClick('auto')}
            className={`p-4 rounded-2xl bg-white dark:bg-[#282828] border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
              activeVerdictTab === 'auto'
                ? 'border-[#ffa116] ring-2 ring-[#ffa116]/20 bg-[#ffa116]/[0.02]'
                : 'border-slate-200/80 dark:border-[#3e3e3e] hover:border-slate-300 dark:hover:border-[#4d4d4d]'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-xs font-medium text-slate-500 dark:text-[#8a8a8a] block">
                Auto-Submitted
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
                {stats.autoSubmitted}
              </span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
              activeVerdictTab === 'auto'
                ? 'bg-[#ffa116]/15 text-[#ffa116]'
                : 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#8a8a8a]'
            }`}>
              <FiClock size={18} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] rounded-2xl text-center">
            <Spinner label="Loading assessment records…" size={44} />
          </div>
        ) : (
          <CandidatesAssessmentTable
            data={displayedResults}
            totalRawCount={results.length}
            activeFilterLabel={activeFilterLabel}
            onClearFilter={handleResetFilter}
            onViewCode={handleOpenCodeReview}
            onViewLogs={handleOpenLogs}
          />
        )}

      </div>

      {/* ── Proctoring Violation Logs Modal ── */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#3e3e3e] rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-[#3e3e3e] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffa116]">
                  Proctoring Violations Log
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-[#eff1f6]">
                  {selectedCandidateName}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseLogs}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#eff1f6] rounded-xl hover:bg-slate-100 dark:hover:bg-[#333333] transition"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 text-xs">
              {selectedLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-[#b0b0b0]">
                  No violation events recorded. Session completed cleanly.
                </div>
              ) : (
                selectedLogs.map((log: any, i: number) => {
                  const count = Number(log.count) || 1
                  return (
                    <div
                      key={log.id || `${log.timestamp}-${i}`}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#3e3e3e] flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-[#eff1f6]">
                          {log.message || log.violation_type || 'Flagged Event'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Timestamp not recorded'}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-rose-500/10 text-rose-500 border border-rose-500/20 flex-shrink-0">
                        {count === 1 ? '1 event' : `${count} events`}
                      </span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-[#3e3e3e] flex justify-end bg-slate-50/50 dark:bg-[#2a2a2a]/40">
              <button
                type="button"
                onClick={handleCloseLogs}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#eff1f6] bg-slate-200 dark:bg-[#333333] hover:bg-slate-300 dark:hover:bg-[#3e3e3e] rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Code Review Modal ── */}
      <CodeReviewModal
        isOpen={isCodeReviewOpen}
        onClose={handleCloseCodeReview}
        candidate={codeReviewCandidate}
      />
    </AdminSidebarLayout>
  )
}
