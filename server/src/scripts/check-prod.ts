import { PrismaClient } from '@prisma/client';

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) { console.error('Set PROD_DATABASE_URL'); process.exit(1); }

const p = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  const counts = {
    admins: await p.admin.count(),
    restaurants: await p.restaurant.count(),
    menus: await p.menu.count(),
    sections: await p.section.count(),
    items: await p.menuItem.count(),
    recipeDetails: await p.recipeDetails.count(),
    allergens: await p.allergenIcon.count(),
    languages: await p.language.count(),
    templates: await p.menuTemplate.count(),
    versions: await p.menuVersion.count(),
  };
  console.log('Production database counts:');
  console.log(JSON.stringify(counts, null, 2));
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
