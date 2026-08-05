# SQL Problem UI Testing Guide

## Quick Test Steps

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

### 2. Test SQL Problem UI Changes

#### Navigate to SQL Problems:
- Go to any SQL problem (e.g., "Select All Employees", S01)

#### Verify Input Format Section:
✅ **Should see:**
- Table name displayed above the table (e.g., "employees") in accent color
- Clean data table with column headers from backend preview
- Sample data rows displayed properly
- No "Table | Column | Type" format anymore

❌ **Should NOT see:**
- Old three-column layout with "Table", "Column", "Type" headers
- Empty cells or repeated table names

#### Verify Output Format Section:
✅ **Should see:**
- Output Format section is **completely hidden/removed**

❌ **Should NOT see:**
- "Output Format" heading for SQL problems
- Any description table for output format

#### Verify Expected Output Section:
✅ **Should see:**
- Heading says "Expected Output" (not "Sample Output")
- Output displayed as a clean table (if sample_output exists)
- Proper table formatting with borders and spacing

❌ **Should NOT see:**
- Plain text output without table formatting
- "Sample Output" heading (it's now "Expected Output")

### 3. Test Python Problem UI (Unchanged)

#### Navigate to Python Problems:
- Go to any Python problem (e.g., "Check Even or Odd", P01)

#### Verify Everything is Unchanged:
✅ **Input Format:** Should display as plain text in formatted box
✅ **Output Format:** Section should be visible with text description
✅ **Sample Input/Output:** Both should display as text blocks

### 4. Theme Toggle Test

- Click the theme toggle button (sun/moon icon)
- Verify all new elements respect dark/light theme
- Check that:
  - Table name header uses accent color in both themes
  - Tables have proper contrast
  - Text remains readable

### 5. Responsive Design Test

- Resize browser window
- Verify tables scroll horizontally if needed
- Check that table name header stays aligned with table

## Expected Visual Results

### SQL Input Format (New):
```
┌─────────────────────────────────────┐
│ employees                           │ ← Table name header
├─────────────────────────────────────┤
│ id │ name  │ department │ salary   │
├────┼───────┼────────────┼──────────┤
│ 1  │ Alice │ HR         │ 50000    │
│ 2  │ Bob   │ IT         │ 70000    │
└────┴───────┴────────────┴──────────┘
```

### SQL Expected Output (Updated):
```
Expected Output
┌────┬───────┬────────────┬──────────┐
│ 1  │ Alice │ HR         │ 50000    │
│ 2  │ Bob   │ IT         │ 70000    │
└────┴───────┴────────────┴──────────┘
```

## Common Issues & Solutions

### Issue: Table name not showing
**Cause:** Backend not providing `schema_sql` field
**Solution:** Check that problem has `schema_sql` populated in database

### Issue: No data preview showing
**Cause:** Backend not providing `input_preview_columns` and `input_preview_rows`
**Solution:** 
- Backend automatically generates these from schema and seed data
- Check that problem has both `schema_sql` and `seed_sql` fields

### Issue: Output Format still visible for SQL
**Cause:** Browser cache
**Solution:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Styling looks broken
**Cause:** CSS not loaded or cached
**Solution:** 
- Clear browser cache
- Hard refresh
- Check browser console for CSS errors

## Browser Console Checks

Open DevTools (F12) and check for:
- ❌ No JavaScript errors related to `parseSqlInputFormat`
- ❌ No React rendering errors
- ✅ Console should be clean

## API Response Verification

In Network tab, check the `/problems/{problemId}` response for SQL problems:

**Expected fields:**
```json
{
  "id": "S01",
  "language": "sql",
  "input_format": "employees(id INT, name TEXT, ...)",
  "schema_sql": "CREATE TABLE employees (...)",
  "seed_sql": "INSERT INTO employees VALUES (...)",
  "input_preview_columns": ["id", "name", "department", "salary"],
  "input_preview_rows": [[1, "Alice", "HR", 50000], ...],
  "sample_output": "..."
}
```

## Success Criteria

All of these should be ✅:

- [ ] SQL Input Format shows table name header
- [ ] SQL Input Format shows clean data table
- [ ] SQL Output Format section is hidden
- [ ] SQL Expected Output displays as table
- [ ] Python problems remain unchanged
- [ ] Theme toggle works correctly
- [ ] No console errors
- [ ] Responsive design works

## Rollback Plan

If issues occur, the changes are isolated to:
- `frontend/src/pages/CodingPage.jsx` (lines 230-266, 335-440)
- `frontend/src/pages/CodingPage.css` (lines 191-223)

Simply revert these sections to restore previous behavior while keeping Python/other languages working.
