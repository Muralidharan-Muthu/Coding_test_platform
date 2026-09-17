import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

describe('Auth Routes - Integration Tests', () => {
  it('POST /auth/admin-login - should authenticate admin with valid credentials', async () => {
    const res = await axios.post(`${API_BASE}/auth/admin-login`, {
      email: 'muralidharanm@meptrasoftai.com',
      password: 'admin@1234'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.strictEqual(res.data.role, 'admin');
  });

  it('POST /auth/admin-login - should reject invalid credentials with 401', async () => {
    try {
      await axios.post(`${API_BASE}/auth/admin-login`, {
        email: 'muralidharanm@meptrasoftai.com',
        password: 'wrong_password_999'
      });
      assert.fail('Expected 401 error');
    } catch (err: any) {
      assert.strictEqual(err.response.status, 401);
      assert.strictEqual(err.response.data.detail, 'Invalid email or password.');
    }
  });

  it('POST /auth/candidate-login - should authenticate candidate account', async () => {
    const res = await axios.post(`${API_BASE}/auth/candidate-login`, {
      email: 'candidate@meptrasoft.com',
      password: 'password'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'success');
    assert.strictEqual(res.data.role, 'candidate');
  });

  it('GET /auth/users - should retrieve registered auth users', async () => {
    const res = await axios.get(`${API_BASE}/auth/users`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.users));
    assert.ok(res.data.users.some((u: any) => u.role === 'admin'));
  });
});
