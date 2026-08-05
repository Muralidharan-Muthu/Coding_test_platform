# SQL Submission Test Checklist

## Quick Test Steps

### 1. Start the Application
```bash
# Terminal 1 - Start Backend
cd backend
python main.py

# Terminal 2 - Start Frontend  
cd frontend
npm run dev
```

### 2. Test SQL Submission Flow

#### Test Case 1: Correct Solution
1. Navigate to http://localhost:5173
2. Login with any credentials
3. Start the exam
4. Navigate to SQL Problems section
5. Click on "Department-wise Employee Count" problem
6. The starter code should already be correct:
   ```sql
   SELECT department, COUNT(*) AS count
   FROM employees
   GROUP BY department;
   ```
7. Click **Submit** button
8. **Expected Result:**
   - Console shows: `Submitting SQL query: {...}`
   - Console shows: `Submission result: {...}`
   - Output displays: "✓ Submission Complete"
   - Score shows: 100.00%
   - Message: "✓ All test cases passed!"
   - Page scrolls to show output section

#### Test Case 2: Incorrect Solution
1. On the same problem page, modify the SQL query to something wrong:
   ```sql
   SELECT department, MAX(salary) as max_salary
   FROM employees
   GROUP BY department;
   ```
2. Click **Submit** button
3. **Expected Result:**
   - Console shows submission logs
   - Output displays score (should be 0.00%)
   - Shows "Failed Test Cases:" section
   - Displays expected vs actual results
   - Page scrolls to show output section

#### Test Case 3: SQL Error
1. Modify the query to cause an error:
   ```sql
   SELECT * FROM nonexistent_table;
   ```
2. Click **Submit** button
3. **Expected Result:**
   - Console shows error logs
   - Output displays error message
   - Error is clearly visible

### 3. Test Run Button

#### Test Case 4: Run Correct Query
1. Reset the code to the correct solution
2. Click **Run** button
3. **Expected Result:**
   - Console shows: `Running SQL query: {...}`
   - Console shows: `SQL run result: {...}`
   - Output displays table with results
   - Table shows columns: department, count
   - Page scrolls to show output section

### 4. Verify Console Logging

Open browser DevTools (F12) and check Console tab:

**On Submit:**
```
Submitting SQL query: {sessionId: "...", problemId: "sql_employee_count", dialect: "sql"}
Submission result: {submission_id: 1, passed_tests: 1, total_tests: 1, score: 100, ...}
```

**On Run:**
```
Running SQL query: {problemId: "sql_employee_count", dialect: "sql"}
SQL run result: {status: "success", columns: [...], rows: [...]}
```

### 5. Verify Error Handling

**Test Null Problem State:**
1. Try to submit before problem loads (if possible)
2. Should see error: "Problem not loaded. Please refresh the page."

**Test Network Error:**
1. Stop the backend server
2. Try to submit
3. Should see detailed error in console and user-friendly error message

### 6. Check Different SQL Dialects

Test with each dialect selector option:
- Standard SQL
- MySQL
- PostgreSQL

Each should work correctly and show the dialect in results.

## Success Criteria

✅ Submit button works for all SQL problems
✅ Results are displayed clearly in output section
✅ Failed test cases show detailed information
✅ Page auto-scrolls to show results after submission
✅ Console logs provide debugging information
✅ Error messages are clear and helpful
✅ No JavaScript errors in console on successful submission

## Common Issues & Solutions

### Issue: "Problem not loaded" error
**Solution:** Refresh the page and wait for problem to load completely

### Issue: No output visible
**Solution:** 
1. Check if page scrolled down
2. Look for error in red box at top
3. Check browser console (F12) for errors

### Issue: Backend connection error
**Solution:**
1. Verify backend is running on port 8000
2. Check terminal for backend errors
3. Verify CORS is enabled

### Issue: Test cases failing unexpectedly
**Solution:**
1. Check column names match exactly (case-sensitive)
2. Verify row data types match (numbers vs strings)
3. Remember that row order doesn't matter (comparison is flexible)

## Debugging Tips

1. **Always check console first** - All requests/responses are now logged
2. **Use Network tab** - See exact API requests and responses
3. **Look for the scroll** - Auto-scroll confirms submission completed
4. **Check problem state** - Make sure problem loaded before submitting
