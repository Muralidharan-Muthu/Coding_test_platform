import axios from 'axios';
import prisma from './db/prisma';

const API_BASE = 'http://localhost:8000';

interface TestResult {
  dimension: 'ADMIN' | 'PRACTICE' | 'PROCTORING' | 'EVALUATION' | 'ISOLATION';
  testName: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTest(
  dimension: TestResult['dimension'],
  testName: string,
  fn: () => Promise<void>
) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    results.push({ dimension, testName, passed: true, durationMs });
    console.log(`  [OK] [${dimension}] ${testName} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const errorMsg = err.response?.data?.detail || err.message || String(err);
    results.push({ dimension, testName, passed: false, durationMs, error: errorMsg, details: err.response?.data });
    console.error(`  [FAIL] [${dimension}] ${testName} (${durationMs}ms): ${errorMsg}`);
  }
}

async function main() {
  console.log('===============================================================');
  console.log('RUNNING COMPREHENSIVE 3-DIMENSIONAL END-TO-END TEST SUITE');
  console.log('===============================================================\n');

  let testPythonProbId = '';
  let testSqlProbId = '';
  let testExamSessionId = '';
  let candidateEmail = 'candidate_e2e_test@meptrasoft.com';
  let candidateName = 'E2E Test Candidate';

  // 1. ADMIN DIMENSION TESTS
  console.log('--- [1/5] Testing Admin Portal Dimension ---');

  await runTest('ADMIN', 'Admin Login Authentication', async () => {
    const res = await axios.post(`${API_BASE}/auth/admin-login`, {
      email: 'muralidharanm@meptrasoftai.com',
      password: 'admin@1234'
    });
    if (res.data.status !== 'success' || !res.data.name) throw new Error('Invalid login response');
  });

  await runTest('ADMIN', 'Registry Question Types Retrieval', async () => {
    const res = await axios.get(`${API_BASE}/admin/question-types`);
    if (!Array.isArray(res.data.types)) throw new Error('Expected array of types');
    const slugs = res.data.types.map((t: any) => t.slug);
    if (!slugs.includes('python') || !slugs.includes('sql') || !slugs.includes('mcq')) {
      throw new Error(`Missing system types: ${slugs.join(', ')}`);
    }
  });

  await runTest('ADMIN', 'Create Python 20-Testcase Problem via API', async () => {
    const testCases = Array.from({ length: 20 }, (_, i) => ({
      input: `[${i}, ${i + 1}, 0]\n2\n[${i + 2}]\n1`,
      expected_output: `[${i}, ${i + 1}, ${i + 2}]`
    }));

    const res = await axios.post(`${API_BASE}/admin/questions-by-type/python`, {
      title: `E2E Test Merge Problem ${Date.now()}`,
      language: 'python',
      difficulty: 'Easy',
      marks: 10,
      time_limit: 15,
      description: 'E2E test problem for automated validation.',
      input_format: 'Line 1: nums1\nLine 2: m\nLine 3: nums2\nLine 4: n',
      output_format: 'Merged sorted array.',
      sample_input: '[1, 2, 0]\n2\n[3]\n1',
      sample_output: '[1, 2, 3]',
      starter_code: 'class Solution:\n    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> List[int]:\n        pass',
      test_cases: testCases
    });

    if (!res.data.id && !res.data.question?.id) throw new Error('Problem ID not returned');
    testPythonProbId = res.data.id || res.data.question.id;
  });

  await runTest('ADMIN', 'Create SQL 20-Testcase Problem via API', async () => {
    const testCases = Array.from({ length: 20 }, () => ({
      expected_output: {
        columns: ['product_id'],
        rows: [['1'], ['4'], ['8']]
      }
    }));

    const res = await axios.post(`${API_BASE}/admin/questions-by-type/sql`, {
      title: `E2E Test SQL Problem ${Date.now()}`,
      language: 'sql',
      difficulty: 'Easy',
      marks: 10,
      time_limit: 10,
      description: 'E2E test SQL problem for automated validation.',
      sample_input: 'Products table',
      sample_output: 'product_id values',
      starter_code: "SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y';",
      schema_sql: "CREATE TABLE Products (product_id INTEGER PRIMARY KEY, low_fats TEXT, recyclable TEXT);",
      seed_sql: "INSERT INTO Products VALUES (1, 'Y', 'Y'), (2, 'Y', 'N'), (3, 'N', 'Y'), (4, 'Y', 'Y'), (8, 'Y', 'Y');",
      test_cases: testCases
    });

    if (!res.data.id && !res.data.question?.id) throw new Error('SQL Problem ID not returned');
    testSqlProbId = res.data.id || res.data.question.id;
  });

  // 2. EVALUATION DIMENSION TESTS (PYTHON & SQL)
  console.log('\n--- [2/5] Testing Universal Evaluation Engine ---');

  await runTest('EVALUATION', 'Python Multi-Param & In-Place Mutation (100% Pass)', async () => {
    const res = await axios.post(`${API_BASE}/admin/preview/submit`, {
      problem_id: testPythonProbId,
      code: `
class Solution:
    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> List[int]:
        p1 = m - 1
        p2 = n - 1
        p = m + n - 1
        while p2 >= 0:
            if p1 >= 0 and nums1[p1] > nums2[p2]:
                nums1[p] = nums1[p1]
                p1 -= 1
            else:
                nums1[p] = nums2[p2]
                p2 -= 1
            p -= 1
        return nums1
`
    });

    if (res.data.passed_tests !== 20 || res.data.score !== 100 || res.data.verdict !== 'Accepted') {
      throw new Error(`Expected 20/20 Accepted, got ${res.data.passed_tests}/${res.data.total_tests} (${res.data.verdict})`);
    }
  });

  await runTest('EVALUATION', 'Python Partial / Wrong Answer Precision', async () => {
    const res = await axios.post(`${API_BASE}/admin/preview/submit`, {
      problem_id: testPythonProbId,
      code: `
class Solution:
    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> List[int]:
        return [999, 999]
`
    });

    if (res.data.passed_tests !== 0 || res.data.verdict !== 'Failed') {
      throw new Error(`Expected 0/20 Failed, got ${res.data.passed_tests}/${res.data.total_tests}`);
    }
  });

  await runTest('EVALUATION', 'SQL 20-Testcase Multi-Row Output Evaluation (100% Pass)', async () => {
    const res = await axios.post(`${API_BASE}/admin/preview/sql-submit`, {
      problem_id: testSqlProbId,
      query: "SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y';"
    });

    if (res.data.passed_tests !== 20 || res.data.score !== 100 || res.data.verdict !== 'Accepted') {
      throw new Error(`Expected 20/20 Accepted, got ${res.data.passed_tests}/${res.data.total_tests} (${res.data.verdict})`);
    }
  });

  // 3. PRACTICE PORTAL DIMENSION TESTS
  console.log('\n--- [3/5] Testing Practice Portal Dimension ---');

  await runTest('PRACTICE', 'Practice Candidate Authentication', async () => {
    const res = await axios.post(`${API_BASE}/auth/candidate-login`, {
      email: 'candidate@meptrasoft.com',
      password: 'password'
    });
    if (res.data.status !== 'success' || !res.data.name) throw new Error('Practice login failed');
  });

  await runTest('PRACTICE', 'Real-Time Synchronization of Admin Problems in Practice Mode', async () => {
    const res = await axios.get(`${API_BASE}/admin/problems`);
    const allProbs = res.data.problems || res.data || [];
    const foundPy = allProbs.some((p: any) => p.id === testPythonProbId);
    const foundSql = allProbs.some((p: any) => p.id === testSqlProbId);
    if (!foundPy || !foundSql) {
      throw new Error('Admin created problems not visible in practice questions pool');
    }
  });

  await runTest('PRACTICE', 'Practice Code Run in Sandbox (Custom Stdin & Return Value)', async () => {
    const res = await axios.post(`${API_BASE}/run`, {
      code: `
class Solution:
    def solve(self, x: int) -> int:
        return x * 2
`,
      custom_input: '21'
    });

    if (res.data.status !== 'success' || String(res.data.return_value).trim() !== '42') {
      throw new Error(`Expected return_value 42, got ${res.data.return_value} (status: ${res.data.status})`);
    }
  });

  // 4. CANDIDATE PROCTORING EXAM DIMENSION TESTS
  console.log('\n--- [4/5] Testing Candidate Proctoring Exam Dimension ---');

  await runTest('PROCTORING', 'Generate and Verify Candidate Exam OTP', async () => {
    const otpRes = await axios.post(`${API_BASE}/admin/generate-otp`, {
      username: candidateName,
      email: candidateEmail
    });
    if (!otpRes.data.otp_code) throw new Error('OTP generation failed');

    const verifyRes = await axios.post(`${API_BASE}/auth/login`, {
      name: candidateName,
      email: candidateEmail,
      otp: otpRes.data.otp_code
    });
    if (!verifyRes.data.session_id) throw new Error('Session ID not returned on OTP verify');
    testExamSessionId = verifyRes.data.session_id;
  });

  await runTest('PROCTORING', 'Start Proctored Exam Session', async () => {
    const res = await axios.post(`${API_BASE}/exam/start`, {
      session_id: testExamSessionId
    });
    if (res.data.status !== 'active') throw new Error(`Expected active status, got ${res.data.status}`);
  });

  await runTest('PROCTORING', 'Enforce Tab-Switch Violation Penalty Tracking', async () => {
    const res = await axios.post(`${API_BASE}/exam/penalty`, {
      session_id: testExamSessionId,
      penalty_seconds: 60
    });
    if (res.data.status !== 'penalized') throw new Error(`Expected penalized status, got ${res.data.status}`);
  });

  await runTest('PROCTORING', 'Candidate Submits Exam Code & Persists to Database', async () => {
    const res = await axios.post(`${API_BASE}/submit`, {
      session_id: testExamSessionId,
      problem_id: testPythonProbId,
      code: `
class Solution:
    def merge(self, nums1: List[int], m: int, nums2: List[int], n: int) -> List[int]:
        p1 = m - 1
        p2 = n - 1
        p = m + n - 1
        while p2 >= 0:
            if p1 >= 0 and nums1[p1] > nums2[p2]:
                nums1[p] = nums1[p1]
                p1 -= 1
            else:
                nums1[p] = nums2[p2]
                p2 -= 1
            p -= 1
        return nums1
`,
      time_taken: 45
    });

    if (res.data.verdict !== 'Accepted' || res.data.score !== 100) {
      throw new Error(`Candidate submission failed evaluation: score=${res.data.score}, verdict=${res.data.verdict}`);
    }

    const subRecord = await prisma.submission.findFirst({
      where: { problem_id: testPythonProbId },
      orderBy: { id: 'desc' }
    });
    if (!subRecord || subRecord.score !== 100) {
      throw new Error('Submission record not found or score mismatch in DB');
    }
  });

  // 5. SESSION ISOLATION & CLEANUP TESTS
  console.log('\n--- [5/5] Testing Session Isolation & Cleanup ---');

  await runTest('ISOLATION', 'Ensure Practice Submissions Do Not Pollute Proctored Admin Results', async () => {
    const practiceSubRes = await axios.post(`${API_BASE}/submit`, {
      problem_id: testPythonProbId,
      code: 'class Solution: def merge(self, nums1, m, nums2, n): return nums1'
    });

    if (practiceSubRes.data.submission_id !== null) {
      throw new Error('Practice preview submission should not produce proctored submission ID');
    }
  });

  await runTest('ISOLATION', 'Clean Up E2E Temporary Test Problems & Sessions', async () => {
    if (testPythonProbId) {
      await prisma.adminResult.deleteMany({ where: { problem_id: testPythonProbId } });
      await prisma.submission.deleteMany({ where: { problem_id: testPythonProbId } });
      await prisma.pythonProblem.deleteMany({ where: { id: testPythonProbId } });
    }
    if (testSqlProbId) {
      await prisma.sqlProblem.deleteMany({ where: { id: testSqlProbId } });
    }
    if (testExamSessionId) {
      await prisma.serverExamSession.deleteMany({ where: { session_id: testExamSessionId } });
      await prisma.serverSession.deleteMany({ where: { id: testExamSessionId } });
      const testUser = await prisma.user.findUnique({ where: { email: candidateEmail } }); if (testUser) { await prisma.adminResult.deleteMany({ where: { user_id: testUser.id } }); await prisma.submission.deleteMany({ where: { user_id: testUser.id } }); } await prisma.candidateOtp.deleteMany({ where: { email: candidateEmail } });
      await prisma.user.deleteMany({ where: { email: candidateEmail } });
    }
  });

  // SUMMARY REPORT
  console.log('\n===============================================================');
  console.log('TEST EXECUTION SUMMARY REPORT');
  console.log('===============================================================');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed:         ${passed} / ${total} (${Math.round((passed / total) * 100)}%)`);
  console.log(`Failed:         ${failed} / ${total}`);

  if (failed > 0) {
    console.log('\nFailed Tests Details:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`- [${r.dimension}] ${r.testName}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\nALL 3 DIMENSIONS VERIFIED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal E2E error:', err);
  process.exit(1);
});