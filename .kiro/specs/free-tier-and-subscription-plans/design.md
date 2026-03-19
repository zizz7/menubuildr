# Design Document: Free Tier and Subscription Plans

## Overview

This design describes the implementation of a two-tier subscription system (Free and Pro) for MenuBuildr. The system allows new users to immediately access the dashboard with limited features, provides a plan selection modal with Stripe checkout integration for upgrading, enforces usage limits server-side, and redesigns the billing page to show plan details and usage statistics.

## Architecture

### Current State

- `Admin` model has `subscriptionStatus` (default "none"), `subscriptionPlan`, `stripeCustomerId`, `stripeSubscriptionId` fields
- `requireSubscription` middleware blocks all non-active/trialing users (returns 403)
- Billing routes create Stripe checkout with a single hardcoded `STRIPE_PRICE_ID`
- `server/src/config/limits.ts` has flat `RESTAURANT_LIMIT = 5` and `MENU_LIMIT = 4` constants
- Dashboard layout renders all nav items for all users (no subscription gating on navigation)
- Billing page shows a simple Subscribe button that directly redirects to Stripe

### Target State

- New users get `subscriptionStatus: "free"` on registration
- Subscription middleware allows "free", "none", "active", "trialing" statuses through
- Plan-aware usage limits enforced server-side per resource type
- Plan selection modal with monthly/annual toggle and Stripe checkout
- Billing page shows current plan, usage stats, and upgrade options

## Data Model

No schema changes required. The existing `Admin` model fields are sufficient:

```
Admin {
  subscriptionStatus: String  // "none" | "free" | "active" | "past_due" | "canceled" | "trialing"
  subscriptionPlan: String?   // null | "pro"
  stripeCustomerId: String?
  stripeSubscriptionId: String?
}
```

Status mapping:
- `"none"` / `"free"` → Free tier (full navigation, limited resource creation)
- `"active"` / `"trialing"` with `subscriptionPlan: "pro"` → Pro tier (unlimited)
- `"past_due"` → Warning banner, still accessible
- `"canceled"` → Treated as free tier

## Plan Configuration

### Tier Limits

| Resource | Free | Pro |
|---|---|---|
| Restaurants | 1 | Unlimited |
| Menus per restaurant | 2 | Unlimited |
| Items per menu | 20 | Unlimited |
| Languages | 1 | Unlimited |
| Templates | Classic only | All |

### Pricing

| Plan | Monthly | Annual |
|---|---|---|
| Free | $0 | $0 |
| Pro | $29/mo | $24/mo ($288/yr, ~17% savings) |

## Server-Side Design

### 1. Plan Limits Configuration (`server/src/config/limits.ts`)

Replace flat constants with a `PLAN_LIMITS` map:

```typescript
export const PLAN_LIMITS = {
  free: { restaurants: 1, menusPerRestaurant: 2, itemsPerMenu: 20, languages: 1, templates: ['classic'] },
  pro: { restaurants: Infinity, menusPerRestaurant: Infinity, itemsPerMenu: Infinity, languages: Infinity, templates: ['all'] },
} as const;

export function getPlanLimits(plan: string | null | undefined) {
  if (plan === 'pro') return PLAN_LIMITS.pro;
  return PLAN_LIMITS.free; // "none", "free", null, undefined all default to free
}
```

### 2. Subscription Middleware (`server/src/middleware/subscription.ts`)

Update `requireSubscription` to allow free-tier access:

```typescript
// Allow: "free", "none", "active", "trialing"
// Block: "past_due" (with warning header), "canceled" (redirect to billing)
const allowedStatuses = ['free', 'none', 'active', 'trialing'];
```

### 3. Usage Limit Middleware (`server/src/middleware/usage-limits.ts`)

New middleware factory that checks resource counts against plan limits before creation:

```typescript
export function checkUsageLimit(resourceType: 'restaurant' | 'menu' | 'item') {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.userId } });
    const limits = getPlanLimits(admin.subscriptionPlan);
    const currentCount = await countResource(resourceType, req);
    const limit = getLimit(limits, resourceType);
    
    if (currentCount >= limit) {
      return res.status(403).json({
        error: `Free plan limit reached`,
        code: 'PLAN_LIMIT_REACHED',
        limit, current: currentCount, resource: resourceType, plan: admin.subscriptionPlan || 'free'
      });
    }
    next();
  };
}
```

Applied to: `POST /restaurants`, `POST /menus`, `POST /items`, and their duplicate endpoints.

### 4. Registration Updates

Both `POST /auth/register` and Google OAuth registration set `subscriptionStatus: 'free'` on new Admin creation.

### 5. Billing Service Updates (`server/src/services/billing.ts`)

- `createCheckoutSession` accepts `billingCycle` parameter
- Maps to env vars: `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_ANNUAL`
- Falls back to `STRIPE_PRICE_ID` for pro monthly
- Stores `subscriptionPlan: "pro"` in Stripe session metadata
- Webhook handler reads metadata to set `subscriptionPlan` on checkout completion

### 6. Usage Stats Endpoint (`GET /api/billing/usage`)

New endpoint returning current resource counts and applicable limits:

```typescript
{
  plan: "free",
  usage: { restaurants: 1, menus: 2, items: 15 },
  limits: { restaurants: 1, menusPerRestaurant: 2, itemsPerMenu: 20 }
}
```

### 7. Environment Variables

