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

@router.get("/problems/python")
async def get_python_problems(session_id: Optional[str] = None):
    """Get Python problems filtered by the candidate's assigned test type."""
    test_type = get_session_test_type(session_id)
    if not has_test_type_section(test_type, "python"):
        return []
    python_problems, _ = get_assigned_problem_sets_for_session(session_id, test_type)
    return python_problems

@router.get("/problems/sql")
async def get_sql_problems(session_id: Optional[str] = None):
    """Get SQL problems filtered by the candidate's assigned test type."""
    test_type = get_session_test_type(session_id)
    if not has_test_type_section(test_type, "sql"):
        return []
    _, sql_problems = get_assigned_problem_sets_for_session(session_id, test_type)
    return sql_problems

@router.get("/problems/mcq")
async def get_mcq_problems(session_id: Optional[str] = None):
    """Get MCQ questions filtered by the candidate's assigned test type."""
    test_type = get_session_test_type(session_id)
    if not has_test_type_section(test_type, "mcq"):
        return []
    return get_assigned_mcq_questions_for_session(session_id, test_type)

@router.get("/practice/problems")
async def get_practice_problems(language: Optional[str] = None):
    """Practice mode: the full admin problem bank, no exam session required.

    Practice is untimed and unproctored, so it is never filtered by test type
    or by the admin's exam selection — a logged-in candidate sees everything.
    """
    if language:
        normalized = language.strip().lower()
        if normalized not in ("python", "sql"):
            raise HTTPException(status_code=400, detail="language must be 'python' or 'sql'.")
        return get_problems_for_language(normalized)

    return {
        "python": get_problems_for_language("python"),
        "sql": get_problems_for_language("sql"),
    }


@router.get("/problems/{problem_id}")
async def get_problem_details(problem_id: str):
    problem = get_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    input_format_value = problem.get("input_format", "")
    if problem.get("language") == "sql" and isinstance(input_format_value, str):
        try:
            parsed_input_format = json.loads(input_format_value) if input_format_value.strip().startswith("{") else input_format_value
            input_format_value = parsed_input_format
        except Exception:
            pass

    input_preview_columns = []
    input_preview_rows = []
    output_preview_columns = []
    output_preview_rows = []
    expected_output = None

    if problem.get("language") == "sql":
        raw_cases = problem.get("test_cases", []) or []
        for case in raw_cases:
            case_expected_output = case.get("expected_output")
            if isinstance(case_expected_output, dict):
                case_columns = case_expected_output.get("columns", []) or []
                case_rows = case_expected_output.get("rows", []) or []
                if case_columns or case_rows:
                    expected_output = {
                        "columns": case_columns,
                        "rows": case_rows,
                    }
                    break

            case_columns = case.get("expected_columns", []) or []
            case_rows = case.get("expected_rows", []) or []
            if case_columns or case_rows:
                expected_output = {
                    "columns": case_columns,
                    "rows": case_rows,
                }
                break

        try:
            schema_sql = problem.get("schema_sql", "") or ""
            seed_sql = problem.get("seed_sql", "") or ""
            starter_code = problem.get("starter_code", "") or ""

            if schema_sql:
                conn = sqlite3.connect(":memory:")
                cursor = conn.cursor()
                cursor.executescript(schema_sql)
                if seed_sql:
                    cursor.executescript(seed_sql)

                # Generate input preview from first table
                table_match = None
                for stmt in schema_sql.split(";"):
                    s = stmt.strip()
                    if not s:
                        continue
                    if s.lower().startswith("create table"):
                        table_match = s
                        break

                table_name = None
                if table_match:
                    tokens = table_match.replace("(", " ( ").split()
                    if len(tokens) >= 3:
                        table_name = tokens[2].strip('`"[]')

                if table_name:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                    rows = cursor.fetchall()
                    input_preview_columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    input_preview_rows = [list(row) for row in rows]

                # Generate expected output preview by executing starter code query
                if starter_code:
                    try:
                        cursor.execute(starter_code)
                        output_rows = cursor.fetchall()
                        output_preview_columns = [desc[0] for desc in cursor.description] if cursor.description else []
                        output_preview_rows = [list(row) for row in output_rows]
                    except Exception:
                        # Query might fail with given schema, keep empty
                        pass

                cursor.close()
                conn.close()
        except Exception:
            # Keep API stable even if preview generation fails.
            input_preview_columns = []
            input_preview_rows = []
            output_preview_columns = []
            output_preview_rows = []

    # Return problem without hidden judging test case details
    return {
        "id": problem.get("id", ""),
        "title": problem.get("title", ""),
        "statement": problem.get("statement") or problem.get("description", ""),
        # For SQL: Use 'tables' field (new structure), keep 'input_format' for backward compatibility
        "tables": input_format_value.get("tables", []) if isinstance(input_format_value, dict) and problem.get("language") == "sql" else [],
        "input_format": input_format_value,
        "output_format": problem.get("output_format", ""),
        "sample_input": problem.get("sample_input", ""),
        "sample_output": problem.get("sample_output", ""),
        "starter_code": problem.get("starter_code", ""),
        "language": problem.get("language", "python"),
        "difficulty": problem.get("difficulty", "Medium"),
        "marks": problem.get("marks", 10),
        "time_limit": problem.get("time_limit", 10),
        "expected_output": expected_output,
        "input_preview_columns": input_preview_columns,
        "input_preview_rows": input_preview_rows,
        "output_preview_columns": output_preview_columns,
        "output_preview_rows": output_preview_rows,
    }

@router.get("/api/mcq-questions")
async def get_public_mcq_questions():
    return {"questions": fetch_all_mcq_questions(include_internal=False, descending=True)}


