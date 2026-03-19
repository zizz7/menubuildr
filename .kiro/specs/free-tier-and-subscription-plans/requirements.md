# Requirements Document

## Introduction

MenuBuildr currently blocks new users on the billing page with a "Subscription required" message and no way to proceed. The Subscribe button fails to open a Stripe checkout or plan selection modal. This feature introduces a free tier so new users can access basic dashboard functionality immediately, defines a paid Pro subscription plan with monthly and annual billing options, adds a plan selection modal with Stripe checkout integration, and enforces usage limits with upgrade prompts — all while maintaining the existing MenuBuildr design system (dark green, gold, cream palette).

## Glossary

- **Dashboard**: The authenticated web application at app.menubuildr.com where admins manage restaurants and menus
- **Admin**: An authenticated user of the Dashboard who manages restaurants, menus, and account settings
- **Free_Tier**: The default subscription tier assigned to new Admins, providing limited access to Dashboard features at no cost
- **Pro_Plan**: A paid subscription tier providing unlimited usage and full feature access
- **Plan_Selection_Modal**: A dialog overlay within the Dashboard that displays available subscription plans, feature comparisons, and billing cycle options
- **Billing_Cycle_Toggle**: A UI control within the Plan_Selection_Modal that switches the displayed pricing between monthly and annual options
- **Stripe_Checkout_Session**: A Stripe-hosted payment page created by the server to process subscription payments
- **Upgrade_Prompt**: A UI element displayed when a Free_Tier Admin attempts an action that exceeds Free_Tier limits
- **Subscription_Status**: A field on the Admin record tracking the current state of the subscription (none, free, active, past_due, canceled, trialing)
- **Usage_Limit**: A numeric constraint on resources (restaurants, menus, menu items) enforced per subscription tier
- **Billing_Page**: The Dashboard page at /dashboard/billing that displays subscription status and management options

## Requirements

### Requirement 1: Free Tier Activation for New Users

**User Story:** As a new Admin, I want to be automatically placed on the Free_Tier when I sign up, so that I can explore the Dashboard and basic features without being blocked on the Billing_Page.

#### Acceptance Criteria

1. WHEN a new Admin registers, THE Dashboard SHALL set the Admin Subscription_Status to "free" instead of "none"
2. WHILE an Admin has a Subscription_Status of "free", THE Dashboard SHALL allow navigation to all sidebar pages (Dashboard, Restaurants, Menus, Search, Theme, Languages, Allergens, Import/Export, Version History, Billing, Settings)
3. WHILE an Admin has a Subscription_Status of "free", THE Dashboard SHALL enforce Free_Tier Usage_Limits on resource creation
4. WHEN an existing Admin has a Subscription_Status of "none", THE Dashboard SHALL treat the Admin as a Free_Tier user and allow full navigation

### Requirement 2: Free Tier Usage Limits

**User Story:** As a product owner, I want Free_Tier Admins to have defined resource limits, so that there is a clear incentive to upgrade to a paid plan.

#### Acceptance Criteria

1. WHILE an Admin is on the Free_Tier, THE Dashboard SHALL allow creation of a maximum of 1 restaurant
2. WHILE an Admin is on the Free_Tier, THE Dashboard SHALL allow creation of a maximum of 2 menus per restaurant
3. WHILE an Admin is on the Free_Tier, THE Dashboard SHALL allow creation of a maximum of 20 menu items per menu
4. WHILE an Admin is on the Free_Tier, THE Dashboard SHALL restrict language support to a single language per restaurant
5. WHILE an Admin is on the Free_Tier, THE Dashboard SHALL restrict menu template selection to the Classic template only
6. WHILE an Admin is on the Pro_Plan, THE Dashboard SHALL allow creation of unlimited restaurants, unlimited menus, unlimited menu items, full multi-language support, and all menu templates

### Requirement 3: Server-Side Usage Limit Enforcement

**User Story:** As a product owner, I want usage limits enforced on the server, so that limits cannot be bypassed through direct API calls.

#### Acceptance Criteria

1. WHEN a Free_Tier Admin sends a request to create a restaurant and the Admin already has 1 restaurant, THE Server SHALL reject the request with a 403 status code and a message indicating the Free_Tier restaurant limit has been reached
2. WHEN a Free_Tier Admin sends a request to create a menu and the restaurant already has 2 menus, THE Server SHALL reject the request with a 403 status code and a message indicating the Free_Tier menu limit has been reached
3. WHEN a Free_Tier Admin sends a request to create a menu item and the menu already has 20 items, THE Server SHALL reject the request with a 403 status code and a message indicating the Free_Tier item limit has been reached
4. THE Server SHALL return the applicable Usage_Limit values in the 403 response body so the Dashboard can display accurate limit information in the Upgrade_Prompt

### Requirement 4: Plan Selection Modal

**User Story:** As an Admin, I want to see a plan comparison modal when I click Subscribe, so that I can choose the right plan and billing cycle before proceeding to payment.

#### Acceptance Criteria

