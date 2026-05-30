export interface Audience {
  id: string;
  workspaceId: string;
  platform: string;
  platformAudienceId: string | null;
  name: string;
  type: 'custom' | 'lookalike' | 'saved' | 'retargeting';
  size: number | null;
  targeting: Record<string, unknown> | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AudienceFilters {
  workspaceId: string;
  platform?: string;
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AudienceListResult {
  audiences: Audience[];
  total: number;
  page: number;
  limit: number;
}

export interface IAudienceRepository {
  list(filters: AudienceFilters): Promise<AudienceListResult>;
  findById(id: string): Promise<Audience | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Audience | null>;
  create(audience: Omit<Audience, 'id' | 'createdAt' | 'updatedAt'>): Promise<Audience>;
  update(id: string, updates: Partial<Audience>): Promise<Audience | null>;
  delete(id: string): Promise<boolean>;
  getInsights(audienceId: string): Promise<Record<string, unknown> | null>;
}
