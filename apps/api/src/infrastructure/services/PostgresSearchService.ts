import type { ISearchService, SearchResult, SearchSuggestion } from '../../application/ports/ISearchService';
import { query } from '../database/connection';
import { logger } from '../../lib/logger';

export class PostgresSearchService implements ISearchService {
  async index(workspaceId: string, type: string, id: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await query(
        `INSERT INTO search_index (workspace_id, entity_type, entity_id, content, metadata, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (workspace_id, entity_type, entity_id) DO UPDATE SET
           content = EXCLUDED.content,
           metadata = EXCLUDED.metadata,
           updated_at = NOW()`,
        [workspaceId, type, id, content, metadata ? JSON.stringify(metadata) : null],
      );
    } catch (error) {
      logger.error({ error }, `Search index failed for ${type}/${id}`);
    }
  }

  async search(workspaceId: string, searchQuery: string, types?: string[], limit = 20): Promise<SearchResult[]> {
    try {
      let typeFilter = '';
      const params: unknown[] = [workspaceId, searchQuery, limit];

      if (types && types.length > 0) {
        typeFilter = ` AND entity_type = ANY($${params.length + 1}::text[])`;
        params.push(types);
      }

      const { rows } = await query<{
        entity_type: string;
        entity_id: string;
        content: string;
        metadata: Record<string, unknown> | null;
        similarity: number;
      }>(
        `SELECT entity_type, entity_id, content, metadata,
                similarity(content, $2) as similarity
         FROM search_index
         WHERE workspace_id = $1
           AND content ILIKE '%' || $2 || '%'
           ${typeFilter}
         ORDER BY similarity DESC
         LIMIT $3`,
        params,
      );

      return rows.map((row) => ({
        id: row.entity_id,
        type: row.entity_type,
        title: row.entity_id,
        snippet: row.content.slice(0, 200),
        score: row.similarity,
        metadata: row.metadata ?? undefined,
      }));
    } catch (error) {
      logger.error({ error }, `Search failed for query: ${searchQuery}`);
      return [];
    }
  }

  async suggest(workspaceId: string, prefix: string, limit = 10): Promise<SearchSuggestion[]> {
    try {
      const { rows } = await query<{ content: string; entity_type: string }>(
        `SELECT DISTINCT content, entity_type
         FROM search_index
         WHERE workspace_id = $1 AND content ILIKE $2 || '%'
         LIMIT $3`,
        [workspaceId, prefix, limit],
      );

      return rows.map((row, i) => ({
        text: row.content,
        type: row.entity_type,
        score: 1 - i * 0.1,
      }));
    } catch (error) {
      logger.error({ error }, `Suggest failed for prefix: ${prefix}`);
      return [];
    }
  }

  async deleteDocument(workspaceId: string, type: string, id: string): Promise<boolean> {
    try {
      const { rowCount } = await query(
        `DELETE FROM search_index WHERE workspace_id = $1 AND entity_type = $2 AND entity_id = $3`,
        [workspaceId, type, id],
      );
      return (rowCount ?? 0) > 0;
    } catch (error) {
      logger.error({ error }, `Search delete failed for ${type}/${id}`);
      return false;
    }
  }
}
