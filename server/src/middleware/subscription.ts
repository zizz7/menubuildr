import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';

// Statuses that allow full dashboard access
const ALLOWED_STATUSES = ['free', 'none', 'active', 'trialing'];

export const requireSubscription = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const admin = await prisma.admin.findUnique({
    where: { id: req.userId },
    select: { subscriptionStatus: true },
  });

  if (!admin) {
    return res.status(401).json({ error: 'Admin not found' });
  }

  const status = admin.subscriptionStatus ?? 'none';

  if (ALLOWED_STATUSES.includes(status)) {
    return next();
  }

  // past_due: allow access but add a warning header
  if (status === 'past_due') {
    res.setHeader('X-Subscription-Warning', 'past_due');
    return next();
  }

  // canceled or any other status: block access
  return res.status(403).json({
    error: 'Subscription required',
    code: 'SUBSCRIPTION_REQUIRED',
    subscriptionStatus: status,
  });
};
