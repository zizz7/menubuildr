# Implementation Plan: Copy Sections Between Menus

## Overview

This plan implements two capabilities: (1) adding an optional multi-language `description` field to sections with auto-translation and template rendering, and (2) a deep-clone copy operation that copies a section and all nested entities to a target menu. The backend work comes first (schema, validation, service, route), followed by template updates, auto-translation, and finally the dashboard UI.

## Tasks

- [ ] 1. Add description field to Section model and update validation
  - [x] 1.1 Add `description Json?` field to the Section model in `server/prisma/schema.prisma` and create a migration
    - Add `description Json? @map("description")` after the `title` field in the Section model
    - Run `npx prisma migrate dev --name add_section_description` to generate the migration SQL
    - _Requirements: 1.1_

  - [x] 1.2 Update `SectionSchema` in `server/src/utils/validation.ts` to include the description field
    - Add `description: z.record(z.string()).optional().nullable()` to `SectionSchema`
    - _Requirements: 1.1_

  - [x] 1.3 Update section CRUD routes in `server/src/routes/sections.ts` to handle the description field
    - The create and update routes already spread validated data, so they will pass through `description` automatically after the schema update
    - Verify the duplicate endpoint (`POST /:id/duplicate`) also copies the `description` field from the original section
    - _Requirements: 1.1_

  - [ ] 1.4 Write property test for description field round-trip (Property 1)
    - **Property 1: Description field round-trip**
    - Use `fast-check` to generate random multi-language JSON objects, create a section with that description, read it back, and verify equivalence
    - Add test to `server/src/__tests__/sections-categories.test.ts` or a new `server/src/__tests__/copy-section.property.test.ts`
    - **Validates: Requirements 1.1**

- [ ] 2. Update auto-translation service and menu templates for section descriptions
  - [x] 2.1 Extend `autoTranslateMenu` in `server/src/services/auto-translate.ts` to translate section descriptions
    - In the section translation loop, add logic to translate `section.description` fields using the same pattern as `section.title`
    - Include the `description` field in the Prisma query that fetches sections
    - _Requirements: 1.4_

  - [ ]* 2.2 Write property test for auto-translation of descriptions (Property 2)
    - **Property 2: Auto-translation populates description for all active languages**
    - For any section with a description in the default language, after auto-translation, verify the description JSON contains entries for all active languages
    - **Validates: Requirements 1.4**

  - [x] 2.3 Update `MenuData` interface and section rendering in `server/src/services/coraflow-template.ts`
    - Add optional `description?: Record<string, string>` to the section type in the `MenuData` interface
    - Render description below the section title when present; omit the description area when null/empty
    - _Requirements: 1.5, 1.6_

  - [x] 2.4 Update `MenuData` interface and section rendering in `server/src/services/card-based-template.ts`
    - Same changes as coraflow template: add `description` to interface, render below title when present
    - _Requirements: 1.5, 1.6_

  - [ ]* 2.5 Write property test for template description rendering (Property 3)
    - **Property 3: Template renders description when present**
    - For any section with a non-null description, verify the generated HTML contains the description text; for null/empty descriptions, verify no description area is rendered
    - **Validates: Requirements 1.5, 1.6**

- [x] 3. Checkpoint - Section description field
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement copy section service
  - [x] 4.1 Create `server/src/services/copy-section.ts` with the deep-clone logic
    - Implement `copySection(sectionId: string, targetMenuId: string)` function
    - Fetch the source section with all nested data: sub-sections (recursive), categories, items with allergens, recipeDetails, priceVariations, availabilitySchedule, translations
    - Run the entire operation inside `prisma.$transaction()`
    - Recursively create the section tree with new UUIDs, mapping old category IDs to new ones for item associations
    - Connect allergens via `connect` (shared global records), copy `imageUrl` as-is
    - Assign `orderIndex` equal to the count of existing top-level sections in the target menu
    - Return the newly created section with its immediate children
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.3, 5.1, 5.2, 8.1, 8.2, 8.3_

  - [ ]* 4.2 Write property test for copy preserving section-level properties (Property 4)
    - **Property 4: Copy preserves section-level properties**
    - Generate random section data (title, description, illustration fields), copy to a target menu, verify all field values match the source
    - **Validates: Requirements 2.1**

  - [ ]* 4.3 Write property test for copy orderIndex assignment (Property 5)
    - **Property 5: Copy assigns correct orderIndex**
    - Generate a target menu with a random number of existing top-level sections, copy a section, verify the new section's orderIndex equals the prior count
    - **Validates: Requirements 2.2**

  - [ ]* 4.4 Write property test for unique ID generation (Property 6)
    - **Property 6: Copy generates new unique IDs for all entities**
    - Copy a section with random nested structure, collect all IDs from source and copy, verify zero intersection between the two sets
    - **Validates: Requirements 2.3, 8.1**

  - [ ]* 4.5 Write property test for structural relationship preservation (Property 7)
    - **Property 7: Copy preserves structural relationships**
    - Generate sections with random sub-section trees and categorized items, copy, verify tree structure (depth and count at each level) and category mappings are preserved
    - **Validates: Requirements 2.4, 2.7**

  - [ ]* 4.6 Write property test for nested data fidelity (Property 8)
    - **Property 8: Copy preserves nested data fidelity**
    - Generate sections with random items having allergens, recipe details, price variations, availability schedules, and translations; copy and verify data equivalence
    - **Validates: Requirements 2.5, 2.6, 2.8, 2.9, 8.2, 8.3**

  - [ ]* 4.7 Write property test for atomicity (Property 10)
    - **Property 10: Atomicity — failed copy leaves no partial data**
    - Simulate a failure mid-transaction and verify the target menu contains no new entities from the attempted copy
    - **Validates: Requirements 5.1, 5.2**

