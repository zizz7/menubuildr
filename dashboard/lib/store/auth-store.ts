import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Admin {
  id: string;
  email: string;
  name: string;
  profileImageUrl?: string | null;
}

interface AuthState {
  admin: Admin | null;
  token: string | null;
  setAuth: (admin: Admin, token: string) => void;
  updateAdmin: (data: Partial<Admin>) => void;
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
      updateAdmin: (data) => {
        const current = get().admin;
        if (current) set({ admin: { ...current, ...data } });
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
