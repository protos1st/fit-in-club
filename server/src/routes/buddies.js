const express = require('express');
const { pool } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// POST /api/buddies/request  { to_user_id }
router.post('/request', async (req, res) => {
  const { to_user_id } = req.body;
  if (!to_user_id) return res.status(400).json({ error: 'to_user_id is required' });
  if (to_user_id === req.user.id) return res.status(400).json({ error: "You can't send a request to yourself" });

  const target = await pool.query('SELECT id FROM users WHERE id = $1', [to_user_id]);
  if (target.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const reverse = await pool.query(
    'SELECT * FROM buddy_requests WHERE from_user_id = $1 AND to_user_id = $2',
    [to_user_id, req.user.id]
  );

  if (reverse.rows.length > 0) {
    const rev = reverse.rows[0];
    if (rev.status === 'pending') {
      await pool.query(
        "UPDATE buddy_requests SET status = 'accepted', responded_at = NOW() WHERE id = $1",
        [rev.id]
      );
      return res.json({ request: { ...rev, status: 'accepted' }, note: 'Matched! You both requested each other.' });
    }
    if (rev.status === 'accepted') {
      return res.json({ request: rev, note: 'You are already connected.' });
    }
  }

  try {
    const result = await pool.query(
      'INSERT INTO buddy_requests (from_user_id, to_user_id, status) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, to_user_id, 'pending']
    );
    res.status(201).json({ request: result.rows[0] });
  } catch (err) {
    if (String(err).includes('unique') || String(err).includes('duplicate')) {
      return res.status(409).json({ error: 'You already sent a request to this person' });
    }
    throw err;
  }
});

// POST /api/buddies/:requestId/respond  { action: 'accept' | 'decline' }
router.post('/:requestId/respond', async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) {
    return res.status(400).json({ error: "action must be 'accept' or 'decline'" });
  }

  const reqResult = await pool.query('SELECT * FROM buddy_requests WHERE id = $1', [requestId]);
  const reqRow = reqResult.rows[0];
  if (!reqRow) return res.status(404).json({ error: 'Request not found' });
  if (reqRow.to_user_id !== req.user.id) {
    return res.status(403).json({ error: 'You can only respond to requests sent to you' });
  }
  if (reqRow.status !== 'pending') {
    return res.status(409).json({ error: `Request already ${reqRow.status}` });
  }

  const newStatus = action === 'accept' ? 'accepted' : 'declined';
  await pool.query(
    "UPDATE buddy_requests SET status = $1, responded_at = NOW() WHERE id = $2",
    [newStatus, requestId]
  );

  const updated = await pool.query('SELECT * FROM buddy_requests WHERE id = $1', [requestId]);
  res.json({ request: updated.rows[0] });
});

// GET /api/buddies/incoming
router.get('/incoming', async (req, res) => {
  const result = await pool.query(`
    SELECT br.id, br.status, br.created_at, u.id as user_id, u.name, u.training_type, u.bio
    FROM buddy_requests br
    JOIN users u ON u.id = br.from_user_id
    WHERE br.to_user_id = $1 AND br.status = 'pending'
    ORDER BY br.created_at DESC
  `, [req.user.id]);
  res.json({ incoming: result.rows });
});

// GET /api/buddies/outgoing
router.get('/outgoing', async (req, res) => {
  const result = await pool.query(`
    SELECT br.id, br.status, br.created_at, u.id as user_id, u.name, u.training_type, u.bio
    FROM buddy_requests br
    JOIN users u ON u.id = br.to_user_id
    WHERE br.from_user_id = $1 AND br.status = 'pending'
    ORDER BY br.created_at DESC
  `, [req.user.id]);
  res.json({ outgoing: result.rows });
});

// GET /api/buddies/connections
router.get('/connections', async (req, res) => {
  const result = await pool.query(`
    SELECT br.id as request_id, br.responded_at,
           u.id as user_id, u.name, u.training_type, u.bio, u.gender
    FROM buddy_requests br
    JOIN users u ON u.id = CASE WHEN br.from_user_id = $1 THEN br.to_user_id ELSE br.from_user_id END
    WHERE br.status = 'accepted' AND (br.from_user_id = $1 OR br.to_user_id = $1)
    ORDER BY br.responded_at DESC
  `, [req.user.id]);
  res.json({ connections: result.rows });
});

module.exports = router;
