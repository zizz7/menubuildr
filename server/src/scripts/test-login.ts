import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  try {
    console.log('Testing database connection and admin user...\n');

    // Check if admin exists
    const admin = await prisma.admin.findUnique({
      where: { email: 'admin@example.com' },
    });

    if (!admin) {
      console.log('❌ Admin user NOT found in database');
      console.log('Run: npm run db:seed');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   ID: ${admin.id}\n`);

    // Test password
    console.log('Testing password "admin123"...');
    const isValid = await bcrypt.compare('admin123', admin.passwordHash);
    
    if (isValid) {
      console.log('✅ Password is correct!');
    } else {
      console.log('❌ Password is incorrect!');
      console.log('The password hash in database does not match "admin123"');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('does not exist')) {
      console.log('\nDatabase does not exist. Run: npm run db:push');
    } else if (error.message.includes('connect')) {
      console.log('\nCannot connect to database. Check:');
      console.log('1. PostgreSQL is running');
      console.log('2. DATABASE_URL in .env is correct');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testLogin();

