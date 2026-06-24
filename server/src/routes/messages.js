const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

function areConnected(userA, userB) {
  const row = db.prepare(`
    SELECT 1 FROM buddy_requests
    WHERE status = 'accepted'
      AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))
  `).get(userA, userB, userB, userA);
  return !!row;
}

// GET /api/messages/:userId — conversation history with a connected buddy
router.get('/:userId', (req, res) => {
  const otherId = Number(req.params.userId);

  if (!areConnected(req.user.id, otherId)) {
    return res.status(403).json({ error: 'You can only message accepted gym buddies' });
  }

  const rows = db.prepare(`
    SELECT id, from_user_id, to_user_id, body, created_at, read_at
    FROM messages
    WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
    ORDER BY created_at ASC
  `).all(req.user.id, otherId, otherId, req.user.id);

  // mark messages sent to me as read
  db.prepare(
    "UPDATE messages SET read_at = datetime('now') WHERE to_user_id = ? AND from_user_id = ? AND read_at IS NULL"
  ).run(req.user.id, otherId);

  res.json({ messages: rows });
});

// POST /api/messages/:userId  { body }
router.post('/:userId', (req, res) => {
  const otherId = Number(req.params.userId);
  const { body } = req.body;

  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Message body is required' });
  }
  if (!areConnected(req.user.id, otherId)) {
    return res.status(403).json({ error: 'You can only message accepted gym buddies' });
  }

  const result = db.prepare(
    'INSERT INTO messages (from_user_id, to_user_id, body) VALUES (?, ?, ?)'
  ).run(req.user.id, otherId, body.trim());

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  // emit over websocket if the recipient is online — handled in index.js via app.get('io')
  const io = req.app.get('io');
  const onlineUsers = req.app.get('onlineUsers'); // Map<userId, Set<socketId>>
  if (io && onlineUsers && onlineUsers.has(otherId)) {
    for (const socketId of onlineUsers.get(otherId)) {
      io.to(socketId).emit('message:new', message);
    }
  }

  res.status(201).json({ message });
});

// GET /api/messages — list of conversations with unread counts
router.get('/', (req, res) => {
  const connections = db.prepare(`
    SELECT u.id as user_id, u.name
    FROM buddy_requests br
    JOIN users u ON u.id = CASE WHEN br.from_user_id = ? THEN br.to_user_id ELSE br.from_user_id END
    WHERE br.status = 'accepted' AND (br.from_user_id = ? OR br.to_user_id = ?)
  `).all(req.user.id, req.user.id, req.user.id);

  const result = connections.map((c) => {
    const last = db.prepare(`
      SELECT body, created_at, from_user_id FROM messages
      WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id, c.user_id, c.user_id, req.user.id);

    const unread = db.prepare(`
      SELECT COUNT(*) as cnt FROM messages
      WHERE from_user_id = ? AND to_user_id = ? AND read_at IS NULL
    `).get(c.user_id, req.user.id);

    return {
      user_id: c.user_id,
      name: c.name,
      last_message: last || null,
      unread_count: unread.cnt
    };
  });

  res.json({ conversations: result });
});

module.exports = router;
