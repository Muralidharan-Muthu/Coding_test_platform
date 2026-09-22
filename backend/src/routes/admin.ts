import {
  getQuestionTypes,
  createQuestionType,
  deleteQuestionType,
  getQuestionsByType,
  createQuestionUnderType,
  deleteQuestionUnderType
} from '../services/questionTypeService';
import { Router, Request, Response } from 'express';
import {
  getMcqQuestions,
  createMcqQuestion,
  deleteMcqQuestion,
  getAllProblems,
  getPythonProblems,
  getSqlProblems,
  createProblem,
  deleteProblem,
  getRandomProblems,
  replaceRandomProblem,
  getSelectedExamProblems,
  publishSelectedExamProblems
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
  updateCandidateTestType,
  updateCandidateTestTypeBulk,
  shuffleCandidateQuestions
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
    const result = await deleteCandidateByEmail(decodeURIComponent(String(req.params.email)));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// PUT /admin/candidates/:email
router.put('/candidates/:email', async (req: Request, res: Response) => {
  try {
    const currentEmail = decodeURIComponent(String(req.params.email));
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
    if (!email) {
      return res.status(400).json({ detail: 'Candidate email is required.' });
    }
    const result = await shuffleCandidateQuestions(email, test_type);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/candidate-test-type-bulk
router.post('/candidate-test-type-bulk', async (req: Request, res: Response) => {
  try {
    const { assignments = [] } = req.body;
    const result = await updateCandidateTestTypeBulk(assignments);
    return res.json({ status: 'success', count: result.length, message: 'Saved test types for all candidates' });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/candidate-shuffle-bulk
router.post('/candidate-shuffle-bulk', async (req: Request, res: Response) => {
  try {
    const { candidates = [] } = req.body; // [{ email: string, test_type: string }]
    let totalSaved = 0;
    for (const cand of candidates) {
      if (!cand.email) continue;
      const res = await shuffleCandidateQuestions(cand.email, cand.test_type);
      totalSaved += res.saved;
    }
    return res.json({
      status: 'success',
      candidateCount: candidates.length,
      totalSavedQuestions: totalSaved,
      message: `Successfully shuffled questions for all ${candidates.length} candidates`
    });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/exam/selected
router.get('/exam/selected', async (req: Request, res: Response) => {
  try {
    const email = req.query.email ? String(req.query.email) : undefined;
    const result = await getSelectedExamProblems(email);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/exam/publish
router.post('/exam/publish', async (req: Request, res: Response) => {
  try {
    const { problems = [] } = req.body;
    const result = await publishSelectedExamProblems(problems);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/problems/random/replace
router.get('/problems/random/replace', async (req: Request, res: Response) => {
  try {
    const problemId = String(req.query.problem_id || '');
    const language = String(req.query.language || 'python');
    const result = await replaceRandomProblem(problemId, language);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/problems/random
router.get('/problems/random', async (req: Request, res: Response) => {
  try {
    const language = String(req.query.language || 'python');
    const problems = await getRandomProblems(language, 5);
    return res.json({ status: 'success', problems });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

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
    const result = await deleteProblem(String(req.params.id));
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
    const result = await deleteMcqQuestion(String(req.params.id));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});


// ------------------------------------------------------------------
// DYNAMIC QUESTION TYPE & PER-TYPE QUESTION MANAGEMENT
// ------------------------------------------------------------------

// GET /admin/question-types
router.get('/question-types', async (req: Request, res: Response) => {
  try {
    const types = await getQuestionTypes();
    return res.json({ status: 'success', types });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/question-types
router.post('/question-types', async (req: Request, res: Response) => {
  try {
    const { name = '' } = req.body;
    if (!name.trim()) {
      return res.status(400).json({ detail: 'Language / Question type name is required.' });
    }
    const created = await createQuestionType(name.trim());
    return res.json({ status: 'success', type: created });
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/question-types/:slug
router.delete('/question-types/:slug', async (req: Request, res: Response) => {
  try {
    const result = await deleteQuestionType(String(req.params.slug));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// GET /admin/questions-by-type/:type
router.get('/questions-by-type/:type', async (req: Request, res: Response) => {
  try {
    const questions = await getQuestionsByType(String(req.params.type));
    return res.json(questions);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// POST /admin/questions-by-type/:type
router.post('/questions-by-type/:type', async (req: Request, res: Response) => {
  try {
    const newQuestion = await createQuestionUnderType(String(req.params.type), req.body);
    return res.json(newQuestion);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

// DELETE /admin/questions-by-type/:type/:id
router.delete('/questions-by-type/:type/:id', async (req: Request, res: Response) => {
  try {
    const result = await deleteQuestionUnderType(String(req.params.type), String(req.params.id));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message });
  }
});

export default router;
