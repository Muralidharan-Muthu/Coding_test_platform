"""
Assessment Service - Database operations for assessments
Handles reading, writing assessment records from/to database
"""

import json
from datetime import datetime
from typing import Dict, List, Optional, Any


def _extract_problem_slot(key: str) -> int:
    """Extract the numeric slot from keys such as P1_py or P6_sql."""
    if not isinstance(key, str) or not key.startswith("P"):
        return 0

    number_text = key[1:].split("_", 1)[0]
    return int(number_text) if number_text.isdigit() else 0


def normalize_problem_scores(problem_scores: Any) -> Dict[str, Any]:
    """
    Normalize stored problem score keys so the dashboard always receives:
    P1_py..P5_py and P6_sql..P10_sql.

    Older records may contain SQL keys like P1_sql / P2_sql when the
    submission order did not match the dashboard's fixed column layout.
    """
    if not isinstance(problem_scores, dict):
        return {}

    normalized: Dict[str, Any] = {}

    python_items = sorted(
        ((key, value) for key, value in problem_scores.items() if str(key).endswith("_py")),
        key=lambda item: _extract_problem_slot(item[0]),
    )
    sql_items = sorted(
        ((key, value) for key, value in problem_scores.items() if str(key).endswith("_sql")),
        key=lambda item: _extract_problem_slot(item[0]),
    )

    for index, (_, value) in enumerate(python_items[:5], start=1):
        normalized[f"P{index}_py"] = value

    for index, (_, value) in enumerate(sql_items[:5], start=6):
        normalized[f"P{index}_sql"] = value

    return normalized


def calculate_verdict(overall_percentage: float) -> str:
    """Calculate verdict based on overall percentage"""
    if overall_percentage < 40:
        return "Below Average"
    elif overall_percentage <= 60:
        return "Average"
    else:
        return "Good"


def _resolve_max_possible_score(data: Dict[str, Any]) -> float:
    """Resolve max possible score for percentage calculation."""
    max_possible_score = data.get("max_possible_score")
    try:
        max_possible_score = float(max_possible_score)
    except (TypeError, ValueError):
        max_possible_score = 0.0

    if max_possible_score <= 0:
        # Prefer reconstructing denominator from persisted score + percentage.
        overall_score = data.get("overall_score", 0)
        overall_percentage = data.get("overall_percentage", 0)
        try:
            overall_score = float(overall_score)
        except (TypeError, ValueError):
            overall_score = 0.0
        try:
            overall_percentage = float(overall_percentage)
        except (TypeError, ValueError):
            overall_percentage = 0.0

        if overall_score > 0 and overall_percentage > 0:
            max_possible_score = (overall_score * 100.0) / overall_percentage

    if max_possible_score <= 0:
        # Fallback for older rows when percentage is also unavailable.
        total_questions = data.get("total_questions", 0)
        try:
            total_questions = int(total_questions)
        except (TypeError, ValueError):
            total_questions = 0
        max_possible_score = float(total_questions * 10)

    if max_possible_score <= 0:
        max_possible_score = 200.0

    return max_possible_score


def _apply_derived_score_fields(record: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure percentage/verdict are always derived from score logic."""
    overall_score = record.get("overall_score", 0)
    try:
        overall_score = float(overall_score)
    except (TypeError, ValueError):
        overall_score = 0.0

    max_possible_score = _resolve_max_possible_score(record)
    overall_percentage = round((overall_score / max_possible_score) * 100, 2) if max_possible_score > 0 else 0.0
    overall_verdict = calculate_verdict(overall_percentage)

    record["max_possible_score"] = max_possible_score
    record["overall_percentage"] = overall_percentage
    record["overall_verdict"] = overall_verdict
    return record


from sqlalchemy.orm import Session
from app.models.domain import Assessment

def create_assessment(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new assessment record in the database"""
    
    # Calculate derived values
    python_score = data.get("python_score", 0)
    sql_score = data.get("sql_score", 0)
    mcq_score = data.get("mcq_score", 0)
    overall_score = python_score + sql_score + mcq_score
    max_possible_score = _resolve_max_possible_score(data)
    overall_percentage = (overall_score / max_possible_score) * 100 if max_possible_score > 0 else 0
    overall_verdict = calculate_verdict(overall_percentage)
    
    # Insert assessment record
    new_assessment = Assessment(
        user_id=data["user_id"],
        candidate_id=data["candidate_id"],
        name=data["name"],
        email=data["email"],
        phone=data.get("phone", ""),
        test_date=data["test_date"],
        login_time=data["login_time"],
        submit_time=data["submit_time"],
        submission_type=data["submission_type"],
        time_taken_min=data["time_taken_min"],
        total_questions=data["total_questions"],
        python_questions=data["python_questions"],
        sql_questions=data["sql_questions"],
        mcq_questions=data.get("mcq_questions", 0),
        test_location=data.get("test_location", "home"),
        python_score=python_score,
        sql_score=sql_score,
        mcq_score=mcq_score,
        overall_score=overall_score,
        max_possible_score=max_possible_score,
        overall_percentage=overall_percentage,
        overall_verdict=overall_verdict,
        problem_testcases_json=json.dumps(data.get("problem_testcases", {})),
        problem_scores_json=json.dumps(data.get("problem_scores", {})),
        created_at=datetime.now().isoformat()
    )
    
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)
    
    return {
        "success": True,
        "assessment_id": new_assessment.id,
        "candidate_id": data["candidate_id"]
    }


