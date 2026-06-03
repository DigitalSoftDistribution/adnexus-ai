import { getTranslations } from 'next-intl/server';
import { WebhooksContent } from '@/components/webhooks/WebhooksContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'webhooks' as never });
  return {
    title: t('title'),
  };
}

export default function WebhooksPage() {
  return <WebhooksContent />;
}
