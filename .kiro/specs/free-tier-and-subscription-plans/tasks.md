# Implementation Plan: Free Tier and Subscription Plans

## Overview

Implement a two-tier subscription system (Free and Pro) for MenuBuildr. This involves updating the subscription middleware to allow free-tier access, adding per-plan usage limit enforcement on both server and dashboard, building a plan selection modal with Stripe checkout integration, redesigning the billing page, and adding upgrade prompts when limits are reached. The existing Prisma schema already has `subscriptionStatus` and `subscriptionPlan` fields on the Admin model.

## Tasks

- [x] 1. Update subscription tier constants and server-side plan configuration
  - [x] 1.1 Extend `server/src/config/limits.ts` with per-plan usage limits
    - Define `PLAN_LIMITS` object mapping plan tiers (free, pro) to their resource limits: restaurants, menus per restaurant, menu items per menu, languages, templates
    - Free: 1 restaurant, 2 menus, 20 items, 1 language, classic template only
    - Pro: unlimited restaurants, unlimited menus, unlimited items, unlimited languages, all templates
    - Export a `getPlanLimits(plan: string)` helper that returns limits for a given plan, defaulting to free tier for "none" or "free"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 1.2 Add Stripe price ID environment variables to `server/src/config/env.ts`
    - Add `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL` to `OPTIONAL_WARN_VARS`
    - Keep existing `STRIPE_PRICE_ID` as fallback for Pro monthly
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 1.3 Write unit tests for `getPlanLimits` helper
    - Test that "free", "none", undefined all return free-tier limits
    - Test that "pro" returns pro limits (unlimited)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 2. Update subscription middleware and registration to support free tier
  - [x] 2.1 Update `server/src/middleware/subscription.ts` to allow free-tier access
    - Modify `requireSubscription` to allow `subscriptionStatus` of "free", "none", "active", and "trialing" to proceed
    - Only block access for "past_due" and "canceled" statuses (or add a warning header for "past_due" instead of blocking)
    - _Requirements: 1.2, 1.4, 8.1, 8.2_

  - [x] 2.2 Update registration in `server/src/routes/auth.ts` to set free tier on signup
    - In the `POST /register` handler, set `subscriptionStatus: 'free'` when creating the Admin record
    - _Requirements: 1.1_

  - [x] 2.3 Update Google OAuth registration in `server/src/routes/google-auth.ts` to set free tier
    - When creating a new Admin via Google OAuth, set `subscriptionStatus: 'free'`
    - _Requirements: 1.1_

  - [x] 2.4 Write unit tests for updated subscription middleware
    - Test that "free" status passes through middleware
    - Test that "none" status passes through middleware
    - Test that "active" and "trialing" pass through
    - _Requirements: 1.2, 1.4, 8.1_

