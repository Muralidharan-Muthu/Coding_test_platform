import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

describe('Runner Routes - Integration Tests', () => {
  it('POST /run - should execute custom python code with custom input', async () => {
    const res = await axios.post(`${API_BASE}/run`, {
      code: `
class Solution:
    def add(self, a: int, b: int) -> int:
        return a + b
`,
      custom_input: '15\n27'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.strictEqual(String(res.data.return_value).trim(), '42');
  });

  it('POST /run - should return INPUT_REQUIRED if custom_input is missing', async () => {
    const res = await axios.post(`${API_BASE}/run`, {
      code: 'print("hello")'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.error, 'INPUT_REQUIRED');
  });

  it('POST /submit - should return 400 when problem_id or code is missing', async () => {
    try {
      await axios.post(`${API_BASE}/submit`, {});
      assert.fail('Expected 400 error');
    } catch (err: any) {
      assert.strictEqual(err.response.status, 400);
    }
  });

  it('POST /sql/run - should return 400 when query or problem_id is missing', async () => {
    try {
      await axios.post(`${API_BASE}/sql/run`, {});
      assert.fail('Expected 400 error');
    } catch (err: any) {
      assert.strictEqual(err.response.status, 400);
    }
  });
});
