/**
 * Unit tests for GET /api/billing/usage endpoint.
 *
 * Validates: Requirements 7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

// Mock Prisma before importing routes
vi.mock('../config/database', () => {
  return {
    default: {
      admin: { findUnique: vi.fn() },
      menu: { count: vi.fn() },
      menuItem: { count: vi.fn() },
    },
  };
});

import prisma from '../config/database';

const mockedPrisma = prisma as unknown as {
  admin: { findUnique: ReturnType<typeof vi.fn> };
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

// Extract the handler from the router. We import the module dynamically
// after mocking so we can grab the route handler directly.
async function getUsageHandler() {
  // We need to mock the billing service to avoid Stripe dependency at import time
  vi.mock('../services/billing', () => ({
    getOrCreateStripeCustomer: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPortalSession: vi.fn(),
    handleWebhookEvent: vi.fn(),
  }));

  const routerModule = await import('../routes/billing');
  const router = routerModule.default;

  // Find the GET /usage route handler from the router stack
  const layer = (router as any).stack.find(
    (l: any) => l.route?.path === '/usage' && l.route?.methods?.get,
  );
  if (!layer) throw new Error('GET /usage route not found');

  // The last handler in the route stack is the actual handler (after middleware)
  const handlers = layer.route.stack.map((s: any) => s.handle);
  return handlers[handlers.length - 1];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/billing/usage', () => {
  it('returns usage stats and free-tier limits for a free-tier admin', async () => {
    const handler = await getUsageHandler();

    mockedPrisma.admin.findUnique.mockResolvedValue({
      subscriptionPlan: null,
      restaurants: [{ id: 'rest-1' }],
    });
    mockedPrisma.menu.count.mockResolvedValue(2);
    mockedPrisma.menuItem.count.mockResolvedValue(15);

    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      plan: 'free',
      usage: { restaurants: 1, menus: 2, items: 15 },
      limits: { restaurants: 1, menusPerRestaurant: 2, itemsPerMenu: 20 },
    });
  });

  it('returns usage stats and pro limits for a pro admin', async () => {
    const handler = await getUsageHandler();

    mockedPrisma.admin.findUnique.mockResolvedValue({
      subscriptionPlan: 'pro',
      restaurants: [{ id: 'rest-1' }, { id: 'rest-2' }, { id: 'rest-3' }],
    });
    mockedPrisma.menu.count.mockResolvedValue(10);
    mockedPrisma.menuItem.count.mockResolvedValue(200);

    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body.plan).toBe('pro');
    expect(body.usage).toEqual({ restaurants: 3, menus: 10, items: 200 });
    // Infinity becomes null in JSON serialization, but here we're checking the raw object
    expect(body.limits.restaurants).toBe(Infinity);
    expect(body.limits.menusPerRestaurant).toBe(Infinity);
    expect(body.limits.itemsPerMenu).toBe(Infinity);
  });

  it('returns 401 when admin is not found', async () => {
    const handler = await getUsageHandler();

    mockedPrisma.admin.findUnique.mockResolvedValue(null);

    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin not found' });
  });

  it('returns zero counts when admin has no restaurants', async () => {
    const handler = await getUsageHandler();

    mockedPrisma.admin.findUnique.mockResolvedValue({
      subscriptionPlan: null,
      restaurants: [],
    });
    mockedPrisma.menu.count.mockResolvedValue(0);
    mockedPrisma.menuItem.count.mockResolvedValue(0);

    const req = createMockReq();
    const res = createMockRes();

    await handler(req, res);

    expect(res.json).toHaveBeenCalledWith({
      plan: 'free',
      usage: { restaurants: 0, menus: 0, items: 0 },
      limits: { restaurants: 1, menusPerRestaurant: 2, itemsPerMenu: 20 },
    });
  });
});
