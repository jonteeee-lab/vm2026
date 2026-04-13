const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS predictions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      label TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sidebets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      stake INTEGER NOT NULL,
      creator_id INTEGER NOT NULL REFERENCES users(id),
      acceptor_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'open',
      winner_id INTEGER REFERENCES users(id),
      comment TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Default settings
  await pool.query(`
    INSERT INTO settings (key, value) VALUES
      ('pool_name', 'VM-Bettet 2026'),
      ('deadline', '2026-06-11T19:00:00Z'),
      ('locked', '0')
    ON CONFLICT (key) DO NOTHING
  `);
  // Ensure single results row
  const r = await pool.query('SELECT id FROM results LIMIT 1');
  if (r.rows.length === 0) {
    await pool.query("INSERT INTO results (data) VALUES ('{}')");
  }
  console.log('Database initialized');
}

async function run(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  await pool.query(pgSql, params);
}

async function all(sql, params = []) {
  let i = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++i}`);
  const res = await pool.query(pgSql, params);
  return res.rows;
}

async function get(sql, params = []) {
  const rows = await all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

module.exports = { initDb, run, all, get };
