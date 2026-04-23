const os = require('os');
const express = require('express');
const http = require('http');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { players: [], state: {} });
  }
  return rooms.get(roomId);
}

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  const io = new Server(server, { cors: { origin: '*' } });

  io.on('connection', (socket) => {
    socket.on('room:join', ({ roomId, playerName }) => {
      const room = getRoom(roomId);
      socket.join(roomId);
      if (!room.players.find((p) => p.socketId === socket.id)) {
        room.players.push({ socketId: socket.id, playerName: playerName || 'Guest' });
      }
      io.to(roomId).emit('room:update', room);
    });

    socket.on('room:leave', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      room.players = room.players.filter((p) => p.socketId !== socket.id);
      io.to(roomId).emit('room:update', room);
    });

    socket.on('room:setState', ({ roomId, state }) => {
      const room = getRoom(roomId);
      room.state = state || {};
      io.to(roomId).emit('room:state', room.state);
      io.to(roomId).emit('room:update', room);
    });

    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms.entries()) {
        const before = room.players.length;
        room.players = room.players.filter((p) => p.socketId !== socket.id);
        if (room.players.length !== before) {
          io.to(roomId).emit('room:update', room);
        }
      }
    });
  });

  expressApp.use((req, res) => handle(req, res));

  const port = process.env.PORT || 3005;
  server.listen(port, '0.0.0.0', () => {
    console.log(`> Ready on http://localhost:${port}`);
    for (const ip of getLocalIPs()) {
      console.log(`> LAN: http://${ip}:${port}`);
    }
  });
});
