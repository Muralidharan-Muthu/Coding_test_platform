import prisma from '../db/prisma';
import { shuffleCandidateQuestions, getTestTypeSections } from './otpService';
import crypto from 'crypto';

/** Default exam duration fallback in seconds (60 mins) */
export const EXAM_DURATION_SECONDS = 60 * 60;

export async function getCandidateExamDurationSeconds(email: string): Promise<number> {
  if (!email) return EXAM_DURATION_SECONDS;
  const problems = await prisma.candidateSelectedExamProblem.findMany({
    where: { candidate_email: email.trim().toLowerCase() }
  });
  if (!problems || problems.length === 0) return EXAM_DURATION_SECONDS;

  let totalSec = 0;
  for (const p of problems) {
    const isCoding = (p.language || '').toLowerCase() !== 'mcq';
    let t = Number(p.time_limit) || 0;
    if (isCoding && t > 0 && t <= 60) {
      t = t * 60;
    } else if (!t || t <= 0) {
      t = isCoding ? 600 : 30;
    }
    totalSec += t;
  }
  return totalSec > 0 ? totalSec : EXAM_DURATION_SECONDS;
}

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
        is_active: true,
      }
    });
    return session;
  }

  return null;
}

/**
 * Get candidate's selected problem set and overall exam metadata
 * (GET /exam/summary?session_id=...).
 */
