from typing import Optional, List, Annotated
from pydantic import BaseModel, StringConstraints

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

class ProctoringLogCreate(BaseModel):
    violation_type: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class MCQQuestionCreate(BaseModel):
    question_title: str
    question: str
    options: List[str]
    correct_answer: int
    difficulty: str = "Medium"
    marks: int = 5
    time: int = 2
    topic: str = "General"
    explanation: str = ""
