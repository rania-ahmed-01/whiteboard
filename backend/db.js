// PostgreSQL store. Same API surface as the previous JSON store, but async.
import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/whiteboard';

export const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    name       TEXT,
    created_at BIGINT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    data       JSONB NOT NULL,
    thumbnail  TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_projects_user_updated
    ON projects(user_id, updated_at DESC);
`;

export async function initDb() {
  await pool.query(SCHEMA_SQL);
}

const now = () => Math.floor(Date.now() / 1000);

export const Users = {
  async findByEmail(email) {
    const { rows } = await pool.query(
      'SELECT id, email, password, name, created_at FROM users WHERE email = $1',
      [email]
    );
    return rows[0] || null;
  },
  async findById(id) {
    const { rows } = await pool.query(
      'SELECT id, email, password, name, created_at FROM users WHERE id = $1',
      [id]
    );
    return rows[0] || null;
  },
  async create({ email, password, name }) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, name, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, password, name, created_at`,
      [email, password, name || null, now()]
    );
    return rows[0];
  }
};

export const Projects = {
  async listByUser(userId) {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, thumbnail, created_at, updated_at
         FROM projects
        WHERE user_id = $1
        ORDER BY updated_at DESC`,
      [userId]
    );
    return rows;
  },
  async get(id, userId) {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, data, thumbnail, created_at, updated_at
         FROM projects
        WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0] || null;
  },
  async create({ user_id, name, data, thumbnail }) {
    const t = now();
    const { rows } = await pool.query(
      `INSERT INTO projects (user_id, name, data, thumbnail, created_at, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, $5, $5)
       RETURNING id, user_id, name, thumbnail, created_at, updated_at`,
      [user_id, name, JSON.stringify(data), thumbnail || null, t]
    );
    return rows[0];
  },
  async update(id, userId, fields) {
    // Build a partial update — only the fields that were provided.
    const sets = [];
    const params = [];
    let i = 1;
    if (fields.name != null) { sets.push(`name = $${i++}`); params.push(fields.name); }
    if (fields.data != null) { sets.push(`data = $${i++}::jsonb`); params.push(JSON.stringify(fields.data)); }
    if (fields.thumbnail != null) { sets.push(`thumbnail = $${i++}`); params.push(fields.thumbnail); }
    if (!sets.length) return true;
    sets.push(`updated_at = $${i++}`); params.push(now());
    params.push(id, userId);
    const { rowCount } = await pool.query(
      `UPDATE projects SET ${sets.join(', ')}
        WHERE id = $${i++} AND user_id = $${i++}`,
      params
    );
    return rowCount > 0;
  },
  async remove(id, userId) {
    const { rowCount } = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rowCount > 0;
  }
};

export default { Users, Projects, initDb, pool };
