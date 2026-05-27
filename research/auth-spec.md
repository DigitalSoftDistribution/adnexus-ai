# AdNexus AI - Authentication & Protected Routing Technical Specification

> **Document Version:** 1.0
> **Date:** 2025-01-21
> **Scope:** Complete authentication architecture for AdNexus AI ad management platform

---

## Table of Contents

1. [Current Problem Analysis](#1-current-problem-analysis)
2. [Auth Architecture Overview](#2-auth-architecture-overview)
3. [Core Auth Implementation](#3-core-auth-implementation)
4. [Route Guards & Protected Routes](#4-route-guards--protected-routes)
5. [JWT Token Management](#5-jwt-token-management)
6. [Complete Auth Flows](#6-complete-auth-flows)
7. [Ad Platform OAuth Integration](#7-ad-platform-oauth-integration)
8. [Multi-Tenant Auth (Agency Tier)](#8-multi-tenant-auth-agency-tier)
9. [Security Best Practices](#9-security-best-practices)
10. [Implementation Priority](#10-implementation-priority)
11. [File-by-File Implementation Guide](#11-file-by-file-implementation-guide)
12. [Appendix: OAuth Flow Diagrams](#12-appendix-oauth-flow-diagrams)

---

## 1. Current Problem Analysis

### 1.1 Identified Issues

The current AdNexus AI frontend has the following critical auth gaps:

| # | Problem | Impact |
|---|---------|--------|
| 1 | **No auth state management** | When users "sign in", nothing happens globally - components don't know about auth state |
| 2 | **No protected routes** | Any user can navigate to `/dashboard` directly without being authenticated |
| 3 | **No redirect after login** | After successful sign-in, user stays on the login page instead of going to dashboard |
| 4 | **Auth state doesn't persist** | On page refresh, any simulated auth state is lost |
| 5 | **No logout functionality** | Users cannot properly log out and clear session data |
| 6 | **No route guards for logged-in users** | Authenticated users can still access `/signin` and `/signup` pages |
| 7 | **No connection to backend auth API** | Sign in/up forms don't call any real authentication endpoints |

### 1.2 What Success Looks Like

```
Unauthenticated User Flow:
  Landing Page (/)
    -> Clicks "Sign In" -> /signin
    -> Tries /dashboard -> Auto-redirected to /signin
    -> Completes login -> Auto-redirected to /dashboard

Authenticated User Flow:
  Dashboard (/dashboard)
    -> Tries /signin or /signup -> Auto-redirected to /dashboard
    -> Closes tab, reopens -> Still logged in (token persisted)
    -> Clicks Logout -> Cleared session -> Redirected to /
```

---

## 2. Auth Architecture Overview

### 2.1 Architecture Decision: Supabase Auth + JWT Hybrid Storage

Based on research of successful SaaS authentication patterns, AdNexus AI will use:

| Component | Technology | Reasoning |
|-----------|-----------|-----------|
| **Auth Provider** | Supabase Auth | Built-in email/password, OAuth, MFA, session management |
| **Token Storage** | localStorage (default Supabase) | Simpler SPA implementation; XSS mitigated via CSP + short token expiry |
| **API Client** | Supabase JS client | Auto token refresh, built-in session persistence |
| **Protected Routes** | React Router v7 layout routes | Industry standard pattern with Outlet-based guards |
| **State Management** | React Context + useReducer | No external state library needed for auth |

> **Security Note:** For production financial-grade security, migrate to the **Hybrid Pattern** (httpOnly cookie for refresh token + memory for access token) as described in Section 5.3.

### 2.2 High-Level Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|   React SPA      |     |   Supabase Auth  |     |   Ad Platform    |
|                  |     |                  |     |   OAuth APIs     |
|  +------------+ |     |                  |     |                  |
|  | AuthContext| |     |  - Email/Pass    |     |  - Meta/Facebook |
|  | useAuth()  | |<--->|  - OAuth Providers |<--->|  - Google Ads    |
|  +------------+ |     |  - JWT Sessions  |     |  - TikTok        |
|        |        |     |  - Token Refresh |     |  - Snap          |
|  +------------+ |     |                  |     |                  |
|  | Protected  | |     +------------------+     +------------------+
|  | Routes     | |
|  +------------+ |
|        |        |
|  +------------+ |
|  | Platform   | |
|  | OAuth      | |
|  | Connectors | |
|  +------------+ |
+------------------+
```

### 2.3 Directory Structure (Auth-Related Files)

```
src/
├── lib/
│   └── supabase.ts                 # Supabase client initialization
├── context/
│   └── AuthContext.tsx             # Auth state provider (useAuth)
├── hooks/
│   ├── useAuth.ts                  # Shorthand for useContext(AuthContext)
│   ├── useAuthRedirect.ts          # Redirect logic based on auth state
│   └── usePlatformOAuth.ts         # Ad platform OAuth handlers
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx      # Route guard for authenticated users
│   │   ├── PublicOnlyRoute.tsx     # Route guard for unauthenticated users
│   │   ├── AuthLayout.tsx          # Shared layout for auth pages
│   │   └── PlatformOAuthButton.tsx # "Connect [Platform]" buttons
│   └── layout/
│       ├── DashboardLayout.tsx     # Sidebar + header for protected pages
│       └── LandingLayout.tsx       # Header for public pages
├── pages/
│   ├── LandingPage.tsx             # Public: /
│   ├── SignInPage.tsx              # Public: /signin
│   ├── SignUpPage.tsx              # Public: /signup
│   ├── ForgotPasswordPage.tsx      # Public: /forgot-password
│   ├── DashboardPage.tsx           # Protected: /dashboard
│   ├── CampaignsPage.tsx           # Protected: /campaigns
│   ├── AnalyticsPage.tsx           # Protected: /analytics
│   ├── SettingsPage.tsx            # Protected: /settings
│   └── PlatformsPage.tsx           # Protected: /platforms (OAuth mgmt)
├── types/
│   └── auth.ts                     # Auth-related TypeScript types
└── router.tsx                      # Route definitions with guards
```

---

## 3. Core Auth Implementation

### 3.1 TypeScript Types (`src/types/auth.ts`)

```typescript
// User profile as returned from Supabase
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  tenant_id: string | null;       // For agency tier multi-tenancy
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'agency_owner' | 'agency_member' | 'client';

// Auth state managed by AuthContext
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;              // Initial session check
  isLoggingIn: boolean;            // Login in progress
  error: string | null;
}

// Ad platform OAuth connection
export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: 'meta' | 'google' | 'tiktok' | 'snap';
  platform_account_id: string;
  platform_account_name: string;
  access_token: string;            // Encrypted at rest
  refresh_token: string;           // Encrypted at rest
  expires_at: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Multi-tenant membership (agency tier)
export interface TenantMembership {
  tenant_id: string;
  tenant_name: string;
  role: 'owner' | 'admin' | 'member';
  permissions: Permission[];
}

export type Permission =
  | 'campaigns:read'
  | 'campaigns:write'
  | 'campaigns:delete'
  | 'analytics:read'
  | 'billing:read'
  | 'billing:write'
  | 'settings:read'
  | 'settings:write'
  | 'team:read'
  | 'team:write'
  | 'platforms:connect'
  | 'platforms:disconnect';
```

### 3.2 Supabase Client (`src/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types'; // Generated from schema

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Single Supabase client instance for the entire app
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,        // Automatically refresh JWT before expiry
    persistSession: true,          // Store session in localStorage
    detectSessionInUrl: true,      // Handle OAuth callbacks
  },
});

// Axios/fetch interceptor helper: attach JWT to API requests
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
```

### 3.3 Auth Context Provider (`src/context/AuthContext.tsx`)

This is the **core** of the auth system. Based on research of best-in-class SaaS auth patterns [^25^][^66^][^24^]:

```typescript
import { createContext, useContext, useState, useEffect, useCallback, useReducer } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, AuthState, TenantMembership } from '@/types/auth';

// ==================== Auth Actions ====================
type AuthAction =
  | { type: 'INITIAL_CHECK_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; memberships: TenantMembership[] } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; memberships: TenantMembership[] } }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'USER_UPDATED'; payload: User }
  | { type: 'CLEAR_ERROR' };

// ==================== Auth State Reducer ====================
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,       // Start loading until session check completes
  isLoggingIn: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'INITIAL_CHECK_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGIN_START':
      return { ...state, isLoggingIn: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoggingIn: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoggingIn: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'USER_UPDATED':
      return { ...state, user: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ==================== Context Type ====================
interface AuthContextValue extends AuthState {
  // Auth actions
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  clearError: () => void;
  // Multi-tenant
  activeTenantId: string | null;
  setActiveTenant: (tenantId: string) => void;
  memberships: TenantMembership[];
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ==================== Provider ====================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const [activeTenantId, setActiveTenant] = useState<string | null>(null);

  // ---------- 1. Check existing session on mount ----------
  useEffect(() => {
    dispatch({ type: 'INITIAL_CHECK_START' });

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          // Fetch extended user profile from our profiles table
          const user = await fetchUserProfile(session.user.id);
          const userMemberships = await fetchUserMemberships(session.user.id);
          setMemberships(userMemberships);
          if (userMemberships.length > 0) {
            setActiveTenant(userMemberships[0].tenant_id);
          }
          dispatch({ type: 'AUTH_SUCCESS', payload: { user, memberships: userMemberships } });
        } else {
          dispatch({ type: 'AUTH_FAILURE', payload: '' }); // No error, just not logged in
        }
      } catch (err) {
        dispatch({ type: 'AUTH_FAILURE', payload: getErrorMessage(err) });
      }
    };

    checkSession();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const user = await fetchUserProfile(session.user.id);
          const userMemberships = await fetchUserMemberships(session.user.id);
          setMemberships(userMemberships);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, memberships: userMemberships } });
        } else if (event === 'SIGNED_OUT') {
          setMemberships([]);
          setActiveTenant(null);
          dispatch({ type: 'LOGOUT' });
        } else if (event === 'USER_UPDATED' && session?.user) {
          const user = await fetchUserProfile(session.user.id);
          dispatch({ type: 'USER_UPDATED', payload: user });
        }
        // TOKEN_REFRESHED is handled automatically by Supabase
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ---------- 2. Auth Action Implementations ----------

  const signIn = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      // onAuthStateChange will handle the state update
    } catch (err) {
      dispatch({ type: 'LOGIN_FAILURE', payload: getErrorMessage(err) });
      throw err; // Re-throw so the component can show the error
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          // Email confirmation redirect
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      // Profile is created via database trigger on auth.users insert
    } catch (err) {
      dispatch({ type: 'LOGIN_FAILURE', payload: getErrorMessage(err) });
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // onAuthStateChange will handle clearing state
    } catch (err) {
      console.error('Sign out error:', err);
      // Force logout on error
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
    activeTenantId,
    setActiveTenant,
    memberships,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ==================== useAuth Hook ====================
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// ==================== Helper Functions ====================
async function fetchUserProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as User;
}

async function fetchUserMemberships(userId: string): Promise<TenantMembership[]> {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, tenants(name), role, permissions')
    .eq('user_id', userId);
  if (error) return [];
  return (data || []).map((m) => ({
    tenant_id: m.tenant_id,
    tenant_name: m.tenants?.name || '',
    role: m.role,
    permissions: m.permissions,
  })) as TenantMembership[];
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'An unexpected error occurred';
}
```

### 3.4 useAuth Hook (`src/hooks/useAuth.ts`)

```typescript
// Re-export for convenience
export { useAuth } from '@/context/AuthContext';
```

### 3.5 useAuthRedirect Hook (`src/hooks/useAuthRedirect.ts`)

```typescript
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Redirect authenticated users away from public-only pages (login, signup)
 * or redirect unauthenticated users to login from protected pages.
 */
export function useAuthRedirect({
  requireAuth = false,
  requireGuest = false,
  redirectTo = '/dashboard',
  guestRedirectTo = '/signin',
}: {
  requireAuth?: boolean;
  requireGuest?: boolean;
  redirectTo?: string;
  guestRedirectTo?: string;
} = {}) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return; // Wait for session check

    const from = (location.state as any)?.from?.pathname || redirectTo;

    if (requireAuth && !isAuthenticated) {
      // Save the attempted URL for post-login redirect
      navigate(guestRedirectTo, { replace: true, state: { from: location } });
    }

    if (requireGuest && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location, requireAuth, requireGuest, redirectTo, guestRedirectTo]);
}
```

---

## 4. Route Guards & Protected Routes

### 4.1 ProtectedRoute Component (`src/components/auth/ProtectedRoute.tsx`)

Based on React Router v7 best practices [^24^][^31^][^33^]:

```typescript
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

/**
 * Route guard for authenticated users.
 * Unauthenticated users are redirected to /signin.
 * Authenticated users see the DashboardLayout with the matched child route.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not authenticated -> redirect to signin, save intended destination
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  // Authenticated -> render dashboard layout with child route
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}
```

### 4.2 PublicOnlyRoute Component (`src/components/auth/PublicOnlyRoute.tsx`)

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Route guard for public pages (signin, signup).
 * Authenticated users are redirected to dashboard.
 * Unauthenticated users see the page normally.
 */
export function PublicOnlyRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
```

### 4.3 RoleBasedRoute Component (Future: Agency Tier)

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types/auth';

interface RoleBasedRouteProps {
  allowedRoles: UserRole[];
  redirectTo?: string;
}

/**
 * Route guard that checks user role.
 * Used for admin-only or agency-owner-only routes.
 */
export function RoleBasedRoute({
  allowedRoles,
  redirectTo = '/dashboard',
}: RoleBasedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/signin" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
```

### 4.4 Router Configuration (`src/router.tsx`)

```typescript
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute';
import { RoleBasedRoute } from '@/components/auth/RoleBasedRoute';

// Pages
import { LandingPage } from '@/pages/LandingPage';
import { SignInPage } from '@/pages/SignInPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { UpdatePasswordPage } from '@/pages/UpdatePasswordPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CampaignsPage } from '@/pages/CampaignsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { PlatformsPage } from '@/pages/PlatformsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TeamPage } from '@/pages/TeamPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    // AuthProvider wraps everything - all routes can use useAuth()
    element: <AuthProvider />,
    children: [
      // ============ PUBLIC ROUTES ============
      { index: true, element: <LandingPage /> },

      // Auth pages - redirect logged-in users to dashboard
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: 'signin', element: <SignInPage /> },
          { path: 'signup', element: <SignUpPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
          { path: 'update-password', element: <UpdatePasswordPage /> },
        ],
      },

      // ============ PROTECTED ROUTES ============
      {
        element: <ProtectedRoute />,
        children: [
          // Dashboard (default protected page)
          { path: 'dashboard', element: <DashboardPage /> },

          // Campaigns
          { path: 'campaigns', element: <CampaignsPage /> },
          { path: 'campaigns/:campaignId', element: <CampaignsPage /> },

          // Analytics
          { path: 'analytics', element: <AnalyticsPage /> },

          // Connected Ad Platforms
          { path: 'platforms', element: <PlatformsPage /> },

          // Settings
          { path: 'settings', element: <SettingsPage /> },

          // Admin-only routes (future)
          {
            element: <RoleBasedRoute allowedRoles={['admin', 'agency_owner']} />,
            children: [
              { path: 'team', element: <TeamPage /> },
            ],
          },
        ],
      },

      // ============ CATCH ALL ============
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
```

### 4.5 App Entry Point (`src/App.tsx`)

```typescript
import { RouterProvider } from 'react-router-dom';
import { router } from './router';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```

---

## 5. JWT Token Management

### 5.1 Token Lifecycle Overview

```
User Logs In
    |
    v
Supabase issues JWT (access token) + refresh token
    |
    v
Access Token: Stored in memory (via Supabase client)
Refresh Token: Stored in localStorage (via Supabase client)
    |
    v
Every API request: Access token sent in Authorization header
    |
    v
Access Token expires (~60 minutes)
    |
    v
Supabase auto-refresh: Uses refresh token to get new access token
    |
    v
User logs out: Both tokens cleared
```

### 5.2 Token Storage Comparison

Based on security research [^53^][^59^][^61^]:

| Storage | XSS Risk | CSRF Risk | Persists Refresh | Complexity |
|---------|----------|-----------|-------------------|------------|
| **localStorage** | High | Low | Yes | Low |
| **httpOnly Cookie** | Low | High | Yes | Medium |
| **In-Memory only** | Low | Low | No (lost on refresh) | Low |
| **Hybrid (Recommended)** | Low | Low | Yes | Medium |

### 5.3 Production-Ready Hybrid Token Pattern

For AdNexus AI, we start with Supabase's default (localStorage) and **migrate to Hybrid** before handling real ad spend:

```typescript
// Production-grade token management (Phase 2)
// Access Token: Short-lived (15 min), stored in JavaScript memory
// Refresh Token: Long-lived (7 days), stored in httpOnly secure cookie

// src/lib/auth/tokens.ts
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

let memoryToken: string | null = null;

export function setAccessToken(token: string) {
  memoryToken = token;
}

export function getAccessToken(): string | null {
  return memoryToken;
}

export function clearTokens() {
  memoryToken = null;
  // Refresh token is cleared server-side (httpOnly cookie)
}

// Auto-refresh: request new access token 2 minutes before expiry
export function setupTokenRefresh(expiresAt: number, refreshFn: () => Promise<void>) {
  const refreshTime = expiresAt - 2 * 60 * 1000; // 2 min before expiry
  const delay = refreshTime - Date.now();

  if (delay > 0) {
    return setTimeout(refreshFn, delay);
  }
  return null;
}
```

### 5.4 API Request with Auto-Retry on 401

```typescript
// src/lib/api/client.ts
import axios from 'axios';
import { supabase } from '@/lib/supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Request interceptor: attach JWT
api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Supabase auto-refreshes, just get the new session
        const { data } = await supabase.auth.getSession();
        const newToken = data.session?.access_token;

        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/signin';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 5.5 Supabase Auto-Refresh Behavior

As documented [^51^][^54^][^52^]:

- Supabase JS client **automatically refreshes** the access token before expiry via a timer
- Token storage is handled transparently via the configured storage (localStorage by default)
- On `TOKEN_REFRESHED` event, the new session is already available via `getSession()`
- For React Native, use `startAutoRefresh()` / `stopAutoRefresh()` with AppState; for web, it's automatic

---

## 6. Complete Auth Flows

### 6.1 Sign Up Flow

```
User
  |
  v
/Signup Page (PublicOnlyRoute - redirects if logged in)
  |
  v
Fills form: email, password, full name
  |
  v
POST supabase.auth.signUp({ email, password, options: { data: { full_name } } })
  |
  v
Supabase creates user in auth.users
  |
  v
Database trigger creates profile in public.profiles
  |
  v
Supabase sends verification email with confirmation link
  |
  v
User clicks link -> /dashboard?access_token=xxx&refresh_token=xxx
  |
  v
Supabase detects tokens in URL -> auto-confirms -> creates session
  |
  v
onAuthStateChange('SIGNED_IN') fires -> state updated
  |
  v
User redirected to /dashboard (already there from email link)
```

**Implementation:**

```typescript
// src/pages/SignUpPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const { signUp, isLoggingIn, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await signUp(email, password, fullName);
      setNeedsVerification(true);
    } catch {
      // Error is set in context, displayed below
    }
  };

  if (needsVerification) {
    return (
      <div className="verify-email">
        <h2>Verify your email</h2>
        <p>We've sent a confirmation link to {email}.</p>
        <p>Click the link to activate your account.</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="Full Name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Creating account...' : 'Create Account'}
        </button>
        <p>Already have an account? <Link to="/signin">Sign In</Link></p>
      </form>
    </div>
  );
}
```

### 6.2 Sign In Flow

```
User
  |
  v
/Signin Page (PublicOnlyRoute - redirects to /dashboard if already logged in)
  |
  v
Fills form: email, password
  |
  v
POST supabase.auth.signInWithPassword({ email, password })
  |
  v
Supabase validates credentials, returns session (JWT + refresh)
  |
  v
Supabase stores session in localStorage
  |
  v
onAuthStateChange('SIGNED_IN') fires
  |
  v
AuthContext updates: user set, isAuthenticated = true
  |
  v
React re-renders, ProtectedRoute now shows dashboard
  |
  v
User is on /dashboard with full session active
```

**Implementation:**

```typescript
// src/pages/SignInPage.tsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoggingIn, error, clearError, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the intended destination (if user was redirected from a protected route)
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await signIn(email, password);
      // After successful login, navigate to intended destination
      navigate(from, { replace: true });
    } catch {
      // Error is set in context
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? 'Signing in...' : 'Sign In'}
        </button>
        <p>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
      </form>
    </div>
  );
}
```

### 6.3 Forgot Password Flow

```
User
  |
  v
