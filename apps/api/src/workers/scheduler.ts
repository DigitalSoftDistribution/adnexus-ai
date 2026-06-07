import cron, { type ScheduledTask } from 'node-cron';
import IORedis from 'ioredis';
import { Queue } from 'bullmq';

import { config } from '../config';
import { getModuleLogger } from '../lib/logger';
import { getRedisClient } from '../lib/redis';
import { aiApiCalls, jobDuration } from '../lib/monitoring';
import { supabase } from '../lib/supabase';
import { startMorningBriefScheduler, type MorningBriefWorker } from './morning-brief';

const log = getModuleLogger('background-scheduler');

export type SchedulerComponentStatus = 'disabled' | 'starting' | 'running' | 'degraded' | 'error' | 'stopped';

export interface SchedulerComponentSnapshot {
  status: SchedulerComponentStatus;
  enabled: boolean;
  lastStartedAt?: string;
  lastRunAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  runs: number;
  successes: number;
  failures: number;
  metadata?: Record<string, unknown>;
}

export interface SchedulerStatusSnapshot {
  enabled: boolean;
  redisConfigured: boolean;
  redisReady: boolean;
  startedAt?: string;
  components: Record<string, SchedulerComponentSnapshot>;
}

interface ComponentState extends SchedulerComponentSnapshot {
  task?: ScheduledTask;
}

interface SchedulerRuntimeOptions {
  reportIntervalCron?: string;
  reportRunner?: () => Promise<void>;
  now?: () => Date;
}

const COMPONENTS = ['morningBrief', 'scheduledReports', 'aiAnalysis'] as const;
type ComponentName = (typeof COMPONENTS)[number];

const componentState: Record<ComponentName, ComponentState> = {
  morningBrief: createInitialState(),
  scheduledReports: createInitialState(),
  aiAnalysis: createInitialState(),
};

let startedAt: string | undefined;
let morningBriefWorker: MorningBriefWorker | null = null;
let aiAnalysisQueue: Queue<AIAnalysisJobData> | null = null;

export interface AIAnalysisJobData {
  workspaceId: string;
  source: 'scheduler' | 'manual' | 'sync';
  requestedAt: string;
  scope?: 'workspace' | 'campaign';
  campaignId?: string;
}

function createInitialState(): ComponentState {
  return {
    status: 'disabled',
    enabled: false,
    runs: 0,
    successes: 0,
    failures: 0,
  };
}

function markStarting(name: ComponentName): void {
  componentState[name].status = 'starting';
  componentState[name].enabled = true;
  componentState[name].lastStartedAt = new Date().toISOString();
  componentState[name].lastError = undefined;
}

function markRunning(name: ComponentName, metadata?: Record<string, unknown>): void {
  componentState[name].status = 'running';
  componentState[name].enabled = true;
  componentState[name].metadata = { ...componentState[name].metadata, ...metadata };
}

function markDisabled(name: ComponentName, reason: string): void {
  componentState[name].status = 'disabled';
  componentState[name].enabled = false;
  componentState[name].metadata = { ...componentState[name].metadata, reason };
}

function markError(name: ComponentName, error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  componentState[name].status = 'error';
  componentState[name].enabled = true;
  componentState[name].failures += 1;
  componentState[name].lastErrorAt = new Date().toISOString();
  componentState[name].lastError = err.message;
}

async function runTracked(name: ComponentName, operation: () => Promise<void>): Promise<void> {
  const start = Date.now();
  componentState[name].runs += 1;
  componentState[name].lastRunAt = new Date().toISOString();

  try {
    await operation();
    componentState[name].successes += 1;
    componentState[name].lastSuccessAt = new Date().toISOString();
    componentState[name].status = 'running';
    jobDuration.observe({ job_type: name, status: 'success' }, (Date.now() - start) / 1000);
  } catch (error) {
    markError(name, error);
    jobDuration.observe({ job_type: name, status: 'failed' }, (Date.now() - start) / 1000);
    log.error({ err: error, component: name }, 'Background scheduler task failed');
  }
}

function cloneSnapshot(state: ComponentState): SchedulerComponentSnapshot {
  const { task: _task, ...snapshot } = state;
  return { ...snapshot, metadata: snapshot.metadata ? { ...snapshot.metadata } : undefined };
}

export function getSchedulerStatus(): SchedulerStatusSnapshot {
  const redisConfigured = Boolean(config.redis.url);
  const redis = getRedisClient();

  return {
    enabled: config.backgroundJobs.enabled,
    redisConfigured,
    redisReady: redis?.status === 'ready',
    startedAt,
    components: Object.fromEntries(
      COMPONENTS.map((name) => [name, cloneSnapshot(componentState[name])]),
    ),
  };
}

