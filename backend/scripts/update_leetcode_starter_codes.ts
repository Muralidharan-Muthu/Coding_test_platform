import 'dotenv/config';
import prisma from './src/db/prisma';

async function updateStarterCodes() {
  console.log('Updating python_problems in Turso to use clean LeetCode starter codes...');

  await prisma.pythonProblem.update({
    where: { id: 'py_leetcode_001_two_sum' },
    data: {
      starter_code: `def two_sum(nums, target):\n    # Write your solution here\n    pass`
    }
  });

  await prisma.pythonProblem.update({
    where: { id: 'py_leetcode_011_container_water' },
    data: {
      starter_code: `def max_area(height):\n    # Write your solution here\n    pass`
    }
  });

  await prisma.pythonProblem.update({
    where: { id: 'py_leetcode_042_trapping_rain_water' },
    data: {
      starter_code: `def trap(height):\n    # Write your solution here\n    pass`
    }
  });

  console.log('✅ Turso python_problems starter codes updated successfully!');
}

updateStarterCodes().catch((err) => {
  console.error(err);
  process.exit(1);
});
