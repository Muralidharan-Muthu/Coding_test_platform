# Testing Dynamic Expected Output for SQL Problems

## Quick Test Guide

### 1. Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open browser to: `http://localhost:5173`

### 2. Test SQL Problem with Expected Output

#### Navigate to SQL Problem S01:
- Go to any SQL problem (e.g., "Select All Employees")

#### Check Network Tab:
1. Open DevTools (F12)
2. Go to Network tab
3. Click on SQL problem
4. Find `/problems/S01` request
5. Check response includes:
   ```json
   {
     "output_preview_columns": ["id", "name", "department", "salary"],
     "output_preview_rows": [[1, "Alice", "HR", 50000], ...]
   }
   ```

#### Verify UI Display:
✅ **Should see:**
- "Expected Output" heading
- Table with column headers from query result
- Actual data rows showing what the query returns
- Clean table formatting

❌ **Should NOT see:**
- Empty output section
- Plain text output
- Old pipe-table format

### 3. Test Different SQL Problem Types

#### Test Case 1: SELECT * (S01)
**Expected:** Full table with all columns and rows
```
Expected Output
┌────┬───────┬────────────┬────────┐
│ id │ name  │ department │ salary │
├────┼───────┼────────────┼────────┤
│ 1  │ Alice │ HR         │ 50000  │
│ 2  │ Bob   │ IT         │ 70000  │
└────┴───────┴────────────┴────────┘
```

#### Test Case 2: Filtered SELECT (S02)
**Query:** `SELECT name, salary FROM employees WHERE salary > 50000`
**Expected:** Two columns with filtered results
```
Expected Output
┌─────────┬────────┐
│ name    │ salary │
├─────────┼────────┤
│ Bob     │ 70000  │
│ Charlie │ 80000  │
└─────────┴────────┘
```

#### Test Case 3: Aggregate Function (S03)
**Query:** `SELECT COUNT(*) as total FROM employees`
**Expected:** Single cell with count
```
Expected Output
┌───────┐
│ total │
├───────┤
│ 4     │
└───────┘
```

#### Test Case 4: DISTINCT (S04)
**Query:** `SELECT DISTINCT department FROM employees`
**Expected:** Single column with unique values
```
Expected Output
┌────────────┐
│ department │
├────────────┤
│ HR         │
│ IT         │
└────────────┘
```

### 4. Test Fallback Behavior

#### Scenario: Missing Output Preview
If backend fails to generate output preview:
- Should fall back to parsing `sample_output` text
- Or show nothing if both are unavailable

### 5. Verify Python Problems Unchanged

Navigate to a Python problem:
- Should still show "Sample Input" and "Sample Output" as text blocks
- No table format for Python problems
- Everything works as before

## Success Criteria

All of these should be ✅:

### Backend:
- [ ] `/problems/{problemId}` endpoint returns `output_preview_columns`
- [ ] `/problems/{problemId}` endpoint returns `output_preview_rows`
- [ ] Query execution happens without errors
- [ ] NULL values handled correctly
- [ ] Invalid queries caught gracefully

### Frontend:
- [ ] Expected Output section displays for SQL problems
- [ ] Table shows proper column headers
- [ ] Data rows display correctly
- [ ] NULL values shown as 'NULL' text
- [ ] Fallback works when no structured output
- [ ] Python problems remain unchanged

### Visual:
- [ ] Table formatting is clean and professional
- [ ] Column headers are readable
- [ ] Data alignment is correct
- [ ] Theme colors apply correctly (dark/light)
- [ ] No layout issues or overflow

## Common Issues & Solutions

### Issue 1: No Expected Output Showing
**Diagnosis:**
```javascript
// In browser console, check:
const problem = // get current problem object
console.log(problem.output_preview_columns)
console.log(problem.output_preview_rows)
```

**Solutions:**
- Check backend logs for query execution errors
- Verify starter_code is valid SQL
- Ensure schema_sql and seed_sql are populated

