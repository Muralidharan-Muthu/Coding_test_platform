# HR Dashboard Random Questions Feature - Implementation Guide

## Overview
This guide shows how to implement the feature where HR can generate random questions (2 easy, 2 medium, 1 hard) that will be used for candidate tests, instead of showing all available problems.

## What's Already Done ✅

### Frontend (HRDashboard.jsx)
The frontend has been updated successfully:
- Removed display of fixed 5 questions 
- Now shows only generated random questions when "Generate Random Questions" button is clicked
- The generated questions are displayed in a separate section
- Available problem list is hidden when random questions are generated

## Backend Changes Needed ⚠️

Due to indentation formatting issues, you need to manually add the following code to these files:

### 1. backend/problems.py

**Add at the end of the file:**

```python
# Global storage for selected random problems
selected_random_problems = {
    "python": [],
    "sql": []
}
```

### 2. backend/main.py

**Step 1**: Add import at the top of the file (after other imports from problems):
```python
from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS, get_random_problems_by_difficulty, get_problem_by_id, selected_random_problems
```

**Step 2**: Add global variable declaration (around line 49, after `sessions = {}`):
```python
# In-memory session store (for one-day MVP)
sessions = {}

# In-memory storage for selected random problems
selected_random_problems = {
    "python": [],
    "sql": []
}
```

**Step 3**: Add new endpoints(insert after the delete endpoint, before `/health`):

```python
@app.get("/hr/problems/random")
async def get_random_problems(language: str = "python"):
    """Get 5 random problems with difficulty distribution: 2 easy, 2 medium, 1 hard"""
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
            "time_limit": p.get("time_limit", 15)
        }
        for p in problems
    ]
    
    # Return simplified problem info (without test cases)
  return {
        "problems": selected_random_problems[language]
    }

@app.get("/hr/problems/random/replace")
async def replace_problem(problem_id: str, language: str = "python"):
    """Replace a specific problem with another random problem of the same difficulty"""
    if language not in ["python", "sql"]:
        raise HTTPException(status_code=400, detail="Language must be 'python' or 'sql'")
    
    # Get the problem to find its difficulty
   problem_to_replace = get_problem(problem_id)
    if not problem_to_replace:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    difficulty = problem_to_replace.get("difficulty", "Medium")
    
    # Get all problems of the same language and difficulty
   problems = [p for p in PROBLEMS.values() 
                if p["language"] == language and p.get("difficulty", "Medium") == difficulty and p["id"] != problem_id]
    
    if not problems:
        raise HTTPException(status_code=404, detail="No other problems available with the same difficulty")
    
    # Select one randomly
  replacement = random.choice(problems)
    
  return {
        "replaced": {
            "id": problem_to_replace["id"],
            "title": problem_to_replace["title"],
            "difficulty": difficulty
        },
        "new": {
            "id": replacement["id"],
            "title": replacement["title"],
            "language": replacement["language"],
            "difficulty": replacement.get("difficulty", "Medium"),
            "marks": replacement.get("marks", 10),
            "time_limit": replacement.get("time_limit", 15)
        }
    }
```

**Step 4**: Update the exam_summary endpoint (find `@app.get("/exam/summary")` and replace the function):

```python
@app.get("/exam/summary")
async def exam_summary():
    """Get exam overview with selected random problems (or all problems if none selected)"""
    # Use selected random problems if they exist, otherwise use all problems
    python_problems = selected_random_problems["python"] if selected_random_problems["python"] else [p for p in PROBLEMS.values() if p["language"] == "python"]
    sql_problems = selected_random_problems["sql"] if selected_random_problems["sql"] else [p for p in PROBLEMS.values() if p["language"] == "sql"]
    
    all_problems = python_problems + sql_problems
    
  return {
        "total_duration_minutes": 120,  # 2 hours
        "total_questions": len(all_problems),
        "python_questions": len(python_problems),
        "sql_questions": len(sql_problems),
        "total_marks": sum(p.get("marks", 10) for p in all_problems),
        "problems": all_problems
    }
```

## How It Works

1. **HR clicks "Generate Random Questions"** → Frontend calls `GET /hr/problems/random?language=python` (or sql)
2. **Backend selects 5 random problems** (2 easy, 2 medium, 1 hard) and stores them in `selected_random_problems` global variable
3. **Frontend displays only the generated questions** in a separate section
4. **When candidate starts test** → Frontend calls `GET /exam/summary`
5. **Backend returns only the selected random problems** instead of all problems
6. **Candidate sees and solves only those 5 questions** (or whatever was generated)

## Testing Steps

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Login as HR
4. Click "Generate Random Questions" button
5. Verify only 5 questions are shown (not all available problems)
6. Logout and login as candidate
7. Start assessment
8. Verify you see only the 5 questions that were generated for HR

## Important Notes

- The selected problems are stored in memory (will reset if server restarts)
- HR can regenerate questions anytime (old selection will be replaced)
- HR can use "Change" button to replace individual questions
- Once candidate starts test, they see whatever is currently selected
- If no questions are selected, candidate sees ALL available problems(fallback)
