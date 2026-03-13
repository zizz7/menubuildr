# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Profile Data Flow Bugs
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bugs exist
  - **Scoped PBT Approach**: Scope properties to concrete failing cases for each defect:
    - Bug 1.1: Login response omits profileImageUrl — for any admin with a profileImageUrl in DB, login response must include it
    - Bug 1.4: Profile image upload copies to ../dashboard/public — the upload handler must NOT perform cross-service file copy
  - Test that the login route handler builds a response object including profileImageUrl
  - Test that the profile-image upload route does NOT copy files to ../dashboard/public
  - Run test on UNFIXED code - expect FAILURE (this confirms the bugs exist)
  - Document counterexamples found
  - _Requirements: 1.1, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing Auth & Profile Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: Login with valid credentials returns token and admin object with id, email, name
  - Observe: PUT /auth/profile with name updates the admin name and returns updated admin
  - Observe: PUT /auth/password validates current password, enforces min length, hashes new password
  - Observe: GET /auth/me returns full admin profile with subscription status and Stripe boolean flags
  - Write property-based tests: for all valid login credentials, response contains token and admin with id/email/name; for all profile updates, name is trimmed and saved; for all password changes, validation rules are enforced
  - Verify tests pass on UNFIXED code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix profile data flow bugs

  - [x] 3.1 Add profileImageUrl to login response in server/src/routes/auth.ts
    - Include `profileImageUrl: admin.profileImageUrl` in the login response admin object
    - _Bug_Condition: isBugCondition(input) where login response admin object lacks profileImageUrl_
    - _Expected_Behavior: Login response includes { id, email, name, profileImageUrl }_
    - _Preservation: Login still returns token, id, email, name as before_
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Add /me fetch on dashboard load in dashboard-layout.tsx
    - Import apiClient and useEffect dependencies
    - Add useEffect that calls GET /auth/me on mount when authenticated
    - Update auth store with full profile data including profileImageUrl
    - _Bug_Condition: isBugCondition(input) where dashboard loads without fetching /auth/me_
    - _Expected_Behavior: Dashboard fetches /auth/me on load and updates auth store_
    - _Preservation: Existing sidebar navigation, drawer behavior, logout unchanged_
    - _Requirements: 1.2, 2.2_

  - [x] 3.3 Show profile image in sidebar when available in dashboard-layout.tsx
    - Replace hardcoded `<User>` icon with conditional rendering
    - When admin.profileImageUrl exists, show `<img>` with the resolved URL
    - When no profileImageUrl, fall back to `<User>` icon
    - Use resolveAssetUrl from utils to build the image URL
    - _Bug_Condition: isBugCondition(input) where admin has profileImageUrl but sidebar shows User icon_
    - _Expected_Behavior: Sidebar shows profile image when profileImageUrl is set_
    - _Preservation: Sidebar shows User icon when no profileImageUrl_
    - _Requirements: 1.3, 2.3_

  - [x] 3.4 Remove cross-service file copy in server/src/routes/auth.ts profile-image route
    - Remove the code block that copies uploaded file to ../dashboard/public/uploads/profile
    - Server serves images via its own /uploads static route
    - _Bug_Condition: isBugCondition(input) where upload handler copies to ../dashboard/public_
    - _Expected_Behavior: Upload saves to server uploads dir only, no cross-service copy_
    - _Preservation: File upload, validation, DB update, and response unchanged_
    - _Requirements: 1.4, 2.4, 3.3_

  - [x] 3.5 Fix image URL construction in settings/page.tsx
    - Replace fragile `NEXT_PUBLIC_API_URL?.replace('/api', '')` with `getServerUrl()` or `resolveAssetUrl()` from utils
    - Import the utility function
    - _Bug_Condition: isBugCondition(input) where settings page uses string replace for URL_
    - _Expected_Behavior: Settings page uses getServerUrl()/resolveAssetUrl() for image URLs_
    - _Preservation: Image display behavior unchanged for both absolute and relative URLs_
    - _Requirements: 1.5, 2.5_

  - [x] 3.6 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Profile Data Flow Fixed
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bugs are fixed)
    - _Requirements: 2.1, 2.4_

  - [x] 3.7 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing Auth & Profile Behavior
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
