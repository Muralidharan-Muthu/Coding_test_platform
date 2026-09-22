import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatSeconds, formatTimeWithLabel } from '../../utils/timeUtils';

describe('Frontend - timeUtils Unit Tests', () => {
  describe('formatSeconds', () => {
    it('should fallback to 30s default if 0 or negative', () => {
      assert.strictEqual(formatSeconds(0), '00:00:30');
      assert.strictEqual(formatSeconds(-10), '00:00:30');
      assert.strictEqual(formatSeconds(null), '00:00:30');
    });

    it('should format seconds into HH:MM:SS', () => {
      assert.strictEqual(formatSeconds(65), '00:01:05');
      assert.strictEqual(formatSeconds(599), '00:09:59');
      assert.strictEqual(formatSeconds(3599), '00:59:59');
    });

    it('should format seconds into HH:MM:SS when 1 hour or more', () => {
      assert.strictEqual(formatSeconds(3600), '01:00:00');
      assert.strictEqual(formatSeconds(3665), '01:01:05');
      assert.strictEqual(formatSeconds(7200), '02:00:00');
    });
  });

  describe('formatTimeWithLabel', () => {
    it('should format label with minutes and seconds correctly', () => {
      const result = formatTimeWithLabel(125);
      assert.strictEqual(result, '00:02:05 (2 mins 5s)');
    });

    it('should format label with hours and minutes correctly', () => {
      const result = formatTimeWithLabel(3720);
      assert.strictEqual(result, '01:02:00 (1 hr 2 min)');
    });
  });
});
