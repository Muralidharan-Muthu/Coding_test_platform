import sqlite3
import json
import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

CUSTOM_EXPORT_PATH = os.path.join(os.path.dirname(__file__), "data", "custom_problems_export.json")

DATABASE_PATH = Path(__file__).resolve().with_name("coding_platform.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH.as_posix()}"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_sqlalchemy_db():
    """Dependency for getting a SQLAlchemy session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database with required tables"""
    conn = sqlite3.connect(str(DATABASE_PATH))
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    # Submissions table (with verdict and execution_time_ms)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            problem_id TEXT NOT NULL,
            code TEXT NOT NULL,
            passed_tests INTEGER NOT NULL,
            total_tests INTEGER NOT NULL,
            score REAL NOT NULL,
            verdict TEXT DEFAULT 'Pending',
            execution_time_ms REAL DEFAULT 0,
            time_taken INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    # HR Results table (final table for HR with verdict and execution time)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS hr_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            problem_id TEXT NOT NULL,
            best_score REAL NOT NULL,
            passed_tests INTEGER NOT NULL,
            total_tests INTEGER NOT NULL,
            best_submission_id INTEGER NOT NULL,
            verdict TEXT DEFAULT 'Pending',
            execution_time_ms REAL DEFAULT 0,
            time_taken INTEGER DEFAULT 0,
            updated_at TEXT NOT NULL,
            UNIQUE(user_id, problem_id),
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (best_submission_id) REFERENCES submissions (id)
        )
    """)

    # Assessments table - stores complete assessment session data for dashboard
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            candidate_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            test_date TEXT NOT NULL,
            login_time TEXT NOT NULL,
            submit_time TEXT NOT NULL,
            submission_type TEXT NOT NULL,
            time_taken_min INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            python_questions INTEGER NOT NULL,
            sql_questions INTEGER NOT NULL,
            mcq_questions INTEGER DEFAULT 0,
            python_score REAL NOT NULL,
            sql_score REAL NOT NULL,
            mcq_score REAL DEFAULT 0,
            overall_score REAL NOT NULL,
            max_possible_score REAL DEFAULT NULL,
            overall_percentage REAL NOT NULL,
            overall_verdict TEXT NOT NULL,
            problem_testcases_json TEXT NOT NULL,
            problem_scores_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # Migration: Add new columns if they don't exist (for existing DB)
    migration_columns = [
        ("submissions", "time_taken", "INTEGER DEFAULT 0"),
        ("submissions", "verdict", "TEXT DEFAULT 'Pending'"),
        ("submissions", "execution_time_ms", "REAL DEFAULT 0"),
        ("hr_results", "time_taken", "INTEGER DEFAULT 0"),
        ("hr_results", "verdict", "TEXT DEFAULT 'Pending'"),
        ("hr_results", "execution_time_ms", "REAL DEFAULT 0"),
        ("users", "test_location", "TEXT DEFAULT NULL"),
        ("assessments", "test_location", "TEXT DEFAULT NULL"),
        ("assessments", "max_possible_score", "REAL DEFAULT NULL"),
        ("assessments", "mcq_questions", "INTEGER DEFAULT 0"),
        ("assessments", "mcq_score", "REAL DEFAULT 0"),
    ]
    
    for table, column, col_type in migration_columns:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists

    # Create OTP table for storing candidate OTP codes
    # Drop and recreate if columns are NOT NULL (migration from old schema)
    try:
        cursor.execute("SELECT otp_code, expires_at FROM candidate_otp LIMIT 1")
    except sqlite3.OperationalError:
        # Table doesn't exist or has wrong schema, create it
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS candidate_otp (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                otp_code TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL,
                sent INTEGER DEFAULT 0,
                status TEXT DEFAULT 'unused',
                test_type TEXT DEFAULT 'both'
            )
        """)
    else:
        # Table exists, try to alter columns if needed
        try:
            cursor.execute("ALTER TABLE candidate_otp ADD COLUMN otp_code TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        try:
            cursor.execute("ALTER TABLE candidate_otp ADD COLUMN expires_at TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists
        try:
            cursor.execute("ALTER TABLE candidate_otp ADD COLUMN status TEXT DEFAULT 'unused'")
        except sqlite3.OperationalError:
            pass  # Column already exists
        try:
            cursor.execute("ALTER TABLE candidate_otp ADD COLUMN test_type TEXT DEFAULT 'both'")
        except sqlite3.OperationalError:
            pass  # Column already exists

    conn.commit()
    conn.close()

def init_custom_problems_db():
    """Initialize database tables used for persisted problem management."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    cursor = conn.cursor()
    
    # Default problems table - stores all built-in problems
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS problems (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            language TEXT NOT NULL,
            difficulty TEXT DEFAULT 'Medium',
            marks INTEGER DEFAULT 10,
            time_limit INTEGER DEFAULT 15,
            statement TEXT,
            description TEXT,
            input_format TEXT,
            output_format TEXT,
            sample_input TEXT,
            sample_output TEXT,
            starter_code TEXT,
            test_cases_json TEXT,
            schema_sql TEXT,
            seed_sql TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT NOT NULL
        )
    """)
    
    # Custom problems table - stores HR-added questions permanently
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS custom_problems (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            language TEXT NOT NULL,
            difficulty TEXT DEFAULT 'Medium',
            marks INTEGER DEFAULT 10,
            time_limit INTEGER DEFAULT 15,
            statement TEXT,
            description TEXT,
            input_format TEXT,
            output_format TEXT,
            sample_input TEXT,
            sample_output TEXT,
            starter_code TEXT,
            test_cases_json TEXT,
            schema_sql TEXT,
            seed_sql TEXT,
            created_at TEXT NOT NULL
        )
    """)
    
    # Selected exam problems table - stores questions selected for candidates
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS selected_exam_problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            problem_id TEXT NOT NULL,
            language TEXT NOT NULL,
            difficulty TEXT DEFAULT 'Medium',
            marks INTEGER DEFAULT 10,
            time_limit INTEGER DEFAULT 15,
            title TEXT NOT NULL,
            saved_at TEXT NOT NULL,
            UNIQUE(problem_id)
        )
    """)

    # Candidate-specific shuffled problem sets
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS candidate_selected_exam_problems (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_email TEXT NOT NULL,
            problem_id TEXT NOT NULL,
            language TEXT NOT NULL,
            difficulty TEXT DEFAULT 'Medium',
            marks INTEGER DEFAULT 10,
            time_limit INTEGER DEFAULT 15,
            title TEXT NOT NULL,
            saved_at TEXT NOT NULL,
            UNIQUE(candidate_email, problem_id)
        )
    """)
    
    conn.commit()
    conn.close()

def clear_default_problems():
    """Remove the legacy seeded problem bank so only tracked custom questions remain."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    cursor = conn.cursor()
    cursor.execute("DELETE FROM problems")
    deleted = cursor.rowcount
    conn.commit()
    conn.close()
    if deleted:
        print(f"Removed {deleted} legacy seeded problems from database")

