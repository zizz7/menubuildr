# Implementation Plan: Menu Template System

## Overview

This implementation plan breaks down the Menu Template System into discrete, actionable coding tasks. The system introduces a flexible templating architecture that allows restaurants to choose from multiple pre-built HTML menu templates when publishing their menus. The implementation follows a logical sequence: database setup → template infrastructure → template files → API layer → frontend components → integration → testing.

## Tasks

- [x] 1. Database schema and migration setup
  - [x] 1.1 Create Prisma schema for MenuTemplate model
    - Add MenuTemplate model with fields: id, slug, name (JSON), description (JSON), previewImageUrl, version, isActive, createdAt, updatedAt
    - Add templateId field to Menu model with optional relation to MenuTemplate
    - Add onDelete: SetNull to ensure menu records aren't deleted when templates are removed
    - _Requirements: 1.5, 7.1, 8.1_
  
  - [x] 1.2 Create database migration file
    - Write SQL migration to create menu_templates table
    - Write SQL migration to add template_id column to menus table with foreign key
    - Include seed data for Classic and Card-Based templates with multi-language names and descriptions
    - Include UPDATE statement to associate existing published menus with Classic template
    - _Requirements: 1.5, 7.2, 9.1, 9.4_
  
  - [x] 1.3 Run migration and verify database changes
    - Execute Prisma migration
    - Verify menu_templates table exists with correct schema
    - Verify menus table has template_id column
    - Verify seed data is inserted correctly
    - _Requirements: 7.2, 9.1_

