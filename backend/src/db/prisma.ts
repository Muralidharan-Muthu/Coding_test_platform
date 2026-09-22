import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  throw new Error('DATABASE_URL is not set in backend/.env file.');
}

// In Prisma 7, PrismaLibSql accepts the config object { url, authToken } directly
const adapter = new PrismaLibSql({ url, authToken });
const prisma = new PrismaClient({ adapter });

export default prisma;
