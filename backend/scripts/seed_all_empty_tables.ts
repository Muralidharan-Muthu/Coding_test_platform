import 'dotenv/config';
import prisma from '../src/db/prisma';

async function seedEmptyTables() {
  console.log('🌱 Starting 5-record sample seed for all empty tables in Turso...\n');

  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  // 1. Seed Users (5 records)
  console.log('1. Seeding Users (5 records)...');
  const userSeeds = [
    { name: 'Aarav Sharma', email: 'aarav.sharma@example.com', test_location: 'Chennai Office', created_at: now },
    { name: 'Bhavna Patel', email: 'bhavna.patel@example.com', test_location: 'Bangalore Tech Park', created_at: now },
    { name: 'Chetan Kumar', email: 'chetan.kumar@example.com', test_location: 'Hyderabad Hub', created_at: now },
    { name: 'Deepika Rao', email: 'deepika.rao@example.com', test_location: 'Remote - India', created_at: now },
    { name: 'Eshwar Verma', email: 'eshwar.verma@example.com', test_location: 'Mumbai Tech Hub', created_at: now }
  ];

  const createdUsers = [];
  for (const u of userSeeds) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u
    });
    createdUsers.push(created);
  }
  console.log(`   ✅ Seeded ${createdUsers.length} Users`);

  // 2. Seed Candidate OTPO (5 records)
  console.log('2. Seeding Candidate OTPs (5 records)...');
  const otpSeeds = [
    { username: 'aarav.s', email: 'aarav.sharma@example.com', otp_code: '482910', expires_at: expires, created_at: now, sent: 1, status: 'used', test_type: 'both' },
    { username: 'bhavna.p', email: 'bhavna.patel@example.com', otp_code: '918234', expires_at: expires, created_at: now, sent: 1, status: 'used', test_type: 'python' },
    { username: 'chetan.k', email: 'chetan.kumar@example.com', otp_code: '102938', expires_at: expires, created_at: now, sent: 1, status: 'unused', test_type: 'sql' },
    { username: 'deepika.r', email: 'deepika.rao@example.com', otp_code: '573829', expires_at: expires, created_at: now, sent: 1, status: 'unused', test_type: 'mcq' },
    { username: 'eshwar.v', email: 'eshwar.verma@example.com', otp_code: '384720', expires_at: expires, created_at: now, sent: 0, status: 'unused', test_type: 'both' }
  ];

  for (const o of otpSeeds) {
    await prisma.candidateOtp.create({ data: o });
  }
  console.log('   ✅ Seeded 5 Candidate OTPs');

  // 3. Seed Custom Problems (5 records)
  console.log('3. Seeding Custom Problems (5 records)...');
  const customProbSeeds = [
    {
      id: 'cust_py_01',
      title: 'Palindrome Number Check',
      language: 'python',
      difficulty: 'Easy',
      marks: 10,
      time_limit: 15,
      statement: 'Determine whether an integer is a palindrome.',
      description: 'An integer is a palindrome when it reads the same backward as forward.',
      input_format: 'Single integer x.',
      output_format: 'True or False.',
      sample_input: '121',
      sample_output: 'True',
      starter_code: 'x = int(input())\nprint(str(x) == str(x)[::-1])',
      test_cases_json: JSON.stringify([{ input: '121', expected_output: 'True' }, { input: '-121', expected_output: 'False' }]),
      created_at: now
    },
    {
      id: 'cust_py_02',
      title: 'Fibonacci N-th Term',
      language: 'python',
      difficulty: 'Medium',
      marks: 20,
      time_limit: 20,
      statement: 'Compute the N-th Fibonacci number modulo 10^9+7.',
      description: 'The Fibonacci numbers are defined by F(0)=0, F(1)=1, and F(N)=F(N-1)+F(N-2).',
      input_format: 'Single integer N.',
      output_format: 'Single integer representing F(N).',
      sample_input: '10',
      sample_output: '55',
      starter_code: 'def fib(n):\n    # implement fibonacci\n    pass',
      test_cases_json: JSON.stringify([{ input: '10', expected_output: '55' }]),
      created_at: now
    },
    {
      id: 'cust_sql_01',
      title: 'Employees Earning More Than Managers',
      language: 'sql',
      difficulty: 'Easy',
      marks: 10,
      time_limit: 15,
      statement: 'Find employees who earn more than their direct manager.',
      description: 'Table Employee (id, name, salary, managerId).',
      input_format: 'Query the Employee table.',
      output_format: 'Employee name column.',
      sample_input: null,
      sample_output: null,
      starter_code: '-- Write your SQL query here\n',
      schema_sql: 'CREATE TABLE Employee (id INT, name VARCHAR(50), salary INT, managerId INT);',
      seed_sql: 'INSERT INTO Employee VALUES (1, "Joe", 70000, 3), (2, "Henry", 80000, 4), (3, "Sam", 60000, NULL), (4, "Max", 90000, NULL);',
      test_cases_json: JSON.stringify([{ expected_output: [{ Employee: 'Joe' }] }]),
      created_at: now
    },
    {
      id: 'cust_sql_02',
      title: 'Customers Who Never Order',
      language: 'sql',
      difficulty: 'Easy',
      marks: 10,
      time_limit: 15,
      statement: 'Find all customers who never ordered anything.',
      description: 'Tables Customers (id, name) and Orders (id, customerId).',
      input_format: 'Query Customers and Orders tables.',
      output_format: 'Customers name column.',
      sample_input: null,
      sample_output: null,
      starter_code: '-- Write your SQL query here\n',
      schema_sql: 'CREATE TABLE Customers (id INT, name VARCHAR(50)); CREATE TABLE Orders (id INT, customerId INT);',
      seed_sql: 'INSERT INTO Customers VALUES (1, "Joe"), (2, "Henry"), (3, "Sam"), (4, "Max"); INSERT INTO Orders VALUES (1, 3), (2, 1);',
      test_cases_json: JSON.stringify([{ expected_output: [{ Customers: 'Henry' }, { Customers: 'Max' }] }]),
      created_at: now
    },
    {
      id: 'cust_py_03',
      title: 'Valid Anagram Check',
      language: 'python',
      difficulty: 'Easy',
      marks: 10,
      time_limit: 15,
      statement: 'Given two strings s and t, return True if t is an anagram of s.',
      description: 'An anagram is formed by rearranging letters of a word using all original letters exactly once.',
      input_format: 'Two lines, s and t.',
      output_format: 'True or False.',
      sample_input: 'anagram\nagaram',
      sample_output: 'True',
      starter_code: 's = input().strip()\nt = input().strip()\nprint(sorted(s) == sorted(t))',
      test_cases_json: JSON.stringify([{ input: 'anagram\nagaram', expected_output: 'True' }, { input: 'rat\ncar', expected_output: 'False' }]),
      created_at: now
    }
  ];

  for (const cp of customProbSeeds) {
    await prisma.customProblem.upsert({
      where: { id: cp.id },
      update: cp,
      create: cp
    });
  }
  console.log('   ✅ Seeded 5 Custom Problems');

  // 4. Seed Selected Exam Problems (5 records)
  console.log('4. Seeding Selected Exam Problems (5 records)...');
  const selProbSeeds = [
    { problem_id: 'py_leetcode_001_two_sum', language: 'python', difficulty: 'Easy', marks: 10, time_limit: 15, title: 'Two Sum', saved_at: now },
    { problem_id: 'py_leetcode_011_container_water', language: 'python', difficulty: 'Medium', marks: 20, time_limit: 20, title: 'Container With Most Water', saved_at: now },
    { problem_id: 'sql_leetcode_1757_recyclable_low_fat', language: 'sql', difficulty: 'Easy', marks: 10, time_limit: 15, title: 'Recyclable and Low Fat Products', saved_at: now },
    { problem_id: 'sql_leetcode_176_second_highest_salary', language: 'sql', difficulty: 'Medium', marks: 20, time_limit: 20, title: 'Second Highest Salary', saved_at: now },
    { problem_id: 'py_leetcode_042_trapping_rain_water', language: 'python', difficulty: 'Hard', marks: 30, time_limit: 25, title: 'Trapping Rain Water', saved_at: now }
  ];

  for (const sp of selProbSeeds) {
    await prisma.selectedExamProblem.upsert({
      where: { problem_id: sp.problem_id },
      update: sp,
      create: sp
    });
  }
  console.log('   ✅ Seeded 5 Selected Exam Problems');

  // 5. Seed Candidate Selected Exam Problems (5 records)
  console.log('5. Seeding Candidate Selected Exam Problems (5 records)...');
  const candSelProbSeeds = [
    { candidate_email: 'aarav.sharma@example.com', problem_id: 'py_leetcode_001_two_sum', language: 'python', difficulty: 'Easy', marks: 10, time_limit: 15, title: 'Two Sum', saved_at: now },
    { candidate_email: 'aarav.sharma@example.com', problem_id: 'sql_leetcode_1757_recyclable_low_fat', language: 'sql', difficulty: 'Easy', marks: 10, time_limit: 15, title: 'Recyclable and Low Fat Products', saved_at: now },
    { candidate_email: 'bhavna.patel@example.com', problem_id: 'py_leetcode_011_container_water', language: 'python', difficulty: 'Medium', marks: 20, time_limit: 20, title: 'Container With Most Water', saved_at: now },
    { candidate_email: 'chetan.kumar@example.com', problem_id: 'sql_leetcode_176_second_highest_salary', language: 'sql', difficulty: 'Medium', marks: 20, time_limit: 20, title: 'Second Highest Salary', saved_at: now },
    { candidate_email: 'deepika.rao@example.com', problem_id: 'py_leetcode_042_trapping_rain_water', language: 'python', difficulty: 'Hard', marks: 30, time_limit: 25, title: 'Trapping Rain Water', saved_at: now }
  ];

  for (const csp of candSelProbSeeds) {
    await prisma.candidateSelectedExamProblem.create({ data: csp });
  }
  console.log('   ✅ Seeded 5 Candidate Selected Exam Problems');

  // 6. Seed Submissions (5 records)
  console.log('6. Seeding Submissions (5 records)...');
  const subSeeds = [
    { user_id: createdUsers[0].id, problem_id: 'py_leetcode_001_two_sum', code: 'def two_sum(nums, target):\n    lookup = {}\n    for i, num in enumerate(nums):\n        if target - num in lookup:\n            return [lookup[target - num], i]\n        lookup[num] = i', passed_tests: 3, total_tests: 3, score: 100.0, verdict: 'Accepted', execution_time_ms: 24.5, time_taken: 360, created_at: now },
    { user_id: createdUsers[1].id, problem_id: 'py_leetcode_011_container_water', code: 'def max_area(height):\n    l, r = 0, len(height)-1\n    ans = 0\n    while l < r:\n        ans = max(ans, (r-l)*min(height[l], height[r]))\n        if height[l] < height[r]: l += 1\n        else: r -= 1\n    return ans', passed_tests: 3, total_tests: 3, score: 100.0, verdict: 'Accepted', execution_time_ms: 32.1, time_taken: 480, created_at: now },
    { user_id: createdUsers[2].id, problem_id: 'sql_leetcode_1757_recyclable_low_fat', code: 'SELECT product_id FROM Products WHERE low_fats = "Y" AND recyclable = "Y";', passed_tests: 1, total_tests: 1, score: 100.0, verdict: 'Accepted', execution_time_ms: 12.0, time_taken: 180, created_at: now },
    { user_id: createdUsers[3].id, problem_id: 'sql_leetcode_176_second_highest_salary', code: 'SELECT (SELECT DISTINCT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET 1) AS SecondHighestSalary;', passed_tests: 1, total_tests: 1, score: 100.0, verdict: 'Accepted', execution_time_ms: 14.2, time_taken: 240, created_at: now },
    { user_id: createdUsers[4].id, problem_id: 'py_leetcode_042_trapping_rain_water', code: '# Incomplete solution\ndef trap(height):\n    return sum(height)', passed_tests: 0, total_tests: 2, score: 0.0, verdict: 'Wrong Answer', execution_time_ms: 18.0, time_taken: 600, created_at: now }
  ];

  const createdSubmissions = [];
  for (const s of subSeeds) {
    const created = await prisma.submission.create({ data: s });
    createdSubmissions.push(created);
  }
  console.log(`   ✅ Seeded ${createdSubmissions.length} Submissions`);

  // 7. Seed Admin Results (5 records)
  console.log('7. Seeding Admin Results (5 records)...');
  const adminResSeeds = [
    { user_id: createdUsers[0].id, name: createdUsers[0].name, email: createdUsers[0].email, problem_id: 'py_leetcode_001_two_sum', best_score: 100.0, passed_tests: 3, total_tests: 3, best_submission_id: createdSubmissions[0].id, verdict: 'Good', execution_time_ms: 24.5, time_taken: 360, updated_at: now },
    { user_id: createdUsers[1].id, name: createdUsers[1].name, email: createdUsers[1].email, problem_id: 'py_leetcode_011_container_water', best_score: 100.0, passed_tests: 3, total_tests: 3, best_submission_id: createdSubmissions[1].id, verdict: 'Good', execution_time_ms: 32.1, time_taken: 480, updated_at: now },
    { user_id: createdUsers[2].id, name: createdUsers[2].name, email: createdUsers[2].email, problem_id: 'sql_leetcode_1757_recyclable_low_fat', best_score: 100.0, passed_tests: 1, total_tests: 1, best_submission_id: createdSubmissions[2].id, verdict: 'Good', execution_time_ms: 12.0, time_taken: 180, updated_at: now },
    { user_id: createdUsers[3].id, name: createdUsers[3].name, email: createdUsers[3].email, problem_id: 'sql_leetcode_176_second_highest_salary', best_score: 100.0, passed_tests: 1, total_tests: 1, best_submission_id: createdSubmissions[3].id, verdict: 'Good', execution_time_ms: 14.2, time_taken: 240, updated_at: now },
    { user_id: createdUsers[4].id, name: createdUsers[4].name, email: createdUsers[4].email, problem_id: 'py_leetcode_042_trapping_rain_water', best_score: 0.0, passed_tests: 0, total_tests: 2, best_submission_id: createdSubmissions[4].id, verdict: 'Below Average', execution_time_ms: 18.0, time_taken: 600, updated_at: now }
  ];

  for (const ar of adminResSeeds) {
    await prisma.adminResult.create({ data: ar });
  }
  console.log('   ✅ Seeded 5 Admin Results');

  // 8. Seed Assessments (5 records)
  console.log('8. Seeding Assessments (5 records)...');
  const assessSeeds = [
    {
      user_id: createdUsers[0].id, candidate_id: 'CAND_101', name: createdUsers[0].name, email: createdUsers[0].email, phone: '+91 9876543210', test_location: 'Chennai Office', test_date: '2026-08-12', login_time: '10:00 AM', submit_time: '10:45 AM', submission_type: 'Manual', time_taken_min: 45, total_questions: 5, python_questions: 2, sql_questions: 1, mcq_questions: 2, python_score: 30.0, sql_score: 10.0, mcq_score: 20.0, overall_score: 60.0, max_possible_score: 70.0, overall_percentage: 85.71, overall_verdict: 'Good', problem_testcases_json: '{}', problem_scores_json: '{}', created_at: now
    },
    {
      user_id: createdUsers[1].id, candidate_id: 'CAND_102', name: createdUsers[1].name, email: createdUsers[1].email, phone: '+91 9876543211', test_location: 'Bangalore Tech Park', test_date: '2026-08-12', login_time: '11:00 AM', submit_time: '11:50 AM', submission_type: 'Manual', time_taken_min: 50, total_questions: 5, python_questions: 2, sql_questions: 1, mcq_questions: 2, python_score: 30.0, sql_score: 10.0, mcq_score: 20.0, overall_score: 60.0, max_possible_score: 70.0, overall_percentage: 85.71, overall_verdict: 'Good', problem_testcases_json: '{}', problem_scores_json: '{}', created_at: now
    },
    {
      user_id: createdUsers[2].id, candidate_id: 'CAND_103', name: createdUsers[2].name, email: createdUsers[2].email, phone: '+91 9876543212', test_location: 'Hyderabad Hub', test_date: '2026-08-12', login_time: '02:00 PM', submit_time: '02:40 PM', submission_type: 'Manual', time_taken_min: 40, total_questions: 4, python_questions: 1, sql_questions: 1, mcq_questions: 2, python_score: 10.0, sql_score: 20.0, mcq_score: 20.0, overall_score: 50.0, max_possible_score: 60.0, overall_percentage: 83.33, overall_verdict: 'Good', problem_testcases_json: '{}', problem_scores_json: '{}', created_at: now
    },
    {
      user_id: createdUsers[3].id, candidate_id: 'CAND_104', name: createdUsers[3].name, email: createdUsers[3].email, phone: '+91 9876543213', test_location: 'Remote - India', test_date: '2026-08-12', login_time: '03:00 PM', submit_time: '03:55 PM', submission_type: 'Auto', time_taken_min: 55, total_questions: 4, python_questions: 1, sql_questions: 1, mcq_questions: 2, python_score: 10.0, sql_score: 20.0, mcq_score: 10.0, overall_score: 40.0, max_possible_score: 60.0, overall_percentage: 66.67, overall_verdict: 'Average', problem_testcases_json: '{}', problem_scores_json: '{}', created_at: now
    },
    {
      user_id: createdUsers[4].id, candidate_id: 'CAND_105', name: createdUsers[4].name, email: createdUsers[4].email, phone: '+91 9876543214', test_location: 'Mumbai Tech Hub', test_date: '2026-08-12', login_time: '04:00 PM', submit_time: '04:30 PM', submission_type: 'Auto', time_taken_min: 30, total_questions: 4, python_questions: 1, sql_questions: 1, mcq_questions: 2, python_score: 0.0, sql_score: 10.0, mcq_score: 10.0, overall_score: 20.0, max_possible_score: 60.0, overall_percentage: 33.33, overall_verdict: 'Below Average', problem_testcases_json: '{}', problem_scores_json: '{}', created_at: now
    }
  ];

  for (const ass of assessSeeds) {
    await prisma.assessment.create({ data: ass });
  }
  console.log('   ✅ Seeded 5 Assessments');

  // 9. Seed Proctoring Logs (5 records)
  console.log('9. Seeding Proctoring Logs (5 records)...');
  const procSeeds = [
    { exam_id: 'EXAM_2026_01', candidate_id: 'CAND_101', violation_type: 'Tab Switch', message: 'Switched browser tab for 4 seconds', timestamp: new Date() },
    { exam_id: 'EXAM_2026_01', candidate_id: 'CAND_102', violation_type: 'Copy Paste', message: 'Pasted external snippet into editor', timestamp: new Date() },
    { exam_id: 'EXAM_2026_02', candidate_id: 'CAND_103', violation_type: 'Window Focus Lost', message: 'Focus moved to external application', timestamp: new Date() },
    { exam_id: 'EXAM_2026_02', candidate_id: 'CAND_104', violation_type: 'Full Screen Exit', message: 'Exited full screen mode', timestamp: new Date() },
    { exam_id: 'EXAM_2026_03', candidate_id: 'CAND_105', violation_type: 'Multiple Faces Detected', message: 'Second person appeared in camera feed', timestamp: new Date() }
  ];

  for (const pl of procSeeds) {
    await prisma.proctoringLog.create({ data: pl });
  }
  console.log('   ✅ Seeded 5 Proctoring Logs');

  // 10. Seed Server Sessions (5 records)
  console.log('10. Seeding Server Sessions (5 records)...');
  const sessSeeds = [
    { id: 'sess_token_101', candidate_email: 'aarav.sharma@example.com', user_id: String(createdUsers[0].id), test_type: 'both', start_time: new Date(), expires_at: new Date(Date.now() + 3600000), is_active: true },
    { id: 'sess_token_102', candidate_email: 'bhavna.patel@example.com', user_id: String(createdUsers[1].id), test_type: 'python', start_time: new Date(), expires_at: new Date(Date.now() + 3600000), is_active: true },
    { id: 'sess_token_103', candidate_email: 'chetan.kumar@example.com', user_id: String(createdUsers[2].id), test_type: 'sql', start_time: new Date(), expires_at: new Date(Date.now() + 3600000), is_active: true },
    { id: 'sess_token_104', candidate_email: 'deepika.rao@example.com', user_id: String(createdUsers[3].id), test_type: 'mcq', start_time: new Date(), expires_at: new Date(Date.now() + 3600000), is_active: true },
    { id: 'sess_token_105', candidate_email: 'eshwar.verma@example.com', user_id: String(createdUsers[4].id), test_type: 'both', start_time: new Date(), expires_at: new Date(Date.now() + 3600000), is_active: true }
  ];

  for (const ss of sessSeeds) {
    await prisma.serverSession.upsert({
      where: { id: ss.id },
      update: ss,
      create: ss
    });
  }
  console.log('   ✅ Seeded 5 Server Sessions');

  // 11. Seed Server Exam Sessions (5 records)
  console.log('11. Seeding Server Exam Sessions (5 records)...');
  const examSessSeeds = [
    { id: 'exam_sess_101', session_id: 'sess_token_101', user_id: String(createdUsers[0].id), start_time: new Date(), answers_json: '{"py_leetcode_001_two_sum":"def two_sum()..."}', is_completed: true },
    { id: 'exam_sess_102', session_id: 'sess_token_102', user_id: String(createdUsers[1].id), start_time: new Date(), answers_json: '{"py_leetcode_011_container_water":"def max_area()..."}', is_completed: true },
    { id: 'exam_sess_103', session_id: 'sess_token_103', user_id: String(createdUsers[2].id), start_time: new Date(), answers_json: '{"sql_leetcode_1757_recyclable_low_fat":"SELECT..."}', is_completed: false },
    { id: 'exam_sess_104', session_id: 'sess_token_104', user_id: String(createdUsers[3].id), start_time: new Date(), answers_json: '{"mcq_001":1}', is_completed: false },
    { id: 'exam_sess_105', session_id: 'sess_token_105', user_id: String(createdUsers[4].id), start_time: new Date(), answers_json: '{}', is_completed: false }
  ];

  for (const es of examSessSeeds) {
    await prisma.serverExamSession.upsert({
      where: { session_id: es.session_id },
      update: es,
      create: es
    });
  }
  console.log('   ✅ Seeded 5 Server Exam Sessions');

  console.log('\n🎉 ALL EMPTY TABLES HAVE BEEN SUCCESSFULLY SEEDED WITH 5 SAMPLE RECORDS EACH!');
}

seedEmptyTables().catch(err => {
  console.error('Seeding empty tables error:', err);
  process.exit(1);
});
