const ORIGINAL_ENV = process.env;

type LoadedDetectFatigueWorker = typeof import('../../src/workers/detect-fatigue');

const getRedisClientMock = jest.fn();

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

async function loadDetectFatigueWorker(
  env: Record<string, string | undefined> = {},
): Promise<LoadedDetectFatigueWorker> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-detect-fatigue-worker-tests-only',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    REDIS_URL: 'redis://localhost:6379',
    ...env,
  };

  return import('../../src/workers/detect-fatigue');
}

describe('detect fatigue worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClientMock.mockReturnValue({ status: 'ready' });
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    const mod = await loadDetectFatigueWorker();
    await mod.stopDetectFatigueWorker();
  });

  describe('buildFatigueJobId', () => {
    it('builds a deterministic job id from workspace and timestamp', async () => {
      const mod = await loadDetectFatigueWorker();
      expect(mod.buildFatigueJobId('ws-123', 1_700_000_000_000)).toBe(
        'fatigue-ws-123-1700000000000',
      );
    });
  });

  describe('classifyFatigueSeverity', () => {
    it('classifies scores into healthy, warning, and critical bands', async () => {
      const mod = await loadDetectFatigueWorker();
      expect(mod.classifyFatigueSeverity(40)).toBe('healthy');
      expect(mod.classifyFatigueSeverity(60)).toBe('warning');
      expect(mod.classifyFatigueSeverity(80)).toBe('critical');
    });
  });

  describe('calculateCompositeFatigueScore', () => {
    it('weights CTR, frequency, and conversion trends into a 0-100 score', async () => {
      const mod = await loadDetectFatigueWorker();
      const decliningTrend = {
        slope: -0.2,
        intercept: 1,
        r2: 0.8,
        trend: 'declining' as const,
        values: [],
      };
      const growingTrend = {
        slope: 0.2,
        intercept: 1,
        r2: 0.8,
        trend: 'declining' as const,
        values: [],
      };

      const score = mod.calculateCompositeFatigueScore(
        decliningTrend,
        growingTrend,
        decliningTrend,
      );

      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeMetricTrend', () => {
    it('detects declining CTR trends from daily values', async () => {
      const mod = await loadDetectFatigueWorker();
      const trend = mod.analyzeMetricTrend(
        [
          { date: '2026-06-01', value: 2.5 },
          { date: '2026-06-02', value: 2.0 },
          { date: '2026-06-03', value: 1.5 },
          { date: '2026-06-04', value: 1.0 },
        ],
        -0.05,
        0.02,
      );

      expect(trend.trend).toBe('declining');
      expect(trend.slope).toBeLessThan(0);
    });
  });

  describe('calculateR2', () => {
    it('returns 1 for a perfect linear fit', async () => {
      const mod = await loadDetectFatigueWorker();
      const r2 = mod.calculateR2([0, 1, 2, 3], [1, 2, 3, 4], 1, 1);
      expect(r2).toBeCloseTo(1, 5);
    });
  });

  describe('feature flag gating', () => {
    it('does not start unless BACKGROUND_JOBS_ENABLED is true', async () => {
      const mod = await loadDetectFatigueWorker({ BACKGROUND_JOBS_ENABLED: 'false' });

      const status = await mod.startDetectFatigueWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_JOBS_ENABLED is not true');
      expect(mod.detectFatigueWorker).toBeNull();
    });

    it('does not start unless BACKGROUND_DETECT_FATIGUE_ENABLED is true', async () => {
      const mod = await loadDetectFatigueWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_DETECT_FATIGUE_ENABLED: 'false',
      });

      const status = await mod.startDetectFatigueWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_DETECT_FATIGUE_ENABLED is not true');
      expect(mod.detectFatigueWorker).toBeNull();
    });

    it('does not start when Redis is configured but not ready', async () => {
      getRedisClientMock.mockReturnValue({ status: 'connecting' });
      const mod = await loadDetectFatigueWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_DETECT_FATIGUE_ENABLED: 'true',
      });

      const status = await mod.startDetectFatigueWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('Redis is not ready: connecting');
      expect(mod.detectFatigueWorker).toBeNull();
    });

    it('does not enqueue when gated off', async () => {
      const mod = await loadDetectFatigueWorker({ BACKGROUND_JOBS_ENABLED: 'false' });
      const jobId = await mod.enqueueWorkspaceFatigueDetection('ws-123');

      expect(jobId).toBeNull();
    });
  });
});
