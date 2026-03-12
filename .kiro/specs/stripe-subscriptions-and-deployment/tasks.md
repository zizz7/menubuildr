# Implementation Plan: Stripe Subscriptions and Deployment

## Overview

This plan implements Stripe subscription billing and production deployment readiness for menubuildr.com. The backend uses Express.js + Prisma + PostgreSQL (TypeScript), the frontend uses Next.js 16. Auth middleware has already been hardened (no local-admin fallback). Multi-tenancy with ownership enforcement is already in place. Tasks proceed incrementally: schema changes → billing service → routes → middleware → webhook handling → dashboard UI → production hardening.

## Tasks

- [x] 1. Database schema: add subscription fields to Admin model
  - [x] 1.1 Add subscription fields to the Prisma Admin model
    - Add `stripeCustomerId` (optional String, `@unique`, `@map("stripe_customer_id")`)
    - Add `stripeSubscriptionId` (optional String, `@map("stripe_subscription_id")`)
    - Add `subscriptionStatus` (String, `@default("none")`, `@map("subscription_status")`)
    - Add `subscriptionPlan` (optional String, `@map("subscription_plan")`)
    - File: `server/prisma/schema.prisma`
    - _Requirements: 12.1, 12.4_

  - [x] 1.2 Create and apply the Prisma migration
    - Run `npx prisma migrate dev --name add_subscription_fields_to_admin`
    - Verify existing Admin records get `subscriptionStatus = "none"` and null for other fields
    - _Requirements: 12.2, 12.3_

- [x] 2. Environment validation and backend production hardening
  - [x] 2.1 Create environment validator module
    - Create `server/src/config/env.ts`
    - Validate required env vars on startup in production: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
    - Log missing variable names and exit with non-zero code if any are missing when `NODE_ENV=production`
    - _Requirements: 14.1, 14.2_

  - [ ]* 2.2 Write property test for environment validation
    - **Property 12: Environment validation on startup**
    - **Validates: Requirements 14.1, 14.2**
    - Generate random subsets of required env vars, verify the validator identifies missing ones and would exit

  - [x] 2.3 Harden `server/src/server.ts` for production
    - Add `app.set('trust proxy', 1)` for Cloudflare proxy headers
    - Replace `cors({ origin: true })` with an allowlist derived from `FRONTEND_URL` in production, keeping permissive origins in development
    - Register `express.raw({ type: 'application/json' })` on `/api/billing/webhook` BEFORE the global `express.json()` middleware
    - Call `validateEnv()` on startup
    - _Requirements: 3.2, 3.4, 3.5, 13.2_

  - [ ]* 2.4 Write property test for CORS origin filtering
    - **Property 1: CORS origin filtering**
    - **Validates: Requirements 3.2**
    - Generate random origin strings, verify only allowlisted origins are accepted in production mode

- [x] 3. Checkpoint - Ensure schema migration and production hardening are solid
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Billing service and routes
  - [x] 4.1 Install the Stripe SDK
    - Run `npm install stripe` in the `server/` directory
    - _Requirements: 5.3_

  - [x] 4.2 Create the billing service
    - Create `server/src/services/billing.ts`
    - Implement `getOrCreateStripeCustomer(adminId: string): Promise<string>` — looks up Admin, creates Stripe Customer if no `stripeCustomerId`, stores and returns the ID
    - Implement `createCheckoutSession(customerId: string, priceId: string, urls: { success: string; cancel: string }): Promise<string>` — creates a Stripe Checkout Session in `subscription` mode, returns session URL
    - Implement `createPortalSession(customerId: string, returnUrl: string): Promise<string>` — creates a Stripe Billing Portal Session, returns portal URL
    - Implement `handleWebhookEvent(event: Stripe.Event): Promise<void>` — processes `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` events and updates Admin records in the database
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.4, 8.4, 8.5, 8.6, 8.7, 10.1_

  - [ ] 4.3 Write property test for Stripe customer ID management
    - **Property 3: Stripe customer ID management during checkout**
    - **Validates: Requirements 6.2, 6.3, 7.4**
    - Mock Stripe SDK; generate random Admin states (with/without existing `stripeCustomerId`), verify correct create-or-reuse behavior

  - [ ] 4.4 Write property test for webhook event processing
    - **Property 5: Webhook event updates subscription status correctly**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7**
    - Generate random valid webhook event payloads, verify correct status transitions in the database

  - [x] 4.5 Create billing routes
    - Create `server/src/routes/billing.ts`
    - `POST /api/billing/create-checkout-session` (behind `authenticateToken`): calls billing service, returns `{ url }`, handles errors with HTTP 500
    - `POST /api/billing/create-portal-session` (behind `authenticateToken`): calls billing service, returns `{ url }`, returns HTTP 400 if no `stripeCustomerId`
    - `POST /api/billing/webhook` (no auth, raw body): verifies signature via `stripe.webhooks.constructEvent()`, calls `handleWebhookEvent`, returns 200 on success, 400 on signature failure
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6, 8.1, 8.2, 8.3, 8.8, 8.9, 10.1, 10.2, 10.3, 10.4, 13.1, 13.3, 13.4_

  - [ ] 4.6 Write property test for webhook signature verification
    - **Property 6: Webhook signature verification**
    - **Validates: Requirements 8.2, 8.3**
    - Generate random payloads with valid/invalid signatures, verify 400 on failure and event processing on success

  - [ ] 4.7 Write property test for portal session requiring existing Stripe customer
    - **Property 9: Portal session requires existing Stripe customer**
    - **Validates: Requirements 10.1, 10.3, 10.4**
    - Generate random Admin states (with/without `stripeCustomerId`), verify portal URL returned or HTTP 400

  - [x] 4.8 Register billing routes in server.ts
    - Import and mount billing routes at `/api/billing` in `server/src/server.ts`
    - Ensure the webhook route uses the raw body middleware already configured in task 2.3
    - _Requirements: 8.1_

