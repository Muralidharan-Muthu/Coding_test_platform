import { Router, Request, Response } from 'express';
import {
  getMcqQuestions,
  createMcqQuestion,
  deleteMcqQuestion,
  getAllProblems,
  getPythonProblems,
  getSqlProblems,
  createProblem,
  deleteProblem
} from '../services/problemService';
import {
  getAllCandidates,
  clearAllCandidates,
  deleteCandidateByEmail,
  updateCandidateDetails,
  importCandidatesList,
  generateOtp,
  saveCandidateOtp,
  sendOtpEmailToCandidate,
  updateCandidateTestType
} from '../services/otpService';

const router = Router();

// ------------------------------------------------------------------
// CANDIDATE MANAGEMENT ENDPOINTS
// ------------------------------------------------------------------

// GET /admin/candidates
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const candidates = await getAllCandidates();
    return res.json({ status: 'success', candidates });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/candidates/clear
router.delete('/candidates/clear', async (req: Request, res: Response) => {
  try {
    const result = await clearAllCandidates();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/candidates/:email
router.delete('/candidates/:email', async (req: Request, res: Response) => {
  try {
    const result = await deleteCandidateByEmail(decodeURIComponent(req.params.email));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /admin/candidates/:email
router.put('/candidates/:email', async (req: Request, res: Response) => {
  try {
    const currentEmail = decodeURIComponent(req.params.email);
    const { username = '', email = '' } = req.body;
    const updated = await updateCandidateDetails(currentEmail, username, email);
    if (!updated) {
      return res.status(404).json({ detail: 'Candidate not found' });
    }
    return res.json({ status: 'updated', candidate: updated });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/import-candidates
router.post('/import-candidates', async (req: Request, res: Response) => {
  try {
    const candidatesList = Array.isArray(req.body.candidates) ? req.body.candidates : (Array.isArray(req.body) ? req.body : []);
    const imported = await importCandidatesList(candidatesList);
    return res.json({ status: 'success', message: `Imported ${imported.length} candidates`, candidates: imported });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/generate-otp
router.post('/generate-otp', async (req: Request, res: Response) => {
  try {
    const { username = '', email = '' } = req.body;
    if (!email) {
      return res.status(400).json({ detail: 'Email is required.' });
    }
    const otpCode = generateOtp();
    const candidate = await saveCandidateOtp(username || email.split('@')[0], email, otpCode);
    return res.json({ status: 'success', otp_code: otpCode, candidate });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/send-otp-email
router.post('/send-otp-email', async (req: Request, res: Response) => {
  try {
    const { username = '', email = '' } = req.body;
    if (!email) {
      return res.status(400).json({ detail: 'Email is required.' });
    }
    const result = await sendOtpEmailToCandidate(username || email.split('@')[0], email);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/candidate-test-type
router.post('/candidate-test-type', async (req: Request, res: Response) => {
  try {
    const { email = '', test_type = 'both' } = req.body;
    if (!email) {
      return res.status(400).json({ detail: 'Email is required.' });
    }
    const updated = await updateCandidateTestType(email, test_type);
    return res.json({ status: 'success', updated, email, test_type });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/candidate-shuffle
router.post('/candidate-shuffle', async (req: Request, res: Response) => {
  try {
    const { email = '', test_type = 'both' } = req.body;
    return res.json({ status: 'success', message: 'Shuffled question set for candidate', email, test_type });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// ------------------------------------------------------------------
// PROBLEM & MCQ MANAGEMENT ENDPOINTS
// ------------------------------------------------------------------

// GET /admin/problems/python & /admin/problems/python_questions
router.get(['/problems/python', '/problems/python_questions', '/problems/python_problems'], async (req: Request, res: Response) => {
  try {
    const problems = await getPythonProblems();
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/problems/sql & /admin/problems/sql_questions
router.get(['/problems/sql', '/problems/sql_questions', '/problems/sql_problems'], async (req: Request, res: Response) => {
  try {
    const problems = await getSqlProblems();
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/problems
router.get('/problems', async (req: Request, res: Response) => {
  try {
    const problems = await getAllProblems();
    return res.json(problems);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/problems
router.post('/problems', async (req: Request, res: Response) => {
  try {
    const newProblem = await createProblem(req.body);
    return res.json(newProblem);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/problems/:id
router.delete('/problems/:id', async (req: Request, res: Response) => {
  try {
    const result = await deleteProblem(req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/mcq-questions
router.get('/mcq-questions', async (req: Request, res: Response) => {
  try {
    const questions = await getMcqQuestions();
    return res.json({ questions });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/mcq-questions
router.post('/mcq-questions', async (req: Request, res: Response) => {
  try {
    const newQuestion = await createMcqQuestion(req.body);
    return res.json({ status: 'created', question: newQuestion });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/mcq-questions/:id
router.delete('/mcq-questions/:id', async (req: Request, res: Response) => {
  try {
    const result = await deleteMcqQuestion(req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
