import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MCQ_DATABASE_PATH = BASE_DIR / "mcq_questions.db"
MCQ_SEED_PATH = BASE_DIR / "mcq_seed_questions.json"


def init_mcq_db():
    conn = sqlite3.connect(str(MCQ_DATABASE_PATH))
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS mcq_questions (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            question_text TEXT NOT NULL,
            option_a TEXT NOT NULL,
            option_b TEXT NOT NULL,
            option_c TEXT NOT NULL,
            option_d TEXT NOT NULL,
            correct_option TEXT NOT NULL,
            question_title TEXT,
            question TEXT,
            options_json TEXT,
            correct_answer INTEGER,
            difficulty TEXT DEFAULT 'easy',
            marks INTEGER DEFAULT 10,
            time INTEGER DEFAULT 10,
            topic TEXT DEFAULT 'Python',
            explanation TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
        """
    )

    existing_columns = {row[1] for row in cursor.execute("PRAGMA table_info(mcq_questions)").fetchall()}
    migration_columns = [
        ("question_title", "TEXT"),
        ("question", "TEXT"),
        ("options_json", "TEXT"),
        ("correct_answer", "INTEGER"),
        ("time", "INTEGER DEFAULT 10"),
        ("topic", "TEXT DEFAULT 'Python'"),
        ("explanation", "TEXT DEFAULT ''"),
    ]

    for column_name, column_type in migration_columns:
        if column_name not in existing_columns:
            cursor.execute(f"ALTER TABLE mcq_questions ADD COLUMN {column_name} {column_type}")

    conn.commit()
    seed_default_mcq_questions(conn)
    conn.close()


def seed_default_mcq_questions(conn: sqlite3.Connection):
    if not MCQ_SEED_PATH.exists():
        return

    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM mcq_questions")
    total_rows = cursor.fetchone()[0]
    if total_rows:
        return

    with open(MCQ_SEED_PATH, "r", encoding="utf-8-sig") as seed_file:
        questions = json.load(seed_file)

    if not isinstance(questions, list):
        return

    created_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    for index, question in enumerate(questions, start=1):
        cursor.execute(
            """
            INSERT INTO mcq_questions
            (id, title, question_text, option_a, option_b, option_c, option_d,
             correct_option, question_title, question, options_json, correct_answer,
             difficulty, marks, time, topic, explanation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"mcq_{index:03d}",
                question.get("question_title", ""),
                question.get("question", ""),
                question.get("options", ["", "", "", ""])[0],
                question.get("options", ["", "", "", ""])[1],
                question.get("options", ["", "", "", ""])[2],
                question.get("options", ["", "", "", ""])[3],
                "ABCD"[question.get("correct_answer", 0)],
                question.get("question_title", ""),
                question.get("question", ""),
                json.dumps(question.get("options", [])),
                question.get("correct_answer", 0),
                question.get("difficulty", "easy"),
                question.get("marks", 10),
                question.get("time", 10),
                question.get("topic", "Python"),
                question.get("explanation", ""),
                created_at,
            )
        )

    conn.commit()


def get_mcq_db_connection():
    conn = sqlite3.connect(str(MCQ_DATABASE_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn