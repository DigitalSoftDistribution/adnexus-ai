import type { IAlertRepository } from '../../../domain/repositories/IAlertRepository';
import type { Alert } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface ToggleAlertInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
  enabled: boolean;
}

export class ToggleAlertUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: ToggleAlertInput): Promise<Result<Alert>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Alert'));
    }

    const alert = await this.alertRepo.toggle(input.alertId, input.enabled);
    if (!alert) {
      return err(new NotFoundError('Alert'));
    }

    return ok(alert);
  }
}
