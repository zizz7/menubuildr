import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const PROD_URL = process.env.PROD_DATABASE_URL || "postgresql://postgres:menubuildr_pg_1k2hrso6w47@centerbeam.proxy.rlwy.net:44574/menubuildr";

const prisma = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  // Check if admin exists
  const existing = await prisma.admin.findFirst({ where: { email: 'admin@menubuildr.com' } });
  if (existing) {
    console.log('Admin already exists:', existing.email, existing.id);
  } else {
    const hash = await bcrypt.hash('P@ssw0rd', 10);
    const admin = await prisma.admin.create({
      data: { email: 'admin@menubuildr.com', passwordHash: hash, name: 'Admin', subscriptionStatus: 'active' }
    });
    console.log('Created admin:', admin.email, admin.id);
  }

  // Templates
  const templates = [
    { name: { ENG: 'Classic' }, slug: 'classic', description: { ENG: 'Traditional menu layout' }, previewImageUrl: '/template-previews/classic-preview.svg' },
    { name: { ENG: 'Card Based' }, slug: 'card-based', description: { ENG: 'Modern card-based layout' }, previewImageUrl: '/template-previews/card-based-preview.svg' },
    { name: { ENG: 'Coraflow' }, slug: 'coraflow', description: { ENG: 'Elegant flowing design' }, previewImageUrl: '/template-previews/coraflow-preview.svg' },
  ];
  for (const t of templates) {
    await prisma.menuTemplate.create({ data: t });
  }
  console.log('Created', templates.length, 'templates');

  // Languages
  const langs = [
    { code: 'ENG', name: 'English', isActive: true, orderIndex: 0 },
    { code: 'ARA', name: 'Arabic', isActive: true, orderIndex: 1 },
    { code: 'FRE', name: 'French', isActive: true, orderIndex: 2 },
    { code: 'SPA', name: 'Spanish', isActive: true, orderIndex: 3 },
    { code: 'ITA', name: 'Italian', isActive: true, orderIndex: 4 },
  ];
  for (const l of langs) {
    await prisma.language.create({ data: l });
  }
  console.log('Created', langs.length, 'languages');

  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