/forgot-password (PublicOnlyRoute)
  |
  v
Enters email address
  |
  v
POST supabase.auth.resetPasswordForEmail(email, { redirectTo: '/update-password' })
  |
  v
Supabase sends email with password reset link
  |
  v
User clicks link -> /update-password?access_token=xxx&type=recovery
  |
  v
UpdatePasswordPage detects recovery token in URL
  |
  v
User enters new password
  |
  v
POST supabase.auth.updateUser({ password: newPassword })
  |
  v
Password updated, session created
  |
  v
Redirect to /dashboard
```

**Implementation:**

```typescript
// src/pages/ForgotPasswordPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPassword, isLoggingIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resetPassword(email);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-page">
        <h2>Check your email</h2>
        <p>We've sent a password reset link to {email}.</p>
        <Link to="/signin">Back to Sign In</Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h2>Reset Password</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoggingIn}>
          Send Reset Link
        </button>
        <Link to="/signin">Back to Sign In</Link>
      </form>
    </div>
  );
}
```

```typescript
// src/pages/UpdatePasswordPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function UpdatePasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Handle recovery token from URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      // Supabase automatically handles the recovery token
      // The session will be available via getSession()
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await updatePassword(password);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit}>
        <h2>Set New Password</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Update Password</button>
      </form>
    </div>
  );
}
```

### 6.4 Logout Flow

```
User
  |
  v
