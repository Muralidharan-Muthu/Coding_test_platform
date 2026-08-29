import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { FiZap, FiCopy, FiCheck, FiPlus, FiX } from 'react-icons/fi'
import Spinner from '../components/ui/Spinner'
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

function QuestionsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('python')
  const [activeDiffTab, setActiveDiffTab] = useState('easy')
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState('')
  const [customLangs, setCustomLangs] = useState(loadCustomLangs)
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [difficulty, setDifficulty] = useState('Easy')
  const [hasQuestion, setHasQuestion] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const promptRef = useRef(null)
  const [jsonCopied, setJsonCopied] = useState(false)
  const location = useLocation()

  // Navigation Items matching Manage Candidates tree structure
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

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) { navigate('/admin'); return }
    setAdminName(name || 'Admin User')
    loadProblems()
  }, [navigate])

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const langParam = searchParams.get('lang')

    if (langParam) {
      setActiveTab(langParam)
      setShowAdd(false)
      setError('')
    } else if (location.pathname.includes('sql')) {
      setActiveTab('sql')
      setShowAdd(false)
      setError('')
    } else if (location.pathname.includes('python')) {
      setActiveTab('python')
      setShowAdd(false)
      setError('')
    } else if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
      setShowAdd(false)
      setError('')
    }
  }, [location.pathname, location.search, location.state])

  const loadProblems = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/problems')
      setProblems(response.data || [])
    } catch (err) {
      toast.error('Failed to load questions.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (problemId, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    try {
      await api.delete(`/admin/problems/${problemId}`)
      toast.success(`"${title}" deleted`)
      loadProblems()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const handleAdd = async () => {
    setError('')
    if (!jsonInput.trim()) { setError('Paste the AI-generated JSON here'); return }
    let parsed
    try {
      const sanitized = jsonInput
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .trim()
      parsed = JSON.parse(sanitized)
    } catch (e) { setError('Invalid JSON. Please check the format and try again.'); return }
    if (!parsed.title || !parsed.language) { setError('JSON must have "title" and "language" fields'); return }
    if (!parsed.id) {
      const lang = parsed.language === 'sql' ? 'S' : parsed.language === 'python' ? 'P' : parsed.language.charAt(0).toUpperCase()
      const existing = problems.filter(p => p.language === parsed.language)
      parsed.id = `${lang}${String(existing.length + 1).padStart(2, '0')}_${Date.now()}`
    }
    try {
      await api.post('/admin/problems', parsed)
      toast.success(`"${parsed.title}" added successfully!`)
      setJsonInput('')
      setShowAdd(false)
      setGeneratedPrompt('')
      loadProblems()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add problem')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  const openAdd = () => {
    setShowAdd(true)
    setJsonInput('')
    setError('')
    setGeneratedPrompt('')
    setDifficulty('Easy')
    setHasQuestion(false)
    setQuestionText('')
  }

  const handleGeneratePrompt = () => {
    const template = activeTab === 'python' ? buildPythonTemplate(difficulty) : activeTab === 'sql' ? buildSqlTemplate(difficulty) : buildGenericTemplate(difficulty, activeTab)
    let prompt
    if (activeTab === 'python') {
      const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
      const rules = `\nLanguage: python | Difficulty: ${difficulty} | Marks: ${marks} | Time: ${time_limit}min\nReturn ONLY a valid JSON object, no markdown, no code fences.\n`
      prompt = hasQuestion && questionText.trim()
        ? `Convert this question to JSON:\n\n${questionText.trim()}\n${rules}\nTemplate:\n${template}`
        : `Create a NEW Python ${difficulty} coding question.\n${rules}\nTemplate:\n${template}`
    } else if (activeTab === 'sql') {
      const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
      const rules = `\nLanguage: sql | Difficulty: ${difficulty} | Marks: ${marks} | Time: ${time_limit}min\nReturn ONLY a valid JSON object, no markdown, no code fences.\n`
      prompt = hasQuestion && questionText.trim()
        ? `Convert this SQL question to JSON:\n\n${questionText.trim()}\n${rules}\nTemplate:\n${template}`
        : `Create a NEW SQL ${difficulty} coding question.\n${rules}\nTemplate:\n${template}`
    } else {
      prompt = `Create a NEW ${activeTab.toUpperCase()} ${difficulty} coding question.\nReturn ONLY a valid JSON object.\nTemplate:\n${template}`
    }
    setGeneratedPrompt(prompt)
    setTimeout(() => { if (promptRef.current) promptRef.current.scrollTop = 0 }, 50)
  }

  const handleCopyPrompt = () => {
    if (!generatedPrompt) return
    navigator.clipboard.writeText(generatedPrompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleCopyJson = () => {
    const template = activeTab === 'python' ? buildPythonTemplate(difficulty) : activeTab === 'sql' ? buildSqlTemplate(difficulty) : buildGenericTemplate(difficulty, activeTab)
    navigator.clipboard.writeText(template)
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 2000)
  }

  const handleAddCustomType = (lang) => {
    const next = [...customLangs, lang]
    setCustomLangs(next)
    saveCustomLangs(next)
    setShowAddTypeModal(false)
    toast.success(`"${lang.charAt(0).toUpperCase() + lang.slice(1)} Questions" added!`)
    setActiveTab(lang)
    setActiveDiffTab('easy')
    navigate(`/admin/questions/python_questions?lang=${lang}`)
  }

  const handleRemoveCustomType = (lang) => {
    if (!window.confirm(`Remove "${lang}" question type?`)) return
    const next = customLangs.filter(l => l !== lang)
    setCustomLangs(next)
    saveCustomLangs(next)
    if (activeTab === lang) {
      setActiveTab('python')
      navigate('/admin/questions/python_questions')
    }
    toast.success(`"${lang}" type removed`)
  }

  const filtered = problems.filter(p => p.language === activeTab)
  const easyList   = filtered.filter(p => p.difficulty?.toLowerCase() === 'easy')
  const mediumList = filtered.filter(p => p.difficulty?.toLowerCase() === 'medium')
  const hardList   = filtered.filter(p => p.difficulty?.toLowerCase() === 'hard')
  const diffCountMap = { easy: easyList.length, medium: mediumList.length, hard: hardList.length }
  const currentDiffList = activeDiffTab === 'easy' ? easyList : activeDiffTab === 'medium' ? mediumList : hardList

  const renderQuestionCard = (p, index) => (
    <div key={p.id} className="question-item">
      <div className="question-number">#{index + 1}</div>
      <div className="question-info">
        <h3>{p.title}</h3>
        <div className="question-meta">
          <span className={`difficulty-badge difficulty-${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
          <span className="marks">{p.marks} marks</span>
          <span className="time-limit">{p.time_limit} min</span>
          <span className="added-at">Added: {formatIST(p.created_at)}</span>
        </div>
      </div>
      <div className="question-actions">
        <button onClick={() => navigate(`/coding/${p.id}?mode=admin-preview`)} className="btn-view">View</button>
        <button onClick={() => handleDelete(p.id, p.title)} className="btn-delete">Delete</button>
      </div>
    </div>
  )

  return (
    <AdminSidebarLayout
      className="questions-page"
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

        {/* ── AI Prompt Builder / Add Section ── */}
        {showAdd && (
          <div className="add-section">
            <div className="add-header">
              <h3>Add {activeTab.toUpperCase()} Question</h3>
              <button onClick={() => { setShowAdd(false); setGeneratedPrompt('') }} className="btn-cancel">Cancel</button>
            </div>
            <div className="prompt-builder">
              <div className="pb-step-label">
                <span className="pb-step-badge">Step 1</span>
                Build an AI Prompt — paste it into ChatGPT, Claude, or Gemini
              </div>
              <div className="pb-row">
                <span className="pb-field-label">Difficulty</span>
                <div className="difficulty-selector">
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button key={d} className={`diff-btn diff-${d.toLowerCase()} ${difficulty === d ? 'selected' : ''}`} onClick={() => { setDifficulty(d); setGeneratedPrompt('') }}>
                      {d}<span className="diff-meta">{DIFFICULTY_CONFIG[d].marks} marks · {DIFFICULTY_CONFIG[d].time_limit} min</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="pb-row">
                <label className="pb-checkbox-label">
                  <input type="checkbox" checked={hasQuestion} onChange={e => { setHasQuestion(e.target.checked); setGeneratedPrompt('') }} className="pb-checkbox" />
                  <span>I already have a question — convert it to JSON</span>
                </label>
              </div>
              {hasQuestion && (
                <div className="pb-row">
                  <label className="pb-field-label">Paste your question</label>
                  <textarea className="pb-textarea" rows={5} placeholder="Paste the question text here..." value={questionText} onChange={e => { setQuestionText(e.target.value); setGeneratedPrompt('') }} />
                </div>
              )}
              <div className="pb-actions">
                <button className="btn-generate-prompt" onClick={handleGeneratePrompt}><FiZap /> Generate AI Prompt</button>
                {generatedPrompt && (
                  <button className={`btn-copy-prompt ${promptCopied ? 'copied' : ''}`} onClick={handleCopyPrompt}>
                    {promptCopied ? <><FiCheck /> Copied!</> : <><FiCopy /> Copy Prompt</>}
                  </button>
                )}
              </div>
              {generatedPrompt && (
                <div className="pb-prompt-output">
                  <div className="pb-prompt-header">
                    <span>Generated Prompt — Copy and paste into any AI</span>
                    <div className="pb-prompt-tags">
                      <span className="ai-tag">ChatGPT</span>
                      <span className="ai-tag">Claude</span>
                      <span className="ai-tag">Gemini</span>
                    </div>
                  </div>
                  <pre className="pb-prompt-text" ref={promptRef}>{generatedPrompt}</pre>
                </div>
              )}
            </div>

            <div className="prompt-builder prompt-builder-template" style={{ marginTop: '16px' }}>
              <div className="pb-step-label">
                <span className="pb-step-badge step2">Step 2</span>
                <span className="pb-step-title">JSON Template</span>
                JSON Template (for reference — AI fills this for you)
                <button className={`btn-copy-json ${jsonCopied ? 'copied' : ''}`} onClick={handleCopyJson}>
                  {jsonCopied ? <><FiCheck /> Copied!</> : 'Copy Template'}
                </button>
              </div>
              <pre className="template-code">{ activeTab === 'python' ? buildPythonTemplate(difficulty) : activeTab === 'sql' ? buildSqlTemplate(difficulty) : buildGenericTemplate(difficulty, activeTab)}</pre>
            </div>

            <div className="prompt-builder" style={{ marginTop: '16px' }}>
              <div className="pb-step-label">
                <span className="pb-step-badge step3">Step 3</span>
                Paste the AI-generated JSON below
              </div>
              <div className="paste-section">
                <textarea value={jsonInput} onChange={(e) => setJsonInput(e.target.value)} placeholder="Paste the JSON returned by AI here..." rows={12} className="json-input" />
                {error && <div className="error-msg">{error}</div>}
                <button onClick={handleAdd} className="btn-submit"><FiPlus /> Add Question</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Active Difficulty Question List ── */}
        {!showAdd && (
          <>
            {loading ? (
              <Spinner label="Loading questions…" size={44} />
            ) : filtered.length === 0 ? (
              <p className="no-questions">No {activeTab.toUpperCase()} questions found. Click "+ Add Question" to create one.</p>
            ) : currentDiffList.length === 0 ? (
              <div className="qp-empty-diff">
                <p>No <strong>{activeDiffTab}</strong> {activeTab.toUpperCase()} questions yet.</p>
                <button className="btn-add" onClick={openAdd}><FiPlus size={14} /> Add One</button>
              </div>
            ) : (
              <div className="questions-groups">
                <div className="difficulty-group">
                  <div className={`group-header group-${activeDiffTab}`}>
                    <div className="group-header-left">
                      <span className={`group-dot dot-${activeDiffTab}`} />
                      <span className="group-title">{activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)} Questions</span>
                    </div>
                    <span className="group-count">{currentDiffList.length} question{currentDiffList.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="questions-list">
                    {currentDiffList.map((p, i) => renderQuestionCard(p, i))}
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

export default QuestionsPage