- [x] 2. Template file structure and storage
  - [x] 2.1 Create template directory structure
    - Create server/templates/menu/ directory
    - Create server/templates/menu/styles/ subdirectory
    - Create dashboard/public/template-previews/ directory
    - _Requirements: 1.1, 12.1, 12.2_
  
  - [x] 2.2 Extract Classic template from menu-generator.ts
    - Extract existing HTML generation logic into classic.html template file
    - Convert embedded styles into classic.css file
    - Create classic.meta.json with template metadata
    - Use Handlebars syntax for placeholders: {{variable}}, {{#if}}, {{#each}}
    - Preserve all existing features: multi-language, theme customization, allergen filtering, recipe expansion, section navigation
    - _Requirements: 2.1, 2.2, 1.2, 1.3, 1.4_
  
  - [x] 2.3 Create Card-Based template files
    - Write card-based.html with modern grid layout structure
    - Implement section navigation cards with cover images
    - Implement responsive grid for menu items (1/2/3 columns)
    - Write card-based.css with modern styling, rounded corners, and responsive breakpoints
    - Create card-based.meta.json with template metadata
    - Support all features: multi-language, theme customization, allergen filtering
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  
  - [x] 2.4 Create template preview images
    - Generate or design preview image for Classic template
    - Generate or design preview image for Card-Based template
    - Save images to dashboard/public/template-previews/
    - Ensure images are optimized for web (< 200KB each)
    - _Requirements: 1.4, 4.2_

- [ ] 3. Template engine core implementation
  - [x] 3.1 Implement TemplateLoader class
    - Create TemplateLoader with in-memory cache (Map<string, Template>)
    - Implement loadTemplate(slug) method to read HTML, CSS, and metadata files
    - Validate all three files exist before loading
    - Throw TemplateNotFoundError if files are missing
    - Implement clearCache() method for testing
    - _Requirements: 1.1, 1.2, 1.3, 11.1_
  
  - [ ]* 3.2 Write property test for TemplateLoader
    - **Property 1: Template File Completeness**
    - **Validates: Requirements 1.2, 1.3**
    - Test that for any template slug, all three files (HTML, CSS, JSON) exist with correct naming pattern
  
  - [x] 3.3 Implement VariableInjector class
    - Create VariableInjector with Handlebars integration
    - Implement injectVariables(template, context) to merge menu data into template
    - Implement injectThemeVariables(css, theme) to replace CSS custom properties
    - Append custom CSS to processed CSS
    - Implement helper functions: normalizeUrl, formatPrice, getTranslation
    - _Requirements: 5.2, 5.3, 5.4, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ]* 3.4 Write property test for VariableInjector
    - **Property 4: Template Rendering Completeness**
    - **Validates: Requirements 5.2, 5.3, 5.4, 10.1, 10.2, 10.3, 10.4, 12.3**
    - Test that rendered HTML contains all menu data, theme settings, language data, and inlined CSS
  
  - [ ] 3.4 Implement TemplateEngine class with error handling
    - Create TemplateEngine that orchestrates TemplateLoader and VariableInjector
    - Implement renderTemplate(templateSlug, context) method
    - Wrap template processing in try-catch block
    - On error, log error and fall back to Classic template
    - Return { html, warning } object with optional warning message
    - Implement inlineCss(html, css) to inject <style> tag before </head>
    - _Requirements: 5.1, 5.2, 5.3, 11.1, 11.2, 11.3, 11.4, 12.3_
  
  - [ ]* 3.5 Write property test for error fallback
    - **Property 10: Error Fallback Behavior**
    - **Validates: Requirements 5.5, 11.1, 11.2, 11.3, 11.4**
    - Test that any template error triggers fallback to Classic template with warning
  
  - [x] 3.6 Implement buildTemplateContext helper function
    - Create function to build TemplateContext object from menu data
    - Fetch languages, allergens, and allergen settings from database
    - Resolve theme settings with priority: Menu theme > Restaurant theme > Defaults
    - Normalize all URLs (logo, images, fonts)
    - Include helper functions in context
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 4. Checkpoint - Verify template engine works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Refactor menu-generator.ts to use template engine
  - [x] 5.1 Create getTemplateForMenu helper function
    - Check if menu has templateId and template is active
    - Return template slug if found
    - Default to 'classic' if no template or template inactive
    - _Requirements: 2.3, 8.3, 8.4_
  
  - [ ]* 5.2 Write property test for default template fallback
    - **Property 3: Default Template Fallback**
    - **Validates: Requirements 2.3, 8.4, 9.3**
    - Test that menus without templateId use Classic template
  
  - [x] 5.3 Refactor generateMenuHTML function
    - Replace embedded template logic with TemplateEngine calls
    - Call getTemplateForMenu to determine template slug
    - Call buildTemplateContext to prepare data
    - Call templateEngine.renderTemplate to generate HTML
    - Save HTML to dashboard/public/menus/{restaurant-slug}/{menu-slug}.html
    - Log warning if template fallback occurred
    - _Requirements: 2.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 5.4 Write property test for output path consistency
    - **Property 13: Output File Path Consistency**
    - **Validates: Requirements 5.6**
    - Test that generated HTML is saved to correct path pattern
  
  - [ ]* 5.5 Write unit tests for menu-generator refactoring
    - Test generateMenuHTML with Classic template
    - Test generateMenuHTML with Card-Based template
    - Test fallback when template not found
    - Test HTML file is saved to correct location
  
  - [ ]* 5.6 Write property test for backward compatibility
    - **Property 16: Backward Compatibility Preservation**
    - **Validates: Requirements 2.5, 9.5**
    - Test that Classic template produces functionally equivalent output to old system

- [x] 6. API endpoints for template management
  - [x] 6.1 Create template routes file
    - Create server/routes/template.routes.ts
    - Set up Express router for template endpoints
    - _Requirements: 7.3, 7.4_
  
  - [x] 6.2 Implement GET /api/templates endpoint
    - Query database for all templates where isActive = true
    - Return array of template objects with all metadata fields
    - Handle database errors with 500 status
    - _Requirements: 7.3_
  
  - [ ]* 6.3 Write property test for active template filtering
    - **Property 6: Active Template Filtering**
    - **Validates: Requirements 7.3, 7.5**
    - Test that endpoint only returns templates with isActive = true
  
  - [x] 6.4 Implement GET /api/templates/:slug endpoint
    - Query database for template by slug
    - Return 404 if template not found
    - Return complete template metadata if found
    - _Requirements: 7.4_
  
  - [ ]* 6.5 Write property test for template retrieval by slug
    - **Property 7: Template Retrieval by Slug**
    - **Validates: Requirements 7.4**
    - Test that valid slugs return complete metadata
  
  - [x] 6.6 Update POST /api/menus/:id/publish endpoint
    - Accept templateId in request body
    - Store templateId in menu record before generating HTML
    - Call generateMenuHTML with menu ID
    - Return success response with htmlPath and templateUsed
    - Return warning in response if template fallback occurred
    - Handle invalid templateId with 400 error
    - _Requirements: 4.5, 5.1, 5.5, 8.2, 11.5_
  
  - [ ]* 6.7 Write property test for template association persistence
    - **Property 8: Template Association Persistence**
    - **Validates: Requirements 4.5, 8.2, 8.5**
    - Test that publishing with templateId stores it in database
  
  - [ ]* 6.8 Write property test for template selection memory
    - **Property 9: Template Selection Memory**
    - **Validates: Requirements 4.6, 8.3**
    - Test that re-publishing uses previously selected template
  
  - [x] 6.9 Implement POST /api/menus/:id/preview endpoint
    - Accept templateId in request body
    - Generate HTML using TemplateEngine but do NOT save to filesystem
    - Return preview HTML directly in response body
    - Use current menu data and theme settings
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 6.10 Write property test for preview isolation
    - **Property 11: Preview Isolation**
    - **Validates: Requirements 6.3, 6.4**
    - Test that preview generation creates no files on filesystem
  
  - [ ]* 6.11 Write unit tests for API endpoints
    - Test GET /api/templates returns active templates
    - Test GET /api/templates/:slug returns 404 for invalid slug
    - Test POST /api/menus/:id/publish with valid templateId
    - Test POST /api/menus/:id/publish with invalid templateId returns 400
    - Test POST /api/menus/:id/preview returns HTML without saving files

- [ ] 7. Checkpoint - Verify API layer works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Frontend: TemplateCard component
  - [x] 8.1 Create TemplateCard component
    - Create dashboard/components/menu/TemplateCard.tsx
    - Accept props: template, isSelected, onSelect, onPreview
    - Display template preview image
    - Display template name in user's dashboard language
    - Display template description in user's dashboard language
    - Show "Selected" badge when isSelected is true
    - Add hover effect for visual feedback
    - Add Preview button that calls onPreview
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ]* 8.2 Write unit tests for TemplateCard
    - Test component renders template info correctly
    - Test selected state shows badge
    - Test clicking card calls onSelect
    - Test clicking preview button calls onPreview

