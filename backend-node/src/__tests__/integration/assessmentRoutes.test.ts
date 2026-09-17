import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import prisma from '../../db/prisma';

const API_BASE = 'http://localhost:8000';

describe('Assessment Routes - Integration Tests', () => {
  const testCandidateEmail = `assess_int_${Date.now()}@example.com`;
  let createdAssessmentId = 0;

  it('GET /api/assessment/results - should return results with pagination/filters', async () => {
    const res = await axios.get(`${API_BASE}/api/assessment/results`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(Array.isArray(res.data.data));
  });

  it('POST /api/assessment/results - should create an assessment record', async () => {
    const res = await axios.post(`${API_BASE}/api/assessment/results`, {
      name: 'Integration Assessment Candidate',
      email: testCandidateEmail,
      submission_type: 'Manual',
      time_taken_min: 25,
      total_questions: 3,
      python_questions: 2,
      sql_questions: 1,
      python_score: 90,
      sql_score: 80,
      overall_score: 85,
      overall_percentage: 85,
      overall_verdict: 'Good'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.assessment);
    createdAssessmentId = res.data.assessment.id;
  });

  it('GET /api/reports/proctoring/ - should return proctoring dashboard report data', async () => {
    const res = await axios.get(`${API_BASE}/api/reports/proctoring/`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  it('GET /api/candidates/:email/submissions - should return submissions for candidate', async () => {
    const res = await axios.get(`${API_BASE}/api/candidates/${encodeURIComponent(testCandidateEmail)}/submissions`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.submissions));
  });

  it('Cleanup created test assessment data', async () => {
    if (createdAssessmentId) {
      await prisma.assessment.deleteMany({ where: { id: createdAssessmentId } });
    }
    await prisma.user.deleteMany({ where: { email: testCandidateEmail } });
  });
});
