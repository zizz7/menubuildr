# Implementation Plan: Theme Template Selector and Collapsible Menu

## Overview

This implementation plan covers three major feature enhancements to the Multi-Restaurant Menu Management System:

1. **Template Selector Component**: Allows users to select which template (Classic, Card-Based, or CoraFlow) to customize in the theme customization page
2. **Collapsible Side Navigation**: Provides a toggle mechanism for the dashboard side menu with persistent state
3. **Translation Management System**: Enables manual translation of menu items and descriptions into multiple languages

The implementation follows an incremental approach, building each feature area with its core functionality first, followed by testing and integration.

## Tasks

- [x] 1. Set up database schema for translations
  - [x] 1.1 Create MenuItemTranslation model in Prisma schema
    - Add new model with fields: id, menuItemId, languageCode, translatedName, translatedDescription, createdAt, updatedAt
    - Add unique constraint on (menuItemId, languageCode)
    - Add cascade delete relation to MenuItem
    - Add translations relation to MenuItem model
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 1.2 Generate and run database migration
    - Run `npx prisma migrate dev --name add-menu-item-translations`
    - Verify migration creates table with correct constraints
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. Implement translation API endpoints
  - [x] 2.1 Create translation routes file
    - Create `server/src/routes/translation.routes.ts`
    - Define routes for GET, POST, PUT, DELETE operations
    - Mount routes in main server file
    - _Requirements: 5.4_
  
  - [x] 2.2 Implement GET /menu-items/:id/translations endpoint
    - Fetch all translations for a menu item
    - Return translations array with all fields
    - Handle menu item not found error (404)
    - _Requirements: 3.2, 5.4_
  
  - [x] 2.3 Implement POST /menu-items/:id/translations endpoint
    - Validate required fields (languageCode, translatedName)
    - Create new translation record
    - Handle duplicate language code error (409)
    - Handle menu item not found error (404)
    - Return created translation (201)
    - _Requirements: 3.3, 3.4, 5.2, 5.4_
  
  - [ ]* 2.4 Write property test for translation CRUD operations
    - **Property 10: Translation CRUD Operations**
    - **Validates: Requirements 3.3, 3.8, 3.9**
  
  - [x] 2.5 Implement PUT /menu-items/:menuItemId/translations/:translationId endpoint
    - Validate translation exists and belongs to menu item
    - Update translatedName and translatedDescription
    - Return updated translation
    - Handle translation not found error (404)
    - _Requirements: 3.8, 5.4_
  
  - [x] 2.6 Implement DELETE /menu-items/:menuItemId/translations/:translationId endpoint
    - Validate translation exists and belongs to menu item
    - Delete translation record
    - Return 204 No Content on success
    - Handle translation not found error (404)
    - _Requirements: 3.9, 5.4_
  
  - [ ]* 2.7 Write property test for translation unique constraint
    - **Property 20: Translation Unique Constraint Enforcement**
    - **Validates: Requirements 5.2**
  
  - [ ]* 2.8 Write property test for cascade delete
    - **Property 21: Translation Cascade Delete**
    - **Validates: Requirements 5.3**

- [x] 3. Enhance theme API endpoint for template selection
  - [x] 3.1 Update PUT /restaurants/:id/theme endpoint
    - Accept templateId in request body
    - Validate templateId exists in MenuTemplate table
    - Update Menu.templateId when menuId is provided
    - Update Menu.themeSettings JSON field
    - Return updated theme settings
    - _Requirements: 1.5, 1.6, 4.1, 4.3_
  
  - [ ]* 3.2 Write property test for template persistence
    - **Property 3: Template Persistence in API Requests**
    - **Validates: Requirements 1.6**
  
  - [ ]* 3.3 Write property test for theme settings association
    - **Property 4: Theme Settings Association**
    - **Validates: Requirements 1.5, 4.1**
  
  - [x] 3.4 Update GET /restaurants/:id/theme endpoint
    - Accept menuId and templateId as query parameters
    - Filter theme settings by restaurant, menu, and template
    - Return default values if no settings exist
    - _Requirements: 4.2, 4.4_
  
  - [ ]* 3.5 Write property test for theme settings query filtering
    - **Property 15: Theme Settings Query Filtering**
    - **Validates: Requirements 4.2**
  
  - [ ]* 3.6 Write property test for template-specific theme isolation
    - **Property 18: Template-Specific Theme Isolation**
    - **Validates: Requirements 4.5**

