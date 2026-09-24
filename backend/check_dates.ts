import prisma from './src/db/prisma';

async function main() {
  const rows = await prisma.assessment.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      test_date: true,
      login_time: true,
      submit_time: true,
      created_at: true,
    }
  });
  console.log(JSON.stringify(rows, null, 2));
}

main().finally(() => prisma.$disconnect());
