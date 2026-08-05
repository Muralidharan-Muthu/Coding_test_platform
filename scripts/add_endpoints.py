# Script to add random question endpoints to main.py

with open('backend/main.py', 'r', encoding='utf-8') as f:
  content= f.read()

# Add endpoints before /health
old_health = '@app.get("/health")\nasync def health_check():\n return {"status": "ok"}'

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
            "time_limit": p.get("time_limit", 10)
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

''' + old_health

content = content.replace(old_health, new_endpoints)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Random question endpoints added successfully!")
