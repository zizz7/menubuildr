# Security and Design Audit Fixes — Bugfix Design

## Overview

A full audit of the restaurant menu SaaS platform (Next.js dashboard + Express/Prisma backend)
identified 24 issues across five severity levels. The fixes are grouped into six logical areas:
Critical XSS, Auth, Import Validation, Medium Security, Low Security, and Design Consistency.
The strategy is to apply targeted, minimal changes that eliminate each defect without altering
any existing correct behavior.

---

## Glossary

- **Bug_Condition (C)**: The set of inputs or states that trigger a defective behavior.
- **Property (P)**: The correct behavior that must hold for every input in C.
- **Preservation**: All behaviors outside C that must remain byte-for-byte identical after the fix.
- **isBugCondition**: Pseudocode predicate that returns `true` when a given input triggers a bug.
- **expectedBehavior**: Pseudocode predicate that returns `true` when the fixed output is correct.
- **SVG sanitization**: Stripping `<script>`, `on*` attributes, and `javascript:` URIs from SVG XML before persisting.
- **HTML escaping**: Converting `<`, `>`, `&`, `"`, `'` to `&lt;`, `&gt;`, `&amp;`, `&quot;`, `&#39;`.
- **Token blocklist**: Server-side Set (or Redis) keyed on token JTI/hash; checked in `authenticateToken`.
- **Magic-byte verification**: Reading the first bytes of a saved file with `file-type` to confirm MIME type.
- **sendError**: Shared helper that emits `{ error: string, code?: string, details?: string }`.
- **handleZodError**: Shared utility that formats a `ZodError` into the standard 400 shape.
- **RESTAURANT_LIMIT / MENU_LIMIT**: Named constants in `server/src/config/limits.ts`.


---

## Bug Details

### Bug Condition

The 24 bugs share a common structure: the system either (a) accepts untrusted input without
sanitization/validation, (b) omits a required security control, or (c) duplicates logic
inconsistently. Each sub-condition is enumerated below.

**Formal Specification (composite):**

```
FUNCTION isBugCondition(input)
  INPUT: input — one of { uploadRequest, menuRenderCall, authRequest,
                          importRequest, httpRequest, storeAction, routeHandler }
  OUTPUT: boolean

  // Critical XSS
  IF input IS uploadRequest
     AND input.fieldname IN ['logo', 'illustration']
     AND input.file.mimetype = 'image/svg+xml'
     AND svgContainsScript(input.file.content)
    RETURN true   // C1.1 — SVG XSS

  IF input IS menuRenderCall
     AND input.fieldValue CONTAINS htmlSpecialChars('<', '>', '&', '"', "'")
    RETURN true   // C1.2 — HTML injection in menu-generator

  // Auth
  IF input IS authRequest
     AND input.path = 'POST /auth/register'
    RETURN true   // C1.3 — missing registration endpoint

  IF input IS authRequest
     AND input.path = 'POST /auth/logout'
     AND tokenNotInBlocklist(input.token)
    RETURN true   // C1.4 — JWT not invalidated on logout

  IF input IS uploadRequest
     AND input.path = 'POST /auth/profile-image'
     AND magicBytesNotVerified(input.file)
    RETURN true   // C1.5 — profile image no magic-byte check

  IF input IS authRequest
     AND input.path = 'PUT /auth/password'
     AND NOT meetsComplexity(input.newPassword)
    RETURN true   // C1.6 — weak password accepted

  // Import validation
  IF input IS importRequest
     AND input.path IN ['POST /restaurants/import',
                        'POST /restaurants/:id/import-menu']
     AND NOT zodValidated(input.body)
    RETURN true   // C1.7 — unvalidated import body

  // Medium
  IF input IS httpRequest
     AND NODE_ENV != 'production'
     AND corsOrigin = true   // wildcard
    RETURN true   // C1.8 — CORS wildcard in dev

  IF input IS httpRequest
     AND input.path IN [writeEndpoints]
     AND rateLimitNotApplied(input)
    RETURN true   // C1.9 — no rate limiting on write endpoints

  IF input IS routeHandler
     AND input.handler = 'PUT /:id/theme'
     AND error.message EXPOSED IN response
     AND NODE_ENV = 'production'
    RETURN true   // C1.10 — error detail leak

  IF input IS httpRequest
     AND input.path MATCHES '/uploads/profile/*'
     AND NOT authenticated(input)
    RETURN true   // C1.11 — unauthenticated profile image access

  // Low
  IF input IS authRequest
     AND input.path = 'POST /auth/login'
     AND jwtExpiry = '7d'   // default too long
    RETURN true   // C1.12 — long JWT expiry

  IF input IS serverStart
     AND helmetCspNotConfigured()
    RETURN true   // C1.13 — missing CSP

  IF input IS dashboardLayoutMount
     AND authCheckedClientSideOnly()
    RETURN true   // C1.14 — no server-side token validation

  IF input IS storeAction
     AND action = 'setAuth'
     AND tokenStoredInTwoPlaces()
    RETURN true   // C1.15 — dual token storage

  IF input IS securityEvent
     AND auditLogNotWritten()
    RETURN true   // C1.16 — no audit logging

  // Design consistency
  IF input IS routeHandler
     AND errorShapeInconsistent(input.response)
    RETURN true   // C1.17 — inconsistent error shape

  IF input IS routeHandler
     AND zodErrorFormattedDifferently(input.response)
    RETURN true   // C1.18 — inconsistent Zod error format

  IF input IS routeHandler
     AND stringFieldNotTrimmedInSchema(input.field)
    RETURN true   // C1.19 — missing .trim() in Zod schema

  IF input IS routeHandler
     AND nullableFieldUsesUndefined(input.field)
    RETURN true   // C1.20 — ?? undefined instead of ?? null

  IF input IS uploadRequest
     AND handlerDuplicated(input.fieldname)
    RETURN true   // C1.21 — four duplicate upload handlers

  IF input IS authFormRender
     AND formLogicDuplicated()
    RETURN true   // C1.22 — duplicated auth form logic

  IF input IS apiClientRequest
     AND tokenReadFromLocalStorageDirect()
    RETURN true   // C1.23 — dual token storage in API client

  IF input IS limitEnforcement
     AND magicNumberHardcoded()
    RETURN true   // C1.24 — hardcoded limit constants

  RETURN false
END FUNCTION
```

