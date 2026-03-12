/**
 * Property-based tests for ownership verification helpers.
 *
 * Feature: multi-tenancy
 * Properties tested:
 *   Property 3: Restaurant single access requires ownership
 *   Property 6: Menu operations require parent restaurant ownership
 *   Property 7: Section operations require ownership chain verification
 *   Property 8: Item operations require ownership chain verification
 *   Property 9: Bulk item operations require all items owned
 *
 * Validates: Requirements 2.2, 2.3, 5.3, 5.4, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Prisma before importing ownership helpers
vi.mock('../config/database', () => {
  return {
    default: {
      restaurant: { findUnique: vi.fn() },
      menu: { findUnique: vi.fn() },
      section: { findUnique: vi.fn() },
      menuItem: { findUnique: vi.fn(), findMany: vi.fn() },
      category: { findUnique: vi.fn() },
    },
  };
});

import prisma from '../config/database';
import {
  verifyRestaurantOwnership,
  verifyMenuOwnership,
  verifySectionOwnership,
  verifyItemOwnership,
  verifyBulkItemOwnership,
} from '../middleware/ownership';

// --- Arbitraries ---

/** UUID-like string arbitrary */
const arbId = fc.uuid();

/** Two distinct admin IDs (owner vs. other) */
const arbTwoAdmins = fc.tuple(arbId, arbId).filter(([a, b]) => a !== b);

// --- Helpers ---

