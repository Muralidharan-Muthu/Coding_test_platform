import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMcqQuestions,
  createMcqQuestion,
  deleteMcqQuestion,
  getAllProblems,
  getProblemById,
} from '../../services/problemService';

describe('Problem Service - Unit Tests', () => {
  let createdMcqId = '';

  it('should retrieve MCQ questions and verify standardized shape', async () => {
    const questions = await getMcqQuestions();
    assert.ok(Array.isArray(questions));
    if (questions.length > 0) {
      const q = questions[0];
      assert.ok(q.id);
      assert.ok(q.title);
      assert.ok(Array.isArray(q.options));
      assert.ok(typeof q.correct_answer === 'number');
    }
  });

  it('should create an MCQ question with option array normalization', async () => {
    const uniqueTitle = `Unit Test MCQ ${Date.now()}`;
    const question = await createMcqQuestion({
      title: uniqueTitle,
      question: 'Which of the following is immutable in Python?',
      options: ['List', 'Dictionary', 'Tuple', 'Set'],
      correct_answer: 2,
      difficulty: 'medium',
      marks: 3,
      time: 45,
      topic: 'Python',
      explanation: 'Tuples cannot be modified after creation.'
    });

    assert.ok(question.id);
    createdMcqId = question.id;
    assert.strictEqual(question.title, uniqueTitle);
    assert.strictEqual(question.correct_answer, 2);
    assert.strictEqual(question.correct_option, 'C');
  });

  it('should delete the created MCQ question', async () => {
    if (createdMcqId) {
      const res = await deleteMcqQuestion(createdMcqId);
      assert.strictEqual(res.status, 'deleted');
    }
  });

  it('should retrieve problem by language', async () => {
    const pyProbs = await getAllProblems('python');
    assert.ok(Array.isArray(pyProbs));
    const sqlProbs = await getAllProblems('sql');
    assert.ok(Array.isArray(sqlProbs));
  });
});
