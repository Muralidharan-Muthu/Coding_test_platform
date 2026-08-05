# 🏗️ SYSTEM ARCHITECTURE

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CANDIDATE                            │
│                    (Browser Interface)                       │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    FRONTEND (React)                          │
│  ┌────────────────┐        
      ┌────────────────────┐     │
│  │  Login Page    │              │  Coding Interface  │     │
│  │  - Username   │              │  - Problem panel   │     │
│  │  - Gmail      │   ────────►  │  - Monaco Editor   │     │
│  │  - No validation│            │  - Run/Submit btns │     │
│  └────────────────┘              │  - Output console  │     │
│                                   └────────────────────┘     │
│  Vite Dev Server (Port 3000)                                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ Axios API Calls
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                   BACKEND (FastAPI)                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              API ROUTES (main.py)                    │   │
│  │  POST /login          - Create session               │   │
│  │  GET  /problems/:id   - Get problem details          │   │
│  │  POST /run            - Execute code (no save)       │   │
│  │  POST /submit         - Execute & score              │   │
│  │  GET  /hr/results     - Get best scores              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                │
│  ┌─────────────────┐      │      ┌────────────────────┐     │
│  │  Session Store  │◄─────┼─────►│  Python Runner     │     │
│  │  (in-memory)    │      │      │  - subprocess.run  │     │
│  │  UUID → user_id │      │      │  - 2s timeout      │     │
│  └─────────────────┘      │      │  - Semaphore (25)  │     │
│                            │      └────────────────────┘    │
│                            │                                  │
│                            ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           DATABASE (SQLite - database.py)            │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  users                                      │    │   │
│  │  │  - id, name, email, created_at             │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  submissions                                │    │   │
│  │  │  - id, user_id, problem_id, code           │    │   │
│  │  │  - passed_tests, total_tests, score        │    │   │
│  │  │  - created_at                               │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  │                                                       │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │  hr_results (BEST SCORES ONLY)             │    │   │
│  │  │  - id, user_id, name, email                │    │   │
│  │  │  - problem_id, best_score                  │    │   │
│  │  │  - passed_tests, total_tests               │    │   │
│  │  │  - best_submission_id, updated_at          │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  Uvicorn Server (Port 8001)                                  │
└───────────────────────────────────────────────────────────────┘
```

## Request Flow Diagrams

### 1. Login Flow

```
Candidate                Frontend              Backend              Database
    │                       │                     │                     │
    │  Enter credentials    │                     │                     │
    ├──────────────────────►│                     │                     │
    │                       │  POST /login        │                     │
    │                       ├────────────────────►│                     │
    │                       │                     │  Check user exists  │
    │                       │                     ├────────────────────►│
    │                       │                     │◄────────────────────┤
    │                       │                     │  Create/get user_id │
    │                       │                     ├────────────────────►│
    │                       │                     │                     │
    │                       │                     │  Generate UUID      │
    │                       │                     │  Store in sessions  │
    │                       │                     │                     │
    │                       │  session_id, user   │                     │
    │                       │◄────────────────────┤                     │
    │  Redirect to coding   │                     │                     │
    │◄──────────────────────┤                     │                     │
```

### 2. Run Code Flow (No Scoring)

```
Candidate                Frontend              Backend              Python Runner
    │                       │                     │                     │
    │  Click "Run"          │                     │                     │
    ├──────────────────────►│                     │                     │
    │                       │  POST /run          │                     │
    │                       │  {code, input}      │                     │
    │                       ├────────────────────►│                     │
    │                       │                     │  Acquire semaphore  │
    │                       │                     │                     │
    │                       │                     │  Execute code       │
    │                       │                     ├────────────────────►│
    │                       │                     │                     │
    │                       │                     │  stdout/stderr      │
    │                       │                     │◄────────────────────┤
    │                       │                     │  Release semaphore  │
    │                       │  {stdout, stderr}   │                     │
    │                       │◄────────────────────┤                     │
    │  Show output          │                     │                     │
    │◄──────────────────────┤                     │                     │
```

### 3. Submit Code Flow (With Scoring)

```
Candidate       Frontend        Backend         Runner         Database
    │              │               │               │               │
    │  Submit      │               │               │               │
    ├─────────────►│               │               │               │
    │              │  POST /submit │               │               │
    │              ├──────────────►│               │               │
    │              │               │  For each test case:          │
    │              │               │               │               │
    │              │               │  Execute      │               │
    │              │               ├──────────────►│               │
    │              │               │◄──────────────┤               │
    │              │               │  Compare output               │
    │              │               │               │               │
    │              │               │  Calculate score              │
    │              │               │                               │
    │              │               │  Save submission              │
    │              │               ├──────────────────────────────►│
    │              │               │                               │
    │              │               │  Check if best score          │
    │              │               ├──────────────────────────────►│
    │              │               │◄──────────────────────────────┤
    │              │               │  Update hr_results if better  │
    │              │               ├──────────────────────────────►│
    │              │               │                               │
    │              │  Result       │                               │
    │              │◄──────────────┤                               │
    │  Show score  │               │                               │
    │◄─────────────┤               │                               │
