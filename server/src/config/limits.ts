/**
 * Shared limit constants — single source of truth for all count enforcement.
 * Import these instead of hardcoding magic numbers in route handlers.
 */

// --- Legacy flat constants (kept for backward compatibility) ---
export const RESTAURANT_LIMIT = 5;
export const MENU_LIMIT = 4;

// --- Per-plan usage limits ---

export interface PlanLimits {
  restaurants: number;
  menusPerRestaurant: number;
  itemsPerMenu: number;
  languages: number;
  templates: readonly string[];
}

export const PLAN_LIMITS: Record<'free' | 'pro', PlanLimits> = {
  free: {
    restaurants: 1,
    menusPerRestaurant: 2,
    itemsPerMenu: 20,
    languages: 1,
    templates: ['classic'],
  },
  pro: {
    restaurants: Infinity,
    menusPerRestaurant: Infinity,
    itemsPerMenu: Infinity,
    languages: Infinity,
    templates: ['all'],
  },
} as const;

/**
 * Returns the usage limits for a given plan.
 * Defaults to free-tier limits for "none", "free", null, or undefined.
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === 'pro') return PLAN_LIMITS.pro;
  return PLAN_LIMITS.free;
}
