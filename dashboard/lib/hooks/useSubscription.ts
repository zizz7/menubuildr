import { useAuthStore } from '../store/auth-store';

export interface PlanLimits {
  restaurants: number;
  menusPerRestaurant: number;
  itemsPerMenu: number;
  languages: number;
  templates: readonly string[];
}

const PLAN_LIMITS: Record<'free' | 'pro', PlanLimits> = {
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
};

export function useSubscription() {
  const admin = useAuthStore((state) => state.admin);

  const subscriptionPlan = admin?.subscriptionPlan;
  const subscriptionStatus = admin?.subscriptionStatus;

  // "none", "free", null, undefined, "canceled" → free tier
  // "active" or "trialing" with subscriptionPlan "pro" → pro tier
  const plan: 'free' | 'pro' =
    subscriptionPlan === 'pro' &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing')
      ? 'pro'
      : 'free';

  const limits = PLAN_LIMITS[plan];
  const isFreeTier = plan === 'free';
  const isProPlan = plan === 'pro';

  return { plan, limits, isFreeTier, isProPlan };
}
