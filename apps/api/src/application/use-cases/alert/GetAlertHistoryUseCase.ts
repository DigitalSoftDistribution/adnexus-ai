import type { IAlertRepository } from '../../../domain/repositories/IAlertRepository';
import type { AlertHistoryEntry } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAlertHistoryInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAlertHistoryUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: GetAlertHistoryInput): Promise<Result<AlertHistoryEntry[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Alert'));
    }

    const history = await this.alertRepo.getHistory(input.alertId);
    return ok(history);
  }
}
