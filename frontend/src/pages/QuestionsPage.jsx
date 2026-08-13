import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import AdminSidebarLayout from '../components/admin/AdminSidebarLayout'
import { useToast } from '../components/ui/ToastProvider'
import { FiZap, FiCopy, FiCheck, FiPlus } from 'react-icons/fi'
import Spinner from '../components/ui/Spinner'
import './QuestionsPage.css'

const NAV_ITEMS = [
  {
    label: 'Assessment Dashboard',
    href: '/dashboard/assessment',
    activePaths: ['/dashboard/assessment'],
  },
  { label: 'Questions', href: '/admin/questions/python_questions', activePaths: ['/admin/questions'] },
  {
    label: 'Manage Candidates',
    href: '/admin/otp',
    activePaths: ['/admin/otp'],
    children: [
      { label: 'Choose Test Type', href: '/admin/test-type', activePaths: ['/admin/test-type'] },
      { label: 'Send Mail', href: '/admin/send-mail', activePaths: ['/admin/send-mail'] },
    ],
  },
]

// Difficulty config
const DIFFICULTY_CONFIG = {
  Easy:   { marks: 10, time_limit: 10 },
  Medium: { marks: 20, time_limit: 15 },
  Hard:   { marks: 40, time_limit: 25 },
}

const QUESTION_LANGUAGE_TABS = [
  { id: 'python', label: 'Python Questions', shortLabel: 'Py' },
  { id: 'sql', label: 'SQL Questions', shortLabel: 'SQL' },
  { id: 'mcq', label: 'MCQ Questions', shortLabel: 'MCQ' },
]

function buildPythonTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
  return JSON.stringify({
    title: "",
    language: "python",
    difficulty,
    marks,
    time_limit,
    description: "",
    input_format: "",
    output_format: "",
    sample_input: "",
    sample_output: "",
    starter_code: "import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Read input\n    n = int(input().strip())\n    arr = list(map(int, input().strip().split()))\n\n    # Write your solution here\n    result = None\n    print(result)\n\nsolve()",
    test_cases: [
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
      { input: "", expected_output: "" },
    ]
  }, null, 2)
}

function buildSqlTemplate(difficulty) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]
  return JSON.stringify({
    title: "",
    language: "sql",
    difficulty,
    marks,
    time_limit,
    statement: "",
    description: "",
    input_format: {
      tables: [
        {
          table_name: "employees",
          columns: ["id", "name", "department", "salary"],
          rows: [
            ["1", "Alice", "Engineering", "72000"],
            ["2", "Bob", "Marketing", "45000"],
            ["3", "Charlie", "Engineering", "85000"],
            ["4", "Diana", "HR", "51000"]
          ]
        }
      ]
    },
    expected_output: {
      columns: ["column1", "column2"],
      rows: [
        ["value1", "value2"],
        ["value3", "value4"]
      ]
    },
    starter_code: "SELECT * FROM table_name;",
    schema_sql: "CREATE TABLE employees (\n  id INTEGER PRIMARY KEY,\n  name TEXT NOT NULL,\n  department TEXT NOT NULL,\n  salary INTEGER NOT NULL\n);",
    seed_sql: "INSERT INTO employees VALUES\n(1, 'Alice', 'Engineering', 72000),\n(2, 'Bob', 'Marketing', 45000),\n(3, 'Charlie', 'Engineering', 85000),\n(4, 'Diana', 'HR', 51000);",
    test_cases: [
      {
        expected_output: {
          columns: ["column1", "column2"],
          rows: [["value1", "value2"]]
        }
      },
      {
        expected_output: {
          columns: ["column1", "column2"],
          rows: [["value3", "value4"]]
        }
      },
      {
        expected_output: {
          columns: ["column1", "column2"],
          rows: [["value5", "value6"]]
        }
      },
      {
        expected_output: {
          columns: ["column1", "column2"],
          rows: [["value7", "value8"]]
        }
      },
      {
        expected_output: {
          columns: ["column1", "column2"],
          rows: [["value9", "value10"]]
        }
      }
    ]
  }, null, 2)
}

