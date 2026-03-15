import axios from 'axios';
import { getApiUrl } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';

const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// C1.23: Read token exclusively from Zustand store — never from localStorage.auth_token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and network errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear Zustand store (single source of truth)
      useAuthStore.getState().logout();
    }

    if (error.response?.status === 403 && error.response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/dashboard/billing')) {
        window.location.href = '/dashboard/billing';
      }
    }

    if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
