"""
SQL Problem Converter - Transforms existing SQL problem JSON to new structured format

This script converts old-format SQL problems to the new template by:
1. Removing output_format and sample_output fields
2. Adding problem_statement field (from statement)
3. Transforming input_format into structured tables (table_name, columns, rows)
4. Replacing expected_columns/expected_rows with unified expected_output
5. Updating test_cases to use expected_output structure

Usage:
    python convert_sql_problems.py

The script will:
- Read existing SQL problems from default_problems.py
- Convert each problem to the new format
- Output converted problems to a new file
- Preserve all existing data while restructuring
"""

import json
import re
import os
import sys

def parse_input_format_old(input_format_str):
    """
    Parse old-style input format string into table structure.
    
    Examples:
    - "employees(id INT, name TEXT, department TEXT, salary INT)"
    - "employees(id,name,department,salary)"
    - "employees table"
    
    Returns: dict with table_name, columns
    """
    if not input_format_str:
        return {"table_name": "", "columns": []}
    
    # Try pattern: "table_name(col1 TYPE, col2 TYPE, ...)"
    match = re.match(r'(\w+)\s*\(([^)]+)\)', input_format_str)
    if match:
        table_name = match.group(1)
        columns_str = match.group(2)
        
        # Extract just column names (ignore types)
        columns = []
        for col_def in columns_str.split(','):
            col_def = col_def.strip()
            # Take first word as column name
            col_name = col_def.split()[0] if col_def else ''
            if col_name:
                columns.append(col_name)
        
        return {"table_name": table_name, "columns": columns}
    
    # Fallback: just table name mentioned
    # e.g., "employees table" -> table_name = "employees"
    words = input_format_str.lower().split()
    if words:
        return {"table_name": words[0], "columns": []}
    
    return {"table_name": "", "columns": []}


def generate_sample_rows(table_name, schema_sql, seed_sql):
    """
    Generate sample rows from seed SQL data.
    
    Returns: list of row arrays (as strings)
    """
    if not seed_sql:
        return []
    
    # Extract INSERT values from seed_sql
    # Pattern: INSERT INTO table VALUES (val1, val2, ...), (val3, val4, ...)
    insert_match = re.search(r'INSERT INTO\s+\w+\s+VALUES\s+(.+?)(?:;|$)', seed_sql, re.IGNORECASE | re.DOTALL)
    
    if not insert_match:
        return []
    
    values_str = insert_match.group(1)
    
    # Parse individual row tuples
    rows = []
    # Match parenthesized value groups
    row_pattern = r'\(([^)]+)\)'
    row_matches = re.findall(row_pattern, values_str)
    
    for row_match in row_matches[:5]:  # Limit to 5 sample rows
        # Parse values from this row
        values = []
        # Simple split by comma (doesn't handle quoted commas, but good enough for most cases)
        for val in row_match.split(','):
            val = val.strip()
            # Remove quotes and clean up
            val = val.strip("'\"")
            values.append(val)
        
        if values:
            rows.append(values)
    
    return rows


def generate_expected_output(starter_code, schema_sql, seed_sql):
    """
    Generate expected output by executing starter code query against seed data.
    
    For now, we'll create a placeholder. In production, this would execute the query.
    
    Returns: dict with columns and rows
    """
    # This is a simplified version - in production you'd actually execute the query
    # For now, return placeholder that HR can fill in
    
    # Try to infer output columns from starter code
    columns = ["result_column"]
    rows = [["sample_value"]]
    
    # Basic inference from common SQL patterns
    if starter_code:
        starter_upper = starter_code.upper()
        
        # SELECT * - return all columns
        if 'SELECT *' in starter_upper:
            # We'd need schema to know columns - return placeholder
            pass
        
        # SELECT specific columns
        select_match = re.search(r'SELECT\s+(.+?)\s+FROM', starter_code, re.IGNORECASE)
        if select_match:
            cols_str = select_match.group(1)
            if cols_str.strip() != '*':
                # Extract column names
                inferred_cols = []
                for col in cols_str.split(','):
                    col = col.strip()
                    # Remove aliases (AS keyword)
                    if ' AS ' in col.upper():
                        col = col.split(' AS ')[0].strip()
                    # Remove function calls (keep alias or last word)
                    if '(' in col:
                        # e.g., "COUNT(*) as total" -> "total"
                        if ' AS ' in col.upper():
                            col = col.split(' AS ')[-1].strip()
                        else:
                            # e.g., "AVG(salary)" -> keep as is
                            pass
                    if col:
                        inferred_cols.append(col)
                
                if inferred_cols:
                    columns = inferred_cols
    
    return {
        "columns": columns,
        "rows": rows
    }


