from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base

class LoginRequest(BaseModel):
    name: Optional[str] = ""
    email: Optional[str] = ""
    otp: Optional[str] = ""
    test_location: Optional[str] = "home"

class RunCodeRequest(BaseModel):
    code: str
    custom_input: str = ""

class SubmitCodeRequest(BaseModel):
    session_id: str
    problem_id: str
    code: str
    time_taken: int = 0

class PreviewSubmitCodeRequest(BaseModel):
    problem_id: str
    code: str

# SQL request models
class RunSqlRequest(BaseModel):
    problem_id: str
    query: str
    dialect: Optional[str] = "sql"  # sql, mysql, postgresql

class SubmitSqlRequest(BaseModel):
    session_id: str
    problem_id: str
    query: str
    time_taken: int = 0
    dialect: Optional[str] = "sql"  # sql, mysql, postgresql

class PreviewSubmitSqlRequest(BaseModel):
    problem_id: str
    query: str
    dialect: Optional[str] = "sql"  # sql, mysql, postgresql

# Exam session models
class StartExamRequest(BaseModel):
    session_id: str

class ExamAnswer(BaseModel):
    problem_id: str
    code: str = ""
    language: str
    selected_option: Optional[int] = None

class ExamSubmitRequest(BaseModel):
    session_id: str
    answers: List[ExamAnswer]
    auto_submit: bool = False  # True if timer expired

# --- SQLAlchemy models ---
Base = declarative_base()

class ProctoringLog(Base):
    __tablename__ = "proctoring_logs"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, nullable=False, index=True)
    candidate_id = Column(Integer, nullable=True, index=True)
    violation_type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
