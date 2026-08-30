import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getQuestionTypes,
  createQuestionType,
  deleteQuestionType,
  getQuestionsByType,
  createQuestionUnderType,
  deleteQuestionUnderType,
} from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { FiZap, FiCopy, FiCheck, FiPlus, FiX } from 'react-icons/fi'
import Spinner from '../components/ui/Spinner'
import './QuestionsPage.css'

const DIFFICULTY_CONFIG = {
  Easy:   { marks: 10, time_limit: 10 },
  Medium: { marks: 20, time_limit: 15 },
  Hard:   { marks: 40, time_limit: 25 },
}

const DIFFICULTY_TABS = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
]

function buildPythonTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
  return JSON.stringify({
    title: "",
    language: "python",
    difficulty,
    marks,
    time_limit,
    description: "",
    input_format: "",
    output_format: "",
    sample_input: "",
    sample_output: "",
    starter_code: "import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Read input\n    # Write your logic here\n    pass\n\nsolve()",
    test_cases: [
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" }
    ]
  }, null, 2)
}

function buildSqlTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
  return JSON.stringify({
    title: "",
    language: "sql",
    difficulty,
    marks,
    time_limit,
    statement: "",
    description: "",
    input_format: {
      tables: [
        {
          table_name: "employees",
          columns: ["id", "name", "department", "salary"],
          rows: [
            ["1", "Alice", "Engineering", "72000"],
            ["2", "Bob", "Marketing", "45000"]
          ]
        }
      ]
    },
    expected_output: {
      columns: ["column1", "column2"],
      rows: [["value1", "value2"]]
    },
    starter_code: "SELECT * FROM table_name;",
    schema_sql: "CREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  department TEXT NOT NULL,\n  salary INTEGER NOT NULL\n);",
    seed_sql: "INSERT INTO employees VALUES\n(1, 'Alice', 'Engineering', 72000),\n(2, 'Bob', 'Marketing', 45000);",
    test_cases: [
      { expected_output: { columns: ["column1", "column2"], rows: [["value1", "value2"]] } },
      { expected_output: { columns: ["column1", "column2"], rows: [["value3", "value4"]] } },
      { expected_output: { columns: ["column1", "column2"], rows: [["value5", "value6"]] } },
      { expected_output: { columns: ["column1", "column2"], rows: [["value7", "value8"]] } },
      { expected_output: { columns: ["column1", "column2"], rows: [["value9", "value10"]] } }
    ]
  }, null, 2)
}

function buildGenericTemplate(difficulty, language) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
  return JSON.stringify({
    title: "",
    language: language.toLowerCase(),
    difficulty,
    marks,
    time_limit,
    description: "",
    input_format: "",
    output_format: "",
    sample_input: "",
    sample_output: "",
    starter_code: `// ${language} solution\nfunction solve() {\n  // Write logic here\n}\n`,
    test_cases: [
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" }
    ]
  }, null, 2)
}

