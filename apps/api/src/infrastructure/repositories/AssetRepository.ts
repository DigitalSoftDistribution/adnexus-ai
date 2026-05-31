import type { IAssetRepository } from '../../domain/repositories/IAssetRepository';
import type { Asset, AssetFilters, AssetListResult } from '../../domain/entities/Asset';
import { query } from '../database/connection';

export class AssetRepository implements IAssetRepository {
  async findById(id: string): Promise<Asset | null> {
    const { rows } = await query<Asset>(
      `SELECT * FROM assets WHERE id = $1 LIMIT 1`, [id],
    );
    return rows[0] ?? null;
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Asset | null> {
    const { rows } = await query<Asset>(
      `SELECT * FROM assets WHERE id = $1 AND workspace_id = $2 LIMIT 1`, [id, workspaceId],
    );
    return rows[0] ?? null;
  }

  async list(filters: AssetFilters): Promise<AssetListResult> {
    const conditions: string[] = ['workspace_id = $1'];
    const params: unknown[] = [filters.workspaceId];
    let idx = 1;

    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      conditions.push(`type = ANY($${++idx}::text[])`);
      params.push(types);
    }
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(`status = ANY($${++idx}::text[])`);
      params.push(statuses);
    }
    if (filters.campaignId) {
      conditions.push(`campaign_id = $${++idx}`);
      params.push(filters.campaignId);
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${++idx} OR original_name ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.join(' AND ');
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM assets WHERE ${whereClause}`, params,
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows: assets } = await query<Asset>(
      `SELECT * FROM assets WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${++idx} OFFSET $${++idx}`,
      [...params, limit, offset],
    );

    return { assets, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'>): Promise<Asset> {
    const { rows } = await query<Asset>(
      `INSERT INTO assets (workspace_id, name, original_name, type, mime_type, size, url, thumbnail_url, status, metadata, campaign_id, ad_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        asset.workspaceId, asset.name, asset.originalName, asset.type, asset.mimeType,
        asset.size, asset.url, asset.thumbnailUrl, asset.status, JSON.stringify(asset.metadata),
        asset.campaignId, asset.adId, asset.createdBy,
      ],
    );
    return rows[0];
  }

  async update(id: string, updates: Partial<Asset>): Promise<Asset | null> {
    const setClauses: string[] = [];
    const params: unknown[] = [id];
    let paramIdx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        const column = this.camelToSnake(key);
        const serialized = key === 'metadata' ? JSON.stringify(value) : value;
        setClauses.push(`${column} = $${++paramIdx}`);
        params.push(serialized);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    const { rows } = await query<Asset>(
      `UPDATE assets SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`, params,
    );
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM assets WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
