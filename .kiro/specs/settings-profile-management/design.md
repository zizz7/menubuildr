# Settings Profile Management Bugfix Design

## Overview

Five data-flow bugs prevent the Settings profile management features from working end-to-end. The login response omits `profileImageUrl`, the dashboard never hydrates the auth store via `/me`, the sidebar ignores the profile image, the upload route copies files cross-service (breaks on Railway), and the settings page constructs image URLs with fragile string replace. The fix targets each broken link while preserving all existing functionality.

## Glossary

- **Bug_Condition (C)**: Conditions where profile image data is lost or incorrectly resolved across the login-store-sidebar-upload-display pipeline
- **Property (P)**: Profile image URL flows correctly from database through responses, into the auth store, and renders using the server static file URL
- **Preservation**: Name update, password change, upload validation, /me response shape, and auth protection remain unchanged
- **auth-store**: Zustand store in `dashboard/lib/store/auth-store.ts` holding the `Admin` object (already has `profileImageUrl` in interface)
- **getServerUrl()**: Utility in `dashboard/lib/utils.ts` that strips `/api` from `NEXT_PUBLIC_API_URL` to produce the server origin
- **resolveAssetUrl()**: Utility in `dashboard/lib/utils.ts` that prefixes relative paths with server origin; exists but unused for profile images

## Bug Details

### Bug Condition

The bug manifests across five points in the profile data pipeline. Any request that involves displaying or resolving a profile image URL hits at least one broken link: the login response drops the field, the store is never hydrated, the sidebar never reads the field, the upload copies to a nonexistent path, and the settings page builds URLs with inline string manipulation.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { action: string, admin: Admin, context: string }
  OUTPUT: boolean

  IF input.action == 'login_response'
    RETURN admin.profileImageUrl IS NOT NULL
           AND response.admin DOES NOT CONTAIN 'profileImageUrl'

  IF input.action == 'dashboard_load'
    RETURN GET /auth/me IS NEVER CALLED on mount

  IF input.action == 'sidebar_render'
    RETURN admin.profileImageUrl IS NOT NULL
           AND rendered element IS User icon (not img)

  IF input.action == 'upload'
    RETURN fs.copyFileSync targets '../dashboard/public/uploads/profile'

  IF input.action == 'settings_image_url'
    RETURN imageUrl IS constructed via inline replace
           INSTEAD OF getServerUrl() or resolveAssetUrl()

  RETURN false
END FUNCTION
```


### Examples

- **Login omits profileImageUrl**: Admin with `profileImageUrl: "/uploads/profile/abc.png"` logs in, response is `{ id, email, name }`, store has `profileImageUrl: undefined`, sidebar shows generic icon
- **Dashboard never fetches /me**: After login, navigating to `/dashboard` never triggers `GET /auth/me`, store retains incomplete login data for the entire session
- **Sidebar ignores image**: Even if `admin.profileImageUrl` were populated, the sidebar JSX hardcodes User icon with no conditional img rendering
- **Upload cross-service copy fails**: `fs.copyFileSync` to `../dashboard/public/uploads/profile` throws ENOENT on Railway (separate containers), upload appears to succeed but image is unreachable from frontend
- **Settings fragile URL**: `process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')` works for `https://api.menubuildr.com/api` but would break for URLs containing `/api` elsewhere

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `PUT /auth/profile` with `{ name }` saves to database and returns updated admin object (requirement 3.1)
- `PUT /auth/password` validates current password, enforces min 8 chars, hashes and saves new password (requirement 3.2)
- `POST /auth/profile-image` validates file type (JPG, PNG, WebP, SVG) and size (max 5MB), saves to disk, updates database (requirement 3.3)
- `GET /auth/me` returns full admin profile including `subscriptionStatus`, `hasStripeCustomer`, `hasSubscription` booleans (requirement 3.4)
- All protected endpoints return 401 for unauthenticated requests (requirement 3.5)

**Scope:**
All inputs that do NOT involve the five bug conditions should be completely unaffected by this fix. This includes:
- Name and password update flows (no changes to those handlers)
- Upload file validation logic (type/size checks unchanged)
- /me endpoint response shape (already correct, just needs to be called)
- Auth middleware behavior (no changes)
- All other dashboard pages and API routes


## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Login Response Missing Field**: In `server/src/routes/auth.ts`, the `/login` handler explicitly constructs the response as `{ id: admin.id, email: admin.email, name: admin.name }`, omitting `profileImageUrl` even though it is available on the Prisma admin object.

2. **No /me Call on Dashboard Load**: `dashboard/components/layout/dashboard-layout.tsx` reads `admin` from the auth store but never calls `GET /auth/me` to refresh the store with full profile data after login. The store only contains whatever the login response provided.

3. **Sidebar Hardcoded Icon**: The sidebar JSX in `dashboard-layout.tsx` always renders `<User className="h-5 w-5" />` inside the profile avatar area. There is no conditional check for `admin?.profileImageUrl` to render an `<img>` tag instead.

4. **Cross-Service File Copy**: The `/auth/profile-image` handler calls `fs.copyFileSync` to `../dashboard/public/uploads/profile`. On Railway, dashboard and server are separate containers, so this path does not exist. The server already serves `/uploads` as static files via `express.static` in `server.ts`, making the copy unnecessary.

5. **Fragile URL Construction**: The settings page constructs the image URL inline with `process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')`. The codebase already has `getServerUrl()` and `resolveAssetUrl()` utilities in `dashboard/lib/utils.ts` that handle this correctly, but they are not used for profile images.


## Correctness Properties

Property 1: Bug Condition - Login Response Includes profileImageUrl

_For any_ admin who logs in successfully, the login response SHALL include the `profileImageUrl` field from the database (which may be `null` if no image has been uploaded), ensuring the auth store receives complete profile data on login.

**Validates: Requirements 2.1**

Property 2: Bug Condition - Dashboard Hydrates Auth Store via /me

_For any_ authenticated dashboard page load, the system SHALL call `GET /auth/me` and update the auth store with the full admin profile including `profileImageUrl`, ensuring the store is always hydrated with current data.

**Validates: Requirements 2.2**

Property 3: Bug Condition - Sidebar Renders Profile Image

_For any_ admin where `profileImageUrl` is a non-null, non-empty string in the auth store, the sidebar SHALL render an `<img>` element with the resolved image URL instead of the generic User icon. When `profileImageUrl` is null or empty, the User icon SHALL be displayed.

**Validates: Requirements 2.3**

Property 4: Bug Condition - Upload Stores Only on Server

_For any_ profile image upload, the server SHALL store the file in `uploads/profile/` relative to `process.cwd()` and SHALL NOT attempt to copy the file to any path outside the server directory (no `../dashboard/public` copy).

**Validates: Requirements 2.4**

Property 5: Bug Condition - Frontend Uses resolveAssetUrl for Image URLs

_For any_ `profileImageUrl` value displayed in the frontend, the system SHALL use `getServerUrl()` or `resolveAssetUrl()` from `dashboard/lib/utils.ts` to construct the full URL, rather than inline string manipulation of `NEXT_PUBLIC_API_URL`.

**Validates: Requirements 2.5**

Property 6: Preservation - Existing Profile and Auth Endpoints

_For any_ input that does NOT involve the five bug conditions (name updates, password changes, upload validation, /me response shape, auth protection), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**


## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `server/src/routes/auth.ts`

**Function**: POST `/login` handler

**Specific Changes**:
1. **Add profileImageUrl to login response**: Change the response object from `{ id: admin.id, email: admin.email, name: admin.name }` to include `profileImageUrl: admin.profileImageUrl`. No other changes to the login handler.

2. **Remove cross-service file copy from upload handler**: In the POST `/auth/profile-image` handler, remove the block that creates `publicDir` pointing to `../dashboard/public/uploads/profile` and the `fs.copyFileSync` call. The server already serves `/uploads` as static files via `express.static` in `server.ts`.

---

**File**: `dashboard/components/layout/dashboard-layout.tsx`

**Function**: `DashboardLayout` component

**Specific Changes**:
3. **Add /me fetch on mount**: Add a `useEffect` that calls `GET /auth/me` via `apiClient` when the component mounts (if token exists) and updates the auth store with the full profile data using `updateAdmin()`. Import `apiClient` and `resolveAssetUrl`.

4. **Conditionally render profile image in sidebar**: Replace the hardcoded User icon in the sidebar profile header with a conditional: if `admin?.profileImageUrl` is truthy, render an `<img>` with `resolveAssetUrl(admin.profileImageUrl)` as src; otherwise render the User icon fallback.

