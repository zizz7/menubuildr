# Requirements Document

## Introduction

A platform-level super-admin dashboard for MenuBuildr, separate from the existing per-user restaurant owner dashboard. This feature introduces a role/permission system to distinguish platform administrators from regular users (restaurant owners). Super-admins can manage all users, view platform-wide analytics, oversee subscriptions, moderate content, review audit logs, and impersonate users for support purposes. The admin panel is accessible at a dedicated route within the existing dashboard application and is protected by role-based authorization.

## Glossary

- **Super_Admin**: A platform-level administrator account with elevated privileges, distinguished from regular Admin accounts by a `role` field set to `"super_admin"`
- **Admin**: An existing user account in the system (Prisma `Admin` model) representing a restaurant owner; after this feature, Admin accounts have a `role` field defaulting to `"user"`
- **Admin_Dashboard**: The platform-level admin panel UI, accessible at `/admin` routes within the existing Next.js dashboard application
- **User_Management_API**: The Express server endpoints under `/admin/users` that provide CRUD and search operations on Admin accounts
- **Analytics_API**: The Express server endpoints under `/admin/analytics` that return platform-wide aggregate metrics
- **Audit_Log_API**: The Express server endpoints under `/admin/audit-logs` that return system activity records
- **Impersonation_Service**: The server-side service that generates a scoped JWT token allowing a Super_Admin to act as a specific Admin for support purposes
- **Role_Guard**: The server-side middleware that verifies the authenticated user has the `super_admin` role before allowing access to admin endpoints
- **Client_Role_Guard**: The client-side route protection that redirects non-super-admin users away from `/admin` routes
- **Audit_Log**: A database record capturing significant system events including user actions, admin actions, and security events with timestamps, actor IDs, and metadata
- **Impersonation_Token**: A JWT token issued to a Super_Admin that includes the target Admin's ID and an `impersonatedBy` claim, enabling scoped access to that Admin's resources

## Requirements

### Requirement 1: Role and Permission System

**User Story:** As a platform operator, I want to distinguish super-admins from regular users, so that only authorized personnel can access platform management features.

#### Acceptance Criteria

1. THE Admin model SHALL include a `role` field with allowed values `"user"` and `"super_admin"`, defaulting to `"user"`
2. WHEN an Admin with role `"user"` attempts to access any `/admin/*` API endpoint, THE Role_Guard SHALL return a 403 status code with an error message indicating insufficient permissions
3. WHEN an Admin with role `"super_admin"` accesses any `/admin/*` API endpoint, THE Role_Guard SHALL allow the request to proceed
4. WHEN a JWT token is issued during login, THE Authentication system SHALL include the Admin's `role` in the token payload
5. WHEN an Admin with role `"user"` navigates to any `/admin` route in the Dashboard, THE Client_Role_Guard SHALL redirect the Admin to the regular dashboard home page

### Requirement 2: Super-Admin Authentication

**User Story:** As a super-admin, I want to log in using the existing login flow, so that I do not need a separate authentication system.

#### Acceptance Criteria

1. WHEN a Super_Admin logs in successfully, THE Authentication system SHALL return the Admin profile including the `role` field
2. WHEN a Super_Admin logs in successfully, THE Dashboard SHALL store the `role` field in the Auth_Store alongside the existing admin profile data
3. WHEN a Super_Admin is authenticated, THE Dashboard SHALL display a navigation link to the Admin_Dashboard in the sidebar

### Requirement 3: User Management — List and Search

**User Story:** As a super-admin, I want to view and search all registered users, so that I can find and manage specific accounts.

#### Acceptance Criteria

1. WHEN a Super_Admin requests the user list, THE User_Management_API SHALL return a paginated list of Admin accounts including id, email, name, role, subscriptionStatus, subscriptionPlan, createdAt, and account enabled status
2. WHEN a Super_Admin provides a search query parameter, THE User_Management_API SHALL filter Admin accounts by email or name using case-insensitive partial matching
3. WHEN a Super_Admin provides a `status` filter parameter with value `"active"` or `"disabled"`, THE User_Management_API SHALL return only Admin accounts matching that enabled status
4. WHEN a Super_Admin provides a `subscriptionStatus` filter parameter, THE User_Management_API SHALL return only Admin accounts matching that subscription status
5. WHEN a Super_Admin provides `sortBy` and `sortOrder` parameters, THE User_Management_API SHALL sort results by the specified field in the specified order
6. THE Admin_Dashboard SHALL display the user list in a table with columns for name, email, subscription status, account status, and creation date
7. THE Admin_Dashboard SHALL provide a search input and filter controls above the user table

