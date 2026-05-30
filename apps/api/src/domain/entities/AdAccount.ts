export type AdAccountStatus = 'ACTIVE' | 'DISCONNECTED' | 'ERROR';
export type AdAccountPlatform = 'meta' | 'google' | 'tiktok' | 'snap' | 'linkedin';

export interface AdAccount {
  id: string;
  workspaceId: string;
  platform: AdAccountPlatform;
  platformAccountId: string;
  name: string;
  status: AdAccountStatus;
  tokenExpiresAt: Date | null;
  spendCap: number | null;
  disabledReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