### Issue 2: Empty Table (Headers Only)
**Cause:** Query returns no results
**Solution:** This is valid - shows empty result set
**Check:** Add more seed data or adjust query

### Issue 3: Wrong Columns Shown
**Cause:** Query uses aliases or expressions
**Example:** `SELECT COUNT(*)` might show as `COUNT(*)` instead of `count`
**Solution:** Use column aliases in starter_code: `SELECT COUNT(*) as total`

### Issue 4: NULL Values Not Showing
**Cause:** Database has NULL but UI shows blank
**Solution:** Code converts NULL to 'NULL' string - verify conversion

### Issue 5: Backend Error Logs
**Check backend console for:**
- `sqlite3.OperationalError`: Invalid query syntax
- `KeyError`: Missing problem fields
- Silent exceptions caught by error handler

## API Response Verification

Use this template to verify backend response:

```json
{
  "id": "S01",
  "title": "Select All Employees",
  "language": "sql",
  "starter_code": "SELECT * FROM employees;",
  "schema_sql": "CREATE TABLE employees (...)",
  "seed_sql": "INSERT INTO employees VALUES (...)",
  
  // NEW FIELDS:
  "input_preview_columns": ["id", "name", "department", "salary"],
  "input_preview_rows": [[1, "Alice", "HR", 50000], ...],
  "output_preview_columns": ["id", "name", "department", "salary"],
  "output_preview_rows": [[1, "Alice", "HR", 50000], ...]
}
```

## Manual Testing Commands

### Test Backend Directly:
```bash
# Using curl
curl http://localhost:8000/problems/S01 | jq '.output_preview_columns, .output_preview_rows'

# Should return arrays with data
```

### Test Query Execution:
```python
# In Python shell
import sqlite3
conn = sqlite3.connect(":memory:")
cursor = conn.cursor()

# Load schema and seed
cursor.executescript(schema_sql)
cursor.executescript(seed_sql)

# Execute starter code
cursor.execute(starter_code)
results = cursor.fetchall()
columns = [desc[0] for desc in cursor.description]

print("Columns:", columns)
print("Rows:", results)
```

## Performance Check

### Backend Response Time:
- Problem details endpoint should respond in < 100ms
- Query execution should be fast (< 10ms for sample data)
- No memory leaks from in-memory databases

### Frontend Rendering:
- Table should render instantly
- No lag when switching between SQL problems
- Smooth theme transitions

## Regression Testing

Ensure these still work correctly:

### Python Problems:
- [ ] Sample Input/Output displays as text
- [ ] No table format appears
- [ ] Run/Submit functionality unchanged

### SQL Input Format:
- [ ] Table name header still shows
- [ ] Input preview table displays correctly
- [ ] Schema information accurate

### SQL Submission:
- [ ] Run button executes query
- [ ] Submit button evaluates against test cases
- [ ] Results display correctly

## Documentation Updates

After successful testing, update:
- API documentation with new fields
- Problem authoring guide with expected output requirements
- User manual with new UI features

## Sign-off Checklist

Before marking as complete:
- [ ] Tested with at least 3 different SQL problems
- [ ] Verified fallback behavior
- [ ] Confirmed Python problems unchanged
- [ ] Checked both dark and light themes
- [ ] Validated NULL handling
- [ ] No console errors in browser
- [ ] Backend logs show no issues
- [ ] Performance is acceptable
- [ ] Edge cases handled gracefully

## Next Steps After Testing

If all tests pass:
1. Update problem database with proper starter_code for all SQL problems
2. Consider adding output row limits for large datasets
3. Document best practices for writing SQL problem starter code
4. Monitor production usage for any issues

If tests fail:
1. Check backend logs for specific errors
2. Verify database schema and seed data are correct
3. Test query execution manually in SQLite
4. Review frontend console errors
5. Revert changes if critical issues found
