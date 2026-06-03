import { getTranslations } from 'next-intl/server';
import { useTranslations } from 'next-intl';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'integrations' as any });
  return {
    title: t('title'),
  };
}

export default function IntegrationsPage() {
  const t = useTranslations('integrations');

  const integrations = [
    { nameKey: 'metaAds', status: 'connected' as const, icon: 'M' },
    { nameKey: 'googleAds', status: 'connected' as const, icon: 'G' },
    { nameKey: 'tiktokAds', status: 'available' as const, icon: 'T' },
    { nameKey: 'snapchatAds', status: 'available' as const, icon: 'S' },
    { nameKey: 'slack', status: 'available' as const, icon: 'S' },
    { nameKey: 'stripe', status: 'connected' as const, icon: 'S' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <div key={integration.nameKey} className="rounded-lg border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center font-bold">
                  {integration.icon}
                </div>
                <div>
                  <p className="font-medium">{t(integration.nameKey)}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {t(`status.${integration.status}`)}
                  </p>
                </div>
              </div>
              <button className="text-sm text-primary hover:underline">
                {integration.status === 'connected' ? t('manage') : t('connect')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
