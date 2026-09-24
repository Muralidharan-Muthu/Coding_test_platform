import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { ADMIN_NAV_ITEMS as NAV_ITEMS } from '../constants/data'
import { FiRefreshCw, FiSave, FiCheck, FiAlertTriangle, FiFileText, FiClock } from 'react-icons/fi'

function QuestionCard({
  p,
  index,
  language,
  onChangeQuestion,
  changingKey,
  readOnly = false
}: {
  p: any
  index: number
  language: string
  onChangeQuestion: (id: any, lang: string) => void
  changingKey: string
  readOnly?: boolean
}) {
  const isChanging = changingKey === `${language}:${p.id}`
  const diffLevel = String(p.difficulty || '').toLowerCase()

  const diffBadge = {
    easy: 'bg-emerald-500/10 text-emerald-600 dark:text-[#2cbb5d] border-emerald-500/30',
    medium: 'bg-amber-500/10 text-amber-600 dark:text-[#ffb800] border-amber-500/30',
    hard: 'bg-rose-500/10 text-rose-600 dark:text-[#ff375f] border-rose-500/30'
  }[diffLevel] || 'bg-slate-100 dark:bg-[#333333] text-slate-600 dark:text-[#eff1f6] border-slate-200 dark:border-[#3e3e3e]'

  return (
    <div
      className="p-4 rounded-2xl bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] hover:border-slate-300 dark:hover:border-[#4d4d4d] shadow-sm transition flex flex-col justify-between space-y-3"
      role="article"
      aria-label={`${p.title}, ${p.difficulty}, ${p.marks} marks`}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-[#1a1a1a] text-slate-600 dark:text-[#eff1f6] text-xs font-bold flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <h4 className="text-sm font-bold text-slate-900 dark:text-[#eff1f6] leading-tight">
            {p.title}
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${diffBadge}`}>
            {diffLevel === 'easy' && <FiCheck size={11} />}
            {diffLevel === 'hard' && <FiAlertTriangle size={11} />}
            {p.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-[#1a1a1a] text-slate-600 dark:text-[#8a8a8a] border border-slate-200 dark:border-[#3e3e3e]">
            <FiFileText size={11} />
            {p.marks} marks
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 dark:bg-[#1a1a1a] text-slate-600 dark:text-[#8a8a8a] border border-slate-200 dark:border-[#3e3e3e]">
            <FiClock size={11} />
            {p.time_limit} min
          </span>
        </div>
      </div>

      {!readOnly && (
        <div className="pt-2 border-t border-slate-100 dark:border-[#333333] flex justify-end">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#eff1f6] bg-slate-100 hover:bg-slate-200 dark:bg-[#333333] dark:hover:bg-[#3e3e3e] rounded-xl transition cursor-pointer disabled:opacity-50"
            onClick={() => onChangeQuestion(p.id, language)}
            disabled={isChanging}
            aria-label={isChanging ? 'Changing question...' : `Change ${p.title}`}
          >
            {isChanging ? (
              <>
                <FiRefreshCw className="animate-spin" size={12} />
                <span>Changing…</span>
              </>
            ) : (
              <>
                <FiRefreshCw size={12} />
                <span>Change</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

function formatDuration(totalMinutes: number) {
  const minutes = Math.max(Number(totalMinutes) || 0, 0)
  if (!minutes) return '0 Min'
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours && remaining) return `${hours} Hr ${remaining} Min`
  if (hours) return `${hours} Hr`
  return `${remaining} Min`
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const previewCandidateEmail = String(searchParams.get('candidate_email') || '').trim().toLowerCase()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [generatedPythonProblems, setGeneratedPythonProblems] = useState<any[]>([])
  const [generatedSqlProblems, setGeneratedSqlProblems] = useState<any[]>([])
  const [previewCandidate, setPreviewCandidate] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [changingQuestionKey, setChangingQuestionKey] = useState('')

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name || 'Admin User')
    loadSavedExamProblems()
  }, [navigate, previewCandidateEmail])

  const loadSavedExamProblems = async () => {
    try {
      const response = await api.get('/admin/exam/selected', {
        params: previewCandidateEmail ? { email: previewCandidateEmail } : {},
      })
      const allProblems = response.data.problems || []

      if (allProblems.length === 0 && !previewCandidateEmail) {
        const [pythonRes, sqlRes] = await Promise.all([
          api.get('/admin/problems/random?language=python'),
          api.get('/admin/problems/random?language=sql'),
        ])
        setGeneratedPythonProblems(pythonRes.data.problems || [])
        setGeneratedSqlProblems(sqlRes.data.problems || [])
        setPreviewCandidate(null)
        return
      }

      setGeneratedPythonProblems(allProblems.filter((p: any) => p.language === 'python'))
      setGeneratedSqlProblems(allProblems.filter((p: any) => p.language === 'sql'))
      setPreviewCandidate(response.data.candidate || null)
    } catch (err: any) {
      setGeneratedPythonProblems([])
      setGeneratedSqlProblems([])
      setPreviewCandidate(null)
      toast.error(err.response?.data?.detail || 'Failed to load assessment configuration')
    }
  }

  const handleGenerateRandom = async () => {
    setIsGenerating(true)

    try {
      if (previewCandidateEmail) {
        const response = await api.post('/admin/candidate-shuffle', {
          email: previewCandidateEmail,
          test_type: previewCandidate?.test_type || 'both',
        })
        await loadSavedExamProblems()
        toast.success(`Shuffled ${response.data.saved} questions for ${previewCandidate?.username || previewCandidateEmail}.`)
        return
      }

      const [pythonRes, sqlRes] = await Promise.all([
        api.get('/admin/problems/random?language=python'),
        api.get('/admin/problems/random?language=sql'),
      ])
      setGeneratedPythonProblems(pythonRes.data.problems || [])
      setGeneratedSqlProblems(sqlRes.data.problems || [])
      toast.success('Generated random questions: 5 Python and 5 SQL.')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate questions')
      if (!previewCandidateEmail) {
        setGeneratedPythonProblems([])
        setGeneratedSqlProblems([])
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleChangeQuestion = async (problemId: any, language: string) => {
    if (previewCandidateEmail) return

    const key = `${language}:${problemId}`
    setChangingQuestionKey(key)

    try {
      const response = await api.get(`/admin/problems/random/replace?problem_id=${problemId}&language=${language}`)
      if (language === 'python') {
        setGeneratedPythonProblems((prev) => prev.map((p) => (p.id === problemId ? response.data.new : p)))
      } else {
        setGeneratedSqlProblems((prev) => prev.map((p) => (p.id === problemId ? response.data.new : p)))
      }
      toast.success(`Replaced "${response.data.replaced.title}" with "${response.data.new.title}".`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to replace question')
    } finally {
      setChangingQuestionKey('')
    }
  }

  const handleSaveExam = async () => {
    if (previewCandidateEmail || !hasGenerated) {
      return
    }

    setIsSaving(true)

    try {
      const allProblems = [...generatedPythonProblems, ...generatedSqlProblems]
      await api.post('/admin/exam/save', { problems: allProblems })
      toast.success(`${allProblems.length} questions saved. Candidates can now take the test.`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save exam questions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  const hasGenerated = generatedPythonProblems.length > 0 || generatedSqlProblems.length > 0
  const totalQuestions = generatedPythonProblems.length + generatedSqlProblems.length
  const totalDurationMinutes = useMemo(
    () => [...generatedPythonProblems, ...generatedSqlProblems].reduce((sum, p) => sum + Number(p.time_limit || 0), 0),
    [generatedPythonProblems, generatedSqlProblems]
  )
  const previewSourceLabel = previewCandidate?.source === 'candidate_shuffle'
    ? 'Candidate-specific shuffled set'
    : 'Published assessment filtered by test type'

  return (
    <AdminSidebarLayout
      className="bg-slate-50/60 dark:bg-[#1a1a1a] min-h-screen text-slate-800 dark:text-[#eff1f6]"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-[#eff1f6] tracking-tight">
              Candidate Assessment Configuration
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8a8a8a] mt-1">
              Select, shuffle, and publish question sets for assessment evaluation.
            </p>
          </div>
        </div>

        {/* Candidate preview banner */}
        {previewCandidate && (
          <div className="p-4 rounded-2xl bg-[#ffa116]/10 border border-[#ffa116]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ffa116] block">
                Previewing Candidate Question Set
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <strong className="text-sm font-bold text-slate-900 dark:text-[#eff1f6]">{previewCandidate.username}</strong>
                <span className="text-xs text-slate-500 dark:text-[#8a8a8a] font-mono">({previewCandidate.email})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ffa116] text-slate-950">
                {previewCandidate.test_type_label}
              </span>
              <span className="text-xs text-slate-500 dark:text-[#8a8a8a]">
                {previewSourceLabel}
              </span>
            </div>
          </div>
        )}

        {/* Summary Metric Strip */}
        {hasGenerated && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] rounded-2xl p-4 shadow-sm">
            <div className="p-2 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a8a8a]">Total Questions</span>
              <span className="text-2xl font-black text-slate-900 dark:text-[#eff1f6] block">{totalQuestions}</span>
            </div>
            <div className="p-2 space-y-1 border-l border-slate-100 dark:border-[#3e3e3e]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Python</span>
              <span className="text-2xl font-black text-blue-600 dark:text-blue-400 block">{generatedPythonProblems.length}</span>
            </div>
            <div className="p-2 space-y-1 border-l border-slate-100 dark:border-[#3e3e3e]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">SQL</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block">{generatedSqlProblems.length}</span>
            </div>
            <div className="p-2 space-y-1 border-l border-slate-100 dark:border-[#3e3e3e]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Est. Duration</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-[#2cbb5d] block">{formatDuration(totalDurationMinutes)}</span>
            </div>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs text-slate-500 dark:text-[#8a8a8a]">
            {hasGenerated
              ? previewCandidate
                ? `${previewCandidate.username} will receive ${totalQuestions} questions (${generatedPythonProblems.length} Python, ${generatedSqlProblems.length} SQL).`
                : `${totalQuestions} questions selected for candidate test (${generatedPythonProblems.length} Python, ${generatedSqlProblems.length} SQL).`
              : previewCandidate
                ? `No questions available for ${previewCandidate.username} yet. Shuffle to create a candidate-specific set.`
                : 'Click Generate to select random questions for both Python and SQL'}
          </span>
          <button
            type="button"
            onClick={handleGenerateRandom}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-900 bg-[#ffa116] hover:bg-[#e88f0a] rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 self-start sm:self-auto"
            disabled={isGenerating}
            aria-busy={isGenerating}
          >
            <FiRefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
            <span>{isGenerating ? 'Shuffling…' : previewCandidate ? 'Shuffle Candidate Questions' : 'Shuffle Question Set'}</span>
          </button>
        </div>

        {/* Selected Questions Section */}
        {hasGenerated && (
          <section className="space-y-6" aria-label="Selected assessment questions">
            {/* Python Questions */}
            {generatedPythonProblems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffa116]" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#eff1f6]">
                    Python Coding Questions ({generatedPythonProblems.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {generatedPythonProblems.map((p, idx) => (
                    <QuestionCard
                      key={p.id}
                      p={p}
                      index={idx}
                      language="python"
                      onChangeQuestion={handleChangeQuestion}
                      changingKey={changingQuestionKey}
                      readOnly={Boolean(previewCandidate)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* SQL Questions */}
            {generatedSqlProblems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#eff1f6]">
                    SQL Query Questions ({generatedSqlProblems.length})
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {generatedSqlProblems.map((p, idx) => (
                    <QuestionCard
                      key={p.id}
                      p={p}
                      index={idx}
                      language="sql"
                      onChangeQuestion={handleChangeQuestion}
                      changingKey={changingQuestionKey}
                      readOnly={Boolean(previewCandidate)}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Publish Action Section */}
        {hasGenerated && !previewCandidate && (
          <div className="p-6 rounded-2xl bg-white dark:bg-[#282828] border border-slate-200/80 dark:border-[#3e3e3e] shadow-sm flex flex-col items-center justify-center text-center space-y-2">
            <button
              type="button"
              onClick={handleSaveExam}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
              disabled={isSaving}
              aria-busy={isSaving}
            >
              <FiSave size={15} />
              <span>{isSaving ? 'Publishing…' : 'Publish Assessment for Candidates'}</span>
            </button>
            <p className="text-xs text-slate-500 dark:text-[#8a8a8a]">
              Save these questions permanently so candidates can begin the test immediately.
            </p>
          </div>
        )}

      </main>
    </AdminSidebarLayout>
  )
}
