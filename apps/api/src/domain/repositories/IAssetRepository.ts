import type { Asset, AssetFilters, AssetListResult } from '../entities/Asset';

export interface IAssetRepository {
  findById(id: string): Promise<Asset | null>;
  findByIdAndWorkspace(id: string, workspaceId: string): Promise<Asset | null>;
  list(filters: AssetFilters): Promise<AssetListResult>;
  create(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset>;
  update(id: string, updates: Partial<Asset>): Promise<Asset | null>;
  delete(id: string): Promise<boolean>;
}