1. WHEN an Admin clicks the Subscribe button on the Billing_Page, THE Dashboard SHALL open the Plan_Selection_Modal instead of directly redirecting to Stripe
2. THE Plan_Selection_Modal SHALL display two plan columns: Free_Tier and Pro_Plan with feature comparisons
3. THE Plan_Selection_Modal SHALL include a Billing_Cycle_Toggle that switches displayed prices between monthly and annual options
4. WHEN the Billing_Cycle_Toggle is set to annual, THE Plan_Selection_Modal SHALL display the annual price with a visible discount percentage compared to monthly billing
5. THE Plan_Selection_Modal SHALL use the MenuBuildr design system colors: dark green (#1A3C2E) for primary elements, gold (#E8A838) for accents and the recommended plan highlight, cream (#F9F6F0) for backgrounds, and brown (#8B7355) for secondary text
6. WHEN an Admin selects a paid plan and clicks the confirmation button in the Plan_Selection_Modal, THE Dashboard SHALL send the selected plan identifier and billing cycle to the server to create a Stripe_Checkout_Session
7. WHEN an Admin selects the Free_Tier in the Plan_Selection_Modal, THE Dashboard SHALL close the modal without redirecting to Stripe
8. THE Plan_Selection_Modal SHALL indicate the Admin current plan with a "Current Plan" badge

### Requirement 5: Stripe Checkout Session with Plan and Billing Cycle

**User Story:** As an Admin, I want to pay for my selected plan and billing cycle through Stripe, so that my subscription is activated correctly.

#### Acceptance Criteria

1. WHEN the server receives a checkout session request, THE Server SHALL accept a plan identifier (pro) and a billing cycle (monthly or annual) as parameters
2. WHEN the server creates a Stripe_Checkout_Session, THE Server SHALL use the Stripe price ID corresponding to the selected plan and billing cycle from environment variables
3. IF the required Stripe price ID environment variable is not configured for the requested plan and billing cycle, THEN THE Server SHALL return a 500 status code with a descriptive error message
4. WHEN a Stripe_Checkout_Session completes successfully, THE Server SHALL update the Admin subscriptionPlan field to "pro"
5. WHEN a Stripe_Checkout_Session completes successfully, THE Server SHALL update the Admin Subscription_Status to "active"

### Requirement 6: Upgrade Prompts at Usage Limits

**User Story:** As a Free_Tier Admin, I want to see a clear upgrade prompt when I reach a usage limit, so that I understand why I cannot proceed and how to unlock more capacity.

#### Acceptance Criteria

1. WHEN a Free_Tier Admin attempts to create a resource that exceeds a Usage_Limit, THE Dashboard SHALL display an Upgrade_Prompt dialog instead of showing a generic error
2. THE Upgrade_Prompt SHALL state the specific limit reached (e.g., "Free plan allows 1 restaurant") and include a button to open the Plan_Selection_Modal
3. THE Upgrade_Prompt SHALL use the MenuBuildr design system colors consistent with the rest of the Dashboard
4. WHEN the Admin clicks the upgrade button in the Upgrade_Prompt, THE Dashboard SHALL open the Plan_Selection_Modal

### Requirement 7: Billing Page Redesign

**User Story:** As an Admin, I want the Billing_Page to show my current plan details, usage statistics, and upgrade options, so that I can manage my subscription effectively.

#### Acceptance Criteria

1. THE Billing_Page SHALL display the Admin current plan name, Subscription_Status, and billing cycle
2. THE Billing_Page SHALL display current usage statistics (number of restaurants, menus, and menu items) alongside the applicable Usage_Limits for the Admin current plan
3. WHEN a Free_Tier Admin views the Billing_Page, THE Dashboard SHALL display a plan comparison section with an option to upgrade
4. WHEN an Admin with an active paid subscription views the Billing_Page, THE Dashboard SHALL display a "Manage Subscription" button that opens the Stripe billing portal
5. THE Billing_Page SHALL use the MenuBuildr design system colors and maintain visual consistency with other Dashboard pages

### Requirement 8: Dashboard Navigation Access Control

**User Story:** As a product owner, I want all Admins (including Free_Tier) to navigate the full Dashboard, so that users are not blocked from exploring the product.

#### Acceptance Criteria

1. WHILE an Admin has a Subscription_Status of "free" or "none", THE Dashboard layout SHALL render all sidebar navigation items and allow navigation to all pages
2. WHILE an Admin has a Subscription_Status of "free" or "none", THE Dashboard layout SHALL NOT redirect the Admin to the Billing_Page or block access to non-billing pages
3. WHEN an Admin has a Subscription_Status of "past_due", THE Dashboard SHALL display a non-blocking banner at the top of the page warning about the payment issue, with a link to the Billing_Page

### Requirement 9: Annual Billing Discount

**User Story:** As an Admin, I want to see a discount for annual billing, so that I can save money by committing to a longer billing cycle.

#### Acceptance Criteria

1. THE Plan_Selection_Modal SHALL display the Pro_Plan monthly price as $29/month and the annual price as $24/month (billed $288/year), representing a savings of approximately 17%
2. WHEN the Billing_Cycle_Toggle is set to annual, THE Plan_Selection_Modal SHALL display a "Save 17%" badge next to the Pro_Plan price

### Requirement 10: Stripe Price ID Configuration

**User Story:** As a developer, I want Stripe price IDs mapped to plan and billing cycle combinations via environment variables, so that pricing can be updated without code changes.

#### Acceptance Criteria

1. THE Server SHALL read Stripe price IDs from the following environment variables: STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_ANNUAL
2. WHEN the server starts, THE Server SHALL log a warning if any of the Stripe price ID environment variables are missing
3. THE Server SHALL continue to support the existing STRIPE_PRICE_ID environment variable as a fallback for the Pro monthly plan for backward compatibility
