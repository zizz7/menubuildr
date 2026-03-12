/**
 * Unit tests for section and category route ownership checks.
 *
 * Feature: multi-tenancy
 * Property 7: Section operations require ownership chain verification
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 7.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing routes
vi.mock('../config/database', () => {
  return {
    default: {
      section: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    },
  };
});

// Mock ownership helpers
vi.mock('../middleware/ownership', () => {
  return {
    verifyMenuOwnership: vi.fn(),
    verifySectionOwnership: vi.fn(),
    verifyCategoryOwnership: vi.fn(),
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

import prisma from '../config/database';
import { verifyMenuOwnership, verifySectionOwnership, verifyCategoryOwnership } from '../middleware/ownership';
import express from 'express';
import sectionRouter from '../routes/sections';
import categoryRouter from '../routes/categories';

// --- Typed mocks ---
const mockedPrisma = prisma as unknown as {
  section: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  category: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const mockedVerifyMenuOwnership = verifyMenuOwnership as ReturnType<typeof vi.fn>;
const mockedVerifySectionOwnership = verifySectionOwnership as ReturnType<typeof vi.fn>;
const mockedVerifyCategoryOwnership = verifyCategoryOwnership as ReturnType<typeof vi.fn>;

// --- Constants ---
const OWNER_ID = 'owner-admin-id';
const OTHER_ID = 'other-admin-id';
const MENU_ID = 'menu-123';
const SECTION_ID = 'section-456';
const CATEGORY_ID = 'category-789';

const VALID_SECTION_DATA = {
  title: { ENG: 'Appetizers' },
};

const VALID_CATEGORY_DATA = {
  name: { ENG: 'Starters' },
};

// --- Test helpers ---
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/sections', sectionRouter);
  app.use('/api/categories', categoryRouter);
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
// SECTION ROUTES
// ============================================================

// ============================================================
// POST /menu/:menuId — create section
// **Validates: Requirement 6.1**
// ============================================================
describe('POST /menu/:menuId — create section', () => {
  it('creates section when admin owns the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: true, resourceId: MENU_ID });
    mockedPrisma.section.count.mockResolvedValue(0);
    mockedPrisma.section.create.mockResolvedValue({
      id: SECTION_ID,
      ...VALID_SECTION_DATA,
      menuId: MENU_ID,
      orderIndex: 0,
      subSections: [],
      items: [],
    });

    const result = await makeRequest(app, 'post', `/api/sections/menu/${MENU_ID}`, VALID_SECTION_DATA, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifyMenuOwnership).toHaveBeenCalledWith(MENU_ID, OWNER_ID);
    expect(mockedPrisma.section.create).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the menu', async () => {
    const app = createApp();
    mockedVerifyMenuOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/sections/menu/${MENU_ID}`, VALID_SECTION_DATA, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Menu not found');
    expect(mockedPrisma.section.create).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id — update section
// **Validates: Requirement 6.2**
// ============================================================
describe('PUT /:id — update section', () => {
  it('updates section when admin owns it', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: true, resourceId: SECTION_ID });
    mockedPrisma.section.update.mockResolvedValue({
      id: SECTION_ID,
      title: { ENG: 'Updated Appetizers' },
      menuId: MENU_ID,
    });

    const result = await makeRequest(app, 'put', `/api/sections/${SECTION_ID}`, { title: { ENG: 'Updated Appetizers' } }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifySectionOwnership).toHaveBeenCalledWith(SECTION_ID, OWNER_ID);
    expect(mockedPrisma.section.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/sections/${SECTION_ID}`, { title: { ENG: 'Hacked' } }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Section not found');
    expect(mockedPrisma.section.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// DELETE /:id — delete section
// **Validates: Requirement 6.3**
// ============================================================
describe('DELETE /:id — delete section', () => {
  it('deletes section when admin owns it', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: true, resourceId: SECTION_ID });
    mockedPrisma.section.findUnique.mockResolvedValue({ menuId: MENU_ID });
    mockedPrisma.section.delete.mockResolvedValue({ id: SECTION_ID });

    const result = await makeRequest(app, 'delete', `/api/sections/${SECTION_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifySectionOwnership).toHaveBeenCalledWith(SECTION_ID, OWNER_ID);
    expect(mockedPrisma.section.delete).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'delete', `/api/sections/${SECTION_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Section not found');
    expect(mockedPrisma.section.delete).not.toHaveBeenCalled();
  });
});

// ============================================================
// PUT /:id/reorder — reorder section
// **Validates: Requirement 6.4 (section operations ownership)**
// ============================================================
describe('PUT /:id/reorder — reorder section', () => {
  it('reorders section when admin owns it', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: true, resourceId: SECTION_ID });
    mockedPrisma.section.update.mockResolvedValue({
      id: SECTION_ID,
      orderIndex: 2,
      menuId: MENU_ID,
    });

    const result = await makeRequest(app, 'put', `/api/sections/${SECTION_ID}/reorder`, { orderIndex: 2 }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifySectionOwnership).toHaveBeenCalledWith(SECTION_ID, OWNER_ID);
    expect(mockedPrisma.section.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/sections/${SECTION_ID}/reorder`, { orderIndex: 2 }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Section not found');
    expect(mockedPrisma.section.update).not.toHaveBeenCalled();
  });
});

// ============================================================
// POST /:id/duplicate — duplicate section
// **Validates: Requirement 6.4**
// ============================================================
describe('POST /:id/duplicate — duplicate section', () => {
  it('duplicates section when admin owns it', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: true, resourceId: SECTION_ID });
    mockedPrisma.section.findUnique.mockResolvedValue({
      id: SECTION_ID,
      title: { ENG: 'Appetizers' },
      menuId: MENU_ID,
      illustrationUrl: null,
      categories: [],
      items: [],
    });
    mockedPrisma.section.count.mockResolvedValue(1);
    mockedPrisma.section.create.mockResolvedValue({
      id: 'new-section-id',
      title: { ENG: 'Appetizers' },
      menuId: MENU_ID,
    });

    const result = await makeRequest(app, 'post', `/api/sections/${SECTION_ID}/duplicate`, {}, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifySectionOwnership).toHaveBeenCalledWith(SECTION_ID, OWNER_ID);
  });

  it('returns 404 when admin does not own the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/sections/${SECTION_ID}/duplicate`, {}, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Section not found');
    expect(mockedPrisma.section.findUnique).not.toHaveBeenCalled();
    expect(mockedPrisma.section.create).not.toHaveBeenCalled();
  });
});


// ============================================================
// CATEGORY ROUTES
// ============================================================

// ============================================================
// POST /section/:sectionId — create category
// **Validates: Requirement 7.6**
// ============================================================
describe('POST /section/:sectionId — create category', () => {
  it('creates category when admin owns the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: true, resourceId: SECTION_ID });
    mockedPrisma.category.count.mockResolvedValue(0);
    mockedPrisma.category.create.mockResolvedValue({
      id: CATEGORY_ID,
      ...VALID_CATEGORY_DATA,
      sectionId: SECTION_ID,
      orderIndex: 0,
    });

    const result = await makeRequest(app, 'post', `/api/categories/section/${SECTION_ID}`, VALID_CATEGORY_DATA, OWNER_ID);

    expect(result.status).toBe(201);
    expect(mockedVerifySectionOwnership).toHaveBeenCalledWith(SECTION_ID, OWNER_ID);
    expect(mockedPrisma.category.create).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the section', async () => {
    const app = createApp();
    mockedVerifySectionOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'post', `/api/categories/section/${SECTION_ID}`, VALID_CATEGORY_DATA, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Section not found');
    expect(mockedPrisma.category.create).not.toHaveBeenCalled();
  });
});


// ============================================================
// PUT /:id — update category
// **Validates: Requirement 7.6**
// ============================================================
describe('PUT /:id — update category', () => {
  it('updates category when admin owns it', async () => {
    const app = createApp();
    mockedVerifyCategoryOwnership.mockResolvedValue({ authorized: true, resourceId: CATEGORY_ID });
    mockedPrisma.category.update.mockResolvedValue({
      id: CATEGORY_ID,
      name: { ENG: 'Updated Starters' },
    });

    const result = await makeRequest(app, 'put', `/api/categories/${CATEGORY_ID}`, { name: { ENG: 'Updated Starters' } }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyCategoryOwnership).toHaveBeenCalledWith(CATEGORY_ID, OWNER_ID);
    expect(mockedPrisma.category.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the category', async () => {
    const app = createApp();
    mockedVerifyCategoryOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/categories/${CATEGORY_ID}`, { name: { ENG: 'Hacked' } }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Category not found');
    expect(mockedPrisma.category.update).not.toHaveBeenCalled();
  });
});


// ============================================================
// DELETE /:id — delete category
// **Validates: Requirement 7.6**
// ============================================================
describe('DELETE /:id — delete category', () => {
  it('deletes category when admin owns it', async () => {
    const app = createApp();
    mockedVerifyCategoryOwnership.mockResolvedValue({ authorized: true, resourceId: CATEGORY_ID });
    mockedPrisma.category.delete.mockResolvedValue({ id: CATEGORY_ID });

    const result = await makeRequest(app, 'delete', `/api/categories/${CATEGORY_ID}`, undefined, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyCategoryOwnership).toHaveBeenCalledWith(CATEGORY_ID, OWNER_ID);
    expect(mockedPrisma.category.delete).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the category', async () => {
    const app = createApp();
    mockedVerifyCategoryOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'delete', `/api/categories/${CATEGORY_ID}`, undefined, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Category not found');
    expect(mockedPrisma.category.delete).not.toHaveBeenCalled();
  });
});


// ============================================================
// PUT /:id/reorder — reorder category
// **Validates: Requirement 7.6**
// ============================================================
describe('PUT /:id/reorder — reorder category', () => {
  it('reorders category when admin owns it', async () => {
    const app = createApp();
    mockedVerifyCategoryOwnership.mockResolvedValue({ authorized: true, resourceId: CATEGORY_ID });
    mockedPrisma.category.update.mockResolvedValue({
      id: CATEGORY_ID,
      orderIndex: 3,
    });

    const result = await makeRequest(app, 'put', `/api/categories/${CATEGORY_ID}/reorder`, { orderIndex: 3 }, OWNER_ID);

    expect(result.status).toBe(200);
    expect(mockedVerifyCategoryOwnership).toHaveBeenCalledWith(CATEGORY_ID, OWNER_ID);
    expect(mockedPrisma.category.update).toHaveBeenCalled();
  });

  it('returns 404 when admin does not own the category', async () => {
    const app = createApp();
    mockedVerifyCategoryOwnership.mockResolvedValue({ authorized: false });

    const result = await makeRequest(app, 'put', `/api/categories/${CATEGORY_ID}/reorder`, { orderIndex: 3 }, OTHER_ID);

    expect(result.status).toBe(404);
    expect(result.body.error).toBe('Category not found');
    expect(mockedPrisma.category.update).not.toHaveBeenCalled();
  });
});
