require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const { verifyToken } = require('./auth');
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedule');
const buddyRoutes = require('./routes/buddies');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Track which users are currently connected over websocket: Map<userId, Set<socketId>>
const onlineUsers = new Map();
app.set('io', io);
app.set('onlineUsers', onlineUsers);

app.use('/api/auth', authRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/buddies', buddyRoutes);
app.use('/api/messages', messageRoutes);

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

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

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
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Gym Buddy server running on http://localhost:${PORT}`);
});
