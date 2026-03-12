# Requirements Document

## Introduction

The menubuildr.com application currently has no data isolation between authenticated users. All restaurants, menus, sections, categories, and items are globally accessible to any authenticated user. This feature adds multi-tenancy through user-scoped data isolation, linking each Restaurant to its owning Admin and enforcing ownership checks across all protected API routes. Public menu viewing (QR code scanning) remains unauthenticated. This is a prerequisite for Stripe subscription billing.

## Glossary

- **Admin**: An authenticated user of the dashboard application, identified by `req.userId` from JWT middleware
- **Restaurant**: A top-level entity representing a dining establishment, owned by exactly one Admin
- **Ownership_Chain**: The hierarchical relationship where an Admin owns Restaurants, and Restaurants own Menus, Sections, Categories, and MenuItems through foreign key cascades
- **Auth_Middleware**: The Express middleware (`authenticateToken`) that extracts `req.userId` from JWT tokens
- **Child_Resource**: Any entity (Menu, Section, Category, MenuItem) that belongs to a Restaurant through direct or transitive foreign key relationships
- **Public_Menu_Endpoint**: The route serving published menu HTML to end customers via QR code, requiring no authentication
- **Global_Resource**: Shared data (AllergenIcons, Languages, MenuTemplates) not scoped to any specific Admin
- **Restaurant_Limit**: The maximum number of Restaurants an Admin is permitted to create under their subscription plan

## Requirements

### Requirement 1: Restaurant Ownership Model

**User Story:** As a platform operator, I want each restaurant linked to the admin who created it, so that data isolation can be enforced at the database level.

#### Acceptance Criteria

1. THE Restaurant model SHALL include an `adminId` foreign key referencing the Admin model
2. THE `adminId` column SHALL be non-nullable for all Restaurant records
3. WHEN a new Restaurant is created, THE API SHALL set the `adminId` to the authenticated Admin's ID
4. THE database schema SHALL define a foreign key constraint from Restaurant.adminId to Admin.id
5. THE Admin model SHALL include a `restaurants` relation providing access to all Restaurants owned by that Admin

### Requirement 2: Restaurant Query Scoping

**User Story:** As an admin, I want to see only my own restaurants, so that I cannot view or access another admin's data.

#### Acceptance Criteria

1. WHEN an Admin requests the list of restaurants, THE Restaurant_API SHALL return only Restaurants where `adminId` matches the authenticated Admin's ID
2. WHEN an Admin requests a single restaurant by ID, THE Restaurant_API SHALL return the Restaurant only if `adminId` matches the authenticated Admin's ID
3. IF an Admin requests a Restaurant that exists but belongs to a different Admin, THEN THE Restaurant_API SHALL return a 404 response
4. THE Restaurant_API SHALL include the `adminId` filter in all restaurant read queries

### Requirement 3: Restaurant Write Operation Scoping

**User Story:** As an admin, I want only the owner of a restaurant to be able to modify or delete it, so that my data is protected from other users.

#### Acceptance Criteria

1. WHEN an Admin creates a Restaurant, THE Restaurant_API SHALL associate the Restaurant with the authenticated Admin's ID
2. WHEN an Admin updates a Restaurant, THE Restaurant_API SHALL verify the Restaurant's `adminId` matches the authenticated Admin's ID before applying changes
3. WHEN an Admin deletes a Restaurant, THE Restaurant_API SHALL verify the Restaurant's `adminId` matches the authenticated Admin's ID before deleting
4. IF an Admin attempts to update or delete a Restaurant owned by a different Admin, THEN THE Restaurant_API SHALL return a 404 response
5. WHEN an Admin updates theme settings for a Restaurant, THE Restaurant_API SHALL verify ownership before applying theme changes
6. WHEN an Admin updates module settings for a Restaurant, THE Restaurant_API SHALL verify ownership before applying module changes

### Requirement 4: Per-User Restaurant Limit

**User Story:** As a platform operator, I want restaurant creation limits enforced per admin, so that one admin's usage does not affect another admin's quota.

#### Acceptance Criteria

1. WHEN an Admin creates a Restaurant, THE Restaurant_API SHALL count only Restaurants where `adminId` matches the authenticated Admin's ID to determine the limit
2. IF the per-user Restaurant count equals or exceeds the Restaurant_Limit, THEN THE Restaurant_API SHALL reject the creation with a 400 response
3. THE Restaurant_API SHALL not count Restaurants belonging to other Admins when enforcing the limit

### Requirement 5: Menu Operation Ownership Verification

**User Story:** As an admin, I want menu operations restricted to menus within my own restaurants, so that I cannot access or modify another admin's menus.

#### Acceptance Criteria

1. WHEN an Admin requests menus for a restaurant, THE Menu_API SHALL verify the Restaurant's `adminId` matches the authenticated Admin's ID before returning menus
2. WHEN an Admin creates a menu under a restaurant, THE Menu_API SHALL verify the Restaurant's `adminId` matches the authenticated Admin's ID before creating the menu
3. WHEN an Admin updates a menu, THE Menu_API SHALL verify the menu's parent Restaurant is owned by the authenticated Admin before applying changes
4. WHEN an Admin deletes a menu, THE Menu_API SHALL verify the menu's parent Restaurant is owned by the authenticated Admin before deleting
5. WHEN an Admin duplicates a menu, THE Menu_API SHALL verify the menu's parent Restaurant is owned by the authenticated Admin before duplicating
6. WHEN an Admin publishes a menu, THE Menu_API SHALL verify the menu's parent Restaurant is owned by the authenticated Admin before publishing
7. WHEN an Admin requests menu version history, THE Menu_API SHALL verify the menu's parent Restaurant is owned by the authenticated Admin before returning versions
8. IF an Admin attempts any menu operation on a Restaurant owned by a different Admin, THEN THE Menu_API SHALL return a 404 response

