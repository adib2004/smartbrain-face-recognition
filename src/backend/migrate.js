const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Pool } = require('pg');

const MIGRATIONS = ['001_face_detection_usage', '002_users'];
const MIGRATION_LOCK_ID = '731904221';

async function importLegacyUsers(client) {
  const usersPath = process.env.USER_STORE_PATH || path.join(__dirname, 'users.json');
  let contents;
  try {
    contents = await fs.readFile(usersPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No legacy users.json found; skipped account import.');
      return;
    }
    throw error;
  }

  const users = JSON.parse(contents);
  if (!Array.isArray(users)) {
    throw new Error('Legacy user data must be a JSON array.');
  }

  let importedCount = 0;
  for (const [index, user] of users.entries()) {
    if (
      !user ||
      typeof user.id !== 'string' ||
      !user.id ||
      typeof user.name !== 'string' ||
      !user.name.trim() ||
      typeof user.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
      !Number.isInteger(user.entries) ||
      user.entries < 0 ||
      typeof user.joined !== 'string' ||
      !Number.isFinite(Date.parse(user.joined)) ||
      typeof user.passwordSalt !== 'string' ||
      !/^[0-9a-f]{32}$/i.test(user.passwordSalt) ||
      typeof user.passwordHash !== 'string' ||
      !/^[0-9a-f]{128}$/i.test(user.passwordHash)
    ) {
      throw new Error(`Legacy user record ${index + 1} has an invalid format.`);
    }

    const result = await client.query(
      `INSERT INTO users (id, name, email, entries, joined, password_salt, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [
        user.id,
        user.name,
        user.email.trim().toLowerCase(),
        user.entries,
        user.joined,
        user.passwordSalt,
        user.passwordHash.toLowerCase()
      ]
    );
    importedCount += result.rowCount;
  }

  console.log(`Imported ${importedCount} legacy account${importedCount === 1 ? '' : 's'}.`);
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be configured before running migrations.');
  }

  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
  let client;
  let lockAcquired = false;
  let transactionStarted = false;

  try {
    client = await pool.connect();
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    lockAcquired = true;
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_id TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    for (const migrationId of MIGRATIONS) {
      const applied = await client.query(
        'SELECT 1 FROM schema_migrations WHERE migration_id = $1',
        [migrationId]
      );
      if (applied.rowCount > 0) {
        console.log(`Migration ${migrationId} is already applied.`);
        continue;
      }

      const migrationPath = path.join(__dirname, 'migrations', `${migrationId}.sql`);
      await client.query(await fs.readFile(migrationPath, 'utf8'));
      if (migrationId === '002_users') {
        await importLegacyUsers(client);
      }
      await client.query('INSERT INTO schema_migrations (migration_id) VALUES ($1)', [migrationId]);
      console.log(`Applied migration ${migrationId}.`);
    }

    await client.query('COMMIT');
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    try {
      if (client && lockAcquired) {
        await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]);
      }
    } finally {
      client?.release();
      await pool.end();
    }
  }
}

migrate().catch((error) => {
  console.error('Database migration failed:', error);
  process.exitCode = 1;
});
