import { Prisma } from '@prisma/client';
import prisma from '../config/database';

/**
 * Deep-clone a section and all nested entities into a target menu.
 * Runs inside a single Prisma interactive transaction for atomicity.
 */
export async function copySection(sectionId: string, targetMenuId: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch the source section with ALL nested data (recursive sub-sections)
    const source = await fetchSectionDeep(tx, sectionId);
    if (!source) {
      throw new Error('Source section not found');
    }

    // 2. Determine orderIndex: count existing top-level sections in target menu
    const existingCount = await tx.section.count({
      where: { menuId: targetMenuId, parentSectionId: null },
    });

    // 3. Recursively clone the section tree
    const created = await cloneSectionTree(tx, source, targetMenuId, null, existingCount);

    // 4. Re-fetch the created section with immediate children for the response
    const result = await tx.section.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        subSections: true,
        categories: true,
        items: { include: { allergens: true } },
      },
    });

    return { section: result };
  });
}


// Prisma transaction client type
type TxClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/** Recursively fetch a section with all nested data. */
async function fetchSectionDeep(tx: TxClient, sectionId: string) {
  return tx.section.findUnique({
    where: { id: sectionId },
    include: {
      categories: true,
      items: {
        include: {
          allergens: true,
          recipeDetails: true,
          priceVariations: true,
          availabilitySchedule: true,
          translations: true,
        },
      },
      subSections: {
        include: {
          categories: true,
          items: {
            include: {
              allergens: true,
              recipeDetails: true,
              priceVariations: true,
              availabilitySchedule: true,
              translations: true,
            },
          },
          // Prisma doesn't support infinite recursive includes,
          // so we fetch sub-sub-sections in the clone step
          subSections: true,
        },
      },
    },
  });
}

type DeepSection = NonNullable<Awaited<ReturnType<typeof fetchSectionDeep>>>;
type SectionItem = DeepSection['items'][number];

/**
 * Recursively clone a section, its categories, items (with all nested data),
 * and all sub-sections into the target menu.
 */
async function cloneSectionTree(
  tx: TxClient,
  source: DeepSection,
  targetMenuId: string,
  parentSectionId: string | null,
  orderIndex: number,
): Promise<{ id: string }> {
  // Create the section shell first (no items/categories yet)
  const newSection = await tx.section.create({
    data: {
      menuId: targetMenuId,
      parentSectionId,
      title: source.title as Prisma.InputJsonValue,
      description: source.description
        ? (source.description as Prisma.InputJsonValue)
        : Prisma.DbNull,
      orderIndex,
      illustrationUrl: source.illustrationUrl,
      illustrationAsBackground: source.illustrationAsBackground,
      illustrationPosition: source.illustrationPosition,
      illustrationSize: source.illustrationSize,
    },
  });

  // Clone categories and build old→new ID mapping
  const categoryIdMap = new Map<string, string>();
  for (const cat of source.categories) {
    const newCat = await tx.category.create({
      data: {
        sectionId: newSection.id,
        name: cat.name as Prisma.InputJsonValue,
        orderIndex: cat.orderIndex,
      },
    });
    categoryIdMap.set(cat.id, newCat.id);
  }

  // Clone items with all nested data
  for (const item of source.items) {
    await cloneItem(tx, item, newSection.id, categoryIdMap);
  }

  // Recursively clone sub-sections
  for (let i = 0; i < source.subSections.length; i++) {
    const sub = source.subSections[i];
    // Sub-sections from the initial fetch may not have full nested data,
    // so re-fetch each one deeply before cloning
    const deepSub = await fetchSectionDeep(tx, sub.id);
    if (deepSub) {
      await cloneSectionTree(tx, deepSub, targetMenuId, newSection.id, sub.orderIndex);
    }
  }

  return { id: newSection.id };
}


/** Clone a single menu item with all its nested relations. */
async function cloneItem(
  tx: TxClient,
  item: SectionItem,
  newSectionId: string,
  categoryIdMap: Map<string, string>,
) {
  const newCategoryId = item.categoryId
    ? categoryIdMap.get(item.categoryId) ?? null
    : null;

  await tx.menuItem.create({
    data: {
      sectionId: newSectionId,
      categoryId: newCategoryId,
      name: item.name as Prisma.InputJsonValue,
      description: item.description
        ? (item.description as Prisma.InputJsonValue)
        : undefined,
      price: item.price,
      calories: item.calories,
      imageUrl: item.imageUrl,
      orderIndex: item.orderIndex,
      isAvailable: item.isAvailable,
      preparationTime: item.preparationTime,
      // Allergens are global shared records — connect, don't create
      allergens: {
        connect: item.allergens.map((a) => ({ id: a.id })),
      },
      // Recipe details (one-to-one, optional)
      recipeDetails: item.recipeDetails
        ? {
            create: {
              ingredients: item.recipeDetails.ingredients as Prisma.InputJsonValue,
              ingredientsLabel: item.recipeDetails.ingredientsLabel
                ? (item.recipeDetails.ingredientsLabel as Prisma.InputJsonValue)
                : undefined,
              instructions: item.recipeDetails.instructions,
              servings: item.recipeDetails.servings,
              difficultyLevel: item.recipeDetails.difficultyLevel,
            },
          }
        : undefined,
      // Price variations (one-to-many)
      priceVariations: {
        create: item.priceVariations.map((pv) => ({
          variationName: pv.variationName,
          price: pv.price,
          orderIndex: pv.orderIndex,
        })),
      },
      // Availability schedule (one-to-one, optional)
      availabilitySchedule: item.availabilitySchedule
        ? {
            create: {
              dayOfWeek: item.availabilitySchedule.dayOfWeek,
              startTime: item.availabilitySchedule.startTime,
              endTime: item.availabilitySchedule.endTime,
              seasonalStartDate: item.availabilitySchedule.seasonalStartDate,
              seasonalEndDate: item.availabilitySchedule.seasonalEndDate,
            },
          }
        : undefined,
      // Translations (one-to-many)
      translations: {
        create: item.translations.map((t) => ({
          languageCode: t.languageCode,
          translatedName: t.translatedName,
          translatedDescription: t.translatedDescription,
        })),
      },
    },
  });
}