### Examples

- C1.1: Upload `evil.svg` containing `<script>alert(1)</script>` as a logo → browser executes script when the SVG is opened directly.
- C1.2: Menu item name `<img src=x onerror=alert(1)>` → injected into generated HTML → executes in every visitor's browser.
- C1.3: `POST /auth/register` with `{name, email, password}` → `404 Cannot POST /api/auth/register`.
- C1.4: `POST /auth/logout` → `200 OK`, but the token still passes `authenticateToken` for 7 days.
- C1.5: Upload a JPEG renamed to `.png` as profile image → accepted without magic-byte check.
- C1.6: `PUT /auth/password` with `newPassword: "password1"` → accepted (no uppercase/special char).
- C1.7: `POST /restaurants/import` with `{name: "<script>", slug: "x", menus: [{"name": 1}]}` → written to DB.
- C1.8: Dev server accepts `Origin: https://evil.com` because `origin: true`.
- C1.9: Attacker sends 1000 import requests/minute with no throttle.
- C1.10: Theme handler throws, response includes `error.message` with stack details in production.
- C1.11: `GET /uploads/profile/admin-id.jpg` returns image with no auth check.
- C1.12: Stolen token valid for 7 days after logout.
- C1.15: `setAuth` writes token to both `auth-storage` (Zustand) and `auth_token` (raw localStorage).
- C1.23: API client reads `localStorage.getItem('auth_token')` instead of Zustand store.
- C1.24: `5` and `4` hardcoded in `restaurants.ts`, `import-export.ts`, and subscription middleware.


---

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Valid PNG/JPEG/WebP uploads to any upload endpoint continue to be accepted, processed through Cloudinary, and return a URL.
- Valid login credentials continue to return a JWT + admin object; the dashboard remains accessible.
- Authenticated CRUD on restaurants and menus continues to enforce ownership and return correct data.
- Published menus continue to generate static HTML served at `/menus/{restaurantSlug}/{menuSlug}.html`.
- Menu item data with no HTML/script content continues to render names, descriptions, prices, allergen icons, and section titles correctly.
- Valid restaurant/menu JSON imports continue to create all records and return them.
- Stripe billing webhook continues to process correctly without interference from new rate limiting or auth changes.
- Password change with valid current password and a policy-compliant new password continues to succeed.
- Theme settings continue to be validated and persisted correctly.
- Dashboard layout with a valid, non-expired token continues to render without redirect.
- CORS in development continues to allow all standard local ports (3000–3005).
- Export endpoints continue to return JSON/CSV without modification.

