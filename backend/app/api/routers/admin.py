from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import uuid
import asyncio
from datetime import datetime
from app.db.database import get_db, SessionLocal
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

@router.delete("/admin/candidates/clear")
async def clear_all_candidates(db: Session = Depends(get_db)):
    """Delete all imported candidates"""
    deleted_count = db.query(CandidateOtp).delete()
    db.query(CandidateSelectedExamProblem).delete()
    db.commit()
    session_candidate_emails.clear()
    
    return {
        "status": "success",
        "message": f"Deleted {deleted_count} candidates",
        "deleted_count": deleted_count
    }

@router.get("/admin/candidates")
async def get_candidates(db: Session = Depends(get_db)):
    """Get all candidates with their OTP status"""
    candidates = get_all_candidates(db)
    return {"candidates": candidates}


@router.post("/admin/candidates/test-type")
async def set_candidate_test_type(request: dict, db: Session = Depends(get_db)):
    email = (request.get("email") or "").strip()
    test_type = normalize_test_type(request.get("test_type"))

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    updated = update_candidate_test_type(email, test_type, db)
    if not updated:
        raise HTTPException(status_code=404, detail="Candidate not found")

    clear_candidate_problem_set(email)

    return {
        "status": "success",
        "email": email,
        "test_type": test_type
    }


@router.post("/admin/candidates/shuffle")
async def shuffle_candidate_questions(request: dict, db: Session = Depends(get_db)):
    email = (request.get("email") or "").strip().lower()
    test_type = normalize_test_type(request.get("test_type"))

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    candidate = get_candidate_otp(email, db)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    update_candidate_test_type(email, test_type, db)

    selected_problems = []
    if has_test_type_section(test_type, "python"):
        python_problems = get_random_problems_by_difficulty("python", easy_count=2, medium_count=2, hard_count=1)
        selected_problems.extend([
            {
                "id": p["id"],
                "title": p["title"],
                "language": p["language"],
                "difficulty": p.get("difficulty", "Medium"),
                "marks": p.get("marks", 10),
                "time_limit": p.get("time_limit", 10),
            }
            for p in python_problems
        ])

    if has_test_type_section(test_type, "sql"):
        sql_problems = get_random_problems_by_difficulty("sql", easy_count=2, medium_count=2, hard_count=1)
        selected_problems.extend([
            {
                "id": p["id"],
                "title": p["title"],
                "language": p["language"],
                "difficulty": p.get("difficulty", "Medium"),
                "marks": p.get("marks", 10),
                "time_limit": p.get("time_limit", 10),
            }
            for p in sql_problems
        ])

    if has_test_type_section(test_type, "mcq"):
        mcq_questions = get_random_mcq_questions_by_difficulty(easy_count=2, medium_count=2, hard_count=1)
        selected_problems.extend([
            {
                "id": question["id"],
                "title": question["question_title"],
                "language": "mcq",
                "difficulty": question.get("difficulty", "easy"),
                "marks": question.get("marks", 10),
                "time_limit": question.get("time", 10),
            }
            for question in mcq_questions
        ])

    if not selected_problems:
        raise HTTPException(status_code=400, detail="No problems available for the selected test type")

    save_candidate_problem_set(email, selected_problems)

    return {
        "status": "success",
        "email": email,
        "test_type": test_type,
        "saved": len(selected_problems)
    }


