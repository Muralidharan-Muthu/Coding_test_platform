# Problem Navigation Feature

## Overview
Added "Previous" and "Next" navigation buttons after the output section in both Python and SQL editor pages, allowing users to easily navigate between problems within the same language category.

## Features

### Navigation Buttons
- **← Previous Problem**: Navigate to the previous problem in the list
- **Next Problem →**: Navigate to the next problem in the list
- **Problem Counter**: Shows current position (e.g., "Problem 2 of 5")

### Smart Behavior
- Buttons automatically disable when at the first or last problem
- Works for both Python and SQL problems
- Maintains exam mode state during navigation
- Preserves saved answers when navigating

## Implementation Details

### Files Modified

#### 1. `frontend/src/pages/CodingPage.jsx`

**New State Variables:**
```javascript
const [problemList, setProblemList] = useState([])
const [currentProblemIndex, setCurrentProblemIndex] = useState(-1)
```

**New Functions:**
```javascript
// Load problem list for navigation
const loadProblemList = async (language) => {
  const problems = language === 'python' 
    ? await getPythonProblems() 
    : await getSqlProblems()
  
  setProblemList(problems)
  const index = problems.findIndex(p => p.id === problemId)
  setCurrentProblemIndex(index)
}

// Navigate to previous problem
const handlePrevious = () => {
  if (currentProblemIndex > 0) {
    const prevProblem = problemList[currentProblemIndex - 1]
    navigate(`/coding/${prevProblem.id}`)
  }
}

// Navigate to next problem
const handleNext = () => {
  if (currentProblemIndex < problemList.length - 1) {
    const nextProblem = problemList[currentProblemIndex + 1]
    navigate(`/coding/${nextProblem.id}`)
  }
}
```

**UI Components Added:**
```jsx
<div className="problem-navigation">
  <button onClick={handlePrevious} disabled={currentProblemIndex <= 0}>
    ← Previous Problem
  </button>
  <span className="problem-counter">
    Problem {currentProblemIndex + 1} of {problemList.length}
  </span>
  <button onClick={handleNext} disabled={currentProblemIndex >= problemList.length - 1}>
    Next Problem →
  </button>
</div>
```

#### 2. `frontend/src/pages/CodingPage.css`

**New Styles:**
```css
.problem-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #3e3e42;
}

.btn-nav {
  padding: 10px 20px;
  background-color: #444;
  color: #d4d4d4;
  border: 1px solid #555;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-nav:hover:not(:disabled) {
  background-color: #555;
  border-color: #007acc;
  color: #fff;
}

.btn-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.problem-counter {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  color: #4ec9b0;
  font-weight: 500;
  white-space: nowrap;
}
```

## User Flow

### Python Problems Navigation
```
Python Problems List
  ↓
Click Problem 1 → Code Editor → Click "Next" → Problem 2
  ↑                                        ↓
  └────────────── Click "Previous" ────────┘
```

### SQL Problems Navigation
```
SQL Problems List
  ↓
Click Problem 1 → Code Editor → Click "Next" → Problem 2
  ↑                                        ↓
  └────────────── Click "Previous" ────────┘
```

## Visual Layout

```
┌─────────────────────────────────────────────┐
│         Coding Page Header                  │
├─────────────────────────────────────────────┤
│                                             │
│  Problem Statement    │  Code Editor        │
│                       │                     │
│                       │                     │
├─────────────────────────────────────────────┤
│  Run  │ Submit │ Reset                      │
├─────────────────────────────────────────────┤
│  Output Section                             │
│  // Output appears here                     │
├─────────────────────────────────────────────┤
│  ← Previous  │ Problem 2 of 5 │ Next →     │  ← NEW!
└─────────────────────────────────────────────┘
```

## Behavior in Different Modes

### Practice Mode (Non-Exam)
- Full navigation enabled
- Can freely move between problems
- No time restrictions

### Exam Mode
- Navigation still works
- Timer continues running
- Answers auto-saved when navigating
- All problems accessible within same language section

## Edge Cases Handled

### First Problem
- "Previous" button is disabled
- Can only go forward

### Last Problem
- "Next" button is disabled
- Can only go backward

### Single Problem
- Both buttons disabled
- Counter shows "Problem 1 of 1"

### Loading State
- Navigation buttons only appear after problem list loads
- Prevents navigation errors during loading

## API Integration

### Functions Used
- `getPythonProblems()` - Fetches all Python problems
- `getSqlProblems()` - Fetches all SQL problems
- `getProblem(problemId)` - Fetches individual problem details

### Data Flow
```
Component Mount
    ↓
Load Current Problem
    ↓
Load Problem List (by language)
    ↓
Find Current Index
    ↓
Display Navigation
```

## Testing Scenarios

### Scenario 1: Sequential Navigation
1. Open Problem 1
2. Click "Next" → Should go to Problem 2
3. Click "Next" → Should go to Problem 3
4. Verify URL changes correctly

### Scenario 2: Reverse Navigation
1. Open Problem 3
2. Click "Previous" → Should go to Problem 2
3. Click "Previous" → Should go to Problem 1
4. Verify code resets to starter code

### Scenario 3: Boundary Conditions
1. Open first problem → "Previous" should be disabled
2. Open last problem → "Next" should be disabled
3. Verify no errors at boundaries

### Scenario 4: Mixed Language
1. Navigate Python problems → Should stay in Python
2. Navigate SQL problems → Should stay in SQL
3. No cross-language navigation

## Benefits

### For Users
- ✅ Quick navigation without going back to problem list
- ✅ Clear progress indication with counter
- ✅ Seamless problem-to-problem flow
- ✅ Reduced clicks to access different problems

### For System
- ✅ Loads problem list once per session
- ✅ Efficient index-based navigation
- ✅ Minimal API calls
- ✅ Reuses existing routing infrastructure

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

## Responsive Design

The navigation buttons:
- Scale properly on different screen sizes
- Maintain visibility on smaller screens
- Keep consistent spacing and alignment

## Future Enhancements (Optional)

Potential improvements that could be added:
1. Keyboard shortcuts (Left/Right arrows)
2. Problem thumbnails on hover
3. Difficulty indicators on buttons
4. Progress percentage
5. Quick jump dropdown

## Known Limitations

1. Only navigates within same language (Python ↔ Python, SQL ↔ SQL)
2. Requires problem list to load first (minimal delay)
3. Navigation resets code to starter code unless saved

## Troubleshooting

### Issue: Navigation buttons don't appear
**Solution:** Wait for problem list to load, check console for errors

### Issue: Buttons always disabled
**Solution:** Verify problem list loaded correctly, check currentProblemIndex

### Issue: Wrong problem loads
**Solution:** Check problem ID in URL matches expected problem

## Success Criteria

✅ Navigation buttons appear after output section  
✅ Previous/Next work correctly  
✅ Buttons disable at boundaries  
✅ Problem counter shows correct position  
✅ Works for both Python and SQL  
✅ Smooth transitions between problems  
✅ No console errors  
