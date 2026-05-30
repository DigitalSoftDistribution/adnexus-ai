export interface SearchResult {
  id: string;
  type: string;
  title: string;
  snippet: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SearchSuggestion {
  text: string;
  type: string;
  score: number;
}

export interface ISearchService {
  index(workspaceId: string, type: string, id: string, content: string, metadata?: Record<string, unknown>): Promise<void>;
  search(workspaceId: string, query: string, types?: string[], limit?: number): Promise<SearchResult[]>;
  suggest(workspaceId: string, prefix: string, limit?: number): Promise<SearchSuggestion[]>;
  deleteDocument(workspaceId: string, type: string, id: string): Promise<boolean>;
}
