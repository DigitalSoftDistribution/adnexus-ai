const ORIGINAL_ENV = process.env;

type LoadedReportGeneratorWorker = typeof import('../../src/workers/report-generator');

const getRedisClientMock = jest.fn();

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

async function loadReportGeneratorWorker(
  env: Record<string, string | undefined> = {},
): Promise<LoadedReportGeneratorWorker> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-report-generator-worker-tests-only',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    REDIS_URL: 'redis://localhost:6379',
    ...env,
  };

  return import('../../src/workers/report-generator');
}

describe('report generator worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClientMock.mockReturnValue({ status: 'ready' });
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    const mod = await loadReportGeneratorWorker();
    await mod.stopReportGeneratorWorker();
  });

  describe('calculateNextRun', () => {
    it('returns the next daily run for @daily preset', async () => {
      const mod = await loadReportGeneratorWorker();
      const now = new Date('2026-06-10T15:30:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      const nextRun = mod.calculateNextRun('@daily');
      expect(nextRun.getTime()).toBeGreaterThan(now.getTime());

      jest.useRealTimers();
    });

    it('falls back to daily when cron expression is invalid', async () => {
      const mod = await loadReportGeneratorWorker();
      const nextRun = mod.calculateNextRun('not-a-cron');
      expect(nextRun).toBeInstanceOf(Date);
    });
  });

  describe('resolveDateRange', () => {
    it('uses a 7-day lookback by default', async () => {
      const mod = await loadReportGeneratorWorker();
      const now = new Date('2026-06-10T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      expect(mod.resolveDateRange({})).toEqual({
        start: '2026-06-03',
        end: '2026-06-10',
      });

      jest.useRealTimers();
    });

    it('honors custom date ranges when provided', async () => {
      const mod = await loadReportGeneratorWorker();
      expect(
        mod.resolveDateRange({
          dateRange: 'custom',
          dateStart: '2026-05-01',
          dateEnd: '2026-05-31',
        }),
      ).toEqual({
        start: '2026-05-01',
        end: '2026-05-31',
      });
    });
  });

  describe('buildReportGeneratorJobId', () => {
    it('builds a deterministic job id from report id and timestamp', async () => {
      const mod = await loadReportGeneratorWorker();
      expect(mod.buildReportGeneratorJobId('rpt-123', 1_700_000_000_000)).toBe(
        'report-rpt-123-1700000000000',
      );
    });
  });

  describe('feature flag gating', () => {
    it('does not start unless BACKGROUND_JOBS_ENABLED is true', async () => {
      const mod = await loadReportGeneratorWorker({ BACKGROUND_JOBS_ENABLED: 'false' });

      const status = await mod.startReportGeneratorWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_JOBS_ENABLED is not true');
      expect(mod.reportGeneratorWorker).toBeNull();
    });

    it('does not start unless BACKGROUND_REPORT_GENERATOR_ENABLED is true', async () => {
      const mod = await loadReportGeneratorWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_REPORT_GENERATOR_ENABLED: 'false',
      });

      const status = await mod.startReportGeneratorWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_REPORT_GENERATOR_ENABLED is not true');
      expect(mod.reportGeneratorWorker).toBeNull();
    });

    it('does not start when Redis is configured but not ready', async () => {
      getRedisClientMock.mockReturnValue({ status: 'connecting' });
      const mod = await loadReportGeneratorWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_REPORT_GENERATOR_ENABLED: 'true',
      });

      const status = await mod.startReportGeneratorWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('Redis is not ready: connecting');
      expect(mod.reportGeneratorWorker).toBeNull();
    });

    it('does not enqueue when gated off', async () => {
      const mod = await loadReportGeneratorWorker({ BACKGROUND_JOBS_ENABLED: 'false' });
      const jobId = await mod.triggerReportGeneration('rpt-1', 'ws-123');

      expect(jobId).toBeNull();
    });
  });
});
