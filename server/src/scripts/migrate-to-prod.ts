/**
 * Migrate all data from local database to production.
 * Exports the local admin (with all restaurants, menus, sections, items, etc.)
 * and imports into the production database.
 * 
 * Usage: PROD_DATABASE_URL="postgresql://..." npx tsx src/scripts/migrate-to-prod.ts
 */
import { PrismaClient } from '@prisma/client';

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) {
  console.error('Set PROD_DATABASE_URL env var');
  process.exit(1);
}

const local = new PrismaClient();
const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  console.log('Reading local database...');

  // 1. Admin
  const admins = await local.admin.findMany();
  console.log(`  Admins: ${admins.length}`);

  // 2. Restaurants with theme/module settings
  const restaurants = await local.restaurant.findMany({
    include: { themeSettings: true, moduleSettings: true },
  });
  console.log(`  Restaurants: ${restaurants.length}`);

  // 3. Menu templates
  const templates = await local.menuTemplate.findMany();
  console.log(`  Templates: ${templates.length}`);

  // 4. Menus
  const menus = await local.menu.findMany();
  console.log(`  Menus: ${menus.length}`);

  // 5. Menu versions
  const versions = await local.menuVersion.findMany();
  console.log(`  Menu versions: ${versions.length}`);

  // 6. Sections
  const sections = await local.section.findMany();
  console.log(`  Sections: ${sections.length}`);

  // 7. Categories
  const categories = await local.category.findMany();
  console.log(`  Categories: ${categories.length}`);

  // 8. Menu items with relations
  const items = await local.menuItem.findMany({
    include: {
      allergens: true,
      recipeDetails: true,
      priceVariations: true,
      availabilitySchedule: true,
      translations: true,
    },
  });
  console.log(`  Menu items: ${items.length}`);

  // 9. Allergen icons
  const allergens = await local.allergenIcon.findMany();
  console.log(`  Allergen icons: ${allergens.length}`);

  // 10. Allergen settings
  const allergenSettings = await local.allergenSettings.findMany();
  console.log(`  Allergen settings: ${allergenSettings.length}`);

  // 11. Languages
  const languages = await local.language.findMany();
  console.log(`  Languages: ${languages.length}`);

  // --- Now write to production ---
  console.log('\nWriting to production database...');

  // Clear existing data in prod (reverse dependency order)
  console.log('  Clearing existing prod data...');
  await prod.menuItemTranslation.deleteMany();
  await prod.availabilitySchedule.deleteMany();
  await prod.priceVariation.deleteMany();
  await prod.recipeDetails.deleteMany();
  // Disconnect allergen-menuitem relations via raw SQL
  await prod.$executeRawUnsafe(`DELETE FROM "_AllergenIconToMenuItem"`);
  await prod.menuItem.deleteMany();
  await prod.category.deleteMany();
  await prod.section.deleteMany();
  await prod.menuVersion.deleteMany();
  await prod.menu.deleteMany();
  await prod.menuTemplate.deleteMany();
  await prod.moduleSettings.deleteMany();
  await prod.themeSettings.deleteMany();
  await prod.restaurant.deleteMany();
  await prod.allergenIcon.deleteMany();
  await prod.allergenSettings.deleteMany();
  await prod.language.deleteMany();
  await prod.admin.deleteMany();
  console.log('  Cleared.');

  // Insert admins
  for (const a of admins) {
    await prod.admin.create({ data: a });
  }
  console.log(`  Inserted ${admins.length} admins`);

  // Insert languages
  for (const l of languages) {
    await prod.language.create({ data: l });
  }
  console.log(`  Inserted ${languages.length} languages`);

  // Insert allergen icons (without menuItem relations)
  for (const a of allergens) {
    await prod.allergenIcon.create({ data: {
      id: a.id, name: a.name, imageUrl: a.imageUrl,
      label: a.label as any, isCustom: a.isCustom,
      orderIndex: a.orderIndex, createdAt: a.createdAt,
    }});
  }
  console.log(`  Inserted ${allergens.length} allergen icons`);

  // Insert allergen settings
  for (const s of allergenSettings) {
    await prod.allergenSettings.create({ data: s });
  }
  console.log(`  Inserted ${allergenSettings.length} allergen settings`);

  // Insert templates
  for (const t of templates) {
    await prod.menuTemplate.create({ data: t as any });
  }
  console.log(`  Inserted ${templates.length} templates`);

  // Insert restaurants with theme/module settings
  for (const r of restaurants) {
    const { themeSettings: ts, moduleSettings: ms, ...rest } = r;
    await prod.restaurant.create({ data: rest });
    if (ts) {
      const { ...tsData } = ts;
      await prod.themeSettings.create({ data: tsData as any });
    }
    if (ms) {
      const { ...msData } = ms;
      await prod.moduleSettings.create({ data: msData as any });
    }
  }
  console.log(`  Inserted ${restaurants.length} restaurants`);

  // Insert menus
  for (const m of menus) {
    await prod.menu.create({ data: m as any });
  }
  console.log(`  Inserted ${menus.length} menus`);

  // Insert menu versions
  for (const v of versions) {
    await prod.menuVersion.create({ data: v as any });
  }
  console.log(`  Inserted ${versions.length} menu versions`);

  // Insert sections (parent sections first, then children)
  const parentSections = sections.filter(s => !s.parentSectionId);
  const childSections = sections.filter(s => s.parentSectionId);
  for (const s of parentSections) {
    await prod.section.create({ data: s as any });
  }
  for (const s of childSections) {
    await prod.section.create({ data: s as any });
  }
  console.log(`  Inserted ${sections.length} sections`);

  // Insert categories
  for (const c of categories) {
    await prod.category.create({ data: c as any });
  }
  console.log(`  Inserted ${categories.length} categories`);

  // Insert menu items (without relations first)
  for (const item of items) {
    const { allergens: itemAllergens, recipeDetails, priceVariations, availabilitySchedule, translations, ...itemData } = item;
    await prod.menuItem.create({ data: itemData as any });

    // Connect allergens via the join table
    if (itemAllergens.length > 0) {
      await prod.menuItem.update({
        where: { id: item.id },
        data: { allergens: { connect: itemAllergens.map(a => ({ id: a.id })) } },
      });
    }

    // Recipe details
    if (recipeDetails) {
      await prod.recipeDetails.create({ data: recipeDetails as any });
    }

    // Price variations
    for (const pv of priceVariations) {
      await prod.priceVariation.create({ data: pv as any });
    }

    // Availability schedule
    if (availabilitySchedule) {
      await prod.availabilitySchedule.create({ data: availabilitySchedule as any });
    }

    // Translations
    for (const t of translations) {
      await prod.menuItemTranslation.create({ data: t as any });
    }
  }
  console.log(`  Inserted ${items.length} menu items (with relations)`);

  console.log('\nMigration complete!');
  await local.$disconnect();
  await prod.$disconnect();
}

main().catch(async (e) => {
  console.error('Migration failed:', e);
  await local.$disconnect();
  await prod.$disconnect();
  process.exit(1);
});
