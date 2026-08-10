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

@router.get("/logo.png")
async def serve_logo():
    logo_path = os.path.join(os.path.dirname(__file__), '..', 'asset', 'meptrasoft-logo.png')
    return FileResponse(logo_path, media_type="image/png")


# ── SQLITE AUTH ENDPOINTS ─────────────────────────────────────────────────────

@router.post("/admin/candidate-test-type")
@router.post("/admin/candidate-shuffle")
@router.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Exam Session Management ---

@router.post("/exam/save-answer")
async def save_exam_answer(session_id: str, problem_id: str, code: str):
    """Auto-save answer during exam"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[session_id]
    
    if user_id not in exam_sessions or exam_sessions[user_id]["status"] != "active":
        raise HTTPException(status_code=400, detail="No active exam session")
    
    # Check if time expired
    elapsed = (datetime.now() - exam_sessions[user_id]["start_time"]).total_seconds()
    if elapsed >= EXAM_DURATION_SECONDS:
        raise HTTPException(status_code=400, detail="Exam time expired")
    
    exam_sessions[user_id]["answers"][problem_id] = code
    return {"status": "saved"}

@router.post("/exam/{exam_id}/logs")
async def create_proctoring_log(
    exam_id: int,
    payload: ProctoringLogCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Store a proctoring violation log for an exam."""
    if exam_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid exam_id")

    violation_type = payload.violation_type
    message = payload.message

    session_id = request.headers.get("X-Session-Id", "").strip()
    candidate_header = request.headers.get("X-Candidate-Id", "").strip()
    candidate_id = sessions.get(session_id)
    if candidate_id is None and candidate_header.isdigit():
        candidate_id = int(candidate_header)

    log = ProctoringLog(
        exam_id=exam_id,
        candidate_id=candidate_id,
        violation_type=violation_type,
        message=message
    )

    try:
        db.add(log)
        db.commit()
        db.refresh(log)
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save proctoring log") from exc

    return {"status": "success", "log_id": log.id}

@router.post("/sql/run")
async def run_sql(request: RunSqlRequest):
    """Execute SQL query and return result set with dialect support"""
    problem = get_problem(request.problem_id)
    if not problem or problem.get("language") != "sql":
        raise HTTPException(status_code=404, detail="SQL problem not found")

    async with execution_semaphore:
        try:
            columns, rows = execute_sql_problem_query(problem, request.query, request.dialect)
            
            return {
                "status": "success",
                "columns": columns,
                "rows": rows,
                "dialect": request.dialect
            }
        except HTTPException:
            # Re-raise validation errors
            raise
        except Exception as e:
            return {
                "status": "error",
                "error": f"SQL execution error ({request.dialect.upper()}): {str(e)}"
            }

@router.post("/sql/submit")
async def submit_sql(request: SubmitSqlRequest, db: Session = Depends(get_db)):
    """Submit SQL query with dialect support and evaluate against test cases"""
    # Verify session
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session. Please login again.")
    
    user_id = sessions[request.session_id]

    problem = get_problem(request.problem_id)
    if not problem or problem.get("language") != "sql":
        raise HTTPException(status_code=404, detail="SQL problem not found")
    passed_tests, total_tests, failed_details, avg_execution_time = await evaluate_sql_submission(problem, request.query, request.dialect)
    score = (passed_tests / total_tests) * 100
    verdict = get_verdict(passed_tests, total_tests)

    # Store submission
    new_submission = Submission(
        user_id=user_id,
        problem_id=request.problem_id,
        code=request.query,
        passed_tests=passed_tests,
        total_tests=total_tests,
        score=score,
        verdict=verdict,
        execution_time_ms=avg_execution_time,
        time_taken=request.time_taken,
        created_at=datetime.now().isoformat()
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    submission_id = new_submission.id

    # Best score logic
    existing = db.query(AdminResult).filter(
        AdminResult.user_id == user_id,
        AdminResult.problem_id == request.problem_id
    ).first()
    
    current_best_score = existing.best_score if existing else 0
    is_new_best = score > current_best_score

    if is_new_best:
        user_info = db.query(User).filter(User.id == user_id).first()
        
        if existing:
            existing.best_score = score
            existing.passed_tests = passed_tests
            existing.total_tests = total_tests
            existing.best_submission_id = submission_id
            existing.verdict = verdict
            existing.execution_time_ms = avg_execution_time
            existing.time_taken = request.time_taken
            existing.updated_at = datetime.now().isoformat()
        else:
            new_admin_result = AdminResult(
                user_id=user_id,
                name=user_info.name,
                email=user_info.email,
                problem_id=request.problem_id,
                best_score=score,
                passed_tests=passed_tests,
                total_tests=total_tests,
                best_submission_id=submission_id,
                verdict=verdict,
                execution_time_ms=avg_execution_time,
                time_taken=request.time_taken,
                updated_at=datetime.now().isoformat()
            )
            db.add(new_admin_result)
        db.commit()

    return {
        "submission_id": submission_id,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "score": score,
        "best_score": score if is_new_best else current_best_score,
        "is_new_best": is_new_best,
        "verdict": verdict,
        "execution_time_ms": round(avg_execution_time, 2),
        "failed_details": failed_details,
        "dialect": request.dialect
    }

@router.post("/admin/preview/sql-submit")
async def preview_submit_sql(request: PreviewSubmitSqlRequest):
    """Admin-only SQL preview submit without candidate session persistence."""
    problem = get_problem(request.problem_id)
    if not problem or problem.get("language") != "sql":
        raise HTTPException(status_code=404, detail="SQL problem not found")

    passed_tests, total_tests, failed_details, avg_execution_time = await evaluate_sql_submission(problem, request.query, request.dialect)
    return build_submission_response(
        passed_tests,
        total_tests,
        failed_details,
        avg_execution_time,
        {"dialect": request.dialect}
    )

