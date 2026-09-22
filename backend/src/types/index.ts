/**
 * Shared Domain Types and Interfaces for the Coding Platform Backend
 */

export interface AssessmentFilters {
  status?: string;
  test_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RunPythonResult {
  stdout: string;
  stderr: string;
  error?: string;
  exitCode: number;
  durationMs: number;
}

export interface RunSqlResult {
  columns: string[];
  rows: any[];
  error?: string;
  durationMs: number;
}

export interface SubmissionEvaluationResult {
  passed: boolean;
  totalTestCases: number;
  passedTestCases: number;
  verdict: 'Accepted' | 'Wrong Answer' | 'Time Limit Exceeded' | 'Runtime Error' | 'Compilation Error' | 'Partial' | 'Failed';
  durationMs: number;
  testCaseResults: Array<{
    caseNumber: number;
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
    error?: string;
  }>;
}

export interface QuestionTypeRecord {
  type_id: string;
  type_name: string;
  display_name: string;
  description?: string;
  default_duration: number;
  default_marks: number;
  created_at: string;
  question_count?: number;
}

export interface GroqFraudAnalysis {
  risk_score: number;
  verdict: 'CLEAN' | 'SUSPICIOUS' | 'CRITICAL_FRAUD' | 'ERROR';
  flags: string[];
  reason: string;
  face_count: number;
  screen_anomalies: string[];
}

export interface CandidateRecord {
  id?: string;
  candidate_email: string;
  candidate_name?: string;
  college_name?: string;
  phone?: string;
  degree?: string;
  batch?: string;
  test_type?: string;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  message?: string;
  detail?: string;
  data?: T;
}
