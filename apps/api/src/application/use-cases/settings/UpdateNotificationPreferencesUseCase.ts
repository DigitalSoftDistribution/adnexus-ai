import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { NotificationPreferences } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface UpdateNotificationPreferencesInput {
  workspaceId: string;
  userId: string;
  userRole: string;
  preferences: Partial<NotificationPreferences>;
}

export class UpdateNotificationPreferencesUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: UpdateNotificationPreferencesInput): Promise<Result<boolean>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const success = await this.settingsRepo.updateNotificationPreferences(
      input.workspaceId,
      input.userId,
      input.preferences,
    );
    return ok(success);
  }
}
