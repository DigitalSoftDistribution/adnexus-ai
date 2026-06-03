'use client';

import { useLocale } from 'next-intl';
import { useAuth } from '@/providers/AuthProvider';
import { redirect } from '@/i18n/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OnboardingContent } from '@/components/onboarding/OnboardingContent';

export default function OnboardingPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const locale = useLocale();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    redirect({ href: '/auth/signin', locale });
  }

  return <OnboardingContent />;
}
