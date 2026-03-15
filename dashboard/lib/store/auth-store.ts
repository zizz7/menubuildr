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
        // C1.15: Store token only in Zustand (persisted via persist middleware)
        // Do NOT write to localStorage.auth_token — single source of truth
        set({ admin, token });
      },
      updateAdmin: (data) => {
        const current = get().admin;
        if (current) set({ admin: { ...current, ...data } });
      },
      logout: () => {
        // C1.15: Clear only Zustand store — no separate localStorage.auth_token to remove
        set({ admin: null, token: null });
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
