import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { isBlocklisted } from './tokenBlocklist';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // JWT_SECRET is guaranteed to be set by validateEnv() at startup
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; jti?: string };

    if (!decoded.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // C1.4: Reject tokens that have been blocklisted (e.g., after logout)
    if (decoded.jti && isBlocklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    req.userId = decoded.userId;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
