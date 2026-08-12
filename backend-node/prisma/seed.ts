import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // 1. Seed Admin User
  const adminEmail = 'admin@codingplatform.com'; // Default admin email
  const adminExists = await prisma.authUser.findUnique({
    where: { email: adminEmail },
  });

  if (!adminExists) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.authUser.create({
      data: {
        id: 'admin_seed_1',
        email: adminEmail,
        password_hash: passwordHash,
        role: 'admin',
        name: 'System Admin',
        created_at: new Date().toISOString(),
      },
    });
    console.log(`Admin user seeded: ${adminEmail} / admin123`);
  } else {
    console.log('Admin user already exists.');
  }

  // 2. Seed MCQ Questions from JSON
  const seedFilePath = path.join(__dirname, 'db', 'mcq_seed_questions.json');
  if (fs.existsSync(seedFilePath)) {
    console.log('Found mcq_seed_questions.json, seeding questions...');
    const rawData = fs.readFileSync(seedFilePath, 'utf8');
    const questions = JSON.parse(rawData);

    let seededCount = 0;
    for (const q of questions) {
      const exists = await prisma.mCQQuestion.findUnique({
        where: { id: q.id },
      });

      if (!exists) {
        await prisma.mCQQuestion.create({
          data: {
            id: q.id,
            title: q.title || `Question ${q.id}`,
            question_text: q.question_text || q.question || '',
            option_a: q.option_a || q.options?.[0] || '',
            option_b: q.option_b || q.options?.[1] || '',
            option_c: q.option_c || q.options?.[2] || '',
            option_d: q.option_d || q.options?.[3] || '',
            correct_option: q.correct_option || ['a', 'b', 'c', 'd'][q.correct_answer] || 'a',
            question_title: q.question_title,
            question: q.question,
            options_json: q.options ? JSON.stringify(q.options) : null,
            correct_answer: q.correct_answer,
            difficulty: q.difficulty || 'easy',
            marks: q.marks || 10,
            time: q.time || 10,
            topic: q.topic || 'Python',
            explanation: q.explanation || '',
            created_at: q.created_at || new Date().toISOString(),
          },
        });
        seededCount++;
      }
    }
    console.log(`Seeded ${seededCount} new MCQ questions.`);
  } else {
    console.log('No mcq_seed_questions.json found. Skipping MCQ seeding.');
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
