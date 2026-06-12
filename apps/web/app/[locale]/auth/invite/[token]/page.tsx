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

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <AcceptInviteForm token={decodeURIComponent(token)} />
    </div>
  );
}
