require('dotenv').config();
require('express-async-errors');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');
const { verifyToken } = require('./auth');
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedule');
const buddyRoutes = require('./routes/buddies');
const messageRoutes = require('./routes/messages');
const moderationRoutes = require('./routes/moderation');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", CLIENT_ORIGIN, "wss:", "ws:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
app.set('trust proxy', 1);
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '16kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Sending messages too fast, slow down' }
});

const scheduleLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many schedule updates, try again later' }
});

const buddyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many buddy actions, try again later' }
});

// Track which users are currently connected over websocket: Map<userId, Set<socketId>>
const onlineUsers = new Map();
app.set('io', io);
app.set('onlineUsers', onlineUsers);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/schedule', scheduleLimiter, scheduleRoutes);
app.use('/api/buddies', buddyLimiter, buddyRoutes);
app.use('/api/messages', messageLimiter, messageRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// --- Socket.io auth + presence ---------------------------------------------

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    const payload = verifyToken(token);
    socket.userId = payload.id;
    next();
  } catch (err) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  const typingTimestamps = new Map();

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  function throttledEmit(event, toUserId) {
    const key = `${event}:${toUserId}`;
    const now = Date.now();
    if (typingTimestamps.has(key) && now - typingTimestamps.get(key) < 1000) return;
    typingTimestamps.set(key, now);
    if (onlineUsers.has(toUserId)) {
      for (const sid of onlineUsers.get(toUserId)) {
        io.to(sid).emit(event, { userId });
      }
    }
  }

  socket.on('typing:start', ({ toUserId }) => throttledEmit('typing:start', toUserId));
  socket.on('typing:stop', ({ toUserId }) => throttledEmit('typing:stop', toUserId));

  socket.on('disconnect', () => {
    const set = onlineUsers.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) onlineUsers.delete(userId);
    }
  });
});

// --- Error handling ----------------------------------------------------------

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 4000;

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Gym Buddy server running on http://localhost:${PORT}`);
  });
  server.setTimeout(30000);
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
