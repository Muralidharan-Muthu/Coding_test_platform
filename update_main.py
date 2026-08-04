"""Script to update main.py with random problem selection feature"""

# Read the file
with open('backend/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and update specific sections
new_lines = []
i = 0
while i < len(lines):
    line = lines[i]
    
    # Add the global variable after the sessions declaration
    if i < len(lines) - 1 and '# In-memory session store' in line:
        new_lines.append(line)
        i += 1
        new_lines.append(lines[i])  # sessions = {}
        i += 1
        new_lines.append('\n')
        new_lines.append('# In-memory storage for selected random problems\n')
        new_lines.append('selected_random_problems = {\n')
        new_lines.append('    "python": [],\n')
        new_lines.append('    "sql": []\n')
        new_lines.append('}\n')
       continue
    
    # Update the get_random_problems function
    elif '@app.get("/hr/problems/random")' in line:
        new_lines.append(line)
        i += 1
        # Skip to the problems = get_random... line
        while i < len(lines) and 'problems = get_random_problems_by_difficulty' not in lines[i]:
            new_lines.append(lines[i])
            i += 1
        
        # Add the storage code
        new_lines.append(lines[i])  # problems = get_random...
        i += 1
        new_lines.append('    \n')
        new_lines.append('    # Store the selected problems globally\n')
        new_lines.append('   selected_random_problems[language] = [\n')
        new_lines.append('        {\n')
        new_lines.append('            "id": p["id"],\n')
        new_lines.append('            "title": p["title"],\n')
        new_lines.append('            "language": p["language"],\n')
        new_lines.append('            "difficulty": p.get("difficulty", "Medium"),\n')
        new_lines.append('            "marks": p.get("marks", 10),\n')
        new_lines.append('            "time_limit": p.get("time_limit", 15)\n')
        new_lines.append('        }\n')
        new_lines.append('        for p in problems\n')
        new_lines.append('    ]\n')
        new_lines.append('    \n')
        new_lines.append('    # Return simplified problem info (without test cases)\n')
        new_lines.append('   return {\n')
        new_lines.append('        "problems": selected_random_problems[language]\n')
        new_lines.append('    }\n')
        
        # Skip the old return statement
        while i < len(lines) and '@app.get("/hr/problems/random/replace")' not in lines[i]:
            i += 1
       continue
    
    # Update the exam_summary endpoint
    elif '@app.get("/exam/summary")' in line:
        new_lines.append(line)
        i += 1
        new_lines.append('async def exam_summary():\n')
        i += 1
        new_lines.append('    """Get exam overview with selected random problems (or all problems if none selected)"""\n')
        i += 1
        new_lines.append('    # Use selected random problems if they exist, otherwise use all problems\n')
        new_lines.append('    python_problems = selected_random_problems["python"] if selected_random_problems["python"] else [p for p in PROBLEMS.values() if p["language"] == "python"]\n')
        new_lines.append('    sql_problems = selected_random_problems["sql"] if selected_random_problems["sql"] else [p for p in PROBLEMS.values() if p["language"] == "sql"]\n')
        new_lines.append('    \n')
        new_lines.append('    all_problems = python_problems + sql_problems\n')
        new_lines.append('    \n')
        new_lines.append('   return {\n')
        new_lines.append('        "total_duration_minutes": 120,  # 2 hours\n')
        new_lines.append('        "total_questions": len(all_problems),\n')
        new_lines.append('        "python_questions": len(python_problems),\n')
        new_lines.append('        "sql_questions": len(sql_problems),\n')
        new_lines.append('        "total_marks": sum(p.get("marks", 10) for p in all_problems),\n')
        new_lines.append('        "problems": all_problems\n')
        new_lines.append('    }\n')
        
        # Skip old implementation
        while i < len(lines) and '@app.post("/exam/start")' not in lines[i]:
            i += 1
       continue
    
    else:
        new_lines.append(line)
        i += 1

# Write back
with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated main.py!")
