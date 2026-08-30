import { Router, Request, Response } from 'express';
import {
  createProctoringSession,
  addProctoringEvents,
  endProctoringSession,
  getProctoringSessionById,
  getProctoringReports,
} from '../services/proctoringService';
import { analyzeAndLogFrame } from '../services/groqProctoringService';

const router = Router();

// ──────────────────────────────────────────────────────────────────
// POST /proctoring/session/start
// Creates a new proctoring session for a candidate's exam attempt.
// ──────────────────────────────────────────────────────────────────
router.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { testId, candidateId } = req.body;
    if (!testId || !candidateId) {
      return res.status(400).json({ detail: 'testId and candidateId are required.' });
    }
    const session = await createProctoringSession(testId, candidateId);
    return res.json({ sessionId: session.id, status: session.status });
  } catch (err: any) {
    console.error('[Proctoring] Failed to start session:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /proctoring/events
// Receives a batch of proctoring events from the client.
// ──────────────────────────────────────────────────────────────────
router.post('/events', async (req: Request, res: Response) => {
  try {
    const { sessionId, events, riskScore } = req.body;
    if (!sessionId || !Array.isArray(events)) {
      return res.status(400).json({ detail: 'sessionId and events array are required.' });
    }
    const count = await addProctoringEvents(sessionId, events, riskScore ?? 0);
    return res.json({ received: count });
  } catch (err: any) {
    console.error('[Proctoring] Failed to add events:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /proctoring/session/end
// Closes a proctoring session with final risk score and level.
// ──────────────────────────────────────────────────────────────────
router.post('/session/end', async (req: Request, res: Response) => {
  try {
    const { sessionId, riskScore, riskLevel } = req.body;
    if (!sessionId) {
      return res.status(400).json({ detail: 'sessionId is required.' });
    }
    const session = await endProctoringSession(sessionId, riskScore ?? 0, riskLevel ?? 'NORMAL');
    return res.json({ status: session.status });
  } catch (err: any) {
    console.error('[Proctoring] Failed to end session:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// GET /proctoring/session/:id
// Returns a proctoring session with all its events (admin/review).
// ──────────────────────────────────────────────────────────────────
router.get('/session/:id', async (req: Request, res: Response) => {
  try {
    const result = await getProctoringSessionById(req.params.id);
    if (!result) {
      return res.status(404).json({ detail: 'Session not found.' });
    }
    return res.json(result);
  } catch (err: any) {
    console.error('[Proctoring] Failed to get session:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// GET /admin/proctoring/reports
// Admin endpoint: list proctoring sessions with summary data.
// Query params: ?candidate_id=...&test_id=...
// ──────────────────────────────────────────────────────────────────
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const candidateId = req.query.candidate_id as string | undefined;
    const testId = req.query.test_id as string | undefined;
    const reports = await getProctoringReports({ candidateId, testId });
    return res.json(reports);
  } catch (err: any) {
    console.error('[Proctoring] Failed to get reports:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// ──────────────────────────────────────────────────────────────────
// POST /proctoring/ai-analyze
// Groq Vision AI: Analyze a webcam frame for fraud indicators.
// Body: { image: base64, candidateId: string, sessionId: string }
// ──────────────────────────────────────────────────────────────────
router.post('/ai-analyze', async (req: Request, res: Response) => {
  try {
    const { image, candidateId, sessionId } = req.body;
    if (!image || !candidateId) {
      return res.status(400).json({ detail: 'image and candidateId are required.' });
    }
    const analysis = await analyzeAndLogFrame(image, candidateId, sessionId || 'unknown');
    return res.json(analysis);
  } catch (err: any) {
    console.error('[Proctoring] AI analysis failed:', err.message);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
