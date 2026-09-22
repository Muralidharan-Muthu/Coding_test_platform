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
 */
export async function getProctoringReportsForDashboard(filters: AssessmentFilters = {}) {
  const where = buildAssessmentWhere(filters);
  const rows = await prisma.assessment.findMany({ where, orderBy: { created_at: 'desc' } });
  if (rows.length === 0) return [];

  // Build full set of possible candidate identifiers
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

    const matchingLogs = logs.filter((log) => {
      const logCand = log.candidate_id || '';
      const logExam = log.exam_id || '';
      return (
        logCand === rowCandId ||
        (rawId && logCand === rawId) ||
        (userIdStr && (logCand === userIdStr || logCand === `CAND_${userIdStr}`)) ||
        (row.email && logCand === row.email) ||
        (rowCandId && logExam === rowCandId) ||
        (userIdStr && logExam === userIdStr)
      );
    });

    return {
      ...row,
      problem_testcases: safeJsonParse(row.problem_testcases_json, {}),
      problem_scores: safeJsonParse(row.problem_scores_json, {}),
      logs: matchingLogs.map((log) => ({
        id: log.id,
        violation_type: log.violation_type,
        message: log.message,
        timestamp: log.timestamp,
      })),
    };
  });
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
 * All submissions for a candidate, enriched with problem title/language/
 * difficulty/marks, for the Code Review modal
 * (GET /api/candidates/:email/submissions).
 */
export async function getCandidateSubmissions(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { submissions: [] };

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
