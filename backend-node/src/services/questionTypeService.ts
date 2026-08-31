import prisma from '../db/prisma';

export interface QuestionTypeRecord {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  table_name: string;
  is_system: number;
  created_at: string;
  count?: number;
}

export function sanitizeSlug(name: string): { slug: string; displayName: string; tableName: string } {
  const trimmed = name.trim();
  let slug = trimmed.toLowerCase();
  
  // Custom language name replacements
  if (slug === 'c++') slug = 'cpp';
  else if (slug === 'c#') slug = 'csharp';
  else slug = slug.replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

  if (!slug) slug = `custom_${Date.now()}`;

  // Capitalize display name cleanly
  const displayName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  const tableName = `${slug}_problems`;

  return { slug, displayName, tableName };
}

export async function ensureQuestionTypesRegistry(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS question_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      table_name TEXT UNIQUE NOT NULL,
      is_system INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  const now = new Date().toISOString();
  await prisma.$executeRawUnsafe(`
    INSERT OR IGNORE INTO question_types (id, name, slug, display_name, table_name, is_system, created_at) VALUES 
      ('qt_python', 'python', 'python', 'Python', 'python_problems', 1, '${now}'),
      ('qt_sql', 'sql', 'sql', 'SQL', 'sql_problems', 1, '${now}'),
      ('qt_mcq', 'mcq', 'mcq', 'MCQ', 'mcq_questions', 1, '${now}')
  `);
}

export async function getQuestionTypes(): Promise<QuestionTypeRecord[]> {
  await ensureQuestionTypesRegistry();
  const types = await prisma.$queryRawUnsafe<QuestionTypeRecord[]>(`
    SELECT * FROM question_types ORDER BY is_system DESC, created_at ASC;
  `);

  const results: QuestionTypeRecord[] = [];
  for (const t of types) {
    let count = 0;
    try {
      const countRes = await prisma.$queryRawUnsafe<Array<{ cnt: number | bigint }>>(`
        SELECT COUNT(*) as cnt FROM "${t.table_name}";
      `);
      if (countRes && countRes[0]) {
        count = Number(countRes[0].cnt);
      }
    } catch {
      count = 0;
    }
    results.push({ ...t, count });
  }

  return results;
}

export async function createQuestionType(name: string): Promise<QuestionTypeRecord> {
  await ensureQuestionTypesRegistry();
  const { slug, displayName, tableName } = sanitizeSlug(name);

  // Check if type already exists
  const existing = await prisma.$queryRawUnsafe<QuestionTypeRecord[]>(`
    SELECT * FROM question_types WHERE slug = ? OR name = ? LIMIT 1;
  `, slug, name.trim().toLowerCase());

  if (existing && existing.length > 0) {
    return existing[0]!;
  }

  const id = `qt_${slug}`;
  const now = new Date().toISOString();

  // 1. Dynamically create the dedicated table in Turso
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Medium',
      marks INTEGER NOT NULL DEFAULT 10,
      time_limit INTEGER NOT NULL DEFAULT 15,
      statement TEXT,
      description TEXT,
      input_format TEXT,
      output_format TEXT,
      sample_input TEXT,
      sample_output TEXT,
      starter_code TEXT,
      test_cases_json TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  // 2. Register in question_types
  await prisma.$executeRawUnsafe(`
    INSERT INTO question_types (id, name, slug, display_name, table_name, is_system, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?);
  `, id, name.trim().toLowerCase(), slug, displayName, tableName, now);

  return {
    id,
    name: name.trim().toLowerCase(),
    slug,
    display_name: displayName,
    table_name: tableName,
    is_system: 0,
    created_at: now,
    count: 0
  };
}

