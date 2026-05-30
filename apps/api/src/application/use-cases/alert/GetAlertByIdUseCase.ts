import type { IAlertRepository } from '../../../domain/repositories/IAlertRepository';
import type { Alert } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface GetAlertByIdInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
}

export class GetAlertByIdUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: GetAlertByIdInput): Promise<Result<Alert>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const alert = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!alert) {
      return err(new NotFoundError('Alert'));
    }

    return ok(alert);
  }
}
