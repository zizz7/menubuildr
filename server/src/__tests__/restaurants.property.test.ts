/**
 * Property-based tests for restaurant route ownership.
 *
 * Feature: multi-tenancy
 * Properties tested:
 *   Property 1: Restaurant creation assigns ownership
 *   Property 2: Restaurant list returns only owned restaurants
 *   Property 4: Restaurant mutations require ownership
 *   Property 5: Per-admin restaurant limit enforcement
 *
 * Validates: Requirements 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock Prisma before importing routes
vi.mock('../config/database', () => {
  return {
    default: {
      restaurant: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      themeSettings: { upsert: vi.fn() },
      moduleSettings: { upsert: vi.fn() },
      menu: { findUnique: vi.fn() },
      menuTemplate: { findUnique: vi.fn() },
    },
  };
});

// Mock ownership helpers
vi.mock('../middleware/ownership', () => {
  return {
    verifyRestaurantOwnership: vi.fn(),
  };
});

// Mock auth middleware to pass through with req.userId set
vi.mock('../middleware/auth', () => {
  return {
    authenticateToken: vi.fn((req: any, _res: any, next: any) => {
      // userId is set by test setup on the request
      next();
    }),
    AuthRequest: {},
  };
});

// Mock subscription middleware to pass through
vi.mock('../middleware/subscription', () => ({
  requireSubscription: vi.fn((req: any, res: any, next: any) => next()),
}));

import prisma from '../config/database';
import { verifyRestaurantOwnership } from '../middleware/ownership';

// We need to test the route handlers directly. Import express and the router.
import express from 'express';
import type { Response } from 'express';

// Import the router after mocks are set up
import restaurantRouter from '../routes/restaurants';

// --- Typed mocks ---

const mockedPrisma = prisma as unknown as {
  restaurant: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  themeSettings: { upsert: ReturnType<typeof vi.fn> };
  moduleSettings: { upsert: ReturnType<typeof vi.fn> };
  menu: { findUnique: ReturnType<typeof vi.fn> };
  menuTemplate: { findUnique: ReturnType<typeof vi.fn> };
};

const mockedVerifyOwnership = verifyRestaurantOwnership as ReturnType<typeof vi.fn>;

// --- Arbitraries ---

const arbId = fc.uuid();

/** Two distinct admin IDs (owner vs. other) */
const arbTwoAdmins = fc.tuple(arbId, arbId).filter(([a, b]) => a !== b);

/** Valid restaurant name */
const arbRestaurantName = fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0);

/** Valid slug (lowercase alphanumeric with hyphens) */
const arbSlug = fc
  .stringMatching(/^[a-z0-9][a-z0-9-]{0,20}[a-z0-9]$/)
  .filter((s) => s.length >= 2);

/** Valid restaurant creation data */
const arbRestaurantData = fc.record({
  name: arbRestaurantName,
  slug: arbSlug,
  currency: fc.constantFrom('USD', 'EUR', 'GBP'),
  defaultLanguage: fc.constantFrom('ENG', 'FRA', 'ESP'),
});

// --- Test helpers ---

/** Create a minimal Express app with the restaurant router mounted */
function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/restaurants', restaurantRouter);
  return app;
}

/** Make a request to the Express app and return status + body */
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

    // Set userId on request (auth middleware is mocked to pass through)
    if (userId) {
      req.userId = userId;
    }

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
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({ status: this.statusCode, body: parsed });
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        this.statusCode = this.statusCode;
        resolve({ status: this.statusCode, body: data });
      },
    };

    // Use Express's handle method to process the request
    app.handle(req, res, () => {
      resolve({ status: 404, body: { error: 'Not found' } });
    });
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Property 1: Restaurant creation assigns ownership
// **Validates: Requirements 1.3, 3.1**
// ============================================================
describe('Property 1: Restaurant creation assigns ownership', () => {
  it('creating a restaurant via POST sets adminId to the authenticated admin ID', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbRestaurantData, async (adminId, restaurantData) => {
        vi.clearAllMocks();

        // Admin is below the limit
        mockedPrisma.restaurant.count.mockResolvedValue(0);

        // Capture the data passed to prisma.restaurant.create
        let capturedCreateData: any = null;
        mockedPrisma.restaurant.create.mockImplementation(async (args: any) => {
          capturedCreateData = args;
          return {
            id: 'new-restaurant-id',
            adminId,
            ...restaurantData,
            themeSettings: {},
            moduleSettings: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        });

        const result = await makeRequest(app, 'post', '/api/restaurants', restaurantData, adminId);

        expect(result.status).toBe(201);
        // The created restaurant's adminId must equal the authenticated admin's ID
        expect(result.body.adminId).toBe(adminId);
        // Verify Prisma was called with admin connection
        expect(capturedCreateData.data.admin.connect.id).toBe(adminId);
      }),
      { numRuns: 25 }
    );
  });
});

