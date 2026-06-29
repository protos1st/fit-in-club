const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');

const router = express.Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('\nMissing ADMIN_PASSWORD env var. Admin dashboard disabled.\n');
}

const adminAttempts = new Map();
const ADMIN_MAX_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MS = 15 * 60 * 1000;

router.use((req, res, next) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Admin dashboard not configured' });
  }
  const ip = req.ip;
  const record = adminAttempts.get(ip);
  if (record && record.count >= ADMIN_MAX_ATTEMPTS && Date.now() - record.first < ADMIN_LOCKOUT_MS) {
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
  }
  const pw = req.headers['x-admin-password'] || '';
  const pwBuf = Buffer.from(String(pw));
  const correctBuf = Buffer.from(ADMIN_PASSWORD);
  if (pwBuf.length !== correctBuf.length || !crypto.timingSafeEqual(pwBuf, correctBuf)) {
    const now = Date.now();
    if (!record || now - record.first > ADMIN_LOCKOUT_MS) {
      adminAttempts.set(ip, { count: 1, first: now });
    } else {
      record.count++;
    }
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  adminAttempts.delete(ip);
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
    recentSignupsResult,
    funnelScheduledResult,
    funnelCheckedInResult,
    funnelConnectedResult,
    funnelMessagedResult,
    heatmapResult,
    newUsersWeekResult,
    newMessagesWeekResult,
    newConnectionsWeekResult,
    liveDetailsResult,
    allMembersResult
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
    `),

    pool.query('SELECT COUNT(DISTINCT user_id)::int as c FROM schedules'),
    pool.query(`SELECT COUNT(DISTINCT user_id)::int as c FROM checkin_log`),
    pool.query(`SELECT COUNT(DISTINCT from_user_id)::int as c FROM buddy_requests WHERE status = 'accepted'`),
    pool.query(`SELECT COUNT(DISTINCT from_user_id)::int as c FROM messages`),

    pool.query(`
      SELECT DATE(checked_in_at) as date, COUNT(*)::int as count
      FROM checkin_log
      WHERE checked_in_at >= NOW() - INTERVAL '90 days'
      GROUP BY DATE(checked_in_at)
      ORDER BY date
    `),

    pool.query(`
      SELECT COUNT(*)::int as c FROM users WHERE created_at >= NOW() - INTERVAL '7 days'
    `),
    pool.query(`
      SELECT COUNT(*)::int as c FROM messages WHERE created_at >= NOW() - INTERVAL '7 days'
    `),
    pool.query(`
      SELECT COUNT(*)::int as c FROM buddy_requests WHERE status = 'accepted' AND responded_at >= NOW() - INTERVAL '7 days'
    `),

    pool.query(`
      SELECT u.id, u.name, u.training_type, l.status_tag, l.checked_in_at, l.expires_at
      FROM live_status l
      JOIN users u ON u.id = l.user_id
      WHERE l.expires_at > NOW()
      ORDER BY l.checked_in_at DESC
    `),

    pool.query(`
      SELECT u.id, u.name, u.email, u.training_type, u.gender, u.bio, u.created_at,
        (SELECT COUNT(*)::int FROM checkin_log cl WHERE cl.user_id = u.id) as total_checkins,
        (SELECT COUNT(*)::int FROM buddy_requests br WHERE (br.from_user_id = u.id OR br.to_user_id = u.id) AND br.status = 'accepted') as connections,
        (SELECT COUNT(*)::int FROM messages m WHERE m.from_user_id = u.id) as messages_sent,
        EXISTS(SELECT 1 FROM live_status ls WHERE ls.user_id = u.id AND ls.expires_at > NOW()) as is_live
      FROM users u
      ORDER BY u.created_at DESC
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
    recentSignups: recentSignupsResult.rows,
    funnel: {
      signedUp: usersResult.rows[0].total,
      scheduled: funnelScheduledResult.rows[0].c,
      checkedIn: funnelCheckedInResult.rows[0].c,
      connected: funnelConnectedResult.rows[0].c,
      messaged: funnelMessagedResult.rows[0].c
    },
    heatmap: heatmapResult.rows,
    weeklyDelta: {
      newUsers: newUsersWeekResult.rows[0].c,
      newMessages: newMessagesWeekResult.rows[0].c,
      newConnections: newConnectionsWeekResult.rows[0].c
    },
    liveMembers: liveDetailsResult.rows,
    allMembers: allMembersResult.rows
  });
});

module.exports = router;
