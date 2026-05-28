import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/** User role types */
export type UserRole = 'admin' | 'manager' | 'creative' | 'viewer' | 'client';

/** Base user interface */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  workspaceId: string;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  /** Current authenticated user */
  user: User | null;
  /** JWT auth token */
  token: string | null;
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;
  /** Loading state during auth operations */
  isLoading: boolean;
  /** Error message from last auth operation */
  error: string | null;

  /** Set the current user */
  setUser: (user: User | null) => void;
  /** Set the auth token */
  setToken: (token: string | null) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Log out the current user */
  logout: () => void;
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean;
}

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  immer((set, get) => ({
    user: null,
    token: getStoredToken(),
    isAuthenticated: !!getStoredToken(),
    isLoading: false,
    error: null,

    setUser: (user) =>
      set((state) => {
        state.user = user;
        state.isAuthenticated = !!user;
      }),

    setToken: (token) => {
      try {
        if (token) {
          localStorage.setItem('token', token);
        } else {
          localStorage.removeItem('token');
        }
      } catch {
        // Silently fail if localStorage is unavailable
      }
      set((state) => {
        state.token = token;
        state.isAuthenticated = !!token;
      });
    },

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    logout: () => {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('workspace_id');
        localStorage.removeItem('workspace');
      } catch {
        // Silently fail if localStorage is unavailable
      }
      set((state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      });
    },

    hasPermission: (permission: string) => {
      const { user } = get();
      if (!user) return false;
      return user.permissions.includes(permission) || user.role === 'admin';
    },
  }))
);
