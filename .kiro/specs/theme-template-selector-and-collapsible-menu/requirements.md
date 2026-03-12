# Requirements Document

## Introduction

This document specifies requirements for three enhancements to the Multi-Restaurant Menu Management System:
1. Template selector in the theme customization page to choose which template to customize
2. Collapsible side navigation menu for better screen space management
3. Local manual translation functionality for menu items and descriptions

The system currently supports three templates (Classic, Card-Based, CoraFlow) and allows theme customization, but lacks the ability to select which template to customize. Additionally, the side menu is fixed, and there is no manual translation capability for menu content.

## Glossary

- **Dashboard**: The administrative interface for managing restaurants and menus
- **Theme_Customization_Page**: The page at `dashboard/app/dashboard/theme/page.tsx` where users customize visual appearance
- **Template**: A predefined layout and styling approach (Classic, Card-Based, or CoraFlow)
- **Template_Registry**: The service at `server/src/services/template-registry.ts` that manages available templates
- **Side_Menu**: The navigation menu displayed on the left side of the Dashboard
- **Menu_Item**: A dish or product entry in a restaurant menu with name, description, price, and other attributes
- **Translation**: A localized version of text content in a specific language
- **Theme_Settings**: Visual customization options including colors, fonts, CSS, logo, and backgrounds
- **Restaurant_Selector**: UI component for choosing which restaurant to manage
- **Menu_Selector**: UI component for choosing which menu to manage

## Requirements

### Requirement 1: Template Selection in Theme Customization

**User Story:** As a restaurant manager, I want to select which template to customize in the theme page, so that I can apply different visual styles to different templates.

#### Acceptance Criteria

1. WHEN the Theme_Customization_Page loads, THE Dashboard SHALL display a Template_Selector component
2. THE Template_Selector SHALL display all available templates from the Template_Registry
3. WHEN a user selects a template, THE Dashboard SHALL load the Theme_Settings for that template and the selected menu
4. THE Template_Selector SHALL appear after the Restaurant_Selector and Menu_Selector in the page layout
5. WHEN Theme_Settings are saved, THE Dashboard SHALL associate them with the selected template and menu combination
6. THE Dashboard SHALL persist the selected template choice in the Theme_Settings API request to `/restaurants/:id/theme`

### Requirement 2: Collapsible Side Navigation Menu

**User Story:** As a dashboard user, I want to collapse and expand the side navigation menu, so that I can maximize screen space for content when needed.

#### Acceptance Criteria

1. THE Side_Menu SHALL display a toggle button for collapsing and expanding
2. WHEN a user clicks the toggle button, THE Side_Menu SHALL transition between collapsed and expanded states
3. WHILE the Side_Menu is collapsed, THE Side_Menu SHALL display only icons without text labels
4. WHILE the Side_Menu is expanded, THE Side_Menu SHALL display both icons and text labels
5. THE Dashboard SHALL persist the Side_Menu state across page navigation within the same session
6. WHEN the Side_Menu state changes, THE Dashboard SHALL adjust the main content area width accordingly
7. THE Side_Menu SHALL animate the transition between collapsed and expanded states smoothly

### Requirement 3: Local Manual Translation Management

**User Story:** As a restaurant manager, I want to manually translate menu items and descriptions into multiple languages, so that I can provide professional, accurate translations for resort restaurant menus.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a translation management interface for Menu_Items
2. WHEN a user accesses a Menu_Item, THE Dashboard SHALL display all existing Translations for that item
3. THE Dashboard SHALL allow users to add a new Translation by specifying a language code
4. WHEN creating a Translation, THE Dashboard SHALL require translated values for the item name and description
5. THE Dashboard SHALL store Translations in the database associated with the Menu_Item
6. WHEN a menu is rendered, THE Template SHALL display the Translation matching the viewer's language preference
7. IF no Translation exists for the viewer's language, THEN THE Template SHALL display the original Menu_Item content
8. THE Dashboard SHALL allow users to edit existing Translations
9. THE Dashboard SHALL allow users to delete Translations
10. THE Dashboard SHALL support common language codes (en, es, fr, de, it, pt, ja, zh, ko, ar)

### Requirement 4: Template-Specific Theme Settings Storage

**User Story:** As a restaurant manager, I want theme customizations to be stored per template, so that each template can have its own unique visual styling.

#### Acceptance Criteria

1. THE Dashboard SHALL store Theme_Settings with a template identifier
2. WHEN retrieving Theme_Settings, THE Dashboard SHALL filter by restaurant, menu, and template
3. THE API endpoint `/restaurants/:id/theme` SHALL accept a `templateId` parameter
4. WHEN no Theme_Settings exist for a template, THE Dashboard SHALL display default values
5. THE Dashboard SHALL allow different color schemes for different templates on the same menu

### Requirement 5: Translation Data Model

**User Story:** As a system administrator, I want translations stored in a structured format, so that they can be efficiently queried and maintained.

#### Acceptance Criteria

1. THE Database SHALL store Translations with fields: id, menuItemId, languageCode, translatedName, translatedDescription, createdAt, updatedAt
2. THE Database SHALL enforce a unique constraint on the combination of menuItemId and languageCode
3. WHEN a Menu_Item is deleted, THE Database SHALL cascade delete all associated Translations
4. THE API SHALL provide endpoints for CRUD operations on Translations at `/menu-items/:id/translations`
