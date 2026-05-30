import type { IAlertRepository, AlertListResult } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListAlertsInput {
  workspaceId: string;
  userRole: string;
  type?: string;
  enabled?: boolean;
  page?: number;
  limit?: number;
}

export class ListAlertsUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: ListAlertsInput): Promise<Result<AlertListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const result = await this.alertRepo.list({
      workspaceId: input.workspaceId,
      type: input.type,
      enabled: input.enabled,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
