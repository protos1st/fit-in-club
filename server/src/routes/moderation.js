const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

function validId(v) { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; }

// POST /api/moderation/block { userId }
router.post('/block', async (req, res) => {
  const userId = validId(req.body.userId);
  if (!userId) return res.status(400).json({ error: 'Valid userId is required' });
  if (userId === req.user.id) return res.status(400).json({ error: "You can't block yourself" });

  try {
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, userId]
    );
    await pool.query(
      "UPDATE buddy_requests SET status = 'declined' WHERE status = 'accepted' AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))",
      [req.user.id, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    throw err;
  }
});

// DELETE /api/moderation/block/:userId
router.delete('/block/:userId', async (req, res) => {
  const blockedId = validId(req.params.userId);
  if (!blockedId) return res.status(400).json({ error: 'Invalid user ID' });
  await pool.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [req.user.id, blockedId]);
  res.json({ ok: true });
});

// GET /api/moderation/blocked
router.get('/blocked', async (req, res) => {
  const result = await pool.query(
    'SELECT b.blocked_id as user_id, u.name FROM blocks b JOIN users u ON u.id = b.blocked_id WHERE b.blocker_id = $1 ORDER BY b.created_at DESC',
    [req.user.id]
  );
  res.json({ blocked: result.rows });
});

// POST /api/moderation/report { userId, reason }
router.post('/report', async (req, res) => {
  const userId = validId(req.body.userId);
  const reason = req.body.reason;
  if (!userId) return res.status(400).json({ error: 'Valid userId is required' });
  if ((reason || '').length > 1000) return res.status(400).json({ error: 'Reason is too long' });

  await pool.query(
    'INSERT INTO reports (reporter_id, reported_id, reason) VALUES ($1, $2, $3)',
    [req.user.id, userId, (reason || '').trim()]
  );
  res.json({ ok: true });
});

module.exports = router;
