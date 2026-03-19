/**
 * Unit tests for checkUsageLimit middleware.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';

// Mock Prisma before importing middleware
vi.mock('../config/database', () => {
  return {
    default: {
      admin: { findUnique: vi.fn() },
      restaurant: { count: vi.fn() },
      menu: { count: vi.fn() },
      menuItem: { count: vi.fn() },
    },
  };
});

import prisma from '../config/database';
import { checkUsageLimit } from '../middleware/usage-limits';
import { AuthRequest } from '../middleware/auth';

const mockedPrisma = prisma as unknown as {
  admin: { findUnique: ReturnType<typeof vi.fn> };
  restaurant: { count: ReturnType<typeof vi.fn> };
  menu: { count: ReturnType<typeof vi.fn> };
  menuItem: { count: ReturnType<typeof vi.fn> };
};

const ADMIN_ID = 'admin-test-001';

function createMockReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
  return {
    userId: ADMIN_ID,
    params: {},
    body: {},
    ...overrides,
  } as unknown as AuthRequest;
}

function createMockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function createMockNext(): NextFunction {
  return vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Restaurant limit enforcement
// Validates: Requirements 3.1, 3.4
// ============================================================
describe('checkUsageLimit("restaurant")', () => {
  it('blocks free-tier admin at restaurant limit (1)', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.restaurant.count.mockResolvedValue(1);

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('restaurant')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Free plan limit reached',
      code: 'PLAN_LIMIT_REACHED',
      limit: 1,
      current: 1,
      resource: 'restaurant',
      plan: 'free',
    });
  });

  it('allows free-tier admin below restaurant limit', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.restaurant.count.mockResolvedValue(0);

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('restaurant')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows pro-tier admin unlimited restaurants', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: 'pro',
      subscriptionStatus: 'active',
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('restaurant')(req, res, next);

    // Pro users skip the count query entirely (Infinity limit)
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(mockedPrisma.restaurant.count).not.toHaveBeenCalled();
  });
});

// ============================================================
// Menu limit enforcement
// Validates: Requirements 3.2
// ============================================================
describe('checkUsageLimit("menu")', () => {
  it('blocks free-tier admin at menu limit (2 per restaurant)', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.menu.count.mockResolvedValue(2);

    const req = createMockReq({ params: { restaurantId: 'rest-1' } } as any);
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('menu')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PLAN_LIMIT_REACHED',
        limit: 2,
        current: 2,
        resource: 'menu',
      }),
    );
  });

  it('reads restaurantId from req.body when not in params', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.menu.count.mockResolvedValue(1);

    const req = createMockReq({ body: { restaurantId: 'rest-1' } } as any);
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('menu')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockedPrisma.menu.count).toHaveBeenCalledWith({ where: { restaurantId: 'rest-1' } });
  });
});

// ============================================================
// Item limit enforcement
// Validates: Requirements 3.3
// ============================================================
describe('checkUsageLimit("item")', () => {
  it('blocks free-tier admin at item limit (20 per menu)', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.menuItem.count.mockResolvedValue(20);

    const req = createMockReq({ params: { menuId: 'menu-1' } } as any);
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('item')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'PLAN_LIMIT_REACHED',
        limit: 20,
        current: 20,
        resource: 'item',
      }),
    );
  });

  it('counts items across all sections in the menu', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.menuItem.count.mockResolvedValue(10);

    const req = createMockReq({ params: { menuId: 'menu-1' } } as any);
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('item')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockedPrisma.menuItem.count).toHaveBeenCalledWith({
      where: { section: { menuId: 'menu-1' } },
    });
  });
});

// ============================================================
// 403 response format
// Validates: Requirements 3.4, 3.5
// ============================================================
describe('403 response body format', () => {
  it('includes all required fields: error, code, limit, current, resource, plan', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionPlan: null,
      subscriptionStatus: 'free',
    });
    mockedPrisma.restaurant.count.mockResolvedValue(1);

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('restaurant')(req, res, next);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code', 'PLAN_LIMIT_REACHED');
    expect(body).toHaveProperty('limit');
    expect(body).toHaveProperty('current');
    expect(body).toHaveProperty('resource');
    expect(body).toHaveProperty('plan');
  });
});

// ============================================================
// Admin not found
// ============================================================
describe('checkUsageLimit handles missing admin', () => {
  it('returns 401 when admin is not found', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue(null);

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await checkUsageLimit('restaurant')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin not found' });
  });
});
