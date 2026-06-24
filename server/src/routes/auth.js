const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, authMiddleware } = require('../auth');

const router = express.Router();

const GYM_SIGNUP_CODE = process.env.GYM_SIGNUP_CODE;

if (!GYM_SIGNUP_CODE) {
  console.error(
    '\nMissing GYM_SIGNUP_CODE.\n' +
    'Copy server/.env.example to server/.env and set GYM_SIGNUP_CODE before starting the server.\n'
  );
  process.exit(1);
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { name, email, password, gymCode, trainingType, bio } = req.body;

  if (!name || !email || !password || !gymCode) {
    return res.status(400).json({ error: 'name, email, password and gymCode are required' });
  }

  if (gymCode.trim() !== GYM_SIGNUP_CODE) {
    return res.status(403).json({ error: 'Invalid gym code. Ask the front desk for the correct code.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = db.prepare(
    `INSERT INTO users (name, email, password_hash, training_type, bio)
     VALUES (?, ?, ?, ?, ?)`
  ).run(name.trim(), email.toLowerCase().trim(), passwordHash, trainingType || '', bio || '');

  const user = db.prepare('SELECT id, name, email, training_type, bio FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, training_type: user.training_type, bio: user.bio }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, name, email, training_type, bio FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

module.exports = router;
