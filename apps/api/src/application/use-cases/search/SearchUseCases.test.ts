import { describe, it, expect, vi } from 'vitest';
import { SearchUseCase } from './SearchUseCase';
import { GetSuggestionsUseCase } from './GetSuggestionsUseCase';
import type { ISearchRepository, SearchResult } from '../../../domain/repositories/ISearchRepository';

const result: SearchResult = {
  id: 'c-1',
  type: 'campaign',
  title: 'Spring campaign',
  subtitle: 'Meta',
  url: '/campaigns/c-1',
  metadata: { platform: 'meta' },
};

const makeRepo = (overrides: Partial<ISearchRepository> = {}): ISearchRepository =>
  ({
    search: vi.fn().mockResolvedValue([result]),
    getSuggestions: vi.fn().mockResolvedValue(['spring campaign', 'spring audience']),
    getRecentSearches: vi.fn().mockResolvedValue([]),
    ...overrides,
  }) as ISearchRepository;

const status = (r: { success: boolean; error?: unknown }) =>
  (r as { error: { statusCode: number } }).error.statusCode;

describe('SearchUseCase', () => {
  const base = { workspaceId: 'ws-1', userRole: 'viewer', query: 'spring' };

  it('allows workspace members to search', async () => {
    const res = await new SearchUseCase(makeRepo()).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual([result]);
  });

  it('forwards workspace, query, type, and limit filters', async () => {
    const repo = makeRepo();
    await new SearchUseCase(repo).execute({
      ...base,
      userRole: 'editor',
      types: ['campaign', 'audience'],
      limit: 7,
    });
    expect(repo.search).toHaveBeenCalledWith({
      workspaceId: 'ws-1',
      query: 'spring',
      types: ['campaign', 'audience'],
      limit: 7,
    });
  });

  it('denies unknown roles (403) and does not search', async () => {
    const repo = makeRepo();
    const res = await new SearchUseCase(repo).execute({ ...base, userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.search).not.toHaveBeenCalled();
  });
});

describe('GetSuggestionsUseCase', () => {
  const base = { workspaceId: 'ws-1', userRole: 'viewer', prefix: 'spr' };

  it('returns suggestions for a workspace member', async () => {
    const res = await new GetSuggestionsUseCase(makeRepo()).execute(base);
    expect(res.success).toBe(true);
    if (res.success) expect(res.data).toEqual(['spring campaign', 'spring audience']);
  });

  it('passes workspace and prefix through to the repository', async () => {
    const repo = makeRepo();
    await new GetSuggestionsUseCase(repo).execute(base);
    expect(repo.getSuggestions).toHaveBeenCalledWith('ws-1', 'spr');
  });

  it('denies unknown roles (403) and does not fetch suggestions', async () => {
    const repo = makeRepo();
    const res = await new GetSuggestionsUseCase(repo).execute({ ...base, userRole: 'guest' });
    expect(res.success).toBe(false);
    if (!res.success) expect(status(res)).toBe(403);
    expect(repo.getSuggestions).not.toHaveBeenCalled();
  });
});