**Scope:**
All inputs that do NOT satisfy any sub-condition of `isBugCondition` must produce identical
behavior before and after the fix. This includes all read endpoints, all valid authenticated
write requests, all Stripe webhook calls, and all non-SVG file uploads.


---

## Hypothesized Root Cause

1. **SVG XSS (C1.1)**: `upload.ts` calls `verifyMagicBytes` but the SVG branch short-circuits to `return true` for any `.svg` extension without inspecting content. No sanitization step exists before the file is saved or served.

2. **HTML injection in menu-generator (C1.2)**: `menu-generator.ts` interpolates `item.name[lang]`, `item.description[lang]`, `section.title[lang]`, allergen labels, and ingredient text directly into template literals with no escaping utility.

3. **Missing registration endpoint (C1.3)**: `server/src/routes/auth.ts` has `POST /login`, `GET /me`, `POST /logout`, `PUT /profile`, `PUT /password`, and `POST /profile-image` but no `POST /register` route. The frontend `register-form.tsx` calls `POST /auth/register` which hits a 404.

4. **JWT not invalidated on logout (C1.4)**: `POST /logout` calls `res.json({ message: 'Logged out successfully' })` with no server-side state change. `authenticateToken` only verifies the signature and expiry; it has no blocklist check.

5. **Profile image no magic-byte check (C1.5)**: `POST /auth/profile-image` uses an inline multer setup with extension-only filtering (`.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`) and never calls `verifyMagicBytes`. The main upload routes in `upload.ts` do call it.

6. **Weak password policy (C1.6)**: `PUT /auth/password` checks only `newPassword.length < 8`. No regex enforces uppercase, digit, or special character.

7. **Unvalidated import bodies (C1.7)**: Both import handlers in `import-export.ts` cast `req.body` with a TypeScript `as` assertion and perform manual checks (`if (!body.name || !body.slug)`). No Zod schema is applied, so malformed nested objects reach Prisma directly.

8. **CORS wildcard in dev (C1.8)**: `server.ts` sets `origin: isProduction ? allowedOrigins : true`. The `true` value tells the `cors` package to reflect any `Origin` header, accepting all origins in development.

9. **No rate limiting on write endpoints (C1.9)**: `authRateLimiter` is applied only to `POST /auth/login` and `PUT /auth/password`. Import, upload, create-restaurant, and create-menu endpoints have no rate limiter.

10. **Error detail leak in theme handler (C1.10)**: The catch block in `PUT /:id/theme` returns `res.status(500).json({ error: 'Internal server error', message: error.message })` unconditionally, leaking `error.message` in production.

11. **Unauthenticated profile image access (C1.11)**: `server.ts` mounts `express.static` on `/uploads` with no middleware, making `/uploads/profile/*` publicly accessible.

12. **Long JWT expiry (C1.12)**: `expiresIn` defaults to `'7d'` when `JWT_EXPIRES_IN` is not set.

13. **Missing CSP (C1.13)**: `helmet()` is called with no arguments, leaving the default permissive CSP.

14. **Client-side-only auth check (C1.14)**: `dashboard/app/dashboard/layout.tsx` calls `isAuthenticated()` which reads from the Zustand store (localStorage). No call to `GET /auth/me` is made to verify the token is still valid server-side.

15. **Dual token storage (C1.15 / C1.23)**: `setAuth` in `auth-store.ts` calls both `set({ token })` (persisted via Zustand) and `localStorage.setItem('auth_token', token)`. `api/client.ts` reads `localStorage.getItem('auth_token')` directly, bypassing the Zustand store.

16. **No audit logging (C1.16)**: No structured log entries are written for login, logout, registration, password change, or repeated auth failures.

17. **Inconsistent error shapes (C1.17)**: Routes return `{error}`, `{error, details}`, `{error, code}`, or `{error, message}` with no shared helper.

18. **Inconsistent Zod error formatting (C1.18)**: Some routes check `error.name === 'ZodError'`, others check `error.issues`, others check `error.errors`. The formatted output differs per route.

19. **Missing `.trim()` in schemas (C1.19)**: `name.trim()` is called manually in `PUT /profile` but Zod schemas for other string fields lack `.trim()` transforms.

20. **Inconsistent null convention (C1.20)**: Some database writes use `?? undefined` for nullable columns; Prisma treats `undefined` as "do not set" rather than "set to null", causing silent no-ops.

