# Implementation Plan

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - All 24 Security and Design Defects
  - **CRITICAL**: These tests MUST FAIL on unfixed code — failure confirms each bug exists
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - Test C1.1: Upload `evil.svg` containing `<script>alert(1)</script>` to `/upload/logo` — expect sanitized file; unfixed: raw script stored
  - Test C1.2: Render menu with item name `<img src=x onerror=alert(1)>` — expect escaped HTML; unfixed: raw tag in output
  - Test C1.3: `POST /auth/register` with `{name, email, password}` — expect 201; unfixed: 404
  - Test C1.4: Login → logout → replay token on `GET /auth/me` — expect 401; unfixed: 200
  - Test C1.5: Upload JPEG renamed `.png` to `POST /auth/profile-image` — expect 400; unfixed: 200
  - Test C1.6: `PUT /auth/password` with `newPassword: "password1"` — expect 400; unfixed: 200
  - Test C1.7: `POST /restaurants/import` with `{name: "<script>", slug: "x", menus: [{"name": 1}]}` — expect 400; unfixed: 201
  - Test C1.8: Request from `Origin: https://evil.com` in dev — expect CORS rejection; unfixed: reflected
  - Test C1.9: 25 import requests in 1 minute — expect 429 on request 21; unfixed: all 200
  - Test C1.10: Trigger theme handler error in production — expect no `message` field; unfixed: `message` present
  - Test C1.11: `GET /uploads/profile/test.jpg` without auth — expect 401; unfixed: 200
  - Test C1.12: Issue JWT — check default expiry claim is `7d`; expect `24h` after fix
  - Test C1.13: Check `Content-Security-Policy` header — unfixed: default permissive
  - Test C1.14: Invalidate token server-side, reload dashboard — expect redirect; unfixed: stays on dashboard
  - Test C1.15: Call `setAuth`, check `localStorage.getItem('auth_token')` — expect null after fix; unfixed: set
  - Test C1.16: Login — check no audit log entry written; unfixed: none
  - Run all tests on UNFIXED code — **EXPECTED OUTCOME**: Tests FAIL (proves bugs exist)
  - Document counterexamples found to understand root causes
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.16_


- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - All Non-Buggy Inputs Produce Identical Behavior
  - **IMPORTANT**: Follow observation-first methodology — observe unfixed code behavior first
  - Observe: valid PNG/JPEG/WebP upload returns Cloudinary URL on unfixed code
  - Observe: valid login returns `{ token, admin }` shape on unfixed code
  - Observe: authenticated CRUD on restaurants/menus returns correct data on unfixed code
  - Observe: menu generation with safe content produces correct HTML on unfixed code
  - Observe: valid import JSON creates all records on unfixed code
  - Observe: Stripe webhook processes correctly on unfixed code
  - Observe: valid password change returns success on unfixed code
  - Observe: theme update with valid data persists correctly on unfixed code
  - Observe: dashboard load with valid token renders without redirect on unfixed code
  - Observe: export endpoints return JSON/CSV correctly on unfixed code
  - Write property-based tests: for any non-buggy upload (valid MIME, valid content), fixed handler returns same response as original
  - Write property-based tests: for any non-buggy auth request (valid credentials, valid token), fixed handler returns same response
  - Write property-based tests: for any route handler error, `sendError` output always satisfies `{ error: string }` schema
  - Write property-based tests: for any ZodError, `handleZodError` output always has `status = 400` and `body.error = 'Validation error'`
  - Run tests on UNFIXED code — **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12_