function buildPythonPrompt(difficulty, hasQuestion, questionText, template) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]

  const PYTHON_RULES = `
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PLATFORM CONTEXT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
This is for an internal HackerRank/HackerEarth-style coding test platform.
Candidates write code in a browser editor. Code is executed server-side against
test cases by comparing stdout. Every field must be production-ready.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
FIXED VALUES — DO NOT CHANGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
language   : "python"
difficulty : "${difficulty}"
marks      : ${marks}
time_limit : ${time_limit}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
FIELD-BY-FIELD RULES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

[ description ]
  - 3–5 sentences. State the problem clearly.
  - Mention the goal, what the input represents, and what output is expected.
  - Include constraints inline: e.g. "1 â‰¤ N â‰¤ 10^5, 1 â‰¤ arr[i] â‰¤ 10^9"
  - No bullet points. Write in paragraph form like HackerRank problem statements.

[ input_format ]
  - Describe line by line exactly what the candidate will read from stdin.
  - Example: "The first line contains an integer N.\\nThe second line contains N space-separated integers."
  - Must perfectly match what the starter_code reads.

[ output_format ]
  - Describe exactly what to print. Specify if it's a single integer, a line, multiple lines, etc.
  - Example: "Print a single integer — the maximum sum of the subarray."

[ sample_input ]
  - A real example matching input_format exactly (plain text, no labels).
  - Must be a valid test case with known correct output.

[ sample_output ]
  - The exact output for sample_input. Must match expected_output of test_case[0].

[ starter_code ]
  CRITICAL — must follow this EXACT structure (HackerRank/HackerEarth style):

  import sys
  input = sys.stdin.readline

  def solve():
      # Read inputs using: input().strip() or int(input()) or list(map(int, input().split()))
      # ── candidate writes logic here ──
      pass

  solve()

  Rules:
  - Always start with "import sys\\nimport = sys.stdin.readline"
  - Always define "def solve():" and call "solve()" at the end
  - Read inputs inside solve() using the overridden input()
  - Include reading code that matches input_format exactly
  - Leave a clear comment where the candidate adds their logic
  - Do NOT include the solution — only the skeleton with reading code

[ test_cases ] — exactly 5 cases in this order:
  Case 1: Matches sample_input / sample_output exactly
  Case 2: Edge case — minimum N (e.g. N=1, single element, empty-adjacent scenario)
  Case 3: Edge case — all values identical / all zeros / sorted input
  Case 4: Medium-sized input — N between 10 and 100, mixed values
  Case 5: Larger or boundary input — N near upper limit or stress test

  Each test case:
  - "input"           : exact multi-line string the program reads from stdin (\\n between lines)
  - "expected_output" : exact string that print() produces (\\n at end of each printed line if multiple)
  - input must EXACTLY match what starter_code reads — if starter_code reads 2 lines, input has 2 lines

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
OUTPUT FORMAT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
- Return ONLY a single valid JSON object
- No markdown, no code fences, no explanation before or after
- No "id" field — the system auto-assigns it
- All string values use escaped newlines (\\n), never literal newlines inside JSON strings
- Double-check: input of test_case[0] must equal sample_input
`

  if (hasQuestion && questionText.trim()) {
    return `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
QUESTION TO CONVERT (paste exactly this prompt into ChatGPT / Claude / Gemini)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

${questionText.trim()}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
TASK
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
You are a senior problem setter for a HackerRank-style coding platform.
Convert the question above into a production-ready JSON problem definition.
${PYTHON_RULES}
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
JSON TEMPLATE — fill every field
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${template}`
  }

  return `You are a senior problem setter for a HackerRank-style coding platform.
Create a NEW Python coding question that is ${difficulty.toLowerCase()} difficulty.
${PYTHON_RULES}
Topic ideas for ${difficulty} level: ${
    difficulty === 'Easy'
      ? 'array manipulation, string reversal, counting elements, basic math, FizzBuzz variants, palindrome check'
      : difficulty === 'Medium'
      ? 'sliding window, two pointers, hashmap frequency count, matrix traversal, prefix sums, stack-based problems'
      : 'dynamic programming, graph BFS/DFS, segment trees, longest subsequence, interval merging, advanced recursion'
  }

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
JSON TEMPLATE — fill every field
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${template}`
}