// ============================================================
// Property 2: Restaurant list returns only owned restaurants
// **Validates: Requirements 2.1**
// ============================================================
describe('Property 2: Restaurant list returns only owned restaurants', () => {
  it('GET /api/restaurants returns only restaurants where adminId matches the requesting admin', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(
        arbTwoAdmins,
        fc.array(arbId, { minLength: 0, maxLength: 5 }),
        fc.array(arbId, { minLength: 0, maxLength: 5 }),
        async ([adminA, adminB], ownedIds, otherIds) => {
          vi.clearAllMocks();

          // Build owned restaurants for adminA
          const ownedRestaurants = ownedIds.map((id) => ({
            id,
            adminId: adminA,
            name: `Restaurant ${id}`,
            themeSettings: null,
            moduleSettings: null,
            _count: { menus: 0 },
          }));

          // Mock findMany to return only owned restaurants (simulating the where filter)
          mockedPrisma.restaurant.findMany.mockImplementation(async (args: any) => {
            // The route should pass where: { adminId: req.userId }
            if (args?.where?.adminId === adminA) {
              return ownedRestaurants;
            }
            return [];
          });

          const result = await makeRequest(app, 'get', '/api/restaurants', undefined, adminA);

          expect(result.status).toBe(200);
          // All returned restaurants must belong to adminA
          const returned = result.body as any[];
          expect(returned).toHaveLength(ownedIds.length);
          for (const r of returned) {
            expect(r.adminId).toBe(adminA);
          }
          // None of adminB's restaurants should appear
          for (const r of returned) {
            expect(otherIds).not.toContain(
              // Only check if otherIds don't overlap with ownedIds
              ownedIds.includes(r.id) ? undefined : r.id
            );
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  it('GET /api/restaurants filters using adminId in the Prisma where clause', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, async (adminId) => {
        vi.clearAllMocks();

        mockedPrisma.restaurant.findMany.mockResolvedValue([]);

        await makeRequest(app, 'get', '/api/restaurants', undefined, adminId);

        // Verify the where clause includes adminId
        expect(mockedPrisma.restaurant.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ adminId }),
          })
        );
      }),
      { numRuns: 25 }
    );
  });
});

// ============================================================
// Property 4: Restaurant mutations require ownership
// **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
// ============================================================
describe('Property 4: Restaurant mutations require ownership', () => {
  it('PUT /:id succeeds when admin owns the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (restaurantId, adminId) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: true, resourceId: restaurantId });
        mockedPrisma.restaurant.update.mockResolvedValue({
          id: restaurantId,
          adminId,
          name: 'Updated',
          themeSettings: null,
          moduleSettings: null,
        });

        const result = await makeRequest(
          app,
          'put',
          `/api/restaurants/${restaurantId}`,
          { name: 'Updated' },
          adminId
        );

        expect(result.status).toBe(200);
        expect(mockedVerifyOwnership).toHaveBeenCalledWith(restaurantId, adminId);
      }),
      { numRuns: 25 }
    );
  });

  it('PUT /:id returns 404 when admin does not own the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (restaurantId, [ownerId, requesterId]) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: false });

        const result = await makeRequest(
          app,
          'put',
          `/api/restaurants/${restaurantId}`,
          { name: 'Hacked' },
          requesterId
        );

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('Restaurant not found');
        // Prisma update should NOT have been called
        expect(mockedPrisma.restaurant.update).not.toHaveBeenCalled();
      }),
      { numRuns: 25 }
    );
  });

  it('DELETE /:id succeeds when admin owns the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (restaurantId, adminId) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: true, resourceId: restaurantId });
        mockedPrisma.restaurant.delete.mockResolvedValue({ id: restaurantId });

        const result = await makeRequest(
          app,
          'delete',
          `/api/restaurants/${restaurantId}`,
          undefined,
          adminId
        );

        expect(result.status).toBe(200);
        expect(mockedVerifyOwnership).toHaveBeenCalledWith(restaurantId, adminId);
      }),
      { numRuns: 25 }
    );
  });

  it('DELETE /:id returns 404 when admin does not own the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (restaurantId, [ownerId, requesterId]) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: false });

        const result = await makeRequest(
          app,
          'delete',
          `/api/restaurants/${restaurantId}`,
          undefined,
          requesterId
        );

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('Restaurant not found');
        expect(mockedPrisma.restaurant.delete).not.toHaveBeenCalled();
      }),
      { numRuns: 25 }
    );
  });

  it('PUT /:id/theme returns 404 when admin does not own the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (restaurantId, [ownerId, requesterId]) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: false });

        const result = await makeRequest(
          app,
          'put',
          `/api/restaurants/${restaurantId}/theme`,
          { primaryColor: '#FF0000' },
          requesterId
        );

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('Restaurant not found');
      }),
      { numRuns: 25 }
    );
  });

  it('PUT /:id/modules returns 404 when admin does not own the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbTwoAdmins, async (restaurantId, [ownerId, requesterId]) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: false });

        const result = await makeRequest(
          app,
          'put',
          `/api/restaurants/${restaurantId}/modules`,
          { someModule: true },
          requesterId
        );

        expect(result.status).toBe(404);
        expect(result.body.error).toBe('Restaurant not found');
        expect(mockedPrisma.moduleSettings.upsert).not.toHaveBeenCalled();
      }),
      { numRuns: 25 }
    );
  });

  it('PUT /:id/modules succeeds when admin owns the restaurant', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbId, async (restaurantId, adminId) => {
        vi.clearAllMocks();

        mockedVerifyOwnership.mockResolvedValue({ authorized: true, resourceId: restaurantId });
        mockedPrisma.moduleSettings.upsert.mockResolvedValue({ restaurantId, someModule: true });

        const result = await makeRequest(
          app,
          'put',
          `/api/restaurants/${restaurantId}/modules`,
          { someModule: true },
          adminId
        );

        expect(result.status).toBe(200);
        expect(mockedVerifyOwnership).toHaveBeenCalledWith(restaurantId, adminId);
      }),
      { numRuns: 25 }
    );
  });
});

