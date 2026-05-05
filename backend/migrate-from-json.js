// One-shot migration: backend/data.json  →  PostgreSQL
// Run once with:  npm run migrate-from-json
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, initDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(__dirname, 'data.json');

async function main() {
  if (!fs.existsSync(JSON_PATH)) {
    console.log('No data.json found — nothing to migrate.');
    process.exit(0);
  }

  const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
  await initDb();

  let migratedUsers = 0, skippedUsers = 0;
  let migratedProjects = 0, skippedProjects = 0;

  for (const u of data.users || []) {
    const r = await pool.query(
      `INSERT INTO users (id, email, password, name, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [u.id, u.email, u.password, u.name || null, u.created_at]
    );
    if (r.rowCount > 0) migratedUsers++; else skippedUsers++;
  }

  for (const p of data.projects || []) {
    const r = await pool.query(
      `INSERT INTO projects (id, user_id, name, data, thumbnail, created_at, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [p.id, p.user_id, p.name, JSON.stringify(p.data), p.thumbnail || null, p.created_at, p.updated_at]
    );
    if (r.rowCount > 0) migratedProjects++; else skippedProjects++;
  }

  // Bump SERIAL sequences past the migrated IDs so future inserts don't collide.
  await pool.query(
    "SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM users), 1))"
  );
  await pool.query(
    "SELECT setval(pg_get_serial_sequence('projects', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM projects), 1))"
  );

  console.log(`✓ Migration complete.`);
  console.log(`  Users:    ${migratedUsers} migrated, ${skippedUsers} skipped (already present)`);
  console.log(`  Projects: ${migratedProjects} migrated, ${skippedProjects} skipped (already present)`);
  console.log(`  data.json kept intact — delete it manually once you've verified the migration.`);

  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
