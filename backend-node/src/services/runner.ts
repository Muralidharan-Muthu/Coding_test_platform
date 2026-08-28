import { spawn } from 'child_process';
import { createClient } from '@libsql/client';
import prisma from '../db/prisma';

export interface RunPythonResult {
  status: 'success' | 'error';
  stdout: string;
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

export function compareOutputs(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}

export function getVerdict(passed: number, total: number): 'Accepted' | 'Partial' | 'Failed' {
  if (total === 0) return 'Failed';
  if (passed === total) return 'Accepted';
  if (passed > 0) return 'Partial';
  return 'Failed';
}

/**
 * Execute Python code with custom stdin input with 5 second timeout
 */
export async function executePython(code: string, stdinInput: string = ''): Promise<RunPythonResult> {
  return new Promise((resolve) => {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawn(pythonCmd, ['-u', '-c', code]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { proc.kill('SIGKILL'); } catch {}
      resolve({
        status: 'error',
        stdout: '',
        stderr: 'Error: Code execution timed out after 5 seconds',
      });
    }, 5000);

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err) => {
      if (!timedOut) {
        clearTimeout(timer);
        resolve({
          status: 'error',
          stdout: '',
          stderr: `Failed to launch Python: ${err.message}`,
        });
      }
    });

    proc.on('close', (exitCode) => {
      if (!timedOut) {
        clearTimeout(timer);
        if (exitCode === 0) {
          resolve({
            status: 'success',
            stdout: stdout.slice(0, 10000),
            stderr: stderr.slice(0, 10000),
          });
        } else {
          resolve({
            status: 'error',
            stdout: stdout.slice(0, 10000),
            stderr: (stderr || `Process exited with code ${exitCode}`).slice(0, 10000),
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

    if (result.status === 'success') {
      if (compareOutputs(result.stdout, expected)) {
        passed++;
      } else {
        failedDetails.push({
          test_case: i + 1,
          input: input.slice(0, 200),
          expected: normalizeOutput(expected),
          actual: normalizeOutput(result.stdout),
        });
      }
    } else {
      failedDetails.push({
        test_case: i + 1,
        input: input.slice(0, 200),
        error: result.stderr || 'Runtime Error',
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

function compareSqlResults(actualCols: string[], actualRows: any[][], expectedData: any): boolean {
  if (!expectedData) return true;

  // If expectedData is an array of objects e.g. [{"product_id": 1}, {"product_id": 3}]
  if (Array.isArray(expectedData)) {
    if (expectedData.length === 0 && actualRows.length === 0) return true;
    if (expectedData.length !== actualRows.length) return false;

    // Check if expected items are objects with keys
    if (typeof expectedData[0] === 'object' && expectedData[0] !== null && !Array.isArray(expectedData[0])) {
      const expKeys = Object.keys(expectedData[0]).map(k => k.toLowerCase());
      const actKeys = actualCols.map(c => c.toLowerCase());

      // Check each row values
      for (let r = 0; r < expectedData.length; r++) {
        const expObj = expectedData[r];
        const actRow = actualRows[r];

        for (let c = 0; c < actualCols.length; c++) {
          const colName = actualCols[c].toLowerCase();
          const actVal = normalizeSqlVal(actRow[c]);
          const expVal = normalizeSqlVal(expObj[colName] ?? expObj[Object.keys(expObj)[c]]);
          if (actVal !== expVal) return false;
        }
      }
      return true;
    }

    // Expected is 2D array of rows
    if (Array.isArray(expectedData[0])) {
      for (let r = 0; r < expectedData.length; r++) {
        for (let c = 0; c < expectedData[r].length; c++) {
          if (normalizeSqlVal(actualRows[r]?.[c]) !== normalizeSqlVal(expectedData[r][c])) {
            return false;
          }
        }
      }
      return true;
    }
  }

  return false;
}

/**
 * Evaluate SQL submission against test cases
 */
export async function evaluateSqlSubmission(problem: any, query: string, dialect: string = 'sql') {
  const schemaSql = problem.schema_sql || '';
  const seedSql = problem.seed_sql || '';

  let testCases: any[] = [];
  try {
    testCases = typeof problem.test_cases_json === 'string'
      ? JSON.parse(problem.test_cases_json)
      : (problem.test_cases || []);
  } catch {
    testCases = [];
  }

  if (!Array.isArray(testCases) || testCases.length === 0) {
    testCases = [{ expected_output: null }];
  }

  let passed = 0;
  const failedDetails: any[] = [];
  let totalTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const start = performance.now();
    const result = await executeSql(schemaSql, seedSql, query);
    const timeMs = performance.now() - start;
    totalTime += timeMs;

    if (result.status === 'success') {
      const isMatch = compareSqlResults(result.columns || [], result.rows || [], tc.expected_output);
      if (isMatch) {
        passed++;
      } else {
        failedDetails.push({
          test_case: i + 1,
          expected: JSON.stringify(tc.expected_output),
          actual: JSON.stringify(result.rows),
        });
      }
    } else {
      failedDetails.push({
        test_case: i + 1,
        error: result.error || 'SQL Query Error',
      });
    }
  }

  const total = testCases.length;
  const avgTime = total > 0 ? totalTime / total : 0;
  return { passed, total, failedDetails, avgTime };
}

/**
 * Persist candidate submission record to database and update best score
 */
export async function persistSubmissionRecord(
  sessionId: string,
  problemId: string,
  code: string,
  passed: number,
  total: number,
  timeTaken: number,
  avgTimeMs: number
): Promise<{ submissionId: number; score: number; bestScore: number; isNewBest: boolean; verdict: string }> {
  const score = total > 0 ? (passed / total) * 100 : 0;
  const verdict = getVerdict(passed, total);
  const now = new Date().toISOString();

  // Look up user from session
  let userId = 1;
  const session = await prisma.serverSession.findUnique({ where: { id: sessionId } });
  if (session?.candidate_email) {
    const user = await prisma.user.findFirst({ where: { email: session.candidate_email } });
    if (user) userId = user.id;
  }

  // Create submission record
  const sub = await prisma.submission.create({
    data: {
      user_id: userId,
      problem_id: problemId,
      code,
      passed_tests: passed,
      total_tests: total,
      score,
      verdict,
      execution_time_ms: avgTimeMs,
      time_taken: timeTaken || 0,
      created_at: now,
    },
  });

  // Check and update best score in admin_results
  const existing = await prisma.adminResult.findFirst({
    where: { user_id: userId, problem_id: problemId },
  });

  const currentBest = existing ? existing.best_score : 0;
  const isNewBest = score > currentBest;

  if (isNewBest) {
    const userInfo = await prisma.user.findUnique({ where: { id: userId } });
    if (existing) {
      await prisma.adminResult.update({
        where: { id: existing.id },
        data: {
          best_score: score,
          passed_tests: passed,
          total_tests: total,
          best_submission_id: sub.id,
          verdict,
          execution_time_ms: avgTimeMs,
          time_taken: timeTaken || 0,
          updated_at: now,
        },
      });
    } else {
      await prisma.adminResult.create({
        data: {
          user_id: userId,
          name: userInfo?.name || 'Candidate',
          email: userInfo?.email || session?.candidate_email || 'candidate@assessment.com',
          problem_id: problemId,
          best_score: score,
          passed_tests: passed,
          total_tests: total,
          best_submission_id: sub.id,
          verdict,
          execution_time_ms: avgTimeMs,
          time_taken: timeTaken || 0,
          updated_at: now,
        },
      });
    }
  }

  return {
    submissionId: sub.id,
    score,
    bestScore: isNewBest ? score : currentBest,
    isNewBest,
    verdict,
  };
}