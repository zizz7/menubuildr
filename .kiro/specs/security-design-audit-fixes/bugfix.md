# Bugfix Requirements Document

## Introduction

A full security and design audit of the restaurant menu management SaaS platform (Next.js dashboard + Express/Prisma backend) identified 24 issues across four severity levels: Critical, High, Medium, Low, and Design Consistency. These range from stored XSS vulnerabilities and a broken registration endpoint to inconsistent error formats and duplicated code patterns. This document captures the defective behaviors, the correct behaviors that must replace them, and the existing behaviors that must be preserved throughout the fix.

---

## Bug Analysis

### Current Behavior (Defect)

**Critical**

1.1 WHEN an SVG file is uploaded as a logo, illustration, or allergen icon THEN the system accepts it after an extension-only check (bypassing magic-byte verification) and serves it at `/uploads/...` where browsers execute embedded `<script>` tags and JS event handlers as a full SVG document.

1.2 WHEN a menu item name, description, section title, allergen label, or ingredient text contains HTML such as `<img src=x onerror=alert(1)>` THEN the system interpolates it verbatim into the generated menu HTML string in `menu-generator.ts`, causing script execution in every visitor's browser.

1.3 WHEN a new user submits the registration form THEN the system returns a network error because `POST /auth/register` does not exist in `auth.ts`, making registration completely non-functional.

**High**

1.4 WHEN a user calls `POST /auth/logout` THEN the system returns a success message but does not invalidate the JWT, which remains valid for up to 7 days and can be replayed by an attacker who obtained it.

1.5 WHEN a profile image is uploaded via `POST /auth/profile-image` THEN the system accepts any file whose extension is in the allowlist without verifying magic bytes, unlike the main upload routes which call `verifyMagicBytes`.

1.6 WHEN a user changes their password via `PUT /auth/password` THEN the system accepts any new password of 8 or more characters with no complexity requirements (no uppercase, digit, or special character enforcement).

1.7 WHEN `POST /restaurants/import` or `POST /restaurants/:id/import-menu` receives a JSON body THEN the system uses manual TypeScript type assertions instead of Zod schema validation, allowing malformed or malicious field values to be written directly to the database.

**Medium**

1.8 WHEN the server runs outside of production (`NODE_ENV !== 'production'`) THEN the system sets `origin: true` in the CORS configuration, accepting requests from any origin.

1.9 WHEN a user calls import, upload, create-restaurant, or create-menu endpoints THEN the system applies no rate limiting, allowing unlimited requests per IP.

1.10 WHEN the theme update handler in `restaurants.ts` catches an unexpected error THEN the system returns `message: error.message` in the response body regardless of `NODE_ENV`, leaking internal error details to clients.

1.11 WHEN an unauthenticated request is made to `/uploads/*` or `/menus/*` THEN the system serves the file via `express.static` with no authentication check, making profile images and generated menu HTML publicly accessible.

**Low**

1.12 WHEN a JWT is issued at login THEN the system sets a default expiry of 7 days, providing a long window for token abuse in a SaaS context with billing.

1.13 WHEN the server starts THEN the system calls `helmet()` with no Content Security Policy configuration, leaving the default permissive CSP in place.

1.14 WHEN the dashboard layout mounts THEN the system checks authentication only via `isAuthenticated()` from the Zustand store (backed by localStorage), with no server-side session validation.

1.15 WHEN `setAuth` is called in the auth store THEN the system stores the token in both the Zustand `auth-storage` key and a separate `auth_token` key in localStorage, creating two sources of truth that can diverge.

1.16 WHEN security-relevant events occur (login, logout, registration, password change, failed auth) THEN the system records no audit log entries.

**Design Consistency**

1.17 WHEN a route handler returns an error THEN the system uses one of three inconsistent shapes: `{error}`, `{error, details}`, or `{error, code}`, and the theme handler additionally returns `{error, message}`, making client-side error handling unpredictable.

1.18 WHEN a Zod validation error is caught in a route handler THEN the system formats and returns it differently in each route (some use `error.issues`, some use `error.errors`, some check `error.name === 'ZodError'`), producing inconsistent 400 responses.

1.19 WHEN user-supplied string fields are processed in route handlers THEN the system trims some fields manually (e.g., `name.trim()` in profile update) but leaves others untrimmed, and Zod schemas do not apply `.trim()` transforms uniformly.

