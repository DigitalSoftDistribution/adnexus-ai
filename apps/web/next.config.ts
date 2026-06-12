import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Points next-intl at the request config so server components, static
// prerendering, and metadata generation can all resolve messages/locale.
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const legalAliasRedirects = ['privacy', 'terms', 'cookies', 'dpa'] as const;
const localePattern = 'de|en|es|fr|it|ja|nl|pl|pt|ru';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,

  async redirects() {
    return [
      ...legalAliasRedirects.flatMap((page) => [
        {
          source: `/${page}`,
          destination: `/legal/${page}`,
          permanent: true,
        },
        {
          source: `/:locale(${localePattern})/${page}`,
          destination: `/:locale/legal/${page}`,
          permanent: true,
        },
      ]),
      {
        source: `/:locale(${localePattern})/signup`,
        destination: `/:locale/auth/signup`,
        permanent: true,
      },
      {
        source: `/:locale(${localePattern})/dashboard/agent`,
        destination: `/:locale/dashboard/ai-agent`,
        permanent: true,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'platform-lookaside.fbsbx.com' },
    ],
  },

  // Bundle optimization (Webpack mode)
  webpack(config, { isServer }) {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 10,
          },
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: 'recharts',
            chunks: 'all',
            priority: 10,
          },
        },
      };
    }
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/api/v2/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3001'}/api/v2/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL || 'http://localhost:3001'}/api/v1/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self';`,
          },
        ],
      },
      {
        source: '/:path*.{js,css}',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
