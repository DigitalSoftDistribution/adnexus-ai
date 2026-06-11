import type { IAlertRepository, AlertHistoryEntry } from '../../../domain/repositories/IAlertRepository';
import type { INotificationService } from '../../ports/INotificationService';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface TestAlertInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
}

export class TestAlertUseCase {
  constructor(
    private alertRepo: IAlertRepository,
    private notificationService: INotificationService,
  ) {}

  async execute(input: TestAlertInput): Promise<Result<AlertHistoryEntry>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const alert = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!alert) {
      return err(new NotFoundError('Alert'));
    }

    const entry = await this.alertRepo.addHistory({
      alertId: input.alertId,
      triggeredAt: new Date(),
      metricValue: alert.threshold,
      message: `[TEST] Alert "${alert.name}" test trigger — ${alert.metric} ${alert.operator} ${alert.threshold}`,
      acknowledged: false,
    });

    try {
      await this.notificationService.send({
        workspaceId: input.workspaceId,
        title: `[TEST] ${alert.name}`,
        message: `Test trigger: ${alert.metric} ${alert.operator} ${alert.threshold}`,
        type: 'info',
        metadata: { alertId: input.alertId, test: true },
      });
    } catch {
      // Notification delivery failure is non-fatal for a test trigger
    }

    return ok(entry);
  }
}
