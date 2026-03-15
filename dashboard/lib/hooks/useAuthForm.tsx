'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import apiClient from '@/lib/api/client';

interface UseAuthFormOptions {
  endpoint: string;
  redirectTo?: string;
  extraValidation?: () => string | null;
}

export function useAuthForm({ endpoint, redirectTo = '/dashboard', extraValidation }: UseAuthFormOptions) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent, body: Record<string, string>) => {
    e.preventDefault();
    setError('');

    if (extraValidation) {
      const validationError = extraValidation();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await apiClient.post(endpoint, body);
      setAuth(response.data.admin, response.data.token);
      router.push(redirectTo);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return { error, loading, handleSubmit };
}
