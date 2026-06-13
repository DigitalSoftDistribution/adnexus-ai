import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// ═══════════════════════════════════════════════════════════════
//  Unified Environment Schema (Zod-validated)
//  Fixes naming drift between .env.example and old config
// ═══════════════════════════════════════════════════════════════

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('adnexus'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default(''),
  DB_SSL: z.string().default('false'),
  DB_SSL_CA: z.string().default(''),
  DB_POOL_SIZE: z.coerce.number().default(20),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().default(''),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // Background jobs (default-off; see PR #79 scheduler gating pattern)
  BACKGROUND_JOBS_ENABLED: z.string().default('false'),
  BACKGROUND_EVALUATE_RULES_ENABLED: z.string().default('false'),
  BACKGROUND_METRICS_SYNC_ENABLED: z.string().default('false'),
  BACKGROUND_REPORT_GENERATOR_ENABLED: z.string().default('false'),
  BACKGROUND_ONBOARDING_EMAILS_ENABLED: z.string().default('false'),
  BACKGROUND_DETECT_FATIGUE_ENABLED: z.string().default('false'),

  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),

  // Rate limits
  RATE_LIMIT_AUTHENTICATED: z.coerce.number().default(100),
  RATE_LIMIT_UNAUTHENTICATED: z.coerce.number().default(20),
  RATE_LIMIT_WEBHOOK: z.coerce.number().default(200),
  RATE_LIMIT_BURST_MULTIPLIER: z.coerce.number().default(3),

  // Frontend
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Platform APIs
  META_APP_ID: z.string().default(''),
  META_APP_SECRET: z.string().default(''),
  META_API_VERSION: z.string().default('v19.0'),
  META_GRAPH_URL: z.string().url().default('https://graph.facebook.com'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().default(''),
  GOOGLE_ADS_API_BASE_URL: z.string().url().default('https://googleads.googleapis.com'),
  GOOGLE_ADS_API_URL: z.string().url().default('https://googleads.googleapis.com/v16'),
  GOOGLE_OAUTH_URL: z.string().url().default('https://accounts.google.com/o/oauth2/v2/auth'),
  GOOGLE_OAUTH_TOKEN_URL: z.string().url().default('https://oauth2.googleapis.com/token'),
  GOOGLE_TOKEN_URL: z.string().url().default('https://oauth2.googleapis.com/token'),
  GOOGLE_OAUTH_TOKEN_INFO_URL: z.string().url().default('https://oauth2.googleapis.com/tokeninfo'),
  GOOGLE_TOKEN_INFO_URL: z.string().url().default('https://oauth2.googleapis.com/tokeninfo'),

  // Preview/dev QA harness for fake Meta/Google traffic. Disabled by default.
  MOCK_TRAFFIC_HARNESS_ENABLED: z.string().default('false'),
  MOCK_TRAFFIC_HARNESS_CONTEXT: z.string().default(''),
  MOCK_TRAFFIC_HARNESS_KEY: z.string().default(''),

  TIKTOK_APP_ID: z.string().default(''),
  TIKTOK_APP_SECRET: z.string().default(''),
  TIKTOK_API_URL: z.string().url().default('https://business-api.tiktok.com/open_api/v1.3'),

  SNAP_CLIENT_ID: z.string().default(''),
  SNAP_CLIENT_SECRET: z.string().default(''),
  SNAP_API_BASE_URL: z.string().url().default('https://adsapi.snapchat.com/v1'),
  SNAP_OAUTH_BASE_URL: z.string().url().default('https://accounts.snapchat.com/accounts/oauth2'),
  ENABLE_MOCK_SOCIAL_SYNC: z.string().default('false'),
  /** Preview QA: allow WireMock live sync for mock-traffic harness accounts without real OAuth. */
  MOCK_PLATFORM_SYNC: z.string().default('false'),

  // Billing
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),
  STRIPE_PRICE_STARTER: z.string().default(''),
  STRIPE_PRICE_GROWTH: z.string().default(''),
  STRIPE_PRICE_PRO: z.string().default(''),
  STRIPE_PRICE_ENTERPRISE: z.string().default(''),
  STRIPE_PRICE_ID_STARTER: z.string().default(''),
  STRIPE_PRICE_ID_GROWTH: z.string().default(''),
  STRIPE_PRICE_ID_PRO: z.string().default(''),
  STRIPE_PRICE_ID_ENTERPRISE: z.string().default(''),

  // MCP
  MCP_API_KEY: z.string().default(''),
  MCP_TRANSPORT: z.string().default('stdio'),

  // RAG / Vector (Qdrant + Voyage)
  QDRANT_URL: z.string().url().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().default(''),
  VOYAGE_API_KEY: z.string().default(''),
  VOYAGE_EMBED_MODEL: z.string().default('voyage-3'),
  VOYAGE_RERANK_MODEL: z.string().default('rerank-2'),
  RAG_COLLECTION_PREFIX: z.string().default('adnexus'),
  RAG_SCORE_FLOOR: z.coerce.number().default(0.5),
  RAG_DECAY_DAYS: z.coerce.number().default(180),
  RAG_ENABLED: z.string().default('true'),

  // Competitor scraping (Firecrawl)
  FIRECRAWL_API_KEY: z.string().default(''),
  FIRECRAWL_BASE_URL: z.string().url().default('https://api.firecrawl.dev'),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
});

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  throw new Error(
    `[Config] Environment validation failed:\n${issues.join('\n')}`
  );
}

