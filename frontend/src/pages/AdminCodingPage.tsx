import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import api, { getProblem, runCode, runSql, previewSubmitCode, previewSubmitSql } from '../api'
import ThemeToggle from '../components/ui/ThemeToggle'
import Spinner from '../components/ui/Spinner'
import { PlatformLogoSmall } from '../components/ui/Branding'
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
  FiTerminal,
  FiAward,
  FiCopy,
  FiSearch,
  FiCheckCircle,
  FiAlertCircle,
  FiCpu
} from 'react-icons/fi'
import { FormattedContent } from '../components/ui/TableRenderer'
import { formatTimeWithLabel } from '../utils/timeUtils'

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
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState(null)
  const [runResult, setRunResult] = useState(null)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const [tcSearch, setTcSearch] = useState('')
  const [selectedTcFilter, setSelectedTcFilter] = useState('all')

  // ── Drag & Resize Dimensions ──
  const [leftWidthPercent, setLeftWidthPercent] = useState(46)
  const [consoleHeightPx, setConsoleHeightPx] = useState(250)
  const [isDraggingV, setIsDraggingV] = useState(false)
  const [isDraggingH, setIsDraggingH] = useState(false)
  const containerRef = useRef(null)
  const rightPanelRef = useRef(null)

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
      let initialCode = data.starter_code || ''
      if (data.language === 'sql') {
        if (!initialCode.trim() || /^\s*SELECT\b/i.test(initialCode.trim())) {
          initialCode = '-- Write your SQL query here\n'
        }
      } else if (!initialCode.trim()) {
        initialCode = '# Write your solution here\n'
      }
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

  // ── Vertical Drag Handler ──
  const startDragV = useCallback((e) => {
    e.preventDefault()
    setIsDraggingV(true)

    const onMouseMove = (moveEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100
      if (newPercent >= 24 && newPercent <= 76) {
        setLeftWidthPercent(newPercent)
      }
    }

    const onMouseUp = () => {
      setIsDraggingV(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  // ── Horizontal Drag Handler ──
  const startDragH = useCallback((e) => {
    e.preventDefault()
    setIsDraggingH(true)

    const onMouseMove = (moveEvent) => {
      if (!rightPanelRef.current) return
      const rect = rightPanelRef.current.getBoundingClientRect()
      const newHeight = rect.bottom - moveEvent.clientY
      if (newHeight >= 110 && newHeight <= 540) {
        setConsoleHeightPx(newHeight)
      }
    }

    const onMouseUp = () => {
      setIsDraggingH(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

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

      const expectedRaw = testCases[selectedTestCaseIndex]?.expected_output ?? problem?.sample_output ?? ''
      const expectedToCompare = typeof expectedRaw === 'object' && expectedRaw !== null
        ? JSON.stringify(expectedRaw)
        : String(expectedRaw ?? '')

      let res
      if (isSql) {
        res = await runSql(problem.id, code)
        setRunResult({
          status: res.status === 'success' ? 'Finished' : 'Error',
          output: JSON.stringify(res.rows || []),
          error: res.error,
        })
      } else {
        res = await runCode(code, inputToUse)
        const rawReturn = res.return_value !== undefined && res.return_value !== null ? res.return_value : ''
        const actual = typeof rawReturn === 'object' ? JSON.stringify(rawReturn) : String(rawReturn).trim()
        const expNorm = expectedToCompare.trim()

        const isAccepted = Boolean(
          expNorm && actual && actual !== 'None' && (
            actual === expNorm ||
            actual.replace(/\s+/g, '') === expNorm.replace(/\s+/g, '') ||
            actual.toLowerCase() === expNorm.toLowerCase()
          )
        )

        let status = 'Finished'
        if (res.stderr) {
          status = 'Runtime Error'
        } else if (isAccepted) {
          status = 'Accepted'
        } else if (expNorm && actual && actual !== 'None') {
          status = 'Wrong Answer'
        } else if (actual === 'None' || !actual) {
          status = expNorm ? 'Wrong Answer' : 'Finished'
        }

        setRunResult({
          status,
          output: actual && actual !== 'None' ? actual : 'None (no return value)',
          stdout: res.stdout || '',
          expected: expectedToCompare,
          error: res.stderr || '',
        })
      }

      if (res.status === 'Accepted' || !res.stderr) {
        toast.success('Execution succeeded!')
      } else {
        toast.warning('Execution finished with issues')
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

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.warning('Please write code before testing all cases')
      return
    }
    setSubmitting(true)
    setRunResult(null)
    setSubmitResult(null)
    setActiveBottomTab('result')

    try {
      let res
      if (isSql) {
        res = await previewSubmitSql(problem.id, code)
      } else {
        res = await previewSubmitCode(problem.id, code)
      }

      setSubmitResult(res)
      const isAccepted = res.verdict === 'Accepted' || (res.total_tests > 0 && res.passed_tests === res.total_tests)
      if (isAccepted) {
        toast.success(`🎉 Passed all ${res.total_tests || 0} test cases (100%)!`)
      } else {
        toast.info(`Passed ${res.passed_tests || 0} of ${res.total_tests || 0} test cases (${res.score?.toFixed(0) || 0}%).`)
      }
    } catch (err) {
      setSubmitResult({
        verdict: 'Error',
        error: err.response?.data?.detail || err.message || 'Evaluation failed'
      })
      toast.error('Evaluation failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopyText = (text, idx) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    toast.success('Copied to clipboard!')
    setTimeout(() => setCopiedIndex(null), 1800)
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

  const filteredTestCases = testCases.filter((tc, idx) => {
    if (selectedTcFilter !== 'all' && Number(selectedTcFilter) !== idx) return false
    if (!tcSearch.trim()) return true
    const searchLower = tcSearch.toLowerCase()
    const inp = (tc.input || '').toLowerCase()
    const exp = (typeof tc.expected_output === 'string' ? tc.expected_output : JSON.stringify(tc.expected_output || '')).toLowerCase()
    return `case ${idx + 1}`.includes(searchLower) || inp.includes(searchLower) || exp.includes(searchLower)
  })

  return (
    <div className={`acp-container ${isDraggingV || isDraggingH ? 'is-resizing' : ''}`}>
      {/* ── Top Header ── */}
      <header className="acp-header">
        <div className="acp-header-left">
          <PlatformLogoSmall onClick={() => navigate('/admin/dashboard/assessment')} className="mr-2.5" />
          <button
            type="button"
            className="acp-back-btn"
            onClick={() => {
              if (isSql) navigate('/admin/questions/sql_questions')
              else navigate('/admin/questions/python_questions')
            }}
            title="Back to Questions"
          >
            <FiArrowLeft size={15} />
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

      {/* ── Main Resizable Workspace ── */}
      <div className="acp-body" ref={containerRef}>
        {/* ── Left Column: Problem Details & Testcases ── */}
        <div
          className="acp-panel acp-left-panel"
          style={{ width: `${leftWidthPercent}%`, flexShrink: 0 }}
        >
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
                    <span><strong>Time Limit:</strong> {formatTimeWithLabel(problem.time_limit, true)}</span>
                    <span><strong>Marks:</strong> {problem.marks || 10}</span>
                  </div>
                </div>

                <div className="acp-section">
                  <h4>Description</h4>
                  <div className="acp-desc-text">
                    <FormattedContent text={problem.description || problem.statement || 'No description provided.'} />
                  </div>
                </div>

                {problem.input_format && (
                  <div className="acp-section">
                    <h4>Input Format</h4>
                    {typeof problem.input_format === 'string' && (problem.input_format.includes('|') || problem.input_format.includes('+')) ? (
                      <FormattedContent text={problem.input_format} />
                    ) : (
                      <pre className="acp-pre">{typeof problem.input_format === 'string' ? problem.input_format : JSON.stringify(problem.input_format, null, 2)}</pre>
                    )}
                  </div>
                )}

                {problem.output_format && (
                  <div className="acp-section">
                    <h4>Output Format</h4>
                    {typeof problem.output_format === 'string' && (problem.output_format.includes('|') || problem.output_format.includes('+')) ? (
                      <FormattedContent text={problem.output_format} />
                    ) : (
                      <pre className="acp-pre">{typeof problem.output_format === 'string' ? problem.output_format : JSON.stringify(problem.output_format, null, 2)}</pre>
                    )}
                  </div>
                )}

                {problem.sample_input && (
                  <div className="acp-section">
                    <h4>Sample Input</h4>
                    {problem.sample_input.includes('|') || problem.sample_input.includes('+') ? (
                      <FormattedContent text={problem.sample_input} />
                    ) : (
                      <pre className="acp-code-block">{problem.sample_input}</pre>
                    )}
                  </div>
                )}

                {problem.sample_output && (
                  <div className="acp-section">
                    <h4>Sample Output</h4>
                    {problem.sample_output.includes('|') || problem.sample_output.includes('+') ? (
                      <FormattedContent text={problem.sample_output} />
                    ) : (
                      <pre className="acp-code-block">{problem.sample_output}</pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'testcases' && (
              <div className="acp-testcases-view">
                {/* ── Testcase Filter & Search Bar ── */}
                <div className="acp-tc-toolbar">
                  <div className="acp-tc-search-box">
                    <FiSearch size={13} className="acp-search-icon" />
                    <input
                      type="text"
                      className="acp-tc-search-input"
                      placeholder="Search testcases..."
                      value={tcSearch}
                      onChange={(e) => setTcSearch(e.target.value)}
                    />
                    {tcSearch && (
                      <button type="button" className="acp-tc-clear-btn" onClick={() => setTcSearch('')}>
                        <FiX size={12} />
                      </button>
                    )}
                  </div>

                  <div className="acp-tc-pills-bar">
                    <button
                      type="button"
                      className={`acp-tc-pill ${selectedTcFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedTcFilter('all')}
                    >
                      All ({testCases.length})
                    </button>
                    {testCases.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`acp-tc-pill ${Number(selectedTcFilter) === idx ? 'active' : ''}`}
                        onClick={() => setSelectedTcFilter(String(idx))}
                      >
                        #{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTestCases.length === 0 ? (
                  <p className="acp-empty-text">No matching test cases found.</p>
                ) : (
                  <div className="acp-tc-list">
                    {filteredTestCases.map((tc, originalIdx) => {
                      const realIndex = testCases.indexOf(tc)
                      const formattedExp = typeof tc.expected_output === 'string'
                        ? tc.expected_output
                        : JSON.stringify(tc.expected_output, null, 2)

                      return (
                        <div key={realIndex} className="acp-tc-card">
                          <div className="acp-tc-card-header">
                            <div className="acp-tc-card-title">
                              <span className="acp-tc-badge">Test Case #{realIndex + 1}</span>
                              <span className="acp-tc-validated-pill">
                                <FiCheck size={11} /> Configured
                              </span>
                            </div>
                            <div className="acp-tc-card-actions">
                              <button
                                type="button"
                                className="acp-btn-copy-tc"
                                onClick={() => handleCopyText(tc.input || '', `tc_inp_${realIndex}`)}
                                title="Copy Input"
                              >
                                {copiedIndex === `tc_inp_${realIndex}` ? <FiCheck size={12} color="#10b981" /> : <FiCopy size={12} />}
                                <span>{copiedIndex === `tc_inp_${realIndex}` ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          <div className="acp-tc-grid">
                            <div className="acp-tc-block">
                              <div className="acp-tc-label">
                                <span>Input Argument(s)</span>
                              </div>
                              <pre className="acp-tc-box input-box">{tc.input || '(empty input)'}</pre>
                            </div>
                            <div className="acp-tc-block">
                              <div className="acp-tc-label">
                                <span>Expected Output</span>
                              </div>
                              <pre className="acp-tc-box expected-box">{formattedExp || '(empty)'}</pre>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Draggable Vertical Resizer Divider ── */}
        <div
          className={`acp-resizer-v ${isDraggingV ? 'active' : ''}`}
          onMouseDown={startDragV}
          title="Drag to resize panels"
        >
          <div className="acp-resizer-line" />
        </div>

        {/* ── Right Column: Monaco Editor & Console ── */}
        <div
          className="acp-panel acp-right-panel"
          ref={rightPanelRef}
          style={{ width: `calc(${100 - leftWidthPercent}% - 8px)`, flex: 1 }}
        >
          <div className="acp-editor-header">
            <div className="acp-editor-title">
              <FiCode size={14} /> Solution Editor ({isSql ? 'SQL' : 'Python 3'})
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="acp-btn-tool"
                onClick={handleReset}
                title="Reset to starter template"
              >
                <FiRefreshCw size={12} /> Reset
              </button>
            </div>
          </div>

          <div className="acp-editor-container" style={{ height: `calc(100% - ${consoleHeightPx}px - 38px - 6px)` }}>
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

          {/* ── Draggable Horizontal Resizer ── */}
          <div
            className={`acp-resizer-h ${isDraggingH ? 'active' : ''}`}
            onMouseDown={startDragH}
            title="Drag to resize console"
          >
            <div className="acp-resizer-h-line" />
          </div>

          {/* ── Console / Execution Panel ── */}
          <div className="acp-console" style={{ height: `${consoleHeightPx}px` }}>
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
                  {submitResult && <span className={`acp-status-dot ${submitResult.verdict === 'Accepted' ? 'pass' : 'fail'}`} />}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
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
                  className="acp-btn-submit"
                  onClick={handleSubmit}
                  disabled={running || submitting}
                >
                  <FiAward size={13} /> {submitting ? 'Evaluating...' : 'Test All Cases'}
                </button>
              </div>
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
                  {!runResult && !submitResult && !running && !submitting && (
                    <p className="acp-empty-text">Click "Run Code" to compile on sample case or "Test All Cases" to evaluate against the entire testcase suite.</p>
                  )}
                  {(running || submitting) && (
                    <div className="acp-running-box">
                      <Spinner label={running ? 'Executing code in sandbox…' : 'Evaluating against all test cases…'} size={24} />
                    </div>
                  )}

                  {/* ── Submit All Results ── */}
                  {submitResult && !submitting && (
                    <div className="acp-result-content">
                      <div className={`acp-result-status-badge ${submitResult.verdict === 'Accepted' || (submitResult.total_tests > 0 && submitResult.passed_tests === submitResult.total_tests) ? 'success' : 'error'}`}>
                        <FiAward style={{ marginRight: '5px' }} />
                        {submitResult.verdict || (submitResult.passed_tests === submitResult.total_tests ? 'Accepted' : 'Failed')}
                        {' — '}Passed {submitResult.passed_tests ?? 0} / {submitResult.total_tests ?? 0} Testcases ({submitResult.score?.toFixed(0) ?? 0}%)
                      </div>

                      {submitResult.failed_details && submitResult.failed_details.length > 0 && (
                        <div className="acp-result-section">
                          <label>Failed Testcases:</label>
                          {submitResult.failed_details.slice(0, 5).map((d, i) => (
                            <div key={i} className="failed-case-card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', borderRadius: '6px', marginTop: '8px', fontSize: '12px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-error)', marginBottom: '4px' }}>
                                Case #{d.test_case} Failed
                              </div>
                              {d.input && <div><strong>Input:</strong> <code style={{ color: 'var(--color-text-primary)' }}>{d.input}</code></div>}
                              {d.expected && <div><strong>Expected:</strong> <code style={{ color: '#10b981' }}>{d.expected}</code></div>}
                              {d.actual && <div><strong>Actual (return):</strong> <code style={{ color: '#ef4444' }}>{d.actual}</code></div>}
                              {d.stdout && <div><strong>Stdout:</strong> <code className="stdout-text">{d.stdout}</code></div>}
                              {d.error && <div style={{ color: 'var(--color-error)', marginTop: '2px' }}><strong>Error:</strong> {d.error}</div>}
                            </div>
                          ))}
                          {submitResult.failed_details.length > 5 && (
                            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                              + {submitResult.failed_details.length - 5} more failed test cases
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Single Run Result ── */}
                  {runResult && !running && !submitResult && (
                    <div className="acp-result-content">
                      <div className={`acp-result-status-badge ${runResult.status === 'Accepted' || runResult.passed ? 'success' : 'error'}`}>
                        {runResult.status || (runResult.passed ? 'Accepted' : 'Failed')}
                      </div>

                      {runResult.stdout && (
                        <div className="acp-result-section">
                          <label>Stdout:</label>
                          <pre className="acp-code-block stdout-text">{runResult.stdout}</pre>
                        </div>
                      )}

                      {runResult.output !== undefined && (
                        <div className="acp-result-section">
                          <label>Output (Return Value):</label>
                          <pre className="acp-code-block">{runResult.output || '(empty output)'}</pre>
                        </div>
                      )}

                      {runResult.expected && (
                        <div className="acp-result-section">
                          <label>Expected Output:</label>
                          <pre className="acp-code-block expected-text">{runResult.expected}</pre>
                        </div>
                      )}

                      {runResult.error && (
                        <div className="acp-result-section">
                          <label>Runtime Error:</label>
                          <pre className="acp-code-block error-text">{runResult.error}</pre>
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