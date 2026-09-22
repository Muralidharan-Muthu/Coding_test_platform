import { Router } from 'express';
import { getCandidateSubmissionsHandler } from '../controllers/candidateController';

const router = Router();

// GET /api/candidates/:email/submissions
router.get('/:email/submissions', getCandidateSubmissionsHandler);

export default router;
