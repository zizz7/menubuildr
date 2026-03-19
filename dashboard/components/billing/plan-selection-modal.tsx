'use client';

import { useState } from 'react';
import { Check, Crown, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/lib/hooks/useSubscription';
import apiClient from '@/lib/api/client';

interface PlanSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BillingCycle = 'monthly' | 'annual';

const FEATURES = [
  { label: 'Restaurants', free: '1', pro: 'Unlimited' },
  { label: 'Menus per restaurant', free: '2', pro: 'Unlimited' },
  { label: 'Items per menu', free: '20', pro: 'Unlimited' },
  { label: 'Languages', free: '1', pro: 'Unlimited' },
  { label: 'Templates', free: 'Classic only', pro: 'All templates' },
  { label: 'Support', free: 'Community', pro: 'Priority' },
] as const;

const COLORS = {
  darkGreen: '#1A3C2E',
  gold: '#E8A838',
  cream: '#F9F6F0',
  brown: '#8B7355',
} as const;

export function PlanSelectionModal({ open, onOpenChange }: PlanSelectionModalProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { plan: currentPlan } = useSubscription();

  const proPrice = billingCycle === 'annual' ? 24 : 29;
  const annualTotal = 288;
  const isAnnual = billingCycle === 'annual';
  const isCurrentFree = currentPlan === 'free';
  const isCurrentPro = currentPlan === 'pro';

  const handleProSelect = async () => {
    if (isCurrentPro) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/billing/create-checkout-session', {
        billingCycle,
      });
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleFreeSelect = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[720px] p-0 gap-0 border-none"
        style={{ backgroundColor: COLORS.cream }}
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle
            className="text-2xl font-bold text-center"
            style={{ color: COLORS.darkGreen }}
          >
            Choose Your Plan
          </DialogTitle>
          <DialogDescription
            className="text-center text-sm"
            style={{ color: COLORS.brown }}
          >
            Select the plan that fits your restaurant needs
          </DialogDescription>
        </DialogHeader>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
            style={{
              backgroundColor: !isAnnual ? COLORS.darkGreen : 'transparent',
              color: !isAnnual ? COLORS.cream : COLORS.brown,
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: isAnnual ? COLORS.darkGreen : 'transparent',
              color: isAnnual ? COLORS.cream : COLORS.brown,
            }}
          >
            Annual
            {isAnnual && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: COLORS.gold, color: COLORS.darkGreen }}
              >
                Save 17%
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="mx-6 mb-3 rounded-md bg-red-50 border border-red-200 px-4 py-2">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Plan Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pb-6">
          {/* Free Plan */}
          <div
            className="rounded-xl p-5 flex flex-col border-2"
            style={{
              backgroundColor: 'white',
              borderColor: isCurrentFree ? COLORS.brown : '#e5e7eb',
            }}
          >
            {isCurrentFree && (
              <span
                className="self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3"
                style={{ backgroundColor: `${COLORS.brown}20`, color: COLORS.brown }}
              >
                Current Plan
              </span>
            )}
            <h3
              className="text-lg font-bold"
              style={{ color: COLORS.darkGreen }}
            >
              Free
            </h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold" style={{ color: COLORS.darkGreen }}>
                $0
              </span>
              <span className="text-sm ml-1" style={{ color: COLORS.brown }}>
                /month
              </span>
            </div>

            <ul className="space-y-2.5 flex-1 mb-5">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-sm">
                  <Check
                    className="h-4 w-4 shrink-0 mt-0.5"
                    style={{ color: COLORS.brown }}
                  />
                  <span style={{ color: COLORS.darkGreen }}>
                    <span className="font-medium">{f.free}</span>{' '}
                    <span style={{ color: COLORS.brown }}>{f.label.toLowerCase()}</span>
                  </span>
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleFreeSelect}
              disabled={isCurrentFree}
              style={{
                borderColor: COLORS.brown,
                color: COLORS.darkGreen,
              }}
            >
              {isCurrentFree ? 'Current Plan' : 'Stay on Free'}
            </Button>
          </div>

          {/* Pro Plan */}
          <div
            className="rounded-xl p-5 flex flex-col border-2 relative"
            style={{
              backgroundColor: 'white',
              borderColor: COLORS.gold,
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              {isCurrentPro && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${COLORS.gold}30`, color: COLORS.darkGreen }}
                >
                  Current Plan
                </span>
              )}
              {!isCurrentPro && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: COLORS.gold, color: COLORS.darkGreen }}
                >
                  <Sparkles className="h-3 w-3" />
                  Recommended
                </span>
              )}
            </div>
            <h3
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: COLORS.darkGreen }}
            >
              <Crown className="h-5 w-5" style={{ color: COLORS.gold }} />
              Pro
            </h3>
            <div className="mt-2 mb-4">
              <span className="text-3xl font-bold" style={{ color: COLORS.darkGreen }}>
                ${proPrice}
              </span>
              <span className="text-sm ml-1" style={{ color: COLORS.brown }}>
                /month
              </span>
              {isAnnual && (
                <span
                  className="block text-xs mt-1"
                  style={{ color: COLORS.brown }}
                >
                  Billed ${annualTotal}/year
                </span>
              )}
            </div>

            <ul className="space-y-2.5 flex-1 mb-5">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-sm">
                  <Check
                    className="h-4 w-4 shrink-0 mt-0.5"
                    style={{ color: COLORS.gold }}
                  />
                  <span style={{ color: COLORS.darkGreen }}>
                    <span className="font-medium">{f.pro}</span>{' '}
                    <span style={{ color: COLORS.brown }}>{f.label.toLowerCase()}</span>
                  </span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full font-semibold"
              onClick={handleProSelect}
              disabled={loading || isCurrentPro}
              style={{
                backgroundColor: COLORS.gold,
                color: COLORS.darkGreen,
              }}
            >
              {loading
                ? 'Redirecting to Stripe...'
                : isCurrentPro
                  ? 'Current Plan'
                  : 'Upgrade to Pro'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
