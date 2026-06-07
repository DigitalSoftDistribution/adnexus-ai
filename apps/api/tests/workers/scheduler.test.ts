import type { ScheduledTask } from 'node-cron';

const ORIGINAL_ENV = process.env;

type LoadedScheduler = typeof import('../../src/workers/scheduler');

const scheduleMock = jest.fn();
const validateMock = jest.fn();
const startMorningBriefSchedulerMock = jest.fn();
const reportRunnerMock = jest.fn();
const queueCloseMock = jest.fn();
const queueAddMock = jest.fn();
const getRedisClientMock = jest.fn();
const supabaseLimitMock = jest.fn();
const supabaseOrderMock = jest.fn();
const supabaseSelectMock = jest.fn();
const supabaseFromMock = jest.fn();

jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    schedule: scheduleMock,
    validate: validateMock,
  },
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: queueAddMock,
    close: queueCloseMock,
  })),
}));

jest.mock('../../src/workers/morning-brief', () => ({
  startMorningBriefScheduler: startMorningBriefSchedulerMock,
}));

jest.mock('../../src/workers/report-generator', () => ({
  checkScheduledReports: reportRunnerMock,
}));

jest.mock('../../src/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

jest.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

jest.mock('../../src/lib/monitoring', () => ({
  aiApiCalls: { inc: jest.fn() },
  jobDuration: { observe: jest.fn() },
}));

jest.mock('../../src/lib/logger', () => ({
  getModuleLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  })),
}));

function createTask(): ScheduledTask {
  return {
    stop: jest.fn(),
  } as unknown as ScheduledTask;
}

async function loadScheduler(env: Record<string, string | undefined> = {}): Promise<LoadedScheduler> {
  jest.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'test',
    JWT_SECRET: 'test-jwt-secret-key-for-scheduler-tests-only',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    SUPABASE_ANON_KEY: 'test-anon-key',
    REDIS_URL: 'redis://localhost:6379',
    ...env,
  };

  return import('../../src/workers/scheduler');
}

describe('background scheduler safety gates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateMock.mockReturnValue(true);
    scheduleMock.mockReturnValue(createTask());
    queueCloseMock.mockResolvedValue(undefined);
    queueAddMock.mockResolvedValue({ id: 'job-1' });
    startMorningBriefSchedulerMock.mockResolvedValue({ dispose: jest.fn().mockResolvedValue(undefined) });
    reportRunnerMock.mockResolvedValue(undefined);
    getRedisClientMock.mockReturnValue({ status: 'ready' });
    supabaseLimitMock.mockResolvedValue({ data: [], error: null });
    supabaseOrderMock.mockReturnValue({ limit: supabaseLimitMock });
    supabaseSelectMock.mockReturnValue({ order: supabaseOrderMock });
    supabaseFromMock.mockReturnValue({ select: supabaseSelectMock });
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('does not start any jobs unless BACKGROUND_JOBS_ENABLED is true', async () => {
    const scheduler = await loadScheduler({ BACKGROUND_JOBS_ENABLED: 'false' });

    const status = await scheduler.startBackgroundSchedulers();

    expect(status.enabled).toBe(false);
    expect(startMorningBriefSchedulerMock).not.toHaveBeenCalled();
    expect(scheduleMock).not.toHaveBeenCalled();
    const { Queue } = await import('bullmq');
    expect(Queue).not.toHaveBeenCalled();
    expect(status.components.morningBrief.status).toBe('disabled');
    expect(status.components.scheduledReports.status).toBe('disabled');
    expect(status.components.aiAnalysis.status).toBe('disabled');
  });

  it('keeps all components disabled when Redis is configured but not ready', async () => {
    getRedisClientMock.mockReturnValue({ status: 'connecting' });
    const scheduler = await loadScheduler({ BACKGROUND_JOBS_ENABLED: 'true' });

    const status = await scheduler.startBackgroundSchedulers();

    expect(status.enabled).toBe(true);
    expect(status.redisReady).toBe(false);
    expect(startMorningBriefSchedulerMock).not.toHaveBeenCalled();
    expect(scheduleMock).not.toHaveBeenCalled();
    const { Queue } = await import('bullmq');
    expect(Queue).not.toHaveBeenCalled();
    expect(status.components.morningBrief.metadata?.reason).toBe('Redis is not ready: connecting');
    expect(status.components.scheduledReports.metadata?.reason).toBe('Redis is not ready: connecting');
    expect(status.components.aiAnalysis.metadata?.reason).toBe('Redis is not ready: connecting');
  });

  it('honors individual env guards for scheduled reports, morning brief, and AI analysis', async () => {
    const scheduler = await loadScheduler({
      BACKGROUND_JOBS_ENABLED: 'true',
      BACKGROUND_MORNING_BRIEF_ENABLED: 'false',
      BACKGROUND_SCHEDULED_REPORTS_ENABLED: 'false',
      BACKGROUND_AI_ANALYSIS_ENABLED: 'false',
    });

    const status = await scheduler.startBackgroundSchedulers();

    expect(startMorningBriefSchedulerMock).not.toHaveBeenCalled();
    expect(scheduleMock).not.toHaveBeenCalled();
    const { Queue } = await import('bullmq');
    expect(Queue).not.toHaveBeenCalled();
    expect(status.components.morningBrief.metadata?.reason).toBe('BACKGROUND_MORNING_BRIEF_ENABLED is not true');
    expect(status.components.scheduledReports.metadata?.reason).toBe('BACKGROUND_SCHEDULED_REPORTS_ENABLED is not true');
    expect(status.components.aiAnalysis.metadata?.reason).toBe('BACKGROUND_AI_ANALYSIS_ENABLED is not true');
  });

  it('starts only explicitly enabled scheduler components once Redis is ready', async () => {
    const scheduler = await loadScheduler({
      BACKGROUND_JOBS_ENABLED: 'true',
      BACKGROUND_MORNING_BRIEF_ENABLED: 'true',
      BACKGROUND_SCHEDULED_REPORTS_ENABLED: 'true',
      BACKGROUND_AI_ANALYSIS_ENABLED: 'false',
      BACKGROUND_SCHEDULED_REPORTS_CRON: '*/10 * * * *',
    });

    const status = await scheduler.startBackgroundSchedulers();

    expect(startMorningBriefSchedulerMock).toHaveBeenCalledTimes(1);
    expect(validateMock).toHaveBeenCalledWith('*/10 * * * *');
    expect(scheduleMock).toHaveBeenCalledTimes(1);
    const { Queue } = await import('bullmq');
    expect(Queue).not.toHaveBeenCalled();
    expect(status.components.morningBrief.status).toBe('running');
    expect(status.components.scheduledReports.status).toBe('running');
    expect(status.components.aiAnalysis.status).toBe('disabled');

    await scheduler.stopBackgroundSchedulers();
  });

  it('exposes recent sync history safely', async () => {
    const row = { id: 'sync-1', started_at: '2026-06-07T00:00:00.000Z' };
    supabaseLimitMock.mockResolvedValue({ data: [row], error: null });
    const scheduler = await loadScheduler();

    await expect(scheduler.getRecentSyncHistory(999)).resolves.toEqual([row]);

    expect(supabaseFromMock).toHaveBeenCalledWith('sync_history');
    expect(supabaseSelectMock).toHaveBeenCalledWith('*');
    expect(supabaseOrderMock).toHaveBeenCalledWith('started_at', { ascending: false });
    expect(supabaseLimitMock).toHaveBeenCalledWith(50);
  });
});
