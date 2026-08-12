import 'dotenv/config';
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function main() {
  console.log('Creating python_problems and sql_problems tables in Turso...');

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "python_problems" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "language" TEXT NOT NULL DEFAULT 'python',
      "difficulty" TEXT NOT NULL DEFAULT 'Medium',
      "marks" INTEGER NOT NULL DEFAULT 10,
      "time_limit" INTEGER NOT NULL DEFAULT 15,
      "statement" TEXT,
      "description" TEXT,
      "input_format" TEXT,
      "output_format" TEXT,
      "sample_input" TEXT,
      "sample_output" TEXT,
      "starter_code" TEXT,
      "test_cases_json" TEXT,
      "is_active" INTEGER NOT NULL DEFAULT 1,
      "created_at" TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS "sql_problems" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "language" TEXT NOT NULL DEFAULT 'sql',
      "difficulty" TEXT NOT NULL DEFAULT 'Medium',
      "marks" INTEGER NOT NULL DEFAULT 10,
      "time_limit" INTEGER NOT NULL DEFAULT 15,
      "statement" TEXT,
      "description" TEXT,
      "input_format" TEXT,
      "output_format" TEXT,
      "sample_input" TEXT,
      "sample_output" TEXT,
      "starter_code" TEXT,
      "test_cases_json" TEXT,
      "schema_sql" TEXT,
      "seed_sql" TEXT,
      "is_active" INTEGER NOT NULL DEFAULT 1,
      "created_at" TEXT NOT NULL
    );
  `);

  console.log('✅ Tables python_problems and sql_problems created successfully!');
  db.close();
}

main().catch(console.error);