### Requirement 4: User Management — View Details

**User Story:** As a super-admin, I want to view detailed information about a specific user, so that I can understand their account state and usage.

#### Acceptance Criteria

1. WHEN a Super_Admin requests details for a specific Admin, THE User_Management_API SHALL return the full Admin profile including id, email, name, role, subscriptionStatus, subscriptionPlan, createdAt, profileImageUrl, and account enabled status
2. WHEN a Super_Admin requests details for a specific Admin, THE User_Management_API SHALL include the count of restaurants and menus owned by that Admin
3. WHEN a Super_Admin requests details for a specific Admin, THE User_Management_API SHALL include a list of the Admin's restaurants with their names, slugs, and active statuses
4. THE Admin_Dashboard SHALL display the user detail view with all profile information, restaurant list, and account metadata

### Requirement 5: User Management — Enable and Disable Accounts

**User Story:** As a super-admin, I want to enable or disable user accounts, so that I can manage access to the platform.

#### Acceptance Criteria

1. THE Admin model SHALL include an `isEnabled` field of type boolean, defaulting to `true`
2. WHEN a Super_Admin sends a request to disable an Admin account, THE User_Management_API SHALL set the target Admin's `isEnabled` field to `false` and return the updated Admin record
3. WHEN a Super_Admin sends a request to enable an Admin account, THE User_Management_API SHALL set the target Admin's `isEnabled` field to `true` and return the updated Admin record
4. WHEN a disabled Admin attempts to log in, THE Authentication system SHALL return a 403 status code with an error message indicating the account is disabled
5. WHEN a disabled Admin makes any authenticated API request, THE Authentication middleware SHALL return a 403 status code with an error message indicating the account is disabled
6. WHEN a Super_Admin attempts to disable their own account, THE User_Management_API SHALL return a 400 status code with an error message preventing self-disabling
7. THE Admin_Dashboard SHALL display an enable/disable toggle for each user in the user list and detail views
8. THE Audit_Log SHALL record account enable and disable actions with the Super_Admin's ID and the target Admin's ID

### Requirement 6: Platform Analytics Overview

**User Story:** As a super-admin, I want to see platform-wide metrics at a glance, so that I can monitor the health and growth of the platform.

#### Acceptance Criteria

1. WHEN a Super_Admin requests platform analytics, THE Analytics_API SHALL return the total count of registered Admin accounts
2. WHEN a Super_Admin requests platform analytics, THE Analytics_API SHALL return the total count of restaurants across all Admin accounts
3. WHEN a Super_Admin requests platform analytics, THE Analytics_API SHALL return the total count of menus across all restaurants
4. WHEN a Super_Admin requests platform analytics, THE Analytics_API SHALL return a breakdown of Admin accounts by subscriptionStatus (none, active, canceled, past_due)
5. WHEN a Super_Admin requests platform analytics, THE Analytics_API SHALL return the count of new Admin registrations for the current month and the previous month
6. WHEN a Super_Admin requests platform analytics, THE Analytics_API SHALL return the count of new Admin registrations grouped by day for the last 30 days
7. THE Admin_Dashboard SHALL display the analytics overview on the admin home page using summary cards and a registration trend chart

### Requirement 7: Subscription and Billing Oversight

**User Story:** As a super-admin, I want to view subscription statuses across all users, so that I can monitor revenue and identify billing issues.

#### Acceptance Criteria

1. WHEN a Super_Admin requests subscription overview data, THE Analytics_API SHALL return the count of Admin accounts grouped by subscriptionPlan
2. WHEN a Super_Admin requests subscription overview data, THE Analytics_API SHALL return the count of Admin accounts grouped by subscriptionStatus
3. THE Admin_Dashboard SHALL display subscription distribution charts on the analytics page
4. THE Admin_Dashboard SHALL highlight Admin accounts with `past_due` subscription status in the user list with a visual indicator

### Requirement 8: Content Moderation

**User Story:** As a super-admin, I want to view and manage restaurants across the platform, so that I can moderate content and enforce platform policies.

#### Acceptance Criteria

