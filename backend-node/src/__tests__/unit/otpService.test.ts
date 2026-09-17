import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTestType,
  getTestTypeSections,
  hasTestTypeSection,
  generateOtp,
  OTP_LENGTH,
  OTP_EXPIRY_HOURS,
  DEFAULT_TEST_TYPE,
} from '../../services/otpService';

describe('OTP Service - Unit Tests', () => {
  describe('Constants', () => {
    it('should have standard OTP defaults', () => {
      assert.strictEqual(OTP_LENGTH, 6);
      assert.strictEqual(OTP_EXPIRY_HOURS, 24);
      assert.strictEqual(DEFAULT_TEST_TYPE, 'both');
    });
  });

  describe('generateOtp', () => {
    it('should generate a 6-digit numeric string', () => {
      const otp = generateOtp();
      assert.strictEqual(typeof otp, 'string');
      assert.strictEqual(otp.length, 6);
      assert.match(otp, /^\d{6}$/);
    });

    it('should produce varied codes across multiple invocations', () => {
      const set = new Set();
      for (let i = 0; i < 20; i++) {
        set.add(generateOtp());
      }
      assert.ok(set.size > 15, 'Expected random OTP codes across iterations');
    });
  });

  describe('normalizeTestType', () => {
    it('should return default test type for empty/undefined input', () => {
      assert.strictEqual(normalizeTestType(), 'both');
      assert.strictEqual(normalizeTestType(''), 'both');
    });

    it('should correctly map standard aliases', () => {
      assert.strictEqual(normalizeTestType('both'), 'both');
      assert.strictEqual(normalizeTestType('python_only'), 'python');
      assert.strictEqual(normalizeTestType('sql_only'), 'sql');
      assert.strictEqual(normalizeTestType('mcq_only'), 'mcq');
      assert.strictEqual(normalizeTestType('all'), 'full');
      assert.strictEqual(normalizeTestType('python + sql + mcq'), 'full');
      assert.strictEqual(normalizeTestType('python+mcq'), 'python_mcq');
      assert.strictEqual(normalizeTestType('sql+mcq'), 'sql_mcq');
    });

    it('should handle delimiter splitting for compound types', () => {
      assert.strictEqual(normalizeTestType('java, cpp'), 'java+cpp');
    });
  });

  describe('getTestTypeSections & hasTestTypeSection', () => {
    it('should return correct sections for both', () => {
      const sections = getTestTypeSections('both');
      assert.deepStrictEqual(sections, ['python', 'sql']);
      assert.strictEqual(hasTestTypeSection('both', 'python'), true);
      assert.strictEqual(hasTestTypeSection('both', 'sql'), true);
      assert.strictEqual(hasTestTypeSection('both', 'mcq'), false);
    });

    it('should return correct sections for full', () => {
      const sections = getTestTypeSections('full');
      assert.deepStrictEqual(sections, ['python', 'sql', 'mcq']);
      assert.strictEqual(hasTestTypeSection('full', 'mcq'), true);
    });

    it('should return correct sections for single types', () => {
      assert.deepStrictEqual(getTestTypeSections('python'), ['python']);
      assert.deepStrictEqual(getTestTypeSections('sql'), ['sql']);
      assert.deepStrictEqual(getTestTypeSections('mcq'), ['mcq']);
    });
  });
});
