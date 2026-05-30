import type { IAlertRepository } from '../../../domain/repositories/IAlertRepository';
import type { Alert } from '../../../domain/repositories/IAlertRepository';
import { Result, ok, err, ForbiddenError, ValidationError } from '../../../domain/value-objects/Result';

export interface CreateAlertInput {
  workspaceId: string;
  userRole: string;
  name: string;
  type: 'budget' | 'performance' | 'anomaly' | 'opportunity';
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  channels?: string[];
}

export class CreateAlertUseCase {
  constructor(private alertRepo: IAlertRepository) {}

  async execute(input: CreateAlertInput): Promise<Result<Alert>> {
    if (!['owner', 'admin', 'editor'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    if (!input.name?.trim()) {
      return err(new ValidationError('Alert name is required'));
    }

    const alert = await this.alertRepo.create({
      workspaceId: input.workspaceId,
      name: input.name.trim(),
      type: input.type,
      metric: input.metric,
      operator: input.operator,
      threshold: input.threshold,
      enabled: true,
      channels: input.channels ?? ['email'],
      lastTriggeredAt: null,
      triggerCount: 0,
    });

    return ok(alert);
  }
}
