const ORIGINAL_ENV = process.env;

type LoadedOnboardingWorker = typeof import('../../src/workers/onboarding-emails');

const getRedisClientMock = jest.fn();

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

async function loadOnboardingWorker(
  env: Record<string, string | undefined> = {},
): Promise<LoadedOnboardingWorker> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-onboarding-worker-tests-only',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    REDIS_URL: 'redis://localhost:6379',
    ...env,
  };

  return import('../../src/workers/onboarding-emails');
}

describe('onboarding email worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRedisClientMock.mockReturnValue({ status: 'ready' });
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    const mod = await loadOnboardingWorker();
    await mod.stopOnboardingEmailWorker();
  });

  describe('renderOnboardingTemplate', () => {
    it('replaces template variables', async () => {
      const mod = await loadOnboardingWorker();
      const rendered = mod.renderOnboardingTemplate(
        'Hello {{userName}} — visit {{dashboardUrl}}',
        { userName: 'Alex', dashboardUrl: 'https://app.adnexus.io/dashboard' },
      );

      expect(rendered).toBe('Hello Alex — visit https://app.adnexus.io/dashboard');
    });
  });

  describe('evaluateOnboardingSendDecision', () => {
    it('skips unsubscribed users', async () => {
      const mod = await loadOnboardingWorker();
      const decision = mod.evaluateOnboardingSendDecision('welcome', {
        hasConnectedAccount: false,
        hasCreatedCampaign: false,
        hasUsedAiAgent: false,
        hasSetupWorkflow: false,
        hasEnabledMorningBrief: false,
        hasUpgraded: false,
        unsubscribedFromOnboarding: true,
      });

      expect(decision).toEqual({ action: 'skip', reason: 'unsubscribed' });
    });

    it('skips day1 email when account is already connected', async () => {
      const mod = await loadOnboardingWorker();
      const decision = mod.evaluateOnboardingSendDecision('day1-getting-started', {
        hasConnectedAccount: true,
        hasCreatedCampaign: false,
        hasUsedAiAgent: false,
        hasSetupWorkflow: false,
        hasEnabledMorningBrief: false,
        hasUpgraded: false,
        unsubscribedFromOnboarding: false,
      });

      expect(decision).toEqual({ action: 'skip', reason: 'action_already_completed' });
    });

    it('allows welcome email for new users', async () => {
      const mod = await loadOnboardingWorker();
      const decision = mod.evaluateOnboardingSendDecision('welcome', {
        hasConnectedAccount: false,
        hasCreatedCampaign: false,
        hasUsedAiAgent: false,
        hasSetupWorkflow: false,
        hasEnabledMorningBrief: false,
        hasUpgraded: false,
        unsubscribedFromOnboarding: false,
      });

      expect(decision).toEqual({ action: 'send' });
    });
  });

  describe('getOnboardingSequenceJobs', () => {
    it('returns seven deterministic jobs for a user', async () => {
      const mod = await loadOnboardingWorker();
      const jobs = mod.getOnboardingSequenceJobs('user-123');

      expect(jobs).toHaveLength(7);
      expect(jobs.map((job) => job.jobId)).toEqual([
        'welcome:user-123',
        'day1:user-123',
        'day3:user-123',
        'day5:user-123',
        'day7:user-123',
        'day14:user-123',
        'day30:user-123',
      ]);
    });
  });

  describe('feature flag gating', () => {
    it('does not start unless BACKGROUND_JOBS_ENABLED is true', async () => {
      const mod = await loadOnboardingWorker({ BACKGROUND_JOBS_ENABLED: 'false' });

      const status = await mod.startOnboardingEmailWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_JOBS_ENABLED is not true');
      expect(mod.worker).toBeNull();
    });

    it('does not start unless BACKGROUND_ONBOARDING_EMAILS_ENABLED is true', async () => {
      const mod = await loadOnboardingWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_ONBOARDING_EMAILS_ENABLED: 'false',
      });

      const status = await mod.startOnboardingEmailWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('BACKGROUND_ONBOARDING_EMAILS_ENABLED is not true');
      expect(mod.worker).toBeNull();
    });

    it('does not start when Redis is configured but not ready', async () => {
      getRedisClientMock.mockReturnValue({ status: 'connecting' });
      const mod = await loadOnboardingWorker({
        BACKGROUND_JOBS_ENABLED: 'true',
        BACKGROUND_ONBOARDING_EMAILS_ENABLED: 'true',
      });

      const status = await mod.startOnboardingEmailWorker();

      expect(status.status).toBe('disabled');
      expect(status.reason).toBe('Redis is not ready: connecting');
      expect(mod.worker).toBeNull();
    });
  });
});
