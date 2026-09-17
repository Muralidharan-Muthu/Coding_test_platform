import prisma from '../db/prisma';

export const getMcqQuestions = async () => {
  const mcqs = await prisma.mCQQuestion.findMany({
    orderBy: { created_at: 'desc' }
  });

  return mcqs.map(q => {
    let options: string[] = [];
    if (q.options_json) {
      try {
        options = JSON.parse(q.options_json);
      } catch (e) {
        options = [q.option_a, q.option_b, q.option_c, q.option_d];
      }
    } else {
      options = [q.option_a, q.option_b, q.option_c, q.option_d];
    }

    let correctIndex = q.correct_answer;
    if (correctIndex === null || correctIndex === undefined) {
      const charCode = (q.correct_option || 'A').trim().toUpperCase().charCodeAt(0);
      correctIndex = charCode >= 65 && charCode <= 68 ? charCode - 65 : 0;
    }

    const diff = (q.difficulty || 'easy').toLowerCase();
    const defaultTime = diff === 'hard' ? 60 : diff === 'medium' ? 45 : 30;
    const defaultMarks = diff === 'hard' ? 5 : diff === 'medium' ? 3 : 1;

    const timeVal = typeof q.time === 'number' && q.time > 0 ? q.time : defaultTime;
    const marksVal = typeof q.marks === 'number' && q.marks > 0 ? q.marks : defaultMarks;

    return {
      id: q.id,
      title: q.title || q.question_title || 'MCQ Question',
      question_title: q.question_title || q.title || 'MCQ Question',
      question: q.question || q.question_text || '',
      question_text: q.question_text || q.question || '',
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      options,
      options_json: q.options_json || JSON.stringify(options),
      correct_option: q.correct_option || String.fromCharCode(65 + correctIndex),
      correct_answer: correctIndex,
      difficulty: diff,
      marks: marksVal,
      time: timeVal,
      time_limit: timeVal,
      topic: q.topic || 'Python',
      explanation: q.explanation || '',
      created_at: q.created_at
    };
  });
};

