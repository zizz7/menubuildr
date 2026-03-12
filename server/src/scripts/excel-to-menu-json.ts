/**
 * Converts "Menu Ingredient Extraction and Analysis.xlsx" (or any similar workbook)
 * into one importable JSON file per sheet/menu. Output is ready for menu import.
 *
 * Usage:
 *   npx tsx src/scripts/excel-to-menu-json.ts
 *   npx tsx src/scripts/excel-to-menu-json.ts "C:\path\to\file.xlsx"
 *   npx tsx src/scripts/excel-to-menu-json.ts "C:\path\to\file.xlsx" "d:\output\dir"
 *
 * Output: one .json file per sheet in the output directory (default: server/import-data/)
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_EXCEL =
  'C:\\Users\\Nazween\\Documents\\Menu Ingredient Extraction and Analysis.xlsx';

// Column header variants across sheets
const CATEGORY_HEADERS = ['Category', 'Menu Category'];
const DISH_HEADERS = ['Dish', 'Dish Name'];
const INGREDIENTS_HEADERS = ['Key Ingredients', 'Ingredients', 'Extracted Ingredients'];
const CALORIES_HEADERS = ['Calories (kcal)', 'Cal'];
const PROTEIN_HEADERS = ['Protein (g)', 'Prot (g)'];
const CARBS_HEADERS = ['Carbs (g)'];
const FAT_HEADERS = ['Fat (g)', 'Fats (g)'];

type Row = Record<string, unknown>;

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

/** Parse ingredients string into array of { name, quantity, unit } for RecipeDetails.ingredients */
function parseIngredients(text: string | undefined): { name: string; quantity: number | null; unit: string | null }[] {
  if (!text || typeof text !== 'string') return [];
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((name) => ({ name, quantity: null as number | null, unit: null as string | null }));
}

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sheetToMenu(sheetName: string, data: unknown[][]): ImportableMenu {
  const headers = (data[0] || []) as string[];
  const rows = data.slice(1) as unknown[][];

  const catIdx = findHeaderIndex(headers, CATEGORY_HEADERS);
  const dishIdx = findHeaderIndex(headers, DISH_HEADERS);
  const ingIdx = findHeaderIndex(headers, INGREDIENTS_HEADERS);
  const calIdx = findHeaderIndex(headers, CALORIES_HEADERS);
  const proteinIdx = findHeaderIndex(headers, PROTEIN_HEADERS);
  const carbsIdx = findHeaderIndex(headers, CARBS_HEADERS);
  const fatIdx = findHeaderIndex(headers, FAT_HEADERS);

  if (catIdx < 0 || dishIdx < 0) {
    throw new Error(`Sheet "${sheetName}": missing Category or Dish column. Headers: ${JSON.stringify(headers)}`);
  }

  const menuSlug = toSlug(sheetName);
  const menuType = inferMenuType(sheetName);

  const sectionMap = new Map<string, ImportableSection>();
  let lastCategory = '';

  rows.forEach((row, orderIndex) => {
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
    const ingredients = parseIngredients(ingredientsStr as string | undefined);
    const calories = toNum(calIdx >= 0 ? row[calIdx] : null);

    const item: ImportableItem = {
      name: { ENG: dishName },
      description: { ENG: ingredientsStr ? String(ingredientsStr).trim() : '' },
      price: null,
      calories,
      orderIndex: section.items.length,
      recipeDetails:
        ingredients.length > 0
          ? { ingredients, instructions: null, servings: null, difficultyLevel: null }
          : null,
    };
    section.items.push(item);
  });

  const sections = Array.from(sectionMap.values());

  return {
    menuName: { ENG: sheetName },
    menuSlug,
    menuType,
    sections,
  };
}

// Types matching your app's multi-lang + Prisma-style import
export interface ImportableMenu {
  menuName: Record<string, string>;
  menuSlug: string;
  menuType: 'breakfast' | 'lunch' | 'dinner' | 'drinks';
  sections: ImportableSection[];
}

export interface ImportableSection {
  title: Record<string, string>;
  orderIndex: number;
  items: ImportableItem[];
}

export interface ImportableItem {
  name: Record<string, string>;
  description?: Record<string, string> | null;
  price: number | null;
  calories?: number | null;
  orderIndex: number;
  recipeDetails?: {
    ingredients: { name: string; quantity: number | null; unit: string | null }[];
    instructions: string | null;
    servings: number | null;
    difficultyLevel: string | null;
  } | null;
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
  const created: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length < 2) {
      console.warn('Skipping empty or header-only sheet:', sheetName);
      continue;
    }

    try {
      const menu = sheetToMenu(sheetName, data);
      const safeName = toSlug(sheetName) || 'menu';
      const outPath = path.join(outDir, `${safeName}.json`);
      fs.writeFileSync(outPath, JSON.stringify(menu, null, 2), 'utf-8');
      created.push(outPath);
      console.log('Written:', outPath, `(${menu.sections.length} sections, ${menu.sections.reduce((s, sec) => s + sec.items.length, 0)} items)`);
    } catch (e) {
      console.error('Error processing sheet', sheetName, e);
    }
  }

  const allPath = path.join(outDir, 'all-menus.json');
  const allMenus: ImportableMenu[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (data.length >= 2) {
      try {
        allMenus.push(sheetToMenu(sheetName, data));
      } catch {
        // skip
      }
    }
  }
  if (allMenus.length > 0) {
    fs.writeFileSync(allPath, JSON.stringify(allMenus, null, 2), 'utf-8');
    created.push(allPath);
    console.log('Written (all menus):', allPath);
  }

  console.log('');
  console.log('Done. Importable JSON files:', created.length);
  console.log('Output directory:', path.resolve(outDir));
}

main();