21. **Duplicate upload handlers (C1.21)**: `upload.ts` has four nearly identical handler functions (`/logo`, `/item-image`, `/illustration`, `/allergen-icon`) differing only in field name, MIME list, and Cloudinary folder.

22. **Duplicated auth form logic (C1.22)**: `login-form.tsx` and `register-form.tsx` each independently manage `useState` for loading, error, and submit; they share no abstraction.

23. **Hardcoded limit constants (C1.24)**: `5` (restaurant limit) and `4` (menu limit) appear in `restaurants.ts`, `import-export.ts`, and subscription middleware with no shared source.


---

## Correctness Properties

Property 1: Bug Condition — SVG Sanitization

_For any_ upload request where `isBugCondition` returns true for C1.1 (SVG with embedded script),
the fixed upload handler SHALL strip `<script>` tags, `on*` event-handler attributes, and
`javascript:` URIs from the SVG content before saving, so that the stored file contains no
executable script.

**Validates: Requirements 2.1**

---

Property 2: Bug Condition — HTML Escaping in Menu Generator

_For any_ menu render call where `isBugCondition` returns true for C1.2 (field value contains
HTML special characters), the fixed `menu-generator.ts` SHALL HTML-escape all user-controlled
string values before interpolation, so that `<`, `>`, `&`, `"`, `'` appear as entities in the
output HTML and cannot execute as markup.

**Validates: Requirements 2.2**

---

Property 3: Bug Condition — Registration Endpoint Exists

_For any_ `POST /auth/register` request with valid `{name, email, password}`, the fixed server
SHALL return a 201 response containing `{ token, admin }` in the same shape as the login
response, with the password stored as a bcrypt hash and input validated through a Zod schema.

**Validates: Requirements 2.3**

---

Property 4: Bug Condition — Token Blocklist on Logout

_For any_ `POST /auth/logout` request followed by a subsequent authenticated request using the
same token, the fixed `authenticateToken` middleware SHALL return 401 because the token's JTI
(or hash) is present in the server-side blocklist.

**Validates: Requirements 2.4**

---

Property 5: Bug Condition — Magic-Byte Verification for Profile Images

_For any_ `POST /auth/profile-image` request where the file content does not match an allowed
image MIME type, the fixed handler SHALL reject the upload with a 400 error and delete the
temporary file, identical to the behavior of the main upload routes.

**Validates: Requirements 2.5**

---

Property 6: Bug Condition — Password Complexity Enforcement

_For any_ `PUT /auth/password` request where `newPassword` does not satisfy the complexity
policy (≥8 chars, ≥1 uppercase, ≥1 digit, ≥1 special character), the fixed handler SHALL
return a descriptive 400 error and leave the stored password hash unchanged.

**Validates: Requirements 2.6**

---

Property 7: Bug Condition — Zod Validation on Import Endpoints

_For any_ import request where `isBugCondition` returns true for C1.7 (malformed body), the
fixed handler SHALL validate the body through a Zod schema before any database write and return
a structured 400 error for any invalid or missing field.

**Validates: Requirements 2.7**

---

Property 8: Bug Condition — CORS Dev Allowlist

_For any_ HTTP request in a non-production environment from an origin not in the explicit
allowlist, the fixed CORS configuration SHALL reject the request with a CORS error, rather than
reflecting the origin.

**Validates: Requirements 2.8**

---

Property 9: Bug Condition — Rate Limiting on Write Endpoints

_For any_ IP that exceeds 20 requests per 15 minutes to import, upload, create-restaurant, or
create-menu endpoints, the fixed server SHALL return 429 Too Many Requests.

**Validates: Requirements 2.9**

---

Property 10: Bug Condition — Error Detail Gating

_For any_ unexpected error in the theme update handler when `NODE_ENV = 'production'`, the fixed
handler SHALL return only `{ error: 'Internal server error' }` with no `message` field.

**Validates: Requirements 2.10**

---

Property 11: Bug Condition — Static File Auth for Profile Images

_For any_ unauthenticated request to `/uploads/profile/*`, the fixed server SHALL return 401
rather than serving the file.

**Validates: Requirements 2.11**

---

Property 12: Bug Condition — JWT Default Expiry

_For any_ JWT issued at login when `JWT_EXPIRES_IN` is not set, the fixed server SHALL default
to `'24h'` rather than `'7d'`.

**Validates: Requirements 2.12**

---

Property 13: Bug Condition — Helmet CSP

_For any_ HTTP response from the fixed server, the `Content-Security-Policy` header SHALL
restrict `script-src`, `style-src`, and `img-src` to known safe origins as configured in the
explicit `helmet()` CSP options.

