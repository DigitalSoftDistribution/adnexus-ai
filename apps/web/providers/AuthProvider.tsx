'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

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

const TOKEN_KEY = 'adnexus_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  // Mirror to a non-httpOnly cookie so the middleware can read it for routing
  // guards. The API still requires the Bearer header for actual auth.
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax; Secure; max-age=86400`;
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('workspace_id');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

/**
 * Fetch wrapper that attaches the bearer token to same-origin /api/* requests.
 * Replaces the fragile window.fetch monkey-patch (M30 fix).
 */
function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const isApi = url.startsWith('/api/') || (typeof window !== 'undefined' && url.includes('//' + window.location.host + '/api/'));
  const token = isApi ? getStoredToken() : null;

  if (token) {
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  }
  return fetch(input, init);
}

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
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    authFetch('/api/v1/auth/me')
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          clearStoredToken();
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
      // Attempt to invalidate server-side session
      await authFetch('/api/v1/auth/signout', { method: 'POST' });
    } catch {
      // Best-effort server signout
    }
    clearStoredToken();
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
