import type { Draft, DraftStatus, DraftType, ActorType } from '../entities/Draft';

export interface DraftFilters {
  workspaceId: string;
  status?: DraftStatus | DraftStatus[];
  platform?: string;
  draftType?: DraftType | DraftType[];
  campaignId?: string;
  actorType?: ActorType;
  page?: number;
  limit?: number;
}

export interface DraftListResult {
  drafts: Draft[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DraftStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
  failed: number;
  rolledBack: number;
}

export interface IDraftRepository {
  findById(id: string): Promise<Draft | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Draft | null>;
  list(filters: DraftFilters): Promise<DraftListResult>;
  getStats(workspaceId: string): Promise<DraftStats>;
  create(draft: Omit<Draft, 'id' | 'createdAt' | 'updatedAt'>): Promise<Draft>;
  updateStatus(id: string, status: DraftStatus, metadata?: Record<string, unknown>): Promise<Draft | null>;
  approve(id: string, approvedBy: string): Promise<Draft | null>;
  reject(id: string, rejectedBy: string, reason?: string): Promise<Draft | null>;
  delete(id: string): Promise<boolean>;
  countByWorkspace(workspaceId: string): Promise<number>;
}
