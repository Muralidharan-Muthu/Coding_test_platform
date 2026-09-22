import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RiskEngine } from '../../proctoring/RiskEngine';
import { DEFAULT_PROCTORING_CONFIG } from '../../proctoring/ProctoringConfig';

describe('Frontend - RiskEngine Unit Tests', () => {
  it('should initialize with 0 score and NORMAL risk level', () => {
    const engine = new RiskEngine(DEFAULT_PROCTORING_CONFIG);
    assert.strictEqual(engine.getScore(), 0);
    assert.strictEqual(engine.getRiskLevel(), 'NORMAL');
  });

  it('should score events based on config weights', () => {
    const engine = new RiskEngine(DEFAULT_PROCTORING_CONFIG);
    const now = Date.now();

    const event = engine.processEvent({
      type: 'TAB_SWITCH',
      severity: 'HIGH',
      timestamp: now,
    });

    assert.ok(event);
    assert.strictEqual(engine.getScore(), DEFAULT_PROCTORING_CONFIG.score.TAB_SWITCH);
  });

  it('should suppress deduplicated events within cooldown window', () => {
    const engine = new RiskEngine(DEFAULT_PROCTORING_CONFIG);
    const now = Date.now();

    const first = engine.processEvent({
      type: 'COPY',
      severity: 'MEDIUM',
      timestamp: now,
    });
    assert.ok(first);
    const scoreAfterFirst = engine.getScore();

    // Fire immediately again within cooldown
    const second = engine.processEvent({
      type: 'COPY',
      severity: 'MEDIUM',
      timestamp: now + 500,
    });
    assert.strictEqual(second, null);
    assert.strictEqual(engine.getScore(), scoreAfterFirst);
  });

  it('should elevate risk levels as score accumulates', () => {
    const engine = new RiskEngine(DEFAULT_PROCTORING_CONFIG);
    let time = 1000;

    // Accumulate events past thresholds
    const eventTypes = ['MULTIPLE_FACES', 'DEVTOOLS_ATTEMPT', 'TAB_SWITCH', 'COPY', 'PASTE'];
    for (const type of eventTypes) {
      engine.processEvent({ type, severity: 'HIGH', timestamp: time });
      time += 60000; // avoid cooldown
    }

    assert.ok(engine.getScore() >= 10);
    assert.notStrictEqual(engine.getRiskLevel(), 'NORMAL');
  });
});
