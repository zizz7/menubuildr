import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
    },
  });
  console.log('Created admin user:', admin.email);

  // Create default languages
  const languages = [
    { code: 'ENG', name: 'English', isActive: true, orderIndex: 0 },
    { code: 'CHN', name: 'Chinese', isActive: true, orderIndex: 1 },
    { code: 'GER', name: 'German', isActive: true, orderIndex: 2 },
    { code: 'JAP', name: 'Japanese', isActive: true, orderIndex: 3 },
    { code: 'RUS', name: 'Russian', isActive: true, orderIndex: 4 },
  ];

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log('Created languages:', languages.map((l) => l.code).join(', '));

  // Create default allergen icons (11 default icons from breakfast menu)
  // Note: imageUrl is a placeholder - users should upload actual PNG files
  const defaultAllergens = [
    {
      name: 'vegetarian',
      label: { ENG: 'Vegetarian', CHN: '素食', GER: 'Vegetarisch', JAP: 'ベジタリアン', RUS: 'Вегетарианский' },
      imageUrl: '/uploads/icon/placeholder-vegetarian.png', // Placeholder - should be replaced with actual upload
      isCustom: false,
      orderIndex: 0,
    },
    {
      name: 'vegan',
      label: { ENG: 'Vegan', CHN: '纯素', GER: 'Vegan', JAP: 'ビーガン', RUS: 'Веган' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 1,
    },
    {
      name: 'dairy',
      label: { ENG: 'Contains Dairy', CHN: '含乳制品', GER: 'Enthält Milch', JAP: '乳製品含有', RUS: 'Содержит молочные продукты' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 2,
    },
    {
      name: 'gluten',
      label: { ENG: 'Contains Gluten', CHN: '含麸质', GER: 'Enthält Gluten', JAP: 'グルテン含有', RUS: 'Содержит глютен' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 3,
    },
    {
      name: 'nuts',
      label: { ENG: 'Contains Nuts', CHN: '含坚果', GER: 'Enthält Nüsse', JAP: 'ナッツ含有', RUS: 'Содержит орехи' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 4,
    },
    {
      name: 'shellfish',
      label: { ENG: 'Contains Shellfish', CHN: '含贝类', GER: 'Enthält Schalentiere', JAP: '甲殻類含有', RUS: 'Содержит моллюски' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 5,
    },
    {
      name: 'eggs',
      label: { ENG: 'Contains Eggs', CHN: '含鸡蛋', GER: 'Enthält Eier', JAP: '卵含有', RUS: 'Содержит яйца' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 6,
    },
    {
      name: 'soy',
      label: { ENG: 'Contains Soy', CHN: '含大豆', GER: 'Enthält Soja', JAP: '大豆含有', RUS: 'Содержит сою' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 7,
    },
    {
      name: 'fish',
      label: { ENG: 'Contains Fish', CHN: '含鱼类', GER: 'Enthält Fisch', JAP: '魚含有', RUS: 'Содержит рыбу' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 8,
    },
    {
      name: 'spicy',
      label: { ENG: 'Spicy', CHN: '辣', GER: 'Scharf', JAP: '辛い', RUS: 'Острое' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 9,
    },
    {
      name: 'hot',
      label: { ENG: 'Hot', CHN: '热', GER: 'Heiß', JAP: '熱い', RUS: 'Горячее' },
      imageUrl: '/uploads/icon/placeholder.png',
      isCustom: false,
      orderIndex: 10,
    },
  ];

  for (const allergen of defaultAllergens) {
    await prisma.allergenIcon.upsert({
      where: { name: allergen.name },
      update: {},
      create: allergen,
    });
  }
  console.log('Created allergen icons:', defaultAllergens.length);

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

