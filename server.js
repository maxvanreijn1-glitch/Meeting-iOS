const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins.length > 0
      ? allowedOrigins
      : (origin, cb) => cb(null, origin ?? false),
    methods: ['GET', 'POST']
  }
});

// Rate-limit page requests: max 60 requests per minute per IP
const pageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(express.static(path.join(__dirname, 'public')));

// Redirect root to a new meeting room
app.get('/', pageLimiter, (req, res) => {
  const roomId = uuidv4().slice(0, 8);
  res.redirect(`/room/${roomId}`);
});

// Serve the meeting room
app.get('/room/:roomId', pageLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Track rooms and participants
const rooms = new Map();

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('join-room', ({ roomId, peerId, displayName }) => {
    currentRoom = roomId;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }

    const room = rooms.get(roomId);
    room.set(socket.id, { peerId, displayName });

    // Send existing participants to the new joiner
    const existingPeers = [];
    room.forEach((peer, socketId) => {
      if (socketId !== socket.id) {
        existingPeers.push({ socketId, ...peer });
      }
    });

    socket.emit('existing-peers', existingPeers);

    // Notify others of new peer
    socket.to(roomId).emit('peer-joined', {
      socketId: socket.id,
      peerId,
      displayName
    });
  });

  // WebRTC signaling
  socket.on('offer', ({ to, offer }) => {
    socket.to(to).emit('offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('answer', ({ to, answer }) => {
    socket.to(to).emit('answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    socket.to(to).emit('ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  // Peer media state updates
  socket.on('media-state', ({ roomId, audioEnabled, videoEnabled }) => {
    socket.to(roomId).emit('peer-media-state', {
      socketId: socket.id,
      audioEnabled,
      videoEnabled
    });
  });

  // Chat messages
  socket.on('chat-message', ({ roomId, message, displayName }) => {
    io.to(roomId).emit('chat-message', {
      socketId: socket.id,
      displayName,
      message,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.delete(socket.id);

      if (room.size === 0) {
        rooms.delete(currentRoom);
      } else {
        socket.to(currentRoom).emit('peer-left', { socketId: socket.id });
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Meeting server running on port ${PORT}`);
});