- [x] 4. Create GET /api/templates endpoint
  - [x] 4.1 Implement templates route
    - Create route handler in `server/src/routes/template.routes.ts`
    - Fetch all active templates from MenuTemplate table
    - Return templates with id, slug, name, description, previewImageUrl, version, isActive
    - _Requirements: 1.2_
  
  - [ ]* 4.2 Write property test for template registry completeness
    - **Property 1: Template Registry Completeness**
    - **Validates: Requirements 1.2**

- [x] 5. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create TemplateSelector component
  - [x] 6.1 Create component file and basic structure
    - Create `dashboard/components/theme/template-selector.tsx`
    - Define TemplateSelectorProps interface
    - Set up component state for templates, loading, error
    - _Requirements: 1.1, 1.2_
  
  - [x] 6.2 Implement template fetching logic
    - Fetch templates from GET /api/templates on mount
    - Handle loading state
    - Handle error state with retry button
    - Store templates in state
    - _Requirements: 1.2_
  
  - [x] 6.3 Implement template selection UI
    - Render Select dropdown with template options
    - Display template name and preview image in dropdown items
    - Call onTemplateChange callback when selection changes
    - Handle disabled state
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 6.4 Write unit tests for TemplateSelector component
    - Test loading state display
    - Test error handling and retry
    - Test template list rendering
    - Test selection callback
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 7. Integrate TemplateSelector into Theme Page
  - [x] 7.1 Update Theme Page component
    - Import TemplateSelector component
    - Add selectedTemplateId state
    - Load templateId from menu data when menu is selected
    - Place TemplateSelector after Restaurant and Menu selectors
    - Pass selectedTemplateId and onTemplateChange handler
    - _Requirements: 1.1, 1.3, 1.4_
  
  - [x] 7.2 Update theme save logic
    - Include templateId in theme settings save payload
    - Send PUT request to /restaurants/:id/theme with templateId
    - Handle save success and error states
    - _Requirements: 1.5, 1.6_
  
  - [ ]* 7.3 Write property test for template selection loads correct settings
    - **Property 2: Template Selection Loads Correct Settings**
    - **Validates: Requirements 1.3**
  
  - [ ]* 7.4 Write integration test for template selection flow
    - Test complete flow: load page → select template → modify settings → save → verify persistence
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

- [x] 8. Enhance DashboardLayout for collapsible sidebar
  - [x] 8.1 Add localStorage persistence to sidebar state
    - Define SIDEBAR_STORAGE_KEY constant
    - Initialize sidebarOpen state from localStorage
    - Save state to localStorage on change
    - Handle localStorage unavailable gracefully
    - _Requirements: 2.5_
  
  - [ ]* 8.2 Write property test for sidebar state persistence
    - **Property 7: Sidebar State Persistence Round-Trip**
    - **Validates: Requirements 2.5**
  
  - [x] 8.3 Verify sidebar toggle functionality
    - Ensure toggle button exists and is clickable
    - Verify state changes on click
    - Verify CSS classes update correctly
    - _Requirements: 2.1, 2.2_
  
  - [ ]* 8.4 Write property test for sidebar toggle idempotence
    - **Property 5: Sidebar Toggle Idempotence**
    - **Validates: Requirements 2.2**
  
  - [x] 8.4 Verify sidebar UI states
    - Confirm collapsed state shows only icons (w-16)
    - Confirm expanded state shows icons and text (w-64)
    - Verify smooth transition animation (300ms)
    - _Requirements: 2.3, 2.4, 2.7_
  
  - [ ]* 8.5 Write property test for sidebar UI state consistency
    - **Property 6: Sidebar UI State Consistency**
    - **Validates: Requirements 2.3, 2.4**
  
  - [x] 8.6 Verify content area width adjustment
    - Confirm main content area adjusts when sidebar state changes
    - Test flexbox layout behavior
    - _Requirements: 2.6_
  
  - [ ]* 8.7 Write property test for content area width adjustment
    - **Property 8: Content Area Width Adjustment**
    - **Validates: Requirements 2.6**

