'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'canceled' | 'trialing';

interface AdminInfo {
  id: string;
  email: string;
  name: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
}

const statusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  none: { label: 'No Subscription', color: 'text-gray-500' },
  active: { label: 'Active', color: 'text-green-600' },
  trialing: { label: 'Trial', color: 'text-blue-600' },
  past_due: { label: 'Past Due', color: 'text-red-600' },
  canceled: { label: 'Canceled', color: 'text-orange-600' },
};

export default function BillingPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const response = await apiClient.get('/auth/me');
        setAdmin(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };
    fetchAdmin();
  }, []);

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const response = await apiClient.post('/billing/create-checkout-session');
      window.location.href = response.data.url;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start checkout');
      setActionLoading(false);
    }
  };

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
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <Skeleton variant="text" className="h-9 w-32 rounded-md" />
        <Card>
          <CardHeader>
            <Skeleton variant="text" className="h-6 w-44 rounded-md" />
            <Skeleton variant="text" className="h-4 w-64 mt-1 rounded" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-4 w-28 rounded" />
              <Skeleton variant="text" className="h-5 w-20 rounded" />
            </div>
            <Skeleton variant="rounded" className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !admin) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = admin?.subscriptionStatus ?? 'none';
  const config = statusConfig[status] || statusConfig.none;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Billing</h1>

      {sessionId && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="py-4">
            <p className="text-green-700 font-medium">
              Subscription successful! Your account has been activated.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Subscription Status</CardTitle>
          <CardDescription>
            Manage your menubuildr.com subscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current status</span>
            <span className={`font-semibold ${config.color}`}>{config.label}</span>
          </div>

          {status === 'past_due' && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-red-700 text-sm">
                Your payment is past due. Please update your payment method to avoid service interruption.
              </p>
            </div>
          )}

          <div>
            {(status === 'none' || status === 'canceled') && (
              <Button onClick={handleSubscribe} disabled={actionLoading} className="w-full">
                {actionLoading ? 'Redirecting...' : 'Subscribe'}
              </Button>
            )}

            {(status === 'active' || status === 'trialing') && (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={actionLoading}
                className="w-full"
              >
                {actionLoading ? 'Redirecting...' : 'Manage Subscription'}
              </Button>
            )}

            {status === 'past_due' && (
              <Button
                variant="destructive"
                onClick={handleManageSubscription}
                disabled={actionLoading}
                className="w-full"
              >
                {actionLoading ? 'Redirecting...' : 'Update Payment'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
