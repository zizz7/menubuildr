import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifyRestaurantOwnership } from '../middleware/ownership';
import { RestaurantSchema, ThemeSettingsSchema, ModuleSettingsSchema } from '../utils/validation';

const router = express.Router();

// All routes require authentication and active subscription
router.use(authenticateToken);
router.use(requireSubscription);

// Get all restaurants (scoped to admin)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      where: { adminId: req.userId },
      include: {
        themeSettings: true,
        moduleSettings: true,
        _count: {
          select: { menus: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(restaurants);
  } catch (error) {
    console.error('Get restaurants error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single restaurant (ownership verified)
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: req.params.id },
      include: {
        themeSettings: true,
        moduleSettings: true,
        menus: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    res.json(restaurant);
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create restaurant (assigned to admin, limit scoped to admin)
router.post('/', async (req: AuthRequest, res) => {
  try {
    // Check restaurant limit (max 5) — count only this admin's restaurants
    const count = await prisma.restaurant.count({
      where: { adminId: req.userId },
    });
    if (count >= 5) {
      return res.status(400).json({ error: 'Maximum 5 restaurants allowed' });
    }

    const data = RestaurantSchema.parse(req.body);

    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.name,
        slug: data.slug,
        currency: data.currency,
        defaultLanguage: data.defaultLanguage,
        logoUrl: data.logoUrl,
        logoPosition: data.logoPosition,
        admin: { connect: { id: req.userId! } },
        themeSettings: {
          create: {},
        },
        moduleSettings: {
          create: {},
        },
      },
      include: {
        themeSettings: true,
        moduleSettings: true,
      },
    });

    res.status(201).json(restaurant);
  } catch (error: any) {
    if (error.name === 'ZodError' || error.issues) {
      const zodError = error.issues || error.errors || [];
      return res.status(400).json({ 
        error: 'Validation error', 
        details: zodError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Create restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update restaurant (ownership verified)
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const data = RestaurantSchema.partial().parse(req.body);

    const restaurant = await prisma.restaurant.update({
      where: { id: req.params.id },
      data,
      include: {
        themeSettings: true,
        moduleSettings: true,
      },
    });

    res.json(restaurant);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error });
    }
    console.error('Update restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete restaurant (ownership verified)
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    await prisma.restaurant.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update theme settings (ownership verified)
router.put('/:id/theme', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const { menuId, templateId, ...themeData } = req.body;
    
    // Validate templateId if provided
    if (templateId) {
      const template = await prisma.menuTemplate.findUnique({
        where: { id: templateId },
      });
      
      if (!template) {
        return res.status(404).json({ 
          error: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND'
        });
      }
      
      if (!template.isActive) {
        return res.status(400).json({ 
          error: 'Template is not active',
          code: 'TEMPLATE_INACTIVE'
        });
      }
    }
    
    // M7: Verify menuId is owned by this restaurant (not just any menu)
    if (menuId) {
      const menu = await prisma.menu.findUnique({
        where: { id: menuId },
        select: { id: true, restaurantId: true },
      });

      if (!menu) {
        return res.status(404).json({
          error: 'Menu not found',
          code: 'MENU_NOT_FOUND'
        });
      }

      // Ownership check: menu must belong to THIS restaurant
      if (menu.restaurantId !== req.params.id) {
        return res.status(403).json({
          error: 'Menu does not belong to this restaurant',
          code: 'MENU_OWNERSHIP_MISMATCH'
        });
      }
    }
    
    // Clean up empty strings - convert to null for optional fields
    const cleanedThemeData = {
      ...themeData,
      coverPhotoUrl: themeData.coverPhotoUrl === '' ? null : themeData.coverPhotoUrl,
      backgroundIllustrationUrl: themeData.backgroundIllustrationUrl === '' ? null : themeData.backgroundIllustrationUrl,
      navDrawerBgUrl: themeData.navDrawerBgUrl === '' ? null : themeData.navDrawerBgUrl,
      coverPhotoPosition: themeData.coverPhotoPosition || null,
      coverPhotoSize: themeData.coverPhotoSize || null,
    };
    
    const data = ThemeSettingsSchema.parse(cleanedThemeData);

    // Separate fields for ThemeSettings table (doesn't include cover photo fields or menu-specific fields)
    // These fields are only stored in Menu.themeSettings JSON, not in ThemeSettings table
    const { coverPhotoUrl, coverPhotoPosition, coverPhotoSize, sectionBackgroundColor, logoSize, sectionFontFamily, sectionFontSize, navDrawerStyle, navDrawerBgUrl, navDrawerBgOpacity, navDrawerCategoryImages, ...themeSettingsFields } = data as any;

    // If menuId is provided, store menu-specific theme in Menu model
    if (menuId) {
      // Update menu with template ID and theme settings
      await prisma.menu.update({
        where: { id: menuId },
        data: {
          templateId: templateId || null,
          themeSettings: data as any, // Store as JSON (includes cover photo fields)
        },
      });

      // Also update restaurant theme (as base/fallback for other menus) - without cover photo fields
      const themeSettings = await prisma.themeSettings.upsert({
        where: { restaurantId: req.params.id },
        update: themeSettingsFields,
        create: {
          restaurantId: req.params.id,
          ...themeSettingsFields,
        },
      });

      res.json({ ...themeSettings, menuId, templateId, isMenuSpecific: true });
    } else {
      // Restaurant-level theme (default for all menus) - without cover photo fields
      const themeSettings = await prisma.themeSettings.upsert({
        where: { restaurantId: req.params.id },
        update: themeSettingsFields,
        create: {
          restaurantId: req.params.id,
          ...themeSettingsFields,
        },
      });

      res.json(themeSettings);
    }
  } catch (error: any) {
    if (error.name === 'ZodError' || error.issues) {
      const zodError = error.issues || error.errors || [];
      console.error('Theme validation error:', JSON.stringify(zodError, null, 2));
      console.error('Theme data received:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({ 
        error: 'Validation error', 
        details: Array.isArray(zodError) 
          ? zodError.map((e: any) => `${e.path?.join('.') || 'unknown'}: ${e.message}`).join(', ')
          : String(zodError)
      });
    }
    console.error('Update theme error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Update module settings (ownership verified + validated through Zod, H6)
router.put('/:id/modules', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // H6: Parse through schema to prevent mass assignment of arbitrary fields
    const data = ModuleSettingsSchema.parse(req.body);

    const moduleSettings = await prisma.moduleSettings.upsert({
      where: { restaurantId: req.params.id },
      update: data,
      create: {
        restaurantId: req.params.id,
        ...data,
      },
    });

    res.json(moduleSettings);
  } catch (error: any) {
    if (error.name === 'ZodError' || error.issues) {
      return res.status(400).json({ error: 'Validation error', details: error.issues?.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ') });
    }
    console.error('Update module settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
