import { spawn } from 'child_process';
import { createClient } from '@libsql/client';
import prisma from '../db/prisma';

export interface RunPythonResult {
  status: 'success' | 'error';
  stdout: string;
  returnValue?: string;
  stderr: string;
}

export interface RunSqlResult {
  status: 'success' | 'error';
  columns?: string[];
  rows?: any[][];
  error?: string;
  dialect?: string;
}

export interface SubmissionEvaluationResult {
  submission_id?: number | null;
  passed_tests: number;
  total_tests: number;
  score: number;
  best_score: number;
  is_new_best: boolean;
  verdict: 'Accepted' | 'Partial' | 'Failed';
  execution_time_ms: number;
  failed_details: any[];
  dialect?: string;
}

export function normalizeOutput(text: string | null | undefined): string {
  if (text === null || text === undefined) return '';
  let str = String(text);
  // Normalize newline characters
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Trim trailing spaces from each line
  str = str.split('\n').map(l => l.trimEnd()).join('\n');
  // Collapse multiple empty lines
  str = str.replace(/\n{3,}/g, '\n\n');
  // Trim start and end
  return str.trim();
}

function deepEqualValues(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-5;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return a === b;
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return a.trim() === b.trim() || a.trim().toLowerCase() === b.trim().toLowerCase();
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqualValues(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!deepEqualValues(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

function parseJsonOrPythonLiteral(text: string): any {
  if (!text) return text;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  // Replace Python True/False/None with JSON true/false/null
  try {
    const jsonified = trimmed
      .replace(/'/g, '"')
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');
    return JSON.parse(jsonified);
  } catch {}
  return trimmed;
}

export function compareOutputs(actual: string, expected: string): boolean {
  const normAct = normalizeOutput(actual);
  const normExp = normalizeOutput(expected);
  if (normAct === normExp) return true;
  if (!normAct && !normExp) return true;
  if (!normAct || !normExp) return false;

  // Unquoted string comparison (e.g. 'babad' vs "babad" vs babad)
  const stripQuotes = (s: string) => s.replace(/^["']|["']$/g, '').trim();
  if (stripQuotes(normAct) === stripQuotes(normExp)) return true;

  // Whitespace-agnostic comparison
  if (normAct.replace(/\s+/g, '') === normExp.replace(/\s+/g, '')) return true;

  // Case-insensitive boolean comparison
  if (normAct.toLowerCase() === normExp.toLowerCase()) return true;

  // Deep comparison via parsed objects
  const parsedAct = parseJsonOrPythonLiteral(normAct);
  const parsedExp = parseJsonOrPythonLiteral(normExp);
  if (deepEqualValues(parsedAct, parsedExp)) return true;

  return false;
}

export function getVerdict(passed: number, total: number): 'Accepted' | 'Partial' | 'Failed' {
  if (total === 0) return 'Failed';
  if (passed === total) return 'Accepted';
  if (passed > 0) return 'Partial';
  return 'Failed';
}

/**
 * Prepares Python code for execution.
 * 1. Automatically imports standard typing classes (List, Dict, Tuple, Optional, Any).
 * 2. If code defines functions/classes without top-level main, appends an intelligent auto-invocation harness.
 * 3. Delimits user stdout from function return value so print() statements are captured cleanly.
 */
export function preparePythonCode(code: string): string {
  if (!code || typeof code !== 'string') return '';
  
  const typingPreamble = `from typing import List, Dict, Tuple, Set, Optional, Union, Any, Deque\nfrom collections import defaultdict, deque, Counter\nimport math, heapq, bisect, re\n\n`;
  
  if (code.includes("if __name__ == '__main__':") || code.includes('if __name__ == "__main__":')) {
    return typingPreamble + code;
  }

  const harness = `
# --- AUTO INVOCATION HARNESS ---
if __name__ == '__main__':
    import sys, json, inspect, ast

    def _parse_val(raw):
        raw = raw.strip()
        if not raw: return raw
        try:
            return json.loads(raw)
        except Exception:
            pass
        try:
            return ast.literal_eval(raw)
        except Exception:
            pass
        tokens = raw.split()
        if len(tokens) > 1:
            try:
                return [int(t) if t.lstrip('-').isdigit() else float(t) for t in tokens]
            except Exception:
                return tokens
        elif len(tokens) == 1:
            try:
                return int(tokens[0]) if tokens[0].lstrip('-').isdigit() else float(tokens[0])
            except Exception:
                return tokens[0]
        return raw

    try:
        _stdin_raw = sys.stdin.read().strip()
        if _stdin_raw:
            _lines = [l for l in _stdin_raw.splitlines() if l.strip()]
            _parsed_args = [_parse_val(l) for l in _lines]
            
            _target_fn = None
            if 'Solution' in globals() and inspect.isclass(globals()['Solution']):
                _sol = globals()['Solution']()
                _methods = [m for m in dir(_sol) if not m.startswith('_') and callable(getattr(_sol, m))]
                if _methods:
                    _target_fn = getattr(_sol, _methods[0])
            
            if not _target_fn:
                _user_funcs = [obj for name, obj in list(globals().items()) if inspect.isfunction(obj) and not name.startswith('_') and obj.__module__ == '__main__']
                if _user_funcs:
                    _target_fn = _user_funcs[-1]

            if _target_fn:
                _sig = inspect.signature(_target_fn)
                _param_count = len(_sig.parameters)
                
                if len(_parsed_args) == _param_count:
                    _ret = _target_fn(*_parsed_args)
                elif _param_count == 1 and len(_parsed_args) > 1:
                    _ret = _target_fn(_parsed_args)
                elif len(_parsed_args) == 1 and isinstance(_parsed_args[0], list) and len(_parsed_args[0]) == _param_count:
                    _ret = _target_fn(*_parsed_args[0])
                else:
                    _ret = _target_fn(*_parsed_args[:_param_count])
                
                print('\\n---__FUNCTION_RETURN_VALUE__---')
                if _ret is not None:
                    print(_ret)
    except Exception as _harness_err:
        import traceback
        traceback.print_exc()
`;

  return typingPreamble + code + '\n' + harness;
}

/**
 * Execute Python code with custom stdin input with 5 second timeout
 */
export async function executePython(code: string, stdinInput: string = ''): Promise<RunPythonResult> {
  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const finalCode = preparePythonCode(code);
    const proc = spawn(pythonCmd, ['-u', '-c', finalCode]);

    let rawStdout = '';
    let rawStderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill('SIGKILL'); } catch {}
      resolve({
        status: 'error',
        stdout: '',
        returnValue: '',
        stderr: 'Error: Code execution timed out after 5 seconds',
      });
    }, 5000);

    proc.stdout.on('data', (d) => {
      rawStdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      rawStderr += d.toString();
    });

    proc.on('error', (err) => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve({
          status: 'error',
          stdout: '',
          returnValue: '',
          stderr: `Failed to launch Python: ${err.message}`,
        });
      }
    });

    proc.on('close', (exitCode) => {
      if (!timedOut) {
        clearTimeout(timer);
        const delimiter = '---__FUNCTION_RETURN_VALUE__---';
        if (rawStdout.includes(delimiter)) {
          const parts = rawStdout.split(delimiter);
          const userStdout = parts[0].trim();
          const returnVal = parts[1].trim();
          resolve({
            status: exitCode === 0 ? 'success' : 'error',
            stdout: userStdout,
            returnValue: returnVal,
            stderr: rawStderr.slice(0, 10000),
          });
        } else {
          resolve({
            status: exitCode === 0 ? 'success' : 'error',
            stdout: rawStdout.trim(),
            returnValue: rawStdout.trim(),
            stderr: (rawStderr || (exitCode !== 0 ? `Process exited with code ${exitCode}` : '')).slice(0, 10000),
          });
        }
      }
    });

    try {
      if (stdinInput) {
        proc.stdin.write(stdinInput);
      }
      proc.stdin.end();
    } catch {
      // stdin may already be closed
    }
  });
}

