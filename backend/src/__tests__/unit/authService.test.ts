import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { verifyPassword, authenticateUser } from '../../services/authService';

describe('Auth Service - Unit Tests', () => {
  describe('verifyPassword', () => {
    it('should correctly verify bcrypt hash for matching plaintext', async () => {
      const plain = 'secret_test_password_123';
      const hash = await bcrypt.hash(plain, 10);
      const isValid = await verifyPassword(plain, hash);
      assert.strictEqual(isValid, true);
    });

    it('should reject incorrect plaintext against bcrypt hash', async () => {
      const plain = 'secret_test_password_123';
      const hash = await bcrypt.hash(plain, 10);
      const isValid = await verifyPassword('wrong_password', hash);
      assert.strictEqual(isValid, false);
    });
  });

  describe('authenticateUser', () => {
    it('should return null for non-existent user email', async () => {
      const nonExistent = `non_existent_${Date.now()}@example.com`;
      const result = await authenticateUser(nonExistent, 'any_password');
      assert.strictEqual(result, null);
    });
  });
});
