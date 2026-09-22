import { Router, Request, Response } from 'express';
import { getProctoringReportsForDashboard, AssessmentFilters } from '../services/assessmentService';

const router = Router();

// GET /api/reports/proctoring/
// Assessment Dashboard's main data source: assessment rows enriched with
// each candidate's proctoring violation logs.
router.get('/', async (req: Request, res: Response) => {
  try {
    const filters: AssessmentFilters = {};
    if (req.query.date_from) filters.date_from = String(req.query.date_from);
    if (req.query.date_to) filters.date_to = String(req.query.date_to);
    if (req.query.verdict) filters.verdict = String(req.query.verdict);
    if (req.query.submission_type) filters.submission_type = String(req.query.submission_type);
    if (req.query.test_location) filters.test_location = String(req.query.test_location);

    const data = await getProctoringReportsForDashboard(filters);
    return res.json(data);
  } catch (err: any) {
    console.error('[Reports] Failed to get proctoring reports:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
