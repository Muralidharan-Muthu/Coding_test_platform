# Fix: Failed to Add SQL Problem

## Problem Solved ✅

The "Failed to add problem" error has been fixed by updating the backend to handle the **new structured JSON format** for SQL problems.

## What Was the Issue?

The backend was expecting `input_format` as a simple string, but the new template sends it as a **structured JSON object**:

```json
// OLD FORMAT (expected by backend before)
"input_format": "employees(id INT, name TEXT, department TEXT, salary INT)"

// NEW FORMAT (sent by copy template button)
"input_format": {
  "tables": [
    {
      "table_name": "employees",
      "columns": ["id", "name", "department", "salary"],
      "rows": [
        ["1", "Alice", "Engineering", "72000"],
        ["2", "Bob", "Marketing", "45000"]
      ]
    }
  ]
}
```

## Solution Applied

Updated `backend/main.py` lines 838-869 to:

1. **Detect if input_format is a dict** and convert to JSON string
2. **Handle expected_output** as JSON object  
3. **Backward compatible** with old string format

### Code Changes:

```python
# Handle both old string format and new object format for input_format
input_format_value = problem.get("input_format", "")
if isinstance(input_format_value, dict):
    input_format_value = json.dumps(input_format_value)

# Handle expected_output if present (new format)
expected_output_value = problem.get("expected_output", "")
if isinstance(expected_output_value, dict):
    expected_output_value = json.dumps(expected_output_value)
```

## How to Test

### 1. Start Backend (Already Running)
```bash
cd c:\Users\asus\Music\dm-recurit\hackerrank-clone\backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Status:** ✅ Running on `http://localhost:8000`

### 2. Start Frontend
```bash
cd c:\Users\asus\Music\dm-recurit\hackerrank-clone\frontend
npm run dev
```

**Status:** ✅ Running on `http://localhost:3007`

### 3. Add a Problem

1. Navigate to: `http://localhost:3007/hr/questions`
2. Select **SQL** tab
3. Choose difficulty (Easy/Medium/Hard)
4. Click **"Copy Template"** button
5. Paste into text editor
6. Fill in the fields:
   - `title`: "Find High Earners"
   - `problem_statement`: "Find employees earning more than 60000"
   - `description`: "Write a SQL query to filter employees by salary"
   - `starter_code`: "SELECT * FROM employees WHERE salary > 60000;"
   - Fill in actual data for tables and expected outputs
7. Paste the filled JSON into the "Paste AI-generated JSON here" box
8. Click **"Add Problem"** button

### Expected Result: ✅ Success

You should see:
- Green success message: `"Find High Earners" added successfully!`
- Problem appears in the list below
- No "Failed to add problem" error

## Sample Problem JSON (Ready to Use)

Here's a complete example you can use to test:

```json
{
  "id": "S99",
  "title": "High Salary Employees",
  "language": "sql",
  "difficulty": "Easy",
  "marks": 10,
  "time_limit": 10,
  "problem_statement": "Find all employees earning more than 60000.",
  "description": "Write a SQL query to retrieve employees with salary greater than 60000.",
  "input_format": {
    "tables": [
      {
        "table_name": "employees",
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["2", "Bob", "Marketing", "45000"],
          ["3", "Charlie", "HR", "51000"],
          ["4", "Diana", "Finance", "80000"]
        ]
      }
    ]
  },
  "expected_output": {
    "columns": ["id", "name", "department", "salary"],
    "rows": [
      ["1", "Alice", "Engineering", "72000"],
      ["4", "Diana", "Finance", "80000"]
    ]
  },
  "starter_code": "SELECT * FROM employees WHERE salary > 60000;",
  "schema_sql": "CREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  department TEXT NOT NULL,\n  salary INTEGER NOT NULL\n);",
  "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'Engineering', 72000),\n(2, 'Bob', 'Marketing', 45000),\n(3, 'Charlie', 'HR', 51000),\n(4, 'Diana', 'Finance', 80000);",
  "test_cases": [
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["4", "Diana", "Finance", "80000"]
        ]
      }
    },
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["4", "Diana", "Finance", "80000"]
        ]
      }
    },
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["4", "Diana", "Finance", "80000"]
        ]
      }
    },
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["4", "Diana", "Finance", "80000"]
        ]
      }
    },
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["4", "Diana", "Finance", "80000"]
        ]
      }
    }
  ]
}
```

## What Fields Are Required?

When adding a problem with the new format:

### ✅ Required Fields:
- `id` - Unique identifier (auto-generated if missing)
- `title` - Problem title
- `language` - "sql" or "python"
- `difficulty` - Easy/Medium/Hard
- `problem_statement` - Main problem description
- `starter_code` - Initial code/query
- `input_format.tables` - Table structure with data
- `expected_output` - Expected query result
- `test_cases` - At least 5 test cases

### ✅ Optional Fields:
- `description` - Additional details
- `schema_sql` - CREATE TABLE statement
- `seed_sql` - INSERT statements
- `marks` - Defaults to 10/20/40 based on difficulty
- `time_limit` - Defaults to 10/15/25 based on difficulty

## Troubleshooting

### Still Getting "Failed to add problem"?

**Check these:**

1. **Unique ID**: Make sure the problem ID doesn't already exist
   ```json
   // Use a unique ID like:
   "id": "S99"  // or "P99" for Python
   ```

2. **Valid JSON**: Ensure the JSON is properly formatted
   - Use a JSON validator online
   - Check for missing commas or quotes

3. **Backend Running**: Verify backend is running on port 8000
   ```bash
   curl http://localhost:8000/hr/problems
   ```

4. **Frontend Connected**: Check frontend can reach backend
   - Open browser DevTools → Network tab
   - Look for failed API requests
   - Check console for errors

### Common Errors:

**Error: "Problem ID already exists"**
- Solution: Change the `id` field to a unique value

**Error: "Invalid JSON"**
- Solution: Validate JSON syntax using online tool

**Error: "Must have title and language"**
- Solution: Ensure both `title` and `language` fields are present

## Backend Status

✅ **Fixed and Running**
- File: `backend/main.py` updated
- Port: 8000
- Status: Accepting new format SQL problems
- Backward compatible: Yes (still supports old format)

## Next Steps

1. ✅ Backend fixed and running
2. ✅ Frontend running on port 3007
3. Try adding a problem with the new template
4. Verify problem appears in the list
5. Test solving the problem from candidate view

---

**Summary:** The "Failed to add problem" error is now fixed. You can add SQL problems using the new structured JSON template! 🎉
