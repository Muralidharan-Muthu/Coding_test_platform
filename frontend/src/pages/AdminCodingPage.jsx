import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import api, { getProblem, runCode, runSql } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../components/ui/ToastProvider'
import { useConfirm } from '../components/ui/ConfirmDialog'
import {
  FiArrowLeft,
  FiPlay,
  FiRefreshCw,
  FiCode,
  FiFileText,
  FiCheck,
  FiX,
  FiClock,
  FiLayers,
  FiMaximize2,
  FiTerminal
} from 'react-icons/fi'
import './AdminCodingPage.css'

function AdminCodingPage() {
  const { problemId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [adminName, setAdminName] = useState('')
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [starterCode, setStarterCode] = useState('')
  const [activeLeftTab, setActiveLeftTab] = useState('description')
  const [activeBottomTab, setActiveBottomTab] = useState('testcase')
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0)
  const [customInput, setCustomInput] = useState('')
  const [useCustomInput, setUseCustomInput] = useState(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name || 'Admin')
    loadProblem()
  }, [problemId, navigate])

  const loadProblem = async () => {
    setLoading(true)
    try {
      const data = await getProblem(problemId)
      setProblem(data)
      const initialCode = data.starter_code || (data.language === 'sql' ? 'SELECT * FROM employees;' : '# Write your solution here\n')
      setCode(initialCode)
      setStarterCode(initialCode)
      if (data.sample_input) {
        setCustomInput(data.sample_input)
      }
    } catch (err) {
      toast.error('Failed to load problem details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset Code',
      message: 'Are you sure you want to reset your editor to the starter template?',
      confirmText: 'Reset Code',
      type: 'warning'
    })
    if (ok) {
      setCode(starterCode)
      setRunResult(null)
      toast.info('Code reset to template')
    }
  }

  const handleRun = async () => {
    if (!code.trim()) {
      toast.warning('Please enter some code to run')
      return
    }
    setRunning(true)
    setRunResult(null)
    setActiveBottomTab('result')

    try {
      const isSql = (problem?.language || '').toLowerCase() === 'sql'
      let inputToUse = ''

      if (useCustomInput) {
        inputToUse = customInput
      } else if (problem?.test_cases && problem.test_cases[selectedTestCaseIndex]) {
        inputToUse = problem.test_cases[selectedTestCaseIndex].input || ''
      } else {
        inputToUse = problem?.sample_input || ''
      }

      let res
      if (isSql) {
        res = await runSql(problem.id, code)
      } else {
        res = await runCode(problem.id, code, inputToUse)
      }

      setRunResult(res)
      if (res.status === 'Accepted' || res.passed) {
        toast.success('Execution succeeded!')
      } else {
        toast.warning(res.status || 'Execution finished with issues')
      }
    } catch (err) {
      console.error('Run error:', err)
      setRunResult({
        status: 'Runtime Error',
        error: err.response?.data?.detail || err.message || 'Execution failed'
      })
      toast.error('Execution error')
    } finally {
      setRunning(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  if (loading) {
    return <Spinner label="Loading problem inspection…" size={44} fullPage />
  }

  if (!problem) {
    return (
      <div className="acp-error-page">
        <h2>Problem Not Found</h2>
        <button onClick={() => navigate('/admin/questions/python_questions')} className="acp-btn-back">
          <FiArrowLeft /> Back to Questions
        </button>
      </div>
    )
  }

  const testCases = problem.test_cases || []
  const isSql = (problem.language || '').toLowerCase() === 'sql'

  return (
    <div className="acp-container">
      {/* ── Top Header ── */}
      <header className="acp-header">
        <div className="acp-header-left">
          <button
            type="button"
            className="acp-back-btn"
            onClick={() => {
              if (isSql) navigate('/admin/questions/sql_questions')
              else navigate('/admin/questions/python_questions')
            }}
            title="Back to Questions"
          >
            <FiArrowLeft size={16} />
            <span>Questions</span>
          </button>
          <div className="acp-divider" />
          <h1 className="acp-title">{problem.title}</h1>
          <span className="acp-badge acp-badge-preview">Admin Preview</span>
          <span className={`acp-badge acp-badge-diff ${problem.difficulty?.toLowerCase()}`}>
            {problem.difficulty}
          </span>
          <span className="acp-badge acp-badge-marks">{problem.marks || 10} Marks</span>
          <span className="acp-badge acp-badge-lang">{problem.language?.toUpperCase()}</span>
        </div>

        <div className="acp-header-right">
          <ThemeToggle />
          <div className="acp-user-chip" title={adminName}>
            <span className="acp-avatar">{(adminName || 'A').charAt(0).toUpperCase()}</span>
            <span className="acp-user-name">{adminName}</span>
          </div>
          <button type="button" className="acp-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* ── Main Split Workspace ── */}
      <div className="acp-body">
        {/* ── Left Column: Problem Details & Testcases ── */}
        <div className="acp-panel acp-left-panel">
          <div className="acp-tabs">
            <button
              type="button"
              className={`acp-tab ${activeLeftTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('description')}
            >
              <FiFileText size={14} /> Description
            </button>
            <button
              type="button"
              className={`acp-tab ${activeLeftTab === 'testcases' ? 'active' : ''}`}
              onClick={() => setActiveLeftTab('testcases')}
            >
              <FiLayers size={14} /> Configured Test Cases ({testCases.length})
            </button>
          </div>

          <div className="acp-panel-content">
            {activeLeftTab === 'description' && (
              <div className="acp-desc-view">
                <div className="acp-desc-header">
                  <h2>{problem.title}</h2>
                  <div className="acp-desc-meta">
                    <span><strong>Time Limit:</strong> {problem.time_limit || 15} mins</span>
                    <span><strong>Marks:</strong> {problem.marks || 10}</span>
                  </div>
                </div>

                <div className="acp-section">
                  <h4>Description</h4>
                  <div className="acp-desc-text">
                    {problem.description || problem.statement || 'No description provided.'}
                  </div>
                </div>

                {problem.input_format && (
                  <div className="acp-section">
                    <h4>Input Format</h4>
                    <pre className="acp-pre">{typeof problem.input_format === 'string' ? problem.input_format : JSON.stringify(problem.input_format, null, 2)}</pre>
                  </div>
                )}

                {problem.output_format && (
                  <div className="acp-section">
                    <h4>Output Format</h4>
                    <pre className="acp-pre">{typeof problem.output_format === 'string' ? problem.output_format : JSON.stringify(problem.output_format, null, 2)}</pre>
                  </div>
                )}

                {problem.sample_input && (
                  <div className="acp-section">
                    <h4>Sample Input</h4>
                    <pre className="acp-code-block">{problem.sample_input}</pre>
                  </div>
                )}

                {problem.sample_output && (
                  <div className="acp-section">
                    <h4>Sample Output</h4>
                    <pre className="acp-code-block">{problem.sample_output}</pre>
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'testcases' && (
              <div className="acp-testcases-view">
                <p className="acp-section-sub">These test cases are evaluated when candidates submit solutions:</p>
                {testCases.length === 0 ? (
                  <p className="acp-empty-text">No test cases configured for this question.</p>
                ) : (
                  testCases.map((tc, idx) => (
                    <div key={idx} className="acp-tc-card">
                      <div className="acp-tc-header">
                        <span className="acp-tc-badge">Test Case #{idx + 1}</span>
                      </div>
                      <div className="acp-tc-grid">
                        <div>
                          <label>Input:</label>
                          <pre className="acp-tc-box">{tc.input || '(empty)'}</pre>
                        </div>
                        <div>
                          <label>Expected Output:</label>
                          <pre className="acp-tc-box">{typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output, null, 2)}</pre>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Monaco Code Editor & Execution Console ── */}
        <div className="acp-panel acp-right-panel">
          <div className="acp-editor-header">
            <div className="acp-editor-title">
              <FiCode size={15} />
              <span>Solution Editor ({isSql ? 'SQL' : 'Python 3'})</span>
            </div>
            <div className="acp-editor-actions">
              <button type="button" className="acp-btn-tool" onClick={handleReset} title="Reset to template">
                <FiRefreshCw size={13} /> Reset
              </button>
            </div>
          </div>

          <div className="acp-editor-container">
            <Editor
              height="100%"
              language={isSql ? 'sql' : 'python'}
              theme="vs-dark"
              value={code}
              onChange={(newVal) => setCode(newVal || '')}
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4,
              }}
            />
          </div>

          {/* ── Console / Execution Panel ── */}
          <div className="acp-console">
            <div className="acp-console-header">
              <div className="acp-console-tabs">
                <button
                  type="button"
                  className={`acp-tab ${activeBottomTab === 'testcase' ? 'active' : ''}`}
                  onClick={() => setActiveBottomTab('testcase')}
                >
                  <FiTerminal size={13} /> Testcase Input
                </button>
                <button
                  type="button"
                  className={`acp-tab ${activeBottomTab === 'result' ? 'active' : ''}`}
                  onClick={() => setActiveBottomTab('result')}
                >
                  <FiCheck size={13} /> Test Result
                  {runResult && <span className={`acp-status-dot ${runResult.status === 'Accepted' ? 'pass' : 'fail'}`} />}
                </button>
              </div>

              <button
                type="button"
                className="acp-btn-run"
                onClick={handleRun}
                disabled={running}
              >
                <FiPlay size={13} /> {running ? 'Running...' : 'Run Code'}
              </button>
            </div>

            <div className="acp-console-body">
              {activeBottomTab === 'testcase' && (
                <div className="acp-testcase-inputs">
                  <div className="acp-case-selector">
                    {testCases.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`acp-case-chip ${!useCustomInput && selectedTestCaseIndex === i ? 'selected' : ''}`}
                        onClick={() => { setSelectedTestCaseIndex(i); setUseCustomInput(false) }}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`acp-case-chip ${useCustomInput ? 'selected' : ''}`}
                      onClick={() => setUseCustomInput(true)}
                    >
                      Custom Input
                    </button>
                  </div>

                  <div className="acp-input-box">
                    {useCustomInput ? (
                      <textarea
                        className="acp-textarea"
                        rows={4}
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="Enter custom standard input..."
                      />
                    ) : (
                      <pre className="acp-input-preview">
                        {testCases[selectedTestCaseIndex]?.input || problem.sample_input || '(no input)'}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {activeBottomTab === 'result' && (
                <div className="acp-result-view">
                  {!runResult && !running && (
                    <p className="acp-empty-text">Click "Run Code" to compile and test the solution.</p>
                  )}
                  {running && (
                    <div className="acp-running-box">
                      <Spinner label="Executing code in sandbox…" size={24} />
                    </div>
                  )}
                  {runResult && !running && (
                    <div className="acp-result-content">
                      <div className={`acp-result-status-badge ${runResult.status === 'Accepted' || runResult.passed ? 'success' : 'error'}`}>
                        {runResult.status || (runResult.passed ? 'Accepted' : 'Failed')}
                      </div>

                      {runResult.output !== undefined && (
                        <div className="acp-result-section">
                          <label>Output:</label>
                          <pre className="acp-code-block">{runResult.output || '(empty output)'}</pre>
                        </div>
                      )}

                      {runResult.expected !== undefined && (
                        <div className="acp-result-section">
                          <label>Expected Output:</label>
                          <pre className="acp-code-block">{runResult.expected}</pre>
                        </div>
                      )}

                      {runResult.error && (
                        <div className="acp-result-section">
                          <label>Error:</label>
                          <pre className="acp-error-block">{runResult.error}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminCodingPage