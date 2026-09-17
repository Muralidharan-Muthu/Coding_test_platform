import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Mirroring the exact functions from ChooseTestTypePage.jsx for verification
function parseTopicsFromType(testType = 'both', allTopicSlugs = ['python', 'sql', 'mcq']) {
  const raw = String(testType || 'both').trim().toLowerCase();
  if (raw === 'both') return ['python', 'sql'];
  if (raw === 'full') return ['python', 'sql', 'mcq'];
  if (raw === 'python_mcq' || raw === 'python+mcq') return ['python', 'mcq'];
  if (raw === 'sql_mcq' || raw === 'sql+mcq') return ['sql', 'mcq'];
  if (raw === 'all') return [...allTopicSlugs];
  
  const parts = raw.split(/[\+,\s\/&]+/).map(p => p.trim()).filter(Boolean);
  return parts.length > 0 ? Array.from(new Set(parts)) : ['python', 'sql'];
}

function serializeTopicsToType(topicSlugs = []) {
  if (!topicSlugs || topicSlugs.length === 0) return 'both';
  const set = new Set(topicSlugs.map(s => s.toLowerCase()));
  if (set.size === 2 && set.has('python') && set.has('sql')) return 'both';
  if (set.size === 3 && set.has('python') && set.has('sql') && set.has('mcq')) return 'full';
  if (set.size === 2 && set.has('python') && set.has('mcq')) return 'python_mcq';
  if (set.size === 2 && set.has('sql') && set.has('mcq')) return 'sql_mcq';
  return topicSlugs.join('+');
}

describe('Frontend - Test Type Serialization Integration Tests', () => {
  it('should parse standardized test types to topic arrays', () => {
    assert.deepStrictEqual(parseTopicsFromType('both'), ['python', 'sql']);
    assert.deepStrictEqual(parseTopicsFromType('full'), ['python', 'sql', 'mcq']);
    assert.deepStrictEqual(parseTopicsFromType('python_mcq'), ['python', 'mcq']);
    assert.deepStrictEqual(parseTopicsFromType('sql_mcq'), ['sql', 'mcq']);
  });

  it('should serialize topic arrays to standardized test types', () => {
    assert.strictEqual(serializeTopicsToType(['python', 'sql']), 'both');
    assert.strictEqual(serializeTopicsToType(['sql', 'python']), 'both');
    assert.strictEqual(serializeTopicsToType(['python', 'sql', 'mcq']), 'full');
    assert.strictEqual(serializeTopicsToType(['python', 'mcq']), 'python_mcq');
    assert.strictEqual(serializeTopicsToType(['sql', 'mcq']), 'sql_mcq');
    assert.strictEqual(serializeTopicsToType(['python']), 'python');
    assert.strictEqual(serializeTopicsToType(['sql']), 'sql');
    assert.strictEqual(serializeTopicsToType(['mcq']), 'mcq');
  });

  it('should round-trip seamlessly between parsing and serialization', () => {
    const types = ['both', 'full', 'python_mcq', 'sql_mcq'];
    for (const t of types) {
      const parsed = parseTopicsFromType(t);
      const serialized = serializeTopicsToType(parsed);
      assert.strictEqual(serialized, t);
    }
  });
});
