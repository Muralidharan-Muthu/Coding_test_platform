import prisma from '../db/prisma';
import ExcelJS from 'exceljs';

export interface AssessmentFilters {
  date_from?: string;
  date_to?: string;
  verdict?: string;
  submission_type?: string;
  test_location?: string;
}

function safeJsonParse(value: string | null | undefined, fallback: any) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Build a Prisma `where` clause for the Assessment model from the
 * dashboard's filter bar (date range, verdict, submission type, location).
 */
function buildAssessmentWhere(filters: AssessmentFilters = {}) {
  const where: Record<string, unknown> = {};

  if (filters.date_from || filters.date_to) {
    where.test_date = {
      ...(filters.date_from ? { gte: filters.date_from } : {}),
      ...(filters.date_to ? { lte: filters.date_to } : {}),
    };
  }
  if (filters.verdict && filters.verdict !== 'All') {
    where.overall_verdict = filters.verdict;
  }
  if (filters.submission_type && filters.submission_type !== 'All') {
    // SQLite provider: Prisma's `mode: 'insensitive'` isn't supported here,
    // so match exactly against the app-controlled values ("Manual"/"Auto").
    where.submission_type = filters.submission_type;
  }
  if (filters.test_location && filters.test_location !== 'All') {
    where.test_location = filters.test_location;
  }

  return where;
}

/**
 * Plain assessment rows matching the filters (GET /api/assessment/results).
 */
export async function getAssessmentResults(filters: AssessmentFilters = {}) {
  const where = buildAssessmentWhere(filters);
  const rows = await prisma.assessment.findMany({ where, orderBy: { created_at: 'desc' } });
  return rows.map((row) => ({
    ...row,
    problem_testcases: safeJsonParse(row.problem_testcases_json, {}),
    problem_scores: safeJsonParse(row.problem_scores_json, {}),
  }));
}

/**
 * Assessment rows enriched with each candidate's proctoring violation
 * logs, for the Assessment Dashboard's "Trust & Proctoring" table
 * (GET /api/reports/proctoring/).
 *
 * Changes from original:
 * - Includes `test_type` from `candidate_otp` so the frontend knows which
 *   sections (Python, SQL, MCQ) the candidate was assigned.
 * - Aggregates proctoring logs into admin-friendly category summaries
 *   instead of returning hundreds of raw per-second events.
 */
