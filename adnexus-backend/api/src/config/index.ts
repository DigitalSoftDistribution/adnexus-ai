import dotenv from 'dotenv';

dotenv.config();

// ─── Helpers ─────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string, defaultValue: string): string;
function optionalEnv(key: string, defaultValue: number): number;
function optionalEnv(key: string, defaultValue: string | number): string | number {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    return defaultValue;
  }
  return typeof defaultValue === 'number' ? parseInt(value, 10) : value;
}

function parseListEnv(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    return defaultValue;
  }
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

// ─── Validation ──────────────────────────────────────────────

function validateConfig(): void {
  // Required variables are validated on access below,
  // but we do a pre-flight check here for early failure.
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET',
  ];

  const missing: string[] = [];
  for (const key of required) {
    const value = process.env[key];
    if (!value || value.trim().length === 0) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Config] Missing ${missing.length} required environment variable(s): ${missing.join(', ')}`
    );
  }
}

// Run validation immediately so the app fails fast on misconfiguration
validateConfig();

// ─── Typed Config ────────────────────────────────────────────

export const config = {
  /** Application environment */
  nodeEnv: optionalEnv('NODE_ENV', 'development'),

  /** Server port */
  port: optionalEnv('PORT', 3001),

  /** Log level for structured logger */
  logLevel: optionalEnv('LOG_LEVEL', 'info'),

  /** Supabase configuration */
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    serviceKey: requireEnv('SUPABASE_SERVICE_KEY'),
    anonKey: optionalEnv('SUPABASE_ANON_KEY', ''),
  },

  /** JWT authentication */
  jwt: {
    secret: requireEnv('JWT_SECRET'),
    expiresIn: optionalEnv('JWT_EXPIRES_IN', '7d'),
    refreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
  },

  /** Redis configuration */
  redis: {
    url: optionalEnv('REDIS_URL', ''),
  },

  /** CORS allowed origins */
  cors: {
    origin: parseListEnv('CORS_ORIGIN', [
      'http://localhost:5173',
      'http://localhost:3000',
    ]),
    credentials: true,
  },

  /** Rate limiting configuration */
  rateLimit: {
    /** Authenticated users: requests per minute (default: 100) */
    authenticatedPerMinute: optionalEnv('RATE_LIMIT_AUTHENTICATED', 100),
    /** Unauthenticated users: requests per minute (default: 20) */
    unauthenticatedPerMinute: optionalEnv('RATE_LIMIT_UNAUTHENTICATED', 20),
    /** Webhook endpoints: requests per minute (default: 200) */
    webhookPerMinute: optionalEnv('RATE_LIMIT_WEBHOOK', 200),
    /** Burst limit multiplier (default: 3x base rate) */
    burstMultiplier: optionalEnv('RATE_LIMIT_BURST_MULTIPLIER', 3),
  },

  /** Frontend URL (for redirects/emails) */
  frontend: {
    url: optionalEnv('FRONTEND_URL', 'http://localhost:5173'),
  },

  /** Platform API credentials */
  meta: {
    appId: optionalEnv('META_APP_ID', ''),
    appSecret: optionalEnv('META_APP_SECRET', ''),
    apiVersion: optionalEnv('META_API_VERSION', 'v19.0'),
    graphUrl: 'https://graph.facebook.com',
  },

  google: {
    clientId: optionalEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: optionalEnv('GOOGLE_CLIENT_SECRET', ''),
    developerToken: optionalEnv('GOOGLE_DEVELOPER_TOKEN', ''),
  },

  tiktok: {
    appId: optionalEnv('TIKTOK_APP_ID', ''),
    appSecret: optionalEnv('TIKTOK_APP_SECRET', ''),
  },

  snap: {
    clientId: optionalEnv('SNAP_CLIENT_ID', ''),
    clientSecret: optionalEnv('SNAP_CLIENT_SECRET', ''),
  },

  /** Stripe billing */
  stripe: {
    secretKey: optionalEnv('STRIPE_SECRET_KEY', ''),
    webhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET', ''),
    publishableKey: optionalEnv('STRIPE_PUBLISHABLE_KEY', ''),
  },

  /** MCP server */
  mcp: {
    apiKey: optionalEnv('MCP_API_KEY', ''),
    transport: optionalEnv('MCP_TRANSPORT', 'stdio'),
  },

  /** Credit limits per plan */
  credits: {
    free: 100,
    pro: 2000,
    premium: 10000,
    agency: 50000,
  },

  /** Plan configuration */
  plans: {
    free: { name: 'Free', price: 0, accounts: 1 },
    pro: { name: 'Pro', price: 9900, accounts: 5 },
    premium: { name: 'Premium', price: 29900, accounts: 20 },
    agency: { name: 'Agency', price: 49900, accounts: 999 },
  },
} as const;

// ─── Derived Types ───────────────────────────────────────────

export type Config = typeof config;
export type Plan = keyof typeof config.plans;

/** Check if running in production */
export const isProduction = config.nodeEnv === 'production';

/** Check if running in development */
export const isDevelopment = config.nodeEnv === 'development';

/** Check if running in test mode */
export const isTest = config.nodeEnv === 'test';

export default config;
