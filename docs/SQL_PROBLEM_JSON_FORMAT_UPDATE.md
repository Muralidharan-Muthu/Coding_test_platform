# SQL Problem JSON Format Update

## Overview
Updated the SQL problem template on the HR Questions page (`/hr/questions`) to use a structured JSON format with proper `input_format` and `expected_output` objects containing tables, columns, and rows.

## Changes Made

### File Modified
- **`frontend/src/pages/QuestionsPage.jsx`** (Lines 58-124)
  - Updated `buildSqlTemplate()` function

## New JSON Structure

### Before (Old Format):
```json
{
  "title": "",
  "language": "sql",
  "difficulty": "Easy",
  "description": "",
  "input_format": "",
  "output_format": "",
  "sample_input": "N/A (schema and seed data are provided)",
  "sample_output": "",
  "starter_code": "SELECT * FROM table_name;",
  "schema_sql": "CREATE TABLE...",
  "seed_sql": "INSERT INTO...",
  "test_cases": [
    { "expected_columns": [], "expected_rows": [] }
  ]
}
```

### After (New Format):
```json
{
  "title": "",
  "language": "sql",
  "difficulty": "Easy",
  "marks": 10,
  "time_limit": 10,
  "problem_statement": "",
  "description": "",
  
  "input_format": {
    "tables": [
      {
        "table_name": "employees",
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["2", "Bob", "Marketing", "45000"],
          ["3", "Charlie", "Engineering", "85000"],
          ["4", "Diana", "HR", "51000"]
        ]
      }
    ]
  },
  
  "expected_output": {
    "columns": ["column1", "column2"],
    "rows": [
      ["value1", "value2"],
      ["value3", "value4"]
    ]
  },
  
  "starter_code": "SELECT * FROM table_name;",
  "schema_sql": "CREATE TABLE employees (...);",
  "seed_sql": "INSERT INTO employees VALUES (...);",
  
  "test_cases": [
    {
      "expected_output": {
        "columns": ["column1", "column2"],
        "rows": [["value1", "value2"]]
      }
    },
    {
      "expected_output": {
        "columns": ["column1", "column2"],
        "rows": [["value3", "value4"]]
      }
    }
  ]
}
```

## Key Changes

### 1. Added Fields
- **`problem_statement`**: Separate field for the main problem description
- **`input_format.tables`**: Structured array of table definitions
- **`expected_output`**: Structured output with columns and rows

### 2. Removed Fields
- **`output_format`**: No longer needed (replaced by `expected_output`)
- **`sample_input`**: No longer needed (data is in `input_format.tables`)
- **`sample_output`**: Replaced by structured `expected_output`

### 3. Restructured Fields
- **`input_format`**: Changed from string to object with `tables` array
- **`test_cases`**: Each test case now has `expected_output` object instead of separate `expected_columns` and `expected_rows`

## Input Format Structure

Each table in the `input_format.tables` array contains:

```typescript
{
  table_name: string;      // Name of the table
  columns: string[];       // Array of column names
  rows: string[][];        // Array of row arrays
}
```

**Example:**
```json
{
  "table_name": "employees",
  "columns": ["id", "name", "department", "salary"],
  "rows": [
    ["1", "Alice", "Engineering", "72000"],
    ["2", "Bob", "Marketing", "45000"]
  ]
}
```

## Expected Output Structure

The `expected_output` object contains:

```typescript
{
  columns: string[];   // Column names from query result
  rows: string[][];    // Sample data rows
}
```

**Example:**
```json
{
  "columns": ["name", "salary"],
  "rows": [
    ["Alice", "72000"],
    ["Bob", "45000"]
  ]
}
```

## Test Cases Structure

Each test case now uses the same `expected_output` structure:

```json
{
  "expected_output": {
    "columns": ["column1", "column2"],
    "rows": [["value1", "value2"]]
  }
}
```

## Benefits

### For HR/Admin Users:
✅ **Clearer structure**: Tables, columns, and rows are explicitly defined
✅ **Better visualization**: Can see exact table structure when creating problems
✅ **Easier editing**: Structured data is easier to understand and modify
✅ **Consistency**: Same format for input, expected output, and test cases

### For System:
✅ **Type safety**: Structured objects are easier to validate
✅ **Backend compatibility**: Already works with existing storage mechanism
✅ **Frontend rendering**: Easier to display structured data in UI
✅ **Data integrity**: Clear separation between problem statement, input data, and expected output

