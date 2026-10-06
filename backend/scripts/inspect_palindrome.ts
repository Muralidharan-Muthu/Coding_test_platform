import prisma from '../src/db/prisma';

async function main() {
  const problems = await prisma.pythonProblem.findMany();
  console.log('Total python problems:', problems.length);
  for (const p of problems) {
    if (p.title.toLowerCase().includes('palindrome') || (p.statement && p.statement.toLowerCase().includes('palindrome')) || (p.starter_code && p.starter_code.includes('solve'))) {
      console.log('=== Found Problem ===');
      console.log('ID:', p.id);
      console.log('Title:', p.title);
      console.log('Starter code:', p.starter_code);
      console.log('Test cases:', p.test_cases_json);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
