/**
 * Unit tests for ownership verification helpers.
 *
 * Feature: multi-tenancy
 * Tests ownership helpers with concrete examples covering:
 *   - Owned resources (authorized: true)
 *   - Non-owned resources (authorized: false)
 *   - Non-existent resources (authorized: false)
 *   - Bulk operations with mixed ownership and empty arrays
 *
 * Validates: Requirements 2.2, 2.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  verifyCategoryOwnership,
} from '../middleware/ownership';

const mockedPrisma = prisma as unknown as {
  restaurant: { findUnique: ReturnType<typeof vi.fn> };
  menu: { findUnique: ReturnType<typeof vi.fn> };
  section: { findUnique: ReturnType<typeof vi.fn> };
  menuItem: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  category: { findUnique: ReturnType<typeof vi.fn> };
};

const ADMIN_A = 'admin-aaa-1111';
const ADMIN_B = 'admin-bbb-2222';
const RESTAURANT_1 = 'rest-1111';
const MENU_1 = 'menu-1111';
const SECTION_1 = 'section-1111';
const ITEM_1 = 'item-1111';
const ITEM_2 = 'item-2222';
const ITEM_3 = 'item-3333';
const CATEGORY_1 = 'category-1111';

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// verifyRestaurantOwnership
// ============================================================
describe('verifyRestaurantOwnership', () => {
  it('returns authorized:true for owned restaurant', async () => {
    mockedPrisma.restaurant.findUnique.mockResolvedValue({
      id: RESTAURANT_1,
      adminId: ADMIN_A,
    });

    const result = await verifyRestaurantOwnership(RESTAURANT_1, ADMIN_A);
    expect(result).toEqual({ authorized: true, resourceId: RESTAURANT_1 });
  });

  it('returns authorized:false for non-owned restaurant', async () => {
    mockedPrisma.restaurant.findUnique.mockResolvedValue({
      id: RESTAURANT_1,
      adminId: ADMIN_A,
    });

    const result = await verifyRestaurantOwnership(RESTAURANT_1, ADMIN_B);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false for non-existent restaurant', async () => {
    mockedPrisma.restaurant.findUnique.mockResolvedValue(null);

    const result = await verifyRestaurantOwnership('nonexistent-id', ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });
});

// ============================================================
// verifyMenuOwnership
// ============================================================
describe('verifyMenuOwnership', () => {
  it('returns authorized:true for menu in owned restaurant', async () => {
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: MENU_1,
      restaurant: { adminId: ADMIN_A },
    });

    const result = await verifyMenuOwnership(MENU_1, ADMIN_A);
    expect(result).toEqual({ authorized: true, resourceId: MENU_1 });
  });

  it('returns authorized:false for menu in non-owned restaurant', async () => {
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: MENU_1,
      restaurant: { adminId: ADMIN_A },
    });

    const result = await verifyMenuOwnership(MENU_1, ADMIN_B);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false for non-existent menu', async () => {
    mockedPrisma.menu.findUnique.mockResolvedValue(null);

    const result = await verifyMenuOwnership('nonexistent-id', ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });
});

// ============================================================
// verifySectionOwnership
// ============================================================
describe('verifySectionOwnership', () => {
  it('returns authorized:true for section in owned chain', async () => {
    mockedPrisma.section.findUnique.mockResolvedValue({
      id: SECTION_1,
      menu: { restaurant: { adminId: ADMIN_A } },
    });

    const result = await verifySectionOwnership(SECTION_1, ADMIN_A);
    expect(result).toEqual({ authorized: true, resourceId: SECTION_1 });
  });

  it('returns authorized:false for section in non-owned chain', async () => {
    mockedPrisma.section.findUnique.mockResolvedValue({
      id: SECTION_1,
      menu: { restaurant: { adminId: ADMIN_A } },
    });

    const result = await verifySectionOwnership(SECTION_1, ADMIN_B);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false for non-existent section', async () => {
    mockedPrisma.section.findUnique.mockResolvedValue(null);

    const result = await verifySectionOwnership('nonexistent-id', ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });
});

// ============================================================
// verifyItemOwnership
// ============================================================
describe('verifyItemOwnership', () => {
  it('returns authorized:true for item in owned chain', async () => {
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_1,
      section: { menu: { restaurant: { adminId: ADMIN_A } } },
    });

    const result = await verifyItemOwnership(ITEM_1, ADMIN_A);
    expect(result).toEqual({ authorized: true, resourceId: ITEM_1 });
  });

  it('returns authorized:false for item in non-owned chain', async () => {
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_1,
      section: { menu: { restaurant: { adminId: ADMIN_A } } },
    });

    const result = await verifyItemOwnership(ITEM_1, ADMIN_B);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false for non-existent item', async () => {
    mockedPrisma.menuItem.findUnique.mockResolvedValue(null);

    const result = await verifyItemOwnership('nonexistent-id', ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });
});

// ============================================================
// verifyCategoryOwnership
// ============================================================
describe('verifyCategoryOwnership', () => {
  it('returns authorized:true for category in owned chain', async () => {
    mockedPrisma.category.findUnique.mockResolvedValue({
      id: CATEGORY_1,
      section: { menu: { restaurant: { adminId: ADMIN_A } } },
    });

    const result = await verifyCategoryOwnership(CATEGORY_1, ADMIN_A);
    expect(result).toEqual({ authorized: true, resourceId: CATEGORY_1 });
  });

  it('returns authorized:false for category in non-owned chain', async () => {
    mockedPrisma.category.findUnique.mockResolvedValue({
      id: CATEGORY_1,
      section: { menu: { restaurant: { adminId: ADMIN_A } } },
    });

    const result = await verifyCategoryOwnership(CATEGORY_1, ADMIN_B);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false for non-existent category', async () => {
    mockedPrisma.category.findUnique.mockResolvedValue(null);

    const result = await verifyCategoryOwnership('nonexistent-id', ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });
});

// ============================================================
// verifyBulkItemOwnership
// ============================================================
describe('verifyBulkItemOwnership', () => {
  it('returns authorized:true when all items belong to the admin', async () => {
    mockedPrisma.menuItem.findMany.mockResolvedValue([
      { id: ITEM_1, section: { menu: { restaurant: { adminId: ADMIN_A } } } },
      { id: ITEM_2, section: { menu: { restaurant: { adminId: ADMIN_A } } } },
    ]);

    const result = await verifyBulkItemOwnership([ITEM_1, ITEM_2], ADMIN_A);
    expect(result.authorized).toBe(true);
  });

  it('returns authorized:false with mixed ownership', async () => {
    mockedPrisma.menuItem.findMany.mockResolvedValue([
      { id: ITEM_1, section: { menu: { restaurant: { adminId: ADMIN_A } } } },
      { id: ITEM_2, section: { menu: { restaurant: { adminId: ADMIN_B } } } },
    ]);

    const result = await verifyBulkItemOwnership([ITEM_1, ITEM_2], ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false when some items do not exist', async () => {
    mockedPrisma.menuItem.findMany.mockResolvedValue([
      { id: ITEM_1, section: { menu: { restaurant: { adminId: ADMIN_A } } } },
    ]);

    const result = await verifyBulkItemOwnership([ITEM_1, ITEM_2, ITEM_3], ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:false when no items exist', async () => {
    mockedPrisma.menuItem.findMany.mockResolvedValue([]);

    const result = await verifyBulkItemOwnership([ITEM_1], ADMIN_A);
    expect(result).toEqual({ authorized: false });
  });

  it('returns authorized:true for empty item array', async () => {
    const result = await verifyBulkItemOwnership([], ADMIN_A);
    expect(result).toEqual({ authorized: true, resourceId: '' });
  });
});