@router.put("/admin/candidates/{email}")
async def update_candidate(email: str, request: dict, db: Session = Depends(get_db)):
    current_email = (email or "").strip().lower()
    next_username = (request.get("username") or "").strip()
    next_email = (request.get("email") or "").strip().lower()

    if not next_username or not next_email:
        raise HTTPException(status_code=400, detail="Username and email are required")

    existing = db.query(CandidateOtp).filter(CandidateOtp.email.ilike(current_email)).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")

    email_exists = db.query(CandidateOtp).filter(CandidateOtp.email.ilike(next_email), CandidateOtp.email.notilike(current_email)).first()
    if email_exists:
        raise HTTPException(status_code=409, detail="Another candidate already uses this email")

    username_exists = db.query(CandidateOtp).filter(CandidateOtp.username.ilike(next_username), CandidateOtp.email.notilike(current_email)).first()
    if username_exists:
        raise HTTPException(status_code=409, detail="Another candidate already uses this username")

    existing.username = next_username
    existing.email = next_email

    if next_email != current_email:
        db.query(CandidateSelectedExamProblem).filter(CandidateSelectedExamProblem.candidate_email.ilike(next_email)).delete(synchronize_session=False)
        db.query(CandidateSelectedExamProblem).filter(CandidateSelectedExamProblem.candidate_email.ilike(current_email)).update({"candidate_email": next_email}, synchronize_session=False)

        for session_id, candidate_email in list(session_candidate_emails.items()):
            if str(candidate_email or "").strip().lower() == current_email:
                session_candidate_emails[session_id] = next_email

    db.commit()

    return {
        "status": "success",
        "message": "Candidate updated successfully",
        "candidate": {
            "username": next_username,
            "email": next_email,
        }
    }


@router.delete("/admin/candidates/{email}")
async def delete_candidate(email: str, db: Session = Depends(get_db)):
    """Delete a specific candidate by email"""
    normalized_email = (email or "").strip().lower()
    existing = db.query(CandidateOtp).filter(CandidateOtp.email.ilike(normalized_email)).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    username = existing.username

    db.query(CandidateOtp).filter(CandidateOtp.email.ilike(normalized_email)).delete(synchronize_session=False)
    db.query(CandidateSelectedExamProblem).filter(CandidateSelectedExamProblem.candidate_email.ilike(normalized_email)).delete(synchronize_session=False)
    db.commit()
    for session_id, candidate_email in list(session_candidate_emails.items()):
        if str(candidate_email or "").strip().lower() == normalized_email:
            session_candidate_emails.pop(session_id, None)

    return {
        "status": "success",
        "message": f"Deleted candidate {existing[0]}",
        "username": existing[0]
    }

@router.post("/admin/import-candidates")
async def import_candidates(request: dict, db: Session = Depends(get_db)):
    """Import candidates from a list (username, email) with duplicate checking"""
    candidates = request.get("candidates", [])
    
    if not candidates:
        raise HTTPException(status_code=400, detail="No candidates provided")
    
    imported = []
    duplicates = []
    errors = []
    
    for candidate in candidates:
        username = candidate.get("username", "").strip()
        email = candidate.get("email", "").strip()
        
        if not username or not email:
            errors.append(f"Missing username or email: {candidate}")
            continue
        
        # Check if candidate already exists by email OR username
        existing = db.query(CandidateOtp).filter(
            (CandidateOtp.email == email) | (CandidateOtp.username == username)
        ).first()
        
        if existing:
            duplicates.append({
                "username": username,
                "email": email,
                "reason": f"Candidate with email '{email}' or username '{username}' already exists"
            })
            continue
        
        # Save candidate without OTP (OTP to be generated later)
        new_candidate = CandidateOtp(
            username=username,
            email=email,
            otp_code="",
            expires_at="",
            created_at=datetime.now().isoformat(),
            sent=False,
            status="unused",
            test_type="both"
        )
        db.add(new_candidate)
        imported.append({"username": username, "email": email})
    
    db.commit()
    
    return {
        "status": "success",
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors,
        "message": f"Imported {len(imported)} candidates, skipped {len(duplicates)} duplicates"
    }

@router.post("/admin/generate-otp")
async def generate_candidate_otp(request: dict, db: Session = Depends(get_db)):
    """Generate OTP for a candidate"""
    username = request.get("username")
    email = request.get("email")
    
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Generate OTP
    otp_code = generate_otp()
    
    # Save to database
    save_candidate_otp(username, email, otp_code, db)
    
    return {
        "status": "success",
        "username": username,
        "email": email,
        "otp": otp_code,
        "message": f"OTP generated for {email}"
    }

