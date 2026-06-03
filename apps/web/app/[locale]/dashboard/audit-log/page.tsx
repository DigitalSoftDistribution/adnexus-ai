import { getTranslations } from 'next-intl/server';
import { AuditLogContent } from '@/components/audit-log/AuditLogContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auditLog' as never });
  return { title: t('title') };
}

export default function AuditLogPage() {
  return <AuditLogContent />;
}
