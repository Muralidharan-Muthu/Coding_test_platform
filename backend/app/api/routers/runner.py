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

@router.post("/run")
async def run_code(request: RunCodeRequest):
    # Check if custom input is empty or whitespace
    if not request.custom_input or not request.custom_input.strip():
        return {"error": "INPUT_REQUIRED"}
    
    async with execution_semaphore:
        runner = PythonRunner()
        result = await runner.run_with_input(request.code, request.custom_input)
        return result

async def evaluate_python_submission(problem: dict, code: str):
    """Run Python code against all configured test cases without persisting results."""
    runner = PythonRunner()
    passed_tests = 0
    total_tests = len(problem["test_cases"])
    failed_details = []
    total_execution_time = 0

    async with execution_semaphore:
        for i, test_case in enumerate(problem["test_cases"]):
            start_time = datetime.now()
            result = await runner.run_with_input(code, test_case["input"])
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            total_execution_time += execution_time

            if result["status"] == "success":
                expected_output = test_case.get("expected_output") or test_case.get("output", "")
                actual_output = result["stdout"]

                if compare_outputs(actual_output, expected_output):
                    passed_tests += 1
                else:
                    failed_details.append({
                        "test_case": i + 1,
                        "expected": normalize_output(expected_output),
                        "actual": normalize_output(actual_output)
                    })
            else:
                error_msg = result["stderr"]
                if "Traceback" in error_msg:
                    lines = error_msg.strip().split('\n')
                    error_msg = lines[-1] if lines else error_msg

                failed_details.append({
                    "test_case": i + 1,
                    "error": error_msg
                })

    avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
    return passed_tests, total_tests, failed_details, avg_execution_time

def build_submission_response(passed_tests: int, total_tests: int, failed_details: list, avg_execution_time: float, extras: Optional[dict] = None):
    """Shape submission responses consistently for exam and Admin preview flows."""
    score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    response = {
        "submission_id": None,
        "passed_tests": passed_tests,
        "total_tests": total_tests,
        "score": score,
        "best_score": score,
        "is_new_best": False,
        "verdict": get_verdict(passed_tests, total_tests),
        "execution_time_ms": round(avg_execution_time, 2),
        "failed_details": failed_details
    }
    if extras:
        response.update(extras)
    return response

