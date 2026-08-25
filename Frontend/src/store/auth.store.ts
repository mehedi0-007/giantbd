import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  updateUser: (partialUser: Partial<User>) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken) => {
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      setAccessToken: (accessToken) => {
        set({ accessToken, isAuthenticated: true });
      },

      updateUser: (partialUser) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...partialUser } });
        }
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user) return false;
        if (user.role?.name === 'SUPER_ADMIN') return true;
        return user.permissions?.includes(permission) ?? false;
      },
    }),
    {
      name: 'giant-bd-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