export async function getProctoringReportsForDashboard(filters: AssessmentFilters = {}) {
  const where = buildAssessmentWhere(filters);
  const rows = await prisma.assessment.findMany({ where, orderBy: { created_at: 'desc' } });
  if (rows.length === 0) return [];

  // ── Fetch test_type for every candidate from candidate_otp ──────────
  const allEmails = [...new Set(rows.map(r => r.email).filter(Boolean))];
  const candidateOtps = allEmails.length > 0
    ? await prisma.candidateOtp.findMany({
        where: { email: { in: allEmails } },
        select: { email: true, test_type: true },
      })
    : [];
  const testTypeByEmail = new Map(candidateOtps.map(c => [c.email.toLowerCase(), c.test_type || 'both']));

  // ── Build full set of possible candidate identifiers for log matching ──
  const candidateKeys = new Set<string>();
  rows.forEach((row) => {
    if (row.candidate_id) {
      candidateKeys.add(row.candidate_id);
      const raw = row.candidate_id.replace(/^CAND_/i, '');
      if (raw) candidateKeys.add(raw);
    }
    if (row.user_id) {
      candidateKeys.add(String(row.user_id));
      candidateKeys.add(`CAND_${row.user_id}`);
    }
    if (row.email) candidateKeys.add(row.email);
    if (row.name) candidateKeys.add(row.name);
  });

  const allKeys = Array.from(candidateKeys).filter(Boolean);

  const logs = allKeys.length
    ? await prisma.proctoringLog.findMany({
        where: {
          OR: [
            { candidate_id: { in: allKeys } },
            { exam_id: { in: allKeys } },
          ],
        },
        orderBy: { timestamp: 'asc' },
      })
    : [];

  return rows.map((row) => {
    const rowCandId = row.candidate_id || '';
    const rawId = rowCandId.replace(/^CAND_/i, '');
    const userIdStr = row.user_id ? String(row.user_id) : '';

    const startWindow = row.login_time ? new Date(row.login_time) : null;
    const endWindow = (row.submit_time || row.created_at) ? new Date(row.submit_time || row.created_at) : null;

    const matchingLogs = logs.filter((log) => {
      const logCand = log.candidate_id || '';
      const logExam = log.exam_id || '';
      const isCandMatch = (
        logCand === rowCandId ||
        (rawId && logCand === rawId) ||
        (userIdStr && (logCand === userIdStr || logCand === `CAND_${userIdStr}`)) ||
        (row.email && logCand === row.email) ||
        (rowCandId && logExam === rowCandId) ||
        (userIdStr && logExam === userIdStr)
      );
      if (!isCandMatch) return false;

      // Only match logs that occurred during this specific assessment attempt
      if (startWindow && endWindow && !Number.isNaN(startWindow.getTime()) && !Number.isNaN(endWindow.getTime())) {
        const logTime = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);
        if (logTime < startWindow || logTime > endWindow) return false;
      }
      return true;
    });

    // ── Aggregate logs into admin-friendly categories ──────────────
    // Filter out pure informational / noise events
    const NOISE_TYPES = new Set(['FACE_DETECTED', 'WINDOW_FOCUS', 'AI_SCAN_CLEAN']);
    const significantLogs = matchingLogs.filter(l => !NOISE_TYPES.has(l.violation_type));

    // Group by violation_type and deduplicate rapid consecutive events
    // (e.g. 50 NO_FACE_WARNING events in 30 seconds = 1 incident)
    const INCIDENT_GAP_MS = 30_000; // 30 seconds gap = new incident
    const incidentsByType: Record<string, { count: number; first_ts: Date; last_ts: Date; message: string }[]> = {};

    for (const log of significantLogs) {
      const type = log.violation_type;
      if (!incidentsByType[type]) incidentsByType[type] = [];
      const incidents = incidentsByType[type];
      const lastIncident = incidents[incidents.length - 1];
      const ts = log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp);

      if (lastIncident && (ts.getTime() - lastIncident.last_ts.getTime()) < INCIDENT_GAP_MS) {
        // Merge into existing incident
        lastIncident.count++;
        lastIncident.last_ts = ts;
      } else {
        // New incident
        incidents.push({ count: 1, first_ts: ts, last_ts: ts, message: log.message || type });
      }
    }

    // Categorize incidents
    let faceViolations = 0;
    let browserViolations = 0;
    let headTurnViolations = 0;
    const FACE_TYPES = new Set(['NO_FACE', 'NO_FACE_WARNING', 'MULTIPLE_FACES', 'WEBCAM_ERROR']);
    const BROWSER_TYPES = new Set(['TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'COPY', 'PASTE', 'CUT', 'CONTEXT_MENU', 'DEVTOOLS_ATTEMPT', 'SCREENSHOT_ATTEMPT', 'RESTRICTED_KEY', 'APP_SWITCH_ATTEMPT']);
    const HEAD_TYPES = new Set(['HEAD_LEFT', 'HEAD_RIGHT', 'HEAD_UP', 'HEAD_DOWN']);

    // Build aggregated log entries for the modal
    const aggregatedLogs: { violation_type: string; message: string; count: number; timestamp: string; category: string }[] = [];

    for (const [type, incidents] of Object.entries(incidentsByType)) {
      const totalIncidents = incidents.length;
      if (FACE_TYPES.has(type)) faceViolations += totalIncidents;
      else if (BROWSER_TYPES.has(type)) browserViolations += totalIncidents;
      else if (HEAD_TYPES.has(type)) headTurnViolations += totalIncidents;
      else browserViolations += totalIncidents; // default

      const category = FACE_TYPES.has(type) ? 'face' : BROWSER_TYPES.has(type) ? 'browser' : HEAD_TYPES.has(type) ? 'head_pose' : 'other';

      // Create a single aggregated entry per violation type
      const firstIncident = incidents[0];
      aggregatedLogs.push({
        violation_type: type,
        message: humanizeViolationType(type),
        count: totalIncidents,
        timestamp: firstIncident.first_ts.toISOString(),
        category,
      });
    }

    // Sort: browser first (actionable), then face, then head pose
    const categoryOrder: Record<string, number> = { browser: 0, face: 1, head_pose: 2, other: 3 };
    aggregatedLogs.sort((a, b) => (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3));

    const totalSignificant = faceViolations + browserViolations + headTurnViolations;

    // Compute trust verdict using weighted scoring
    // Browser violations are weighted highest (intentional cheating), face next, head lowest
    const trustDeduction = browserViolations * 15 + faceViolations * 5 + headTurnViolations * 3;
    const trustScore = Math.max(0, 100 - trustDeduction);
    let trustVerdict = 'Clean';
    if (trustDeduction >= 40) trustVerdict = 'High Risk';
    else if (trustDeduction >= 20) trustVerdict = 'Suspicious';
    else if (trustDeduction > 0) trustVerdict = 'Minor Issues';

    // Determine test_type for this row accurately from the recorded question counts
    let testType = 'both';
    const pyQ = Number(row.python_questions) || 0;
    const sqlQ = Number(row.sql_questions) || 0;
    const mcqQ = Number(row.mcq_questions) || 0;
    if (mcqQ > 0 && pyQ === 0 && sqlQ === 0) {
      testType = 'mcq';
    } else if (pyQ > 0 && sqlQ === 0 && mcqQ === 0) {
      testType = 'python';
    } else if (sqlQ > 0 && pyQ === 0 && mcqQ === 0) {
      testType = 'sql';
    } else if ((pyQ > 0 || sqlQ > 0) && mcqQ === 0) {
      testType = 'coding';
    } else if (mcqQ > 0 && (pyQ > 0 || sqlQ > 0)) {
      testType = 'both';
    } else {
      const emailLower = (row.email || '').toLowerCase();
      testType = testTypeByEmail.get(emailLower) || 'both';
    }

    return {
      ...row,
      test_type: testType,
      problem_testcases: safeJsonParse(row.problem_testcases_json, {}),
      problem_scores: safeJsonParse(row.problem_scores_json, {}),
      logs: aggregatedLogs,
      logs_summary: {
        face_violations: faceViolations,
        browser_violations: browserViolations,
        head_turn_violations: headTurnViolations,
        total_significant: totalSignificant,
        trust_score: trustScore,
        trust_verdict: trustVerdict,
      },
    };
  });
}