def convert_test_cases(old_test_cases, expected_output_template):
    """
    Convert old test cases format to new expected_output structure.
    
    Old format:
    [
      { "input": "...", "expected_output": "..." },
      { "expected_columns": [], "expected_rows": [] }
    ]
    
    New format:
    [
      {
        "expected_output": {
          "columns": [...],
          "rows": [...]
        }
      }
    ]
    """
    new_test_cases = []
    
    for old_tc in old_test_cases:
        new_tc = {}
        
        # Check if already has expected_output structure
        if 'expected_output' in old_tc and isinstance(old_tc['expected_output'], dict):
            # Already in new format
            new_tc['expected_output'] = old_tc['expected_output']
        # Check for old separate columns/rows format
        elif 'expected_columns' in old_tc or 'expected_rows' in old_tc:
            new_tc['expected_output'] = {
                "columns": old_tc.get('expected_columns', []),
                "rows": old_tc.get('expected_rows', [])
            }
        # String-based expected output (old format)
        elif 'expected_output' in old_tc:
            # Use template (HR should fill in actual values)
            new_tc['expected_output'] = {
                "columns": expected_output_template['columns'],
                "rows": expected_output_template['rows']
            }
        else:
            # No expected output found, use template
            new_tc['expected_output'] = {
                "columns": expected_output_template['columns'],
                "rows": expected_output_template['rows']
            }
        
        new_test_cases.append(new_tc)
    
    # Ensure we have at least 5 test cases (platform standard)
    while len(new_test_cases) < 5:
        new_test_cases.append({
            "expected_output": {
                "columns": expected_output_template['columns'],
                "rows": expected_output_template['rows']
            }
        })
    
    return new_test_cases


def convert_sql_problem(old_problem):
    """
    Convert a single SQL problem from old format to new format.
    
    Args:
        old_problem: dict in old format
    
    Returns:
        dict in new format
    """
    # Extract table info from old input_format
    input_parsed = parse_input_format_old(old_problem.get('input_format', ''))
    
    # Generate sample rows from seed data
    sample_rows = generate_sample_rows(
        input_parsed.get('table_name', ''),
        old_problem.get('schema_sql', ''),
        old_problem.get('seed_sql', '')
    )
    
    # Build structured input_format
    input_format_tables = []
    if input_parsed.get('table_name'):
        table_obj = {
            "table_name": input_parsed['table_name'],
            "columns": input_parsed['columns'] if input_parsed['columns'] else ["column1", "column2"],
            "rows": sample_rows if sample_rows else [
                ["value1", "value2"],
                ["value3", "value4"]
            ]
        }
        input_format_tables.append(table_obj)
    
    # Generate expected output (or use placeholder)
    expected_output = generate_expected_output(
        old_problem.get('starter_code', ''),
        old_problem.get('schema_sql', ''),
        old_problem.get('seed_sql', '')
    )
    
    # Convert test cases
    old_test_cases = old_problem.get('test_cases', [])
    new_test_cases = convert_test_cases(old_test_cases, expected_output)
    
    # Build new problem structure
    new_problem = {
        "id": old_problem.get("id", ""),
        "title": old_problem.get("title", ""),
        "language": old_problem.get("language", "sql"),
        "difficulty": old_problem.get("difficulty", "Easy"),
        "marks": old_problem.get("marks", 10),
        "time_limit": old_problem.get("time_limit", 10),
        
        # NEW: Separate problem statement
        "problem_statement": old_problem.get("statement", "") or old_problem.get("description", ""),
        
        # Keep description for additional details
        "description": old_problem.get("description", "") or old_problem.get("statement", ""),
        
        # NEW: Structured input format
        "input_format": {
            "tables": input_format_tables
        },
        
        # NEW: Structured expected output
        "expected_output": expected_output,
        
        # Keep these
        "starter_code": old_problem.get("starter_code", ""),
        "schema_sql": old_problem.get("schema_sql", ""),
        "seed_sql": old_problem.get("seed_sql", ""),
        
        # REMOVED: output_format, sample_input, sample_output
        # "output_format": ...,  ❌ Removed
        # "sample_input": ...,   ❌ Removed
        # "sample_output": ...,  ❌ Removed
        
        # NEW: Test cases with expected_output structure
        "test_cases": new_test_cases
    }
    
    return new_problem


