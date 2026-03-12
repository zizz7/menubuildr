import prisma from '../config/database';

async function checkExistingIngredients() {
  try {
    console.log('Checking for existing recipe details with ingredients...\n');
    
    const recipeDetails = await prisma.recipeDetails.findMany({
      include: {
        menuItem: {
          include: {
            section: {
              include: {
                menu: {
                  include: {
                    restaurant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log(`Found ${recipeDetails.length} recipe details entries\n`);

    if (recipeDetails.length === 0) {
      console.log('No recipe details found in database.');
      return;
    }

    recipeDetails.forEach((rd, index) => {
      console.log(`\n--- Recipe Details ${index + 1} ---`);
      console.log(`Menu Item ID: ${rd.menuItemId}`);
      console.log(`Restaurant: ${rd.menuItem.section.menu.restaurant.name}`);
      console.log(`Menu: ${(rd.menuItem.section.menu.name as any)?.ENG || 'N/A'}`);
      console.log(`Section: ${(rd.menuItem.section.title as any)?.ENG || 'N/A'}`);
      console.log(`Item: ${(rd.menuItem.name as any)?.ENG || 'N/A'}`);
      console.log(`Ingredients Type: ${Array.isArray(rd.ingredients) ? 'Array (old format)' : typeof rd.ingredients}`);
      
      if (Array.isArray(rd.ingredients)) {
        console.log(`Ingredients (Array): ${JSON.stringify(rd.ingredients, null, 2)}`);
      } else if (typeof rd.ingredients === 'object' && rd.ingredients !== null) {
        const ingObj = rd.ingredients as Record<string, any>;
        const hasContent = Object.values(ingObj).some((v: any) => v && typeof v === 'string' && v.trim().length > 0);
        console.log(`Ingredients (Object): ${hasContent ? 'Has content' : 'Empty'}`);
        console.log(`Ingredients Data: ${JSON.stringify(ingObj, null, 2)}`);
      } else {
        console.log(`Ingredients: ${rd.ingredients}`);
      }
    });

    // Count items with old array format
    const oldFormat = recipeDetails.filter(rd => Array.isArray(rd.ingredients));
    const newFormat = recipeDetails.filter(rd => typeof rd.ingredients === 'object' && rd.ingredients !== null && !Array.isArray(rd.ingredients));
    
    console.log(`\n\nSummary:`);
    console.log(`- Total recipe details: ${recipeDetails.length}`);
    console.log(`- Old format (array): ${oldFormat.length}`);
    console.log(`- New format (object): ${newFormat.length}`);
    
    if (oldFormat.length > 0) {
      console.log(`\n⚠️  Found ${oldFormat.length} items with old array format that can be converted!`);
    }
  } catch (error) {
    console.error('Error checking ingredients:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkExistingIngredients();