Clicks "Logout" in dashboard nav
  |
  v
Calls signOut() from useAuth()
  |
  v
POST supabase.auth.signOut()
  |
  v
Supabase clears session from localStorage
  |
  v
onAuthStateChange('SIGNED_OUT') fires
  |
  v
AuthContext: user = null, isAuthenticated = false
  |
  v
ProtectedRoute redirects to /signin
  |
  v
User sees signin page
```

**Implementation (in DashboardLayout):**

```typescript
// src/components/layout/DashboardLayout.tsx
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function DashboardLayout() {
  const { signOut, user } = useAuth();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <nav>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/campaigns">Campaigns</NavLink>
          <NavLink to="/analytics">Analytics</NavLink>
          <NavLink to="/platforms">Platforms</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="user-section">
          <span>{user?.full_name || user?.email}</span>
          <button onClick={signOut}>Logout</button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
```

---

## 7. Ad Platform OAuth Integration

### 7.1 Architecture Overview

AdNexus AI connects to 4 ad platforms via OAuth 2.0. Each platform follows the **Authorization Code Flow** (with PKCE for SPAs):

```
AdNexus AI User
      |
      v
  +-------------------+
  | Click "Connect    |
  | [Platform]"       |
  +-------------------+
      |
      v
  +-------------------+     +------------------+     +------------------+
  | React SPA         |---->| Supabase Edge    |---->| Platform OAuth   |
  | (initiates flow)  |     | Function         |     | Server           |
  +-------------------+     | (holds secrets)  |     |                  |
      |                     +------------------+     +------------------+
      |                            |                         |
      |                            v                         v
      |                     Exchanges code            Issues tokens
      |                     for tokens                (access + refresh)
      |                            |                         |
      |                            v                         |
      |<-------------------- Stores encrypted                 |
      |                     tokens in DB                      |
      |                                                       |
      v                                               User authorizes
  +-------------------+                              AdNexus AI
  | Poll for status   |
  | (connection active)|
  +-------------------+
```

### 7.2 Meta (Facebook) OAuth Flow

Based on Meta for Developers documentation [^63^][^73^]:

**Scopes needed:**
- `email` - User email
- `public_profile` - Basic profile info
- `ads_read` - Read ad account data
- `ads_management` - Manage campaigns
- `business_management` - Access Business Manager

**Flow Implementation:**

```typescript
// src/hooks/usePlatformOAuth.ts
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const PLATFORM_CONFIGS = {
  meta: {
    name: 'Meta',
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    scopes: ['email', 'public_profile', 'ads_read', 'ads_management', 'business_management'],
  },
  google: {
    name: 'Google Ads',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/adwords',
    ],
  },
  tiktok: {
    name: 'TikTok',
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scopes: ['user.info.basic', 'user.info.profile', 'video.list', 'ads.read', 'ads.write'],
  },
  snap: {
    name: 'Snapchat',
    authUrl: 'https://accounts.snapchat.com/accounts/oauth2/auth',
    scopes: [
      'https://auth.snapchat.com/oauth2/api/user.display_name',
      'https://auth.snapchat.com/oauth2/api/user.bitmoji.avatar',
      'snapchat-marketing-api',
    ],
  },
};

