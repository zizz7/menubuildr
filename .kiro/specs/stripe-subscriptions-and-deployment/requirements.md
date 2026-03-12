# Requirements Document

## Introduction

This feature adds two foundational capabilities to menubuildr.com: production deployment hosting and Stripe subscription billing. The application currently runs locally with an Express.js backend, Next.js dashboard, and PostgreSQL database. Since Express.js is incompatible with Cloudflare Workers (V8 isolates vs Node.js runtime), the deployment strategy uses Railway as the PaaS provider for hosting the backend, frontend, and PostgreSQL database, with Cloudflare acting as DNS proxy and CDN in front of the domain menubuildr.com. Stripe integration adds subscription-based billing so restaurant owners can pay for the service on a recurring basis.

## Glossary

- **Deployment_System**: The infrastructure configuration that hosts the Express.js backend, Next.js dashboard, and PostgreSQL database on Railway
- **Cloudflare_Proxy**: The Cloudflare DNS and CDN layer that routes traffic from menubuildr.com to Railway, providing SSL termination and caching
- **Railway**: The PaaS hosting provider (railway.com) that runs the Node.js application processes and managed PostgreSQL database
- **Billing_Service**: The server-side service that manages Stripe subscription operations including checkout, webhooks, and customer portal
- **Subscription**: A recurring payment plan that grants a restaurant owner access to menubuildr.com features
- **Stripe_Webhook_Handler**: The Express.js endpoint that receives and processes events from Stripe (e.g., payment success, subscription cancellation)
- **Customer_Portal**: The Stripe-hosted page where subscribers manage their billing details, invoices, and subscription status
- **Subscription_Guard**: The middleware that checks a user's subscription status before allowing access to protected features
- **Dashboard**: The Next.js administrative interface where restaurant staff manage menus
- **Admin**: The authenticated user who manages restaurants and menus in the Dashboard

## Requirements

### Requirement 1: Production Hosting Configuration

**User Story:** As a developer, I want to deploy the application to a PaaS provider, so that menubuildr.com is accessible on the internet.

#### Acceptance Criteria

1. THE Deployment_System SHALL host the Express.js backend as a Node.js process on the Railway
2. THE Deployment_System SHALL host the Next.js dashboard as a separate Node.js process on the Railway
3. THE Deployment_System SHALL provision a managed PostgreSQL database on the Railway
4. THE Deployment_System SHALL configure environment variables for DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CLOUDINARY_URL, and FRONTEND_URL on the Railway
5. WHEN the backend process starts, THE Deployment_System SHALL run Prisma migrations before accepting requests
6. THE Deployment_System SHALL expose the backend on a provider-assigned URL that Cloudflare_Proxy can route to

### Requirement 2: Cloudflare DNS and CDN Integration

**User Story:** As a developer, I want Cloudflare to proxy traffic to the hosting provider, so that menubuildr.com has SSL, caching, and DDoS protection.

#### Acceptance Criteria

1. THE Cloudflare_Proxy SHALL route `menubuildr.com` and `www.menubuildr.com` to the Railway via DNS CNAME or A records
2. THE Cloudflare_Proxy SHALL route `api.menubuildr.com` to the Express.js backend service on the Railway
3. THE Cloudflare_Proxy SHALL provide SSL termination using Cloudflare's Universal SSL certificate
4. THE Cloudflare_Proxy SHALL set SSL mode to "Full (Strict)" when the Railway supplies a valid TLS certificate
5. WHEN a request arrives at the Railway, THE Deployment_System SHALL accept the Cloudflare-proxied connection without certificate conflicts
6. THE Cloudflare_Proxy SHALL cache static assets (images, CSS, JS) with appropriate cache headers

### Requirement 3: Backend Production Readiness

**User Story:** As a developer, I want the Express.js backend to be production-ready, so that it runs securely and reliably in a hosted environment.

#### Acceptance Criteria

1. THE Deployment_System SHALL set the NODE_ENV environment variable to "production" on the Railway
2. THE Deployment_System SHALL configure CORS to allow requests only from `menubuildr.com`, `www.menubuildr.com`, and `api.menubuildr.com`
3. WHEN the backend starts in production, THE Deployment_System SHALL enforce JWT authentication on all protected routes (removing the local-admin fallback)
4. THE Deployment_System SHALL configure the Express.js backend to trust proxy headers from Cloudflare using `app.set('trust proxy', 1)`
5. THE Deployment_System SHALL include a health check endpoint at `GET /api/health` that returns HTTP 200 with a JSON status object
6. IF the database connection fails on startup, THEN THE Deployment_System SHALL log the error and exit with a non-zero exit code

### Requirement 4: Frontend Production Build and Deployment

**User Story:** As a developer, I want the Next.js dashboard to be built and deployed for production, so that users can access the dashboard at menubuildr.com.

#### Acceptance Criteria

