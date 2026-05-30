import type { ISearchRepository } from '../../../domain/repositories/ISearchRepository';
import { Result, ok, err, ForbiddenError } from '../../../domain/value-objects/Result';

export interface GetSuggestionsInput {
  workspaceId: string;
  userRole: string;
  prefix: string;
}

export class GetSuggestionsUseCase {
  constructor(private searchRepo: ISearchRepository) {}

  async execute(input: GetSuggestionsInput): Promise<Result<string[]>> {
    if (!['owner', 'admin', 'editor', 'viewer'].includes(input.userRole)) {
      return err(new ForbiddenError('Insufficient permissions'));
    }

    const suggestions = await this.searchRepo.getSuggestions(input.workspaceId, input.prefix);
    return ok(suggestions);
  }
}
