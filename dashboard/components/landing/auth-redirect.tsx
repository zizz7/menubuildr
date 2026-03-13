'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { APP_URL } from '@/lib/constants/landing';

export function AuthRedirect() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated()) {
      window.location.href = `${APP_URL}/dashboard`;
    }
  }, [isAuthenticated]);

  return null;
}
