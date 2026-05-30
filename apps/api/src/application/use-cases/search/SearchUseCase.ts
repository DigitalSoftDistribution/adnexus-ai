import type { ISearchRepository, SearchResult } from '../../../domain/repositories/ISearchRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface SearchInput {
  workspaceId: string;
  userRole: string;
  query: string;
  types?: string[];
  limit?: number;
}

export class SearchUseCase {
  constructor(private searchRepo: ISearchRepository) {}

  async execute(input: SearchInput): Promise<Result<SearchResult[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const results = await this.searchRepo.search({
      workspaceId: input.workspaceId,
      query: input.query,
      types: input.types,
      limit: input.limit,
    });

    return ok(results);
  }
}
