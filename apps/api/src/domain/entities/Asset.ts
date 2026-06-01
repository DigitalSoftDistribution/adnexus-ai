export type AssetType = 'image' | 'video' | 'document' | 'csv' | 'other';
export type AssetStatus = 'uploading' | 'processing' | 'ready' | 'failed' | 'archived';

export interface Asset {
  id: string;
  workspaceId: string;
  name: string;
  originalName: string;
  type: AssetType;
  mimeType: string;
  size: number;
  url: string | null;
  thumbnailUrl: string | null;
  status: AssetStatus;
  metadata: Record<string, unknown> | null;
  campaignId: string | null;
  adId: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetFilters {
  workspaceId: string;
  type?: AssetType | AssetType[];
  status?: AssetStatus | AssetStatus[];
  campaignId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AssetListResult {
  assets: Asset[];
  total: number;
  page: number;
  totalPages: number;
}
