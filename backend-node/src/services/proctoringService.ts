import prisma from '../db/prisma';
import crypto from 'crypto';

/**
 * Generate a UUID v4 for session IDs.
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Create a new proctoring session.
 */
export async function createProctoringSession(testId: string, candidateId: string) {
  const now = new Date().toISOString();
  const session = await prisma.proctoringSession.create({
    data: {
      id: generateId(),
      test_id: testId,
      candidate_id: candidateId,
      started_at: now,
      status: 'active',
      risk_score: 0,
      risk_level: 'NORMAL',
      total_events: 0,
      metadata: '{}',
      created_at: now,
      updated_at: now,
    },
  });
  return session;
}

/**
 * Batch insert proctoring events and update session risk score.
 */
export async function addProctoringEvents(
  sessionId: string,
  events: Array<{
    type: string;
    severity: string;
    timestamp: number | string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }>,
  riskScore: number
): Promise<number> {
  const now = new Date().toISOString();

  // Insert events in a batch
  const createData = events.map((evt) => ({
    session_id: sessionId,
    type: evt.type,
    severity: evt.severity || 'MEDIUM',
    timestamp: typeof evt.timestamp === 'number'
      ? new Date(evt.timestamp).toISOString()
      : evt.timestamp,
    duration: evt.duration ?? null,
    metadata: evt.metadata ? JSON.stringify(evt.metadata) : '{}',
    created_at: now,
  }));

  // Prisma createMany for batch insert
  const result = await prisma.proctoringEventRecord.createMany({
    data: createData,
  });

  // Update session with latest risk score and event count
  await prisma.proctoringSession.update({
    where: { id: sessionId },
    data: {
      risk_score: riskScore,
      total_events: { increment: result.count },
      updated_at: now,
    },
  });

  return result.count;
}

/**
 * End a proctoring session.
 */
export async function endProctoringSession(
  sessionId: string,
  riskScore: number,
  riskLevel: string
) {
  const now = new Date().toISOString();
  const session = await prisma.proctoringSession.update({
    where: { id: sessionId },
    data: {
      status: 'completed',
      ended_at: now,
      risk_score: riskScore,
      risk_level: riskLevel,
      updated_at: now,
    },
  });
  return session;
}

/**
 * Get a proctoring session by ID with all events.
 */
export async function getProctoringSessionById(sessionId: string) {
  const session = await prisma.proctoringSession.findUnique({
    where: { id: sessionId },
    include: {
      events: {
        orderBy: { timestamp: 'asc' },
      },
    },
  });
  return session;
}

/**
 * Get proctoring reports for admin review.
 * Returns sessions with event count summaries.
 */
export async function getProctoringReports(filters: {
  candidateId?: string;
  testId?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters.candidateId) where.candidate_id = filters.candidateId;
  if (filters.testId) where.test_id = filters.testId;

  const sessions = await prisma.proctoringSession.findMany({
    where,
    include: {
      events: {
        orderBy: { timestamp: 'asc' },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  // Enrich with event type summaries
  return sessions.map((session) => {
    const eventTypeCounts: Record<string, number> = {};
    let faceEvents = 0;
    let browserEvents = 0;

    for (const evt of session.events) {
      eventTypeCounts[evt.type] = (eventTypeCounts[evt.type] || 0) + 1;
      if (['NO_FACE', 'NO_FACE_WARNING', 'MULTIPLE_FACES', 'HEAD_LEFT', 'HEAD_RIGHT', 'HEAD_UP', 'HEAD_DOWN'].includes(evt.type)) {
        faceEvents++;
      } else {
        browserEvents++;
      }
    }

    return {
      ...session,
      summary: {
        totalEvents: session.events.length,
        faceEvents,
        browserEvents,
        eventTypeCounts,
      },
    };
  });
}
