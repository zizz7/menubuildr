# Requirements Document

## Introduction

This feature adds two capabilities: (1) a description field on sections/sub-sections that supports multi-language content and auto-translation, and (2) the ability to copy sections from one menu to another. Copying works within the same restaurant (e.g., from a lunch menu to a dinner menu) and across restaurants owned by the same admin. The copy performs a deep clone of the section, including its description, all sub-sections, categories, menu items, and their nested data (allergens, recipe details, price variations, availability schedules, and translations).

## Glossary

- **Copy_Service**: The backend service responsible for deep-cloning a section and all its nested entities into a target menu.
- **Section**: A grouping within a menu that contains categories and menu items. Sections can have sub-sections via parentSectionId. Sections have a title and an optional description, both stored as multi-language JSON.
- **Section_Description**: An optional multi-language text field on a Section that provides additional context or notes about the section's contents.
- **Source_Section**: The existing section being copied from.
- **Target_Menu**: The menu that receives the copied section.
- **Admin**: An authenticated user who owns one or more restaurants.
- **Ownership_Middleware**: The middleware layer that verifies an admin owns a given restaurant, menu, or section.
- **Deep_Clone**: A full recursive copy of a section including its sub-sections, categories, menu items, allergen links, recipe details, price variations, availability schedules, and translations — all with newly generated IDs.
- **Dashboard**: The Next.js frontend application used by admins to manage their restaurants and menus.

## Requirements

### Requirement 1: Section Description Field

**User Story:** As an admin, I want to add a description to any section or sub-section, so that I can provide additional context like "Served with bread and butter" or "Available weekends only".

#### Acceptance Criteria

1. THE Section model SHALL include an optional `description` field stored as multi-language JSON (same format as the `title` field, e.g., `{ "ENG": "...", "CHN": "..." }`).
2. THE Dashboard SHALL display a description input field when creating or editing a section or sub-section.
3. THE Dashboard SHALL use the existing multi-language input component for the description field, allowing admins to enter descriptions in all active languages.
4. WHEN a section description is provided, THE auto-translation service SHALL translate the description to all active languages, following the same translation behavior as section titles and menu item names.
5. WHEN a menu is rendered (HTML generation), THE menu templates SHALL display the section description below the section title if a description is present.
6. IF no description is provided for a section, THEN THE menu templates SHALL render the section without a description area (no empty space).

### Requirement 2: Copy Section to Another Menu in the Same Restaurant

**User Story:** As an admin, I want to copy a section from one menu to another menu in the same restaurant, so that I can reuse section structures without recreating them manually.

#### Acceptance Criteria

1. WHEN an admin requests to copy a section to a target menu within the same restaurant, THE Copy_Service SHALL create a new section in the Target_Menu with all properties from the Source_Section (title, description, illustrationUrl, illustrationAsBackground, illustrationPosition, illustrationSize).
2. WHEN a section is copied, THE Copy_Service SHALL assign the new section an orderIndex equal to the current count of top-level sections in the Target_Menu.
3. WHEN a section is copied, THE Copy_Service SHALL generate new unique IDs for the copied section and all nested entities (sub-sections, categories, menu items, recipe details, price variations, availability schedules, translations).
4. WHEN a section with sub-sections is copied, THE Copy_Service SHALL recursively copy all sub-sections and preserve the parent-child hierarchy using the newly generated IDs.
5. WHEN a section is copied, THE Copy_Service SHALL copy all categories belonging to the Source_Section, preserving their name and orderIndex values.
6. WHEN a section is copied, THE Copy_Service SHALL copy all menu items belonging to the Source_Section, preserving name, description, price, calories, imageUrl, orderIndex, isAvailable, and preparationTime.
7. WHEN a section with categorized items is copied, THE Copy_Service SHALL associate copied menu items with the corresponding newly created categories in the Target_Menu.
8. WHEN a section is copied, THE Copy_Service SHALL copy all allergen associations for each menu item by linking to the same AllergenIcon records.
9. WHEN a section is copied, THE Copy_Service SHALL copy all recipe details, price variations, availability schedules, and translations for each menu item.

