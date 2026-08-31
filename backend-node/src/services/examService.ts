import prisma from '../db/prisma';
import { shuffleCandidateQuestions, getTestTypeSections } from './otpService';
import crypto from 'crypto';

/** Total exam duration, mirroring EXAM_DURATION_SECONDS in the frontend. */
export const EXAM_DURATION_SECONDS = 150 * 60;

/**
 * Resolve a login session to the candidate it belongs to.
 * Sessions are created by POST /auth/login (see routes/auth.ts).
 */
export async function getSession(sessionId: string) {
  if (!sessionId) {
    const latest = await prisma.serverSession.findFirst({
      where: { is_active: true },
      orderBy: { id: 'desc' }
    });
    return latest;
  }

  let session = await prisma.serverSession.findUnique({ where: { id: sessionId } });
  if (session) return session;

  session = await prisma.serverSession.findFirst({
    where: {
      OR: [
        { candidate_email: sessionId.toLowerCase() },
        { user_id: sessionId }
      ]
    },
    orderBy: { id: 'desc' }
  });
  if (session) return session;

  // Synthesize or link to candidateOtp
  const candidate = await prisma.candidateOtp.findFirst({
    where: {
      OR: [
        { email: sessionId.toLowerCase() },
        { username: sessionId }
      ]
    }
  });

  if (candidate) {
    session = await prisma.serverSession.create({
      data: {
        id: sessionId,
        candidate_email: candidate.email,
        user_id: '1',
        test_type: candidate.test_type || 'both',
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
        is_active: true
      }
    });
    return session;
  }

  const latest = await prisma.candidateOtp.findFirst({ orderBy: { id: 'desc' } });
  if (latest) {
    session = await prisma.serverSession.create({
      data: {
        id: sessionId,
        candidate_email: latest.email,
        user_id: '1',
        test_type: latest.test_type || 'both',
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
        is_active: true
      }
    });
    return session;
  }

  return null;
}

/**
 * The candidate's assigned questions (the admin's "Choose Test Type" /
 * "Shuffle Question Set" selection), for the candidate dashboard
 * (GET /exam/summary?session_id=...).
 */
export async function getExamSummary(sessionId: string, candidateEmail?: string) {
  const session = await getSession(sessionId);
  let email = session?.candidate_email || candidateEmail;

  if (!email && sessionId) {
    const candidateSession = await prisma.serverSession.findFirst({
      where: { id: sessionId }
    });
    if (candidateSession) email = candidateSession.candidate_email;
  }

  if (!email) {
    const latestCandidate = await prisma.candidateOtp.findFirst({
      orderBy: { id: 'desc' }
    });
    if (latestCandidate) email = latestCandidate.email;
  }

  if (!email) {
    return { total_questions: 0, python_questions: 0, sql_questions: 0, mcq_questions: 0, total_marks: 0, problems: [] };
  }

  const emailClean = email.trim().toLowerCase();

  let problems = await prisma.candidateSelectedExamProblem.findMany({
    where: { candidate_email: emailClean },
    orderBy: { saved_at: 'asc' },
  });

  const candidate = await prisma.candidateOtp.findFirst({
    where: { email: emailClean }
  });
  const currentTestType = candidate?.test_type || session?.test_type || 'both';

  const expectedSections = getTestTypeSections(currentTestType);
  const presentSections = new Set(problems.map(p => (p.language || '').toLowerCase()));
  let needsReshuffle = problems.length === 0 || expectedSections.some(sec => !presentSections.has(sec));

  if (needsReshuffle) {
    try {
      await shuffleCandidateQuestions(emailClean, currentTestType);
      problems = await prisma.candidateSelectedExamProblem.findMany({
        where: { candidate_email: emailClean },
        orderBy: { saved_at: 'asc' },
      });
    } catch (e) {
      console.error('[ExamService] Auto-shuffle on getExamSummary failed:', e);
    }
  }

  const pythonCount = problems.filter((p) => (p.language || '').toLowerCase() === 'python').length;
  const sqlCount = problems.filter((p) => (p.language || '').toLowerCase() === 'sql').length;
  const mcqCount = problems.filter((p) => (p.language || '').toLowerCase() === 'mcq').length;

  return {
    total_questions: problems.length,
    python_questions: pythonCount,
    sql_questions: sqlCount,
    mcq_questions: mcqCount,
    total_marks: problems.reduce((sum, p) => sum + (p.marks || 0), 0),
    problems: problems.map((p) => ({
      id: p.problem_id,
      title: p.title,
      language: (p.language || 'python').toLowerCase(),
      difficulty: p.difficulty,
      marks: p.marks,
      time_limit: p.time_limit,
    })),
  };
}

function remainingSecondsFrom(startTime: Date): number {
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  return Math.max(0, EXAM_DURATION_SECONDS - elapsed);
}

/**
 * Begin the timed exam attempt. Idempotent — calling it again for a session
 * that already started returns the existing attempt rather than resetting
 * the candidate's clock.
 */
