# Implementation Plan: Multi-Tenancy

## Overview

Add per-admin data isolation to the menubuildr platform by linking each Restaurant to its owning Admin via a foreign key, creating centralized ownership verification helpers, hardening auth middleware, and updating all protected route handlers to enforce ownership checks. The implementation proceeds bottom-up: schema → migration → ownership helpers → auth middleware → route handlers → tests.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Update Prisma schema with adminId on Restaurant and restaurants relation on Admin
    - Add `adminId String @map("admin_id")` field to the Restaurant model in `server/prisma/schema.prisma`
    - Add `admin Admin @relation(fields: [adminId], references: [id])` relation to Restaurant
    - Add `restaurants Restaurant[]` relation to the Admin model
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [x] 1.2 Create two-step database migration
    - Generate a Prisma migration that adds the nullable `admin_id` column with FK constraint
    - Write a data migration SQL script that backfills `admin_id` from the first admin (`SELECT id FROM admins ORDER BY created_at ASC LIMIT 1`)
    - The migration must fail with a descriptive error if no admin record exists
    - After backfill, alter the column to NOT NULL
    - Ensure the migration is reversible (dropping the column rolls back cleanly)
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 1.3 Run migration and regenerate Prisma client
    - Apply the migration to the development database
    - Run `npx prisma generate` to update the Prisma client types
    - _Requirements: 12.1_

- [x] 2. Ownership verification utility
  - [x] 2.1 Create `server/src/middleware/ownership.ts` with ownership helper functions
    - Implement `verifyRestaurantOwnership(restaurantId, adminId)` — direct `adminId` check on Restaurant
    - Implement `verifyMenuOwnership(menuId, adminId)` — traverse menu → restaurant.adminId
    - Implement `verifySectionOwnership(sectionId, adminId)` — traverse section → menu → restaurant.adminId
    - Implement `verifyItemOwnership(itemId, adminId)` — traverse item → section → menu → restaurant.adminId
    - Implement `verifyBulkItemOwnership(itemIds, adminId)` — verify all items belong to admin, fail if any don't
    - All functions return `{ authorized: true, resourceId } | { authorized: false }`
    - Non-existent resources and ownership mismatches both return `{ authorized: false }`
    - _Requirements: 2.2, 2.3, 3.2, 3.3, 5.3, 5.4, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 2.2 Write property tests for ownership verification helpers
    - **Property 3: Restaurant single access requires ownership**
    - **Property 6: Menu operations require parent restaurant ownership**
    - **Property 7: Section operations require ownership chain verification**
    - **Property 8: Item operations require ownership chain verification**
    - **Property 9: Bulk item operations require all items owned**
    - **Validates: Requirements 2.2, 2.3, 5.3, 5.4, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4, 7.5**

  - [x] 2.3 Write unit tests for ownership verification helpers
    - Test each helper with owned resource (returns authorized: true)
    - Test each helper with non-owned resource (returns authorized: false)
    - Test each helper with non-existent resource (returns authorized: false)
    - Test `verifyBulkItemOwnership` with mixed ownership (returns authorized: false)
    - Test `verifyBulkItemOwnership` with empty array
    - _Requirements: 2.2, 2.3, 7.4, 7.5_

- [x] 3. Auth middleware hardening
  - [x] 3.1 Remove local-admin fallback from `server/src/middleware/auth.ts`
    - Remove any code that sets `req.userId` to a fallback value when no token is present
    - Return 401 `{ error: "Authentication required" }` when no token is provided
    - Return 401 `{ error: "Invalid or expired token" }` for expired or malformed tokens
    - Ensure `req.userId` is only set from a valid JWT token
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [x] 3.2 Write unit tests for hardened auth middleware
    - **Property 14: Auth middleware rejects unauthenticated requests**
    - **Property 15: Auth middleware extracts userId from valid token**
    - **Property 16: Auth middleware rejects invalid tokens**
    - Test missing token → 401
    - Test expired token → 401
    - Test malformed token → 401
    - Test valid token → req.userId set correctly
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**

- [x] 4. Checkpoint - Schema, ownership helpers, and auth middleware
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Restaurant route updates
  - [x] 5.1 Update `server/src/routes/restaurants.ts` to scope all queries by adminId
    - `GET /` — add `where: { adminId: req.userId }` filter to list query
    - `GET /:id` — use `verifyRestaurantOwnership` before returning
    - `POST /` — set `adminId: req.userId` on creation, count only admin's restaurants for limit check
    - `PUT /:id` — use `verifyRestaurantOwnership` before updating
    - `DELETE /:id` — use `verifyRestaurantOwnership` before deleting
    - `PUT /:id/theme` — use `verifyRestaurantOwnership` before updating theme
    - `PUT /:id/modules` — use `verifyRestaurantOwnership` before updating modules
    - Return 404 for ownership failures, 400 for restaurant limit exceeded
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3_

  - [x] 5.2 Write property tests for restaurant route ownership
    - **Property 1: Restaurant creation assigns ownership**
    - **Property 2: Restaurant list returns only owned restaurants**
    - **Property 4: Restaurant mutations require ownership**
    - **Property 5: Per-admin restaurant limit enforcement**
    - **Validates: Requirements 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3**

