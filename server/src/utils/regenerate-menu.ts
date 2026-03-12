import prisma from '../config/database';

/**
 * Regenerates the menu HTML if the menu is published
 * This should be called after any changes to menu, sections, or items
 */
export async function regenerateMenuIfPublished(menuId: string): Promise<void> {
  try {
    // Check if menu is published
    const menu = await prisma.menu.findUnique({
      where: { id: menuId },
      select: { status: true },
    });

    if (menu && menu.status === 'published') {
      const { generateMenuHTML } = await import('../services/menu-generator');
      await generateMenuHTML(menuId);
    }
  } catch (error) {
    console.error('Error regenerating menu HTML:', error);
    // Don't throw - this is a background operation
  }
}