const mockedPrisma = prisma as unknown as {
  restaurant: { findUnique: ReturnType<typeof vi.fn> };
  menu: { findUnique: ReturnType<typeof vi.fn> };
  section: { findUnique: ReturnType<typeof vi.fn> };
  menuItem: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  category: { findUnique: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Property 3: Restaurant single access requires ownership
// ============================================================
describe('Property 3: Restaurant single access requires ownership', () => {
  it('returns authorized:true when adminId matches the restaurant owner', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (restaurantId, adminId) => {
        mockedPrisma.restaurant.findUnique.mockResolvedValue({
          id: restaurantId,
          adminId,
        });

        const result = await verifyRestaurantOwnership(restaurantId, adminId);
        expect(result).toEqual({ authorized: true, resourceId: restaurantId });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when adminId does not match the restaurant owner', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (restaurantId, [ownerId, requesterId]) => {
        mockedPrisma.restaurant.findUnique.mockResolvedValue({
          id: restaurantId,
          adminId: ownerId,
        });

        const result = await verifyRestaurantOwnership(restaurantId, requesterId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when restaurant does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (restaurantId, adminId) => {
        mockedPrisma.restaurant.findUnique.mockResolvedValue(null);

        const result = await verifyRestaurantOwnership(restaurantId, adminId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 6: Menu operations require parent restaurant ownership
// ============================================================
describe('Property 6: Menu operations require parent restaurant ownership', () => {
  it('returns authorized:true when menu parent restaurant is owned by admin', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (menuId, adminId) => {
        mockedPrisma.menu.findUnique.mockResolvedValue({
          id: menuId,
          restaurant: { adminId },
        });

        const result = await verifyMenuOwnership(menuId, adminId);
        expect(result).toEqual({ authorized: true, resourceId: menuId });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when menu parent restaurant belongs to different admin', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (menuId, [ownerId, requesterId]) => {
        mockedPrisma.menu.findUnique.mockResolvedValue({
          id: menuId,
          restaurant: { adminId: ownerId },
        });

        const result = await verifyMenuOwnership(menuId, requesterId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when menu does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (menuId, adminId) => {
        mockedPrisma.menu.findUnique.mockResolvedValue(null);

        const result = await verifyMenuOwnership(menuId, adminId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 7: Section operations require ownership chain verification
// ============================================================
describe('Property 7: Section operations require ownership chain verification', () => {
  it('returns authorized:true when section chain traces to owned restaurant', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (sectionId, adminId) => {
        mockedPrisma.section.findUnique.mockResolvedValue({
          id: sectionId,
          menu: { restaurant: { adminId } },
        });

        const result = await verifySectionOwnership(sectionId, adminId);
        expect(result).toEqual({ authorized: true, resourceId: sectionId });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when section chain traces to different admin', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (sectionId, [ownerId, requesterId]) => {
        mockedPrisma.section.findUnique.mockResolvedValue({
          id: sectionId,
          menu: { restaurant: { adminId: ownerId } },
        });

        const result = await verifySectionOwnership(sectionId, requesterId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when section does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (sectionId, adminId) => {
        mockedPrisma.section.findUnique.mockResolvedValue(null);

        const result = await verifySectionOwnership(sectionId, adminId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 8: Item operations require ownership chain verification
// ============================================================
describe('Property 8: Item operations require ownership chain verification', () => {
  it('returns authorized:true when item chain traces to owned restaurant', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (itemId, adminId) => {
        mockedPrisma.menuItem.findUnique.mockResolvedValue({
          id: itemId,
          section: { menu: { restaurant: { adminId } } },
        });

        const result = await verifyItemOwnership(itemId, adminId);
        expect(result).toEqual({ authorized: true, resourceId: itemId });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when item chain traces to different admin', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (itemId, [ownerId, requesterId]) => {
        mockedPrisma.menuItem.findUnique.mockResolvedValue({
          id: itemId,
          section: { menu: { restaurant: { adminId: ownerId } } },
        });

        const result = await verifyItemOwnership(itemId, requesterId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when item does not exist', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (itemId, adminId) => {
        mockedPrisma.menuItem.findUnique.mockResolvedValue(null);

        const result = await verifyItemOwnership(itemId, adminId);
        expect(result).toEqual({ authorized: false });
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================
// Property 9: Bulk item operations require all items owned
// ============================================================
describe('Property 9: Bulk item operations require all items owned', () => {
  it('returns authorized:true when all items belong to the requesting admin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbId, { minLength: 1, maxLength: 10 }),
        arbId,
        async (itemIds, adminId) => {
          const items = itemIds.map((id) => ({
            id,
            section: { menu: { restaurant: { adminId } } },
          }));
          mockedPrisma.menuItem.findMany.mockResolvedValue(items);

          const result = await verifyBulkItemOwnership(itemIds, adminId);
          expect(result.authorized).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when any item belongs to a different admin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbId, { minLength: 2, maxLength: 10 }),
        arbTwoAdmins,
        async (itemIds, [ownerId, requesterId]) => {
          // First item owned by requester, rest owned by someone else
          const items = itemIds.map((id, i) => ({
            id,
            section: {
              menu: {
                restaurant: { adminId: i === 0 ? requesterId : ownerId },
              },
            },
          }));
          mockedPrisma.menuItem.findMany.mockResolvedValue(items);

          const result = await verifyBulkItemOwnership(itemIds, requesterId);
          expect(result.authorized).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when some items do not exist', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbId, { minLength: 2, maxLength: 10 }),
        arbId,
        async (itemIds, adminId) => {
          // Return fewer items than requested (simulating missing items)
          const partialItems = itemIds.slice(0, Math.max(1, itemIds.length - 1)).map((id) => ({
            id,
            section: { menu: { restaurant: { adminId } } },
          }));
          mockedPrisma.menuItem.findMany.mockResolvedValue(partialItems);

          const result = await verifyBulkItemOwnership(itemIds, adminId);
          expect(result.authorized).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns authorized:true for empty item array', async () => {
    await fc.assert(
      fc.asyncProperty(arbId, async (adminId) => {
        const result = await verifyBulkItemOwnership([], adminId);
        expect(result).toEqual({ authorized: true, resourceId: '' });
      }),
      { numRuns: 100 }
    );
  });

  it('returns authorized:false when no items exist at all', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(arbId, { minLength: 1, maxLength: 10 }),
        arbId,
        async (itemIds, adminId) => {
          mockedPrisma.menuItem.findMany.mockResolvedValue([]);

          const result = await verifyBulkItemOwnership(itemIds, adminId);
          expect(result.authorized).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
