import 'dotenv/config';
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL!;
const authToken = process.env.DATABASE_AUTH_TOKEN;

const db = createClient({ url, authToken });

async function main() {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'");
  console.log('--- TURSO DATABASE TABLES STATUS ---');
  for (const row of tables.rows) {
    const tableName = row.name as string;
    const countRes = await db.execute(`SELECT COUNT(*) as c FROM "${tableName}"`);
    console.log(`Table: ${tableName.padEnd(35)} -> ${countRes.rows[0].c} records`);
  }
  db.close();
}

main().catch(console.error);
