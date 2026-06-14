import type { INotificationRepository } from '../../../domain/repositories/INotificationRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface MarkNotificationReadInput {
  notificationId: string;
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class MarkNotificationReadUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(input: MarkNotificationReadInput): Promise<Result<boolean>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const notification = await this.notificationRepo.findById(input.notificationId);
    if (!notification) {
      return ok(false);
    }

    // Users may mark direct notifications and workspace broadcasts as read.
    if (notification.workspaceId !== input.workspaceId || (notification.userId !== null && notification.userId !== input.userId)) {
      return err(new ForbiddenError('Cannot modify this notification'));
    }

    const success = await this.notificationRepo.markAsRead(input.notificationId);
    return ok(success);
  }
}
