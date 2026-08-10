import json
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.domain import MCQQuestion
from app.core.config import settings

MCQ_SEED_PATH = settings.MCQ_SEED_PATH

def init_mcq_db(db: Session):
    """Seed default MCQ questions if the table is empty."""
    seed_default_mcq_questions(db)

def seed_default_mcq_questions(db: Session):
    if not MCQ_SEED_PATH.exists():
        return

    # Check if table is empty
    total_rows = db.query(MCQQuestion).count()
    if total_rows > 0:
        return

    with open(MCQ_SEED_PATH, "r", encoding="utf-8-sig") as seed_file:
        try:
            questions = json.load(seed_file)
        except json.JSONDecodeError:
            return

    if not isinstance(questions, list):
        return

    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    
    for index, question in enumerate(questions, start=1):
        q = MCQQuestion(
            id=f"mcq_{index:03d}",
            title=question.get("question_title", ""),
            question_text=question.get("question", ""),
            option_a=question.get("options", ["", "", "", ""])[0],
            option_b=question.get("options", ["", "", "", ""])[1],
            option_c=question.get("options", ["", "", "", ""])[2],
            option_d=question.get("options", ["", "", "", ""])[3],
            correct_option="ABCD"[question.get("correct_answer", 0)],
            question_title=question.get("question_title", ""),
            question=question.get("question", ""),
            options_json=json.dumps(question.get("options", [])),
            correct_answer=question.get("correct_answer", 0),
            difficulty=question.get("difficulty", "easy"),
            marks=question.get("marks", 10),
            time=question.get("time", 10),
            topic=question.get("topic", "Python"),
            explanation=question.get("explanation", ""),
            created_at=created_at,
        )
        db.add(q)
    
    db.commit()