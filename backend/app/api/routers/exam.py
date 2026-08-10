from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import uuid
import asyncio
from datetime import datetime
from app.db.database import get_db
from app.core.state import sessions, session_test_types, session_candidate_emails, exam_sessions
from app.models.schemas import *
from app.models.domain import *
from app.services.runner import *
from app.services.problems import *
from app.services.otp_service import *
from app.services.assessment_service import *
from app.services.excel_service import *
from app.db.auth_db import *
from app.db.mcq_database import *

router = APIRouter()

@router.get("/exam/summary")
async def exam_summary(session_id: Optional[str] = None):
    """Get exam overview filtered by the candidate's assigned test type."""
    # Use selected random problems if they exist, otherwise use all problems
    # Always fetch fresh time_limit from PROBLEMS dict to reflect latest DB values
    def enrich(p):
        fresh = PROBLEMS.get(p["id"], p)
        return {**p, "time_limit": fresh.get("time_limit", p.get("time_limit", 10))}

    test_type = get_session_test_type(session_id)
    raw_python, raw_sql = get_assigned_problem_sets_for_session(session_id, test_type)
    raw_mcq = get_assigned_mcq_questions_for_session(session_id, test_type)

    python_problems = [enrich(p) for p in raw_python]
    sql_problems = [enrich(p) for p in raw_sql]
    mcq_problems = [
        {
            "id": question["id"],
            "title": question["question_title"],
            "language": "mcq",
            "difficulty": question.get("difficulty", "easy"),
            "marks": question.get("marks", 10),
            "time_limit": question.get("time", 10),
            "topic": question.get("topic", "Python"),
        }
        for question in raw_mcq
    ]
    all_problems = python_problems + sql_problems + mcq_problems

    return {
        "total_duration_minutes": 150,
        "total_questions": len(all_problems),
        "python_questions": len(python_problems),
        "sql_questions": len(sql_problems),
        "mcq_questions": len(mcq_problems),
        "total_marks": sum(p.get("marks", 10) for p in all_problems),
        "problems": all_problems
    }

@router.post("/exam/start")
async def start_exam(request: StartExamRequest):
    """Start a new exam session"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[request.session_id]
    
    # Check if exam already started
    if user_id in exam_sessions and exam_sessions[user_id]["status"] == "active":
        exam = exam_sessions[user_id]
        elapsed = (datetime.now() - exam["start_time"]).total_seconds()
        remaining = max(0, EXAM_DURATION_SECONDS - elapsed)
        
        if remaining > 0:
            return {
                "status": "already_started",
                "start_time": exam["start_time"].isoformat(),
                "remaining_seconds": int(remaining),
                "answers": exam.get("answers", {})
            }
        else:
            # Time expired but not submitted
            exam_sessions[user_id]["status"] = "expired"
    
    # Start new exam
    start_time = datetime.now()
    exam_sessions[user_id] = {
        "start_time": start_time,
        "end_time": start_time,  # Will be updated on submit
        "status": "active",
        "answers": {}
    }
    
    return {
        "status": "started",
        "start_time": start_time.isoformat(),
        "remaining_seconds": EXAM_DURATION_SECONDS
    }

@router.get("/exam/status")
async def get_exam_status(session_id: str):
    """Get current exam status and remaining time"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[session_id]
    
    if user_id not in exam_sessions:
        return {"status": "not_started"}
    
    exam = exam_sessions[user_id]
    
    if exam["status"] == "completed":
        return {
            "status": "completed",
            "start_time": exam["start_time"].isoformat(),
            "end_time": exam["end_time"].isoformat()
        }
    
    elapsed = (datetime.now() - exam["start_time"]).total_seconds()
    remaining = max(0, EXAM_DURATION_SECONDS - elapsed)
    
    if remaining <= 0:
        return {
            "status": "expired",
            "start_time": exam["start_time"].isoformat(),
            "remaining_seconds": 0,
            "answers": exam.get("answers", {})
        }
    
    return {
        "status": "active",
        "start_time": exam["start_time"].isoformat(),
        "remaining_seconds": int(remaining),
        "answers": exam.get("answers", {})
    }

