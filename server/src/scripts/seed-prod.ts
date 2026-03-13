import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Set PROD_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
});

async function main() {
  console.log('Connecting to production database...');
  
  const existing = await prisma.admin.findFirst({ where: { email: 'admin@example.com' } });
  if (existing) {
    console.log('Admin already exists:', existing.email, existing.id);
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.admin.update({
      where: { id: existing.id },
      data: { passwordHash: hash, subscriptionStatus: 'active' },
    });
    console.log('Password reset to admin123');
  } else {
    const hash = await bcrypt.hash('admin123', 10);
    const admin = await prisma.admin.create({
      data: {
        email: 'admin@example.com',
        passwordHash: hash,
        name: 'Admin',
        subscriptionStatus: 'active',
      },
    });
    console.log('Created admin:', admin.email, admin.id);
  }

  await prisma.$disconnect();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
