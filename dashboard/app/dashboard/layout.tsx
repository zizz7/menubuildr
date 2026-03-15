'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import apiClient from '@/lib/api/client';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }

    // C1.14: Validate token server-side — client-side check alone is insufficient
    apiClient.get('/auth/me')
      .then(() => {
        setChecked(true);
      })
      .catch((err) => {
        if (err?.response?.status === 401) {
          // Token is invalid or blocklisted — force logout and redirect
          logout();
        } else {
          // Non-auth error (network, 5xx) — allow dashboard to render
          setChecked(true);
        }
      });
  }, []);

  if (!checked) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