1.20 WHEN optional fields are absent in Zod schemas and database writes THEN the system inconsistently uses `?? null` in some places and `?? undefined` in others, and mixes `.optional()` with `.optional().nullable()` without a clear convention.

1.21 WHEN a file upload request arrives at `/upload/logo`, `/upload/item-image`, `/upload/illustration`, or `/upload/allergen-icon` THEN the system executes four nearly identical handler functions that differ only in field name, allowed MIME types, and Cloudinary folder, instead of a single parameterized handler.

1.22 WHEN the login and registration forms are rendered THEN the system renders two separate components (`login-form.tsx` and `register-form.tsx`) that duplicate form state management, error display, loading state, and submit logic with no shared abstraction.

1.23 WHEN the API client sends an authenticated request THEN the system reads the token from `localStorage.getItem('auth_token')` while the auth store also persists the token under the `auth-storage` key, creating dual storage with no single source of truth.

1.24 WHEN the restaurant limit (5) or menu limit (4) is enforced THEN the system hardcodes these magic numbers in multiple places (`restaurants.ts`, `import-export.ts`, subscription middleware) with no shared constants file.

---

### Expected Behavior (Correct)

**Critical**

2.1 WHEN an SVG file is uploaded THEN the system SHALL sanitize it by stripping `<script>` tags, JS event handlers (`on*` attributes), and `javascript:` URIs before saving, and SHALL serve uploaded files with a `Content-Disposition: attachment` header (or restrict SVG MIME type to `image/svg+xml` with sanitization) to prevent in-browser script execution.

2.2 WHEN user-controlled data is interpolated into generated menu HTML THEN the system SHALL HTML-escape all values (converting `<`, `>`, `&`, `"`, `'` to their HTML entities) before insertion, so that no injected markup can execute as script.

2.3 WHEN a new user submits the registration form THEN the system SHALL process the request via a `POST /auth/register` endpoint that validates input, hashes the password, creates the admin record, and returns a JWT and admin object identical in shape to the login response.

**High**

2.4 WHEN a user calls `POST /auth/logout` THEN the system SHALL add the token's `jti` (or a hash of the token) to a server-side blocklist (in-memory or Redis) and the `authenticateToken` middleware SHALL reject any token present in the blocklist with a 401 response.

2.5 WHEN a profile image is uploaded via `POST /auth/profile-image` THEN the system SHALL call `verifyMagicBytes` (or equivalent) on the saved file and reject the upload with a 400 error if the file content does not match an allowed image MIME type.

2.6 WHEN a user changes their password THEN the system SHALL enforce a minimum complexity policy requiring at least 8 characters, one uppercase letter, one digit, and one special character, and SHALL return a descriptive 400 error if the policy is not met.

2.7 WHEN `POST /restaurants/import` or `POST /restaurants/:id/import-menu` receives a JSON body THEN the system SHALL validate the body through a Zod schema before any database write, returning a structured 400 error for any invalid or missing fields.

**Medium**

2.8 WHEN the server runs outside of production THEN the system SHALL restrict CORS to an explicit allowlist of local development origins rather than accepting all origins.

2.9 WHEN import, upload, create-restaurant, or create-menu endpoints receive requests THEN the system SHALL apply rate limiting (e.g., 20 requests per 15 minutes per IP) consistent with the existing auth rate limiter.

2.10 WHEN the theme update handler catches an unexpected error THEN the system SHALL return only `{ error: 'Internal server error' }` in production and SHALL include `error.message` only when `NODE_ENV === 'development'`.

2.11 WHEN a request is made to `/uploads/*` or `/menus/*` THEN the system SHALL either require a valid JWT for profile image paths or serve only non-sensitive public assets (generated menu HTML and allergen/item images) without auth, with profile images protected behind authentication.

**Low**

2.12 WHEN a JWT is issued at login THEN the system SHALL default to a shorter expiry (e.g., 24 hours) configurable via `JWT_EXPIRES_IN` environment variable, reducing the abuse window.

2.13 WHEN the server starts THEN the system SHALL configure `helmet()` with an explicit Content Security Policy that restricts `script-src`, `style-src`, and `img-src` to known safe origins.

