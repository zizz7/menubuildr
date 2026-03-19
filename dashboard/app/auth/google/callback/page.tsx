'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const adminParam = searchParams.get('admin');
    const error = searchParams.get('error');

    if (error) {
      router.replace('/login?error=google_auth_failed');
      return;
    }

    if (token && adminParam) {
      try {
        const admin = JSON.parse(adminParam);
        setAuth(admin, token);
        router.replace('/dashboard');
      } catch {
        router.replace('/login?error=google_auth_failed');
      }
    } else {
      router.replace('/login?error=google_auth_failed');
    }
  }, [searchParams, setAuth, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A3C2E] mx-auto mb-4" />
        <p className="text-[#8B7355] text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
