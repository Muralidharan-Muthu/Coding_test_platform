import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api'
import HRSidebarLayout from '../components/hr/HRSidebarLayout'
import './HRDashboard.css'

const NAV_ITEMS = [
  {
    label: 'Assessment Dashboard',
    href: '/dashboard/assessment',
    activePaths: ['/dashboard/assessment'],
  },
  { label: 'Questions', href: '/hr/questions', activePaths: ['/hr/questions'] },
  {
    label: 'Manage Candidates',
    href: '/hr/otp',
    activePaths: ['/hr/otp'],
    children: [
      { label: 'Choose Test Type', href: '/hr/test-type', activePaths: ['/hr/test-type'] },
      { label: 'Send Mail', href: '/hr/send-mail', activePaths: ['/hr/send-mail'] },
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
  <svg className="hr-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
      className={`hr-qcard hr-qcard-${language}`}
      style={{ '--delay': `${index * 55}ms` }}
      role="article"
      aria-label={`${p.title}, ${p.difficulty}, ${p.marks} marks`}
    >
      <div className="hr-qcard-body">
        <div className="hr-qcard-top">
          <span className="hr-qcard-num" aria-hidden="true">{index + 1}</span>
          <h4 className="hr-qcard-title">{p.title}</h4>
        </div>

        <div className="hr-qcard-meta">
          <span className={`hr-difficulty hr-difficulty-${diffLevel}`}>
            {diffLevel === 'easy' && <CheckIcon />}
            {diffLevel === 'hard' && <AlertIcon />}
            {p.difficulty}
          </span>
          <span className="hr-meta-pill">
            <FileIcon />
            {p.marks} marks
          </span>
          <span className="hr-meta-pill">
            <ClockSmIcon />
            {p.time_limit} min
          </span>
        </div>

        {!readOnly && (
          <div className="hr-qcard-action">
            <button
              className={`hr-btn-change hr-btn-change-${language}`}
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

function HRDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const previewCandidateEmail = String(searchParams.get('candidate_email') || '').trim().toLowerCase()
  const [hrName, setHrName] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [generatedPythonProblems, setGeneratedPythonProblems] = useState([])
  const [generatedSqlProblems, setGeneratedSqlProblems] = useState([])
  const [previewCandidate, setPreviewCandidate] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [changingQuestionKey, setChangingQuestionKey] = useState('')

  useEffect(() => {
    const loggedIn = localStorage.getItem('hr_logged_in')
    const name = localStorage.getItem('hr_name')
    if (!loggedIn) {
      navigate('/hr')
      return
    }
    setHrName(name || 'HR User')
    loadSavedExamProblems()
  }, [navigate, previewCandidateEmail])

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(''), 5000)
    return () => clearTimeout(timer)
  }, [success])

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 6000)
    return () => clearTimeout(timer)
  }, [error])

  const loadSavedExamProblems = async () => {
    try {
      setError('')
      const response = await api.get('/hr/exam/selected', {
        params: previewCandidateEmail ? { email: previewCandidateEmail } : {},
      })
      const allProblems = response.data.problems || []
      setGeneratedPythonProblems(allProblems.filter((problem) => problem.language === 'python'))
      setGeneratedSqlProblems(allProblems.filter((problem) => problem.language === 'sql'))
      setPreviewCandidate(response.data.candidate || null)
    } catch (err) {
      setGeneratedPythonProblems([])
      setGeneratedSqlProblems([])
      setPreviewCandidate(null)
      setError(err.response?.data?.detail || 'Failed to load assessment configuration')
    }
  }

  const handleGenerateRandom = async () => {
    setIsGenerating(true)
    setError('')
    setSuccess('')

    try {
      if (previewCandidateEmail) {
        const response = await api.post('/hr/candidate-shuffle', {
          email: previewCandidateEmail,
          test_type: previewCandidate?.test_type || 'both',
        })
        await loadSavedExamProblems()
        setSuccess(`Shuffled ${response.data.saved} questions for ${previewCandidate?.username || previewCandidateEmail}.`)
        return
      }

      const [pythonRes, sqlRes] = await Promise.all([
        api.get('/hr/problems/random?language=python'),
        api.get('/hr/problems/random?language=sql'),
      ])
      setGeneratedPythonProblems(pythonRes.data.problems || [])
      setGeneratedSqlProblems(sqlRes.data.problems || [])
      setSuccess('Generated random questions: 5 Python and 5 SQL.')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate questions')
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
    setError('')
    setSuccess('')

    try {
      const response = await api.get(`/hr/problems/random/replace?problem_id=${problemId}&language=${language}`)
      if (language === 'python') {
        setGeneratedPythonProblems((prev) => prev.map((problem) => (
          problem.id === problemId ? response.data.new : problem
        )))
      } else {
        setGeneratedSqlProblems((prev) => prev.map((problem) => (
          problem.id === problemId ? response.data.new : problem
        )))
      }
      setSuccess(`Replaced "${response.data.replaced.title}" with "${response.data.new.title}".`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to replace question')
    } finally {
      setChangingQuestionKey('')
    }
  }

  const handleSaveExam = async () => {
    if (previewCandidateEmail || !hasGenerated) {
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const allProblems = [...generatedPythonProblems, ...generatedSqlProblems]
      await api.post('/hr/exam/save', { problems: allProblems })
      setSuccess(`${allProblems.length} questions saved. Candidates can now take the test.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save exam questions')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hr_name')
    localStorage.removeItem('hr_logged_in')
    navigate('/hr')
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
    <HRSidebarLayout
      className="hr-dashboard"
      hrName={hrName || 'HR User'}
      navItems={NAV_ITEMS}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <main className="hr-content">
        {success && (
          <div className="hr-alert hr-alert-success" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            {success}
          </div>
        )}
        {error && (
          <div className="hr-alert hr-alert-error" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
        )}

        <div className="hr-page-heading">
          <h2>Candidate Assessment Configuration</h2>
        </div>

        {previewCandidate && (
          <div className="hr-preview-banner">
            <div className="hr-preview-text">
              <span className="hr-preview-label">Previewing Candidate</span>
              <strong>{previewCandidate.username}</strong>
              <span className="hr-preview-email">{previewCandidate.email}</span>
            </div>
            <div className="hr-preview-meta">
              <span className="hr-preview-chip">{previewCandidate.test_type_label}</span>
              <span className="hr-preview-source">{previewSourceLabel}</span>
            </div>
          </div>
        )}

        {hasGenerated && (
          <div className="hr-summary-panel" aria-label="Assessment summary">
            <div className="hr-summary-stat hr-sstat-total">
              <span className="hr-sstat-label">TOTAL QUESTIONS</span>
              <span className="hr-sstat-num">{totalQuestions}</span>
            </div>
            <div className="hr-summary-sep" aria-hidden="true" />
            <div className="hr-summary-stat hr-sstat-python">
              <span className="hr-sstat-label">PYTHON</span>
              <span className="hr-sstat-num">{generatedPythonProblems.length}</span>
            </div>
            <div className="hr-summary-sep" aria-hidden="true" />
            <div className="hr-summary-stat hr-sstat-sql">
              <span className="hr-sstat-label">SQL</span>
              <span className="hr-sstat-num">{generatedSqlProblems.length}</span>
            </div>
            <div className="hr-summary-sep" aria-hidden="true" />
            <div className="hr-summary-stat hr-sstat-duration">
              <span className="hr-sstat-label">EST. DURATION</span>
              <span className="hr-sstat-num">{formatDuration(totalDurationMinutes)}</span>
            </div>
          </div>
        )}

        <div className="hr-actions">
          <span className="hr-actions-info">
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
            className="hr-btn-generate"
            disabled={isGenerating}
            aria-busy={isGenerating}
          >
            {isGenerating
              ? <><SpinnerIcon /> Shuffling...</>
              : <><ShuffleIcon /> {previewCandidate ? 'Shuffle Candidate Question Set' : 'Shuffle Question Set'}</>}
          </button>
        </div>

        {hasGenerated && (
          <section className="hr-questions-section" aria-label="Selected assessment questions">
            <div className="hr-questions-heading">
              <h3>Selected Assessment Questions</h3>
            </div>

            {generatedPythonProblems.length > 0 && (
              <div className="hr-lang-block">
                <div className="hr-lang-header hr-lang-python">
                  <span className="hr-lang-accent" aria-hidden="true" />
                  <h4>
                    Python Coding Questions
                    <span className="hr-lang-count">({generatedPythonProblems.length})</span>
                  </h4>
                </div>
                <div className="hr-cards-grid" role="list">
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
              <div className="hr-lang-block">
                <div className="hr-lang-header hr-lang-sql">
                  <span className="hr-lang-accent" aria-hidden="true" />
                  <h4>
                    SQL Query Questions
                    <span className="hr-lang-count">({generatedSqlProblems.length})</span>
                  </h4>
                </div>
                <div className="hr-cards-grid" role="list">
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
          <div className="hr-publish-section">
            <button
              onClick={handleSaveExam}
              className="hr-btn-publish"
              disabled={isSaving}
              aria-busy={isSaving}
            >
              {isSaving
                ? <><SpinnerIcon /> Saving...</>
                : <><SaveIcon /> Publish Assessment for Candidates</>}
            </button>
            <p className="hr-publish-note">
              Save these questions permanently so candidates can begin the test
            </p>
          </div>
        )}
      </main>
    </HRSidebarLayout>
  )
}

export default HRDashboard
