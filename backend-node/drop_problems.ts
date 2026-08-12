import 'dotenv/config';
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function main() {
  console.log('Dropping problems table from Turso...');
  await db.execute('DROP TABLE IF EXISTS "problems"');
  console.log('✅ Table "problems" dropped successfully!');
  db.close();
}

main().catch(console.error);
