import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type UserRole = 'shipper' | 'driver' | 'buyer' | 'seller' | 'admin';

interface User {
  walletAddress: string;
  role: UserRole;
  roles: UserRole[];
  reputationScore?: number;
  reputationLevel?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setRole: (role: UserRole) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      setRole: (role) =>
        set((state) => ({
          user: state.user ? { ...state.user, role } : null
        })),
    }),
    {
      name: 'ghachagh-auth-storage',
    }
  )
);
