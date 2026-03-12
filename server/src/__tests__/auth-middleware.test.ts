/**
 * Unit tests for hardened auth middleware.
 *
 * Feature: multi-tenancy
 * Property 14: Auth middleware rejects unauthenticated requests
 * Property 15: Auth middleware extracts userId from valid token
 * Property 16: Auth middleware rejects invalid tokens
 *
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { Response, NextFunction } from 'express';

const JWT_SECRET = 'secret';

function createMockReq(authHeader?: string): AuthRequest {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as AuthRequest;
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

function signToken(payload: object, options?: jwt.SignOptions): string {
  return jwt.sign(payload, JWT_SECRET, options);
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.JWT_SECRET;
});

// ============================================================
// Property 14: Auth middleware rejects unauthenticated requests
// Validates: Requirements 11.1, 11.4
// ============================================================
describe('Property 14: Auth middleware rejects unauthenticated requests', () => {
  it('returns 401 when no Authorization header is present', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
    expect(req.userId).toBeUndefined();
  });

  it('returns 401 when Authorization header has no Bearer token', () => {
    const req = createMockReq('Bearer ');
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is just "Bearer"', () => {
    const req = createMockReq('Bearer');
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('does not set req.userId to any fallback value when token is missing', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(req.userId).toBeUndefined();
    expect(req.userId).not.toBe('local-admin');
  });
});

// ============================================================
// Property 15: Auth middleware extracts userId from valid token
// Validates: Requirement 11.2
// ============================================================
describe('Property 15: Auth middleware extracts userId from valid token', () => {
  it('sets req.userId from a valid JWT token', () => {
    const token = signToken({ userId: 'user-123' });
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('sets req.userId correctly for different user IDs', () => {
    const token = signToken({ userId: 'admin-abc-999' });
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(req.userId).toBe('admin-abc-999');
    expect(next).toHaveBeenCalledOnce();
  });

  it('uses JWT_SECRET from environment when available', () => {
    process.env.JWT_SECRET = 'custom-secret';
    const token = jwt.sign({ userId: 'user-env' }, 'custom-secret');
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(req.userId).toBe('user-env');
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects token signed with wrong secret when JWT_SECRET is set', () => {
    process.env.JWT_SECRET = 'correct-secret';
    const token = jwt.sign({ userId: 'user-wrong' }, 'wrong-secret');
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});

// ============================================================
// Property 16: Auth middleware rejects invalid tokens
// Validates: Requirements 11.3
// ============================================================
describe('Property 16: Auth middleware rejects invalid tokens', () => {
  it('returns 401 for an expired token', () => {
    const token = signToken({ userId: 'user-expired' }, { expiresIn: '-1s' });
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a malformed token', () => {
    const req = createMockReq('Bearer not-a-valid-jwt');
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token with tampered payload', () => {
    const token = signToken({ userId: 'user-tampered' });
    // Tamper with the payload portion of the JWT
    const parts = token.split('.');
    parts[1] = Buffer.from('{"userId":"hacker"}').toString('base64url');
    const tamperedToken = parts.join('.');

    const req = createMockReq(`Bearer ${tamperedToken}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token signed with a different secret', () => {
    const token = jwt.sign({ userId: 'user-wrong-secret' }, 'different-secret');
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for a token missing the userId claim', () => {
    const token = signToken({ sub: 'no-userId-field' });
    const req = createMockReq(`Bearer ${token}`);
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('does not set req.userId to a fallback for invalid tokens', () => {
    const req = createMockReq('Bearer garbage-token');
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(req.userId).toBeUndefined();
    expect(req.userId).not.toBe('local-admin');
  });
});