2.14 WHEN the dashboard layout detects a stored token THEN the system SHALL verify the token is still valid by calling `GET /auth/me` on mount and SHALL redirect to `/login` if the server returns 401.

2.15 WHEN `setAuth` is called THEN the system SHALL store the token in exactly one place (the Zustand `auth-storage` key via the persist middleware) and the API client SHALL read the token from the Zustand store rather than a separate `auth_token` localStorage key.

2.16 WHEN a login, logout, registration, password change, or repeated authentication failure occurs THEN the system SHALL write a structured log entry including the event type, timestamp, user ID (if known), and IP address.

**Design Consistency**

2.17 WHEN any route handler returns an error THEN the system SHALL use a single shared error response shape `{ error: string, code?: string, details?: string }` produced by a central `sendError` helper, applied consistently across all routes.

2.18 WHEN a Zod validation error is caught THEN the system SHALL handle it through a single shared utility function that formats the issues array into the standard error shape and returns a 400 response, used identically in every route.

2.19 WHEN string fields are accepted from user input THEN the system SHALL apply `.trim()` transforms in the relevant Zod schemas so that trimming is enforced at the validation layer uniformly, without manual per-field trimming in route handlers.

2.20 WHEN optional database fields are absent THEN the system SHALL use a consistent convention: Zod schemas use `.optional().nullable()` for fields that may be null in the database, and all database writes use `?? null` (never `?? undefined`) for nullable columns.

2.21 WHEN a file upload request arrives at any upload endpoint THEN the system SHALL route it through a single parameterized handler that accepts field name, allowed MIME types, and Cloudinary folder as configuration, eliminating the four duplicate handler functions.

2.22 WHEN the login and registration forms are rendered THEN the system SHALL share a common `AuthForm` base component (or hook) that encapsulates form state, error display, loading state, and submit wiring, with each form providing only its specific fields and endpoint.

2.23 WHEN the API client sends an authenticated request THEN the system SHALL read the token exclusively from the Zustand auth store (eliminating the separate `auth_token` localStorage key), so there is a single source of truth for the session token.

2.24 WHEN restaurant or menu count limits are enforced THEN the system SHALL read the limit values from a single shared constants file (e.g., `server/src/config/limits.ts`) imported by all routes and middleware that reference these limits.

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a valid PNG, JPEG, or WebP file is uploaded to any upload endpoint THEN the system SHALL CONTINUE TO accept it, process it through Cloudinary (with local fallback), and return the file URL.

3.2 WHEN a user submits valid login credentials THEN the system SHALL CONTINUE TO return a JWT and admin object, and the dashboard SHALL CONTINUE TO become accessible.

3.3 WHEN an authenticated user creates, reads, updates, or deletes a restaurant or menu THEN the system SHALL CONTINUE TO enforce ownership checks and return the correct data.

3.4 WHEN a menu is published THEN the system SHALL CONTINUE TO generate static HTML and serve it at `/menus/{restaurantSlug}/{menuSlug}.html`.

3.5 WHEN menu item data contains no HTML or script content THEN the system SHALL CONTINUE TO render item names, descriptions, prices, allergen icons, and section titles correctly in the generated HTML.

3.6 WHEN a user imports a valid restaurant or menu JSON THEN the system SHALL CONTINUE TO create the restaurant, menus, sections, and items in the database and return the created records.

3.7 WHEN the Stripe billing webhook receives a valid event THEN the system SHALL CONTINUE TO process it correctly without interference from new rate limiting or auth changes.

3.8 WHEN a user changes their password with a valid current password and a new password that meets the complexity policy THEN the system SHALL CONTINUE TO update the password hash and return a success response.

3.9 WHEN theme settings are updated for a restaurant or menu THEN the system SHALL CONTINUE TO validate colors, CSS, and URLs through the existing Zod schemas and persist the settings correctly.

3.10 WHEN the dashboard layout loads with a valid, non-expired token THEN the system SHALL CONTINUE TO render the dashboard without redirecting to login.

3.11 WHEN CORS is configured in development THEN the system SHALL CONTINUE TO allow requests from all standard local development ports (3000–3005) so that local development is not broken.

3.12 WHEN the export endpoints are called THEN the system SHALL CONTINUE TO return restaurant or menu data as JSON or CSV without modification.
