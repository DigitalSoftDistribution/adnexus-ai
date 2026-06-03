import { getTranslations } from 'next-intl/server';
import { IntegrationsContent } from '@/components/integrations/IntegrationsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'integrations' as never });
  return {
    title: t('title'),
  };
}

export default function IntegrationsPage() {
  return <IntegrationsContent />;
}
