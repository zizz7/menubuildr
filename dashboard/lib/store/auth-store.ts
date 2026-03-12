import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Admin {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  admin: Admin | null;
  token: string | null;
  setAuth: (admin: Admin, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      token: null,
      setAuth: (admin, token) => {
        set({ admin, token });
        localStorage.setItem('auth_token', token);
      },
      logout: () => {
        set({ admin: null, token: null });
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      },
      isAuthenticated: () => {
        const state = get();
        return !!state.token && !!state.admin;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