/**
 * Run SQL against an in-memory database initialized with schema_sql and seed_sql
 */
export async function executeSql(
  schemaSql: string,
  seedSql: string,
  userQuery: string
): Promise<RunSqlResult> {
  try {
    const db = createClient({ url: ':memory:' });

    // Execute schema statements
    if (schemaSql && schemaSql.trim()) {
      const statements = schemaSql.split(';').map(s => s.trim()).filter(Boolean);
      for (const st of statements) {
        await db.execute(st);
      }
    }

    // Execute seed statements
    if (seedSql && seedSql.trim()) {
      const statements = seedSql.split(';').map(s => s.trim()).filter(Boolean);
      for (const st of statements) {
        await db.execute(st);
      }
    }

    // Execute candidate's query
    const rs = await db.execute(userQuery);
    const columns = rs.columns || [];
    const rows = rs.rows.map(r => columns.map(col => r[col]));

    return {
      status: 'success',
      columns,
      rows,
    };
  } catch (err: any) {
    return {
      status: 'error',
      error: err.message || 'SQL execution failed',
    };
  }
}

/**
 * Evaluate Python submission against test cases
 */
export async function evaluatePythonSubmission(problem: any, code: string) {
  let testCases: any[] = [];
  try {
    testCases = typeof problem.test_cases_json === 'string'
      ? JSON.parse(problem.test_cases_json)
      : (problem.test_cases || []);
  } catch {
    testCases = [];
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    if (problem.sample_input) {
      testCases = [{ input: problem.sample_input, expected_output: problem.sample_output || '' }];
    } else {
      testCases = [{ input: '', expected_output: '' }];
    }
  }

  let passed = 0;
  const failedDetails: any[] = [];
  let totalTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const input = tc.input || tc.stdin || '';
    const expected = tc.expected_output || tc.output || '';

    const start = performance.now();
    const result = await executePython(code, input);
    const timeMs = performance.now() - start;
    totalTime += timeMs;

    // STRICT EVALUATION: ONLY result.returnValue is compared with expected.
    // result.stdout is strictly candidate's debug output.
    const actualToCompare = (result.returnValue !== undefined && result.returnValue !== 'None' && result.returnValue !== '')
      ? result.returnValue
      : '';

    if (result.status === 'success') {
      if (actualToCompare && compareOutputs(actualToCompare, expected)) {
        passed++;
      } else {
        failedDetails.push({
          test_case: i + 1,
          input: input.slice(0, 200),
          expected: normalizeOutput(expected),
          actual: actualToCompare ? normalizeOutput(actualToCompare) : 'None (no return value)',
          stdout: result.stdout || '',
        });
      }
    } else {
      failedDetails.push({
        test_case: i + 1,
        input: input.slice(0, 200),
        error: result.stderr || 'Runtime Error',
        stdout: result.stdout || '',
      });
    }
  }

  const total = testCases.length;
  const avgTime = total > 0 ? totalTime / total : 0;
  return { passed, total, failedDetails, avgTime };
}

