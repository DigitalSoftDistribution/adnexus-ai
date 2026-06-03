import { getTranslations } from 'next-intl/server';
import { SettingsContent } from '@/components/settings/SettingsContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'settings' as any });
  return {
    title: t('title'),
  };
}

export default function SettingsPage() {
  return <SettingsContent />;
}
