'use strict';

/**
 * Signaling server for Meeting iOS
 *
 * Handles WebRTC offer/answer/ICE-candidate exchange and room management.
 * Deploy this wherever you like (Glitch, Fly.io, Railway, etc.) and
 * point SIGNALING_SERVER_URL in src/utils/webrtc.js at your deployment.
 *
 * Local development:
 *   cd server && npm install && npm start
 *   Then set SIGNALING_SERVER_URL to http://<your-machine-ip>:3000
 *   (use your real IP, not "localhost", when testing on a physical device)
 */

const express = require('express');
const http = require('http');
const {Server} = require('socket.io');

const PORT = process.env.PORT ?? 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // Allow all origins during development.
    // In production, replace '*' with your specific client origin(s), e.g.:
    //   origin: ['https://your-app.example.com']
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST'],
  },
});

/** @type {Map<string, Map<string, string>>} roomId -> Map<socketId, displayName> */
const rooms = new Map();

app.get('/health', (_req, res) => res.json({status: 'ok'}));

io.on('connection', socket => {
  let currentRoom = null;

  socket.on('join-room', ({roomId, displayName}) => {
    if (!roomId || !displayName) return;

    currentRoom = roomId;
    socket.join(roomId);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Map());
    }
    rooms.get(roomId).set(socket.id, displayName);

    // Send the current participant list to the joiner
    const participants = [...rooms.get(roomId).entries()]
      .filter(([id]) => id !== socket.id)
      .map(([peerId, name]) => ({peerId, name}));

    socket.emit('participants', participants);

    // Notify existing participants about the new joiner
    socket.to(roomId).emit('user-joined', {peerId: socket.id, name: displayName});
  });

  socket.on('offer', ({to, offer}) => {
    io.to(to).emit('offer', {from: socket.id, offer});
  });

  socket.on('answer', ({to, answer}) => {
    io.to(to).emit('answer', {from: socket.id, answer});
  });

  socket.on('ice-candidate', ({to, candidate}) => {
    io.to(to).emit('ice-candidate', {from: socket.id, candidate});
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        rooms.delete(currentRoom);
      }
    }
    socket.to(currentRoom).emit('user-left', {peerId: socket.id});
  });
});

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
