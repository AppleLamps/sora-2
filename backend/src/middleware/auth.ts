import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    sub?: string;
  };
  file?: Express.Multer.File;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): any => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);

    // Try Neon Authorize JWT first (if NEON_AUTH_ISSUER is set)
    if (process.env.NEON_AUTH_ISSUER) {
      try {
        const neonDecoded = jwt.decode(token) as any;
        if (neonDecoded && neonDecoded.iss === process.env.NEON_AUTH_ISSUER) {
          // Neon Authorize token - extract user from sub claim
          req.user = {
            userId: neonDecoded.sub,
            email: neonDecoded.email || neonDecoded.sub,
            sub: neonDecoded.sub,
          };
          return next();
        }
      } catch { }
    }

    // Fall back to custom JWT
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
