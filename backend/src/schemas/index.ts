import { z } from 'zod';

export const LoginRequestSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string().optional().default(''),
  otp: z.string().optional().default(''),
  test_location: z.string().optional().default('home'),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const RunCodeRequestSchema = z.object({
  code: z.string(),
  custom_input: z.string().optional().default(''),
});
export type RunCodeRequest = z.infer<typeof RunCodeRequestSchema>;

export const SubmitCodeRequestSchema = z.object({
  session_id: z.string(),
  problem_id: z.string(),
  code: z.string(),
  time_taken: z.number().optional().default(0),
});
export type SubmitCodeRequest = z.infer<typeof SubmitCodeRequestSchema>;

export const PreviewSubmitCodeRequestSchema = z.object({
  problem_id: z.string(),
  code: z.string(),
});
export type PreviewSubmitCodeRequest = z.infer<typeof PreviewSubmitCodeRequestSchema>;

export const RunSqlRequestSchema = z.object({
  problem_id: z.string(),
  query: z.string(),
  dialect: z.string().optional().default('sql'),
});
export type RunSqlRequest = z.infer<typeof RunSqlRequestSchema>;

export const SubmitSqlRequestSchema = z.object({
  session_id: z.string(),
  problem_id: z.string(),
  query: z.string(),
  time_taken: z.number().optional().default(0),
  dialect: z.string().optional().default('sql'),
});
export type SubmitSqlRequest = z.infer<typeof SubmitSqlRequestSchema>;

export const PreviewSubmitSqlRequestSchema = z.object({
  problem_id: z.string(),
  query: z.string(),
  dialect: z.string().optional().default('sql'),
});
export type PreviewSubmitSqlRequest = z.infer<typeof PreviewSubmitSqlRequestSchema>;

export const StartExamRequestSchema = z.object({
  session_id: z.string(),
});
export type StartExamRequest = z.infer<typeof StartExamRequestSchema>;

export const ExamAnswerSchema = z.object({
  problem_id: z.string(),
  code: z.string().optional().default(''),
  language: z.string(),
  selected_option: z.number().nullable().optional(),
});
export type ExamAnswer = z.infer<typeof ExamAnswerSchema>;

export const ExamSubmitRequestSchema = z.object({
  session_id: z.string(),
  answers: z.array(ExamAnswerSchema),
  auto_submit: z.boolean().optional().default(false),
});
export type ExamSubmitRequest = z.infer<typeof ExamSubmitRequestSchema>;

export const ProctoringLogCreateSchema = z.object({
  violation_type: z.string().trim().min(1),
  message: z.string().trim().min(1),
});
export type ProctoringLogCreate = z.infer<typeof ProctoringLogCreateSchema>;

export const MCQQuestionCreateSchema = z.object({
  question_title: z.string(),
  question: z.string(),
  options: z.array(z.string()),
  correct_answer: z.number(),
  difficulty: z.string().optional().default('Medium'),
  marks: z.number().optional().default(5),
  time: z.number().optional().default(2),
  topic: z.string().optional().default('General'),
  explanation: z.string().optional().default(''),
});
export type MCQQuestionCreate = z.infer<typeof MCQQuestionCreateSchema>;
