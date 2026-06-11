import type { IAlertRepository, AlertStats } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAlertStatsInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
}

export interface AlertDetailStats extends AlertStats {
  alertId: string;
  totalTriggers: number;
  avgMetricValue: number;
  lastTriggeredAt: string | null;
}

export class GetAlertStatsUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: GetAlertStatsInput): Promise<Result<AlertDetailStats>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const alert = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!alert) {
      return err(new NotFoundError('Alert'));
    }

    const [workspaceStats, history] = await Promise.all([
      this.alertRepo.getStats(input.workspaceId),
      this.alertRepo.getHistory(input.alertId),
    ]);

    const avgMetricValue =
      history.length > 0
        ? history.reduce((sum, entry) => sum + entry.metricValue, 0) / history.length
        : 0;

    return ok({
      ...workspaceStats,
      alertId: alert.id,
      totalTriggers: history.length,
      avgMetricValue: parseFloat(avgMetricValue.toFixed(2)),
      lastTriggeredAt: history[0] ? new Date(history[0].triggeredAt).toISOString() : null,
    });
  }
}