- [x] 9. Frontend: TemplateSelector component
  - [x] 9.1 Create TemplateSelector component
    - Create dashboard/components/menu/TemplateSelector.tsx
    - Accept props: selectedTemplateId, onTemplateSelect, onPreview, menuId
    - Fetch templates from GET /api/templates on mount
    - Display loading state while fetching
    - Render grid of TemplateCard components
    - Pass selection state and handlers to each card
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 9.2 Write property test for template selector display
    - **Property 12: Template Selector Display Completeness**
    - **Validates: Requirements 4.2, 4.4**
    - Test that all active templates are displayed with preview images and descriptions
  
  - [ ]* 9.3 Write unit tests for TemplateSelector
    - Test component fetches templates on mount
    - Test loading state is displayed
    - Test templates are rendered as cards
    - Test selection is passed to cards

- [x] 10. Frontend: PreviewModal component
  - [x] 10.1 Create PreviewModal component
    - Create dashboard/components/menu/PreviewModal.tsx
    - Accept props: isOpen, onClose, menuId, templateId
    - Fetch preview HTML from POST /api/menus/:id/preview when opened
    - Display loading spinner while generating preview
    - Render preview HTML in iframe using srcDoc
    - Add close button in modal header
    - Handle preview generation errors gracefully
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
  
  - [ ]* 10.2 Write unit tests for PreviewModal
    - Test modal generates preview on open
    - Test loading state is displayed
    - Test preview HTML is rendered in iframe
    - Test close button closes modal

- [x] 11. Frontend: Update PublishMenuDialog component
  - [x] 11.1 Update PublishMenuDialog to integrate template selection
    - Add state for selectedTemplateId, showPreview, previewTemplateId
    - Load menu's current templateId on dialog open
    - Default to Classic template if menu has no templateId
    - Render TemplateSelector component
    - Pass template selection handlers
    - Update publish API call to include templateId
    - Display success toast on successful publish
    - Display warning toast if response includes warning (template fallback)
    - Display error toast on publish failure
    - _Requirements: 4.1, 4.5, 4.6, 5.5, 11.5_
  
  - [x] 11.2 Add PreviewModal to PublishMenuDialog
    - Render PreviewModal when showPreview is true
    - Pass menuId and previewTemplateId to modal
    - Handle modal close to return to template selection
    - _Requirements: 6.1, 6.4, 6.5_
  
  - [ ]* 11.3 Write unit tests for PublishMenuDialog updates
    - Test dialog loads last used template
    - Test template selection updates state
    - Test publish includes templateId in request
    - Test warning toast displays when fallback occurs
    - Test preview modal opens when preview button clicked

- [ ] 12. Checkpoint - Verify frontend integration works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Template CSS and theme integration
  - [ ] 13.1 Implement CSS variable replacement in VariableInjector
    - Replace var(--primary-color) with theme.primaryColor
    - Replace var(--secondary-color) with theme.secondaryColor
    - Replace var(--accent-color) with theme.accentColor
    - Replace var(--background-color) with theme.backgroundColor
    - Replace var(--text-color) with theme.textColor
    - _Requirements: 5.4_
  
  - [ ] 13.2 Implement custom CSS appending
    - Append theme.customCss to processed CSS with comment header
    - _Requirements: 5.4_
  
  - [ ] 13.3 Implement custom font URL injection
    - Inject <link> tags for each URL in theme.customFontsUrls into HTML <head>
    - _Requirements: 10.2_
  
  - [ ] 13.4 Implement background image injection
    - Apply theme.coverPhotoUrl as inline style if present
    - Apply theme.backgroundIllustrationUrl as inline style if present
    - Use theme.coverPhotoPosition and theme.coverPhotoSize for positioning
    - _Requirements: 10.2_
  
  - [ ]* 13.5 Write unit tests for theme integration
    - Test CSS variables are replaced with theme colors
    - Test custom CSS is appended
    - Test custom fonts are injected into HTML
    - Test background images are applied as inline styles

