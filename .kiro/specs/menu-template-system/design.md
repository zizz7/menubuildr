# Design Document: Menu Template System

## Overview

The Menu Template System introduces a flexible templating architecture that allows restaurants to choose from multiple pre-built HTML menu templates when publishing their menus. This system extracts the current embedded template logic into a reusable "Classic" template and adds a new modern "Card-Based" template, while establishing the infrastructure for future custom templates.

### Key Design Goals

1. **Backward Compatibility**: Existing menus continue to work without modification
2. **Extensibility**: Architecture supports adding new templates without code changes
3. **Separation of Concerns**: Template logic separated from menu generation logic
4. **Performance**: Templates loaded efficiently with minimal overhead
5. **User Experience**: Simple template selection with live preview capability

### System Context

The Menu Template System integrates with:
- **Menu Generator Service**: Processes templates and generates HTML files
- **Dashboard UI**: Provides template selection and preview interfaces
- **Database**: Stores template metadata and menu-template associations
- **File System**: Stores template files (HTML, CSS, metadata)
- **Theme System**: Injects theme customization into templates

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Dashboard UI                          │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ Template Selector│────────▶│  Preview Modal          │  │
│  └──────────────────┘         └─────────────────────────┘  │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             │ API Calls                      │ Preview Request
             ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                       │
│  ┌──────────────────┐         ┌─────────────────────────┐  │
│  │ Template Routes  │         │  Menu Routes            │  │
│  │ GET /templates   │         │  POST /menus/:id/publish│  │
│  │ GET /templates/:s│         │  POST /menus/:id/preview│  │
│  └──────────────────┘         └─────────────────────────┘  │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    Template Engine                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐ │
│  │ Template Loader  │  │ Variable Injector│  │ Renderer  │ │
│  └──────────────────┘  └──────────────────┘  └───────────┘ │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
┌──────────────────────┐         ┌─────────────────────────┐
│   File System        │         │      Database           │
│  templates/menu/     │         │  MenuTemplate model     │
│  ├── classic.html    │         │  Menu.templateId        │
│  ├── classic.css     │         └─────────────────────────┘
│  ├── card-based.html │
│  └── ...             │
└──────────────────────┘
```

### Component Responsibilities

**Template Loader**
- Reads template files from filesystem
- Caches templates in memory for performance
- Validates template structure
- Handles missing template errors

**Variable Injector**
- Merges menu data into template placeholders
- Injects theme customization variables
- Processes multi-language content
- Resolves asset paths (images, fonts)

**Renderer**
- Combines HTML template with injected data
- Inlines CSS styles
- Generates final HTML output
- Handles error fallback to Classic template

**Template Selector Component**
- Fetches available templates from API
- Displays template cards with previews
- Manages template selection state
- Triggers preview generation

## Components and Interfaces

### Database Schema Changes

#### New Model: MenuTemplate

```prisma
model MenuTemplate {
  id              String   @id @default(uuid())
  slug            String   @unique
  name            Json     // Multi-language: { "ENG": "Classic", "CHN": "经典", ... }
  description     Json     // Multi-language descriptions
  previewImageUrl String   @map("preview_image_url")
  version         String   @default("1.0.0")
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  menus Menu[]

  @@map("menu_templates")
}
```

#### Updated Model: Menu

```prisma
model Menu {
  // ... existing fields ...
  templateId      String?  @map("template_id")
  
  // ... existing relations ...
  template        MenuTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)
}
```

### Migration Strategy

**Migration File**: `add_menu_template_system.sql`

```sql
-- Create MenuTemplate table
CREATE TABLE menu_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  name JSONB NOT NULL,
  description JSONB NOT NULL,
  preview_image_url VARCHAR(500) NOT NULL,
  version VARCHAR(50) DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add templateId to Menu table
ALTER TABLE menus ADD COLUMN template_id UUID REFERENCES menu_templates(id) ON DELETE SET NULL;

-- Seed default templates
INSERT INTO menu_templates (slug, name, description, preview_image_url, version) VALUES
('classic', 
 '{"ENG": "Classic", "CHN": "经典", "GER": "Klassisch", "JAP": "クラシック", "RUS": "Классический"}',
 '{"ENG": "Traditional menu layout with section navigation and detailed item cards", "CHN": "传统菜单布局，带有分区导航和详细项目卡", "GER": "Traditionelles Menülayout mit Abschnittsnavigation und detaillierten Artikelkarten", "JAP": "セクションナビゲーションと詳細なアイテムカードを備えた伝統的なメニューレイアウト", "RUS": "Традиционный макет меню с навигацией по разделам и подробными карточками товаров"}',
 '/template-previews/classic-preview.png',
 '1.0.0'),
('card-based',
 '{"ENG": "Card-Based", "CHN": "卡片式", "GER": "Kartenbasiert", "JAP": "カードベース", "RUS": "На основе карт"}',
 '{"ENG": "Modern grid layout with image-focused cards and responsive design", "CHN": "现代网格布局，以图像为中心的卡片和响应式设计", "GER": "Modernes Rasterlayout mit bildorientierten Karten und responsivem Design", "JAP": "画像重視のカードとレスポンシブデザインを備えたモダンなグリッドレイアウト", "RUS": "Современный макет сетки с карточками, ориентированными на изображения, и адаптивным дизайном"}',
 '/template-previews/card-based-preview.png',
 '1.0.0');

-- Associate existing published menus with Classic template
UPDATE menus 
SET template_id = (SELECT id FROM menu_templates WHERE slug = 'classic')
WHERE status = 'published';
```

### Template File Structure

#### Directory Layout

```
server/
└── templates/
    └── menu/
        ├── classic.html
        ├── classic.css
        ├── classic.meta.json
        ├── card-based.html
        ├── card-based.css
        ├── card-based.meta.json
        └── styles/
            ├── classic.css (symlink or copy)
            └── card-based.css (symlink or copy)

dashboard/
└── public/
    └── template-previews/
        ├── classic-preview.png
        └── card-based-preview.png
