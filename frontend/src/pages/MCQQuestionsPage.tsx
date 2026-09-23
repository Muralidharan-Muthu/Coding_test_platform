import FormattedQuestionText from '../components/ui/FormattedQuestionText'
function buildMcqAiPrompt(difficulty = 'Easy') {
  const diffNorm = (difficulty || 'easy').toLowerCase()
  const timeSeconds = diffNorm === 'hard' ? 60 : diffNorm === 'medium' ? 45 : 30
  const timeLabel = diffNorm === 'hard' ? '00:01:00 (1 min = 60s)' : diffNorm === 'medium' ? '00:00:45 (45s)' : '00:00:30 (30s)'
  const marks = diffNorm === 'hard' ? 5 : diffNorm === 'medium' ? 3 : 1

  return `You are an expert technical examiner. Generate a multiple-choice question in JSON format for an assessment platform.

CRITICAL INSTRUCTIONS FOR AI:
1. OUTPUT FORMAT: Output ONLY a single, 100% valid, ONE-TIME COPIABLE raw JSON code block (enclosed in \`\`\`json ... \`\`\`). Do NOT include any conversation, greetings, markdown comments, or text outside the JSON. The admin will copy and paste this directly into the system without editing.
2. TIME LIMIT & MARKS (SECONDS AS PRIMARY STANDARD):
   - For Easy: time_limit = 30 (30 seconds = 00:00:30), marks = 1
   - For Medium: time_limit = 45 (45 seconds = 00:00:45), marks = 3
   - For Hard: time_limit = 60 (60 seconds = 00:01:00 = 1 min), marks = 5
   Current Setting: "difficulty": "${diffNorm}", "time_limit": ${timeSeconds} (${timeLabel}), "marks": ${marks}.
3. OPTIONS & CORRECT ANSWER:
   - Provide 4 clear, unambiguous options in the "options" array.
   - Set "correct_answer" to the 0-indexed integer (0 for Option A, 1 for Option B, 2 for Option C, 3 for Option D).
   - Provide a comprehensive "explanation" for why the answer is correct.

REQUIRED JSON SCHEMA:
{
  "question_title": "<Concise Question Title>",
  "question": "<Detailed Question Statement>",
  "difficulty": "${diffNorm}",
  "marks": ${marks},
  "time_limit": ${timeSeconds},
  "topic": "<Topic Name e.g. Python, SQL, Java, DSA, Computer Networks, OS, Aptitude>",
  "options": [
    "<Option A Text>",
    "<Option B Text>",
    "<Option C Text>",
    "<Option D Text>"
  ],
  "correct_answer": 0,
  "explanation": "<Clear, concise explanation of why the correct answer is right>"
}

Now generate an MCQ question for: [ENTER YOUR TOPIC / TOPIC AREA HERE]
Return ONLY a single one-time copiable raw JSON block.`
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, {
  createMcqQuestion,
  deleteMcqQuestion,
  getQuestionTypes,
  createQuestionType,
  deleteQuestionType,
} from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { FiPlus, FiX, FiCopy, FiCheck, FiCpu } from 'react-icons/fi'
import Spinner from '../components/ui/Spinner'
import { formatTimeWithLabel, formatTimeHHMMSS } from '../utils/timeUtils'

const DIFFICULTY_TABS = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
]

