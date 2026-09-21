import 'dotenv/config';
import prisma from './src/db/prisma';

const pythonProblemsData = [
  {
    id: 'py_leetcode_001_two_sum',
    title: 'Two Sum',
    language: 'python',
    difficulty: 'Easy',
    marks: 10,
    time_limit: 15,
    statement: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.',
    description: 'You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]',
    input_format: 'First line contains space-separated integers for nums. Second line contains the target integer.',
    output_format: 'Print a list containing the two 0-based indices.',
    sample_input: '2 7 11 15\n9',
    sample_output: '[0, 1]',
    starter_code: `def two_sum(nums, target):
    # Write your solution here
    pass`,
    test_cases_json: JSON.stringify([
      { input: '2 7 11 15\n9', expected_output: '[0, 1]' },
      { input: '3 2 4\n6', expected_output: '[1, 2]' },
      { input: '3 3\n6', expected_output: '[0, 1]' }
    ]),
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'py_leetcode_011_container_water',
    title: 'Container With Most Water',
    language: 'python',
    difficulty: 'Medium',
    marks: 20,
    time_limit: 20,
    statement: 'Given `n` non-negative integers `height` where each represents a point at coordinate `(i, height[i])`, find two lines that together with the x-axis form a container containing the most water.',
    description: 'Return the maximum amount of water a container can store.\n\nExample:\nInput: height = [1,8,6,2,5,4,8,3,7]\nOutput: 49',
    input_format: 'Single line of space-separated integers representing heights.',
    output_format: 'Print the maximum area as an integer.',
    sample_input: '1 8 6 2 5 4 8 3 7',
    sample_output: '49',
    starter_code: `def max_area(height):
    # Write your solution here
    pass`,
    test_cases_json: JSON.stringify([
      { input: '1 8 6 2 5 4 8 3 7', expected_output: '49' },
      { input: '1 1', expected_output: '1' },
      { input: '4 3 2 1 4', expected_output: '16' }
    ]),
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'py_leetcode_042_trapping_rain_water',
    title: 'Trapping Rain Water',
    language: 'python',
    difficulty: 'Hard',
    marks: 30,
    time_limit: 25,
    statement: 'Given `n` non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    description: 'Example:\nInput: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6',
    input_format: 'Single line of space-separated integers representing the elevation map.',
    output_format: 'Print total units of trapped rain water.',
    sample_input: '0 1 0 2 1 0 1 3 2 1 2 1',
    sample_output: '6',
    starter_code: `def trap(height):
    # Write your solution here
    pass`,
    test_cases_json: JSON.stringify([
      { input: '0 1 0 2 1 0 1 3 2 1 2 1', expected_output: '6' },
      { input: '4 2 0 3 2 5', expected_output: '9' }
    ]),
    is_active: 1,
    created_at: new Date().toISOString()
  }
];

