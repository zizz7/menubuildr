import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifySectionOwnership, verifyCategoryOwnership } from '../middleware/ownership';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Create category
router.post('/section/:sectionId', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifySectionOwnership(req.params.sectionId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const { name } = req.body; // Multi-language object

    const categoryCount = await prisma.category.count({
      where: { sectionId: req.params.sectionId },
    });

    const category = await prisma.category.create({
      data: {
        sectionId: req.params.sectionId,
        name,
        orderIndex: categoryCount,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update category
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyCategoryOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete category
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyCategoryOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await prisma.category.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder category
router.put('/:id/reorder', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyCategoryOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { orderIndex } = req.body;

    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: { orderIndex },
    });

    res.json(category);
  } catch (error) {
    console.error('Reorder category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
