# Requirements Document

## Introduction

This document specifies requirements for adding two features to the Multi-Restaurant Menu Management System:

1. Template Selector in Theme Customization Page - allows users to select which template (Classic, Card-Based, or CoraFlow) they want to customize
2. Local Manual Translations for Menu Items - provides a UI for manually translating menu items and descriptions for each active language

These features enhance the system's flexibility by enabling per-template theme customization and professional manual translations instead of automated translation widgets.

## Glossary

- **Theme_Customization_Page**: The dashboard page at /dashboard/theme where users customize menu appearance
- **Template**: A menu layout style (Classic, Card-Based, or CoraFlow) registered in the template registry
- **Theme_Settings**: JSON object containing color, font, and styling configuration stored in Menu.themeSettings field
- **Menu_Item**: A dish or beverage entry with multilingual fields (name, description) stored as JSON objects
- **Active_Language**: A language marked as isActive=true in the Language table, available for translation
- **Translation_UI**: The user interface for manually entering translations for menu items
- **Template_Registry**: The server-side registry mapping template slugs to generator functions
- **Multilingual_Field**: A JSON field storing translations as key-value pairs (e.g., {ENG: "text", FRA: "texte"})
- **Published_Menu**: A menu with status="published" that has generated HTML output

## Requirements

### Requirement 1: Template Selection in Theme Customization

**User Story:** As a restaurant manager, I want to select which template I'm customizing in the theme page, so that I can apply different themes to different templates for the same menu.

#### Acceptance Criteria

1. WHEN THE Theme_Customization_Page loads, THE Template_Selector SHALL display all available templates from the Template_Registry
2. THE Template_Selector SHALL show template names (Classic, Card-Based, CoraFlow) in a dropdown or radio button group
3. WHEN a user selects a template, THE Theme_Customization_Page SHALL load theme settings specific to that template for the selected menu
4. THE Theme_Customization_Page SHALL display the currently selected template prominently in the UI
5. WHEN a user changes the selected template, THE Preview_Panel SHALL update to show the menu rendered with the newly selected template
6. THE System SHALL preserve existing theme settings when switching between templates

### Requirement 2: Per-Template Theme Settings Storage

**User Story:** As a restaurant manager, I want my theme customizations saved separately for each template, so that each template can have its own unique styling.

#### Acceptance Criteria

1. WHEN a user saves theme settings, THE System SHALL store the settings with a template identifier in Menu.themeSettings JSON field
2. THE Menu.themeSettings JSON SHALL include a templateId or template slug field to identify which template the settings apply to
3. WHEN loading theme settings for a menu, THE System SHALL retrieve settings matching the currently selected template
4. IF no theme settings exist for a selected template, THEN THE System SHALL use default theme values for that template
5. THE System SHALL maintain backward compatibility with existing menus that have theme settings without template identifiers

### Requirement 3: Template Selection Persistence

**User Story:** As a restaurant manager, I want the system to remember which template I'm using for each menu, so that the correct template is used when publishing.

#### Acceptance Criteria

1. WHEN a user selects a template for a menu, THE System SHALL store the selection in the Menu.templateId field
2. WHEN publishing a menu, THE Menu_Generator SHALL use the template specified in Menu.templateId
3. IF Menu.templateId is null, THEN THE Menu_Generator SHALL use the Classic template as default
4. THE Theme_Customization_Page SHALL display the currently active template for the selected menu on page load
5. WHEN a user changes the template selection, THE System SHALL update Menu.templateId immediately

### Requirement 4: Manual Translation UI for Menu Items

**User Story:** As a restaurant manager, I want to manually enter translations for menu items in all active languages, so that I can provide professional, context-appropriate translations instead of automated ones.

#### Acceptance Criteria

1. THE Translation_UI SHALL display all menu items for the selected menu in a list or table format
2. FOR EACH menu item, THE Translation_UI SHALL show editable fields for name and description in all Active_Languages
3. THE Translation_UI SHALL display the language code (ENG, FRA, CHN, etc.) next to each translation field
4. WHEN a user enters text in a translation field, THE System SHALL validate that the input is not empty for required fields
5. THE Translation_UI SHALL show the English (ENG) translation as a reference for other language translations
6. THE Translation_UI SHALL allow editing translations for multiple menu items without page navigation

