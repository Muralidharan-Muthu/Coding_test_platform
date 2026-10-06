import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import prisma from '../../db/prisma';

const API_BASE = 'http://localhost:8000';

describe('Final Deployment & Admin Comprehensive End-to-End Verification', () => {
  const ts = Date.now();
  const candidateEmail = `final_cand_${ts}@meptrasoft.com`;
  const candidateName = `Final Test Candidate ${ts}`;
  let candidateOtp = '';
  let candidateSessionId = '';
  let testPythonId = '';
  let testSqlId = '';
  let testMcqId = '';

  // =========================================================================
  // SECTION 1: ADMIN - CANDIDATE MANAGEMENT
  // =========================================================================
  describe('Admin Candidate Management Suite', () => {
    it('Admin can create a single candidate with initial OTP', async () => {
      const res = await axios.post(`${API_BASE}/admin/generate-otp`, {
        username: candidateName,
        email: candidateEmail,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'success');
      assert.ok(res.data.otp_code);
      assert.strictEqual(res.data.otp_code.length, 6);
      candidateOtp = res.data.otp_code;
    });

    it('Admin candidate list includes newly created candidate', async () => {
      const res = await axios.get(`${API_BASE}/admin/candidates`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'success');
      const found = res.data.candidates.find((c: any) => c.email.toLowerCase() === candidateEmail.toLowerCase());
      assert.ok(found, 'Candidate must exist in candidates list');
      assert.strictEqual(found.username, candidateName);
    });

    it('Admin can update candidate test type to "both" (Python + SQL)', async () => {
      const res = await axios.post(`${API_BASE}/admin/candidate-test-type`, {
        email: candidateEmail,
        test_type: 'both',
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.test_type, 'both');
    });

    it('Admin can verify candidate OTP record in database', async () => {
      const record = await prisma.candidateOtp.findFirst({
        where: { email: candidateEmail },
      });
      assert.ok(record);
      assert.strictEqual(record.test_type, 'both');
      assert.strictEqual(record.status, 'unused');
    });
  });

  // =========================================================================
  // SECTION 2: ADMIN - QUESTIONS MANAGEMENT (PYTHON, SQL, MCQ)
  // =========================================================================
  describe('Admin Questions Management Suite', () => {
    it('Admin can create and verify a Python question', async () => {
      const res = await axios.post(`${API_BASE}/admin/questions-by-type/python`, {
        title: `Deployment Python Prob ${ts}`,
        language: 'python',
        difficulty: 'Easy',
        marks: 10,
        time_limit: 10,
        description: 'Compute power of a number.',
        starter_code: 'def power(base, exp):\n    pass',
        test_cases: [
          { input: '2\n3', expected_output: '8' },
          { input: '5\n2', expected_output: '25' },
        ],
      });
      assert.strictEqual(res.status, 200);
      testPythonId = res.data.id || res.data.question?.id;
      assert.ok(testPythonId);
    });

    it('Admin can create and verify an MCQ question', async () => {
      const res = await axios.post(`${API_BASE}/admin/questions-by-type/mcq`, {
        title: `Deployment MCQ Prob ${ts}`,
        question_text: 'What is the time complexity of binary search?',
        option_a: 'O(n)',
        option_b: 'O(log n)',
        option_c: 'O(n^2)',
        option_d: 'O(1)',
        correct_option: 'b',
        difficulty: 'easy',
        marks: 5,
        topic: 'Algorithms',
      });
      assert.strictEqual(res.status, 200);
      testMcqId = res.data.id || res.data.question?.id;
      assert.ok(testMcqId);
    });

    it('Admin can query questions list and filter by type', async () => {
      const pyRes = await axios.get(`${API_BASE}/admin/questions-by-type/python`);
      assert.strictEqual(pyRes.status, 200);
      assert.ok(Array.isArray(pyRes.data));

      const mcqRes = await axios.get(`${API_BASE}/admin/questions-by-type/mcq`);
      assert.strictEqual(mcqRes.status, 200);
      assert.ok(Array.isArray(mcqRes.data));
    });
  });

  // =========================================================================
  // SECTION 3: CANDIDATE EXAM EXECUTION & ZERO FALSE POSITIVE PROCTORING
  // =========================================================================
  describe('Candidate Exam Flow & Proctoring Verification', () => {
    it('Candidate authenticates with valid OTP and receives session_id', async () => {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        name: candidateName,
        email: candidateEmail,
        otp: candidateOtp,
        test_location: 'remote_office',
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'success');
      assert.ok(res.data.session_id);
      candidateSessionId = res.data.session_id;
    });

    it('Candidate starts exam session', async () => {
      const res = await axios.post(`${API_BASE}/exam/start`, {
        session_id: candidateSessionId,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'active');
      assert.ok(res.data.remaining_seconds > 0);
    });

    it('Proctoring session starts and records clean AI vision face check', async () => {
      const procStartRes = await axios.post(`${API_BASE}/proctoring/session/start`, {
        testId: candidateSessionId,
        candidateId: candidateEmail,
      });
      assert.strictEqual(procStartRes.status, 200);
      const procSessionId = procStartRes.data.sessionId;

      // Clean face detected event
      const evtRes = await axios.post(`${API_BASE}/proctoring/events`, {
        sessionId: procSessionId,
        riskScore: 0,
        events: [
          {
            type: 'FACE_DETECTED',
            severity: 'LOW',
            timestamp: Date.now(),
            metadata: { confidence: 0.99 },
          },
        ],
      });
      assert.strictEqual(evtRes.status, 200);
    });

    it('Candidate submits code with 100% correct solution', async () => {
      const submitCodeRes = await axios.post(`${API_BASE}/submit`, {
        session_id: candidateSessionId,
        problem_id: testPythonId,
        code: 'def power(base, exp):\n    return base ** exp\nprint(power(int(input()), int(input())))',
        time_taken: 20,
      });
      assert.strictEqual(submitCodeRes.status, 200);
      assert.strictEqual(submitCodeRes.data.verdict, 'Accepted');
      assert.strictEqual(submitCodeRes.data.passed_tests, 2);
    });

    it('Candidate submits full exam and assessment record is generated', async () => {
      const submitFullRes = await axios.post(`${API_BASE}/exam/submit`, {
        session_id: candidateSessionId,
        answers: [
          {
            problem_id: testPythonId,
            code: 'def power(base, exp):\n    return base ** exp\nprint(power(int(input()), int(input())))',
            language: 'python',
          },
        ],
        auto_submit: false,
      });
      assert.strictEqual(submitFullRes.status, 200);
      assert.strictEqual(submitFullRes.data.status, 'submitted');
    });

    it('POST-SUBMISSION INTEGRITY SHIELD: Late network events after submit are discarded', async () => {
      // Simulate client unmounting and sending late FULLSCREEN_EXIT and WINDOW_BLUR after exam submitted
      const procStartRes = await axios.post(`${API_BASE}/proctoring/session/start`, {
        testId: candidateSessionId,
        candidateId: candidateEmail,
      });
      const procSessionId = procStartRes.data.sessionId;

      // Post-submit events: 5 seconds after exam submit
      await axios.post(`${API_BASE}/proctoring/events`, {
        sessionId: procSessionId,
        riskScore: 30,
        events: [
          {
            type: 'FULLSCREEN_EXIT',
            severity: 'HIGH',
            timestamp: Date.now() + 5000,
            metadata: { message: 'Fullscreen mode was exited during the exam.' },
          },
          {
            type: 'WINDOW_BLUR',
            severity: 'HIGH',
            timestamp: Date.now() + 6000,
            metadata: { message: 'Browser window lost focus.' },
          },
        ],
      });

      // Verify Dashboard report excludes all post-submission events!
      const reportRes = await axios.get(`${API_BASE}/api/reports/proctoring/`);
      assert.strictEqual(reportRes.status, 200);
      const row = reportRes.data.find((r: any) => r.email === candidateEmail);
      assert.ok(row, 'Candidate must appear in proctoring dashboard report');

      // VERIFY ZERO FALSE POSITIVES!
      assert.strictEqual(row.logs_summary.browser_violations, 0, 'Must have 0 browser violations');
      assert.strictEqual(row.logs_summary.face_violations, 0, 'Must have 0 face violations');
      assert.strictEqual(row.logs_summary.trust_score, 100, 'Must have 100 Trust Score');
      assert.strictEqual(row.logs_summary.trust_verdict, 'Clean', 'Must have Clean trust verdict');
      assert.deepStrictEqual(row.logs, [], 'Must have empty aggregated logs');
    });
  });

  // =========================================================================
  // SECTION 4: ADMIN DASHBOARD & CODE REVIEW & EXPORT
  // =========================================================================
  describe('Admin Dashboard, Code Review & Export Suite', () => {
    it('Admin can view candidate submissions for code review modal', async () => {
      const res = await axios.get(`${API_BASE}/api/candidates/${encodeURIComponent(candidateEmail)}/submissions`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'success');
      assert.ok(Array.isArray(res.data.submissions));
      assert.ok(res.data.submissions.length >= 1);
      assert.strictEqual(res.data.submissions[0].verdict, 'Accepted');
      assert.ok(res.data.submissions[0].code.includes('power'));
    });

    it('Admin can export Excel assessment report', async () => {
      const res = await axios.get(`${API_BASE}/api/assessment/export`, { responseType: 'arraybuffer' });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.byteLength > 1000);
      assert.strictEqual(res.headers['content-type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('Security check: Candidate cannot reuse submitted OTP to re-enter', async () => {
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          name: candidateName,
          email: candidateEmail,
          otp: candidateOtp,
        });
        assert.fail('Should reject re-login with 403');
      } catch (err: any) {
        assert.strictEqual(err.response.status, 403);
      }
    });
  });

  // =========================================================================
  // TEARDOWN
  // =========================================================================
  after(async () => {
    if (testPythonId) {
      await prisma.adminResult.deleteMany({ where: { problem_id: testPythonId } }).catch(() => {});
      await prisma.submission.deleteMany({ where: { problem_id: testPythonId } }).catch(() => {});
      await prisma.pythonProblem.deleteMany({ where: { id: testPythonId } }).catch(() => {});
    }
    if (testMcqId) {
      await prisma.mCQQuestion.deleteMany({ where: { id: testMcqId } }).catch(() => {});
    }
    if (candidateSessionId) {
      await prisma.serverExamSession.deleteMany({ where: { session_id: candidateSessionId } }).catch(() => {});
      await prisma.serverSession.deleteMany({ where: { id: candidateSessionId } }).catch(() => {});
    }
    await prisma.proctoringLog.deleteMany({ where: { candidate_id: candidateEmail } }).catch(() => {});
    await prisma.candidateSelectedExamProblem.deleteMany({ where: { candidate_email: candidateEmail } }).catch(() => {});
    await prisma.candidateOtp.deleteMany({ where: { email: candidateEmail } }).catch(() => {});
    await prisma.assessment.deleteMany({ where: { email: candidateEmail } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: candidateEmail } }).catch(() => {});
  });
});
