# Copy Template Button Update

## Summary
The "Copy Template" button on the HR Questions page (`/hr/questions`) has been **automatically updated** to use the new SQL problem JSON format.

## How It Works

### Code Flow:
1. User clicks **"Copy Template"** button (Line 764-769)
2. Triggers `handleCopyJson()` function (Line 543-550)
3. Function calls `buildSqlTemplate(difficulty)` (Line 546)
4. Returns the new structured JSON format
5. Copies to clipboard

### Key Functions:

#### `handleCopyJson()` (Line 543-550)
```javascript
const handleCopyJson = () => {
  const template = activeTab === 'python'
    ? buildPythonTemplate(difficulty)
    : buildSqlTemplate(difficulty)  // ← Uses updated function
  navigator.clipboard.writeText(template)
  setJsonCopied(true)
  setTimeout(() => setJsonCopied(false), 2000)
}
```

#### `currentTemplate` Display (Line 552-554)
```javascript
const currentTemplate = activeTab === 'python'
  ? buildPythonTemplate(difficulty)
  : buildSqlTemplate(difficulty)  // ← Uses updated function
```

## What Gets Copied

When user selects **SQL** tab and clicks **"Copy Template"**:

### ✅ New Format (Active):
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
    }
  ]
}
```

### ❌ Old Format (No Longer Used):
```json
{
  "title": "",
  "language": "sql",
  "difficulty": "Easy",
  "description": "",
  "input_format": "",  // ← Was just a string
  "output_format": "", // ← Removed
  "sample_input": "N/A...", // ← Removed
  "sample_output": "", // ← Removed
  "test_cases": [
    { "expected_columns": [], "expected_rows": [] } // ← Old structure
  ]
}
```

## User Experience

### Before Update:
User clicks "Copy Template" → Gets old flat structure with strings

### After Update:
User clicks "Copy Template" → Gets new structured format with:
- ✅ `input_format.tables` array with table definitions
- ✅ `expected_output` object with columns and rows
- ✅ Structured `test_cases` with `expected_output` objects
- ✅ `problem_statement` field
- ✅ No legacy fields (`output_format`, `sample_input`, `sample_output`)

## Testing

### To Verify:
1. Navigate to `/hr/questions`
2. Select **SQL** tab
3. Choose difficulty (Easy/Medium/Hard)
4. Click **"Copy Template"** button (next to "JSON Template")
5. Paste into a text editor
6. Verify JSON structure matches new format

### Expected Result:
- JSON should have `input_format` as object (not string)
- JSON should have `expected_output` object
- JSON should have `problem_statement` field
- Test cases should use `expected_output` structure

## No Additional Changes Needed

The following components are **already updated** through the `buildSqlTemplate()` function:

✅ **Copy Template Button** - Line 764-769  
✅ **Template Display** - Line 552-554, shown in `<pre className="template-code">`  
✅ **AI Prompt Generation** - Line 522-534, includes template in prompt  
✅ **Copy Prompt Button** - Line 730-737, copies prompt with embedded template  

All these use the same `buildSqlTemplate()` function, so they all benefit from the update automatically.

## Related Documentation

This update is part of the broader SQL problem format changes:
- **SQL Problem JSON Format Update** (`SQL_PROBLEM_JSON_FORMAT_UPDATE.md`)
- **SQL Template Reference** (`SQL_TEMPLATE_REFERENCE.md`)
- **Dynamic Expected Output** (`DYNAMIC_EXPECTED_OUTPUT_SQL.md`)
- **SQL UI Updates** (`SQL_PROBLEM_UI_UPDATE_SUMMARY.md`)

## Benefits

### For HR Users:
✅ One-click access to new structured format  
✅ No need to manually restructure JSON  
✅ Consistent format across all problems  
✅ Easier to understand table structures  

### For System:
✅ Uniform data structure across all SQL problems  
✅ Better data quality from the start  
✅ Reduced manual editing errors  
✅ Faster problem creation workflow  

## Quick Reference

**Button Location:**  
`/hr/questions` → Prompt Builder section → Step 2 → "Copy Template" button

**Function Called:**  
`handleCopyJson()` → `buildSqlTemplate(difficulty)`

**File Modified:**  
`frontend/src/pages/QuestionsPage.jsx` (Line 58-124 - the `buildSqlTemplate` function)

**Date Updated:**  
March 23, 2026

---

**Note:** This was an automatic update - no separate button modification was needed because the copy functionality already used the centralized `buildSqlTemplate()` function, which was updated to the new format.