export async function deleteQuestionType(slugOrId: string): Promise<{ status: string; slug: string }> {
  await ensureQuestionTypesRegistry();
  const types = await prisma.$queryRawUnsafe<QuestionTypeRecord[]>(`
    SELECT * FROM question_types WHERE slug = ? OR id = ? LIMIT 1;
  `, slugOrId, slugOrId);

  if (!types || types.length === 0) {
    throw new Error(`Question type '${slugOrId}' not found.`);
  }

  const target = types[0]!;
  if (target.is_system === 1) {
    throw new Error(`Built-in system question type '${target.display_name}' cannot be deleted.`);
  }

  // 1. Get all problem IDs from this table for cascade cleanup
  let problemIds: string[] = [];
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      SELECT id FROM "${target.table_name}";
    `);
    problemIds = rows.map(r => r.id);
  } catch {}

  // 2. Cascade delete belongings: exam selections, candidate selections, submissions, results
  if (problemIds.length > 0) {
    const placeholders = problemIds.map(() => '?').join(',');
    await prisma.$executeRawUnsafe(`
      DELETE FROM selected_exam_problems WHERE problem_id IN (${placeholders}) OR language = ?;
    `, ...problemIds, target.slug).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DELETE FROM candidate_selected_exam_problems WHERE problem_id IN (${placeholders}) OR language = ?;
    `, ...problemIds, target.slug).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DELETE FROM submissions WHERE problem_id IN (${placeholders});
    `, ...problemIds).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DELETE FROM admin_results WHERE problem_id IN (${placeholders});
    `, ...problemIds).catch(() => {});
  } else {
    await prisma.$executeRawUnsafe(`
      DELETE FROM selected_exam_problems WHERE language = ?;
    `, target.slug).catch(() => {});

    await prisma.$executeRawUnsafe(`
      DELETE FROM candidate_selected_exam_problems WHERE language = ?;
    `, target.slug).catch(() => {});
  }

  // 3. Drop the dedicated table from Turso
  await prisma.$executeRawUnsafe(`
    DROP TABLE IF EXISTS "${target.table_name}";
  `);

  // 4. Delete registration from question_types
  await prisma.$executeRawUnsafe(`
    DELETE FROM question_types WHERE id = ?;
  `, target.id);

  return { status: 'deleted', slug: target.slug };
}

function resolveTargetTable(typeSlug: string, fallbackLanguage = ''): { normalized: string; tableName: string } {
  let raw = (typeSlug || fallbackLanguage || 'python').trim().toLowerCase();
  raw = raw.replace(/\$\{[^}]*\}/g, '').replace(/[^a-z0-9_]/g, '');
  raw = raw.replace(/_questions$/, '').replace(/_problems$/, '') || 'python';

  let tableName = `${raw}_problems`;
  if (raw === 'python') tableName = 'python_problems';
  else if (raw === 'sql') tableName = 'sql_problems';
  else if (raw === 'mcq') tableName = 'mcq_questions';

  return { normalized: raw, tableName };
}

export async function getQuestionsByType(typeSlug: string): Promise<any[]> {
  await ensureQuestionTypesRegistry();
  const { normalized, tableName } = resolveTargetTable(typeSlug);

  // Handle MCQ
  if (normalized === 'mcq') {
    const mcqs = await prisma.mCQQuestion.findMany({ orderBy: { created_at: 'desc' } });
    return mcqs.map(q => ({
      id: q.id,
      title: q.title || q.question_title || 'MCQ Question',
      language: 'mcq',
      difficulty: q.difficulty || 'easy',
      marks: q.marks || 10,
      time_limit: q.time || 10,
      statement: q.question || q.question_text || '',
      description: q.question_text || q.question || '',
      options: q.options_json ? JSON.parse(q.options_json) : [q.option_a, q.option_b, q.option_c, q.option_d],
      correct_option: q.correct_option || 'A',
      created_at: q.created_at
    }));
  }

  // Ensure table exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      difficulty TEXT DEFAULT 'Medium',
      marks INTEGER DEFAULT 10,
      time_limit INTEGER DEFAULT 15,
      statement TEXT,
      description TEXT,
      input_format TEXT,
      output_format TEXT,
      sample_input TEXT,
      sample_output TEXT,
      starter_code TEXT,
      test_cases_json TEXT,
      schema_sql TEXT,
      seed_sql TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `).catch(() => {});

  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "${tableName}" WHERE is_active = 1 ORDER BY created_at DESC;
    `);
    return rows.map(r => ({
      ...r,
      test_cases: r.test_cases_json ? JSON.parse(r.test_cases_json) : []
    }));
  } catch (err) {
    console.error(`Error querying questions from ${tableName}:`, err);
    return [];
  }
}

