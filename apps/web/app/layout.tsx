import type { Metadata, Viewport } from 'next';
import { Inter, Geist, Geist_Mono } from 'next/font/google';
import { getLocale } from 'next-intl/server';
import { Providers } from '@/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'AdNexus AI — Advertising Intelligence Platform',
    template: '%s | AdNexus AI',
  },
  description: 'AI-powered advertising campaign management, optimization, and analytics platform.',
  keywords: ['advertising', 'AI', 'campaign management', 'marketing', 'analytics'],
  authors: [{ name: 'AdNexus AI' }],
  creator: 'AdNexus AI',
  metadataBase: new URL('https://adnexus.ai'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
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

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0F' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geist.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
