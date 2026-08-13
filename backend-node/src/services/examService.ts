import prisma from '../db/prisma';
import crypto from 'crypto';

/** Total exam duration, mirroring EXAM_DURATION_SECONDS in the frontend. */
export const EXAM_DURATION_SECONDS = 150 * 60;

/**
 * Resolve a login session to the candidate it belongs to.
 * Sessions are created by POST /auth/login (see routes/auth.ts).
 */
export async function getSession(sessionId: string) {
  if (!sessionId) return null;
  return prisma.serverSession.findUnique({ where: { id: sessionId } });
}

/**
 * The candidate's assigned questions (the admin's "Choose Test Type" /
 * "Shuffle Question Set" selection), for the candidate dashboard
 * (GET /exam/summary?session_id=...).
 */
export async function getExamSummary(sessionId: string) {
  const session = await getSession(sessionId);
  const email = session?.candidate_email;
  if (!email) {
    return { total_questions: 0, python_questions: 0, sql_questions: 0, mcq_questions: 0, total_marks: 0, problems: [] };
  }

  const problems = await prisma.candidateSelectedExamProblem.findMany({
    where: { candidate_email: email },
    orderBy: { saved_at: 'asc' },
  });

  return {
    total_questions: problems.length,
    python_questions: problems.filter((p) => p.language === 'python').length,
    sql_questions: problems.filter((p) => p.language === 'sql').length,
    mcq_questions: problems.filter((p) => p.language === 'mcq').length,
    total_marks: problems.reduce((sum, p) => sum + (p.marks || 0), 0),
    problems: problems.map((p) => ({
      id: p.problem_id,
      title: p.title,
      language: p.language,
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
  const session = await getSession(sessionId);
  if (!session) throw new Error('Invalid or expired session.');

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
  const attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (!attempt) throw new Error('Exam has not been started for this session.');
  if (attempt.is_completed) throw new Error('Exam has already been submitted.');

  let answers: Record<string, unknown> = {};
  try {
    answers = JSON.parse(attempt.answers_json || '{}');
  } catch {
    answers = {};
  }

  answers[problemId] = { code, language: language || 'python', saved_at: new Date().toISOString() };

  await prisma.serverExamSession.update({
    where: { session_id: sessionId },
    data: { answers_json: JSON.stringify(answers) },
  });

  return { status: 'saved', problem_id: problemId };
}

/**
 * Final submission. Closes the attempt and writes the Assessment row that
 * the admin Assessment Dashboard reads, scoring from whatever graded
 * Submission rows exist for this candidate.
 */
export async function submitExam(
  sessionId: string,
  answers: Array<{ problem_id: string; code?: string; language: string; selected_option?: number | null }>,
  autoSubmit: boolean
) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Invalid or expired session.');

  const attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (attempt?.is_completed) {
    return { status: 'already_submitted' };
  }

  const email = session.candidate_email || '';
  const now = new Date();
  const startTime = attempt?.start_time || now;
  const timeTakenMin = Math.max(0, Math.round((now.getTime() - startTime.getTime()) / 60000));

  // Close out the attempt and the login session.
  if (attempt) {
    await prisma.serverExamSession.update({
      where: { session_id: sessionId },
      data: { answers_json: JSON.stringify(answers || []), is_completed: true },
    });
  }
  await prisma.serverSession.update({ where: { id: sessionId }, data: { is_active: false } });

  const assigned = await prisma.candidateSelectedExamProblem.findMany({ where: { candidate_email: email } });
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  // Score from graded submissions where they exist; unattempted problems
  // simply contribute zero.
  const submissions = user
    ? await prisma.submission.findMany({ where: { user_id: user.id } })
    : [];
  const bestByProblem = new Map<string, number>();
  for (const s of submissions) {
    const prev = bestByProblem.get(s.problem_id) ?? 0;
    if (s.score > prev) bestByProblem.set(s.problem_id, s.score);
  }

  const scoreFor = (language: string) =>
    assigned
      .filter((p) => p.language === language)
      .reduce((sum, p) => sum + ((bestByProblem.get(p.problem_id) ?? 0) / 100) * (p.marks || 0), 0);

  const pythonScore = scoreFor('python');
  const sqlScore = scoreFor('sql');
  const mcqScore = scoreFor('mcq');
  const overallScore = pythonScore + sqlScore + mcqScore;
  const maxPossible = assigned.reduce((sum, p) => sum + (p.marks || 0), 0);
  const percentage = maxPossible > 0 ? Number(((overallScore / maxPossible) * 100).toFixed(2)) : 0;
  const verdict = percentage >= 70 ? 'Good' : percentage >= 40 ? 'Average' : 'Below Average';

  if (user) {
    await prisma.assessment.create({
      data: {
        user_id: user.id,
        candidate_id: `CAND_${user.id}`,
        name: user.name,
        email: user.email,
        test_location: user.test_location,
        test_date: now.toISOString().slice(0, 10),
        login_time: startTime.toISOString(),
        submit_time: now.toISOString(),
        submission_type: autoSubmit ? 'Auto' : 'Manual',
        time_taken_min: timeTakenMin,
        total_questions: assigned.length,
        python_questions: assigned.filter((p) => p.language === 'python').length,
        sql_questions: assigned.filter((p) => p.language === 'sql').length,
        mcq_questions: assigned.filter((p) => p.language === 'mcq').length,
        python_score: pythonScore,
        sql_score: sqlScore,
        mcq_score: mcqScore,
        overall_score: overallScore,
        max_possible_score: maxPossible,
        overall_percentage: percentage,
        overall_verdict: verdict,
        problem_testcases_json: '{}',
        problem_scores_json: JSON.stringify(Object.fromEntries(bestByProblem)),
        created_at: now.toISOString(),
      },
    });
  }

  return { status: 'submitted', auto_submit: autoSubmit, overall_score: overallScore, verdict };
}
