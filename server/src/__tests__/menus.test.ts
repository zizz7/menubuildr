/**
 * Unit tests for menu route ownership checks.
 *
 * Feature: multi-tenancy
 * Property 6: Menu operations require parent restaurant ownership
 *
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing routes
vi.mock('../config/database', () => {
  return {
    default: {
      menu: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      menuVersion: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      restaurant: {
        findUnique: vi.fn(),
      },
      language: { findMany: vi.fn() },
      allergenIcon: { findMany: vi.fn() },
      allergenSettings: { findFirst: vi.fn() },
      menuTemplate: { findUnique: vi.fn() },
    },
  };
});

// Mock ownership helpers
vi.mock('../middleware/ownership', () => {
  return {
    verifyRestaurantOwnership: vi.fn(),
    verifyMenuOwnership: vi.fn(),
  };
});

// Mock auth middleware to pass through with req.userId set
vi.mock('../middleware/auth', () => {
  return {
    authenticateToken: vi.fn((req: any, _res: any, next: any) => {
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

// Mock menu-generator
vi.mock('../services/menu-generator', () => ({
  generateHTML: vi.fn().mockReturnValue('<html></html>'),
  generateMenuHTML: vi.fn().mockResolvedValue(undefined),
}));

// Mock template-registry
vi.mock('../services/template-registry', () => ({
  getTemplateGenerator: vi.fn().mockReturnValue(null),
}));

// Mock auto-translate
vi.mock('../services/auto-translate', () => ({
  autoTranslateMenu: vi.fn().mockResolvedValue({
    translatedItems: 0,
    translatedSections: 0,
    errors: [],
  }),
}));

import prisma from '../config/database';
import { verifyRestaurantOwnership, verifyMenuOwnership } from '../middleware/ownership';
import express from 'express';
import menuRouter from '../routes/menus';

// --- Typed mocks ---
const mockedPrisma = prisma as unknown as {
  menu: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  menuVersion: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  restaurant: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  language: { findMany: ReturnType<typeof vi.fn> };
  allergenIcon: { findMany: ReturnType<typeof vi.fn> };
  allergenSettings: { findFirst: ReturnType<typeof vi.fn> };
  menuTemplate: { findUnique: ReturnType<typeof vi.fn> };
};

const mockedVerifyRestaurantOwnership = verifyRestaurantOwnership as ReturnType<typeof vi.fn>;
const mockedVerifyMenuOwnership = verifyMenuOwnership as ReturnType<typeof vi.fn>;

// --- Constants ---
const OWNER_ID = 'owner-admin-id';
const OTHER_ID = 'other-admin-id';
const RESTAURANT_ID = 'restaurant-123';
const MENU_ID = 'menu-456';

const VALID_MENU_DATA = {
  name: { ENG: 'Test Menu' },
  slug: 'test-menu',
  menuType: 'lunch',
};

// --- Test helpers ---
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/menus', menuRouter);
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
// GET /restaurant/:restaurantId — list menus
// **Validates: Requirement 5.1**
// ============================================================
describe('GET /restaurant/:restaurantId — list menus', () => {
  it('returns menus when admin owns the restaurant', async () => {
    const app = createApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: true, resourceId: RESTAURANT_ID });
    mockedPrisma.menu.findMany.mockResolvedValue([
      { id: MENU_ID, name: { ENG: 'Lunch' }, restaurantId: RESTAURANT_ID },
    ]);

    const result = await makeRequest(app, 'get', `/api/menus/restaurant/${RESTAURANT_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(mockedVerifyRestaurantOwnership).toHaveBeenCalledWith(RESTAURANT_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the restaurant', async () => {
    const app = createApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'get', `/api/menus/restaurant/${RESTAURANT_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Restaurant not found');
    expect(mockedPrisma.menu.findMany).not.toHaveBeenCalled();
  });
});

// ============================================================
// POST /restaurant/:restaurantId — create menu
// **Validates: Requirement 5.2**
// ============================================================
describe('POST /restaurant/:restaurantId — create menu', () => {
  it('creates menu when admin owns the restaurant', async () => {
    const app = createApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: true, resourceId: RESTAURANT_ID });
    mockedPrisma.menu.count.mockResolvedValue(0);
    mockedPrisma.menu.create.mockResolvedValue({
      id: MENU_ID,
      ...VALID_MENU_DATA,
      restaurantId: RESTAURANT_ID,
      orderIndex: 0,
    });

    const result = await makeRequest(app, 'post', `/api/menus/restaurant/${RESTAURANT_ID}`, VALID_MENU_DATA, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifyRestaurantOwnership).toHaveBeenCalledWith(RESTAURANT_ID, OWNER_ID);
    expect(mockedPrisma.menu.create).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the restaurant', async () => {
    const app = createApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/menus/restaurant/${RESTAURANT_ID}`, VALID_MENU_DATA, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Restaurant not found');
    expect(mockedPrisma.menu.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// GET /:id — get single menu
// **Validates: Requirement 5.3**
// ============================================================
describe('GET /:id — get single menu', () => {
  it('returns menu when admin owns it', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: MENU_ID,
      name: { ENG: 'Lunch' },
      restaurant: { id: RESTAURANT_ID },
      sections: [],
    });

    const result = await makeRequest(app, 'get', `/api/menus/${MENU_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'get', `/api/menus/${MENU_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.findUnique).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id — update menu
// **Validates: Requirement 5.3**
// ============================================================
describe('PUT /:id — update menu', () => {
  it('updates menu when admin owns it', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.update.mockResolvedValue({
      id: MENU_ID,
      name: { ENG: 'Updated Menu' },
    });

    const result = await makeRequest(app, 'put', `/api/menus/${MENU_ID}`, { name: { ENG: 'Updated Menu' } }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
    expect(mockedPrisma.menu.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/menus/${MENU_ID}`, { name: { ENG: 'Hacked' } }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// DELETE /:id — delete menu
// **Validates: Requirement 5.4**
// ============================================================
describe('DELETE /:id — delete menu', () => {
  it('deletes menu when admin owns it', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.delete.mockResolvedValue({ id: MENU_ID });

    const result = await makeRequest(app, 'delete', `/api/menus/${MENU_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
    expect(mockedPrisma.menu.delete).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'delete', `/api/menus/${MENU_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.delete).not.toHaveBeenCalled();
  });
});

// ============================================================
// POST /:id/duplicate — duplicate menu
// **Validates: Requirement 5.5**
// ============================================================
describe('POST /:id/duplicate — duplicate menu', () => {
  it('duplicates menu when admin owns it', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: MENU_ID,
      name: { ENG: 'Lunch' },
      slug: 'lunch',
      menuType: 'lunch',
      restaurantId: RESTAURANT_ID,
      sections: [],
    });
    mockedPrisma.menu.count.mockResolvedValue(1);
    mockedPrisma.menu.create.mockResolvedValue({
      id: 'new-menu-id',
      name: { ENG: 'Lunch' },
      slug: 'lunch-copy',
      restaurantId: RESTAURANT_ID,
    });

    const result = await makeRequest(app, 'post', `/api/menus/${MENU_ID}/duplicate`, {}, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/menus/${MENU_ID}/duplicate`, {}, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.menu.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// POST /:id/publish — publish menu
// **Validates: Requirement 5.6**
// ============================================================
describe('POST /:id/publish — publish menu', () => {
  it('publishes menu when admin owns it', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: MENU_ID,
      name: { ENG: 'Lunch' },
      slug: 'lunch',
      restaurantId: RESTAURANT_ID,
      sections: [],
    });
    mockedPrisma.menuVersion.findFirst.mockResolvedValue(null);
    mockedPrisma.menuVersion.create.mockResolvedValue({ id: 'v1', versionNumber: 1 });
    mockedPrisma.restaurant.findUnique.mockResolvedValue({ slug: 'my-restaurant' });
    mockedPrisma.menu.update.mockResolvedValue({
      id: MENU_ID,
      status: 'published',
      publishedAt: new Date(),
    });

    const result = await makeRequest(app, 'post', `/api/menus/${MENU_ID}/publish`, {}, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/menus/${MENU_ID}/publish`, {}, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.menu.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// GET /:id/versions — version history
// **Validates: Requirement 5.7**
// ============================================================
describe('GET /:id/versions — version history', () => {
  it('returns versions when admin owns the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menuVersion.findMany.mockResolvedValue([
      { id: 'v1', menuId: MENU_ID, versionNumber: 1 },
    ]);

    const result = await makeRequest(app, 'get', `/api/menus/${MENU_ID}/versions`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(result.body).toHaveLength(1);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'get', `/api/menus/${MENU_ID}/versions`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menuVersion.findMany).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id/reorder — reorder menu
// **Validates: Requirement 5.8**
// ============================================================
describe('PUT /:id/reorder — reorder menu', () => {
  it('reorders menu when admin owns it', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.update.mockResolvedValue({
      id: MENU_ID,
      orderIndex: 2,
    });

    const result = await makeRequest(app, 'put', `/api/menus/${MENU_ID}/reorder`, { orderIndex: 2 }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
    expect(mockedPrisma.menu.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/menus/${MENU_ID}/reorder`, { orderIndex: 2 }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.update).not.toHaveBeenCalled();
  });
});
