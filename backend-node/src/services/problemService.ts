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
      correct_option: q.correct_option || 'A',
      correct_answer: correctIndex,
      difficulty: q.difficulty || 'easy',
      marks: q.marks || 10,
      time: q.time || 10,
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
  const correctOption = data.correct_option || 'A';
  const correctAnswer = typeof data.correct_answer === 'number' ? data.correct_answer : 0;

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
      difficulty: data.difficulty || 'easy',
      marks: Number(data.marks) || 10,
      time: Number(data.time) || 10,
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

export const getAllProblems = async (languageFilter?: string) => {
  if (languageFilter) {
    return await getProblemsByLanguage(languageFilter);
  }

  const pyProbs = await prisma.pythonProblem.findMany({ where: { is_active: 1 } });
  const sqlProbs = await prisma.sqlProblem.findMany({ where: { is_active: 1 } });
  return [...pyProbs, ...sqlProbs];
};

export const getProblemById = async (id: string) => {
  const pyProb = await prisma.pythonProblem.findUnique({ where: { id } });
  if (pyProb) return pyProb;

  const sqlProb = await prisma.sqlProblem.findUnique({ where: { id } });
  if (sqlProb) return sqlProb;

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
