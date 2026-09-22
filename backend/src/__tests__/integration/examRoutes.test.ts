import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import prisma from '../../db/prisma';

const API_BASE = 'http://localhost:8000';

describe('Exam Routes - Integration Tests', () => {
  const candidateEmail = `exam_test_${Date.now()}@example.com`;
  const candidateName = 'Exam Flow Candidate';
  let testSessionId = '';

  it('Setup: Create Candidate and Generate OTP', async () => {
    const otpRes = await axios.post(`${API_BASE}/admin/generate-otp`, {
      username: candidateName,
      email: candidateEmail
    });
    assert.strictEqual(otpRes.status, 200);

    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      name: candidateName,
      email: candidateEmail,
      otp: otpRes.data.otp_code
    });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.data.session_id);
    testSessionId = loginRes.data.session_id;
  });

  it('GET /exam/summary - should retrieve exam configuration for session', async () => {
    const res = await axios.get(`${API_BASE}/exam/summary?session_id=${testSessionId}`);
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.data.total_questions === 'number');
    assert.ok(Array.isArray(res.data.problems));
  });

  it('GET /exam/status - before start, status should be not_started', async () => {
    const res = await axios.get(`${API_BASE}/exam/status?session_id=${testSessionId}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'not_started');
  });

  it('POST /exam/start - should initialize active exam attempt', async () => {
    const res = await axios.post(`${API_BASE}/exam/start`, {
      session_id: testSessionId
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'active');
    assert.ok(res.data.remaining_seconds > 0);
  });

  it('POST /exam/save-answer - should persist candidate code draft', async () => {
    const res = await axios.post(`${API_BASE}/exam/save-answer`, {
      session_id: testSessionId,
      problem_id: 'test_prob_1',
      code: 'print("draft answer")',
      language: 'python'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'saved');
  });

  it('POST /exam/penalty - should reduce remaining exam time', async () => {
    const res = await axios.post(`${API_BASE}/exam/penalty`, {
      session_id: testSessionId,
      penalty_seconds: 60
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'penalized');
    assert.strictEqual(res.data.penalty_seconds, 60);
  });

  it('POST /exam/submit - should submit final exam, create assessment record, and lock candidate', async () => {
    const res = await axios.post(`${API_BASE}/exam/submit`, {
      session_id: testSessionId,
      answers: [
        { problem_id: 'test_prob_1', code: 'print("final answer")', language: 'python' }
      ],
      auto_submit: false
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'submitted');

    // Verify candidate OTP is locked with status 'submitted'
    const updatedCandidate = await prisma.candidateOtp.findFirst({ where: { email: candidateEmail } });
    assert.ok(updatedCandidate);
    assert.strictEqual(updatedCandidate.status, 'submitted');

    // Verify assessment record created
    const assessment = await prisma.assessment.findFirst({ where: { email: candidateEmail } });
    assert.ok(assessment, 'Expected assessment record to be generated for candidate');
    assert.strictEqual(assessment.submission_type, 'Manual');
  });

  it('Cleanup created exam session and candidate', async () => {
    await prisma.serverExamSession.deleteMany({ where: { session_id: testSessionId } });
    await prisma.serverSession.deleteMany({ where: { id: testSessionId } });
    await prisma.candidateSelectedExamProblem.deleteMany({ where: { candidate_email: candidateEmail } });
    await prisma.candidateOtp.deleteMany({ where: { email: candidateEmail } });
    await prisma.assessment.deleteMany({ where: { email: candidateEmail } });
    await prisma.user.deleteMany({ where: { email: candidateEmail } });
  });
});