**Validates: Requirements 2.13**

---

Property 14: Bug Condition — Server-Side Token Validation in Dashboard Layout

_For any_ dashboard layout mount where the stored token has been invalidated server-side (e.g.,
blocklisted or expired), the fixed layout SHALL call `GET /auth/me`, receive a 401, and redirect
to `/login`.

**Validates: Requirements 2.14**

---

Property 15: Bug Condition — Single Token Storage

_For any_ `setAuth` call, the fixed auth store SHALL store the token only in the Zustand
`auth-storage` key, and the API client SHALL read the token exclusively from the Zustand store,
so that `localStorage.getItem('auth_token')` is never set or read.

**Validates: Requirements 2.15**

---

Property 16: Bug Condition — Audit Logging

_For any_ login, logout, registration, password change, or repeated auth failure event, the
fixed server SHALL write a structured log entry containing event type, timestamp, user ID (if
known), and IP address.

**Validates: Requirements 2.16**

---

Property 17: Bug Condition — Consistent Error Shape

_For any_ route handler error response, the fixed code SHALL use `sendError` to produce
`{ error: string, code?: string, details?: string }` and no other shape.

**Validates: Requirements 2.17**

---

Property 18: Bug Condition — Consistent Zod Error Handling

_For any_ Zod validation error caught in any route handler, the fixed code SHALL call
`handleZodError` to produce a uniform 400 response, with no per-route formatting differences.

**Validates: Requirements 2.18**

---

Property 19: Bug Condition — Uniform `.trim()` in Zod Schemas

_For any_ string field accepted from user input, the fixed Zod schema SHALL apply `.trim()` so
that leading/trailing whitespace is stripped at the validation layer without manual per-field
trimming in route handlers.

**Validates: Requirements 2.19**

---

Property 20: Bug Condition — Consistent Null Convention

_For any_ optional nullable database field, the fixed code SHALL use `.optional().nullable()` in
Zod schemas and `?? null` (never `?? undefined`) in database writes.

**Validates: Requirements 2.20**

---

Property 21: Bug Condition — Parameterized Upload Handler

_For any_ upload request to `/logo`, `/item-image`, `/illustration`, or `/allergen-icon`, the
fixed code SHALL route through a single parameterized handler function, with field name, allowed
MIME types, and Cloudinary folder passed as configuration.

**Validates: Requirements 2.21**

---

Property 22: Bug Condition — Shared Auth Form Abstraction

_For any_ render of the login or registration form, the fixed code SHALL use a shared
`AuthFormBase` component or `useAuthForm` hook that encapsulates form state, error display,
loading state, and submit wiring.

**Validates: Requirements 2.22**

---

Property 23: Bug Condition — Single Token Source of Truth

_For any_ authenticated API request, the fixed API client SHALL read the token from the Zustand
store only, with no reference to `localStorage.getItem('auth_token')`.

**Validates: Requirements 2.23**

---

Property 24: Bug Condition — Shared Limit Constants

_For any_ enforcement of restaurant or menu count limits, the fixed code SHALL read the values
from `server/src/config/limits.ts` rather than hardcoding them inline.

**Validates: Requirements 2.24**

---

Property 25: Preservation — All Non-Buggy Inputs

_For any_ input where `isBugCondition` returns false (valid uploads, valid auth flows, valid
CRUD, Stripe webhooks, export endpoints, menu generation with safe content), the fixed code
SHALL produce the same result as the original code, preserving all existing correct behavior.

**Validates: Requirements 3.1–3.12**


---

## Fix Implementation

### Changes Required

#### Critical XSS

**File**: `server/src/utils/svg-sanitize.ts` (new)
**Change**: Create `sanitizeSvg(content: string): string` that uses `sanitize-svg` (or a regex
pass) to strip `<script>` tags, `on*` attributes, and `javascript:` URIs.

**File**: `server/src/routes/upload.ts`
**Change**: In the logo and illustration handlers, after `verifyMagicBytes` passes for SVG,
read the file content, call `sanitizeSvg`, and overwrite the file before uploading to Cloudinary.

**File**: `server/src/utils/html-escape.ts` (new)
**Change**: Export `escapeHtml(s: string): string` converting `<→&lt;`, `>→&gt;`,
`&→&amp;`, `"→&quot;`, `'→&#39;`.

