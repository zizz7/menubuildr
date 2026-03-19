import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import { getPlanLimits, PlanLimits } from '../config/limits';

/**
 * Returns the numeric limit for a given resource type from the plan limits.
 */
function getLimit(limits: PlanLimits, resourceType: 'restaurant' | 'menu' | 'item'): number {
  switch (resourceType) {
    case 'restaurant':
      return limits.restaurants;
    case 'menu':
      return limits.menusPerRestaurant;
    case 'item':
      return limits.itemsPerMenu;
  }
}

/**
 * Counts the current number of resources for the given type.
 *
 * - restaurant: all restaurants owned by the admin
 * - menu: all menus in the restaurant (from req.params.restaurantId or req.body.restaurantId)
 * - item: all items across all sections in the menu (from req.params.menuId or req.body.menuId)
 */
async function countResource(
  resourceType: 'restaurant' | 'menu' | 'item',
  req: AuthRequest,
): Promise<number> {
  switch (resourceType) {
    case 'restaurant': {
      return prisma.restaurant.count({ where: { adminId: req.userId } });
    }
    case 'menu': {
      const restaurantId = req.params.restaurantId || req.body?.restaurantId;
      if (!restaurantId) return 0;
      return prisma.menu.count({ where: { restaurantId } });
    }
    case 'item': {
      const menuId = req.params.menuId || req.body?.menuId;
      if (!menuId) return 0;
      // Count all items across all sections in this menu
      return prisma.menuItem.count({
        where: { section: { menuId } },
      });
    }
  }
}

/**
 * Middleware factory that checks resource counts against plan limits before creation.
 * Returns 403 with structured error when the limit is exceeded.
 */
export function checkUsageLimit(resourceType: 'restaurant' | 'menu' | 'item') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const admin = await prisma.admin.findUnique({
        where: { id: req.userId },
        select: { subscriptionPlan: true, subscriptionStatus: true },
      });

      if (!admin) {
        return res.status(401).json({ error: 'Admin not found' });
      }

      const limits = getPlanLimits(admin.subscriptionPlan);
      const limit = getLimit(limits, resourceType);

      // Pro users (Infinity limit) are never blocked
      if (!isFinite(limit)) {
        return next();
      }

      const currentCount = await countResource(resourceType, req);

      if (currentCount >= limit) {
        const plan = admin.subscriptionPlan || 'free';
        return res.status(403).json({
          error: `Free plan limit reached`,
          code: 'PLAN_LIMIT_REACHED',
          limit,
          current: currentCount,
          resource: resourceType,
          plan,
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
