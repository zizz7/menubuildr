import fs from 'fs';
import path from 'path';
import prisma from '../config/database';
import { syncUploadsToPublic } from '../utils/sync-uploads';
import { getTemplateGenerator } from './template-registry';

interface MenuData {
  id: string;
  name: Record<string, string>;
  slug: string;
  menuType: string;
  restaurant: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    logoUrl?: string | null;
    logoPosition?: string | null;
    themeSettings?: {
      primaryColor: string;
      secondaryColor: string;
      accentColor: string;
      backgroundColor: string;
      textColor: string;
      customCss?: string;
      customFontsUrls: string[];
      backgroundIllustrationUrl?: string;
      backgroundIllustrationOpacity?: number;
      navDrawerStyle?: string;
      navDrawerBgUrl?: string;
      navDrawerBgOpacity?: number;
      navDrawerCategoryImages?: Record<string, string>;
      coverPhotoUrl?: string;
      coverPhotoPosition?: string;
      coverPhotoSize?: string;
    };
  };
  sections: Array<{
    id: string;
    title: Record<string, string>;
    description?: Record<string, string> | null;
    parentSectionId?: string | null;
    illustrationUrl?: string;
    illustrationAsBackground?: boolean;
    illustrationPosition?: string;
    illustrationSize?: string;
    subSections?: Array<{
      id: string;
      title: Record<string, string>;
      description?: Record<string, string> | null;
      illustrationUrl?: string;
      illustrationAsBackground?: boolean;
      illustrationPosition?: string;
      illustrationSize?: string;
      items: Array<{
        id: string;
        name: Record<string, string>;
        description?: Record<string, string>;
        price: number | null;
        calories?: number | null;
        imageUrl?: string;
        isAvailable: boolean;
        allergens: Array<{
          name: string;
          imageUrl: string;
          label: Record<string, string>;
        }>;
        recipeDetails?: {
          ingredients: Array<{ name: string; quantity: number; unit: string }>;
          servings?: number;
        };
        priceVariations?: Array<{
          variationName: string;
          price: number;
        }>;
      }>;
    }>;
    items: Array<{
      id: string;
      name: Record<string, string>;
      description?: Record<string, string>;
      price: number | null;
      calories?: number | null;
      imageUrl?: string;
      isAvailable: boolean;
      allergens: Array<{
        name: string;
        imageUrl: string;
        label: Record<string, string>;
      }>;
      recipeDetails?: {
        ingredients: Array<{ name: string; quantity: number; unit: string }>;
        instructions?: string;
        servings?: number;
      };
      priceVariations?: Array<{
        variationName: string;
        price: number;
      }>;
    }>;
  }>;
}

export async function generateMenuHTML(menuId: string): Promise<string> {
  // Fetch menu with all related data
  // Note: restaurant.logoUrl is automatically included from the Restaurant model
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          slug: true,
          currency: true,
          logoUrl: true,
          logoPosition: true,
          themeSettings: true,
          // adminId is intentionally excluded to prevent leaking admin data in public menu HTML
        },
      },
      template: true, // Include the associated template
      sections: {
        where: { parentSectionId: null }, // Only top-level sections
        include: {
          subSections: {
            include: {
              items: {
                include: {
                  allergens: true,
                  recipeDetails: true,
                  priceVariations: {
                    orderBy: { orderIndex: 'asc' },
                  },
                },
                where: { isAvailable: true },
                orderBy: { orderIndex: 'asc' },
              },
            },
            orderBy: { orderIndex: 'asc' },
          },
          items: {
            include: {
              allergens: true,
              recipeDetails: true,
              priceVariations: {
                orderBy: { orderIndex: 'asc' },
              },
            },
            where: { isAvailable: true },
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!menu) {
    throw new Error('Menu not found');
  }

  const menuData = menu as any as MenuData;

  // Fetch all active languages
  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { orderIndex: 'asc' },
  });

  // Fetch all allergen icons for legend
  const allergens = await prisma.allergenIcon.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  // Fetch allergen filter mode setting
  const allergenSettings = await prisma.allergenSettings.findFirst();
  const filterMode = (allergenSettings?.filterMode === 'include' ? 'include' : 'exclude') as 'exclude' | 'include';

  // Generate HTML - format allergens with imageUrl
  const allergensFormatted = allergens
    .filter(a => a.imageUrl && a.imageUrl.trim())
    .map(a => {
      let imageUrl = a.imageUrl.trim();
      if (imageUrl.includes('localhost') && imageUrl.includes('/uploads/')) {
        try { const urlObj = new URL(imageUrl); imageUrl = urlObj.pathname; } catch { const match = imageUrl.match(/\/uploads\/.*/); if (match) imageUrl = match[0]; }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        if (imageUrl.includes('localhost')) {
          try { const urlObj = new URL(imageUrl); imageUrl = urlObj.pathname; } catch { /* fall through */ }
        }
      } else if (!imageUrl.startsWith('/')) {
        imageUrl = `/${imageUrl}`;
      }
      return { id: a.id, name: a.name, imageUrl, label: (a.label as Record<string, string>) || {} };
    });

  // Determine which template to use
  let templateSlug = 'classic'; // default
  let warning: string | undefined;
  
  if ((menu as any).template?.slug) {
    templateSlug = (menu as any).template.slug;
  } else if ((menu as any).templateId) {
    // Template ID exists but template wasn't loaded (maybe deleted)
    const tmpl = await prisma.menuTemplate.findUnique({ where: { id: (menu as any).templateId } });
    if (tmpl && tmpl.isActive) {
      templateSlug = tmpl.slug;
    }
  }

  // Get the template generator function
  let generator = getTemplateGenerator(templateSlug);
  if (!generator) {
    console.warn(`Template '${templateSlug}' not found in registry, falling back to classic`);
    warning = `Template '${templateSlug}' not found. Used 'classic' template instead.`;
    generator = getTemplateGenerator('classic')!;
    templateSlug = 'classic';
  }

  const html = generator(menuData, languages, allergensFormatted, undefined, filterMode);

  // Sync uploads to public directory
  syncUploadsToPublic();

  // Write to server-local menus directory (served via Express static route)
  const outputDir = path.join(process.cwd(), 'menus', menuData.restaurant.slug);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write HTML file
  const outputPath = path.join(outputDir, `${menuData.slug}.html`);
  fs.writeFileSync(outputPath, html, 'utf-8');

  if (warning) {
    console.warn(warning);
  }

  return outputPath;
}