@router.post("/admin/send-otp-email")
async def send_otp_email(body: dict, db: Session = Depends(get_db)):
    """Send OTP email to candidate with proper delivery confirmation"""
    email = (body.get("email") or "").strip().lower()

    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    candidate = get_candidate_otp(email, db)

    if not candidate:
        raise HTTPException(status_code=400, detail="Candidate not found. Add the candidate first.")

    username = candidate.get("username") or (body.get("username") or "").strip() or email.split("@")[0]
    otp_regenerated = False

    if candidate.get("otp_code") and candidate.get("expires_at"):
        try:
            otp_is_expired = datetime.now() > datetime.fromisoformat(candidate["expires_at"])
        except ValueError:
            otp_is_expired = True
    else:
        otp_is_expired = True

    if otp_is_expired:
        otp_code = generate_otp()
        save_candidate_otp(username, email, otp_code, db)
        candidate = get_candidate_otp(email, db)
        otp_regenerated = True

    try:
        result = send_email_otp(email, candidate["otp_code"], username, candidate.get("test_type", "both"))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to prepare email for {email}. {str(exc)}") from exc

    if result["success"]:
        mark_otp_sent(email, db)
        return {
            "status": "success",
            "message": f"Email sent successfully to {email}",
            "delivered": True,
            "otp_regenerated": otp_regenerated,
        }
    else:
        # Email sending failed
        error_detail = result.get("error", "Failed to send email")

        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email to {email}. {error_detail}"
        )

@router.get("/admin/problems")
async def get_all_problems():
    return list_problems()

@router.post("/admin/problems")
async def add_problem(problem: dict, db: Session = Depends(get_db)):
    pid = problem.get("id")
    if not pid:
        raise HTTPException(status_code=400, detail="Problem must have an id")
    try:
        if pid in PROBLEMS:
            raise HTTPException(status_code=400, detail="Problem ID already exists")
        
        # Save to database for permanent storage
        test_cases_json = json.dumps(problem.get("test_cases", []))
        created_at = datetime.now().isoformat()
        
        # Handle both old string format and new object format for input_format
        input_format_value = problem.get("input_format", "")
        if isinstance(input_format_value, dict):
            input_format_value = json.dumps(input_format_value)
        
        # Use statement or description for backward compatibility
        statement_value = problem.get("statement") or problem.get("description", "")
        description_value = problem.get("description") or problem.get("statement", "")
        
        new_problem = CustomProblem(
            id=problem.get("id"),
            title=problem.get("title"),
            language=problem.get("language"),
            difficulty=problem.get("difficulty", "Medium"),
            marks=problem.get("marks", 10),
            time_limit=problem.get("time_limit", 10),
            statement=statement_value,
            description=description_value,
            input_format=input_format_value,
            output_format=problem.get("output_format", ""),
            sample_input=problem.get("sample_input", ""),
            sample_output=problem.get("sample_output", ""),
            starter_code=problem.get("starter_code", ""),
            test_cases_json=test_cases_json,
            schema_sql=problem.get("schema_sql", ""),
            seed_sql=problem.get("seed_sql", ""),
            created_at=created_at
        )
        db.add(new_problem)
        db.commit()
        
        # Normalize and add to in-memory PROBLEMS for immediate availability
        normalized = {
            **problem,
            "statement": problem.get("statement") or problem.get("description", ""),
            "description": problem.get("description") or problem.get("statement", ""),
            "created_at": created_at,
            "test_cases": problem.get("test_cases", []),
        }
        PROBLEMS[pid] = normalized
        sync_custom_problems_export()
        return {"status": "ok", "id": pid}
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error adding problem: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to add problem: {str(e)}")

@router.delete("/admin/problems/{problem_id}")
async def delete_problem(problem_id: str, db: Session = Depends(get_db)):
    if problem_id not in PROBLEMS:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Delete from database as well
    db.query(CustomProblem).filter(CustomProblem.id == problem_id).delete(synchronize_session=False)
    db.commit()
    
    # Also delete from in-memory PROBLEMS
    del PROBLEMS[problem_id]
    sync_custom_problems_export()
    return {"status": "ok"}

@router.get("/admin/mcq-questions")
async def get_all_mcq_questions():
    return {"questions": fetch_all_mcq_questions(include_internal=True, descending=True)}