1. THE Deployment_System SHALL build the Next.js dashboard using `next build` during the deployment pipeline
2. THE Deployment_System SHALL set the NEXT_PUBLIC_API_URL environment variable to `https://api.menubuildr.com`
3. THE Deployment_System SHALL serve the Next.js dashboard using `next start` on the Railway
4. WHEN the dashboard is deployed, THE Deployment_System SHALL configure the Next.js rewrite rules to proxy `/uploads/*` requests to the backend API URL
5. THE Deployment_System SHALL serve public menu HTML files from the Next.js public directory at paths matching `/menus/{restaurant-slug}/{menu-slug}.html`

### Requirement 5: Stripe Account and Product Configuration

**User Story:** As a business owner, I want Stripe products and prices configured, so that customers can subscribe to menubuildr.com plans.

#### Acceptance Criteria

1. THE Billing_Service SHALL support at least one subscription plan defined as a Stripe Product with a recurring Price
2. THE Billing_Service SHALL store the Stripe Price ID as an environment variable (STRIPE_PRICE_ID) on the Railway
3. THE Billing_Service SHALL use the Stripe secret key (STRIPE_SECRET_KEY) for all server-side Stripe API calls
4. THE Billing_Service SHALL use the Stripe publishable key (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) on the Dashboard for client-side Stripe.js initialization
5. WHEN a new subscription plan is added, THE Billing_Service SHALL require only a new Stripe Price ID environment variable to support the plan

### Requirement 6: Stripe Customer Management

**User Story:** As a system, I want each Admin linked to a Stripe customer, so that billing is tracked per user.

#### Acceptance Criteria

1. THE Billing_Service SHALL store a `stripeCustomerId` field on the Admin model in the database
2. WHEN an Admin initiates checkout for the first time, THE Billing_Service SHALL create a Stripe Customer using the Admin's email and store the Stripe Customer ID in the Admin record
3. WHEN an Admin already has a stripeCustomerId, THE Billing_Service SHALL reuse the existing Stripe Customer for subsequent checkout sessions
4. THE Billing_Service SHALL store a `subscriptionStatus` field on the Admin model with values: "none", "active", "past_due", "canceled", or "trialing"
5. THE Billing_Service SHALL store a `stripeSubscriptionId` field on the Admin model to reference the active Stripe Subscription

### Requirement 7: Checkout Session Creation

**User Story:** As a restaurant owner, I want to start a subscription through a checkout flow, so that I can pay for menubuildr.com.

#### Acceptance Criteria

1. WHEN an authenticated Admin sends a POST request to `/api/billing/create-checkout-session`, THE Billing_Service SHALL create a Stripe Checkout Session in "subscription" mode
2. THE Billing_Service SHALL set the Checkout Session success URL to `{FRONTEND_URL}/dashboard/billing?session_id={CHECKOUT_SESSION_ID}`
3. THE Billing_Service SHALL set the Checkout Session cancel URL to `{FRONTEND_URL}/dashboard/billing`
4. THE Billing_Service SHALL attach the Admin's Stripe Customer ID to the Checkout Session
5. THE Billing_Service SHALL return the Checkout Session URL in the API response so the Dashboard can redirect the user
6. IF Stripe Checkout Session creation fails, THEN THE Billing_Service SHALL return HTTP 500 with an error message

### Requirement 8: Stripe Webhook Processing

**User Story:** As a system, I want to process Stripe webhook events, so that subscription status stays synchronized with Stripe.

#### Acceptance Criteria

1. THE Stripe_Webhook_Handler SHALL listen at `POST /api/billing/webhook` for incoming Stripe events
2. THE Stripe_Webhook_Handler SHALL verify the webhook signature using the STRIPE_WEBHOOK_SECRET environment variable
3. IF webhook signature verification fails, THEN THE Stripe_Webhook_Handler SHALL return HTTP 400 and log the verification failure
4. WHEN a `checkout.session.completed` event is received, THE Stripe_Webhook_Handler SHALL update the Admin's subscriptionStatus to "active" and store the stripeSubscriptionId
5. WHEN a `customer.subscription.updated` event is received, THE Stripe_Webhook_Handler SHALL update the Admin's subscriptionStatus to match the Stripe subscription status
6. WHEN a `customer.subscription.deleted` event is received, THE Stripe_Webhook_Handler SHALL update the Admin's subscriptionStatus to "canceled" and clear the stripeSubscriptionId
7. WHEN an `invoice.payment_failed` event is received, THE Stripe_Webhook_Handler SHALL update the Admin's subscriptionStatus to "past_due"
8. THE Stripe_Webhook_Handler SHALL return HTTP 200 for all successfully processed events to acknowledge receipt to Stripe
9. THE Stripe_Webhook_Handler SHALL receive the raw request body (not JSON-parsed) for signature verification

### Requirement 9: Subscription Status Enforcement

