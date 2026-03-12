import prisma from '../config/database';

export type OwnershipResult =
  | { authorized: true; resourceId: string }
  | { authorized: false };

export async function verifyRestaurantOwnership(
  restaurantId: string,
  adminId: string
): Promise<OwnershipResult> {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: { id: true, adminId: true },
  });

  if (!restaurant || restaurant.adminId !== adminId) {
    return { authorized: false };
  }

  return { authorized: true, resourceId: restaurant.id };
}

export async function verifyMenuOwnership(
  menuId: string,
  adminId: string
): Promise<OwnershipResult> {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    select: {
      id: true,
      restaurant: { select: { adminId: true } },
    },
  });

  if (!menu || menu.restaurant.adminId !== adminId) {
    return { authorized: false };
  }

  return { authorized: true, resourceId: menu.id };
}

export async function verifySectionOwnership(
  sectionId: string,
  adminId: string
): Promise<OwnershipResult> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: {
      id: true,
      menu: { select: { restaurant: { select: { adminId: true } } } },
    },
  });

  if (!section || section.menu.restaurant.adminId !== adminId) {
    return { authorized: false };
  }

  return { authorized: true, resourceId: section.id };
}

export async function verifyItemOwnership(
  itemId: string,
  adminId: string
): Promise<OwnershipResult> {
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      section: {
        select: {
          menu: { select: { restaurant: { select: { adminId: true } } } },
        },
      },
    },
  });

  if (!item || item.section.menu.restaurant.adminId !== adminId) {
    return { authorized: false };
  }

  return { authorized: true, resourceId: item.id };
}

export async function verifyCategoryOwnership(
  categoryId: string,
  adminId: string
): Promise<OwnershipResult> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      section: {
        select: {
          menu: { select: { restaurant: { select: { adminId: true } } } },
        },
      },
    },
  });

  if (!category || category.section.menu.restaurant.adminId !== adminId) {
    return { authorized: false };
  }

  return { authorized: true, resourceId: category.id };
}

export async function verifyBulkItemOwnership(
  itemIds: string[],
  adminId: string
): Promise<OwnershipResult> {
  if (itemIds.length === 0) {
    return { authorized: true, resourceId: '' };
  }

  const items = await prisma.menuItem.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true,
      section: {
        select: {
          menu: { select: { restaurant: { select: { adminId: true } } } },
        },
      },
    },
  });

  // If any items don't exist, unauthorized
  if (items.length !== itemIds.length) {
    return { authorized: false };
  }

  // If any item belongs to a different admin, unauthorized
  const allOwned = items.every(
    (item) => item.section.menu.restaurant.adminId === adminId
  );

  if (!allOwned) {
    return { authorized: false };
  }

  return { authorized: true, resourceId: itemIds.join(',') };
}
