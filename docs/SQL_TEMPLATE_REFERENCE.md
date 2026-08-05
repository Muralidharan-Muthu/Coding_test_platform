# SQL Problem Template - Quick Reference Card

## New JSON Format for HR Questions Page

### Complete Template (Copy-Paste Ready)

```json
{
  "title": "Problem Title Here",
  "language": "sql",
  "difficulty": "Easy",
  "marks": 10,
  "time_limit": 10,
  
  "problem_statement": "Write your problem statement here...",
  "description": "Detailed explanation of what needs to be done...",
  
  "input_format": {
    "tables": [
      {
        "table_name": "table_name_here",
        "columns": ["col1", "col2", "col3"],
        "rows": [
          ["val1", "val2", "val3"],
          ["val4", "val5", "val6"]
        ]
      }
    ]
  },
  
  "expected_output": {
    "columns": ["result_col1", "result_col2"],
    "rows": [
      ["result_val1", "result_val2"],
      ["result_val3", "result_val4"]
    ]
  },
  
  "starter_code": "SELECT * FROM table_name;",
  
  "schema_sql": "CREATE TABLE table_name (\n  col1 INTEGER,\n  col2 TEXT,\n  col3 INTEGER\n);",
  
  "seed_sql": "INSERT INTO table_name VALUES\n(val1, val2, val3),\n(val4, val5, val6);",
  
  "test_cases": [
    {
      "expected_output": {
        "columns": ["col1", "col2"],
        "rows": [["val1", "val2"]]
      }
    },
    {
      "expected_output": {
        "columns": ["col1", "col2"],
        "rows": [["val3", "val4"]]
      }
    }
  ]
}
```

---

## Field Descriptions

### Basic Info
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | string | Problem title | "Find High Salary Employees" |
| `language` | string | Must be "sql" | "sql" |
| `difficulty` | string | Easy/Medium/Hard | "Easy" |
| `marks` | number | Points for this problem | 10 |
| `time_limit` | number | Time in minutes | 10 |

### Problem Content
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `problem_statement` | string | Main problem description | "Retrieve all employees..." |
| `description` | string | Detailed explanation | "You need to query the..." |

### Input Data Structure
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `input_format.tables` | array | List of tables with data | See below |
| `table_name` | string | Name of table | "employees" |
| `columns` | string[] | Column names | ["id", "name", "salary"] |
| `rows` | string[][] | Sample data rows | [["1", "Alice", "72000"]] |

### Expected Output
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `expected_output.columns` | string[] | Result column names | ["name", "salary"] |
| `expected_output.rows` | string[][] | Result data rows | [["Alice", "72000"]] |

### SQL Code
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `starter_code` | string | Initial SQL query template | "SELECT * FROM emp;" |
| `schema_sql` | string | CREATE TABLE statements | "CREATE TABLE..." |
| `seed_sql` | string | INSERT statements | "INSERT INTO..." |

### Test Cases
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `test_cases[n].expected_output` | object | Expected result for each test | Same as expected_output |

---

## Example: Complete Problem

### Problem: Select All Employees

```json
{
  "title": "Select All Employees",
  "language": "sql",
  "difficulty": "Easy",
  "marks": 10,
  "time_limit": 10,
  
  "problem_statement": "Write a SQL query to retrieve all columns from the employees table.",
  "description": "You need to use the SELECT * statement to get all employee information.",
  
  "input_format": {
    "tables": [
      {
        "table_name": "employees",
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["2", "Bob", "Marketing", "45000"],
          ["3", "Charlie", "HR", "51000"]
        ]
      }
    ]
  },
  
  "expected_output": {
    "columns": ["id", "name", "department", "salary"],
    "rows": [
      ["1", "Alice", "Engineering", "72000"],
      ["2", "Bob", "Marketing", "45000"],
      ["3", "Charlie", "HR", "51000"]
    ]
  },
  
  "starter_code": "SELECT * FROM employees;",
  
  "schema_sql": "CREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  department TEXT NOT NULL,\n  salary INTEGER NOT NULL\n);",
  
  "seed_sql": "INSERT INTO employees VALUES\n(1, 'Alice', 'Engineering', 72000),\n(2, 'Bob', 'Marketing', 45000),\n(3, 'Charlie', 'HR', 51000);",
  
  "test_cases": [
    {
      "expected_output": {
        "columns": ["id", "name", "department", "salary"],
        "rows": [
          ["1", "Alice", "Engineering", "72000"],
          ["2", "Bob", "Marketing", "45000"],
          ["3", "Charlie", "HR", "51000"]
        ]
      }
    }
  ]
}
```