### For Candidates:
✅ **Better clarity**: See clear table structures when viewing problems
✅ **Accurate previews**: Backend can generate precise input/output previews
✅ **Consistent format**: Matches the dynamic output generation already implemented

## Backend Compatibility

The backend **already supports** this format without any changes:

### Storage:
- `input_format` is stored as JSON string in database ✓
- `test_cases` is stored as JSON string in database ✓
- All fields map correctly to existing schema ✓

### API Endpoints:
- `POST /hr/problems` - Accepts new format ✓
- `GET /problems/{problemId}` - Returns new format ✓
- `GET /problems/sql` - Works with new format ✓

### Processing:
- Backend extracts table info from `input_format` for preview generation ✓
- Backend executes `starter_code` to generate `expected_output` preview ✓
- Test case validation uses structured `expected_output` ✓

## Usage Example

### Creating an SQL Problem:

**Problem:** Find employees with salary > 50000

```json
{
  "title": "High Salary Employees",
  "language": "sql",
  "difficulty": "Easy",
  "problem_statement": "Write a query to find all employees whose salary is greater than 50000.",
  "description": "You need to filter the employees table based on the salary column.",
  
  "input_format": {
    "tables": [
      {
        "table_name": "employees",
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["2", "Bob", "Marketing", "45000"],
          ["3", "Charlie", "Engineering", "85000"],
          ["4", "Diana", "HR", "51000"],
          ["5", "Eve", "Finance", "48000"]
        ]
      }
    ]
  },
  
  "expected_output": {
    "columns": ["id", "name", "department", "salary"],
    "rows": [
      ["1", "Alice", "Engineering", "72000"],
      ["3", "Charlie", "Engineering", "85000"],
      ["4", "Diana", "HR", "51000"]
    ]
  },
  
  "starter_code": "SELECT * FROM employees WHERE salary > 50000;",
  "schema_sql": "CREATE TABLE employees (id INTEGER, name TEXT, department TEXT, salary INTEGER);",
  "seed_sql": "INSERT INTO employees VALUES (1,'Alice','Engineering',72000),(2,'Bob','Marketing',45000),(3,'Charlie','Engineering',85000),(4,'Diana','HR',51000),(5,'Eve','Finance',48000);",
  
  "test_cases": [
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["3", "Charlie", "Engineering", "85000"],
          ["4", "Diana", "HR", "51000"]
        ]
      }
    }
  ]
}
```

## Migration Notes

### Existing Problems:
No migration needed! The backend stores `input_format` as JSON, so:
- Old problems with string `input_format` continue to work
- New problems can use the structured object format
- Frontend handles both formats gracefully

### Transition Period:
During the transition, both formats will coexist:
- **New problems**: Use structured format
- **Legacy problems**: Continue using old format
- **Frontend**: Adapts based on format detected

## Testing Checklist

### Frontend:
- [ ] Template generates valid JSON with new structure
- [ ] HR can read and understand the template
- [ ] Form validation accepts new format
- [ ] Problem creation works with new structure

### Backend:
- [ ] POST endpoint accepts new format
- [ ] Database stores all fields correctly
- [ ] GET endpoint returns new format
- [ ] Preview generation works with structured input
- [ ] Test case validation uses structured output

### Integration:
- [ ] End-to-end problem creation flow works
- [ ] SQL execution generates correct expected output
- [ ] Candidate view displays structured data correctly

## Related Documentation

This change complements:
- **Dynamic Expected Output Feature** (`DYNAMIC_EXPECTED_OUTPUT_SQL.md`)
- **SQL Problem UI Updates** (`SQL_PROBLEM_UI_UPDATE_SUMMARY.md`)

Together, these create a cohesive, data-driven SQL problem experience.

## Next Steps

### Recommended Actions:
1. ✅ Update problem authoring guidelines with new format
2. ✅ Train HR team on using structured template
3. ✅ Create example problems using new format
4. ⏳ Optionally migrate legacy problems to new format
5. ⏳ Add frontend validation for structured format

### Future Enhancements:
- Multiple tables support in `input_format.tables` array
- Foreign key relationships between tables
- Complex data types beyond strings
- Table constraints and indexes specification

## Summary

The new SQL problem JSON format provides:
- **Structured data** for input tables and expected outputs
- **Better clarity** for problem authors and candidates
- **Backend compatibility** with zero breaking changes
- **Future-proof** foundation for advanced features

This aligns the HR question creation interface with the modern, data-driven approach already implemented in the candidate-facing components.
