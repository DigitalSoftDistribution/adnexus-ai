import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space',
});

const jetbrainsMono = JetBrains_Mono({
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
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
