from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import asyncio
import sys

from app.core.config import settings
from app.db.database import init_db, init_custom_problems_db, engine
from app.db.mcq_database import init_mcq_db
from app.db.auth_db import init_auth_db
from app.models.domain import Base

from app.services.problems import init_problems, refresh_problems

from app.api.routers import auth, admin, problems, runner, exam, assessment, proctoring, other

# Fix Windows event loop for subprocess BEFORE any asyncio operations
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

app = FastAPI(title=settings.PROJECT_NAME)

# Initialize database
init_db()
init_custom_problems_db()

from app.db.database import SessionLocal
db = SessionLocal()
try:
    init_mcq_db(db)
    init_auth_db(db)
finally:
    db.close()

Base.metadata.create_all(bind=engine)

# Initialize problems
init_problems()
refresh_problems()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(problems.router, tags=["Problems"])
app.include_router(runner.router, tags=["Runner"])
app.include_router(exam.router, tags=["Exam"])
app.include_router(assessment.router, tags=["Assessment"])
app.include_router(proctoring.router, tags=["Proctoring"])
app.include_router(other.router, tags=["Other"])

# Static files
app.mount("/static", StaticFiles(directory=str(settings.BASE_DIR.parent / "frontend" / "public")), name="static")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "Server is running"}
