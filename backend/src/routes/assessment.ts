import { Router, Request, Response } from 'express';
import {
  getAssessmentResults,
  createAssessmentResult,
  exportAssessmentResultsWorkbook,
  initSampleData,
  AssessmentFilters,
} from '../services/assessmentService';

const router = Router();

function filtersFromQuery(req: Request): AssessmentFilters {
  const filters: AssessmentFilters = {};
  if (req.query.date_from) filters.date_from = String(req.query.date_from);
  if (req.query.date_to) filters.date_to = String(req.query.date_to);
  if (req.query.verdict) filters.verdict = String(req.query.verdict);
  if (req.query.submission_type) filters.submission_type = String(req.query.submission_type);
  if (req.query.test_location) filters.test_location = String(req.query.test_location);
  return filters;
}

// GET /api/assessment/results
router.get('/results', async (req: Request, res: Response) => {
  try {
    const data = await getAssessmentResults(filtersFromQuery(req));
    return res.json({ success: true, total: data.length, data });
  } catch (err: any) {
    console.error('[Assessment] Failed to get results:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/assessment/results
router.post('/results', async (req: Request, res: Response) => {
  try {
    const created = await createAssessmentResult(req.body || {});
    return res.json({ success: true, assessment: created });
  } catch (err: any) {
    console.error('[Assessment] Failed to create result:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// GET /api/assessment/export
router.get('/export', async (req: Request, res: Response) => {
  try {
    const buffer = await exportAssessmentResultsWorkbook(filtersFromQuery(req));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="Admin_Assessment_Report_${new Date().toISOString().slice(0, 10)}.xlsx"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error('[Assessment] Failed to export:', err);
    return res.status(500).json({ detail: err.message });
  }
});

// POST /api/assessment/init-sample-data
router.post('/init-sample-data', async (req: Request, res: Response) => {
  try {
    const result = await initSampleData();
    return res.json(result);
  } catch (err: any) {
    console.error('[Assessment] Failed to init sample data:', err);
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
