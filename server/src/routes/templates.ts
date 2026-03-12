import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// GET /api/templates - List all active templates
router.get('/', async (req: AuthRequest, res) => {
  try {
    const templates = await prisma.menuTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/templates/:slug - Get template by slug
router.get('/:slug', async (req: AuthRequest, res) => {
  try {
    const template = await prisma.menuTemplate.findUnique({
      where: { slug: req.params.slug },
    });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
