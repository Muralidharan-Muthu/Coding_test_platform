from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, root_validator, validator
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import sqlite3
import uuid
import random
from datetime import datetime
import asyncio
import sys
import io
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables from .env file
ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=ENV_PATH)

# Fix Windows event loop for subprocess BEFORE any asyncio operations
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from database import init_db, init_custom_problems_db, get_db, sync_custom_problems_export, get_sqlalchemy_db, engine
from models import LoginRequest, RunCodeRequest, SubmitCodeRequest, PreviewSubmitCodeRequest, RunSqlRequest, SubmitSqlRequest, PreviewSubmitSqlRequest, StartExamRequest, ExamSubmitRequest, Base, ProctoringLog
from schemas import ProctoringLogCreate
from runner import PythonRunner, normalize_output, compare_outputs, get_verdict
from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS, get_random_problems_by_difficulty, selected_random_problems
from assessment_service import create_assessment, read_all_assessments
from excel_service import read_all_results, add_result, export_excel, create_sample_data, ensure_excel_exists
from otp_service import generate_otp, send_email_otp, save_candidate_otp, verify_candidate_otp, delete_candidate_otp, get_all_candidates, mark_otp_sent, get_candidate_otp, mark_otp_used, build_email_html, update_candidate_test_type, normalize_test_type, get_test_type_label, get_test_type_sections, has_test_type_section
from mcq_database import init_mcq_db, get_mcq_db_connection
from auth_db import init_auth_db, authenticate_user, create_user, list_users, delete_user, update_user_password

DATABASE_PATH = os.path.join(os.path.dirname(__file__), "coding_platform.db")

# Concurrency semaphore for 25 concurrent executions
execution_semaphore = asyncio.Semaphore(25)

app = FastAPI()

# Initialize database
init_db()
init_custom_problems_db()
init_mcq_db()
init_auth_db()   # DuckDB-backed auth
Base.metadata.create_all(bind=engine)

# Initialize problems from database (loads defaults and custom problems)
from problems import init_problems, refresh_problems
init_problems()
refresh_problems()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (for one-day MVP)
sessions = {}
session_test_types = {}
session_candidate_emails = {}

# In-memory exam session store
exam_sessions = {}  # {user_id: {"start_time": datetime, "end_time": datetime, "status": "active"|"completed", "answers": {}}}

EXAM_DURATION_SECONDS = 2 * 60 * 60 + 30 * 60  # 2 hours 30 minutes

# In-memory candidate problem sets store
candidate_problem_sets = {}

def get_candidate_problem_set(email: str):
    return candidate_problem_sets.get(email)

def save_candidate_problem_set(email: str, problems: list):
    candidate_problem_sets[email] = problems

def clear_candidate_problem_set(email: str):
    if email in candidate_problem_sets:
        del candidate_problem_sets[email]

def get_random_mcq_questions_by_difficulty(easy_count=2, medium_count=2, hard_count=1):
    return []

def get_assigned_mcq_questions_for_session(session_id: str, test_type: str):
    return []

def get_assigned_mcq_questions(candidate_test_type: str):
    return []

def get_selected_exam_problem_ids(language: str) -> List[str]:
    """Return exam problem ids in the same language-specific order used for candidates."""
    selected = selected_random_problems.get(language) or []
    if selected:
        return [problem.get("id") for problem in selected if problem.get("id")]

    return [
        problem.get("id")
        for problem in PROBLEMS.values()
        if problem.get("language") == language and problem.get("id")
    ]


# ── LOGO STATIC ENDPOINT ─────────────────────────────────────────────────────
@app.get("/logo.png")
async def serve_logo():
    logo_path = os.path.join(os.path.dirname(__file__), '..', 'asset', 'meptrasoft-logo.png')
    return FileResponse(logo_path, media_type="image/png")


# ── DUCKDB AUTH ENDPOINTS ─────────────────────────────────────────────────────

@app.post("/auth/candidate-login")
async def candidate_login(body: dict):
    """Candidate login — verified against DuckDB users table (role=candidate)."""
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["role"] != "candidate":
        raise HTTPException(status_code=403, detail="Not a candidate account.")

    return {
        "status": "success",
        "role": user["role"],
        "email": user["email"],
        "name": user["name"],
        "user_id": user["id"],
    }


@app.post("/auth/admin-login")
async def admin_login(body: dict):
    """Admin login — verified against DuckDB users table (role=admin)."""
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not an admin account.")

    return {
        "status": "success",
        "role": user["role"],
        "email": user["email"],
        "name": user["name"],
        "user_id": user["id"],
    }


@app.get("/auth/users")
async def list_all_users(role: str = None):
    """List users from DuckDB, optionally filtered by role."""
    return {"users": list_users(role)}