def get_db():
    """Dependency for getting database connection"""
    conn = sqlite3.connect(str(DATABASE_PATH), check_same_thread=False)
    try:
        yield conn
    finally:
        conn.close()

def _row_to_problem(row):
    return {
        "id": row[0],
        "title": row[1],
        "language": row[2],
        "difficulty": row[3],
        "marks": row[4],
        "time_limit": row[5],
        "statement": row[6],
        "description": row[7],
        "input_format": row[8],
        "output_format": row[9],
        "sample_input": row[10],
        "sample_output": row[11],
        "starter_code": row[12],
        "test_cases": json.loads(row[13]) if row[13] else [],
        "schema_sql": row[14],
        "seed_sql": row[15],
        "created_at": row[16]
    }


def _upsert_custom_problem(cursor, problem):
    cursor.execute("""
        INSERT OR REPLACE INTO custom_problems
        (id, title, language, difficulty, marks, time_limit, statement, description,
         input_format, output_format, sample_input, sample_output, starter_code,
         test_cases_json, schema_sql, seed_sql, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        problem.get("id"),
        problem.get("title", ""),
        problem.get("language", "python"),
        problem.get("difficulty", "Medium"),
        problem.get("marks", 10),
        problem.get("time_limit", 10),
        problem.get("statement", problem.get("description", "")),
        problem.get("description", ""),
        problem.get("input_format", ""),
        problem.get("output_format", ""),
        problem.get("sample_input", ""),
        problem.get("sample_output", ""),
        problem.get("starter_code", ""),
        json.dumps(problem.get("test_cases", [])),
        problem.get("schema_sql", ""),
        problem.get("seed_sql", ""),
        problem.get("created_at", "")
    ))

def load_problems_from_db():
    """Load the persisted problem set from the custom problems table."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    cursor = conn.cursor()
    
    problems = {}
    
    # Load default problems
    cursor.execute("""
        SELECT id, title, language, difficulty, marks, time_limit, statement, description,
               input_format, output_format, sample_input, sample_output, starter_code,
               test_cases_json, schema_sql, seed_sql, created_at
        FROM problems WHERE is_active = 1
    """)

    for row in cursor.fetchall():
        # Parse input_format if it's JSON (new structured format)
        input_format_raw = row[8]
        try:
            input_format_value = json.loads(input_format_raw) if input_format_raw and input_format_raw.startswith('{') else input_format_raw
        except:
            input_format_value = input_format_raw
        
        problem = {
            "id": row[0],
            "title": row[1],
            "language": row[2],
            "difficulty": row[3],
            "marks": row[4],
            "time_limit": row[5],
            "statement": row[6],
            "description": row[7],
            "input_format": input_format_value,
            "output_format": row[9],
            "sample_input": row[10],
            "sample_output": row[11],
            "starter_code": row[12],
            "test_cases": json.loads(row[13]) if row[13] else [],
            "schema_sql": row[14],
            "seed_sql": row[15],
            "created_at": row[16]
        }
        problems[row[0]] = problem
    
    # Load custom problems (HR-added)
    cursor.execute("""
        SELECT id, title, language, difficulty, marks, time_limit, statement, description,
               input_format, output_format, sample_input, sample_output, starter_code,
               test_cases_json, schema_sql, seed_sql, created_at
        FROM custom_problems
        ORDER BY created_at ASC, id ASC
    """)

    for row in cursor.fetchall():
        # Parse input_format if it's JSON (new structured format)
        input_format_raw = row[8]
        try:
            input_format_value = json.loads(input_format_raw) if input_format_raw and input_format_raw.startswith('{') else input_format_raw
        except:
            input_format_value = input_format_raw
        
        problem = {
            "id": row[0],
            "title": row[1],
            "language": row[2],
            "difficulty": row[3],
            "marks": row[4],
            "time_limit": row[5],
            "statement": row[6],
            "description": row[7],
            "input_format": input_format_value,
            "output_format": row[9],
            "sample_input": row[10],
            "sample_output": row[11],
            "starter_code": row[12],
            "test_cases": json.loads(row[13]) if row[13] else [],
            "schema_sql": row[14],
            "seed_sql": row[15],
            "created_at": row[16]
        }
        problems[row[0]] = problem
    
    conn.close()
    return problems


def sync_custom_problems_export():
    """Export all custom_problems rows to JSON file so git tracks them."""
    conn = sqlite3.connect(str(DATABASE_PATH))
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, title, language, difficulty, marks, time_limit, statement, description,
               input_format, output_format, sample_input, sample_output, starter_code,
               test_cases_json, schema_sql, seed_sql, created_at
        FROM custom_problems ORDER BY created_at ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    problems = []
    for row in rows:
        problems.append(_row_to_problem(row))

    with open(CUSTOM_EXPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(problems, f, indent=2, ensure_ascii=False)


def restore_custom_problems_from_export():
    """Mirror the tracked export JSON into the custom_problems table."""
    if not os.path.exists(CUSTOM_EXPORT_PATH):
        return
    with open(CUSTOM_EXPORT_PATH, "r", encoding="utf-8-sig") as f:
        try:
            problems = json.load(f)
        except Exception:
            return

    if not isinstance(problems, list):
        return

    conn = sqlite3.connect(str(DATABASE_PATH))
    cursor = conn.cursor()
    valid_problems = [p for p in problems if isinstance(p, dict) and p.get("id")]
    removed = 0

    if valid_problems:
        placeholders = ",".join(["?"] * len(valid_problems))
        cursor.execute(
            f"DELETE FROM custom_problems WHERE id NOT IN ({placeholders})",
            [p["id"] for p in valid_problems]
        )
        removed = cursor.rowcount
    else:
        cursor.execute("DELETE FROM custom_problems")
        removed = cursor.rowcount

    for p in problems:
        if isinstance(p, dict) and p.get("id"):
            _upsert_custom_problem(cursor, p)
    conn.commit()
    conn.close()
    print(
        f"Synchronized {len(valid_problems)} tracked problems from export JSON"
        + (f" and removed {removed} stale rows" if removed else "")
    )

