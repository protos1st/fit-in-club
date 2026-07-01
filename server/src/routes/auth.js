const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Resend } = require('resend');
const { pool } = require('../db');
const { signToken, authMiddleware } = require('../auth');

const resend = new Resend(process.env.RESEND_API_KEY);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

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

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be 8-128 characters' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'Name is too long' });
  if (email.length > 254) return res.status(400).json({ error: 'Email is too long' });
  if ((trainingType || '').length > 100) return res.status(400).json({ error: 'Training type is too long' });
  if ((bio || '').length > 500) return res.status(400).json({ error: 'Bio is too long' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, training_type, bio)
     VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, training_type, bio`,
    [name.trim(), email.toLowerCase().trim(), passwordHash, trainingType || '', bio || '']
  );

  const user = result.rows[0];
  const token = signToken(user);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  const user = result.rows[0];
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
    user: { id: user.id, name: user.name, email: user.email, training_type: user.training_type, bio: user.bio, onboarded: user.onboarded }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, training_type, bio, membership, workout_frequency, buddy_preference, gender, avatar_url, onboarded FROM users WHERE id = $1', [req.user.id]);
  const user = result.rows[0];
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, trainingType, bio, gender, avatarUrl } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (name.length > 100) return res.status(400).json({ error: 'Name is too long' });
  if ((trainingType || '').length > 100) return res.status(400).json({ error: 'Training type is too long' });
  if ((bio || '').length > 500) return res.status(400).json({ error: 'Bio is too long' });
  if ((gender || '').length > 30) return res.status(400).json({ error: 'Invalid gender' });
  if (avatarUrl && !/^https:\/\/res\.cloudinary\.com\//.test(avatarUrl)) {
    return res.status(400).json({ error: 'Invalid avatar URL' });
  }

  const fields = ['name = $1', 'training_type = $2', 'bio = $3', 'gender = $4', 'onboarded = TRUE'];
  const values = [name.trim(), trainingType || '', bio || '', gender || ''];
  if (avatarUrl !== undefined) {
    fields.push(`avatar_url = $${values.length + 1}`);
    values.push(avatarUrl);
  }
  values.push(req.user.id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}`, values);

  const result = await pool.query('SELECT id, name, email, training_type, bio, gender, avatar_url, onboarded FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: result.rows[0] });
});

// PUT /api/auth/onboarding
router.put('/onboarding', authMiddleware, async (req, res) => {
  const { membership, workoutFrequency, buddyPreference, trainingType, bio, gender } = req.body;
  if ((membership || '').length > 100) return res.status(400).json({ error: 'Membership is too long' });
  if ((workoutFrequency || '').length > 50) return res.status(400).json({ error: 'Invalid workout frequency' });
  if ((buddyPreference || '').length > 50) return res.status(400).json({ error: 'Invalid buddy preference' });
  if ((trainingType || '').length > 100) return res.status(400).json({ error: 'Training type is too long' });
  if ((bio || '').length > 500) return res.status(400).json({ error: 'Bio is too long' });
  if ((gender || '').length > 30) return res.status(400).json({ error: 'Invalid gender' });

  await pool.query(
    `UPDATE users SET membership = $1, workout_frequency = $2, buddy_preference = $3,
     training_type = $4, bio = $5, gender = $6, onboarded = TRUE WHERE id = $7`,
    [membership || '', workoutFrequency || '', buddyPreference || '', trainingType || '', bio || '', gender || '', req.user.id]
  );

  const result = await pool.query(
    'SELECT id, name, email, training_type, bio, membership, workout_frequency, buddy_preference, gender, onboarded FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json({ user: result.rows[0] });
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
  if (newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ error: 'New password must be 8-128 characters' });

  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

  const user = (await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id])).rows[0];
  const token = signToken(user);
  res.json({ token, message: 'Password updated' });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email.toLowerCase().trim()]);
  // Always respond OK to prevent email enumeration
  if (result.rows.length === 0) return res.json({ ok: true });

  const user = result.rows[0];
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
    [token, expires, user.id]
  );

  const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${token}`;

  await resend.emails.send({
    from: 'FitIn Club <noreply@fitin.club>',
    to: email.toLowerCase().trim(),
    subject: 'Reset your FitIn password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#53603e">Reset your password</h2>
        <p>Hi ${user.name},</p>
        <p>Click the button below to reset your FitIn Club password. This link expires in 1 hour.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#fba327;color:#2a2a22;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:16px 0">Reset password</a>
        <p style="color:#888;font-size:0.85rem">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  res.json({ ok: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8-128 characters' });

  const result = await pool.query(
    'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
    [token]
  );
  if (result.rows.length === 0) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

  const userId = result.rows[0].id;
  const hash = await bcrypt.hash(password, 12);

  await pool.query(
    'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
    [hash, userId]
  );

  res.json({ ok: true });
});

// DELETE /api/auth/account
router.delete('/account', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