export const createMcqQuestion = async (data: any) => {
  const id = data.id || `mcq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const title = data.title || data.question_title || 'MCQ Question';
  const questionText = data.question_text || data.question || '';
  const options = Array.isArray(data.options) ? data.options : ['A', 'B', 'C', 'D'];
  const optionA = data.option_a || options[0] || '';
  const optionB = data.option_b || options[1] || '';
  const optionC = data.option_c || options[2] || '';
  const optionD = data.option_d || options[3] || '';

  let correctAnswer = 0;
  let correctOption = 'A';

  if (typeof data.correct_answer === 'number') {
    correctAnswer = data.correct_answer;
    correctOption = String.fromCharCode(65 + correctAnswer);
  } else if (typeof data.correct_option === 'string' && data.correct_option.trim()) {
    correctOption = data.correct_option.trim().toUpperCase();
    correctAnswer = Math.max(0, correctOption.charCodeAt(0) - 65);
  }

  const diff = String(data.difficulty || 'easy').toLowerCase();
  const defaultTime = diff === 'hard' ? 60 : diff === 'medium' ? 45 : 30;
  const defaultMarks = diff === 'hard' ? 5 : diff === 'medium' ? 3 : 1;

  const rawTime = data.time_limit !== undefined && data.time_limit !== null ? data.time_limit : data.time;
  const timeVal = Number(rawTime) > 0 ? Number(rawTime) : defaultTime;
  const marksVal = Number(data.marks) > 0 ? Number(data.marks) : defaultMarks;

  const newQuestion = await prisma.mCQQuestion.create({
    data: {
      id,
      title,
      question_title: title,
      question_text: questionText,
      question: questionText,
      option_a: optionA,
      option_b: optionB,
      option_c: optionC,
      option_d: optionD,
      options_json: JSON.stringify([optionA, optionB, optionC, optionD]),
      correct_option: correctOption,
      correct_answer: correctAnswer,
      difficulty: diff,
      marks: marksVal,
      time: timeVal,
      topic: data.topic || 'Python',
      explanation: data.explanation || '',
      created_at: new Date().toISOString()
    }
  });

  return newQuestion;
};

export const deleteMcqQuestion = async (id: string) => {
  await prisma.mCQQuestion.delete({
    where: { id }
  });
  return { status: 'deleted', id };
};

export const getPythonProblems = async () => {
  return await prisma.pythonProblem.findMany({
    where: { is_active: 1 }
  });
};

export const getSqlProblems = async () => {
  return await prisma.sqlProblem.findMany({
    where: { is_active: 1 }
  });
};

export const getProblemsByLanguage = async (language: string) => {
  const langLower = language.toLowerCase();
  if (langLower === 'python' || langLower === 'python_problems') {
    return await getPythonProblems();
  } else if (langLower === 'sql' || langLower === 'sql_problems') {
    return await getSqlProblems();
  } else {
    return await getAllProblems();
  }
};

export const getAllProblems = async (languageFilter?: string): Promise<any[]> => {
  if (languageFilter) {
    return await getProblemsByLanguage(languageFilter);
  }

  const pyProbs = await prisma.pythonProblem.findMany({ where: { is_active: 1 } });
  const sqlProbs = await prisma.sqlProblem.findMany({ where: { is_active: 1 } });
  return [...pyProbs, ...sqlProbs];
};

export const getProblemById = async (id: string) => {
  const pyProb = await prisma.pythonProblem.findUnique({ where: { id } });
  if (pyProb) {
    let testCases = [];
    try { testCases = pyProb.test_cases_json ? JSON.parse(pyProb.test_cases_json) : []; } catch {}
    return { ...pyProb, test_cases: testCases };
  }

  const sqlProb = await prisma.sqlProblem.findUnique({ where: { id } });
  if (sqlProb) {
    let testCases = [];
    try { testCases = sqlProb.test_cases_json ? JSON.parse(sqlProb.test_cases_json) : []; } catch {}
    return { ...sqlProb, test_cases: testCases };
  }

  // Check dynamic custom tables from question_types registry
  try {
    const types = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name FROM question_types WHERE is_system = 0;
    `);
    for (const t of types) {
      const rows = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM "${t.table_name}" WHERE id = ? LIMIT 1;
      `, id);
      if (rows && rows.length > 0) {
        const r = rows[0]!;
        let testCases = [];
        try { testCases = r.test_cases_json ? JSON.parse(r.test_cases_json) : []; } catch {}
        return {
          ...r,
          test_cases: testCases
        };
      }
    }
  } catch {}

  return null;
};

export const createProblem = async (data: any) => {
  const lang = (data.language || 'python').toLowerCase();
  const id = data.id || `${lang === 'sql' ? 'S' : 'P'}_${Date.now()}`;
  const now = new Date().toISOString();

  const commonData = {
    id,
    title: data.title || 'Untitled Problem',
    language: lang,
    difficulty: data.difficulty || 'Medium',
    marks: Number(data.marks) || 10,
    time_limit: Number(data.time_limit) || 15,
    statement: data.statement || data.description || '',
    description: data.description || data.statement || '',
    input_format: typeof data.input_format === 'object' ? JSON.stringify(data.input_format) : (data.input_format || ''),
    output_format: typeof data.output_format === 'object' ? JSON.stringify(data.output_format) : (data.output_format || ''),
    sample_input: data.sample_input || '',
    sample_output: data.sample_output || '',
    starter_code: data.starter_code || '',
    test_cases_json: Array.isArray(data.test_cases) ? JSON.stringify(data.test_cases) : (data.test_cases_json || '[]'),
    is_active: 1,
    created_at: now
  };

  if (lang === 'sql') {
    const sqlData = {
      ...commonData,
      schema_sql: data.schema_sql || '',
      seed_sql: data.seed_sql || ''
    };
    return await prisma.sqlProblem.create({ data: sqlData });
  } else {
    return await prisma.pythonProblem.create({ data: commonData });
  }
};

export const deleteProblem = async (id: string) => {
  await prisma.pythonProblem.delete({ where: { id } }).catch(() => {});
  await prisma.sqlProblem.delete({ where: { id } }).catch(() => {});
  return { status: 'deleted', id };
};

export const getRandomProblems = async (language: string, count: number = 5) => {
  const lang = (language || 'python').toLowerCase();
  const problems = lang === 'sql'
    ? await prisma.sqlProblem.findMany({ where: { is_active: 1 } })
    : await prisma.pythonProblem.findMany({ where: { is_active: 1 } });

  const shuffled = [...problems];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }
  return shuffled.slice(0, count);
};

export const replaceRandomProblem = async (problemId: string, language: string) => {
  const lang = (language || 'python').toLowerCase();
  const problems = lang === 'sql'
    ? await prisma.sqlProblem.findMany({ where: { is_active: 1 } })
    : await prisma.pythonProblem.findMany({ where: { is_active: 1 } });

  const current = problems.find(p => p.id === problemId);
  const remaining = problems.filter(p => p.id !== problemId);

  if (remaining.length === 0) {
    return { replaced: current || null, new: current || null };
  }

  const randomIndex = Math.floor(Math.random() * remaining.length);
  const newProblem = remaining[randomIndex];

  return { replaced: current || null, new: newProblem };
};

export const getSelectedExamProblems = async (candidateEmail?: string) => {
  if (candidateEmail) {
    const candidateClean = candidateEmail.trim().toLowerCase();
    const candidate = await prisma.candidateOtp.findFirst({ where: { email: candidateClean } });
    const selected = await prisma.candidateSelectedExamProblem.findMany({
      where: { candidate_email: candidateClean }
    });
    return {
      candidate: candidate ? {
        username: candidate.username,
        email: candidate.email,
        test_type: candidate.test_type,
        test_type_label: candidate.test_type,
        source: 'candidate_shuffle'
      } : null,
      problems: selected
    };
  }

  const globalSelected = await prisma.selectedExamProblem.findMany({});
  return { candidate: null, problems: globalSelected };
};

export const publishSelectedExamProblems = async (problems: any[]) => {
  await prisma.selectedExamProblem.deleteMany({});
  const now = new Date().toISOString();
  for (const p of problems) {
    await prisma.selectedExamProblem.create({
      data: {
        problem_id: p.id,
        language: p.language || 'python',
        difficulty: p.difficulty || 'Medium',
        marks: Number(p.marks) || 10,
        time_limit: Number(p.time_limit) || 15,
        title: p.title || 'Untitled Problem',
        saved_at: now
      }
    });
  }
  return { status: 'published', count: problems.length };
};
