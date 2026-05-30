export interface SearchResult {
  id: string;
  type: 'campaign' | 'ad' | 'audience' | 'report' | 'draft' | 'alert';
  title: string;
  subtitle?: string;
  url: string;
  metadata: Record<string, unknown>;
}

export interface SearchFilters {
  workspaceId: string;
  query: string;
  types?: string[];
  limit?: number;
}

export interface ISearchRepository {
  search(filters: SearchFilters): Promise<SearchResult[]>;
  getSuggestions(workspaceId: string, prefix: string): Promise<string[]>;
  getRecentSearches(workspaceId: string, userId: string): Promise<string[]>;
}
