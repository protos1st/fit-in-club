const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/schedule/me
router.get('/me', async (req, res) => {
  const result = await pool.query(
    'SELECT id, day_of_week, start_time, end_time FROM schedules WHERE user_id = $1 ORDER BY day_of_week, start_time',
    [req.user.id]
  );
  res.json({ schedule: result.rows });
});

// PUT /api/schedule/me
router.put('/me', async (req, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots)) {
    return res.status(400).json({ error: 'slots must be an array' });
  }

  for (const s of slots) {
    if (
      typeof s.day_of_week !== 'number' || s.day_of_week < 0 || s.day_of_week > 6 ||
      !/^\d{2}:\d{2}$/.test(s.start_time) || !/^\d{2}:\d{2}$/.test(s.end_time)
    ) {
      return res.status(400).json({ error: 'Each slot needs day_of_week (0-6), start_time and end_time as HH:MM' });
    }
    if (s.start_time >= s.end_time) {
      return res.status(400).json({ error: 'start_time must be before end_time' });
    }
  }

  const MAX_SLOTS_PER_DAY = 2;
  for (let d = 0; d <= 6; d++) {
    const daySlots = slots.filter((s) => s.day_of_week === d);
    if (daySlots.length > MAX_SLOTS_PER_DAY) {
      return res.status(400).json({ error: `Maximum ${MAX_SLOTS_PER_DAY} time slots per day` });
    }
    for (let i = 0; i < daySlots.length; i++) {
      for (let j = i + 1; j < daySlots.length; j++) {
        if (daySlots[i].start_time < daySlots[j].end_time && daySlots[j].start_time < daySlots[i].end_time) {
          return res.status(400).json({ error: 'Time slots cannot overlap on the same day' });
        }
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM schedules WHERE user_id = $1', [req.user.id]);
    for (const s of slots) {
      await client.query(
        'INSERT INTO schedules (user_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4)',
        [req.user.id, s.day_of_week, s.start_time, s.end_time]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  const result = await pool.query(
    'SELECT id, day_of_week, start_time, end_time FROM schedules WHERE user_id = $1 ORDER BY day_of_week, start_time',
    [req.user.id]
  );
  res.json({ schedule: result.rows });
});

// GET /api/schedule/overlap
router.get('/overlap', async (req, res) => {
  const myResult = await pool.query(
    'SELECT day_of_week, start_time, end_time FROM schedules WHERE user_id = $1',
    [req.user.id]
  );
  const mySlots = myResult.rows;

  if (mySlots.length === 0) {
    return res.json({ matches: [], note: 'Set your own schedule first to see overlaps.' });
  }

  const othersResult = await pool.query(`
    SELECT s.id as schedule_id, s.day_of_week, s.start_time, s.end_time,
           u.id as user_id, u.name, u.training_type, u.bio
    FROM schedules s
    JOIN users u ON u.id = s.user_id
    WHERE u.id != $1
      AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = u.id) OR (blocker_id = u.id AND blocked_id = $1))
  `, [req.user.id]);
  const others = othersResult.rows;

  const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

  const matchesByUser = new Map();

  for (const mine of mySlots) {
    for (const theirs of others) {
      if (mine.day_of_week !== theirs.day_of_week) continue;
      if (!overlaps(mine.start_time, mine.end_time, theirs.start_time, theirs.end_time)) continue;

      if (!matchesByUser.has(theirs.user_id)) {
        matchesByUser.set(theirs.user_id, {
          user_id: theirs.user_id,
          name: theirs.name,
          training_type: theirs.training_type,
          bio: theirs.bio,
          overlapping_slots: []
        });
      }
      matchesByUser.get(theirs.user_id).overlapping_slots.push({
        day_of_week: theirs.day_of_week,
        start_time: theirs.start_time,
        end_time: theirs.end_time
      });
    }
  }

  res.json({ matches: Array.from(matchesByUser.values()) });
});

// --- Live status ---

const LIVE_STATUS_DURATION_HOURS = 1;

const VALID_STATUS_TAGS = ['Looking for a spotter', 'Open to join', 'Solo session', 'Cardio buddy wanted', ''];

// POST /api/schedule/checkin
router.post('/checkin', async (req, res) => {
  const now = new Date();
  const expires = new Date(now.getTime() + LIVE_STATUS_DURATION_HOURS * 60 * 60 * 1000);
  const statusTag = VALID_STATUS_TAGS.includes(req.body?.status_tag) ? req.body.status_tag : '';

  await pool.query(`
    INSERT INTO live_status (user_id, checked_in_at, expires_at, status_tag)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT(user_id) DO UPDATE SET checked_in_at = EXCLUDED.checked_in_at, expires_at = EXCLUDED.expires_at, status_tag = EXCLUDED.status_tag
  `, [req.user.id, now.toISOString(), expires.toISOString(), statusTag]);

  const today = now.toISOString().slice(0, 10);
  await pool.query(`
    INSERT INTO checkin_log (user_id, checked_in_at)
    SELECT $1, $2::timestamptz
    WHERE (SELECT COUNT(*) FROM checkin_log WHERE user_id = $1 AND checked_in_at::date = $3::date) < 2
  `, [req.user.id, now.toISOString(), today]);

  res.json({ checked_in_at: now.toISOString(), expires_at: expires.toISOString(), status_tag: statusTag });
});

// POST /api/schedule/checkout
router.post('/checkout', async (req, res) => {
  await pool.query('DELETE FROM live_status WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true });
});

// GET /api/schedule/live
router.get('/live', async (req, res) => {
  const now = new Date().toISOString();
  const result = await pool.query(`
    SELECT u.id as user_id, u.name, u.training_type, u.bio, u.gender, l.checked_in_at, l.expires_at, l.status_tag
    FROM live_status l
    JOIN users u ON u.id = l.user_id
    WHERE l.expires_at > $1 AND u.id != $2
      AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = $2 AND blocked_id = u.id) OR (blocker_id = u.id AND blocked_id = $2))
    ORDER BY l.checked_in_at DESC
  `, [now, req.user.id]);

  res.json({ live: result.rows });
});

// GET /api/schedule/my-status
router.get('/my-status', async (req, res) => {
  const now = new Date().toISOString();
  const result = await pool.query(
    'SELECT checked_in_at, expires_at, status_tag FROM live_status WHERE user_id = $1 AND expires_at > $2',
    [req.user.id, now]
  );
  res.json({ status: result.rows[0] || null });
});

// GET /api/schedule/leaderboard
router.get('/leaderboard', async (req, res) => {
  const result = await pool.query(`
    SELECT u.id as user_id, u.name, u.training_type, COUNT(cl.id)::int as checkins
    FROM checkin_log cl
    JOIN users u ON u.id = cl.user_id
    WHERE cl.checked_in_at >= NOW() - INTERVAL '7 days'
      AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = u.id) OR (blocker_id = u.id AND blocked_id = $1))
    GROUP BY u.id, u.name, u.training_type
    ORDER BY checkins DESC
    LIMIT 20
  `, [req.user.id]);
  res.json({ leaderboard: result.rows });
});

module.exports = router;
