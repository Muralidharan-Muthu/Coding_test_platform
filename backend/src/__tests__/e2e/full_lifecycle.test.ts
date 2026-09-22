import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import prisma from '../../db/prisma';

const API_BASE = 'http://localhost:8000';

describe('Comprehensive End-to-End Platform Lifecycle Test', () => {
  const timestamp = Date.now();
  const testCandidateEmail = `e2e_full_lifecycle_${timestamp}@meptrasoft.com`;
  const testCandidateName = `E2E Candidate ${timestamp}`;
  let adminToken = '';
  let testPythonProbId = '';
  let testExamSessionId = '';
  let proctoringSessionId = '';
  let candidateOtpCode = '';

  // 1. Admin Authentication & Problem Authoring
  it('Step 1: Admin logs in and registers a multi-testcase problem', async () => {
    const loginRes = await axios.post(`${API_BASE}/auth/admin-login`, {
      email: 'muralidharanm@meptrasoftai.com',
      password: 'admin@1234'
    });
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.data.role, 'admin');

    // Create Python Problem
    const testCases = Array.from({ length: 5 }, (_, i) => ({
      input: `${i}\n${i + 5}`,
      expected_output: `${i + i + 5}`
    }));

    const createProbRes = await axios.post(`${API_BASE}/admin/questions-by-type/python`, {
      title: `E2E Sum Problem ${timestamp}`,
      language: 'python',
      difficulty: 'Easy',
      marks: 20,
      time_limit: 15,
      description: 'E2E automated lifecycle test problem.',
      starter_code: 'class Solution:\n    def add(self, a: int, b: int) -> int:\n        pass',
      test_cases: testCases
    });

    assert.strictEqual(createProbRes.status, 200);
    testPythonProbId = createProbRes.data.id || createProbRes.data.question?.id;
    assert.ok(testPythonProbId, 'Problem ID must be returned');
  });

  // 2. Candidate Invitation & Onboarding
  it('Step 2: Admin generates OTP and sets test type for candidate', async () => {
    const otpRes = await axios.post(`${API_BASE}/admin/generate-otp`, {
      username: testCandidateName,
      email: testCandidateEmail
    });
    assert.strictEqual(otpRes.status, 200);
    candidateOtpCode = otpRes.data.otp_code;
    assert.strictEqual(candidateOtpCode.length, 6);

    const typeRes = await axios.post(`${API_BASE}/admin/candidate-test-type`, {
      email: testCandidateEmail,
      test_type: 'python'
    });
    assert.strictEqual(typeRes.status, 200);

    // Explicitly assign the created problem to this candidate for the E2E exam
    await prisma.candidateSelectedExamProblem.deleteMany({
      where: { candidate_email: testCandidateEmail }
    });
    await prisma.candidateSelectedExamProblem.create({
      data: {
        candidate_email: testCandidateEmail,
        problem_id: testPythonProbId,
        language: 'python',
        difficulty: 'Easy',
        marks: 20,
        time_limit: 10,
        title: 'Sum of Two Numbers (E2E)',
        saved_at: new Date().toISOString()
      }
    });
  });

  // 3. Candidate OTP Verification & Session Launch
  it('Step 3: Candidate authenticates with OTP and obtains exam session', async () => {
    const authRes = await axios.post(`${API_BASE}/auth/login`, {
      name: testCandidateName,
      email: testCandidateEmail,
      otp: candidateOtpCode,
      test_location: 'remote_e2e'
    });
    assert.strictEqual(authRes.status, 200);
    assert.strictEqual(authRes.data.status, 'success');
    assert.ok(authRes.data.session_id);
    testExamSessionId = authRes.data.session_id;

    // Start proctored exam
    const startRes = await axios.post(`${API_BASE}/exam/start`, {
      session_id: testExamSessionId
    });
    assert.strictEqual(startRes.status, 200);
    assert.strictEqual(startRes.data.status, 'active');
    assert.ok(startRes.data.remaining_seconds > 0);
  });

  // 4. AI Proctoring System Activation
  it('Step 4: AI Proctoring monitors candidate session and records events', async () => {
    const startProcRes = await axios.post(`${API_BASE}/proctoring/session/start`, {
      testId: 'exam_general',
      candidateId: testCandidateEmail
    });
    assert.strictEqual(startProcRes.status, 200);
    proctoringSessionId = startProcRes.data.sessionId;

    const eventRes = await axios.post(`${API_BASE}/proctoring/events`, {
      sessionId: proctoringSessionId,
      riskScore: 20,
      events: [
        {
          type: 'TAB_SWITCH',
          severity: 'HIGH',
          timestamp: Date.now(),
          duration: 3,
          metadata: { message: 'Candidate switched application window' }
        }
      ]
    });
    assert.strictEqual(eventRes.status, 200);
    assert.strictEqual(eventRes.data.received, 1);

    // Apply exam time penalty for infraction
    const penaltyRes = await axios.post(`${API_BASE}/exam/penalty`, {
      session_id: testExamSessionId,
      penalty_seconds: 60
    });
    assert.strictEqual(penaltyRes.status, 200);
    assert.strictEqual(penaltyRes.data.status, 'penalized');
  });

  // 5. Code Execution & Full Testcase Evaluation
  it('Step 5: Candidate runs and submits Python code with 100% test pass', async () => {
    // Run custom test in sandbox
    const runRes = await axios.post(`${API_BASE}/run`, {
      code: `
class Solution:
    def add(self, a: int, b: int) -> int:
        return a + b
`,
      custom_input: '10\n20'
    });
    assert.strictEqual(runRes.status, 200);
    assert.strictEqual(String(runRes.data.return_value).trim(), '30');

    // Submit for full evaluation
    const submitRes = await axios.post(`${API_BASE}/submit`, {
      session_id: testExamSessionId,
      problem_id: testPythonProbId,
      code: `
class Solution:
    def add(self, a: int, b: int) -> int:
        return a + b
`,
      time_taken: 35
    });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.verdict, 'Accepted');
    assert.strictEqual(submitRes.data.passed_tests, 5);
    assert.strictEqual(submitRes.data.total_tests, 5);
    assert.strictEqual(submitRes.data.score, 100);
  });

  // 6. Final Exam Submission & Automatic Assessment Generation
  it('Step 6: Candidate finalizes exam; Assessment record & scores are persisted', async () => {
    const finalSubmitRes = await axios.post(`${API_BASE}/exam/submit`, {
      session_id: testExamSessionId,
      answers: [
        {
          problem_id: testPythonProbId,
          code: 'class Solution: def add(self, a, b): return a + b',
          language: 'python'
        }
      ],
      auto_submit: false
    });

    assert.strictEqual(finalSubmitRes.status, 200);
    assert.strictEqual(finalSubmitRes.data.status, 'submitted');

    // Close proctoring session
    await axios.post(`${API_BASE}/proctoring/session/end`, {
      sessionId: proctoringSessionId,
      riskScore: 20,
      riskLevel: 'SUSPICIOUS'
    });
  });

  // 7. Security Enforcement: Candidate Re-Entry Prevention
  it('Step 7: Enforce security lockout - candidate cannot log in with submitted OTP', async () => {
    try {
      await axios.post(`${API_BASE}/auth/login`, {
        name: testCandidateName,
        email: testCandidateEmail,
        otp: candidateOtpCode
      });
      assert.fail('Candidate should not be permitted to log in after submission');
    } catch (err: any) {
      assert.strictEqual(err.response.status, 403);
      assert.ok(err.response.data.detail.includes('already completed'));
    }
  });

  // 8. Admin Assessment Dashboard & Reports Verification
  it('Step 8: Admin verifies candidate assessment, scores, and proctoring log in dashboard', async () => {
    const dashboardRes = await axios.get(`${API_BASE}/api/reports/proctoring/`);
    assert.strictEqual(dashboardRes.status, 200);
    assert.ok(Array.isArray(dashboardRes.data));

    const candidateRow = dashboardRes.data.find((r: any) => r.email === testCandidateEmail);
    assert.ok(candidateRow, 'Candidate must appear in Assessment Dashboard results');
    assert.strictEqual(candidateRow.overall_score, 20);
    assert.ok(typeof candidateRow.overall_verdict === 'string');
    assert.ok(Array.isArray(candidateRow.logs));
    assert.ok(candidateRow.logs.some((l: any) => l.violation_type === 'TAB_SWITCH'));

    // Verify candidate submissions endpoint for Code Review modal
    const subsRes = await axios.get(`${API_BASE}/api/candidates/${encodeURIComponent(testCandidateEmail)}/submissions`);
    assert.strictEqual(subsRes.status, 200);
    assert.ok(Array.isArray(subsRes.data.submissions));
    assert.ok(subsRes.data.submissions.length >= 1);
    assert.strictEqual(subsRes.data.submissions[0].verdict, 'Accepted');

    // Verify Excel report export contains data
    const exportRes = await axios.get(`${API_BASE}/api/assessment/export`, { responseType: 'arraybuffer' });
    assert.strictEqual(exportRes.status, 200);
    assert.ok(exportRes.data.byteLength > 1000);
  });

  // 9. Teardown & Database Sanitization
  it('Step 9: Teardown - Clean up test problems, sessions, logs, and candidate records', async () => {
    if (testPythonProbId) {
      await prisma.adminResult.deleteMany({ where: { problem_id: testPythonProbId } });
      await prisma.submission.deleteMany({ where: { problem_id: testPythonProbId } });
      await prisma.pythonProblem.deleteMany({ where: { id: testPythonProbId } });
    }
    if (proctoringSessionId) {
      await prisma.proctoringEventRecord.deleteMany({ where: { session_id: proctoringSessionId } });
      await prisma.proctoringSession.deleteMany({ where: { id: proctoringSessionId } });
    }
    if (testExamSessionId) {
      await prisma.serverExamSession.deleteMany({ where: { session_id: testExamSessionId } });
      await prisma.serverSession.deleteMany({ where: { id: testExamSessionId } });
    }
    await prisma.proctoringLog.deleteMany({ where: { candidate_id: testCandidateEmail } });
    await prisma.candidateSelectedExamProblem.deleteMany({ where: { candidate_email: testCandidateEmail } });
    await prisma.candidateOtp.deleteMany({ where: { email: testCandidateEmail } });
    await prisma.assessment.deleteMany({ where: { email: testCandidateEmail } });
    await prisma.user.deleteMany({ where: { email: testCandidateEmail } });
  });
});
