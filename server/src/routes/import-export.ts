import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import { verifyRestaurantOwnership, verifyMenuOwnership } from '../middleware/ownership';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Export restaurant data
router.post('/restaurants/:id/export', async (req: AuthRequest, res) => {
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
          include: {
            sections: {
              include: {
                items: {
                  include: {
                    allergens: true,
                    recipeDetails: true,
                    priceVariations: true,
                    availabilitySchedule: true,
                  },
                },
                categories: true,
              },
            },
          },
        },
      },
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=restaurant-${restaurant.slug}.json`);
    res.json(restaurant);
  } catch (error) {
    console.error('Export restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export menu data
router.post('/menus/:id/export', async (req: AuthRequest, res) => {
  try {
    const ownership = await verifyMenuOwnership(req.params.id, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const { format = 'json' } = req.body;

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
            categories: true,
          },
        },
      },
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    if (format === 'csv') {
      // M4: Escape CSV values to prevent formula injection
      const escapeCsvField = (val: unknown): string => {
        const str = String(val ?? '');
        // Strip formula-injection prefixes (=, +, -, @)
        const safe = str.replace(/^[=+\-@]/, "'");
        // Wrap in double-quotes, escape internal double-quotes by doubling
        return `"${safe.replace(/"/g, '""')}"`;
      };

      const csvRows = ['name_ENG,description_ENG,price,section_name'];

      menu.sections.forEach((section) => {
        section.items.forEach((item) => {
          const name = escapeCsvField((item.name as any).ENG);
          const desc = escapeCsvField((item.description as any)?.ENG);
          const price = escapeCsvField(item.price);
          const sectionName = escapeCsvField((section.title as any).ENG);
          csvRows.push(`${name},${desc},${price},${sectionName}`);
        });
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=menu-${menu.slug}.csv`);
      res.send(csvRows.join('\n'));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=menu-${menu.slug}.json`);
      res.json(menu);
    }
  } catch (error) {
    console.error('Export menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import restaurant data (same format as Export Restaurant / excel-to-restaurant-json output)
router.post('/restaurants/import', async (req: AuthRequest, res) => {
  try {
    const body = req.body as {
      name: string;
      logoUrl?: string | null;
      logoPosition?: string | null;
      slug: string;
      currency?: string;
      defaultLanguage?: string;
      activeStatus?: boolean;
      themeSettings?: {
        primaryColor?: string;
        secondaryColor?: string;
        accentColor?: string;
        backgroundColor?: string;
        textColor?: string;
        customCss?: string | null;
        customFontsUrls?: string[];
        backgroundIllustrationUrl?: string | null;
      };
      moduleSettings?: {
        enablePriceVariations?: boolean;
        enableAvailabilitySchedule?: boolean;
        enableSeasonalItems?: boolean;
        enableQrGeneration?: boolean;
        enableSubcategories?: boolean;
      };
      menus?: Array<{
        name: Record<string, string>;
        slug: string;
        menuType: string;
        status?: string;
        orderIndex?: number;
        themeSettings?: unknown;
        sections?: Array<{
          title: Record<string, string>;
          orderIndex?: number;
          parentSectionId?: string | null;
          illustrationUrl?: string | null;
          illustrationAsBackground?: boolean;
          illustrationPosition?: string | null;
          illustrationSize?: string | null;
          items?: Array<{
            name: Record<string, string>;
            description?: Record<string, string> | null;
            price?: number | null;
            calories?: number | null;
            imageUrl?: string | null;
            orderIndex?: number;
            isAvailable?: boolean;
            preparationTime?: number | null;
            allergens?: unknown[];
            recipeDetails?: {
              ingredients?: Record<string, string> | Array<{ name: string; quantity?: number | null; unit?: string | null }>;
              instructions?: string | null;
              servings?: number | null;
              difficultyLevel?: string | null;
            } | null;
            priceVariations?: unknown[];
            availabilitySchedule?: unknown;
          }>;
          categories?: unknown[];
        }>;
      }>;
    };

    // M5: Add count limits to prevent resource exhaustion
    const MAX_MENUS = 4;
    const MAX_SECTIONS_PER_MENU = 20;
    const MAX_ITEMS_PER_SECTION = 50;

    if (body.menus && body.menus.length > MAX_MENUS) {
      return res.status(400).json({ error: `Maximum ${MAX_MENUS} menus allowed per restaurant` });
    }

    if (body.menus) {
      for (const menu of body.menus) {
        if (menu.sections && menu.sections.length > MAX_SECTIONS_PER_MENU) {
          return res.status(400).json({ 
            error: `Maximum ${MAX_SECTIONS_PER_MENU} sections allowed per menu (at menu: ${menu.slug})` 
          });
        }
        if (menu.sections) {
          for (const section of menu.sections) {
            if (section.items && section.items.length > MAX_ITEMS_PER_SECTION) {
              return res.status(400).json({ 
                error: `Maximum ${MAX_ITEMS_PER_SECTION} items allowed per section (at section: ${section.title?.ENG || 'unnamed'})` 
              });
            }
          }
        }
      }
    }

    if (!body.name || !body.slug) {
      return res.status(400).json({ error: 'name and slug are required' });
    }

    // M1: Validate slug format — only alphanumeric + hyphens allowed
    const slugPattern = /^[a-z0-9-]+$/;
    if (!slugPattern.test(body.slug)) {
      return res.status(400).json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    let restaurant = await prisma.restaurant.findUnique({
      where: { slug: body.slug },
    });

    if (restaurant) {
      // Restaurant exists: verify ownership before importing menus
      const ownership = await verifyRestaurantOwnership(restaurant.id, req.userId!);
      if (!ownership.authorized) {
        return res.status(404).json({ error: 'Restaurant not found' });
      }
      // keep name and logo unchanged, only import menus
      // (do not create or update themeSettings/moduleSettings)
    } else {
      // New restaurant: create and optionally themeSettings + moduleSettings
      restaurant = await prisma.restaurant.create({
        data: {
          name: body.name,
          slug: body.slug,
          adminId: req.userId!,
          logoUrl: body.logoUrl ?? null,
          logoPosition: body.logoPosition ?? null,
          currency: body.currency ?? 'USD',
          defaultLanguage: body.defaultLanguage ?? 'ENG',
          activeStatus: body.activeStatus ?? true,
        },
      });

      if (body.themeSettings) {
        await prisma.themeSettings.create({
          data: {
            restaurantId: restaurant.id,
            primaryColor: body.themeSettings.primaryColor ?? '#000000',
            secondaryColor: body.themeSettings.secondaryColor ?? '#ffffff',
            accentColor: body.themeSettings.accentColor ?? '#ff6b6b',
            backgroundColor: body.themeSettings.backgroundColor ?? '#ffffff',
            textColor: body.themeSettings.textColor ?? '#000000',
            customCss: body.themeSettings.customCss ?? null,
            customFontsUrls: body.themeSettings.customFontsUrls ?? [],
            backgroundIllustrationUrl: body.themeSettings.backgroundIllustrationUrl ?? null,
          },
        });
      }

      if (body.moduleSettings) {
        await prisma.moduleSettings.create({
          data: {
            restaurantId: restaurant.id,
            enablePriceVariations: body.moduleSettings.enablePriceVariations ?? false,
            enableAvailabilitySchedule: body.moduleSettings.enableAvailabilitySchedule ?? false,
            enableSeasonalItems: body.moduleSettings.enableSeasonalItems ?? false,
            enableQrGeneration: body.moduleSettings.enableQrGeneration ?? false,
            enableSubcategories: body.moduleSettings.enableSubcategories ?? false,
          },
        });
      }
    }

    const menus = body.menus ?? [];
    let nextOrderIndex = await prisma.menu.count({
      where: { restaurantId: restaurant.id },
    });

    for (let mi = 0; mi < menus.length; mi++) {
      const menuData = menus[mi];
      const existingMenu = await prisma.menu.findFirst({
        where: {
          restaurantId: restaurant.id,
          slug: menuData.slug,
        },
      });
      if (existingMenu) {
        continue; // skip: menu with this slug already exists for this restaurant
      }

      const menu = await prisma.menu.create({
        data: {
          restaurantId: restaurant.id,
          name: menuData.name,
          slug: menuData.slug,
          menuType: menuData.menuType ?? 'dinner',
          status: (menuData.status as 'draft' | 'published') ?? 'draft',
          orderIndex: menuData.orderIndex ?? nextOrderIndex++,
        },
      });

      const sections = menuData.sections ?? [];
      for (let si = 0; si < sections.length; si++) {
        const sec = sections[si];
        const section = await prisma.section.create({
          data: {
            menuId: menu.id,
            title: sec.title,
            orderIndex: sec.orderIndex ?? si,
            parentSectionId: sec.parentSectionId ?? null,
            illustrationUrl: sec.illustrationUrl ?? null,
            illustrationAsBackground: sec.illustrationAsBackground ?? false,
            illustrationPosition: sec.illustrationPosition ?? null,
            illustrationSize: sec.illustrationSize ?? null,
          },
        });

        const items = sec.items ?? [];
        for (let ii = 0; ii < items.length; ii++) {
          const it = items[ii];
          const item = await prisma.menuItem.create({
            data: {
              sectionId: section.id,
              name: it.name,
              description: it.description ?? undefined,
              price: it.price ?? null,
              calories: it.calories ?? null,
              imageUrl: it.imageUrl ?? null,
              orderIndex: it.orderIndex ?? ii,
              isAvailable: it.isAvailable ?? true,
              preparationTime: it.preparationTime ?? null,
            },
          });

          const rd = it.recipeDetails;
          if (rd && rd.ingredients != null) {
            const ingredients = Array.isArray(rd.ingredients)
              ? rd.ingredients
              : typeof rd.ingredients === 'object' && !Array.isArray(rd.ingredients)
                ? (rd.ingredients as Record<string, string>)
                : [];
            await prisma.recipeDetails.create({
              data: {
                menuItemId: item.id,
                ingredients: ingredients as any,
                instructions: rd.instructions ?? null,
                servings: rd.servings ?? null,
                difficultyLevel: rd.difficultyLevel ?? null,
              },
            });
          }
        }
      }
    }

    const created = await prisma.restaurant.findUnique({
      where: { id: restaurant.id },
      include: {
        themeSettings: true,
        moduleSettings: true,
        menus: {
          include: {
            sections: {
              include: {
                items: { include: { recipeDetails: true } },
              },
            },
          },
        },
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Import restaurant error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import a single menu from JSON (format produced by excel-to-menu-json script)
router.post('/restaurants/:restaurantId/import-menu', async (req: AuthRequest, res) => {
  try {
    const { restaurantId } = req.params;
    const body = req.body as {
      menuName: Record<string, string>;
      menuSlug: string;
      menuType: 'breakfast' | 'lunch' | 'dinner' | 'drinks';
      sections: Array<{
        title: Record<string, string>;
        orderIndex: number;
        items: Array<{
          name: Record<string, string>;
          description?: Record<string, string> | null;
          price: number | null;
          calories?: number | null;
          orderIndex: number;
          recipeDetails?: {
            ingredients: Array<{ name: string; quantity: number | null; unit: string | null }>;
            instructions: string | null;
            servings: number | null;
            difficultyLevel: string | null;
          } | null;
        }>;
      }>;
    };

    const ownership = await verifyRestaurantOwnership(restaurantId, req.userId!);
    if (!ownership.authorized) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const menuCount = await prisma.menu.count({ where: { restaurantId } });
    if (menuCount >= 4) {
      return res.status(400).json({ error: 'Maximum 4 menus per restaurant' });
    }

    const menu = await prisma.menu.create({
      data: {
        restaurantId,
        name: body.menuName,
        slug: body.menuSlug,
        menuType: body.menuType,
        status: 'draft',
        orderIndex: menuCount,
      },
    });

    for (const sec of body.sections) {
      const section = await prisma.section.create({
        data: {
          menuId: menu.id,
          title: sec.title,
          orderIndex: sec.orderIndex,
          parentSectionId: null,
        },
      });

      for (const it of sec.items) {
        const item = await prisma.menuItem.create({
          data: {
            sectionId: section.id,
            name: it.name,
            description: it.description ?? undefined,
            price: it.price,
            calories: it.calories ?? null,
            orderIndex: it.orderIndex,
          },
        });
        if (it.recipeDetails && Array.isArray(it.recipeDetails.ingredients) && it.recipeDetails.ingredients.length > 0) {
          await prisma.recipeDetails.create({
            data: {
              menuItemId: item.id,
              ingredients: it.recipeDetails.ingredients as any,
              instructions: it.recipeDetails.instructions ?? null,
              servings: it.recipeDetails.servings ?? null,
              difficultyLevel: it.recipeDetails.difficultyLevel ?? null,
            },
          });
        }
      }
    }

    const created = await prisma.menu.findUnique({
      where: { id: menu.id },
      include: {
        sections: {
          include: {
            items: { include: { recipeDetails: true } },
          },
        },
      },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Import menu error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import menu items from CSV
router.post('/menus/:menuId/import-items', async (req: AuthRequest, res) => {
  try {
    // TODO: Implement CSV import
    // This would parse CSV and create menu items
    res.json({ message: 'CSV import functionality to be implemented' });
  } catch (error) {
    console.error('Import menu items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

