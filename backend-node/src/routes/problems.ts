import { Router, Request, Response } from 'express';
import {
  getMcqQuestions,
  getProblemsByLanguage,
  getAllProblems,
  getProblemById
} from '../services/problemService';

const router = Router();

// GET /problems/python
router.get('/problems/python', async (req: Request, res: Response) => {
  try {
    const problems = await getProblemsByLanguage('python');
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /problems/sql
router.get('/problems/sql', async (req: Request, res: Response) => {
  try {
    const problems = await getProblemsByLanguage('sql');
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /problems/mcq
router.get('/problems/mcq', async (req: Request, res: Response) => {
  try {
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