```

### 4. HR Results Flow

```
HR/Admin                Frontend/Browser           Backend           Database
    │                          │                      │                 │
    │  GET /hr/results         │                      │                 │
    ├─────────────────────────────────────────────────►│                 │
    │                          │                      │  SELECT best    │
    │                          │                      │  scores only    │
    │                          │                      ├────────────────►│
    │                          │                      │◄────────────────┤
    │                          │                      │                 │
    │  JSON (one row per user) │                      │                 │
    │◄─────────────────────────────────────────────────┤                 │
    │                          │                      │                 │
```

## Concurrency Control

```
┌────────────────────────────────────────────┐
│         Execution Semaphore (25)           │
│                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐       ┌─────┐   │
│  │Exec1│ │Exec2│ │Exec3│  ...  │Exc25│   │
│  └─────┘ └─────┘ └─────┘       └─────┘   │
│                                             │
│  When full (25 running):                   │
│  New requests WAIT until slot available    │
│                                             │
│  ┌─────────────────────┐                   │
│  │  Waiting Queue      │                   │
│  │  Request 26...      │                   │
│  │  Request 27...      │                   │
│  │  Request 28...      │                   │
│  └─────────────────────┘                   │
└────────────────────────────────────────────┘
```

## Data Flow: Multiple Submissions

```
User submits code multiple times:

Submission 1: Score = 33% (1/3 tests passed)
    ↓
hr_results: best_score = 33%

Submission 2: Score = 66% (2/3 tests passed)
    ↓
hr_results: best_score = 66% (UPDATED)

Submission 3: Score = 100% (3/3 tests passed)
    ↓
hr_results: best_score = 100% (UPDATED)

Submission 4: Score = 66% (worse than best)
    ↓
hr_results: best_score = 100% (NO CHANGE)

HR sees only: 100%
```

## Technology Stack Layers

```
┌──────────────────────────────────────────────┐
│            PRESENTATION LAYER                 │
│  React Components, Monaco Editor, CSS        │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│            API LAYER                          │
│  Axios HTTP Client, REST endpoints           │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│         APPLICATION LAYER                     │
│  FastAPI Routes, Business Logic              │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│         EXECUTION LAYER                       │
│  Python Runner, Subprocess Management        │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│         DATA LAYER                            │
│  SQLite Database, Session Store              │
└──────────────────────────────────────────────┘
```

## File Organization

```
Project Root
│
├── Backend (Python/FastAPI)
│   ├── main.py          → Routes & app setup
│   ├── database.py      → Schema & connections
│   ├── models.py        → Request/response models
│   ├── runner.py        → Code execution engine
│   ├── problems.py      → Problem definitions
│   └── requirements.txt → Dependencies
│
├── Frontend (React/Vite)
│   ├── src/
│   │   ├── pages/       → Page components
│   │   ├── api.js       → Backend client
│   │   ├── main.jsx     → App entry
│   │   └── index.css    → Global styles
│   ├── index.html       → HTML template
│   ├── vite.config.js   → Build config
│   └── package.json     → Dependencies
│
└── Documentation
    ├── README.md        → Full documentation
    ├── QUICKSTART.md    → Quick start guide
    └── ARCHITECTURE.md  → This file
```
## Security Considerations

### Current Implementation (Development):
- ❌ No code sandboxing
- ❌ No rate limiting
- ❌ In-memory sessions
- ✅ Email validation
- ✅ Timeout limits

### Production Requirements:
- ✅ Docker containers for code execution
- ✅ API rate limiting (per user)
- ✅ Database-backed sessions
- ✅ Input sanitization
- ✅ HTTPS/SSL
- ✅ Firewall rules
- ✅ Monitoring & logging

## Scalability Path

### Current: 25 concurrent users
- Single server
- In-memory sessions
- File-based SQLite

### Scale to 100 users:
- PostgreSQL instead of SQLite
- Redis for sessions
- Docker for code execution
- Load balancer

### Scale to 1000+ users:
- Kubernetes cluster
- Distributed code execution
- CDN for frontend
- Database replicas
- Message queue for submissions
