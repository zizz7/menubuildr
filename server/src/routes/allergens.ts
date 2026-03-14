import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Get all allergen icons
router.get('/', async (req: AuthRequest, res) => {
  try {
    const allergens = await prisma.allergenIcon.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    res.json(allergens);
  } catch (error) {
    console.error('Get allergens error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create custom allergen icon
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, imageUrl, label } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!imageUrl || !imageUrl.trim()) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const allergen = await prisma.allergenIcon.create({
      data: {
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        label: label || {},
        isCustom: true,
      },
    });

    res.status(201).json(allergen);
  } catch (error) {
    console.error('Create allergen error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get allergen filter mode setting (must come before /:id route)
router.get('/settings', async (req: AuthRequest, res) => {
  try {
    // NOTE: AllergenSettings is a global singleton (no restaurantId in schema).
    // L6 scoping requires a Prisma migration — tracked as a schema improvement.
    let settings = await prisma.allergenSettings.findFirst();

    if (!settings) {
      settings = await prisma.allergenSettings.create({
        data: { filterMode: 'exclude' },
      });
    }

    res.json(settings);
  } catch (error: any) {
    console.error('Get allergen settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update allergen filter mode setting (must come before /:id route)
router.put('/settings', async (req: AuthRequest, res) => {
  try {
    const { filterMode } = req.body;

    if (!filterMode || (filterMode !== 'exclude' && filterMode !== 'include')) {
      return res.status(400).json({ error: 'Filter mode must be "exclude" or "include"' });
    }

    // Get existing settings
    let settings = await prisma.allergenSettings.findFirst();
    
    if (settings) {
      // Update existing settings
      settings = await prisma.allergenSettings.update({
        where: { id: settings.id },
        data: { filterMode },
      });
    } else {
      // Create new settings if none exist
      settings = await prisma.allergenSettings.create({
        data: { filterMode },
      });
    }

    res.json(settings);
  } catch (error: any) {
    console.error('Update allergen settings error:', error);
    
    // Handle P2025 (Record not found) - try to create if update failed
    if (error?.code === 'P2025') {
      try {
        const newSettings = await prisma.allergenSettings.create({
          data: { filterMode: req.body.filterMode || 'exclude' },
        });
        return res.json(newSettings);
      } catch (createError: any) {
        console.error('Failed to create after P2025 error:', createError);
      }
    }
    
    // If table doesn't exist, try to create it
    if (error?.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('table')) {
      try {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS allergen_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            filter_mode TEXT NOT NULL DEFAULT 'exclude',
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        let settings = await prisma.allergenSettings.findFirst();
        if (!settings) {
          settings = await prisma.allergenSettings.create({
            data: { filterMode: req.body.filterMode || 'exclude' },
          });
        } else {
          settings = await prisma.allergenSettings.update({
            where: { id: settings.id },
            data: { filterMode: req.body.filterMode || 'exclude' },
          });
        }
        res.json(settings);
      } catch (createError: any) {
        console.error('Failed to create table:', createError);
        res.status(500).json({ 
          error: 'Database table does not exist. Please run: npx prisma db push',
          details: createError.message,
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
      });
    }
  }
});

// Reorder allergens (must come before /:id route)
router.put('/reorder', async (req: AuthRequest, res) => {
  try {
    const { allergenIds } = req.body; // Array of IDs in new order

    if (!Array.isArray(allergenIds)) {
      return res.status(400).json({ error: 'allergenIds must be an array' });
    }

    // First, verify all allergen IDs exist
    const existingAllergens = await prisma.allergenIcon.findMany({
      where: { id: { in: allergenIds } },
      select: { id: true },
    });

    const existingIds = new Set(existingAllergens.map(a => a.id));
    const missingIds = allergenIds.filter((id: string) => !existingIds.has(id));

    if (missingIds.length > 0) {
      console.error('Some allergen IDs not found:', missingIds);
      return res.status(404).json({ 
        error: 'Some allergen icons not found',
        missingIds 
      });
    }

    // Update order indices
    const updates = allergenIds.map((id: string, index: number) =>
      prisma.allergenIcon.update({
        where: { id },
        data: { orderIndex: index },
      })
    );

    await Promise.all(updates);

    res.json({ message: 'Allergens reordered successfully' });
  } catch (error: any) {
    console.error('Reorder allergens error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'One or more allergen icons not found' });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: error.code
    });
  }
});

// Update allergen icon
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { name, imageUrl, label } = req.body;
    
    // Validate imageUrl
    if (imageUrl !== undefined && (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim())) {
      return res.status(400).json({ error: 'Image URL is required and must be a non-empty string' });
    }
    
    // Check if allergen exists first
    const existingAllergen = await prisma.allergenIcon.findUnique({
      where: { id: req.params.id },
    });

    if (!existingAllergen) {
      return res.status(404).json({ error: 'Allergen icon not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (label !== undefined) updateData.label = label;
    
    const allergen = await prisma.allergenIcon.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(allergen);
  } catch (error: any) {
    console.error('Update allergen error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Allergen icon not found' });
    }
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: error.code
    });
  }
});

// Delete allergen icon
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const allergen = await prisma.allergenIcon.findUnique({
      where: { id: req.params.id },
    });

    if (!allergen) {
      return res.status(404).json({ error: 'Allergen not found' });
    }

    await prisma.allergenIcon.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Allergen deleted successfully' });
  } catch (error) {
    console.error('Delete allergen error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Diagnostic endpoint to test Prisma client
router.get('/test-settings', async (req: AuthRequest, res) => {
  try {
    // Test if Prisma client has the model
    const hasModel = typeof prisma.allergenSettings !== 'undefined';
    
    // Try to query the table
    let queryResult = null;
    let queryError = null;
    try {
      queryResult = await prisma.allergenSettings.findFirst();
    } catch (err: any) {
      queryError = {
        code: err.code,
        message: err.message,
        meta: err.meta
      };
    }
    
    res.json({
      prismaClientHasModel: hasModel,
      queryResult,
      queryError,
      prismaClientType: typeof prisma.allergenSettings,
      availableMethods: hasModel ? Object.keys(prisma.allergenSettings) : []
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Diagnostic error',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;

