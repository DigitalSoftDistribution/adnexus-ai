import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'webhooks' as any });
  return {
    title: t('title'),
  };
}

export default function WebhooksPage() {
  const t = useTranslations('webhooks');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <div className="rounded-lg border p-12 text-center">
        <p className="text-muted-foreground">{t('comingSoon')}</p>
      </div>
    </div>
  );
}
