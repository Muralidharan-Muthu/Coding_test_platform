import React, { useEffect, useState } from 'react'
import { getCandidateSubmissions } from '../../services/assessmentApi'
import Spinner from '../ui/Spinner'
import { FiX, FiCode, FiClock, FiCheckCircle, FiAlertCircle, FiCheck, FiHelpCircle } from 'react-icons/fi'

interface CodeReviewModalProps {
  isOpen: boolean
  onClose: () => void
  candidate: { id?: string | number; name?: string; email?: string; test_type?: string } | null
}

export default function CodeReviewModal({ isOpen, onClose, candidate }: CodeReviewModalProps) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'visual' | 'code'>('visual')

  useEffect(() => {
    if (isOpen && candidate?.email) {
      loadSubmissions()
    }
  }, [isOpen, candidate])

  const loadSubmissions = async () => {
    if (!candidate?.email) return
    setLoading(true)
    setError(null)
    try {
      const data = await getCandidateSubmissions(candidate.email, candidate.id)
      const list = data?.submissions || []
      setSubmissions(list)
      if (list.length > 0) {
        setSelectedSubmission(list[0])
      }
    } catch (err) {
      console.error('Error loading submissions:', err)
      setError('Failed to load candidate submissions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const isMcq = selectedSubmission?.language === 'mcq'
  const isAllMcq = submissions.length > 0 && submissions.every(s => s.language === 'mcq')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-[#3e3e3e] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#3e3e3e] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffa116] block">
              {isAllMcq ? 'Candidate MCQ Review' : 'Candidate Assessment & Code Review'}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#eff1f6]">
              {candidate?.name || 'Candidate'}
              {candidate?.email && (
                <span className="text-xs font-normal text-slate-500 dark:text-[#8a8a8a] ml-2 font-mono">
                  ({candidate.email})
                </span>
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-[#eff1f6] hover:bg-slate-100 dark:hover:bg-[#333333] rounded-xl transition cursor-pointer"
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[380px]">
          {loading && (
            <div className="flex-1 flex items-center justify-center py-20">
              <Spinner label="Loading candidate assessment questions & responses…" size={36} />
            </div>
          )}

          {error && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center space-y-3">
              <FiAlertCircle size={32} className="text-rose-500" />
              <p className="text-sm text-rose-500 font-medium">{error}</p>
              <button
                type="button"
                onClick={loadSubmissions}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-[#ffa116] hover:bg-[#e88f0a] rounded-xl transition cursor-pointer shadow-xs"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && submissions.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 text-center space-y-2">
              <FiCode size={32} className="text-slate-400" />
              <p className="text-sm font-semibold text-slate-700 dark:text-[#eff1f6]">
                No questions or code submissions found for this assessment.
              </p>
            </div>
          )}

          {!loading && !error && submissions.length > 0 && (
            <>
              {/* Submissions / Questions List Sidebar */}
              <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-100 dark:border-[#3e3e3e] bg-slate-50/60 dark:bg-[#202020] p-3 overflow-y-auto space-y-2">
                <div className="text-[11px] font-bold text-slate-400 dark:text-[#8a8a8a] uppercase tracking-wider px-1">
                  Questions ({submissions.length})
                </div>
                <div className="space-y-1.5">
                  {submissions.map((sub, idx) => {
                    const isSelected = selectedSubmission?.submission_id === sub.submission_id
                    const passed = Number(sub.passed_tests) || 0
                    const total = Number(sub.total_tests) || 0
                    const isPass = total > 0 && passed === total
                    return (
                      <div
                        key={sub.submission_id || idx}
                        onClick={() => setSelectedSubmission(sub)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#ffa116]/10 border-[#ffa116] text-[#ffa116] shadow-xs'
                            : 'bg-white dark:bg-[#282828] border-slate-200 dark:border-[#3e3e3e] text-slate-700 dark:text-[#eff1f6] hover:border-slate-300 dark:hover:border-[#4d4d4d]'
                        }`}
                      >
                        <div className="text-xs font-bold truncate block">
                          {idx + 1}. {sub.problem_title || sub.problem_id}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px]">
                          <span className="font-mono text-slate-500 dark:text-[#8a8a8a] uppercase text-[10px]">
                            {sub.language}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-mono font-semibold text-[10px] ${
                            isPass
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {sub.language === 'mcq'
                              ? (isPass ? 'Correct' : 'Incorrect')
                              : `${passed}/${total} Passed`}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Submission / Question Detail View */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1a1a1a]">
                {selectedSubmission && (
                  <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden space-y-3">
                    {/* Problem Meta Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#3e3e3e]">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-[#eff1f6]">
                          {selectedSubmission.problem_title || selectedSubmission.problem_id}
                        </h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase bg-[#ffa116]/10 text-[#ffa116] border border-[#ffa116]/30">
                            {selectedSubmission.language}
                          </span>
                          {selectedSubmission.difficulty && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#282828] text-slate-600 dark:text-[#eff1f6] border border-slate-200 dark:border-[#3e3e3e]">
                              {selectedSubmission.difficulty}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            Number(selectedSubmission.passed_tests) === Number(selectedSubmission.total_tests) && Number(selectedSubmission.total_tests) > 0
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            Score: {selectedSubmission.score ?? 0}/{selectedSubmission.marks ?? 10}
                          </span>
                        </div>
                      </div>

                      {selectedSubmission.language === 'mcq' && (
                        <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#3e3e3e] p-0.5 bg-slate-100 dark:bg-[#282828] text-xs">
                          <button
                            type="button"
                            onClick={() => setViewMode('visual')}
                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                              viewMode === 'visual'
                                ? 'bg-white dark:bg-[#1a1a1a] text-[#ffa116] shadow-xs'
                                : 'text-slate-600 dark:text-[#8a8a8a]'
                            }`}
                          >
                            Interactive View
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewMode('code')}
                            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                              viewMode === 'code'
                                ? 'bg-white dark:bg-[#1a1a1a] text-[#ffa116] shadow-xs'
                                : 'text-slate-600 dark:text-[#8a8a8a]'
                            }`}
                          >
                            Details View
                          </button>
                        </div>
                      )}

                      {selectedSubmission.execution_time_ms > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                          <FiClock size={12} />
                          <span>{Number(selectedSubmission.execution_time_ms).toFixed(1)}ms</span>
                        </div>
                      )}
                    </div>

                    {/* Content: MCQ Visual View */}
                    {isMcq && viewMode === 'visual' ? (
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        {/* Question Text */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#242424] border border-slate-200 dark:border-[#3e3e3e]">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                            Question
                          </span>
                          <p className="text-sm text-slate-900 dark:text-[#eff1f6] font-medium whitespace-pre-wrap">
                            {selectedSubmission.question_text || selectedSubmission.problem_title}
                          </p>
                        </div>

                        {/* Options List */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                            Answer Choices & Candidate Response
                          </span>
                          {Array.isArray(selectedSubmission.options) && selectedSubmission.options.map((optText: string, optIdx: number) => {
                            if (!optText) return null
                            const optLetter = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx)
                            const isChosen = selectedSubmission.selected_option === optIdx
                            const isCorrectOpt = selectedSubmission.correct_answer === optIdx

                            let cardStyle = 'bg-white dark:bg-[#242424] border-slate-200 dark:border-[#3e3e3e] text-slate-700 dark:text-[#eff1f6]'
                            let badge = null

                            if (isChosen && isCorrectOpt) {
                              cardStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-semibold'
                              badge = (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  <FiCheck size={14} /> Candidate Answer (Correct)
                                </span>
                              )
                            } else if (isChosen && !isCorrectOpt) {
                              cardStyle = 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300 font-semibold'
                              badge = (
                                <span className="inline-flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400 font-bold">
                                  <FiX size={14} /> Candidate Answer (Incorrect)
                                </span>
                              )
                            } else if (isCorrectOpt) {
                              cardStyle = 'border-emerald-500/60 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300'
                              badge = (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <FiCheck size={14} /> Correct Answer
                                </span>
                              )
                            }

                            return (
                              <div
                                key={optIdx}
                                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${cardStyle}`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                                    isChosen
                                      ? (isCorrectOpt ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')
                                      : 'bg-slate-100 dark:bg-[#333333] text-slate-500 dark:text-[#8a8a8a]'
                                  }`}>
                                    {optLetter}
                                  </span>
                                  <span className="text-xs sm:text-sm">{optText}</span>
                                </div>
                                {badge}
                              </div>
                            )
                          })}
                        </div>

                        {/* Explanation Box if present */}
                        {selectedSubmission.explanation && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
                            <span className="font-bold flex items-center gap-1 mb-1">
                              <FiHelpCircle size={13} /> Explanation
                            </span>
                            <p>{selectedSubmission.explanation}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Code / Solution Editor Preview */
                      <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] dark:bg-[#121212]">
                        <div className="px-4 py-2 bg-slate-900/90 dark:bg-[#181818] border-b border-slate-800 dark:border-[#282828] flex items-center justify-between text-xs text-slate-400 font-mono">
                          <span>{isMcq ? 'Question & Solution Text' : 'Solution Code'}</span>
                          <span className="uppercase text-[10px]">{selectedSubmission.language}</span>
                        </div>
                        <pre className="flex-1 p-4 overflow-auto text-xs font-mono text-emerald-400 dark:text-[#eff1f6] leading-relaxed select-text">
                          <code>{selectedSubmission.code || '// No source code recorded'}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-[#3e3e3e] flex justify-end bg-slate-50/50 dark:bg-[#242424]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-[#eff1f6] bg-slate-200 hover:bg-slate-300 dark:bg-[#333333] dark:hover:bg-[#3e3e3e] rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