### Requirement 3: Copy Section to a Menu in a Different Restaurant

**User Story:** As an admin who owns multiple restaurants, I want to copy a section from one restaurant's menu to another restaurant's menu, so that I can share menu content across my restaurants.

#### Acceptance Criteria

1. WHEN an admin requests to copy a section to a target menu in a different restaurant, THE Ownership_Middleware SHALL verify that the admin owns both the source restaurant and the target restaurant.
2. IF the admin does not own the target restaurant, THEN THE Copy_Service SHALL reject the request with a 403 Forbidden status.
3. WHEN a cross-restaurant copy is performed, THE Copy_Service SHALL apply the same deep-clone behavior as an intra-restaurant copy (all sub-sections, categories, items, and nested data).

### Requirement 4: Ownership and Authorization Enforcement

**User Story:** As a platform operator, I want copy operations to enforce ownership rules, so that admins cannot access or modify other admins' data.

#### Acceptance Criteria

1. WHEN a copy request is received, THE Ownership_Middleware SHALL verify that the authenticated admin owns the Source_Section.
2. WHEN a copy request is received, THE Ownership_Middleware SHALL verify that the authenticated admin owns the Target_Menu.
3. IF ownership verification fails for either the Source_Section or the Target_Menu, THEN THE Copy_Service SHALL return a 404 Not Found response to avoid leaking resource existence.

### Requirement 5: Atomicity of the Copy Operation

**User Story:** As an admin, I want the copy operation to either fully succeed or fully fail, so that I never end up with partially copied data.

#### Acceptance Criteria

1. THE Copy_Service SHALL execute the entire deep-clone operation within a single database transaction.
2. IF any part of the deep-clone operation fails, THEN THE Copy_Service SHALL roll back the entire transaction and return an error response.

### Requirement 6: API Endpoint for Section Copy

**User Story:** As a frontend developer, I want a clear API endpoint for copying sections, so that I can integrate the feature into the dashboard.

#### Acceptance Criteria

1. THE Copy_Service SHALL expose a POST endpoint at `/api/sections/:id/copy` that accepts a JSON body with a `targetMenuId` field.
2. WHEN the copy operation succeeds, THE Copy_Service SHALL return a 201 Created response containing the newly created section with its immediate children (sub-sections, categories, items).
3. WHEN the copy operation succeeds and the Target_Menu has a published status, THE Copy_Service SHALL trigger regeneration of the Target_Menu's published HTML.
4. IF the `targetMenuId` field is missing or invalid, THEN THE Copy_Service SHALL return a 400 Bad Request response with a descriptive error message.

### Requirement 7: Dashboard UI for Copying Sections

**User Story:** As an admin, I want a user interface to select a target menu when copying a section, so that I can perform the copy without using the API directly.

#### Acceptance Criteria

1. WHEN an admin opens the section actions menu, THE Dashboard SHALL display a "Copy to..." option alongside existing actions (edit, delete, duplicate).
2. WHEN the admin selects "Copy to...", THE Dashboard SHALL display a modal listing all menus the admin has access to, grouped by restaurant.
3. WHILE the copy operation is in progress, THE Dashboard SHALL display a loading indicator and disable the confirm button to prevent duplicate submissions.
4. WHEN the copy operation completes successfully, THE Dashboard SHALL close the modal and display a success notification.
5. IF the copy operation fails, THEN THE Dashboard SHALL display an error notification with the error message from the API.
6. THE Dashboard SHALL prevent the admin from selecting the menu that already contains the Source_Section as a target (no self-copy since duplicate already exists).

### Requirement 8: Handling of Copied Item References

**User Story:** As an admin, I want copied items to be fully independent from the originals, so that editing a copy does not affect the original section.

#### Acceptance Criteria

1. THE Copy_Service SHALL ensure that all copied entities are independent records with no foreign key references back to the Source_Section or its children.
2. WHEN a copied menu item references AllergenIcon records, THE Copy_Service SHALL link to the same shared AllergenIcon records (allergens are global, not copied).
3. WHEN a copied menu item has an imageUrl, THE Copy_Service SHALL copy the imageUrl string value as-is (the image asset is shared, not duplicated).
