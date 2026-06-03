import { getTranslations } from 'next-intl/server';
import { AIAgentContent } from '@/components/ai-agent/AIAgentContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'aiAgent' as any });
  return {
    title: t('title'),
  };
}

export default function AIAgentPage() {
  return <AIAgentContent />;
}
