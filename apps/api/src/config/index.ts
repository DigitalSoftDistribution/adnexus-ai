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

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().default(''),

  TIKTOK_APP_ID: z.string().default(''),
  TIKTOK_APP_SECRET: z.string().default(''),

  SNAP_CLIENT_ID: z.string().default(''),
  SNAP_CLIENT_SECRET: z.string().default(''),

  // Billing
  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PUBLISHABLE_KEY: z.string().default(''),

  // MCP
  MCP_API_KEY: z.string().default(''),
  MCP_TRANSPORT: z.string().default('stdio'),

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
    graphUrl: 'https://graph.facebook.com',
  },

  google: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    developerToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
  },

  tiktok: {
    appId: env.TIKTOK_APP_ID,
    appSecret: env.TIKTOK_APP_SECRET,
  },

  snap: {
    clientId: env.SNAP_CLIENT_ID,
    clientSecret: env.SNAP_CLIENT_SECRET,
  },

  stripe: {
    secretKey: env.STRIPE_SECRET_KEY,
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
  },

  mcp: {
    apiKey: env.MCP_API_KEY,
    transport: env.MCP_TRANSPORT,
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
} as const;

export type Config = typeof config;
export type Plan = keyof typeof config.plans;

export const isProduction = config.nodeEnv === 'production';
export const isDevelopment = config.nodeEnv === 'development';
export const isTest = config.nodeEnv === 'test';

export default config;
