import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifySectionOwnership, verifyItemOwnership, verifyBulkItemOwnership } from '../middleware/ownership';
import { MenuItemSchema, RecipeSchema } from '../utils/validation';
import { regenerateMenuIfPublished } from '../utils/regenerate-menu';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Get single item by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyItemOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        allergens: true,
        recipeDetails: true,
        priceVariations: {
          orderBy: { orderIndex: 'asc' },
        },
        category: true,
        section: {
          include: {
            menu: true,
          },
        },
      },
    });

    res.json(item);
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create item
router.post('/section/:sectionId', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifySectionOwnership(req.params.sectionId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const data = MenuItemSchema.parse(req.body);

    // Get section to find menuId
    const section = await prisma.section.findUnique({
      where: { id: req.params.sectionId },
      select: { menuId: true },
    });

    const itemCount = await prisma.menuItem.count({
      where: { sectionId: req.params.sectionId },
    });

    const item = await prisma.menuItem.create({
      data: {
        ...data,
        sectionId: req.params.sectionId,
        orderIndex: itemCount,
        name: data.name as any,
        description: (data.description || undefined) as any,
        price: data.price || null,
        calories: data.calories ?? null,
        imageUrl: data.imageUrl || null,
        allergens: {
          connect: (req.body.allergenIds || []).map((id: string) => ({ id })),
        },
      },
      include: {
        allergens: true,
        recipeDetails: true,
        priceVariations: true,
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(section.menuId);

    res.status(201).json(item);
  } catch (error: any) {
    if (error.name === 'ZodError' || error.issues) {
      const zodError = error.issues || error.errors || [];
      return res.status(400).json({ 
        error: 'Validation error', 
        details: zodError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyItemOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const data = MenuItemSchema.partial().parse(req.body);
    const { allergenIds } = req.body as any;

    // Get section to find menuId before update
    const existingItem = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        section: {
          select: { menuId: true },
        },
      },
    });

    const updateData: any = { ...data };

    if (allergenIds !== undefined) {
      updateData.allergens = {
        set: allergenIds.map((id: string) => ({ id })),
      };
    }

    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        allergens: true,
        recipeDetails: true,
        priceVariations: true,
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(existingItem.section.menuId);

    res.json(item);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error });
    }
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete item
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyItemOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get section to find menuId before deleting
    const item = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        section: {
          select: { menuId: true },
        },
      },
    });

    await prisma.menuItem.delete({
      where: { id: req.params.id },
    });

    // Regenerate HTML if menu is published
    if (item) {
      await regenerateMenuIfPublished(item.section.menuId);
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder item
router.put('/:id/reorder', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyItemOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { orderIndex } = req.body;

    // Get section to find menuId
    const existingItem = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        section: {
          select: { menuId: true },
        },
      },
    });

    const item = await prisma.menuItem.update({
      where: { id: req.params.id },
      data: { orderIndex },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(existingItem.section.menuId);

    res.json(item);
  } catch (error) {
    console.error('Reorder item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate item
router.post('/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyItemOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const originalItem = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        allergens: true,
        recipeDetails: true,
        priceVariations: true,
        availabilitySchedule: true,
        section: {
          select: { menuId: true },
        },
      },
    });

    if (!originalItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const itemCount = await prisma.menuItem.count({
      where: { sectionId: originalItem.sectionId },
    });

    const newItem = await prisma.menuItem.create({
      data: {
        sectionId: originalItem.sectionId,
        categoryId: originalItem.categoryId,
        name: originalItem.name as any,
        description: originalItem.description ? (originalItem.description as any) : undefined,
        price: originalItem.price,
        imageUrl: originalItem.imageUrl,
        orderIndex: itemCount,
        isAvailable: originalItem.isAvailable,
        preparationTime: originalItem.preparationTime,
        allergens: {
          connect: originalItem.allergens.map((a) => ({ id: a.id })),
        },
        recipeDetails: originalItem.recipeDetails ? {
          create: {
            ingredients: originalItem.recipeDetails.ingredients as any,
            ingredientsLabel: originalItem.recipeDetails.ingredientsLabel
              ? (originalItem.recipeDetails.ingredientsLabel as any)
              : undefined,
            instructions: originalItem.recipeDetails.instructions,
            servings: originalItem.recipeDetails.servings,
            difficultyLevel: originalItem.recipeDetails.difficultyLevel,
          },
        } : undefined,
        priceVariations: {
          create: originalItem.priceVariations.map((pv) => ({
            variationName: pv.variationName,
            price: pv.price,
            orderIndex: pv.orderIndex,
          })),
        },
        availabilitySchedule: originalItem.availabilitySchedule ? {
          create: {
            dayOfWeek: originalItem.availabilitySchedule.dayOfWeek,
            startTime: originalItem.availabilitySchedule.startTime,
            endTime: originalItem.availabilitySchedule.endTime,
            seasonalStartDate: originalItem.availabilitySchedule.seasonalStartDate,
            seasonalEndDate: originalItem.availabilitySchedule.seasonalEndDate,
          },
        } : undefined,
      },
      include: {
        allergens: true,
        recipeDetails: true,
        priceVariations: true,
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(originalItem.section.menuId);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Duplicate item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update recipe details
router.put('/:id/recipe', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyItemOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const data = RecipeSchema.parse(req.body);

    // Get menuItem to find menuId
    const menuItem = await prisma.menuItem.findUnique({
      where: { id: req.params.id },
      include: {
        section: {
          select: { menuId: true },
        },
      },
    });

    // Handle ingredients - convert to proper format
    const updateData: any = { ...data };
    if (updateData.ingredients === null || updateData.ingredients === undefined) {
      // If null/undefined, set to empty object
      updateData.ingredients = {};
    } else if (typeof updateData.ingredients === 'object' && !Array.isArray(updateData.ingredients)) {
      // Already in correct format (multi-language object)
      updateData.ingredients = updateData.ingredients as any;
    }

    // Handle ingredientsLabel - store as Json or DbNull
    if (updateData.ingredientsLabel === null || updateData.ingredientsLabel === undefined) {
      // Don't include in update if not provided; if explicitly null, set DbNull
      if (data.ingredientsLabel === null) {
        const { Prisma: PrismaNamespace } = require('@prisma/client');
        updateData.ingredientsLabel = PrismaNamespace.DbNull;
      } else {
        delete updateData.ingredientsLabel;
      }
    }

    const recipeDetails = await prisma.recipeDetails.upsert({
      where: { menuItemId: req.params.id },
      update: updateData,
      create: {
        menuItemId: req.params.id,
        ...updateData,
      },
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(menuItem.section.menuId);

    res.json(recipeDetails);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error });
    }
    console.error('Update recipe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk update items
router.post('/bulk-update', async (req: AuthRequest, res) => {
  try {
    const { itemIds, updates } = req.body;

    const ownership = await verifyBulkItemOwnership(itemIds, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'One or more items not found' });
    }

    const result = await prisma.menuItem.updateMany({
      where: {
        id: { in: itemIds },
      },
      data: updates,
    });

    res.json({ updated: result.count });
  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk delete items
router.post('/bulk-delete', async (req: AuthRequest, res) => {
  try {
    const { itemIds } = req.body;

    const ownership = await verifyBulkItemOwnership(itemIds, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'One or more items not found' });
    }

    const result = await prisma.menuItem.deleteMany({
      where: {
        id: { in: itemIds },
      },
    });

    res.json({ deleted: result.count });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

