/**
 * Unit tests for resolveStripePriceId in billing service.
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolveStripePriceId } from '../services/billing';

describe('resolveStripePriceId', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear all Stripe price env vars before each test
    delete process.env.STRIPE_PRICE_PRO_MONTHLY;
    delete process.env.STRIPE_PRICE_PRO_ANNUAL;
    delete process.env.STRIPE_PRICE_ID;
  });

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
  });

  // --- Monthly billing cycle ---

  it('returns STRIPE_PRICE_PRO_MONTHLY for monthly billing when set', () => {
    process.env.STRIPE_PRICE_PRO_MONTHLY = 'price_monthly_123';
    process.env.STRIPE_PRICE_ID = 'price_legacy_456';

    expect(resolveStripePriceId('monthly')).toBe('price_monthly_123');
  });

  it('falls back to STRIPE_PRICE_ID for monthly when STRIPE_PRICE_PRO_MONTHLY is not set', () => {
    process.env.STRIPE_PRICE_ID = 'price_legacy_456';

    expect(resolveStripePriceId('monthly')).toBe('price_legacy_456');
  });

  it('throws when neither STRIPE_PRICE_PRO_MONTHLY nor STRIPE_PRICE_ID is set for monthly', () => {
    expect(() => resolveStripePriceId('monthly')).toThrow(
      'Neither STRIPE_PRICE_PRO_MONTHLY nor STRIPE_PRICE_ID environment variable is configured',
    );
  });

  // --- Annual billing cycle ---

  it('returns STRIPE_PRICE_PRO_ANNUAL for annual billing when set', () => {
    process.env.STRIPE_PRICE_PRO_ANNUAL = 'price_annual_789';

    expect(resolveStripePriceId('annual')).toBe('price_annual_789');
  });

  it('throws when STRIPE_PRICE_PRO_ANNUAL is not set for annual billing', () => {
    expect(() => resolveStripePriceId('annual')).toThrow(
      'STRIPE_PRICE_PRO_ANNUAL environment variable is not configured',
    );
  });
});