// ============================================================
// Property 5: Per-admin restaurant limit enforcement
// **Validates: Requirements 4.1, 4.2, 4.3**
// ============================================================
describe('Property 5: Per-admin restaurant limit enforcement', () => {
  it('rejects creation with 400 when admin is at the restaurant limit', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(
        arbId,
        arbRestaurantData,
        fc.integer({ min: 5, max: 20 }),
        async (adminId, restaurantData, existingCount) => {
          vi.clearAllMocks();

          // Admin is at or above the limit
          mockedPrisma.restaurant.count.mockResolvedValue(existingCount);

          const result = await makeRequest(app, 'post', '/api/restaurants', restaurantData, adminId);

          expect(result.status).toBe(400);
          expect(result.body.error).toMatch(/Maximum 5 restaurants allowed/);
          // Prisma create should NOT have been called
          expect(mockedPrisma.restaurant.create).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 25 }
    );
  });

  it('allows creation when admin is below the restaurant limit', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(
        arbId,
        arbRestaurantData,
        fc.integer({ min: 0, max: 4 }),
        async (adminId, restaurantData, existingCount) => {
          vi.clearAllMocks();

          mockedPrisma.restaurant.count.mockResolvedValue(existingCount);
          mockedPrisma.restaurant.create.mockResolvedValue({
            id: 'new-id',
            adminId,
            ...restaurantData,
            themeSettings: {},
            moduleSettings: {},
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await makeRequest(app, 'post', '/api/restaurants', restaurantData, adminId);

          expect(result.status).toBe(201);
        }
      ),
      { numRuns: 25 }
    );
  });

  it('counts only the requesting admin restaurants for limit enforcement', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbId, arbRestaurantData, async (adminId, restaurantData) => {
        vi.clearAllMocks();

        mockedPrisma.restaurant.count.mockResolvedValue(0);
        mockedPrisma.restaurant.create.mockResolvedValue({
          id: 'new-id',
          adminId,
          ...restaurantData,
          themeSettings: {},
          moduleSettings: {},
        });

        await makeRequest(app, 'post', '/api/restaurants', restaurantData, adminId);

        // Verify count was called with adminId filter
        expect(mockedPrisma.restaurant.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ adminId }),
          })
        );
      }),
      { numRuns: 25 }
    );
  });

  it('one admin at the limit does not prevent another admin from creating restaurants', async () => {
    const app = createApp();

    await fc.assert(
      fc.asyncProperty(arbTwoAdmins, arbRestaurantData, async ([adminAtLimit, adminBelowLimit], restaurantData) => {
        vi.clearAllMocks();

        // adminBelowLimit has 0 restaurants
        mockedPrisma.restaurant.count.mockImplementation(async (args: any) => {
          if (args?.where?.adminId === adminAtLimit) return 5;
          if (args?.where?.adminId === adminBelowLimit) return 0;
          return 0;
        });

        mockedPrisma.restaurant.create.mockResolvedValue({
          id: 'new-id',
          adminId: adminBelowLimit,
          ...restaurantData,
          themeSettings: {},
          moduleSettings: {},
        });

        // Admin below limit can create
        const result = await makeRequest(app, 'post', '/api/restaurants', restaurantData, adminBelowLimit);
        expect(result.status).toBe(201);
      }),
      { numRuns: 25 }
    );
  });
});