function buildSqlPrompt(difficulty, hasQuestion, questionText, template) {
  const { marks, time_limit } = DIFFICULTY_CONFIG[difficulty]

  const SQL_RULES = `
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
PLATFORM CONTEXT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
This is for an internal HackerRank/HackerEarth-style SQL coding test platform.
Candidates write a SQL SELECT query in a browser editor. The query runs against
a live SQLite database seeded with the provided data. Results are compared
column-by-column and row-by-row against expected_columns and expected_rows.
Every field must be production-ready.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
FIXED VALUES — DO NOT CHANGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
language   : "sql"
difficulty : "${difficulty}"
marks      : ${marks}
time_limit : ${time_limit}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
FIELD-BY-FIELD RULES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

[ description ]
  - 3–5 sentences. Explain the business scenario clearly.
  - State exactly what data to retrieve, any filters, grouping, or ordering required.
  - Mention the table name(s) so candidates know the schema.
  - No bullet points. Paragraph form like HackerRank SQL problems.

[ input_format ]
  - Describe the schema: table name(s), column names, and what each column means.
  - Example: "The employees table contains id (INTEGER), name (TEXT), department (TEXT), salary (INTEGER), hire_date (TEXT)."
  - Mention all tables the candidate will query.

[ output_format ]
  - Describe exactly which columns to return and in what order.
  - Specify any ORDER BY required. Example: "Return name and salary ordered by salary descending."
  - Candidates MUST match column names exactly as listed here.

[ sample_input ]
  - Write "N/A (schema and seed data are provided above)" — input is the DB itself, not stdin.

[ sample_output ]
  - Show a small subset (2–3 rows) of the expected result in a readable table format.
  - Example: "name | salary\\nAlice | 91000\\nFiona | 85000"

[ starter_code ]
  - A simple SELECT hint. Example: "SELECT name, salary FROM employees ORDER BY salary DESC;"
  - Do NOT give away the full solution — just enough to show the table and basic structure.

[ schema_sql ]
  CRITICAL — production quality:
  - Use CREATE TABLE IF NOT EXISTS
  - Proper SQLite types: INTEGER, TEXT, REAL, NUMERIC
  - Add PRIMARY KEY, NOT NULL constraints where appropriate
  - If 2 tables: add FOREIGN KEY relationship
  - Column names must be lowercase_snake_case
  - The schema must support the problem's required query (JOINs, subqueries, aggregates, etc.)

[ seed_sql ]
  CRITICAL — richness matters:
  - Minimum 12–15 rows total (across all tables)
  - Data must be diverse: multiple groups/categories, varied numeric values (not round numbers), mixed dates
  - Include edge cases in data: ties (same salary), employees in the same department, NULLable-adjacent scenarios
  - Data must be specifically designed so the correct SQL query produces interesting, non-trivial results
  - If 2 tables: seed both with enough rows for meaningful JOINs
  - All INSERT statements must match the schema exactly (column count and types)

[ test_cases ] — exactly 5 cases
  All 5 test cases test the SAME SQL query but verify correctness:
  Case 1: Full expected result (all rows the query should return)
  Case 2: A filtered subset — same query, verify a specific row is present
  Case 3: Verify COUNT or aggregate value is correct
  Case 4: Verify ordering — first row must match the top result
  Case 5: Verify the last/bottom row or a boundary condition

  WAIT — for this platform, all 5 test_cases must have:
  - "expected_columns": exact list of column name strings in query output order
    Example: ["name", "department", "salary"]
  - "expected_rows"  : exact list of rows, each row is an array of values in same column order
    Example: [["Alice", "Engineering", 91000], ["Bob", "Marketing", 45000]]

  CRITICAL rules for expected_rows:
  - Column names must EXACTLY match what the SELECT query returns (alias names if used)
  - Row values must be the correct SQLite output types (INTEGER not "91000", TEXT as string)
  - Rows must be in the ORDER BY sequence the problem requires
  - All 5 cases use the SAME expected_columns (same query shape)
  - Cases 2–5 can be subsets or single rows for spot-checking

[ SQL difficulty guidance ]
  Easy   → Single table SELECT with WHERE, simple ORDER BY, basic aggregates (COUNT, SUM, AVG)
  Medium → JOINs between 2 tables, GROUP BY with HAVING, subqueries, date filtering
  Hard   → Multi-level subqueries, window functions (RANK, ROW_NUMBER), self-joins, CTEs, complex aggregation

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
OUTPUT FORMAT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
- Return ONLY a single valid JSON object
- No markdown, no code fences, no explanation before or after
- No "id" field — the system auto-assigns it
- All multi-line strings use \\n, never literal newlines inside JSON strings
`

  if (hasQuestion && questionText.trim()) {
    return `â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
QUESTION TO CONVERT (paste exactly this prompt into ChatGPT / Claude / Gemini)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

${questionText.trim()}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
TASK
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
You are a senior SQL problem setter for a HackerRank-style coding platform.
Convert the question above into a production-ready JSON problem definition.
${SQL_RULES}
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
JSON TEMPLATE — fill every field
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${template}`
  }

  return `You are a senior SQL problem setter for a HackerRank-style coding platform.
Create a NEW SQL coding question that is ${difficulty.toLowerCase()} difficulty.
${SQL_RULES}
Topic ideas for ${difficulty} level SQL:
${
    difficulty === 'Easy'
      ? 'Filter employees by department or salary threshold, find maximum/minimum value, count rows per category, sort results by a column, find unique values'
      : difficulty === 'Medium'
      ? 'JOIN two tables (employees + departments), GROUP BY with HAVING clause, find employees earning above department average, top-N per group, date-based filtering'
      : 'Rank employees within departments using window functions, find 2nd highest salary per department, detect gaps in sequences, recursive CTEs, multi-condition subqueries, pivot-style aggregation'
  }

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
JSON TEMPLATE — fill every field
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${template}`
}

