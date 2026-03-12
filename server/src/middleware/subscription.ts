import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';

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

  if (admin.subscriptionStatus === 'active' || admin.subscriptionStatus === 'trialing') {
    return next();
  }

  return res.status(403).json({
    error: 'Subscription required',
    code: 'SUBSCRIPTION_REQUIRED',
    subscriptionStatus: admin.subscriptionStatus,
  });
};
