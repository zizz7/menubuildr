'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { PlanSelectionModal } from '@/components/billing/plan-selection-modal';
import {
  CreditCard,
  Crown,
  TrendingUp,
  Store,
  BookOpen,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const COLORS = {
  darkGreen: '#1A3C2E',
  gold: '#E8A838',
  cream: '#F9F6F0',
  brown: '#8B7355',
} as const;

interface UsageData {
  plan: string;
  usage: { restaurants: number; menus: number; items: number };
  limits: { restaurants: number; menusPerRestaurant: number; itemsPerMenu: number };
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageContent />
    </Suspense>
  );
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const { plan, isFreeTier, isProPlan } = useSubscription();

  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(!!sessionId);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await apiClient.get('/billing/usage');
      setUsageData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load usage data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Auto-dismiss success banner after 8 seconds
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleManageSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await apiClient.post('/billing/create-portal-session');
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to open billing portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
        <div className="flex items-start gap-5">
          <Skeleton variant="rounded" className="w-14 h-14" />
          <div className="space-y-2">
            <Skeleton variant="text" className="h-9 w-48" />
            <Skeleton variant="text" className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton variant="rounded" className="h-40" />
          <Skeleton variant="rounded" className="h-40" />
          <Skeleton variant="rounded" className="h-40" />
        </div>
        <Skeleton variant="rounded" className="h-64" />
      </div>
    );
  }

  if (error && !usageData) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const usage = usageData?.usage ?? { restaurants: 0, menus: 0, items: 0 };
  const limits = usageData?.limits ?? { restaurants: 1, menusPerRestaurant: 2, itemsPerMenu: 20 };

  const subscriptionStatus = usageData?.plan ?? plan;
  const isPastDue = subscriptionStatus === 'past_due';

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="flex items-start gap-5">
          <div
            className="w-14 h-14 rounded-md flex items-center justify-center border shadow-sm"
            style={{ backgroundColor: `${COLORS.darkGreen}10`, borderColor: `${COLORS.darkGreen}20`, color: COLORS.darkGreen }}
          >
            <CreditCard className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">
              Billing
            </h1>
            <p className="text-sm font-medium text-muted-foreground opacity-80">
              Manage your plan, usage, and subscription.
            </p>
          </div>
        </div>
      </div>

      {/* Success Banner */}
      {showSuccess && (
        <div
          className="mb-6 rounded-xl border-2 p-4 flex items-center gap-3"
          style={{ borderColor: COLORS.darkGreen, backgroundColor: `${COLORS.darkGreen}08` }}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: COLORS.darkGreen }} />
          <p className="font-medium text-sm" style={{ color: COLORS.darkGreen }}>
            Subscription activated successfully! Welcome to the Pro plan.
          </p>
        </div>
      )}

      {/* Past Due Warning */}
      {isPastDue && (
        <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-medium text-sm text-red-700">
              Your payment is past due. Please update your payment method to avoid service interruption.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleManageSubscription}
            disabled={actionLoading}
          >
            {actionLoading ? 'Redirecting...' : 'Update Payment'}
          </Button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Current Plan Card */}
      <Card className="mb-8 overflow-hidden">
        <CardHeader className="border-b border-input/20 pb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center border"
              style={{
                backgroundColor: isProPlan ? `${COLORS.gold}15` : `${COLORS.brown}10`,
                borderColor: isProPlan ? `${COLORS.gold}30` : `${COLORS.brown}20`,
                color: isProPlan ? COLORS.gold : COLORS.brown,
              }}
            >
              {isProPlan ? <Crown className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl font-bold" style={{ color: COLORS.darkGreen }}>
                    {isProPlan ? 'Pro' : 'Free'}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                    style={{
                      backgroundColor: isProPlan ? `${COLORS.gold}20` : `${COLORS.brown}15`,
                      color: isProPlan ? COLORS.darkGreen : COLORS.brown,
                    }}
                  >
                    {isProPlan ? 'Active' : 'Free Tier'}
                  </span>
                </div>
                <p className="text-sm mt-1" style={{ color: COLORS.brown }}>
                  {isProPlan
                    ? 'Unlimited restaurants, menus, and items'
                    : '1 restaurant, 2 menus, 20 items per menu'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isFreeTier && (
                <Button
                  className="font-semibold"
                  onClick={() => setPlanModalOpen(true)}
                  style={{ backgroundColor: COLORS.gold, color: COLORS.darkGreen }}
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Upgrade to Pro
                </Button>
              )}
              {isProPlan && (
                <Button
                  variant="outline"
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                  style={{ borderColor: COLORS.brown, color: COLORS.darkGreen }}
                >
                  {actionLoading ? 'Redirecting...' : 'Manage Subscription'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5" style={{ color: COLORS.darkGreen }} />
          <h2 className="text-lg font-bold" style={{ color: COLORS.darkGreen }}>
            Usage Statistics
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <UsageCard
            icon={<Store className="h-5 w-5" />}
            label="Restaurants"
            current={usage.restaurants}
            limit={limits.restaurants}
            isProPlan={isProPlan}
          />
          <UsageCard
            icon={<BookOpen className="h-5 w-5" />}
            label="Menus"
            current={usage.menus}
            limit={limits.menusPerRestaurant}
            isProPlan={isProPlan}
            limitLabel="per restaurant"
          />
          <UsageCard
            icon={<UtensilsCrossed className="h-5 w-5" />}
            label="Items"
            current={usage.items}
            limit={limits.itemsPerMenu}
            isProPlan={isProPlan}
            limitLabel="per menu"
          />
        </div>
      </div>

      {/* Free Tier: Plan Comparison + Upgrade CTA */}
      {isFreeTier && (
        <Card className="overflow-hidden" style={{ backgroundColor: COLORS.cream }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.gold}20`, color: COLORS.gold }}
              >
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold" style={{ color: COLORS.darkGreen }}>
                  Unlock More with Pro
                </CardTitle>
                <CardDescription style={{ color: COLORS.brown }}>
                  Remove all limits and access premium features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <ComparisonItem label="Restaurants" free="1" pro="Unlimited" />
              <ComparisonItem label="Menus / restaurant" free="2" pro="Unlimited" />
              <ComparisonItem label="Items / menu" free="20" pro="Unlimited" />
            </div>
            <div className="flex items-center justify-between rounded-xl p-4" style={{ backgroundColor: 'white' }}>
              <div>
                <p className="font-bold" style={{ color: COLORS.darkGreen }}>
                  Pro Plan — from $24/mo
                </p>
                <p className="text-xs" style={{ color: COLORS.brown }}>
                  Save 17% with annual billing
                </p>
              </div>
              <Button
                className="font-semibold"
                onClick={() => setPlanModalOpen(true)}
                style={{ backgroundColor: COLORS.gold, color: COLORS.darkGreen }}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                View Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pro Tier: Manage Subscription */}
      {isProPlan && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${COLORS.gold}15`, color: COLORS.gold }}
              >
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold" style={{ color: COLORS.darkGreen }}>
                  Pro Subscription
                </CardTitle>
                <CardDescription style={{ color: COLORS.brown }}>
                  Manage your billing, invoices, and payment method through Stripe
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={actionLoading}
              style={{ borderColor: COLORS.brown, color: COLORS.darkGreen }}
            >
              {actionLoading ? 'Redirecting...' : 'Manage Subscription'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan Selection Modal */}
      <PlanSelectionModal open={planModalOpen} onOpenChange={setPlanModalOpen} />
    </div>
  );
}

/* ─── Usage Card Component ─── */

interface UsageCardProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  isProPlan: boolean;
  limitLabel?: string;
}

function UsageCard({ icon, label, current, limit, limitLabel }: UsageCardProps) {
  const isUnlimited = !isFinite(limit);
  const percentage = isUnlimited ? 0 : limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: isAtLimit ? '#fef2f2' : `${COLORS.darkGreen}08`,
              color: isAtLimit ? '#dc2626' : COLORS.darkGreen,
            }}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: COLORS.darkGreen }}>{label}</p>
            {limitLabel && (
              <p className="text-[10px]" style={{ color: COLORS.brown }}>{limitLabel}</p>
            )}
          </div>
        </div>

        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold" style={{ color: COLORS.darkGreen }}>
            {current}
          </span>
          <span className="text-sm" style={{ color: COLORS.brown }}>
            / {isUnlimited ? '∞' : limit}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${COLORS.brown}15` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: isUnlimited ? '0%' : `${percentage}%`,
              backgroundColor: isAtLimit ? '#dc2626' : percentage > 75 ? COLORS.gold : COLORS.darkGreen,
            }}
          />
        </div>

        {isUnlimited && (
          <p className="text-[10px] font-medium mt-1.5" style={{ color: COLORS.brown }}>
            Unlimited on Pro
          </p>
        )}
        {isAtLimit && (
          <p className="text-[10px] font-medium mt-1.5 text-red-600">
            Limit reached
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Comparison Item Component ─── */

interface ComparisonItemProps {
  label: string;
  free: string;
  pro: string;
}

function ComparisonItem({ label, free, pro }: ComparisonItemProps) {
  return (
    <div className="text-center p-3 rounded-lg" style={{ backgroundColor: 'white' }}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.brown }}>
        {label}
      </p>
      <div className="space-y-1">
        <p className="text-xs" style={{ color: COLORS.brown }}>
          Free: <span className="font-semibold" style={{ color: COLORS.darkGreen }}>{free}</span>
        </p>
        <p className="text-xs" style={{ color: COLORS.brown }}>
          Pro: <span className="font-semibold" style={{ color: COLORS.gold }}>{pro}</span>
        </p>
      </div>
    </div>
  );
}
