import prisma from '../config/database';

async function verifyTemplates() {
  try {
    console.log('Verifying menu templates...');
    
    const templates = await prisma.menuTemplate.findMany();
    console.log(`Found ${templates.length} templates:`);
    templates.forEach(t => {
      console.log(`- ${t.slug}: ${JSON.stringify(t.name)}`);
    });
    
    const menusWithTemplates = await prisma.menu.findMany({
      where: { templateId: { not: null } },
      select: { id: true, slug: true, templateId: true }
    });
    console.log(`\nFound ${menusWithTemplates.length} menus with templates assigned`);
    
    console.log('\n✅ Database verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTemplates();
