import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { ogLocales, locales, type Locale } from '@/i18n/config';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    title: {
      default: t('title'),
      template: t('titleTemplate'),
    },
    description: t('description'),
    keywords: t('keywords').split(', '),
    authors: [{ name: 'AdNexus AI' }],
    creator: 'AdNexus AI',
    metadataBase: new URL('https://adnexus.ai'),
    openGraph: {
      type: 'website',
      locale: ogLocales[locale as Locale] ?? ogLocales.en,
      siteName: 'AdNexus AI',
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@adnexusai',
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