---

## Common SQL Patterns

### 1. SELECT Specific Columns
```json
{
  "starter_code": "SELECT name, salary FROM employees;",
  "expected_output": {
    "columns": ["name", "salary"],
    "rows": [["Alice", "72000"], ["Bob", "45000"]]
  }
}
```

### 2. WHERE Clause
```json
{
  "starter_code": "SELECT * FROM employees WHERE salary > 50000;",
  "expected_output": {
    "columns": ["id", "name", "department", "salary"],
    "rows": [
      ["1", "Alice", "Engineering", "72000"],
      ["3", "Charlie", "HR", "51000"]
    ]
  }
}
```

### 3. Aggregate Functions
```json
{
  "starter_code": "SELECT AVG(salary) as avg_salary FROM employees;",
  "expected_output": {
    "columns": ["avg_salary"],
    "rows": [["56000"]]
  }
}
```

### 4. GROUP BY
```json
{
  "starter_code": "SELECT department, COUNT(*) as emp_count FROM employees GROUP BY department;",
  "expected_output": {
    "columns": ["department", "emp_count"],
    "rows": [
      ["Engineering", "1"],
      ["Marketing", "1"],
      ["HR", "1"]
    ]
  }
}
```

### 5. ORDER BY
```json
{
  "starter_code": "SELECT name, salary FROM employees ORDER BY salary DESC;",
  "expected_output": {
    "columns": ["name", "salary"],
    "rows": [
      ["Alice", "72000"],
      ["Charlie", "51000"],
      ["Bob", "45000"]
    ]
  }
}
```

---

## Multiple Tables Example

```json
{
  "input_format": {
    "tables": [
      {
        "table_name": "employees",
        "columns": ["id", "name", "dept_id", "salary"],
        "rows": [
          ["1", "Alice", "1", "72000"],
          ["2", "Bob", "2", "45000"]
        ]
      },
      {
        "table_name": "departments",
        "columns": ["id", "name", "location"],
        "rows": [
          ["1", "Engineering", "Bangalore"],
          ["2", "Marketing", "Mumbai"]
        ]
      }
    ]
  },
  
  "starter_code": "SELECT e.name, d.location FROM employees e JOIN departments d ON e.dept_id = d.id;",
  
  "expected_output": {
    "columns": ["name", "location"],
    "rows": [
      ["Alice", "Bangalore"],
      ["Bob", "Mumbai"]
    ]
  }
}
```

---

## Tips for Writing Good SQL Problems

### ✅ DO:
- Provide clear table structures with meaningful sample data
- Include realistic salary/numeric values
- Use proper data types in schema (INTEGER, TEXT, etc.)
- Write specific expected output for each test case
- Keep starter code simple and buildable
- Test your query against the seed data before saving

### ❌ DON'T:
- Leave fields empty or with placeholder text
- Use inconsistent data types (numbers as strings)
- Create schemas that don't match the seed data
- Write queries that fail against the provided data
- Forget to include all required fields

---

## Validation Checklist

Before saving an SQL problem:

- [ ] All required fields are filled
- [ ] Table names are consistent across schema, seed, and input_format
- [ ] Column names match between schema and input_format
- [ ] Seed data matches the table structure
- [ ] Starter code executes successfully against the schema
- [ ] Expected output matches what the starter code produces
- [ ] Test cases cover different scenarios
- [ ] Difficulty level matches marks and time limit
- [ ] Problem statement is clear and complete

---

## Quick Troubleshooting

### Issue: Query returns no results
**Solution:** Check that seed data satisfies the query conditions

### Issue: Column names don't match
**Solution:** Ensure schema, input_format, and expected_output use same names

### Issue: Test cases fail
**Solution:** Verify each test case's expected_output matches actual query result

### Issue: Schema doesn't match data
**Solution:** Align data types and column count in CREATE TABLE and INSERT statements

---

## Need Help?

Refer to:
- **Full Documentation:** `SQL_PROBLEM_JSON_FORMAT_UPDATE.md`
- **Dynamic Output Feature:** `DYNAMIC_EXPECTED_OUTPUT_SQL.md`
- **UI Updates:** `SQL_PROBLEM_UI_UPDATE_SUMMARY.md`
