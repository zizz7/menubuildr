// Seed admin user on production database
// Uses bcryptjs to hash the password, then inserts via raw SQL

import { execSync } from 'child_process';

const DATABASE_URL = "postgresql://postgres:menubuildr_pg_1k2hrso6w47@centerbeam.proxy.rlwy.net:44574/menubuildr";

// We'll use the server's seed logic via tsx
// But first, let's just create the admin via a simple approach
console.log("Seeding admin user on production database...");
console.log("Using DATABASE_URL:", DATABASE_URL.replace(/:[^@]+@/, ':***@'));

// Run the prisma command to check connection
try {
  const result = execSync(
    `npx tsx -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient({ datasources: { db: { url: '${DATABASE_URL}' } } });
  
  // Check if admin exists
  const existing = await prisma.admin.findFirst({ where: { email: 'admin@example.com' } });
  if (existing) {
    console.log('Admin already exists:', existing.email);
    await prisma.\\$disconnect();
    return;
  }
  
  // Create admin
  const hash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@example.com',
      password: hash,
      subscriptionStatus: 'active',
    }
  });
  console.log('Created admin:', admin.email, admin.id);
  await prisma.\\$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
"`,
    { cwd: 'server', stdio: 'inherit', timeout: 30000 }
  );
} catch (e) {
  console.error("Failed:", e.message);
}
