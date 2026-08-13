-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "test_location" TEXT,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "problem_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "passed_tests" INTEGER NOT NULL,
    "total_tests" INTEGER NOT NULL,
    "score" REAL NOT NULL,
    "verdict" TEXT NOT NULL DEFAULT 'Pending',
    "execution_time_ms" REAL NOT NULL DEFAULT 0.0,
    "time_taken" INTEGER NOT NULL DEFAULT 0,
    "created_at" TEXT NOT NULL,
    CONSTRAINT "submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_results" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "best_score" REAL NOT NULL,
    "passed_tests" INTEGER NOT NULL,
    "total_tests" INTEGER NOT NULL,
    "best_submission_id" INTEGER NOT NULL,
    "verdict" TEXT NOT NULL DEFAULT 'Pending',
    "execution_time_ms" REAL NOT NULL DEFAULT 0.0,
    "time_taken" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TEXT NOT NULL,
    CONSTRAINT "admin_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "admin_results_best_submission_id_fkey" FOREIGN KEY ("best_submission_id") REFERENCES "submissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "test_location" TEXT,
    "test_date" TEXT NOT NULL,
    "login_time" TEXT NOT NULL,
    "submit_time" TEXT NOT NULL,
    "submission_type" TEXT NOT NULL,
    "time_taken_min" INTEGER NOT NULL,
    "total_questions" INTEGER NOT NULL,
    "python_questions" INTEGER NOT NULL,
    "sql_questions" INTEGER NOT NULL,
    "mcq_questions" INTEGER NOT NULL DEFAULT 0,
    "python_score" REAL NOT NULL,
    "sql_score" REAL NOT NULL,
    "mcq_score" REAL NOT NULL DEFAULT 0.0,
    "overall_score" REAL NOT NULL,
    "max_possible_score" REAL,
    "overall_percentage" REAL NOT NULL,
    "overall_verdict" TEXT NOT NULL,
    "problem_testcases_json" TEXT NOT NULL,
    "problem_scores_json" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    CONSTRAINT "assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "candidate_otp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp_code" TEXT,
    "expires_at" TEXT,
    "created_at" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "test_type" TEXT NOT NULL DEFAULT 'both'
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "marks" INTEGER NOT NULL DEFAULT 10,
    "time_limit" INTEGER NOT NULL DEFAULT 15,
    "statement" TEXT,
    "description" TEXT,
    "input_format" TEXT,
    "output_format" TEXT,
    "sample_input" TEXT,
    "sample_output" TEXT,
    "starter_code" TEXT,
    "test_cases_json" TEXT,
    "schema_sql" TEXT,
    "seed_sql" TEXT,
    "is_active" INTEGER NOT NULL DEFAULT 1,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "custom_problems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "marks" INTEGER NOT NULL DEFAULT 10,
    "time_limit" INTEGER NOT NULL DEFAULT 15,
    "statement" TEXT,
    "description" TEXT,
    "input_format" TEXT,
    "output_format" TEXT,
    "sample_input" TEXT,
    "sample_output" TEXT,
    "starter_code" TEXT,
    "test_cases_json" TEXT,
    "schema_sql" TEXT,
    "seed_sql" TEXT,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "selected_exam_problems" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "problem_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "marks" INTEGER NOT NULL DEFAULT 10,
    "time_limit" INTEGER NOT NULL DEFAULT 15,
    "title" TEXT NOT NULL,
    "saved_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "candidate_selected_exam_problems" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "candidate_email" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'Medium',
    "marks" INTEGER NOT NULL DEFAULT 10,
    "time_limit" INTEGER NOT NULL DEFAULT 15,
    "title" TEXT NOT NULL,
    "saved_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "auth_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "mcq_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT NOT NULL,
    "option_d" TEXT NOT NULL,
    "correct_option" TEXT NOT NULL,
    "question_title" TEXT,
    "question" TEXT,
    "options_json" TEXT,
    "correct_answer" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "marks" INTEGER NOT NULL DEFAULT 10,
    "time" INTEGER NOT NULL DEFAULT 10,
    "topic" TEXT NOT NULL DEFAULT 'Python',
    "explanation" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "proctoring_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "exam_id" TEXT NOT NULL,
    "candidate_id" TEXT,
    "violation_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "server_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "candidate_email" TEXT,
    "user_id" TEXT,
    "test_type" TEXT,
    "start_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "server_exam_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answers_json" TEXT NOT NULL DEFAULT '{}',
    "is_completed" BOOLEAN NOT NULL DEFAULT false
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_results_user_id_problem_id_key" ON "admin_results"("user_id", "problem_id");

-- CreateIndex
CREATE UNIQUE INDEX "selected_exam_problems_problem_id_key" ON "selected_exam_problems"("problem_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_email_key" ON "auth_users"("email");

-- CreateIndex
CREATE INDEX "proctoring_logs_exam_id_idx" ON "proctoring_logs"("exam_id");

-- CreateIndex
CREATE INDEX "proctoring_logs_candidate_id_idx" ON "proctoring_logs"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_exam_sessions_session_id_key" ON "server_exam_sessions"("session_id");

-- CreateTable
CREATE TABLE IF NOT EXISTS "proctoring_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "started_at" TEXT NOT NULL,
    "ended_at" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "risk_level" TEXT NOT NULL DEFAULT 'NORMAL',
    "total_events" INTEGER NOT NULL DEFAULT 0,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "proctoring_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "duration" INTEGER,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" TEXT NOT NULL,
    CONSTRAINT "proctoring_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "proctoring_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "proctoring_sessions_test_id_idx" ON "proctoring_sessions"("test_id");
CREATE INDEX IF NOT EXISTS "proctoring_sessions_candidate_id_idx" ON "proctoring_sessions"("candidate_id");
CREATE INDEX IF NOT EXISTS "proctoring_sessions_status_idx" ON "proctoring_sessions"("status");
CREATE INDEX IF NOT EXISTS "proctoring_events_session_id_idx" ON "proctoring_events"("session_id");
CREATE INDEX IF NOT EXISTS "proctoring_events_type_idx" ON "proctoring_events"("type");
CREATE INDEX IF NOT EXISTS "proctoring_events_timestamp_idx" ON "proctoring_events"("timestamp");