- [ ] 14. URL normalization and asset path resolution
  - [ ] 14.1 Implement normalizeUrl helper function
    - Keep external URLs (http://, https://) unchanged
    - Keep Cloudinary URLs unchanged
    - Convert relative paths to absolute paths
    - Handle null/undefined URLs gracefully
    - _Requirements: 10.5, 12.4_
  
  - [ ]* 14.2 Write property test for URL normalization
    - **Property 14: URL Normalization**
    - **Validates: Requirements 10.5, 12.4**
    - Test that relative paths are resolved and external URLs are unchanged
  
  - [ ] 14.3 Apply normalizeUrl to all asset URLs in buildTemplateContext
    - Normalize restaurant.logoUrl
    - Normalize allergen.imageUrl for all allergens
    - Normalize item.imageUrl for all menu items
    - Normalize theme.backgroundIllustrationUrl
    - Normalize theme.coverPhotoUrl
    - _Requirements: 10.5, 12.4_

- [ ] 15. Self-contained HTML output verification
  - [ ]* 15.1 Write property test for self-contained HTML
    - **Property 15: Self-Contained HTML Output**
    - **Validates: Requirements 12.5**
    - Test that generated HTML contains all CSS inline and requires no external CSS files
  
  - [ ]* 15.2 Write unit test for CSS inlining
    - Test that <style> tag is inserted before </head>
    - Test that CSS content is complete inside <style> tag
    - Test that no external CSS <link> tags are present (except for fonts)

- [ ] 16. Error handling and logging
  - [ ] 16.1 Add structured logging to TemplateEngine
    - Log INFO when template loads successfully
    - Log WARN when template fallback occurs with reason
    - Log ERROR when Classic template fails to load
    - Include menuId and templateSlug in all log entries
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ] 16.2 Add error response formatting to API endpoints
    - Return consistent error response format: { success, error, details, code }
    - Return 404 for template not found
    - Return 400 for invalid request parameters
    - Return 500 for server errors
    - _Requirements: 11.4, 11.5_
  
  - [ ] 16.3 Add user-facing error messages to frontend
    - Display warning Alert when publish response includes warning
    - Display error Alert when publish fails
    - Include actionable error messages
    - _Requirements: 11.5_

- [ ] 17. Integration testing and end-to-end workflows
  - [ ]* 17.1 Write integration test: Create menu → Select template → Publish
    - Create test menu with sample data
    - Select Card-Based template
    - Publish menu
    - Verify HTML file exists at correct path
    - Verify HTML contains menu data and Card-Based template styles
  
  - [ ]* 17.2 Write integration test: Publish → Change template → Re-publish
    - Publish menu with Classic template
    - Change to Card-Based template
    - Re-publish menu
    - Verify new HTML uses Card-Based template
    - Verify menu.templateId is updated in database
  
  - [ ]* 17.3 Write integration test: Preview without saving files
    - Request preview with Card-Based template
    - Verify preview HTML is returned
    - Verify no files are created in public/menus directory
  
  - [ ]* 17.4 Write integration test: Template fallback on error
    - Publish menu with invalid template ID
    - Verify HTML is generated using Classic template
    - Verify warning is returned in response
    - Verify error is logged

- [ ] 18. Documentation and deployment preparation
  - [ ] 18.1 Update API documentation
    - Document GET /api/templates endpoint
    - Document GET /api/templates/:slug endpoint
    - Document updated POST /api/menus/:id/publish endpoint
    - Document POST /api/menus/:id/preview endpoint
    - Include request/response examples
  
  - [ ] 18.2 Create template development guide
    - Document template file structure and naming conventions
    - Document available template variables and helpers
    - Document theme customization integration
    - Provide examples of Handlebars syntax usage
  
  - [ ] 18.3 Update deployment checklist
    - Add step to run database migration
    - Add step to verify template files are deployed
    - Add step to verify preview images are deployed
    - Add step to verify Classic template works for existing menus

- [ ] 19. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breaks
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: infrastructure → core logic → API → frontend → integration
- Template files (Classic and Card-Based) are critical and should be carefully extracted/created to preserve existing functionality
- Error handling with fallback to Classic template ensures system reliability
- All generated HTML must be self-contained with inlined CSS for static hosting compatibility
