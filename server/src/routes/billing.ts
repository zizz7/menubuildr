import express from 'express';
import Stripe from 'stripe';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import {
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
} from '../services/billing';
import prisma from '../config/database';
import { getPlanLimits } from '../config/limits';

const router = express.Router();

// Lazy-init Stripe so the server can start without STRIPE_SECRET_KEY
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

// POST /create-checkout-session — create a Stripe Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    // Extract and validate billingCycle from request body, default to "monthly"
    const { billingCycle: rawCycle } = req.body || {};
    const billingCycle: 'monthly' | 'annual' =
      rawCycle === 'annual' ? 'annual' : 'monthly';

    const customerId = await getOrCreateStripeCustomer(req.userId!);

    const url = await createCheckoutSession(customerId, billingCycle, {
      success: `${process.env.FRONTEND_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel: `${process.env.FRONTEND_URL}/dashboard/billing`,
    });

    res.json({ url });
  } catch (error: any) {
    console.error('Create checkout session error:', error);

    // Surface descriptive error when Stripe price ID is not configured
    if (error?.message?.includes('environment variable is not configured')) {
      return res.status(500).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// POST /create-portal-session — create a Stripe Customer Portal Session
router.post('/create-portal-session', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: req.userId! } });
    if (!admin || !admin.stripeCustomerId) {
      return res.status(400).json({ error: 'No billing account exists' });
    }

    const url = await createPortalSession(
      admin.stripeCustomerId,
      `${process.env.FRONTEND_URL}/dashboard/billing`,
    );

    res.json({ url });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// POST /webhook — receive Stripe webhook events (no auth, raw body)
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const rawBody = req.body as Buffer;

  try {
    const event = getStripe().webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    await handleWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

// GET /usage — return current usage stats and plan limits
router.get('/usage', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.userId },
      select: { subscriptionPlan: true, restaurants: { select: { id: true } } },
    });

    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' });
    }

    const plan = admin.subscriptionPlan || 'free';
    const limits = getPlanLimits(admin.subscriptionPlan);

    const restaurantCount = admin.restaurants.length;
    const restaurantIds = admin.restaurants.map((r) => r.id);

    const [menuCount, itemCount] = await Promise.all([
      prisma.menu.count({ where: { restaurantId: { in: restaurantIds } } }),
      prisma.menuItem.count({
        where: { section: { menu: { restaurantId: { in: restaurantIds } } } },
      }),
    ]);

    res.json({
      plan,
      usage: { restaurants: restaurantCount, menus: menuCount, items: itemCount },
      limits: {
        restaurants: limits.restaurants,
        menusPerRestaurant: limits.menusPerRestaurant,
        itemsPerMenu: limits.itemsPerMenu,
      },
    });
  } catch (error) {
    console.error('Usage stats error:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

export default router;
