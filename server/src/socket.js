import { Server } from 'socket.io';
import { env } from './config/env.js';
import User from './models/User.js';
import { verifyToken } from './utils/token.js';

const ROOM = 'board';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });

  // Only logged-in users may listen for board updates.
  io.use(async (socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token);
      const user = await User.findById(payload.sub).select('name role');
      if (!user) throw new Error('unknown user');
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(ROOM);
  });

  return io;
}

// Controllers call this; it is a no-op when no socket server is attached
// (for example in the API tests).
export function broadcast(req, event, payload = {}) {
  const io = req.app.get('io');
  if (io) io.to(ROOM).emit(event, payload);
}
