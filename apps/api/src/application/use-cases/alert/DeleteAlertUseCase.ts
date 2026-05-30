import type { IAlertRepository } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, NotFoundError } from '../../../domain/value-objects/Result';

export interface DeleteAlertInput {
  alertId: string;
  workspaceId: string;
  userRole: string;
}

export class DeleteAlertUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: DeleteAlertInput): Promise<Result<boolean>> {
    if (!['owner', 'admin'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const existing = await this.alertRepo.findByIdAndWorkspace(input.alertId, input.workspaceId);
    if (!existing) {
      return err(new NotFoundError('Alert'));
    }

    const success = await this.alertRepo.delete(input.alertId);
    return ok(success);
  }
}
