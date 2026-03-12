# Requirements Document

## Introduction

The Menu Template System enables restaurants to save and reuse HTML menu generation templates. Currently, the system generates HTML menus using a single embedded template in the menu-generator service. This feature will introduce a flexible templating system that allows users to select from multiple pre-built templates (Classic and Card-Based) when publishing menus, with the infrastructure to support custom templates in the future.

## Glossary

- **Menu_Template_System**: The complete system for managing, storing, and applying HTML menu templates
- **Template**: A reusable HTML/CSS structure that defines how menu data is rendered into an HTML file
- **Classic_Template**: The existing menu generation template currently embedded in menu-generator.ts
- **Card_Based_Template**: A new template featuring a modern card layout with images, grid display, and mobile-first responsive design
- **Template_Selector**: The UI component in the dashboard that allows users to choose a template during menu publishing
- **Menu_Generator**: The service (menu-generator.ts) responsible for generating HTML files from menu data
- **Template_Metadata**: Information about a template including name, description, preview image, and creation date
- **Template_Engine**: The component that processes template files and merges them with menu data
- **Dashboard**: The administrative interface where restaurant staff manage menus and settings
- **Published_Menu**: An HTML file generated from menu data using a selected template

## Requirements

### Requirement 1: Template Storage and Management

**User Story:** As a system administrator, I want templates to be stored in a structured way, so that they can be easily managed and version-controlled.

#### Acceptance Criteria

1. THE Menu_Template_System SHALL store template files in the filesystem at path `server/templates/menu/`
2. WHEN a template is stored, THE Menu_Template_System SHALL include an HTML template file, a CSS stylesheet file, and a metadata JSON file
3. THE Menu_Template_System SHALL name template files using the pattern `{template-slug}.html`, `{template-slug}.css`, and `{template-slug}.meta.json`
4. THE Template_Metadata SHALL include fields for template name (multi-language), description (multi-language), preview image URL, creation date, and version number
5. THE Menu_Template_System SHALL maintain template metadata in the database using a new `MenuTemplate` model

### Requirement 2: Default Template Migration

**User Story:** As a developer, I want the existing menu generation logic to be extracted into the Classic template, so that current functionality is preserved.

#### Acceptance Criteria

1. THE Menu_Template_System SHALL extract the current HTML generation logic from menu-generator.ts into a Classic_Template file
2. THE Classic_Template SHALL preserve all existing features including multi-language support, theme customization, allergen filtering, recipe expansion, and section navigation
3. WHEN no template is specified for a menu, THE Menu_Generator SHALL use the Classic_Template as the default
4. THE Menu_Template_System SHALL create a database record for the Classic_Template with slug "classic"
5. FOR ALL existing published menus, re-generating them with the Classic_Template SHALL produce identical HTML output

### Requirement 3: Card-Based Template Implementation

**User Story:** As a restaurant owner, I want a modern card-based template option, so that I can present my menu with a visually appealing grid layout featuring item images.

#### Acceptance Criteria

1. THE Menu_Template_System SHALL provide a Card_Based_Template with slug "card-based"
2. THE Card_Based_Template SHALL display menu sections as navigation cards with cover images
3. THE Card_Based_Template SHALL render menu items in a responsive grid layout
4. WHEN a menu item is displayed, THE Card_Based_Template SHALL show the item image, name, description, price, and allergen icons
5. THE Card_Based_Template SHALL use rounded corners, modern spacing, and a mobile-first responsive design
6. THE Card_Based_Template SHALL support all existing features including multi-language, theme customization, and allergen filtering
7. WHEN viewed on mobile devices, THE Card_Based_Template SHALL display items in a single-column layout
8. WHEN viewed on tablet devices, THE Card_Based_Template SHALL display items in a two-column grid
9. WHEN viewed on desktop devices, THE Card_Based_Template SHALL display items in a three-column grid

### Requirement 4: Template Selection Interface

**User Story:** As a restaurant staff member, I want to select a template when publishing a menu, so that I can choose the presentation style that best fits my needs.

#### Acceptance Criteria

1. WHEN a user publishes a menu, THE Dashboard SHALL display a Template_Selector component
2. THE Template_Selector SHALL show all available templates with their preview images and descriptions
3. WHEN a user hovers over a template option, THE Template_Selector SHALL highlight the selection
4. THE Template_Selector SHALL display template names in the user's selected dashboard language
5. WHEN a user selects a template, THE Dashboard SHALL store the template selection with the menu
6. THE Dashboard SHALL remember the last selected template for each menu and pre-select it on subsequent publishes

### Requirement 5: Template Application During Publishing

**User Story:** As a system, I want to apply the selected template when generating HTML menus, so that the output matches the user's choice.

#### Acceptance Criteria

