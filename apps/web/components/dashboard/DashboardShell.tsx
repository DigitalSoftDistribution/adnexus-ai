'use client';

import { useAuth } from '@/providers/AuthProvider';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { redirect } from 'next/navigation';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect('/auth/signin');
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} onSignOut={signOut} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
