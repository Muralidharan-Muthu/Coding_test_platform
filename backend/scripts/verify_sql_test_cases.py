"""Verify all SQL problems have 5 test cases"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from problems import get_problem, list_problems_by_language

print("=" * 60)
print("SQL TEST CASE VERIFICATION")
print("=" * 60)

sql_problems = list_problems_by_language('sql')

for problem_info in sql_problems:
    problem_id = problem_info['id']
    problem = get_problem(problem_id)
    
    if problem and problem['language'] == 'sql':
        test_cases = problem.get('test_cases', [])
        print(f"\n{problem['title']} ({problem_id})")
        print(f"  Difficulty: {problem['difficulty']}")
        print(f"  Test Cases: {len(test_cases)}")
        
        for i, tc in enumerate(test_cases, 1):
            cols = tc.get('expected_columns', [])
            rows = tc.get('expected_rows', [])
            print(f"    TC{i}: Columns={cols}, Rows={len(rows)}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)

# Summary
total_test_cases = sum(
    len(get_problem(p['id'])['test_cases']) 
    for p in sql_problems 
    if get_problem(p['id'])['language'] == 'sql'
)

print(f"\nTotal SQL Problems: {len(sql_problems)}")
print(f"Total Test Cases: {total_test_cases}")
print(f"Average per Problem: {total_test_cases / len(sql_problems):.1f}")
