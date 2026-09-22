import { Router, Request, Response } from 'express';
import { getCandidateSubmissions } from '../services/assessmentService';

const router = Router();

// GET /api/candidates/:email/submissions
router.get('/:email/submissions', async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(String(req.params.email || ''));
    const result = await getCandidateSubmissions(email);
    return res.json(result);
  } catch (err: any) {
    console.error('[Candidates] Failed to get submissions:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