1. WHEN a Super_Admin requests the restaurant list, THE User_Management_API SHALL return a paginated list of all restaurants across all Admin accounts, including restaurant name, slug, owner email, active status, menu count, and creation date
2. WHEN a Super_Admin provides a search query for restaurants, THE User_Management_API SHALL filter restaurants by name or slug using case-insensitive partial matching
3. WHEN a Super_Admin sends a request to deactivate a restaurant, THE User_Management_API SHALL set the restaurant's `activeStatus` to `false` and return the updated restaurant record
4. WHEN a Super_Admin sends a request to activate a restaurant, THE User_Management_API SHALL set the restaurant's `activeStatus` to `true` and return the updated restaurant record
5. THE Admin_Dashboard SHALL display the restaurant list in a table with columns for name, owner, status, menu count, and creation date
6. THE Audit_Log SHALL record restaurant activation and deactivation actions with the Super_Admin's ID and the restaurant ID

### Requirement 9: Audit Log Viewing

**User Story:** As a super-admin, I want to view system audit logs, so that I can track important actions and investigate issues.

#### Acceptance Criteria

1. THE system SHALL persist Audit_Log entries to the database with fields: id, action, actorId (nullable), actorEmail, targetType, targetId, ipAddress, metadata (JSON), and createdAt
2. WHEN a Super_Admin requests audit logs, THE Audit_Log_API SHALL return a paginated list of Audit_Log entries sorted by createdAt descending
3. WHEN a Super_Admin provides an `action` filter parameter, THE Audit_Log_API SHALL return only Audit_Log entries matching that action type
4. WHEN a Super_Admin provides an `actorId` filter parameter, THE Audit_Log_API SHALL return only Audit_Log entries performed by that actor
5. WHEN a Super_Admin provides `startDate` and `endDate` filter parameters, THE Audit_Log_API SHALL return only Audit_Log entries within that date range
6. THE Admin_Dashboard SHALL display audit logs in a table with columns for timestamp, action, actor, target, and IP address
7. THE Admin_Dashboard SHALL provide filter controls for action type, actor, and date range above the audit log table

### Requirement 10: User Impersonation for Support

**User Story:** As a super-admin, I want to impersonate a user's session, so that I can see what they see and troubleshoot issues on their behalf.

#### Acceptance Criteria

1. WHEN a Super_Admin requests to impersonate a specific Admin, THE Impersonation_Service SHALL generate an Impersonation_Token containing the target Admin's ID and an `impersonatedBy` claim set to the Super_Admin's ID
2. WHEN a Super_Admin requests to impersonate a specific Admin, THE Impersonation_Service SHALL set the Impersonation_Token expiration to 1 hour
3. WHILE a Super_Admin is using an Impersonation_Token, THE Authentication middleware SHALL resolve the authenticated user as the target Admin for all resource-access purposes
4. WHILE a Super_Admin is using an Impersonation_Token, THE Dashboard SHALL display a persistent banner indicating the impersonation session with the target Admin's name and email
5. WHEN a Super_Admin clicks "End Impersonation" in the banner, THE Dashboard SHALL discard the Impersonation_Token and restore the Super_Admin's original session
6. WHILE a Super_Admin is using an Impersonation_Token, THE Impersonation_Service SHALL prevent access to `/admin/*` endpoints to avoid privilege escalation
7. THE Audit_Log SHALL record the start and end of each impersonation session with the Super_Admin's ID and the target Admin's ID
8. WHEN a Super_Admin attempts to impersonate another Super_Admin, THE Impersonation_Service SHALL return a 403 status code with an error message preventing the action

### Requirement 11: Admin Dashboard Navigation and Layout

**User Story:** As a super-admin, I want a dedicated admin panel with clear navigation, so that I can efficiently access all platform management features.

#### Acceptance Criteria

1. THE Admin_Dashboard SHALL be accessible at the `/admin` route within the existing Dashboard application
2. THE Admin_Dashboard SHALL include a sidebar navigation with links to: Overview (analytics), Users, Restaurants, Audit Logs
3. THE Admin_Dashboard SHALL display the Super_Admin's name and a "Back to Dashboard" link to return to the regular user dashboard
4. WHEN a non-authenticated user navigates to any `/admin` route, THE Dashboard SHALL redirect the user to the login page

### Requirement 12: Super-Admin Account Seeding

**User Story:** As a platform operator, I want to create the initial super-admin account via a secure method, so that the first admin can access the platform management features.

#### Acceptance Criteria

1. THE system SHALL provide a CLI script or seed command that creates a Super_Admin account with a specified email and password
2. WHEN the seed script is run with an email that already exists, THE script SHALL update the existing Admin's role to `"super_admin"` instead of creating a duplicate
3. THE seed script SHALL hash the password using bcrypt before storing it in the database
