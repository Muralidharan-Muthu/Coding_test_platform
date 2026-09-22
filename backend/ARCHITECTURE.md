# Backend Architecture & Coding Standards Guide

This document outlines the coding standards, folder structure, and architectural conventions for the **Meptrasoft Coding Test Platform** backend. All upcoming features and code changes should strictly adhere to these standards.

---

## 1. Directory Structure

```
backend/
├── prisma/                  # Prisma schema and Prisma seed scripts
│   ├── schema.prisma
│   └── seed.ts
├── scripts/                 # Standalone database, migration, and seed utilities
│   ├── check_tables.ts      # Table status and record count checker
│   ├── create_tables.ts     # Direct DDL table creation
│   ├── drop_problems.ts     # Table cleanup helper
│   ├── migrate_data.ts      # SQLite to Turso data migration
│   ├── migrate.sql          # Raw SQL schema dump
│   ├── push_turso.ts        # Direct SQL schema pusher
│   ├── seed_admin.ts        # Admin user creation
│   ├── seed_all_empty_tables.ts # Sample database seed for all tables
│   ├── seed_problems.ts     # LeetCode Python/SQL seed problems
│   └── update_leetcode_starter_codes.ts # Starter code updater
├── src/
│   ├── __tests__/           # Test suites
│   │   ├── e2e/             # End-to-end full lifecycle tests
│   │   ├── integration/     # Route-level integration tests
│   │   └── unit/            # Service-level unit tests
│   ├── config/              # Centralized, strongly typed environment settings
│   │   └── index.ts
│   ├── controllers/         # HTTP request/response handlers
│   │   ├── candidateController.ts
│   │   └── index.ts
│   ├── db/                  # Database connection client
│   │   └── prisma.ts
│   ├── middlewares/         # Express middlewares
│   │   ├── errorHandler.ts  # Central error handler
│   │   └── requestLogger.ts # Latency and request logging
│   ├── routes/              # Express route definitions
│   │   ├── index.ts         # Central route aggregator
│   │   ├── admin.ts
│   │   ├── assessment.ts
│   │   ├── auth.ts
│   │   ├── candidates.ts
│   │   ├── exam.ts
│   │   ├── problems.ts
│   │   ├── proctoring.ts
│   │   ├── reports.ts
│   │   └── runner.ts
│   ├── schemas/             # Zod input validation schemas
│   │   └── index.ts
│   ├── services/            # Pure business logic and database queries
│   │   ├── assessmentService.ts
│   │   ├── authService.ts
│   │   ├── examService.ts
│   │   ├── groqProctoringService.ts
│   │   ├── otpService.ts
│   │   ├── problemService.ts
│   │   ├── proctoringService.ts
│   │   ├── questionTypeService.ts
│   │   ├── runnerService.ts
│   │   └── runner.ts        # Backward-compatibility re-export
│   ├── types/               # Domain TypeScript interfaces
│   │   └── index.ts
│   ├── utils/               # Pure utility functions & template generators
│   │   ├── emailTemplates.ts
│   │   └── runnerUtils.ts
│   └── index.ts             # Application entrypoint
├── package.json
└── tsconfig.json
```

---

## 2. Layer Responsibilities & Data Flow

Requests follow a strict, unidirectional flow:

```
Request ──> Middleware ──> Route ──> Controller ──> Service ──> Database (Prisma)
                                                         │
                                                         ▼
Response <── ErrorHandler <── Controller <── Service Output
```

1. **Routes (`src/routes/`)**:
   - Define URL paths and HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).
   - Attach route-level middlewares (authentication, validation).
   - Route to corresponding controller functions.
   - **Do not** write SQL/Prisma queries directly in route files.

2. **Controllers (`src/controllers/`)**:
   - Extract and validate request parameters, query strings, and body.
   - Call the appropriate service function(s).
   - Format and return HTTP status codes and JSON payloads.
   - Catch and forward unhandled exceptions to `next(err)` or return standardized errors.

3. **Services (`src/services/`)**:
   - Contain the core business logic.
   - Execute database queries via `prisma`.
   - Never interact with Express `req` or `res` objects.
   - Return clean JavaScript objects or throw typed errors.

4. **Middlewares (`src/middlewares/`)**:
   - `errorHandler.ts`: Catches all uncaught errors, formats them as `{ detail: err.message }`, and prevents node process crashes.
   - `requestLogger.ts`: Logs endpoint hits, HTTP status codes, and execution duration.

5. **Configuration (`src/config/`)**:
   - Central access point for all environment variables (`PORT`, `DATABASE_URL`, `JWT_SECRET`, `SMTP_*`, `GROQ_API_KEY`).
   - **Do not** use `process.env.VARIABLE_NAME` directly in services; import from `src/config`.

6. **Utilities (`src/utils/`)**:
   - Pure, stateless helper functions (string formatting, comparison helpers, email HTML generators).

7. **Database Scripts (`scripts/`)**:
   - One-off or operational scripts for table initialization, data migration, and sample seeds.
   - Run via `npx tsx scripts/<script_name>.ts` or `npm run db:*` / `npm run seed:*`.

---

## 3. Naming Conventions

| Component | Convention | Example |
| :--- | :--- | :--- |
| **Service Files** | camelCase + `Service.ts` | `assessmentService.ts`, `problemService.ts` |
| **Controller Files** | camelCase + `Controller.ts` | `candidateController.ts`, `examController.ts` |
| **Route Files** | camelCase `.ts` | `admin.ts`, `auth.ts`, `problems.ts` |
| **Middlewares** | camelCase `.ts` | `errorHandler.ts`, `requestLogger.ts` |
| **Utility Files** | camelCase + `Utils.ts` or noun | `runnerUtils.ts`, `emailTemplates.ts` |
| **Script Files** | snake_case `.ts` | `check_tables.ts`, `seed_admin.ts` |
| **Types / Interfaces** | PascalCase | `RunPythonResult`, `GroqFraudAnalysis` |

---

## 4. How to Add a New Feature (Step-by-Step)

When implementing a new feature (e.g., `Leaderboard`):

1. **Define Types & Schemas**:
   - Add TypeScript interfaces in `src/types/index.ts`.
   - Add Zod request validation schemas in `src/schemas/index.ts`.

2. **Implement the Service**:
   - Create `src/services/leaderboardService.ts`.
   - Write pure async functions that query `prisma.candidateAssessment`.

3. **Implement the Controller**:
   - Create `src/controllers/leaderboardController.ts`.
   - Parse `req.query` and call `getLeaderboard()`.

4. **Register the Route**:
   - Create `src/routes/leaderboard.ts` and bind the controller.
   - Register it in `src/routes/index.ts`: `app.use('/api/leaderboard', leaderboardRoutes)`.

5. **Write Unit and Integration Tests**:
   - Add service tests under `src/__tests__/unit/leaderboardService.test.ts`.
   - Add route tests under `src/__tests__/integration/leaderboardRoutes.test.ts`.
