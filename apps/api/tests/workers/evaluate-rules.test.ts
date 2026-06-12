const ORIGINAL_ENV = process.env;

type LoadedEvaluateRulesWorker = typeof import('../../src/workers/evaluate-rules');

const getRedisClientMock = jest.fn();

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

async function loadEvaluateRulesWorker(
  env: Record<string, string | undefined> = {},
): Promise<LoadedEvaluateRulesWorker> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-evaluate-rules-worker-tests-only',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    REDIS_URL: 'redis://localhost:6379',
    ...env,
  };

  return import('../../src/workers/evaluate-rules');
}

const sampleMetrics = {
  impressions: 10_000,
  clicks: 250,
  spend: 500,
  conversions: 12,
  ctr: 0.025,
  cpc: 2,
  roas: 3.5,
  lookbackHours: 24,
};

describe('evaluate rules worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClientMock.mockReturnValue({ status: 'ready' });
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    const mod = await loadEvaluateRulesWorker();
    await mod.stopEvaluateRulesWorker();
  });

  describe('evaluateRuleCondition', () => {
    it('evaluates numeric comparison operators', async () => {
      const mod = await loadEvaluateRulesWorker();

      expect(
        mod.evaluateRuleCondition(
          { field: 'ctr', operator: 'gt', value: 0.02 },
          sampleMetrics,
        ),
      ).toBe(true);
      expect(
        mod.evaluateRuleCondition(
          { field: 'spend', operator: 'lte', value: 400 },
          sampleMetrics,
        ),
      ).toBe(false);
    });

    it('evaluates membership and between operators', async () => {
      const mod = await loadEvaluateRulesWorker();

      expect(
        mod.evaluateRuleCondition(
          { field: 'conversions', operator: 'in', value: [5, 12, 20] },
          sampleMetrics,
        ),
      ).toBe(true);
      expect(
        mod.evaluateRuleCondition(
          { field: 'roas', operator: 'between', value: [3, 4] },
          sampleMetrics,
        ),
      ).toBe(true);
    });

    it('returns false for unknown metric fields', async () => {
      const mod = await loadEvaluateRulesWorker();
      expect(
        mod.evaluateRuleCondition(
          { field: 'unknown_metric', operator: 'gt', value: 1 },
          sampleMetrics,
        ),
      ).toBe(false);
    });
  });

  describe('sortRulesByPriority', () => {
    it('orders critical rules before low-priority rules', async () => {
      const mod = await loadEvaluateRulesWorker();
      const sorted = mod.sortRulesByPriority([
        {
          id: 'low',
          workspaceId: 'ws-1',
          name: 'Low',
          enabled: true,
          priority: 'low',
          conditions: [],
          action: { type: 'send_alert' },
          dryRun: false,
          maxDraftsPerHour: 10,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        },
        {
          id: 'critical',
          workspaceId: 'ws-1',
          name: 'Critical',
          enabled: true,
          priority: 'critical',
          conditions: [],
          action: { type: 'send_alert' },
          dryRun: false,
          maxDraftsPerHour: 10,
          createdAt: new Date('2026-06-01T00:00:00.000Z'),
          updatedAt: new Date('2026-06-01T00:00:00.000Z'),
        },
      ]);

      expect(sorted.map((rule) => rule.id)).toEqual(['critical', 'low']);
    });
  });

  describe('getRuleLookbackHours', () => {
    it('uses the maximum configured lookback window', async () => {
      const mod = await loadEvaluateRulesWorker();
      expect(
        mod.getRuleLookbackHours({
          id: 'rule-1',
          workspaceId: 'ws-1',
          name: 'Rule',
          enabled: true,
          priority: 'normal',
          conditions: [
            { field: 'ctr', operator: 'gt', value: 0.01, lookbackHours: 12 },
            { field: 'spend', operator: 'gt', value: 100, lookbackHours: 48 },
          ],
          action: { type: 'create_draft' },
          dryRun: false,
          maxDraftsPerHour: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ).toBe(48);
    });
  });

  describe('feature flag gating', () => {
    it('does not start unless BACKGROUND_JOBS_ENABLED is true', async () => {
      const mod = await loadEvaluateRulesWorker({ BACKGROUND_JOBS_ENABLED: 'false' });

      const status = await mod.startEvaluateRulesWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_JOBS_ENABLED is not true');
      expect(mod.ruleEvaluationWorker).toBeNull();
    });

    it('does not start unless BACKGROUND_EVALUATE_RULES_ENABLED is true', async () => {
      const mod = await loadEvaluateRulesWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_EVALUATE_RULES_ENABLED: 'false',
      });

      const status = await mod.startEvaluateRulesWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_EVALUATE_RULES_ENABLED is not true');
      expect(mod.ruleEvaluationWorker).toBeNull();
    });

    it('does not start when Redis is configured but not ready', async () => {
      getRedisClientMock.mockReturnValue({ status: 'connecting' });
      const mod = await loadEvaluateRulesWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_EVALUATE_RULES_ENABLED: 'true',
      });

      const status = await mod.startEvaluateRulesWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('Redis is not ready: connecting');
      expect(mod.ruleEvaluationWorker).toBeNull();
    });

    it('does not enqueue when gated off', async () => {
      const mod = await loadEvaluateRulesWorker({ BACKGROUND_JOBS_ENABLED: 'false' });
      const jobId = await mod.enqueueWorkspaceRuleEvaluation('ws-123');

      expect(jobId).toBeNull();
    });
  });
});
