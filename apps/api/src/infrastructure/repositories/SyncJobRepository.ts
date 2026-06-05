import type {
  ISyncJobRepository,
  SyncJob,
  CreateSyncJobInput,
  FinishSyncJobInput,
} from '../../domain/repositories/ISyncJobRepository';
import { query } from '../database/connection';

function mapRow(r: Record<string, unknown>): SyncJob {
  return {
    id: r.id as string,
    workspaceId: r.workspace_id as string,
    adAccountId: r.ad_account_id as string,
    platform: r.platform as string,
    status: r.status as SyncJob['status'],
    campaignsSynced: Number(r.campaigns_synced ?? 0),
    metricsSynced: Number(r.metrics_synced ?? 0),
    errorCount: Number(r.error_count ?? 0),
    startedAt: new Date(r.started_at as string),
    finishedAt: r.finished_at ? new Date(r.finished_at as string) : null,
    durationMs: r.duration_ms === null || r.duration_ms === undefined ? null : Number(r.duration_ms),
    triggeredBy: (r.triggered_by ?? null) as string | null,
    createdAt: new Date(r.created_at as string),
  };
}

export class SyncJobRepository implements ISyncJobRepository {
  async start(input: CreateSyncJobInput): Promise<SyncJob> {
    const { rows } = await query<Record<string, unknown>>(
      `INSERT INTO sync_jobs (workspace_id, ad_account_id, platform, status, triggered_by)
       VALUES ($1, $2, $3, 'running', $4)
       RETURNING *`,
      [input.workspaceId, input.adAccountId, input.platform, input.triggeredBy ?? null],
    );
    return mapRow(rows[0]);
  }

  async finish(jobId: string, input: FinishSyncJobInput): Promise<SyncJob | null> {
    const { rows } = await query<Record<string, unknown>>(
      `UPDATE sync_jobs
       SET status = $2,
           campaigns_synced = $3,
           metrics_synced = $4,
           error_count = $5,
           finished_at = NOW(),
           duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
       WHERE id = $1
       RETURNING *`,
      [jobId, input.status, input.campaignsSynced, input.metricsSynced, input.errors.length],
    );

    if (!rows[0]) return null;

    if (input.errors.length > 0) {
      // Batch-insert collected errors. Kept simple (sequential) since counts are
      // small per run; a bulk insert can replace this if volumes grow.
      for (const e of input.errors) {
        await query(
          `INSERT INTO sync_errors (sync_job_id, scope, scope_id, code, message)
           VALUES ($1, $2, $3, $4, $5)`,
          [jobId, e.scope, e.scopeId ?? null, e.code ?? null, e.message],
        );
      }
    }

    return mapRow(rows[0]);
  }

  async listForAccount(adAccountId: string, limit = 10): Promise<SyncJob[]> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM sync_jobs
       WHERE ad_account_id = $1
       ORDER BY started_at DESC
       LIMIT $2`,
      [adAccountId, Math.min(limit, 50)],
    );
    return rows.map(mapRow);
  }

  async findRunningForAccount(adAccountId: string): Promise<SyncJob | null> {
    const { rows } = await query<Record<string, unknown>>(
      `SELECT * FROM sync_jobs
       WHERE ad_account_id = $1 AND status = 'running'
       ORDER BY started_at DESC
       LIMIT 1`,
      [adAccountId],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }
}
