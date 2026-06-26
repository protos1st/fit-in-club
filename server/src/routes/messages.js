const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

const BLOCKED_WORDS = [
  'fuck', 'shit', 'bitch', 'asshole', 'dick', 'pussy', 'cunt', 'bastard',
  'whore', 'slut', 'nigger', 'faggot', 'retard', 'motherfucker',
  'chutiya', 'madarchod', 'bhenchod', 'bhosdike', 'gaand', 'randi',
  'lavde', 'lodu', 'harami', 'kamina', 'kutte', 'saala', 'gandu'
];

function containsProfanity(text) {
  const lower = text.toLowerCase().replace(/[^a-zऀ-ॿ]/g, ' ');
  return BLOCKED_WORDS.some(w => {
    const regex = new RegExp(`\\b${w}\\b|${w}`, 'i');
    return regex.test(lower);
  });
}

async function areConnected(userA, userB) {
  const blocked = await pool.query(
    'SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
    [userA, userB]
  );
  if (blocked.rows.length > 0) return false;

  const result = await pool.query(`
    SELECT 1 FROM buddy_requests
    WHERE status = 'accepted'
      AND ((from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1))
  `, [userA, userB]);
  return result.rows.length > 0;
}

// GET /api/messages/:userId
router.get('/:userId', async (req, res) => {
  const otherId = Number(req.params.userId);

  if (!(await areConnected(req.user.id, otherId))) {
    return res.status(403).json({ error: 'You can only message accepted gym buddies' });
  }

  const result = await pool.query(`
    SELECT id, from_user_id, to_user_id, body, created_at, read_at
    FROM messages
    WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)
    ORDER BY created_at ASC
  `, [req.user.id, otherId]);

  await pool.query(
    "UPDATE messages SET read_at = NOW() WHERE to_user_id = $1 AND from_user_id = $2 AND read_at IS NULL",
    [req.user.id, otherId]
  );

  res.json({ messages: result.rows });
});

// POST /api/messages/:userId  { body }
router.post('/:userId', async (req, res) => {
  const otherId = Number(req.params.userId);
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Message body is required' });
  }
  if (body.length > 2000) {
    return res.status(400).json({ error: 'Message is too long (max 2000 characters)' });
  }
  if (containsProfanity(body)) {
    return res.status(400).json({ error: 'Message contains inappropriate language. Keep it respectful.' });
  }
  if (!(await areConnected(req.user.id, otherId))) {
    return res.status(403).json({ error: 'You can only message accepted gym buddies' });
  }

  const result = await pool.query(
    'INSERT INTO messages (from_user_id, to_user_id, body) VALUES ($1, $2, $3) RETURNING *',
    [req.user.id, otherId, body.trim()]
  );

  const message = result.rows[0];

  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers');
  if (io && onlineUsers && onlineUsers.has(otherId)) {
    for (const socketId of onlineUsers.get(otherId)) {
      io.to(socketId).emit('message:new', message);
    }
  }

  res.status(201).json({ message });
});

// DELETE /api/messages/:messageId
router.delete('/:messageId', async (req, res) => {
  const msgId = Number(req.params.messageId);
  const result = await pool.query('SELECT * FROM messages WHERE id = $1', [msgId]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
  const msg = result.rows[0];
  if (msg.from_user_id !== req.user.id && msg.to_user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not your message' });
  }
  await pool.query('DELETE FROM messages WHERE id = $1', [msgId]);
  res.json({ ok: true });
});

// GET /api/messages
router.get('/', async (req, res) => {
  const connResult = await pool.query(`
    SELECT u.id as user_id, u.name
    FROM buddy_requests br
    JOIN users u ON u.id = CASE WHEN br.from_user_id = $1 THEN br.to_user_id ELSE br.from_user_id END
    WHERE br.status = 'accepted' AND (br.from_user_id = $1 OR br.to_user_id = $1)
  `, [req.user.id]);

  const result = [];
  for (const c of connResult.rows) {
    const lastResult = await pool.query(`
      SELECT body, created_at, from_user_id FROM messages
      WHERE (from_user_id = $1 AND to_user_id = $2) OR (from_user_id = $2 AND to_user_id = $1)
      ORDER BY created_at DESC LIMIT 1
    `, [req.user.id, c.user_id]);

    const unreadResult = await pool.query(`
      SELECT COUNT(*) as cnt FROM messages
      WHERE from_user_id = $1 AND to_user_id = $2 AND read_at IS NULL
    `, [c.user_id, req.user.id]);

    result.push({
      user_id: c.user_id,
      name: c.name,
      last_message: lastResult.rows[0] || null,
      unread_count: parseInt(unreadResult.rows[0].cnt)
    });
  }

  res.json({ conversations: result });
});

module.exports = router;
