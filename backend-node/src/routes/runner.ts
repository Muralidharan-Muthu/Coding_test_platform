import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import {
  executePython,
  executeSql,
  evaluatePythonSubmission,
  evaluateSqlSubmission,
  persistSubmissionRecord,
  getVerdict,
} from '../services/runner';
import { getProblemById } from '../services/problemService';

const router = Router();

// Helper to look up Python problem
async function getPythonProblem(id: string) {
  let problem: any = await prisma.pythonProblem.findUnique({ where: { id } });
  if (!problem) {
    problem = await prisma.customProblem.findUnique({ where: { id } });
  }
  return problem;
}

// Helper to look up SQL problem
async function getSqlProblem(id: string) {
  let problem: any = await prisma.sqlProblem.findUnique({ where: { id } });
  if (!problem) {
    problem = await prisma.customProblem.findUnique({ where: { id } });
  }
  return problem;
}

// --- 1. Run Python Code (/run) ---
router.post('/run', async (req: Request, res: Response) => {
  try {
    const { code, custom_input } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ detail: 'Code is required' });
    }

    if (!custom_input || !String(custom_input).trim()) {
      return res.json({ error: 'INPUT_REQUIRED' });
    }

    const result = await executePython(code, String(custom_input));
    return res.json({
      status: result.status,
      stdout: result.stdout,
      return_value: result.returnValue || result.stdout,
      stderr: result.stderr,
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Execution failed' });
  }
});

// --- 2. Submit Python Code (/submit) ---
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { session_id, problem_id, code, time_taken } = req.body;

    if (!problem_id || !code) {
      return res.status(400).json({ detail: 'problem_id and code are required' });
    }

    const problem = await getPythonProblem(problem_id);
    if (!problem) {
      return res.status(404).json({ detail: 'Problem not found' });
    }

    const { passed, total, failedDetails, avgTime } = await evaluatePythonSubmission(problem, code);

    let persistData = {
      submissionId: null as number | null,
      score: total > 0 ? (passed / total) * 100 : 0,
      bestScore: total > 0 ? (passed / total) * 100 : 0,
      isNewBest: true,
      verdict: getVerdict(passed, total),
    };

    if (session_id) {
      try {
        const saved = await persistSubmissionRecord(
          session_id,
          problem_id,
          code,
          passed,
          total,
          time_taken || 0,
          avgTime
        );
        persistData = saved;
      } catch (saveErr) {
        console.error('Failed to save submission record:', saveErr);
      }
    }

    return res.json({
      submission_id: persistData.submissionId,
      passed_tests: passed,
      total_tests: total,
      score: persistData.score,
      best_score: persistData.bestScore,
      is_new_best: persistData.isNewBest,
      verdict: persistData.verdict,
      execution_time_ms: Math.round(avgTime * 100) / 100,
      failed_details: failedDetails,
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Submission failed' });
  }
});

// --- 3. Admin Preview Submit Python Code (/admin/preview/submit) ---
router.post('/admin/preview/submit', async (req: Request, res: Response) => {
  try {
    const { problem_id, code } = req.body;
    const problem = await getPythonProblem(problem_id);
    if (!problem) {
      return res.status(404).json({ detail: 'Problem not found' });
    }

    const { passed, total, failedDetails, avgTime } = await evaluatePythonSubmission(problem, code);
    const score = total > 0 ? (passed / total) * 100 : 0;
    const verdict = getVerdict(passed, total);

    return res.json({
      submission_id: null,
      passed_tests: passed,
      total_tests: total,
      score,
      best_score: score,
      is_new_best: false,
      verdict,
      execution_time_ms: Math.round(avgTime * 100) / 100,
      failed_details: failedDetails,
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Preview submit failed' });
  }
});

// --- 4. Run SQL Query (/sql/run) ---
router.post('/sql/run', async (req: Request, res: Response) => {
  try {
    const { problem_id, query, dialect } = req.body;

    if (!problem_id || !query) {
      return res.status(400).json({ detail: 'problem_id and query are required' });
    }

    const problem = await getSqlProblem(problem_id);
    if (!problem) {
      return res.status(404).json({ detail: 'SQL problem not found' });
    }

    const result = await executeSql(problem.schema_sql || '', problem.seed_sql || '', query);
    return res.json({
      ...result,
      dialect: dialect || 'sql',
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'SQL execution failed' });
  }
});

// --- 5. Submit SQL Query (/sql/submit) ---
router.post('/sql/submit', async (req: Request, res: Response) => {
  try {
    const { session_id, problem_id, query, time_taken, dialect } = req.body;

    if (!problem_id || !query) {
      return res.status(400).json({ detail: 'problem_id and query are required' });
    }

    const problem = await getSqlProblem(problem_id);
    if (!problem) {
      return res.status(404).json({ detail: 'SQL problem not found' });
    }

    const { passed, total, failedDetails, avgTime } = await evaluateSqlSubmission(problem, query, dialect);

    let persistData = {
      submissionId: null as number | null,
      score: total > 0 ? (passed / total) * 100 : 0,
      bestScore: total > 0 ? (passed / total) * 100 : 0,
      isNewBest: true,
      verdict: getVerdict(passed, total),
    };

    if (session_id) {
      try {
        const saved = await persistSubmissionRecord(
          session_id,
          problem_id,
          query,
          passed,
          total,
          time_taken || 0,
          avgTime
        );
        persistData = saved;
      } catch (saveErr) {
        console.error('Failed to save SQL submission record:', saveErr);
      }
    }

    return res.json({
      submission_id: persistData.submissionId,
      passed_tests: passed,
      total_tests: total,
      score: persistData.score,
      best_score: persistData.bestScore,
      is_new_best: persistData.isNewBest,
      verdict: persistData.verdict,
      execution_time_ms: Math.round(avgTime * 100) / 100,
      failed_details: failedDetails,
      dialect: dialect || 'sql',
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'SQL submission failed' });
  }
});

// --- 6. Admin Preview Submit SQL Query (/admin/preview/sql-submit) ---
router.post('/admin/preview/sql-submit', async (req: Request, res: Response) => {
  try {
    const { problem_id, query, dialect } = req.body;
    const problem = await getSqlProblem(problem_id);
    if (!problem) {
      return res.status(404).json({ detail: 'SQL problem not found' });
    }

    const { passed, total, failedDetails, avgTime } = await evaluateSqlSubmission(problem, query, dialect);
    const score = total > 0 ? (passed / total) * 100 : 0;
    const verdict = getVerdict(passed, total);

    return res.json({
      submission_id: null,
      passed_tests: passed,
      total_tests: total,
      score,
      best_score: score,
      is_new_best: false,
      verdict,
      execution_time_ms: Math.round(avgTime * 100) / 100,
      failed_details: failedDetails,
      dialect: dialect || 'sql',
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Preview SQL submit failed' });
  }
});

export default router;