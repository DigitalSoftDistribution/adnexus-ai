const ORIGINAL_ENV = process.env;

type LoadedMetricsSyncWorker = typeof import('../../src/workers/metrics-sync');

const getRedisClientMock = jest.fn();

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

async function loadMetricsSyncWorker(
  env: Record<string, string | undefined> = {},
): Promise<LoadedMetricsSyncWorker> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-metrics-sync-worker-tests-only',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    REDIS_URL: 'redis://localhost:6379',
    ...env,
  };

  return import('../../src/workers/metrics-sync');
}

describe('metrics sync worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClientMock.mockReturnValue({ status: 'ready' });
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    const mod = await loadMetricsSyncWorker();
    await mod.stopMetricsSyncWorker();
  });

  describe('buildMetricsSyncJobId', () => {
    it('builds a deterministic job id from workspace and timestamp', async () => {
      const mod = await loadMetricsSyncWorker();
      expect(mod.buildMetricsSyncJobId('ws-123', 1_700_000_000_000)).toBe(
        'sync-ws-123-1700000000000',
      );
    });
  });

  describe('getMetricsSyncDateRange', () => {
    it('uses a 7-day lookback for incremental sync', async () => {
      const mod = await loadMetricsSyncWorker();
      const now = new Date('2026-06-10T12:00:00.000Z');
      expect(mod.getMetricsSyncDateRange('incremental', now)).toEqual({
        dateStart: '2026-06-03',
        dateEnd: '2026-06-10',
      });
    });

    it('uses a 30-day lookback for full sync', async () => {
      const mod = await loadMetricsSyncWorker();
      const now = new Date('2026-06-10T12:00:00.000Z');
      expect(mod.getMetricsSyncDateRange('full', now)).toEqual({
        dateStart: '2026-05-11',
        dateEnd: '2026-06-10',
      });
    });
  });

  describe('evaluateTokenExpiry', () => {
    it('treats tokens inside the refresh buffer as expired', async () => {
      const mod = await loadMetricsSyncWorker();
      const now = new Date('2026-06-10T12:00:00.000Z');
      const decision = mod.evaluateTokenExpiry('2026-06-10T12:04:00.000Z', now);

      expect(decision.valid).toBe(false);
      expect(decision.expiresAt?.toISOString()).toBe('2026-06-10T12:04:00.000Z');
    });

    it('treats tokens outside the refresh buffer as valid', async () => {
      const mod = await loadMetricsSyncWorker();
      const now = new Date('2026-06-10T12:00:00.000Z');
      const decision = mod.evaluateTokenExpiry('2026-06-10T13:00:00.000Z', now);

      expect(decision.valid).toBe(true);
    });
  });

  describe('shouldMarkAccountRefreshNeeded', () => {
    it('detects token refresh failures', async () => {
      const mod = await loadMetricsSyncWorker();
      expect(mod.shouldMarkAccountRefreshNeeded('Token refresh failed: unauthorized')).toBe(true);
      expect(mod.shouldMarkAccountRefreshNeeded('Campaign budget too low')).toBe(false);
    });
  });

  describe('dedupeWorkspaceIds', () => {
    it('returns unique workspace ids in first-seen order', async () => {
      const mod = await loadMetricsSyncWorker();
      expect(
        mod.dedupeWorkspaceIds([
          { workspace_id: 'ws-a' },
          { workspace_id: 'ws-b' },
          { workspace_id: 'ws-a' },
        ]),
      ).toEqual(['ws-a', 'ws-b']);
    });
  });

  describe('feature flag gating', () => {
    it('does not start unless BACKGROUND_JOBS_ENABLED is true', async () => {
      const mod = await loadMetricsSyncWorker({ BACKGROUND_JOBS_ENABLED: 'false' });

      const status = await mod.startMetricsSyncWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_JOBS_ENABLED is not true');
      expect(mod.metricsSyncWorker).toBeNull();
    });

    it('does not start unless BACKGROUND_METRICS_SYNC_ENABLED is true', async () => {
      const mod = await loadMetricsSyncWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_METRICS_SYNC_ENABLED: 'false',
      });

      const status = await mod.startMetricsSyncWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_METRICS_SYNC_ENABLED is not true');
      expect(mod.metricsSyncWorker).toBeNull();
    });

    it('does not start when Redis is configured but not ready', async () => {
      getRedisClientMock.mockReturnValue({ status: 'connecting' });
      const mod = await loadMetricsSyncWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_METRICS_SYNC_ENABLED: 'true',
      });

      const status = await mod.startMetricsSyncWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('Redis is not ready: connecting');
      expect(mod.metricsSyncWorker).toBeNull();
    });

    it('does not enqueue when gated off', async () => {
      const mod = await loadMetricsSyncWorker({ BACKGROUND_JOBS_ENABLED: 'false' });
      const jobId = await mod.triggerMetricsSync('ws-123');

      expect(jobId).toBeNull();
    });
  });
});