function formatIST(isoString) {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch { return '—' }
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

function QuestionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const [adminName, setAdminName] = useState('')
  const [questionTypes, setQuestionTypes] = useState([])
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDiffTab, setActiveDiffTab] = useState('easy')
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [difficulty, setDifficulty] = useState('Easy')
  const [hasQuestion, setHasQuestion] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const promptRef = useRef(null)
  const [jsonCopied, setJsonCopied] = useState(false)

  // Compute activeTab from pathname or query param
  const queryParams = new URLSearchParams(location.search)
  const queryType = queryParams.get('type') || queryParams.get('lang')
  
  let activeTab = 'python'
  if (location.pathname.includes('/sql_questions') || location.pathname.includes('/sql')) {
    activeTab = 'sql'
  } else if (queryType) {
    activeTab = queryType.toLowerCase()
  } else if (location.pathname.includes('/python_questions')) {
    activeTab = 'python'
  }

  // Load question types from backend
  const loadQuestionTypes = async () => {
    try {
      const types = await getQuestionTypes()
      setQuestionTypes(types)
    } catch (err) {
      console.error('Failed to load question types:', err)
    }
  }

  // Load problems for the activeTab from its dedicated table in Turso
  const loadProblems = async (tabToLoad = activeTab) => {
    setLoading(true)
    setError('')
    try {
      const data = await getQuestionsByType(tabToLoad)
      setProblems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load questions:', err)
      setError('Failed to load questions from database')
      setProblems([])
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
    loadQuestionTypes()
  }, [navigate])

  useEffect(() => {
    loadProblems(activeTab)
    // Update default starter JSON template
    if (activeTab === 'python') {
      setJsonInput(buildPythonTemplate('Easy'))
    } else if (activeTab === 'sql') {
      setJsonInput(buildSqlTemplate('Easy'))
    } else {
      setJsonInput(buildGenericTemplate('Easy', activeTab))
    }
    setShowAdd(false)
  }, [activeTab, location.pathname, location.search])

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
      if (activeTab === slug) {
        navigate('/admin/questions/python_questions')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete question type')
    }
  }

  const handleAddQuestion = async () => {
    setError('')
    try {
      const parsed = JSON.parse(jsonInput)
      if (!parsed.title) throw new Error('Title is required')
      parsed.language = activeTab

      await createQuestionUnderType(activeTab, parsed)
      toast.success(`Question added to ${activeTab.toUpperCase()} table successfully!`)
      setShowAdd(false)
      await loadProblems(activeTab)
      await loadQuestionTypes()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Invalid JSON format'
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDeleteProblem = async (problem) => {
    const ok = await confirm({
      title: 'Delete Question',
      message: `Are you sure you want to delete "${problem.title}" from the database?`,
      confirmText: 'Delete Question',
      type: 'danger'
    })
    if (!ok) return

    try {
      await deleteQuestionUnderType(activeTab, problem.id)
      toast.success('Question deleted successfully')
      await loadProblems(activeTab)
      await loadQuestionTypes()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete question')
    }
  }

  // Dynamic navItems driven by Turso question_types registry
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

  // Difficulty counts
  const easyCount = problems.filter(p => (p.difficulty || '').toLowerCase() === 'easy').length
  const mediumCount = problems.filter(p => (p.difficulty || '').toLowerCase() === 'medium').length
  const hardCount = problems.filter(p => (p.difficulty || '').toLowerCase() === 'hard').length

  const filteredProblems = problems.filter((p) => {
    const matchesDiff = (p.difficulty || '').toLowerCase() === activeDiffTab
    if (!matchesDiff) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
  })
  const activeTypeObj = questionTypes.find(t => t.slug === activeTab)
  const currentDisplayName = activeTypeObj?.display_name || (activeTab.charAt(0).toUpperCase() + activeTab.slice(1))

  return (
    <AdminSidebarLayout
      className="questions-page-layout"
      adminName={adminName || 'Admin User'}
      navItems={navItems}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
      onAddType={() => setShowAddTypeModal(true)}
      onRemoveCustomType={handleRemoveCustomType}
    >
      <div className="qp-content">
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
              <span className="qp-diff-badge">{easyCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'medium'}
              className={`qp-diff-tab medium ${activeDiffTab === 'medium' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('medium')}
            >
              <span>Medium</span>
              <span className="qp-diff-badge">{mediumCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'hard'}
              className={`qp-diff-tab hard ${activeDiffTab === 'hard' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('hard')}
            >
              <span>Hard</span>
              <span className="qp-diff-badge">{hardCount}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="ctt-search-wrapper" style={{ maxWidth: '320px' }}>
            <input
              type="text"
              className="ctt-search-input"
              style={{ paddingLeft: '14px' }}
              placeholder={`Search ${currentDisplayName} questions...`}
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
            onClick={() => setShowAdd((prev) => !prev)}
          >
            <FiPlus size={15} />
            <span>{showAdd ? 'Close' : 'Add Question'}</span>
          </button>
        </div>

        {/* ── Add Question Panel ── */}
        {showAdd && (
          <div className="qp-add-panel">
            <div className="qp-add-panel-header">
              <h3>Add {currentDisplayName} Question (Database Table: <code>{activeTypeObj?.table_name || `${activeTab}_problems`}</code>)</h3>
              <button type="button" className="qp-btn-close-panel" onClick={() => setShowAdd(false)}>
                <FiX size={16} />
              </button>
            </div>

            <div className="qp-json-editor-wrap">
              <label className="qp-json-label">Question Specification (JSON):</label>
              <textarea
                className="qp-json-textarea"
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste question JSON here..."
              />
            </div>

            {error && <div className="qp-error-banner">{error}</div>}

            <div className="qp-add-panel-actions">
              <button type="button" className="qp-btn-cancel" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="button" className="qp-btn-save" onClick={handleAddQuestion}>
                <FiPlus size={14} /> Save Question to Database
              </button>
            </div>
          </div>
        )}

        {/* ── Problems Section List ── */}
        {loading ? (
          <Spinner label={`Loading ${currentDisplayName} questions from database…`} size={40} />
        ) : (
          <div className="qp-section-card">
            <div className="qp-section-header">
              <div className="qp-section-title">
                <span className={`qp-dot ${activeDiffTab}`} />
                <h3>{activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)} {currentDisplayName} Questions</h3>
              </div>
              <span className="qp-section-count">
                {filteredProblems.length} {filteredProblems.length === 1 ? 'question' : 'questions'}
              </span>
            </div>

            {filteredProblems.length === 0 ? (
              <div className="qp-empty">
                <p>No {activeDiffTab} {currentDisplayName} questions found in database table <code>{activeTypeObj?.table_name || `${activeTab}_problems`}</code>.</p>
                <button
                  type="button"
                  className="qp-btn-add-inline"
                  onClick={() => setShowAdd(true)}
                >
                  <FiPlus size={13} /> Add First {currentDisplayName} Question
                </button>
              </div>
            ) : (
              <div className="qp-list">
                {filteredProblems.map((p, idx) => (
                  <div key={p.id || idx} className="qp-card">
                    <span className="qp-card-num">#{idx + 1}</span>
                    <div className="qp-card-body">
                      <div className="qp-card-top">
                        <span className="qp-card-title">{p.title}</span>
                      </div>
                      <div className="qp-card-chips">
                        <span className={`qp-chip diff ${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
                        <span className="qp-chip marks">{p.marks || 10} marks</span>
                        <span className="qp-chip time">{p.time_limit || 15} min</span>
                        <span className="qp-chip date">Added: {formatIST(p.created_at)}</span>
                      </div>
                    </div>
                    <div className="qp-card-actions">
                      <button
                        type="button"
                        className="qp-btn-view"
                        onClick={() => navigate(`/admin/problem/${p.id}`)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="qp-btn-delete"
                        onClick={() => handleDeleteProblem(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
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

export default QuestionsPage