### Requirement 6: Section Operation Ownership Verification

**User Story:** As an admin, I want section operations restricted to sections within my own restaurants' menus, so that my menu structure is protected.

#### Acceptance Criteria

1. WHEN an Admin creates a section under a menu, THE Section_API SHALL verify the menu's parent Restaurant is owned by the authenticated Admin before creating the section
2. WHEN an Admin updates a section, THE Section_API SHALL verify the section's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
3. WHEN an Admin deletes a section, THE Section_API SHALL verify the section's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
4. WHEN an Admin duplicates a section, THE Section_API SHALL verify the section's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
5. IF an Admin attempts any section operation on a resource not in the Admin's Ownership_Chain, THEN THE Section_API SHALL return a 404 response

### Requirement 7: Category and MenuItem Operation Ownership Verification

**User Story:** As an admin, I want item and category operations restricted to my own restaurants' data, so that menu content is fully isolated between admins.

#### Acceptance Criteria

1. WHEN an Admin creates a menu item under a section, THE Item_API SHALL verify the section's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
2. WHEN an Admin updates a menu item, THE Item_API SHALL verify the item's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
3. WHEN an Admin deletes a menu item, THE Item_API SHALL verify the item's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
4. WHEN an Admin performs a bulk update on menu items, THE Item_API SHALL verify every item's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
5. WHEN an Admin performs a bulk delete on menu items, THE Item_API SHALL verify every item's Ownership_Chain traces back to a Restaurant owned by the authenticated Admin
6. IF an Admin attempts any item or category operation on a resource not in the Admin's Ownership_Chain, THEN THE Item_API SHALL return a 404 response

### Requirement 8: Ancillary Route Ownership Verification

**User Story:** As an admin, I want upload, search, import-export, and translation operations scoped to my own restaurants, so that no cross-tenant data leakage occurs through secondary routes.

#### Acceptance Criteria

1. WHEN an Admin uploads a file associated with a restaurant or menu, THE Upload_API SHALL verify the target resource's Ownership_Chain traces back to the authenticated Admin
2. WHEN an Admin searches menu content, THE Search_API SHALL return results only from Restaurants owned by the authenticated Admin
3. WHEN an Admin imports or exports menu data, THE Import_Export_API SHALL verify the target Restaurant is owned by the authenticated Admin
4. WHEN an Admin manages translations for menu items, THE Translation_API SHALL verify the item's Ownership_Chain traces back to the authenticated Admin
5. IF any ancillary route receives a request targeting a resource not owned by the authenticated Admin, THEN THE API SHALL return a 404 response

### Requirement 9: Global Resources Remain Unscoped

**User Story:** As an admin, I want shared resources like allergens, languages, and menu templates accessible to all authenticated users, so that common data is not unnecessarily duplicated.

#### Acceptance Criteria

1. THE Allergen_API SHALL allow any authenticated Admin to read allergen icons without ownership filtering
2. THE Language_API SHALL allow any authenticated Admin to read language configurations without ownership filtering
3. THE Template_API SHALL allow any authenticated Admin to read menu templates without ownership filtering
4. THE Allergen_API, Language_API, and Template_API SHALL require authentication for all operations

### Requirement 10: Public Menu Endpoint Accessibility

**User Story:** As a restaurant customer, I want to view a published menu by scanning a QR code without logging in, so that I can browse the menu on my phone.

#### Acceptance Criteria

1. THE Public_Menu_Endpoint SHALL serve published menu HTML without requiring authentication
2. THE Public_Menu_Endpoint SHALL resolve menus by restaurant slug and menu slug regardless of the owning Admin
3. THE Public_Menu_Endpoint SHALL not expose the `adminId` or any Admin-specific data in the public response
4. IF the requested menu is not published or does not exist, THEN THE Public_Menu_Endpoint SHALL return a 404 response

### Requirement 11: Auth Middleware Enforcement

**User Story:** As a platform operator, I want authentication properly enforced on all protected routes, so that unauthenticated requests cannot bypass tenant isolation.

#### Acceptance Criteria

1. THE Auth_Middleware SHALL reject requests without a valid JWT token on all protected routes by returning a 401 response
2. THE Auth_Middleware SHALL extract and set `req.userId` from a valid JWT token
3. IF a JWT token is expired or malformed, THEN THE Auth_Middleware SHALL return a 401 response
4. THE Auth_Middleware SHALL not use a fallback user ID for unauthenticated requests on protected routes

### Requirement 12: Data Migration for Existing Restaurants

**User Story:** As a platform operator, I want all existing restaurants assigned to the current admin user, so that the migration to multi-tenancy does not break existing data.

#### Acceptance Criteria

1. THE Migration SHALL add the `adminId` column to the Restaurant table
2. THE Migration SHALL assign all existing Restaurant records to the existing Admin user's ID
3. THE Migration SHALL set the `adminId` column as non-nullable after populating existing records
4. THE Migration SHALL be reversible, allowing rollback of the `adminId` column addition
5. IF no Admin record exists during migration, THEN THE Migration SHALL fail with a descriptive error rather than leaving orphaned data
