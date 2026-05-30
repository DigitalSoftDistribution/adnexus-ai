import type { IAlertRepository } from '../../../domain/repositories/IAlertRepository';
import type { Alert } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface UpdateAlertInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
  updates: Partial<Alert>;
}

export class UpdateAlertUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: UpdateAlertInput): Promise<Result<Alert>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Alert'));
    }

    const alert = await this.alertRepo.update(input.alertId, input.updates);
    if (!alert) {
      return err(new NotFoundError('Alert'));
    }

    return ok(alert);
  }
}
