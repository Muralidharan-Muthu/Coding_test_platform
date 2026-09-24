import { Request, Response } from 'express';
import { getCandidateSubmissions } from '../services/assessmentService';

/**
 * Candidate Controller
 * Handles incoming candidate-related HTTP requests
 */
export async function getCandidateSubmissionsHandler(req: Request, res: Response) {
  try {
    const email = decodeURIComponent(String(req.params.email || ''));
    const assessmentId = req.query.assessment_id ? String(req.query.assessment_id) : undefined;
    const result = await getCandidateSubmissions(email, assessmentId);
    return res.json(result);
  } catch (err: any) {
    console.error('[Candidates] Failed to get submissions:', err);
    return res.status(500).json({ detail: err.message });
  }
}
