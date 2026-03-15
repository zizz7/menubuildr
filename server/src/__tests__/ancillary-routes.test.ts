/**
 * Unit tests for ancillary route ownership checks.
 *
 * Feature: multi-tenancy
 * Property 10: Search returns only owned restaurant items
 * Property 11: Import/export requires restaurant ownership
 * Property 12: Translation operations require item ownership chain
 *
 * Validates: Requirements 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mock Prisma ----
vi.mock('../config/database', () => {
  return {
    default: {
      restaurant: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      menuItem: {
        findMany: vi.fn(),
      },
      menu: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      section: { create: vi.fn() },
      menuItemTranslation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      themeSettings: { create: vi.fn() },
      moduleSettings: { create: vi.fn() },
      recipeDetails: { create: vi.fn() },
    },
  };
});

// ---- Mock ownership helpers ----
vi.mock('../middleware/ownership', () => {
  return {
    verifyRestaurantOwnership: vi.fn(),
    verifyMenuOwnership: vi.fn(),
    verifyItemOwnership: vi.fn(),
  };
});

// ---- Mock auth middleware to pass through ----
vi.mock('../middleware/auth', () => {
  return {
    authenticateToken: vi.fn((req: any, _res: any, next: any) => {
      next();
    }),
    AuthRequest: {},
  };
});

// ---- Mock subscription middleware to pass through ----
vi.mock('../middleware/subscription', () => ({
  requireSubscription: vi.fn((req: any, res: any, next: any) => next()),
}));

import prisma from '../config/database';
import {
  verifyRestaurantOwnership,
  verifyMenuOwnership,
  verifyItemOwnership,
} from '../middleware/ownership';
import express from 'express';
import searchRouter from '../routes/search';
import importExportRouter from '../routes/import-export';
import translationsRouter from '../routes/translations';

// ---- Typed mocks ----
const mockedPrisma = prisma as unknown as {
  restaurant: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  menuItem: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  menu: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  section: { create: ReturnType<typeof vi.fn> };
  menuItemTranslation: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  themeSettings: { create: ReturnType<typeof vi.fn> };
  moduleSettings: { create: ReturnType<typeof vi.fn> };
  recipeDetails: { create: ReturnType<typeof vi.fn> };
};

const mockedVerifyRestaurantOwnership = verifyRestaurantOwnership as ReturnType<typeof vi.fn>;
const mockedVerifyMenuOwnership = verifyMenuOwnership as ReturnType<typeof vi.fn>;
const mockedVerifyItemOwnership = verifyItemOwnership as ReturnType<typeof vi.fn>;

// ---- Constants ----
const OWNER_ID = 'owner-admin-id';
const OTHER_ID = 'other-admin-id';
const RESTAURANT_ID = 'restaurant-123';
const MENU_ID = 'menu-456';
const ITEM_ID = 'item-789';
const TRANSLATION_ID = 'translation-001';

// ---- Test helpers ----
function createSearchApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/search', searchRouter);
  return app;
}

function createImportExportApp() {
  const app = express();
  app.use(express.json());
  app.use('/api', importExportRouter);
  return app;
}

function createTranslationsApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/menu-items', translationsRouter);
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

    (app as any).handle(req, res, () => {
      resolve({ status: 404, body: { error: 'Not found' } });
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});


// ============================================================
// SEARCH ROUTES — Property 10
// **Validates: Requirement 8.2**
// ============================================================
describe('Search — GET /api/search', () => {
  it('returns only items from admin-owned restaurants', async () => {
    const app = createSearchApp();
    mockedPrisma.restaurant.findMany.mockResolvedValue([
      { id: RESTAURANT_ID },
    ]);
    mockedPrisma.menuItem.findMany.mockResolvedValue([
      {
        id: ITEM_ID,
        name: { ENG: 'Burger' },
        description: { ENG: 'Tasty' },
        price: 10,
        section: {
          id: 'sec-1',
          title: { ENG: 'Mains' },
          menu: {
            id: MENU_ID,
            name: { ENG: 'Lunch' },
            restaurant: { id: RESTAURANT_ID, name: 'My Place' },
          },
        },
        allergens: [],
      },
    ]);

    const result = await makeRequest(app, 'get', '/api/search?q=burger', undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(result.body.results).toHaveLength(1);
    expect(result.body.results[0].id).toBe(ITEM_ID);
    // Verify restaurant.findMany was called with adminId filter
    expect(mockedPrisma.restaurant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminId: OWNER_ID },
      })
    );
  });

  it('returns empty results when admin has no restaurants', async () => {
    const app = createSearchApp();
    mockedPrisma.restaurant.findMany.mockResolvedValue([]);

    const result = await makeRequest(app, 'get', '/api/search?q=burger', undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(result.body).toEqual([]);
    // Should not query menuItem at all
    expect(mockedPrisma.menuItem.findMany).not.toHaveBeenCalled();
  });

  it('returns 400 when no search query provided', async () => {
    const app = createSearchApp();

    const result = await makeRequest(app, 'get', '/api/search', undefined, OWNER_ID);

    expect(result.status).toBe(400);
  });
});


// ============================================================
// IMPORT/EXPORT ROUTES — Property 11
// **Validates: Requirement 8.3**
// ============================================================
describe('Import/Export — POST /api/restaurants/:id/export', () => {
  it('exports restaurant when admin owns it', async () => {
    const app = createImportExportApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: true, resourceId: RESTAURANT_ID });
    mockedPrisma.restaurant.findUnique.mockResolvedValue({
      id: RESTAURANT_ID,
      name: 'My Place',
      slug: 'my-place',
      menus: [],
    });

    const result = await makeRequest(app, 'post', `/api/restaurants/${RESTAURANT_ID}/export`, {}, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyRestaurantOwnership).toHaveBeenCalledWith(RESTAURANT_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the restaurant', async () => {
    const app = createImportExportApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/restaurants/${RESTAURANT_ID}/export`, {}, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Restaurant not found');
    expect(mockedPrisma.restaurant.findUnique).not.toHaveBeenCalled();
  });
});

describe('Import/Export — POST /api/menus/:id/export', () => {
  it('exports menu when admin owns it', async () => {
    const app = createImportExportApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: MENU_ID,
      name: { ENG: 'Lunch' },
      slug: 'lunch',
      sections: [],
    });

    const result = await makeRequest(app, 'post', `/api/menus/${MENU_ID}/export`, {}, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createImportExportApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/menus/${MENU_ID}/export`, {}, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.menu.findUnique).not.toHaveBeenCalled();
  });
});

describe('Import/Export — POST /api/restaurants/import', () => {
  it('sets adminId on new restaurant import', async () => {
    const app = createImportExportApp();
    mockedPrisma.restaurant.findUnique
      .mockResolvedValueOnce(null) // slug lookup — not found
      .mockResolvedValueOnce({ id: 'new-rest', name: 'Imported', menus: [] }); // final fetch
    mockedPrisma.restaurant.create.mockResolvedValue({ id: 'new-rest', name: 'Imported', slug: 'imported' });
    mockedPrisma.menu.count.mockResolvedValue(0);

    const result = await makeRequest(
      app,
      'post',
      '/api/restaurants/import',
      { name: 'Imported', slug: 'imported' },
      OWNER_ID
    );

    expect(result.status).toBe(201);
    expect(mockedPrisma.restaurant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adminId: OWNER_ID }),
      })
    );
  });

  it('returns 404 when importing into existing restaurant not owned', async () => {
    const app = createImportExportApp();
    mockedPrisma.restaurant.findUnique.mockResolvedValue({ id: RESTAURANT_ID, slug: 'existing' });
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      '/api/restaurants/import',
      { name: 'Existing', slug: 'existing' },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Restaurant not found');
  });
});

describe('Import/Export — POST /api/restaurants/:restaurantId/import-menu', () => {
  it('imports menu when admin owns the restaurant', async () => {
    const app = createImportExportApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: true, resourceId: RESTAURANT_ID });
    mockedPrisma.menu.count.mockResolvedValue(0);
    mockedPrisma.menu.create.mockResolvedValue({ id: 'new-menu', slug: 'lunch' });
    mockedPrisma.menu.findUnique.mockResolvedValue({
      id: 'new-menu',
      slug: 'lunch',
      sections: [],
    });

    const result = await makeRequest(
      app,
      'post',
      `/api/restaurants/${RESTAURANT_ID}/import-menu`,
      {
        menuName: { ENG: 'Lunch' },
        menuSlug: 'lunch',
        menuType: 'lunch',
        sections: [],
      },
      OWNER_ID
    );

    expect(result.status).toBe(201);
    expect(mockedVerifyRestaurantOwnership).toHaveBeenCalledWith(RESTAURANT_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the restaurant', async () => {
    const app = createImportExportApp();
    mockedVerifyRestaurantOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      `/api/restaurants/${RESTAURANT_ID}/import-menu`,
      {
        menuName: { ENG: 'Lunch' },
        menuSlug: 'lunch',
        menuType: 'lunch',
        sections: [],
      },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Restaurant not found');
    expect(mockedPrisma.menu.create).not.toHaveBeenCalled();
  });
});


// ============================================================
// TRANSLATION ROUTES — Property 12
// **Validates: Requirements 8.4, 8.5**
// ============================================================
describe('Translations — GET /api/menu-items/:id/translations', () => {
  it('returns translations when admin owns the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItemTranslation.findMany.mockResolvedValue([
      { id: TRANSLATION_ID, menuItemId: ITEM_ID, languageCode: 'FRA', translatedName: 'Hamburger' },
    ]);

    const result = await makeRequest(app, 'get', `/api/menu-items/${ITEM_ID}/translations`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(result.body.translations).toHaveLength(1);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'get', `/api/menu-items/${ITEM_ID}/translations`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu item not found');
    expect(mockedPrisma.menuItemTranslation.findMany).not.toHaveBeenCalled();
  });
});

describe('Translations — POST /api/menu-items/:id/translations', () => {
  it('creates translation when admin owns the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItemTranslation.create.mockResolvedValue({
      id: TRANSLATION_ID,
      menuItemId: ITEM_ID,
      languageCode: 'FRA',
      translatedName: 'Hamburger',
      translatedDescription: null,
    });

    const result = await makeRequest(
      app,
      'post',
      `/api/menu-items/${ITEM_ID}/translations`,
      { languageCode: 'FRA', translatedName: 'Hamburger' },
      OWNER_ID
    );

    expect(result.status).toBe(201);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.menuItemTranslation.create).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'post',
      `/api/menu-items/${ITEM_ID}/translations`,
      { languageCode: 'FRA', translatedName: 'Hamburger' },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu item not found');
    expect(mockedPrisma.menuItemTranslation.create).not.toHaveBeenCalled();
  });
});

describe('Translations — PUT /api/menu-items/:menuItemId/translations/:translationId', () => {
  it('updates translation when admin owns the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItemTranslation.findUnique.mockResolvedValue({
      id: TRANSLATION_ID,
      menuItemId: ITEM_ID,
      languageCode: 'FRA',
      translatedName: 'Hamburger',
    });
    mockedPrisma.menuItemTranslation.update.mockResolvedValue({
      id: TRANSLATION_ID,
      menuItemId: ITEM_ID,
      languageCode: 'FRA',
      translatedName: 'Cheeseburger',
    });

    const result = await makeRequest(
      app,
      'put',
      `/api/menu-items/${ITEM_ID}/translations/${TRANSLATION_ID}`,
      { translatedName: 'Cheeseburger' },
      OWNER_ID
    );

    expect(result.status).toBe(200);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.menuItemTranslation.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'put',
      `/api/menu-items/${ITEM_ID}/translations/${TRANSLATION_ID}`,
      { translatedName: 'Cheeseburger' },
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu item not found');
    expect(mockedPrisma.menuItemTranslation.update).not.toHaveBeenCalled();
  });
});

describe('Translations — DELETE /api/menu-items/:menuItemId/translations/:translationId', () => {
  it('deletes translation when admin owns the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: true, resourceId: ITEM_ID });
    mockedPrisma.menuItemTranslation.findUnique.mockResolvedValue({
      id: TRANSLATION_ID,
      menuItemId: ITEM_ID,
      languageCode: 'FRA',
    });
    mockedPrisma.menuItemTranslation.delete.mockResolvedValue({ id: TRANSLATION_ID });

    const result = await makeRequest(
      app,
      'delete',
      `/api/menu-items/${ITEM_ID}/translations/${TRANSLATION_ID}`,
      undefined,
      OWNER_ID
    );

    expect(result.status).toBe(204);
    expect(mockedVerifyItemOwnership).toHaveBeenCalledWith(ITEM_ID, OWNER_ID);
    expect(mockedPrisma.menuItemTranslation.delete).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the item', async () => {
    const app = createTranslationsApp();
    mockedVerifyItemOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(
      app,
      'delete',
      `/api/menu-items/${ITEM_ID}/translations/${TRANSLATION_ID}`,
      undefined,
      OTHER_ID
    );

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu item not found');
    expect(mockedPrisma.menuItemTranslation.delete).not.toHaveBeenCalled();
  });
});
