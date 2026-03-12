/**
 * Converts "Menu Ingredient Extraction and Analysis.xlsx" into one JSON file per
 * RESTAURANT in the same format as "Export Restaurant" (restaurant-db4031a9-....json)
 * so you can use "Import Restaurant" in the dashboard without any changes.
 *
 * Usage:
 *   npx tsx src/scripts/excel-to-restaurant-json.ts
 *   npx tsx src/scripts/excel-to-restaurant-json.ts "C:\path\to\file.xlsx"
 *   npx tsx src/scripts/excel-to-restaurant-json.ts "C:\path\to\file.xlsx" "d:\output\dir"
 *
 * Output: restaurant-<slug>.json per restaurant (same shape as export, no ids for import).
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_EXCEL =
  'C:\\Users\\Nazween\\Documents\\Menu Ingredient Extraction and Analysis.xlsx';

const CATEGORY_HEADERS = ['Category', 'Menu Category'];
const DISH_HEADERS = ['Dish', 'Dish Name'];
const INGREDIENTS_HEADERS = ['Key Ingredients', 'Ingredients', 'Extracted Ingredients'];
const CALORIES_HEADERS = ['Calories (kcal)', 'Cal'];

function findHeaderIndex(headers: unknown[], candidates: string[]): number {
  const lower = (v: unknown) => String(v ?? '').trim().toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    const h = lower(headers[i]);
    if (candidates.some((c) => h === c.toLowerCase())) return i;
  }
  return -1;
}

function inferMenuType(sheetName: string): 'breakfast' | 'lunch' | 'dinner' | 'drinks' {
  const s = sheetName.toLowerCase();
  if (s.includes('breakfast')) return 'breakfast';
  if (s.includes('lunch')) return 'lunch';
  if (s.includes('dinner')) return 'dinner';
  if (s.includes('drink')) return 'drinks';
  return 'dinner';
}

function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Infer restaurant name from sheet name: "Tazaa Lunch Menu" -> Tazaa, "Gingermoon Menu 2026" -> Gingermoon */
function inferRestaurantName(sheetName: string): string {
  let r = sheetName.trim();
  const suffixes = [
    ' lunch menu', ' dinner menu', ' breakfast menu',
    ' menu 2026', ' lunch 2026', ' dinner 2026',
    ' menu', ' 2026',
  ].sort((a, b) => b.length - a.length); // longest first so we strip " lunch menu" before " menu"
  for (const suf of suffixes) {
    const rLower = r.toLowerCase();
    if (rLower.endsWith(suf)) {
      r = r.slice(0, -suf.length).trim();
    } else {
      const i = rLower.indexOf(suf);
      if (i > 0) r = r.slice(0, i).trim();
    }
  }
  const firstPart = r.split(/\s+/)[0] || r;
  return firstPart.trim() || sheetName.trim();
}

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Shape matching export (no id, createdAt, updatedAt, restaurantId, menuId, sectionId, menuItemId)
type RestaurantExport = {
  name: string;
  logoUrl: string | null;
  logoPosition: string | null;
  slug: string;
  currency: string;
  defaultLanguage: string;
  activeStatus: boolean;
  themeSettings: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    customCss: string | null;
    customFontsUrls: string[];
    backgroundIllustrationUrl: string | null;
  };
  moduleSettings: {
    enablePriceVariations: boolean;
    enableAvailabilitySchedule: boolean;
    enableSeasonalItems: boolean;
    enableQrGeneration: boolean;
    enableSubcategories: boolean;
  };
  menus: Array<{
    name: Record<string, string>;
    slug: string;
    menuType: string;
    status: string;
    orderIndex: number;
    themeSettings: unknown;
    sections: Array<{
      title: Record<string, string>;
      orderIndex: number;
      parentSectionId: string | null;
      illustrationUrl: string | null;
      illustrationAsBackground: boolean;
      illustrationPosition: string | null;
      illustrationSize: string | null;
      items: Array<{
        name: Record<string, string>;
        description: Record<string, string> | null;
        price: number | null;
        calories: number | null;
        imageUrl: string | null;
        orderIndex: number;
        isAvailable: boolean;
        preparationTime: number | null;
        allergens: unknown[];
        recipeDetails: {
          ingredients: Record<string, string> | Array<{ name: string; quantity: number | null; unit: string | null }>;
          instructions: string | null;
          servings: number | null;
          difficultyLevel: string | null;
        } | null;
        priceVariations: unknown[];
        availabilitySchedule: unknown;
      }>;
      categories: unknown[];
    }>;
  }>;
};