export function generateHTML(
  menu: MenuData,
  languages: Array<{ code: string; name: string }>,
  allergens: Array<{ id: string; name: string; imageUrl: string; label: Record<string, string> }>,
  themeOverrides?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    customCss?: string;
    customFontsUrls?: string[];
    backgroundIllustrationUrl?: string;
    backgroundIllustrationOpacity?: number;
    navDrawerStyle?: string;
    navDrawerBgUrl?: string;
    navDrawerBgOpacity?: number;
    navDrawerCategoryImages?: Record<string, string>;
    coverPhotoUrl?: string;
    coverPhotoPosition?: string;
    coverPhotoSize?: string;
    logoSize?: number;
    sectionFontFamily?: string;
    sectionFontSize?: number;
    sectionBackgroundColor?: string;
  },
  filterMode: 'exclude' | 'include' = 'exclude',
  baseUrl?: string // Optional base URL for preview (converts relative paths to absolute)
): string {
  // Check if menu has menu-specific theme settings, otherwise use restaurant theme
  const menuThemeSettings = (menu as any).themeSettings;
  const restaurantTheme = menu.restaurant.themeSettings;
  
  // Helper function to normalize URLs (keep external URLs like Cloudinary, ensure relative paths start with /)
  // If baseUrl is provided (for preview), convert relative paths to absolute URLs
  // Cloudinary URLs (https://res.cloudinary.com/...) are kept as-is
  // Localhost URLs are converted to relative paths for static file generation
  const normalizeUrl = (url: string | null | undefined): string => {
    if (!url || !url.trim()) return '';
    const trimmedUrl = url.trim();
    
    // Check if it's a localhost URL pointing to uploads - convert to relative path
    if (trimmedUrl.includes('localhost') && trimmedUrl.includes('/uploads/')) {
      try {
        const urlObj = new URL(trimmedUrl);
        // Extract the pathname (e.g., /uploads/logo/file.jpg)
        return urlObj.pathname;
      } catch {
        // If URL parsing fails, extract path manually
        const match = trimmedUrl.match(/\/uploads\/.*/);
        if (match) return match[0];
      }
    }
    
    // Keep external URLs as-is (including Cloudinary URLs, but not localhost)
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      // Only keep if it's not localhost
      if (!trimmedUrl.includes('localhost')) {
        return trimmedUrl;
      }
      // If it's localhost, extract path
      try {
        const urlObj = new URL(trimmedUrl);
        return urlObj.pathname;
      } catch {
        // Fall through to relative path handling
      }
    }
    
    // Ensure relative paths start with /
    let normalizedUrl = trimmedUrl;
    if (!normalizedUrl.startsWith('/')) {
      normalizedUrl = `/${normalizedUrl}`;
    }
    // If baseUrl is provided (for preview), convert to absolute URL
    if (baseUrl) {
      // Remove trailing slash from baseUrl if present
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBaseUrl}${normalizedUrl}`;
    }
    // Otherwise, return relative path
    return normalizedUrl;
  };

  // Use theme overrides first, then menu-specific theme, then restaurant theme, then defaults
  const baseTheme = menuThemeSettings ? {
    primaryColor: menuThemeSettings.primaryColor,
    secondaryColor: menuThemeSettings.secondaryColor,
    accentColor: menuThemeSettings.accentColor,
    backgroundColor: menuThemeSettings.backgroundColor,
    textColor: menuThemeSettings.textColor,
    customCss: menuThemeSettings.customCss || '',
    customFontsUrls: menuThemeSettings.customFontsUrls || [],
    backgroundIllustrationUrl: normalizeUrl(menuThemeSettings.backgroundIllustrationUrl),
    backgroundIllustrationOpacity: menuThemeSettings.backgroundIllustrationOpacity ?? 30,
    coverPhotoUrl: normalizeUrl(menuThemeSettings.coverPhotoUrl),
    coverPhotoPosition: menuThemeSettings.coverPhotoPosition || 'center',
    coverPhotoSize: menuThemeSettings.coverPhotoSize || 'cover',
    logoSize: menuThemeSettings.logoSize || 100,
    sectionFontFamily: menuThemeSettings.sectionFontFamily || 'Eastwood, serif',
    sectionFontSize: menuThemeSettings.sectionFontSize || 2,
    sectionBackgroundColor: menuThemeSettings.sectionBackgroundColor || '#ffffff',
  } : (restaurantTheme ? {
    primaryColor: restaurantTheme.primaryColor,
    secondaryColor: restaurantTheme.secondaryColor,
    accentColor: restaurantTheme.accentColor,
    backgroundColor: restaurantTheme.backgroundColor,
    textColor: restaurantTheme.textColor,
    customCss: restaurantTheme.customCss || '',
    customFontsUrls: restaurantTheme.customFontsUrls || [],
    backgroundIllustrationUrl: normalizeUrl(restaurantTheme.backgroundIllustrationUrl),
    backgroundIllustrationOpacity: (restaurantTheme as any).backgroundIllustrationOpacity ?? 30,
    coverPhotoUrl: normalizeUrl(restaurantTheme.coverPhotoUrl),
    coverPhotoPosition: restaurantTheme.coverPhotoPosition || 'center',
    coverPhotoSize: restaurantTheme.coverPhotoSize || 'cover',
    logoSize: (restaurantTheme as any).logoSize || 100,
    sectionFontFamily: (restaurantTheme as any).sectionFontFamily || 'Eastwood, serif',
    sectionFontSize: (restaurantTheme as any).sectionFontSize || 2,
    sectionBackgroundColor: (restaurantTheme as any).sectionBackgroundColor || '#ffffff',
  } : {
    primaryColor: '#000000',
    secondaryColor: '#ffffff',
    accentColor: '#ff6b6b',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    customCss: '',
    customFontsUrls: [],
    backgroundIllustrationUrl: '',
    backgroundIllustrationOpacity: 30,
    coverPhotoUrl: '',
    coverPhotoPosition: 'center',
    coverPhotoSize: 'cover',
    logoSize: 100,
    sectionFontFamily: 'Eastwood, serif',
    sectionFontSize: 2,
    sectionBackgroundColor: '#ffffff',
  });

  // Apply theme overrides if provided
  // Normalize cover photo URL in overrides
  const processedOverrides = themeOverrides ? {
    ...themeOverrides,
    coverPhotoUrl: themeOverrides.coverPhotoUrl ? normalizeUrl(themeOverrides.coverPhotoUrl) : themeOverrides.coverPhotoUrl,
    backgroundIllustrationUrl: themeOverrides.backgroundIllustrationUrl ? normalizeUrl(themeOverrides.backgroundIllustrationUrl) : themeOverrides.backgroundIllustrationUrl,
  } : undefined;

  const theme = processedOverrides ? {
    ...baseTheme,
    ...processedOverrides,
  } : baseTheme;

  // Get restaurant logo URL from the restaurant settings
  // This uses the same logoUrl that's set in the restaurant dashboard
  let logoUrl = menu.restaurant.logoUrl;
  if (logoUrl) {
    // Normalize URL (keep external URLs, ensure relative paths start with /)
    logoUrl = normalizeUrl(logoUrl);
  }

  // Generate font links
  const fontLinks = theme.customFontsUrls
    .map((url: string) => `<link rel="stylesheet" href="${url}">`)
    .join('\n    ');

  // Generate allergen legend
  const allergenLegend = allergens
    .map((allergen) => {
      // Normalize imageUrl (should already be normalized from allergensFormatted, but ensure it)
      const imageUrl = normalizeUrl(allergen.imageUrl);
      return `
      <div class="allergen-item" data-allergen="${allergen.name}">
        <button class="allergen-close-btn" onclick="event.stopPropagation(); filterByAllergen('${allergen.name}')" aria-label="Remove ${allergen.label['ENG'] || allergen.name} filter">×</button>
        <div class="allergen-icon"><img src="${imageUrl}" alt="${allergen.label['ENG'] || allergen.name}" /></div>
        <span class="allergen-label" data-lang="ENG">${allergen.label['ENG'] || allergen.name}</span>
        ${languages
          .filter((l) => l.code !== 'ENG')
          .map(
            (lang) =>
              `<span class="allergen-label" data-lang="${lang.code}" style="display: none;">${allergen.label[lang.code] || allergen.name}</span>`
          )
          .join('')}
      </div>`;
    })
    .join('\n');

  // Generate language switcher - store full name in data attribute for JavaScript
  const languageOptions = languages
    .map(
      (lang) =>
        `<option value="${lang.code}" data-full-name="${lang.name}">${lang.name} (${lang.code})</option>`
    )
    .join('\n          ');

  // Generate section tabs for mobile
  const sectionTabs = menu.sections
    .map((section, index) => {
      const sectionTitle = Object.keys(section.title)
        .map(
          (lang) =>
            `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${section.title[lang]}</span>`
        )
        .join('');
      return `
      <button class="section-tab ${index === 0 ? 'active' : ''}" data-section-id="${section.id}" onclick="showSection('${section.id}')">
        ${sectionTitle}
      </button>`;
    })
    .join('');

  // Helper function to generate items HTML
  const generateItemsHTML = (items: any[]) => {
    return items
        .map((item) => {
          // Normalize allergen image URLs (use relative paths)
          const allergenIcons = item.allergens && item.allergens.length > 0
            ? item.allergens
                .filter((allergen: any) => allergen.imageUrl && allergen.imageUrl.trim())
                .map((allergen: any) => {
                  const imageUrl = normalizeUrl(allergen.imageUrl.trim());
                  return `<span class="item-allergen" data-allergen="${allergen.name}" title="${allergen.label?.['ENG'] || allergen.name}"><img src="${imageUrl}" alt="${allergen.label?.['ENG'] || allergen.name}" /></span>`;
                })
                .join('')
            : '';

          const priceVariations =
            item.priceVariations && item.priceVariations.length > 0
              ? `<div class="price-variations">
                  ${item.priceVariations
                    .map(
                      (pv: any) => `<span class="price-variation">${pv.variationName}: $${pv.price.toFixed(2)}</span>`
                    )
                    .join(' ')}
                </div>`
              : item.price && item.price > 0
              ? `<div class="price">$${item.price.toFixed(2)}</div>`
              : '';

          const itemName = Object.keys(item.name)
            .map((lang) => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${item.name[lang]}</span>`)
            .join('');

          const caloriesHtml =
            typeof item.calories === 'number' && item.calories > 0
              ? `<div class="item-calories-badge"><span class="calories-value">${Math.round(item.calories)}</span><span class="calories-unit">kcal</span></div>`
              : '';

          const itemDesc = item.description
            ? Object.keys(item.description)
                .map(
                  (lang) =>
                    `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${item.description![lang]}</span>`
                )
                .join('')
            : '';

          // Normalize item image URL (use relative paths)
          const itemImageUrl = item.imageUrl ? normalizeUrl(item.imageUrl) : null;

          // Check if ingredients exist (can be array or object)
          let hasIngredients = false;
          let ingredientsContent = '';
          
          if (item.recipeDetails?.ingredients) {
            const ing = item.recipeDetails.ingredients;
            if (Array.isArray(ing) && ing.length > 0) {
              hasIngredients = true;
              ingredientsContent = `<ul class="ingredients-list">
                ${ing.map((ingItem: any) => {
                  const parts = [];
                  if (ingItem.quantity != null) parts.push(ingItem.quantity);
                  if (ingItem.unit) parts.push(ingItem.unit);
                  if (ingItem.name) parts.push(ingItem.name);
                  return `<li>${parts.join(' ')}</li>`;
                }).join('')}
              </ul>`;
            } else if (typeof ing === 'object' && ing !== null) {
              // Check if it's a multi-language text object with content
              const values = Object.values(ing);
              if (values.some((v: any) => v && typeof v === 'string' && v.trim().length > 0)) {
                hasIngredients = true;
                ingredientsContent = Object.keys(ing)
                  .map((lang) => `<div data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${(ing as any)[lang] || ''}</div>`)
                  .join('');
              }
            }
          }

          // Make card expandable if ingredients exist
          const expandableClass = hasIngredients ? 'menu-item-expandable' : '';
          const expandIcon = hasIngredients ? '<span class="expand-icon">▶</span>' : '';
          const onClickHandler = hasIngredients ? 'onclick="toggleItemCard(this)"' : '';

          // Resolve ingredients label (multi-language or default "Ingredients:")
          const ingLabel = item.recipeDetails?.ingredientsLabel;
          const ingredientsLabelHtml = (ingLabel && typeof ingLabel === 'object' && Object.keys(ingLabel).length > 0)
            ? Object.keys(ingLabel).map((lang: string) => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${(ingLabel as any)[lang] || 'Ingredients:'}</span>`).join('')
            : 'Ingredients:';
          
          return `
          <div class="menu-item ${expandableClass}" data-allergens="${item.allergens && item.allergens.length > 0 ? item.allergens.map((a: any) => a.name).join(',') : ''}" ${onClickHandler}>
            ${caloriesHtml}
            <div class="item-header">
              <div class="item-info">
                <h3 class="item-name">${expandIcon}${itemName}</h3>
                ${itemDesc ? `<p class="item-description">${itemDesc}</p>` : ''}
              </div>
              ${priceVariations}
            </div>
            ${itemImageUrl ? `<img src="${itemImageUrl}" alt="${item.name['ENG']}" class="item-image">` : ''}
            <div class="item-footer">
              ${allergenIcons}
            </div>
            ${hasIngredients ? `
            <div class="item-expanded-content">
              <div class="ingredients-expanded">
                <h4 class="ingredients-title">${ingredientsLabelHtml}</h4>
                <div class="ingredients-text">
                  ${ingredientsContent}
                </div>
              </div>
            </div>` : ''}
          </div>`;
        })
        .join('');
  };

  // Generate sections HTML
  const sectionsHTML = menu.sections
    .map((section, index) => {
      const itemsHTML = generateItemsHTML(section.items || []);
      
      // Generate sub-sections HTML if they exist
      const subSectionsHTML = (section.subSections || [])
        .map((subSection: any) => {
          const subSectionTitle = Object.keys(subSection.title)
            .map(
              (lang) =>
                `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${subSection.title[lang]}</span>`
            )
            .join('');
          
          const subSectionItemsHTML = generateItemsHTML(subSection.items || []);
          
          return `
          <div class="sub-section" data-subsection-id="${subSection.id}">
            <h3 class="sub-section-title">${subSectionTitle}</h3>
            <div class="menu-items">
              ${subSectionItemsHTML}
            </div>
          </div>`;
        })
        .join('');

      const sectionTitle = Object.keys(section.title)
        .map(
          (lang) =>
            `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display: none;"'}>${section.title[lang]}</span>`
        )
        .join('');

      // Handle section illustration based on display mode
      let sectionStyle = '';
      let illustrationHtml = '';
      
      // Get section background color from theme (default to white if not set)
      const sectionBgColor = (theme as any).sectionBackgroundColor || '#ffffff';
      
      if (section.illustrationUrl && !section.illustrationUrl.includes('<svg')) {
        // Image URL, normalize to relative path
        const illustrationUrl = normalizeUrl(section.illustrationUrl);

        if (section.illustrationAsBackground) {
          // Use as background - include both background color and background image
          const position = section.illustrationPosition || 'center';
          const size = section.illustrationSize || 'fit';
          
          let backgroundSize = size === 'fullscreen' ? 'cover' : 'contain';
          let backgroundPosition = position === 'left' ? 'left center' : position === 'right' ? 'right center' : 'center';
          
          sectionStyle = `style="background-color: ${sectionBgColor} !important; background-image: url('${illustrationUrl}'); background-size: ${backgroundSize}; background-position: ${backgroundPosition}; background-repeat: no-repeat; position: relative;"`;
        } else {
          // Use as regular image - still set background color
          sectionStyle = `style="background-color: ${sectionBgColor} !important;"`;
          illustrationHtml = `<div class="section-illustration"><img src="${illustrationUrl}" alt="Section illustration"></div>`;
        }
      } else if (section.illustrationUrl && section.illustrationUrl.includes('<svg')) {
        // SVG code, use as-is (not as background) - still set background color
        sectionStyle = `style="background-color: ${sectionBgColor} !important;"`;
        illustrationHtml = `<div class="section-illustration">${section.illustrationUrl}</div>`;
      } else {
        // No illustration - just set background color
        sectionStyle = `style="background-color: ${sectionBgColor} !important;"`;
      }

      return `
      <section class="menu-section" data-section-id="${section.id}" ${sectionStyle}>
        ${section.illustrationAsBackground ? '<div class="section-overlay"></div>' : ''}
        <div class="section-content">
          <div class="section-header">
            <h2 class="section-title desktop-only">${sectionTitle}</h2>
            ${!section.illustrationAsBackground ? illustrationHtml : ''}
          </div>
          <div class="menu-items">
            ${itemsHTML}
          </div>
          ${subSectionsHTML}
        </div>
      </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${menu.name['ENG'] || 'Menu'}</title>
  ${fontLinks}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Eastwood&family=Lato:wght@400;700&family=Mallory+MP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-color: ${theme.primaryColor};
      --secondary-color: ${theme.secondaryColor};
      --accent-color: ${theme.accentColor};
      --background-color: ${theme.backgroundColor};
      --text-color: ${theme.textColor};
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      height: auto;
      overflow-x: hidden;
    }

    body {
      font-family: 'Lato', sans-serif;
      background-color: var(--background-color);
      color: var(--text-color);
      line-height: 1.6;
      padding: 20px;
      height: auto;
      min-height: 100vh;
      overflow-x: hidden;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: var(--secondary-color);
      border-radius: 10px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: visible;
      height: auto;
    }

    .menu-content {
      height: auto;
      overflow: visible;
    }

    .header {
      ${theme.coverPhotoUrl 
        ? `background-image: url('${theme.coverPhotoUrl}');
      background-size: ${theme.coverPhotoSize === 'fullscreen' ? '100% 100%' : theme.coverPhotoSize === 'fit' ? 'contain' : theme.coverPhotoSize || 'cover'};
      background-position: ${theme.coverPhotoPosition || 'center'};
      background-repeat: no-repeat;
      position: relative;` 
        : `background: var(--primary-color);`}
      color: var(--secondary-color);
      padding: 25px 30px 10px 30px;
      text-align: center;
    }
    
    ${theme.coverPhotoUrl ? `
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.3);
      z-index: 0;
    }
    
    .header > * {
      position: relative;
      z-index: 1;
    }` : ''}

    .header h1 {
      font-family: 'Eastwood', serif;
      font-size: 2em;
      margin-bottom: 0;
    }

    .language-switcher {
      margin-top: 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }

    .language-switcher-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      padding: 4px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .language-switcher-wrapper:hover {
      box-shadow: 0 6px 30px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .language-switcher-wrapper::before {
      content: '🌐';
      position: absolute;
      left: 16px;
      font-size: 18px;
      z-index: 2;
      pointer-events: none;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
    }

    .language-switcher select {
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      padding: 12px 48px 12px 48px;
      border-radius: 12px;
      border: none;
      background: transparent;
      color: var(--primary-color);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      transition: all 0.3s ease;
      font-family: 'Lato', sans-serif;
      letter-spacing: 0.3px;
      min-width: 180px;
      text-align: center;
      background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    }

    .language-switcher select:hover {
      background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1));
    }

    .language-switcher select:focus {
      background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.15));
    }

    .language-switcher-arrow {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      pointer-events: none;
      z-index: 2;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .language-switcher-wrapper:hover .language-switcher-arrow {
      transform: translateY(-50%) rotate(180deg);
    }

    .language-switcher select:focus + .language-switcher-arrow {
      transform: translateY(-50%) rotate(180deg);
    }

    .language-switcher-arrow::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 0;
      height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid var(--primary-color);
      opacity: 0.7;
      transition: opacity 0.3s ease;
    }

    .language-switcher-wrapper:hover .language-switcher-arrow::before {
      opacity: 1;
    }

    /* Custom option styling */
    .language-switcher select option {
      background: var(--secondary-color);
      color: var(--primary-color);
      padding: 12px;
      font-weight: 500;
      border-radius: 8px;
    }

    .allergen-legend-wrapper {
      position: relative;
      background: var(--secondary-color);
      border-bottom: 2px solid var(--primary-color);
    }

    .sticky-controls {
      background: var(--secondary-color);
      z-index: 500;
    }

    .sticky-controls::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 1px;
      background: rgba(0, 0, 0, 0.06);
    }


    .allergen-legend {
      padding: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      justify-content: center;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .allergen-legend::-webkit-scrollbar {
      display: none;
    }

    .allergen-scroll-arrow {
      display: none;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.6);
      color: white;
      border: none;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      font-size: 16px;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s, background 0.3s;
      opacity: 0;
      pointer-events: none;
    }

    .allergen-scroll-arrow.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .allergen-scroll-arrow:hover {
      background: rgba(0, 0, 0, 0.8);
    }

    .allergen-scroll-arrow.left {
      left: 5px;
    }

    .allergen-scroll-arrow.right {
      right: 5px;
    }

    .restaurant-logo {
      max-width: ${theme.logoSize ? `${(180 * theme.logoSize) / 100}px` : '180px'};
      max-height: ${theme.logoSize ? `${(96 * theme.logoSize) / 100}px` : '96px'};
      margin-bottom: 10px;
      object-fit: contain;
    }

    .section-tabs-container {
      display: none;
      background: var(--primary-color);
      padding: 10px;
      position: relative;
      overflow: hidden;
      margin-top: 0;
    }

    .section-tabs-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      scroll-behavior: smooth;
    }

    .section-tabs-wrapper::-webkit-scrollbar {
      display: none;
    }

    .section-tabs {
      display: flex;
      gap: 10px;
      min-width: max-content;
      padding: 0 40px;
    }

    .section-scroll-arrow {
      display: none;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.9);
      color: var(--primary-color);
      border: 2px solid var(--secondary-color);
      width: 35px;
      height: 35px;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      font-size: 20px;
      font-weight: bold;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s, background 0.3s, transform 0.2s;
      opacity: 0;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .section-scroll-arrow.visible {
      opacity: 1;
      pointer-events: auto;
    }

    .section-scroll-arrow:hover {
      background: var(--secondary-color);
      transform: translateY(-50%) scale(1.1);
    }

    .section-scroll-arrow:active {
      transform: translateY(-50%) scale(0.95);
    }

    .section-scroll-arrow.left {
      left: 5px;
    }

    .section-scroll-arrow.right {
      right: 5px;
    }

    .section-tab {
      background: rgba(255, 255, 255, 0.2);
      color: var(--secondary-color);
      border: none;
      padding: 10px 20px;
      border-radius: 20px;
      cursor: pointer;
      white-space: nowrap;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      font-family: 'Lato', sans-serif;
    }

    .section-tab:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .section-tab.active {
      background: var(--secondary-color);
      color: var(--primary-color);
      font-weight: 700;
    }

    .desktop-only {
      display: block;
    }

    .menu-section {
      transition: opacity 0.3s ease;
      display: block;
    }

    .menu-section.mobile-hidden {
      display: none;
    }

    .allergen-item {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 5px;
      transition: background 0.2s;
      position: relative;
    }

    .allergen-item:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .allergen-item.active {
      background: var(--accent-color);
      color: var(--secondary-color);
      padding-left: 28px;
    }

    .allergen-close-btn {
      display: none;
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.95);
      color: var(--accent-color);
      border: 2px solid rgba(255, 255, 255, 0.9);
      cursor: pointer;
      font-size: 12px;
      font-weight: bold;
      line-height: 1;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      z-index: 1;
    }

    .allergen-item.active .allergen-close-btn {
      display: flex;
    }

    .allergen-close-btn:hover {
      background: var(--secondary-color);
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
    }

    .allergen-close-btn:active {
      transform: translateY(-50%) scale(0.95);
    }

    .allergen-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .allergen-icon img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .allergen-label {
      font-size: 12px;
    }

    .menu-section {
      padding: 0;
      border-bottom: 1px solid #eee;
      position: relative;
      overflow: hidden;
      min-height: 200px;
    }

    .section-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.85);
      z-index: 1;
    }

    .section-content {
      position: relative;
      z-index: 2;
      padding: 30px;
    }

    .section-header {
      margin-bottom: 25px;
    }

    .section-title {
      font-family: ${theme.sectionFontFamily || "'Eastwood', serif"};
      font-size: ${theme.sectionFontSize || 2}em;
      color: var(--primary-color);
      margin-bottom: 15px;
      text-shadow: 0 1px 3px rgba(255, 255, 255, 0.9);
    }

    .section-illustration {
      margin-top: 15px;
    }

    .section-illustration img {
      max-width: 200px;
      height: auto;
    }

    .menu-items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      align-items: start; /* Align items to top, prevent row stretching */
    }

    .menu-item {
      position: relative;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s, box-shadow 0.2s;
      height: auto; /* Allow items to grow independently */
      display: flex;
      flex-direction: column; /* Stack content vertically */
    }

    .menu-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .menu-item-expandable {
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .menu-item-expandable:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }

    .menu-item-expandable.expanded {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .expand-icon {
      display: inline-block;
      margin-right: 8px;
      font-size: 0.9em;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      color: #ff6b35;
      font-weight: bold;
      line-height: 1;
      vertical-align: middle;
    }

    .menu-item-expandable.expanded .expand-icon {
      transform: rotate(90deg);
    }

    .item-expanded-content {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.3s ease 0.1s,
                  padding-top 0.3s ease,
                  margin-top 0.3s ease;
      flex-shrink: 0; /* Prevent shrinking in flex layout */
    }

    .item-expanded-content.expanded {
      max-height: 2000px;
      opacity: 1;
      padding-top: 15px;
      margin-top: 15px;
    }

    .item-expanded-content:not(.expanded) {
      padding-top: 0;
      margin-top: 0;
      transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.2s ease,
                  padding-top 0.3s ease 0.1s,
                  margin-top 0.3s ease 0.1s;
    }

    .ingredients-expanded {
      padding: 10px 0;
    }

    .ingredients-expanded .ingredients-title {
      font-size: 1.1em;
      font-weight: 600;
      margin-bottom: 10px;
      color: var(--primary-color);
    }

    .ingredients-expanded .ingredients-text {
      color: #333;
      font-size: 0.95em;
      line-height: 1.6;
      white-space: pre-line;
    }

    .menu-item.hidden {
      display: none;
    }

    .sub-section {
      margin-top: 40px;
      padding-top: 30px;
      border-top: 2px solid #eee;
    }

    .sub-section-title {
      font-family: 'Mallory MP', sans-serif;
      font-size: 1.5em;
      color: var(--primary-color);
      margin-bottom: 20px;
      font-weight: 600;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
      flex-shrink: 0; /* Prevent header from shrinking */
      padding-right: 70px; /* Space for calories badge */
    }

    .item-info {
      flex: 1;
    }

    .item-name {
      font-family: 'Mallory MP', sans-serif;
      font-size: 1.3em;
      color: var(--primary-color);
      margin-bottom: 5px;
    }

    .item-calories-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border-radius: 8px;
      padding: 6px 10px;
      min-width: 45px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      z-index: 5;
    }

    .item-calories-badge .calories-value {
      font-size: 1.1em;
      font-weight: 700;
      line-height: 1;
    }

    .item-calories-badge .calories-unit {
      font-size: 0.65em;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
      margin-top: 2px;
    }

    .item-description {
      font-size: 0.9em;
      color: #666;
      margin-top: 5px;
    }

    .price {
      font-size: 1.2em;
      font-weight: bold;
      color: var(--accent-color);
    }

    .price-variations {
      text-align: right;
    }

    .price-variation {
      display: block;
      font-size: 0.9em;
      margin-bottom: 3px;
    }

    .item-image {
      width: 100%;
      height: 200px;
      object-fit: cover;
      border-radius: 5px;
      margin: 10px 0;
    }

    .item-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #eee;
    }

    .item-allergen {
      width: 20px;
      height: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-right: 5px;
      flex-shrink: 0;
      cursor: help;
    }

    .item-allergen img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .ingredients-section {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }

    .ingredients-toggle {
      background: none;
      border: none;
      padding: 8px 0;
      cursor: pointer;
      font-size: 0.95em;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      text-align: left;
      transition: color 0.2s;
    }

    .ingredients-toggle:hover {
      color: var(--accent-color);
    }

    .toggle-icon {
      font-size: 0.8em;
      transition: transform 0.3s;
      display: inline-block;
    }

    .ingredients-toggle.expanded .toggle-icon {
      transform: rotate(180deg);
    }

    .ingredients-content {
      margin-top: 10px;
      padding-left: 20px;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        max-height: 0;
      }
      to {
        opacity: 1;
        max-height: 1000px;
      }
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    .ingredients-title {
      font-size: 1.1em;
      font-weight: bold;
      color: var(--primary-color);
      margin-bottom: 10px;
      margin-top: 0;
    }

    .ingredients-text {
      color: #333;
      font-size: 0.95em;
      line-height: 1.6;
      white-space: pre-line;
    }

    .ingredients-list {
      list-style: none;
      padding-left: 0;
      margin: 0;
    }

    .ingredients-list li {
      padding: 5px 0;
      padding-left: 20px;
      position: relative;
      color: #333;
      font-size: 0.95em;
      line-height: 1.5;
    }

    .ingredients-list li::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--accent-color);
      font-weight: bold;
      font-size: 1.2em;
    }

    @media (max-width: 768px) {
      .sticky-controls {
        margin: 0 10px;
        border-radius: 12px;
        transition: box-shadow 0.3s ease;
      }

      .sticky-controls.floating {
        position: fixed;
        top: 10px;
        left: 10px;
        right: 10px;
        margin: 0;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }

      .sticky-controls-placeholder {
        display: none;
      }

      .sticky-controls-placeholder.active {
        display: block;
      }

      .sticky-controls::after {
        display: none;
      }

      .menu-items {
        grid-template-columns: 1fr;
      }

      .item-calories-badge {
        top: 6px;
        right: 6px;
        padding: 4px 8px;
        min-width: 40px;
        border-radius: 6px;
      }

      .item-calories-badge .calories-value {
        font-size: 1em;
      }

      .item-calories-badge .calories-unit {
        font-size: 0.6em;
      }

      .header h1 {
        font-size: 1.5em;
        margin-bottom: 0;
      }

      .allergen-legend-wrapper {
        position: relative;
      }


    .allergen-legend {
      display: flex;
      flex-wrap: nowrap;
      gap: 4px;
      padding: 8px 35px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
      justify-content: flex-start;
      scroll-behavior: smooth;
    }

      .allergen-legend::-webkit-scrollbar {
        display: none;
      }

      .allergen-scroll-arrow {
        display: flex;
      }

      .allergen-item {
        flex-direction: row;
        align-items: center;
        text-align: left;
        padding: 4px 8px;
        gap: 4px;
        flex-shrink: 0;
        min-width: fit-content;
        white-space: nowrap;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 12px;
      }

      .allergen-item.active {
        padding-left: 22px;
      }

      .allergen-close-btn {
        width: 14px;
        height: 14px;
        font-size: 10px;
        left: 4px;
      }

      .allergen-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }

      .allergen-label {
        font-size: 10px;
        white-space: nowrap;
      }

      .section-tabs-container {
        display: block;
        padding: 6px;
      }

      .section-tabs {
        padding: 0 35px;
        gap: 6px;
      }

      .section-tab {
        padding: 6px 14px;
        font-size: 12px;
        border-radius: 16px;
      }

      .section-scroll-arrow {
        display: flex;
        width: 28px;
        height: 28px;
        font-size: 16px;
      }

      .desktop-only {
        display: block;
      }

      .section-content {
        padding: 20px 15px;
      }

      body {
        padding: 10px;
      }

      .header {
        padding: 20px 15px 8px 15px;
      }

      .language-switcher {
        position: fixed;
        top: 10px;
        right: 10px;
        margin-top: 0;
        z-index: 1000;
        transition: opacity 0.3s ease, transform 0.3s ease;
      }

      .language-switcher.hidden {
        opacity: 0;
        transform: translateY(-20px);
        pointer-events: none;
      }

      .language-switcher-wrapper {
        padding: 0;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.15);
        transition: all 0.3s ease;
      }

      .language-switcher-wrapper:hover {
        background: rgba(0, 0, 0, 0.8);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      }

      .language-switcher-wrapper::before {
        display: none;
      }

      .language-switcher select {
        padding: 6px 20px 6px 12px;
        font-size: 11px;
        min-width: 50px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: rgba(255, 255, 255, 0.95);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        background: transparent;
      }

      .language-switcher-arrow {
        right: 8px;
        width: 12px;
        height: 12px;
      }

      .language-switcher-arrow::before {
        border-left: 3px solid transparent;
        border-right: 3px solid transparent;
        border-top: 4px solid rgba(255, 255, 255, 0.9);
        opacity: 0.9;
        filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5));
      }
    }

    ${theme.customCss || ''}

    ${theme.backgroundIllustrationUrl ? `
    .bg-illustration-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${normalizeUrl(theme.backgroundIllustrationUrl)}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      opacity: ${(theme.backgroundIllustrationOpacity ?? 30) / 100};
      pointer-events: none;
      z-index: 0;
    }
    .container { position: relative; z-index: 1; }
    ` : ''}
  </style>
</head>
<body>
  ${theme.backgroundIllustrationUrl ? '<div class="bg-illustration-overlay"></div>' : ''}
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="${menu.restaurant.name}" class="restaurant-logo" />` : ''}
      <h1 data-lang="ENG" id="menu-title">${menu.name['ENG'] || 'Menu'}</h1>
      ${languages
        .filter((l) => l.code !== 'ENG')
        .map(
          (lang) =>
            `<h1 data-lang="${lang.code}" id="menu-title" style="display: none;">${menu.name[lang.code] || menu.name['ENG']}</h1>`
        )
        .join('')}
      <div class="language-switcher">
        <div class="language-switcher-wrapper">
          <select id="language-select" onchange="switchLanguage(this.value)">
            ${languageOptions}
          </select>
          <div class="language-switcher-arrow"></div>
        </div>
      </div>
    </div>

    <div class="sticky-controls-placeholder" id="sticky-controls-placeholder"></div>
    <div class="sticky-controls" id="sticky-controls">
      <div class="section-tabs-container">
        <button class="section-scroll-arrow left" onclick="scrollSectionTabs('left')" aria-label="Scroll left">‹</button>
        <div class="section-tabs-wrapper" id="section-tabs-wrapper">
          <div class="section-tabs">
            ${sectionTabs}
          </div>
        </div>
        <button class="section-scroll-arrow right" onclick="scrollSectionTabs('right')" aria-label="Scroll right">›</button>
      </div>

      <div class="allergen-legend-wrapper">
        <button class="allergen-scroll-arrow left" onclick="scrollAllergenLegend('left')" aria-label="Scroll left">‹</button>
        <div class="allergen-legend" id="allergen-legend">
          ${allergenLegend}
        </div>
        <button class="allergen-scroll-arrow right" onclick="scrollAllergenLegend('right')" aria-label="Scroll right">›</button>
      </div>
    </div>

    <div class="menu-content">
      ${sectionsHTML}
    </div>
  </div>

  <script>
    let currentLanguage = 'ENG';

    function switchLanguage(lang) {
      currentLanguage = lang;
      
      // Add smooth transition effect
      const select = document.getElementById('language-select');
      if (select) {
        select.style.opacity = '0.7';
        setTimeout(() => {
          select.style.opacity = '1';
        }, 150);
      }
      
      document.querySelectorAll('[data-lang]').forEach(el => {
        if (el.getAttribute('data-lang') === lang) {
          el.style.display = '';
          el.style.animation = 'fadeIn 0.3s ease-in';
        } else {
          el.style.display = 'none';
        }
      });

      // Fallback: if no elements are visible for this language, show English
      document.querySelectorAll('[data-lang="ENG"]').forEach(el => {
        const parent = el.parentElement;
        if (parent) {
          const hasVisibleSibling = Array.from(parent.children).some(child => 
            child.hasAttribute('data-lang') && child.style.display !== 'none'
          );
          if (!hasVisibleSibling) {
            el.style.display = '';
          }
        }
      });

      // Update allergen labels
      document.querySelectorAll('.allergen-label').forEach(label => {
        if (label.getAttribute('data-lang') === lang) {
          label.style.display = '';
        } else {
          label.style.display = 'none';
        }
      });

      // Update section tab text (tabs contain spans with data-lang)
      document.querySelectorAll('.section-tab').forEach(tab => {
        const spans = tab.querySelectorAll('[data-lang]');
        spans.forEach(span => {
          if (span.getAttribute('data-lang') === lang) {
            span.style.display = '';
          } else {
            span.style.display = 'none';
          }
        });
      });

      // Store preference
      localStorage.setItem('menu-language', lang);
    }

    function toggleIngredients(button) {
      const content = button.nextElementSibling;
      const isExpanded = content.style.display !== 'none';
      
      if (isExpanded) {
        content.style.display = 'none';
        button.classList.remove('expanded');
      } else {
        content.style.display = 'block';
        button.classList.add('expanded');
      }
    }

    function toggleItemCard(card) {
      if (!card) return;
      
      // Only process items that are actually expandable
      if (!card.classList.contains('menu-item-expandable')) {
        return;
      }
      
      const expandedContent = card.querySelector('.item-expanded-content');
      if (!expandedContent) {
        console.log('No expanded content found');
        return;
      }
      
      const isExpanded = expandedContent.classList.contains('expanded');
      
      // Close ALL other expanded items first - check the expanded content, not the card
      document.querySelectorAll('.menu-item-expandable').forEach(otherCard => {
        if (otherCard !== card) {
          const otherContent = otherCard.querySelector('.item-expanded-content');
          if (otherContent && otherContent.classList.contains('expanded')) {
            otherContent.classList.remove('expanded');
            otherCard.classList.remove('expanded');
          }
        }
      });
      
      // Toggle current item
      if (isExpanded) {
        expandedContent.classList.remove('expanded');
        card.classList.remove('expanded');
      } else {
        expandedContent.classList.add('expanded');
        card.classList.add('expanded');
      }
      
      // Prevent event bubbling
      if (window.event) {
        window.event.stopPropagation();
      }
    }

    function toggleRecipe(button) {
      const recipe = button.parentElement.nextElementSibling;
      if (recipe.style.display === 'none') {
        recipe.style.display = 'block';
        button.textContent = 'Hide Recipe';
      } else {
        recipe.style.display = 'none';
        button.textContent = 'View Recipe';
      }
    }

    // Filter mode is set from backend setting: '${filterMode}'
    const filterMode = '${filterMode}';
    let activeAllergens = new Set(); // Track which allergens are currently active

    function applyAllergenFilters() {
      const items = document.querySelectorAll('.menu-item');
      
      if (activeAllergens.size === 0) {
        // No filters active, show all items
        items.forEach(item => item.classList.remove('hidden'));
        return;
      }
      
      items.forEach(item => {
        const itemAllergens = item.getAttribute('data-allergens') || '';
        const itemAllergenList = itemAllergens.split(',').map(a => a.trim()).filter(a => a);
        
        let shouldShow = false;
        
        if (filterMode === 'exclude') {
          // Exclude mode: Hide items that have ANY of the active allergens
          const hasActiveAllergen = Array.from(activeAllergens).some(allergen => 
            itemAllergenList.includes(allergen)
          );
          shouldShow = !hasActiveAllergen;
        } else {
          // Include mode: Show items that have ANY of the active allergens
          const hasAnyActiveAllergen = Array.from(activeAllergens).some(allergen => 
            itemAllergenList.includes(allergen)
          );
          shouldShow = hasAnyActiveAllergen;
        }
        
        if (shouldShow) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    }

    function filterByAllergen(allergenName) {
      const allergenBtn = document.querySelector(\`[data-allergen="\${allergenName}"]\`);
      
      if (allergenBtn.classList.contains('active')) {
        // Deselect allergen
        activeAllergens.delete(allergenName);
        allergenBtn.classList.remove('active');
      } else {
        // Select allergen
        activeAllergens.add(allergenName);
        allergenBtn.classList.add('active');
      }
      
      // Apply filters based on current mode
      applyAllergenFilters();
    }

    let activeSectionId = null;

    function getStickyOffset() {
      const sticky = document.getElementById('sticky-controls');
      const stickyHeight = sticky ? Math.ceil(sticky.getBoundingClientRect().height) : 0;
      // Small spacing so section content isn't flush under the sticky controls
      return stickyHeight + 10;
    }

    function ensureTabInView(activeTab) {
      if (!activeTab) return;
      // Only auto-scroll the pills on mobile
      if (window.innerWidth > 768) return;
      const wrapper = document.getElementById('section-tabs-wrapper');
      if (!wrapper) return;

      const tabRect = activeTab.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      const scrollLeft = wrapper.scrollLeft;

      if (tabRect.left < wrapperRect.left) {
        wrapper.scrollTo({
          left: scrollLeft + (tabRect.left - wrapperRect.left) - 20,
          behavior: 'smooth'
        });
      } else if (tabRect.right > wrapperRect.right) {
        wrapper.scrollTo({
          left: scrollLeft + (tabRect.right - wrapperRect.right) + 20,
          behavior: 'smooth'
        });
      }

      setTimeout(updateSectionArrows, 200);
    }

    function setActiveTab(sectionId, { autoScrollTabs = false } = {}) {
      if (!sectionId) return;
      if (activeSectionId === sectionId) return;
      activeSectionId = sectionId;

      document.querySelectorAll('.section-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-section-id') === sectionId);
      });

      if (autoScrollTabs) {
        const activeTab = document.querySelector(\`.section-tab[data-section-id="\${sectionId}"]\`);
        ensureTabInView(activeTab);
      }
    }

    function scrollToSection(sectionId) {
      const selectedSection = document.querySelector(\`.menu-section[data-section-id="\${sectionId}"]\`);
      if (!selectedSection) return;

      const top = selectedSection.getBoundingClientRect().top + window.scrollY - getStickyOffset();
      window.scrollTo({ top, behavior: 'smooth' });
    }

    // Clicking a category pill should jump to that category in the scroll list.
    // The active category will also update automatically as you scroll.
    function showSection(sectionId, skipScroll = false) {
      setActiveTab(sectionId, { autoScrollTabs: !skipScroll });
      if (!skipScroll) {
        scrollToSection(sectionId);
      }
    }

    function updateStickyArrows() {
      updateAllergenArrows();
      updateSectionArrows();
    }

    // Ensure page starts at top on load/refresh
    window.scrollTo(0, 0);
    if (history.scrollRestoration) {
      history.scrollRestoration = 'manual';
    }

    // Ensure arrows + offsets are correct on resize
    window.addEventListener('resize', updateStickyArrows);

    function scrollSectionTabs(direction) {
      const wrapper = document.getElementById('section-tabs-wrapper');
      if (!wrapper) return;
      
      const scrollAmount = 200;
      
      if (direction === 'left') {
        wrapper.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        wrapper.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      // Update arrow visibility after scroll
      setTimeout(updateSectionArrows, 100);
    }

    function updateSectionArrows() {
      const wrapper = document.getElementById('section-tabs-wrapper');
      if (!wrapper) return;
      
      // Only show arrows on mobile
      if (window.innerWidth > 768) {
        document.querySelectorAll('.section-scroll-arrow').forEach(arrow => {
          arrow.classList.remove('visible');
        });
        return;
      }
      
      const leftArrow = document.querySelector('.section-scroll-arrow.left');
      const rightArrow = document.querySelector('.section-scroll-arrow.right');
      
      if (!leftArrow || !rightArrow) return;
      
      const scrollLeft = wrapper.scrollLeft;
      const scrollWidth = wrapper.scrollWidth;
      const clientWidth = wrapper.clientWidth;
      const maxScroll = scrollWidth - clientWidth;
      
      // Show/hide left arrow
      if (scrollLeft > 10) {
        leftArrow.classList.add('visible');
      } else {
        leftArrow.classList.remove('visible');
      }
      
      // Show/hide right arrow
      if (scrollLeft < maxScroll - 10) {
        rightArrow.classList.add('visible');
      } else {
        rightArrow.classList.remove('visible');
      }
    }

    function scrollAllergenLegend(direction) {
      const legend = document.getElementById('allergen-legend');
      if (!legend) return;
      
      const scrollAmount = 200;
      const currentScroll = legend.scrollLeft;
      const maxScroll = legend.scrollWidth - legend.clientWidth;
      
      if (direction === 'left') {
        legend.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        legend.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      // Update arrow visibility after scroll
      setTimeout(updateAllergenArrows, 100);
    }

    function updateAllergenArrows() {
      const legend = document.getElementById('allergen-legend');
      if (!legend) return;
      
      // Only show arrows on mobile
      if (window.innerWidth > 768) {
        document.querySelectorAll('.allergen-scroll-arrow').forEach(arrow => {
          arrow.classList.remove('visible');
        });
        return;
      }
      
      const leftArrow = document.querySelector('.allergen-scroll-arrow.left');
      const rightArrow = document.querySelector('.allergen-scroll-arrow.right');
      
      if (!leftArrow || !rightArrow) return;
      
      const scrollLeft = legend.scrollLeft;
      const scrollWidth = legend.scrollWidth;
      const clientWidth = legend.clientWidth;
      const maxScroll = scrollWidth - clientWidth;
      
      // Show/hide left arrow
      if (scrollLeft > 10) {
        leftArrow.classList.add('visible');
      } else {
        leftArrow.classList.remove('visible');
      }
      
      // Show/hide right arrow
      if (scrollLeft < maxScroll - 10) {
        rightArrow.classList.add('visible');
      } else {
        rightArrow.classList.remove('visible');
      }
    }

    // Initialize allergen filter clicks
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('.allergen-item').forEach(item => {
        const allergenName = item.getAttribute('data-allergen');
        item.addEventListener('click', () => filterByAllergen(allergenName));
      });

      // Initialize section tabs arrows
      const sectionWrapper = document.getElementById('section-tabs-wrapper');
      if (sectionWrapper) {
        // Check initial state
        updateSectionArrows();
        
        // Update on scroll
        sectionWrapper.addEventListener('scroll', updateSectionArrows);
      }

      // Initialize allergen legend arrows
      const legend = document.getElementById('allergen-legend');
      if (legend) {
        // Check initial state
        updateAllergenArrows();
        
        // Update on scroll
        legend.addEventListener('scroll', updateAllergenArrows);
      }

      // Restore language preference
      const savedLang = localStorage.getItem('menu-language');
      if (savedLang) {
        document.getElementById('language-select').value = savedLang;
        switchLanguage(savedLang);
      }

      // Hide language switcher on scroll (mobile only)
      const langSwitcher = document.querySelector('.language-switcher');
      let scrollTimeout;
      let lastScrollY = window.scrollY;
      
      function handleLangSwitcherScroll() {
        if (window.innerWidth > 768) return; // Desktop - do nothing
        
        const currentScrollY = window.scrollY;
        
        // Hide when scrolling down, show when at top
        if (currentScrollY > 50) {
          langSwitcher.classList.add('hidden');
        } else {
          langSwitcher.classList.remove('hidden');
        }
        
        lastScrollY = currentScrollY;
        
        // Show again after scroll stops
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (currentScrollY <= 50) {
            langSwitcher.classList.remove('hidden');
          }
        }, 1000);
      }
      
      window.addEventListener('scroll', handleLangSwitcherScroll, { passive: true });

      // Floating sticky controls on scroll (mobile only)
      const stickyControls = document.getElementById('sticky-controls');
      const placeholder = document.getElementById('sticky-controls-placeholder');
      let stickyOriginalTop = null;
      
      function initStickyControls() {
        if (window.innerWidth > 768) {
          // Desktop - remove floating
          stickyControls.classList.remove('floating');
          placeholder.classList.remove('active');
          return;
        }
        
        // Get the original position of sticky controls
        if (!stickyControls.classList.contains('floating')) {
          stickyOriginalTop = stickyControls.getBoundingClientRect().top + window.scrollY;
        }
      }
      
      function handleStickyScroll() {
        if (window.innerWidth > 768) return; // Desktop - do nothing
        
        const scrollY = window.scrollY;
        const triggerPoint = stickyOriginalTop - 10; // 10px from top
        
        if (scrollY >= triggerPoint) {
          if (!stickyControls.classList.contains('floating')) {
            // Set placeholder height to prevent content jump
            placeholder.style.height = stickyControls.offsetHeight + 'px';
            placeholder.classList.add('active');
            stickyControls.classList.add('floating');
          }
        } else {
          if (stickyControls.classList.contains('floating')) {
            stickyControls.classList.remove('floating');
            placeholder.classList.remove('active');
          }
        }
      }
      
      // Initialize and set up scroll listener
      initStickyControls();
      // Small delay to ensure layout is complete
      setTimeout(() => {
        stickyOriginalTop = stickyControls.getBoundingClientRect().top + window.scrollY;
      }, 100);
      
      window.addEventListener('scroll', handleStickyScroll, { passive: true });
      window.addEventListener('resize', initStickyControls);

      // Track which section is currently in view and update the active pill.
      const sections = Array.from(document.querySelectorAll('.menu-section'));
      if (sections.length > 0) {
        // Initialize to first section
        const firstId = sections[0].getAttribute('data-section-id');
        if (firstId) setActiveTab(firstId, { autoScrollTabs: false });

        if ('IntersectionObserver' in window) {
          const buildObserver = () => {
            const offset = getStickyOffset();
            const observer = new IntersectionObserver((entries) => {
              const visible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => {
                  const aDist = Math.abs(a.boundingClientRect.top - offset);
                  const bDist = Math.abs(b.boundingClientRect.top - offset);
                  return aDist - bDist;
                })[0];

              if (visible && visible.target) {
                const id = visible.target.getAttribute('data-section-id');
                if (id) setActiveTab(id, { autoScrollTabs: false });
              }
            }, {
              root: null,
              // Bias towards the section near the top, under the sticky controls
              rootMargin: \`-\${offset}px 0px -65% 0px\`,
              threshold: [0, 0.1, 0.25, 0.5, 0.75]
            });

            sections.forEach(sec => observer.observe(sec));
            return observer;
          };

          let sectionObserver = buildObserver();
          window.addEventListener('resize', () => {
            if (sectionObserver) sectionObserver.disconnect();
            sectionObserver = buildObserver();
          });
        } else {
          // Fallback: update active section on scroll (lightweight)
          let ticking = false;
          window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
              ticking = false;
              const offset = getStickyOffset();
              let bestId = null;
              let bestDist = Number.POSITIVE_INFINITY;
              sections.forEach(sec => {
                const rect = sec.getBoundingClientRect();
                const dist = Math.abs(rect.top - offset);
                if (rect.bottom > offset && dist < bestDist) {
                  bestDist = dist;
                  bestId = sec.getAttribute('data-section-id');
                }
              });
              if (bestId) setActiveTab(bestId, { autoScrollTabs: false });
            });
          }, { passive: true });
        }
      }

      // Update language selector text for mobile view (show 2-letter abbreviations)
      function updateLanguageSelectorText() {
        const select = document.getElementById('language-select');
        if (!select) return;
        
        // Mapping for 2-letter abbreviations
        const abbreviationMap = {
          'GER': 'DE',
          'CHN': 'CN',
          'ENG': 'EN',
          'JAP': 'JA',
          'RUS': 'RU'
        };
        
        const isMobile = window.innerWidth <= 768;
        Array.from(select.options).forEach(option => {
          const code = option.value;
          const fullName = option.getAttribute('data-full-name') || '';
          
          if (isMobile) {
            // Mobile: show 2-letter abbreviation (use mapping or first 2 letters)
            option.textContent = abbreviationMap[code] || code.substring(0, 2).toUpperCase();
          } else {
            // Desktop: show full name with code
            option.textContent = fullName ? \`\${fullName} (\${code})\` : code;
          }
        });
      }

      // Update on load and resize
      updateLanguageSelectorText();
      window.addEventListener('resize', updateLanguageSelectorText);

      // Make sure arrows are correct on first load
      updateStickyArrows();
    });
  </script>
</body>
</html>`;
}