@router.post("/admin/mcq-questions")
async def create_mcq_question(question: MCQQuestionCreate, db: Session = Depends(get_db)):
    question_id = f"mcq_{uuid.uuid4().hex[:12]}"
    created_at = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    
    new_question = MCQQuestion(
        id=question_id,
        title=question.question_title,
        question_text=question.question,
        option_a=question.options[0] if len(question.options) > 0 else "",
        option_b=question.options[1] if len(question.options) > 1 else "",
        option_c=question.options[2] if len(question.options) > 2 else "",
        option_d=question.options[3] if len(question.options) > 3 else "",
        correct_option="ABCD"[question.correct_answer] if 0 <= question.correct_answer < 4 else "A",
        question_title=question.question_title,
        question=question.question,
        options_json=json.dumps(question.options),
        correct_answer=question.correct_answer,
        difficulty=question.difficulty,
        marks=question.marks,
        time=question.time,
        topic=question.topic,
        explanation=question.explanation,
        created_at=created_at
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    return {"status": "ok", "question": serialize_mcq_question(new_question, include_internal=True)}


@router.delete("/admin/mcq-questions/{question_id}")
async def delete_mcq_question(question_id: str, db: Session = Depends(get_db)):
    deleted = db.query(MCQQuestion).filter(MCQQuestion.id == question_id).delete(synchronize_session=False)
    if deleted == 0:
        raise HTTPException(status_code=404, detail="MCQ question not found")
    db.commit()
    return {"status": "ok"}

@router.get("/admin/problems/random")
async def get_random_problems(language: str = "python"):
    """Get 5 random problems extracted from Questions page (2 easy, 2 medium, 1 hard)"""
    if language not in ["python", "sql"]:
        raise HTTPException(status_code=400, detail="Language must be 'python' or 'sql'")
    
    problems = get_random_problems_by_difficulty(language, easy_count=2, medium_count=2, hard_count=1)
    
    # Store the selected problems globally
    selected_random_problems[language] = [
        {
            "id": p["id"],
            "title": p["title"],
            "language": p["language"],
            "difficulty": p.get("difficulty", "Medium"),
            "marks": p.get("marks", 10),
            "time_limit": p.get("time_limit", 10)
        }
        for p in problems
    ]
    
    return {"problems": selected_random_problems[language]}

@router.get("/admin/problems/random/replace")
async def replace_problem(problem_id: str, language: str = "python"):
    """Replace a specific problem with another random problem of the same difficulty"""
    if language not in ["python", "sql"]:
        raise HTTPException(status_code=400, detail="Language must be 'python' or 'sql'")
    
    problem_to_replace = get_problem(problem_id)
    if not problem_to_replace:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    difficulty = problem_to_replace.get("difficulty", "Medium")
    difficulty_key = str(difficulty).strip().lower()

    current_selected = selected_random_problems.get(language, [])
    selected_ids = {
        p.get("id")
        for p in current_selected
        if p.get("id") and p.get("id") != problem_id
    }
    selected_titles = {
        str(p.get("title", "")).strip().lower()
        for p in current_selected
        if p.get("title")
    }
    if not selected_titles:
        selected_titles.add(str(problem_to_replace.get("title", "")).strip().lower())

    problems = [
        p for p in PROBLEMS.values()
        if p.get("language") == language
        and p.get("id") != problem_id
        and str(p.get("difficulty", "Medium")).strip().lower() == difficulty_key
        and p.get("id") not in selected_ids
        and str(p.get("title", "")).strip().lower() not in selected_titles
    ]

    if not problems:
        raise HTTPException(
            status_code=404,
            detail="No unique problems available with the same difficulty"
        )

    replacement = random.choice(problems)
    replacement_info = {
        "id": replacement["id"],
        "title": replacement["title"],
        "language": replacement["language"],
        "difficulty": replacement.get("difficulty", "Medium"),
        "marks": replacement.get("marks", 10),
        "time_limit": replacement.get("time_limit", 10)
    }

    # Keep backend selection in sync with each replacement action.
    if current_selected:
        updated = []
        replaced = False
        for selected_problem in current_selected:
            if selected_problem.get("id") == problem_id and not replaced:
                updated.append(replacement_info)
                replaced = True
            else:
                updated.append(selected_problem)
        if replaced:
            selected_random_problems[language] = updated

    return {
        "replaced": {
            "id": problem_to_replace["id"],
            "title": problem_to_replace["title"],
            "difficulty": difficulty
        },
        "new": replacement_info
    }

@router.post("/admin/exam/save")
async def save_exam_problems(request_data: dict, db: Session = Depends(get_db)):
    """Save selected exam problems permanently for candidates"""
    problems = request_data.get("problems", [])
    if not problems:
        raise HTTPException(status_code=400, detail="No problems provided")
    
    # Clear existing saved problems
    db.query(SelectedExamProblem).delete()
    
    # Insert new problems
    saved_at = datetime.now().isoformat()
    for p in problems:
        new_problem = SelectedExamProblem(
            problem_id=p.get("id"),
            language=p.get("language"),
            difficulty=p.get("difficulty", "Medium"),
            marks=p.get("marks", 10),
            time_limit=p.get("time_limit", 10),
            title=p.get("title"),
            saved_at=saved_at
        )
        db.add(new_problem)
    
    db.commit()
    
    # Also update in-memory selected_random_problems
    selected_random_problems["python"] = [p for p in problems if p.get("language") == "python"]
    selected_random_problems["sql"] = [p for p in problems if p.get("language") == "sql"]
    
    return {"status": "ok", "saved": len(problems)}

@router.get("/admin/exam/selected")
async def get_saved_exam_problems(email: Optional[str] = None, db: Session = Depends(get_db)):
    """Get saved exam problems, optionally filtered for a specific candidate."""
    rows = db.query(SelectedExamProblem).all()

    global_problems = []
    for row in rows:
        problem = get_problem(row.problem_id)
        if problem:
            global_problems.append({
                "id": problem["id"],
                "title": problem["title"],
                "language": problem["language"],
                "difficulty": problem.get("difficulty", "Medium"),
                "marks": problem.get("marks", 10),
                "time_limit": problem.get("time_limit", 10)
            })

    if not email:
        return {
            "problems": global_problems,
            "scope": "global",
        }

    normalized_email = (email or "").strip().lower()
    candidate = get_candidate_otp(normalized_email, db)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate_problems = get_candidate_problem_set(normalized_email)
    candidate_test_type = normalize_test_type(candidate.get("test_type"))

    if candidate_problems:
        selected_problems = candidate_problems
        source = "candidate_shuffle"
    else:
        selected_problems = []
        if has_test_type_section(candidate_test_type, "python"):
            selected_problems.extend([problem for problem in global_problems if problem.get("language") == "python"])
        if has_test_type_section(candidate_test_type, "sql"):
            selected_problems.extend([problem for problem in global_problems if problem.get("language") == "sql"])
        if has_test_type_section(candidate_test_type, "mcq"):
            selected_problems.extend(get_assigned_mcq_questions(candidate_test_type))
        source = "global_filtered"

    return {
        "problems": selected_problems,
        "scope": "candidate",
        "candidate": {
            "email": normalized_email,
            "username": candidate.get("username") or normalized_email.split("@")[0],
            "test_type": candidate_test_type,
            "test_type_label": get_test_type_label(candidate_test_type),
            "source": source,
        }
    }

def load_saved_exam_problems():
    """Load saved exam problems from database at startup"""
    db = SessionLocal()
    try:
        rows = db.query(SelectedExamProblem).all()
        
        python_problems = []
        sql_problems = []
        
        for row in rows:
            problem = get_problem(row.problem_id)
            if problem:
                problem_info = {
                    "id": problem["id"],
                    "title": problem["title"],
                    "language": problem["language"],
                    "difficulty": problem.get("difficulty", "Medium"),
                    "marks": problem.get("marks", 10),
                    "time_limit": problem.get("time_limit", 10)
                }
                if row.language == "python":
                    python_problems.append(problem_info)
                else:
                    sql_problems.append(problem_info)
        
        if python_problems or sql_problems:
            selected_random_problems["python"] = python_problems
            selected_random_problems["sql"] = sql_problems
    finally:
        db.close()

# Load saved exam problems at startup
load_saved_exam_problems()

