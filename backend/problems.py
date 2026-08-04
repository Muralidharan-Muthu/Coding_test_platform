"""
Database-driven problem definitions with difficulty, marks, and time limits
All problems are loaded from the database for persistence and easy management.
"""
import random
from database import clear_default_problems, load_problems_from_db, restore_custom_problems_from_export

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
    # Keep the same dict object so modules that imported PROBLEMS keep seeing updates.
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

# Global storage for selected random problems
selected_random_problems = {
    "python": [],
    "sql": []
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
