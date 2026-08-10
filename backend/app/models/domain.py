from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    test_location = Column(String, default=None)
    created_at = Column(String, nullable=False) # Keep as String for backward compatibility or parse locally

    submissions = relationship("Submission", back_populates="user")
    assessments = relationship("Assessment", back_populates="user")
    admin_results = relationship("AdminResult", back_populates="user")


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    problem_id = Column(String, nullable=False)
    code = Column(Text, nullable=False)
    passed_tests = Column(Integer, nullable=False)
    total_tests = Column(Integer, nullable=False)
    score = Column(Float, nullable=False)
    verdict = Column(String, default="Pending")
    execution_time_ms = Column(Float, default=0.0)
    time_taken = Column(Integer, default=0)
    created_at = Column(String, nullable=False)

    user = relationship("User", back_populates="submissions")


class AdminResult(Base):
    __tablename__ = "admin_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    problem_id = Column(String, nullable=False)
    best_score = Column(Float, nullable=False)
    passed_tests = Column(Integer, nullable=False)
    total_tests = Column(Integer, nullable=False)
    best_submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)
    verdict = Column(String, default="Pending")
    execution_time_ms = Column(Float, default=0.0)
    time_taken = Column(Integer, default=0)
    updated_at = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint('user_id', 'problem_id', name='uq_user_problem'),)
    
    user = relationship("User", back_populates="admin_results")
    best_submission = relationship("Submission")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    candidate_id = Column(String, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String)
    test_location = Column(String, default=None)
    test_date = Column(String, nullable=False)
    login_time = Column(String, nullable=False)
    submit_time = Column(String, nullable=False)
    submission_type = Column(String, nullable=False)
    time_taken_min = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    python_questions = Column(Integer, nullable=False)
    sql_questions = Column(Integer, nullable=False)
    mcq_questions = Column(Integer, default=0)
    python_score = Column(Float, nullable=False)
    sql_score = Column(Float, nullable=False)
    mcq_score = Column(Float, default=0.0)
    overall_score = Column(Float, nullable=False)
    max_possible_score = Column(Float, default=None)
    overall_percentage = Column(Float, nullable=False)
    overall_verdict = Column(String, nullable=False)
    problem_testcases_json = Column(Text, nullable=False)
    problem_scores_json = Column(Text, nullable=False)
    created_at = Column(String, nullable=False)

    user = relationship("User", back_populates="assessments")


class CandidateOtp(Base):
    __tablename__ = "candidate_otp"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, nullable=False)
    email = Column(String, nullable=False)
    otp_code = Column(String)
    expires_at = Column(String)
    created_at = Column(String, nullable=False)
    sent = Column(Integer, default=0)
    status = Column(String, default="unused")
    test_type = Column(String, default="both")


class Problem(Base):
    __tablename__ = "problems"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    language = Column(String, nullable=False)
    difficulty = Column(String, default="Medium")
    marks = Column(Integer, default=10)
    time_limit = Column(Integer, default=15)
    statement = Column(Text)
    description = Column(Text)
    input_format = Column(Text)
    output_format = Column(Text)
    sample_input = Column(Text)
    sample_output = Column(Text)
    starter_code = Column(Text)
    test_cases_json = Column(Text)
    schema_sql = Column(Text)
    seed_sql = Column(Text)
    is_active = Column(Integer, default=1)
    created_at = Column(String, nullable=False)


class CustomProblem(Base):
    __tablename__ = "custom_problems"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    language = Column(String, nullable=False)
    difficulty = Column(String, default="Medium")
    marks = Column(Integer, default=10)
    time_limit = Column(Integer, default=15)
    statement = Column(Text)
    description = Column(Text)
    input_format = Column(Text)
    output_format = Column(Text)
    sample_input = Column(Text)
    sample_output = Column(Text)
    starter_code = Column(Text)
    test_cases_json = Column(Text)
    schema_sql = Column(Text)
    seed_sql = Column(Text)
    created_at = Column(String, nullable=False)


class SelectedExamProblem(Base):
    __tablename__ = "selected_exam_problems"

    id = Column(Integer, primary_key=True, autoincrement=True)
    problem_id = Column(String, unique=True, nullable=False)
    language = Column(String, nullable=False)
    difficulty = Column(String, default="Medium")
    marks = Column(Integer, default=10)
    time_limit = Column(Integer, default=15)
    title = Column(String, nullable=False)
    saved_at = Column(String, nullable=False)


class CandidateSelectedExamProblem(Base):
    __tablename__ = "candidate_selected_exam_problems"

    id = Column(Integer, primary_key=True, autoincrement=True)
    candidate_email = Column(String, nullable=False)
    problem_id = Column(String, nullable=False)
    language = Column(String, nullable=False)
    difficulty = Column(String, default="Medium")
    marks = Column(Integer, default=10)
    time_limit = Column(Integer, default=15)
    title = Column(String, nullable=False)
    saved_at = Column(String, nullable=False)


class AuthUser(Base):
    __tablename__ = "auth_users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class MCQQuestion(Base):
    __tablename__ = "mcq_questions"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    question_text = Column(String, nullable=False)
    option_a = Column(String, nullable=False)
    option_b = Column(String, nullable=False)
    option_c = Column(String, nullable=False)
    option_d = Column(String, nullable=False)
    correct_option = Column(String, nullable=False)
    question_title = Column(String)
    question = Column(String)
    options_json = Column(String)
    correct_answer = Column(Integer)
    difficulty = Column(String, default="easy")
    marks = Column(Integer, default=10)
    time = Column(Integer, default=10)
    topic = Column(String, default="Python")
    explanation = Column(String, default="")
    created_at = Column(String, nullable=False)


class ProctoringLog(Base):
    __tablename__ = "proctoring_logs"

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(String, nullable=False, index=True) # Changed from Integer to String as it's typically cand_name
    candidate_id = Column(String, nullable=True, index=True) # Changed from Integer to String
    violation_type = Column(String, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