/**
 * Convert a raw violation type string to a human-readable label.
 */
function humanizeViolationType(type: string): string {
  const map: Record<string, string> = {
    TAB_SWITCH: 'Browser tab switched during exam',
    WINDOW_BLUR: 'Browser window lost focus',
    FULLSCREEN_EXIT: 'Exited fullscreen mode',
    COPY: 'Copy action detected',
    PASTE: 'Paste action detected',
    CUT: 'Cut action detected',
    CONTEXT_MENU: 'Right-click context menu opened',
    DEVTOOLS_ATTEMPT: 'Developer tools access attempted',
    SCREENSHOT_ATTEMPT: 'Screenshot attempt detected',
    RESTRICTED_KEY: 'Restricted keyboard shortcut used',
    APP_SWITCH_ATTEMPT: 'Application switch attempted',
    NO_FACE: 'Face not visible to camera',
    NO_FACE_WARNING: 'Face temporarily out of view',
    MULTIPLE_FACES: 'Multiple faces detected in frame',
    WEBCAM_ERROR: 'Webcam feed interrupted',
    HEAD_LEFT: 'Head turned left (looking away)',
    HEAD_RIGHT: 'Head turned right (looking away)',
    HEAD_UP: 'Head tilted up (looking away)',
    HEAD_DOWN: 'Head tilted down (looking away)',
  };
  return map[type] || type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Persist a new assessment result (POST /api/assessment/results).
 */
export async function createAssessmentResult(data: any) {
  if (!data?.email || !String(data.email).trim()) {
    throw new Error('Candidate email is required to record assessment result.');
  }
  const emailClean = String(data.email).trim().toLowerCase();
  const now = new Date().toISOString();

  let user = await prisma.user.findUnique({ where: { email: emailClean } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: data.name || 'Candidate',
        email: emailClean,
        test_location: data.test_location || 'home',
        created_at: now,
      },
    });
  }

  return prisma.assessment.create({
    data: {
      user_id: user.id,
      candidate_id: data.candidate_id || `C_${Date.now()}`,
      name: data.name || user.name,
      email: data.email,
      phone: data.phone || null,
      test_location: data.test_location || user.test_location || 'home',
      test_date: data.test_date || now.slice(0, 10),
      login_time: data.login_time || now,
      submit_time: data.submit_time || now,
      submission_type: data.submission_type || 'Manual',
      time_taken_min: Number(data.time_taken_min) || 0,
      total_questions: Number(data.total_questions) || 0,
      python_questions: Number(data.python_questions) || 0,
      sql_questions: Number(data.sql_questions) || 0,
      mcq_questions: Number(data.mcq_questions) || 0,
      python_score: Number(data.python_score) || 0,
      sql_score: Number(data.sql_score) || 0,
      mcq_score: Number(data.mcq_score) || 0,
      overall_score: Number(data.overall_score) || 0,
      max_possible_score: data.max_possible_score != null ? Number(data.max_possible_score) : null,
      overall_percentage: Number(data.overall_percentage) || 0,
      overall_verdict: data.overall_verdict || 'Pending',
      problem_testcases_json: JSON.stringify(data.problem_testcases || {}),
      problem_scores_json: JSON.stringify(data.problem_scores || {}),
      created_at: now,
    },
  });
}

