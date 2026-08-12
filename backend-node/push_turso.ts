import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

async function main() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error('Error: DATABASE_URL and DATABASE_AUTH_TOKEN must be set in your .env file.');
    process.exit(1);
  }

  console.log(`Connecting to Turso database at ${url}...`);

  const client = createClient({
    url,
    authToken,
  });

  const sqlPath = path.join(__dirname, 'migrate.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

  // Split the file into separate statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  console.log(`Executing ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    try {
      await client.execute(statements[i]);
    } catch (e: any) {
      if (e.message && e.message.includes('already exists')) {
        // Ignore table already exists
      } else {
        console.error(`Error executing statement: ${statements[i]}`);
        console.error(e.message);
      }
    }
  }

  console.log('✅ Schema successfully pushed to Turso database!');
}

main().catch(console.error);
