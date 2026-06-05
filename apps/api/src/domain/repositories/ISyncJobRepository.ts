export type SyncJobStatus = 'running' | 'completed' | 'partial' | 'failed';

export interface SyncJob {
  id: string;
  workspaceId: string;
  adAccountId: string;
  platform: string;
  status: SyncJobStatus;
  campaignsSynced: number;
  metricsSynced: number;
  errorCount: number;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  triggeredBy: string | null;
  createdAt: Date;
}

export interface SyncJobError {
  scope: string;
  scopeId?: string | null;
  code?: string | null;
  message: string;
}

export interface CreateSyncJobInput {
  workspaceId: string;
  adAccountId: string;
  platform: string;
  triggeredBy?: string | null;
}

export interface FinishSyncJobInput {
  status: SyncJobStatus;
  campaignsSynced: number;
  metricsSynced: number;
  errors: SyncJobError[];
}

export interface ISyncJobRepository {
  /** Create a `running` sync job and return it. */
  start(input: CreateSyncJobInput): Promise<SyncJob>;
  /** Finalize a sync job: status, counts, duration, and any collected errors. */
  finish(jobId: string, input: FinishSyncJobInput): Promise<SyncJob | null>;
  /** Most recent sync jobs for an account (newest first). */
  listForAccount(adAccountId: string, limit?: number): Promise<SyncJob[]>;
  /** The currently in-flight (`running`) job for an account, if any. */
  findRunningForAccount(adAccountId: string): Promise<SyncJob | null>;
}