/**
 * All submissions or questions for a candidate in an assessment,
 * enriched with problem title, language, difficulty, options/code,
 * for the Code/MCQ Review modal (GET /api/candidates/:email/submissions).
 */
export async function getCandidateSubmissions(email: string, assessmentId?: string | number) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { submissions: [] };

  let targetAssessment: any = null;
  if (assessmentId) {
    targetAssessment = await prisma.assessment.findUnique({ where: { id: Number(assessmentId) } });
  } else {
    // Look up latest assessment for this candidate
    targetAssessment = await prisma.assessment.findFirst({
      where: { user_id: user.id },
      orderBy: { id: 'desc' }
    });
  }

  // If we have an assessment record, inspect its actual questions and test type
  if (targetAssessment) {
    const testcases = safeJsonParse(targetAssessment.problem_testcases_json, {});
    const scores = safeJsonParse(targetAssessment.problem_scores_json, {});
    const assignedProblemIds = [...new Set([...Object.keys(testcases), ...Object.keys(scores)])];

    if (assignedProblemIds.length > 0) {
      const mcqIds = assignedProblemIds.filter(id => id.startsWith('mcq_'));
      const codingIds = assignedProblemIds.filter(id => !id.startsWith('mcq_'));

      const results: any[] = [];

      // ── Process MCQ Questions ──
      if (mcqIds.length > 0) {
        // Find the candidate's answers from serverExamSession
        const examSessions = await prisma.serverExamSession.findMany({
          where: { user_id: String(user.id) },
          orderBy: { start_time: 'desc' }
        });
        let candidateAnswers: Record<string, any> = {};
        for (const es of examSessions) {
          try {
            const parsed = JSON.parse(es.answers_json || '{}');
            if (mcqIds.some(id => id in parsed)) {
              candidateAnswers = parsed;
              break;
            }
          } catch {}
        }

        const mcqQuestions = await prisma.mCQQuestion.findMany({
          where: { id: { in: mcqIds } }
        });

        for (const q of mcqQuestions) {
          const ans = candidateAnswers[q.id];
          let chosenOpt: number | null = null;
          if (ans) {
            if (typeof ans.selected_option === 'number') chosenOpt = ans.selected_option;
            else if (ans.code !== undefined && ans.code !== null && ans.code !== '') chosenOpt = Number(ans.code);
          }
          const isCorrect = testcases[q.id] === '1/1' || (chosenOpt !== null && chosenOpt === q.correct_answer);
          const score = scores[q.id] !== undefined ? scores[q.id] : (isCorrect ? (q.marks || 10) : 0);
          const optLetters = ['A', 'B', 'C', 'D'];
          const optTexts = [q.option_a, q.option_b, q.option_c, q.option_d];

          results.push({
            submission_id: `mcq_${q.id}`,
            problem_id: q.id,
            problem_title: q.title || q.question_text,
            language: 'mcq',
            category: 'MCQ',
            difficulty: q.difficulty || 'Easy',
            marks: q.marks || 10,
            score: score,
            passed_tests: isCorrect ? 1 : 0,
            total_tests: 1,
            verdict: isCorrect ? 'Accepted' : 'Wrong Answer',
            execution_time_ms: 0,
            time_taken: 0,
            created_at: targetAssessment.submit_time || targetAssessment.created_at,
            question_text: q.question_text,
            options: optTexts,
            selected_option: chosenOpt,
            correct_answer: q.correct_answer,
            explanation: q.explanation || '',
            code: [
              `// MCQ Question: ${q.title || 'Multiple Choice Question'}`,
              `// Candidate Answer: ${chosenOpt !== null ? `${optLetters[chosenOpt]}) ${optTexts[chosenOpt]}` : 'Not answered'}`,
              `// Correct Answer:   ${q.correct_answer !== null && q.correct_answer !== undefined ? `${optLetters[q.correct_answer]}) ${optTexts[q.correct_answer]}` : 'N/A'}`,
              `// Result: ${isCorrect ? 'Correct (Marks Awarded)' : 'Incorrect (0 Marks)'}`,
              '',
              `${q.question_text}`,
              '',
              `A) ${q.option_a}`,
              `B) ${q.option_b}`,
              `C) ${q.option_c}`,
              `D) ${q.option_d}`,
              q.explanation ? `\nExplanation:\n${q.explanation}` : ''
            ].join('\n')
          });
        }
      }

      // ── Process Coding Questions ──
      if (codingIds.length > 0) {
        const [pyProblems, sqlProblems, customProblems] = await Promise.all([
          prisma.pythonProblem.findMany({ where: { id: { in: codingIds } } }),
          prisma.sqlProblem.findMany({ where: { id: { in: codingIds } } }),
          prisma.customProblem.findMany({ where: { id: { in: codingIds } } }),
        ]);

        const problemById = new Map<string, any>();
        for (const p of [...pyProblems, ...sqlProblems, ...customProblems]) {
          problemById.set(p.id, p);
        }

        const submissions = await prisma.submission.findMany({
          where: { user_id: user.id, problem_id: { in: codingIds } },
          orderBy: { created_at: 'desc' },
        });

        // Map by problem_id (get latest submission per problem)
        const subByProblem = new Map<string, any>();
        for (const s of submissions) {
          if (!subByProblem.has(s.problem_id)) {
            subByProblem.set(s.problem_id, s);
          }
        }

        for (const pid of codingIds) {
          const problem = problemById.get(pid);
          const sub = subByProblem.get(pid);
          const passed = sub?.passed_tests ?? (testcases[pid] ? parseInt(String(testcases[pid]).split('/')[0]) || 0 : 0);
          const total = sub?.total_tests ?? (testcases[pid] ? parseInt(String(testcases[pid]).split('/')[1]) || 1 : 1);
          const score = scores[pid] ?? (sub?.score || 0);

          results.push({
            submission_id: sub?.id ? `sub_${sub.id}` : `prob_${pid}`,
            problem_id: pid,
            problem_title: problem?.title || pid,
            language: problem?.language || (pid.startsWith('sql_') ? 'sql' : 'python'),
            category: (problem?.language || (pid.startsWith('sql_') ? 'SQL' : 'Python')).toUpperCase(),
            difficulty: problem?.difficulty || 'Medium',
            marks: problem?.marks || 10,
            code: sub?.code || '// No source code submitted for this problem',
            passed_tests: passed,
            total_tests: total,
            score: score,
            verdict: sub?.verdict || (passed === total && total > 0 ? 'Accepted' : 'Failed'),
            execution_time_ms: sub?.execution_time_ms || 0,
            time_taken: sub?.time_taken || 0,
            created_at: sub?.created_at || targetAssessment.created_at,
          });
        }
      }

      if (results.length > 0) {
        return { submissions: results };
      }
    }
  }

  // Fallback to lifetime submissions if no assessment found
  const submissions = await prisma.submission.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: 'desc' },
  });
  if (submissions.length === 0) return { submissions: [] };

  const problemIds = [...new Set(submissions.map((s) => s.problem_id))];
  const [pyProblems, sqlProblems, customProblems] = await Promise.all([
    prisma.pythonProblem.findMany({ where: { id: { in: problemIds } } }),
    prisma.sqlProblem.findMany({ where: { id: { in: problemIds } } }),
    prisma.customProblem.findMany({ where: { id: { in: problemIds } } }),
  ]);

  const problemById = new Map<string, { title: string; language: string; difficulty: string; marks: number }>();
  for (const p of [...pyProblems, ...sqlProblems, ...customProblems]) {
    problemById.set(p.id, { title: p.title, language: p.language, difficulty: p.difficulty, marks: p.marks });
  }

  return {
    submissions: submissions.map((s) => {
      const problem = problemById.get(s.problem_id);
      return {
        submission_id: s.id,
        problem_id: s.problem_id,
        problem_title: problem?.title || s.problem_id,
        language: problem?.language || 'python',
        difficulty: problem?.difficulty || 'Medium',
        marks: problem?.marks || 0,
        code: s.code,
        passed_tests: s.passed_tests,
        total_tests: s.total_tests,
        score: s.score,
        verdict: s.verdict,
        execution_time_ms: s.execution_time_ms,
        time_taken: s.time_taken,
        created_at: s.created_at,
      };
    }),
  };
}