export async function createQuestionUnderType(typeSlug: string, data: any): Promise<any> {
  await ensureQuestionTypesRegistry();
  const { normalized, tableName } = resolveTargetTable(typeSlug, data?.language);

  // Auto-provision table if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${tableName}" (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      difficulty TEXT DEFAULT 'Medium',
      marks INTEGER DEFAULT 10,
      time_limit INTEGER DEFAULT 15,
      statement TEXT,
      description TEXT,
      input_format TEXT,
      output_format TEXT,
      sample_input TEXT,
      sample_output TEXT,
      starter_code TEXT,
      test_cases_json TEXT,
      schema_sql TEXT,
      seed_sql TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
  `);

  const id = data.id || `${normalized.substring(0, 3)}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const testCasesJson = Array.isArray(data.test_cases) ? JSON.stringify(data.test_cases) : (data.test_cases_json || '[]');

  if (tableName === 'python_problems') {
    await prisma.$executeRawUnsafe(`
      INSERT OR REPLACE INTO python_problems (
        id, title, language, difficulty, marks, time_limit, statement, description,
        input_format, output_format, sample_input, sample_output, starter_code, test_cases_json,
        is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
    `,
      id,
      data.title || 'Untitled Problem',
      'python',
      data.difficulty || 'Medium',
      Number(data.marks) || 10,
      Number(data.time_limit) || 15,
      data.statement || data.description || '',
      data.description || data.statement || '',
      typeof data.input_format === 'object' ? JSON.stringify(data.input_format) : (data.input_format || ''),
      typeof data.output_format === 'object' ? JSON.stringify(data.output_format) : (data.output_format || ''),
      data.sample_input || '',
      data.sample_output || '',
      data.starter_code || `// Solution for ${data.title || 'Problem'}\n`,
      testCasesJson,
      now
    );
  } else {
    await prisma.$executeRawUnsafe(`
      INSERT OR REPLACE INTO "${tableName}" (
        id, title, language, difficulty, marks, time_limit, statement, description,
        input_format, output_format, sample_input, sample_output, starter_code, test_cases_json,
        schema_sql, seed_sql, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
    `,
      id,
      data.title || 'Untitled Problem',
      normalized,
      data.difficulty || 'Medium',
      Number(data.marks) || 10,
      Number(data.time_limit) || 15,
      data.statement || data.description || '',
      data.description || data.statement || '',
      typeof data.input_format === 'object' ? JSON.stringify(data.input_format) : (data.input_format || ''),
      typeof data.output_format === 'object' ? JSON.stringify(data.output_format) : (data.output_format || ''),
      data.sample_input || '',
      data.sample_output || '',
      data.starter_code || `// Solution for ${data.title || 'Problem'}\n`,
      testCasesJson,
      data.schema_sql || null,
      data.seed_sql || null,
      now
    );
  }

  return {
    id,
    title: data.title || 'Untitled Problem',
    language: normalized,
    difficulty: data.difficulty || 'Medium',
    marks: Number(data.marks) || 10,
    time_limit: Number(data.time_limit) || 15,
    statement: data.statement || data.description || '',
    description: data.description || data.statement || '',
    input_format: data.input_format || '',
    output_format: data.output_format || '',
    sample_input: data.sample_input || '',
    sample_output: data.sample_output || '',
    starter_code: data.starter_code || '',
    test_cases: Array.isArray(data.test_cases) ? data.test_cases : [],
    test_cases_json: testCasesJson,
    is_active: 1,
    created_at: now
  };
}

export async function deleteQuestionUnderType(typeSlug: string, questionId: string): Promise<{ status: string; id: string }> {
  await ensureQuestionTypesRegistry();
  const normalized = typeSlug.trim().toLowerCase().replace(/_questions$/, '').replace(/_problems$/, '');

  const types = await prisma.$queryRawUnsafe<QuestionTypeRecord[]>(`
    SELECT * FROM question_types WHERE slug = ? OR name = ? LIMIT 1;
  `, normalized, normalized);

  const tableName = types && types.length > 0 ? types[0]!.table_name : `${normalized}_problems`;

  await prisma.$executeRawUnsafe(`
    DELETE FROM "${tableName}" WHERE id = ?;
  `, questionId);

  // Cascade clean from exam selections
  await prisma.$executeRawUnsafe(`
    DELETE FROM selected_exam_problems WHERE problem_id = ?;
  `, questionId).catch(() => {});

  await prisma.$executeRawUnsafe(`
    DELETE FROM candidate_selected_exam_problems WHERE problem_id = ?;
  `, questionId).catch(() => {});

  return { status: 'deleted', id: questionId };
}