function buildAiPrompt(language, difficulty = 'Easy') {
  const lang = (language || 'python').toLowerCase()
  const diffNorm = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase()
  // Seconds as Primary Standard: 10m = 600s, 20m = 1200s, 30m = 1800s
  const timeLimitSec = diffNorm === 'Hard' ? 1800 : diffNorm === 'Medium' ? 1200 : 600
  const timeLimitLabel = diffNorm === 'Hard' ? '00:30:00 (30 mins = 1800s)' : diffNorm === 'Medium' ? '00:20:00 (20 mins = 1200s)' : '00:10:00 (10 mins = 600s)'
  const marks = diffNorm === 'Hard' ? 40 : diffNorm === 'Medium' ? 20 : 10

  if (lang === 'sql') {
    return `You are an expert database engineer and technical examiner. Generate a complete SQL coding problem in JSON format for an assessment platform.

CRITICAL INSTRUCTIONS FOR AI:
1. OUTPUT FORMAT: Output ONLY a single, 100% valid, ONE-TIME COPIABLE raw JSON code block (enclosed in \`\`\`json ... \`\`\`). Do NOT include any conversational text, greetings, markdown comments, or text outside the JSON. The admin will click copy and paste it directly into the platform without editing.
2. TIME LIMIT & MARKS (SECONDS AS PRIMARY STANDARD):
   - For Easy: time_limit = 600 (600 seconds = 00:10:00 = 10 mins), marks = 10
   - For Medium: time_limit = 1200 (1200 seconds = 00:20:00 = 20 mins), marks = 20
   - For Hard: time_limit = 1800 (1800 seconds = 00:30:00 = 30 mins), marks = 40
   Current Setting: "difficulty": "${diffNorm}", "time_limit": ${timeLimitSec} (${timeLimitLabel}), "marks": ${marks}.
3. LEETCODE-STYLE SCHEMA & SEED IN DESCRIPTION:
   - In "description", format the schema and example as clean LeetCode ASCII grid tables:
     Table: <TableName>
     +-------------+---------+
     | Column Name | Type    |
     +-------------+---------+
     | col_name    | type    |
     +-------------+---------+
     <Column and constraint notes>
     
     <Problem statement requirement>
     
     Return the result table in any order.
     
     Example 1:
     Input: 
     <TableName> table:
     +-------------+----------+
     | col1        | col2     |
     +-------------+----------+
     | val1        | val2     |
     +-------------+----------+
     Output: 
     +-------------+
     | col1        |
     +-------------+
     | val1        |
     +-------------+
     Explanation: ...
   - In "schema_sql", provide complete SQLite-compatible DDL (e.g. CREATE TABLE TableName (...);).
   - In "seed_sql", provide realistic sample rows matching Example 1 (e.g. INSERT INTO TableName VALUES (...);).
4. STARTER CODE (WRITE QUERY FROM SCRATCH):
   - For SQL, do NOT write ANY existing query, partial code, or solution (NEVER include "SELECT ...").
   - "starter_code" MUST be set to "-- Write your SQL query here\\n" or empty string "".
   - Candidates must use the description given table to write the entire query from scratch.
5. TEST CASES (EXACTLY 20 TEST CASES REQUIRED):
   - Provide exactly 20 test cases where each testcase has "expected_output" matching the expected table result:
     "expected_output": {
       "columns": ["column_name"],
       "rows": [["val1"], ["val2"], ...]
     }

REQUIRED JSON SCHEMA:
{
  "title": "<Problem Title>",
  "language": "sql",
  "difficulty": "${diffNorm}",
  "marks": ${marks},
  "time_limit": ${timeLimitSec},
  "description": "<LeetCode-style problem statement with Table schema grid, Example 1 input and output grids>",
  "sample_input": "<ASCII grid matching Example 1 input>",
  "sample_output": "<ASCII grid matching Example 1 output>",
  "starter_code": "-- Write your SQL query here\\n",
  "schema_sql": "CREATE TABLE TableName (\\n  col1 INTEGER PRIMARY KEY,\\n  col2 TEXT\\n);",
  "seed_sql": "INSERT INTO TableName VALUES\\n(1, 'val1'),\\n(2, 'val2');",
  "test_cases": [
    {
      "expected_output": {
        "columns": ["col1"],
        "rows": [["1"], ["2"]]
      }
    }
    // ... exactly 20 test cases
  ]
}

Now generate the SQL problem for: [ENTER YOUR TOPIC / PROBLEM REQUIREMENT HERE]
Return ONLY a single one-time copiable raw JSON block.`
  }

  if (lang === 'java') {
    return `You are an expert technical interviewer. Generate a complete Java coding problem in JSON format for an assessment platform.

CRITICAL INSTRUCTIONS FOR AI:
1. OUTPUT FORMAT: Output ONLY a single, 100% valid, ONE-TIME COPIABLE raw JSON code block (enclosed in \`\`\`json ... \`\`\`). Do NOT include any conversation, greetings, or text outside the JSON. The admin will click copy and paste it directly into the platform.
2. TIME LIMIT & MARKS (SECONDS AS PRIMARY STANDARD):
   - For Easy: time_limit = 600 (600 seconds = 00:10:00 = 10 mins), marks = 10
   - For Medium: time_limit = 1200 (1200 seconds = 00:20:00 = 20 mins), marks = 20
   - For Hard: time_limit = 1800 (1800 seconds = 00:30:00 = 30 mins), marks = 40
   Current Setting: "difficulty": "${diffNorm}", "time_limit": ${timeLimitSec} (${timeLimitLabel}), "marks": ${marks}.
3. OUTPUT EVALUATION IS BY FUNCTION RETURN VALUE ONLY:
   - The solution method MUST RETURN the answer (e.g. return new int[]{0, 1}; return true; return "result";).
   - NEVER print the result with System.out.println() for evaluation. (Printing is strictly candidate debug output).
   - "output_format" must state: "Return ..." NOT "Print ...".
4. STARTER CODE:
   - Must use standard class Solution:
     class Solution {
         public <ReturnType> <methodName>(<args>) {
             // Write your solution here
             return ...;
         }
     }
5. TEST CASES (EXACTLY 20 TEST CASES REQUIRED):
   - Provide exactly 20 comprehensive test cases covering standard, edge, boundary, zero, negative, and large cases.
   - "input" format: For multi-parameter methods, put ONE argument per line in exact parameter order.
   - "expected_output": Must match the exact return value.

REQUIRED JSON SCHEMA:
{
  "title": "<Problem Title>",
  "language": "java",
  "difficulty": "${diffNorm}",
  "marks": ${marks},
  "time_limit": ${timeLimitSec},
  "description": "<Problem statement. Must explicitly instruct to 'Return' the answer>",
  "input_format": "<Line-by-line parameter format>",
  "output_format": "<Expected return value format>",
  "sample_input": "<Line-by-line input for testcase 1>",
  "sample_output": "<Expected return value for testcase 1>",
  "starter_code": "class Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}",
  "test_cases": [
    { "input": "[2, 7, 11, 15]\n9", "expected_output": "[0, 1]" }
    // ... exactly 20 test cases
  ]
}

Now generate the Java problem for: [ENTER YOUR TOPIC / PROBLEM REQUIREMENT HERE]
Return ONLY a single one-time copiable raw JSON block.`
  }

  // Default Python Prompt
  return `You are an expert technical interviewer and problem creator. Generate a complete Python 3 coding problem in JSON format for an assessment platform.

CRITICAL INSTRUCTIONS FOR AI:
1. OUTPUT FORMAT: Output ONLY a single, 100% valid, ONE-TIME COPIABLE raw JSON code block (enclosed in \`\`\`json ... \`\`\`). Do NOT include any conversational filler, greetings, markdown comments, or text outside the JSON. The admin will click copy and paste it directly into the platform without editing.
2. TIME LIMIT & MARKS (SECONDS AS PRIMARY STANDARD):
   - For Easy: time_limit = 600 (600 seconds = 00:10:00 = 10 mins), marks = 10
   - For Medium: time_limit = 1200 (1200 seconds = 00:20:00 = 20 mins), marks = 20
   - For Hard: time_limit = 1800 (1800 seconds = 00:30:00 = 30 mins), marks = 40
   Current Setting: "difficulty": "${diffNorm}", "time_limit": ${timeLimitSec} (${timeLimitLabel}), "marks": ${marks}.
3. OUTPUT EVALUATION IS BY FUNCTION RETURN VALUE ONLY:
   - The solution method MUST RETURN the answer (e.g. return "Even", return nums, return [0, 1], return True).
   - NEVER use print() to return results. (Printing is strictly candidate debug output).
   - "description" and "output_format" MUST clearly state: "Return the result..." NOT "Print the result...".
4. STARTER CODE:
   - Must use standard LeetCode class format:
     class Solution:
         def <methodName>(self, <params>) -> <ReturnType>:
             # Write your solution here
             pass
5. TEST CASES (EXACTLY 20 TEST CASES REQUIRED):
   - Provide exactly 20 diverse, high-quality test cases covering:
     * Standard test cases
     * Edge / Boundary cases
     * Zeros, negative numbers, odd/even edge cases
     * Empty / Single element cases (if applicable)
     * Duplicate values / Large arrays
   - "input" format: For multiple parameters, put ONE argument per line in exact function parameter order (e.g. Line 1: [2, 7, 11, 15], Line 2: 9).
   - "expected_output": Must match the exact function return value (e.g. "Even", 42, true, [0, 1]).

REQUIRED JSON SCHEMA:
{
  "title": "<Problem Title>",
  "language": "python",
  "difficulty": "${diffNorm}",
  "marks": ${marks},
  "time_limit": ${timeLimitSec},
  "description": "<Clear problem statement. Must explicitly say 'Return ...' not 'Print'>",
  "input_format": "<Describe line-by-line input argument format>",
  "output_format": "<Describe return value type and format>",
  "sample_input": "<Sample stdin input matching test_cases[0].input>",
  "sample_output": "<Sample expected return value matching test_cases[0].expected_output>",
  "starter_code": "class Solution:\n    def solve(self, ...) -> ...:\n        # Write your solution here\n        pass",
  "test_cases": [
    { "input": "<arg1>\n<arg2>", "expected_output": "<exact_return_value>" }
    // ... exactly 20 test cases
  ]
}

Now generate the Python problem for: [ENTER YOUR TOPIC / PROBLEM REQUIREMENT HERE]
Return ONLY a single one-time copiable raw JSON block.`
}

