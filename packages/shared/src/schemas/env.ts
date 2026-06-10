import { z } from 'zod';

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Redis
  REDIS_URL: z.string().url().optional(),

  // CORS
  CORS_ORIGINS: z.string().transform((s) => s.split(',').map((o) => o.trim())),

  // Platform APIs
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  TIKTOK_APP_ID: z.string().optional(),
  TIKTOK_APP_SECRET: z.string().optional(),
  SNAP_CLIENT_ID: z.string().optional(),
  SNAP_CLIENT_SECRET: z.string().optional(),

  // Billing
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_STARTER: z.string().optional(),
  STRIPE_PRICE_GROWTH: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTERPRISE: z.string().optional(),
  STRIPE_PRICE_ID_STARTER: z.string().optional(),
  STRIPE_PRICE_ID_GROWTH: z.string().optional(),
  STRIPE_PRICE_ID_PRO: z.string().optional(),
  STRIPE_PRICE_ID_ENTERPRISE: z.string().optional(),

  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
