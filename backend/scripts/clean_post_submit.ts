import prisma from '../src/db/prisma';

async function main() {
  const assessment = await prisma.assessment.findFirst({ where: { id: 75 } });
  if (assessment && assessment.submit_time) {
    const deleted = await prisma.proctoringLog.deleteMany({
      where: {
        candidate_id: '10',
        timestamp: { gt: new Date(assessment.submit_time) }
      }
    });
    console.log('Cleaned up post-submission false positive logs:', deleted.count);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