- [x] 3. Create foundation utility files (no other tasks may start until this is complete)

  - [x] 3.1 Create `server/src/utils/errors.ts` — shared error response helper
    - Export `sendError(res, status, error, details?, code?)` that calls `res.status(status).json({ error, ...(code && { code }), ...(details && { details }) })`
    - This is the single source of truth for all error response shapes across the entire server
    - _Bug_Condition: C1.17 — errorShapeInconsistent(input.response)_
    - _Expected_Behavior: every error response satisfies `{ error: string, code?: string, details?: string }`_
    - _Requirements: 2.17_

  - [x] 3.2 Create `server/src/utils/zod-error.ts` — shared Zod error formatter
    - Export `handleZodError(res, err)` that checks `err instanceof ZodError`, formats `err.issues` into a comma-separated string, and calls `sendError(res, 400, 'Validation error', formatted)`
    - Eliminates all per-route `error.name === 'ZodError'` / `error.issues` / `error.errors` divergence
    - _Bug_Condition: C1.18 — zodErrorFormattedDifferently(input.response)_
    - _Expected_Behavior: uniform 400 `{ error: 'Validation error', details: '...' }` for any ZodError_
    - _Requirements: 2.18_

  - [x] 3.3 Create `server/src/utils/html-escape.ts` — HTML escaping utility
    - Export `escapeHtml(s: string): string` converting `<→&lt;`, `>→&gt;`, `&→&amp;`, `"→&quot;`, `'→&#39;`
    - Must handle empty string and strings with no special characters (returns unchanged)
    - _Bug_Condition: C1.2 — menuRenderCall with htmlSpecialChars in fieldValue_
    - _Expected_Behavior: output HTML contains no raw `<` or `>` from user input_
    - _Requirements: 2.2_

  - [x] 3.4 Create `server/src/utils/svg-sanitize.ts` — SVG sanitization utility
    - Export `sanitizeSvg(content: string): string` that strips `<script>` tags, `on*` event-handler attributes, and `javascript:` URIs from SVG XML
    - Use `sanitize-svg` package or a regex pass; must leave valid SVG structure intact
    - _Bug_Condition: C1.1 — uploadRequest with SVG containing svgContainsScript_
    - _Expected_Behavior: stored SVG content contains no `<script`, `on[a-z]+=`, or `javascript:` URI_
    - _Requirements: 2.1_

  - [x] 3.5 Create `server/src/utils/audit-log.ts` — structured audit logging utility
    - Export `auditLog(event: string, userId: string | null, ip: string, meta?: Record<string, unknown>): void`
    - Writes a structured JSON entry to `console.log` with `{ event, timestamp, userId, ip, ...meta }`
    - _Bug_Condition: C1.16 — securityEvent with auditLogNotWritten()_
    - _Expected_Behavior: structured log entry written for every security event_
    - _Requirements: 2.16_

  - [x] 3.6 Create `server/src/config/limits.ts` — shared limit constants
    - Export `RESTAURANT_LIMIT = 5` and `MENU_LIMIT = 4`
    - These replace all hardcoded `5` and `4` magic numbers in `restaurants.ts`, `import-export.ts`, and subscription middleware
    - _Bug_Condition: C1.24 — limitEnforcement with magicNumberHardcoded()_
    - _Expected_Behavior: all limit enforcement reads from this single file_
    - _Requirements: 2.24_


- [x] 4. Fix critical XSS vulnerabilities (depends on task 3)

  - [x] 4.1 Apply SVG sanitization in `server/src/routes/upload.ts`
    - Import `sanitizeSvg` from `server/src/utils/svg-sanitize.ts`
    - In the logo and illustration handlers, after `verifyMagicBytes` passes for SVG, read the file content, call `sanitizeSvg`, and overwrite the file before uploading to Cloudinary
    - Allergen-icon handler: apply same sanitization if SVG is in the allowed MIME list
    - Replace all four duplicate handler functions with a single `createUploadHandler(config)` factory accepting `{ fieldName, allowedMimes, cloudinaryFolder }` (fixes C1.21 simultaneously)
    - _Bug_Condition: C1.1 — SVG upload with embedded script; C1.21 — four duplicate handlers_
    - _Expected_Behavior: stored SVG contains no executable script; single parameterized handler used_
    - _Preservation: valid PNG/JPEG/WebP uploads continue to return Cloudinary URL (Property 25)_
    - _Requirements: 2.1, 2.21_

  - [x] 4.2 Apply HTML escaping in `server/src/services/menu-generator.ts`
    - Import `escapeHtml` from `server/src/utils/html-escape.ts`
    - Wrap every user-controlled string interpolation: `item.name[lang]`, `item.description[lang]`, `section.title[lang]`, `subSection.title[lang]`, allergen labels, ingredient text, and `menu.name[lang]` in the `<title>` tag
    - Do NOT escape static template strings or CSS values — only user-supplied data fields
    - _Bug_Condition: C1.2 — menuRenderCall with HTML special chars in field values_
    - _Expected_Behavior: `<`, `>`, `&`, `"`, `'` appear as entities in output HTML_
    - _Preservation: menu item data with no HTML/script content continues to render correctly (Property 25, Req 3.5)_
    - _Requirements: 2.2_