function formatIST(isoString) {
  if (!isoString) return '—'
  try {
    const date = new Date(isoString)
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return '—'
  }
}

function QuestionsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [adminName, setAdminName] = useState('')
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('python')
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [error, setError] = useState('')

  // Prompt Builder state
  const [difficulty, setDifficulty] = useState('Easy')
  const [hasQuestion, setHasQuestion] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const promptRef = useRef(null)
  const [jsonCopied, setJsonCopied] = useState(false)

  const location = useLocation()

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in')
    const name = localStorage.getItem('admin_name')
    if (!loggedIn) {
      navigate('/admin')
      return
    }
    setAdminName(name)
    loadProblems()
  }, [navigate])

  useEffect(() => {
    if (location.pathname.includes('sql')) {
      setActiveTab('sql')
      setShowAdd(false)
      setError('')
    } else if (location.pathname.includes('python')) {
      setActiveTab('python')
      setShowAdd(false)
      setError('')
    } else if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab)
      setShowAdd(false)
      setError('')
    }
  }, [location.pathname, location.state])

  const loadProblems = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/problems')
      setProblems(response.data)
    } catch (err) {
      console.error('Failed to load problems', err)
      toast.error('Failed to load questions.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (problemId, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return
    try {
      await api.delete(`/admin/problems/${problemId}`)
      toast.success(`"${title}" deleted`)
      loadProblems()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete')
    }
  }

  const handleAdd = async () => {
    setError('')
    if (!jsonInput.trim()) {
      setError('Paste the AI-generated JSON here')
      return
    }
    let parsed
    try {
      // Sanitize AI-generated JSON: replace curly/smart quotes with straight quotes
      const sanitized = jsonInput
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
        .trim()
      parsed = JSON.parse(sanitized)
    } catch (e) {
      setError('Invalid JSON. Please check the format and try again.')
      return
    }
    if (!parsed.title || !parsed.language) {
      setError('JSON must have "title" and "language" fields')
      return
    }
    // Assign ID automatically if missing
    if (!parsed.id) {
      const lang = parsed.language === 'sql' ? 'S' : 'P'
      const existing = problems.filter(p => p.language === parsed.language)
      parsed.id = `${lang}${String(existing.length + 1).padStart(2, '0')}_${Date.now()}`
    }
    try {
      await api.post('/admin/problems', parsed)
      toast.success(`"${parsed.title}" added successfully!`)
      setJsonInput('')
      setShowAdd(false)
      setGeneratedPrompt('')
      loadProblems()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add problem')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_logged_in')
    navigate('/admin')
  }

  const openAdd = () => {
    setShowAdd(true)
    setJsonInput('')
    setError('')
    setGeneratedPrompt('')
    setDifficulty('Easy')
    setHasQuestion(false)
    setQuestionText('')
  }

  const handleGeneratePrompt = () => {
    const template = activeTab === 'python'
      ? buildPythonTemplate(difficulty)
      : buildSqlTemplate(difficulty)
    const prompt = activeTab === 'python'
      ? buildPythonPrompt(difficulty, hasQuestion, questionText, template)
      : buildSqlPrompt(difficulty, hasQuestion, questionText, template)
    setGeneratedPrompt(prompt)
    // Scroll the prompt output to top after generation
    setTimeout(() => {
      if (promptRef.current) promptRef.current.scrollTop = 0
    }, 50)
  }

  const handleCopyPrompt = () => {
    if (!generatedPrompt) return
    navigator.clipboard.writeText(generatedPrompt)
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleCopyJson = () => {
    const template = activeTab === 'python'
      ? buildPythonTemplate(difficulty)
      : buildSqlTemplate(difficulty)
    navigator.clipboard.writeText(template)
    setJsonCopied(true)
    setTimeout(() => setJsonCopied(false), 2000)
  }

  const currentTemplate = activeTab === 'python'
    ? buildPythonTemplate(difficulty)
    : buildSqlTemplate(difficulty)

  const filtered = problems.filter(p => p.language === activeTab)
  const easyList   = filtered.filter(p => p.difficulty?.toLowerCase() === 'easy')
  const mediumList = filtered.filter(p => p.difficulty?.toLowerCase() === 'medium')
  const hardList   = filtered.filter(p => p.difficulty?.toLowerCase() === 'hard')

  const handleTabChange = (nextTab) => {
    if (nextTab === 'mcq') {
      navigate('/admin/questions/mcq_questions')
      return
    }

    setActiveTab(nextTab)
    setShowAdd(false)
    setError('')
    if (nextTab === 'python') {
      navigate('/admin/questions/python_questions')
    } else if (nextTab === 'sql') {
      navigate('/admin/questions/sql_questions')
    }
  }

  const renderQuestionTypeTabs = (placement, collapsed = false) => (
    <div className={`question-type-tabs question-type-tabs--${placement}${collapsed ? ' is-collapsed' : ''}`}>
      {placement === 'sidebar' && !collapsed && (
        <p className="question-type-tabs-label">Question Type</p>
      )}

      <div className="tabs" role="tablist" aria-label="Question type">
        {QUESTION_LANGUAGE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            aria-pressed={activeTab === tab.id}
            aria-label={tab.label}
          >
            <span className="tab-short" aria-hidden="true">{tab.shortLabel}</span>
            <span className="tab-full">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )

  const renderQuestionCard = (p, index) => (
    <div key={p.id} className="question-item">
      <div className="question-number">#{index + 1}</div>
      <div className="question-info">
        <h3>{p.title}</h3>
        <div className="question-meta">
          <span className={`difficulty-badge difficulty-${p.difficulty?.toLowerCase()}`}>
            {p.difficulty}
          </span>
          <span className="marks">{p.marks} marks</span>
          <span className="time-limit">{p.time_limit} min</span>
          <span className="added-at">Added: {formatIST(p.created_at)}</span>
        </div>
      </div>
      <div className="question-actions">
        <button onClick={() => navigate(`/coding/${p.id}?mode=admin-preview`)} className="btn-view">View</button>
        <button onClick={() => handleDelete(p.id, p.title)} className="btn-delete">Delete</button>
      </div>
    </div>
  )

  return (
    <AdminSidebarLayout
      className="questions-page"
      adminName={adminName || 'Admin User'}
      navItems={NAV_ITEMS}
      sidebarExtraAfterHref="/admin/questions/python_questions"
      sidebarExtra={({ collapsed }) => renderQuestionTypeTabs('sidebar', collapsed)}
      onNavigate={(href) => navigate(href)}
      onLogout={handleLogout}
    >
      <div className="questions-content">

        {renderQuestionTypeTabs('content')}

        <div className="actions-bar">
          {!showAdd && (
            <button onClick={openAdd} className="btn-add">+ Add Question</button>
          )}
        </div>

        {/* Dynamic Summary Card */}
        <div className="summary-card">
          <div className="summary-item summary-easy">
            <span className="summary-label">Easy</span>
            <span className="summary-num">{easyList.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item summary-medium">
            <span className="summary-label">Medium</span>
            <span className="summary-num">{mediumList.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item summary-hard">
            <span className="summary-label">Hard</span>
            <span className="summary-num">{hardList.length}</span>
          </div>
          <div className="summary-divider" />
          <div className="summary-item summary-total">
            <span className="summary-label">Total</span>
            <span className="summary-num">{filtered.length}</span>
          </div>
        </div>

        {/* ── AI Prompt Builder ── */}
        {showAdd && (
          <div className="add-section">
            <div className="add-header">
              <h3>Add {activeTab === 'python' ? 'Python' : 'SQL'} Question</h3>
              <button onClick={() => { setShowAdd(false); setGeneratedPrompt('') }} className="btn-cancel">Cancel</button>
            </div>

            {/* Step 1 – Prompt Builder */}
            <div className="prompt-builder">
              <div className="pb-step-label">
                <span className="pb-step-badge">Step 1</span>
                Build an AI Prompt — paste it into ChatGPT, Claude, or Gemini
              </div>

              {/* Difficulty Selector */}
              <div className="pb-row">
                <span className="pb-field-label">Difficulty</span>
                <div className="difficulty-selector">
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button
                      key={d}
                      className={`diff-btn diff-${d.toLowerCase()} ${difficulty === d ? 'selected' : ''}`}
                      onClick={() => { setDifficulty(d); setGeneratedPrompt('') }}
                    >
                      {d}
                      <span className="diff-meta">
                        {DIFFICULTY_CONFIG[d].marks} marks · {DIFFICULTY_CONFIG[d].time_limit} min
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Checkbox */}
              <div className="pb-row">
                <label className="pb-checkbox-label">
                  <input
                    type="checkbox"
                    checked={hasQuestion}
                    onChange={e => { setHasQuestion(e.target.checked); setGeneratedPrompt('') }}
                    className="pb-checkbox"
                  />
                  <span>I already have a question — convert it to JSON</span>
                </label>
              </div>

              {/* Question textarea (shown only if checkbox checked) */}
              {hasQuestion && (
                <div className="pb-row">
                  <label className="pb-field-label">Paste your question</label>
                  <textarea
                    className="pb-textarea"
                    rows={5}
                    placeholder="Paste the question text here (problem statement, constraints, examples)..."
                    value={questionText}
                    onChange={e => { setQuestionText(e.target.value); setGeneratedPrompt('') }}
                  />
                </div>
              )}

              {/* Buttons */}
              <div className="pb-actions">
                <button className="btn-generate-prompt" onClick={handleGeneratePrompt}>
                  <FiZap /> Generate AI Prompt
                </button>
                {generatedPrompt && (
                  <button
                    className={`btn-copy-prompt ${promptCopied ? 'copied' : ''}`}
                    onClick={handleCopyPrompt}
                  >
                    {promptCopied ? <><FiCheck /> Copied!</> : <><FiCopy /> Copy Prompt</>}
                  </button>
                )}
              </div>

              {/* Generated Prompt Display */}
              {generatedPrompt && (
                <div className="pb-prompt-output">
                  {hasQuestion && questionText.trim() && (
                    <div className="pb-question-badge"><FiCheck /> Your pasted question is included at the top of this prompt</div>
                  )}
                  <div className="pb-prompt-header">
                    <span>Generated Prompt — Copy and paste into any AI</span>
                    <div className="pb-prompt-tags">
                      <span className="ai-tag">ChatGPT</span>
                      <span className="ai-tag">Claude</span>
                      <span className="ai-tag">Gemini</span>
                    </div>
                  </div>
                  <pre className="pb-prompt-text" ref={promptRef}>{generatedPrompt}</pre>
                </div>
              )}
            </div>

            {/* Step 2 – JSON Template reference */}
            <div className="prompt-builder prompt-builder-template" style={{ marginTop: '16px' }}>
              <div className="pb-step-label">
                <span className="pb-step-badge step2">Step 2</span>
                <span className="pb-step-title">JSON Template</span>
                JSON Template (for reference — AI fills this for you)
                <button
                  className={`btn-copy-json ${jsonCopied ? 'copied' : ''}`}
                  onClick={handleCopyJson}
                >
                  {jsonCopied ? <><FiCheck /> Copied!</> : 'Copy Template'}
                </button>
              </div>
              <pre className="template-code">{currentTemplate}</pre>
            </div>

            {/* Step 3 – Paste AI response */}
            <div className="prompt-builder" style={{ marginTop: '16px' }}>
              <div className="pb-step-label">
                <span className="pb-step-badge step3">Step 3</span>
                Paste the AI-generated JSON below
              </div>
              <div className="paste-section">
                <textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="Paste the JSON returned by AI here..."
                  rows={12}
                  className="json-input"
                />
                {error && <div className="error-msg">{error}</div>}
                <button onClick={handleAdd} className="btn-submit"><FiPlus /> Add Question</button>
              </div>
            </div>

          </div>
        )}

        {/* Question Groups */}
        {loading ? (
          <Spinner label="Loading questions…" size={44} />
        ) : filtered.length === 0 && !showAdd ? (
          <p className="no-questions">No {activeTab.toUpperCase()} questions found.</p>
        ) : (
          <div className="questions-groups">

            {easyList.length > 0 && (
              <div className="difficulty-group">
                <div className="group-header group-easy">
                  <div className="group-header-left">
                    <span className="group-dot dot-easy" />
                    <span className="group-title">Easy Questions</span>
                  </div>
                  <span className="group-count">{easyList.length} question{easyList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="questions-list">
                  {easyList.map((p, i) => renderQuestionCard(p, i))}
                </div>
              </div>
            )}

            {mediumList.length > 0 && (
              <div className="difficulty-group">
                <div className="group-header group-medium">
                  <div className="group-header-left">
                    <span className="group-dot dot-medium" />
                    <span className="group-title">Medium Questions</span>
                  </div>
                  <span className="group-count">{mediumList.length} question{mediumList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="questions-list">
                  {mediumList.map((p, i) => renderQuestionCard(p, i))}
                </div>
              </div>
            )}

            {hardList.length > 0 && (
              <div className="difficulty-group">
                <div className="group-header group-hard">
                  <div className="group-header-left">
                    <span className="group-dot dot-hard" />
                    <span className="group-title">Hard Questions</span>
                  </div>
                  <span className="group-count">{hardList.length} question{hardList.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="questions-list">
                  {hardList.map((p, i) => renderQuestionCard(p, i))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </AdminSidebarLayout>
  )
}

export default QuestionsPage






