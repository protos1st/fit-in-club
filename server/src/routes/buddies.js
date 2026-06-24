const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/buddies/request  { to_user_id }
router.post('/request', (req, res) => {
  const { to_user_id } = req.body;
  if (!to_user_id) return res.status(400).json({ error: 'to_user_id is required' });
  if (to_user_id === req.user.id) return res.status(400).json({ error: "You can't send a request to yourself" });

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(to_user_id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  // If the other person already sent ME a request, auto-accept instead of duplicating
  const reverse = db.prepare(
    'SELECT * FROM buddy_requests WHERE from_user_id = ? AND to_user_id = ?'
  ).get(to_user_id, req.user.id);

  if (reverse) {
    if (reverse.status === 'pending') {
      db.prepare(
        "UPDATE buddy_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = ?"
      ).run(reverse.id);
      return res.json({ request: { ...reverse, status: 'accepted' }, note: 'Matched! You both requested each other.' });
    }
    if (reverse.status === 'accepted') {
      return res.json({ request: reverse, note: 'You are already connected.' });
    }
  }

  try {
    const result = db.prepare(
      'INSERT INTO buddy_requests (from_user_id, to_user_id, status) VALUES (?, ?, ?)'
    ).run(req.user.id, to_user_id, 'pending');
    const row = db.prepare('SELECT * FROM buddy_requests WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ request: row });
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return res.status(409).json({ error: 'You already sent a request to this person' });
    }
    throw err;
  }
});

// POST /api/buddies/:requestId/respond  { action: 'accept' | 'decline' }
router.post('/:requestId/respond', (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
  }

  const reqRow = db.prepare('SELECT * FROM buddy_requests WHERE id = ?').get(requestId);
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });
  if (reqRow.to_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only respond to requests sent to you' });
  }
  if (reqRow.status !== 'pending') {
    return res.status(409).json({ error: `Request already ${reqRow.status}` });
  }

  const newStatus = action === 'accept' ? 'accepted' : 'declined';
  db.prepare(
    "UPDATE buddy_requests SET status = ?, responded_at = datetime('now') WHERE id = ?"
  ).run(newStatus, requestId);

  const updated = db.prepare('SELECT * FROM buddy_requests WHERE id = ?').get(requestId);
  res.json({ request: updated });
});

// GET /api/buddies/incoming — pending requests sent to me
router.get('/incoming', (req, res) => {
  const rows = db.prepare(`
    SELECT br.id, br.status, br.created_at, u.id as user_id, u.name, u.training_type, u.bio
    FROM buddy_requests br
    JOIN users u ON u.id = br.from_user_id
    WHERE br.to_user_id = ? AND br.status = 'pending'
    ORDER BY br.created_at DESC
  `).all(req.user.id);
  res.json({ incoming: rows });
});

// GET /api/buddies/outgoing — pending requests I sent
router.get('/outgoing', (req, res) => {
  const rows = db.prepare(`
    SELECT br.id, br.status, br.created_at, u.id as user_id, u.name, u.training_type, u.bio
    FROM buddy_requests br
    JOIN users u ON u.id = br.to_user_id
    WHERE br.from_user_id = ? AND br.status = 'pending'
    ORDER BY br.created_at DESC
  `).all(req.user.id);
  res.json({ outgoing: rows });
});

// GET /api/buddies/connections — accepted connections (either direction)
router.get('/connections', (req, res) => {
  const rows = db.prepare(`
    SELECT br.id as request_id, br.responded_at,
           u.id as user_id, u.name, u.training_type, u.bio
    FROM buddy_requests br
    JOIN users u ON u.id = CASE WHEN br.from_user_id = ? THEN br.to_user_id ELSE br.from_user_id END
    WHERE br.status = 'accepted' AND (br.from_user_id = ? OR br.to_user_id = ?)
    ORDER BY br.responded_at DESC
  `).all(req.user.id, req.user.id, req.user.id);
  res.json({ connections: rows });
});

module.exports = router;