function buildMcqTemplate(difficulty = 'easy') {
  const diffNorm = (difficulty || 'easy').toLowerCase()
  const timeSeconds = diffNorm === 'hard' ? 60 : diffNorm === 'medium' ? 45 : 30
  const marks = diffNorm === 'hard' ? 5 : diffNorm === 'medium' ? 3 : 1

  return JSON.stringify(
    {
      question_title: 'Check Prime Number',
      question: 'Which of the following numbers is a prime number?',
      options: ['4', '6', '7', '9'],
      correct_answer: 2,
      difficulty: diffNorm,
      marks: marks,
      time_limit: timeSeconds,
      topic: 'Aptitude',
      explanation: '7 is divisible only by 1 and itself.',
    },
    null,
    2
  )
}

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
  const diff = String(rawQuestion?.difficulty ?? 'easy').trim().toLowerCase()
  const defaultTime = diff === 'hard' ? 60 : diff === 'medium' ? 45 : 30
  const defaultMarks = diff === 'hard' ? 5 : diff === 'medium' ? 3 : 1

  const rawTime = rawQuestion?.time_limit !== undefined && rawQuestion?.time_limit !== null
    ? rawQuestion.time_limit
    : rawQuestion?.time
  const timeVal = Number(rawTime) > 0 ? Number(rawTime) : defaultTime
  const marksVal = Number(rawQuestion?.marks) > 0 ? Number(rawQuestion.marks) : defaultMarks

  const rawOptions = Array.isArray(rawQuestion?.options) && rawQuestion.options.length > 0
    ? rawQuestion.options
    : (rawQuestion?.options_json ? (() => { try { return JSON.parse(rawQuestion.options_json); } catch { return null; } })() : null)
    || [rawQuestion?.option_a, rawQuestion?.option_b, rawQuestion?.option_c, rawQuestion?.option_d].filter(Boolean)

  return {
    question_title: String(rawQuestion?.question_title ?? rawQuestion?.title ?? rawQuestion?.questionTitle ?? '').trim(),
    question: String(rawQuestion?.question ?? rawQuestion?.question_text ?? '').trim(),
    options: Array.isArray(rawOptions)
      ? rawOptions.map((option) => String(option ?? '').trim())
      : [],
    correct_answer: Number(rawQuestion?.correct_answer ?? rawQuestion?.correctAnswer ?? 0),
    correct_option: rawQuestion?.correct_option ? String(rawQuestion.correct_option).trim().toUpperCase() : undefined,
    difficulty: diff,
    marks: marksVal,
    time: timeVal,
    time_limit: timeVal,
    topic: String(rawQuestion?.topic ?? 'Python').trim(),
    explanation: String(rawQuestion?.explanation ?? '').trim(),
  }
}

