import type { INotificationRepository, NotificationListResult } from '../../../domain/repositories/INotificationRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface ListNotificationsInput {
  workspaceId: string;
  userId: string;
  userRole: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export class ListNotificationsUseCase {
  constructor(private notificationRepo: INotificationRepository) {}

  async execute(input: ListNotificationsInput): Promise<Result<NotificationListResult>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const result = await this.notificationRepo.list({
      workspaceId: input.workspaceId,
      userId: input.userId,
      unreadOnly: input.unreadOnly,
      page: input.page,
      limit: input.limit,
    });

    return ok(result);
  }
}
