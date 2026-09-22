import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProctoringSession,
  addProctoringEvents,
  endProctoringSession,
  getProctoringSessionById,
  getProctoringReports,
} from '../../services/proctoringService';
import prisma from '../../db/prisma';

describe('Proctoring Service - Unit Tests', () => {
  let testSessionId = '';
  const candidateId = `cand_unit_${Date.now()}`;
  const testId = `test_unit_${Date.now()}`;

  it('should create a new proctoring session', async () => {
    const session = await createProctoringSession(testId, candidateId);
    assert.ok(session.id);
    testSessionId = session.id;
    assert.strictEqual(session.status, 'active');
    assert.strictEqual(session.risk_score, 0);
    assert.strictEqual(session.risk_level, 'NORMAL');
  });

  it('should batch insert proctoring events and increment event count', async () => {
    const events = [
      {
        type: 'TAB_SWITCH',
        severity: 'HIGH',
        timestamp: Date.now(),
        duration: 5,
        metadata: { message: 'Candidate switched tabs' },
      },
      {
        type: 'MULTIPLE_FACES',
        severity: 'CRITICAL',
        timestamp: Date.now(),
        duration: 3,
        metadata: { facesDetected: 2 },
      },
    ];

    const insertedCount = await addProctoringEvents(testSessionId, events, 45);
    assert.strictEqual(insertedCount, 2);

    const updated = await getProctoringSessionById(testSessionId);
    assert.ok(updated);
    assert.strictEqual(updated.risk_score, 45);
    assert.strictEqual(updated.events.length, 2);
  });

  it('should close the proctoring session and record final risk level', async () => {
    const ended = await endProctoringSession(testSessionId, 75, 'HIGH_RISK');
    assert.strictEqual(ended.status, 'completed');
    assert.strictEqual(ended.risk_level, 'HIGH_RISK');
    assert.strictEqual(ended.risk_score, 75);
    assert.ok(ended.ended_at);
  });

  it('should query proctoring reports filtered by candidateId', async () => {
    const reports = await getProctoringReports({ candidateId });
    assert.ok(Array.isArray(reports));
    assert.ok(reports.some((r) => r.id === testSessionId));
  });

  it('should clean up test proctoring session from database', async () => {
    await prisma.proctoringLog.deleteMany({ where: { candidate_id: candidateId } });
    await prisma.proctoringEventRecord.deleteMany({ where: { session_id: testSessionId } });
    await prisma.proctoringSession.delete({ where: { id: testSessionId } });
  });
});