---

**File**: `dashboard/app/dashboard/settings/page.tsx`

**Function**: `SettingsPage` component

**Specific Changes**:
5. **Use resolveAssetUrl for image URL**: Replace the inline `imageUrl` computation that uses `process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')` with `resolveAssetUrl(admin?.profileImageUrl)`. Import `resolveAssetUrl` from `@/lib/utils`. Remove the existing `imageUrl` const and replace with the utility call.


## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests against the unfixed code to observe the five failure modes directly.

**Test Cases**:
1. **Login Response Test**: Call POST /login with valid credentials for an admin who has a profileImageUrl in the database. Assert response.admin contains profileImageUrl (will fail on unfixed code: field is missing)
2. **Dashboard Mount Test**: Render DashboardLayout and check if GET /auth/me is called. Assert apiClient.get was invoked with '/auth/me' (will fail on unfixed code: no call made)
3. **Sidebar Image Test**: Set admin.profileImageUrl in auth store, render sidebar. Assert an img element exists in the profile header (will fail on unfixed code: always renders User icon)
4. **Upload No-Copy Test**: Upload a profile image and verify no fs.copyFileSync to ../dashboard path occurs (will fail on unfixed code: copy is attempted)
5. **Settings URL Test**: Set admin.profileImageUrl to "/uploads/profile/test.png", render settings page. Assert image src uses server base URL prefix (will fail on unfixed code: uses inline replace)

**Expected Counterexamples**:
- Login response missing profileImageUrl field entirely
- No HTTP call to /auth/me during dashboard mount
- Sidebar DOM contains only User SVG icon, no img element
- Upload handler calls fs.copyFileSync to cross-service path
- Settings image src constructed with fragile string replace


### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed functions produce the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  IF input.action == 'login_response'
    result := POST /login(credentials)
    ASSERT 'profileImageUrl' IN result.admin

  IF input.action == 'dashboard_load'
    mount DashboardLayout
    ASSERT GET /auth/me WAS CALLED
    ASSERT authStore.admin.profileImageUrl == meResponse.profileImageUrl

  IF input.action == 'sidebar_render'
    result := render sidebar WITH admin.profileImageUrl set
    ASSERT result CONTAINS img element
    ASSERT img.src == resolveAssetUrl(admin.profileImageUrl)

  IF input.action == 'upload'
    result := POST /auth/profile-image(file)
    ASSERT file EXISTS IN server/uploads/profile/
    ASSERT NO file copy to ../dashboard/public/

  IF input.action == 'settings_image_url'
    result := render SettingsPage WITH admin.profileImageUrl set
    ASSERT img.src == resolveAssetUrl(admin.profileImageUrl)
END FOR
```


### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) == fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for name updates, password changes, and other interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Name Update Preservation**: Verify PUT /auth/profile with name field continues to save and return updated admin on both unfixed and fixed code
2. **Password Change Preservation**: Verify PUT /auth/password with valid credentials continues to work identically
3. **Upload Validation Preservation**: Verify file type and size validation rules are unchanged (reject invalid types, reject files over 5MB)
4. **Me Endpoint Preservation**: Verify GET /auth/me response shape is unchanged (includes subscription fields, boolean flags)
5. **Auth Protection Preservation**: Verify 401 responses for unauthenticated requests to all protected endpoints


### Unit Tests

- Test login endpoint returns profileImageUrl in response for admins with and without profile images
- Test profile-image upload handler does not reference ../dashboard path
- Test resolveAssetUrl correctly resolves relative paths, absolute URLs, and null/empty values
- Test sidebar component renders img when profileImageUrl is set, User icon when not

### Property-Based Tests

- Generate random admin profiles (with/without profileImageUrl) and verify login response always includes the field
- Generate random profileImageUrl strings (relative paths, absolute URLs, null) and verify resolveAssetUrl produces valid URLs starting with server origin for relative paths and passes through absolute URLs
- Generate random non-bug inputs (name updates, password changes) and verify behavior is identical before and after fix

### Integration Tests

- Test full login to dashboard load to sidebar display flow with an admin who has a profile image
- Test upload to store update to sidebar refresh flow showing the new image
- Test settings page displays correct image URL after upload
