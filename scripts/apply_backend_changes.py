"""
Automated script to apply backend changes for random questions feature.
Run this from the project root: python apply_backend_changes.py
"""
import re

def update_problems_py():
    """Add global storage to problems.py"""
    print("Updating backend/problems.py...")
    
    with open('backend/problems.py', 'r', encoding='utf-8') as f:
       content= f.read()
    
    # Check if already updated
    if 'selected_random_problems' in content:
        print("  ✓ Already contains selected_random_problems")
       return True
    
    # Add at the end
   new_code = """
# Global storage for selected random problems
selected_random_problems = {
    "python": [],
    "sql": []
}
"""
    
   content += new_code
    
    with open('backend/problems.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("  ✓ Added selected_random_problems")
   return True


def update_main_py():
    """Update main.py with new endpoints and logic"""
    print("Updating backend/main.py...")
    
    with open('backend/main.py', 'r', encoding='utf-8') as f:
       content = f.read()
    
    # Step 1: Update import
    if 'selected_random_problems' not in content.split('from problems import')[1].split('\n')[0]:
        old_import = "from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS, get_random_problems_by_difficulty, get_problem_by_id"
       new_import = "from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS, get_random_problems_by_difficulty, get_problem_by_id, selected_random_problems"
       content = content.replace(old_import, new_import)
        print("  ✓ Updated imports")
    
    # Step 2: Add global variable after sessions declaration
    if '# In-memory storage for selected random problems' not in content:
        old_sessions = "# In-memory session store (for one-day MVP)\nsessions = {}"
       new_sessions = """# In-memory session store (for one-day MVP)
sessions = {}

# In-memory storage for selected random problems
selected_random_problems = {
    "python": [],
    "sql": []
}"""
       content = content.replace(old_sessions, new_sessions)
        print("  ✓ Added global variable declaration")
    
    # Step 3: Add new endpoints before /health
    if '@app.get("/hr/problems/random")' not in content:
        health_marker = '@app.get("/health")\nasync def health_check():'
        
       new_endpoints = '''@app.get("/hr/problems/random")
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

'''
        
       content = content.replace(health_marker, new_endpoints + health_marker)
        print("  ✓ Added new endpoints")
    
    # Step 4: Update exam_summary endpoint
    if 'selected random problems' not in content.split('@app.get("/exam/summary")')[1].split('@app.post("/exam/start")')[0]:
        old_summary = '''@app.get("/exam/summary")
async def exam_summary():
    """Get exam overview with all problems and their details"""
  return get_exam_summary()'''
        
       new_summary = '''@app.get("/exam/summary")
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
    }'''
        
       content = content.replace(old_summary, new_summary)
        print("  ✓ Updated exam_summary endpoint")
    
    with open('backend/main.py', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("  ✓ All changes applied successfully!")
   return True


if __name__ == '__main__':
    print("=" * 60)
    print("Applying Backend Changes for Random Questions Feature")
    print("=" * 60)
    print()
    
    success = True
    success &= update_problems_py()
    success &= update_main_py()
    
    print()
    print("=" * 60)
    if success:
        print("✅ All changes applied successfully!")
        print("\nNext steps:")
        print("1. Fix any indentation errors manually if they occur")
        print("2. Start backend: cd backend && uvicorn main:app --reload")
        print("3. Test the feature in the browser")
   else:
        print("❌ Some changes failed. Check the output above.")
    print("=" * 60)
