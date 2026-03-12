import express from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifyMenuOwnership, verifySectionOwnership } from '../middleware/ownership';
import { SectionSchema } from '../utils/validation';
import { regenerateMenuIfPublished } from '../utils/regenerate-menu';
import { copySection } from '../services/copy-section';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Create section
router.post('/menu/:menuId', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.menuId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const data = SectionSchema.parse(req.body);

    // If it's a sub-section, count sub-sections of the parent
    // Otherwise, count top-level sections
    let orderIndex = 0;
    if (data.parentSectionId) {
      const subSectionCount = await prisma.section.count({
        where: { 
          menuId: req.params.menuId,
          parentSectionId: data.parentSectionId,
        },
      });
      orderIndex = subSectionCount;
    } else {
      const sectionCount = await prisma.section.count({
        where: { 
          menuId: req.params.menuId,
          parentSectionId: null,
        },
      });
      orderIndex = sectionCount;
    }

    const section = await prisma.section.create({
      data: {
        ...data,
        description: data.description === null ? Prisma.DbNull : data.description,
        menuId: req.params.menuId,
        orderIndex,
      },
      include: {
        subSections: true,
        items: true,
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(req.params.menuId);

    res.status(201).json(section);
  } catch (error: any) {
    if (error.name === 'ZodError' || error.issues) {
      const zodError = error.issues || error.errors || [];
      return res.status(400).json({ 
        error: 'Validation error', 
        details: zodError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Create section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update section
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifySectionOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const data = SectionSchema.partial().parse(req.body);

    const section = await prisma.section.update({
      where: { id: req.params.id },
      data: {
        ...data,
        description: data.description === null ? Prisma.DbNull : data.description,
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(section.menuId);

    res.json(section);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error });
    }
    console.error('Update section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete section
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifySectionOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Get menuId before deleting
    const section = await prisma.section.findUnique({
      where: { id: req.params.id },
      select: { menuId: true },
    });

    await prisma.section.delete({
      where: { id: req.params.id },
    });

    // Regenerate HTML if menu is published
    if (section) {
      await regenerateMenuIfPublished(section.menuId);
    }

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Delete section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder section
router.put('/:id/reorder', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifySectionOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const { orderIndex } = req.body;

    const section = await prisma.section.update({
      where: { id: req.params.id },
      data: { orderIndex },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(section.menuId);

    res.json(section);
  } catch (error) {
    console.error('Reorder section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate section
router.post('/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifySectionOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const originalSection = await prisma.section.findUnique({
      where: { id: req.params.id },
      include: {
        categories: true,
        items: {
          include: {
            allergens: true,
            recipeDetails: true,
            priceVariations: true,
          },
        },
      },
    });

    if (!originalSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const sectionCount = await prisma.section.count({
      where: { menuId: originalSection.menuId },
    });

    const newSection = await prisma.section.create({
      data: {
        menuId: originalSection.menuId,
        title: originalSection.title as any,
        description: originalSection.description ? (originalSection.description as any) : undefined,
        illustrationUrl: originalSection.illustrationUrl,
        orderIndex: sectionCount,
        categories: {
          create: originalSection.categories.map((cat) => ({
            name: cat.name as any,
            orderIndex: cat.orderIndex,
          })),
        },
        items: {
          create: originalSection.items.map((item: any) => ({
            name: item.name as any,
            description: item.description ? (item.description as any) : undefined,
            price: item.price,
            imageUrl: item.imageUrl,
            orderIndex: item.orderIndex,
            isAvailable: item.isAvailable,
            preparationTime: item.preparationTime,
            allergens: {
              connect: (item.allergens || []).map((a: any) => ({ id: a.id })),
            },
            recipeDetails: item.recipeDetails ? {
              create: {
                ingredients: item.recipeDetails.ingredients as any,
                instructions: item.recipeDetails.instructions as any,
                servings: item.recipeDetails.servings,
                difficultyLevel: item.recipeDetails.difficultyLevel,
              },
            } : undefined,
            priceVariations: {
              create: (item.priceVariations || []).map((pv: any) => ({
                variationName: pv.variationName,
                price: pv.price,
                orderIndex: pv.orderIndex,
              })),
            },
          })),
        },
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(originalSection.menuId);

    res.status(201).json(newSection);
  } catch (error) {
    console.error('Duplicate section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Copy section to another menu
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post('/:id/copy', async (req: AuthRequest, res) => {
  try {
    const { targetMenuId } = req.body;

    // Validate targetMenuId is present and a valid UUID
    if (!targetMenuId || typeof targetMenuId !== 'string' || !UUID_REGEX.test(targetMenuId)) {
      return res.status(400).json({ error: 'targetMenuId is required and must be a valid UUID' });
    }

    // Verify ownership of source section
    const sectionOwnership = await verifySectionOwnership(req.params.id, req.userId!);
    if (!sectionOwnership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Fetch source section to check for self-copy
    const sourceSection = await prisma.section.findUnique({
      where: { id: req.params.id },
      select: { menuId: true },
    });

    if (!sourceSection) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Block self-copy
    if (targetMenuId === sourceSection.menuId) {
      return res.status(400).json({ error: 'Cannot copy to the same menu. Use duplicate instead.' });
    }

    // Verify ownership of target menu
    const menuOwnership = await verifyMenuOwnership(targetMenuId, req.userId!);
    if (!menuOwnership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Perform the deep copy
    const result = await copySection(req.params.id, targetMenuId);

    // Regenerate HTML if target menu is published
    await regenerateMenuIfPublished(targetMenuId);

    res.status(201).json(result.section);
  } catch (error) {
    console.error('Copy section error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