function sheetToMenusAndSections(sheetName: string, data: unknown[][]): { menus: RestaurantExport['menus'] } {
  const headers = (data[0] || []) as string[];
  const rows = data.slice(1) as unknown[][];

  const catIdx = findHeaderIndex(headers, CATEGORY_HEADERS);
  const dishIdx = findHeaderIndex(headers, DISH_HEADERS);
  const ingIdx = findHeaderIndex(headers, INGREDIENTS_HEADERS);
  const calIdx = findHeaderIndex(headers, CALORIES_HEADERS);

  if (catIdx < 0 || dishIdx < 0) {
    throw new Error(`Sheet "${sheetName}": missing Category or Dish column.`);
  }

  const menuSlug = toSlug(sheetName);
  const menuType = inferMenuType(sheetName);

  const sectionMap = new Map<string, { title: Record<string, string>; orderIndex: number; items: RestaurantExport['menus'][0]['sections'][0]['items'] }>();
  let lastCategory = '';

  rows.forEach((row) => {
    const cat = (row[catIdx] != null && String(row[catIdx]).trim() !== '')
      ? String(row[catIdx]).trim()
      : lastCategory;
    const dishName = row[dishIdx] != null ? String(row[dishIdx]).trim() : '';
    if (!dishName) return;

    lastCategory = cat;

    if (!sectionMap.has(cat)) {
      sectionMap.set(cat, {
        title: { ENG: cat },
        orderIndex: sectionMap.size,
        items: [],
      });
    }
    const section = sectionMap.get(cat)!;

    const ingredientsStr = ingIdx >= 0 ? row[ingIdx] : undefined;
    const ingText = ingredientsStr != null ? String(ingredientsStr).trim() : '';
    const calories = toNum(calIdx >= 0 ? row[calIdx] : null);

    const item: RestaurantExport['menus'][0]['sections'][0]['items'][0] = {
      name: { ENG: dishName },
      description: ingText ? { ENG: ingText } : null,
      price: null,
      calories,
      imageUrl: null,
      orderIndex: section.items.length,
      isAvailable: true,
      preparationTime: null,
      allergens: [],
      recipeDetails: ingText
        ? { ingredients: { ENG: ingText }, instructions: null, servings: null, difficultyLevel: null }
        : null,
      priceVariations: [],
      availabilitySchedule: null,
    };
    section.items.push(item);
  });

  const sections = Array.from(sectionMap.values()).map((s) => ({
    title: s.title,
    orderIndex: s.orderIndex,
    parentSectionId: null as string | null,
    illustrationUrl: null as string | null,
    illustrationAsBackground: false,
    illustrationPosition: null as string | null,
    illustrationSize: null as string | null,
    items: s.items,
    categories: [] as unknown[],
  }));

  const menu = {
    name: { ENG: sheetName },
    slug: menuSlug,
    menuType,
    status: 'draft',
    orderIndex: 0,
    themeSettings: null,
    sections,
  };

  return { menus: [menu] };
}

function buildRestaurantExport(restaurantName: string, menus: RestaurantExport['menus']): RestaurantExport {
  const slug = toSlug(restaurantName) || 'restaurant';
  return {
    name: restaurantName,
    logoUrl: null,
    logoPosition: null,
    slug,
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
    menus: menus.map((m, idx) => ({ ...m, orderIndex: idx })),
  };
}

function main() {
  const excelPath = process.argv[2] || DEFAULT_EXCEL;
  const outDir = process.argv[3] || path.join(__dirname, '..', '..', 'import-data');

  if (!fs.existsSync(excelPath)) {
    console.error('Excel file not found:', excelPath);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  const workbook = XLSX.readFile(excelPath);
  const byRestaurant = new Map<string, RestaurantExport['menus']>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length < 2) continue;

    try {
      const restaurantName = inferRestaurantName(sheetName);
      const { menus } = sheetToMenusAndSections(sheetName, data);
      const existing = byRestaurant.get(restaurantName) || [];
      menus.forEach((m) => {
        m.orderIndex = existing.length;
        existing.push(m);
      });
      byRestaurant.set(restaurantName, existing);
    } catch (e) {
      console.error('Error processing sheet', sheetName, e);
    }
  }

  const created: string[] = [];
  for (const [restaurantName, menus] of byRestaurant) {
    const exportData = buildRestaurantExport(restaurantName, menus);
    const slug = toSlug(restaurantName) || 'restaurant';
    const outPath = path.join(outDir, `restaurant-${slug}.json`);
    fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2), 'utf-8');
    created.push(outPath);
    const totalItems = menus.reduce((s, m) => s + m.sections.reduce((s2, sec) => s2 + sec.items.length, 0), 0);
    console.log('Written:', outPath, `(${restaurantName}: ${menus.length} menus, ${totalItems} items)`);
  }

  console.log('');
  console.log('Done. Importable restaurant JSON files:', created.length);
  console.log('Use "Import Restaurant" in the dashboard and select one of these files.');
}

main();
