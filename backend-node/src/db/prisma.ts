import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  throw new Error('DATABASE_URL is not set in your .env file');
}

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSql(libsql);

const prisma = new PrismaClient({ adapter });

export default prisma;

