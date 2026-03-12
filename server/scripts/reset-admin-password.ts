import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetPassword() {
  const email = 'admin@example.com';
  const newPassword = 'admin123';

  const hash = await bcrypt.hash(newPassword, 10);

  const admin = await prisma.admin.update({
    where: { email },
    data: { passwordHash: hash },
  });

  console.log(`Password reset for ${admin.email} (${admin.id})`);
  console.log(`Login with: ${email} / ${newPassword}`);
  await prisma.$disconnect();
}

resetPassword().catch((e) => {
  console.error(e);
  process.exit(1);
});
