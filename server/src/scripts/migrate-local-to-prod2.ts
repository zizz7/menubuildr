/**
 * Migrate local DB data to production.
 * Uses explicit local DB URL and reads ALL restaurants regardless of admin.
 * Re-maps admin_id to prod admin@menubuildr.com.
 */
import { PrismaClient } from '@prisma/client';

const LOCAL_URL = "postgresql://postgres:admin@localhost:5432/menu_management";
const PROD_URL = "postgresql://postgres:menubuildr_pg_1k2hrso6w47@centerbeam.proxy.rlwy.net:44574/menubuildr";

const local = new PrismaClient({ datasources: { db: { url: LOCAL_URL } } });
const prod = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  // Get prod admin
  const prodAdmin = await prod.admin.findFirstOrThrow({ where: { email: 'admin@menubuildr.com' } });
  console.log('Prod admin:', prodAdmin.id);

  // Read ALL local data (no admin filter)
  const restaurants = await local.restaurant.findMany({ include: { themeSettings: true, moduleSettings: true } });
  const allergens = await local.allergenIcon.findMany();
  const allergenSettings = await local.allergenSettings.findMany();
  const menus = await local.menu.findMany();
  const versions = await local.menuVersion.findMany();
  const sections = await local.section.findMany();
  const categories = await local.category.findMany();
  const items = await local.menuItem.findMany({
    include: { allergens: true, recipeDetails: true, priceVariations: true, availabilitySchedule: true, translations: true },
  });

  console.log(`Found: ${restaurants.length} restaurants, ${menus.length} menus, ${sections.length} sections, ${items.length} items`);
  console.log(`  ${allergens.length} allergens, ${versions.length} versions, ${categories.length} categories`);

  if (restaurants.length === 0) { console.log('Nothing to migrate!'); return; }

  console.log('\nWriting to production...');

  // Allergen icons
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
  console.log('  Allergen icons: done');

  for (const s of allergenSettings) {
    const exists = await prod.allergenSettings.findUnique({ where: { id: s.id } });
    if (!exists) { await prod.allergenSettings.create({ data: s }); }
  }
  console.log('  Allergen settings: done');

  // Restaurants — remap adminId to prod admin
  for (const r of restaurants) {
    const { themeSettings: ts, moduleSettings: ms, ...rest } = r;
    const exists = await prod.restaurant.findUnique({ where: { id: rest.id } });
    if (!exists) {
      await prod.restaurant.create({ data: { ...rest, adminId: prodAdmin.id } });
    }
    if (ts) {
      const e = await prod.themeSettings.findUnique({ where: { restaurantId: ts.restaurantId } });
      if (!e) { await prod.themeSettings.create({ data: ts as any }); }
    }
    if (ms) {
      const e = await prod.moduleSettings.findUnique({ where: { restaurantId: ms.restaurantId } });
      if (!e) { await prod.moduleSettings.create({ data: ms as any }); }
    }
  }
  console.log('  Restaurants: done');

  // Build template ID mapping (local slug -> prod id)
  const localTemplates = await local.menuTemplate.findMany();
  const prodTemplates = await prod.menuTemplate.findMany();
  const templateMap: Record<string, string> = {};
  for (const lt of localTemplates) {
    const pt = prodTemplates.find(p => p.slug === lt.slug);
    if (pt) templateMap[lt.id] = pt.id;
  }
  console.log('  Template ID map:', Object.keys(templateMap).length, 'mappings');

  for (const m of menus) {
    const exists = await prod.menu.findUnique({ where: { id: m.id } });
    if (!exists) {
      const data = { ...m } as any;
      if (data.templateId && templateMap[data.templateId]) {
        data.templateId = templateMap[data.templateId];
      }
      await prod.menu.create({ data });
    }
  }
  console.log('  Menus: done');

  for (const v of versions) {
    const exists = await prod.menuVersion.findUnique({ where: { id: v.id } });
    if (!exists) { await prod.menuVersion.create({ data: v as any }); }
  }
  console.log('  Versions: done');

  // Sections (parents first)
  const parents = sections.filter(s => !s.parentSectionId);
  const children = sections.filter(s => s.parentSectionId);
  for (const s of [...parents, ...children]) {
    const exists = await prod.section.findUnique({ where: { id: s.id } });
    if (!exists) { await prod.section.create({ data: s as any }); }
  }
  console.log('  Sections: done');

  for (const c of categories) {
    const exists = await prod.category.findUnique({ where: { id: c.id } });
    if (!exists) { await prod.category.create({ data: c as any }); }
  }
  console.log('  Categories: done');

  // Menu items with all relations
  let count = 0;
  for (const item of items) {
    const { allergens: ia, recipeDetails: rd, priceVariations: pv, availabilitySchedule: sched, translations: tr, ...data } = item;
    const exists = await prod.menuItem.findUnique({ where: { id: item.id } });
    if (exists) continue;
    await prod.menuItem.create({ data: data as any });
    if (ia.length > 0) {
      await prod.menuItem.update({ where: { id: item.id }, data: { allergens: { connect: ia.map(a => ({ id: a.id })) } } });
    }
    if (rd) { await prod.recipeDetails.create({ data: rd as any }); }
    for (const p of pv) { await prod.priceVariation.create({ data: p as any }); }
    if (sched) { await prod.availabilitySchedule.create({ data: sched as any }); }
    for (const t of tr) { await prod.menuItemTranslation.create({ data: t as any }); }
    count++;
  }
  console.log(`  Menu items: ${count} inserted`);

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
