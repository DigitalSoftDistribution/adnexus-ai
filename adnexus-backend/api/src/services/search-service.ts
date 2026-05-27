import { supabase } from '../lib/supabase';
import { getRedisClient } from '../lib/redis';
import { config } from '../config';
import type {
  UnifiedCampaign,
  UnifiedAdSet,
  UnifiedAd,
  Draft,
  AuditLogEntry,
  Platform,
  CampaignStatus,
  DraftStatus,
  DraftType,
} from '../types';

// ─── Types ───────────────────────────────────────────────────

export interface SearchOptions {
  platform?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minSpend?: number;
  maxSpend?: number;
  minRoas?: number;
  campaignId?: string;
  adsetId?: string;
  creativeType?: string;
  draftType?: string;
  actorType?: string;
  actionCategory?: string;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'spend' | 'roas' | 'created_at';
}

export interface SearchResult<T> {
  items: T[];
  total: number;
}

export interface GlobalSearchResult {
  campaigns: UnifiedCampaign[];
  adsets: UnifiedAdSet[];
  ads: UnifiedAd[];
  drafts: Draft[];
  total: number;
}

// ─── Constants ───────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const RECENT_SEARCH_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const RECENT_SEARCH_KEY_PREFIX = 'recent_searches';

function clampLimit(limit?: number): number {
  if (!limit) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, limit));
}

function clampOffset(offset?: number): number {
  if (!offset) return 0;
  return Math.max(0, offset);
}

/** Sanitize a user-provided search query by removing characters that could
 *  interfere with ILIKE patterns (keep alphanumerics, spaces, and common punctuation). */
function sanitizeQuery(query: string): string {
  return query
    .replace(/[%_\\]/g, '')
    .trim()
    .slice(0, 200);
}

/** Build an ILIKE filter string for a column against a search term.
 *  Returns the pattern safely formatted for Supabase .ilike(). */
function ilikePattern(term: string): string {
  return `%${term}%`;
}

/** Detect if a query looks like a multi-word phrase (contains spaces)
 *  in which case we may want to apply word-boundary ordering. */
function isMultiWord(query: string): boolean {
  return query.trim().includes(' ');
}

/** Build a simple relevance ordering SQL fragment for a column and a term.
 *  When the term starts the column value, it scores higher (0) vs. substring (1). */
function relevanceOrder(column: string, term: string): string {
  return `CASE WHEN ${column} ILIKE '${term}%' THEN 0 ELSE 1 END`;
}

// ─── Campaign Search ─────────────────────────────────────────