import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  getQuestionTypes,
  createQuestionType,
  deleteQuestionType,
  getQuestionsByType,
  createQuestionUnderType,
  deleteQuestionUnderType,
} from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { useConfirm } from '../components/ui/ConfirmDialog'
import { FiZap, FiCopy, FiCheck, FiPlus, FiX, FiCpu } from 'react-icons/fi'
import Spinner from '../components/ui/Spinner'
import { formatTimeWithLabel, formatTimeHHMMSS } from '../utils/timeUtils'

const DIFFICULTY_CONFIG = {
  Easy:   { marks: 10, time_limit: 600 },
  Medium: { marks: 20, time_limit: 1200 },
  Hard:   { marks: 40, time_limit: 1800 },
}

const DIFFICULTY_TABS = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
]

function buildPythonTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty] || { marks: 10, time_limit: 15 }
  const test_cases = [
    { input: "[2, 7, 11, 15]\n9", expected_output: "[0, 1]" },
    { input: "[3, 2, 4]\n6", expected_output: "[1, 2]" },
    { input: "[3, 3]\n6", expected_output: "[0, 1]" },
    { input: "[-1, -2, -3, -4, -5]\n-8", expected_output: "[2, 4]" },
    { input: "[0, 4, 3, 0]\n0", expected_output: "[0, 3]" },
    { input: "[1, 5, 10, 20, 50, 100]\n150", expected_output: "[4, 5]" },
    { input: "[10, 20, 30, 40, 50]\n70", expected_output: "[2, 3]" },
    { input: "[-10, 7, 19, 15]\n9", expected_output: "[0, 2]" },
    { input: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n19", expected_output: "[8, 9]" },
    { input: "[100, 200, 500, 1000]\n1200", expected_output: "[1, 3]" },
    { input: "[5, 75, 25]\n100", expected_output: "[1, 2]" },
    { input: "[-3, 4, 3, 90]\n0", expected_output: "[0, 2]" },
    { input: "[2, 5, 5, 11]\n10", expected_output: "[1, 2]" },
    { input: "[1, 3, 4, 2]\n6", expected_output: "[2, 3]" },
    { input: "[11, 15, 2, 7]\n9", expected_output: "[2, 3]" },
    { input: "[1, 1, 1, 1, 1, 4, 7, 8]\n11", expected_output: "[5, 6]" },
    { input: "[10, -5, 20, -15]\n5", expected_output: "[0, 1]" },
    { input: "[1000000, 500000, 500000]\n1000000", expected_output: "[1, 2]" },
    { input: "[-100, -200, 300, 400]\n200", expected_output: "[1, 3]" },
    { input: "[8, 3, 5, 2]\n7", expected_output: "[2, 3]" }
  ]

  return JSON.stringify({
    title: "Two Sum",
    language: "python",
    difficulty,
    marks,
    time_limit,
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    input_format: "Line 1: array of integers nums\nLine 2: integer target",
    output_format: "Return a list of two indices [index1, index2].",
    sample_input: "[2, 7, 11, 15]\n9",
    sample_output: "[0, 1]",
    starter_code: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution here\n        pass",
    test_cases
  }, null, 2)
}

function buildJavaTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty] || { marks: 10, time_limit: 15 }
  const test_cases = [
    { input: "[2, 7, 11, 15]\n9", expected_output: "[0, 1]" },
    { input: "[3, 2, 4]\n6", expected_output: "[1, 2]" },
    { input: "[3, 3]\n6", expected_output: "[0, 1]" },
    { input: "[-1, -2, -3, -4, -5]\n-8", expected_output: "[2, 4]" },
    { input: "[0, 4, 3, 0]\n0", expected_output: "[0, 3]" },
    { input: "[1, 5, 10, 20, 50, 100]\n150", expected_output: "[4, 5]" },
    { input: "[10, 20, 30, 40, 50]\n70", expected_output: "[2, 3]" },
    { input: "[-10, 7, 19, 15]\n9", expected_output: "[0, 2]" },
    { input: "[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n19", expected_output: "[8, 9]" },
    { input: "[100, 200, 500, 1000]\n1200", expected_output: "[1, 3]" },
    { input: "[5, 75, 25]\n100", expected_output: "[1, 2]" },
    { input: "[-3, 4, 3, 90]\n0", expected_output: "[0, 2]" },
    { input: "[2, 5, 5, 11]\n10", expected_output: "[1, 2]" },
    { input: "[1, 3, 4, 2]\n6", expected_output: "[2, 3]" },
    { input: "[11, 15, 2, 7]\n9", expected_output: "[2, 3]" },
    { input: "[1, 1, 1, 1, 1, 4, 7, 8]\n11", expected_output: "[5, 6]" },
    { input: "[10, -5, 20, -15]\n5", expected_output: "[0, 1]" },
    { input: "[1000000, 500000, 500000]\n1000000", expected_output: "[1, 2]" },
    { input: "[-100, -200, 300, 400]\n200", expected_output: "[1, 3]" },
    { input: "[8, 3, 5, 2]\n7", expected_output: "[2, 3]" }
  ]

  return JSON.stringify({
    title: "Two Sum",
    language: "java",
    difficulty,
    marks,
    time_limit,
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.",
    input_format: "Line 1: integer array nums\nLine 2: integer target",
    output_format: "Return an integer array containing the two indices [index1, index2].",
    sample_input: "[2, 7, 11, 15]\n9",
    sample_output: "[0, 1]",
    starter_code: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}",
    test_cases
  }, null, 2)
}

function buildSqlTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty] || { marks: 10, time_limit: 600 }
  const test_cases = Array.from({ length: 20 }, () => ({
    expected_output: {
      columns: ["product_id"],
      rows: [["1"], ["3"]]
    }
  }))

  const description = `Table: Products

+-------------+---------+
| Column Name | Type    |
+-------------+---------+
| product_id  | int     |
| low_fats    | enum    |
| recyclable  | enum    |
+-------------+---------+
product_id is the primary key (column with unique values) for this table.
low_fats is an ENUM (category) of type ('Y', 'N') where 'Y' means this product is low fat and 'N' means it is not.
recyclable is an ENUM (category) of types ('Y', 'N') where 'Y' means this product is recyclable and 'N' means it is not.
 

Write a solution to find the ids of products that are both low fat and recyclable.

Return the result table in any order.

The result format is in the following example.

 

Example 1:

Input: 
Products table:
+-------------+----------+------------+
| product_id  | low_fats | recyclable |
+-------------+----------+------------+
| 0           | Y        | N          |
| 1           | Y        | Y          |
| 2           | N        | Y          |
| 3           | Y        | Y          |
| 4           | N        | N          |
+-------------+----------+------------+
Output: 
+-------------+
| product_id  |
+-------------+
| 1           |
| 3           |
+-------------+
Explanation: Only products 1 and 3 are both low fat and recyclable.`

  return JSON.stringify({
    title: "Recyclable and Low Fat Products",
    language: "sql",
    difficulty,
    marks,
    time_limit,
    description,
    sample_input: "Products table:\n+-------------+----------+------------+\n| product_id  | low_fats | recyclable |\n+-------------+----------+------------+\n| 0           | Y        | N          |\n| 1           | Y        | Y          |\n| 2           | N        | Y          |\n| 3           | Y        | Y          |\n| 4           | N        | N          |\n+-------------+----------+------------+",
    sample_output: "+-------------+\n| product_id  |\n+-------------+\n| 1           |\n| 3           |\n+-------------+",
    starter_code: "-- Write your SQL query here\n",
    schema_sql: "CREATE TABLE Products (\n  product_id INTEGER PRIMARY KEY,\n  low_fats TEXT CHECK(low_fats IN ('Y', 'N')),\n  recyclable TEXT CHECK(recyclable IN ('Y', 'N'))\n);",
    seed_sql: "INSERT INTO Products VALUES\n(0, 'Y', 'N'),\n(1, 'Y', 'Y'),\n(2, 'N', 'Y'),\n(3, 'Y', 'Y'),\n(4, 'N', 'N');",
    test_cases
  }, null, 2)
}

