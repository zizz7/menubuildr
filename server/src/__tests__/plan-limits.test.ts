/**
 * Unit tests for getPlanLimits helper and PLAN_LIMITS configuration.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { describe, it, expect } from 'vitest';
import { getPlanLimits, PLAN_LIMITS } from '../config/limits';

// ============================================================
// Free-tier limits — "free", "none", undefined, null
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5
// ============================================================
describe('getPlanLimits returns free-tier limits for non-pro plans', () => {
  it.each([
    ['free', 'free'],
    ['none', 'none'],
    ['undefined', undefined],
    ['null', null],
  ])('returns free-tier limits for plan = %s', (_label, plan) => {
    const limits = getPlanLimits(plan as string | null | undefined);

    expect(limits.restaurants).toBe(1);
    expect(limits.menusPerRestaurant).toBe(2);
    expect(limits.itemsPerMenu).toBe(20);
    expect(limits.languages).toBe(1);
    expect(limits.templates).toEqual(['classic']);
  });

  it('returns the same object reference as PLAN_LIMITS.free', () => {
    expect(getPlanLimits('free')).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits(undefined)).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits(null)).toBe(PLAN_LIMITS.free);
    expect(getPlanLimits('none')).toBe(PLAN_LIMITS.free);
  });

  it('returns free-tier limits for any unrecognized plan string', () => {
    const limits = getPlanLimits('enterprise');
    expect(limits).toBe(PLAN_LIMITS.free);
  });
});

// ============================================================
// Pro-tier limits
// Validates: Requirements 2.6, 2.7
// ============================================================
describe('getPlanLimits returns pro limits for "pro" plan', () => {
  it('returns unlimited (Infinity) for all numeric limits', () => {
    const limits = getPlanLimits('pro');

    expect(limits.restaurants).toBe(Infinity);
    expect(limits.menusPerRestaurant).toBe(Infinity);
    expect(limits.itemsPerMenu).toBe(Infinity);
    expect(limits.languages).toBe(Infinity);
  });

  it('returns all templates for pro plan', () => {
    const limits = getPlanLimits('pro');
    expect(limits.templates).toEqual(['all']);
  });

  it('returns the same object reference as PLAN_LIMITS.pro', () => {
    expect(getPlanLimits('pro')).toBe(PLAN_LIMITS.pro);
  });
});
