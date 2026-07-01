const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      training_type TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS live_status (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      checked_in_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buddy_requests (
      id SERIAL PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      responded_at TIMESTAMPTZ,
      UNIQUE(from_user_id, to_user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS blocks (
      id SERIAL PRIMARY KEY,
      blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(blocker_id, blocked_id)
    );

    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reported_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS membership TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS workout_frequency TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS buddy_preference TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;

    CREATE INDEX IF NOT EXISTS idx_schedules_user ON schedules(user_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_day ON schedules(day_of_week);
    CREATE INDEX IF NOT EXISTS idx_requests_to ON buddy_requests(to_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_requests_from ON buddy_requests(from_user_id, status);
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(from_user_id, to_user_id);

    ALTER TABLE live_status ADD COLUMN IF NOT EXISTS status_tag TEXT DEFAULT '';

    CREATE TABLE IF NOT EXISTS checkin_log (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_checkin_log_user ON checkin_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_checkin_log_time ON checkin_log(checked_in_at);

    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

    UPDATE users
    SET training_type = regexp_replace(
      regexp_replace(trim(training_type), '\s*\+\s*', ', ', 'g'),
      ',\s*,', ',', 'g'
    )
    WHERE training_type ~ '\+';
  `);
}

module.exports = { pool, initDb };
