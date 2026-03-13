import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const PROD_URL = process.env.PROD_DATABASE_URL;
if (!PROD_URL) { console.error('Set PROD_DATABASE_URL'); process.exit(1); }

const p = new PrismaClient({ datasources: { db: { url: PROD_URL } } });

async function main() {
  const admin = await p.admin.findFirst({ where: { email: 'admin@example.com' } });
  if (!admin) { console.error('Admin not found'); process.exit(1); }

  const hash = await bcrypt.hash('P@ssw0rd', 10);
  await p.admin.update({
    where: { id: admin.id },
    data: {
      email: 'admin@menubuildr.com',
      passwordHash: hash,
      subscriptionStatus: 'active',
    },
  });
  console.log('Updated admin: admin@menubuildr.com');
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