/**
 * Build an .xlsx workbook of the filtered assessment results, mirroring
 * the dashboard's Test Summary / Trust & Proctoring / Difficulty tables.
 */
export async function exportAssessmentResultsWorkbook(filters: AssessmentFilters = {}): Promise<Buffer> {
  const rows = await getProctoringReportsForDashboard(filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CodeFlow Admin';
  workbook.created = new Date();

  const summary = workbook.addWorksheet('Test Summary');
  summary.columns = [
    { header: 'Candidate ID', key: 'candidate_id', width: 14 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Test Date', key: 'test_date', width: 14 },
    { header: 'Login', key: 'login_time', width: 14 },
    { header: 'Submit', key: 'submit_time', width: 14 },
    { header: 'Type', key: 'submission_type', width: 12 },
    { header: 'Time Taken (min)', key: 'time_taken_min', width: 16 },
    { header: 'Location', key: 'test_location', width: 12 },
    { header: 'Python Q', key: 'python_questions', width: 10 },
    { header: 'SQL Q', key: 'sql_questions', width: 10 },
    { header: 'MCQ Q', key: 'mcq_questions', width: 10 },
    { header: 'Python Score', key: 'python_score', width: 12 },
    { header: 'SQL Score', key: 'sql_score', width: 12 },
    { header: 'MCQ Score', key: 'mcq_score', width: 12 },
    { header: 'Overall Score', key: 'overall_score', width: 14 },
    { header: 'Verdict', key: 'overall_verdict', width: 16 },
  ];
  summary.getRow(1).font = { bold: true };
  for (const row of rows) summary.addRow(row);

  const trust = workbook.addWorksheet('Trust & Proctoring');
  trust.columns = [
    { header: 'Candidate ID', key: 'candidate_id', width: 14 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Unique Logs', key: 'unique_logs', width: 12 },
    { header: 'Total Logs', key: 'total_logs', width: 12 },
    { header: 'Violation Types', key: 'violation_types', width: 40 },
  ];
  trust.getRow(1).font = { bold: true };
  for (const row of rows) {
    const logs = row.logs || [];
    const seen = new Set(logs.map((l: any) => l.violation_type));
    trust.addRow({
      candidate_id: row.candidate_id,
      name: row.name,
      unique_logs: seen.size,
      total_logs: logs.length,
      violation_types: [...seen].join(', '),
    });
  }

  const difficulty = workbook.addWorksheet('Difficulty Breakdown');
  difficulty.columns = [
    { header: 'Candidate ID', key: 'candidate_id', width: 14 },
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Easy Solved', key: 'easy', width: 12 },
    { header: 'Medium Solved', key: 'medium', width: 14 },
    { header: 'Hard Solved', key: 'hard', width: 12 },
  ];
  difficulty.getRow(1).font = { bold: true };
  for (const row of rows) {
    const tc = row.problem_testcases || {};
    difficulty.addRow({
      candidate_id: row.candidate_id,
      name: row.name,
      easy: `${tc.easy_solved || 0}/${tc.easy_total || 0}`,
      medium: `${tc.medium_solved || 0}/${tc.medium_total || 0}`,
      hard: `${tc.hard_solved || 0}/${tc.hard_total || 0}`,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Seed a single sample assessment for local/dev testing of the dashboard.
 */
export async function initSampleData() {
  const now = new Date().toISOString();
  const email = `sample.candidate+${Date.now()}@example.com`;

  const user = await prisma.user.create({
    data: { name: 'Sample Candidate', email, test_location: 'home', created_at: now },
  });

  const assessment = await prisma.assessment.create({
    data: {
      user_id: user.id,
      candidate_id: `C_${user.id}`,
      name: user.name,
      email: user.email,
      test_location: 'home',
      test_date: now.slice(0, 10),
      login_time: now,
      submit_time: now,
      submission_type: 'Manual',
      time_taken_min: 45,
      total_questions: 10,
      python_questions: 5,
      sql_questions: 5,
      mcq_questions: 0,
      python_score: 40,
      sql_score: 35,
      mcq_score: 0,
      overall_score: 75,
      max_possible_score: 100,
      overall_percentage: 75,
      overall_verdict: 'Good',
      problem_testcases_json: JSON.stringify({ easy_solved: 3, easy_total: 4, medium_solved: 3, medium_total: 4, hard_solved: 1, hard_total: 2 }),
      problem_scores_json: JSON.stringify({ P1_py: 5, P2_py: 4, P1_sql: 5, P2_sql: 3 }),
      created_at: now,
    },
  });

  return { status: 'created', assessment };
}
