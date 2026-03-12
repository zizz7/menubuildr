/**
 * Re-import menu data from recovered JSON files into existing restaurants/menus.
 * This replaces the items/sections of existing menus with data parsed from HTML.
 * Usage: npx tsx server/scripts/reimport-menus.ts
 */
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ParsedItem {
  name: string;
  description: string;
  calories: number | null;
  price: number | null;
  allergens: string[];
  orderIndex: number;
}

interface ParsedSection {
  title: string;
  items: ParsedItem[];
  orderIndex: number;
}

function parseHtmlMenu(htmlPath: string): ParsedSection[] {
  const html = fs.readFileSync(htmlPath, 'utf-8');
  const $ = cheerio.load(html);
  const sections: ParsedSection[] = [];

  $('section.menu-section').each((sIdx, sectionEl) => {
    const $section = $(sectionEl);
    const sectionTitle = $section.find('.section-heading span[data-lang="ENG"]').text().trim();
    if (!sectionTitle) return;

    const items: ParsedItem[] = [];
    $section.find('article.item-card').each((iIdx, itemEl) => {
      const $item = $(itemEl);
      const itemName = $item.find('.item-title span[data-lang="ENG"]').text().trim();
      if (!itemName) return;

      const itemDesc = $item.find('.item-desc span[data-lang="ENG"]').text().trim();
      const calText = $item.find('.calories-badge').text().trim();
      const calMatch = calText.match(/(\d+)/);
      const calories = calMatch ? parseInt(calMatch[1], 10) : null;

      const priceText = $item.find('.item-price').text().trim();
      const priceMatch = priceText.match(/([\d.]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      const allergenStr = $item.attr('data-allergens') || '';
      const allergens = allergenStr ? allergenStr.split(',').map(a => a.trim()).filter(Boolean) : [];

      items.push({ name: itemName, description: itemDesc, calories, price, allergens, orderIndex: iIdx });
    });

    sections.push({ title: sectionTitle, items, orderIndex: sIdx });
  });

  return sections;
}

// Allergen names in the HTML data-allergens attribute match DB names directly (lowercase)

async function reimportMenu(menuSlug: string, htmlPath: string) {
  const rootDir = path.resolve(__dirname, '../..');
  const fullPath = path.resolve(rootDir, htmlPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  SKIP: ${fullPath} not found`);
    return;
  }

  // Find the menu
  const menu = await prisma.menu.findFirst({ where: { slug: menuSlug } });
  if (!menu) {
    console.log(`  SKIP: Menu with slug "${menuSlug}" not found in DB`);
    return;
  }

  console.log(`\nProcessing: ${menuSlug} from ${htmlPath}`);

  // Get existing sections to delete their items
  const existingSections = await prisma.section.findMany({
    where: { menuId: menu.id },
    include: { items: { include: { allergens: true, recipeDetails: true } } },
  });

  // Delete all existing items and sections for this menu
  for (const section of existingSections) {
    for (const item of section.items) {
      // Delete recipe details
      await prisma.recipeDetails.deleteMany({ where: { menuItemId: item.id } });
      // Delete allergen connections
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { allergens: { set: [] } },
      });
      // Delete the item
      await prisma.menuItem.delete({ where: { id: item.id } });
    }
    await prisma.section.delete({ where: { id: section.id } });
  }

  console.log(`  Deleted ${existingSections.length} old sections`);

  // Parse HTML
  const sections = parseHtmlMenu(fullPath);
  console.log(`  Parsed ${sections.length} sections from HTML`);

  // Get all allergens from DB
  const dbAllergens = await prisma.allergenIcon.findMany();
  const allergenMap = new Map<string, string>(); // lowercase name -> id
  for (const a of dbAllergens) {
    allergenMap.set(a.name.toLowerCase(), a.id);
  }

  // Create new sections and items
  let totalItems = 0;
  for (const sec of sections) {
    const section = await prisma.section.create({
      data: {
        menuId: menu.id,
        title: { ENG: sec.title },
        orderIndex: sec.orderIndex,
      },
    });

    for (const it of sec.items) {
      // Find matching allergen IDs
      const allergenIds: string[] = [];
      for (const allergenKey of it.allergens) {
        const id = allergenMap.get(allergenKey.toLowerCase());
        if (id) {
          allergenIds.push(id);
        }
      }

      const item = await prisma.menuItem.create({
        data: {
          sectionId: section.id,
          name: { ENG: it.name },
          description: it.description ? { ENG: it.description } : undefined,
          price: it.price,
          calories: it.calories,
          orderIndex: it.orderIndex,
          isAvailable: true,
          allergens: allergenIds.length > 0 ? { connect: allergenIds.map(id => ({ id })) } : undefined,
        },
      });

      // Create recipe details
      if (it.description) {
        await prisma.recipeDetails.create({
          data: {
            menuItemId: item.id,
            ingredients: { ENG: it.description },
          },
        });
      }

      totalItems++;
    }
  }

  console.log(`  Created ${sections.length} sections, ${totalItems} items`);
}

async function main() {
  console.log('Re-importing menu data from HTML files...\n');

  // Check allergens in DB
  const allergens = await prisma.allergenIcon.findMany();
  console.log(`Found ${allergens.length} allergens in DB: ${allergens.map(a => a.name).join(', ')}`);

  // Acquapazza menus
  await reimportMenu('acquapazza-lunch', 'dashboard/public/menus/acquapazza/acquapazza-lunch.html');
  await reimportMenu('acquapazza-dinner', 'dashboard/public/menus/acquapazza/acquapazza-dinner.html');

  // Tazaa menus
  await reimportMenu('tazaa-breakfast', 'dashboard/public/menus/tazaa/tazaa-breakfast.html');
  await reimportMenu('tazaa-lunch', 'dashboard/public/menus/tazaa/tazaa-lunch.html');
  await reimportMenu('tazaa-dinner', 'dashboard/public/menus/tazaa/tazaa-dinner-menu.html');

  console.log('\nDone! All menus re-imported from HTML files.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