export async function searchCampaigns(
  workspaceId: string,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult<UnifiedCampaign>> {
  const term = sanitizeQuery(query);
  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  // Base query: join campaigns → ad_accounts for workspace scoping
  let dbQuery = supabase
    .from('campaigns')
    .select('*, ad_accounts!inner(workspace_id, platform)', { count: 'exact' })
    .eq('ad_accounts.workspace_id', workspaceId);

  // Apply ILIKE text search across campaign name and objective
  if (term.length > 0) {
    const pattern = ilikePattern(term);
    dbQuery = dbQuery.or(`name.ilike.${pattern},objective.ilike.${pattern}`);
  }

  // Apply filters
  if (options?.platform) {
    dbQuery = dbQuery.eq('ad_accounts.platform', options.platform);
  }
  if (options?.status) {
    dbQuery = dbQuery.eq('status', options.status);
  }
  if (options?.dateFrom) {
    dbQuery = dbQuery.gte('created_at', options.dateFrom);
  }
  if (options?.dateTo) {
    dbQuery = dbQuery.lte('created_at', options.dateTo);
  }
  if (options?.minSpend !== undefined && options.minSpend > 0) {
    dbQuery = dbQuery.gte('spend', options.minSpend);
  }
  if (options?.maxSpend !== undefined && options.maxSpend > 0) {
    dbQuery = dbQuery.lte('spend', options.maxSpend);
  }
  if (options?.minRoas !== undefined && options.minRoas > 0) {
    dbQuery = dbQuery.gte('roas', options.minRoas);
  }

  // Sorting
  const sort = options?.sort ?? 'relevance';
  if (sort === 'relevance' && term.length > 0) {
    // Order by prefix match first, then by created_at desc
    if (!isMultiWord(term)) {
      dbQuery = dbQuery
        .order('name', { ascending: true, foreignTable: undefined })
        .order('created_at', { ascending: false });
    } else {
      dbQuery = dbQuery.order('created_at', { ascending: false });
    }
  } else if (sort === 'spend') {
    dbQuery = dbQuery.order('spend', { ascending: false });
  } else if (sort === 'roas') {
    dbQuery = dbQuery.order('roas', { ascending: false });
  } else {
    dbQuery = dbQuery.order('created_at', { ascending: false });
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw new Error(`Failed to search campaigns: ${error.message}`);

  const campaigns = (data ?? []).map((row) => ({
    ...row,
    platform: row.ad_accounts?.platform as Platform,
  })) as UnifiedCampaign[];

  return { items: campaigns, total: count ?? 0 };
}

// ─── AdSet Search ────────────────────────────────────────────

export async function searchAdsets(
  workspaceId: string,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult<UnifiedAdSet>> {
  const term = sanitizeQuery(query);
  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  // Join: adsets → campaigns → ad_accounts for workspace scoping
  let dbQuery = supabase
    .from('adsets')
    .select('*, campaigns!inner(ad_account_id, ad_accounts!inner(workspace_id))', { count: 'exact' })
    .eq('campaigns.ad_accounts.workspace_id', workspaceId);

  if (term.length > 0) {
    const pattern = ilikePattern(term);
    // Search across adset name and targeting demographics (stored as JSONB)
    dbQuery = dbQuery.or(`name.ilike.${pattern}`);
  }

  if (options?.campaignId) {
    dbQuery = dbQuery.eq('campaign_id', options.campaignId);
  }
  if (options?.status) {
    dbQuery = dbQuery.eq('status', options.status);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw new Error(`Failed to search adsets: ${error.message}`);

  return { items: (data ?? []) as unknown as UnifiedAdSet[], total: count ?? 0 };
}

// ─── Ad Search ───────────────────────────────────────────────

export async function searchAds(
  workspaceId: string,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult<UnifiedAd>> {
  const term = sanitizeQuery(query);
  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  // Join: ads → adsets → campaigns → ad_accounts for workspace scoping
  let dbQuery = supabase
    .from('ads')
    .select(
      '*, adsets!inner(campaign_id, campaigns!inner(ad_account_id, ad_accounts!inner(workspace_id)))',
      { count: 'exact' },
    )
    .eq('adsets.campaigns.ad_accounts.workspace_id', workspaceId);

  if (term.length > 0) {
    const pattern = ilikePattern(term);
    dbQuery = dbQuery.or(`name.ilike.${pattern},creative_text.ilike.${pattern},creative_type.ilike.${pattern}`);
  }

  if (options?.adsetId) {
    dbQuery = dbQuery.eq('adset_id', options.adsetId);
  }
  if (options?.status) {
    dbQuery = dbQuery.eq('status', options.status);
  }
  if (options?.creativeType) {
    dbQuery = dbQuery.eq('creative_type', options.creativeType);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw new Error(`Failed to search ads: ${error.message}`);

  return { items: (data ?? []) as unknown as UnifiedAd[], total: count ?? 0 };
}

// ─── Draft Search ────────────────────────────────────────────

export async function searchDrafts(
  workspaceId: string,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult<Draft>> {
  const term = sanitizeQuery(query);
  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  let dbQuery = supabase
    .from('drafts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  if (term.length > 0) {
    const pattern = ilikePattern(term);
    dbQuery = dbQuery.or(
      `change_summary.ilike.${pattern},ai_reasoning.ilike.${pattern},actor_name.ilike.${pattern},status.ilike.${pattern}`,
    );
  }

  if (options?.status) {
    dbQuery = dbQuery.eq('status', options.status);
  }
  if (options?.draftType) {
    dbQuery = dbQuery.eq('draft_type', options.draftType);
  }
  if (options?.actorType) {
    dbQuery = dbQuery.eq('actor_type', options.actorType);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw new Error(`Failed to search drafts: ${error.message}`);

  return { items: (data ?? []) as Draft[], total: count ?? 0 };
}

// ─── Audit Log Search ────────────────────────────────────────

export async function searchAuditLog(
  workspaceId: string,
  query: string,
  options?: SearchOptions,
): Promise<SearchResult<AuditLogEntry>> {
  const term = sanitizeQuery(query);
  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  let dbQuery = supabase
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId);

  if (term.length > 0) {
    const pattern = ilikePattern(term);
    dbQuery = dbQuery.or(
      `action.ilike.${pattern},actor_name.ilike.${pattern},details::text.ilike.${pattern}`,
    );
  }

  if (options?.actionCategory) {
    dbQuery = dbQuery.eq('action_category', options.actionCategory);
  }
  if (options?.dateFrom) {
    dbQuery = dbQuery.gte('created_at', options.dateFrom);
  }
  if (options?.dateTo) {
    dbQuery = dbQuery.lte('created_at', options.dateTo);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw new Error(`Failed to search audit log: ${error.message}`);

  return { items: (data ?? []) as AuditLogEntry[], total: count ?? 0 };
}

// ─── Global Search ───────────────────────────────────────────

export async function globalSearch(
  workspaceId: string,
  query: string,
  options?: SearchOptions,
): Promise<GlobalSearchResult> {
  const limit = clampLimit(options?.limit);
  const offset = clampOffset(options?.offset);

  const opts = { ...options, limit: Math.min(limit, 20), offset };

  // Run all entity searches in parallel
  const [campaignsResult, adsetsResult, adsResult, draftsResult] = await Promise.all([
    searchCampaigns(workspaceId, query, opts),
    searchAdsets(workspaceId, query, opts),
    searchAds(workspaceId, query, opts),
    searchDrafts(workspaceId, query, opts),
  ]);

  return {
    campaigns: campaignsResult.items,
    adsets: adsetsResult.items,
    ads: adsResult.items,
    drafts: draftsResult.items,
    total: campaignsResult.total + adsetsResult.total + adsResult.total + draftsResult.total,
  };
}

// ─── Autocomplete Suggestions ────────────────────────────────

export async function getAutocompleteSuggestions(
  workspaceId: string,
  query: string,
  limit?: number,
): Promise<string[]> {
  const term = sanitizeQuery(query);
  const suggLimit = Math.min(20, Math.max(1, limit ?? 10));

  if (term.length === 0) return [];

  const pattern = `${term}%`;

  // Fetch matching campaign names
  const { data: campaignsData } = await supabase
    .from('campaigns')
    .select('name, ad_accounts!inner(workspace_id)')
    .eq('ad_accounts.workspace_id', workspaceId)
    .ilike('name', pattern)
    .order('name', { ascending: true })
    .limit(suggLimit);

  // Fetch matching ad names
  const { data: adsData } = await supabase
    .from('ads')
    .select('name, adsets!inner(campaign_id, campaigns!inner(ad_account_id, ad_accounts!inner(workspace_id)))')
    .eq('adsets.campaigns.ad_accounts.workspace_id', workspaceId)
    .ilike('name', pattern)
    .order('name', { ascending: true })
    .limit(suggLimit);

  // Fetch matching adset names
  const { data: adsetsData } = await supabase
    .from('adsets')
    .select('name, campaigns!inner(ad_account_id, ad_accounts!inner(workspace_id))')
    .eq('campaigns.ad_accounts.workspace_id', workspaceId)
    .ilike('name', pattern)
    .order('name', { ascending: true })
    .limit(suggLimit);

  // Fetch matching draft change summaries
  const { data: draftsData } = await supabase
    .from('drafts')
    .select('change_summary')
    .eq('workspace_id', workspaceId)
    .ilike('change_summary', pattern)
    .order('change_summary', { ascending: true })
    .limit(suggLimit);

  // Combine and deduplicate
  const suggestions = new Set<string>();
  for (const row of campaignsData ?? []) {
    suggestions.add(row.name);
  }
  for (const row of adsData ?? []) {
    suggestions.add(row.name);
  }
  for (const row of adsetsData ?? []) {
    suggestions.add(row.name);
  }
  for (const row of draftsData ?? []) {
    suggestions.add(row.change_summary);
  }

  return Array.from(suggestions).slice(0, suggLimit);
}

// ─── Recent Searches (Redis-backed) ──────────────────────────

function recentSearchKey(workspaceId: string, userId: string): string {
  return `${RECENT_SEARCH_KEY_PREFIX}:${workspaceId}:${userId}`;
}

/** Save a recent search query to Redis with LRU deduping and a 7-day TTL. */
export async function saveRecentSearch(
  workspaceId: string,
  userId: string,
  query: string,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    // Graceful degradation when Redis is unavailable
    return;
  }

  const key = recentSearchKey(workspaceId, userId);
  const trimmed = query.trim().slice(0, 200);
  if (trimmed.length === 0) return;

  try {
    // Remove existing entry if present (dedupe), then prepend
    await redis.lrem(key, 0, trimmed);
    await redis.lpush(key, trimmed);
    // Trim to keep only the last 50 searches
    await redis.ltrim(key, 0, 49);
    // Set TTL
    await redis.expire(key, RECENT_SEARCH_TTL);
  } catch {
    // Silently ignore Redis errors — recent searches are best-effort
  }
}

/** Retrieve recent search queries from Redis. */
export async function getRecentSearches(
  workspaceId: string,
  userId: string,
  limit?: number,
): Promise<string[]> {
  const redis = getRedisClient();
  if (!redis) {
    return [];
  }

  const key = recentSearchKey(workspaceId, userId);
  const count = Math.min(50, Math.max(1, limit ?? 10));

  try {
    const items = await redis.lrange(key, 0, count - 1);
    return items ?? [];
  } catch {
    return [];
  }
}
