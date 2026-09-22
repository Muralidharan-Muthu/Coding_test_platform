import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  exportAssessmentResultsWorkbook,
  getAssessmentResults,
  getProctoringReportsForDashboard,
} from '../../services/assessmentService';

describe('Assessment Service - Unit Tests', () => {
  describe('exportAssessmentResultsWorkbook', () => {
    it('should generate a valid XLSX buffer with correct headers', async () => {
      const buffer = await exportAssessmentResultsWorkbook();
      assert.ok(Buffer.isBuffer(buffer), 'Expected a Buffer object');
      assert.ok(buffer.length > 1000, 'Expected non-trivial XLSX binary size');
      // Verify standard ZIP/XLSX magic bytes (PK\x03\x04)
      assert.strictEqual(buffer[0], 0x50);
      assert.strictEqual(buffer[1], 0x4B);
    });
  });

  describe('getAssessmentResults', () => {
    it('should query assessments and parse problem JSON safely', async () => {
      const results = await getAssessmentResults();
      assert.ok(Array.isArray(results));
      for (const row of results.slice(0, 5)) {
        assert.ok(typeof row.problem_testcases === 'object');
        assert.ok(typeof row.problem_scores === 'object');
      }
    });
  });

  describe('getProctoringReportsForDashboard', () => {
    it('should return enriched rows with logs array', async () => {
      const reports = await getProctoringReportsForDashboard();
      assert.ok(Array.isArray(reports));
      for (const rep of reports.slice(0, 5)) {
        assert.ok(Array.isArray(rep.logs));
      }
    });
  });
});
