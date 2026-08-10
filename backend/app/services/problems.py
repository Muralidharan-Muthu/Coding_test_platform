"""
Database-driven problem definitions with difficulty, marks, and time limits
All problems are loaded from the database for persistence and easy management.
"""
import random
import json
import os
from app.db.database import SessionLocal
from app.models.domain import Problem, CustomProblem

CUSTOM_EXPORT_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "db", "custom_problems_export.json")

def _row_to_problem(p):
    input_format_raw = p.input_format
    try:
        input_format_value = json.loads(input_format_raw) if input_format_raw and input_format_raw.startswith('{') else input_format_raw
    except:
        input_format_value = input_format_raw

    return {
        "id": p.id,
        "title": p.title,
        "language": p.language,
        "difficulty": p.difficulty,
        "marks": p.marks,
        "time_limit": p.time_limit,
        "statement": p.statement,
        "description": p.description,
        "input_format": input_format_value,
        "output_format": p.output_format,
        "sample_input": p.sample_input,
        "sample_output": p.sample_output,
        "starter_code": p.starter_code,
        "test_cases": json.loads(p.test_cases_json) if p.test_cases_json else [],
        "schema_sql": p.schema_sql,
        "seed_sql": p.seed_sql,
        "created_at": p.created_at
    }

def clear_default_problems():
    """Remove the legacy seeded problem bank so only tracked custom questions remain."""
    db = SessionLocal()
    try:
        deleted = db.query(Problem).delete()
        db.commit()
        if deleted:
            print(f"Removed {deleted} legacy seeded problems from database")
    finally:
        db.close()

def restore_custom_problems_from_export():
    """Mirror the tracked export JSON into the custom_problems table."""
    if not os.path.exists(CUSTOM_EXPORT_PATH):
        return
    with open(CUSTOM_EXPORT_PATH, "r", encoding="utf-8-sig") as f:
        try:
            problems_data = json.load(f)
        except Exception:
            return

    if not isinstance(problems_data, list):
        return

    db = SessionLocal()
    try:
        valid_problems = [p for p in problems_data if isinstance(p, dict) and p.get("id")]
        
        if valid_problems:
            valid_ids = [p["id"] for p in valid_problems]
            db.query(CustomProblem).filter(~CustomProblem.id.in_(valid_ids)).delete(synchronize_session=False)
        else:
            db.query(CustomProblem).delete()
            
        for p in valid_problems:
            cp = db.query(CustomProblem).filter(CustomProblem.id == p["id"]).first()
            if not cp:
                cp = CustomProblem(id=p["id"])
                db.add(cp)
            cp.title = p.get("title", "")
            cp.language = p.get("language", "python")
            cp.difficulty = p.get("difficulty", "Medium")
            cp.marks = p.get("marks", 10)
            cp.time_limit = p.get("time_limit", 10)
            cp.statement = p.get("statement", p.get("description", ""))
            cp.description = p.get("description", "")
            cp.input_format = str(p.get("input_format", ""))
            cp.output_format = p.get("output_format", "")
            cp.sample_input = p.get("sample_input", "")
            cp.sample_output = p.get("sample_output", "")
            cp.starter_code = p.get("starter_code", "")
            cp.test_cases_json = json.dumps(p.get("test_cases", []))
            cp.schema_sql = p.get("schema_sql", "")
            cp.seed_sql = p.get("seed_sql", "")
            cp.created_at = p.get("created_at", "")
            
        db.commit()
    finally:
        db.close()