function AddTypeModal({ onAdd, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) { setError('Enter a language or type name'); return }
    if (trimmed.length < 2) { setError('Name too short'); return }
    if (!/^[a-z0-9_+#\s]+$/i.test(trimmed)) { setError('Only letters, numbers, _, #, + allowed'); return }
    
    setLoading(true)
    try {
      await onAdd(trimmed)
    } catch (err) {
      setError(err.message || 'Failed to create question type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal" onClick={e => e.stopPropagation()}>
        <div className="qp-modal-header">
          <h3>Add Question Type</h3>
          <button className="qp-modal-close" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="qp-modal-desc">
            Enter a custom language like <code>Java</code>, <code>C++</code>, <code>JavaScript</code>.
            A dedicated database table will be automatically provisioned in Turso.
          </p>
          <input
            className="qp-modal-input"
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            placeholder="e.g. Java, C++, JavaScript"
            autoFocus
            disabled={loading}
          />
          {error && <p className="qp-modal-error">{error}</p>}
          <div className="qp-modal-actions">
            <button type="button" className="qp-modal-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="qp-modal-btn-add" disabled={loading}>
              <FiPlus /> {loading ? 'Creating Table…' : 'Add Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MCQQuestionsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()
  const [questions, setQuestions] = useState([])
  const [questionTypes, setQuestionTypes] = useState([])
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeDiffTab, setActiveDiffTab] = useState('easy')
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [jsonCopied, setJsonCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)
  const [error, setError] = useState('')
  const [expandedQuestions, setExpandedQuestions] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)

  const loadQuestionTypes = async () => {
    try {
      const types = await getQuestionTypes()
      setQuestionTypes(types)
    } catch (err) {
      console.error('Failed to load question types:', err)
    }
  }

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
    loadQuestionTypes()
  }, [navigate])

  useEffect(() => {
    setJsonInput(buildMcqTemplate(activeDiffTab))
  }, [activeDiffTab])

  const handleCreateType = async (typeName) => {
    try {
      const res = await createQuestionType(typeName)
      toast.success(`Created type "${res.type.display_name}" and provisioned table "${res.type.table_name}" in database!`)
      setShowAddTypeModal(false)
      await loadQuestionTypes()
      navigate(`/admin/questions/python_questions?type=${res.type.slug}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to create question type')
      throw err
    }
  }

  const handleRemoveCustomType = async (slug) => {
    const ok = await confirm({
      title: 'Delete Question Type',
      message: `Are you sure you want to delete question type "${slug}"? This will CASCADE DELETE all its questions, student selections, and drop its dedicated table from the database.`,
      confirmText: 'Delete Type & Table',
      type: 'danger'
    })
    if (!ok) return

    try {
      await deleteQuestionType(slug)
      toast.success(`Cascade deleted question type "${slug}" and dropped its database table.`)
      await loadQuestionTypes()
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete question type')
    }
  }

  const handleAddQuestion = async () => {
    setError('')
    try {
      setSubmitting(true)
      const parsed = JSON.parse(jsonInput)
      const normalized = normalizeMcqQuestion(parsed)

      if (!normalized.question_title) {
        throw new Error('Title is required')
      }
      if (!normalized.question) {
        throw new Error('Question text is required')
      }
      if (!Array.isArray(normalized.options) || normalized.options.length < 2) {
        throw new Error('Please provide at least 2 options')
      }
      if (normalized.correct_answer < 0 || normalized.correct_answer >= normalized.options.length) {
        throw new Error('Invalid correct_answer index')
      }

      await createMcqQuestion(normalized)
      toast.success('MCQ question created successfully in database')
      setJsonInput('')
      setShowAdd(false)
      await loadQuestions()
      await loadQuestionTypes()
    } catch (saveError) {
      const message = saveError.response?.data?.detail || saveError.message || 'Invalid MCQ JSON payload'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (questionId) => {
    const ok = await confirm({
      title: 'Delete MCQ Question',
      message: 'Are you sure you want to delete this MCQ question from the database?',
      confirmText: 'Delete Question',
      type: 'danger'
    })
    if (!ok) return

    try {
      await deleteMcqQuestion(questionId)
      toast.success('MCQ question deleted from database')
      await loadQuestions()
      await loadQuestionTypes()
    } catch (deleteError) {
      const message = deleteError.response?.data?.detail || 'Failed to delete question'
      toast.error(message)
    }
  }

  const toggleExpand = (questionId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }))
  }

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
        ...questionTypes
          .filter(t => t.is_system === 0)
          .map((t) => ({
            label: `${t.display_name} Questions`,
            href: `/admin/questions/python_questions?type=${t.slug}`,
            activePaths: [`/admin/questions/python_questions?type=${t.slug}`, `/admin/questions/python_questions?lang=${t.slug}`],
            isCustom: true,
            typeKey: t.slug,
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

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  const easyQuestions = questions.filter((q) => (q.difficulty || '').toLowerCase() === 'easy')
  const mediumQuestions = questions.filter((q) => (q.difficulty || '').toLowerCase() === 'medium')
  const hardQuestions = questions.filter((q) => (q.difficulty || '').toLowerCase() === 'hard')

  const filteredQuestions = questions.filter((q) => (q.difficulty || '').toLowerCase() === activeDiffTab)

  return (
    <AdminSidebarLayout
      className="mcq-questions-page-layout"
      adminName={adminName || 'Admin User'}
      navItems={navItems}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
      onAddType={() => setShowAddTypeModal(true)}
      onRemoveCustomType={handleRemoveCustomType}
    >
      <div className="qp-content mcq-qp-content">
        {/* ── Toolbar: Difficulty Navigation Bar on Left, Search in Middle, Add Question on Right ── */}
        <div className="qp-toolbar">
          <div className="qp-diff-tabs" role="tablist" aria-label="Difficulty navigation">
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'easy'}
              className={`qp-diff-tab easy ${activeDiffTab === 'easy' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('easy')}
            >
              <span>Easy</span>
              <span className="qp-diff-badge">{easyQuestions.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'medium'}
              className={`qp-diff-tab medium ${activeDiffTab === 'medium' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('medium')}
            >
              <span>Medium</span>
              <span className="qp-diff-badge">{mediumQuestions.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'hard'}
              className={`qp-diff-tab hard ${activeDiffTab === 'hard' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('hard')}
            >
              <span>Hard</span>
              <span className="qp-diff-badge">{hardQuestions.length}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="ctt-search-wrapper" style={{ maxWidth: '320px' }}>
            <input
              type="text"
              className="ctt-search-input"
              style={{ paddingLeft: '14px' }}
              placeholder="Search MCQ questions by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="ctt-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="qp-btn-add"
            onClick={() => {
              setShowAdd((prev) => {
                const next = !prev
                if (next && !jsonInput) setJsonInput(buildMcqTemplate(activeDiffTab))
                return next
              })
            }}
          >
            <FiPlus size={15} />
            <span>{showAdd ? 'Close' : 'Add Question'}</span>
          </button>
        </div>

        {/* ── Add Question Panel ── */}
        {showAdd && (
          <div className="qp-add-panel">
            <div className="qp-add-panel-header">
              <h3>Add MCQ Question (Database Table: <code>mcq_questions</code>)</h3>
              <button type="button" className="qp-btn-close-panel" onClick={() => setShowAdd(false)}>
                <FiX size={16} />
              </button>
            </div>

            <div className="qp-json-editor-wrap">
              <div className="qp-ai-tip-banner">
                <span className="qp-ai-tip-icon">💡</span>
                <div className="qp-ai-tip-text">
                  <strong>Generate with AI (ChatGPT / Claude / Gemini):</strong> Click <strong>"Copy AI Prompt (ChatGPT)"</strong> below, paste it into ChatGPT with your topic to generate 100% compliant MCQ questions with options & explanations, then paste the JSON below.
                </div>
              </div>

              <div className="qp-json-header-row">
                <label className="qp-json-label" style={{ margin: 0 }}>Question Specification (JSON):</label>
                <div className="qp-json-actions-group">
                  <button
                    type="button"
                    className="qp-btn-copy-prompt"
                    onClick={() => {
                      const prompt = buildMcqAiPrompt(activeDiffTab)
                      navigator.clipboard.writeText(prompt)
                      setPromptCopied(true)
                      toast.success('MCQ AI Prompt copied! Paste into ChatGPT/Claude to generate valid MCQ questions.')
                      setTimeout(() => setPromptCopied(false), 2500)
                    }}
                    title="Copy prompt for ChatGPT / Claude to generate valid MCQ questions"
                  >
                    {promptCopied ? <><FiCheck style={{ color: '#34d399' }} /> Prompt Copied!</> : <><FiCpu /> Copy AI Prompt (ChatGPT)</>}
                  </button>

                  <button
                    type="button"
                    className="qp-btn-copy-json"
                    onClick={() => {
                      navigator.clipboard.writeText(jsonInput)
                      setJsonCopied(true)
                      toast.success('MCQ JSON template copied to clipboard!')
                      setTimeout(() => setJsonCopied(false), 2000)
                    }}
                    title="Copy sample MCQ JSON structure"
                  >
                    {jsonCopied ? <><FiCheck style={{ color: 'var(--color-success)' }} /> Copied!</> : <><FiCopy /> Copy Sample JSON</>}
                  </button>
                </div>
              </div>
              <textarea
                className="qp-json-textarea"
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste MCQ JSON here..."
              />
            </div>

            {error && <div className="qp-error-banner">{error}</div>}

            <div className="qp-add-panel-actions">
              <button type="button" className="qp-btn-cancel" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="button" className="qp-btn-save" onClick={handleAddQuestion} disabled={submitting}>
                <FiPlus size={14} /> {submitting ? 'Saving…' : 'Save Question to Database'}
              </button>
            </div>
          </div>
        )}

        {/* ── MCQ List ── */}
        {loading ? (
          <Spinner label="Loading MCQ questions from database…" size={40} />
        ) : (
          <div className="qp-section-card">
            <div className="qp-section-header">
              <div className="qp-section-title">
                <span className={`qp-dot ${activeDiffTab}`} />
                <h3>{activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)} MCQ Questions</h3>
              </div>
              <span className="qp-section-count">
                {filteredQuestions.length} {filteredQuestions.length === 1 ? 'question' : 'questions'}
              </span>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="qp-empty">
                <p>No {activeDiffTab} MCQ questions found in database table <code>mcq_questions</code>.</p>
                <button
                  type="button"
                  className="qp-btn-add-inline"
                  onClick={() => {
                    setJsonInput(buildMcqTemplate(activeDiffTab))
                    setShowAdd(true)
                  }}
                >
                  <FiPlus size={13} /> Add First MCQ Question
                </button>
              </div>
            ) : (
              <div className="qp-list">
                {filteredQuestions.map((q, idx) => {
                  const isExpanded = Boolean(expandedQuestions[q.id])
                  const options = Array.isArray(q.options) && q.options.length > 0
                    ? q.options
                    : [q.option_a, q.option_b, q.option_c, q.option_d].filter(Boolean)

                  return (
                    <div key={q.id || idx} className="qp-card">
                      <span className="qp-card-num">#{idx + 1}</span>
                      <div className="qp-card-body">
                        <div className="qp-card-top">
                          <span className="qp-card-title">{q.title || q.question_title || 'MCQ Question'}</span>
                        </div>
                        <div className="qp-card-chips">
                          <span className={`qp-chip diff ${q.difficulty?.toLowerCase()}`}>{q.difficulty}</span>
                          <span className="qp-chip marks">{q.marks || 10} marks</span>
                          <span className="qp-chip time">{formatTimeWithLabel(q.time_limit || q.time, false)}</span>
                          {q.topic && <span className="qp-chip topic">{q.topic}</span>}
                          <span className="qp-chip date">Added: {formatIST(q.created_at)}</span>
                        </div>

                        {isExpanded && (
                          <div className="mcq-card-details">
                            <FormattedQuestionText text={q.question || q.question_text} className="mcq-question-text" />
                            <div className="mcq-options-grid">
                              {options.map((option, optIdx) => {
                                const correctIdx = typeof q.correct_answer === 'number'
                                  ? q.correct_answer
                                  : (q.correct_option ? q.correct_option.toUpperCase().charCodeAt(0) - 65 : 0)
                                const isCorrect = optIdx === correctIdx
                                return (
                                  <div
                                    key={optIdx}
                                    className={`mcq-option-item ${isCorrect ? 'correct' : ''}`}
                                  >
                                    <span className="mcq-option-letter">{String.fromCharCode(65 + optIdx)}.</span>
                                    <span>{option}</span>
                                    {isCorrect && <span className="mcq-correct-tag">Correct Answer</span>}
                                  </div>
                                )
                              })}
                            </div>
                            {q.explanation && (
                              <div className="mcq-explanation-box">
                                <strong>Explanation:</strong> {q.explanation}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="qp-card-actions">
                        <button
                          type="button"
                          className="qp-btn-view"
                          onClick={() => toggleExpand(q.id)}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                        </button>
                        <button
                          type="button"
                          className="qp-btn-delete"
                          onClick={() => handleDelete(q.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {showAddTypeModal && (
          <AddTypeModal
            onAdd={handleCreateType}
            onClose={() => setShowAddTypeModal(false)}
          />
        )}
      </div>
    </AdminSidebarLayout>
  )
}

export default MCQQuestionsPage