# Copy Template Button - New SQL Format

## Summary
The "Copy Template" button on `/hr/questions` page now generates the **fully converted SQL problem format** with structured tables, unified expected_output, and modern test case structure.

## What Gets Copied

When you click **"Copy Template"** for SQL problems, you now get:

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
  "schema_sql": "CREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  department TEXT NOT NULL,\n  salary INTEGER NOT NULL\n);",
  "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'Engineering', 72000),\n(2, 'Bob', 'Marketing', 45000),\n(3, 'Charlie', 'Engineering', 85000),\n(4, 'Diana', 'HR', 51000);",
  
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
    },
    {
      "expected_output": {
        "columns": ["column1", "column2"],
        "rows": [["value5", "value6"]]
      }
    },
    {
      "expected_output": {
        "columns": ["column1", "column2"],
        "rows": [["value7", "value8"]]
      }
    },
    {
      "expected_output": {
        "columns": ["column1", "column2"],
        "rows": [["value9", "value10"]]
      }
    }
  ]
}
```

## Key Changes from Old Format

### ✅ NEW Features in Template

#### 1. Separate problem_statement Field
```json
"problem_statement": "",
"description": ""
```

#### 2. Structured input_format with Tables
```json
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

#### 3. Unified expected_output Object
```json
"expected_output": {
  "columns": ["column1", "column2"],
  "rows": [
    ["value1", "value2"],
    ["value3", "value4"]
  ]
}
```

#### 4. Modern test_cases Structure
```json
"test_cases": [
  {
    "expected_output": {
      "columns": ["column1", "column2"],
      "rows": [["value1", "value2"]]
    }
  }
]
```

### ❌ REMOVED Fields

These legacy fields are **no longer included**:
- ❌ `"output_format"` - Removed
- ❌ `"sample_input"` - Removed  
- ❌ `"sample_output"` - Removed
- ❌ `"expected_columns"` - Removed (now part of expected_output)
- ❌ `"expected_rows"` - Removed (now part of expected_output)

## How to Use the Template

### Step 1: Copy Template
1. Go to `/hr/questions`
2. Select **SQL** tab
3. Choose difficulty (Easy/Medium/Hard)
4. Click **"Copy Template"** button

### Step 2: Paste into AI
Paste the template into ChatGPT/Claude/Gemini with your problem description.

### Step 3: Fill Required Fields

**You need to provide:**
- `title` - Problem name
- `problem_statement` - What users need to solve
- `description` - Detailed explanation
- `input_format.tables[0].table_name` - Your table name
- `input_format.tables[0].columns` - Your column names
- `input_format.tables[0].rows` - Sample data rows
- `expected_output.columns` - Query result columns
- `expected_output.rows` - Expected query results
- `starter_code` - Initial SQL query
- `schema_sql` - CREATE TABLE statement
- `seed_sql` - INSERT statements
- `test_cases[n].expected_output` - Expected results for each test

### Example Filled Template

```json
{
  "title": "Find High Earners",
  "language": "sql",
  "difficulty": "Easy",
  "marks": 10,
  "time_limit": 10,
  
  "problem_statement": "Write a query to find all employees earning more than 60000.",
  "description": "Filter the employees table by salary threshold.",
  
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
    }
  ]
}
```

## Benefits of New Template

### For HR Users 👩‍💼
✅ **Clearer structure** - Tables, columns, rows explicitly defined  
✅ **Better visualization** - See exact data layout when creating  
✅ **Easier editing** - Structured data is simpler to modify  
✅ **Consistency** - Same format across all SQL problems  

### For System ⚙️
✅ **Type safety** - Structured objects easier to validate  
✅ **Backend compatible** - Works with existing storage  
✅ **Frontend ready** - Matches dynamic rendering logic  
✅ **Future proof** - Supports advanced features  

### For Candidates 👨‍💻
✅ **Better clarity** - Clear table structures  
✅ **Accurate previews** - Real data examples  
✅ **Consistent format** - Matches UI display  

## Technical Details

### Function Updated
```javascript
// File: frontend/src/pages/QuestionsPage.jsx
// Lines: 58-125

function buildSqlTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
  return JSON.stringify({
    // ... new format as shown above
  }, null, 2)
}
```

### Button Handler
```javascript
// File: frontend/src/pages/QuestionsPage.jsx
// Lines: 543-550

const handleCopyJson = () => {
  const template = activeTab === 'python'
    ? buildPythonTemplate(difficulty)
    : buildSqlTemplate(difficulty)  // ← Uses new format
  navigator.clipboard.writeText(template)
  setJsonCopied(true)
  setTimeout(() => setJsonCopied(false), 2000)
}
```

## Validation Checklist

Before submitting a problem created with this template:

- [ ] All required fields filled (title, problem_statement, etc.)
- [ ] Table name consistent across schema, seed, and input_format
- [ ] Column names match between schema and input_format
- [ ] Seed data matches table structure
- [ ] Starter code executes against the schema
- [ ] Expected output matches starter code results
- [ ] Test cases cover different scenarios
- [ ] Difficulty level appropriate
- [ ] No legacy fields present (output_format, sample_input, sample_output)

## Related Documentation

This template update is part of broader SQL problem improvements:
- **SQL Problem JSON Format Update** (`SQL_PROBLEM_JSON_FORMAT_UPDATE.md`)
- **SQL Conversion Guide** (`SQL_CONVERSION_GUIDE.md`)
- **Dynamic Expected Output** (`DYNAMIC_EXPECTED_OUTPUT_SQL.md`)
- **SQL UI Updates** (`SQL_PROBLEM_UI_UPDATE_SUMMARY.md`)

## Quick Reference

**Button Location:** `/hr/questions` → Prompt Builder → Step 2 → "Copy Template"

**Format Version:** 2.0 (Structured Tables + Unified Expected Output)

**Last Updated:** March 23, 2026

**Compatibility:** 
- ✅ Backend: Fully compatible (stores as JSON)
- ✅ Frontend: Fully compatible (renders dynamically)
- ✅ Other Languages: Unaffected (Python uses separate template)

---

**Note:** This template automatically aligns with the converted SQL problems format, ensuring consistency across all problems in the system.