- [ ] 5. Add copy route and ownership enforcement
  - [x] 5.1 Add `POST /:id/copy` route to `server/src/routes/sections.ts`
    - Validate request body: `targetMenuId` must be present and a valid UUID (return 400 if missing/invalid)
    - Block self-copy: if `targetMenuId` is the same menu that contains the source section, return 400
    - Verify ownership of source section via `verifySectionOwnership(id, adminId)` — return 404 if unauthorized
    - Verify ownership of target menu via `verifyMenuOwnership(targetMenuId, adminId)` — return 404 if unauthorized
    - Call `copySection(sectionId, targetMenuId)` from the copy service
    - Trigger `regenerateMenuIfPublished(targetMenuId)` on success
    - Return 201 with the newly created section
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 5.2 Write property test for ownership enforcement (Property 9)
    - **Property 9: Ownership enforcement rejects unauthorized requests**
    - Generate random admin/section/menu ownership combinations, attempt copy, verify 404 for unauthorized requests
    - **Validates: Requirements 3.1, 3.2, 4.1, 4.2, 4.3**

  - [ ]* 5.3 Write property test for invalid targetMenuId (Property 11)
    - **Property 11: Invalid targetMenuId returns 400**
    - Generate random invalid targetMenuId values (empty, non-UUID, self-menu), verify 400 response
    - **Validates: Requirements 6.4**

  - [ ]* 5.4 Write unit tests for copy endpoint edge cases
    - Test copy of a section with no sub-sections, no categories, no items (minimal case)
    - Test copy of a section with deeply nested sub-sections (3+ levels)
    - Test 400 when `targetMenuId` is missing from request body
    - Test 404 when source section ID doesn't exist
    - Test HTML regeneration is triggered when target menu is published
    - Test HTML regeneration is NOT triggered when target menu is draft
    - Add tests to `server/src/__tests__/copy-section.test.ts`
    - _Requirements: 2.1, 5.1, 6.1, 6.3, 6.4_

- [x] 6. Checkpoint - Backend copy service and route
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Add description field to dashboard section form
  - [x] 7.1 Update the section create/edit form in `dashboard/app/dashboard/menus/[id]/page.tsx`
    - Add `description` to the `sectionForm` state (same multi-language structure as `title`)
    - Add a `MultiLanguageInput` component for description below the title input in the section dialog
    - Include `description` in the create and update API calls
    - Update the `Section` interface to include `description?: Record<string, string> | null`
    - _Requirements: 1.2, 1.3_

- [ ] 8. Add "Copy to..." action and modal to dashboard
  - [x] 8.1 Create `dashboard/components/copy-section-modal.tsx`
    - Accept props: `sectionId`, `currentMenuId`, `isOpen`, `onClose`, `onSuccess`
    - Fetch all restaurants for the admin via `GET /api/restaurants`
    - For each restaurant, fetch menus via `GET /api/menus/restaurant/:restaurantId`
    - Display menus grouped by restaurant name
    - Disable the menu that contains the source section (prevent self-copy)
    - Show loading spinner during copy, disable confirm button while loading
    - Call `POST /api/sections/:id/copy` with selected `targetMenuId`
    - Show success/error toast notifications via sonner
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 8.2 Add "Copy to..." button in `SortableSection` component in `dashboard/app/dashboard/menus/[id]/page.tsx`
    - Add a "Copy to..." button alongside existing Edit, Delete, Add Sub-Section buttons
    - Wire the button to open the `CopySectionModal` with the section's ID and current menu ID
    - On success callback, refresh the current page data
    - _Requirements: 7.1_

  - [x] 8.3 Update the duplicate endpoint in `server/src/routes/sections.ts` to include `description` in the duplicated section
    - Ensure the existing `POST /:id/duplicate` route copies the `description` field from the original section
    - _Requirements: 1.1_

- [x] 9. Final checkpoint - Full feature integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The backend is implemented first (tasks 1-6) so the API is ready before the dashboard UI (tasks 7-8)
- The copy service reuses patterns from the existing duplicate endpoint but extends them with recursive sub-section handling, cross-menu support, and full nested data cloning