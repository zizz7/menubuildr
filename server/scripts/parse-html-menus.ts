/**
 * Parse generated HTML menu files back into importable JSON format.
 * Usage: npx tsx server/scripts/parse-html-menus.ts
 */
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface MenuItem {
  name: Record<string, string>;
  description: Record<string, string> | null;
  price: number | null;
  calories: number | null;
  imageUrl: string | null;
  orderIndex: number;
  isAvailable: boolean;
  preparationTime: null;
  allergens: string[];
  recipeDetails: {
    ingredients: Record<string, string>;
    instructions: null;
    servings: null;
    difficultyLevel: null;
  };
  priceVariations: never[];
  availabilitySchedule: null;
}

interface Section {
  title: Record<string, string>;
  orderIndex: number;
  parentSectionId: null;
  illustrationUrl: null;
  illustrationAsBackground: false;
  illustrationPosition: null;
  illustrationSize: null;
  items: MenuItem[];
  categories: never[];
}

interface MenuData {
  name: Record<string, string>;
  slug: string;
  menuType: string;
  status: string;
  orderIndex: number;
  themeSettings: null;
  sections: Section[];
}

// Map allergen icon alt text to allergen names used in the system
const allergenAltMap: Record<string, string> = {
  'Vegetarian': 'vegetarian',
  'Vegan': 'vegan',
  'Contains Dairy': 'dairy',
  'Contains Gluten': 'gluten',
  'Contains Nuts': 'nuts',
  'Spicy': 'spicy',
  'Pork': 'pork',
  'Poultry': 'poultry',
  'Seafood': 'seafood',
  'Crustacean': 'crustacean',
  'Mushroom': 'mushrooms',
};

function parseHtmlMenu(htmlPath: string): { sections: Section[]; title: string } {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const title = $('title').text().trim();
  const sections: Section[] = [];

  $('section.menu-section').each((sIdx, sectionEl) => {
    const $section = $(sectionEl);
    
    // Get section title (ENG text from the heading)
    const sectionTitle = $section.find('.section-heading span[data-lang="ENG"]').text().trim();
    if (!sectionTitle) return;

    const items: MenuItem[] = [];

    $section.find('article.item-card').each((iIdx, itemEl) => {
      const $item = $(itemEl);

      // Item name
      const itemName = $item.find('.item-title span[data-lang="ENG"]').text().trim();
      if (!itemName) return;

      // Description
      const itemDesc = $item.find('.item-desc span[data-lang="ENG"]').text().trim();

      // Calories
      const calText = $item.find('.calories-badge').text().trim();
      const calMatch = calText.match(/(\d+)/);
      const calories = calMatch ? parseInt(calMatch[1], 10) : null;

      // Price
      const priceText = $item.find('.item-price').text().trim();
      const priceMatch = priceText.match(/([\d.]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      // Allergens from data-allergens attribute
      const allergenStr = $item.attr('data-allergens') || '';
      const allergens = allergenStr ? allergenStr.split(',').map(a => a.trim()).filter(Boolean) : [];

      items.push({
        name: { ENG: itemName },
        description: itemDesc ? { ENG: itemDesc } : null,
        price,
        calories,
        imageUrl: null,
        orderIndex: iIdx,
        isAvailable: true,
        preparationTime: null,
        allergens,
        recipeDetails: {
          ingredients: itemDesc ? { ENG: itemDesc } : { ENG: '' },
          instructions: null,
          servings: null,
          difficultyLevel: null,
        },
        priceVariations: [],
        availabilitySchedule: null,
      });
    });

    sections.push({
      title: { ENG: sectionTitle },
      orderIndex: sIdx,
      parentSectionId: null,
      illustrationUrl: null,
      illustrationAsBackground: false,
      illustrationPosition: null,
      illustrationSize: null,
      items,
      categories: [],
    });
  });

  return { sections, title };
}

function detectMenuType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('breakfast')) return 'breakfast';
  if (lower.includes('lunch')) return 'lunch';
  if (lower.includes('dinner')) return 'dinner';
  return 'dinner';
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Define the HTML files to parse, grouped by restaurant
const menuFiles = {
  acquapazza: {
    name: 'Acquapazza',
    slug: 'acquapazza',
    files: [
      { path: 'dashboard/public/menus/acquapazza/acquapazza-lunch.html', menuName: 'Acquapazza Lunch 2026', slug: 'acquapazza-lunch-2026', type: 'lunch' },
      { path: 'dashboard/public/menus/acquapazza/acquapazza-dinner.html', menuName: 'Acquapazza Dinner 2026', slug: 'acquapazza-dinner-2026', type: 'dinner' },
    ],
  },
  tazaa: {
    name: 'Tazaa',
    slug: 'tazaa',
    files: [
      { path: 'dashboard/public/menus/tazaa/tazaa-breakfast.html', menuName: 'Tazaa Breakfast 2026', slug: 'tazaa-breakfast-2026', type: 'breakfast' },
      { path: 'dashboard/public/menus/tazaa/tazaa-lunch.html', menuName: 'Tazaa Lunch 2026', slug: 'tazaa-lunch-2026', type: 'lunch' },
      { path: 'dashboard/public/menus/tazaa/tazaa-dinner-menu.html', menuName: 'Tazaa Dinner 2026', slug: 'tazaa-dinner-2026', type: 'dinner' },
    ],
  },
};

const rootDir = path.resolve(__dirname, '../..');
const outputDir = path.resolve(__dirname, '../import-data');

for (const [key, restaurant] of Object.entries(menuFiles)) {
  const menus: MenuData[] = [];

  for (let mi = 0; mi < restaurant.files.length; mi++) {
    const menuFile = restaurant.files[mi];
    const htmlPath = path.resolve(rootDir, menuFile.path);

    if (!fs.existsSync(htmlPath)) {
      console.warn(`  SKIP: ${htmlPath} not found`);
      continue;
    }

    console.log(`  Parsing: ${menuFile.path}`);
    const { sections } = parseHtmlMenu(htmlPath);

    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    console.log(`    -> ${sections.length} sections, ${totalItems} items`);

    menus.push({
      name: { ENG: menuFile.menuName },
      slug: menuFile.slug,
      menuType: menuFile.type,
      status: 'draft',
      orderIndex: mi,
      themeSettings: null,
      sections,
    });
  }

  const output = {
    name: restaurant.name,
    logoUrl: null,
    logoPosition: null,
    slug: restaurant.slug,
    currency: 'USD',
    defaultLanguage: 'ENG',
    activeStatus: true,
    themeSettings: {
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
      accentColor: '#ff6b6b',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      customCss: null,
      customFontsUrls: [],
      backgroundIllustrationUrl: null,
    },
    moduleSettings: {
      enablePriceVariations: false,
      enableAvailabilitySchedule: false,
      enableSeasonalItems: false,
      enableQrGeneration: false,
      enableSubcategories: false,
    },
    menus,
  };

  const outputPath = path.resolve(outputDir, `restaurant-${restaurant.slug}-recovered.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nWrote: ${outputPath}`);
  console.log(`  ${menus.length} menus, ${menus.reduce((s, m) => s + m.sections.reduce((ss, sec) => ss + sec.items.length, 0), 0)} total items`);
}

console.log('\nDone! Import these files via Dashboard -> Import/Export -> Import Restaurant');
