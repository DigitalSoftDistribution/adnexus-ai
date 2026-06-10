'use client';

import { useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from '@/i18n/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';

export default function OnboardingPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/auth/signin');
    }
  }, [isLoading, isAuthenticated, router]);

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

  return <OnboardingContent />;
}
