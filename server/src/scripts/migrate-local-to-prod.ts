/**
 * Migrate local restaurants, menus, sections, items etc. to production
 * under the admin@menubuildr.com account.
 */
import { PrismaClient } from '@prisma/client';

const PROD_URL = "postgresql://postgres:menubuildr_pg_1k2hrso6w47@centerbeam.proxy.rlwy.net:44574/menubuildr";

const local = new PrismaClient();
const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  // Get prod admin
  const prodAdmin = await prod.admin.findFirst({ where: { email: 'admin@menubuildr.com' } });
  if (!prodAdmin) { console.error('No admin@menubuildr.com in prod'); process.exit(1); }
  console.log('Prod admin:', prodAdmin.id);

  // Check local data
  const localAdmins = await local.admin.findMany();
  console.log('Local admins:', localAdmins.map(a => a.email));

  const localRestaurants = await local.restaurant.findMany({
    include: { themeSettings: true, moduleSettings: true },
  });
  console.log(`Local restaurants: ${localRestaurants.length}`);
  if (localRestaurants.length === 0) {
    console.log('No local data to migrate.');
    await local.$disconnect();
    await prod.$disconnect();
    return;
  }

  // Allergen icons
  const allergens = await local.allergenIcon.findMany();
  console.log(`  Allergen icons: ${allergens.length}`);

  // Allergen settings
  const allergenSettings = await local.allergenSettings.findMany();
  console.log(`  Allergen settings: ${allergenSettings.length}`);

  // Menus
  const menus = await local.menu.findMany();
  console.log(`  Menus: ${menus.length}`);

  // Menu versions
  const versions = await local.menuVersion.findMany();
  console.log(`  Menu versions: ${versions.length}`);

  // Sections
  const sections = await local.section.findMany();
  console.log(`  Sections: ${sections.length}`);

  // Categories
  const categories = await local.category.findMany();
  console.log(`  Categories: ${categories.length}`);

  // Menu items with all relations
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

  // --- Write to production ---
  console.log('\nWriting to production...');

  // Allergen icons (skip existing by id)
  for (const a of allergens) {
    const exists = await prod.allergenIcon.findUnique({ where: { id: a.id } });
    if (!exists) {
      await prod.allergenIcon.create({ data: {
        id: a.id, name: a.name, imageUrl: a.imageUrl,
        label: a.label as any, isCustom: a.isCustom,
        orderIndex: a.orderIndex, createdAt: a.createdAt,
      }});
    }
  }
  console.log(`  Synced ${allergens.length} allergen icons`);

  // Allergen settings
  for (const s of allergenSettings) {
    const exists = await prod.allergenSettings.findUnique({ where: { id: s.id } });
    if (!exists) {
      await prod.allergenSettings.create({ data: s });
    }
  }
  console.log(`  Synced ${allergenSettings.length} allergen settings`);

  // Restaurants — assign to prod admin
  for (const r of localRestaurants) {
    const { themeSettings: ts, moduleSettings: ms, ...rest } = r;
    const exists = await prod.restaurant.findUnique({ where: { id: rest.id } });
    if (!exists) {
      await prod.restaurant.create({ data: { ...rest, adminId: prodAdmin.id } });
    }
    if (ts) {
      const existsTs = await prod.themeSettings.findUnique({ where: { restaurantId: ts.restaurantId } });
      if (!existsTs) {
        await prod.themeSettings.create({ data: ts as any });
      }
    }
    if (ms) {
      const existsMs = await prod.moduleSettings.findUnique({ where: { restaurantId: ms.restaurantId } });
      if (!existsMs) {
        await prod.moduleSettings.create({ data: ms as any });
      }
    }
  }
  console.log(`  Inserted ${localRestaurants.length} restaurants`);

  // Menus
  for (const m of menus) {
    const exists = await prod.menu.findUnique({ where: { id: m.id } });
    if (!exists) {
      await prod.menu.create({ data: m as any });
    }
  }
  console.log(`  Inserted ${menus.length} menus`);

  // Menu versions
  for (const v of versions) {
    const exists = await prod.menuVersion.findUnique({ where: { id: v.id } });
    if (!exists) {
      await prod.menuVersion.create({ data: v as any });
    }
  }
  console.log(`  Inserted ${versions.length} menu versions`);

  // Sections (parents first, then children)
  const parentSections = sections.filter(s => !s.parentSectionId);
  const childSections = sections.filter(s => s.parentSectionId);
  for (const s of [...parentSections, ...childSections]) {
    const exists = await prod.section.findUnique({ where: { id: s.id } });
    if (!exists) {
      await prod.section.create({ data: s as any });
    }
  }
  console.log(`  Inserted ${sections.length} sections`);

  // Categories
  for (const c of categories) {
    const exists = await prod.category.findUnique({ where: { id: c.id } });
    if (!exists) {
      await prod.category.create({ data: c as any });
    }
  }
  console.log(`  Inserted ${categories.length} categories`);

  // Menu items with relations
  for (const item of items) {
    const { allergens: itemAllergens, recipeDetails, priceVariations, availabilitySchedule, translations, ...itemData } = item;
    const exists = await prod.menuItem.findUnique({ where: { id: item.id } });
    if (exists) continue;

    await prod.menuItem.create({ data: itemData as any });

    if (itemAllergens.length > 0) {
      await prod.menuItem.update({
        where: { id: item.id },
        data: { allergens: { connect: itemAllergens.map(a => ({ id: a.id })) } },
      });
    }

    if (recipeDetails) {
      await prod.recipeDetails.create({ data: recipeDetails as any });
    }

    for (const pv of priceVariations) {
      await prod.priceVariation.create({ data: pv as any });
    }

    if (availabilitySchedule) {
      await prod.availabilitySchedule.create({ data: availabilitySchedule as any });
    }

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