- [x] 6. Menu route updates
  - [x] 6.1 Update `server/src/routes/menus.ts` to enforce ownership on all endpoints
    - For restaurant-scoped endpoints (list menus, create menu): use `verifyRestaurantOwnership` on the restaurantId param
    - For menu-scoped endpoints (get, update, delete, duplicate, publish, versions, reorder): use `verifyMenuOwnership` on the menuId param
    - Return 404 for ownership failures
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 6.2 Write unit tests for menu route ownership checks
    - Test menu CRUD with owned restaurant (succeeds)
    - Test menu CRUD with non-owned restaurant (404)
    - Test menu duplicate/publish with non-owned restaurant (404)
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

- [x] 7. Section and category route updates
  - [x] 7.1 Update `server/src/routes/sections.ts` to enforce ownership on all endpoints
    - For section creation: use `verifyMenuOwnership` on the menuId param
    - For section update/delete/duplicate/reorder: use `verifySectionOwnership` on the sectionId param
    - Return 404 for ownership failures
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 Update `server/src/routes/categories.ts` to enforce ownership on all endpoints
    - For category creation: use `verifySectionOwnership` on the sectionId param
    - For category update/delete: verify category's ownership chain up to restaurant
    - Return 404 for ownership failures
    - _Requirements: 7.6_

  - [x] 7.3 Write unit tests for section and category route ownership
    - Test section CRUD with owned chain (succeeds)
    - Test section CRUD with non-owned chain (404)
    - Test category CRUD with owned chain (succeeds)
    - Test category CRUD with non-owned chain (404)
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 7.6**

- [x] 8. Item route updates
  - [x] 8.1 Update `server/src/routes/items.ts` to enforce ownership on all endpoints
    - For item creation: use `verifySectionOwnership` on the sectionId param
    - For item update/delete/duplicate/reorder: use `verifyItemOwnership` on the itemId param
    - For bulk-update and bulk-delete: use `verifyBulkItemOwnership` on the item ID array
    - Bulk operations must verify ALL items before performing any operation (atomic)
    - Return 404 for ownership failures
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 8.2 Write unit tests for item route ownership including bulk operations
    - Test single item CRUD with owned chain (succeeds)
    - Test single item CRUD with non-owned chain (404)
    - Test bulk update/delete with all owned items (succeeds)
    - Test bulk update/delete with mixed ownership (404, no items modified)
    - **Property 9: Bulk item operations require all items owned**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 9. Checkpoint - Core route ownership enforcement
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Ancillary route updates
  - [x] 10.1 Update `server/src/routes/search.ts` to filter results by admin's restaurants
    - Query admin's restaurant IDs first, then filter search results to only those restaurants
    - Return empty results if admin has no restaurants
    - _Requirements: 8.2_

  - [x] 10.2 Update `server/src/routes/import-export.ts` to enforce ownership
    - For export: use `verifyRestaurantOwnership` on the target restaurant before exporting
    - For import-menu: use `verifyRestaurantOwnership` on the target restaurant before importing
    - For full restaurant import: set `adminId: req.userId` on the imported restaurant
    - _Requirements: 8.3_

  - [x] 10.3 Update `server/src/routes/translations.ts` to enforce ownership
    - Use `verifyItemOwnership` on the item ID before any translation operation (list, create, update, delete)
    - Return 404 for ownership failures
    - _Requirements: 8.4, 8.5_

  - [x] 10.4 Write unit tests for ancillary route ownership
    - **Property 10: Search returns only owned restaurant items**
    - **Property 11: Import/export requires restaurant ownership**
    - **Property 12: Translation operations require item ownership chain**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

- [x] 11. Verify global resources and public endpoint
  - [x] 11.1 Verify global resource routes require auth but no ownership filtering
    - Confirm `server/src/routes/allergens.ts`, `server/src/routes/languages.ts`, `server/src/routes/templates.ts` use `authenticateToken` middleware
    - Confirm these routes do NOT filter by `adminId`
    - Add `authenticateToken` middleware if missing on any global resource route
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 11.2 Verify public menu endpoint serves without authentication
    - Confirm the public menu endpoint does not require JWT authentication
    - Confirm the response does not expose `adminId`, admin email, or admin name
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 11.3 Write tests for global resources and public endpoint
    - **Property 13: Global resources accessible to all authenticated admins**
    - **Property 17: Public menu endpoint serves without authentication**
    - **Property 18: Public menu endpoint does not expose admin data**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4**

- [x] 12. Final checkpoint - Full multi-tenancy verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- All ownership failures return 404 (not 403) to avoid leaking resource existence
- Bulk operations are atomic: verify all items before modifying any