/**
 * Initiates OAuth flow for a given ad platform.
 * Uses Supabase Edge Function as the secure backend for token exchange.
 */
export function usePlatformOAuth() {
  const initiateOAuth = useCallback((platform: keyof typeof PLATFORM_CONFIGS) => {
    const config = PLATFORM_CONFIGS[platform];

    // Generate PKCE verifier (for secure SPA flow)
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    // Store verifier temporarily for callback
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_platform', platform);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: getClientId(platform), // From env config
      redirect_uri: `${window.location.origin}/oauth/callback`,
      response_type: 'code',
      scope: config.scopes.join(','),
      state: generateState(), // CSRF protection
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Redirect to platform OAuth
    window.location.href = `${config.authUrl}?${params.toString()}`;
  }, []);

  /**
   * Handle OAuth callback - called by the callback page
   */
  const handleCallback = useCallback(async (code: string, state: string) => {
    const platform = sessionStorage.getItem('oauth_platform') as string;
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier') as string;
    const storedState = sessionStorage.getItem('oauth_state') as string;

    // Verify state to prevent CSRF
    if (state !== storedState) {
      throw new Error('Invalid OAuth state');
    }

    // Clear temporary storage
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_platform');
    sessionStorage.removeItem('oauth_state');

    // Call Supabase Edge Function to exchange code for tokens
    // The Edge Function holds the client_secret securely
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        platform,
        code,
        code_verifier: codeVerifier,
        redirect_uri: `${window.location.origin}/oauth/callback`,
      }),
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return await response.json(); // { success: true, connectionId: string }
  }, []);

  return { initiateOAuth, handleCallback };
}