- [x] 5. Fix auth vulnerabilities (depends on task 3)

  - [x] 5.1 Add `POST /auth/register` endpoint in `server/src/routes/auth.ts`
    - Add Zod schema: `{ name: z.string().min(1).trim(), email: z.string().email().trim(), password: complexPasswordSchema }`
    - Hash password with `bcrypt.hash(password, 10)`
    - Create admin with `prisma.admin.create(...)`
    - Sign JWT identical to login (include `jti: uuid()` claim — required for blocklist in 5.2)
    - Return `{ token, admin }` with status 201
    - Handle duplicate email with 409 using `sendError`
    - Call `auditLog('register', admin.id, req.ip)` on success
    - Use `handleZodError` for validation failures
    - _Bug_Condition: C1.3 — POST /auth/register returns 404_
    - _Expected_Behavior: 201 `{ token, admin }` identical in shape to login response_
    - _Requirements: 2.3_

  - [x] 5.2 Create `server/src/middleware/tokenBlocklist.ts` and wire into logout
    - Export `const tokenBlocklist = new Set<string>()` and `addToBlocklist(jti: string)`
    - In `authenticateToken` middleware: after verifying JWT, check `tokenBlocklist.has(decoded.jti)` and return 401 if present
    - In `POST /auth/logout`: extract `jti` from the verified token and call `addToBlocklist(jti)` before responding
    - Ensure `jwt.sign` in login (and new register) includes `jti: uuid()` claim
    - Call `auditLog('logout', decoded.adminId, req.ip)` on logout
    - _Bug_Condition: C1.4 — POST /auth/logout does not invalidate JWT_
    - _Expected_Behavior: replayed token after logout returns 401_
    - _Preservation: valid authenticated requests with non-blocklisted tokens continue to succeed (Req 3.2)_
    - _Requirements: 2.4_

  - [x] 5.3 Add magic-byte verification to `POST /auth/profile-image` in `server/src/routes/auth.ts`
    - After multer saves the file, call `verifyMagicBytes` (extract to shared util if not already) on the saved file path
    - Reject with `sendError(res, 400, 'Invalid file type')` and delete the temp file if magic bytes do not match an allowed image MIME type
    - Allowed types: `image/jpeg`, `image/png`, `image/webp` (no SVG for profile images)
    - _Bug_Condition: C1.5 — profile image upload with no magic-byte check_
    - _Expected_Behavior: non-image file content rejected with 400_
    - _Preservation: valid image uploads continue to succeed (Req 3.1)_
    - _Requirements: 2.5_

  - [x] 5.4 Add `complexPasswordSchema` to `server/src/utils/validation.ts` and apply to password endpoints
    - Add `complexPasswordSchema`: `z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain digit').regex(/[^A-Za-z0-9]/, 'Must contain special character')`
    - Apply in `POST /register` (task 5.1) and `PUT /auth/password`
    - Return descriptive 400 via `handleZodError` if policy not met
    - Call `auditLog('password_change', adminId, req.ip)` on successful password change
    - _Bug_Condition: C1.6 — PUT /auth/password accepts weak passwords_
    - _Expected_Behavior: 400 with complexity message for any password missing uppercase, digit, or special char_
    - _Preservation: valid password change with policy-compliant password continues to succeed (Req 3.8)_
    - _Requirements: 2.6_