```

#### Template File Format

**HTML Template** (`{slug}.html`)
- Uses Handlebars-style placeholders: `{{variable}}`
- Supports conditionals: `{{#if condition}}...{{/if}}`
- Supports loops: `{{#each items}}...{{/each}}`
- Contains complete HTML structure from `<!DOCTYPE>` to `</html>`

**CSS Template** (`{slug}.css`)
- Contains all styles for the template
- Uses CSS custom properties for theme variables: `var(--primary-color)`
- Includes responsive media queries
- Self-contained (no external dependencies)

**Metadata File** (`{slug}.meta.json`)
```json
{
  "slug": "classic",
  "name": {
    "ENG": "Classic",
    "CHN": "经典"
  },
  "description": {
    "ENG": "Traditional menu layout with section navigation"
  },
  "previewImageUrl": "/template-previews/classic-preview.png",
  "version": "1.0.0",
  "author": "MenuMaster",
  "features": [
    "multi-language",
    "theme-customization",
    "allergen-filtering",
    "recipe-expansion",
    "section-navigation"
  ],
  "requiredData": [
    "restaurant.name",
    "restaurant.logo",
    "menu.sections",
    "menu.items"
  ]
}
```

### Template Variable Placeholders

Templates receive a context object with the following structure:

```typescript
interface TemplateContext {
  // Restaurant data
  restaurant: {
    name: string;
    slug: string;
    logoUrl: string | null;
    currency: string;
  };
  
  // Menu data
  menu: {
    id: string;
    name: Record<string, string>; // Multi-language
    slug: string;
    menuType: string;
    sections: Section[];
  };
  
  // Theme settings
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    customCss: string;
    customFontsUrls: string[];
    backgroundIllustrationUrl: string;
    coverPhotoUrl: string;
    coverPhotoPosition: string;
    coverPhotoSize: string;
    logoSize: number;
    sectionFontFamily: string;
    sectionFontSize: number;
    sectionBackgroundColor: string;
  };
  
  // Language data
  languages: Array<{
    code: string;
    name: string;
  }>;
  
  // Allergen data
  allergens: Array<{
    id: string;
    name: string;
    imageUrl: string;
    label: Record<string, string>;
  }>;
  
  // Settings
  allergenFilterMode: 'exclude' | 'include';
  
  // Helper functions
  helpers: {
    normalizeUrl: (url: string) => string;
    formatPrice: (price: number, currency: string) => string;
    getTranslation: (obj: Record<string, string>, lang: string) => string;
  };
}
```

## API Endpoints

### GET /api/templates

**Purpose**: Retrieve all active menu templates

**Request**:
```http
GET /api/templates
```

**Response** (200 OK):
```json
{
  "templates": [
    {
      "id": "uuid",
      "slug": "classic",
      "name": {
        "ENG": "Classic",
        "CHN": "经典"
      },
      "description": {
        "ENG": "Traditional menu layout..."
      },
      "previewImageUrl": "/template-previews/classic-preview.png",
      "version": "1.0.0"
    },
    {
      "id": "uuid",
      "slug": "card-based",
      "name": {
        "ENG": "Card-Based"
      },
      "description": {
        "ENG": "Modern grid layout..."
      },
      "previewImageUrl": "/template-previews/card-based-preview.png",
      "version": "1.0.0"
    }
  ]
}
```

### GET /api/templates/:slug

**Purpose**: Retrieve a specific template's metadata

**Request**:
```http
GET /api/templates/classic
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "slug": "classic",
  "name": {
    "ENG": "Classic",
    "CHN": "经典"
  },
  "description": {
    "ENG": "Traditional menu layout with section navigation and detailed item cards"
  },
  "previewImageUrl": "/template-previews/classic-preview.png",
  "version": "1.0.0",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Template not found"
}
```

### POST /api/menus/:id/publish

**Purpose**: Publish a menu with a selected template

**Request**:
```http
POST /api/menus/menu-uuid/publish
Content-Type: application/json

{
  "templateId": "template-uuid"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Menu published successfully",
  "htmlPath": "/menus/restaurant-slug/menu-slug.html",
  "templateUsed": "classic"
}
```

**Response** (200 OK with Warning - Fallback):
```json
{
  "success": true,
  "message": "Menu published with fallback template",
  "warning": "Selected template 'custom' not found. Used 'classic' template instead.",
  "htmlPath": "/menus/restaurant-slug/menu-slug.html",
  "templateUsed": "classic"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Invalid template ID"
}
```

### POST /api/menus/:id/preview

**Purpose**: Generate a temporary preview of a menu with a selected template

**Request**:
```http
POST /api/menus/menu-uuid/preview
Content-Type: application/json

{
  "templateId": "template-uuid"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "previewHtml": "<!DOCTYPE html><html>...</html>"
}
```

**Notes**:
- Preview HTML is returned directly in the response (not saved to filesystem)
- Preview uses current menu data and theme settings
- Preview generation uses the same template engine as publishing

## Template Engine Architecture

### Template Loading Mechanism

**TemplateLoader Class**

```typescript
class TemplateLoader {
  private templateCache: Map<string, Template> = new Map();
  private readonly templateDir = path.join(__dirname, '../templates/menu');
  
  async loadTemplate(slug: string): Promise<Template> {
    // Check cache first
    if (this.templateCache.has(slug)) {
      return this.templateCache.get(slug)!;
    }
    
    // Load from filesystem
    const htmlPath = path.join(this.templateDir, `${slug}.html`);
    const cssPath = path.join(this.templateDir, `${slug}.css`);
    const metaPath = path.join(this.templateDir, `${slug}.meta.json`);
    
    // Validate all files exist
    if (!fs.existsSync(htmlPath) || !fs.existsSync(cssPath) || !fs.existsSync(metaPath)) {
      throw new TemplateNotFoundError(`Template '${slug}' files not found`);
    }
    
    // Read files
    const html = await fs.promises.readFile(htmlPath, 'utf-8');
    const css = await fs.promises.readFile(cssPath, 'utf-8');
    const meta = JSON.parse(await fs.promises.readFile(metaPath, 'utf-8'));
    
    const template: Template = { slug, html, css, meta };
    
    // Cache for future use
    this.templateCache.set(slug, template);
    
    return template;
  }
  
  clearCache(): void {
    this.templateCache.clear();
  }
}
```

### Variable Injection System

**VariableInjector Class**

```typescript
class VariableInjector {
  injectVariables(template: string, context: TemplateContext): string {
    // Use Handlebars for template processing
    const compiled = Handlebars.compile(template);
    return compiled(context);
  }
  
  injectThemeVariables(css: string, theme: ThemeSettings): string {
    // Replace CSS custom properties with theme values
    let processedCss = css;
    
    processedCss = processedCss.replace(/var\(--primary-color\)/g, theme.primaryColor);
    processedCss = processedCss.replace(/var\(--secondary-color\)/g, theme.secondaryColor);
    processedCss = processedCss.replace(/var\(--accent-color\)/g, theme.accentColor);
    processedCss = processedCss.replace(/var\(--background-color\)/g, theme.backgroundColor);
    processedCss = processedCss.replace(/var\(--text-color\)/g, theme.textColor);
    
    // Append custom CSS
    if (theme.customCss) {
      processedCss += `\n\n/* Custom CSS */\n${theme.customCss}`;
    }
    
    return processedCss;
  }
}
```

### Theme Customization Integration

Theme settings are injected at two levels:

1. **CSS Variable Replacement**: Theme colors replace CSS custom properties
2. **Custom CSS Appending**: User's custom CSS is appended to template CSS
3. **Font URL Injection**: Custom font URLs are added to HTML `<head>`
4. **Background Images**: Cover photos and illustrations are injected as inline styles

### Error Handling and Fallback Logic

**Error Handling Flow**:

```
┌─────────────────────────┐
│ Load Selected Template  │
└───────────┬─────────────┘
            │
            ▼
    ┌───────────────┐
    │ Template      │───No──▶ Log Error ──▶ Load Classic Template
    │ Exists?       │
    └───────┬───────┘
            │ Yes
            ▼
    ┌───────────────┐
    │ Validate      │───Invalid──▶ Log Error ──▶ Load Classic Template
    │ Template      │
    └───────┬───────┘
            │ Valid
            ▼
    ┌───────────────┐
    │ Process       │───Exception──▶ Catch & Log ──▶ Load Classic Template
    │ Template      │
    └───────┬───────┘
            │ Success
            ▼
    ┌───────────────┐
    │ Return HTML   │
    └───────────────┘
```

**TemplateEngine Class with Error Handling**

```typescript
class TemplateEngine {
  private loader: TemplateLoader;
  private injector: VariableInjector;
  
  async renderTemplate(
    templateSlug: string,
    context: TemplateContext
  ): Promise<{ html: string; warning?: string }> {
    let actualTemplateSlug = templateSlug;
    let warning: string | undefined;
    
    try {
      // Try to load requested template
      const template = await this.loader.loadTemplate(templateSlug);
      
      // Inject variables into HTML
      const htmlWithData = this.injector.injectVariables(template.html, context);
      
      // Inject theme into CSS
      const cssWithTheme = this.injector.injectThemeVariables(template.css, context.theme);
      
      // Combine HTML and CSS
      const finalHtml = this.inlineCss(htmlWithData, cssWithTheme);
      
      return { html: finalHtml };
      
    } catch (error) {
      // Log the error
      console.error(`Template error for '${templateSlug}':`, error);
      
      // Fall back to Classic template
      if (templateSlug !== 'classic') {
        warning = `Template '${templateSlug}' failed to load. Using 'classic' template instead.`;
        actualTemplateSlug = 'classic';
        
        try {
          const classicTemplate = await this.loader.loadTemplate('classic');
          const htmlWithData = this.injector.injectVariables(classicTemplate.html, context);
          const cssWithTheme = this.injector.injectThemeVariables(classicTemplate.css, context.theme);
          const finalHtml = this.inlineCss(htmlWithData, cssWithTheme);
          
          return { html: finalHtml, warning };
        } catch (fallbackError) {
          throw new Error('Critical: Classic template also failed to load');
        }
      } else {
        throw new Error('Critical: Classic template failed to load');
      }
    }
  }
  
  private inlineCss(html: string, css: string): string {
    // Find </head> tag and insert <style> before it
    const styleTag = `<style>\n${css}\n</style>`;
    return html.replace('</head>', `${styleTag}\n</head>`);
  }
}
```

## Data Models

### TypeScript Interfaces

```typescript
interface Template {
  slug: string;
  html: string;
  css: string;
  meta: TemplateMetadata;
}

interface TemplateMetadata {
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  previewImageUrl: string;
  version: string;
  author?: string;
  features?: string[];
  requiredData?: string[];
}

interface MenuTemplateDB {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  previewImageUrl: string;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ThemeSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  customCss?: string;
  customFontsUrls: string[];
  backgroundIllustrationUrl?: string;
  coverPhotoUrl?: string;
  coverPhotoPosition?: string;
  coverPhotoSize?: string;
  logoSize?: number;
  sectionFontFamily?: string;
  sectionFontSize?: number;
  sectionBackgroundColor?: string;
}
```


## Frontend Components

### TemplateSelector Component

**Location**: `dashboard/components/menu/TemplateSelector.tsx`

**Purpose**: Allows users to select a template when publishing a menu

**Props**:
```typescript
interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onTemplateSelect: (templateId: string) => void;
  onPreview: (templateId: string) => void;
  menuId: string;
}
```

**Component Structure**:
```tsx
export function TemplateSelector({ 
  selectedTemplateId, 
  onTemplateSelect, 
  onPreview,
  menuId 
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchTemplates();
  }, []);
  
  const fetchTemplates = async () => {
    const response = await fetch('/api/templates');
    const data = await response.json();
    setTemplates(data.templates);
    setLoading(false);
  };
  
  return (
    <div className="template-selector">
      <h3>Select Menu Template</h3>
      <div className="template-grid">
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === selectedTemplateId}
            onSelect={() => onTemplateSelect(template.id)}
            onPreview={() => onPreview(template.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

### TemplateCard Component

**Location**: `dashboard/components/menu/TemplateCard.tsx`

**Purpose**: Displays a single template option with preview image

**Props**:
```typescript
interface TemplateCardProps {
  template: MenuTemplate;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}
```

**Component Structure**:
```tsx
export function TemplateCard({ 
  template, 
  isSelected, 
  onSelect, 
  onPreview 
}: TemplateCardProps) {
  const { language } = useLanguage(); // Dashboard language context
  
  return (
    <div 
      className={`template-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="template-preview">
        <img 
          src={template.previewImageUrl} 
          alt={template.name[language] || template.name.ENG}
        />
        {isSelected && (
          <div className="selected-badge">
            <CheckIcon /> Selected
          </div>
        )}
      </div>
      <div className="template-info">
        <h4>{template.name[language] || template.name.ENG}</h4>
        <p>{template.description[language] || template.description.ENG}</p>
        <button 
          className="preview-button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
        >
          Preview
        </button>
      </div>
    </div>
  );
}
```

### PreviewModal Component

**Location**: `dashboard/components/menu/PreviewModal.tsx`

**Purpose**: Displays a full-screen preview of the menu with selected template

**Props**:
```typescript
interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: string;
  templateId: string;
}
```

**Component Structure**:
```tsx
export function PreviewModal({ 
  isOpen, 
  onClose, 
  menuId, 
  templateId 
}: PreviewModalProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      generatePreview();
    }
  }, [isOpen, menuId, templateId]);
  
  const generatePreview = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/menus/${menuId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId })
      });
      const data = await response.json();
      setPreviewHtml(data.previewHtml);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal-content" onClick={e => e.stopPropagation()}>
        <div className="preview-modal-header">
          <h3>Menu Preview</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <div className="preview-modal-body">
          {loading ? (
            <div className="loading-spinner">Generating preview...</div>
          ) : (
            <iframe 
              srcDoc={previewHtml}
              title="Menu Preview"
              className="preview-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
}
```


## Template Implementations

### Classic Template Structure

The Classic template is extracted from the existing `menu-generator.ts` implementation.

**File**: `server/templates/menu/classic.html`

**Key Features**:
- Section-based navigation with tabs (mobile)
- Allergen legend with filtering
- Multi-language support
- Recipe expansion (collapsible ingredients)
- Theme customization support
- Responsive design

**Structure Overview**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{menu.name.ENG}}</title>
  {{#each theme.customFontsUrls}}
  <link rel="stylesheet" href="{{this}}">
  {{/each}}
  <!-- Google Fonts for fallback -->
  <link href="https://fonts.googleapis.com/css2?family=Eastwood&family=Lato:wght@400;700&display=swap" rel="stylesheet">
  <!-- CSS will be injected here -->
</head>
<body>
  <div class="container">
    <!-- Header with logo and language switcher -->
    <div class="header">
      {{#if restaurant.logoUrl}}
      <img src="{{restaurant.logoUrl}}" alt="{{restaurant.name}}" class="restaurant-logo" />
      {{/if}}
      <h1>{{menu.name.ENG}}</h1>
      <div class="language-switcher">
        <select id="language-select" onchange="switchLanguage(this.value)">
          {{#each languages}}
          <option value="{{code}}">{{name}} ({{code}})</option>
          {{/each}}
        </select>
      </div>
    </div>
    
    <!-- Sticky controls: section tabs + allergen legend -->
    <div class="sticky-controls">
      <div class="section-tabs-container">
        <div class="section-tabs">
          {{#each menu.sections}}
          <button class="section-tab" data-section-id="{{id}}">
            {{title.ENG}}
          </button>
          {{/each}}
        </div>
      </div>
      
      <div class="allergen-legend">
        {{#each allergens}}
        <div class="allergen-item" data-allergen="{{name}}">
          <img src="{{imageUrl}}" alt="{{label.ENG}}" />
          <span>{{label.ENG}}</span>
        </div>
        {{/each}}
      </div>
    </div>
    
    <!-- Menu sections -->
    <div class="menu-content">
      {{#each menu.sections}}
      <section class="menu-section" data-section-id="{{id}}">
        <h2 class="section-title">{{title.ENG}}</h2>
        
        <div class="menu-items">
          {{#each items}}
          <div class="menu-item" data-allergens="{{allergenNames}}">
            <div class="item-header">
              <div class="item-info">
                <h3 class="item-name">{{name.ENG}}</h3>
                {{#if description}}
                <p class="item-description">{{description.ENG}}</p>
                {{/if}}
              </div>
              {{#if price}}
              <div class="price">{{formatPrice price ../restaurant.currency}}</div>
              {{/if}}
            </div>
            
            {{#if imageUrl}}
            <img src="{{imageUrl}}" alt="{{name.ENG}}" class="item-image">
            {{/if}}
            
            <div class="item-footer">
              {{#each allergens}}
              <span class="item-allergen">
                <img src="{{imageUrl}}" alt="{{label.ENG}}" />
              </span>
              {{/each}}
            </div>
            
            {{#if recipeDetails}}
            <div class="item-expanded-content">
              <h4>Ingredients:</h4>
              <ul class="ingredients-list">
                {{#each recipeDetails.ingredients}}
                <li>{{quantity}} {{unit}} {{name}}</li>
                {{/each}}
              </ul>
            </div>
            {{/if}}
          </div>
          {{/each}}
        </div>
      </section>
      {{/each}}
    </div>
  </div>
  
  <!-- JavaScript for interactivity -->
  <script>
    // Language switching, allergen filtering, section navigation
    // (Extracted from current implementation)
  </script>
</body>
</html>
```

**File**: `server/templates/menu/classic.css`

The CSS is extracted directly from the current `generateHTML` function's embedded styles, with theme variables replaced by CSS custom properties.

### Card-Based Template Structure

**File**: `server/templates/menu/card-based.html`

**Key Features**:
- Grid-based layout (1/2/3 columns responsive)
- Image-focused cards with rounded corners
- Modern spacing and typography
- Section navigation cards
- All features from Classic template

**Structure Overview**:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{menu.name.ENG}}</title>
  {{#each theme.customFontsUrls}}
  <link rel="stylesheet" href="{{this}}">
  {{/each}}
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      {{#if restaurant.logoUrl}}
      <img src="{{restaurant.logoUrl}}" alt="{{restaurant.name}}" class="logo" />
      {{/if}}
      <h1 class="menu-title">{{menu.name.ENG}}</h1>
      <div class="language-selector">
        <select onchange="switchLanguage(this.value)">
          {{#each languages}}
          <option value="{{code}}">{{code}}</option>
          {{/each}}
        </select>
      </div>
    </header>
    
    <!-- Section Navigation Cards -->
    <nav class="section-nav">
      {{#each menu.sections}}
      <div class="section-nav-card" onclick="scrollToSection('{{id}}')">
        {{#if illustrationUrl}}
        <div class="section-nav-image" style="background-image: url('{{illustrationUrl}}')"></div>
        {{/if}}
        <h3>{{title.ENG}}</h3>
      </div>
      {{/each}}
    </nav>
    
    <!-- Allergen Filter Bar -->
    <div class="allergen-bar">
      {{#each allergens}}
      <button class="allergen-chip" data-allergen="{{name}}">
        <img src="{{imageUrl}}" alt="{{label.ENG}}" />
        <span>{{label.ENG}}</span>
      </button>
      {{/each}}
    </div>
    
    <!-- Menu Sections -->
    {{#each menu.sections}}
    <section id="section-{{id}}" class="menu-section">
      <h2 class="section-heading">{{title.ENG}}</h2>
      
      <div class="items-grid">
        {{#each items}}
        <article class="item-card" data-allergens="{{allergenNames}}">
          {{#if imageUrl}}
          <div class="item-image-wrapper">
            <img src="{{imageUrl}}" alt="{{name.ENG}}" class="item-image" />
            {{#if calories}}
            <div class="calories-badge">{{calories}} kcal</div>
            {{/if}}
          </div>
          {{/if}}
          
          <div class="item-content">
            <h3 class="item-title">{{name.ENG}}</h3>
            {{#if description}}
            <p class="item-description">{{description.ENG}}</p>
            {{/if}}
            
            <div class="item-meta">
              {{#if price}}
              <span class="item-price">{{formatPrice price ../restaurant.currency}}</span>
              {{/if}}
              
              {{#if allergens}}
              <div class="item-allergens">
                {{#each allergens}}
                <img src="{{imageUrl}}" alt="{{label.ENG}}" class="allergen-icon" />
                {{/each}}
              </div>
              {{/if}}
            </div>
            
            {{#if recipeDetails}}
            <button class="expand-recipe-btn" onclick="toggleRecipe(this)">
              View Ingredients
            </button>
            <div class="recipe-details" style="display: none;">
              <ul>
                {{#each recipeDetails.ingredients}}
                <li>{{quantity}} {{unit}} {{name}}</li>
                {{/each}}
              </ul>
            </div>
            {{/if}}
          </div>
        </article>
        {{/each}}
      </div>
    </section>
    {{/each}}
  </div>
  
  <script>
    // JavaScript for interactivity
  </script>
</body>
</html>
```

**File**: `server/templates/menu/card-based.css`

```css
:root {
  --primary-color: #000000;
  --secondary-color: #ffffff;
  --accent-color: #ff6b6b;
  --background-color: #f8f9fa;
  --text-color: #333333;
  --border-radius: 16px;
  --spacing-unit: 8px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background-color: var(--background-color);
  color: var(--text-color);
  line-height: 1.6;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: calc(var(--spacing-unit) * 3);
}

/* Header */
.header {
  text-align: center;
  padding: calc(var(--spacing-unit) * 4) 0;
  background: var(--secondary-color);
  border-radius: var(--border-radius);
  margin-bottom: calc(var(--spacing-unit) * 4);
}

.logo {
  max-width: 200px;
  max-height: 100px;
  margin-bottom: calc(var(--spacing-unit) * 2);
}

.menu-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: calc(var(--spacing-unit) * 2);
}

/* Section Navigation Cards */
.section-nav {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: calc(var(--spacing-unit) * 2);
  margin-bottom: calc(var(--spacing-unit) * 4);
}

.section-nav-card {
  background: var(--secondary-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-nav-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.section-nav-image {
  width: 100%;
  height: 120px;
  background-size: cover;
  background-position: center;
}

.section-nav-card h3 {
  padding: calc(var(--spacing-unit) * 2);
  text-align: center;
  font-size: 1.1rem;
  color: var(--primary-color);
}

/* Items Grid */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: calc(var(--spacing-unit) * 3);
  margin-bottom: calc(var(--spacing-unit) * 6);
}

.item-card {
  background: var(--secondary-color);
  border-radius: var(--border-radius);
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}

.item-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.item-image-wrapper {
  position: relative;
  width: 100%;
  height: 240px;
  overflow: hidden;
}

.item-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.calories-badge {
  position: absolute;
  top: calc(var(--spacing-unit) * 2);
  right: calc(var(--spacing-unit) * 2);
  background: rgba(16, 185, 129, 0.95);
  color: white;
  padding: calc(var(--spacing-unit) * 1) calc(var(--spacing-unit) * 2);
  border-radius: calc(var(--border-radius) / 2);
  font-size: 0.875rem;
  font-weight: 600;
}

.item-content {
  padding: calc(var(--spacing-unit) * 3);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--primary-color);
  margin-bottom: calc(var(--spacing-unit) * 1);
}

.item-description {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: calc(var(--spacing-unit) * 2);
  flex: 1;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.item-price {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-color);
}

.item-allergens {
  display: flex;
  gap: calc(var(--spacing-unit) * 1);
}

.allergen-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* Responsive Design */
@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
  
  .section-nav {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .items-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1025px) {
  .items-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```


## Integration Points

### menu-generator.ts Refactoring

**Current Structure**:
```typescript
// Current: All template logic embedded in generateHTML function
export function generateHTML(menu: MenuData, ...): string {
  // 1000+ lines of HTML template string
  return `<!DOCTYPE html>...`;
}
```

**Refactored Structure**:
```typescript
// New: Template engine handles template loading and processing
export async function generateMenuHTML(menuId: string): Promise<string> {
  // 1. Fetch menu data (unchanged)
  const menu = await prisma.menu.findUnique({ ... });
  
  // 2. Determine template to use
  const templateSlug = await getTemplateForMenu(menu);
  
  // 3. Prepare template context
  const context = await buildTemplateContext(menu);
  
  // 4. Render template
  const templateEngine = new TemplateEngine();
  const { html, warning } = await templateEngine.renderTemplate(templateSlug, context);
  
  // 5. Save HTML file (unchanged)
  const outputPath = path.join(outputDir, `${menu.slug}.html`);
  fs.writeFileSync(outputPath, html, 'utf-8');
  
  if (warning) {
    console.warn(warning);
  }
  
  return outputPath;
}

async function getTemplateForMenu(menu: MenuData): Promise<string> {
  // If menu has templateId, use it
  if (menu.templateId) {
    const template = await prisma.menuTemplate.findUnique({
      where: { id: menu.templateId }
    });
    if (template && template.isActive) {
      return template.slug;
    }
  }
  
  // Default to Classic template
  return 'classic';
}

async function buildTemplateContext(menu: MenuData): Promise<TemplateContext> {
  // Fetch all required data
  const languages = await prisma.language.findMany({ ... });
  const allergens = await prisma.allergenIcon.findMany({ ... });
  const allergenSettings = await prisma.allergenSettings.findFirst();
  
  // Build context object
  return {
    restaurant: {
      name: menu.restaurant.name,
      slug: menu.restaurant.slug,
      logoUrl: normalizeUrl(menu.restaurant.logoUrl),
      currency: menu.restaurant.currency,
    },
    menu: {
      id: menu.id,
      name: menu.name,
      slug: menu.slug,
      menuType: menu.menuType,
      sections: menu.sections,
    },
    theme: getThemeSettings(menu),
    languages,
    allergens: allergens.map(a => ({
      ...a,
      imageUrl: normalizeUrl(a.imageUrl)
    })),
    allergenFilterMode: allergenSettings?.filterMode || 'exclude',
    helpers: {
      normalizeUrl,
      formatPrice,
      getTranslation,
    },
  };
}
```

### Publish Workflow Updates

**Current Workflow**:
```
User clicks "Publish" → API call → generateMenuHTML() → HTML saved → Success
```

**Updated Workflow**:
```
User clicks "Publish" 
  → Template Selector appears
  → User selects template
  → API call with templateId
  → Store templateId in menu record
  → generateMenuHTML() with template
  → HTML saved
  → Success (or warning if fallback)
```

**Updated Publish Component**:
```tsx
// dashboard/components/menu/PublishMenuDialog.tsx
export function PublishMenuDialog({ menuId, isOpen, onClose }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>();
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string>();
  
  // Load last used template for this menu
  useEffect(() => {
    if (isOpen) {
      loadMenuTemplate();
    }
  }, [isOpen, menuId]);
  
  const loadMenuTemplate = async () => {
    const response = await fetch(`/api/menus/${menuId}`);
    const menu = await response.json();
    if (menu.templateId) {
      setSelectedTemplateId(menu.templateId);
    } else {
      // Default to Classic template
      const templatesResponse = await fetch('/api/templates');
      const { templates } = await templatesResponse.json();
      const classicTemplate = templates.find(t => t.slug === 'classic');
      if (classicTemplate) {
        setSelectedTemplateId(classicTemplate.id);
      }
    }
  };
  
  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/menus/${menuId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId })
      });
      
      const result = await response.json();
      
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success('Menu published successfully!');
      }
      
      onClose();
    } catch (error) {
      toast.error('Failed to publish menu');
    }
  };
  
  const handlePreview = (templateId: string) => {
    setPreviewTemplateId(templateId);
    setShowPreview(true);
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Publish Menu</DialogTitle>
      <DialogContent>
        <TemplateSelector
          selectedTemplateId={selectedTemplateId}
          onTemplateSelect={setSelectedTemplateId}
          onPreview={handlePreview}
          menuId={menuId}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handlePublish} 
          variant="contained"
          disabled={!selectedTemplateId}
        >
          Publish
        </Button>
      </DialogActions>
      
      {showPreview && previewTemplateId && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          menuId={menuId}
          templateId={previewTemplateId}
        />
      )}
    </Dialog>
  );
}
```

### Theme Settings Integration

Theme settings are integrated at the template rendering stage:

1. **Theme Resolution**: Menu-specific theme overrides restaurant theme
2. **CSS Variable Injection**: Theme colors replace CSS custom properties
3. **Custom CSS Appending**: User's custom CSS is appended to template CSS
4. **Font Loading**: Custom font URLs are injected into HTML head
5. **Background Images**: Cover photos and illustrations are applied as inline styles

**Theme Integration Flow**:
```typescript
function getThemeSettings(menu: MenuData): ThemeSettings {
  // Priority: Menu theme > Restaurant theme > Defaults
  const menuTheme = menu.themeSettings;
  const restaurantTheme = menu.restaurant.themeSettings;
  
  return {
    primaryColor: menuTheme?.primaryColor || restaurantTheme?.primaryColor || '#000000',
    secondaryColor: menuTheme?.secondaryColor || restaurantTheme?.secondaryColor || '#ffffff',
    accentColor: menuTheme?.accentColor || restaurantTheme?.accentColor || '#ff6b6b',
    backgroundColor: menuTheme?.backgroundColor || restaurantTheme?.backgroundColor || '#ffffff',
    textColor: menuTheme?.textColor || restaurantTheme?.textColor || '#000000',
    customCss: menuTheme?.customCss || restaurantTheme?.customCss || '',
    customFontsUrls: menuTheme?.customFontsUrls || restaurantTheme?.customFontsUrls || [],
    backgroundIllustrationUrl: normalizeUrl(
      menuTheme?.backgroundIllustrationUrl || restaurantTheme?.backgroundIllustrationUrl
    ),
    coverPhotoUrl: normalizeUrl(
      menuTheme?.coverPhotoUrl || restaurantTheme?.coverPhotoUrl
    ),
    coverPhotoPosition: menuTheme?.coverPhotoPosition || restaurantTheme?.coverPhotoPosition || 'center',
    coverPhotoSize: menuTheme?.coverPhotoSize || restaurantTheme?.coverPhotoSize || 'cover',
    logoSize: menuTheme?.logoSize || restaurantTheme?.logoSize || 100,
    sectionFontFamily: menuTheme?.sectionFontFamily || restaurantTheme?.sectionFontFamily || 'Eastwood, serif',
    sectionFontSize: menuTheme?.sectionFontSize || restaurantTheme?.sectionFontSize || 2,
    sectionBackgroundColor: menuTheme?.sectionBackgroundColor || restaurantTheme?.sectionBackgroundColor || '#ffffff',
  };
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

**Redundancy Analysis**:
1. Properties 1.2 and 1.3 (template file structure and naming) can be combined into a single property about template file completeness
2. Properties 5.2, 5.3, and 5.4 (merging data, applying CSS, injecting theme) are all aspects of template rendering and can be consolidated
3. Properties 10.1, 10.2, 10.3, and 10.4 (injecting various data types) are redundant with the consolidated rendering property
4. Properties 11.1, 11.2, and 11.3 (various error conditions) can be combined into a single error fallback property
5. Properties 3.7, 3.8, and 3.9 (responsive breakpoints) are CSS implementation details, not runtime properties

**Consolidated Properties**:
After removing redundancies, the following properties provide unique validation value:

### Property 1: Template File Completeness

*For any* template stored in the system, the template SHALL have all three required files (HTML, CSS, and metadata JSON) with correctly formatted names matching the pattern `{slug}.html`, `{slug}.css`, and `{slug}.meta.json`.

**Validates: Requirements 1.2, 1.3**

### Property 2: Template Metadata Structure

*For any* template metadata, it SHALL include all required fields: name (multi-language JSON), description (multi-language JSON), previewImageUrl (string), version (string), and timestamps (createdAt, updatedAt).

**Validates: Requirements 1.4, 1.5**

### Property 3: Default Template Fallback

*For any* menu without a specified templateId, the Menu Generator SHALL use the Classic template (slug: "classic") as the default.

**Validates: Requirements 2.3, 8.4, 9.3**

### Property 4: Template Rendering Completeness

*For any* menu and template combination, the rendered HTML SHALL contain: (1) all menu data (restaurant name, logo, sections, items, allergens), (2) all theme settings (colors, fonts, custom CSS), (3) all language data, (4) allergen filter mode settings, and (5) the template's CSS inlined in a `<style>` tag.

**Validates: Requirements 5.2, 5.3, 5.4, 10.1, 10.2, 10.3, 10.4, 12.3**

### Property 5: Menu Item Display Completeness

*For any* menu item rendered in the Card-Based template, the generated HTML SHALL contain elements for the item's image (if present), name, description (if present), price (if present), and allergen icons (if present).

**Validates: Requirements 3.4**

### Property 6: Active Template Filtering

*For any* set of templates in the database, the GET /api/templates endpoint SHALL return only templates where isActive is true.

**Validates: Requirements 7.3, 7.5**

### Property 7: Template Retrieval by Slug

*For any* valid template slug, the GET /api/templates/:slug endpoint SHALL return that template's complete metadata including id, slug, name, description, previewImageUrl, version, isActive, and timestamps.

**Validates: Requirements 7.4**

### Property 8: Template Association Persistence

*For any* menu published with a templateId, the Menu record in the database SHALL have its templateId field set to that template's ID.

**Validates: Requirements 4.5, 8.2, 8.5**

### Property 9: Template Selection Memory

*For any* menu that has been published with a template, re-publishing without specifying a template SHALL use the previously selected template (round-trip property).

**Validates: Requirements 4.6, 8.3**

### Property 10: Error Fallback Behavior

*For any* template processing error (missing file, invalid HTML, or exception), the Menu Generator SHALL: (1) log the error, (2) fall back to the Classic template, (3) successfully generate HTML, and (4) return a success response with a warning message.

**Validates: Requirements 5.5, 11.1, 11.2, 11.3, 11.4**

### Property 11: Preview Isolation

*For any* preview generation request, the system SHALL generate HTML using the current menu data and theme settings, but SHALL NOT save any files to the public directory (no side effects).

**Validates: Requirements 6.3, 6.4**

### Property 12: Template Selector Display Completeness

*For any* set of active templates, the Template Selector SHALL display all templates with their preview images and descriptions in the user's selected dashboard language.

**Validates: Requirements 4.2, 4.4**

### Property 13: Output File Path Consistency

*For any* menu published, the generated HTML file SHALL be saved to the path `dashboard/public/menus/{restaurant-slug}/{menu-slug}.html`.

**Validates: Requirements 5.6**

### Property 14: URL Normalization

*For any* relative asset path in a template (images, fonts), the Template Engine SHALL resolve it to an absolute path or keep external URLs (Cloudinary, etc.) unchanged.

**Validates: Requirements 10.5, 12.4**

### Property 15: Self-Contained HTML Output

*For any* generated HTML file, it SHALL be self-contained with all CSS embedded inline, requiring no external CSS files to render correctly.

**Validates: Requirements 12.5**

### Property 16: Backward Compatibility Preservation

*For any* existing menu, re-generating it with the Classic template SHALL produce HTML output that is functionally equivalent to the output from the previous embedded template system (same features, same structure).

**Validates: Requirements 2.5, 9.5**


## Error Handling

### Error Categories

**1. Template Loading Errors**
- Template file not found
- Template file corrupted or unreadable
- Metadata JSON parsing error

**Handling**: Log error, fall back to Classic template, return warning to user

**2. Template Processing Errors**
- Invalid Handlebars syntax
- Missing required variables
- Exception during rendering

**Handling**: Catch exception, log error, fall back to Classic template, return warning

**3. Database Errors**
- Template record not found
- Menu record not found
- Database connection failure

**Handling**: Return appropriate HTTP error code (404, 500), log error, provide user-friendly message

**4. File System Errors**
- Cannot write HTML file
- Directory creation failure
- Permission denied

**Handling**: Return 500 error, log error with full path, provide actionable error message

**5. API Errors**
- Invalid template ID in request
- Invalid menu ID in request
- Missing required parameters

**Handling**: Return 400 Bad Request with validation error details

### Error Response Format

**Success Response**:
```json
{
  "success": true,
  "message": "Menu published successfully",
  "htmlPath": "/menus/restaurant-slug/menu-slug.html",
  "templateUsed": "classic"
}
```

**Success with Warning (Fallback)**:
```json
{
  "success": true,
  "message": "Menu published with fallback template",
  "warning": "Template 'custom-template' failed to load: File not found. Used 'classic' template instead.",
  "htmlPath": "/menus/restaurant-slug/menu-slug.html",
  "templateUsed": "classic"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Template not found",
  "details": "Template with slug 'invalid-template' does not exist",
  "code": "TEMPLATE_NOT_FOUND"
}
```

### Logging Strategy

**Log Levels**:
- **ERROR**: Critical failures (Classic template fails, database errors)
- **WARN**: Fallback scenarios (template not found, processing errors)
- **INFO**: Normal operations (template loaded, menu published)
- **DEBUG**: Detailed processing info (variable injection, CSS processing)

**Log Format**:
```typescript
// Template loading
logger.info('Loading template', { slug: 'classic', menuId: 'uuid' });

// Template fallback
logger.warn('Template fallback triggered', {
  requestedTemplate: 'custom',
  fallbackTemplate: 'classic',
  reason: 'File not found',
  menuId: 'uuid'
});

// Critical error
logger.error('Classic template failed to load', {
  error: error.message,
  stack: error.stack,
  menuId: 'uuid'
});
```

### User-Facing Error Messages

**Dashboard Error Display**:
```tsx
// Success with warning
<Alert severity="warning">
  Menu published successfully, but the selected template could not be loaded.
  The Classic template was used instead.
</Alert>

// Error
<Alert severity="error">
  Failed to publish menu: {error.message}
  Please try again or contact support.
</Alert>
```

## Testing Strategy

### Dual Testing Approach

The Menu Template System requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Template file loading with specific slugs
- API endpoint responses with known data
- UI component rendering with mock data
- Error handling for specific error conditions
- Database seeding and migration verification

**Property-Based Tests**: Verify universal properties across all inputs
- Template rendering with randomly generated menu data
- URL normalization with various input formats
- Template fallback with various error conditions
- Multi-language support with random language combinations
- Theme injection with random color values

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript/JavaScript property-based testing

**Configuration**:
```typescript
import fc from 'fast-check';

// Configure all property tests to run minimum 100 iterations
fc.configureGlobal({
  numRuns: 100,
  verbose: true
});
```

**Test Tagging**: Each property test must reference its design document property

```typescript
describe('Menu Template System - Property Tests', () => {
  it('Property 1: Template File Completeness - For any template stored, all three files exist with correct naming', () => {
    // Feature: menu-template-system, Property 1: Template File Completeness
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => /^[a-z0-9-]+$/.test(s)),
        async (slug) => {
          await createTemplate(slug);
          
          const htmlExists = fs.existsSync(`server/templates/menu/${slug}.html`);
          const cssExists = fs.existsSync(`server/templates/menu/${slug}.css`);
          const metaExists = fs.existsSync(`server/templates/menu/${slug}.meta.json`);
          
          expect(htmlExists && cssExists && metaExists).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('Property 4: Template Rendering Completeness - For any menu and template, rendered HTML contains all required data', () => {
    // Feature: menu-template-system, Property 4: Template Rendering Completeness
    fc.assert(
      fc.property(
        menuDataArbitrary(),
        templateArbitrary(),
        async (menuData, template) => {
          const context = buildTemplateContext(menuData);
          const engine = new TemplateEngine();
          const { html } = await engine.renderTemplate(template.slug, context);
          
          // Verify all data is present in HTML
          expect(html).toContain(menuData.restaurant.name);
          expect(html).toContain('<style>'); // CSS inlined
          expect(html).toContain(context.theme.primaryColor);
          
          // Verify all sections and items are present
          menuData.sections.forEach(section => {
            expect(html).toContain(section.title.ENG);
            section.items.forEach(item => {
              expect(html).toContain(item.name.ENG);
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage

**Backend Tests** (`server/src/__tests__/`):
```
template-system/
├── template-loader.test.ts
│   - Load Classic template
│   - Load Card-Based template
│   - Handle missing template file
│   - Cache templates correctly
├── template-engine.test.ts
│   - Render template with menu data
│   - Inject theme variables
│   - Inline CSS correctly
│   - Handle rendering errors
├── template-routes.test.ts
│   - GET /api/templates returns active templates
│   - GET /api/templates/:slug returns template
│   - GET /api/templates/:slug returns 404 for invalid slug
├── menu-generator.test.ts
│   - Generate menu with Classic template
│   - Generate menu with Card-Based template
│   - Fall back to Classic on error
│   - Save HTML to correct path
└── migration.test.ts
    - Seed templates on startup
    - Associate existing menus with Classic
    - Add templateId field to Menu model
```

**Frontend Tests** (`dashboard/__tests__/`):
```
components/menu/
├── TemplateSelector.test.tsx
│   - Fetch and display templates
│   - Select template
│   - Remember last selected template
│   - Display in correct language
├── TemplateCard.test.tsx
│   - Display template info
│   - Highlight selected template
│   - Trigger preview
├── PreviewModal.test.tsx
│   - Generate preview on open
│   - Display preview HTML
│   - Close and return to selector
└── PublishMenuDialog.test.tsx
    - Load last used template
    - Publish with selected template
    - Handle publish errors
    - Display warnings
```

### Integration Tests

**End-to-End Workflow Tests**:
1. Create menu → Select template → Publish → Verify HTML file
2. Publish menu → Change template → Re-publish → Verify new template used
3. Publish menu → Delete template → Re-publish → Verify fallback to Classic
4. Preview menu with template → Verify no files created
5. Publish menu with invalid template → Verify fallback and warning

### Performance Testing

**Template Loading Performance**:
- Measure template cache hit rate
- Verify templates load in < 50ms from cache
- Verify templates load in < 200ms from filesystem

**Rendering Performance**:
- Measure HTML generation time for various menu sizes
- Target: < 500ms for menus with 100 items
- Target: < 1000ms for menus with 500 items

**API Response Times**:
- GET /api/templates: < 100ms
- GET /api/templates/:slug: < 50ms
- POST /api/menus/:id/publish: < 2000ms
- POST /api/menus/:id/preview: < 1500ms