- [ ] 5. Subscription guard middleware
  - [x] 5.1 Create subscription guard middleware
    - Create `server/src/middleware/subscription.ts`
    - Implement `requireSubscription` middleware that runs after `authenticateToken`
    - Allow requests if `subscriptionStatus` is `"active"` or `"trialing"`
    - Return HTTP 403 with `{ error: "Subscription required", code: "SUBSCRIPTION_REQUIRED", subscriptionStatus }` otherwise
    - Read subscription status from the database on each request for real-time webhook updates
    - _Requirements: 9.1, 9.2, 9.3, 9.6_

  - [ ] 5.2 Write property test for subscription guard allow/block logic
    - **Property 7: Subscription guard allows or blocks based on status**
    - **Validates: Requirements 9.1, 9.2, 9.3**
    - Generate random subscription statuses and route paths, verify allow for active/trialing and 403 for none/canceled/past_due

  - [x] 5.3 Apply subscription guard to protected routes in server.ts
    - Apply `requireSubscription` middleware to all `/api/*` routes EXCEPT `/api/auth/*`, `/api/billing/*`, and `/api/health`
    - _Requirements: 9.4_

  - [ ] 5.4 Write property test for subscription guard route exemptions
    - **Property 8: Subscription guard exempts auth, billing, and health routes**
    - **Validates: Requirements 9.4**
    - Generate random route paths matching `/api/auth/*`, `/api/billing/*`, `/api/health`, verify they are not blocked regardless of subscription status

- [x] 6. Checkpoint - Ensure backend billing flow and subscription guard work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Extend auth endpoint with subscription data
  - [x] 7.1 Update `GET /api/auth/me` to include subscription fields
    - Modify `server/src/routes/auth.ts` to include `subscriptionStatus`, `subscriptionPlan`, `stripeCustomerId` (boolean presence only, not the actual ID), and `stripeSubscriptionId` (boolean presence only) in the `/me` response `select`
    - _Requirements: 11.2, 6.4_

- [ ] 8. Dashboard billing page and navigation
  - [x] 8.1 Create the billing page
    - Create `dashboard/app/dashboard/billing/page.tsx`
    - Fetch Admin subscription status from `GET /api/auth/me`
    - Display current subscription status with appropriate styling
    - Show "Subscribe" button when status is `"none"` or `"canceled"` → calls `POST /api/billing/create-checkout-session` → redirects to Stripe Checkout URL
    - Show "Manage Subscription" button when status is `"active"` or `"trialing"` → calls `POST /api/billing/create-portal-session` → redirects to Stripe Portal URL
    - Show "Update Payment" warning and button when status is `"past_due"` → opens Stripe Portal
    - Detect `session_id` query parameter and show success confirmation message
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 8.2 Write property test for billing page UI rendering
    - **Property 10: Billing page renders correct UI for subscription status**
    - **Validates: Requirements 11.2, 11.3, 11.4, 11.5**
    - Generate random subscription status values, verify the correct buttons/messages are rendered

  - [x] 8.3 Add "Billing" navigation item to the sidebar
    - Add a `{ title: 'Billing', href: '/dashboard/billing', icon: CreditCard }` entry to the `navItems` array in `dashboard/components/layout/dashboard-layout.tsx`
    - Import `CreditCard` from `lucide-react`
    - _Requirements: 11.7_

  - [x] 8.4 Update API client interceptor for subscription-required responses
    - Modify `dashboard/lib/api/client.ts` to detect 403 responses with `code: "SUBSCRIPTION_REQUIRED"` and redirect to `/dashboard/billing` instead of `/login`
    - Keep existing 401 handling (redirect to login)
    - _Requirements: 9.5_

- [x] 9. Production configuration files
  - [x] 9.1 Create `.env.example` file for the server
    - Document all required and optional environment variables with descriptions
    - Include: `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `FRONTEND_URL`, `NODE_ENV`, `PORT`, `CLOUDINARY_URL`
    - File: `server/.env.example`
    - _Requirements: 14.3_

  - [x] 9.2 Create `.env.example` file for the dashboard
    - Document: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
    - File: `dashboard/.env.example`
    - _Requirements: 14.3_

  - [x] 9.3 Update Next.js config for production deployment
    - Add `output: 'standalone'` to `dashboard/next.config.ts` for optimized Railway deployment
    - Verify the existing `/uploads/:path*` rewrite rule works with the production `NEXT_PUBLIC_API_URL`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 10. Final checkpoint - Ensure all tests pass and the full billing flow is wired end-to-end
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Auth middleware hardening (removing local-admin fallback) is already complete — no tasks needed
- Multi-tenancy with ownership enforcement is already implemented — no tasks needed
- Deployment to Railway and Cloudflare DNS configuration are infrastructure tasks done outside this plan (via Railway dashboard and Cloudflare dashboard)
- Property tests use `fast-check` and mock the Stripe SDK and Prisma client
- Each task references specific requirements for traceability