- [x] 6. Add Zod validation to import endpoints (depends on task 3)

  - [x] 6.1 Add `RestaurantImportSchema` and `MenuImportSchema` to `server/src/utils/validation.ts`
    - Build `RestaurantImportSchema` using existing sub-schemas (`MenuSchema`, `SectionSchema`, `MenuItemSchema`) as nested Zod objects
    - Build `MenuImportSchema` similarly for `POST /restaurants/:id/import-menu`
    - Apply `.trim()` to all string fields per the design consistency requirement (C1.19)
    - Apply `.optional().nullable()` to all optional nullable fields (C1.20)
    - _Bug_Condition: C1.7 — importRequest body not zodValidated_
    - _Expected_Behavior: malformed body returns structured 400 before any DB write_
    - _Requirements: 2.7, 2.19, 2.20_

  - [x] 6.2 Apply Zod validation in `server/src/routes/import-export.ts`
    - Replace `req.body as { ... }` casts with `RestaurantImportSchema.parse(req.body)` and `MenuImportSchema.parse(req.body)`
    - Wrap in `handleZodError` for validation failures
    - Remove manual `if (!body.name || !body.slug)` checks — Zod handles these
    - Replace hardcoded `5` and `4` limit checks with `RESTAURANT_LIMIT` and `MENU_LIMIT` from `server/src/config/limits.ts`
    - _Bug_Condition: C1.7 — unvalidated import body; C1.24 — hardcoded limits_
    - _Expected_Behavior: 400 for any invalid/missing field; limits read from constants_
    - _Preservation: valid restaurant/menu JSON imports continue to create all records (Req 3.6)_
    - _Requirements: 2.7, 2.24_