**File**: `server/src/services/menu-generator.ts`
**Change**: Import `escapeHtml` and wrap every user-controlled string interpolation:
`item.name[lang]`, `item.description[lang]`, `section.title[lang]`, `subSection.title[lang]`,
allergen labels, ingredient text, and `menu.name[lang]` in the `<title>` tag.

---

#### Auth Fixes

**File**: `server/src/routes/auth.ts`
**Change — Registration endpoint**: Add `POST /register` with:
- Zod schema: `{ name: z.string().min(1).trim(), email: z.string().email().trim(), password: complexPasswordSchema }`
- `bcrypt.hash(password, 10)`
- `prisma.admin.create(...)`
- JWT sign identical to login
- Return `{ token, admin }` with 201

**File**: `server/src/middleware/tokenBlocklist.ts` (new)
**Change — Token blocklist**: Export `const tokenBlocklist = new Set<string>()` and
`addToBlocklist(jti: string)`. In `authenticateToken`, after verifying the JWT, check
`tokenBlocklist.has(decoded.jti)` and return 401 if present.

**File**: `server/src/routes/auth.ts`
**Change — Logout**: Extract `jti` from the verified token (requires `jti` claim in `jwt.sign`)
and call `addToBlocklist(jti)` before responding.

**File**: `server/src/routes/auth.ts`
**Change — Profile image magic bytes**: After multer saves the file, call `verifyMagicBytes`
(imported from `upload.ts` or extracted to a shared util) and reject with 400 if invalid.

**File**: `server/src/utils/validation.ts`
**Change — Password complexity**: Add `complexPasswordSchema`:
```
z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[0-9]/, 'Must contain digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character')
```
Use in `POST /register` and `PUT /password`.

---

#### Import Validation

**File**: `server/src/utils/validation.ts`
**Change**: Add `RestaurantImportSchema` and `MenuImportSchema` using existing sub-schemas
(`MenuSchema`, `SectionSchema`, `MenuItemSchema`) as nested Zod objects.

**File**: `server/src/routes/import-export.ts`
**Change**: Replace `req.body as { ... }` casts with `RestaurantImportSchema.parse(req.body)`
and `MenuImportSchema.parse(req.body)`, wrapping in `handleZodError`.

---

#### Medium Fixes

**File**: `server/src/server.ts`
**Change — CORS**: Replace `origin: isProduction ? allowedOrigins : true` with
`origin: allowedOrigins` (the dev allowlist already covers ports 3000–3005).

**File**: `server/src/server.ts`
**Change — Rate limiting**: Create `writeLimiter` (20 req / 15 min) and apply to
`/api/upload/*`, `POST /api/restaurants`, `POST /api/restaurants/import`,
`POST /api/restaurants/:id/import-menu`.

**File**: `server/src/routes/restaurants.ts`
**Change — Error detail gating**: In the theme handler catch block, replace
`res.status(500).json({ error: 'Internal server error', message: error.message })` with
`sendError(res, 500, 'Internal server error', process.env.NODE_ENV === 'development' ? error.message : undefined)`.

**File**: `server/src/server.ts`
**Change — Static file auth**: Replace the blanket `/uploads` static mount with:
- `/uploads/logo`, `/uploads/item-image`, `/uploads/illustration`, `/uploads/icon` → public static
- `/uploads/profile` → JWT-protected middleware that calls `authenticateToken` then `express.static`
- `/menus` → public static (unchanged)

---

#### Low Fixes

**File**: `server/src/routes/auth.ts`
**Change — JWT expiry**: Change default from `'7d'` to `'24h'`.

**File**: `server/src/server.ts`
**Change — Helmet CSP**: Replace `helmet()` with:
```ts
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
    },
  },
})
```

**File**: `dashboard/app/dashboard/layout.tsx`
**Change — Server-side token validation**: After `isAuthenticated()` returns true, call
`apiClient.get('/auth/me')` and redirect to `/login` on 401.

**File**: `dashboard/lib/store/auth-store.ts`
**Change — Single token storage**: Remove `localStorage.setItem('auth_token', token)` from
`setAuth` and `localStorage.removeItem('auth_token')` from `logout`.

**File**: `dashboard/lib/api/client.ts`
**Change — Single token source**: Replace `localStorage.getItem('auth_token')` with
`useAuthStore.getState().token`.

**File**: `server/src/utils/audit-log.ts` (new)
**Change — Audit logging**: Export `auditLog(event, userId, ip, meta?)` that writes a
structured JSON entry to `console.log` (or a log sink). Call from login, logout, register,
password change, and repeated auth failure handlers.