### Requirement 5: Translation Data Persistence

**User Story:** As a restaurant manager, I want my manual translations saved to the database, so that they appear in published menus.

#### Acceptance Criteria

1. WHEN a user saves translations, THE System SHALL update the MenuItem.name JSON field with all provided name translations
2. WHEN a user saves translations, THE System SHALL update the MenuItem.description JSON field with all provided description translations
3. THE System SHALL preserve existing translations for languages not being edited
4. WHEN a translation field is left empty, THE System SHALL store null or omit that language key from the JSON object
5. THE System SHALL validate that at least the default language (ENG) has a translation before saving

### Requirement 6: Translation UI Language Filtering

**User Story:** As a restaurant manager, I want to see only active languages in the translation UI, so that I don't waste time translating for languages I'm not using.

#### Acceptance Criteria

1. WHEN THE Translation_UI loads, THE System SHALL query the Language table for all records where isActive=true
2. THE Translation_UI SHALL display translation fields only for Active_Languages
3. WHEN a language is deactivated, THE Translation_UI SHALL hide translation fields for that language
4. THE Translation_UI SHALL display languages in the order specified by Language.orderIndex
5. IF no Active_Languages exist, THEN THE Translation_UI SHALL display a message prompting the user to activate languages

### Requirement 7: Bulk Translation Operations

**User Story:** As a restaurant manager, I want to save translations for multiple menu items at once, so that I can work efficiently when translating large menus.

#### Acceptance Criteria

1. THE Translation_UI SHALL provide a "Save All" button that saves translations for all modified menu items
2. WHEN a user clicks "Save All", THE System SHALL update all modified menu items in a single transaction
3. THE System SHALL display a success message indicating how many items were updated
4. IF any translation fails validation, THEN THE System SHALL display an error message identifying the problematic item
5. THE Translation_UI SHALL track which items have unsaved changes and indicate them visually

### Requirement 8: Translation Preview and Validation

**User Story:** As a restaurant manager, I want to see how my translations will appear in the published menu, so that I can verify they look correct before publishing.

#### Acceptance Criteria

1. THE Translation_UI SHALL provide a preview button for each menu item
2. WHEN a user clicks preview, THE System SHALL display the menu item rendered with current translations
3. THE Preview SHALL show the item in all Active_Languages simultaneously or with a language switcher
4. THE System SHALL validate that translation text does not exceed reasonable length limits (e.g., 200 characters for names, 1000 for descriptions)
5. IF a translation is missing for an Active_Language, THEN THE Preview SHALL show the English fallback with a visual indicator

### Requirement 9: Menu Republishing After Translation Changes

**User Story:** As a restaurant manager, I want the published menu to update automatically after I save translations, so that customers see the latest translations immediately.

#### Acceptance Criteria

1. WHEN translations are saved for a Published_Menu, THE System SHALL trigger menu regeneration
2. THE Menu_Generator SHALL use the updated translations when regenerating the HTML
3. THE System SHALL display a notification when menu regeneration is complete
4. IF menu regeneration fails, THEN THE System SHALL display an error message and preserve the previous published version
5. THE System SHALL update the Menu.updatedAt timestamp when translations are saved

### Requirement 10: Template-Specific Theme Application

**User Story:** As a restaurant manager, I want theme settings to apply only to the selected template, so that switching templates doesn't lose my customizations.

#### Acceptance Criteria

1. WHEN rendering a menu preview, THE System SHALL apply theme settings matching the selected template
2. THE Menu_Generator SHALL retrieve theme settings filtered by template identifier
3. IF multiple template theme settings exist for a menu, THE System SHALL apply only the settings for the active template
4. THE System SHALL merge template-specific settings with restaurant-level default settings
5. WHEN a template has no custom theme settings, THE System SHALL use the template's default theme values
