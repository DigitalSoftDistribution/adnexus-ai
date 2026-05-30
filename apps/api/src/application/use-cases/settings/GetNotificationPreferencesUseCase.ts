import type { ISettingsRepository } from '../../../domain/repositories/ISettingsRepository';
import type { NotificationPreferences } from '../../../domain/repositories/ISettingsRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetNotificationPreferencesInput {
  workspaceId: string;
  userId: string;
  userRole: string;
}

export class GetNotificationPreferencesUseCase {
  constructor(private settingsRepo: ISettingsRepository) {}

  async execute(input: GetNotificationPreferencesInput): Promise<Result<NotificationPreferences>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const prefs = await this.settingsRepo.getNotificationPreferences(input.workspaceId, input.userId);
    if (!prefs) {
      // Return defaults
      return ok({
        email: { campaignAlerts: true, budgetAlerts: true, dailyDigest: false, weeklyReport: true, teamActivity: true, productUpdates: true },
        inApp: { campaignAlerts: true, budgetAlerts: true, aiRecommendations: true, teamActivity: true },
        slack: { enabled: false, webhookUrl: null, channel: null },
      });
    }

    return ok(prefs);
  }
}
