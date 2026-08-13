import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';
import {
  getMcqQuestions,
  getProblemsByLanguage,
  getAllProblems,
  getProblemById
} from '../services/problemService';

const router = Router();

async function getCandidateEmailFromSession(sessionId?: string): Promise<string | null> {
  if (!sessionId) return null;
  const session = await prisma.serverSession.findUnique({ where: { id: String(sessionId) } });
  return session?.candidate_email ? session.candidate_email.trim().toLowerCase() : null;
}

// GET /problems/python
router.get('/problems/python', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string | undefined;
    const email = await getCandidateEmailFromSession(sessionId);

    if (email) {
      const selected = await prisma.candidateSelectedExamProblem.findMany({
        where: { candidate_email: email, language: 'python' },
        orderBy: { saved_at: 'asc' }
      });
      if (selected.length > 0) {
        const problemIds = selected.map(s => s.problem_id);
        const problems = await prisma.pythonProblem.findMany({
          where: { id: { in: problemIds }, is_active: 1 }
        });
        const problemMap = new Map(problems.map(p => [p.id, p]));
        const ordered = selected.map(s => problemMap.get(s.problem_id)).filter(Boolean);
        return res.json(ordered);
      }
    }

    const problems = await getProblemsByLanguage('python');
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /problems/sql
router.get('/problems/sql', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string | undefined;
    const email = await getCandidateEmailFromSession(sessionId);

    if (email) {
      const selected = await prisma.candidateSelectedExamProblem.findMany({
        where: { candidate_email: email, language: 'sql' },
        orderBy: { saved_at: 'asc' }
      });
      if (selected.length > 0) {
        const problemIds = selected.map(s => s.problem_id);
        const problems = await prisma.sqlProblem.findMany({
          where: { id: { in: problemIds }, is_active: 1 }
        });
        const problemMap = new Map(problems.map(p => [p.id, p]));
        const ordered = selected.map(s => problemMap.get(s.problem_id)).filter(Boolean);
        return res.json(ordered);
      }
    }

    const problems = await getProblemsByLanguage('sql');
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /problems/mcq
router.get('/problems/mcq', async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string | undefined;
    const email = await getCandidateEmailFromSession(sessionId);

    if (email) {
      const selected = await prisma.candidateSelectedExamProblem.findMany({
        where: { candidate_email: email, language: 'mcq' },
        orderBy: { saved_at: 'asc' }
      });
      if (selected.length > 0) {
        const problemIds = selected.map(s => s.problem_id);
        const questions = await prisma.mCQQuestion.findMany({
          where: { id: { in: problemIds } }
        });
        const questionMap = new Map(questions.map(q => [q.id, q]));
        const ordered = selected.map(s => questionMap.get(s.problem_id)).filter(Boolean);
        return res.json({ questions: ordered });
      }
    }

    const questions = await getMcqQuestions();
    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /practice/problems
router.get('/practice/problems', async (req: Request, res: Response) => {
  try {
    const language = req.query.language as string | undefined;
    const problems = await getAllProblems(language);
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /problems/:id
router.get('/problems/:id', async (req: Request, res: Response) => {
  try {
    const problem = await getProblemById(req.params.id);
    if (!problem) {
      return res.status(404).json({ detail: 'Problem not found' });
    }
    return res.json(problem);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/mcq-questions
router.get('/api/mcq-questions', async (req: Request, res: Response) => {
  try {
    const questions = await getMcqQuestions();
    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
