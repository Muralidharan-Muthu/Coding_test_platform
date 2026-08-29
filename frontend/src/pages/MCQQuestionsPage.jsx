import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { createMcqQuestion, deleteMcqQuestion } from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { FiPlus, FiX } from 'react-icons/fi'
import Spinner from '../components/ui/Spinner'
import './MCQQuestionsPage.css'
import './QuestionsPage.css'

const BUILTIN_LANGS = ['python', 'sql', 'mcq']

function loadCustomLangs() {
  try {
    const saved = localStorage.getItem('custom_question_langs')
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function saveCustomLangs(langs) {
  localStorage.setItem('custom_question_langs', JSON.stringify(langs))
}

const DIFFICULTY_TABS = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
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
  if (!isoString) return '—'
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
    return '—'
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

function AddTypeModal({ onAdd, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) { setError('Enter a language name'); return }
    if (trimmed.length < 2) { setError('Name too short'); return }
    if (BUILTIN_LANGS.includes(trimmed)) { setError('This type already exists'); return }
    if (!/^[a-z0-9_+#]+$/i.test(trimmed)) { setError('Only letters, numbers, _, #, + allowed'); return }
    onAdd(trimmed)
  }

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal" onClick={e => e.stopPropagation()}>
        <div className="qp-modal-header">
          <h3>Add Question Type</h3>
          <button className="qp-modal-close" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="qp-modal-desc">Add a custom language like <code>java</code>, <code>c++</code>, <code>javascript</code>.</p>
          <input
            className="qp-modal-input"
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            placeholder="e.g. java, c++, javascript"
            autoFocus
          />
          {error && <p className="qp-modal-error">{error}</p>}
          <div className="qp-modal-actions">
            <button type="button" className="qp-modal-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="qp-modal-btn-add"><FiPlus /> Add Type</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MCQQuestionsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [questions, setQuestions] = useState([])
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeDiffTab, setActiveDiffTab] = useState('easy')
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState('')
  const [expandedQuestions, setExpandedQuestions] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [customLangs, setCustomLangs] = useState(loadCustomLangs)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)

  const navItems = [
    {
      label: 'Assessment Dashboard',
      href: '/admin/dashboard/assessment',
      activePaths: ['/admin/dashboard', '/admin/dashboard/assessment', '/dashboard/assessment'],
    },
    {
      label: 'Questions',
      href: '/admin/questions/python_questions',
      activePaths: ['/admin/questions'],
      children: [
        {
          label: 'Python Questions',
          href: '/admin/questions/python_questions',
          activePaths: ['/admin/questions/python_questions', '/admin/questions/python'],
        },
        {
          label: 'SQL Questions',
          href: '/admin/questions/sql_questions',
          activePaths: ['/admin/questions/sql_questions', '/admin/questions/sql'],
        },
        {
          label: 'MCQ Questions',
          href: '/admin/questions/mcq_questions',
          activePaths: ['/admin/questions/mcq_questions', '/admin/questions/mcq'],
        },
        ...customLangs.map((lang) => ({
          label: `${lang.charAt(0).toUpperCase() + lang.slice(1)} Questions`,
          href: `/admin/questions/python_questions?lang=${lang}`,
          activePaths: [`/admin/questions/python_questions?lang=${lang}`],
          isCustom: true,
          typeKey: lang,
        })),
        {
          label: '+ Add Type',
          isAddButton: true,
        },
      ],
    },
    {
      label: 'Manage Candidates',
      href: '/admin/otp',
      activePaths: ['/admin/otp'],
      children: [
        {
          label: 'Choose Test Type',
          href: '/admin/test-type',
          activePaths: ['/admin/test-type'],
        },
        {
          label: 'Send Mail',
          href: '/admin/send-mail',
          activePaths: ['/admin/send-mail'],
        },
      ],
    },
  ]

  const loadQuestions = async () => {
    try {
      setLoading(true)
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

  const handleAddCustomType = (lang) => {
    const next = [...customLangs, lang]
    setCustomLangs(next)
    saveCustomLangs(next)
    setShowAddTypeModal(false)
    toast.success(`"${lang.charAt(0).toUpperCase() + lang.slice(1)} Questions" added!`)
    navigate(`/admin/questions/python_questions?lang=${lang}`)
  }

  const handleRemoveCustomType = (lang) => {
    if (!window.confirm(`Remove "${lang}" question type?`)) return
    const next = customLangs.filter(l => l !== lang)
    setCustomLangs(next)
    saveCustomLangs(next)
    toast.success(`"${lang}" type removed`)
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
    if (!questionId) return
    if (!window.confirm(`Delete "${questionTitle}"?`)) return

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
  const diffCountMap = { easy: easyList.length, medium: mediumList.length, hard: hardList.length }
  const currentDiffList = activeDiffTab === 'easy' ? easyList : activeDiffTab === 'medium' ? mediumList : hardList

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
      navItems={navItems}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
      onAddType={() => setShowAddTypeModal(true)}
      onRemoveCustomType={handleRemoveCustomType}
    >
      <div className="questions-content">

        {/* ── Compact Toolbar: Difficulty Navbar + Add Question Button ── */}
        {!showAdd && (
          <div className="qp-toolbar">
            <div className="qp-diff-tabs" role="tablist" aria-label="Filter by difficulty">
              {DIFFICULTY_TABS.map(dt => (
                <button
                  key={dt.id}
                  type="button"
                  role="tab"
                  aria-selected={activeDiffTab === dt.id}
                  className={`qp-diff-tab${activeDiffTab === dt.id ? ' active' : ''} qp-diff-${dt.id}`}
                  onClick={() => setActiveDiffTab(dt.id)}
                >
                  <span className="qp-diff-label">{dt.label}</span>
                  <span className="qp-diff-count">{diffCountMap[dt.id]}</span>
                </button>
              ))}
            </div>

            <button onClick={openAdd} className="btn-add">
              <FiPlus size={14} /> Add Question
            </button>
          </div>
        )}

        {/* ── Add Question Section ── */}
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
                <FiPlus size={14} /> {submitting ? 'Adding...' : 'Add Question'}
              </button>
            </div>
          </div>
        )}

        {/* ── Active Difficulty Questions List ── */}
        {!showAdd && (
          <>
            {loading ? (
              <Spinner label="Loading questions…" size={40} />
            ) : questions.length === 0 ? (
              <p className="no-questions">No MCQ questions found. Click "+ Add Question" to create one.</p>
            ) : currentDiffList.length === 0 ? (
              <div className="qp-empty-diff">
                <p>No <strong>{activeDiffTab}</strong> MCQ questions yet.</p>
                <button className="btn-add" onClick={openAdd}><FiPlus size={14} /> Add One</button>
              </div>
            ) : (
              <div className="questions-groups">
                <div className="difficulty-group">
                  <div className={`group-header group-${activeDiffTab}`}>
                    <div className="group-header-left">
                      <span className={`group-dot dot-${activeDiffTab}`} />
                      <span className="group-title">
                        {activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)} MCQ Questions
                      </span>
                    </div>
                    <span className="group-count">
                      {currentDiffList.length} question{currentDiffList.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="questions-list">
                    {currentDiffList.map((question, index) => renderQuestionCard(question, index))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddTypeModal && (
        <AddTypeModal onAdd={handleAddCustomType} onClose={() => setShowAddTypeModal(false)} />
      )}
    </AdminSidebarLayout>
  )
}

export default MCQQuestionsPage