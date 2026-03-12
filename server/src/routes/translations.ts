import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifyItemOwnership } from '../middleware/ownership';

const router = express.Router();

// All routes require authentication and active subscription
router.use(authenticateToken);
router.use(requireSubscription);

// GET /menu-items/:id/translations - Get all translations for a menu item
router.get('/:id/translations', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Verify item ownership before listing translations
    const ownership = await verifyItemOwnership(id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ 
        error: 'Menu item not found',
        code: 'MENU_ITEM_NOT_FOUND'
      });
    }

    // Fetch all translations
    const translations = await prisma.menuItemTranslation.findMany({
      where: { menuItemId: id },
      orderBy: { languageCode: 'asc' },
    });

    res.json({ translations });
  } catch (error) {
    console.error('Get translations error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// POST /menu-items/:id/translations - Create a new translation
router.post('/:id/translations', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { languageCode, translatedName, translatedDescription } = req.body;

    // Validate required fields
    if (!languageCode || !translatedName) {
      return res.status(400).json({ 
        error: 'Language code and translated name are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify item ownership before creating translation
    const ownership = await verifyItemOwnership(id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ 
        error: 'Menu item not found',
        code: 'MENU_ITEM_NOT_FOUND'
      });
    }

    // Create translation
    const translation = await prisma.menuItemTranslation.create({
      data: {
        menuItemId: id,
        languageCode,
        translatedName,
        translatedDescription: translatedDescription || null,
      },
    });

    res.status(201).json(translation);
  } catch (error: any) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      return res.status(409).json({ 
        error: 'Translation for this language already exists',
        code: 'DUPLICATE_TRANSLATION'
      });
    }
    console.error('Create translation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /menu-items/:menuItemId/translations/:translationId - Update a translation
router.put('/:menuItemId/translations/:translationId', async (req: AuthRequest, res) => {
  try {
    const { menuItemId, translationId } = req.params;
    const { translatedName, translatedDescription } = req.body;

    // Validate required fields
    if (!translatedName) {
      return res.status(400).json({ 
        error: 'Translated name is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Verify item ownership before updating translation
    const ownership = await verifyItemOwnership(menuItemId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ 
        error: 'Menu item not found',
        code: 'MENU_ITEM_NOT_FOUND'
      });
    }

    // Verify translation exists and belongs to menu item
    const existingTranslation = await prisma.menuItemTranslation.findUnique({
      where: { id: translationId },
    });

    if (!existingTranslation || existingTranslation.menuItemId !== menuItemId) {
      return res.status(404).json({ 
        error: 'Translation not found',
        code: 'TRANSLATION_NOT_FOUND'
      });
    }

    // Update translation
    const translation = await prisma.menuItemTranslation.update({
      where: { id: translationId },
      data: {
        translatedName,
        translatedDescription: translatedDescription || null,
      },
    });

    res.json(translation);
  } catch (error) {
    console.error('Update translation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

// DELETE /menu-items/:menuItemId/translations/:translationId - Delete a translation
router.delete('/:menuItemId/translations/:translationId', async (req: AuthRequest, res) => {
  try {
    const { menuItemId, translationId } = req.params;

    // Verify item ownership before deleting translation
    const ownership = await verifyItemOwnership(menuItemId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ 
        error: 'Menu item not found',
        code: 'MENU_ITEM_NOT_FOUND'
      });
    }

    // Verify translation exists and belongs to menu item
    const existingTranslation = await prisma.menuItemTranslation.findUnique({
      where: { id: translationId },
    });

    if (!existingTranslation || existingTranslation.menuItemId !== menuItemId) {
      return res.status(404).json({ 
        error: 'Translation not found',
        code: 'TRANSLATION_NOT_FOUND'
      });
    }

    // Delete translation
    await prisma.menuItemTranslation.delete({
      where: { id: translationId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete translation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
