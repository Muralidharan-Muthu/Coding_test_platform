import 'dotenv/config';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

async function main() {
  const url = process.env.DATABASE_URL!;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const db = createClient({ url, authToken });

  const email = 'muralidharanm@meptrasoftai.com';
  const password = 'admin@1234';
  const role = 'admin';
  const name = 'Muralidharan';
  const id = 'admin_muralidharan';

  const hash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  // Delete any existing admin with this email first
  await db.execute({
    sql: `DELETE FROM "auth_users" WHERE email = ?`,
    args: [email],
  });

  // Insert fresh
  await db.execute({
    sql: `INSERT INTO "auth_users" (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, email, hash, role, name, now],
  });

  console.log(`✅ Admin account created/updated:`);
  console.log(`   Email   : ${email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role    : ${role}`);

  db.close();
}

main().catch(console.error);
