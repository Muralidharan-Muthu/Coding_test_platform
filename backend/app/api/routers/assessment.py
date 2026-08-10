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

@router.get("/api/assessment/results")
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


@router.get("/api/candidates/{email}/submissions")
async def get_candidate_submissions(email: str, db: Session = Depends(get_db)):
    """
    Get latest submissions for a specific candidate.
    Returns only the most recent submitted code per problem they attempted.
    """
    from sqlalchemy import text
    try:
        # Get user_id from email
        user_row = db.query(User).filter(User.email == email).first()
        
        if not user_row:
            # Try to find by candidate_id in assessments
            assessment_row = db.query(Assessment).filter(Assessment.candidate_id == email).first()
            if assessment_row:
                user_id = assessment_row.user_id
                candidate_name = assessment_row.name
            else:
                raise HTTPException(status_code=404, detail="Candidate not found")
        else:
            user_id = user_row.id
            candidate_name = user_row.name
        
        # Get only the latest submission per problem for this user
        result = db.execute(text("""
            WITH ranked_submissions AS (
                SELECT
                    s.*,
                    ROW_NUMBER() OVER (
                        PARTITION BY s.problem_id
                        ORDER BY s.created_at DESC, s.id DESC
                    ) AS rn
                FROM submissions s
                WHERE s.user_id = :user_id
            )
            SELECT
                rs.id, rs.problem_id, rs.code, rs.passed_tests, rs.total_tests,
                rs.score, rs.verdict, rs.execution_time_ms, rs.time_taken, rs.created_at,
                p.title, p.language, p.difficulty, p.marks
            FROM ranked_submissions rs
            LEFT JOIN custom_problems p ON rs.problem_id = p.id
            WHERE rs.rn = 1
            ORDER BY rs.created_at DESC, rs.id DESC
        """), {"user_id": user_id})
        
        submissions = []
        for row in result:
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


@router.get("/api/assessment/export")
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
        
        filename = f"Admin_Assessment_Report_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting results: {str(e)}")


@router.post("/api/assessment/init-sample-data")
async def init_sample_data():
    """Initialize Excel file with sample data for 5 candidates (for testing)"""
    try:
        count = create_sample_data()
        return {"success": True, "message": f"Created sample data for {count} candidates"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating sample data: {str(e)}")


# Language-specific problem routes - MUST be before /problems/{problem_id}