// PKCE helpers
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function generateCodeChallenge(verifier: string): string {
  // In production: SHA256 hash of verifier, then base64url encode
  // Simplified for brevity - use proper crypto in production
  return verifier; // Placeholder - use actual S256
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

function base64URLEncode(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

### 7.3 Google Identity Services (GIS) Integration

Based on GIS documentation [^32^]:

```typescript
// src/components/auth/GoogleOAuthButton.tsx
import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleOAuthButton() {
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.google || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
    });
  }, []);

  const handleGoogleResponse = async (response: any) => {
    // Send Google ID token to Supabase for verification
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.credential,
    });

    if (error) {
      console.error('Google auth error:', error);
      return;
    }

    // User is now logged in - onAuthStateChange will handle state
  };

  return <div ref={buttonRef} />;
}
```

### 7.4 Platform Token Refresh Architecture

Each platform has different token expiry policies:

| Platform | Access Token TTL | Refresh Token TTL | Refresh Mechanism |
|----------|-----------------|-------------------|--------------------|
| **Meta** | ~60 days | Long-lived (60 days) | `grant_type=fb_exchange_token` |
| **Google** | 3600 seconds | Until revoked | `grant_type=refresh_token` |
| **TikTok** | 86400 seconds (24h) | 31536000 seconds (1 year) | `grant_type=refresh_token` [^34^][^38^] |
| **Snap** | 3600 seconds | Until revoked | `grant_type=refresh_token` [^55^][^58^] |

**Token Refresh Strategy (Supabase Edge Function):**

```typescript
// Edge Function: scheduled refresh (runs every 6 hours)
// src/supabase/functions/token-refresh/index.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  // Find tokens expiring within 24 hours
  const { data: connections } = await supabase
    .from('platform_connections')
    .select('*')
    .lt('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
    .eq('is_active', true);

  for (const conn of connections || []) {
    try {
      const newTokens = await refreshPlatformToken(conn);
      await supabase
        .from('platform_connections')
        .update({
          access_token: encrypt(newTokens.access_token),
          refresh_token: encrypt(newTokens.refresh_token),
          expires_at: newTokens.expires_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);
    } catch (err) {
      // Mark connection as inactive if refresh fails
      await supabase
        .from('platform_connections')
        .update({ is_active: false, error: err.message })
        .eq('id', conn.id);
    }
  }

  return new Response(JSON.stringify({ refreshed: connections?.length || 0 }));
});
```

### 7.5 Connected Platforms Page (`src/pages/PlatformsPage.tsx`)

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlatformOAuth } from '@/hooks/usePlatformOAuth';
import { supabase } from '@/lib/supabase';
import type { PlatformConnection } from '@/types/auth';

const PLATFORMS = [
  { id: 'meta', name: 'Meta Ads', icon: '/icons/meta.svg', color: '#0668E1' },
  { id: 'google', name: 'Google Ads', icon: '/icons/google.svg', color: '#4285F4' },
  { id: 'tiktok', name: 'TikTok Ads', icon: '/icons/tiktok.svg', color: '#000000' },
  { id: 'snap', name: 'Snapchat Ads', icon: '/icons/snap.svg', color: '#FFFC00' },
];

export function PlatformsPage() {
  const { user } = useAuth();
  const { initiateOAuth } = usePlatformOAuth();
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
    const { data } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_active', true);
    setConnections(data || []);
    setLoading(false);
  };

  const isConnected = (platform: string) =>
    connections.some((c) => c.platform === platform);

  return (
    <div className="platforms-page">
      <h1>Connected Platforms</h1>
      <p>Connect your ad accounts to start managing campaigns.</p>

      <div className="platform-grid">
        {PLATFORMS.map((platform) => {
          const connected = isConnected(platform.id);
          const connection = connections.find((c) => c.platform === platform.id);

          return (
            <div
              key={platform.id}
              className={`platform-card ${connected ? 'connected' : ''}`}
            >
              <img src={platform.icon} alt={platform.name} />
              <h3>{platform.name}</h3>

              {connected ? (
                <>
                  <span className="badge connected">Connected</span>
                  <p>{connection?.platform_account_name}</p>
                  <button
                    onClick={() => disconnectPlatform(connection!.id)}
                    className="disconnect-btn"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <span className="badge disconnected">Not Connected</span>
                  <button
                    onClick={() => initiateOAuth(platform.id as any)}
                    className="connect-btn"
                    style={{ backgroundColor: platform.color }}
                  >
                    Connect {platform.name}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 8. Multi-Tenant Auth (Agency Tier)

### 8.1 Multi-Tenant Architecture

Based on research of multi-tenant SaaS patterns [^27^][^64^][^67^]:

```
+-----------------------------------+
|           AdNexus AI              |
|                                   |
|  +-----------------------------+  |
|  |  Agency (Tenant)            |  |
|  |  "Digital Masters Inc."     |  |
|  |                             |  |
|  |  Owner: alice@dm.com        |  |
|  |  Admin: bob@dm.com          |  |
|  |  Member: charlie@dm.com     |  |
|  |                             |  |
|  |  + Clients (Sub-tenants)   |  |
|  |  - Client A (Nike)         |  |
|  |  - Client B (Apple)        |  |
|  |  - Client C (Coca-Cola)    |  |
|  +-----------------------------+  |
|                                   |
|  +-----------------------------+  |
|  |  Individual Advertiser      |  |
|  |  "John Doe"                 |  |
|  |  (Own tenant, single user)  |  |
|  +-----------------------------+  |
+-----------------------------------+
```

### 8.2 Database Schema

```sql
-- Tenants table (each agency or individual advertiser)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,          -- URL-friendly name
  plan TEXT NOT NULL DEFAULT 'free',   -- free, pro, agency
  owner_id UUID REFERENCES auth.users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant memberships (users belong to tenants via this table)
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  permissions TEXT[] DEFAULT '{}',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- Client accounts (sub-tenants for agencies)
CREATE TABLE client_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),  -- Parent agency
  name TEXT NOT NULL,
  contact_email TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform connections scoped to tenant+client
CREATE TABLE platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_account_id UUID REFERENCES client_accounts(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  platform TEXT NOT NULL, -- meta, google, tiktok, snap
  platform_account_id TEXT NOT NULL,
  platform_account_name TEXT,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: tenant isolation
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON platform_connections
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()
  ));
```

### 8.3 Tenant-Aware Auth Flow

```
User authenticates (email/password or OAuth)
        |
        v
Global identity established (auth.users)
        |
        v
Fetch tenant memberships for user
        |
        +---> No memberships? -> Create default tenant
        |                       (individual advertiser)
        |
        +---> Has membership(s)? -> Show tenant picker
        |                           (or auto-select if only 1)
        |
        v
Active tenant set in state
        |
        v
All subsequent API calls include x-tenant-id header
        |
        v
Row Level Security enforces tenant data isolation
```

### 8.4 Tenant Context Hook

```typescript
// src/hooks/useTenant.ts
import { useAuth } from './useAuth';

export function useTenant() {
  const { activeTenantId, memberships, setActiveTenant, user } = useAuth();

  const currentTenant = memberships.find((m) => m.tenant_id === activeTenantId);
  const allTenants = memberships;

  const hasPermission = (permission: string): boolean => {
    if (!currentTenant) return false;
    return currentTenant.permissions.includes(permission);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!currentTenant) return false;
    return roles.includes(currentTenant.role);
  };

  return {
    tenantId: activeTenantId,
    tenant: currentTenant,
    allTenants,
    setActiveTenant,
    hasPermission,
    hasRole,
    isOwner: currentTenant?.role === 'owner',
    isAdmin: currentTenant?.role === 'admin' || currentTenant?.role === 'owner',
  };
}
```

---

## 9. Security Best Practices

### 9.1 Essential Security Checklist

| # | Practice | Implementation |
|---|----------|---------------|
| 1 | **HTTPS only** | Enforce in production; no HTTP allowed |
| 2 | **CSP Headers** | `Content-Security-Policy` to mitigate XSS |
| 3 | **Short JWT expiry** | 15-60 minutes for access tokens |
| 4 | **Token rotation** | New refresh token issued on each refresh |
| 5 | **Secure password policy** | Min 8 chars, complexity requirements |
| 6 | **Rate limiting** | Max 5 login attempts per 15 minutes per IP |
| 7 | **Input validation** | Validate all inputs on client AND server |
| 8 | **SQL injection prevention** | Use Supabase query builder (parameterized) |
| 9 | **Row Level Security** | Enable RLS on all tenant-scoped tables |
| 10 | **Audit logging** | Log all auth events (login, logout, token refresh) |
| 11 | **Email confirmation** | Require email verification before full access |
| 12 | **OAuth state parameter** | CSRF protection on all OAuth flows |
| 13 | **PKCE** | Use PKCE for all OAuth flows from SPA |
| 14 | **Client secrets server-side** | Never expose API keys in frontend code |
| 15 | **Session timeout** | Auto-logout after 24h of inactivity |

### 9.2 Content Security Policy

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'self';
    script-src 'self' https://accounts.google.com;
    style-src 'self' 'unsafe-inline';
    connect-src 'self'
      https://*.supabase.co
      https://www.facebook.com
      https://graph.facebook.com
      https://accounts.google.com
      https://open.tiktokapis.com
      https://accounts.snapchat.com;
    img-src 'self' https: data:;
    frame-src https://accounts.google.com;
  "
/>
```

### 9.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can only see connections in their tenant
CREATE POLICY "Tenant-scoped connections" ON platform_connections
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()
    )
  );

-- Campaigns are scoped by tenant
CREATE POLICY "Tenant-scoped campaigns" ON campaigns
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships WHERE user_id = auth.uid()
    )
  );
```

---

## 10. Implementation Priority

### 10.1 Phase 1: Core Auth (Week 1) - CRITICAL

Implement the absolute minimum to make auth functional:

| Priority | Task | Files to Create/Modify |
|----------|------|----------------------|
| P0 | Set up Supabase project with auth | Supabase dashboard |
| P0 | Create `supabase.ts` client | `src/lib/supabase.ts` |
| P0 | Create `AuthContext.tsx` with useReducer | `src/context/AuthContext.tsx` |
| P0 | Create `useAuth.ts` hook | `src/hooks/useAuth.ts` |
| P0 | Create `ProtectedRoute.tsx` guard | `src/components/auth/ProtectedRoute.tsx` |
| P0 | Create `PublicOnlyRoute.tsx` guard | `src/components/auth/PublicOnlyRoute.tsx` |
| P0 | Update `router.tsx` with guards | `src/router.tsx` |
| P0 | Wire up SignInPage to real auth | `src/pages/SignInPage.tsx` |
| P0 | Wire up SignUpPage to real auth | `src/pages/SignUpPage.tsx` |
| P0 | Add Logout button to layout | `src/components/layout/DashboardLayout.tsx` |
| P0 | Add auth state to landing nav | `src/components/layout/LandingLayout.tsx` |

### 10.2 Phase 2: Complete Flows (Week 2)

| Priority | Task | Files |
|----------|------|-------|
| P1 | Forgot password flow | `ForgotPasswordPage.tsx`, `UpdatePasswordPage.tsx` |
| P1 | Email verification | SignUpPage verification state |
| P1 | Auth redirect hook | `useAuthRedirect.ts` |
| P1 | Auto-redirect logged-in users | Update `PublicOnlyRoute` |
| P1 | Loading states during auth check | `ProtectedRoute.tsx` spinner |
| P1 | Error handling & display | All auth pages |
| P1 | Remember me option | SignInPage + Supabase session config |

### 10.3 Phase 3: Platform OAuth (Week 3-4)

| Priority | Task | Files |
|----------|------|-------|
| P2 | Supabase Edge Function for OAuth exchange | `supabase/functions/oauth-exchange/` |
| P2 | Meta OAuth flow | `usePlatformOAuth.ts` |
| P2 | Google OAuth (GIS) | `GoogleOAuthButton.tsx` |
| P2 | TikTok OAuth flow | `usePlatformOAuth.ts` |
| P2 | Snap OAuth flow | `usePlatformOAuth.ts` |
| P2 | OAuth callback page | `src/pages/OAuthCallbackPage.tsx` |
| P2 | Connected platforms UI | `src/pages/PlatformsPage.tsx` |
| P2 | Token refresh scheduling | `supabase/functions/token-refresh/` |

### 10.4 Phase 4: Multi-Tenant / Agency (Month 2)

| Priority | Task | Files |
|----------|------|-------|
| P3 | Multi-tenant DB schema | Supabase migrations |
| P3 | Tenant context hook | `useTenant.ts` |
| P3 | Tenant switcher UI | DashboardLayout tenant dropdown |
| P3 | Role-based route guards | `RoleBasedRoute.tsx` |
| P3 | Team management page | `src/pages/TeamPage.tsx` |
| P3 | Invitation system | Invite flow + email |
| P3 | Client account management | `src/pages/ClientsPage.tsx` |

---

## 11. File-by-File Implementation Guide

### 11.1 Files to Create

```
NEW FILES (15):
----------------
src/lib/supabase.ts                          [Supabase client]
src/context/AuthContext.tsx                  [Core auth state - MOST IMPORTANT]
src/types/auth.ts                            [TypeScript interfaces]
src/hooks/useAuth.ts                         [useAuth re-export]
src/hooks/useAuthRedirect.ts                 [Redirect helper]
src/hooks/usePlatformOAuth.ts               [OAuth initiation]
src/hooks/useTenant.ts                       [Multi-tenant helper]
src/components/auth/ProtectedRoute.tsx       [Auth guard]
src/components/auth/PublicOnlyRoute.tsx      [Guest guard]
src/components/auth/RoleBasedRoute.tsx       [RBAC guard]
src/components/auth/AuthLayout.tsx           [Shared auth page layout]
src/components/auth/GoogleOAuthButton.tsx    [GIS button]
src/components/layout/DashboardLayout.tsx    [Protected app shell]
src/components/layout/LandingLayout.tsx      [Public page shell]
src/pages/OAuthCallbackPage.tsx             [OAuth redirect handler]
src/pages/NotFoundPage.tsx                  [404 page]
src/router.tsx                               [Route definitions]

SUPABASE EDGE FUNCTIONS (2):
-----------------------------
supabase/functions/oauth-exchange/index.ts   [Code->token exchange]
supabase/functions/token-refresh/index.ts    [Scheduled refresh]

SUPABASE DB TABLES/MIGRATIONS:
-------------------------------
profiles                                     [Extended user profile]
tenants                                      [Agency/individual tenant]
tenant_memberships                           [User-tenant relationships]
client_accounts                              [Agency client sub-accounts]
platform_connections                         [Ad platform OAuth tokens]
campaigns                                    [Ad campaigns - tenant-scoped]
audit_logs                                   [Auth event logging]
```

### 11.2 Files to Modify

```
MODIFY FILES (8):
------------------
src/App.tsx                          [Switch to RouterProvider]
src/pages/SignInPage.tsx             [Wire up useAuth signIn]
src/pages/SignUpPage.tsx             [Wire up useAuth signUp]
src/pages/ForgotPasswordPage.tsx     [Wire up useAuth resetPassword]
src/pages/UpdatePasswordPage.tsx     [New - password reset completion]
src/pages/LandingPage.tsx            [Show auth state in nav]
src/pages/DashboardPage.tsx          [Add logout button, show user]
src/pages/PlatformsPage.tsx          [Add platform connect buttons]
index.html                           [Add Google GIS script, CSP]
```

### 11.3 Key Code Patterns Summary

```typescript
// Pattern 1: Check auth status anywhere
const { isAuthenticated, user, isLoading } = useAuth();

// Pattern 2: Access auth actions
const { signIn, signOut } = useAuth();
await signIn(email, password);

// Pattern 3: Conditionally render based on auth
{isAuthenticated ? <DashboardLink /> : <SignInLink />}

// Pattern 4: Check permission (tenant RBAC)
const { hasPermission } = useTenant();
{hasPermission('campaigns:write') && <CreateCampaignButton />}

// Pattern 5: API request with auth header
const { data } = await api.get('/campaigns'); // Token auto-attached

// Pattern 6: Platform OAuth
const { initiateOAuth } = usePlatformOAuth();
<button onClick={() => initiateOAuth('meta')}>

// Pattern 7: Route guard usage (in router)
<Route element={<ProtectedRoute />}>
  <Route path="dashboard" element={<Dashboard />} />
</Route>
```

---

## 12. Appendix: OAuth Flow Diagrams

### 12.1 Meta (Facebook) OAuth Flow

```
+--------+                                          +-------------+
|  User  |                                          |  Meta OAuth |
+---+----+                                          +------+------+
    |                                                      |
    | 1. Click "Connect Meta"                             |
    |----------------------------------------------------->|
    |                                                      |
    | 2. Redirect to facebook.com/v18.0/dialog/oauth     |
    |    ?client_id=xxx&scope=ads_read,ads_management     |
    |    &redirect_uri=/oauth/callback&state=xxx          |
    |<-----------------------------------------------------|
    |                                                      |
    | 3. User logs in to Facebook & authorizes app        |
    |                                                      |
    | 4. Redirect to /oauth/callback?code=xxx&state=xxx  |
    |----------------------------------------------------->|
    |                                                      |
+---+----+                                          +------+------+
|  React |                                          |  Supabase   |
|   SPA  |                                          |   Edge Fn   |
+---+----+                                          +------+------+
    |                                                      |
    | 5. POST code + verifier to Edge Function            |
    |----------------------------------------------------->|
    |                                                      |
    | 6. Edge Function exchanges code for tokens          |
    |    (POST graph.facebook.com/oauth/access_token)      |
    |    (uses app_secret - never exposed to client)      |
    |                                                     |---+
    |                                                      |   |
    | 7. Edge Function stores encrypted tokens in DB      |<--+
    |    Returns success to client                         |
    |<-----------------------------------------------------|
    |                                                      |
    | 8. Poll /platform_connections - shows connected     |
    |                                                      |
    v                                                      v
```

### 12.2 Google Identity Services (GIS) Flow

```
+--------+                                    +------------------+
|  User  |                                    |  Google Identity  |
+---+----+                                    +--------+---------+
    |                                                   |
    | 1. Google script renders "Sign in with Google"   |
    |    button automatically                           |
    |                                                   |
    | 2. User clicks button                             |
    |                                                   |
    | 3. Google popup - user selects account            |
    |                                                   |
    | 4. Google returns ID token (JWT) to client        |
    |<--------------------------------------------------|
    |                                                   |
+---+----+                                    +--------+---------+
|  React |                                    |    Supabase      |
|   SPA  |                                    +--------+---------+
    |                                                   |
    | 5. Call supabase.auth.signInWithIdToken({         |
    |      provider: 'google',                           |
    |      token: googleCredential                      |
    |    })                                             |
    |-------------------------------------------------->|
    |                                                   |
    | 6. Supabase verifies Google JWT signature,        |
    |    creates/updates user, returns Supabase session  |
    |<--------------------------------------------------|
    |                                                   |
    v                                                   v
```

### 12.3 TikTok OAuth Flow

```
+--------+                                          +---------------+
|  User  |                                          |  TikTok OAuth |
+---+----+                                          +-------+-------+
    |                                                        |
    | 1. Click "Connect TikTok"                             |
    |                                                       |
    | 2. GET tiktok.com/v2/auth/authorize/                  |
    |    ?client_key=xxx&scope=user.info.basic,ads.read     |
    |    &redirect_uri=/oauth/callback&response_type=code   |
    |    &state=xxx&code_challenge=xxx&code_challenge_method=S256 |
    |------------------------------------------------------>|
    |                                                       |
    | 3. User authorizes app                                |
    |                                                       |
    | 4. Redirect to /oauth/callback?code=xxx&state=xxx    |
    |<------------------------------------------------------|
    |                                                       |
+---+----+                                          +-------+-------+
|  React |                                          |  Supabase     |
|   SPA  |                                          |  Edge Fn      |
+---+----+                                          +-------+-------+
    |                                                       |
    | 5. POST code + verifier to Edge Function             |
    |------------------------------------------------------>|
    |                                                       |
    | 6. Edge Function POST open.tiktokapis.com/v2/oauth/token |
    |    { client_key, client_secret, code, grant_type=authorization_code }
    |                                                       |
    | 7. Returns: { access_token, refresh_token, expires_in, scope } |
    |<------------------------------------------------------|
    |                                                       |
    | 8. Edge Function encrypts & stores tokens             |
    |    Returns { success: true }                          |
    |<------------------------------------------------------|
    v                                                       v
```

### 12.4 Snap OAuth Flow

```
+--------+                                          +---------------+
|  User  |                                          |  Snap OAuth   |
+---+----+                                          +-------+-------+
    |                                                        |
    | 1. Click "Connect Snap"                               |
    |                                                       |
    | 2. GET accounts.snapchat.com/accounts/oauth2/auth     |
    |    ?client_id=xxx&scope=user.display_name,...         |
    |    &redirect_uri=/oauth/callback&response_type=code   |
    |    &state=xxx&code_challenge=xxx&code_challenge_method=S256 |
    |------------------------------------------------------>|
    |                                                       |
    | 3. User authorizes app                                |
    |                                                       |
    | 4. Redirect to /oauth/callback?code=xxx&state=xxx    |
    |<------------------------------------------------------|
    |                                                       |
+---+----+                                          +-------+-------+
|  React |                                          |  Supabase     |
|   SPA  |                                          |  Edge Fn      |
+---+----+                                          +-------+-------+
    |                                                       |
    | 5. POST code + verifier to Edge Function             |
    |------------------------------------------------------>|
    |                                                       |
    | 6. Edge Function POST accounts.snapchat.com/accounts/oauth2/token |
    |    { client_id, client_secret, code, grant_type=authorization_code, code_verifier } |
    |                                                       |
    | 7. Returns: { access_token, refresh_token, expires_in } |
    |<------------------------------------------------------|
    |                                                       |
    | 8. Edge Function encrypts & stores tokens             |
    |    Returns { success: true }                          |
    |<------------------------------------------------------|
    v                                                       v
```

### 12.5 Token Refresh Sequence (All Platforms)

```
+------------+     +----------------+     +-------------------+     +------------------+
| Scheduler  |     | Supabase Edge  |     | DB: platform_     |     | Platform API      |
| (cron,     |     | Function       |     |     connections   |     | (token endpoint)  |
| every 6h)  |     |                |     |                   |     |                   |
+-----+------+     +-------+--------+     +---------+---------+     +---------+---------+
      |                    |                       |                         |
      | 1. Trigger         |                       |                         |
      |------------------->|                       |                         |
      |                    | 2. SELECT * WHERE     |                         |
      |                    |    expires_at < now+24h|                         |
      |                    |---------------------->|                         |
      |                    |                       |                         |
      |                    | 3. Return connections |                         |
      |                    |<----------------------|                         |
      |                    |                       |                         |
      |                    | 4. For each: POST /token                         |
      |                    |    { refresh_token, grant_type=refresh_token }   |
      |                    |----------------------------------------------->|
      |                    |                       |                         |
      |                    | 5. New access_token + refresh_token              |
      |                    |<-----------------------------------------------|
      |                    |                       |                         |
      |                    | 6. UPDATE connections |                         |
      |                    |    SET encrypted_access_token = new_token       |
      |                    |    SET encrypted_refresh_token = new_token      |
      |                    |    SET expires_at = new_expiry                   |
      |                    |---------------------->|                         |
      |                    |                       |                         |
      | 7. Return count    |                       |                         |
      |<-------------------|                       |                         |
      |                    |                       |                         |
      v                    v                       v                         v
```

---

## References

| Source | Topic | Citation |
|--------|-------|----------|
| CodeSignal | Authentication Context Pattern | [^25^] |
| LogRocket | React Router v7 Authentication Guide | [^24^] |
| Robin Wieruch | React Router 7 Private Routes | [^31^] |
| CoreUI | Protected Route HOC Pattern | [^26^] |
| Dev.to | React Router v7 Protected Routes with Roles | [^33^] |
| Curity | JWT Security Best Practices | [^37^] |
| Security StackExchange | Auto-refreshing Access Tokens | [^30^] |
| TikTok for Developers | OAuth v2 Token Management | [^34^] |
| TikTok Medium Guide | TikTok OAuth React Integration | [^38^] |
| Snap for Developers | Login Kit OAuth Flow | [^55^][^58^] |
| HiBit | Facebook OAuth2.0 Web Implementation | [^63^] |
| Medium | Facebook Business Login with React | [^73^] |
| Marmelab | Google OAuth in React (GIS) | [^32^] |
| Supabase Docs | Auth Session Management | [^51^][^54^] |
| WorkOS | Multi-Tenant SaaS Architecture | [^64^] |
| WorkOS | Multi-Tenant RBAC Design | [^27^] |
| Clerk Blog | Multi-Tenant SaaS Architecture | [^67^] |
| Wisp Blog | Token Storage: localStorage vs httpOnly | [^53^] |
| Descope | JWT Storage Developer Guide | [^59^] |
| Dev.to | Silent Refresh Implementation | [^62^] |

---

*End of Specification*