- [x] 9. Create TranslationManager component
  - [x] 9.1 Create component file and basic structure
    - Create `dashboard/components/menu-items/translation-manager.tsx`
    - Define TranslationManagerProps and State interfaces
    - Set up component state for translations, loading, dialogs
    - _Requirements: 3.1, 3.2_
  
  - [x] 9.2 Implement translation fetching logic
    - Fetch translations from GET /menu-items/:id/translations on mount
    - Handle loading state
    - Display translations in table format
    - _Requirements: 3.2_
  
  - [ ]* 9.3 Write property test for translation display completeness
    - **Property 9: Translation Display Completeness**
    - **Validates: Requirements 3.2**
  
  - [x] 9.4 Implement add translation dialog
    - Create dialog with language selector and input fields
    - Validate required fields (languageCode, translatedName)
    - Call POST /menu-items/:id/translations on save
    - Handle duplicate language error (409)
    - Update local state on success
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 9.5 Write property test for translation required fields validation
    - **Property 11: Translation Required Fields Validation**
    - **Validates: Requirements 3.4**
  
  - [x] 9.6 Implement edit translation functionality
    - Open dialog with existing translation data
    - Allow editing translatedName and translatedDescription
    - Call PUT /menu-items/:menuItemId/translations/:translationId on save
    - Update local state on success
    - _Requirements: 3.8_
  
  - [x] 9.7 Implement delete translation functionality
    - Show confirmation dialog before deletion
    - Call DELETE /menu-items/:menuItemId/translations/:translationId
    - Update local state on success
    - _Requirements: 3.9_
  
  - [x] 9.8 Implement supported language codes
    - Define language options: en, es, fr, de, it, pt, ja, zh, ko, ar
    - Display language names in selector
    - Validate language code on submission
    - _Requirements: 3.10_
  
  - [ ]* 9.9 Write property test for supported language codes
    - **Property 14: Supported Language Codes**
    - **Validates: Requirements 3.10**
  
  - [ ]* 9.10 Write unit tests for TranslationManager component
    - Test empty state rendering
    - Test translation list display
    - Test add dialog flow
    - Test edit dialog flow
    - Test delete confirmation
    - Test error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9_

- [x] 10. Integrate TranslationManager into Menu Items page
  - [x] 10.1 Update Menu Items page component
    - Import TranslationManager component
    - Add TranslationManager to menu item detail view
    - Pass menuItemId and original name/description as props
    - _Requirements: 3.1_
  
  - [ ]* 10.2 Write integration test for translation management flow
    - Test complete flow: navigate to item → add translation → edit → delete → verify database
    - _Requirements: 3.1, 3.2, 3.3, 3.8, 3.9_

- [x] 11. Implement translation display in menu templates
  - [x] 11.1 Update template rendering logic
    - Modify Classic template to query translations
    - Modify Card-Based template to query translations
    - Modify CoraFlow template to query translations
    - Accept language preference parameter
    - _Requirements: 3.6, 3.7_
  
  - [x] 11.2 Implement language resolution logic
    - Check if translation exists for requested language
    - Display translation if found
    - Fall back to original content if not found
    - _Requirements: 3.6, 3.7_
  
  - [ ]* 11.3 Write property test for language-based translation resolution
    - **Property 13: Language-Based Translation Resolution**
    - **Validates: Requirements 3.6, 3.7**
  
  - [ ]* 11.4 Write property test for translation storage round-trip
    - **Property 12: Translation Storage Round-Trip**
    - **Validates: Requirements 3.5**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. End-to-end integration verification
  - [x] 13.1 Verify template selection workflow
    - Load theme page with restaurant and menu
    - Select different template
    - Modify theme settings
    - Save and verify persistence
    - Reload page and verify template selection persists
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_
  
  - [x] 13.2 Verify sidebar persistence workflow
    - Collapse sidebar and navigate to different page
    - Verify sidebar remains collapsed
    - Expand sidebar and refresh page
    - Verify sidebar remains expanded
    - _Requirements: 2.2, 2.5_
  
  - [x] 13.3 Verify translation workflow
    - Navigate to menu item
    - Add translation for Spanish (es)
    - Edit translation
    - View menu with Spanish language preference
    - Verify translated content displays
    - Delete translation
    - _Requirements: 3.2, 3.3, 3.6, 3.7, 3.8, 3.9_
  
  - [ ]* 13.4 Write property test for default theme settings fallback
    - **Property 17: Default Theme Settings Fallback**
    - **Validates: Requirements 4.4**
  
  - [ ]* 13.5 Write property test for template ID parameter acceptance
    - **Property 16: Template ID Parameter Acceptance**
    - **Validates: Requirements 4.3**
  
  - [ ]* 13.6 Write property test for translation data structure completeness
    - **Property 19: Translation Data Structure Completeness**
    - **Validates: Requirements 5.1**

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation follows an incremental approach: database → backend API → frontend components → integration
- Sidebar functionality already exists in the codebase; tasks focus on adding localStorage persistence
- Template selection leverages existing Menu.templateId field in the database schema
