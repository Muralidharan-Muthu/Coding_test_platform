import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { createMcqQuestion, deleteMcqQuestion } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import Spinner from '../components/ui/Spinner'
import './MCQQuestionsPage.css'

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

const QUESTION_TYPE_ITEMS = [
  { id: 'python', label: 'Python Questions', shortLabel: 'Py' },
  { id: 'sql', label: 'SQL Questions', shortLabel: 'SQL' },
  { id: 'mcq', label: 'MCQ Questions', shortLabel: 'MCQ' },
]

const MCQ_TEMPLATE = JSON.stringify(
  {
    question_title: 'Check Prime Number',
    question: 'Which of the following numbers is a prime number?',
    options: ['4', '6', '7', '9'],
    correct_answer: 2,
    difficulty: 'easy',
    marks: 10,
    time: 10,
    topic: 'Aptitude',
    explanation: '7 is divisible only by 1 and itself.',
  },
  null,
  2
)

function formatIST(isoString) {
  if (!isoString) return '--'

  try {
    const date = new Date(isoString)
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return '--'
  }
}

function normalizeMcqQuestion(rawQuestion) {
  return {
    question_title: String(rawQuestion?.question_title ?? rawQuestion?.questionTitle ?? '').trim(),
    question: String(rawQuestion?.question ?? '').trim(),
    options: Array.isArray(rawQuestion?.options)
      ? rawQuestion.options.map((option) => String(option ?? '').trim())
      : [],
    correct_answer: Number(rawQuestion?.correct_answer ?? rawQuestion?.correctAnswer ?? 0),
    difficulty: String(rawQuestion?.difficulty ?? 'easy').trim().toLowerCase(),
    marks: rawQuestion?.marks == null ? undefined : Number(rawQuestion.marks),
    time: rawQuestion?.time == null ? undefined : Number(rawQuestion.time),
    topic: String(rawQuestion?.topic ?? '').trim(),
    explanation: String(rawQuestion?.explanation ?? '').trim(),
  }
}

function MCQQuestionsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [questions, setQuestions] = useState([])
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState('')
  const [expandedQuestions, setExpandedQuestions] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const loadQuestions = async () => {
    try {
      const response = await api.get('/admin/mcq-questions')
      const nextQuestions = Array.isArray(response.data?.questions) ? response.data.questions : []
      setQuestions(nextQuestions)
    } catch (loadError) {
      console.error('Failed to fetch MCQ questions', loadError)
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')

    if (!loggedIn) {
      navigate('/admin')
      return
    }

    setAdminName(name || 'Admin User')
    loadQuestions()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    localStorage.removeItem('admin_name')
    navigate('/admin')
  }

  const handleQuestionTypeChange = (nextType) => {
    if (nextType === 'mcq') {
      return
    }

    if (nextType === 'python') {
      navigate('/admin/questions/python_questions')
    } else if (nextType === 'sql') {
      navigate('/admin/questions/sql_questions')
    }
  }

  const toggleExpanded = (questionKey) => {
    setExpandedQuestions((current) => ({
      ...current,
      [questionKey]: !current[questionKey],
    }))
  }

  const openAdd = () => {
    setShowAdd(true)
    setJsonInput('')
    setError('')
  }

  const handleAdd = async () => {
    if (!jsonInput.trim()) {
      setError('Paste the MCQ JSON here')
      return
    }

    let parsed
    try {
      const sanitized = jsonInput
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .trim()
      parsed = JSON.parse(sanitized)
    } catch {
      setError('Invalid JSON. Please check the format and try again.')
      return
    }

    const questionsToCreate = (Array.isArray(parsed) ? parsed : [parsed]).map(normalizeMcqQuestion)

    if (questionsToCreate.length === 0) {
      setError('No MCQ questions found in the pasted JSON')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      for (const question of questionsToCreate) {
        await createMcqQuestion(question)
      }

      toast.success(
        `${questionsToCreate.length} MCQ question${questionsToCreate.length === 1 ? '' : 's'} added successfully!`
      )
      setJsonInput('')
      setShowAdd(false)
      await loadQuestions()
    } catch (submitError) {
      setError(submitError.response?.data?.detail || 'Failed to add MCQ question(s)')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (questionId, questionTitle) => {
    if (!questionId) {
      return
    }

    if (!window.confirm(`Delete "${questionTitle}"?`)) {
      return
    }

    try {
      await deleteMcqQuestion(questionId)
      toast.success(`"${questionTitle}" deleted`)
      await loadQuestions()
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.detail || 'Failed to delete MCQ question')
    }
  }

  const easyList = questions.filter((question) => question.difficulty?.toLowerCase() === 'easy')
  const mediumList = questions.filter((question) => question.difficulty?.toLowerCase() === 'medium')
  const hardList = questions.filter((question) => question.difficulty?.toLowerCase() === 'hard')

  const renderQuestionTypeTabs = (placement, collapsed = false) => (
    <div className={`question-type-tabs question-type-tabs--${placement}${collapsed ? ' is-collapsed' : ''}`}>
      {placement === 'sidebar' && !collapsed && (
        <p className="question-type-tabs-label">Question Type</p>
      )}

      <div className="tabs" role="tablist" aria-label="Question type">
        {QUESTION_TYPE_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab ${item.id === 'mcq' ? 'active' : ''}`}
            onClick={() => handleQuestionTypeChange(item.id)}
            aria-pressed={item.id === 'mcq'}
            aria-label={item.label}
          >
            <span className="tab-short" aria-hidden="true">{item.shortLabel}</span>
            <span className="tab-full">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const renderQuestionCard = (question, index) => {
    const questionKey = question.id || `${question.question_title}-${index}`
    const isExpanded = Boolean(expandedQuestions[questionKey])

    return (
      <div key={questionKey} className={`mcq-question-shell${isExpanded ? ' is-expanded' : ''}`}>
        <div className="question-item">
          <div className="question-number">#{index + 1}</div>

          <div className="question-info">
            <h3>{question.question_title}</h3>
            <div className="question-meta">
              <span className={`difficulty-badge difficulty-${question.difficulty?.toLowerCase()}`}>
                {question.difficulty}
              </span>
              <span className="marks">{question.marks} marks</span>
              <span className="time-limit">{question.time} min</span>
              <span className="topic-pill">{question.topic}</span>
              <span className="added-at">Added: {formatIST(question.created_at)}</span>
            </div>
          </div>

          <div className="question-actions">
            <button onClick={() => toggleExpanded(questionKey)} className="btn-view">
              {isExpanded ? 'Hide' : 'View'}
            </button>
            <button onClick={() => handleDelete(question.id, question.question_title)} className="btn-delete">
              Delete
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mcq-question-body">
            <p className="mcq-question-text">{question.question}</p>

            <ol className="mcq-option-list">
              {question.options.map((option, optionIndex) => (
                <li
                  key={`${questionKey}-${optionIndex}`}
                  className={`mcq-option-item${question.correct_answer === optionIndex ? ' is-correct' : ''}`}
                >
                  <span className="mcq-option-key">{String.fromCharCode(65 + optionIndex)}</span>
                  <span className="mcq-option-value">{option}</span>
                </li>
              ))}
            </ol>

            <div className="mcq-explanation-box">
              <span className="mcq-explanation-label">Explanation</span>
              <p>{question.explanation}</p>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <AdminSidebarLayout
      className="mcq-questions-page"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      sidebarExtraAfterHref="/admin/questions/python_questions"
      sidebarExtra={({ collapsed }) => renderQuestionTypeTabs('sidebar', collapsed)}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <div className="questions-content">

        {renderQuestionTypeTabs('content')}

        <div className="actions-bar">
          {!showAdd && (
            <button onClick={openAdd} className="btn-add">+ Add Question</button>
          )}
        </div>

        <div className="summary-card">
          <div className="summary-item summary-easy">
            <span className="summary-label">Easy</span>
            <span className="summary-num">{easyList.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item summary-medium">
            <span className="summary-label">Medium</span>
            <span className="summary-num">{mediumList.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item summary-hard">
            <span className="summary-label">Hard</span>
            <span className="summary-num">{hardList.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item summary-total">
            <span className="summary-label">Total</span>
            <span className="summary-num">{questions.length}</span>
          </div>
        </div>

        {showAdd && (
          <div className="add-section">
            <div className="add-header">
              <h3>Add MCQ Question</h3>
              <button
                onClick={() => {
                  setShowAdd(false)
                  setJsonInput('')
                  setError('')
                }}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>

            <div className="template-box">
              <div className="template-top">
                <span className="template-label">Paste a single MCQ object or an array of MCQs using this shape</span>
              </div>
              <pre className="template-code">{MCQ_TEMPLATE}</pre>
            </div>

            <div className="paste-section">
              <label htmlFor="mcq-json-input">MCQ JSON</label>
              <textarea
                id="mcq-json-input"
                value={jsonInput}
                onChange={(event) => setJsonInput(event.target.value)}
                placeholder="Paste the MCQ JSON returned by AI here..."
                rows={12}
                className="json-input"
              />
              {error && <div className="error-msg">{error}</div>}
              <button onClick={handleAdd} className="btn-submit" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Spinner label="Loading questions…" size={40} />
        ) : questions.length === 0 && !showAdd ? (
          <p className="no-questions">No MCQ questions found.</p>
        ) : (
          <div className="questions-groups">
            {easyList.length > 0 && (
              <div className="difficulty-group">
                <div className="group-header group-easy">
                  <div className="group-header-left">
                    <span className="group-dot dot-easy" />
                    <span className="group-title">Easy Questions</span>
                  </div>
                  <span className="group-count">{easyList.length} question{easyList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="questions-list">
                  {easyList.map((question, index) => renderQuestionCard(question, index))}
                </div>
              </div>
            )}

            {mediumList.length > 0 && (
              <div className="difficulty-group">
                <div className="group-header group-medium">
                  <div className="group-header-left">
                    <span className="group-dot dot-medium" />
                    <span className="group-title">Medium Questions</span>
                  </div>
                  <span className="group-count">{mediumList.length} question{mediumList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="questions-list">
                  {mediumList.map((question, index) => renderQuestionCard(question, index))}
                </div>
              </div>
            )}

            {hardList.length > 0 && (
              <div className="difficulty-group">
                <div className="group-header group-hard">
                  <div className="group-header-left">
                    <span className="group-dot dot-hard" />
                    <span className="group-title">Hard Questions</span>
                  </div>
                  <span className="group-count">{hardList.length} question{hardList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="questions-list">
                  {hardList.map((question, index) => renderQuestionCard(question, index))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminSidebarLayout>
  )
}

export default MCQQuestionsPage
