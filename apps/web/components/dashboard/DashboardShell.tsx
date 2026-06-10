'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { redirect, usePathname, useRouter } from '@/i18n/navigation';

const COLLAPSE_KEY = 'adnexus_sidebar_collapsed';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // First-run gate: a brand-new workspace (no completion, no steps done) is sent
  // to the onboarding wizard. Skipped once any step is done or onboarding is
  // completed, so it never traps returning users.
  const { data: onboarding } = useQuery({
    queryKey: ['onboarding', 'status'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const res = await fetch('/api/v2/onboarding');
      if (!res.ok) return null;
      const json = await res.json();
      return json.data as {
        completed: boolean;
        steps: { connectPlatform: boolean; inviteTeam: boolean; firstCampaign: boolean };
      } | null;
    },
  });

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/signin');
    }
  }, [isLoading, isAuthenticated, router]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect fresh workspaces to onboarding (only when we have a definitive
  // "nothing done yet" status, and we're not already past the dashboard root).
  if (
    onboarding &&
    !onboarding.completed &&
    !onboarding.steps.connectPlatform &&
    !onboarding.steps.inviteTeam &&
    !onboarding.steps.firstCampaign &&
    pathname === '/dashboard'
  ) {
    redirect({ href: '/onboarding', locale });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          user={user}
          onSignOut={signOut}
          onOpenMobileNav={() => setMobileOpen(true)}
        />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl animate-fade-in p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
