import Stripe from 'stripe';
import prisma from '../config/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

/**
 * Looks up an Admin by ID. If no stripeCustomerId exists, creates a Stripe
 * Customer using the Admin's email, stores the ID, and returns it.
 */
export async function getOrCreateStripeCustomer(adminId: string): Promise<string> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw new Error('Admin not found');

  if (admin.stripeCustomerId) return admin.stripeCustomerId;

  const customer = await stripe.customers.create({ email: admin.email });

  await prisma.admin.update({
    where: { id: adminId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Creates a Stripe Checkout Session in subscription mode and returns the
 * session URL the client should redirect to.
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  urls: { success: string; cancel: string },
): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: urls.success,
    cancel_url: urls.cancel,
  });

  if (!session.url) throw new Error('Stripe did not return a session URL');

  return session.url;
}

/**
 * Creates a Stripe Billing Portal Session and returns the portal URL.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Processes Stripe webhook events and updates Admin records accordingly.
 *
 * Handled events:
 * - checkout.session.completed → set subscriptionStatus to "active", store stripeSubscriptionId
 * - customer.subscription.updated → update subscriptionStatus to match Stripe status
 * - customer.subscription.deleted → set subscriptionStatus to "canceled", clear stripeSubscriptionId
 * - invoice.payment_failed → set subscriptionStatus to "past_due"
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (!session.customer || !session.subscription) break;

      const customerId = typeof session.customer === 'string'
        ? session.customer
        : session.customer.id;
      const subscriptionId = typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription.id;

      await prisma.admin.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: 'active',
          stripeSubscriptionId: subscriptionId,
        },
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      await prisma.admin.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: subscription.status },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer.id;

      await prisma.admin.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: 'canceled',
          stripeSubscriptionId: null,
        },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (!invoice.customer) break;

      const customerId = typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer.id;

      await prisma.admin.updateMany({
        where: { stripeCustomerId: customerId },
        data: { subscriptionStatus: 'past_due' },
      });
      break;
    }

    default:
      // Unknown event types are silently acknowledged
      break;
  }
}
