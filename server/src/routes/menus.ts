import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifyRestaurantOwnership, verifyMenuOwnership } from '../middleware/ownership';
import { checkUsageLimit } from '../middleware/usage-limits';
import { getPlanLimits } from '../config/limits';
import { MenuSchema } from '../utils/validation';
import { regenerateMenuIfPublished } from '../utils/regenerate-menu';
import { generateHTML } from '../services/menu-generator';
import { getTemplateGenerator } from '../services/template-registry';
import { autoTranslateMenu } from '../services/auto-translate';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Get all menus for a restaurant
router.get('/restaurant/:restaurantId', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.restaurantId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menus = await prisma.menu.findMany({
      where: { restaurantId: req.params.restaurantId },
      include: {
        sections: {
          include: {
            _count: {
              select: { items: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        _count: {
          select: { sections: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    res.json(menus);
  } catch (error) {
    console.error('Get menus error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single menu with full details
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        restaurant: true,
        sections: {
          where: { parentSectionId: null }, // Only top-level sections
          include: {
            subSections: {
              include: {
                categories: {
                  orderBy: { orderIndex: 'asc' },
                },
                items: {
                  include: {
                    allergens: true,
                    recipeDetails: true,
                    priceVariations: {
                      orderBy: { orderIndex: 'asc' },
                    },
                    availabilitySchedule: true,
                  },
                  orderBy: { orderIndex: 'asc' },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
            categories: {
              orderBy: { orderIndex: 'asc' },
            },
            items: {
              include: {
                allergens: true,
                recipeDetails: true,
                priceVariations: {
                  orderBy: { orderIndex: 'asc' },
                },
                availabilitySchedule: true,
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json(menu);
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create menu (plan-aware limit enforced by middleware)
router.post('/restaurant/:restaurantId', checkUsageLimit('menu'), async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyRestaurantOwnership(req.params.restaurantId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const count = await prisma.menu.count({
      where: { restaurantId: req.params.restaurantId },
    });

    const data = MenuSchema.parse(req.body);

    const menu = await prisma.menu.create({
      data: {
        ...data,
        restaurantId: req.params.restaurantId,
        orderIndex: count,
      },
    });

    res.status(201).json(menu);
  } catch (error: any) {
    if (error.name === 'ZodError' || error.issues) {
      const zodError = error.issues || error.errors || [];
      return res.status(400).json({ 
        error: 'Validation error', 
        details: zodError.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')
      });
    }
    console.error('Create menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update menu
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const data = MenuSchema.partial().parse(req.body);

    const menu = await prisma.menu.update({
      where: { id: req.params.id },
      data,
    });

    // Regenerate HTML if menu is published
    await regenerateMenuIfPublished(req.params.id);

    res.json(menu);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error });
    }
    console.error('Update menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete menu
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    await prisma.menu.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Delete menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Preview menu with theme overrides (for live preview)
router.post('/:id/preview', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
            logoUrl: true,
            logoPosition: true,
            themeSettings: true,
          },
        },
        sections: {
          where: { parentSectionId: null },
          include: {
            subSections: {
              include: {
                items: {
                  include: {
                    allergens: true,
                    recipeDetails: true,
                    priceVariations: {
                      orderBy: { orderIndex: 'asc' },
                    },
                  },
                  where: { isAvailable: true },
                  orderBy: { orderIndex: 'asc' },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
            items: {
              include: {
                allergens: true,
                recipeDetails: true,
                priceVariations: {
                  orderBy: { orderIndex: 'asc' },
                },
              },
              where: { isAvailable: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Fetch all active languages
    const languages = await prisma.language.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: 'asc' },
    });

    // Fetch all allergen icons for legend
    const allergens = await prisma.allergenIcon.findMany({
      orderBy: { orderIndex: 'asc' },
    });

    // Format allergens with relative paths (for static hosting compatibility)
    const allergensFormatted = allergens
      .filter(a => a.imageUrl && a.imageUrl.trim())
      .map(a => {
        let imageUrl = a.imageUrl.trim();
        // Keep external URLs as-is, ensure relative paths start with /
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          // External URL, keep as-is
        } else if (!imageUrl.startsWith('/')) {
          // If it doesn't start with /, make it relative
          imageUrl = `/${imageUrl}`;
        }
        // If it already starts with /uploads/, keep it as-is (relative path)
        return {
          id: a.id,
          name: a.name,
          imageUrl: imageUrl,
          label: (a.label as Record<string, string>) || {}
        };
      });

    const menuData = menu as any;
    
    // Get theme overrides from request body (URLs will be normalized by generateHTML)
    const themeOverrides = req.body.theme ? {
      primaryColor: req.body.theme.primaryColor,
      secondaryColor: req.body.theme.secondaryColor,
      accentColor: req.body.theme.accentColor,
      backgroundColor: req.body.theme.backgroundColor,
      textColor: req.body.theme.textColor,
      customCss: req.body.theme.customCss,
      customFontsUrls: req.body.theme.customFontsUrls,
      backgroundIllustrationUrl: req.body.theme.backgroundIllustrationUrl,
      backgroundIllustrationOpacity: req.body.theme.backgroundIllustrationOpacity,
      navDrawerStyle: req.body.theme.navDrawerStyle,
      navDrawerBgUrl: req.body.theme.navDrawerBgUrl,
      navDrawerBgOpacity: req.body.theme.navDrawerBgOpacity,
      navDrawerCategoryImages: req.body.theme.navDrawerCategoryImages,
      coverPhotoUrl: req.body.theme.coverPhotoUrl,
      coverPhotoPosition: req.body.theme.coverPhotoPosition,
      coverPhotoSize: req.body.theme.coverPhotoSize,
      logoSize: req.body.theme.logoSize,
      sectionFontFamily: req.body.theme.sectionFontFamily,
      sectionFontSize: req.body.theme.sectionFontSize,
      sectionBackgroundColor: req.body.theme.sectionBackgroundColor,
    } : undefined;

    // Fetch allergen filter mode setting
    const allergenSettings = await prisma.allergenSettings.findFirst();
    const filterMode = (allergenSettings?.filterMode === 'include' ? 'include' : 'exclude') as 'exclude' | 'include';

    // Get base URL for preview (convert relative paths to absolute URLs for blob URL context)
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:5000';
    const baseUrl = `${protocol}://${host}`;

    // Generate HTML with theme overrides and base URL for preview
    // Determine which template to use for preview
    let templateSlug = 'classic';
    if (req.body.templateSlug) {
      templateSlug = req.body.templateSlug;
    } else if (req.body.templateId) {
      const tmpl = await prisma.menuTemplate.findUnique({ where: { id: req.body.templateId } });
      if (tmpl) templateSlug = tmpl.slug;
    }
    
    const generator = getTemplateGenerator(templateSlug) || generateHTML;
    const html = generator(menuData, languages, allergensFormatted, themeOverrides, filterMode, baseUrl);

    // Return HTML as response
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Preview menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Publish menu (creates version + generates HTML)
router.post('/:id/publish', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const menu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        sections: {
          include: {
            items: {
              include: {
                allergens: true,
                recipeDetails: true,
                priceVariations: true,
              },
            },
          },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Get latest version number
    const latestVersion = await prisma.menuVersion.findFirst({
      where: { menuId: req.params.id },
      orderBy: { versionNumber: 'desc' },
    });

    const versionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    // Create version snapshot
    await prisma.menuVersion.create({
      data: {
        menuId: req.params.id,
        versionNumber,
        snapshotData: menu as any,
        createdBy: req.userId!,
        notes: req.body.notes || null,
      },
    });

    // Get restaurant slug for shareable link
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: menu.restaurantId },
      select: { slug: true },
    });

    // Update menu status
    const updatedMenu = await prisma.menu.update({
      where: { id: req.params.id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        ...(req.body.templateId ? { templateId: req.body.templateId } : {}),
      },
    });

    // Auto-translate menu items into all active languages
    let translationResult = null;
    try {
      console.log(`Auto-translating menu ${req.params.id}...`);
      translationResult = await autoTranslateMenu(req.params.id);
      console.log(`Translation complete: ${translationResult.translatedItems} items, ${translationResult.translatedSections} sections`);
      if (translationResult.errors.length > 0) {
        console.warn('Translation warnings:', translationResult.errors);
      }
    } catch (error) {
      console.error('Auto-translation failed (continuing with publish):', error);
    }

    // Generate HTML menu file
    try {
      const { generateMenuHTML } = await import('../services/menu-generator');
      await generateMenuHTML(req.params.id);
    } catch (error) {
      console.error('Error generating menu HTML:', error);
      // Continue even if HTML generation fails
    }

    // Generate shareable link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const shareableLink = `${baseUrl}/menu/${restaurant?.slug}/${menu.slug}`;

    res.json({ 
      menu: updatedMenu, 
      versionNumber,
      shareableLink,
      templateUsed: req.body.templateId ? 'selected' : 'default',
      translation: translationResult ? {
        translatedItems: translationResult.translatedItems,
        translatedSections: translationResult.translatedSections,
        warnings: translationResult.errors.length > 0 ? translationResult.errors : undefined,
      } : undefined,
    });
  } catch (error) {
    console.error('Publish menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate menu (plan-aware limit enforced inline since restaurantId is not in URL params)
router.post('/:id/duplicate', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const originalMenu = await prisma.menu.findUnique({
      where: { id: req.params.id },
      include: {
        sections: {
          include: {
            categories: true,
            items: {
              include: {
                allergens: true,
                recipeDetails: true,
                priceVariations: true,
                availabilitySchedule: true,
              },
            },
          },
        },
      },
    });

    if (!originalMenu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    // Plan-aware menu limit check
    const admin = await prisma.admin.findUnique({
      where: { id: req.userId },
      select: { subscriptionPlan: true },
    });
    const limits = getPlanLimits(admin?.subscriptionPlan);
    const menuLimit = limits.menusPerRestaurant;

    // Get current menu count for orderIndex and limit check
    const count = await prisma.menu.count({
      where: { restaurantId: originalMenu.restaurantId },
    });

    if (isFinite(menuLimit) && count >= menuLimit) {
      const plan = admin?.subscriptionPlan || 'free';
      return res.status(403).json({
        error: 'Free plan limit reached',
        code: 'PLAN_LIMIT_REACHED',
        limit: menuLimit,
        current: count,
        resource: 'menu',
        plan,
      });
    }

    // L3: Handle slug collision by appending -copy, -copy-2, etc.
    let slug = `${originalMenu.slug}-copy`;
    let counter = 1;
    let slugExists = true;
    
    while (slugExists) {
      const existing = await prisma.menu.findUnique({
        where: {
          restaurantId_slug: {
            restaurantId: originalMenu.restaurantId,
            slug: counter === 1 ? slug : `${originalMenu.slug}-copy-${counter}`
          }
        }
      });
      if (!existing) {
        if (counter > 1) slug = `${originalMenu.slug}-copy-${counter}`;
        slugExists = false;
      } else {
        counter++;
      }
    }

    const newMenu = await prisma.menu.create({
      data: {
        restaurantId: originalMenu.restaurantId,
        name: { ...originalMenu.name as any },
        slug,
        menuType: originalMenu.menuType,
        status: 'draft',
        orderIndex: count,
        sections: {
          create: (originalMenu.sections || []).map((section) => ({
            title: section.title as any,
            illustrationUrl: section.illustrationUrl,
            orderIndex: section.orderIndex,
            categories: {
              create: (section.categories || []).map((category) => ({
                name: category.name as any,
                orderIndex: category.orderIndex,
              })),
            },
            items: {
              create: (section.items || []).map((item: any) => ({
                name: item.name as any,
                description: item.description ? (item.description as any) : undefined,
                price: item.price,
                imageUrl: item.imageUrl,
                orderIndex: item.orderIndex,
                isAvailable: item.isAvailable,
                preparationTime: item.preparationTime,
                categoryId: null, // Will need to map category IDs
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
                availabilitySchedule: item.availabilitySchedule ? {
                  create: {
                    dayOfWeek: item.availabilitySchedule.dayOfWeek,
                    startTime: item.availabilitySchedule.startTime,
                    endTime: item.availabilitySchedule.endTime,
                    seasonalStartDate: item.availabilitySchedule.seasonalStartDate,
                    seasonalEndDate: item.availabilitySchedule.seasonalEndDate,
                  },
                } : undefined,
              })),
            },
          })),
        },
      },
    });

    res.status(201).json(newMenu);
  } catch (error) {
    console.error('Duplicate menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder menus
router.put('/:id/reorder', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const { orderIndex } = req.body;

    const menu = await prisma.menu.update({
      where: { id: req.params.id },
      data: { orderIndex },
    });

    res.json(menu);
  } catch (error) {
    console.error('Reorder menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get version history
router.get('/:id/versions', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const versions = await prisma.menuVersion.findMany({
      where: { menuId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(versions);
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore from version
router.post('/:id/restore/:versionId', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const version = await prisma.menuVersion.findUnique({
      where: { id: req.params.versionId },
    });

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // TODO: Implement version restore logic
    // This would require restoring the full menu structure from snapshotData

    res.json({ message: 'Version restore functionality to be implemented' });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