export async function startExam(sessionId: string) {
  let session = await getSession(sessionId);
  if (!session) {
    // If session still null, create fallback
    const latest = await prisma.candidateOtp.findFirst({ orderBy: { id: 'desc' } });
    session = await prisma.serverSession.create({
      data: {
        id: sessionId || crypto.randomUUID(),
        candidate_email: latest?.email || 'candidate@example.com',
        user_id: '1',
        test_type: latest?.test_type || 'both',
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24),
        is_active: true,
      }
    });
  }

  let attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });

  if (!attempt) {
    attempt = await prisma.serverExamSession.create({
      data: {
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: session.user_id || '',
        answers_json: '{}',
        is_completed: false,
      },
    });
  }

  return {
    status: 'active',
    start_time: attempt.start_time.toISOString(),
    remaining_seconds: remainingSecondsFrom(attempt.start_time),
  };
}

/**
 * Where the candidate's attempt stands, driving the dashboard's
 * Take Test / Continue Test / redirect-to-results branching and, in
 * CodingPage, whether exam mode (and therefore proctoring) is armed.
 */
export async function getExamStatus(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return { status: 'not_started' };

  const attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (!attempt) return { status: 'not_started' };

  if (attempt.is_completed) return { status: 'completed' };

  const remaining = remainingSecondsFrom(attempt.start_time);
  if (remaining <= 0) {
    return { status: 'expired', remaining_seconds: 0, start_time: attempt.start_time.toISOString() };
  }

  return {
    status: 'active',
    remaining_seconds: remaining,
    start_time: attempt.start_time.toISOString(),
  };
}

/**
 * Persist a single in-progress answer so a refresh or navigation between
 * problems doesn't lose the candidate's work.
 */
export async function saveExamAnswer(sessionId: string, problemId: string, code: string, language?: string) {
  let attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (!attempt) {
    await startExam(sessionId);
    attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  }
  if (!attempt) throw new Error('Exam has not been started for this session.');
  if (attempt.is_completed) throw new Error('Exam has already been submitted.');

  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(attempt.answers_json || '{}');
  } catch {
    answers = {};
  }

  answers[problemId] = {
    code: code || '',
    language: language || 'python',
    saved_at: new Date().toISOString(),
  };

  await prisma.serverExamSession.update({
    where: { session_id: sessionId },
    data: { answers_json: JSON.stringify(answers) },
  });

  return { status: 'saved', problem_id: problemId };
}

export interface SubmitAnswerPayload {
  problem_id: string;
  code?: string;
  language?: string;
  selected_option?: number | null;
}

/**
 * Final submission of the assessment (POST /exam/submit).
 */
export async function submitExam(
  sessionId: string,
  answers: SubmitAnswerPayload[],
  isAutoSubmit = false
) {
  const session = await getSession(sessionId);
  const email = session?.candidate_email || '';

  let attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });

  const answersObj: Record<string, unknown> = {};
  for (const a of answers) {
    answersObj[a.problem_id] = {
      code: a.code || '',
      language: a.language || 'python',
      selected_option: a.selected_option ?? null,
    };
  }

  if (attempt) {
    await prisma.serverExamSession.update({
      where: { session_id: sessionId },
      data: {
        answers_json: JSON.stringify(answersObj),
        is_completed: true,
      },
    });
  } else {
    await prisma.serverExamSession.create({
      data: {
        id: crypto.randomUUID(),
        session_id: sessionId,
        user_id: session?.user_id || '',
        answers_json: JSON.stringify(answersObj),
        is_completed: true,
      },
    });
  }

  // Record completed in candidateOtp
  if (email) {
    await prisma.candidateOtp.updateMany({
      where: { email: email.toLowerCase() },
      data: { status: 'submitted' }
    });
  }

  return {
    status: 'submitted',
    is_auto_submit: isAutoSubmit,
    submitted_at: new Date().toISOString(),
  };
}
/**
 * Apply time penalty to an active exam session (e.g. 60 seconds for violation)
 */
export async function applyTimePenalty(sessionId: string, penaltySeconds = 60) {
  let attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (!attempt) {
    const session = await getSession(sessionId);
    if (session) {
      attempt = await prisma.serverExamSession.findFirst({
        where: { user_id: session.user_id || '1' },
        orderBy: { start_time: 'desc' }
      });
    }
  }

  if (!attempt) {
    return { status: 'not_found', penalty_seconds: penaltySeconds, remaining_seconds: EXAM_DURATION_SECONDS };
  }

  const currentStart = new Date(attempt.start_time).getTime();
  const adjustedStart = new Date(currentStart - penaltySeconds * 1000);

  await prisma.serverExamSession.update({
    where: { id: attempt.id },
    data: { start_time: adjustedStart }
  });

  const remaining = remainingSecondsFrom(adjustedStart);
  return {
    status: 'penalized',
    penalty_seconds: penaltySeconds,
    remaining_seconds: remaining,
    start_time: adjustedStart.toISOString(),
  };
}