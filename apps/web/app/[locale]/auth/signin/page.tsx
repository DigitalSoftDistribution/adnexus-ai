import { getTranslations } from 'next-intl/server';
import { SignInForm } from '@/components/auth/SignInForm';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' as any });
  return {
    title: t('signIn'),
  };
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <SignInForm />
    </div>
  );
}