- [x] 3. Implement server-side usage limit enforcement middleware
  - [x] 3.1 Create `server/src/middleware/usage-limits.ts` middleware
    - Create a reusable middleware factory that checks resource counts against plan limits before creation
    - Accept resource type (restaurant, menu, item) and context params (restaurantId, menuId)
    - Look up the admin's `subscriptionPlan` and `subscriptionStatus` to determine applicable limits via `getPlanLimits`
    - Return 403 with `{ error: string, code: 'PLAN_LIMIT_REACHED', limit: number, current: number, resource: string, plan: string }` when limit exceeded
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Add usage limit checks to `server/src/routes/restaurants.ts` create endpoint
    - Replace the hardcoded `RESTAURANT_LIMIT` check with the plan-aware limit check
    - Use 403 status code instead of current 400
    - Include plan limit info in the error response body
    - _Requirements: 3.1, 3.4_

  - [x] 3.3 Add usage limit checks to `server/src/routes/menus.ts` create and duplicate endpoints
    - Replace the hardcoded menu limit (4) with plan-aware limit from `getPlanLimits`
    - Use 403 status code and include limit info in error response
    - _Requirements: 3.2_

  - [x] 3.4 Add usage limit checks to `server/src/routes/items.ts` create and duplicate endpoints
    - Add menu item count check before creation using plan-aware limits
    - Count items across all sections in the menu (not just the target section)
    - Use 403 status code and include limit info in error response
    - _Requirements: 3.3_

  - [x] 3.5 Write unit tests for usage limit enforcement
    - Test free-tier admin blocked at 1 restaurant
    - Test pro-tier admin allowed unlimited restaurants
    - Test 403 response body includes limit, current, resource, and plan fields
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all server-side changes compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Update Stripe billing service to support plan selection and billing cycles
  - [x] 5.1 Update `server/src/services/billing.ts` to accept plan and billing cycle
    - Modify `createCheckoutSession` to accept `billingCycle` (monthly/annual) parameter
    - Map billing cycle to the correct Stripe price ID from environment variables
    - Fall back to `STRIPE_PRICE_ID` for pro monthly if `STRIPE_PRICE_PRO_MONTHLY` is not set
    - Throw descriptive error if required price ID env var is missing
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.2 Update `server/src/routes/billing.ts` checkout endpoint to accept plan params
    - Accept `billingCycle` from request body in `POST /create-checkout-session`
    - Validate that billingCycle is "monthly" or "annual"
    - Pass validated params to the updated `createCheckoutSession` service
    - Return 500 with descriptive error if Stripe price ID is not configured
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 5.3 Update webhook handler to store `subscriptionPlan` on checkout completion
    - In `checkout.session.completed` handler, extract the plan identifier from session metadata
    - Update the Admin's `subscriptionPlan` field alongside `subscriptionStatus`
    - Pass plan metadata when creating the Stripe checkout session
    - _Requirements: 5.4, 5.5_

  - [x] 5.4 Add a `GET /api/billing/usage` endpoint to return current usage stats
    - Return counts of restaurants, menus, and menu items for the authenticated admin
    - Return the applicable plan limits from `getPlanLimits`
    - _Requirements: 7.2_

  - [x] 5.5 Write unit tests for billing service plan selection
    - Test correct price ID resolution for monthly and annual billing cycles
    - Test fallback to STRIPE_PRICE_ID for pro monthly
    - Test error when price ID env var is missing
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Checkpoint - Ensure all server-side billing changes compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Update dashboard auth store and API client to include subscription info
  - [x] 7.1 Update `dashboard/lib/store/auth-store.ts` Admin interface
    - Add `subscriptionStatus`, `subscriptionPlan`, `hasStripeCustomer`, and `hasSubscription` fields to the `Admin` interface
    - _Requirements: 1.2, 1.4, 8.1_

  - [x] 7.2 Create `dashboard/lib/hooks/useSubscription.ts` hook
    - Create a hook that derives the current plan tier from the auth store
    - Expose `plan`, `limits`, `isFreeTier`, `isProPlan` computed values
    - Map "none" and "free" subscription statuses to free tier
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8. Build the Plan Selection Modal component
  - [x] 8.1 Create `dashboard/components/billing/plan-selection-modal.tsx`
    - Build a dialog component displaying two plan columns: Free and Pro
    - Include feature comparison rows for each plan (restaurants, menus, items, languages, templates, support)
    - Add a billing cycle toggle (monthly/annual) that updates displayed prices
    - Show annual discount badge ("Save 17%") when annual is selected
    - Display Pro monthly at $29/mo, annual at $24/mo ($288/yr)
    - Highlight the recommended plan (Pro) with gold (#E8A838) accent border
    - Show "Current Plan" badge on the admin's active plan
    - Use MenuBuildr design system: dark green (#1A3C2E), gold (#E8A838), cream (#F9F6F0), brown (#8B7355)
    - On Pro plan selection, call `POST /api/billing/create-checkout-session` with billing cycle, then redirect to Stripe
    - On Free tier selection, close the modal
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.1, 9.2, 9.3_

  - [x] 8.2 Write unit tests for Plan Selection Modal
    - Test that billing cycle toggle switches prices
    - Test that annual discount badges appear when annual is selected
    - Test that current plan badge is shown correctly
    - Test that Free tier selection closes modal without API call
    - _Requirements: 4.2, 4.3, 4.4, 4.7, 4.8_

- [x] 9. Build the Upgrade Prompt component
  - [x] 9.1 Create `dashboard/components/billing/upgrade-prompt.tsx`
    - Build a dialog component that displays the specific limit reached (e.g., "Free plan allows 1 restaurant")
    - Include a button to open the Plan Selection Modal
    - Use MenuBuildr design system colors consistent with the dashboard
    - Accept props for resource type, current count, and limit
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 9.2 Create `dashboard/lib/hooks/useUpgradePrompt.ts` hook
    - Create a hook that manages upgrade prompt state (open/close, resource info)
    - Provide a `checkLimit` function that intercepts 403 responses with `PLAN_LIMIT_REACHED` code
    - Auto-open the upgrade prompt dialog when a limit error is received
    - _Requirements: 6.1, 6.4_

- [x] 10. Integrate upgrade prompts into resource creation flows
  - [x] 10.1 Update restaurant creation in `dashboard/app/dashboard/restaurants/page.tsx`
    - Wrap the create restaurant action to catch 403 limit errors and show the upgrade prompt
    - _Requirements: 6.1, 6.2_

  - [x] 10.2 Update menu creation in `dashboard/app/dashboard/menus/page.tsx`
    - Wrap the create menu action to catch 403 limit errors and show the upgrade prompt
    - _Requirements: 6.1, 6.2_

  - [x] 10.3 Update menu item creation in relevant dashboard components
    - Wrap the create item action to catch 403 limit errors and show the upgrade prompt
    - _Requirements: 6.1, 6.2_

- [x] 11. Checkpoint - Ensure dashboard components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Redesign the Billing Page
  - [x] 12.1 Rewrite `dashboard/app/dashboard/billing/page.tsx`
    - Display current plan name, subscription status, and billing cycle at the top
    - Add a usage statistics section showing restaurants, menus, and items counts with progress bars against plan limits (fetch from `GET /api/billing/usage`)
    - For free-tier admins: show a plan comparison section with upgrade CTA that opens the Plan Selection Modal
    - For paid subscribers: show a "Manage Subscription" button that opens Stripe billing portal
    - Use MenuBuildr design system colors and maintain visual consistency
    - Replace the current Subscribe button to open the Plan Selection Modal instead of direct Stripe redirect
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 4.1_

- [x] 13. Update Dashboard layout for navigation access control
  - [x] 13.1 Update `dashboard/components/layout/dashboard-layout.tsx` for free-tier access
    - Remove or update any logic that blocks navigation for "none" or "free" subscription statuses
    - Ensure all sidebar items are rendered and navigable for all subscription statuses
    - _Requirements: 8.1, 8.2_

  - [x] 13.2 Add past-due payment banner to dashboard layout
    - When `subscriptionStatus` is "past_due", display a non-blocking warning banner at the top of the page
    - Include a link to the Billing page
    - Style with a subtle warning color that fits the MenuBuildr design system
    - _Requirements: 8.3_

- [x] 14. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The existing Prisma schema already has `subscriptionStatus`, `subscriptionPlan`, `stripeCustomerId`, and `stripeSubscriptionId` fields on the Admin model — no migration needed
- The server uses TypeScript (Express + Prisma), the dashboard uses TypeScript (Next.js + React + Zustand)
- Checkpoints ensure incremental validation of server-side and client-side changes
