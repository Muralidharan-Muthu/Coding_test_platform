import { Router, Request, Response } from 'express';
import {
  getExamSummary,
  getExamStatus,
  startExam,
  saveExamAnswer,
  submitExam,
} from '../services/examService';

const router = Router();

// GET /exam/summary?session_id=...
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.query.session_id || '');
    const email = String(req.query.email || '');
    const summary = await getExamSummary(sessionId, email);
    return res.json(summary);
  } catch (err: any) {
    console.error('[Exam] Failed to get summary:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// GET /exam/status?session_id=...
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await getExamStatus(String(req.query.session_id || ''));
    return res.json(status);
  } catch (err: any) {
    console.error('[Exam] Failed to get status:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /exam/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.body.session_id || '');
    if (!sessionId) return res.status(400).json({ detail: 'session_id is required.' });
    const result = await startExam(sessionId);
    return res.json(result);
  } catch (err: any) {
    console.error('[Exam] Failed to start exam:', err);
    return res.status(400).json({ detail: err.message });
  }
});

// POST /exam/save-answer?session_id=...&problem_id=...&code=...
router.post('/save-answer', async (req: Request, res: Response) => {
  try {
    const sessionId = String(req.query.session_id || req.body.session_id || '');
    const problemId = String(req.query.problem_id || req.body.problem_id || '');
    const code = String(req.query.code ?? req.body.code ?? '');
    const language = req.query.language ? String(req.query.language) : req.body.language;

    if (!sessionId || !problemId) {
      return res.status(400).json({ detail: 'session_id and problem_id are required.' });
    }

    const result = await saveExamAnswer(sessionId, problemId, code, language);
    return res.json(result);
  } catch (err: any) {
    console.error('[Exam] Failed to save answer:', err);
    return res.status(400).json({ detail: err.message });
  }
});

// POST /exam/submit
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { session_id = '', answers = [], auto_submit = false } = req.body;
    if (!session_id) return res.status(400).json({ detail: 'session_id is required.' });
    const result = await submitExam(String(session_id), Array.isArray(answers) ? answers : [], Boolean(auto_submit));
    return res.json(result);
  } catch (err: any) {
    console.error('[Exam] Failed to submit exam:', err);
    return res.status(400).json({ detail: err.message });
  }
});

export default router;

