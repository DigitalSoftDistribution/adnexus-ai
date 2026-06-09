'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthToken, clearAuthToken, authFetch } from '../src/lib/authFetch';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  workspaceId: string;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Install authFetch as a safer alternative to the window.fetch monkey-patch
  useEffect(() => {
    const w = window as typeof window & { __adnexusFetchPatched?: boolean };
    if (w.__adnexusFetchPatched) return;
    w.__adnexusFetchPatched = true;
    // Keep fetch interceptor for backward compatibility with existing bare fetch() calls
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      return authFetch(input, init).then(
        (r) => r,
        (e) => origFetch(input, init),
      );
    };
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authFetch('/api/v1/auth/me')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          clearAuthToken();
          return;
        }
        if (!res.ok) return;

        const body = await res.json();
        const payload = body?.data ?? body;
        const u = payload?.user ?? payload;
        const ws = payload?.workspace;
        if (u && u.id) {
          setUser({
            id: u.id,
            email: u.email,
            name: u.name ?? null,
            avatarUrl: u.avatarUrl ?? u.avatar_url ?? null,
            workspaceId: ws?.id ?? u.workspaceId ?? u.workspace_id ?? '',
            role: u.role ?? payload?.role ?? 'viewer',
          });
        }
      })
      .catch(() => {
        // Network error — keep the token; do not force a logout.
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = async () => {
    try {
      await authFetch('/api/v1/auth/signout', { method: 'POST' });
    } catch {
      // Best-effort server signout
    }
    clearAuthToken();
    queryClient.clear();
    setUser(null);
    router.push('/auth/signin');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
