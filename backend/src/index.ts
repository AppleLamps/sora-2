import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import createApp from './app';
import { verifyToken } from './utils/jwt';
import { registerUserSocket, removeUserSocket } from './services/socketRegistry';

interface SocketUser {
  userId: string;
  email: string;
  sub?: string;
}

interface AuthedSocket extends Socket {
  user?: SocketUser;
}

dotenv.config();

const PORT = process.env.PORT || 5000;
const app = createApp();
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  },
});

io.use((socket: AuthedSocket, next) => {
  try {
    const authToken =
      (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token) ||
      (typeof socket.handshake.headers?.authorization === 'string'
        ? socket.handshake.headers.authorization.replace('Bearer ', '')
        : undefined);

    if (!authToken) {
      return next(new Error('Authentication error'));
    }

    if (process.env.NEON_AUTH_ISSUER) {
      try {
        const decoded = jwt.decode(authToken) as any;
        if (decoded && decoded.iss === process.env.NEON_AUTH_ISSUER) {
          socket.user = {
            userId: decoded.sub,
            email: decoded.email || decoded.sub,
            sub: decoded.sub,
          };
          return next();
        }
      } catch {
        // fall through to custom JWT verification
      }
    }

    const decoded = verifyToken(authToken);
    socket.user = decoded;
    return next();
  } catch (error) {
    return next(new Error('Authentication error'));
  }
});

io.on('connection', (socket: AuthedSocket) => {
  if (socket.user?.userId) {
    registerUserSocket(socket.user.userId, socket.id);
  }

  socket.on('disconnect', () => {
    removeUserSocket(socket.id);
  });
});

app.locals.io = io;

if (require.main === module) {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
