import { jest } from '@jest/globals';

// ─── Mock DB Connection (no real DB in test) ─────────────────────

jest.mock('../src/db/connection', () => ({
  getPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    connect: jest.fn().mockResolvedValue({ query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  getClient: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
}));

// ─── Environment Setup ───────────────────────────────────────────

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.META_APP_ID = 'test-meta-app-id';
process.env.META_APP_SECRET = 'test-meta-app-secret';
process.env.META_API_VERSION = 'v19.0';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'test-google-developer-token';
process.env.GOOGLE_ADS_API_BASE_URL = 'http://localhost:8080';
process.env.GOOGLE_OAUTH_TOKEN_URL = 'http://localhost:8080/token';
process.env.GOOGLE_OAUTH_TOKEN_INFO_URL = 'http://localhost:8080/tokeninfo';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.STRIPE_SECRET_KEY = 'sk_test_stripe';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.STRIPE_PRICE_GROWTH = 'price_123';
process.env.STRIPE_PRICE_PRO = 'price_pro_test';

// Effectively disable rate limiting under test. Supertest issues every request
// from the same loopback IP, so the default per-IP limits (20/min) would
// otherwise trip 429s partway through a suite as the in-memory counter
// accumulates across tests.
process.env.RATE_LIMIT_AUTHENTICATED = '1000000';
process.env.RATE_LIMIT_UNAUTHENTICATED = '1000000';
process.env.RATE_LIMIT_WEBHOOK = '1000000';

// ─── Mock External Modules ───────────────────────────────────────

// Mock ioredis
jest.mock('ioredis', () => {
  // A minimal pub/sub subscriber client returned by client.duplicate().
  // The realtime EventBus duplicates the client and calls subscribe/psubscribe
  // (both promise-returning) plus on('message', ...).
  const makeSubscriber = () => ({
    on: jest.fn(),
    subscribe: jest.fn().mockResolvedValue(1),
    psubscribe: jest.fn().mockResolvedValue(1),
    unsubscribe: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
  });
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    exists: jest.fn().mockResolvedValue(0),
    ttl: jest.fn().mockResolvedValue(-1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    publish: jest.fn().mockResolvedValue(0),
    // EventBus.setupRedisSubscription() duplicates the client for pub/sub.
    duplicate: jest.fn().mockImplementation(makeSubscriber),
    multi: jest.fn().mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([[null, 1], [null, 1]]),
    }),
    status: 'ready',
  }));
});

// Mock supabase
jest.mock('../src/lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockImplementation(function (this: unknown, cb: (result: unknown) => unknown) {
        return Promise.resolve(cb.call(this, { data: null, error: null }));
      }),
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

// Mock axios for Meta/Google API calls
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({ data: {} }),
    post: jest.fn().mockResolvedValue({ data: {} }),
    delete: jest.fn().mockResolvedValue({ data: {} }),
    put: jest.fn().mockResolvedValue({ data: {} }),
    patch: jest.fn().mockResolvedValue({ data: {} }),
    request: jest.fn().mockResolvedValue({ data: {} }),
    create: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: {} }),
      post: jest.fn().mockResolvedValue({ data: {} }),
      request: jest.fn().mockResolvedValue({ data: {} }),
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    }),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    defaults: { headers: { common: {} } },
  },
}));

// Mock bullmq
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  })),
  Job: jest.fn(),
}));

// Mock stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_test', status: 'active' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test' }),
      cancel: jest.fn().mockResolvedValue({ id: 'sub_test' }),
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    products: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    prices: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'cs_test', url: 'https://checkout.stripe.com/test' }),
        retrieve: jest.fn().mockResolvedValue({ id: 'cs_test' }),
      },
    },
    webhooks: {
      constructEvent: jest.fn().mockReturnValue({ type: 'checkout.session.completed' }),
    },
  }));
});

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
  validate: jest.fn().mockReturnValue(true),
}));

// Mock OpenAI (if used)
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock AI response' } }],
        }),
      },
    },
  })),
}));

// Mock SendGrid/email service
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{}]),
}));

// ─── Console Suppression in Tests ────────────────────────────────

const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  // Suppress console noise during tests unless explicitly debugging
  console.error = jest.fn((...args: unknown[]) => {
    // Still log actual errors that aren't expected mock errors
    const msg = args[0]?.toString() ?? '';
    if (msg.includes('Fatal') || msg.includes('CRITICAL')) {
      originalConsoleError.apply(console, args);
    }
  });
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// ─── Global Test Timeout ─────────────────────────────────────────

jest.setTimeout(10000);

// ─── Cleanup Between Tests ───────────────────────────────────────

afterEach(() => {
  jest.clearAllMocks();
});