export async function startBackgroundSchedulers(options: SchedulerRuntimeOptions = {}): Promise<SchedulerStatusSnapshot> {
  if (!config.backgroundJobs.enabled) {
    for (const name of COMPONENTS) markDisabled(name, 'BACKGROUND_JOBS_ENABLED is not true');
    return getSchedulerStatus();
  }

  if (!config.redis.url) {
    for (const name of COMPONENTS) markDisabled(name, 'REDIS_URL is not configured');
    return getSchedulerStatus();
  }

  const redis = getRedisClient();
  if (!redis) {
    for (const name of COMPONENTS) markDisabled(name, 'Redis client could not be created');
    return getSchedulerStatus();
  }

  if (redis.status !== 'ready') {
    for (const name of COMPONENTS) markDisabled(name, `Redis is not ready: ${redis.status}`);
    return getSchedulerStatus();
  }

  startedAt = options.now?.().toISOString() ?? new Date().toISOString();

  await startMorningBriefIfEnabled();
  await startScheduledReportRunner(
    options.reportIntervalCron ?? config.backgroundJobs.scheduledReportsCron,
    options.reportRunner,
  );
  await startAIAnalysisScaffold(redis);

  return getSchedulerStatus();
}

async function startMorningBriefIfEnabled(): Promise<void> {
  if (!config.backgroundJobs.morningBriefEnabled) {
    markDisabled('morningBrief', 'BACKGROUND_MORNING_BRIEF_ENABLED is not true');
    return;
  }

  if (morningBriefWorker) {
    markRunning('morningBrief', { alreadyStarted: true });
    return;
  }

  markStarting('morningBrief');
  try {
    morningBriefWorker = await startMorningBriefScheduler();
    markRunning('morningBrief');
  } catch (error) {
    morningBriefWorker = null;
    markError('morningBrief', error);
  }
}

async function startScheduledReportRunner(
  intervalCron: string,
  reportRunner?: () => Promise<void>,
): Promise<void> {
  if (!config.backgroundJobs.scheduledReportsEnabled) {
    markDisabled('scheduledReports', 'BACKGROUND_SCHEDULED_REPORTS_ENABLED is not true');
    return;
  }

  const state = componentState.scheduledReports;
  if (state.task) {
    markRunning('scheduledReports', { cron: intervalCron, alreadyStarted: true });
    return;
  }

  if (!cron.validate(intervalCron)) {
    markError('scheduledReports', new Error(`Invalid scheduled report cron: ${intervalCron}`));
    return;
  }

  const runner = reportRunner ?? (await import('./report-generator')).checkScheduledReports;

  markStarting('scheduledReports');
  state.task = cron.schedule(intervalCron, () => {
    void runTracked('scheduledReports', runner);
  });
  markRunning('scheduledReports', { cron: intervalCron });
}

async function startAIAnalysisScaffold(redis: IORedis): Promise<void> {
  if (!config.backgroundJobs.aiAnalysisEnabled) {
    markDisabled('aiAnalysis', 'BACKGROUND_AI_ANALYSIS_ENABLED is not true');
    return;
  }

  if (aiAnalysisQueue) {
    markRunning('aiAnalysis', { queue: 'ai-analysis', alreadyStarted: true });
    return;
  }

  markStarting('aiAnalysis');
  aiAnalysisQueue = new Queue<AIAnalysisJobData>('ai-analysis', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60, count: 250 },
      removeOnFail: { age: 14 * 24 * 60 * 60, count: 250 },
    },
  });

  markRunning('aiAnalysis', {
    queue: 'ai-analysis',
    scaffoldOnly: true,
    note: 'Queue is available for future producers; no platform write integration is started.',
  });
}

export async function enqueueAIAnalysisJob(data: Omit<AIAnalysisJobData, 'requestedAt'>): Promise<string> {
  if (!aiAnalysisQueue) {
    throw new Error('AI analysis queue is not started');
  }

  const job = await aiAnalysisQueue.add(
    'analyze-workspace',
    { ...data, requestedAt: new Date().toISOString() },
    { jobId: `ai-analysis-${data.workspaceId}-${Date.now()}` },
  );
  aiApiCalls.inc({ model: 'pending', status: 'queued', feature: 'background-ai-analysis' });
  return String(job.id);
}

export async function getRecentSyncHistory(limit = 10): Promise<Array<Record<string, unknown>>> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const { data, error } = await supabase
    .from('sync_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    log.warn({ err: error }, 'Failed to read sync history');
    return [];
  }

  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function stopBackgroundSchedulers(): Promise<void> {
  for (const name of COMPONENTS) {
    componentState[name].task?.stop();
    componentState[name].task = undefined;
    if (componentState[name].enabled) componentState[name].status = 'stopped';
  }

  if (morningBriefWorker) {
    await morningBriefWorker.dispose();
    morningBriefWorker = null;
  }

  if (aiAnalysisQueue) {
    await aiAnalysisQueue.close();
    aiAnalysisQueue = null;
  }
}
