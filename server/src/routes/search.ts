import express from 'express';
import prisma from '../config/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Global search
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { q, restaurant, menu, cursor, limit } = req.query;
    const pageSize = Math.min(Number(limit) || 20, 50); // M8: cursor-based pagination, max 50

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Query admin's restaurant IDs for ownership filtering
    const adminRestaurants = await prisma.restaurant.findMany({
      where: { adminId: req.userId! },
      select: { id: true },
    });

    // Return empty results if admin has no restaurants
    if (adminRestaurants.length === 0) {
      return res.json([]);
    }

    const adminRestaurantIds = adminRestaurants.map((r) => r.id);

    const searchTerm = q.toLowerCase();

    // Build where clause scoped to admin's restaurants
    const where: any = {
      OR: [
        { name: { path: ['ENG'], string_contains: searchTerm } },
        { description: { path: ['ENG'], string_contains: searchTerm } },
      ],
      section: {
        menu: {
          restaurantId: { in: adminRestaurantIds },
        },
      },
    };

    if (restaurant) {
      // Only allow filtering by restaurants the admin owns
      if (!adminRestaurantIds.includes(restaurant as string)) {
        return res.json([]);
      }
      where.section.menu.restaurantId = restaurant as string;
    }

    if (menu) {
      where.section = {
        ...where.section,
        menuId: menu as string,
      };
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        section: {
          include: {
            menu: {
              include: {
                restaurant: true,
              },
            },
          },
        },
        allergens: true,
      },
      take: pageSize + 1, // Fetch one extra to detect hasMore
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > pageSize;
    const page = hasMore ? items.slice(0, pageSize) : items;
    const nextCursor = hasMore ? page[page.length - 1]?.id : null;

    // Format results with breadcrumb
    const results = page.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      location: {
        restaurant: item.section.menu.restaurant.name,
        restaurantId: item.section.menu.restaurant.id,
        menu: item.section.menu.name,
        menuId: item.section.menu.id,
        section: item.section.title,
        sectionId: item.section.id,
      },
      allergens: item.allergens,
    }));

    res.json({ results, nextCursor, hasMore });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

