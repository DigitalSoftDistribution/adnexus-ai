export type CampaignHistoryAction =
  | 'created'
  | 'updated'
  | 'paused'
  | 'activated'
  | 'deleted'
  | 'duplicated'
  | 'synced'
  | 'budget_changed'
  | 'status_changed'
  | 'settings_changed';

export interface CampaignHistoryEntry {
  id: string;
  campaignId: string;
  userId: string | null;
  userName: string | null;
  action: CampaignHistoryAction;
  details: Record<string, unknown> | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: Date;
}