const env = parsedEnv.data;

export const BRANCH_PREVIEW_HOST_SUFFIX = '.apps.softblaze.net';

function isAllowedBranchPreviewOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) {
      return false;
    }

    const hostname = url.hostname.toLowerCase();
    if (!hostname.endsWith(BRANCH_PREVIEW_HOST_SUFFIX)) {
      return false;
    }

    const previewLabel = hostname.slice(0, -BRANCH_PREVIEW_HOST_SUFFIX.length);
    return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(previewLabel);
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(origin: string, allowedOrigins: readonly string[]): boolean {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return isAllowedBranchPreviewOrigin(origin);
}

// ═══════════════════════════════════════════════════════════════
//  Typed Config Object
// ═══════════════════════════════════════════════════════════════

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  logLevel: env.LOG_LEVEL,

  supabase: {
    url: env.SUPABASE_URL,
    serviceKey: env.SUPABASE_SERVICE_KEY,
    anonKey: env.SUPABASE_ANON_KEY,
  },

  jwt: {
    secret: env.JWT_SECRET,
    accessExpiry: env.JWT_ACCESS_EXPIRY,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
    // Legacy aliases for backward compatibility during migration
    get expiresIn() { return this.accessExpiry; },
    get refreshExpiresIn() { return this.refreshExpiry; },
  },

  redis: {
    url: env.REDIS_URL,
  },

  backgroundJobs: {
    enabled: env.BACKGROUND_JOBS_ENABLED === 'true',
    evaluateRulesEnabled: env.BACKGROUND_EVALUATE_RULES_ENABLED === 'true',
    metricsSyncEnabled: env.BACKGROUND_METRICS_SYNC_ENABLED === 'true',
    reportGeneratorEnabled: env.BACKGROUND_REPORT_GENERATOR_ENABLED === 'true',
    onboardingEmailsEnabled: env.BACKGROUND_ONBOARDING_EMAILS_ENABLED === 'true',
    detectFatigueEnabled: env.BACKGROUND_DETECT_FATIGUE_ENABLED === 'true',
  },

  cors: {
    origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    credentials: true,
  },

  rateLimit: {
    authenticatedPerMinute: env.RATE_LIMIT_AUTHENTICATED,
    unauthenticatedPerMinute: env.RATE_LIMIT_UNAUTHENTICATED,
    webhookPerMinute: env.RATE_LIMIT_WEBHOOK,
    burstMultiplier: env.RATE_LIMIT_BURST_MULTIPLIER,
  },

  frontend: {
    url: env.FRONTEND_URL,
  },

  meta: {
    appId: env.META_APP_ID,
    appSecret: env.META_APP_SECRET,
    apiVersion: env.META_API_VERSION,
    graphUrl: env.META_GRAPH_URL,
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
    adsApiBaseUrl: env.GOOGLE_ADS_API_BASE_URL,
    adsApiUrl: env.GOOGLE_ADS_API_URL,
    oauthUrl: env.GOOGLE_OAUTH_URL,
    oauthTokenUrl: env.GOOGLE_OAUTH_TOKEN_URL,
    tokenUrl: env.GOOGLE_TOKEN_URL,
    oauthTokenInfoUrl: env.GOOGLE_OAUTH_TOKEN_INFO_URL,
    tokenInfoUrl: env.GOOGLE_TOKEN_INFO_URL,
  },

  mockTrafficHarness: {
    enabled: env.MOCK_TRAFFIC_HARNESS_ENABLED === 'true',
    context: env.MOCK_TRAFFIC_HARNESS_CONTEXT,
    hasKey: env.MOCK_TRAFFIC_HARNESS_KEY.length > 0,
  },

  tiktok: {
    appId: env.TIKTOK_APP_ID,
    appSecret: env.TIKTOK_APP_SECRET,
    apiUrl: env.TIKTOK_API_URL,
  },

  snap: {
    clientId: env.SNAP_CLIENT_ID,
    clientSecret: env.SNAP_CLIENT_SECRET,
    apiBaseUrl: env.SNAP_API_BASE_URL,
    oauthBaseUrl: env.SNAP_OAUTH_BASE_URL,
  },

  socialSync: {
    enableMockTikTokSnap: env.ENABLE_MOCK_SOCIAL_SYNC === 'true',
    mockPlatformSync: env.MOCK_PLATFORM_SYNC === 'true',
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    prices: {
      starter: env.STRIPE_PRICE_STARTER || env.STRIPE_PRICE_ID_STARTER,
      growth: env.STRIPE_PRICE_GROWTH || env.STRIPE_PRICE_ID_GROWTH,
      pro: env.STRIPE_PRICE_PRO || env.STRIPE_PRICE_ID_PRO,
      enterprise: env.STRIPE_PRICE_ENTERPRISE || env.STRIPE_PRICE_ID_ENTERPRISE,
    },
  },

  mcp: {
    apiKey: env.MCP_API_KEY,
    transport: env.MCP_TRANSPORT,
  },

  rag: {
    enabled: env.RAG_ENABLED === 'true',
    qdrantUrl: env.QDRANT_URL,
    qdrantApiKey: env.QDRANT_API_KEY,
    voyageApiKey: env.VOYAGE_API_KEY,
    embedModel: env.VOYAGE_EMBED_MODEL,
    rerankModel: env.VOYAGE_RERANK_MODEL,
    collectionPrefix: env.RAG_COLLECTION_PREFIX,
    scoreFloor: env.RAG_SCORE_FLOOR,
    decayDays: env.RAG_DECAY_DAYS,
  },

  firecrawl: {
    apiKey: env.FIRECRAWL_API_KEY,
    baseUrl: env.FIRECRAWL_BASE_URL,
  },

  database: {
    url: env.DATABASE_URL,
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    ssl: env.DB_SSL === 'true',
    sslCa: env.DB_SSL_CA,
    poolSize: env.DB_POOL_SIZE,
  },

  credits: {
    free: 50,
    growth: 500,
    team: 5000,
    agency: 50000,
  },

  plans: {
    free: { name: 'Free', price: 0, accounts: 1 },
    growth: { name: 'Growth', price: 4900, accounts: 3 },
    team: { name: 'Team', price: 14900, accounts: 10 },
    agency: { name: 'Agency', price: 39900, accounts: 25 },
  },

  version: process.env.npm_package_version ?? '2.0.0',
  sentryDsn: env.SENTRY_DSN,
} as const;

export type Config = typeof config;
export type Plan = keyof typeof config.plans;

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
export const isTest = config.nodeEnv === 'test';

// Re-export for convenience
export const corsOrigins = config.cors.origin;

export default config;