- [x] 7. Apply medium security fixes (depends on task 3)

  - [x] 7.1 Fix CORS configuration in `server/src/server.ts`
    - Replace `origin: isProduction ? allowedOrigins : true` with `origin: allowedOrigins`
    - Ensure `allowedOrigins` already includes all standard local dev ports (3000–3005) so local development is not broken
    - _Bug_Condition: C1.8 — NODE_ENV != 'production' with corsOrigin = true_
    - _Expected_Behavior: requests from origins not in allowlist are rejected with CORS error_
    - _Preservation: CORS continues to allow all standard local dev ports (Req 3.11)_
    - _Requirements: 2.8_

  - [x] 7.2 Add rate limiting to write endpoints in `server/src/server.ts`
    - Create `writeLimiter` with `express-rate-limit`: 20 requests per 15 minutes per IP
    - Apply to: `POST /api/upload/*`, `POST /api/restaurants` (create), `POST /api/restaurants/import`, `POST /api/restaurants/:id/import-menu`, `POST /api/restaurants/:id/menus` (create menu)
    - Exclude Stripe webhook path from rate limiting
    - _Bug_Condition: C1.9 — write endpoints with rateLimitNotApplied_
    - _Expected_Behavior: 429 after 20 requests per 15 min per IP_
    - _Preservation: Stripe billing webhook continues to process correctly (Req 3.7)_
    - _Requirements: 2.9_

  - [x] 7.3 Gate error details in theme handler in `server/src/routes/restaurants.ts`
    - In the `PUT /:id/theme` catch block, replace `res.status(500).json({ error: 'Internal server error', message: error.message })` with `sendError(res, 500, 'Internal server error', process.env.NODE_ENV === 'development' ? error.message : undefined)`
    - _Bug_Condition: C1.10 — theme handler exposes error.message in production_
    - _Expected_Behavior: production response contains only `{ error: 'Internal server error' }` with no `message` field_
    - _Preservation: theme settings continue to be validated and persisted correctly (Req 3.9)_
    - _Requirements: 2.10_

  - [x] 7.4 Protect `/uploads/profile/*` with authentication in `server/src/server.ts`
    - Replace the blanket `express.static('/uploads')` mount with split mounts:
      - `/uploads/logo`, `/uploads/item-image`, `/uploads/illustration`, `/uploads/icon` → public `express.static`
      - `/uploads/profile` → `authenticateToken` middleware then `express.static`
    - `/menus` static mount remains unchanged (public)
    - _Bug_Condition: C1.11 — unauthenticated request to /uploads/profile/* returns file_
    - _Expected_Behavior: 401 for unauthenticated requests to /uploads/profile/*; public upload paths unaffected_
    - _Preservation: published menus continue to be served at /menus/... (Req 3.4)_
    - _Requirements: 2.11_


- [x] 8. Apply low security fixes (depends on task 3)

  - [x] 8.1 Reduce JWT default expiry in `server/src/routes/auth.ts`
    - Change `expiresIn` default from `'7d'` to `'24h'`
    - Keep `JWT_EXPIRES_IN` env var override so operators can configure it
    - Apply to both login and the new register endpoint (task 5.1)
    - _Bug_Condition: C1.12 — JWT issued with 7d expiry_
    - _Expected_Behavior: `decoded.exp - decoded.iat = 86400` (24h) when JWT_EXPIRES_IN not set_
    - _Preservation: valid login continues to return JWT + admin object (Req 3.2)_
    - _Requirements: 2.12_

  - [x] 8.2 Configure Helmet CSP in `server/src/server.ts`
    - Replace `helmet()` with explicit CSP configuration:
      - `defaultSrc: ["'self'"]`
      - `scriptSrc: ["'self'"]`
      - `styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"]`
      - `imgSrc: ["'self'", "data:", "https://res.cloudinary.com"]`
      - `fontSrc: ["'self'", "https://fonts.gstatic.com"]`
      - `connectSrc: ["'self'"]`
    - _Bug_Condition: C1.13 — helmetCspNotConfigured()_
    - _Expected_Behavior: Content-Security-Policy header restricts script-src, style-src, img-src to known safe origins_
    - _Requirements: 2.13_

  - [x] 8.3 Add server-side token validation to `dashboard/app/dashboard/layout.tsx`
    - After `isAuthenticated()` returns true, call `apiClient.get('/auth/me')`
    - On 401 response, redirect to `/login`
    - On success, continue rendering the dashboard
    - _Bug_Condition: C1.14 — dashboardLayoutMount with authCheckedClientSideOnly()_
    - _Expected_Behavior: dashboard redirects to /login when server returns 401 for stored token_
    - _Preservation: dashboard with valid non-expired token continues to render without redirect (Req 3.10)_
    - _Requirements: 2.14_

  - [x] 8.4 Consolidate to single token storage in `dashboard/lib/store/auth-store.ts` and `dashboard/lib/api/client.ts`
    - In `auth-store.ts`: remove `localStorage.setItem('auth_token', token)` from `setAuth` and `localStorage.removeItem('auth_token')` from `logout`
    - In `dashboard/lib/api/client.ts`: replace `localStorage.getItem('auth_token')` with `useAuthStore.getState().token`
    - Token lives exclusively in Zustand `auth-storage` key (persisted via persist middleware)
    - _Bug_Condition: C1.15 — setAuth stores token in two places; C1.23 — API client reads auth_token directly_
    - _Expected_Behavior: `localStorage.getItem('auth_token')` is null after setAuth; API client reads from Zustand store_
    - _Preservation: valid login continues to make authenticated API requests correctly (Req 3.2)_
    - _Requirements: 2.15, 2.23_


- [x] 9. Apply design consistency fixes (depends on task 3)

  - [x] 9.1 Apply `sendError` and `handleZodError` across all route files
    - Import `sendError` from `server/src/utils/errors.ts` in: `auth.ts`, `restaurants.ts`, `import-export.ts`, `upload.ts`, and any other route files with inline error responses
    - Import `handleZodError` from `server/src/utils/zod-error.ts` in all route files that catch ZodErrors
    - Replace all `res.json({ error })`, `res.json({ error, details })`, `res.json({ error, code })`, `res.json({ error, message })` calls with `sendError(...)`
    - Replace all per-route Zod error formatting with `handleZodError(res, err)`
    - _Bug_Condition: C1.17 — errorShapeInconsistent; C1.18 — zodErrorFormattedDifferently_
    - _Expected_Behavior: every error response satisfies `{ error: string, code?: string, details?: string }`_
    - _Requirements: 2.17, 2.18_

  - [x] 9.2 Add `.trim()` transforms to Zod schemas in `server/src/utils/validation.ts`
    - Audit all `z.string()` fields that accept user input (name, slug, email, description, etc.)
    - Add `.trim()` to each; remove any manual `field.trim()` calls in route handlers that become redundant
    - _Bug_Condition: C1.19 — stringFieldNotTrimmedInSchema_
    - _Expected_Behavior: leading/trailing whitespace stripped at validation layer uniformly_
    - _Requirements: 2.19_

  - [x] 9.3 Standardize null convention in Zod schemas and database writes
    - Audit all optional fields in Zod schemas; change `.optional()` to `.optional().nullable()` for fields that map to nullable DB columns
    - Audit all database writes; replace `?? undefined` with `?? null` for nullable columns
    - _Bug_Condition: C1.20 — nullableFieldUsesUndefined_
    - _Expected_Behavior: nullable DB columns always receive `null` (not `undefined`) when absent_
    - _Requirements: 2.20_

  - [x] 9.4 Create shared auth form abstraction in `dashboard/components/auth/`
    - Create `dashboard/lib/hooks/useAuthForm.ts` (or `dashboard/components/auth/AuthFormBase.tsx`) encapsulating: `loading` state, `error` state, `handleSubmit` wiring
    - Refactor `login-form.tsx` and `register-form.tsx` to use the shared hook/component, providing only their specific fields and endpoint
    - _Bug_Condition: C1.22 — authFormRender with formLogicDuplicated()_
    - _Expected_Behavior: login and register forms share a common abstraction; no duplicated state management_
    - _Preservation: login and registration flows continue to work end-to-end (Req 3.2)_
    - _Requirements: 2.22_

  - [x] 9.5 Replace hardcoded limits in `server/src/routes/restaurants.ts`
    - Import `RESTAURANT_LIMIT` and `MENU_LIMIT` from `server/src/config/limits.ts`
    - Replace all inline `5` and `4` magic numbers in `restaurants.ts` and subscription middleware
    - (import-export.ts covered in task 6.2)
    - _Bug_Condition: C1.24 — limitEnforcement with magicNumberHardcoded()_
    - _Expected_Behavior: all limit enforcement reads from `limits.ts`_
    - _Requirements: 2.24_


- [x] 10. Verify bug condition exploration tests now pass (after all fixes)

  - [x] 10.1 Re-run bug condition exploration tests from task 1
    - **Property 1: Expected Behavior** - All 24 Security and Design Defects Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 — do NOT write new tests
    - The tests from task 1 encode the expected behavior for each bug condition
    - When these tests pass, it confirms the expected behavior is satisfied for all 24 fixes
    - Run all bug condition tests against the fixed code
    - **EXPECTED OUTCOME**: All tests PASS (confirms all bugs are fixed)
    - _Requirements: 2.1–2.24 (Properties 1–24 from design.md)_

  - [x] 10.2 Re-run preservation property tests from task 2
    - **Property 2: Preservation** - All Non-Buggy Inputs Produce Identical Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 — do NOT write new tests
    - Run all preservation property tests against the fixed code
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm: valid uploads, login, CRUD, menu generation, imports, Stripe webhook, password change, theme update, dashboard load, exports all behave identically
    - _Requirements: 3.1–3.12 (Property 25 from design.md)_

- [x] 11. Checkpoint — Ensure all tests pass
  - Run the full test suite (unit, property-based, integration)
  - Verify all 24 bug condition tests pass
  - Verify all preservation tests pass
  - Verify no new TypeScript/lint errors introduced
  - Ensure all tests pass; ask the user if questions arise
