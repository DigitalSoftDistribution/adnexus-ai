import { getTranslations } from 'next-intl/server';
import { AcceptInviteForm } from '@/components/auth/AcceptInviteForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' as any });
  return {
    title: t('acceptInviteTitle'),
  };
}

// Token is passed as a query param (?token=<jwt>) rather than a path segment:
// invite tokens are JWTs containing dots, and the next-intl middleware matcher
// skips dotted paths, so a `/auth/invite/<jwt>` path would never get locale
// routing and would 404. This mirrors the working password-reset flow.
export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <AcceptInviteForm token={token ?? ''} />
    </div>
  );
}
