import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import './AdminDashboard.css'

const NAV_ITEMS = [
  {
    label: 'Assessment Dashboard',
    href: '/dashboard/assessment',
    activePaths: ['/dashboard/assessment'],
  },
  { label: 'Questions', href: '/admin/questions/python_questions', activePaths: ['/admin/questions'] },
  {
    label: 'Manage Candidates',
    href: '/admin/otp',
    activePaths: ['/admin/otp'],
    children: [
      { label: 'Choose Test Type', href: '/admin/test-type', activePaths: ['/admin/test-type'] },
      { label: 'Send Mail', href: '/admin/send-mail', activePaths: ['/admin/send-mail'] },
    ],
  },
]

const ShuffleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="21 16 21 21 16 21" />
    <line x1="15" y1="15" x2="21" y2="21" />
  </svg>
)

const SpinnerIcon = () => (
  <svg className="admin-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

const SaveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
)

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)

const AlertIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const FileIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const ClockSmIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

function QuestionCard({ p, index, language, onChangeQuestion, changingKey, readOnly = false }) {
  const isChanging = changingKey === `${language}:${p.id}`
  const diffLevel = String(p.difficulty || '').toLowerCase()

  return (
    <div
      className={`admin-qcard admin-qcard-${language}`}
      style={{ '--delay': `${index * 55}ms` }}
      role="article"
      aria-label={`${p.title}, ${p.difficulty}, ${p.marks} marks`}
    >
      <div className="admin-qcard-body">
        <div className="admin-qcard-top">
          <span className="admin-qcard-num" aria-hidden="true">{index + 1}</span>
          <h4 className="admin-qcard-title">{p.title}</h4>
        </div>

        <div className="admin-qcard-meta">
          <span className={`admin-difficulty admin-difficulty-${diffLevel}`}>
            {diffLevel === 'easy' && <CheckIcon />}
            {diffLevel === 'hard' && <AlertIcon />}
            {p.difficulty}
          </span>
          <span className="admin-meta-pill">
            <FileIcon />
            {p.marks} marks
          </span>
          <span className="admin-meta-pill">
            <ClockSmIcon />
            {p.time_limit} min
          </span>
        </div>

        {!readOnly && (
          <div className="admin-qcard-action">
            <button
              className={`admin-btn-change admin-btn-change-${language}`}
              onClick={() => onChangeQuestion(p.id, language)}
              disabled={isChanging}
              aria-label={isChanging ? 'Changing question...' : `Change ${p.title}`}
            >
              {isChanging ? (
                <><SpinnerIcon /> Changing...</>
              ) : 'Change'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(totalMinutes) {
  const minutes = Math.max(Number(totalMinutes) || 0, 0)
  if (!minutes) return '0 Min'
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours && remaining) return `${hours} Hr ${remaining} Min`
  if (hours) return `${hours} Hr`
  return `${remaining} Min`
}

function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const previewCandidateEmail = String(searchParams.get('candidate_email') || '').trim().toLowerCase()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [generatedPythonProblems, setGeneratedPythonProblems] = useState([])
  const [generatedSqlProblems, setGeneratedSqlProblems] = useState([])
  const [previewCandidate, setPreviewCandidate] = useState(null)
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

      setGeneratedPythonProblems(allProblems.filter((problem) => problem.language === 'python'))
      setGeneratedSqlProblems(allProblems.filter((problem) => problem.language === 'sql'))
      setPreviewCandidate(response.data.candidate || null)
    } catch (err) {
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
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate questions')
      if (!previewCandidateEmail) {
        setGeneratedPythonProblems([])
        setGeneratedSqlProblems([])
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const handleChangeQuestion = async (problemId, language) => {
    if (previewCandidateEmail) return

    const key = `${language}:${problemId}`
    setChangingQuestionKey(key)

    try {
      const response = await api.get(`/admin/problems/random/replace?problem_id=${problemId}&language=${language}`)
      if (language === 'python') {
        setGeneratedPythonProblems((prev) => prev.map((problem) => (
          problem.id === problemId ? response.data.new : problem
        )))
      } else {
        setGeneratedSqlProblems((prev) => prev.map((problem) => (
          problem.id === problemId ? response.data.new : problem
        )))
      }
      toast.success(`Replaced "${response.data.replaced.title}" with "${response.data.new.title}".`)
    } catch (err) {
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
    } catch (err) {
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
    () => [...generatedPythonProblems, ...generatedSqlProblems].reduce((sum, problem) => sum + Number(problem.time_limit || 0), 0),
    [generatedPythonProblems, generatedSqlProblems]
  )
  const previewSourceLabel = previewCandidate?.source === 'candidate_shuffle'
    ? 'Candidate-specific shuffled set'
    : 'Published assessment filtered by test type'

  return (
    <AdminSidebarLayout
      className="admin-dashboard"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <main className="admin-content">

        <div className="admin-page-heading">
          <h2>Candidate Assessment Configuration</h2>
        </div>

        {previewCandidate && (
          <div className="admin-preview-banner">
            <div className="admin-preview-text">
              <span className="admin-preview-label">Previewing Candidate</span>
              <strong>{previewCandidate.username}</strong>
              <span className="admin-preview-email">{previewCandidate.email}</span>
            </div>
            <div className="admin-preview-meta">
              <span className="admin-preview-chip">{previewCandidate.test_type_label}</span>
              <span className="admin-preview-source">{previewSourceLabel}</span>
            </div>
          </div>
        )}

        {hasGenerated && (
          <div className="admin-summary-panel" aria-label="Assessment summary">
            <div className="admin-summary-stat admin-sstat-total">
              <span className="admin-sstat-label">TOTAL QUESTIONS</span>
              <span className="admin-sstat-num">{totalQuestions}</span>
            </div>
            <div className="admin-summary-sep" aria-hidden="true" />
            <div className="admin-summary-stat admin-sstat-python">
              <span className="admin-sstat-label">PYTHON</span>
              <span className="admin-sstat-num">{generatedPythonProblems.length}</span>
            </div>
            <div className="admin-summary-sep" aria-hidden="true" />
            <div className="admin-summary-stat admin-sstat-sql">
              <span className="admin-sstat-label">SQL</span>
              <span className="admin-sstat-num">{generatedSqlProblems.length}</span>
            </div>
            <div className="admin-summary-sep" aria-hidden="true" />
            <div className="admin-summary-stat admin-sstat-duration">
              <span className="admin-sstat-label">EST. DURATION</span>
              <span className="admin-sstat-num">{formatDuration(totalDurationMinutes)}</span>
            </div>
          </div>
        )}

        <div className="admin-actions">
          <span className="admin-actions-info">
            {hasGenerated
              ? previewCandidate
                ? `${previewCandidate.username} will receive ${totalQuestions} questions (${generatedPythonProblems.length} Python, ${generatedSqlProblems.length} SQL).`
                : `${totalQuestions} questions selected for candidate test (${generatedPythonProblems.length} Python, ${generatedSqlProblems.length} SQL).`
              : previewCandidate
                ? `No questions available for ${previewCandidate.username} yet. Shuffle to create a candidate-specific set.`
                : 'Click Generate to select random questions for both Python and SQL'}
          </span>
          <button
            onClick={handleGenerateRandom}
            className="admin-btn-generate"
            disabled={isGenerating}
            aria-busy={isGenerating}
          >
            {isGenerating
              ? <><SpinnerIcon /> Shuffling...</>
              : <><ShuffleIcon /> {previewCandidate ? 'Shuffle Candidate Question Set' : 'Shuffle Question Set'}</>}
          </button>
        </div>

        {hasGenerated && (
          <section className="admin-questions-section" aria-label="Selected assessment questions">
            <div className="admin-questions-heading">
              <h3>Selected Assessment Questions</h3>
            </div>

            {generatedPythonProblems.length > 0 && (
              <div className="admin-lang-block">
                <div className="admin-lang-header admin-lang-python">
                  <span className="admin-lang-accent" aria-hidden="true" />
                  <h4>
                    Python Coding Questions
                    <span className="admin-lang-count">({generatedPythonProblems.length})</span>
                  </h4>
                </div>
                <div className="admin-cards-grid" role="list">
                  {generatedPythonProblems.map((problem, index) => (
                    <div key={problem.id} role="listitem">
                      <QuestionCard
                        p={problem}
                        index={index}
                        language="python"
                        onChangeQuestion={handleChangeQuestion}
                        changingKey={changingQuestionKey}
                        readOnly={Boolean(previewCandidate)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {generatedSqlProblems.length > 0 && (
              <div className="admin-lang-block">
                <div className="admin-lang-header admin-lang-sql">
                  <span className="admin-lang-accent" aria-hidden="true" />
                  <h4>
                    SQL Query Questions
                    <span className="admin-lang-count">({generatedSqlProblems.length})</span>
                  </h4>
                </div>
                <div className="admin-cards-grid" role="list">
                  {generatedSqlProblems.map((problem, index) => (
                    <div key={problem.id} role="listitem">
                      <QuestionCard
                        p={problem}
                        index={index}
                        language="sql"
                        onChangeQuestion={handleChangeQuestion}
                        changingKey={changingQuestionKey}
                        readOnly={Boolean(previewCandidate)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {hasGenerated && !previewCandidate && (
          <div className="admin-publish-section">
            <button
              onClick={handleSaveExam}
              className="admin-btn-publish"
              disabled={isSaving}
              aria-busy={isSaving}
            >
              {isSaving
                ? <><SpinnerIcon /> Saving...</>
                : <><SaveIcon /> Publish Assessment for Candidates</>}
            </button>
            <p className="admin-publish-note">
              Save these questions permanently so candidates can begin the test
            </p>
          </div>
        )}
      </main>
    </AdminSidebarLayout>
  )
}

export default AdminDashboard
