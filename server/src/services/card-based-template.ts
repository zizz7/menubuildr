/**
 * Card-Based Menu Template
 * Modern grid layout with image-focused cards and responsive design.
 * Matches the UI/UX design with section navigation cards, 2-column grid items,
 * rounded corners, and mobile-first responsive layout.
 */

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
      items: Array<any>;
    }>;
    items: Array<any>;
  }>;
}

export function generateCardBasedHTML(
  menu: MenuData,
  languages: Array<{ code: string; name: string }>,
  allergens: Array<{ id: string; name: string; imageUrl: string; label: Record<string, string> }>,
  themeOverrides?: any,
  filterMode: 'exclude' | 'include' = 'exclude',
  baseUrl?: string
): string {
  // URL normalization helper
  const normalizeUrl = (url: string | null | undefined): string => {
    if (!url || !url.trim()) return '';
    const trimmedUrl = url.trim();
    if (trimmedUrl.includes('localhost') && trimmedUrl.includes('/uploads/')) {
      try { return new URL(trimmedUrl).pathname; } catch { const m = trimmedUrl.match(/\/uploads\/.*/); if (m) return m[0]; }
    }
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      if (!trimmedUrl.includes('localhost')) return trimmedUrl;
      try { return new URL(trimmedUrl).pathname; } catch { /* fall through */ }
    }
    let normalized = trimmedUrl;
    if (!normalized.startsWith('/')) normalized = `/${normalized}`;
    if (baseUrl) {
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBase}${normalized}`;
    }
    return normalized;
  };

  // Theme resolution
  const menuThemeSettings = (menu as any).themeSettings;
  const restaurantTheme = menu.restaurant.themeSettings;
  const defaults = {
    primaryColor: '#3d3529', secondaryColor: '#ffffff', accentColor: '#e85d3a',
    backgroundColor: '#f5f5f0', textColor: '#333333', customCss: '', customFontsUrls: [] as string[],
    backgroundIllustrationUrl: '', coverPhotoUrl: '', coverPhotoPosition: 'center',
    coverPhotoSize: 'cover', logoSize: 100, sectionFontFamily: 'Inter, sans-serif',
    sectionFontSize: 1.5, sectionBackgroundColor: '#ffffff',
  };
  const baseTheme = menuThemeSettings ? { ...defaults, ...menuThemeSettings } :
    restaurantTheme ? { ...defaults, ...restaurantTheme } : defaults;
  const processedOverrides = themeOverrides ? {
    ...themeOverrides,
    coverPhotoUrl: themeOverrides.coverPhotoUrl ? normalizeUrl(themeOverrides.coverPhotoUrl) : themeOverrides.coverPhotoUrl,
    backgroundIllustrationUrl: themeOverrides.backgroundIllustrationUrl ? normalizeUrl(themeOverrides.backgroundIllustrationUrl) : themeOverrides.backgroundIllustrationUrl,
  } : undefined;
  const theme = processedOverrides ? { ...baseTheme, ...processedOverrides } : baseTheme;

  const logoUrl = menu.restaurant.logoUrl ? normalizeUrl(menu.restaurant.logoUrl) : '';
  const fontLinks = (theme.customFontsUrls || []).map((url: string) => `<link rel="stylesheet" href="${url}">`).join('\n    ');

  // Generate section navigation cards
  const navStyle = theme.navDrawerStyle || 'cards';
  const categoryImages = (theme as any).navDrawerCategoryImages || {};
  const sectionNavCards = menu.sections.map((section) => {
    const sectionTitle = Object.keys(section.title)
      .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${section.title[lang]}</span>`)
      .join('');
    // Priority: custom category image > section illustration > first item image
    const customImage = categoryImages[section.id] ? normalizeUrl(categoryImages[section.id]) : '';
    const bgImage = section.illustrationUrl ? normalizeUrl(section.illustrationUrl) : '';
    const firstItemImage = (!customImage && !bgImage && section.items.length > 0 && section.items[0].imageUrl)
      ? normalizeUrl(section.items[0].imageUrl) : '';
    const imageUrl = customImage || bgImage || firstItemImage;
    const itemCount = section.items.length;
    if (navStyle === 'plain') {
      return `
      <div class="section-nav-plain" onclick="scrollToSection('${section.id}')">
        <span class="nav-plain-text">${sectionTitle}</span>
        <span class="nav-plain-count">${itemCount}</span>
      </div>`;
    }
    return `
      <div class="section-nav-card" onclick="scrollToSection('${section.id}')">
        ${imageUrl
          ? `<div class="section-nav-image" style="background-image:url('${imageUrl}')"></div>`
          : ''}
        <div class="section-nav-label">
          <span class="nav-label-text">${sectionTitle}</span>
          <span class="nav-label-count">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
        </div>
      </div>`;
  }).join('');

  // Generate allergen bar
  const allergenBar = allergens.map(a => {
    const imgUrl = normalizeUrl(a.imageUrl);
    return `
      <button class="allergen-chip" data-allergen="${a.name}" onclick="toggleAllergenFilter('${a.name}')">
        <img src="${imgUrl}" alt="${a.label['ENG'] || a.name}" />
        <span class="allergen-chip-label" data-lang="ENG">${a.label['ENG'] || a.name}</span>
        ${languages.filter(l => l.code !== 'ENG').map(l =>
          `<span class="allergen-chip-label" data-lang="${l.code}" style="display:none;">${a.label[l.code] || a.name}</span>`
        ).join('')}
      </button>`;
  }).join('');

  // Helper: parse ingredients from various data shapes
  const parseIngredients = (item: any): { hasIngredients: boolean; ingredientsHtml: string } => {
    if (!item.recipeDetails?.ingredients) return { hasIngredients: false, ingredientsHtml: '' };
    const ing = item.recipeDetails.ingredients;
    if (Array.isArray(ing) && ing.length > 0) {
      const listItems = ing.map((i: any) => {
        const parts = [];
        if (i.quantity != null) parts.push(i.quantity);
        if (i.unit) parts.push(i.unit);
        if (i.name) parts.push(i.name);
        return `<li>${parts.join(' ')}</li>`;
      }).join('');
      return { hasIngredients: true, ingredientsHtml: `<ul class="ingredients-list">${listItems}</ul>` };
    }
    if (typeof ing === 'object' && ing !== null && !Array.isArray(ing)) {
      const values = Object.values(ing);
      if (values.some((v: any) => v && typeof v === 'string' && v.trim().length > 0)) {
        // Get the English content as fallback
        const engContent = (ing as any)['ENG'] || Object.values(ing).find((v: any) => v && typeof v === 'string' && v.trim().length > 0) || '';
        // Generate content for all active languages, using English as fallback
        const html = languages
          .map(lang => {
            const content = (ing as any)[lang.code] || engContent;
            return `<div data-lang="${lang.code}" ${lang.code === 'ENG' ? '' : 'style="display:none;"'}>${content}</div>`;
          })
          .join('');
        return { hasIngredients: true, ingredientsHtml: html };
      }
    }
    return { hasIngredients: false, ingredientsHtml: '' };
  };

  // Helper: generate item cards
  const generateItemCards = (items: any[]) => items.map(item => {
    const itemName = Object.keys(item.name)
      .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${item.name[lang]}</span>`)
      .join('');
    const itemDesc = item.description ? Object.keys(item.description)
      .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${item.description[lang]}</span>`)
      .join('') : '';
    const itemImageUrl = item.imageUrl ? normalizeUrl(item.imageUrl) : '';
    const allergenNames = (item.allergens || []).map((a: any) => a.name).join(',');
    const allergenIcons = (item.allergens || []).filter((a: any) => a.imageUrl && a.imageUrl.trim() && normalizeUrl(a.imageUrl))
      .map((a: any) => `<img src="${normalizeUrl(a.imageUrl)}" alt="${a.label?.['ENG'] || a.name}" class="item-allergen-icon" title="${a.label?.['ENG'] || a.name}" onerror="this.style.display='none'" />`).join('');
    const priceHtml = (item.priceVariations && item.priceVariations.length > 0)
      ? item.priceVariations.map((pv: any) => `<span class="price-var">${pv.variationName}: ${pv.price.toFixed(2)}</span>`).join(' ')
      : (item.price && item.price > 0) ? `${menu.restaurant.currency} ${item.price.toFixed(2)}` : '';
    const caloriesBadge = (typeof item.calories === 'number' && item.calories > 0)
      ? `<span class="calories-badge">${Math.round(item.calories)} kcal</span>` : '';
    const { hasIngredients, ingredientsHtml } = parseIngredients(item);
    const expandableClass = hasIngredients ? 'item-card-expandable' : '';
    const expandIcon = hasIngredients ? '<span class="expand-icon">▶</span>' : '';

    // Resolve ingredients label (multi-language or default "Ingredients")
    // Default translations for "Ingredients" label
    const defaultIngLabels: Record<string, string> = {
      'ENG': 'Ingredients',
      'RUS': 'Ингредиенты',
      'ARA': 'المكونات',
      'FRA': 'Ingrédients',
      'FRE': 'Ingrédients',
      'SPA': 'Ingredientes',
      'ITA': 'Ingredienti',
      'CHN': '配料',
      'GER': 'Zutaten',
      'JAP': '材料',
      'POR': 'Ingredientes',
      'KOR': '재료',
      'HIN': 'सामग्री',
      'TUR': 'Malzemeler',
      'POL': 'Składniki',
      'DUT': 'Ingrediënten',
    };
    const ingLabel = item.recipeDetails?.ingredientsLabel;
    let ingredientsLabelHtml: string;
    if (ingLabel && typeof ingLabel === 'object' && Object.keys(ingLabel).length > 0) {
      ingredientsLabelHtml = languages.map(lang => {
        const labelText = (ingLabel as any)[lang.code] || defaultIngLabels[lang.code] || 'Ingredients';
        return `<span data-lang="${lang.code}" ${lang.code === 'ENG' ? '' : 'style="display:none;"'}>${labelText}</span>`;
      }).join('');
    } else {
      ingredientsLabelHtml = languages.map(lang => {
        const labelText = defaultIngLabels[lang.code] || 'Ingredients';
        return `<span data-lang="${lang.code}" ${lang.code === 'ENG' ? '' : 'style="display:none;"'}>${labelText}</span>`;
      }).join('');
    }

    return `
        <article class="item-card ${expandableClass}" data-allergens="${allergenNames}" ${hasIngredients ? 'onclick="toggleCardExpand(this)"' : ''}>
          ${itemImageUrl ? `
          <div class="item-image-wrapper">
            <img src="${itemImageUrl}" alt="${item.name['ENG'] || ''}" class="item-image" loading="lazy" />
          </div>` : ''}
          <div class="item-content">
            <div class="item-title-row">
              <h3 class="item-title">${expandIcon}${itemName}</h3>
              ${caloriesBadge}
            </div>
            ${itemDesc ? `<p class="item-desc">${itemDesc}</p>` : ''}
            <div class="item-meta">
              ${priceHtml ? `<span class="item-price">${priceHtml}</span>` : ''}
              ${allergenIcons ? `<div class="item-allergens">${allergenIcons}</div>` : ''}
            </div>
          </div>
          ${hasIngredients ? `
          <div class="item-expanded">
            <div class="ingredients-section">
              <h4 class="ingredients-title">${ingredientsLabelHtml}</h4>
              ${ingredientsHtml}
            </div>
          </div>` : ''}
        </article>`;
  }).join('');

  // Helper: render multi-language description text
  const renderDescription = (description: Record<string, string> | null | undefined): string => {
    if (!description || typeof description !== 'object' || Object.keys(description).length === 0) return '';
    const hasContent = Object.values(description).some(v => v && v.trim().length > 0);
    if (!hasContent) return '';
    const spans = Object.keys(description)
      .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${description[lang]}</span>`)
      .join('');
    return `<p class="section-description">${spans}</p>`;
  };

  // Generate sections
  const sectionsHTML = menu.sections.map(section => {
    const sectionTitle = Object.keys(section.title)
      .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${section.title[lang]}</span>`)
      .join('');
    const sectionDescHtml = renderDescription(section.description);
    const itemsHTML = generateItemCards(section.items || []);
    const subSectionsHTML = (section.subSections || []).map((sub: any) => {
      const subTitle = Object.keys(sub.title)
        .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${sub.title[lang]}</span>`)
        .join('');
      const subDescHtml = renderDescription(sub.description);
      return `
        <div class="sub-section">
          <h3 class="sub-section-title">${subTitle}</h3>
          ${subDescHtml}
          <div class="items-grid">${generateItemCards(sub.items || [])}</div>
        </div>`;
    }).join('');

    return `
      <section id="section-${section.id}" class="menu-section" data-section-id="${section.id}">
        <h2 class="section-heading">${sectionTitle}</h2>
        ${sectionDescHtml}
        <div class="items-grid">${itemsHTML}</div>
        ${subSectionsHTML}
      </section>`;
  }).join('');

  // Language options
  const langOptions = languages.map(l => `<option value="${l.code}">${l.name} (${l.code})</option>`).join('');

  // Section tabs for horizontal scroll
  const sectionTabs = menu.sections.map((section, i) => {
    const tabTitle = Object.keys(section.title)
      .map(lang => `<span data-lang="${lang}" ${lang === 'ENG' ? '' : 'style="display:none;"'}>${section.title[lang]}</span>`)
      .join('');
    return `<button class="section-tab ${i === 0 ? 'active' : ''}" data-section-id="${section.id}" onclick="scrollToSection('${section.id}')">${tabTitle}</button>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${menu.name['ENG'] || 'Menu'}</title>
  ${fontLinks}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: ${theme.primaryColor};
      --secondary: ${theme.secondaryColor};
      --accent: ${theme.accentColor};
      --bg: ${theme.backgroundColor};
      --text: ${theme.textColor};
      --radius: 16px;
      --radius-sm: 10px;
      --shadow: 0 2px 12px rgba(0,0,0,0.08);
      --shadow-hover: 0 8px 30px rgba(0,0,0,0.12);
    }
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);color:var(--text);line-height:1.5;-webkit-font-smoothing:antialiased;}
    .app{max-width:800px;margin:0 auto;min-height:100vh;background:var(--bg);}

    /* Top Bar */
    .top-bar{display:flex;align-items:center;justify-content:flex-end;padding:12px 16px;background:var(--primary);color:var(--secondary);position:sticky;top:0;z-index:100;}

    /* Language Selector */
    .lang-select{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:var(--secondary);font-size:13px;cursor:pointer;outline:none;}
    .lang-select option{background:var(--secondary);color:var(--text);}

    /* Section Tabs */
    .section-tabs-bar{background:var(--secondary);border-bottom:1px solid #eee;position:sticky;top:48px;z-index:99;display:flex;align-items:center;gap:4px;padding:8px 12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
    .section-tabs-bar::-webkit-scrollbar{display:none;}
    .hamburger-btn{width:32px;height:32px;border:none;background:none;font-size:20px;cursor:pointer;flex-shrink:0;color:var(--text);}
    .section-tab{white-space:nowrap;padding:8px 16px;border-radius:20px;border:none;background:#f0f0f0;color:var(--text);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;flex-shrink:0;}
    .section-tab.active{background:var(--primary);color:var(--secondary);}

    /* Section Nav Drawer */
    .nav-drawer-overlay{display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:200;}
    .nav-drawer-overlay.open{display:block;}
    .nav-drawer{position:fixed;top:0;left:0;bottom:0;width:85%;max-width:340px;background:var(--secondary);z-index:201;transform:translateX(-100%);transition:transform .3s ease;overflow-y:auto;padding:16px;}
    .nav-drawer.open{transform:translateX(0);}
    .nav-drawer-close{width:36px;height:36px;border-radius:50%;background:var(--primary);color:var(--secondary);border:none;font-size:18px;cursor:pointer;position:absolute;top:16px;right:16px;z-index:3;}
    .nav-drawer-header{text-align:center;padding:20px 0 16px;margin-bottom:8px;border-bottom:1px solid #eee;position:relative;z-index:2;}
    .nav-drawer-logo{max-width:100px;max-height:80px;object-fit:contain;margin-bottom:10px;border-radius:var(--radius-sm);filter:drop-shadow(0 2px 8px rgba(0,0,0,0.08));}
    .nav-drawer-name{font-size:16px;font-weight:700;color:var(--primary);margin-top:6px;}
    .nav-drawer-divider{font-size:12px;color:#999;margin:4px 0 0;letter-spacing:1px;text-transform:uppercase;}
    .nav-drawer-bg{position:absolute;top:0;left:0;width:100%;height:100%;background-size:cover;background-position:center;background-repeat:no-repeat;pointer-events:none;z-index:0;}
    .nav-drawer-content{position:relative;z-index:2;}
    .section-nav-card{border-radius:var(--radius-sm);overflow:hidden;margin-bottom:10px;cursor:pointer;box-shadow:var(--shadow);transition:transform .2s;}
    .section-nav-card:hover{transform:translateY(-2px);}
    .section-nav-plain{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;margin-bottom:6px;border-radius:var(--radius-sm);cursor:pointer;transition:background .2s;border-left:3px solid var(--primary);}
    .section-nav-plain:hover{background:rgba(0,0,0,0.04);}
    .nav-plain-text{font-size:15px;font-weight:500;color:var(--text);}
    .nav-plain-count{font-size:12px;color:#999;background:#f0f0f0;padding:2px 8px;border-radius:10px;}
    .section-nav-image{width:100%;height:80px;background-size:cover;background-position:center;background-color:#e8e8e8;}
    .section-nav-label{padding:10px 14px;font-size:14px;font-weight:600;color:var(--text);background:var(--secondary);display:flex;align-items:center;justify-content:space-between;}
    .nav-label-text{flex:1;}
    .nav-label-count{font-size:11px;font-weight:500;color:#999;background:#f0f0f0;padding:2px 8px;border-radius:10px;}

    /* Menu Sections */
    .menu-section{padding:20px 16px;}
    .section-heading{font-size:1.4rem;font-weight:700;color:var(--primary);margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid var(--primary);}
    .sub-section{margin-top:20px;}
    .sub-section-title{font-size:1.1rem;font-weight:600;color:var(--primary);margin-bottom:12px;}
    .section-description{font-size:0.9rem;color:#888;margin-bottom:14px;line-height:1.5;font-weight:400;}

    /* Items Grid */
    .items-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}

    /* Item Card */
    .item-card{background:var(--secondary);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);transition:transform .2s,box-shadow .2s;display:flex;flex-direction:column;}
    .item-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-hover);}
    .item-card.hidden{display:none;}
    .item-image-wrapper{position:relative;width:100%;padding-top:75%;overflow:hidden;}
    .item-image{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;}
    .calories-badge{background:rgba(16,185,129,0.9);color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap;flex-shrink:0;}
    .item-content{padding:12px;flex:1;display:flex;flex-direction:column;}
    .item-title-row{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;}
    .item-title{font-size:14px;font-weight:600;color:var(--primary);line-height:1.3;flex:1;}
    .item-desc{font-size:12px;color:#888;margin-bottom:8px;flex:1;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    .item-meta{display:flex;justify-content:space-between;align-items:center;margin-top:auto;}
    .item-price{font-size:14px;font-weight:700;color:var(--primary);}
    .price-var{font-size:11px;color:#666;margin-right:6px;}
    .item-allergens{display:flex;gap:4px;flex-wrap:wrap;}
    .item-allergen-icon{width:20px;height:20px;object-fit:contain;}

    /* Expandable cards */
    .item-card-expandable{cursor:pointer;}
    .expand-icon{display:inline-block;font-size:10px;margin-right:4px;transition:transform .2s;color:var(--accent);}
    .item-card-expandable.expanded .expand-icon{transform:rotate(90deg);}
    .item-expanded{max-height:0;overflow:hidden;transition:max-height .3s ease;border-top:1px solid transparent;}
    .item-card-expandable.expanded .item-expanded{max-height:400px;border-top-color:#eee;}
    .ingredients-section{padding:10px 12px;}
    .ingredients-title{font-size:12px;font-weight:700;color:var(--primary);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;}
    .ingredients-list{list-style:none;padding:0;margin:0;}
    .ingredients-list li{font-size:12px;color:#666;padding:2px 0;padding-left:12px;position:relative;}
    .ingredients-list li::before{content:'•';position:absolute;left:0;color:var(--accent);}

    /* Allergen Bar */
    .allergen-bar{display:flex;gap:8px;padding:12px 16px;overflow-x:auto;background:var(--secondary);border-bottom:1px solid #eee;scrollbar-width:none;}
    .allergen-bar::-webkit-scrollbar{display:none;}
    .allergen-chip{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1px solid #ddd;background:var(--secondary);cursor:pointer;white-space:nowrap;font-size:12px;transition:all .2s;flex-shrink:0;}
    .allergen-chip.active{background:var(--accent);color:#fff;border-color:var(--accent);}
    .allergen-chip img{width:18px;height:18px;object-fit:contain;}
    .allergen-chip-label{font-size:12px;}

    /* Language Selector */
    .lang-select{padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,0.3);background:rgba(255,255,255,0.15);color:var(--secondary);font-size:13px;cursor:pointer;outline:none;}
    .lang-select option{background:var(--secondary);color:var(--text);}

    /* Responsive */
    @media(max-width:480px){
      .items-grid{grid-template-columns:1fr;}
      .item-image-wrapper{padding-top:60%;}
    }
    @media(min-width:769px){
      .items-grid{grid-template-columns:repeat(3,1fr);}
    }

    /* Custom CSS */
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
    .app { position: relative; z-index: 1; }
    ` : ''}
  </style>
</head>
<body>
  ${theme.backgroundIllustrationUrl ? '<div class="bg-illustration-overlay"></div>' : ''}
  <div class="app">
    <!-- Top Bar -->
    <div class="top-bar">
      <select class="lang-select" onchange="switchLanguage(this.value)">
        ${langOptions}
      </select>
    </div>

    <!-- Section Tabs -->
    <div class="section-tabs-bar">
      <button class="hamburger-btn" onclick="toggleNavDrawer()">☰</button>
      ${sectionTabs}
    </div>

    <!-- Nav Drawer -->
    <div class="nav-drawer-overlay" id="navOverlay" onclick="toggleNavDrawer()"></div>
    <div class="nav-drawer" id="navDrawer">
      ${theme.navDrawerBgUrl ? `<div class="nav-drawer-bg" style="background-image:url('${normalizeUrl(theme.navDrawerBgUrl)}');opacity:${(theme.navDrawerBgOpacity ?? 30) / 100}"></div>` : ''}
      <button class="nav-drawer-close" onclick="toggleNavDrawer()">✕</button>
      <div class="nav-drawer-content">
        <div class="nav-drawer-header">
          ${logoUrl ? `<img src="${logoUrl}" alt="${menu.restaurant.name}" class="nav-drawer-logo">` : ''}
          <div class="nav-drawer-name">${menu.restaurant.name}</div>
          <div class="nav-drawer-divider">Menu</div>
        </div>
        ${sectionNavCards}
      </div>
    </div>

    <!-- Allergen Filter Bar -->
    ${allergens.length > 0 ? `<div class="allergen-bar">${allergenBar}</div>` : ''}

    <!-- Menu Content -->
    <main class="menu-content">
      ${sectionsHTML}
    </main>
  </div>

  <script>
    // Language switching
    function switchLanguage(lang) {
      document.querySelectorAll('[data-lang]').forEach(el => {
        el.style.display = el.getAttribute('data-lang') === lang ? '' : 'none';
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
    }

    // Expandable card toggle
    function toggleCardExpand(card) {
      card.classList.toggle('expanded');
    }

    // Section navigation
    function scrollToSection(sectionId) {
      const el = document.getElementById('section-' + sectionId);
      if (el) {
        const offset = document.querySelector('.section-tabs-bar')?.offsetHeight || 0;
        const top = el.getBoundingClientRect().top + window.scrollY - offset - 70;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      // Update active tab
      document.querySelectorAll('.section-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-section-id') === sectionId);
      });
      // Close drawer if open
      if (document.getElementById('navDrawer').classList.contains('open')) toggleNavDrawer();
    }

    // Nav drawer
    function toggleNavDrawer() {
      document.getElementById('navDrawer').classList.toggle('open');
      document.getElementById('navOverlay').classList.toggle('open');
    }

    // Allergen filtering
    const activeAllergens = new Set();
    const filterMode = '${filterMode}';

    function toggleAllergenFilter(name) {
      const chip = document.querySelector('.allergen-chip[data-allergen="' + name + '"]');
      if (activeAllergens.has(name)) {
        activeAllergens.delete(name);
        if (chip) chip.classList.remove('active');
      } else {
        activeAllergens.add(name);
        if (chip) chip.classList.add('active');
      }
      applyAllergenFilter();
    }

    function applyAllergenFilter() {
      document.querySelectorAll('.item-card').forEach(card => {
        if (activeAllergens.size === 0) { card.classList.remove('hidden'); return; }
        const itemAllergens = (card.getAttribute('data-allergens') || '').split(',').filter(Boolean);
        if (filterMode === 'exclude') {
          const hasExcluded = itemAllergens.some(a => activeAllergens.has(a));
          card.classList.toggle('hidden', hasExcluded);
        } else {
          const hasAll = [...activeAllergens].every(a => itemAllergens.includes(a));
          card.classList.toggle('hidden', !hasAll);
        }
      });
    }

    // Auto-highlight section tabs on scroll
    document.addEventListener('DOMContentLoaded', () => {
      const sections = document.querySelectorAll('.menu-section');
      if (!sections.length) return;
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section-id');
            document.querySelectorAll('.section-tab').forEach(tab => {
              tab.classList.toggle('active', tab.getAttribute('data-section-id') === id);
            });
            // Auto-scroll tabs
            const activeTab = document.querySelector('.section-tab.active');
            if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          }
        });
      }, { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 });
      sections.forEach(s => observer.observe(s));
    });
  </script>
</body>
</html>`;
}
