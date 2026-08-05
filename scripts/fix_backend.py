import re

# Read main.py
with open('backend/main.py', 'r', encoding='utf-8') as f:
   content = f.read()

# 1. Update import
if 'get_random_problems_by_difficulty' not in content:
   content = content.replace(
        'from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS',
        'from problems import get_problem, list_problems, list_problems_by_language, get_exam_summary, PROBLEMS, get_random_problems_by_difficulty'
    )
    print("✓ Updated imports")

# 2. Add global variable after sessions
if 'selected_random_problems' not in content:
   content = content.replace(
        '# In-memory session store(for one-day MVP)\nsessions = {}',
        '# In-memory session store (for one-day MVP)\nsessions = {}\n\n# In-memory storage for selected random problems\nselected_random_problems = {\n    "python": [],\n    "sql": []\n}'
    )
    print("✓ Added global variable")

# Write back
with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Backend updated successfully!")
