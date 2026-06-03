import type { ISearchRepository, SearchResult, SearchFilters } from '../../domain/repositories/ISearchRepository';
import { query } from '../database/connection';

export class SearchRepository implements ISearchRepository {
  async search(filters: SearchFilters): Promise<SearchResult[]> {
    const limit = filters.limit ?? 20;
    const searchTerm = `%${filters.query}%`;
    const results: SearchResult[] = [];

    // Search campaigns
    if (!filters.types || filters.types.includes('campaign')) {
      // workspace_id + platform live on ad_accounts; campaigns join through it.
      const { rows } = await query<{ id: string; name: string; status: string; platform: string }>(
        `SELECT c.id, c.name, c.status, a.platform
           FROM campaigns c
           JOIN ad_accounts a ON a.id = c.ad_account_id
          WHERE a.workspace_id = $1 AND c.name ILIKE $2 LIMIT $3`,
        [filters.workspaceId, searchTerm, Math.ceil(limit / 3)],
      );
      results.push(...rows.map((r) => ({
        id: r.id,
        type: 'campaign' as const,
        title: r.name,
        subtitle: `${r.platform} • ${r.status}`,
        url: `/dashboard/campaigns/${r.id}`,
        metadata: { status: r.status, platform: r.platform },
      })));
    }

    // Search audiences
    if (!filters.types || filters.types.includes('audience')) {
      const { rows } = await query<{ id: string; name: string; type: string; platform: string }>(
        `SELECT id, name, type, platform FROM audiences WHERE workspace_id = $1 AND name ILIKE $2 LIMIT $3`,
        [filters.workspaceId, searchTerm, Math.ceil(limit / 3)],
      );
      results.push(...rows.map((r) => ({
        id: r.id,
        type: 'audience' as const,
        title: r.name,
        subtitle: `${r.platform} • ${r.type}`,
        url: `/dashboard/audiences/${r.id}`,
        metadata: { type: r.type, platform: r.platform },
      })));
    }

    // Search reports
    if (!filters.types || filters.types.includes('report')) {
      const { rows } = await query<{ id: string; name: string; type: string }>(
        `SELECT id, name, type FROM reports WHERE workspace_id = $1 AND name ILIKE $2 LIMIT $3`,
        [filters.workspaceId, searchTerm, Math.ceil(limit / 3)],
      );
      results.push(...rows.map((r) => ({
        id: r.id,
        type: 'report' as const,
        title: r.name,
        subtitle: r.type,
        url: `/dashboard/reports/${r.id}`,
        metadata: { type: r.type },
      })));
    }

    return results.slice(0, limit);
  }

  async getSuggestions(_workspaceId: string, prefix: string): Promise<string[]> {
    // Placeholder — would query search suggestions index
    return prefix ? [`${prefix} campaigns`, `${prefix} audiences`, `${prefix} reports`] : [];
  }

  async getRecentSearches(_workspaceId: string, _userId: string): Promise<string[]> {
    // Placeholder — would query user search history
    return [];
  }
}
