import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOutput,
  compareOutputs,
  getVerdict,
  preparePythonCode,
  executePython,
} from '../../services/runner';

describe('Runner Service - Unit Tests', () => {
  describe('normalizeOutput', () => {
    it('should return empty string for null and undefined', () => {
      assert.strictEqual(normalizeOutput(null), '');
      assert.strictEqual(normalizeOutput(undefined), '');
    });

    it('should normalize CRLF to LF and trim whitespace', () => {
      assert.strictEqual(normalizeOutput('hello\r\nworld  \r\n'), 'hello\nworld');
    });

    it('should collapse multiple blank lines into two newlines', () => {
      assert.strictEqual(normalizeOutput('a\n\n\n\nb'), 'a\n\nb');
    });
  });

  describe('compareOutputs', () => {
    it('should match identical strings', () => {
      assert.strictEqual(compareOutputs('42', '42'), true);
      assert.strictEqual(compareOutputs('[1, 2, 3]', '[1, 2, 3]'), true);
    });

    it('should match unquoted vs quoted strings', () => {
      assert.strictEqual(compareOutputs('"hello"', 'hello'), true);
      assert.strictEqual(compareOutputs("'world'", 'world'), true);
    });

    it('should match boolean values case-insensitively', () => {
      assert.strictEqual(compareOutputs('True', 'true'), true);
      assert.strictEqual(compareOutputs('FALSE', 'false'), true);
    });

    it('should parse and deeply compare JSON / Python literals', () => {
      assert.strictEqual(compareOutputs('{"a": 1, "b": 2}', '{"b": 2, "a": 1}'), true);
      assert.strictEqual(compareOutputs('[True, False, None]', '[true, false, null]'), true);
    });

    it('should return false for genuinely mismatched outputs', () => {
      assert.strictEqual(compareOutputs('42', '43'), false);
      assert.strictEqual(compareOutputs('[1, 2]', '[1, 3]'), false);
    });
  });

  describe('getVerdict', () => {
    it('should return Failed if total is 0 or passed is 0', () => {
      assert.strictEqual(getVerdict(0, 0), 'Failed');
      assert.strictEqual(getVerdict(0, 10), 'Failed');
    });

    it('should return Accepted when all tests pass', () => {
      assert.strictEqual(getVerdict(10, 10), 'Accepted');
    });

    it('should return Partial when some tests pass', () => {
      assert.strictEqual(getVerdict(5, 10), 'Partial');
      assert.strictEqual(getVerdict(1, 10), 'Partial');
    });
  });

  describe('preparePythonCode', () => {
    it('should return empty string for falsy input', () => {
      assert.strictEqual(preparePythonCode(''), '');
    });

    it('should prepend typing imports if code already has main guard', () => {
      const code = 'if __name__ == "__main__":\n    print("hi")';
      const prepared = preparePythonCode(code);
      assert.ok(prepared.includes('from typing import List'));
      assert.ok(prepared.includes('print("hi")'));
    });

    it('should append auto invocation harness for Solution classes', () => {
      const code = 'class Solution:\n    def twoSum(self, nums, target):\n        return [0, 1]';
      const prepared = preparePythonCode(code);
      assert.ok(prepared.includes('class Solution:'));
      assert.ok(prepared.includes('# --- AUTO INVOCATION HARNESS ---'));
      assert.ok(prepared.includes('_parse_val'));
    });
  });

  describe('executePython', () => {
    it('should execute standard python code and return stdout', async () => {
      const code = 'print("Hello from Python unit test")';
      const result = await executePython(code);
      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stdout.trim(), 'Hello from Python unit test');
    });

    it('should pass custom stdin and retrieve output', async () => {
      const code = 'import sys\nval = sys.stdin.read().strip()\nprint(f"ECHO:{val}")';
      const result = await executePython(code, 'Antigravity');
      assert.strictEqual(result.status, 'success');
      assert.strictEqual(result.stdout.trim(), 'ECHO:Antigravity');
    });

    it('should handle runtime syntax errors gracefully', async () => {
      const code = 'def broken_syntax(';
      const result = await executePython(code);
      assert.strictEqual(result.status, 'error');
      assert.ok(result.stderr.includes('SyntaxError'));
    });
  });
});
