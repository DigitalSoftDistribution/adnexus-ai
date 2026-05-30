import type { AiCredit } from '../entities/AiCredit';

export interface IAiCreditRepository {
  findByWorkspaceAndMonth(workspaceId: string, month: string): Promise<AiCredit | null>;
  upsert(credit: Omit<AiCredit, 'id' | 'createdAt' | 'updatedAt'>): Promise<AiCredit>;
  incrementUsage(workspaceId: string, month: string, field: keyof Pick<AiCredit, 'creativesUsed' | 'impressionsUsed' | 'aiCreditsUsed' | 'creditsUsed'>, amount: number): Promise<AiCredit | null>;
  listByWorkspace(workspaceId: string): Promise<AiCredit[]>;
}
