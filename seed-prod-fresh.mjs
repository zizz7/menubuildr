import { execSync } from 'child_process';

const PROD_URL = "postgresql://postgres:menubuildr_pg_1k2hrso6w47@centerbeam.proxy.rlwy.net:44574/menubuildr";

const script = `
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: '${PROD_URL}' } } });
  
  // Create admin
  const hash = await bcrypt.hash('P@ssw0rd', 10);
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@menubuildr.com',
      password: hash,
      subscriptionStatus: 'active',
    }
  });
  console.log('Created admin:', admin.email, admin.id);

  // Create default templates
  const templates = [
    { name: 'Classic', slug: 'classic', description: 'Traditional menu layout', previewImage: '/template-previews/classic-preview.svg', isDefault: true },
    { name: 'Card Based', slug: 'card-based', description: 'Modern card-based layout', previewImage: '/template-previews/card-based-preview.svg', isDefault: false },
    { name: 'Coraflow', slug: 'coraflow', description: 'Elegant flowing design', previewImage: '/template-previews/coraflow-preview.svg', isDefault: false },
  ];
  for (const t of templates) {
    await prisma.menuTemplate.create({ data: t });
  }
  console.log('Created', templates.length, 'templates');

  // Create default languages
  const langs = [
    { code: 'en', name: 'English', nativeName: 'English', isDefault: true },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', isDefault: false, direction: 'rtl' },
    { code: 'fr', name: 'French', nativeName: 'Français', isDefault: false },
    { code: 'es', name: 'Spanish', nativeName: 'Español', isDefault: false },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', isDefault: false },
  ];
  for (const l of langs) {
    await prisma.language.create({ data: l });
  }
  console.log('Created', langs.length, 'languages');

  await prisma.$disconnect();
  console.log('Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
`;

try {
  execSync(`npx tsx -e "${script.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, {
    cwd: 'server', stdio: 'inherit', timeout: 30000
  });
} catch (e) {
  console.error("Failed:", e.message);
}