function buildGenericTemplate(difficulty, language) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty] || { marks: 10, time_limit: 15 }
  const test_cases = Array.from({ length: 20 }, (_, i) => ({
    input: `case_${i + 1}_input_data`,
    expected_output: `case_${i + 1}_expected_return_value`
  }))

  return JSON.stringify({
    title: `${language.toUpperCase()} Problem Title`,
    language: language.toLowerCase(),
    difficulty,
    marks,
    time_limit,
    description: `Write a solution in ${language} to solve the problem.`,
    input_format: "Input arguments format.",
    output_format: "Expected return value format.",
    sample_input: "sample_input",
    sample_output: "sample_output",
    starter_code: `class Solution {\n    // Write your ${language} solution here\n}`,
    test_cases
  }, null, 2)
}

function formatIST(isoString) {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch { return '—' }
}

function AddTypeModal({ onAdd, onClose }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) { setError('Enter a language or type name'); return }
    if (trimmed.length < 2) { setError('Name too short'); return }
    if (!/^[a-z0-9_+#\s]+$/i.test(trimmed)) { setError('Only letters, numbers, _, #, + allowed'); return }
    
    setLoading(true)
    try {
      await onAdd(trimmed)
    } catch (err) {
      setError(err.message || 'Failed to create question type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qp-modal-overlay" onClick={onClose}>
      <div className="qp-modal" onClick={e => e.stopPropagation()}>
        <div className="qp-modal-header">
          <h3>Add Question Type</h3>
          <button className="qp-modal-close" onClick={onClose} aria-label="Close"><FiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <p className="qp-modal-desc">
            Enter a custom language like <code>Java</code>, <code>C++</code>, <code>JavaScript</code>.
            A dedicated database table will be automatically provisioned in Turso.
          </p>
          <input
            className="qp-modal-input"
            type="text"
            value={value}
            onChange={e => { setValue(e.target.value); setError('') }}
            placeholder="e.g. Java, C++, JavaScript"
            autoFocus
            disabled={loading}
          />
          {error && <p className="qp-modal-error">{error}</p>}
          <div className="qp-modal-actions">
            <button type="button" className="qp-modal-btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="qp-modal-btn-add" disabled={loading}>
              <FiPlus /> {loading ? 'Creating Table…' : 'Add Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QuestionsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const [adminName, setAdminName] = useState('')
  const [questionTypes, setQuestionTypes] = useState([])
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeDiffTab, setActiveDiffTab] = useState('easy')
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [showAddTypeModal, setShowAddTypeModal] = useState(false)
  const [difficulty, setDifficulty] = useState('Easy')
  const [hasQuestion, setHasQuestion] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const promptRef = useRef(null)
  const [jsonCopied, setJsonCopied] = useState(false)
  const [promptCopied, setPromptCopied] = useState(false)

  // Compute activeTab from pathname or query param
  const queryParams = new URLSearchParams(location.search)
  const queryType = queryParams.get('type') || queryParams.get('lang')
  
  let activeTab = 'python'
  if (location.pathname.includes('/sql_questions') || location.pathname.includes('/sql')) {
    activeTab = 'sql'
  } else if (queryType) {
    activeTab = queryType.toLowerCase()
  } else if (location.pathname.includes('/python_questions')) {
    activeTab = 'python'
  }

  // Load question types from backend
  const loadQuestionTypes = async () => {
    try {
      const types = await getQuestionTypes()
      setQuestionTypes(types)
    } catch (err) {
      console.error('Failed to load question types:', err)
    }
  }

  // Load problems for the activeTab from its dedicated table in Turso
  const loadProblems = async (tabToLoad = activeTab) => {
    setLoading(true)
    setError('')
    try {
      const data = await getQuestionsByType(tabToLoad)
      setProblems(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load questions:', err)
      setError('Failed to load questions from database')
      setProblems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name || 'Admin User')
    loadQuestionTypes()
  }, [navigate])

  useEffect(() => {
    loadProblems(activeTab)
    // Update default starter JSON template
    if (activeTab === 'python') {
      setJsonInput(buildPythonTemplate('Easy'))
    } else if (activeTab === 'java') {
      setJsonInput(buildJavaTemplate('Easy'))
    } else if (activeTab === 'sql') {
      setJsonInput(buildSqlTemplate('Easy'))
    } else {
      setJsonInput(buildGenericTemplate('Easy', activeTab))
    }
    setShowAdd(false)
  }, [activeTab, location.pathname, location.search])

  const handleCreateType = async (typeName) => {
    try {
      const res = await createQuestionType(typeName)
      toast.success(`Created type "${res.type.display_name}" and provisioned table "${res.type.table_name}" in database!`)
      setShowAddTypeModal(false)
      await loadQuestionTypes()
      navigate(`/admin/questions/python_questions?type=${res.type.slug}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to create question type')
      throw err
    }
  }

  const handleRemoveCustomType = async (slug) => {
    const ok = await confirm({
      title: 'Delete Question Type',
      message: `Are you sure you want to delete question type "${slug}"? This will CASCADE DELETE all its questions, student selections, and drop its dedicated table from the database.`,
      confirmText: 'Delete Type & Table',
      type: 'danger'
    })
    if (!ok) return

    try {
      await deleteQuestionType(slug)
      toast.success(`Cascade deleted question type "${slug}" and dropped its database table.`)
      await loadQuestionTypes()
      if (activeTab === slug) {
        navigate('/admin/questions/python_questions')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to delete question type')
    }
  }

  const handleAddQuestion = async () => {
    setError('')
    try {
      const parsed = JSON.parse(jsonInput)
      if (!parsed.title) throw new Error('Title is required')
      parsed.language = activeTab

      // For SQL, ensure starter code has no pre-filled solution
      if (activeTab === 'sql') {
        if (!parsed.starter_code || typeof parsed.starter_code !== 'string' || !parsed.starter_code.trim()) {
          parsed.starter_code = '-- Write your SQL query here\n'
        }
      }

      await createQuestionUnderType(activeTab, parsed)
      toast.success(`Question added to ${activeTab.toUpperCase()} table successfully!`)
      setShowAdd(false)
      await loadProblems(activeTab)
      await loadQuestionTypes()
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Invalid JSON format'
      setError(msg)
      toast.error(msg)
    }
  }

  const handleDeleteProblem = async (problem) => {
    const ok = await confirm({
      title: 'Delete Question',
      message: `Are you sure you want to delete "${problem.title}" from the database?`,
      confirmText: 'Delete Question',
      type: 'danger'
    })
    if (!ok) return

    try {
      await deleteQuestionUnderType(activeTab, problem.id)
      toast.success('Question deleted successfully')
      await loadProblems(activeTab)
      await loadQuestionTypes()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete question')
    }
  }

  // Dynamic navItems driven by Turso question_types registry
  const navItems = [
    {
      label: 'Assessment Dashboard',
      href: '/admin/dashboard/assessment',
      activePaths: ['/admin/dashboard', '/admin/dashboard/assessment', '/dashboard/assessment'],
    },
    {
      label: 'Questions',
      href: '/admin/questions/python_questions',
      activePaths: ['/admin/questions'],
      children: [
        {
          label: 'Python Questions',
          href: '/admin/questions/python_questions',
          activePaths: ['/admin/questions/python_questions', '/admin/questions/python'],
        },
        {
          label: 'SQL Questions',
          href: '/admin/questions/sql_questions',
          activePaths: ['/admin/questions/sql_questions', '/admin/questions/sql'],
        },
        {
          label: 'MCQ Questions',
          href: '/admin/questions/mcq_questions',
          activePaths: ['/admin/questions/mcq_questions', '/admin/questions/mcq'],
        },
        ...questionTypes
          .filter(t => t.is_system === 0)
          .map((t) => ({
            label: `${t.display_name} Questions`,
            href: `/admin/questions/python_questions?type=${t.slug}`,
            activePaths: [`/admin/questions/python_questions?type=${t.slug}`, `/admin/questions/python_questions?lang=${t.slug}`],
            isCustom: true,
            typeKey: t.slug,
          })),
        {
          label: '+ Add Type',
          isAddButton: true,
        },
      ],
    },
    {
      label: 'Manage Candidates',
      href: '/admin/otp',
      activePaths: ['/admin/otp', '/admin/add-candidate'],
      children: [
        {
          label: 'Add Candidate',
          href: '/admin/otp',
          activePaths: ['/admin/otp', '/admin/add-candidate'],
        },
        {
          label: 'Choose Test Type',
          href: '/admin/test-type',
          activePaths: ['/admin/test-type'],
        },
        {
          label: 'Send Mail',
          href: '/admin/send-mail',
          activePaths: ['/admin/send-mail'],
        },
      ],
    },
  ]

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  // Difficulty counts
  const easyCount = problems.filter(p => (p.difficulty || '').toLowerCase() === 'easy').length
  const mediumCount = problems.filter(p => (p.difficulty || '').toLowerCase() === 'medium').length
  const hardCount = problems.filter(p => (p.difficulty || '').toLowerCase() === 'hard').length

  const filteredProblems = problems.filter((p) => {
    const matchesDiff = (p.difficulty || '').toLowerCase() === activeDiffTab
    if (!matchesDiff) return false
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (p.title || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q)
  })
  const activeTypeObj = questionTypes.find(t => t.slug === activeTab)
  const currentDisplayName = activeTypeObj?.display_name || (activeTab.charAt(0).toUpperCase() + activeTab.slice(1))

  return (
    <AdminSidebarLayout
      className="questions-page-layout"
      adminName={adminName || 'Admin User'}
      navItems={navItems}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
      onAddType={() => setShowAddTypeModal(true)}
      onRemoveCustomType={handleRemoveCustomType}
    >
      <div className="qp-content">
        {/* ── Toolbar: Difficulty Navigation Bar on Left, Search in Middle, Add Question on Right ── */}
        <div className="qp-toolbar">
          <div className="qp-diff-tabs" role="tablist" aria-label="Difficulty navigation">
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'easy'}
              className={`qp-diff-tab easy ${activeDiffTab === 'easy' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('easy')}
            >
              <span>Easy</span>
              <span className="qp-diff-badge">{easyCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'medium'}
              className={`qp-diff-tab medium ${activeDiffTab === 'medium' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('medium')}
            >
              <span>Medium</span>
              <span className="qp-diff-badge">{mediumCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeDiffTab === 'hard'}
              className={`qp-diff-tab hard ${activeDiffTab === 'hard' ? 'active' : ''}`}
              onClick={() => setActiveDiffTab('hard')}
            >
              <span>Hard</span>
              <span className="qp-diff-badge">{hardCount}</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="ctt-search-wrapper" style={{ maxWidth: '320px' }}>
            <input
              type="text"
              className="ctt-search-input"
              style={{ paddingLeft: '14px' }}
              placeholder={`Search ${currentDisplayName} questions...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="ctt-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <FiX size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="qp-btn-add"
            onClick={() => setShowAdd((prev) => !prev)}
          >
            <FiPlus size={15} />
            <span>{showAdd ? 'Close' : 'Add Question'}</span>
          </button>
        </div>

        {/* ── Add Question Panel ── */}
        {showAdd && (
          <div className="qp-add-panel">
            <div className="qp-add-panel-header">
              <h3>Add {currentDisplayName} Question (Database Table: <code>{activeTypeObj?.table_name || `${activeTab}_problems`}</code>)</h3>
              <button type="button" className="qp-btn-close-panel" onClick={() => setShowAdd(false)}>
                <FiX size={16} />
              </button>
            </div>

            <div className="qp-json-editor-wrap">
              <div className="qp-ai-tip-banner">
                <span className="qp-ai-tip-icon">💡</span>
                <div className="qp-ai-tip-text">
                  <strong>Generate with AI (ChatGPT / Claude / Gemini):</strong> Click <strong>"Copy AI Prompt (ChatGPT)"</strong> below, paste it into ChatGPT with your problem topic to generate a 100% compliant question (guaranteed <strong>function return value</strong> and <strong>20 test cases</strong>), then paste the JSON below.
                </div>
              </div>

              <div className="qp-json-header-row">
                <label className="qp-json-label" style={{ margin: 0 }}>Question Specification (JSON):</label>
                <div className="qp-json-actions-group">
                  <button
                    type="button"
                    className="qp-btn-copy-prompt"
                    onClick={() => {
                      const prompt = buildAiPrompt(activeTab, activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1))
                      navigator.clipboard.writeText(prompt)
                      setPromptCopied(true)
                      toast.success('AI Generation Prompt copied! Paste into ChatGPT/Claude to generate 100% return-evaluated questions with 20 test cases.')
                      setTimeout(() => setPromptCopied(false), 2500)
                    }}
                    title="Copy prompt for ChatGPT / Claude to generate a return-evaluated 20-testcase problem"
                  >
                    {promptCopied ? <><FiCheck style={{ color: '#34d399' }} /> Prompt Copied!</> : <><FiCpu /> Copy AI Prompt (ChatGPT)</>}
                  </button>

                  <button
                    type="button"
                    className="qp-btn-copy-json"
                    onClick={() => {
                      navigator.clipboard.writeText(jsonInput)
                      setJsonCopied(true)
                      toast.success('Question JSON template copied to clipboard!')
                      setTimeout(() => setJsonCopied(false), 2000)
                    }}
                    title="Copy sample JSON structure"
                  >
                    {jsonCopied ? <><FiCheck style={{ color: 'var(--color-success)' }} /> Copied!</> : <><FiCopy /> Copy Sample JSON</>}
                  </button>
                </div>
              </div>
              <textarea
                className="qp-json-textarea"
                rows={12}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste question JSON here..."
              />
            </div>

            {error && <div className="qp-error-banner">{error}</div>}

            <div className="qp-add-panel-actions">
              <button type="button" className="qp-btn-cancel" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button type="button" className="qp-btn-save" onClick={handleAddQuestion}>
                <FiPlus size={14} /> Save Question to Database
              </button>
            </div>
          </div>
        )}

        {/* ── Problems Section List ── */}
        {loading ? (
          <Spinner label={`Loading ${currentDisplayName} questions from database…`} size={40} />
        ) : (
          <div className="qp-section-card">
            <div className="qp-section-header">
              <div className="qp-section-title">
                <span className={`qp-dot ${activeDiffTab}`} />
                <h3>{activeDiffTab.charAt(0).toUpperCase() + activeDiffTab.slice(1)} {currentDisplayName} Questions</h3>
              </div>
              <span className="qp-section-count">
                {filteredProblems.length} {filteredProblems.length === 1 ? 'question' : 'questions'}
              </span>
            </div>

            {filteredProblems.length === 0 ? (
              <div className="qp-empty">
                <p>No {activeDiffTab} {currentDisplayName} questions found in database table <code>{activeTypeObj?.table_name || `${activeTab}_problems`}</code>.</p>
                <button
                  type="button"
                  className="qp-btn-add-inline"
                  onClick={() => setShowAdd(true)}
                >
                  <FiPlus size={13} /> Add First {currentDisplayName} Question
                </button>
              </div>
            ) : (
              <div className="qp-list">
                {filteredProblems.map((p, idx) => (
                  <div key={p.id || idx} className="qp-card">
                    <span className="qp-card-num">#{idx + 1}</span>
                    <div className="qp-card-body">
                      <div className="qp-card-top">
                        <span className="qp-card-title">{p.title}</span>
                      </div>
                      <div className="qp-card-chips">
                        <span className={`qp-chip diff ${p.difficulty?.toLowerCase()}`}>{p.difficulty}</span>
                        <span className="qp-chip marks">{p.marks || 10} marks</span>
                        <span className="qp-chip time">{formatTimeWithLabel(p.time_limit, true)}</span>
                        <span className="qp-chip date">Added: {formatIST(p.created_at)}</span>
                      </div>
                    </div>
                    <div className="qp-card-actions">
                      <button
                        type="button"
                        className="qp-btn-view"
                        onClick={() => navigate(`/admin/problem/${p.id}`)}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="qp-btn-delete"
                        onClick={() => handleDeleteProblem(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {showAddTypeModal && (
          <AddTypeModal
            onAdd={handleCreateType}
            onClose={() => setShowAddTypeModal(false)}
          />
        )}
      </div>
    </AdminSidebarLayout>
  )
}

export default QuestionsPage