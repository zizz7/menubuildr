import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Get all languages
router.get('/', async (req: AuthRequest, res) => {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    res.json(languages);
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create language
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { code, name, isActive } = req.body;

    const languageCount = await prisma.language.count();

    const language = await prisma.language.create({
      data: {
        code: code.toUpperCase(),
        name,
        isActive: isActive !== undefined ? isActive : true,
        orderIndex: languageCount,
      },
    });

    res.status(201).json(language);
  } catch (error) {
    console.error('Create language error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update language
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const language = await prisma.language.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json(language);
  } catch (error) {
    console.error('Update language error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete language
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.language.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Language deleted successfully' });
  } catch (error) {
    console.error('Delete language error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