@router.post("/submit")
async def submit_code(request: SubmitCodeRequest, db: Session = Depends(get_db)):
    # Verify session
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session. Please login again.")
    
    user_id = sessions[request.session_id]
    
    # Get problem details
    problem = get_problem(request.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    passed_tests, total_tests, failed_details, avg_execution_time = await evaluate_python_submission(problem, request.code)
    score = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    verdict = get_verdict(passed_tests, total_tests)
    
    # Save submission
    new_submission = Submission(
        user_id=user_id,
        problem_id=request.problem_id,
        code=request.code,
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

    # Get current best score
    existing = db.query(AdminResult).filter(
        AdminResult.user_id == user_id, 
        AdminResult.problem_id == request.problem_id
    ).first()
    current_best_score = existing.best_score if existing else 0

    # Check if this is a new best
    is_new_best = score > current_best_score

    # Update admin_results only if new best score
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
        "failed_details": failed_details
    }

@router.post("/admin/preview/submit")
async def preview_submit_code(request: PreviewSubmitCodeRequest):
    """Admin-only preview submit: evaluate against test cases without requiring a candidate session."""
    problem = get_problem(request.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    passed_tests, total_tests, failed_details, avg_execution_time = await evaluate_python_submission(problem, request.code)
    return build_submission_response(passed_tests, total_tests, failed_details, avg_execution_time)


# --- Assessment Dashboard API Endpoints ---
# Now uses database instead of Excel files


class AssessmentResultRequest(BaseModel):
    """Request body for posting new assessment result"""
    candidate_id: str
    name: str
    email: str
    phone: str
    test_date: str
    login_time: str
    submit_time: str
    submission_type: str
    time_taken_min: int
    total_questions: int
    python_questions: int
    sql_questions: int
    mcq_questions: int = 0
    python_score: float
    sql_score: float
    mcq_score: float = 0
    problem_testcases: dict
    problem_scores: dict





from app.db.database import SessionLocal

def serialize_mcq_question(row, include_internal: bool = False):
    import json
    
    try:
        options = json.loads(row.options_json) if row.options_json else ["", "", "", ""]
    except:
        options = ["", "", "", ""]

    difficulty = str(row.difficulty or "easy").strip().lower()
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "easy"

    marks = row.marks if row.marks is not None else {"easy": 10, "medium": 20, "hard": 30}[difficulty]
    time_value = row.time if row.time is not None else {"easy": 10, "medium": 20, "hard": 30}[difficulty]
    topic = row.topic if row.topic else "Python"

    question_data = {
        "question_title": row.question_title if row.question_title else (row.title if row.title else ""),
        "question": row.question if row.question else (row.question_text if row.question_text else ""),
        "options": options,
        "correct_answer": row.correct_answer if row.correct_answer is not None else 0,
        "difficulty": difficulty,
        "marks": marks,
        "time": time_value,
        "topic": topic,
        "explanation": row.explanation if row.explanation else "",
    }

    if include_internal:
        question_data["id"] = row.id
        question_data["created_at"] = row.created_at

    return question_data


def fetch_all_mcq_questions(include_internal: bool = False, descending: bool = False):
    db = SessionLocal()
    try:
        query = db.query(MCQQuestion)
        if descending:
            query = query.order_by(MCQQuestion.created_at.desc(), MCQQuestion.id.desc())
        else:
            query = query.order_by(MCQQuestion.created_at.asc(), MCQQuestion.id.asc())
            
        return [serialize_mcq_question(row, include_internal=include_internal) for row in query.all()]
    finally:
        db.close()


def fetch_mcq_question_by_id(question_id: str, include_internal: bool = False):
    db = SessionLocal()
    try:
        row = db.query(MCQQuestion).filter(MCQQuestion.id == question_id).first()
        if not row:
            return None
        return serialize_mcq_question(row, include_internal=include_internal)
    finally:
        db.close()

PROCTORING_TRUST_DEDUCTIONS = {
    "face_missing": 1,
    "webcam_unavailable": 10,
    "gaze_warning": 5,
    "window_blur": 5,
    "tab_switch": 5,
    "fullscreen_exit": 5,
    "copy_attempt": 3,
    "paste_attempt": 3,
    "mouth_open": 10,
    "head_turn": 10,
    "external_screen": 20,
    "multiple_faces": 20,
    "phone_detected": 20,
}


def calculate_trust_score(logs):
    score = 100
    for log in logs:
        violation_type = str(log.get("violation_type", "")).strip().lower()
        count = log.get("count", 1)
        try:
            count_value = int(count)
        except (TypeError, ValueError):
            count_value = 1
        if count_value < 1:
            count_value = 1

        deduction = PROCTORING_TRUST_DEDUCTIONS.get(violation_type, 0)
        score -= deduction * count_value

    return max(min(score, 100), 0)


def serialize_proctoring_log(log):
    timestamp = log.timestamp.isoformat() if getattr(log, "timestamp", None) else None
    return {
        "id": log.id,
        "exam_id": log.exam_id,
        "candidate_id": log.candidate_id,
        "violation_type": log.violation_type,
        "message": log.message,
        "timestamp": timestamp,
    }


def group_proctoring_logs(logs):
    """Collapse repeated proctoring events that share the same type and message."""
    grouped = {}

    for log in logs:
        violation_type = str(log.get("violation_type", "")).strip()
        message = str(log.get("message", "")).strip()
        key = (violation_type.lower(), message.lower())
        timestamp = log.get("timestamp")

        if key not in grouped:
            grouped[key] = {
                "id": log.get("id"),
                "exam_id": log.get("exam_id"),
                "candidate_id": log.get("candidate_id"),
                "violation_type": violation_type,
                "message": message,
                "timestamp": timestamp,
                "last_timestamp": timestamp,
                "count": 0,
            }

        entry = grouped[key]
        entry["count"] += 1

        if timestamp:
            if not entry["timestamp"] or timestamp < entry["timestamp"]:
                entry["timestamp"] = timestamp
            if not entry["last_timestamp"] or timestamp > entry["last_timestamp"]:
                entry["last_timestamp"] = timestamp

    grouped_logs = list(grouped.values())
    grouped_logs.sort(key=lambda item: (item.get("timestamp") or "", item.get("id") or 0))
    return grouped_logs