1. WHEN a menu is published, THE Menu_Generator SHALL retrieve the selected template from storage
2. THE Menu_Generator SHALL merge the menu data with the template HTML structure
3. THE Menu_Generator SHALL apply the template CSS styles to the generated HTML
4. THE Menu_Generator SHALL inject theme customization variables into the template CSS
5. WHEN template processing fails, THE Menu_Generator SHALL log the error and fall back to the Classic_Template
6. THE Menu_Generator SHALL save the generated HTML file to `dashboard/public/menus/{restaurant-slug}/{menu-slug}.html`

### Requirement 6: Template Preview Functionality

**User Story:** As a restaurant staff member, I want to preview how my menu will look with different templates, so that I can make an informed selection.

#### Acceptance Criteria

1. WHEN a user clicks a preview button in the Template_Selector, THE Dashboard SHALL generate a preview of the menu using the selected template
2. THE Dashboard SHALL display the preview in a modal or new browser tab
3. THE Preview SHALL use the current menu data and theme settings
4. THE Preview SHALL be temporary and not save any files to the public directory
5. WHEN the preview is closed, THE Dashboard SHALL return to the template selection interface

### Requirement 7: Template Metadata Management

**User Story:** As a system administrator, I want to manage template metadata through the database, so that template information can be queried and updated efficiently.

#### Acceptance Criteria

1. THE Menu_Template_System SHALL create a `MenuTemplate` database model with fields for id, slug, name (JSON), description (JSON), previewImageUrl, version, isActive, createdAt, and updatedAt
2. WHEN the system starts, THE Menu_Template_System SHALL seed the database with Classic_Template and Card_Based_Template records
3. THE Menu_Template_System SHALL provide an API endpoint `GET /api/templates` that returns all active templates
4. THE Menu_Template_System SHALL provide an API endpoint `GET /api/templates/:slug` that returns a specific template's metadata
5. WHEN a template is marked as inactive, THE Template_Selector SHALL not display it as an option

### Requirement 8: Menu-Template Association

**User Story:** As a system, I want to track which template was used for each menu, so that re-publishing uses the same template by default.

#### Acceptance Criteria

1. THE Menu_Template_System SHALL add a `templateId` field to the Menu model
2. WHEN a menu is published with a template, THE Menu_Template_System SHALL store the template ID in the menu record
3. WHEN a menu is re-published without specifying a template, THE Menu_Generator SHALL use the previously selected template
4. WHEN a menu has no associated template, THE Menu_Generator SHALL use the Classic_Template
5. THE Menu_Template_System SHALL allow users to change the template selection for subsequent publishes

### Requirement 9: Backward Compatibility

**User Story:** As a system administrator, I want existing menus to continue working without modification, so that the template system introduction does not break current functionality.

#### Acceptance Criteria

1. WHEN the Menu_Template_System is deployed, THE System SHALL automatically associate all existing published menus with the Classic_Template
2. THE Menu_Generator SHALL continue to support the existing `generateMenuHTML` function signature
3. WHEN an existing menu is re-published, THE Menu_Generator SHALL use the Classic_Template unless a different template is explicitly selected
4. THE Menu_Template_System SHALL not require any manual data migration for existing menus
5. FOR ALL existing menus, the first re-publish after deployment SHALL produce identical HTML output to the previous version

### Requirement 10: Template Variable Injection

**User Story:** As a template designer, I want templates to receive menu data and theme settings as variables, so that templates can be dynamic and customizable.

#### Acceptance Criteria

1. THE Template_Engine SHALL inject menu data including restaurant name, logo, sections, items, and allergens into the template
2. THE Template_Engine SHALL inject theme settings including colors, fonts, and custom CSS into the template
3. THE Template_Engine SHALL inject language data for multi-language support
4. THE Template_Engine SHALL inject allergen filter mode settings
5. THE Template_Engine SHALL provide helper functions for URL normalization, image path resolution, and multi-language text rendering

### Requirement 11: Template Error Handling

**User Story:** As a system, I want to handle template errors gracefully, so that menu publishing does not fail completely when template issues occur.

#### Acceptance Criteria

1. WHEN a template file is missing, THE Menu_Generator SHALL log an error and fall back to the Classic_Template
2. WHEN a template contains invalid HTML, THE Menu_Generator SHALL log the validation error and fall back to the Classic_Template
3. WHEN template processing throws an exception, THE Menu_Generator SHALL catch the error, log it, and fall back to the Classic_Template
4. THE Menu_Generator SHALL return a success response with a warning message when fallback occurs
5. THE Dashboard SHALL display the warning message to the user when template fallback happens

### Requirement 12: Template Asset Management

**User Story:** As a template designer, I want templates to reference their own CSS and image assets, so that each template can have a unique visual style.

#### Acceptance Criteria

1. THE Menu_Template_System SHALL store template CSS files in `server/templates/menu/styles/`
2. THE Menu_Template_System SHALL store template preview images in `dashboard/public/template-previews/`
3. WHEN generating HTML, THE Template_Engine SHALL inject the template CSS inline into the HTML file
4. THE Template_Engine SHALL resolve relative asset paths in templates to absolute paths
5. THE Generated HTML SHALL be self-contained with all CSS embedded for static hosting compatibility

