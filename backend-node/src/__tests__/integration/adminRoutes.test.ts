import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

describe('Admin Routes - Integration Tests', () => {
  const testCandidateEmail = `cand_admin_int_${Date.now()}@example.com`;
  const testTypeName = `Lang_${Date.now()}`;
  let createdTypeSlug = '';

  it('GET /admin/candidates - should return candidate list', async () => {
    const res = await axios.get(`${API_BASE}/admin/candidates`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(Array.isArray(res.data.candidates));
  });

  it('POST /admin/generate-otp - should generate OTP for a candidate', async () => {
    const res = await axios.post(`${API_BASE}/admin/generate-otp`, {
      username: 'Integration Test Candidate',
      email: testCandidateEmail
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(res.data.otp_code);
    assert.strictEqual(res.data.otp_code.length, 6);
  });

  it('POST /admin/candidate-test-type - should update candidate test type', async () => {
    const res = await axios.post(`${API_BASE}/admin/candidate-test-type`, {
      email: testCandidateEmail,
      test_type: 'python_mcq'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.test_type, 'python_mcq');
  });

  it('GET /admin/question-types - should return registry of question types', async () => {
    const res = await axios.get(`${API_BASE}/admin/question-types`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(Array.isArray(res.data.types));
    const slugs = res.data.types.map((t: any) => t.slug);
    assert.ok(slugs.includes('python'));
    assert.ok(slugs.includes('sql'));
    assert.ok(slugs.includes('mcq'));
  });

  it('POST /admin/question-types - should dynamically create a new question type table', async () => {
    const res = await axios.post(`${API_BASE}/admin/question-types`, {
      name: testTypeName
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.ok(res.data.type);
    createdTypeSlug = res.data.type.slug;
  });

  it('GET /admin/questions-by-type/:type - should fetch questions for type', async () => {
    const res = await axios.get(`${API_BASE}/admin/questions-by-type/python`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  it('DELETE /admin/question-types/:slug - should delete custom type and drop table', async () => {
    if (createdTypeSlug) {
      const res = await axios.delete(`${API_BASE}/admin/question-types/${createdTypeSlug}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, 'deleted');
    }
  });

  it('Cleanup created test candidate', async () => {
    await axios.delete(`${API_BASE}/admin/candidates/${encodeURIComponent(testCandidateEmail)}`);
  });
});
