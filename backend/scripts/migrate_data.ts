import 'dotenv/config';
import { createClient } from '@libsql/client';

async function main() {
  console.log('Starting data migration from local SQLite to Turso using raw LibSQL clients...');

  // 1. Setup Local LibSQL Client
  const localDb = createClient({
    url: 'file:./prisma/db/coding_platform.sqlite',
  });

  // 2. Setup Turso LibSQL Client
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken || !url.startsWith('libsql://')) {
    console.error('Error: DATABASE_URL (libsql://) and DATABASE_AUTH_TOKEN must be set in .env');
    process.exit(1);
  }

  const tursoDb = createClient({ url, authToken });

  try {
    console.log('Connected to both databases successfully.');

    // Helper function to migrate a specific table
    const migrateTable = async (tableName: string, displayName: string) => {
      console.log(`Migrating ${displayName} (${tableName})...`);
      
      let records: any[] = [];
      try {
        const result = await localDb.execute(`SELECT * FROM ${tableName}`);
        records = result.rows;
      } catch (err: any) {
        if (err.message.includes('no such table')) {
          console.log(`  Table ${tableName} does not exist in local DB (skipping).`);
          return;
        }
        throw err;
      }

      if (records.length === 0) {
        console.log(`  No records found in ${displayName}.`);
        return;
      }

      console.log(`  Found ${records.length} records. Inserting to Turso...`);
      
      const columns = Object.keys(records[0]);
      // Wrap column names in double quotes to handle reserved words
      const columnsList = columns.map(col => `"${col}"`).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO "${tableName}" (${columnsList}) VALUES (${placeholders})`;

      let successCount = 0;
      let firstError = null;

      for (const record of records) {
        try {
          // Object.values(record) can sometimes be tricky if order isn't guaranteed,
          // but libSQL row objects maintain key order. Better to map explicitly:
          const args = columns.map(col => record[col]);
          
          await tursoDb.execute({ sql, args });
          successCount++;
        } catch (e: any) {
          // Ignore unique constraint violations, but log the first error if it's something else
          if (!firstError && !e.message?.includes('UNIQUE constraint failed')) {
            firstError = e.message || e;
          }
        }
      }

      console.log(`  ✅ Successfully migrated ${successCount}/${records.length} records in ${displayName}.`);
      if (firstError && successCount === 0) {
        console.error(`    -> First error encountered: ${firstError}`);
      }
    };

    // Migrate all tables matching exactly how they exist in Prisma @@map
    await migrateTable('users', 'Users');
    await migrateTable('auth_users', 'Auth Users');
    await migrateTable('candidate_otp', 'Candidates (OTPs)');
    await migrateTable('mcq_questions', 'MCQ Questions');
    await migrateTable('problems', 'Problems');
    await migrateTable('assessments', 'Assessments');
    await migrateTable('submissions', 'Submissions');
    await migrateTable('proctoring_logs', 'Proctoring Logs');
    await migrateTable('candidate_selected_exam_problems', 'Candidate Selected Problems');
    // Note: server_sessions and server_exam_sessions are new, no need to migrate them.

    console.log('\n🎉 All data migrated successfully to Turso!');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    localDb.close();
    tursoDb.close();
  }
}

main();
