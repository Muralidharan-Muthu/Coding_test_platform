import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import api, { getProblem, runCode, runSql, previewSubmitCode, previewSubmitSql } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import Spinner from '../components/ui/Spinner'
import { useToast } from '../components/ui/ToastProvider'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { clearPracticeSession } from '../utils/sessionStorage'
import {
  FiArrowLeft,
  FiPlay,
  FiUploadCloud,
  FiRefreshCw,
  FiCode,
  FiFileText,
  FiCheck,
  FiX,
  FiTerminal,
  FiAward
} from 'react-icons/fi'
import './AdminCodingPage.css'

function PracticeCodingPage() {
  const { problemId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const confirm = useConfirm()

  const [userName, setUserName] = useState('')
  const [problem, setProblem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [code, setCode] = useState('')
  const [starterCode, setStarterCode] = useState('')
  const [activeBottomTab, setActiveBottomTab] = useState('testcase')
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0)
  const [customInput, setCustomInput] = useState('')
  const [useCustomInput, setUseCustomInput] = useState(false)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [submitResult, setSubmitResult] = useState(null)

  useEffect(() => {
    if (localStorage.getItem('practice_logged_in') !== 'true') {
      navigate('/practice')
      return
    }
    setUserName(localStorage.getItem('practice_name') || 'Learner')
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
      toast.error('Failed to load problem')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset Code',
      message: 'Are you sure you want to reset your editor to the initial starter template? Current edits will be lost.',
      confirmText: 'Reset Code',
      type: 'warning'
    })
    if (ok) {
      setCode(starterCode)
      setRunResult(null)
      setSubmitResult(null)
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
    setSubmitResult(null)
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
        toast.success('Testcase Passed!')
      } else {
        toast.warning(res.status || 'Execution failed')
      }
    } catch (err) {
      setRunResult({
        status: 'Runtime Error',
        error: err.response?.data?.detail || err.message || 'Execution failed'
      })
      toast.error('Execution error')
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.warning('Please write code before submitting')
      return
    }
    setSubmitting(true)
    setRunResult(null)
    setSubmitResult(null)
    setActiveBottomTab('result')

    try {
      const isSql = (problem?.language || '').toLowerCase() === 'sql'
      let res
      if (isSql) {
        res = await previewSubmitSql(problem.id, code)
      } else {
        res = await previewSubmitCode(problem.id, code)
      }

      setSubmitResult(res)
      if (res.status === 'Accepted' || res.passed_count === res.total_count) {
        toast.success(`🎉 Excellent! Passed all ${res.total_count || 0} test cases!`)
      } else {
        toast.info(`Passed ${res.passed_count || 0} of ${res.total_count || 0} test cases.`)
      }
    } catch (err) {
      setSubmitResult({
        status: 'Submission Error',
        error: err.response?.data?.detail || err.message || 'Evaluation failed'
      })
      toast.error('Failed to submit practice code')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    clearPracticeSession()
    navigate('/practice')
  }

  if (loading) {
    return <Spinner label="Loading practice workspace…" size={44} fullPage />
  }

  if (!problem) {
    return (
      <div className="acp-error-page">
        <h2>Practice Problem Not Found</h2>
        <button onClick={() => navigate('/practice/problems')} className="acp-btn-back">
          <FiArrowLeft /> Back to Practice
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
            onClick={() => navigate('/practice/problems')}
            title="Back to Practice Problems"
          >
            <FiArrowLeft size={16} />
            <span>Practice</span>
          </button>
          <div className="acp-divider" />
          <h1 className="acp-title">{problem.title}</h1>
          <span className="acp-badge acp-badge-preview" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
            Practice Mode
          </span>
          <span className={`acp-badge acp-badge-diff ${problem.difficulty?.toLowerCase()}`}>
            {problem.difficulty}
          </span>
          <span className="acp-badge acp-badge-marks">{problem.marks || 10} Marks</span>
          <span className="acp-badge acp-badge-lang">{problem.language?.toUpperCase()}</span>
        </div>

        <div className="acp-header-right">
          <ThemeToggle />
          <div className="acp-user-chip" title={userName}>
            <span className="acp-avatar" style={{ background: '#10b981' }}>{(userName || 'L').charAt(0).toUpperCase()}</span>
            <span className="acp-user-name">{userName}</span>
          </div>
          <button type="button" className="acp-logout-btn" onClick={handleLogout}>
            Exit Practice
          </button>
        </div>
      </header>

      {/* ── Split Workspace ── */}
      <div className="acp-body">
        {/* ── Left Column: Problem Statement ── */}
        <div className="acp-panel acp-left-panel">
          <div className="acp-tabs">
            <button type="button" className="acp-tab active">
              <FiFileText size={14} /> Problem Description
            </button>
          </div>

          <div className="acp-panel-content">
            <div className="acp-desc-view">
              <div className="acp-desc-header">
                <h2>{problem.title}</h2>
                <div className="acp-desc-meta">
                  <span><strong>Difficulty:</strong> {problem.difficulty}</span>
                  <span><strong>Estimated Time:</strong> {problem.time_limit || 15} mins</span>
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
          </div>
        </div>

        {/* ── Right Column: Code Editor & Runner ── */}
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
                  <FiCheck size={13} /> Result
                  {(runResult || submitResult) && (
                    <span className={`acp-status-dot ${(runResult?.status === 'Accepted' || submitResult?.status === 'Accepted') ? 'pass' : 'fail'}`} />
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="acp-btn-run"
                  onClick={handleRun}
                  disabled={running || submitting}
                >
                  <FiPlay size={13} /> {running ? 'Running...' : 'Run Code'}
                </button>
                <button
                  type="button"
                  className="acp-btn-run"
                  style={{ background: 'var(--color-accent)' }}
                  onClick={handleSubmit}
                  disabled={running || submitting}
                >
                  <FiUploadCloud size={13} /> {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>

            <div className="acp-console-body">
              {activeBottomTab === 'testcase' && (
                <div className="acp-testcase-inputs">
                  <div className="acp-case-selector">
                    {testCases.slice(0, 3).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`acp-case-chip ${!useCustomInput && selectedTestCaseIndex === i ? 'selected' : ''}`}
                        onClick={() => { setSelectedTestCaseIndex(i); setUseCustomInput(false) }}
                      >
                        Sample Case {i + 1}
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
                  {!runResult && !submitResult && !running && !submitting && (
                    <p className="acp-empty-text">Click "Run Code" to test on sample cases or "Submit" to evaluate all test cases.</p>
                  )}
                  {(running || submitting) && (
                    <div className="acp-running-box">
                      <Spinner label={running ? 'Running code…' : 'Evaluating test cases…'} size={24} />
                    </div>
                  )}

                  {submitResult && !submitting && (
                    <div className="acp-result-content">
                      <div className={`acp-result-status-badge ${submitResult.status === 'Accepted' || submitResult.passed_count === submitResult.total_count ? 'success' : 'error'}`}>
                        <FiAward style={{ marginRight: '5px' }} />
                        {submitResult.status || (submitResult.passed_count === submitResult.total_count ? 'Accepted' : 'Partial Score')}
                        {' — '}Passed {submitResult.passed_count || 0} / {submitResult.total_count || 0} Testcases
                      </div>

                      {submitResult.details && Array.isArray(submitResult.details) && (
                        <div className="acp-result-section">
                          <label>Testcase Breakdown:</label>
                          {submitResult.details.map((d, i) => (
                            <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', marginTop: '4px' }}>
                              <span>Testcase #{i + 1}:</span>
                              <strong style={{ color: d.passed ? 'var(--color-success)' : 'var(--color-error)' }}>
                                {d.passed ? 'Passed ✓' : 'Failed ✗'}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {runResult && !running && !submitResult && (
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

export default PracticeCodingPage