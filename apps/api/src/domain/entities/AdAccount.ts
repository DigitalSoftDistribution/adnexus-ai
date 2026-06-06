export type AdAccountStatus = 'active' | 'disconnected' | 'expired' | 'error';
export type AdAccountPlatform = 'meta' | 'google' | 'tiktok' | 'snap' | 'linkedin';

export interface AdAccount {
  id: string;
  workspaceId: string;
  platform: AdAccountPlatform;
  platformAccountId: string;
  name: string;
  status: AdAccountStatus;
  oauthToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  isActive: boolean;
  scopes: string[];
  lastSyncedAt: Date | null;
  spendCap: number | null;
  disabledReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