---

#### Design Consistency

**File**: `server/src/utils/errors.ts` (new)
**Change**: Export `sendError(res, status, error, details?, code?)` that calls
`res.status(status).json({ error, ...(code && { code }), ...(details && { details }) })`.

**File**: `server/src/utils/zod-error.ts` (new)
**Change**: Export `handleZodError(res, err)` that checks `err instanceof ZodError`, formats
`err.issues` into a comma-separated string, and calls `sendError(res, 400, 'Validation error', formatted)`.

**File**: `server/src/utils/validation.ts`
**Change**: Add `.trim()` to all `z.string()` fields that accept user input (name, slug, email,
description, etc.).

**File**: `server/src/utils/validation.ts`
**Change**: Audit all optional fields; change `.optional()` to `.optional().nullable()` for
fields that map to nullable DB columns; ensure all DB writes use `?? null`.

**File**: `server/src/routes/upload.ts`
**Change**: Replace four handler functions with a single `createUploadHandler(config)` factory
that accepts `{ fieldName, allowedMimes, cloudinaryFolder }` and returns an Express handler.

**File**: `dashboard/components/auth/AuthFormBase.tsx` (new) or `dashboard/lib/hooks/useAuthForm.ts` (new)
**Change**: Extract shared state (`loading`, `error`, `handleSubmit` wiring) into a base
component or hook. `LoginForm` and `RegisterForm` become thin wrappers providing their specific
fields and endpoint.

**File**: `server/src/config/limits.ts` (new)
**Change**: Export `RESTAURANT_LIMIT = 5` and `MENU_LIMIT = 4`. Import in `restaurants.ts`,
`import-export.ts`, and subscription middleware.


---

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests against the unfixed code to surface
counterexamples and confirm root causes; then run fix-checking and preservation tests against
the fixed code.

---

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug on unfixed code. Confirm or refute
root cause hypotheses.

**Pseudocode:**
```
FUNCTION isBugCondition(input) → boolean  // defined above
FOR EACH bug IN [C1.1 .. C1.24] DO
  input := craftBuggyInput(bug)
  ASSERT isBugCondition(input) = true
  result := unfixedHandler(input)
  ASSERT NOT expectedBehavior(result)   // should fail on unfixed code
END FOR
```

**Test Cases (will fail on unfixed code):**
1. Upload `evil.svg` with `<script>alert(1)</script>` to `/upload/logo` → expect sanitized file; unfixed: raw script stored.
2. Render menu with item name `<img src=x onerror=alert(1)>` → expect escaped HTML; unfixed: raw tag in output.
3. `POST /auth/register` with valid body → expect 201; unfixed: 404.
4. Login, logout, replay token on `GET /auth/me` → expect 401; unfixed: 200.
5. Upload JPEG renamed `.png` to `POST /auth/profile-image` → expect 400; unfixed: 200.
6. `PUT /auth/password` with `newPassword: "password1"` → expect 400; unfixed: 200.
7. `POST /restaurants/import` with `{name: "<script>", slug: "x", menus: [{"name": 1}]}` → expect 400; unfixed: 201.
8. Send request from `Origin: https://evil.com` in dev → expect CORS rejection; unfixed: reflected.
9. Send 25 import requests in 1 minute → expect 429 on request 21; unfixed: all 200.
10. Trigger theme handler error in production → expect no `message` field; unfixed: `message` present.
11. `GET /uploads/profile/test.jpg` without auth → expect 401; unfixed: 200.
12. Issue JWT, wait — check default expiry claim is `7d`; expect `24h` after fix.
13. Check `Content-Security-Policy` header on any response; unfixed: default permissive.
14. Invalidate token server-side, reload dashboard → expect redirect; unfixed: stays on dashboard.
15. Call `setAuth`, check `localStorage.getItem('auth_token')` → expect null after fix; unfixed: set.
16. Login → check no audit log entry; unfixed: none written.

**Expected Counterexamples:**
- SVG script executes in browser (C1.1)
- HTML injection renders in menu (C1.2)
- 404 on registration (C1.3)
- Replayed token accepted after logout (C1.4)
- Non-image file accepted as profile image (C1.5)
- Weak password accepted (C1.6)
- Malformed import body written to DB (C1.7)

---

### Fix Checking

**Goal**: Verify that for all inputs where `isBugCondition` returns true, the fixed function
produces `expectedBehavior`.