@app.post("/auth/users")
async def add_user(body: dict):
    """Create a new user in DuckDB."""
    email = (body.get("email") or "").strip().lower()
    password = (body.get("password") or "").strip()
    role = (body.get("role") or "candidate").strip().lower()
    name = (body.get("name") or email.split("@")[0]).strip()

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    if role not in ("admin", "candidate"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'candidate'.")

    try:
        user = create_user(email, password, role, name)
        return {"status": "created", "user": user}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.put("/auth/users/{email}/password")
async def change_password(email: str, body: dict):
    """Update a user's password."""
    new_password = (body.get("password") or "").strip()
    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required.")
    update_user_password(email, new_password)
    return {"status": "updated"}


@app.delete("/auth/users/{email}")
async def remove_user(email: str):
    """Delete a user from DuckDB by email."""
    delete_user(email)
    return {"status": "deleted"}




# ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ EMAIL PREVIEW ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
# Visit http://localhost:8000/email-preview to see the candidate email template.
# Any changes to build_email_html() in otp_service.py will reflect on refresh.
# ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚ÂÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬
@app.get("/email-preview", response_class=HTMLResponse)
async def email_preview():
    from otp_service import build_email_html as _build  # fresh import every request
    frontend_url = os.getenv("APP_URL", "http://localhost:3005")
    html = _build(
        username="John Doe",
        otp_code="539158",
        app_link=f"{frontend_url}/login"
    )
    return HTMLResponse(content=html, headers={"Cache-Control": "no-store"})


@app.post("/login")
async def login(request: LoginRequest, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    candidate_test_type = "both"
    
    # Check if this is a candidate login(has OTP)
    # Verify OTP for candidates
    if request.otp and request.email:
        candidate_record = get_candidate_otp(request.email, db)
        candidate_test_type = candidate_record.get("test_type", "both") if candidate_record else "both"

        # This is a candidate login - verify OTP
        otp_verification = verify_candidate_otp(
            username=request.name or "",
            email=request.email,
            otp_code=request.otp,
            db=db
        )
        
        if not otp_verification["valid"]:
            raise HTTPException(status_code=401, detail=otp_verification["error"])
        
        # OTP verified successfully - mark as used
        mark_otp_used(request.email, db)
    
    # Accept ANY user - no validation whatsoever
    # Check if user exists by email
    cursor.execute("SELECT id, name FROM users WHERE email = ?", (request.email,))
    user = cursor.fetchone()
        
    if user:
        user_id = user[0]
        # Update the user's name to match what they entered at login
        user_name = request.name.strip() if request.name and request.name.strip() else user[1]
        cursor.execute(
            "UPDATE users SET name= ? WHERE id = ?",
            (user_name, user_id)
        )
        db.commit()
    else:
        # Create new user with provided details
        # Use the username from the login form (candidate's entered name)
        name_to_use = request.name.strip() if request.name and request.name.strip() else "Anonymous User"
        email_to_use = request.email.strip() if request.email and request.email.strip() else f"user_{uuid.uuid4().hex[:8]}@test.com"
            
        cursor.execute(
            "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)",
            (name_to_use, email_to_use, datetime.now().isoformat())
        )
        db.commit()
        user_id = cursor.lastrowid
        user_name = name_to_use
    
    # Update test location
    cursor.execute(
        "UPDATE users SET test_location = ? WHERE id = ?",
        (request.test_location or "home", user_id)
    )
    db.commit()
    
    # Create session
    session_id = str(uuid.uuid4())
    sessions[session_id] = user_id
    session_test_types[session_id] = normalize_test_type(candidate_test_type)
    session_candidate_emails[session_id] = (request.email or "").strip().lower()
    
    cursor.close()
    
    return {
        "session_id": session_id,
        "user_id": user_id,
        "name": user_name,
        "email": request.email or f"user_{user_id}@test.com",
        "test_location": request.test_location or "home",
        "test_type": normalize_test_type(candidate_test_type)
    }

# HR OTP Management Endpoints

@app.delete("/hr/candidates/clear")
async def clear_all_candidates(db: sqlite3.Connection = Depends(get_db)):
    """Delete all imported candidates"""
    cursor = db.cursor()
    cursor.execute("DELETE FROM candidate_otp")
    deleted_count = cursor.rowcount
    cursor.execute("DELETE FROM candidate_selected_exam_problems")
    db.commit()
    cursor.close()
    session_candidate_emails.clear()
    
    return {
        "status": "success",
        "message": f"Deleted {deleted_count} candidates",
        "deleted_count": deleted_count
    }

@app.get("/hr/candidates")
async def get_candidates(db: sqlite3.Connection = Depends(get_db)):
    """Get all candidates with their OTP status"""
    candidates = get_all_candidates(db)
    return {"candidates": candidates}


@app.post("/hr/candidate-test-type")
@app.post("/hr/candidates/test-type")
async def set_candidate_test_type(request: dict, db: sqlite3.Connection = Depends(get_db)):
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


@app.post("/hr/candidate-shuffle")
@app.post("/hr/candidates/shuffle")
async def shuffle_candidate_questions(request: dict, db: sqlite3.Connection = Depends(get_db)):
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


@app.put("/hr/candidates/{email}")
async def update_candidate(email: str, request: dict, db: sqlite3.Connection = Depends(get_db)):
    current_email = (email or "").strip().lower()
    next_username = (request.get("username") or "").strip()
    next_email = (request.get("email") or "").strip().lower()

    if not next_username or not next_email:
        raise HTTPException(status_code=400, detail="Username and email are required")

    cursor = db.cursor()
    cursor.execute(
        "SELECT username, email FROM candidate_otp WHERE LOWER(email) = LOWER(?)",
        (current_email,)
    )
    existing = cursor.fetchone()

    if not existing:
        cursor.close()
        raise HTTPException(status_code=404, detail="Candidate not found")

    cursor.execute(
        """
        SELECT 1 FROM candidate_otp
        WHERE LOWER(email) = LOWER(?) AND LOWER(email) <> LOWER(?)
        """,
        (next_email, current_email)
    )
    if cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=409, detail="Another candidate already uses this email")

    cursor.execute(
        """
        SELECT 1 FROM candidate_otp
        WHERE LOWER(username) = LOWER(?) AND LOWER(email) <> LOWER(?)
        """,
        (next_username, current_email)
    )
    if cursor.fetchone():
        cursor.close()
        raise HTTPException(status_code=409, detail="Another candidate already uses this username")

    cursor.execute(
        """
        UPDATE candidate_otp
        SET username = ?, email = ?
        WHERE LOWER(email) = LOWER(?)
        """,
        (next_username, next_email, current_email)
    )

    if next_email != current_email:
        cursor.execute(
            "DELETE FROM candidate_selected_exam_problems WHERE LOWER(candidate_email) = LOWER(?)",
            (next_email,)
        )
        cursor.execute(
            """
            UPDATE candidate_selected_exam_problems
            SET candidate_email = ?
            WHERE LOWER(candidate_email) = LOWER(?)
            """,
            (next_email, current_email)
        )

        for session_id, candidate_email in list(session_candidate_emails.items()):
            if str(candidate_email or "").strip().lower() == current_email:
                session_candidate_emails[session_id] = next_email

    db.commit()
    cursor.close()

    return {
        "status": "success",
        "message": "Candidate updated successfully",
        "candidate": {
            "username": next_username,
            "email": next_email,
        }
    }


@app.delete("/hr/candidates/{email}")
async def delete_candidate(email: str, db: sqlite3.Connection = Depends(get_db)):
    """Delete a specific candidate by email"""
    cursor = db.cursor()
    normalized_email = (email or "").strip().lower()
    cursor.execute("SELECT username FROM candidate_otp WHERE LOWER(email) = LOWER(?)", (normalized_email,))
    existing = cursor.fetchone()

    if not existing:
        cursor.close()
        raise HTTPException(status_code=404, detail="Candidate not found")

    cursor.execute("DELETE FROM candidate_otp WHERE LOWER(email) = LOWER(?)", (normalized_email,))
    cursor.execute("DELETE FROM candidate_selected_exam_problems WHERE LOWER(candidate_email) = LOWER(?)", (normalized_email,))
    db.commit()
    cursor.close()
    for session_id, candidate_email in list(session_candidate_emails.items()):
        if str(candidate_email or "").strip().lower() == normalized_email:
            session_candidate_emails.pop(session_id, None)

    return {
        "status": "success",
        "message": f"Deleted candidate {existing[0]}",
        "username": existing[0]
    }

@app.post("/hr/import-candidates")
async def import_candidates(request: dict, db: sqlite3.Connection = Depends(get_db)):
    """Import candidates from a list (username, email) with duplicate checking"""
    candidates = request.get("candidates", [])
    
    if not candidates:
        raise HTTPException(status_code=400, detail="No candidates provided")
    
    cursor = db.cursor()
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
        cursor.execute("SELECT email, username FROM candidate_otp WHERE email = ? OR username = ?", (email, username))
        existing = cursor.fetchone()
        
        if existing:
            duplicates.append({
                "username": username,
                "email": email,
                "reason": f"Candidate with email '{email}' or username '{username}' already exists"
            })
            continue
        
        # Save candidate without OTP (OTP to be generated later)
        now = datetime.now()
        cursor.execute(
            """INSERT INTO candidate_otp (username, email, otp_code, expires_at, created_at, sent, status, test_type)
               VALUES (?, ?, '', '', ?, 0, 'unused', 'both')""",
            (username, email, now.isoformat())
        )
        imported.append({"username": username, "email": email})
    
    db.commit()
    cursor.close()
    
    return {
        "status": "success",
        "imported": imported,
        "duplicates": duplicates,
        "errors": errors,
        "message": f"Imported {len(imported)} candidates, skipped {len(duplicates)} duplicates"
    }

@app.post("/hr/generate-otp")
async def generate_candidate_otp(request: dict, db: sqlite3.Connection = Depends(get_db)):
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

@app.post("/hr/send-otp-email")
async def send_otp_email(body: dict, db: sqlite3.Connection = Depends(get_db)):
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

@app.post("/send-otp")
async def send_otp(request: dict, db: sqlite3.Connection = Depends(get_db)):
    """Store OTP for user (called by HR before test)"""
    email = request.get("email")
    otp_code = request.get("otp")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    if not otp_code:
        raise HTTPException(status_code=400, detail="OTP is required")
    
    # Check if user exists, if not create them
    cursor = db.cursor()
    cursor.execute("SELECT id, name FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    
    if not user:
        # Create user with placeholder name
        cursor.execute(
            "INSERT INTO users (name, email, created_at) VALUES (?, ?, ?)",
            (email.split('@')[0], email, datetime.now().isoformat())
        )
        db.commit()
    
    # Save OTP to database
    save_candidate_otp(email.split('@')[0], email, otp_code, db)
    
    cursor.close()
    
    return {
        "status": "success",
        "message": f"OTP stored for {email}"
    }

@app.post("/run")
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
    """Shape submission responses consistently for exam and HR preview flows."""
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

@app.post("/submit")
async def submit_code(request: SubmitCodeRequest, db: sqlite3.Connection = Depends(get_db)):
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
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO submissions
        (user_id, problem_id, code, passed_tests, total_tests, score, verdict, execution_time_ms, time_taken, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, request.problem_id, request.code, passed_tests, total_tests, score, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
    )
    submission_id = cursor.lastrowid
    db.commit()

    # Get current best score
    cursor.execute(
        """SELECT best_score FROM hr_results
        WHERE user_id = ? AND problem_id = ?""",
        (user_id, request.problem_id)
    )
    existing = cursor.fetchone()
    current_best_score = existing[0] if existing else 0

    # Check if this is a new best
    is_new_best = score > current_best_score

    # Update hr_results only if new best score
    if is_new_best:
        cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
        user_info = cursor.fetchone()

        cursor.execute(
            """INSERT OR REPLACE INTO hr_results
            (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, verdict, execution_time_ms, time_taken, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_info[0], user_info[1], request.problem_id, score, passed_tests, total_tests, submission_id, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
        )
        db.commit()

    cursor.close()

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

@app.post("/hr/preview/submit")
async def preview_submit_code(request: PreviewSubmitCodeRequest):
    """HR-only preview submit: evaluate against test cases without requiring a candidate session."""
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


class MCQQuestionCreate(BaseModel):
    question_title: str
    question: str
    options: List[str]
    correct_answer: int
    difficulty: str = "easy"
    marks: Optional[int] = None
    time: Optional[int] = None
    topic: str
    explanation: str = ""

    @validator("question_title", "question")
    def validate_required_text(cls, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise ValueError("This field is required")
        return cleaned

    @validator("options")
    def validate_options(cls, value: List[str]) -> List[str]:
        if len(value or []) != 4:
            raise ValueError("Exactly 4 options are required")
        cleaned_options = []
        for option in value:
            cleaned = (option or "").strip()
            if not cleaned:
                raise ValueError("Options cannot be empty")
            cleaned_options.append(cleaned)
        return cleaned_options

    @validator("difficulty")
    def validate_difficulty(cls, value: str) -> str:
        cleaned = (value or "").strip().lower()
        if cleaned not in {"easy", "medium", "hard"}:
            raise ValueError("Difficulty must be easy, medium, or hard")
        return cleaned

    @validator("correct_answer")
    def validate_correct_answer(cls, value: int) -> int:
        if value not in {0, 1, 2, 3}:
            raise ValueError("Correct answer must be 0, 1, 2, or 3")
        return value

    @validator("topic")
    def validate_topic(cls, value: str) -> str:
        topic_map = {
            "python": "Python",
            "javascript": "JavaScript",
            "sql": "SQL",
            "aptitude": "Aptitude",
            "data structures": "Data Structures",
        }
        cleaned = topic_map.get((value or "").strip().lower())
        if not cleaned:
            raise ValueError("Topic must be one of: Python, JavaScript, SQL, Aptitude, Data Structures")
        return cleaned

    @validator("explanation", pre=True, always=True)
    def normalize_explanation(cls, value: Optional[str]) -> str:
        return (value or "").strip()

    @root_validator(skip_on_failure=True)
    def validate_marks_and_time(cls, values):
        difficulty = values.get("difficulty", "easy")
        expected_marks = {"easy": 10, "medium": 20, "hard": 30}[difficulty]
        expected_time = {"easy": 10, "medium": 20, "hard": 30}[difficulty]

        marks = values.get("marks")
        time_value = values.get("time")

        if marks is None:
            values["marks"] = expected_marks
        elif marks != expected_marks:
            raise ValueError(f"Marks for {difficulty} questions must be {expected_marks}")

        if time_value is None:
            values["time"] = expected_time
        elif time_value != expected_time:
            raise ValueError(f"Time for {difficulty} questions must be {expected_time}")

        return values


def serialize_mcq_question(row: sqlite3.Row, include_internal: bool = False):
    row_keys = set(row.keys())

    options = []
    options_json = row["options_json"] if "options_json" in row_keys else None
    if options_json:
        try:
            options = json.loads(options_json)
        except (TypeError, json.JSONDecodeError):
            options = []

    if not options:
        legacy_option_columns = ["option_a", "option_b", "option_c", "option_d"]
        if all(column in row_keys for column in legacy_option_columns):
            options = [row[column] for column in legacy_option_columns]

    correct_answer = row["correct_answer"] if "correct_answer" in row_keys else None
    if correct_answer is None and "correct_option" in row_keys:
        correct_answer = {"A": 0, "B": 1, "C": 2, "D": 3}.get(str(row["correct_option"] or "").upper(), 0)

    difficulty = str(row["difficulty"] or "easy").strip().lower() if "difficulty" in row_keys else "easy"
    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "easy"

    marks = row["marks"] if "marks" in row_keys and row["marks"] is not None else {"easy": 10, "medium": 20, "hard": 30}[difficulty]
    time_value = row["time"] if "time" in row_keys and row["time"] is not None else {"easy": 10, "medium": 20, "hard": 30}[difficulty]
    topic = row["topic"] if "topic" in row_keys and row["topic"] else "Python"

    question_data = {
        "question_title": row["question_title"] if "question_title" in row_keys and row["question_title"] else (row["title"] if "title" in row_keys else ""),
        "question": row["question"] if "question" in row_keys and row["question"] else (row["question_text"] if "question_text" in row_keys else ""),
        "options": options,
        "correct_answer": correct_answer if correct_answer is not None else 0,
        "difficulty": difficulty,
        "marks": marks,
        "time": time_value,
        "topic": topic,
        "explanation": row["explanation"] if "explanation" in row_keys and row["explanation"] else "",
    }

    if include_internal:
        question_data["id"] = row["id"]
        question_data["created_at"] = row["created_at"]

    return question_data


def fetch_all_mcq_questions(include_internal: bool = False, descending: bool = False):
    conn = get_mcq_db_connection()
    try:
        cursor = conn.cursor()
        order_clause = "DESC" if descending else "ASC"
        cursor.execute(f"SELECT * FROM mcq_questions ORDER BY created_at {order_clause}, id {order_clause}")
        return [serialize_mcq_question(row, include_internal=include_internal) for row in cursor.fetchall()]
    finally:
        conn.close()


def fetch_mcq_question_by_id(question_id: str, include_internal: bool = False):
    conn = get_mcq_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM mcq_questions WHERE id = ?", (question_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return serialize_mcq_question(row, include_internal=include_internal)
    finally:
        conn.close()

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


@app.get("/api/assessment/results")
async def get_assessment_results(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None,
    test_location: Optional[str] = None
):
    """
    Get all assessment results from database with optional filters.
    Query params: date_from, date_to, verdict (Good|Average|Below Average), submission_type (Manual|Auto), test_location (home|office)
    """
    try:
        results = read_all_assessments(date_from, date_to, verdict, submission_type, test_location)
        return {
            "success": True,
            "total": len(results),
            "data": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading results: {str(e)}")


@app.get("/api/reports/proctoring/")
@app.get("/api/reports/proctoring")
async def get_proctoring_reports(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None,
    test_location: Optional[str] = None,
    db: Session = Depends(get_sqlalchemy_db)
):
    """Return completed assessment rows enriched with proctoring logs and trust scores."""
    try:
        assessments = read_all_assessments(date_from, date_to, verdict, submission_type, test_location)
        candidate_ids = sorted({
            assessment.get("user_id")
            for assessment in assessments
            if assessment.get("user_id") is not None
        })

        logs_by_candidate_id = {}
        if candidate_ids:
            proctoring_logs = (
                db.query(ProctoringLog)
                .filter(ProctoringLog.candidate_id.in_(candidate_ids))
                .order_by(ProctoringLog.candidate_id.asc(), ProctoringLog.timestamp.asc(), ProctoringLog.id.asc())
                .all()
            )

            for log in proctoring_logs:
                serialized_log = serialize_proctoring_log(log)
                logs_by_candidate_id.setdefault(log.candidate_id, []).append(serialized_log)

        enriched_assessments = []
        for assessment in assessments:
            candidate_logs = group_proctoring_logs(logs_by_candidate_id.get(assessment.get("user_id"), []))
            enriched_assessment = {
                **assessment,
                "logs": candidate_logs,
                "total_logs": len(candidate_logs),
                "trust_score": calculate_trust_score(candidate_logs),
            }
            enriched_assessments.append(enriched_assessment)

        return enriched_assessments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading proctoring reports: {str(e)}")


@app.get("/api/candidates/{email}/submissions")
async def get_candidate_submissions(email: str, db: Session = Depends(get_sqlalchemy_db)):
    """
    Get latest submissions for a specific candidate.
    Returns only the most recent submitted code per problem they attempted.
    """
    try:
        # Get user_id from email
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name FROM users WHERE email = ?", (email,))
        user_row = cursor.fetchone()
        
        if not user_row:
            # Try to find by candidate_id in assessments
            cursor.execute("SELECT user_id, name FROM assessments WHERE candidate_id = ? LIMIT 1", (email,))
            user_row = cursor.fetchone()
            
        if not user_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Candidate not found")
        
        user_id = user_row[0]
        candidate_name = user_row[1]
        
        # Get only the latest submission per problem for this user
        cursor.execute("""
            WITH ranked_submissions AS (
                SELECT
                    s.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY s.problem_id
                        ORDER BY s.created_at DESC, s.id DESC
                    ) AS rn
                FROM submissions s
                WHERE s.user_id = ?
            )
            SELECT
                rs.id, rs.problem_id, rs.code, rs.passed_tests, rs.total_tests,
                rs.score, rs.verdict, rs.execution_time_ms, rs.time_taken, rs.created_at,
                p.title, p.language, p.difficulty, p.marks
            FROM ranked_submissions rs
            LEFT JOIN custom_problems p ON rs.problem_id = p.id
            WHERE rs.rn = 1
            ORDER BY rs.created_at DESC, rs.id DESC
        """, (user_id,))
        
        submissions = []
        for row in cursor.fetchall():
            submissions.append({
                "submission_id": row[0],
                "problem_id": row[1],
                "code": row[2],
                "passed_tests": row[3],
                "total_tests": row[4],
                "score": row[5],
                "verdict": row[6],
                "execution_time_ms": row[7],
                "time_taken": row[8],
                "created_at": row[9],
                "problem_title": row[10] or "Unknown Problem",
                "language": row[11] or "python",
                "difficulty": row[12] or "Medium",
                "marks": row[13] or 10
            })
        
        conn.close()
        
        return {
            "success": True,
            "candidate": {
                "email": email,
                "name": candidate_name,
                "user_id": user_id
            },
            "submissions": submissions,
            "total_submissions": len(submissions)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching submissions: {str(e)}")


@app.get("/api/assessment/export")
async def export_assessment_results(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None,
    test_location: Optional[str] = None
):
    """
    Export filtered assessment results as Excel file.
    Returns downloadable Excel with formatted sheets.
    """
    try:
        # Get data from database
        results = read_all_assessments(date_from, date_to, verdict, submission_type, test_location)
        
        # Convert to format expected by excel_service
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
        import io
        
        wb = Workbook()
        
        # Style definitions
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1a1a2e", end_color="1a1a2e", fill_type="solid")
        header_alignment = Alignment(horizontal="center", vertical="center")
        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        # Sheet 1: Test Summary
        ws1 = wb.active
        ws1.title = "test_summary"
        
        summary_headers = [
            "candidate_id", "name", "email", "phone", "test_date", "login_time", "submit_time",
            "submission_type", "time_taken_min", "test_location", "total_questions", "python_questions",
            "sql_questions", "mcq_questions", "python_score", "sql_score", "mcq_score", "overall_score",
            "overall_percentage", "overall_verdict"
        ]
        
        for col, header in enumerate(summary_headers, 1):
            cell = ws1.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
        
        # Verdict colors
        VERDICT_COLORS = {
            "Good": PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid"),
            "Average": PatternFill(start_color="FFEB9C", end_color="FFEB9C", fill_type="solid"),
            "Below Average": PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")
        }
        
        for row_idx, record in enumerate(results, 2):
            for col_idx, col_name in enumerate(summary_headers, 1):
                cell = ws1.cell(row=row_idx, column=col_idx, value=record.get(col_name, ""))
                cell.border = thin_border
                cell.alignment = Alignment(horizontal="center")
                
                if col_name == "overall_verdict":
                    verdict_val = record.get(col_name, "")
                    if verdict_val in VERDICT_COLORS:
                        cell.fill = VERDICT_COLORS[verdict_val]
        
        ws1.freeze_panes = "A2"
        
        # Sheet 2: Problem Testcases
        ws2 = wb.create_sheet("problem_testcases")
        testcase_headers = [
            "candidate_id", "name", "easy_solved", "easy_total", "medium_solved", "medium_total",
            "hard_solved", "hard_total", "total_solved", "total_problems"
        ]
        
        for col, header in enumerate(testcase_headers, 1):
            cell = ws2.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
        
        for row_idx, record in enumerate(results, 2):
            pt = record.get("problem_testcases", {})
            total_solved = pt.get("easy_solved", 0) + pt.get("medium_solved", 0) + pt.get("hard_solved", 0)
            total_problems = pt.get("easy_total", 0) + pt.get("medium_total", 0) + pt.get("hard_total", 0)
            
            row_data = [
                record.get("candidate_id", ""),
                record.get("name", ""),
                pt.get("easy_solved", 0),
                pt.get("easy_total", 0),
                pt.get("medium_solved", 0),
                pt.get("medium_total", 0),
                pt.get("hard_solved", 0),
                pt.get("hard_total", 0),
                total_solved,
                total_problems
            ]
            
            for col_idx, value in enumerate(row_data, 1):
                cell = ws2.cell(row=row_idx, column=col_idx, value=value)
                cell.border = thin_border
                cell.alignment = Alignment(horizontal="center")
        
        ws2.freeze_panes = "A2"
        
        # Sheet 3: Testcase Details
        ws3 = wb.create_sheet("testcase_details")
        details_headers = ["candidate_id", "name"]
        # Add problem columns based on first record
        if results:
            problem_scores = results[0].get("problem_scores", {})
            for key in sorted(problem_scores.keys()):
                details_headers.append(key)
        
        for col, header in enumerate(details_headers, 1):
            cell = ws3.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
        
        for row_idx, record in enumerate(results, 2):
            problem_scores = record.get("problem_scores", {})
            row_data = [
                record.get("candidate_id", ""),
                record.get("name", "")
            ]
            for key in sorted(details_headers[2:]):
                row_data.append(problem_scores.get(key, 0))
            
            for col_idx, value in enumerate(row_data, 1):
                cell = ws3.cell(row=row_idx, column=col_idx, value=value)
                cell.border = thin_border
                cell.alignment = Alignment(horizontal="center")
        
        ws3.freeze_panes = "A2"
        
        # Auto-fit columns
        for ws in [ws1, ws2, ws3]:
            for column_cells in ws.columns:
                max_length = 0
                column = column_cells[0].column_letter
                for cell in column_cells:
                    try:
                        if cell.value:
                            max_length = max(max_length, len(str(cell.value)))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                ws.column_dimensions[column].width = adjusted_width
        
        # Save to bytes
        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        
        filename = f"HR_Assessment_Report_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting results: {str(e)}")


@app.post("/api/assessment/init-sample-data")
async def init_sample_data():
    """Initialize Excel file with sample data for 5 candidates (for testing)"""
    try:
        count = create_sample_data()
        return {"success": True, "message": f"Created sample data for {count} candidates"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sample data: {str(e)}")


# Language-specific problem routes - MUST be before /problems/{problem_id}
@app.get("/problems/python")
async def get_python_problems(session_id: Optional[str] = None):
    """Get Python problems filtered by the candidate's assigned test type."""
    test_type = get_session_test_type(session_id)
    if not has_test_type_section(test_type, "python"):
        return []
    python_problems, _ = get_assigned_problem_sets_for_session(session_id, test_type)
    return python_problems

@app.get("/problems/sql")
async def get_sql_problems(session_id: Optional[str] = None):
    """Get SQL problems filtered by the candidate's assigned test type."""
    test_type = get_session_test_type(session_id)
    if not has_test_type_section(test_type, "sql"):
        return []
    _, sql_problems = get_assigned_problem_sets_for_session(session_id, test_type)
    return sql_problems

@app.get("/problems/mcq")
async def get_mcq_problems(session_id: Optional[str] = None):
    """Get MCQ questions filtered by the candidate's assigned test type."""
    test_type = get_session_test_type(session_id)
    if not has_test_type_section(test_type, "mcq"):
        return []
    return get_assigned_mcq_questions_for_session(session_id, test_type)

@app.get("/problems/{problem_id}")
async def get_problem_details(problem_id: str):
    problem = get_problem(problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    input_format_value = problem.get("input_format", "")
    if problem.get("language") == "sql" and isinstance(input_format_value, str):
        try:
            parsed_input_format = json.loads(input_format_value) if input_format_value.strip().startswith("{") else input_format_value
            input_format_value = parsed_input_format
        except Exception:
            pass

    input_preview_columns = []
    input_preview_rows = []
    output_preview_columns = []
    output_preview_rows = []
    expected_output = None

    if problem.get("language") == "sql":
        raw_cases = problem.get("test_cases", []) or []
        for case in raw_cases:
            case_expected_output = case.get("expected_output")
            if isinstance(case_expected_output, dict):
                case_columns = case_expected_output.get("columns", []) or []
                case_rows = case_expected_output.get("rows", []) or []
                if case_columns or case_rows:
                    expected_output = {
                        "columns": case_columns,
                        "rows": case_rows,
                    }
                    break

            case_columns = case.get("expected_columns", []) or []
            case_rows = case.get("expected_rows", []) or []
            if case_columns or case_rows:
                expected_output = {
                    "columns": case_columns,
                    "rows": case_rows,
                }
                break

        try:
            schema_sql = problem.get("schema_sql", "") or ""
            seed_sql = problem.get("seed_sql", "") or ""
            starter_code = problem.get("starter_code", "") or ""

            if schema_sql:
                conn = sqlite3.connect(":memory:")
                cursor = conn.cursor()
                cursor.executescript(schema_sql)
                if seed_sql:
                    cursor.executescript(seed_sql)

                # Generate input preview from first table
                table_match = None
                for stmt in schema_sql.split(";"):
                    s = stmt.strip()
                    if not s:
                        continue
                    if s.lower().startswith("create table"):
                        table_match = s
                        break

                table_name = None
                if table_match:
                    tokens = table_match.replace("(", " ( ").split()
                    if len(tokens) >= 3:
                        table_name = tokens[2].strip('`"[]')

                if table_name:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                    rows = cursor.fetchall()
                    input_preview_columns = [desc[0] for desc in cursor.description] if cursor.description else []
                    input_preview_rows = [list(row) for row in rows]

                # Generate expected output preview by executing starter code query
                if starter_code:
                    try:
                        cursor.execute(starter_code)
                        output_rows = cursor.fetchall()
                        output_preview_columns = [desc[0] for desc in cursor.description] if cursor.description else []
                        output_preview_rows = [list(row) for row in output_rows]
                    except Exception:
                        # Query might fail with given schema, keep empty
                        pass

                cursor.close()
                conn.close()
        except Exception:
            # Keep API stable even if preview generation fails.
            input_preview_columns = []
            input_preview_rows = []
            output_preview_columns = []
            output_preview_rows = []

    # Return problem without hidden judging test case details
    return {
        "id": problem.get("id", ""),
        "title": problem.get("title", ""),
        "statement": problem.get("statement") or problem.get("description", ""),
        # For SQL: Use 'tables' field (new structure), keep 'input_format' for backward compatibility
        "tables": input_format_value.get("tables", []) if isinstance(input_format_value, dict) and problem.get("language") == "sql" else [],
        "input_format": input_format_value,
        "output_format": problem.get("output_format", ""),
        "sample_input": problem.get("sample_input", ""),
        "sample_output": problem.get("sample_output", ""),
        "starter_code": problem.get("starter_code", ""),
        "language": problem.get("language", "python"),
        "difficulty": problem.get("difficulty", "Medium"),
        "marks": problem.get("marks", 10),
        "time_limit": problem.get("time_limit", 10),
        "expected_output": expected_output,
        "input_preview_columns": input_preview_columns,
        "input_preview_rows": input_preview_rows,
        "output_preview_columns": output_preview_columns,
        "output_preview_rows": output_preview_rows,
    }

@app.get("/hr/problems")
async def get_all_problems():
    return list_problems()

@app.post("/hr/problems")
async def add_problem(problem: dict):
    import json
    import traceback
    
    try:
        pid = problem.get("id")
        if not pid:
            raise HTTPException(status_code=400, detail="Problem ID is required")
        if pid in PROBLEMS:
            raise HTTPException(status_code=400, detail="Problem ID already exists")
        
        # Save to database for permanent storage
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        test_cases_json = json.dumps(problem.get("test_cases", []))
        created_at = datetime.now().isoformat()
        
        # Handle both old string format and new object format for input_format
        input_format_value = problem.get("input_format", "")
        if isinstance(input_format_value, dict):
            input_format_value = json.dumps(input_format_value)
        
        # Use statement or description for backward compatibility
        statement_value = problem.get("statement") or problem.get("description", "")
        description_value = problem.get("description") or problem.get("statement", "")
        
        cursor.execute("""
            INSERT INTO custom_problems (id, title, language, difficulty, marks, time_limit,
            statement, description, input_format, output_format, sample_input, sample_output,
            starter_code, test_cases_json, schema_sql, seed_sql, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            problem.get("id"),
            problem.get("title"),
            problem.get("language"),
            problem.get("difficulty", "Medium"),
            problem.get("marks", 10),
            problem.get("time_limit", 10),
            statement_value,
            description_value,
            input_format_value,
            problem.get("output_format", ""),
            problem.get("sample_input", ""),
            problem.get("sample_output", ""),
            problem.get("starter_code", ""),
            test_cases_json,
            problem.get("schema_sql", ""),
            problem.get("seed_sql", ""),
            created_at
        ))
        conn.commit()
        conn.close()
        
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

@app.delete("/hr/problems/{problem_id}")
async def delete_problem(problem_id: str):
    if problem_id not in PROBLEMS:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Delete from database as well
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM custom_problems WHERE id = ?", (problem_id,))
    conn.commit()
    conn.close()
    
    # Also delete from in-memory PROBLEMS
    del PROBLEMS[problem_id]
    sync_custom_problems_export()
    return {"status": "ok"}

@app.get("/api/mcq-questions")
async def get_public_mcq_questions():
    return {"questions": fetch_all_mcq_questions(include_internal=False, descending=True)}


@app.get("/hr/mcq-questions")
async def get_all_mcq_questions():
    return {"questions": fetch_all_mcq_questions(include_internal=True, descending=True)}


@app.post("/hr/mcq-questions")
async def create_mcq_question(question: MCQQuestionCreate):
    conn = get_mcq_db_connection()
    try:
        cursor = conn.cursor()
        question_id = f"mcq_{uuid.uuid4().hex[:12]}"
        created_at = datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
        cursor.execute(
            """
            INSERT INTO mcq_questions
            (id, title, question_text, option_a, option_b, option_c, option_d,
             correct_option, question_title, question, options_json, correct_answer,
             difficulty, marks, time, topic, explanation, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                question_id,
                question.question_title,
                question.question,
                question.options[0],
                question.options[1],
                question.options[2],
                question.options[3],
                "ABCD"[question.correct_answer],
                question.question_title,
                question.question,
                json.dumps(question.options),
                question.correct_answer,
                question.difficulty,
                question.marks,
                question.time,
                question.topic,
                question.explanation,
                created_at,
            )
        )
        conn.commit()
        cursor.execute("SELECT * FROM mcq_questions WHERE id = ?", (question_id,))
        row = cursor.fetchone()
        return {"status": "ok", "question": serialize_mcq_question(row, include_internal=True)}
    finally:
        conn.close()


@app.delete("/hr/mcq-questions/{question_id}")
async def delete_mcq_question(question_id: str):
    conn = get_mcq_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mcq_questions WHERE id = ?", (question_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="MCQ question not found")
        conn.commit()
        return {"status": "ok"}
    finally:
        conn.close()

@app.get("/hr/problems/random")
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

@app.get("/hr/problems/random/replace")
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

@app.post("/hr/exam/save")
async def save_exam_problems(request_data: dict):
    """Save selected exam problems permanently for candidates"""
    problems = request_data.get("problems", [])
    if not problems:
        raise HTTPException(status_code=400, detail="No problems provided")
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Clear existing saved problems
    cursor.execute("DELETE FROM selected_exam_problems")
    
    # Insert new problems
    saved_at = datetime.now().isoformat()
    for p in problems:
        cursor.execute("""
            INSERT OR REPLACE INTO selected_exam_problems 
            (problem_id, language, difficulty, marks, time_limit, title, saved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            p.get("id"),
            p.get("language"),
            p.get("difficulty", "Medium"),
            p.get("marks", 10),
            p.get("time_limit", 10),
            p.get("title"),
            saved_at
        ))
    
    conn.commit()
    conn.close()
    
    # Also update in-memory selected_random_problems
    selected_random_problems["python"] = [p for p in problems if p.get("language") == "python"]
    selected_random_problems["sql"] = [p for p in problems if p.get("language") == "sql"]
    
    return {"status": "ok", "saved": len(problems)}

@app.get("/hr/exam/selected")
async def get_saved_exam_problems(email: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    """Get saved exam problems, optionally filtered for a specific candidate."""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT problem_id, language, difficulty, marks, time_limit, title FROM selected_exam_problems")
    rows = cursor.fetchall()
    conn.close()

    global_problems = []
    for row in rows:
        problem = get_problem(row[0])
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
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT problem_id, language FROM selected_exam_problems")
    rows = cursor.fetchall()
    conn.close()
    
    python_problems = []
    sql_problems = []
    
    for row in rows:
        problem = get_problem(row[0])
        if problem:
            problem_info = {
                "id": problem["id"],
                "title": problem["title"],
                "language": problem["language"],
                "difficulty": problem.get("difficulty", "Medium"),
                "marks": problem.get("marks", 10),
                "time_limit": problem.get("time_limit", 10)
            }
            if row[1] == "python":
                python_problems.append(problem_info)
            else:
                sql_problems.append(problem_info)
    
    if python_problems or sql_problems:
        selected_random_problems["python"] = python_problems
        selected_random_problems["sql"] = sql_problems

# Load saved exam problems at startup
load_saved_exam_problems()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

# --- Exam Session Management ---

@app.get("/exam/summary")
async def exam_summary(session_id: Optional[str] = None):
    """Get exam overview filtered by the candidate's assigned test type."""
    # Use selected random problems if they exist, otherwise use all problems
    # Always fetch fresh time_limit from PROBLEMS dict to reflect latest DB values
    def enrich(p):
        fresh = PROBLEMS.get(p["id"], p)
        return {**p, "time_limit": fresh.get("time_limit", p.get("time_limit", 10))}

    test_type = get_session_test_type(session_id)
    raw_python, raw_sql = get_assigned_problem_sets_for_session(session_id, test_type)
    raw_mcq = get_assigned_mcq_questions_for_session(session_id, test_type)

    python_problems = [enrich(p) for p in raw_python]
    sql_problems = [enrich(p) for p in raw_sql]
    mcq_problems = [
        {
            "id": question["id"],
            "title": question["question_title"],
            "language": "mcq",
            "difficulty": question.get("difficulty", "easy"),
            "marks": question.get("marks", 10),
            "time_limit": question.get("time", 10),
            "topic": question.get("topic", "Python"),
        }
        for question in raw_mcq
    ]
    all_problems = python_problems + sql_problems + mcq_problems

    return {
        "total_duration_minutes": 150,
        "total_questions": len(all_problems),
        "python_questions": len(python_problems),
        "sql_questions": len(sql_problems),
        "mcq_questions": len(mcq_problems),
        "total_marks": sum(p.get("marks", 10) for p in all_problems),
        "problems": all_problems
    }

@app.post("/exam/start")
async def start_exam(request: StartExamRequest):
    """Start a new exam session"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[request.session_id]
    
    # Check if exam already started
    if user_id in exam_sessions and exam_sessions[user_id]["status"] == "active":
        exam = exam_sessions[user_id]
        elapsed = (datetime.now() - exam["start_time"]).total_seconds()
        remaining = max(0, EXAM_DURATION_SECONDS - elapsed)
        
        if remaining > 0:
            return {
                "status": "already_started",
                "start_time": exam["start_time"].isoformat(),
                "remaining_seconds": int(remaining),
                "answers": exam.get("answers", {})
            }
        else:
            # Time expired but not submitted
            exam_sessions[user_id]["status"] = "expired"
    
    # Start new exam
    start_time = datetime.now()
    exam_sessions[user_id] = {
        "start_time": start_time,
        "end_time": start_time,  # Will be updated on submit
        "status": "active",
        "answers": {}
    }
    
    return {
        "status": "started",
        "start_time": start_time.isoformat(),
        "remaining_seconds": EXAM_DURATION_SECONDS
    }

@app.get("/exam/status")
async def get_exam_status(session_id: str):
    """Get current exam status and remaining time"""
    if session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[session_id]
    
    if user_id not in exam_sessions:
        return {"status": "not_started"}
    
    exam = exam_sessions[user_id]
    
    if exam["status"] == "completed":
        return {
            "status": "completed",
            "start_time": exam["start_time"].isoformat(),
            "end_time": exam["end_time"].isoformat()
        }
    
    elapsed = (datetime.now() - exam["start_time"]).total_seconds()
    remaining = max(0, EXAM_DURATION_SECONDS - elapsed)
    
    if remaining <= 0:
        return {
            "status": "expired",
            "start_time": exam["start_time"].isoformat(),
            "remaining_seconds": 0,
            "answers": exam.get("answers", {})
        }
    
    return {
        "status": "active",
        "start_time": exam["start_time"].isoformat(),
        "remaining_seconds": int(remaining),
        "answers": exam.get("answers", {})
    }

@app.post("/exam/save-answer")
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

@app.post("/api/exam/{exam_id}/logs")
@app.post("/exam/{exam_id}/logs")
async def create_proctoring_log(
    exam_id: int,
    payload: ProctoringLogCreate,
    request: Request,
    db: Session = Depends(get_sqlalchemy_db)
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

@app.post("/exam/submit")
async def submit_exam(request: ExamSubmitRequest, db: sqlite3.Connection = Depends(get_db)):
    """Submit entire exam - either manual or auto (timer expired)"""
    if request.session_id not in sessions:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user_id = sessions[request.session_id]
    
    if user_id not in exam_sessions:
        raise HTTPException(status_code=400, detail="No exam session found")
    
    exam = exam_sessions[user_id]
    
    if exam["status"] == "completed":
        raise HTTPException(status_code=400, detail="Exam already submitted")
    
    # Mark exam as completed
    exam["status"] = "completed"
    exam["end_time"] = datetime.now()
    
    # Calculate time taken
    time_taken = int((exam["end_time"] - exam["start_time"]).total_seconds())
    
    # Process each answer
    results = []
    total_score = 0
    evaluated_total_marks = 0

    # Resolve full assigned exam scope (not just answered questions)
    assigned_test_type = get_session_test_type(request.session_id)
    assigned_python_problems, assigned_sql_problems = get_assigned_problem_sets_for_session(request.session_id, assigned_test_type)
    assigned_mcq_questions = get_assigned_mcq_questions_for_session(request.session_id, assigned_test_type)
    assigned_all_problems = assigned_python_problems + assigned_sql_problems + assigned_mcq_questions
    assigned_total_questions = len(assigned_all_problems)
    assigned_total_marks = sum(p.get("marks", 10) for p in assigned_all_problems)
    
    cursor = db.cursor()
    
    # Get user info
    cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
    user_info = cursor.fetchone()
    
    for answer in request.answers:
        answer_language = str(answer.language or "").strip().lower()
        stored_answer = answer.code
        problem = fetch_mcq_question_by_id(answer.problem_id, include_internal=True) if answer_language == "mcq" else get_problem(answer.problem_id)
        if not problem:
            continue
        
        problem_marks = problem.get("marks", 10)
        evaluated_total_marks += problem_marks
        total_execution_time = 0
        
        # Evaluate based on language
        if answer_language == "sql":
            # SQL evaluation
            passed_tests = 0
            sql_test_cases = build_sql_test_cases(problem, min_cases=5)
            total_tests = len(sql_test_cases)
            
            for test_case in sql_test_cases:
                try:
                    start_time = datetime.now()
                    columns, rows = execute_sql_problem_query(problem, answer.code)
                    execution_time = (datetime.now() - start_time).total_seconds() * 1000
                    total_execution_time += execution_time
                    
                    expected_columns = test_case.get("expected_columns", [])
                    expected_rows = test_case.get("expected_rows", [])
                    if compare_result_sets(columns, rows, expected_columns, expected_rows):
                        passed_tests += 1
                except:
                    pass
            
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        elif answer_language == "mcq":
            total_tests = 1
            try:
                selected_option = answer.selected_option if answer.selected_option is not None else int(str(answer.code).strip())
            except (TypeError, ValueError):
                selected_option = -1

            correct_answer = int(problem.get("correct_answer", 0))
            passed_tests = 1 if selected_option == correct_answer else 0
            score = 100 if passed_tests else 0
            stored_answer = str(selected_option)
        else:
            # Python evaluation with normalized comparison
            runner = PythonRunner()
            passed_tests = 0
            total_tests = len(problem.get("test_cases", []))
            
            async with execution_semaphore:
                for test_case in problem.get("test_cases", []):
                    start_time = datetime.now()
                    result = await runner.run_with_input(answer.code, test_case["input"])
                    execution_time = (datetime.now() - start_time).total_seconds() * 1000
                    total_execution_time += execution_time
                    
                    if result["status"] == "success":
                        # Use normalized comparison
                        expected = test_case.get("expected_output") or test_case.get("output", "")
                        if compare_outputs(result["stdout"], expected):
                            passed_tests += 1
            
            score = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Determine verdict and average execution time
        verdict = get_verdict(passed_tests, total_tests)
        avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
        
        # Save submission
        cursor.execute(
            """INSERT INTO submissions
            (user_id, problem_id, code, passed_tests, total_tests, score, verdict, execution_time_ms, time_taken, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, answer.problem_id, stored_answer, passed_tests, total_tests, score, verdict, avg_execution_time, time_taken, datetime.now().isoformat())
        )
        submission_id = cursor.lastrowid
        
        # Update hr_results for best score
        cursor.execute(
            """SELECT best_score FROM hr_results WHERE user_id = ? AND problem_id = ?""",
            (user_id, answer.problem_id)
        )
        existing = cursor.fetchone()
        current_best = existing[0] if existing else 0
        
        if score > current_best:
            cursor.execute(
                """INSERT OR REPLACE INTO hr_results
                (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, verdict, execution_time_ms, time_taken, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (user_id, user_info[0], user_info[1], answer.problem_id, score, passed_tests, total_tests, submission_id, verdict, avg_execution_time, time_taken, datetime.now().isoformat())
            )
        
        total_score += (score / 100) * problem_marks
        results.append({
            "problem_id": answer.problem_id,
            "passed_tests": passed_tests,
            "total_tests": total_tests,
            "score": score,
            "verdict": verdict,
            "execution_time_ms": round(avg_execution_time, 2)
        })
    
    db.commit()
    
    # Get test location from user BEFORE closing cursor
    cursor.execute("SELECT test_location FROM users WHERE id = ?", (user_id,))
    test_location_row = cursor.fetchone()
    test_location = test_location_row[0] if test_location_row and test_location_row[0] else "home"
    
    cursor.close()
    
    python_score = 0
    sql_score = 0
    mcq_score = 0

    # Create assessment record for dashboard
    try:
        # Calculate Python, SQL, and MCQ scores separately
        for answer in request.answers:
            answer_language = str(answer.language or "").strip().lower()
            problem = fetch_mcq_question_by_id(answer.problem_id, include_internal=True) if answer_language == "mcq" else get_problem(answer.problem_id)
            if not problem:
                continue
            
            # Find the result for this problem
            result = next((r for r in results if r["problem_id"] == answer.problem_id), None)
            if not result:
                continue
            
            problem_marks = problem.get("marks", 10)
            score_contribution = (result["score"] / 100) * problem_marks
            
            if answer_language == "sql":
                sql_score += score_contribution
            elif answer_language == "mcq":
                mcq_score += score_contribution
            else:
                python_score += score_contribution
        
        # Build problem testcases summary (easy/medium/hard) from the assigned exam scope.
        total_difficulty_counts = {"easy": 0, "medium": 0, "hard": 0}
        for problem in assigned_all_problems:
            difficulty = str(problem.get("difficulty", "medium")).strip().lower()
            if difficulty in total_difficulty_counts:
                total_difficulty_counts[difficulty] += 1
        
        # Count solved questions per difficulty from candidate's submissions
        solved_difficulty = {"easy": 0, "medium": 0, "hard": 0}
        for answer in request.answers:
            answer_language = str(answer.language or "").strip().lower()
            problem = fetch_mcq_question_by_id(answer.problem_id, include_internal=True) if answer_language == "mcq" else get_problem(answer.problem_id)
            if problem:
                difficulty = str(problem.get("difficulty", "medium")).strip().lower()
                result = next((r for r in results if r["problem_id"] == answer.problem_id), None)
                if result and result["passed_tests"] == result["total_tests"] and difficulty in solved_difficulty:
                    solved_difficulty[difficulty] += 1
        
        # Build problem scores map
        problem_scores_map = {}
        python_problem_slots = {
            problem_id: index
            for index, problem_id in enumerate(get_selected_exam_problem_ids("python"), start=1)
        }
        sql_problem_slots = {
            problem_id: index
            for index, problem_id in enumerate(get_selected_exam_problem_ids("sql"), start=6)
        }
        fallback_python_slot = 1
        fallback_sql_slot = 6

        for answer in request.answers:
            result = next((r for r in results if r["problem_id"] == answer.problem_id), None)
            if result:
                if answer.language == "sql":
                    problem_num = sql_problem_slots.get(answer.problem_id)
                    if problem_num is None:
                        while f"P{fallback_sql_slot}_sql" in problem_scores_map:
                            fallback_sql_slot += 1
                        problem_num = fallback_sql_slot
                    key = f"P{problem_num}_sql"
                else:
                    problem_num = python_problem_slots.get(answer.problem_id)
                    if problem_num is None:
                        while f"P{fallback_python_slot}_py" in problem_scores_map:
                            fallback_python_slot += 1
                        problem_num = fallback_python_slot
                    key = f"P{problem_num}_py"
                problem_scores_map[key] = result["passed_tests"]
        
        # Create assessment data
        assessment_data = {
            "user_id": user_id,
            "candidate_id": f"C{str(user_id).zfill(3)}",
            "name": user_info[0],
            "email": user_info[1],
            "phone": "",  # Can be added later if needed
            "test_date": datetime.now().strftime("%Y-%m-%d"),
            "login_time": exam["start_time"].strftime("%H:%M"),
            "submit_time": exam["end_time"].strftime("%H:%M"),
            "submission_type": "auto" if request.auto_submit else "manual",
            "time_taken_min": int(time_taken / 60),
            "total_questions": assigned_total_questions,
            "python_questions": len(assigned_python_problems),
            "sql_questions": len(assigned_sql_problems),
            "mcq_questions": len(assigned_mcq_questions),
            "test_location": test_location,
            "python_score": python_score,
            "sql_score": sql_score,
            "mcq_score": mcq_score,
            "max_possible_score": assigned_total_marks if assigned_total_marks > 0 else evaluated_total_marks,
            "problem_testcases": {
                "easy_solved": solved_difficulty["easy"],
                "easy_total": total_difficulty_counts["easy"],
                "medium_solved": solved_difficulty["medium"],
                "medium_total": total_difficulty_counts["medium"],
                "hard_solved": solved_difficulty["hard"],
                "hard_total": total_difficulty_counts["hard"]
            },
            "problem_scores": problem_scores_map
        }
        
        # Save to database
        create_assessment(db, assessment_data)
    except Exception as e:
        # Log error but don't fail the submission
        print(f"Warning: Failed to create assessment record: {e}")
    
    final_total_marks = assigned_total_marks if assigned_total_marks > 0 else evaluated_total_marks

    return {
        "status": "submitted",
        "submission_type": "auto" if request.auto_submit else "manual",
        "time_taken": time_taken,
        "total_score": total_score,
        "total_marks": final_total_marks,
        "percentage": (total_score / final_total_marks * 100) if final_total_marks > 0 else 0,
        "python_score": python_score,
        "sql_score": sql_score,
        "mcq_score": mcq_score,
        "results": results
    }

# --- SQL support (Multi-dialect: SQLite, MySQL, PostgreSQL) ---

import pymysql
import psycopg2
from psycopg2 import sql as psql

# Database connection configurations
MYSQL_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'port': int(os.getenv('MYSQL_PORT', 3306)),
    'user': os.getenv('MYSQL_USER', 'root'),
    'password': os.getenv('MYSQL_PASSWORD', ''),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

POSTGRESQL_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': int(os.getenv('POSTGRES_PORT', 5432)),
    'user': os.getenv('POSTGRES_USER', 'postgres'),
    'password': os.getenv('POSTGRES_PASSWORD', ''),
    'database': os.getenv('POSTGRES_DB', 'coding_platform')
}

# Dialect-specific syntax validation and error simulation
DIALECT_VALIDATION_RULES = {
    'mysql': {
        'blocked': ['ILIKE', 'SERIAL', 'RETURNING', 'TO_CHAR', 'STRING_AGG', 'CTE'],
        'supported': ['LIMIT', 'AUTO_INCREMENT', 'IFNULL', 'GROUP_CONCAT', 'SHOW', 'DESCRIBE']
    },
    'postgresql': {
        'blocked': ['AUTO_INCREMENT', 'SHOW TABLES', 'DESCRIBE', 'IFNULL', 'GROUP_CONCAT'],
        'supported': ['ILIKE', 'SERIAL', 'RETURNING', 'TO_CHAR', 'STRING_AGG', 'COALESCE']
    },
    'sql': {
        'blocked': [],
        'supported': ['LIMIT', 'JOIN', 'SUBQUERY', 'CASE', 'AGGREGATE']
    }
}

def validate_dialect_syntax(query: str, dialect: str):
    """Validate query against dialect-specific rules"""
    query_upper = query.upper()
    rules = DIALECT_VALIDATION_RULES.get(dialect, {'blocked': [], 'supported': []})
    
    errors = []
    for blocked in rules['blocked']:
        if blocked in query_upper:
            errors.append(f"{blocked} is not supported in {dialect.upper()}")
    
    return errors

def get_database_connection(dialect: str, problem: dict):
    """Get database connection based on selected dialect"""
    # Always use SQLite but simulate dialect behavior
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Execute schema and seed data
        cursor.executescript(problem["schema_sql"])
        cursor.executescript(problem["seed_sql"])
        conn.commit()
        return conn, None
    except Exception as e:
        conn.close()
        raise e

def cleanup_database_connection(conn, dialect: str, db_identifier: str):
    """Clean up database resources after execution"""
    if conn:
        try:
            cursor = conn.cursor()
            
            if dialect == 'mysql' and db_identifier:
                # Drop the test database
                try:
                    cursor.execute(f"DROP DATABASE IF EXISTS {db_identifier}")
                    conn.commit()
                except:
                    pass
            elif dialect == 'postgresql' and db_identifier:
                # Drop the test schema
                try:
                    cursor.execute(f"DROP SCHEMA IF EXISTS {db_identifier} CASCADE")
                    conn.commit()
                except:
                    pass
            
            cursor.close()
            conn.close()
        except:
            pass

BLOCKED_SQL_KEYWORDS = ["drop", "attach", "pragma", "alter"]

def validate_sql_query(query: str):
    """Validate SQL query for security (allow only read-only operations)"""
    text = query or ""
    lowered = text.lower().strip()
    
    # Block dangerous database-level operations
    for kw in BLOCKED_SQL_KEYWORDS:
        if lowered.startswith(kw):
            raise HTTPException(
                status_code=400,
                detail=f"Only read-only SELECT queries are allowed. Keyword '{kw.upper()}' is not permitted."
            )
    
    # Check if query is empty
    if not lowered:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    
    # Allow WITH (CTE), SELECT, and explanatory queries
    first_token = lowered.split()[0] if lowered.split() else ""
    if first_token not in ("select", "with", "explain", "describe"):
        raise HTTPException(
            status_code=400, 
            detail="Only read-only SELECT queries are allowed. Your query should start with SELECT or WITH."
        )

def execute_sql_problem_query(problem: dict, query: str, dialect: str = "sql"):
    """Execute user SQL query with dialect-specific database engine"""
    validate_sql_query(query)
    
    # Validate dialect-specific syntax
    dialect_errors = validate_dialect_syntax(query, dialect)
    if dialect_errors:
        raise HTTPException(
            status_code=400,
            detail=f"Dialect error: {'; '.join(dialect_errors)}"
        )
    
    conn = None
    db_identifier = None
    
    try:
        # Get connection based on dialect (uses SQLite with dialect simulation)
        conn, db_identifier = get_database_connection(dialect, problem)
        cursor = conn.cursor()
        
        # Execute the user's query
        cursor.execute(query)
        
        # Fetch results
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        result_rows = [list(row) for row in rows]
        
        cursor.close()
        return columns, result_rows
    
    finally:
        # Clean up database resources
        cleanup_database_connection(conn, dialect, db_identifier)

def normalize_sql_value(v):
    """Normalize SQL values for comparison across SQLite/JSON representations."""
    if v is None:
        return None

    if isinstance(v, bool):
        return int(v)

    if isinstance(v, (int, float)):
        return str(v)

    if isinstance(v, str):
        trimmed = v.strip()
        try:
            numeric = float(trimmed)
        except ValueError:
            return trimmed

        if numeric.is_integer():
            return str(int(numeric))
        return str(numeric)

    return v

def compare_result_sets(actual_columns, actual_rows, expected_columns, expected_rows):
    """Compare SQL result sets with flexible ordering"""
    normalized_actual_rows = [
        [normalize_sql_value(v) for v in row] for row in actual_rows
    ]
    normalized_expected_rows = [
        [normalize_sql_value(v) for v in row] for row in expected_rows
    ]

    # Normalize column names
    actual_cols_norm = [c.strip().lower() for c in actual_columns]
    expected_cols_norm = [c.strip().lower() for c in expected_columns]

    if set(actual_cols_norm) == set(expected_cols_norm):
        # Map actual columns to expected order
        index_map = {name: idx for idx, name in enumerate(actual_cols_norm)}
        ordered_actual_rows = []
        for row in normalized_actual_rows:
            ordered_actual_rows.append(
                [row[index_map[col]] for col in expected_cols_norm]
            )

        # Ignore row order: compare sorted lists
        ordered_actual_rows_sorted = sorted(ordered_actual_rows, key=lambda x: str(x))
        expected_norm_rows_sorted = sorted(normalized_expected_rows, key=lambda x: str(x))

        if ordered_actual_rows_sorted == expected_norm_rows_sorted:
            return True

    # Fallback: if the data matches exactly but the candidate used different
    # column aliases, still accept the answer.
    if len(actual_cols_norm) != len(expected_cols_norm):
        return False

    normalized_actual_rows_sorted = sorted(normalized_actual_rows, key=lambda x: str(x))
    normalized_expected_rows_sorted = sorted(normalized_expected_rows, key=lambda x: str(x))
    return normalized_actual_rows_sorted == normalized_expected_rows_sorted

def build_sql_test_cases(problem: dict, min_cases: int = 5):
    """
    Build SQL test cases with expected result sets and enforce minimum count.
    Legacy SQL problems may only contain placeholder test cases without expected rows.
    """
    raw_cases = problem.get("test_cases", []) or []
    normalized_cases = []

    for case in raw_cases:
        expected_output = case.get("expected_output")
        if isinstance(expected_output, dict):
            expected_columns = expected_output.get("columns", []) or []
            expected_rows = expected_output.get("rows", []) or []
        else:
            expected_columns = case.get("expected_columns", []) or []
            expected_rows = case.get("expected_rows", []) or []

        if not expected_columns and not expected_rows and problem.get("starter_code"):
            try:
                expected_columns, expected_rows = execute_sql_problem_query(
                    problem,
                    problem.get("starter_code", ""),
                    "sql"
                )
            except Exception:
                expected_columns, expected_rows = [], []

        if expected_columns or expected_rows:
            normalized_cases.append({
                "expected_columns": expected_columns,
                "expected_rows": expected_rows
            })

    if not normalized_cases and problem.get("starter_code"):
        try:
            expected_columns, expected_rows = execute_sql_problem_query(
                problem,
                problem.get("starter_code", ""),
                "sql"
            )
            normalized_cases.append({
                "expected_columns": expected_columns,
                "expected_rows": expected_rows
            })
        except Exception:
            pass

    if normalized_cases:
        while len(normalized_cases) < min_cases:
            normalized_cases.append(dict(normalized_cases[-1]))

    return normalized_cases

async def evaluate_sql_submission(problem: dict, query: str, dialect: str = "sql"):
    """Run SQL against all normalized test cases without persisting results."""
    test_cases = build_sql_test_cases(problem, min_cases=5)
    if not test_cases:
        raise HTTPException(status_code=500, detail="No test cases configured for this SQL problem.")

    passed_tests = 0
    total_tests = len(test_cases)
    failed_details = []
    total_execution_time = 0

    async with execution_semaphore:
        for idx, test_case in enumerate(test_cases):
            try:
                start_time = datetime.now()
                columns, rows = execute_sql_problem_query(problem, query, dialect)
                execution_time = (datetime.now() - start_time).total_seconds() * 1000
                total_execution_time += execution_time
            except HTTPException as e:
                failed_details.append({
                    "test_case": idx + 1,
                    "error": e.detail
                })
                continue
            except Exception as e:
                failed_details.append({
                    "test_case": idx + 1,
                    "error": f"SQL execution error ({dialect.upper()}): {str(e)}"
                })
                continue

            expected_columns = test_case.get("expected_columns", [])
            expected_rows = test_case.get("expected_rows", [])

            if compare_result_sets(columns, rows, expected_columns, expected_rows):
                passed_tests += 1
            else:
                failed_details.append({
                    "test_case": idx + 1,
                    "expected": f"Columns: {expected_columns}, Rows: {expected_rows}",
                    "actual": f"Columns: {columns}, Rows: {rows}"
                })

    avg_execution_time = total_execution_time / total_tests if total_tests > 0 else 0
    return passed_tests, total_tests, failed_details, avg_execution_time

@app.post("/sql/run")
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

@app.post("/sql/submit")
async def submit_sql(request: SubmitSqlRequest, db: sqlite3.Connection = Depends(get_db)):
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
    cursor = db.cursor()
    cursor.execute(
        """INSERT INTO submissions
        (user_id, problem_id, code, passed_tests, total_tests, score, verdict, execution_time_ms, time_taken, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, request.problem_id, request.query, passed_tests, total_tests, score, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
    )
    submission_id = cursor.lastrowid
    db.commit()

    # Best score logic
    cursor.execute(
        """SELECT best_score FROM hr_results
        WHERE user_id = ? AND problem_id = ?""",
        (user_id, request.problem_id)
    )
    existing = cursor.fetchone()
    current_best_score = existing[0] if existing else 0

    is_new_best = score > current_best_score

    if is_new_best:
        cursor.execute("SELECT name, email FROM users WHERE id = ?", (user_id,))
        user_info = cursor.fetchone()

        cursor.execute(
            """INSERT OR REPLACE INTO hr_results
            (user_id, name, email, problem_id, best_score, passed_tests, total_tests, best_submission_id, verdict, execution_time_ms, time_taken, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (user_id, user_info[0], user_info[1], request.problem_id, score, passed_tests, total_tests, submission_id, verdict, avg_execution_time, request.time_taken, datetime.now().isoformat())
        )
        db.commit()

    cursor.close()

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

@app.post("/hr/preview/sql-submit")
async def preview_submit_sql(request: PreviewSubmitSqlRequest):
    """HR-only SQL preview submit without candidate session persistence."""
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