@router.post("/exam/submit")
async def submit_exam(request: ExamSubmitRequest, db: Session = Depends(get_db)):
    """Submit entire exam - either manual or auto (timer expired)"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[request.session_id]
    
    if user_id not in exam_sessions:
        raise HTTPException(status_code=400, detail="No exam session found")
    
    exam = exam_sessions[user_id]
    
    if exam["status"] == "completed":
        raise HTTPException(status_code=400, detail="Exam already submitted")
    
    # Mark exam as completed
    exam["status"] = "completed"
    exam["end_time"] = datetime.now()
    
    # Calculate time taken
    time_taken = int((exam["end_time"] - exam["start_time"]).total_seconds())
    
    # Process each answer
    results = []
    total_score = 0
    evaluated_total_marks = 0

    # Resolve full assigned exam scope (not just answered questions)
    assigned_test_type = get_session_test_type(request.session_id)
    assigned_python_problems, assigned_sql_problems = get_assigned_problem_sets_for_session(request.session_id, assigned_test_type)
    assigned_mcq_questions = get_assigned_mcq_questions_for_session(request.session_id, assigned_test_type)
    assigned_all_problems = assigned_python_problems + assigned_sql_problems + assigned_mcq_questions
    assigned_total_questions = len(assigned_all_problems)
    assigned_total_marks = sum(p.get("marks", 10) for p in assigned_all_problems)
    
    # Get user info
    user_info = db.query(User).filter(User.id == user_id).first()
    
    for answer in request.answers:
        answer_language = str(answer.language or "").strip().lower()
        stored_answer = answer.code
        problem = fetch_mcq_question_by_id(answer.problem_id, include_internal=True) if answer_language == "mcq" else get_problem(answer.problem_id)
        if not problem:
            continue
        
        problem_marks = problem.get("marks", 10)
        evaluated_total_marks += problem_marks
        total_execution_time = 0
        
        # Evaluate based on language
        if answer_language == "sql":
            # SQL evaluation
            passed_tests = 0
            sql_test_cases = build_sql_test_cases(problem, min_cases=5)
            total_tests = len(sql_test_cases)
            
            for test_case in sql_test_cases:
                try:
                    start_time = datetime.now()
                    columns, rows = execute_sql_problem_query(problem, answer.code)
                    execution_time = (datetime.now() - start_time).total_seconds() * 1000
                    total_execution_time += execution_time
                    
                    expected_columns = test_case.get("expected_columns", [])
                    expected_rows = test_case.get("expected_rows", [])
                    if compare_result_sets(columns, rows, expected_columns, expected_rows):
                        passed_tests += 1
                except:
                    pass
            
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        elif answer_language == "mcq":
            total_tests = 1
            try:
                selected_option = answer.selected_option if answer.selected_option is not None else int(str(answer.code).strip())
            except (TypeError, ValueError):
                selected_option = -1

            correct_answer = int(problem.get("correct_answer", 0))
            passed_tests = 1 if selected_option == correct_answer else 0
            score = 100 if passed_tests else 0
            stored_answer = str(selected_option)
        else:
            # Python evaluation with normalized comparison
            runner = PythonRunner()
            passed_tests = 0
            total_tests = len(problem.get("test_cases", []))
            
            async with execution_semaphore:
                for test_case in problem.get("test_cases", []):
                    start_time = datetime.now()
                    result = await runner.run_with_input(answer.code, test_case["input"])
                    execution_time = (datetime.now() - start_time).total_seconds() * 1000
                    total_execution_time += execution_time
                    
                    if result["status"] == "success":
                        # Use normalized comparison
                        expected = test_case.get("expected_output") or test_case.get("output", "")
                        if compare_outputs(result["stdout"], expected):
                            passed_tests += 1
            
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Determine verdict and average execution time
        verdict = get_verdict(passed_tests, total_tests)
        avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
        
        # Save submission
        new_submission = Submission(
            user_id=user_id,
            problem_id=answer.problem_id,
            code=stored_answer,
            passed_tests=passed_tests,
            total_tests=total_tests,
            score=score,
            verdict=verdict,
            execution_time_ms=avg_execution_time,
            time_taken=time_taken,
            created_at=datetime.now().isoformat()
        )
        db.add(new_submission)
        db.commit()
        db.refresh(new_submission)
        submission_id = new_submission.id
        
        # Update admin_results for best score
        existing = db.query(AdminResult).filter(
            AdminResult.user_id == user_id,
            AdminResult.problem_id == answer.problem_id
        ).first()
        current_best = existing.best_score if existing else 0
        
        if score > current_best:
            if existing:
                existing.best_score = score
                existing.passed_tests = passed_tests
                existing.total_tests = total_tests
                existing.best_submission_id = submission_id
                existing.verdict = verdict
                existing.execution_time_ms = avg_execution_time
                existing.time_taken = time_taken
                existing.updated_at = datetime.now().isoformat()
            else:
                new_admin_result = AdminResult(
                    user_id=user_id,
                    name=user_info.name,
                    email=user_info.email,
                    problem_id=answer.problem_id,
                    best_score=score,
                    passed_tests=passed_tests,
                    total_tests=total_tests,
                    best_submission_id=submission_id,
                    verdict=verdict,
                    execution_time_ms=avg_execution_time,
                    time_taken=time_taken,
                    updated_at=datetime.now().isoformat()
                )
                db.add(new_admin_result)
        
        total_score += (score / 100) * problem_marks
        results.append({
            "problem_id": answer.problem_id,
            "passed_tests": passed_tests,
            "total_tests": total_tests,
            "score": score,
            "verdict": verdict,
            "execution_time_ms": round(avg_execution_time, 2)
        })
    
    db.commit()
    
    test_location = user_info.test_location if user_info and user_info.test_location else "home"
    
    python_score = 0
    sql_score = 0
    mcq_score = 0

    # Create assessment record for dashboard
    try:
        # Calculate Python, SQL, and MCQ scores separately
        for answer in request.answers:
            answer_language = str(answer.language or "").strip().lower()
            problem = fetch_mcq_question_by_id(answer.problem_id, include_internal=True) if answer_language == "mcq" else get_problem(answer.problem_id)
            if not problem:
                continue
            
            # Find the result for this problem
            result = next((r for r in results if r["problem_id"] == answer.problem_id), None)
            if not result:
                continue
            
            problem_marks = problem.get("marks", 10)
            score_contribution = (result["score"] / 100) * problem_marks
            
            if answer_language == "sql":
                sql_score += score_contribution
            elif answer_language == "mcq":
                mcq_score += score_contribution
            else:
                python_score += score_contribution
        
        # Build problem testcases summary (easy/medium/hard) from the assigned exam scope.
        total_difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}
        for problem in assigned_all_problems:
            difficulty = str(problem.get("difficulty", "medium")).strip().lower()
            if difficulty in total_difficulty_counts:
                total_difficulty_counts[difficulty] += 1
        
        # Count solved questions per difficulty from candidate's submissions
        solved_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        for answer in request.answers:
            answer_language = str(answer.language or "").strip().lower()
            problem = fetch_mcq_question_by_id(answer.problem_id, include_internal=True) if answer_language == "mcq" else get_problem(answer.problem_id)
            if problem:
                difficulty = str(problem.get("difficulty", "medium")).strip().lower()
                result = next((r for r in results if r["problem_id"] == answer.problem_id), None)
                if result and result["passed_tests"] == result["total_tests"] and difficulty in solved_difficulty:
                    solved_difficulty[difficulty] += 1
        
        # Build problem scores map
        problem_scores_map = {}
        python_problem_slots = {
            problem_id: index
            for index, problem_id in enumerate(get_selected_exam_problem_ids("python"), start=1)
        }
        sql_problem_slots = {
            problem_id: index
            for index, problem_id in enumerate(get_selected_exam_problem_ids("sql"), start=6)
        }
        fallback_python_slot = 1
        fallback_sql_slot = 6

        for answer in request.answers:
            result = next((r for r in results if r["problem_id"] == answer.problem_id), None)
            if result:
                if answer.language == "sql":
                    problem_num = sql_problem_slots.get(answer.problem_id)
                    if problem_num is None:
                        while f"P{fallback_sql_slot}_sql" in problem_scores_map:
                            fallback_sql_slot += 1
                        problem_num = fallback_sql_slot
                    key = f"P{problem_num}_sql"
                else:
                    problem_num = python_problem_slots.get(answer.problem_id)
                    if problem_num is None:
                        while f"P{fallback_python_slot}_py" in problem_scores_map:
                            fallback_python_slot += 1
                        problem_num = fallback_python_slot
                    key = f"P{problem_num}_py"
                problem_scores_map[key] = result["passed_tests"]
        
        # Create assessment data
        assessment_data = {
            "user_id": user_id,
            "candidate_id": f"C{str(user_id).zfill(3)}",
            "name": user_info[0],
            "email": user_info[1],
            "phone": "",  # Can be added later if needed
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "login_time": exam["start_time"].strftime("%H:%M"),
            "submit_time": exam["end_time"].strftime("%H:%M"),
            "submission_type": "auto" if request.auto_submit else "manual",
            "time_taken_min": int(time_taken / 60),
            "total_questions": assigned_total_questions,
            "python_questions": len(assigned_python_problems),
            "sql_questions": len(assigned_sql_problems),
            "mcq_questions": len(assigned_mcq_questions),
            "test_location": test_location,
            "python_score": python_score,
            "sql_score": sql_score,
            "mcq_score": mcq_score,
            "max_possible_score": assigned_total_marks if assigned_total_marks > 0 else evaluated_total_marks,
            "problem_testcases": {
                "easy_solved": solved_difficulty["easy"],
                "easy_total": total_difficulty_counts["easy"],
                "medium_solved": solved_difficulty["medium"],
                "medium_total": total_difficulty_counts["medium"],
                "hard_solved": solved_difficulty["hard"],
                "hard_total": total_difficulty_counts["hard"]
            },
            "problem_scores": problem_scores_map
        }
        
        # Save to database
        create_assessment(db, assessment_data)
    except Exception as e:
        # Log error but don't fail the submission
        print(f"Warning: Failed to create assessment record: {e}")
    
    final_total_marks = assigned_total_marks if assigned_total_marks > 0 else evaluated_total_marks

    return {
        "status": "submitted",
        "submission_type": "auto" if request.auto_submit else "manual",
        "time_taken": time_taken,
        "total_score": total_score,
        "total_marks": final_total_marks,
        "percentage": (total_score / final_total_marks * 100) if final_total_marks > 0 else 0,
        "python_score": python_score,
        "sql_score": sql_score,
        "mcq_score": mcq_score,
        "results": results
    }

# --- SQL support (Multi-dialect: SQLite, MySQL, PostgreSQL) ---

import pymysql
import psycopg2
from psycopg2 import sql as psql

# Database connection configurations
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

POSTGRESQL_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', ''),
    'database': os.getenv('POSTGRES_DB', 'coding_platform')
}

# Dialect-specific syntax validation and error simulation
DIALECT_VALIDATION_RULES = {
    'mysql': {
        'blocked': ['ILIKE', 'SERIAL', 'RETURNING', 'TO_CHAR', 'STRING_AGG', 'CTE'],
        'supported': ['LIMIT', 'AUTO_INCREMENT', 'IFNULL', 'GROUP_CONCAT', 'SHOW', 'DESCRIBE']
    },
    'postgresql': {
        'blocked': ['AUTO_INCREMENT', 'SHOW TABLES', 'DESCRIBE', 'IFNULL', 'GROUP_CONCAT'],
        'supported': ['ILIKE', 'SERIAL', 'RETURNING', 'TO_CHAR', 'STRING_AGG', 'COALESCE']
    },
    'sql': {
        'blocked': [],
        'supported': ['LIMIT', 'JOIN', 'SUBQUERY', 'CASE', 'AGGREGATE']
    }
}

def validate_dialect_syntax(query: str, dialect: str):
    """Validate query against dialect-specific rules"""
    query_upper = query.upper()
    rules = DIALECT_VALIDATION_RULES.get(dialect, {'blocked': [], 'supported': []})
    
    errors = []
    for blocked in rules['blocked']:
        if blocked in query_upper:
            errors.append(f"{blocked} is not supported in {dialect.upper()}")
    
    return errors

def get_database_connection(dialect: str, problem: dict):
    """Get database connection based on selected dialect"""
    # Always use SQLite but simulate dialect behavior
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Execute schema and seed data
        cursor.executescript(problem["schema_sql"])
        cursor.executescript(problem["seed_sql"])
        conn.commit()
        return conn, None
    except Exception as e:
        conn.close()
        raise e

def cleanup_database_connection(conn, dialect: str, db_identifier: str):
    """Clean up database resources after execution"""
    if conn:
        try:
            cursor = conn.cursor()
            
            if dialect == 'mysql' and db_identifier:
                # Drop the test database
                try:
                    cursor.execute(f"DROP DATABASE IF EXISTS {db_identifier}")
                    conn.commit()
                except:
                    pass
            elif dialect == 'postgresql' and db_identifier:
                # Drop the test schema
                try:
                    cursor.execute(f"DROP SCHEMA IF EXISTS {db_identifier} CASCADE")
                    conn.commit()
                except:
                    pass
            
            cursor.close()
            conn.close()
        except:
            pass

BLOCKED_SQL_KEYWORDS = ["drop", "attach", "pragma", "alter"]

def validate_sql_query(query: str):
    """Validate SQL query for security (allow only read-only operations)"""
    text = query or ""
    lowered = text.lower().strip()
    
    # Block dangerous database-level operations
    for kw in BLOCKED_SQL_KEYWORDS:
        if lowered.startswith(kw):
            raise HTTPException(
                status_code=400,
                detail=f"Only read-only SELECT queries are allowed. Keyword '{kw.upper()}' is not permitted."
            )
    
    # Check if query is empty
    if not lowered:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    # Allow WITH (CTE), SELECT, and explanatory queries
    first_token = lowered.split()[0] if lowered.split() else ""
    if first_token not in ("select", "with", "explain", "describe"):
        raise HTTPException(
            status_code=400, 
            detail="Only read-only SELECT queries are allowed. Your query should start with SELECT or WITH."
        )

def execute_sql_problem_query(problem: dict, query: str, dialect: str = "sql"):
    """Execute user SQL query with dialect-specific database engine"""
    validate_sql_query(query)
    
    # Validate dialect-specific syntax
    dialect_errors = validate_dialect_syntax(query, dialect)
    if dialect_errors:
        raise HTTPException(
            status_code=400,
            detail=f"Dialect error: {'; '.join(dialect_errors)}"
        )
    
    conn = None
    db_identifier = None
    
    try:
        # Get connection based on dialect (uses SQLite with dialect simulation)
        conn, db_identifier = get_database_connection(dialect, problem)
        cursor = conn.cursor()
        
        # Execute the user's query
        cursor.execute(query)
        
        # Fetch results
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        result_rows = [list(row) for row in rows]
        
        cursor.close()
        return columns, result_rows
    
    finally:
        # Clean up database resources
        cleanup_database_connection(conn, dialect, db_identifier)

def normalize_sql_value(v):
    """Normalize SQL values for comparison across SQLite/JSON representations."""
    if v is None:
        return None

    if isinstance(v, bool):
        return int(v)

    if isinstance(v, (int, float)):
        return str(v)

    if isinstance(v, str):
        trimmed = v.strip()
        try:
            numeric = float(trimmed)
        except ValueError:
            return trimmed

        if numeric.is_integer():
            return str(int(numeric))
        return str(numeric)

    return v

def compare_result_sets(actual_columns, actual_rows, expected_columns, expected_rows):
    """Compare SQL result sets with flexible ordering"""
    normalized_actual_rows = [
        [normalize_sql_value(v) for v in row] for row in actual_rows
    ]
    normalized_expected_rows = [
        [normalize_sql_value(v) for v in row] for row in expected_rows
    ]

    # Normalize column names
    actual_cols_norm = [c.strip().lower() for c in actual_columns]
    expected_cols_norm = [c.strip().lower() for c in expected_columns]

    if set(actual_cols_norm) == set(expected_cols_norm):
        # Map actual columns to expected order
        index_map = {name: idx for idx, name in enumerate(actual_cols_norm)}
        ordered_actual_rows = []
        for row in normalized_actual_rows:
            ordered_actual_rows.append(
                [row[index_map[col]] for col in expected_cols_norm]
            )

        # Ignore row order: compare sorted lists
        ordered_actual_rows_sorted = sorted(ordered_actual_rows, key=lambda x: str(x))
        expected_norm_rows_sorted = sorted(normalized_expected_rows, key=lambda x: str(x))

        if ordered_actual_rows_sorted == expected_norm_rows_sorted:
            return True

    # Fallback: if the data matches exactly but the candidate used different
    # column aliases, still accept the answer.
    if len(actual_cols_norm) != len(expected_cols_norm):
        return False

    normalized_actual_rows_sorted = sorted(normalized_actual_rows, key=lambda x: str(x))
    normalized_expected_rows_sorted = sorted(normalized_expected_rows, key=lambda x: str(x))
    return normalized_actual_rows_sorted == normalized_expected_rows_sorted

def build_sql_test_cases(problem: dict, min_cases: int = 5):
    """
    Build SQL test cases with expected result sets and enforce minimum count.
    Legacy SQL problems may only contain placeholder test cases without expected rows.
    """
    raw_cases = problem.get("test_cases", []) or []
    normalized_cases = []

    for case in raw_cases:
        expected_output = case.get("expected_output")
        if isinstance(expected_output, dict):
            expected_columns = expected_output.get("columns", []) or []
            expected_rows = expected_output.get("rows", []) or []
        else:
            expected_columns = case.get("expected_columns", []) or []
            expected_rows = case.get("expected_rows", []) or []

        if not expected_columns and not expected_rows and problem.get("starter_code"):
            try:
                expected_columns, expected_rows = execute_sql_problem_query(
                    problem,
                    problem.get("starter_code", ""),
                    "sql"
                )
            except Exception:
                expected_columns, expected_rows = [], []

        if expected_columns or expected_rows:
            normalized_cases.append({
                "expected_columns": expected_columns,
                "expected_rows": expected_rows
            })

    if not normalized_cases and problem.get("starter_code"):
        try:
            expected_columns, expected_rows = execute_sql_problem_query(
                problem,
                problem.get("starter_code", ""),
                "sql"
            )
            normalized_cases.append({
                "expected_columns": expected_columns,
                "expected_rows": expected_rows
            })
        except Exception:
            pass

    if normalized_cases:
        while len(normalized_cases) < min_cases:
            normalized_cases.append(dict(normalized_cases[-1]))

    return normalized_cases

async def evaluate_sql_submission(problem: dict, query: str, dialect: str = "sql"):
    """Run SQL against all normalized test cases without persisting results."""
    test_cases = build_sql_test_cases(problem, min_cases=5)
    if not test_cases:
        raise HTTPException(status_code=500, detail="No test cases configured for this SQL problem.")

    passed_tests = 0
    total_tests = len(test_cases)
    failed_details = []
    total_execution_time = 0

    async with execution_semaphore:
        for idx, test_case in enumerate(test_cases):
            try:
                start_time = datetime.now()
                columns, rows = execute_sql_problem_query(problem, query, dialect)
                execution_time = (datetime.now() - start_time).total_seconds() * 1000
                total_execution_time += execution_time
            except HTTPException as e:
                failed_details.append({
                    "test_case": idx + 1,
                    "error": e.detail
                })
                continue
            except Exception as e:
                failed_details.append({
                    "test_case": idx + 1,
                    "error": f"SQL execution error ({dialect.upper()}): {str(e)}"
                })
                continue

            expected_columns = test_case.get("expected_columns", [])
            expected_rows = test_case.get("expected_rows", [])

            if compare_result_sets(columns, rows, expected_columns, expected_rows):
                passed_tests += 1
            else:
                failed_details.append({
                    "test_case": idx + 1,
                    "expected": f"Columns: {expected_columns}, Rows: {expected_rows}",
                    "actual": f"Columns: {columns}, Rows: {rows}"
                })

    avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
    return passed_tests, total_tests, failed_details, avg_execution_time

