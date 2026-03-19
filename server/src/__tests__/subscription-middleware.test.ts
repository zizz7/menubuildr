/**
 * Unit tests for subscription middleware.
 *
 * Tests that requireSubscription allows free-tier, none, active, and trialing
 * statuses through, adds a warning header for past_due, and blocks canceled.
 *
 * Validates: Requirements 1.2, 1.4, 8.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Response, NextFunction } from 'express';

// Mock Prisma before importing middleware
vi.mock('../config/database', () => {
  return {
    default: {
      admin: { findUnique: vi.fn() },
    },
  };
});

import prisma from '../config/database';
import { requireSubscription } from '../middleware/subscription';
import { AuthRequest } from '../middleware/auth';

const mockedPrisma = prisma as unknown as {
  admin: { findUnique: ReturnType<typeof vi.fn> };
};

const ADMIN_ID = 'admin-test-001';

function createMockReq(userId?: string): AuthRequest {
  return { userId: userId ?? ADMIN_ID } as AuthRequest;
}

function createMockRes() {
  const res: Partial<Response> = {
    headersSent: false,
  };
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res as Response;
}

function createMockNext(): NextFunction {
  return vi.fn();
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Allowed statuses pass through middleware
// Validates: Requirements 1.2, 1.4, 8.1
// ============================================================
describe('requireSubscription allows free-tier and active statuses', () => {
  it.each([
    ['free', 'free'],
    ['none', 'none'],
    ['active', 'active'],
    ['trialing', 'trialing'],
  ])('calls next() for subscriptionStatus = "%s"', async (_label, status) => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionStatus: status,
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await requireSubscription(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next() when subscriptionStatus is null (treated as "none")', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionStatus: null,
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await requireSubscription(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ============================================================
// past_due status: allowed with warning header
// Validates: Requirement 8.1
// ============================================================
describe('requireSubscription handles past_due status', () => {
  it('calls next() and sets X-Subscription-Warning header for past_due', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionStatus: 'past_due',
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await requireSubscription(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.setHeader).toHaveBeenCalledWith('X-Subscription-Warning', 'past_due');
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ============================================================
// Blocked statuses
// ============================================================
describe('requireSubscription blocks canceled status', () => {
  it('returns 403 for canceled subscriptionStatus', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue({
      id: ADMIN_ID,
      subscriptionStatus: 'canceled',
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await requireSubscription(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Subscription required',
      code: 'SUBSCRIPTION_REQUIRED',
      subscriptionStatus: 'canceled',
    });
  });
});

// ============================================================
// Admin not found
// ============================================================
describe('requireSubscription handles missing admin', () => {
  it('returns 401 when admin is not found', async () => {
    mockedPrisma.admin.findUnique.mockResolvedValue(null);

    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    await requireSubscription(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin not found' });
  });
});
