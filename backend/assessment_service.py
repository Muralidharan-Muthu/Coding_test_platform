"""
Assessment Service - Database operations for assessments
Handles reading, writing assessment records from/to database
"""

import sqlite3
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


def create_assessment(db: sqlite3.Connection, data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new assessment record in the database"""
    cursor = db.cursor()
    
    # Calculate derived values
    python_score = data.get("python_score", 0)
    sql_score = data.get("sql_score", 0)
    mcq_score = data.get("mcq_score", 0)
    overall_score = python_score + sql_score + mcq_score
    max_possible_score = _resolve_max_possible_score(data)
    overall_percentage = (overall_score / max_possible_score) * 100
    overall_verdict = calculate_verdict(overall_percentage)
    
    # Insert assessment record
    cursor.execute("""
        INSERT INTO assessments (
            user_id, candidate_id, name, email, phone,
            test_date, login_time, submit_time, submission_type, time_taken_min,
            total_questions, python_questions, sql_questions, mcq_questions, test_location,
            python_score, sql_score, mcq_score, overall_score, max_possible_score, overall_percentage, overall_verdict,
            problem_testcases_json, problem_scores_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data["user_id"],
        data["candidate_id"],
        data["name"],
        data["email"],
        data.get("phone", ""),
        data["test_date"],
        data["login_time"],
        data["submit_time"],
        data["submission_type"],
        data["time_taken_min"],
        data["total_questions"],
        data["python_questions"],
        data["sql_questions"],
        data.get("mcq_questions", 0),
        data.get("test_location", "home"),
        python_score,
        sql_score,
        mcq_score,
        overall_score,
        max_possible_score,
        overall_percentage,
        overall_verdict,
        json.dumps(data.get("problem_testcases", {})),
        json.dumps(data.get("problem_scores", {})),
        datetime.now().isoformat()
    ))
    
    db.commit()
    assessment_id = cursor.lastrowid
    cursor.close()
    
    return {
        "success": True,
        "assessment_id": assessment_id,
        "candidate_id": data["candidate_id"]
    }


def read_all_assessments(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None,
    test_location: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Read all assessments from database with optional filters"""
    conn = sqlite3.connect("coding_platform.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    verdict_filter = verdict if verdict and verdict != "All" else None

    # Build query with filters
    query = "SELECT * FROM assessments WHERE 1=1"
    params = []

    if date_from:
        query += " AND test_date >= ?"
        params.append(date_from)

    if date_to:
        query += " AND test_date <= ?"
        params.append(date_to)

    if submission_type and submission_type != "All":
        query += " AND LOWER(submission_type) = ?"
        params.append(submission_type.lower())

    if test_location and test_location != "All":
        query += " AND LOWER(test_location) = ?"
        params.append(test_location.lower())
    
    query += " ORDER BY created_at DESC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    
    # Convert to list of dicts
    results = []
    for row in rows:
        result = dict(row)
        # Parse JSON fields
        try:
            result["problem_testcases"] = json.loads(result["problem_testcases_json"])
            result["problem_scores"] = normalize_problem_scores(json.loads(result["problem_scores_json"]))
        except:
            result["problem_testcases"] = {}
            result["problem_scores"] = {}
        
        # Remove raw JSON string fields
        del result["problem_testcases_json"]
        del result["problem_scores_json"]

        # Derive verdict only from test summary score logic.
        result = _apply_derived_score_fields(result)
        if verdict_filter and result.get("overall_verdict") != verdict_filter:
            continue

        results.append(result)
    
    cursor.close()
    conn.close()
    
    return results


def get_assessment_by_user_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get assessment record by user ID"""
    conn = sqlite3.connect("coding_platform.db")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM assessments WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    
    result = None
    if row:
        result = dict(row)
        try:
            result["problem_testcases"] = json.loads(result["problem_testcases_json"])
            result["problem_scores"] = normalize_problem_scores(json.loads(result["problem_scores_json"]))
        except:
            result["problem_testcases"] = {}
            result["problem_scores"] = {}
        
        del result["problem_testcases_json"]
        del result["problem_scores_json"]
        result = _apply_derived_score_fields(result)
    
    cursor.close()
    conn.close()
    
    return result


def clear_all_assessments():
    """Clear all assessment records (for testing/reset)"""
    conn = sqlite3.connect("coding_platform.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM assessments")
    conn.commit()
    cursor.close()
    conn.close()