const sqlProblemsData = [
  {
    id: 'sql_leetcode_1757_recyclable_low_fat',
    title: 'Recyclable and Low Fat Products',
    language: 'sql',
    difficulty: 'Easy',
    marks: 10,
    time_limit: 15,
    statement: 'Write a solution to find the IDs of products that are both low fat (`low_fats = "Y"`) and recyclable (`recyclable = "Y"`).',
    description: `Table: Products

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
Explanation: Only products 1 and 3 are both low fat and recyclable.`,
    input_format: 'Query the `Products` table.',
    output_format: 'Return product_id column in any order.',
    sample_input: null,
    sample_output: null,
    starter_code: `-- Write your SQL query here\n`,
    test_cases_json: JSON.stringify([
      {
        expected_output: [
          { product_id: 1 },
          { product_id: 3 }
        ]
      }
    ]),
    schema_sql: `CREATE TABLE Products (
  product_id INT PRIMARY KEY,
  low_fats VARCHAR(1),
  recyclable VARCHAR(1)
);`,
    seed_sql: `INSERT INTO Products VALUES (0, 'Y', 'N');
INSERT INTO Products VALUES (1, 'Y', 'Y');
INSERT INTO Products VALUES (2, 'N', 'Y');
INSERT INTO Products VALUES (3, 'Y', 'Y');
INSERT INTO Products VALUES (4, 'N', 'N');`,
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'sql_leetcode_176_second_highest_salary',
    title: 'Second Highest Salary',
    language: 'sql',
    difficulty: 'Medium',
    marks: 20,
    time_limit: 20,
    statement: 'Write a solution to find the second highest distinct salary from the `Employee` table. If there is no second highest salary, return `null`.',
    description: 'Table: Employee\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| id          | int     |\n| salary      | int     |\n+-------------+---------+',
    input_format: 'Query the `Employee` table.',
    output_format: 'Single column SecondHighestSalary.',
    sample_input: null,
    sample_output: null,
    starter_code: `-- Write your SQL query here\n`,
    test_cases_json: JSON.stringify([
      {
        expected_output: [
          { SecondHighestSalary: 200 }
        ]
      }
    ]),
    schema_sql: `CREATE TABLE Employee (
  id INT PRIMARY KEY,
  salary INT
);`,
    seed_sql: `INSERT INTO Employee VALUES (1, 100);
INSERT INTO Employee VALUES (2, 200);
INSERT INTO Employee VALUES (3, 300);`,
    is_active: 1,
    created_at: new Date().toISOString()
  },
  {
    id: 'sql_leetcode_185_dept_top_three_salaries',
    title: 'Department Top Three Salaries',
    language: 'sql',
    difficulty: 'Hard',
    marks: 30,
    time_limit: 25,
    statement: 'A company\'s executives are interested in seeing who earns the most money in each of the company\'s departments. A high earner in a department is an employee who has a salary in the top three unique salaries for that department. Write a solution to find the employees who are high earners in each department.',
    description: 'Table: Employee\n+--------------+---------+\n| Column Name  | Type    |\n+--------------+---------+\n| id           | int     |\n| name         | varchar |\n| salary       | int     |\n| departmentId | int     |\n+--------------+---------+\n\nTable: Department\n+-------------+---------+\n| Column Name | Type    |\n+-------------+---------+\n| id          | int     |\n| name        | varchar |\n+-------------+---------+',
    input_format: 'Join `Employee` and `Department` tables.',
    output_format: 'Columns: Department, Employee, Salary.',
    sample_input: null,
    sample_output: null,
    starter_code: `-- Write your SQL query here\n`,
    test_cases_json: JSON.stringify([
      {
        expected_output: [
          { Department: 'IT', Employee: 'Max', Salary: 90000 },
          { Department: 'IT', Employee: 'Joe', Salary: 85000 },
          { Department: 'IT', Employee: 'Randy', Salary: 85000 },
          { Department: 'IT', Employee: 'Will', Salary: 70000 },
          { Department: 'Sales', Employee: 'Henry', Salary: 80000 },
          { Department: 'Sales', Employee: 'Sam', Salary: 60000 }
        ]
      }
    ]),
    schema_sql: `CREATE TABLE Department (
  id INT PRIMARY KEY,
  name VARCHAR(50)
);
CREATE TABLE Employee (
  id INT PRIMARY KEY,
  name VARCHAR(50),
  salary INT,
  departmentId INT
);`,
    seed_sql: `INSERT INTO Department VALUES (1, 'IT'), (2, 'Sales');
INSERT INTO Employee VALUES (1, 'Joe', 85000, 1);
INSERT INTO Employee VALUES (2, 'Henry', 80000, 2);
INSERT INTO Employee VALUES (3, 'Sam', 60000, 2);
INSERT INTO Employee VALUES (4, 'Max', 90000, 1);
INSERT INTO Employee VALUES (5, 'Janet', 69000, 1);
INSERT INTO Employee VALUES (6, 'Randy', 85000, 1);
INSERT INTO Employee VALUES (7, 'Will', 70000, 1);`,
    is_active: 1,
    created_at: new Date().toISOString()
  }
];

async function seed() {
  console.log('Seeding into python_problems, sql_problems, and problems tables...');

  // Seed Python problems
  for (const prob of pythonProblemsData) {
    await prisma.pythonProblem.upsert({
      where: { id: prob.id },
      update: prob,
      create: prob
    });
    // Also save in problems table
    await prisma.problem.upsert({
      where: { id: prob.id },
      update: prob,
      create: prob
    });
    console.log(`✅ [Python] ${prob.difficulty}: ${prob.title} -> python_problems & problems`);
  }

  // Seed SQL problems
  for (const prob of sqlProblemsData) {
    await prisma.sqlProblem.upsert({
      where: { id: prob.id },
      update: prob,
      create: prob
    });
    // Also save in problems table
    await prisma.problem.upsert({
      where: { id: prob.id },
      update: prob,
      create: prob
    });
    console.log(`✅ [SQL] ${prob.difficulty}: ${prob.title} -> sql_problems & problems`);
  }

  console.log('🎉 Seeding complete!');
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
