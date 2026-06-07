'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Sparkles, Plug, Users, BarChart3, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Stepper, type StepperStep } from '@/components/ui/stepper';
import { useAuth } from '@/providers/AuthProvider';

interface OnboardingStatus {
  completed: boolean;
  completedAt: string | null;
  currentStep: string | null;
  steps: {
    connectPlatform: boolean;
    inviteTeam: boolean;
    firstCampaign: boolean;
  };
}

export function OnboardingContent() {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [active, setActive] = useState<number | null>(null);

  const { data: status, isLoading } = useQuery({
    queryKey: ['onboarding', 'status'],
    queryFn: async (): Promise<OnboardingStatus> => {
      const res = await fetch('/api/v2/onboarding');
      if (!res.ok) throw new Error('Failed to load onboarding');
      const json = await res.json();
      return json.data;
    },
  });

  useEffect(() => {
    if (status?.completed) {
      router.replace('/dashboard');
    }
  }, [router, status?.completed]);

  const complete = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/v2/onboarding/complete', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const message = body?.error?.message ?? body?.message ?? t('completeBlocked');
        throw new Error(message);
      }
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
      router.replace('/dashboard');
    },
  });

  if (isLoading || status?.completed) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const steps = status?.steps ?? { connectPlatform: false, inviteTeam: false, firstCampaign: false };

  const stepDefs: Array<{
    id: keyof OnboardingStatus['steps'];
    icon: typeof Plug;
    title: string;
    description: string;
    href: string;
    cta: string;
  }> = [
    {
      id: 'connectPlatform',
      icon: Plug,
      title: t('stepConnect'),
      description: t('stepConnectDesc'),
      href: '/dashboard/integrations',
      cta: t('stepConnect'),
    },
    {
      id: 'inviteTeam',
      icon: Users,
      title: t('stepTeam'),
      description: t('stepTeamDesc'),
      href: '/dashboard/settings',
      cta: t('stepTeam'),
    },
    {
      id: 'firstCampaign',
      icon: BarChart3,
      title: t('stepFirstValue'),
      description: t('stepFirstValueDesc'),
      href: '/dashboard',
      cta: t('stepFirstValueCta'),
    },
  ];

  const stepperSteps: StepperStep[] = stepDefs.map((s) => ({ id: s.id, label: s.title }));
  const completedSet = new Set(stepDefs.filter((s) => steps[s.id]).map((s) => s.id));
  const firstIncompleteIndex = stepDefs.findIndex((s) => !steps[s.id]);
  const currentStepIndex = firstIncompleteIndex === -1 ? stepDefs.length - 1 : firstIncompleteIndex;
  const highlightedStepIndex = active ?? currentStepIndex;
  const canComplete = steps.connectPlatform && steps.firstCampaign;

  return (
    <div className="relative min-h-screen bg-background">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="font-space text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-muted-foreground">
            {user?.name ? `${user.name} — ` : ''}
            {t('description')}
          </p>
        </div>

        <Stepper steps={stepperSteps} current={highlightedStepIndex} completed={completedSet} className="mb-8" />

        <div className="space-y-3">
          {stepDefs.map((step, i) => {
            const done = steps[step.id];
            return (
              <Card
                key={step.id}
                className={done ? 'border-success/40' : i === highlightedStepIndex ? 'border-primary/40' : ''}
                onMouseEnter={() => setActive(i)}
              >
                <CardContent className="flex items-center justify-between gap-4 p-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        done ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                  {!done && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={step.href}>
                        {step.cta}
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {complete.isError ? (
          <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {(complete.error as Error).message}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <Button asChild variant="ghost">
            <Link href="/dashboard/campaigns">{t('skip')}</Link>
          </Button>
          <Button onClick={() => complete.mutate()} disabled={complete.isPending || !canComplete}>
            {complete.isPending ? '...' : canComplete ? t('finish') : t('finishLocked')}
          </Button>
        </div>
        {!canComplete ? (
          <p className="mt-3 text-center text-sm text-muted-foreground">{t('finishLockedDescription')}</p>
        ) : null}
      </div>
    </div>
  );
}