export async function getExamSummary(sessionId: string, candidateEmail?: string) {
  const session = await getSession(sessionId);
  let email = session?.candidate_email || candidateEmail;

  if (!email && sessionId) {
    const candidateSession = await prisma.serverSession.findFirst({
      where: { id: sessionId }
    });
    if (candidateSession?.candidate_email) email = candidateSession.candidate_email;
  }

  if (!email) {
    const latestCandidate = await prisma.candidateOtp.findFirst({
      orderBy: { id: 'desc' }
    });
    if (latestCandidate) email = latestCandidate.email;
  }

  if (!email) {
    return {
      total_questions: 0,
      python_questions: 0,
      sql_questions: 0,
      mcq_questions: 0,
      total_marks: 0,
      total_duration_seconds: 3600,
      total_duration_minutes: 60,
      problems: []
    };
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

  let totalDurationSec = 0;
  const formattedProblems = problems.map((p) => {
    const isCoding = (p.language || '').toLowerCase() !== 'mcq';
    let t = Number(p.time_limit) || 0;
    if (isCoding && t > 0 && t <= 60) {
      t = t * 60;
    } else if (!t || t <= 0) {
      t = isCoding ? 600 : 30;
    }
    totalDurationSec += t;
    return {
      id: p.problem_id,
      title: p.title,
      language: (p.language || 'python').toLowerCase(),
      difficulty: p.difficulty,
      marks: p.marks,
      time_limit: t,
    };
  });

  if (totalDurationSec <= 0) totalDurationSec = 3600;

  return {
    total_questions: problems.length,
    python_questions: pythonCount,
    sql_questions: sqlCount,
    mcq_questions: mcqCount,
    total_marks: problems.reduce((sum, p) => sum + (p.marks || 0), 0),
    total_duration_seconds: totalDurationSec,
    total_duration_minutes: Math.ceil(totalDurationSec / 60),
    problems: formattedProblems,
  };
}

async function remainingSecondsFrom(startTime: Date, email?: string): Promise<number> {
  const durationSec = email ? await getCandidateExamDurationSeconds(email) : EXAM_DURATION_SECONDS;
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  return Math.max(0, durationSec - elapsed);
}

/**
 * Begin the timed exam attempt. Idempotent — calling it again for a session
 * that already started returns the existing attempt rather than resetting
 * the candidate's clock.
 */
export async function startExam(sessionId: string) {
  let session = await getSession(sessionId);
  if (!session) {
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

  const remaining = await remainingSecondsFrom(attempt.start_time, session.candidate_email || undefined);

  return {
    status: 'active',
    start_time: attempt.start_time.toISOString(),
    remaining_seconds: remaining,
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

  const remaining = await remainingSecondsFrom(attempt.start_time, session.candidate_email || undefined);
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

/**
 * Retrieve all currently saved answers for this attempt.
 */
export async function getExamAnswers(sessionId: string) {
  const attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (!attempt) return {};
  try {
    return JSON.parse(attempt.answers_json || '{}');
  } catch {
    return {};
  }
}

/**
 * Final submission of the full exam. Marks the attempt completed and
 * persists the answers list.
 */
export async function submitFullExam(
  sessionId: string,
  answersList: Array<{ problem_id: string; code: string; language: string; selected_option?: number | null }>,
  isAutoSubmit = false
) {
  const session = await getSession(sessionId);
  let attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });

  if (!attempt) {
    await startExam(sessionId);
    attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  }

  const existingAnswers: Record<string, any> = {};
  try {
    Object.assign(existingAnswers, JSON.parse(attempt?.answers_json || '{}'));
  } catch {}

  answersList.forEach((a) => {
    existingAnswers[a.problem_id] = {
      code: a.code,
      language: a.language,
      selected_option: a.selected_option,
      saved_at: new Date().toISOString(),
    };
  });

  await prisma.serverExamSession.update({
    where: { session_id: sessionId },
    data: {
      answers_json: JSON.stringify(existingAnswers),
      is_completed: true,
    },
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const emailClean = session?.candidate_email ? session.candidate_email.trim().toLowerCase() : '';

  if (emailClean) {
    // 1. Mark candidate OTP as submitted to enforce single-take policy
    await prisma.candidateOtp.updateMany({
      where: { email: emailClean },
      data: { status: 'submitted' }
    });

    // 2. Ensure User record exists
    let user = await prisma.user.findUnique({ where: { email: emailClean } });
    if (!user) {
      const candidateInfo = await prisma.candidateOtp.findFirst({ where: { email: emailClean } });
      user = await prisma.user.create({
        data: {
          name: candidateInfo?.username || 'Candidate',
          email: emailClean,
          test_location: 'home',
          created_at: nowIso,
        }
      });
    }

    // 3. Calculate Section and Overall Scores
    let assignedProblems = await prisma.candidateSelectedExamProblem.findMany({
      where: { candidate_email: emailClean },
      orderBy: { saved_at: 'asc' }
    });

    const submissions = await prisma.submission.findMany({
      where: { user_id: user.id },
      orderBy: { id: 'desc' }
    });

    const mcqQuestions = await prisma.mCQQuestion.findMany({});
    const mcqMap = new Map(mcqQuestions.map(m => [m.id, m]));

    // If no candidate-specific problems, check global selected exam problems
    if (assignedProblems.length === 0) {
      const globalProblems = await prisma.selectedExamProblem.findMany({ orderBy: { saved_at: 'asc' } });
      if (globalProblems.length > 0) {
        assignedProblems = globalProblems as any;
      }
    }

    let pyCount = 0;
    let sqlCount = 0;
    let mcqCount = 0;
    let pyScoreSum = 0;
    let sqlScoreSum = 0;
    let mcqScoreSum = 0;
    let maxPossibleScore = 0;
    const problemScores: Record<string, number> = {};
    const problemTestcases: Record<string, string> = {};
    const evaluatedIds = new Set<string>();

    for (const p of assignedProblems) {
      evaluatedIds.add(p.problem_id);
      const lang = (p.language || 'python').toLowerCase();
      const pMarks = Number(p.marks) || 10;
      maxPossibleScore += pMarks;

      if (lang === 'python') {
        pyCount++;
        const sub = submissions.find(s => s.problem_id === p.problem_id);
        const ratio = sub ? (sub.passed_tests / (sub.total_tests || 1)) : 0;
        const pts = Math.round(ratio * pMarks * 100) / 100;
        pyScoreSum += pts;
        problemScores[p.problem_id] = pts;
        problemTestcases[p.problem_id] = sub ? `${sub.passed_tests}/${sub.total_tests}` : `0/0`;
      } else if (lang === 'sql') {
        sqlCount++;
        const sub = submissions.find(s => s.problem_id === p.problem_id);
        const ratio = sub ? (sub.passed_tests / (sub.total_tests || 1)) : 0;
        const pts = Math.round(ratio * pMarks * 100) / 100;
        sqlScoreSum += pts;
        problemScores[p.problem_id] = pts;
        problemTestcases[p.problem_id] = sub ? `${sub.passed_tests}/${sub.total_tests}` : `0/0`;
      } else if (lang === 'mcq') {
        mcqCount++;
        const mcqQ = mcqMap.get(p.problem_id);
        const candAns = existingAnswers[p.problem_id];
        let chosenOpt: number | null = null;
        if (candAns) {
          if (typeof candAns.selected_option === 'number') {
            chosenOpt = candAns.selected_option;
          } else if (candAns.code !== undefined && candAns.code !== null && candAns.code !== '') {
            chosenOpt = Number(candAns.code);
          }
        }
        const isCorrect = mcqQ && chosenOpt !== null && chosenOpt === mcqQ.correct_answer;
        const pts = isCorrect ? pMarks : 0;
        mcqScoreSum += pts;
        problemScores[p.problem_id] = pts;
        problemTestcases[p.problem_id] = isCorrect ? '1/1' : '0/1';
      }
    }

    // Also include any submissions that the candidate solved which were not in assignedProblems
    for (const sub of submissions) {
      if (!evaluatedIds.has(sub.problem_id)) {
        evaluatedIds.add(sub.problem_id);
        const pyProb = await prisma.pythonProblem.findUnique({ where: { id: sub.problem_id } });
        const sqlProb = !pyProb ? await prisma.sqlProblem.findUnique({ where: { id: sub.problem_id } }) : null;
        const pMarks = pyProb?.marks || sqlProb?.marks || 10;
        const lang = pyProb ? 'python' : (sqlProb ? 'sql' : 'python');
        maxPossibleScore += pMarks;

        const ratio = sub.total_tests > 0 ? (sub.passed_tests / sub.total_tests) : 0;
        const pts = Math.round(ratio * pMarks * 100) / 100;
        if (lang === 'python') {
          pyCount++;
          pyScoreSum += pts;
        } else {
          sqlCount++;
          sqlScoreSum += pts;
        }
        problemScores[sub.problem_id] = pts;
        problemTestcases[sub.problem_id] = `${sub.passed_tests}/${sub.total_tests}`;
      }
    }

    if (maxPossibleScore === 0) maxPossibleScore = 100;
    const overallScore = Math.round((pyScoreSum + sqlScoreSum + mcqScoreSum) * 100) / 100;
    const overallPercentage = Math.round((overallScore / maxPossibleScore) * 10000) / 100;
    const overallVerdict = overallPercentage >= 75 ? 'Good' : (overallPercentage >= 50 ? 'Average' : 'Below Average');
    const elapsedMinutes = attempt ? Math.max(1, Math.round((now.getTime() - attempt.start_time.getTime()) / 60000)) : 1;

    // 4. Create Assessment Record
    await prisma.assessment.create({
      data: {
        user_id: user.id,
        candidate_id: `CAND_${user.id}`,
        name: user.name,
        email: emailClean,
        test_location: user.test_location || 'home',
        test_date: nowIso.slice(0, 10),
        login_time: attempt?.start_time.toISOString() || nowIso,
        submit_time: nowIso,
        submission_type: isAutoSubmit ? 'Auto' : 'Manual',
        time_taken_min: elapsedMinutes,
        total_questions: assignedProblems.length,
        python_questions: pyCount,
        sql_questions: sqlCount,
        mcq_questions: mcqCount,
        python_score: pyScoreSum,
        sql_score: sqlScoreSum,
        mcq_score: mcqScoreSum,
        overall_score: overallScore,
        max_possible_score: maxPossibleScore,
        overall_percentage: overallPercentage,
        overall_verdict: overallVerdict,
        problem_testcases_json: JSON.stringify(problemTestcases),
        problem_scores_json: JSON.stringify(problemScores),
        created_at: nowIso,
      }
    });
  }

  return {
    status: 'submitted',
    session_id: sessionId,
    is_auto_submit: isAutoSubmit,
    candidate_email: session?.candidate_email || null,
    total_answers: Object.keys(existingAnswers).length,
  };
}

export const submitExam = submitFullExam;

/**
 * Apply penalty seconds (e.g. For tab-switch or face fraud violations)
 */
export async function applyExamTimePenalty(sessionId: string, penaltySeconds = 60) {
  const attempt = await prisma.serverExamSession.findUnique({ where: { session_id: sessionId } });
  if (!attempt) {
    return { status: 'not_found', penalty_seconds: penaltySeconds, remaining_seconds: EXAM_DURATION_SECONDS };
  }

  const session = await getSession(sessionId);
  const totalDuration = session?.candidate_email ? await getCandidateExamDurationSeconds(session.candidate_email) : EXAM_DURATION_SECONDS;
  const currentElapsed = Math.floor((Date.now() - attempt.start_time.getTime()) / 1000);
  const adjustedStartTime = new Date(attempt.start_time.getTime() - penaltySeconds * 1000);

  await prisma.serverExamSession.update({
    where: { session_id: sessionId },
    data: { start_time: adjustedStartTime }
  });

  const updatedElapsed = Math.floor((Date.now() - adjustedStartTime.getTime()) / 1000);
  const remaining = Math.max(0, totalDuration - updatedElapsed);

  return {
    status: 'penalized',
    penalty_seconds: penaltySeconds,
    remaining_seconds: remaining
  };
}

export const applyTimePenalty = applyExamTimePenalty;