/**
 * Compare SQL candidate rows with expected output
 */
function normalizeSqlVal(v: any): string {
  if (v === null || v === undefined) return '';
  return String(v).trim().toLowerCase();
}

function compareSqlResults(actualCols: string[], actualRows: any[][], rawExpected: any): boolean {
  if (!rawExpected) return true;

  let expectedData = rawExpected;
  if (typeof expectedData === 'string') {
    try {
      expectedData = JSON.parse(expectedData);
    } catch {}
  }

  // If structured object { columns: [...], rows: [...] }
  if (typeof expectedData === 'object' && expectedData !== null && !Array.isArray(expectedData)) {
    if (Array.isArray(expectedData.rows)) {
      expectedData = expectedData.rows;
    }
  }

  if (Array.isArray(expectedData)) {
    if (expectedData.length === 0 && actualRows.length === 0) return true;
    if (expectedData.length !== actualRows.length) return false;

    // Array of key-value objects [ { product_id: 1 }, ... ]
    if (typeof expectedData[0] === 'object' && expectedData[0] !== null && !Array.isArray(expectedData[0])) {
      const expKeys = Object.keys(expectedData[0]).map(k => k.toLowerCase());
      const lowerCols = actualCols.map(c => c.toLowerCase());
      
      for (let i = 0; i < expectedData.length; i++) {
        const expRow = expectedData[i];
        const actRow = actualRows[i];
        if (!actRow) return false;
        for (const k of expKeys) {
          const colIdx = lowerCols.indexOf(k);
          if (colIdx === -1) return false;
          if (normalizeSqlVal(actRow[colIdx]) !== normalizeSqlVal(expRow[k])) return false;
        }
      }
      return true;
    }

    // Array of row arrays [ [1], [4], ... ] or [ ["1"], ["4"], ... ]
    for (let i = 0; i < expectedData.length; i++) {
      const expRow = expectedData[i];
      const actRow = actualRows[i];
      if (!actRow) return false;
      if (Array.isArray(expRow)) {
        if (expRow.length !== actRow.length) return false;
        for (let j = 0; j < expRow.length; j++) {
          if (normalizeSqlVal(actRow[j]) !== normalizeSqlVal(expRow[j])) return false;
        }
      } else {
        if (normalizeSqlVal(actRow[0]) !== normalizeSqlVal(expRow)) return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Evaluate SQL submission
 */
export async function evaluateSqlSubmission(problem: any, userQuery: string, dialect = 'sql') {
  let testCases: any[] = [];
  try {
    testCases = typeof problem.test_cases_json === 'string'
      ? JSON.parse(problem.test_cases_json)
      : (problem.test_cases || []);
  } catch {
    testCases = [];
  }

  // Base fallback expected output
  let defaultExpected: any = null;
  try {
    defaultExpected = typeof problem.expected_output_json === 'string'
      ? JSON.parse(problem.expected_output_json)
      : (problem.expected_output_json || problem.expected_output || null);
  } catch {
    defaultExpected = problem.expected_output || null;
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    testCases = [{
      schema_sql: problem.schema_sql || '',
      seed_sql: problem.seed_sql || '',
      expected_output: defaultExpected
    }];
  }

  let passed = 0;
  const failedDetails: any[] = [];
  let totalTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const schema = tc.schema_sql || problem.schema_sql || '';
    const seed = tc.seed_sql || problem.seed_sql || '';
    const expected = tc.expected_output || defaultExpected;

    const start = performance.now();
    const runRes = await executeSql(schema, seed, userQuery);
    const timeMs = performance.now() - start;
    totalTime += timeMs;

    if (runRes.status === 'error') {
      failedDetails.push({
        test_case: i + 1,
        error: runRes.error || 'SQL execution failed',
      });
      continue;
    }

    const isMatch = compareSqlResults(runRes.columns || [], runRes.rows || [], expected);
    if (isMatch) {
      passed++;
    } else {
      failedDetails.push({
        test_case: i + 1,
        expected: typeof expected === 'object' ? JSON.stringify(expected) : String(expected),
        actual: JSON.stringify(runRes.rows || []),
      });
    }
  }

  const total = testCases.length;
  const avgTime = total > 0 ? totalTime / total : 0;
  return { passed, total, failedDetails, avgTime };
}

/**
 * Persist candidate submission record to Prisma DB
 */
export async function persistSubmissionRecord(
  sessionId: string,
  problemId: string,
  codeOrQuery: string,
  passed: number,
  total: number,
  timeTaken = 0,
  avgTime = 0
) {
  const session = await prisma.serverSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    return {
      submissionId: null,
      score: total > 0 ? (passed / total) * 100 : 0,
      bestScore: total > 0 ? (passed / total) * 100 : 0,
      isNewBest: true,
      verdict: getVerdict(passed, total),
    };
  }

  const userId = parseInt(session.user_id || '0', 10);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const score = total > 0 ? (passed / total) * 100 : 0;
  const verdict = getVerdict(passed, total);
  const now = new Date().toISOString();

  // Create submission record
  const sub = await prisma.submission.create({
    data: {
      user_id: userId,
      problem_id: problemId,
      code: codeOrQuery,
      passed_tests: passed,
      total_tests: total,
      score: score,
      verdict: verdict,
      execution_time_ms: Math.round(avgTime * 100) / 100,
      time_taken: timeTaken,
      created_at: now,
    },
  });

  // Check existing best in AdminResult
  const existingAdmin = await prisma.adminResult.findUnique({
    where: { uq_user_problem: { user_id: userId, problem_id: problemId } },
  });

  let isNewBest = false;
  let bestScore = score;

  if (!existingAdmin || score > existingAdmin.best_score) {
    isNewBest = true;
    bestScore = score;

    await prisma.adminResult.upsert({
      where: { uq_user_problem: { user_id: userId, problem_id: problemId } },
      create: {
        user_id: userId,
        name: user?.name || session.candidate_email || 'Candidate',
        email: session.candidate_email || user?.email || '',
        problem_id: problemId,
        best_score: score,
        passed_tests: passed,
        total_tests: total,
        best_submission_id: sub.id,
        verdict: verdict,
        execution_time_ms: Math.round(avgTime * 100) / 100,
        time_taken: timeTaken,
        updated_at: now,
      },
      update: {
        best_score: score,
        passed_tests: passed,
        total_tests: total,
        best_submission_id: sub.id,
        verdict: verdict,
        execution_time_ms: Math.round(avgTime * 100) / 100,
        time_taken: timeTaken,
        updated_at: now,
      },
    });
  } else {
    bestScore = existingAdmin.best_score;
  }

  return {
    submissionId: sub.id,
    score,
    bestScore,
    isNewBest,
    verdict,
  };
}