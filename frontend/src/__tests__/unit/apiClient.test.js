import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as apiModule from '../../api';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Frontend - API Client Unit & Regression Tests', () => {
  it('should export all essential API functions', () => {
    assert.strictEqual(typeof apiModule.login, 'function');
    assert.strictEqual(typeof apiModule.adminLogin, 'function');
    assert.strictEqual(typeof apiModule.candidateLogin, 'function');
    assert.strictEqual(typeof apiModule.startExam, 'function');
    assert.strictEqual(typeof apiModule.getExamStatus, 'function');
    assert.strictEqual(typeof apiModule.submitExam, 'function');
    assert.strictEqual(typeof apiModule.runCode, 'function');
    assert.strictEqual(typeof apiModule.submitCode, 'function');
    assert.strictEqual(typeof apiModule.createQuestionUnderType, 'function');
    assert.strictEqual(typeof apiModule.getQuestionsByType, 'function');
  });

  it('Regression Test: api.js source must not contain literal single-quoted template strings', () => {
    const apiFilePath = fs.existsSync(path.resolve(__dirname, '../../api.ts'))
      ? path.resolve(__dirname, '../../api.ts')
      : path.resolve(__dirname, '../../api.js');
    const sourceCode = fs.readFileSync(apiFilePath, 'utf-8');

    // Check for buggy literal string: '/admin/questions-by-type/${type}'
    const hasLiteralTemplateBug = sourceCode.includes("'/admin/questions-by-type/${type}'");
    if (hasLiteralTemplateBug) {
      console.log('  [Observed Known Defect in api.js]: createQuestionUnderType uses literal single quotes instead of backticks');
    }
    // We expect this to fail or detect the bug until Phase 2 fix
    assert.strictEqual(
      hasLiteralTemplateBug,
      false,
      'api.js contains literal single-quoted string with ${type} instead of a template literal backtick!'
    );
  });
});
