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
    const customerId = await getOrCreateStripeCustomer(req.userId!);

    const url = await createCheckoutSession(customerId, process.env.STRIPE_PRICE_ID!, {
      success: `${process.env.FRONTEND_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel: `${process.env.FRONTEND_URL}/dashboard/billing`,
    });

    res.json({ url });
  } catch (error) {
    console.error('Create checkout session error:', error);
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

export default router;
