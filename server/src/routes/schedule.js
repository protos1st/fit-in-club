const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/schedule/me — my recurring weekly schedule
router.get('/me', (req, res) => {
  const rows = db.prepare(
    'SELECT id, day_of_week, start_time, end_time FROM schedules WHERE user_id = ? ORDER BY day_of_week, start_time'
  ).all(req.user.id);
  res.json({ schedule: rows });
});

// PUT /api/schedule/me — replace my whole weekly schedule
// body: { slots: [{ day_of_week, start_time, end_time }, ...] }
router.put('/me', (req, res) => {
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

  const deleteAll = db.prepare('DELETE FROM schedules WHERE user_id = ?');
  const insert = db.prepare(
    'INSERT INTO schedules (user_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
  );

  const tx = db.transaction((slots) => {
    deleteAll.run(req.user.id);
    for (const s of slots) {
      insert.run(req.user.id, s.day_of_week, s.start_time, s.end_time);
    }
  });
  tx(slots);

  const rows = db.prepare(
    'SELECT id, day_of_week, start_time, end_time FROM schedules WHERE user_id = ? ORDER BY day_of_week, start_time'
  ).all(req.user.id);
  res.json({ schedule: rows });
});

// GET /api/schedule/overlap?day=1 — find members whose schedule overlaps mine on a given day
// If no day given, checks overlap across all days.
router.get('/overlap', (req, res) => {
  const mySlots = db.prepare(
    'SELECT day_of_week, start_time, end_time FROM schedules WHERE user_id = ?'
  ).all(req.user.id);

  if (mySlots.length === 0) {
    return res.json({ matches: [], note: 'Set your own schedule first to see overlaps.' });
  }

  const others = db.prepare(`
    SELECT s.id as schedule_id, s.day_of_week, s.start_time, s.end_time,
           u.id as user_id, u.name, u.training_type, u.bio
    FROM schedules s
    JOIN users u ON u.id = s.user_id
    WHERE u.id != ?
  `).all(req.user.id);

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

// --- Live "I'm at the gym now" status ---

const LIVE_STATUS_DURATION_HOURS = 2;

// POST /api/schedule/checkin
router.post('/checkin', (req, res) => {
  const now = new Date();
  const expires = new Date(now.getTime() + LIVE_STATUS_DURATION_HOURS * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO live_status (user_id, checked_in_at, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET checked_in_at = excluded.checked_in_at, expires_at = excluded.expires_at
  `).run(req.user.id, now.toISOString(), expires.toISOString());

  res.json({ checked_in_at: now.toISOString(), expires_at: expires.toISOString() });
});

// POST /api/schedule/checkout
router.post('/checkout', (req, res) => {
  db.prepare('DELETE FROM live_status WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// GET /api/schedule/live — everyone currently checked in (not expired)
router.get('/live', (req, res) => {
  const now = new Date().toISOString();
  const rows = db.prepare(`
    SELECT u.id as user_id, u.name, u.training_type, u.bio, l.checked_in_at, l.expires_at
    FROM live_status l
    JOIN users u ON u.id = l.user_id
    WHERE l.expires_at > ? AND u.id != ?
    ORDER BY l.checked_in_at DESC
  `).all(now, req.user.id);

  res.json({ live: rows });
});

// GET /api/schedule/my-status — am I currently checked in?
router.get('/my-status', (req, res) => {
  const now = new Date().toISOString();
  const row = db.prepare(
    'SELECT checked_in_at, expires_at FROM live_status WHERE user_id = ? AND expires_at > ?'
  ).get(req.user.id, now);
  res.json({ status: row || null });
});

module.exports = router;
