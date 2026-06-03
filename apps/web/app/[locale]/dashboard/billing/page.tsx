import { getTranslations } from 'next-intl/server';
import { BillingContent } from '@/components/billing/BillingContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'billing' as any });
  return {
    title: t('title'),
  };
}

export default function BillingPage() {
  return <BillingContent />;
}
