/**
 * Unit tests for item route ownership checks including bulk operations.
 *
 * Feature: multi-tenancy
 * Property 8: Item operations require ownership chain verification
 * Property 9: Bulk item operations require all items owned
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing routes
vi.mock('../config/database', () => {
  return {
    default: {
      menuItem: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      section: {
        findUnique: vi.fn(),
      },
      recipeDetails: {
        upsert: vi.fn(),
      },
    },
  };
});

// Mock ownership helpers
vi.mock('../middleware/ownership', () => {
  return {
    verifySectionOwnership: vi.fn(),
    verifyItemOwnership: vi.fn(),
    verifyBulkItemOwnership: vi.fn(),
  };
});

// Mock auth middleware to pass through with req.userId set
vi.mock('../middleware/auth', () => {
  return {
    authenticateToken: vi.fn((_req: any, _res: any, next: any) => {
      next();
    }),
    AuthRequest: {},
  };
});

// Mock subscription middleware to pass through
vi.mock('../middleware/subscription', () => ({
  requireSubscription: vi.fn((req: any, res: any, next: any) => next()),
}));

// Mock regenerateMenuIfPublished
vi.mock('../utils/regenerate-menu', () => ({
  regenerateMenuIfPublished: vi.fn().mockResolvedValue(undefined),
}));

import prisma from '../config/database';
import { verifySectionOwnership, verifyItemOwnership, verifyBulkItemOwnership } from '../middleware/ownership';
import express from 'express';
import itemRouter from '../routes/items';

// --- Typed mocks ---
const mockedPrisma = prisma as unknown as {
  menuItem: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  section: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  recipeDetails: {
    upsert: ReturnType<typeof vi.fn>;
  };
};

const mockedVerifySectionOwnership = verifySectionOwnership as ReturnType<typeof vi.fn>;
const mockedVerifyItemOwnership = verifyItemOwnership as ReturnType<typeof vi.fn>;
const mockedVerifyBulkItemOwnership = verifyBulkItemOwnership as ReturnType<typeof vi.fn>;

// --- Constants ---
const OWNER_ID = 'owner-admin-id';
const OTHER_ID = 'other-admin-id';
const SECTION_ID = 'section-123';
const ITEM_ID = 'item-456';
const ITEM_ID_2 = 'item-789';

const VALID_ITEM_DATA = {
  name: { ENG: 'Caesar Salad' },
  price: 12.99,
};

// --- Test helpers ---
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemRouter);
  return app;
}

async function makeRequest(
  app: express.Express,
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: any,
  userId?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve) => {
    const req: any = {
      method: method.toUpperCase(),
      url: path,
      headers: { 'content-type': 'application/json' },
      body: body || {},
    };
    if (userId) req.userId = userId;

    const chunks: Buffer[] = [];
    const res: any = {
      statusCode: 200,
      _headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        this._headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return this._headers[name.toLowerCase()];
      },
      writeHead(status: number) {
        this.statusCode = status;
        return this;
      },
      write(chunk: any) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      },
      end(chunk?: any) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const raw = Buffer.concat(chunks).toString();
        let parsed: any;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: this.statusCode, body: parsed });
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
      send(data: any) {
        resolve({ status: this.statusCode, body: data });
      },
    };

    app.handle(req, res, () => {
      resolve({ status: 404, body: { error: 'Not found' } });
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});


// ============================================================
// POST /section/:sectionId — create item
// **Validates: Requirement 7.1**
// ============================================================
describe('POST /section/:sectionId — create item', () => {
  it('creates item when admin owns the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: true, resourceId: SECTION_ID });
    mockedPrisma.section.findUnique.mockResolvedValue({ menuId: 'menu-1' });
    mockedPrisma.menuItem.count.mockResolvedValue(0);
    mockedPrisma.menuItem.create.mockResolvedValue({
      id: ITEM_ID,
      ...VALID_ITEM_DATA,
      sectionId: SECTION_ID,
      orderIndex: 0,
      allergens: [],
      recipeDetails: null,
      priceVariations: [],
    });

    const result = await makeRequest(app, 'post', `/api/items/section/${SECTION_ID}`, VALID_ITEM_DATA, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifySectionOwnership).toHaveBeenCalledWith(SECTION_ID, OWNER_ID);
    expect(mockedPrisma.menuItem.create).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/items/section/${SECTION_ID}`, VALID_ITEM_DATA, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Section not found');
    expect(mockedPrisma.menuItem.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// GET /:id — get single item
// **Validates: Requirement 7.2**
// ============================================================
describe('GET /:id — get single item', () => {
  it('returns item when admin owns it', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      name: { ENG: 'Caesar Salad' },
      allergens: [],
      recipeDetails: null,
      priceVariations: [],
      category: null,
      section: { menu: { id: 'menu-1' } },
    });

    const result = await makeRequest(app, 'get', `/api/items/${ITEM_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'get', `/api/items/${ITEM_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Item not found');
    expect(mockedPrisma.menuItem.findUnique).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id — update item
// **Validates: Requirement 7.2**
// ============================================================
describe('PUT /:id — update item', () => {
  it('updates item when admin owns it', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      section: { menuId: 'menu-1' },
    });
    mockedPrisma.menuItem.update.mockResolvedValue({
      id: ITEM_ID,
      name: { ENG: 'Updated Salad' },
      allergens: [],
      recipeDetails: null,
      priceVariations: [],
    });

    const result = await makeRequest(app, 'put', `/api/items/${ITEM_ID}`, { name: { ENG: 'Updated Salad' } }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.menuItem.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/items/${ITEM_ID}`, { name: { ENG: 'Hacked' } }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Item not found');
    expect(mockedPrisma.menuItem.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// DELETE /:id — delete item
// **Validates: Requirement 7.3**
// ============================================================
describe('DELETE /:id — delete item', () => {
  it('deletes item when admin owns it', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      section: { menuId: 'menu-1' },
    });
    mockedPrisma.menuItem.delete.mockResolvedValue({ id: ITEM_ID });

    const result = await makeRequest(app, 'delete', `/api/items/${ITEM_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.menuItem.delete).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'delete', `/api/items/${ITEM_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Item not found');
    expect(mockedPrisma.menuItem.delete).not.toHaveBeenCalled();
  });
});


// ============================================================
// POST /:id/duplicate — duplicate item
// **Validates: Requirement 7.2 (item operations ownership)**
// ============================================================
describe('POST /:id/duplicate — duplicate item', () => {
  it('duplicates item when admin owns it', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      name: { ENG: 'Caesar Salad' },
      description: null,
      price: 12.99,
      imageUrl: null,
      sectionId: SECTION_ID,
      categoryId: null,
      orderIndex: 0,
      isAvailable: true,
      preparationTime: null,
      calories: null,
      allergens: [],
      recipeDetails: null,
      priceVariations: [],
      availabilitySchedule: null,
      section: { menuId: 'menu-1' },
    });
    mockedPrisma.menuItem.count.mockResolvedValue(1);
    mockedPrisma.menuItem.create.mockResolvedValue({
      id: 'new-item-id',
      name: { ENG: 'Caesar Salad' },
      sectionId: SECTION_ID,
      allergens: [],
      recipeDetails: null,
      priceVariations: [],
    });

    const result = await makeRequest(app, 'post', `/api/items/${ITEM_ID}/duplicate`, {}, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/items/${ITEM_ID}/duplicate`, {}, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Item not found');
    expect(mockedPrisma.menuItem.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.menuItem.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id/reorder — reorder item
// **Validates: Requirement 7.2 (item operations ownership)**
// ============================================================
describe('PUT /:id/reorder — reorder item', () => {
  it('reorders item when admin owns it', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      section: { menuId: 'menu-1' },
    });
    mockedPrisma.menuItem.update.mockResolvedValue({
      id: ITEM_ID,
      orderIndex: 3,
    });

    const result = await makeRequest(app, 'put', `/api/items/${ITEM_ID}/reorder`, { orderIndex: 3 }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.menuItem.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/items/${ITEM_ID}/reorder`, { orderIndex: 3 }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Item not found');
    expect(mockedPrisma.menuItem.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id/recipe — update recipe
// **Validates: Requirement 7.2 (item operations ownership)**
// ============================================================
describe('PUT /:id/recipe — update recipe', () => {
  it('updates recipe when admin owns the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.findUnique.mockResolvedValue({
      id: ITEM_ID,
      section: { menuId: 'menu-1' },
    });
    mockedPrisma.recipeDetails.upsert.mockResolvedValue({
      id: 'recipe-1',
      menuItemId: ITEM_ID,
      ingredients: { ENG: 'Lettuce, croutons' },
      instructions: 'Toss together',
    });

    const result = await makeRequest(
      app,
      'put',
      `/api/items/${ITEM_ID}/recipe`,
      { ingredients: { ENG: 'Lettuce, croutons' }, instructions: 'Toss together' },
      OWNER_ID
    );

    expect(result.status).toBe(200);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.recipeDetails.upsert).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'put',
      `/api/items/${ITEM_ID}/recipe`,
      { ingredients: { ENG: 'Hacked' } },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Item not found');
    expect(mockedPrisma.recipeDetails.upsert).not.toHaveBeenCalled();
  });
});


// ============================================================
// POST /bulk-update — bulk update items
// **Property 9: Bulk item operations require all items owned**
// **Validates: Requirement 7.4**
// ============================================================
describe('POST /bulk-update — bulk update items', () => {
  it('updates all items when admin owns every item', async () => {
    const app = createApp();
    mockedVerifyBulkItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.updateMany.mockResolvedValue({ count: 2 });

    const result = await makeRequest(
      app,
      'post',
      '/api/items/bulk-update',
      { itemIds: [ITEM_ID, ITEM_ID_2], updates: { isAvailable: false } },
      OWNER_ID
    );

    expect(result.status).toBe(200);
    expect(result.body.updated).toBe(2);
    expect(mockedVerifyBulkItemOwnership).toHaveBeenCalledWith([ITEM_ID, ITEM_ID_2], OWNER_ID);
    expect(mockedPrisma.menuItem.updateMany).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own all items', async () => {
    const app = createApp();
    mockedVerifyBulkItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      '/api/items/bulk-update',
      { itemIds: [ITEM_ID, ITEM_ID_2], updates: { isAvailable: false } },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('One or more items not found');
    expect(mockedPrisma.menuItem.updateMany).not.toHaveBeenCalled();
  });

  it('returns 404 with mixed ownership (some owned, some not)', async () => {
    const app = createApp();
    mockedVerifyBulkItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      '/api/items/bulk-update',
      { itemIds: [ITEM_ID, 'foreign-item-id'], updates: { isAvailable: true } },
      OWNER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('One or more items not found');
    expect(mockedPrisma.menuItem.updateMany).not.toHaveBeenCalled();
  });
});

// ============================================================
// POST /bulk-delete — bulk delete items
// **Property 9: Bulk item operations require all items owned**
// **Validates: Requirement 7.5**
// ============================================================
describe('POST /bulk-delete — bulk delete items', () => {
  it('deletes all items when admin owns every item', async () => {
    const app = createApp();
    mockedVerifyBulkItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItem.deleteMany.mockResolvedValue({ count: 2 });

    const result = await makeRequest(
      app,
      'post',
      '/api/items/bulk-delete',
      { itemIds: [ITEM_ID, ITEM_ID_2] },
      OWNER_ID
    );

    expect(result.status).toBe(200);
    expect(result.body.deleted).toBe(2);
    expect(mockedVerifyBulkItemOwnership).toHaveBeenCalledWith([ITEM_ID, ITEM_ID_2], OWNER_ID);
    expect(mockedPrisma.menuItem.deleteMany).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own all items', async () => {
    const app = createApp();
    mockedVerifyBulkItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      '/api/items/bulk-delete',
      { itemIds: [ITEM_ID, ITEM_ID_2] },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('One or more items not found');
    expect(mockedPrisma.menuItem.deleteMany).not.toHaveBeenCalled();
  });

  it('returns 404 with mixed ownership (some owned, some not)', async () => {
    const app = createApp();
    mockedVerifyBulkItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      '/api/items/bulk-delete',
      { itemIds: [ITEM_ID, 'foreign-item-id'] },
      OWNER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('One or more items not found');
    expect(mockedPrisma.menuItem.deleteMany).not.toHaveBeenCalled();
  });
});
