const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fitbud-admin-2024';

router.use((req, res, next) => {
  const pw = req.headers['x-admin-password'];
  if (pw !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  next();
});

router.get('/stats', async (req, res) => {
  const [
    usersResult,
    activeResult,
    connectionsResult,
    messagesResult,
    liveNowResult,
    reportsResult,
    signupTrendResult,
    checkinTrendResult,
    messageTrendResult,
    topMembersResult,
    trainingBreakdownResult,
    genderBreakdownResult,
    peakHoursResult,
    recentSignupsResult
  ] = await Promise.all([
    pool.query('SELECT COUNT(*)::int as total FROM users'),
    pool.query(`SELECT COUNT(DISTINCT user_id)::int as active FROM checkin_log WHERE checked_in_at >= NOW() - INTERVAL '7 days'`),
    pool.query(`SELECT COUNT(*)::int as total FROM buddy_requests WHERE status = 'accepted'`),
    pool.query('SELECT COUNT(*)::int as total FROM messages'),
    pool.query(`SELECT COUNT(*)::int as total FROM live_status WHERE expires_at > NOW()`),
    pool.query('SELECT COUNT(*)::int as total FROM reports'),

    pool.query(`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `),

    pool.query(`
      SELECT DATE(checked_in_at) as date, COUNT(*)::int as count
      FROM checkin_log
      WHERE checked_in_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(checked_in_at)
      ORDER BY date
    `),

    pool.query(`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM messages
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `),

    pool.query(`
      SELECT u.id, u.name, u.training_type, COUNT(cl.id)::int as checkins
      FROM checkin_log cl
      JOIN users u ON u.id = cl.user_id
      WHERE cl.checked_in_at >= NOW() - INTERVAL '30 days'
      GROUP BY u.id, u.name, u.training_type
      ORDER BY checkins DESC
      LIMIT 10
    `),

    pool.query(`
      SELECT COALESCE(NULLIF(training_type, ''), 'Not set') as type, COUNT(*)::int as count
      FROM users
      GROUP BY type
      ORDER BY count DESC
    `),

    pool.query(`
      SELECT COALESCE(NULLIF(gender, ''), 'Not set') as gender, COUNT(*)::int as count
      FROM users
      GROUP BY gender
      ORDER BY count DESC
    `),

    pool.query(`
      SELECT EXTRACT(HOUR FROM checked_in_at) as hour, COUNT(*)::int as count
      FROM checkin_log
      GROUP BY hour
      ORDER BY hour
    `),

    pool.query(`
      SELECT id, name, email, training_type, gender, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 20
    `)
  ]);

  res.json({
    overview: {
      totalUsers: usersResult.rows[0].total,
      activeThisWeek: activeResult.rows[0].active,
      totalConnections: connectionsResult.rows[0].total,
      totalMessages: messagesResult.rows[0].total,
      liveNow: liveNowResult.rows[0].total,
      totalReports: reportsResult.rows[0].total
    },
    trends: {
      signups: signupTrendResult.rows,
      checkins: checkinTrendResult.rows,
      messages: messageTrendResult.rows
    },
    topMembers: topMembersResult.rows,
    trainingBreakdown: trainingBreakdownResult.rows,
    genderBreakdown: genderBreakdownResult.rows,
    peakHours: peakHoursResult.rows,
    recentSignups: recentSignupsResult.rows
  });
});

module.exports = router;
