const { Server } = require('socket.io');
const env = require('./env');
const jwt = require('jsonwebtoken');
const Execution = require('../models/Execution');
let io;
function initializeSocket(server) {
  io = new Server(server, { cors: { origin: env.clientUrl, credentials: true } });
  io.use((socket, next) => {
    try { const token = socket.handshake.auth?.token; if (!token) return next(new Error('Authentication required.')); socket.data.userId = jwt.verify(token, env.jwtSecret).sub; next(); }
    catch { next(new Error('Invalid session.')); }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on('execution:subscribe', async (executionId, acknowledge) => {
      try { if (typeof executionId !== 'string' || !/^[a-f\d]{24}$/i.test(executionId)) throw new Error('Invalid execution.'); const owned = await Execution.exists({ _id: executionId, owner: socket.data.userId }); if (!owned) throw new Error('Execution not found.'); socket.join(`execution:${executionId}`); if (typeof acknowledge === 'function') acknowledge({ ok: true }); }
      catch (error) { if (typeof acknowledge === 'function') acknowledge({ ok: false, message: error.message }); }
    });
    socket.on('execution:unsubscribe', (executionId) => { if (typeof executionId === 'string') socket.leave(`execution:${executionId}`); });
  });
  return io;
}
function getIO() { if (!io) throw new Error('Socket.IO has not been initialized.'); return io; }
function emitExecutionEvent(executionId, event) { if (io) io.to(`execution:${executionId}`).emit('execution:event', event); }
function emitUserEvent(userId, event) { if (io) io.to(`user:${userId}`).emit('notification:new', event); }
module.exports = { initializeSocket, getIO, emitExecutionEvent, emitUserEvent };
