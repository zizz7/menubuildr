# Bugfix Requirements Document

## Introduction

The Settings page UI for profile management (name update, password change, profile image upload) exists and the server API endpoints are implemented, but several data flow bugs prevent the features from working end-to-end. The login response omits `profileImageUrl`, the dashboard never fetches the full admin profile on load, the sidebar always shows a generic icon instead of the uploaded profile image, and the profile image upload path assumes co-located services which breaks in production (Railway deployment where dashboard and server are separate services).

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN an admin logs in THEN the system returns only `{ id, email, name }` in the login response, omitting the `profileImageUrl` field from the admin object

1.2 WHEN the dashboard loads after login THEN the system never calls `GET /auth/me` to fetch the full admin profile, so the auth store only contains the incomplete data from the login response

1.3 WHEN an admin has a `profileImageUrl` set in the database THEN the sidebar in the dashboard layout always displays a generic `<User>` icon instead of the admin's profile image

1.4 WHEN an admin uploads a profile image in production THEN the system attempts to copy the file to `../dashboard/public/uploads/profile` which does not exist because the dashboard and server run as separate services on Railway, making the uploaded image inaccessible from the frontend

1.5 WHEN the settings page constructs the profile image URL THEN the system relies on `NEXT_PUBLIC_API_URL` with a string replace to strip `/api`, which is fragile and may produce incorrect URLs depending on the environment configuration

### Expected Behavior (Correct)

2.1 WHEN an admin logs in THEN the system SHALL return `{ id, email, name, profileImageUrl }` in the login response, including the `profileImageUrl` field from the database

2.2 WHEN the dashboard loads after login THEN the system SHALL call `GET /auth/me` to fetch the full admin profile and update the auth store with all fields including `profileImageUrl`

2.3 WHEN an admin has a `profileImageUrl` set in the auth store THEN the sidebar SHALL display the admin's profile image instead of the generic `<User>` icon

2.4 WHEN an admin uploads a profile image THEN the system SHALL store the file in the server's `uploads/profile` directory and serve it via the server's `/uploads` static route, without attempting to copy files to the dashboard's public directory, so the image is accessible via the API server URL in all environments

2.5 WHEN the frontend constructs a profile image URL THEN the system SHALL use the API server's base URL (derived from `NEXT_PUBLIC_API_URL` without the `/api` path) to build a fully qualified URL to the image served by the server's static file route

### Unchanged Behavior (Regression Prevention)

3.1 WHEN an admin updates their name via the settings page THEN the system SHALL CONTINUE TO save the name to the database via `PUT /auth/profile` and update the auth store

3.2 WHEN an admin changes their password via the settings page THEN the system SHALL CONTINUE TO validate the current password, enforce minimum length, hash the new password, and save it to the database via `PUT /auth/password`

3.3 WHEN an admin uploads a profile image via the settings page THEN the system SHALL CONTINUE TO validate file type (JPG, PNG, WebP, SVG) and size (max 5MB), save the file to disk, update the `profileImageUrl` in the database, and return the updated admin object

3.4 WHEN the `GET /auth/me` endpoint is called THEN the system SHALL CONTINUE TO return the full admin profile including subscription status and Stripe-related boolean flags

3.5 WHEN a non-authenticated user attempts to access profile or password endpoints THEN the system SHALL CONTINUE TO return a 401 error