**Pseudocode:**
```
FUNCTION expectedBehavior(result, bugId) → boolean
  MATCH bugId
    C1.1 → result.storedSvgContent CONTAINS NO script/onEvent/javascriptUri
    C1.2 → result.html CONTAINS NO unescaped '<' or '>' from user input
    C1.3 → result.status = 201 AND result.body.token EXISTS
    C1.4 → result.replayStatus = 401
    C1.5 → result.status = 400
    C1.6 → result.status = 400
    C1.7 → result.status = 400
    C1.8 → result.corsRejected = true
    C1.9 → result.status = 429 AFTER 20 requests
    C1.10 → result.body.message IS UNDEFINED IN production
    C1.11 → result.status = 401
    C1.12 → decoded.exp - decoded.iat = 86400 (24h)
    C1.13 → result.headers['content-security-policy'] CONTAINS "script-src 'self'"
    C1.14 → result.redirectedTo = '/login' WHEN token invalid
    C1.15 → localStorage.getItem('auth_token') = null AFTER setAuth
    C1.16 → auditLog.entries.length > 0 AFTER security event
    C1.17..C1.24 → structural/code assertions (see unit tests)
  END MATCH
END FUNCTION

FOR ALL input WHERE isBugCondition(input) DO
  result := fixedHandler(input)
  ASSERT expectedBehavior(result, input.bugId)
END FOR
```

---

### Preservation Checking

**Goal**: Verify that for all inputs where `isBugCondition` returns false, the fixed code
produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalHandler(input) = fixedHandler(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation because it
generates many input combinations automatically and catches edge cases that manual tests miss.

**Test Cases:**
1. Valid PNG/JPEG/WebP upload → same Cloudinary URL response as before.
2. Valid login → same `{ token, admin }` shape.
3. Valid CRUD on restaurants/menus → same data returned.
4. Menu generation with safe content → identical HTML output.
5. Valid import JSON → same created records.
6. Stripe webhook → unaffected by rate limiter (webhook path excluded).
7. Valid password change → same success response.
8. Theme update with valid data → same persisted settings.
9. Dashboard load with valid token → no redirect.
10. Export endpoints → same JSON/CSV output.

---

### Unit Tests

- SVG sanitizer strips `<script>`, `on*` attrs, `javascript:` URIs; leaves valid SVG intact.
- `escapeHtml` converts all five special characters; leaves safe strings unchanged.
- `POST /auth/register` with valid body → 201 + `{ token, admin }`.
- `POST /auth/register` with missing fields → 400 Zod error.
- `POST /auth/register` with duplicate email → 409.
- `POST /auth/logout` → token added to blocklist; subsequent request → 401.
- `PUT /auth/password` with weak password → 400 with complexity message.
- `PUT /auth/password` with strong password → 200.
- Profile image upload with non-image content → 400.
- Import with malformed body → 400 Zod error.
- Import with valid body → 201.
- Theme handler error in production → no `message` field in response.
- `/uploads/profile/x.jpg` without auth → 401.
- `/uploads/logo/x.png` without auth → 200 (public).
- JWT issued at login has `exp - iat = 86400`.
- `sendError` always produces `{ error, code?, details? }` shape.
- `handleZodError` produces consistent 400 for any ZodError.
- `RESTAURANT_LIMIT` and `MENU_LIMIT` imported from `limits.ts` match enforced values.

### Property-Based Tests

- For any string containing HTML special characters, `escapeHtml(s)` output contains no raw `<` or `>`.
- For any valid SVG string, `sanitizeSvg(s)` output contains no `<script` or `on[a-z]+\s*=`.
- For any non-buggy upload request (valid MIME, valid content), the fixed handler returns the same response as the original.
- For any non-buggy auth request (valid credentials, valid token), the fixed handler returns the same response as the original.
- For any route handler error, `sendError` output always satisfies `{ error: string }` schema.
- For any ZodError, `handleZodError` output always has `status = 400` and `body.error = 'Validation error'`.

### Integration Tests

- Full registration → login → dashboard flow works end-to-end.
- Upload SVG logo → publish menu → verify no script in generated HTML.
- Upload menu item with HTML name → publish menu → verify escaped in output.
- Login → logout → replay token → 401.
- Import valid restaurant JSON → verify all records created.
- Import malformed JSON → verify 400, no partial records.
- Dashboard layout with expired/blocklisted token → redirects to `/login`.
- Rate limiter: 21st write request in window → 429.
- `/uploads/profile/*` requires auth; `/uploads/logo/*` does not.
