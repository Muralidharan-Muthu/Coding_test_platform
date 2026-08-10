from fastapi import APIRouter, Depends, HTTPException, Request, Response, BackgroundTasks, UploadFile, File
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import uuid
import asyncio
from datetime import datetime
from app.db.database import get_db
from app.core.state import sessions, session_test_types, session_candidate_emails, exam_sessions
from app.models.schemas import *
from app.models.domain import *
from app.services.runner import *
from app.services.problems import *
from app.services.otp_service import *
from app.services.assessment_service import *
from app.services.excel_service import *
from app.db.auth_db import *
from app.db.mcq_database import *

router = APIRouter()

@router.get("/api/reports/proctoring/")
@router.get("/api/reports/proctoring")
async def get_proctoring_reports(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    verdict: Optional[str] = None,
    submission_type: Optional[str] = None,
    test_location: Optional[str] = None,
    db: Session = Depends(get_db)
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


@router.post("/api/exam/{exam_id}/logs")
async def add_proctoring_log(
    exam_id: str,
    log_data: ProctoringLogCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    session_id = request.headers.get("X-Session-Id", "unknown")
    candidate_id = request.headers.get("X-Candidate-Id", "unknown")
    
    new_log = ProctoringLog(
        exam_id=exam_id,
        candidate_id=candidate_id,
        violation_type=log_data.violation_type,
        message=log_data.message
    )
    db.add(new_log)
    db.commit()
    
    return {"status": "success", "message": "Log saved"}
