'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  // Install a one-time fetch interceptor that attaches the stored bearer token
  // to same-origin /api/* requests. The dashboard data components call
  // fetch('/api/v2/...') without headers; the v2 API requires Authorization.
  useEffect(() => {
    const w = window as typeof window & { __adnexusFetchPatched?: boolean };
    if (w.__adnexusFetchPatched) return;
    w.__adnexusFetchPatched = true;
    const origFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        const isApi = url.startsWith('/api/') || url.includes('//' + window.location.host + '/api/');
        const token = isApi ? localStorage.getItem('adnexus_token') : null;
        if (token) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
          if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
          return origFetch(input, { ...init, headers });
        }
      } catch {
        // fall through to the original fetch on any error
      }
      return origFetch(input, init);
    };
  }, []);

  useEffect(() => {
    // Check for existing session
    const token = localStorage.getItem('adnexus_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Validate token and fetch user
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((body) => {
        // /api/v1/auth/me returns { success, data: { id, email, name, role,
        // user: {...}, workspace: {...} } }. The user fields live under `data`
        // (with a nested `user`), not at the top level.
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
        } else {
          localStorage.removeItem('adnexus_token');
        }
      })
      .catch(() => {
        localStorage.removeItem('adnexus_token');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const signOut = async () => {
    localStorage.removeItem('adnexus_token');
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
