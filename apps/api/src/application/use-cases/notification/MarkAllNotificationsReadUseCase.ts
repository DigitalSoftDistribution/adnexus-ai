import type { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface MarkAllNotificationsReadInput {
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class MarkAllNotificationsReadUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(input: MarkAllNotificationsReadInput): Promise<Result<number>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const count = await this.notificationRepo.markAllAsRead(input.workspaceId, input.userId);
    return ok(count);
  }
}