def convert_all_sql_problems(input_file, output_file):
    """
    Convert all SQL problems from default_problems.py to new format.
    
    Args:
        input_file: Path to default_problems.py
        output_file: Path to write converted problems JSON
    """
    print(f"Reading SQL problems from {input_file}...")
    
    # Add backend directory to path since that's where default_problems.py is
    backend_dir = os.path.join(os.path.dirname(input_file), "backend")
    if os.path.exists(backend_dir):
        sys.path.insert(0, backend_dir)
        print(f"Added {backend_dir} to Python path")
    else:
        # Try current directory
        sys.path.insert(0, os.path.dirname(input_file))
    
    try:
        from default_problems import DEFAULT_PROBLEMS
    except ImportError as e:
        print(f"Error importing DEFAULT_PROBLEMS: {e}")
        print("Make sure you're running this script from the project root directory.")
        return
    
    # Filter only SQL problems
    sql_problems_old = [p for p in DEFAULT_PROBLEMS if p.get('language') == 'sql']
    
    print(f"Found {len(sql_problems_old)} SQL problems to convert.")
    
    # Convert each problem
    sql_problems_new = []
    for old_problem in sql_problems_old:
        try:
            new_problem = convert_sql_problem(old_problem)
            sql_problems_new.append(new_problem)
            print(f"  ✓ Converted: {new_problem['id']} - {new_problem['title']}")
        except Exception as e:
            print(f"  ✗ Error converting {old_problem.get('id', 'UNKNOWN')}: {e}")
    
    # Write converted problems to JSON file
    print(f"\nWriting {len(sql_problems_new)} converted problems to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sql_problems_new, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Conversion complete!")
    print(f"\nNext steps:")
    print(f"1. Review {output_file}")
    print(f"2. Manually fill in expected_output columns/rows for each problem")
    print(f"3. Update backend/default_problems.py with converted problems")
    print(f"4. Test in the application")


if __name__ == "__main__":
    # Default paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(script_dir, "default_problems.py")
    output_file = os.path.join(script_dir, "converted_sql_problems.json")
    
    # Run conversion
    convert_all_sql_problems(input_file, output_file)
    
    print("\n" + "="*60)
    print("CONVERSION SUMMARY")
    print("="*60)
    print("✓ Removed: output_format, sample_input, sample_output")
    print("✓ Added: problem_statement (separate from description)")
    print("✓ Transformed: input_format → structured tables array")
    print("✓ Replaced: expected_columns/rows → unified expected_output")
    print("✓ Updated: test_cases with expected_output structure")
    print("✓ Preserved: All other languages (Python) remain unchanged")
    print("="*60)
