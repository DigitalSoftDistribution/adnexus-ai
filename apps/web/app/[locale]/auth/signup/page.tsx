import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/components/auth/SignUpForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' as any });
  return {
    title: t('signUp'),
  };
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <SignUpForm />
    </div>
  );
}