def read_all_assessments(
    db: Session,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None,
    test_location: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Read all assessments from database with optional filters"""
    query = db.query(Assessment)

    if date_from:
        query = query.filter(Assessment.test_date >= date_from)

    if date_to:
        query = query.filter(Assessment.test_date <= date_to)

    if submission_type and submission_type != "All":
        query = query.filter(Assessment.submission_type.ilike(submission_type))

    if test_location and test_location != "All":
        query = query.filter(Assessment.test_location.ilike(test_location))
    
    query = query.order_by(Assessment.created_at.desc())
    rows = query.all()
    
    results = []
    for row in rows:
        result = {
            "id": row.id,
            "user_id": row.user_id,
            "candidate_id": row.candidate_id,
            "name": row.name,
            "email": row.email,
            "phone": row.phone,
            "test_location": row.test_location,
            "test_date": row.test_date,
            "login_time": row.login_time,
            "submit_time": row.submit_time,
            "submission_type": row.submission_type,
            "time_taken_min": row.time_taken_min,
            "total_questions": row.total_questions,
            "python_questions": row.python_questions,
            "sql_questions": row.sql_questions,
            "mcq_questions": row.mcq_questions,
            "python_score": row.python_score,
            "sql_score": row.sql_score,
            "mcq_score": row.mcq_score,
            "overall_score": row.overall_score,
            "max_possible_score": row.max_possible_score,
            "overall_percentage": row.overall_percentage,
            "overall_verdict": row.overall_verdict,
            "created_at": row.created_at
        }
        
        try:
            result["problem_testcases"] = json.loads(row.problem_testcases_json)
            result["problem_scores"] = normalize_problem_scores(json.loads(row.problem_scores_json))
        except:
            result["problem_testcases"] = {}
            result["problem_scores"] = {}
        
        result = _apply_derived_score_fields(result)
        
        if verdict and verdict != "All" and result.get("overall_verdict") != verdict:
            continue

        results.append(result)
    
    return results


def get_assessment_by_user_id(db: Session, user_id: int) -> Optional[Dict[str, Any]]:
    """Get assessment record by user ID"""
    row = db.query(Assessment).filter(Assessment.user_id == user_id).first()
    
    if not row:
        return None
        
    result = {
        "id": row.id,
        "user_id": row.user_id,
        "candidate_id": row.candidate_id,
        "name": row.name,
        "email": row.email,
        "phone": row.phone,
        "test_location": row.test_location,
        "test_date": row.test_date,
        "login_time": row.login_time,
        "submit_time": row.submit_time,
        "submission_type": row.submission_type,
        "time_taken_min": row.time_taken_min,
        "total_questions": row.total_questions,
        "python_questions": row.python_questions,
        "sql_questions": row.sql_questions,
        "mcq_questions": row.mcq_questions,
        "python_score": row.python_score,
        "sql_score": row.sql_score,
        "mcq_score": row.mcq_score,
        "overall_score": row.overall_score,
        "max_possible_score": row.max_possible_score,
        "overall_percentage": row.overall_percentage,
        "overall_verdict": row.overall_verdict,
        "created_at": row.created_at
    }
    
    try:
        result["problem_testcases"] = json.loads(row.problem_testcases_json)
        result["problem_scores"] = normalize_problem_scores(json.loads(row.problem_scores_json))
    except:
        result["problem_testcases"] = {}
        result["problem_scores"] = {}
        
    result = _apply_derived_score_fields(result)
    return result


def clear_all_assessments(db: Session):
    """Clear all assessment records (for testing/reset)"""
    db.query(Assessment).delete()
    db.commit()