**User Story:** As a business owner, I want only paying subscribers to access the full dashboard, so that the service is monetized.

#### Acceptance Criteria

1. THE Subscription_Guard SHALL check the authenticated Admin's subscriptionStatus before allowing access to protected API routes
2. WHILE an Admin's subscriptionStatus is "active" or "trialing", THE Subscription_Guard SHALL allow access to all protected API routes
3. WHILE an Admin's subscriptionStatus is "none", "canceled", or "past_due", THE Subscription_Guard SHALL return HTTP 403 with a message indicating subscription is required
4. THE Subscription_Guard SHALL exempt the following routes from subscription checks: `/api/auth/*`, `/api/billing/*`, and `/api/health`
5. WHEN the Dashboard receives an HTTP 403 subscription-required response, THE Dashboard SHALL redirect the user to the billing page
6. THE Subscription_Guard SHALL read subscription status from the database on each request to reflect real-time webhook updates

### Requirement 10: Customer Portal Access

**User Story:** As a subscriber, I want to manage my subscription and billing details, so that I can update payment methods, view invoices, or cancel.

#### Acceptance Criteria

1. WHEN an authenticated Admin sends a POST request to `/api/billing/create-portal-session`, THE Billing_Service SHALL create a Stripe Billing Portal Session
2. THE Billing_Service SHALL set the portal session return URL to `{FRONTEND_URL}/dashboard/billing`
3. THE Billing_Service SHALL return the portal session URL in the API response so the Dashboard can redirect the user
4. IF the Admin does not have a stripeCustomerId, THEN THE Billing_Service SHALL return HTTP 400 with an error message indicating no billing account exists
5. THE Customer_Portal SHALL allow subscribers to view invoices, update payment methods, and cancel subscriptions

### Requirement 11: Billing Dashboard Page

**User Story:** As a restaurant owner, I want a billing page in the dashboard, so that I can see my subscription status and manage my plan.

#### Acceptance Criteria

1. THE Dashboard SHALL include a billing page at route `/dashboard/billing`
2. THE Dashboard SHALL display the Admin's current subscription status (active, trialing, past_due, canceled, or none)
3. WHILE the Admin's subscriptionStatus is "none" or "canceled", THE Dashboard SHALL display a "Subscribe" button that initiates the Stripe Checkout flow
4. WHILE the Admin's subscriptionStatus is "active" or "trialing", THE Dashboard SHALL display a "Manage Subscription" button that opens the Stripe Customer Portal
5. WHILE the Admin's subscriptionStatus is "past_due", THE Dashboard SHALL display a warning message and a "Update Payment" button that opens the Stripe Customer Portal
6. WHEN the billing page loads with a `session_id` query parameter, THE Dashboard SHALL display a success confirmation message
7. THE Dashboard SHALL include a navigation link to the billing page in the sidebar or settings area

### Requirement 12: Subscription Data Model

**User Story:** As a developer, I want the database schema to support subscription data, so that billing state is persisted reliably.

#### Acceptance Criteria

1. THE Billing_Service SHALL add the following fields to the Admin model: `stripeCustomerId` (optional String), `stripeSubscriptionId` (optional String), `subscriptionStatus` (String, default "none"), and `subscriptionPlan` (optional String)
2. THE Billing_Service SHALL create a Prisma migration to add the subscription fields to the admins table
3. WHEN the migration runs on an existing database, THE Billing_Service SHALL set subscriptionStatus to "none" for all existing Admin records
4. THE Billing_Service SHALL add a unique constraint on the `stripeCustomerId` field to prevent duplicate Stripe customer mappings

### Requirement 13: Webhook Endpoint Raw Body Handling

**User Story:** As a developer, I want the webhook endpoint to receive the raw request body, so that Stripe signature verification works correctly.

#### Acceptance Criteria

1. THE Stripe_Webhook_Handler SHALL receive the request body as a raw Buffer, not as parsed JSON
2. THE Deployment_System SHALL configure Express.js to skip JSON body parsing for the `/api/billing/webhook` route
3. WHEN the raw body is available, THE Stripe_Webhook_Handler SHALL pass the raw body and the `stripe-signature` header to `stripe.webhooks.constructEvent()` for verification
4. IF the raw body is not available or is corrupted, THEN THE Stripe_Webhook_Handler SHALL return HTTP 400 with an error message

### Requirement 14: Environment Configuration Management

**User Story:** As a developer, I want all environment variables documented and validated, so that deployment configuration errors are caught early.

#### Acceptance Criteria

1. THE Deployment_System SHALL validate the presence of required environment variables on startup: DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_PRICE_ID
2. IF any required environment variable is missing in production, THEN THE Deployment_System SHALL log a descriptive error and exit with a non-zero exit code
3. THE Deployment_System SHALL provide a `.env.example` file documenting all required and optional environment variables
4. THE Deployment_System SHALL document the Cloudflare DNS configuration steps in a deployment guide
