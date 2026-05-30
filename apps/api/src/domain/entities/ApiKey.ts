export type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKey {
  id: string;
  workspaceId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  status: ApiKeyStatus;
  expiresAt: Date | null;
  createdBy: string | null;
  revokedBy: string | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  callsToday: number;
  callsThisMonth: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyWithRaw extends ApiKey {
  rawKey?: string;
}