def sync_custom_problems_export():
    """Export all custom_problems rows to JSON file so git tracks them."""
    db = SessionLocal()
    try:
        rows = db.query(CustomProblem).order_by(CustomProblem.created_at.asc()).all()
        problems = [_row_to_problem(row) for row in rows]
        os.makedirs(os.path.dirname(CUSTOM_EXPORT_PATH), exist_ok=True)
        with open(CUSTOM_EXPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(problems, f, indent=2, ensure_ascii=False)
    finally:
        db.close()

def load_problems_from_db():
    """Load the persisted problem set from the custom problems table."""
    db = SessionLocal()
    problems = {}
    try:
        default_probs = db.query(Problem).filter(Problem.is_active == 1).all()
        for p in default_probs:
            problems[p.id] = _row_to_problem(p)
            
        custom_probs = db.query(CustomProblem).order_by(CustomProblem.created_at.asc(), CustomProblem.id.asc()).all()
        for p in custom_probs:
            problems[p.id] = _row_to_problem(p)
    finally:
        db.close()
    return problems

def init_problems():
    """Initialize problems from the tracked export and clear legacy seeded data."""
    clear_default_problems()
    restore_custom_problems_from_export()
    return refresh_problems()

# Global PROBLEMS dictionary - loaded from database
PROBLEMS = {}

def _ensure_latest_problems():
    """Always reload the persisted problem bank before serving requests."""
    return refresh_problems()

def refresh_problems():
    """Refresh PROBLEMS from database"""
    global PROBLEMS
    latest_problems = load_problems_from_db()
    PROBLEMS.clear()
    PROBLEMS.update(latest_problems)
    return PROBLEMS

def get_difficulty_counts():
    """Calculate total questions per difficulty level from available problems"""
    _ensure_latest_problems()
    counts = {"easy": 0, "medium": 0, "hard": 0}
    for problem in PROBLEMS.values():
        difficulty = problem.get("difficulty", "medium").lower()
        if difficulty in counts:
            counts[difficulty] += 1
    return counts

def get_problem(problem_id: str):
    """Get problem by ID"""
    _ensure_latest_problems()
    return PROBLEMS.get(problem_id)

def list_problems():
    """List all available problems with metadata"""
    _ensure_latest_problems()
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "language": p["language"],
            "difficulty": p.get("difficulty", "Medium"),
            "marks": p.get("marks", 10),
            "time_limit": p.get("time_limit", 10),
            "created_at": p.get("created_at", "")
        }
        for p in PROBLEMS.values()
    ]

def list_problems_by_language(language: str):
    """List problems filtered by language"""
    _ensure_latest_problems()
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "language": p["language"],
            "difficulty": p.get("difficulty", "Medium"),
            "marks": p.get("marks", 10),
            "time_limit": p.get("time_limit", 10)
        }
        for p in PROBLEMS.values()
        if p["language"] == language
    ]

def get_exam_summary():
    """Get exam summary with total marks and time"""
    _ensure_latest_problems()
    problems = list(PROBLEMS.values())
    python_problems = [p for p in problems if p["language"] == "python"]
    sql_problems = [p for p in problems if p["language"] == "sql"]
    
    return {
        "total_duration_minutes": 150,  # 2 hours 30 minutes
        "total_questions": len(problems),
        "python_questions": len(python_problems),
        "sql_questions": len(sql_problems),
        "total_marks": sum(p.get("marks", 10) for p in problems),
        "problems": [
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
    }

def _normalize_title(problem: dict) -> str:
    """Normalize title for duplicate checks."""
    return str(problem.get("title", "")).strip().lower()

def _normalize_difficulty(problem: dict) -> str:
    """Normalize difficulty label for filtering."""
    return str(problem.get("difficulty", "Medium")).strip().lower()

def _unique_problems_by_title(problems: list):
    """Keep one random problem per title to avoid duplicate question cards."""
    grouped = {}
    for problem in problems:
        key = _normalize_title(problem)
        grouped.setdefault(key, []).append(problem)
    return [random.choice(group) for group in grouped.values()]

def get_random_problems_by_difficulty(language: str, easy_count: int = 2, medium_count: int = 2, hard_count: int = 1):
    """Get random problems with specified difficulty distribution from Questions page"""
    _ensure_latest_problems()
    all_problems = [p for p in PROBLEMS.values() if p["language"] == language]
    unique_problems = _unique_problems_by_title(all_problems)
    
    easy = [p for p in unique_problems if _normalize_difficulty(p) == "easy"]
    medium = [p for p in unique_problems if _normalize_difficulty(p) == "medium"]
    hard = [p for p in unique_problems if _normalize_difficulty(p) == "hard"]
    
    selected = []
    
    # Select easy problems
    if len(easy) >= easy_count:
        selected.extend(random.sample(easy, easy_count))
    else:
        selected.extend(easy)
    
    # Select medium problems
    if len(medium) >= medium_count:
        selected.extend(random.sample(medium, medium_count))
    else:
        selected.extend(medium)
    
    # Select hard problems
    if len(hard) >= hard_count:
        selected.extend(random.sample(hard, hard_count))
    else:
        selected.extend(hard)
    
    # If we don't have enough, fill with any available
    remaining_needed = (easy_count + medium_count + hard_count) - len(selected)
    if remaining_needed > 0:
        available = [p for p in unique_problems if p not in selected]
        if available:
            additional = random.sample(available, min(remaining_needed, len(available)))
            selected.extend(additional)
    
    return selected