New optional vars added to `OPTIONAL_WARN_VARS`:
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_ANNUAL`

## Dashboard Design

### 1. Auth Store Updates (`dashboard/lib/store/auth-store.ts`)

Add `subscriptionStatus`, `subscriptionPlan`, `hasStripeCustomer`, `hasSubscription` to the `Admin` interface (already returned by `GET /auth/me`).

### 2. Subscription Hook (`dashboard/lib/hooks/useSubscription.ts`)

Derives plan info from auth store:
- `plan`: "free" | "pro"
- `limits`: applicable limits object
- `isFreeTier`: boolean
- `isProPlan`: boolean

### 3. Plan Selection Modal (`dashboard/components/billing/plan-selection-modal.tsx`)

Dialog component with:
- Two plan columns (Free, Pro) with feature comparison rows
- Monthly/annual billing cycle toggle
- Annual discount badge ("Save 17%")
- "Current Plan" badge on active plan
- Pro selection → `POST /api/billing/create-checkout-session` with billingCycle → redirect to Stripe
- Free selection → close modal
- MenuBuildr design system: dark green (#1A3C2E), gold (#E8A838), cream (#F9F6F0), brown (#8B7355)

### 4. Upgrade Prompt (`dashboard/components/billing/upgrade-prompt.tsx`)

Dialog shown when a 403 `PLAN_LIMIT_REACHED` response is received:
- States the specific limit reached (e.g., "Free plan allows 1 restaurant")
- Button to open Plan Selection Modal
- Consistent with MenuBuildr design system

### 5. Upgrade Prompt Hook (`dashboard/lib/hooks/useUpgradePrompt.ts`)

Manages upgrade prompt state. Provides `checkLimit` function that intercepts 403 responses with `PLAN_LIMIT_REACHED` code and auto-opens the upgrade prompt.

### 6. Resource Creation Integration

Wrap create actions in restaurants, menus, and items pages to catch 403 limit errors and show upgrade prompt instead of generic error.

### 7. Billing Page Redesign (`dashboard/app/dashboard/billing/page.tsx`)

Sections:
1. Current plan name, status, billing cycle
2. Usage statistics with progress bars (restaurants, menus, items vs limits)
3. Free tier: plan comparison + upgrade CTA opening Plan Selection Modal
4. Paid: "Manage Subscription" button → Stripe billing portal
5. Past-due: warning banner with link to update payment

### 8. Dashboard Layout Updates (`dashboard/components/layout/dashboard-layout.tsx`)

- No navigation blocking for "free" or "none" statuses (already the case)
- Add past-due payment banner when `subscriptionStatus === "past_due"`

## Sequence Diagrams

### New User Registration Flow

```
User → Register → Server creates Admin(subscriptionStatus: "free")
     → Dashboard loads → All nav items accessible
     → Creates restaurant → Server checks limit (1 allowed) → Success
     → Creates 2nd restaurant → Server returns 403 PLAN_LIMIT_REACHED
     → Dashboard shows Upgrade Prompt → User clicks Upgrade
     → Plan Selection Modal opens → User selects Pro Annual
     → POST /billing/create-checkout-session { billingCycle: "annual" }
     → Redirect to Stripe → Payment → Webhook updates Admin(status: "active", plan: "pro")
     → User returns to billing page → Full access
```

### Existing User (status: "none") Flow

```
Existing user logs in → Server returns subscriptionStatus: "none"
→ Dashboard treats as free tier → Full navigation, limited creation
→ Same upgrade flow as above when limits hit
```

## Correctness Properties

1. **P1: Free tier default** — Every newly registered Admin (email or Google OAuth) has `subscriptionStatus: "free"`
2. **P2: Limit enforcement** — A free-tier Admin cannot create more resources than the defined limits (1 restaurant, 2 menus/restaurant, 20 items/menu)
3. **P3: Pro unlimited** — A Pro Admin is never blocked by usage limits
4. **P4: Navigation access** — Admins with status "free", "none", "active", or "trialing" can access all dashboard pages
5. **P5: Stripe price mapping** — The correct Stripe price ID is used for each billing cycle (monthly/annual), with fallback to `STRIPE_PRICE_ID` for pro monthly
6. **P6: Webhook plan update** — On `checkout.session.completed`, the Admin's `subscriptionPlan` is set to "pro" and `subscriptionStatus` to "active"
7. **P7: 403 response format** — All limit-exceeded responses include `code: "PLAN_LIMIT_REACHED"`, `limit`, `current`, `resource`, and `plan` fields

## File Changes Summary

### New Files
- `server/src/middleware/usage-limits.ts` — Usage limit enforcement middleware
- `dashboard/components/billing/plan-selection-modal.tsx` — Plan selection dialog
- `dashboard/components/billing/upgrade-prompt.tsx` — Upgrade prompt dialog
- `dashboard/lib/hooks/useSubscription.ts` — Subscription state hook
- `dashboard/lib/hooks/useUpgradePrompt.ts` — Upgrade prompt state hook

### Modified Files
- `server/src/config/limits.ts` — Replace flat constants with plan-aware limits
- `server/src/config/env.ts` — Add new Stripe price env vars
- `server/src/middleware/subscription.ts` — Allow free-tier access
- `server/src/routes/auth.ts` — Set free status on registration
- `server/src/routes/google-auth.ts` — Set free status on Google registration
- `server/src/routes/restaurants.ts` — Use plan-aware limit check
- `server/src/routes/menus.ts` — Use plan-aware limit check
- `server/src/routes/items.ts` — Add plan-aware limit check
- `server/src/routes/billing.ts` — Accept billingCycle, add usage endpoint
- `server/src/services/billing.ts` — Plan-aware checkout session, metadata handling
- `dashboard/lib/store/auth-store.ts` — Add subscription fields to Admin interface
- `dashboard/app/dashboard/billing/page.tsx` — Full redesign
- `dashboard/app/dashboard/restaurants/page.tsx` — Upgrade prompt integration
- `dashboard/app/dashboard/menus/page.tsx` — Upgrade prompt integration
- `dashboard/components/layout/dashboard-layout.tsx` — Past-due banner
