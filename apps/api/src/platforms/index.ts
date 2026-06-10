/**
 * AdNexus AI — Unified Platform Abstraction Layer
 *
 * This module provides a single, platform-agnostic interface so that
 * the rest of the application never needs to know which underlying
 * advertising platform (Meta, Google, TikTok, Snap) it is talking to.
 *
 * Architecture:
 *   PlatformManager  →  PlatformClient (per platform)
 *                          ↓
 *                    MetaClient | GoogleClient | TikTokClient | SnapClient
 *                          ↓
 *                    Native REST / gRPC API
 *
 * Each PlatformClient implements the same PlatformClient interface;
 * the manager simply routes calls to the right client.
 */

// ═══════════════════════════════════════════════
//  Re-exports — consumers import everything from here
// ═══════════════════════════════════════════════

export type {
  // Core types
  Platform,
  CampaignObjective,
  BudgetType,
  CampaignStatus,
  CreativeType,
  CallToAction,

  // Unified entities
  UnifiedCampaign,
  UnifiedAd,
  UnifiedInsight,
  UnifiedTargeting,
  LocationTarget,
  PlacementTarget,

  // Performance & summary
  AdPerformanceSnapshot,
  AccountSummary,
  PlatformBreakdown,
  CampaignBreakdown,
  DailyBreakdown,

  // Cross-platform
  CrossPlatformInsights,
  PlatformComparison,
  TopPerformer,
  TrendEntry,

  // Inputs
  DateRange,
  CampaignFilters,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdInput,

  // Auth & accounts
  AdAccount,
  OAuthConnectionRequest,
  TokenRefreshResult,

  // Draft / batch
  Draft,
  DraftAction,
  DraftActionType,
  DraftActionResult,
  DraftResult,

  // Config & client
  PlatformConfig,
  PlatformConfigEntry,
  RateLimitConfig,
  RetryPolicyConfig,
  PlatformFeature,
  PlatformClient,
  RateLimitStatus,
} from './types';

export {
  // Errors
  PlatformAPIError,
  PlatformAuthError,
  PlatformRateLimitError,
  PlatformValidationError,
  PlatformNotFoundError,
  PlatformServerError,
  PlatformNetworkError,

  // Error helpers
  isPlatformError,
  isRetryableError,
  getRetryAfterMs,
  isAuthError,
  isRateLimitError,
  wrapError,
} from './errors';

export type { PlatformErrorCode, PlatformErrorContext } from './errors';

export {
  // Config
  PLATFORM_CONFIG,
  getPlatformConfig,
  getAllPlatforms,
  platformSupportsFeature,
  getOAuthUrl,
  getTokenUrl,
  getApiBaseUrl,
} from './config';

// ═══════════════════════════════════════════════
//  Module-private imports
// ═══════════════════════════════════════════════

import type {
  Platform,
  UnifiedCampaign,
  UnifiedAd,
  UnifiedInsight,
  AccountSummary,
  CrossPlatformInsights,
  DateRange,
  CampaignFilters,
  CreateCampaignInput,
  UpdateCampaignInput,
  CreateAdInput,
  PlatformConfig,
  AdAccount,
  TokenRefreshResult,
  Draft,
  DraftResult,
  DraftAction,
  DraftActionResult,
  PlatformClient,
} from './types';

import {
  PlatformAPIError,
  isPlatformError,
  wrapError,
} from './errors';

import {
  PLATFORM_CONFIG,
} from './config';

import {
  loadWorkspaceAccounts,
  loadAdAccountById,
  persistRefreshedToken,
  markAccountDisconnected,
} from './account-store';

import { MetaPlatformClient } from '../infrastructure/platform/MetaPlatformClient';

// ═══════════════════════════════════════════════
//  Client Registry — maps platform → client factory
// ═══════════════════════════════════════════════

/** Factory function that creates a PlatformClient for a given account */
type ClientFactory = (account: AdAccount, config: PlatformConfig) => PlatformClient;

/** Internal registry of platform client factories */
const clientRegistry: Map<Platform, ClientFactory> = new Map();

/**
 * Register a platform client factory.
 * Called once at application startup by each platform module.
 *
 * @example
 * ```ts
 * // In meta-client.ts
 * registerPlatformClient('meta', (account, config) => new MetaClient(account, config));
 * ```
 */
export function registerPlatformClient(platform: Platform, factory: ClientFactory): void {
  clientRegistry.set(platform, factory);
}

/** Check if a platform has a registered client factory */
export function isPlatformRegistered(platform: Platform): boolean {
  return clientRegistry.has(platform);
}

/** Get list of platforms with registered clients */
export function getRegisteredPlatforms(): Platform[] {
  return Array.from(clientRegistry.keys());
}

// ═══════════════════════════════════════════════
//  PlatformManager
// ═══════════════════════════════════════════════

/**
 * Central orchestrator for all advertising platform operations.
 *
 * The PlatformManager is the **only** abstraction the rest of the application
 * needs to interact with. It handles:
 *
 *   • Client resolution — maps platform/account → PlatformClient
 *   • Unified CRUD — campaigns, ads, insights
 *   • Authentication — connect, disconnect, token refresh
 *   • Batch operations — cross-platform insights, draft execution
 *   • Error normalization — converts platform errors → PlatformAPIError
 *   • Circuit breaking — optional resilience per platform
 *
 * ### Usage
 * ```typescript
 * const manager = new PlatformManager(PLATFORM_CONFIG);
 *
 * // List campaigns across all connected accounts
 * const campaigns = await manager.getCampaigns(workspaceId);
 *
 * // Create a campaign on a specific platform
 * const campaign = await manager.createCampaign(workspaceId, {
 *   platform: 'meta',
 *   name: 'Summer Sale 2024',
 *   objective: 'conversions',
 *   budgetType: 'daily',
 *   budget: 100,
 *   startDate: '2024-06-01',
 *   targeting: { … },
 *   accountId: 'act_123456',
 * });
 * ```
 */
export class PlatformManager {
  private readonly config: PlatformConfig;

  /** In-memory cache of resolved clients (platform:accountId → client) */
  private readonly clientCache: Map<string, PlatformClient> = new Map();

  /** Active account connections per workspace (workspaceId → AdAccount[]) */
  private readonly workspaceAccounts: Map<string, AdAccount[]> = new Map();

  /** Token refresh locks to prevent thundering herd */
  private readonly refreshLocks: Set<string> = new Set();

  constructor(config: PlatformConfig) {
    this.config = config;
  }

  // ────────────────────────────────────────────
  //  Internal helpers
  // ────────────────────────────────────────────

  /** Build a cache key for a client instance */
  private cacheKey(platform: Platform, accountId: string): string {
    return `${platform}:${accountId}`;
  }

  /** Resolve workspace accounts from the `ad_accounts` table (cached per call). */
  private async resolveAccounts(workspaceId: string): Promise<AdAccount[]> {
    const cached = this.workspaceAccounts.get(workspaceId);
    if (cached) return cached;

    const accounts = await loadWorkspaceAccounts(workspaceId);
    this.workspaceAccounts.set(workspaceId, accounts);
    return accounts;
  }

  /** Drop the in-memory account cache for a workspace (after connect/disconnect). */
  private invalidateWorkspaceAccounts(workspaceId: string): void {
    this.workspaceAccounts.delete(workspaceId);
  }

  /** Get (or create) a PlatformClient for a given platform + account */
  private async getClientForAccount(
    platform: Platform,
    accountId: string,
    workspaceId: string,
  ): Promise<PlatformClient> {
    const key = this.cacheKey(platform, accountId);
    const cached = this.clientCache.get(key);
    if (cached) return cached;

    const factory = clientRegistry.get(platform);
    if (!factory) {
      throw new PlatformAPIError(
        platform,
        'UNKNOWN_ERROR',
        `No client registered for platform '${platform}'. ` +
          `Call registerPlatformClient('${platform}', ...) before using.`,
        false,
      );
    }

    // Find the account credentials
    const accounts = await this.resolveAccounts(workspaceId);
    const account = accounts.find(
      (a) => a.platform === platform && a.platformAccountId === accountId,
    );
    if (!account) {
      throw new PlatformAPIError(
        platform,
        'NOT_FOUND_ACCOUNT',
        `Account '${accountId}' (${platform}) not found in workspace '${workspaceId}'.`,
        false,
      );
    }

    // Check token expiry and refresh proactively
    if (this.isTokenExpired(account)) {
      await this.refreshAccountToken(account);
    }

    const client = factory(account, this.config);
    this.clientCache.set(key, client);
    return client;
  }

  /** Get clients for all connected accounts in a workspace, optionally filtered by platform */
  private async getClientsForWorkspace(
    workspaceId: string,
    filterPlatform?: Platform,
  ): Promise<{ platform: Platform; accountId: string; client: PlatformClient }[]> {
    const accounts = await this.resolveAccounts(workspaceId);
    const filtered = filterPlatform
      ? accounts.filter((a) => a.platform === filterPlatform)
      : accounts;

    const results: { platform: Platform; accountId: string; client: PlatformClient }[] = [];
    for (const account of filtered) {
      const client = await this.getClientForAccount(account.platform, account.platformAccountId, workspaceId);
      results.push({
        platform: account.platform,
        accountId: account.platformAccountId,
        client,
      });
    }
    return results;
  }

  /** Check if an account token is expired or about to expire (5 min buffer) */
  private isTokenExpired(account: AdAccount): boolean {
    if (!account.tokenExpiresAt) return false;
    const expiry = new Date(account.tokenExpiresAt);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    return expiry.getTime() - bufferMs < Date.now();
  }

  /** Refresh a single account token with locking */
  private async refreshAccountToken(account: AdAccount): Promise<void> {
    const lockKey = this.cacheKey(account.platform, account.id);
    if (this.refreshLocks.has(lockKey)) {
      // Another request is refreshing — wait briefly then return
      await new Promise((r) => setTimeout(r, 2000));
      return;
    }

    this.refreshLocks.add(lockKey);
    try {
      const factory = clientRegistry.get(account.platform);
      if (!factory) return;

      const client = factory(account, this.config);
      const result = await client.refreshToken();

      // Update the cached account with new token info
      account.accessToken = result.accessToken;
      account.tokenExpiresAt = result.expiresAt;

      // Invalidate the client cache entry so next use picks up fresh token
      this.clientCache.delete(this.cacheKey(account.platform, account.platformAccountId));

      // Persist the refreshed token so other processes see it.
      await persistRefreshedToken(account.id, result.accessToken, result.expiresAt);
    } catch (error) {
      throw wrapError(
        account.platform,
        error,
        `Failed to refresh token for ${account.platform} account ${account.platformAccountId}`,
      );
    } finally {
      this.refreshLocks.delete(lockKey);
    }
  }

  /** Execute a platform operation with automatic token refresh retry */
  private async executeWithRefresh<T>(
    platform: Platform,
    accountId: string,
    workspaceId: string,
    operation: (client: PlatformClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClientForAccount(platform, accountId, workspaceId);
    try {
      return await operation(client);
    } catch (error) {
      if (isPlatformError(error) && error.code === 'AUTH_TOKEN_EXPIRED') {
        // Refresh token and retry once
        await this.refreshAccountToken(client.account);
        const refreshedClient = await this.getClientForAccount(platform, accountId, workspaceId);
        return await operation(refreshedClient);
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════
  //  Campaign Operations
  // ═══════════════════════════════════════════════

  /**
   * List campaigns across all connected accounts in a workspace.
   *
   * @param workspaceId — the workspace to query
   * @param filters — optional filters (status, objective, platform, search, etc.)
   * @returns unified campaigns merged & sorted from all platforms
   */
  async getCampaigns(
    workspaceId: string,
    filters?: CampaignFilters,
  ): Promise<UnifiedCampaign[]> {
    const clients = await this.getClientsForWorkspace(
      workspaceId,
      filters?.platform?.[0],
    );

    if (clients.length === 0) return [];

    const results = await Promise.allSettled(
      clients.map(async ({ platform, accountId, client }) => {
        try {
          return await client.getCampaigns(filters);
        } catch (error) {
          throw wrapError(
            platform,
            error,
            `Failed to fetch campaigns from ${platform} account ${accountId}`,
          );
        }
      }),
    );

    const campaigns: UnifiedCampaign[] = [];
    const errors: Error[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        campaigns.push(...result.value);
      } else {
        errors.push(result.reason);
      }
    }

    // Apply post-fetch filtering
    let filtered = campaigns;
    if (filters?.status) {
      filtered = filtered.filter((c) => filters.status!.includes(c.status));
    }
    if (filters?.objective) {
      filtered = filtered.filter((c) => filters.objective!.includes(c.objective));
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Sorting
    const sortBy = filters?.sortBy ?? 'createdAt';
    const sortOrder = filters?.sortOrder ?? 'desc';
    filtered.sort((a, b) => {
      const aVal = a[sortBy] ?? '';
      const bVal = b[sortBy] ?? '';
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    // Pagination
    const offset = filters?.offset ?? 0;
    const limit = filters?.limit ?? filtered.length;

    // Log partial failures
    if (errors.length > 0 && clients.length > 1) {
      console.warn(`[PlatformManager] getCampaigns partial failure: ${errors.length}/${clients.length} platforms failed`, errors);
    }

    return filtered.slice(offset, offset + limit);
  }

  /**
   * Fetch a single campaign by its unified ID.
   *
   * The unified ID format is: `{platform}:{platformCampaignId}`
   * e.g. `meta:23849238492384`
   */
  async getCampaign(workspaceId: string, campaignId: string): Promise<UnifiedCampaign> {
    const [platform, platformCampaignId] = this.parseUnifiedId(campaignId);

    const clients = await this.getClientsForWorkspace(workspaceId, platform);
    if (clients.length === 0) {
      throw new PlatformAPIError(
        platform,
        'NOT_FOUND_ACCOUNT',
        `No connected ${platform} account found in workspace '${workspaceId}'.`,
        false,
      );
    }

    // Try each account until we find the campaign
    for (const { client } of clients) {
      try {
        return await client.getCampaign(platformCampaignId);
      } catch (error) {
        // If not found, continue to next account
        if (isPlatformError(error) && error.code === 'NOT_FOUND_CAMPAIGN') {
          continue;
        }
        throw error;
      }
    }

    throw new PlatformAPIError(
      platform,
      'NOT_FOUND_CAMPAIGN',
      `Campaign '${platformCampaignId}' not found on ${platform} for workspace '${workspaceId}'.`,
      false,
    );
  }

  /**
   * Create a campaign on the specified platform.
   *
   * @returns the created campaign in unified format
   */
  async createCampaign(
    workspaceId: string,
    data: CreateCampaignInput,
  ): Promise<UnifiedCampaign> {
    const { platform, accountId } = data;

    return this.executeWithRefresh(
      platform,
      accountId,
      workspaceId,
      async (client) => client.createCampaign(data),
    );
  }

  /**
   * Update an existing campaign.
   */
  async updateCampaign(
    workspaceId: string,
    campaignId: string,
    data: UpdateCampaignInput,
  ): Promise<UnifiedCampaign> {
    const [platform, platformCampaignId] = this.parseUnifiedId(campaignId);

    const clients = await this.getClientsForWorkspace(workspaceId, platform);
    if (clients.length === 0) {
      throw new PlatformAPIError(
        platform,
        'NOT_FOUND_ACCOUNT',
        `No connected ${platform} account found in workspace '${workspaceId}'.`,
        false,
      );
    }

    // Use the first matching account (campaign IDs are unique per platform)
    const { client } = clients[0];
    return this.executeWithRefresh(
      platform,
      client.account.platformAccountId,
      workspaceId,
      async (c) => c.updateCampaign(platformCampaignId, data),
    );
  }

  // ═══════════════════════════════════════════════
  //  Ad Operations
  // ═══════════════════════════════════════════════

  /**
   * List ads within a campaign.
   */
  async getAds(workspaceId: string, campaignId: string): Promise<UnifiedAd[]> {
    const [platform, platformCampaignId] = this.parseUnifiedId(campaignId);

    const clients = await this.getClientsForWorkspace(workspaceId, platform);
    if (clients.length === 0) return [];

    const { client } = clients[0];
    return this.executeWithRefresh(
      platform,
      client.account.platformAccountId,
      workspaceId,
      async (c) => c.getAds(platformCampaignId),
    );
  }

  /**
   * Create a new ad within a campaign.
   */
  async createAd(workspaceId: string, data: CreateAdInput): Promise<UnifiedAd> {
    const { platform } = data;
    const accountId = (data as unknown as Record<string, unknown>).accountId as string;

    return this.executeWithRefresh(
      platform,
      accountId,
      workspaceId,
      async (client) => client.createAd(data),
    );
  }

  // ═══════════════════════════════════════════════
  //  Insights / Reporting
  // ═══════════════════════════════════════════════

  /**
   * Get daily insights for a campaign.
   */
  async getInsights(
    workspaceId: string,
    campaignId: string,
    dateRange: DateRange,
  ): Promise<UnifiedInsight[]> {
    const [platform, platformCampaignId] = this.parseUnifiedId(campaignId);

    const clients = await this.getClientsForWorkspace(workspaceId, platform);
    if (clients.length === 0) return [];

    const { client } = clients[0];
    return this.executeWithRefresh(
      platform,
      client.account.platformAccountId,
      workspaceId,
      async (c) => c.getInsights(platformCampaignId, dateRange),
    );
  }

  /**
   * Get account-level summary metrics for a workspace.
   *
   * Aggregates data across all connected platform accounts.
   */
  async getAccountSummary(
    workspaceId: string,
    dateRange: DateRange,
  ): Promise<AccountSummary> {
    const clients = await this.getClientsForWorkspace(workspaceId);

    if (clients.length === 0) {
      return this.buildEmptyAccountSummary(workspaceId, dateRange);
    }

    const results = await Promise.allSettled(
      clients.map(async ({ platform, accountId, client }) => {
        try {
          return await client.getAccountSummary(dateRange);
        } catch (error) {
          console.warn(`[PlatformManager] Account summary failed for ${platform}/${accountId}:`, error);
          return null;
        }
      }),
    );

    const summaries = results
      .filter((r): r is PromiseFulfilledResult<AccountSummary | null> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((s): s is AccountSummary => s !== null);

    if (summaries.length === 0) {
      return this.buildEmptyAccountSummary(workspaceId, dateRange);
    }

    // If only one account, return directly
    if (summaries.length === 1) return summaries[0];

    // Merge multiple account summaries
    return this.mergeAccountSummaries(workspaceId, dateRange, summaries);
  }

  // ═══════════════════════════════════════════════
  //  Authentication
  // ═══════════════════════════════════════════════

  /**
   * Connect a new ad account via OAuth authorization code.
   *
   * Exchanges the code for tokens, validates the connection,
   * and stores the account record.
   */
  async connectAccount(
    workspaceId: string,
    platform: Platform,
    code: string,
  ): Promise<AdAccount> {
    const factory = clientRegistry.get(platform);
    if (!factory) {
      throw new PlatformAPIError(
        platform,
        'UNKNOWN_ERROR',
        `No client registered for platform '${platform}'.`,
        false,
      );
    }

    // TODO: Implement OAuth token exchange
    // This is a stub — each platform module will implement its own
    // token exchange via the PlatformClient interface.

    // Placeholder: create a dummy account record for now
    const account: AdAccount = {
      id: `${platform}_${Date.now()}`,
      workspaceId,
      platform,
      platformAccountId: 'placeholder',
      name: `${platform} Account`,
      currency: 'USD',
      timezone: 'America/New_York',
      status: 'active',
      accessToken: 'placeholder_token',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache the account in memory
    const existing = this.workspaceAccounts.get(workspaceId) || [];
    existing.push(account);
    this.workspaceAccounts.set(workspaceId, existing);

    return account;
  }

  /**
   * Disconnect (revoke) an ad account.
   */
  async disconnectAccount(workspaceId: string, accountId: string): Promise<void> {
    const accounts = await this.resolveAccounts(workspaceId);
    const account = accounts.find((a) => a.id === accountId);

    if (!account) {
      throw new PlatformAPIError(
        'meta',
        'NOT_FOUND_ACCOUNT',
        `Account '${accountId}' not found in workspace '${workspaceId}'.`,
        false,
      );
    }

    // Invalidate cached client
    this.clientCache.delete(this.cacheKey(account.platform, account.platformAccountId));

    // Mark disconnected + clear tokens in the database, then drop the cache.
    await markAccountDisconnected(account.id);
    this.invalidateWorkspaceAccounts(workspaceId);
  }

  /**
   * Refresh all tokens for a workspace proactively.
   */
  async refreshAllTokens(workspaceId: string): Promise<TokenRefreshResult[]> {
    const accounts = await this.resolveAccounts(workspaceId);
    const results: TokenRefreshResult[] = [];

    await Promise.all(
      accounts.map(async (account) => {
        if (!this.isTokenExpired(account)) return;

        try {
          await this.refreshAccountToken(account);
          results.push({
            accountId: account.id,
            platform: account.platform,
            accessToken: account.accessToken,
            expiresAt: account.tokenExpiresAt || new Date(Date.now() + 3600_000).toISOString(),
            refreshed: true,
          });
        } catch (error) {
          console.error(`[PlatformManager] Token refresh failed for ${account.platform}/${account.id}:`, error);
          results.push({
            accountId: account.id,
            platform: account.platform,
            accessToken: account.accessToken,
            expiresAt: account.tokenExpiresAt || '',
            refreshed: false,
          });
        }
      }),
    );

    return results;
  }

  // ═══════════════════════════════════════════════
  //  Batch / Cross-Platform Operations
  // ═══════════════════════════════════════════════

  /**
   * Get insights aggregated across all platforms for a workspace.
   */
  async getCrossPlatformInsights(
    workspaceId: string,
    dateRange: DateRange,
  ): Promise<CrossPlatformInsights> {
    const clients = await this.getClientsForWorkspace(workspaceId);

    // Gather all campaigns first
    const allCampaigns: UnifiedCampaign[] = [];
    const campaignFetchResults = await Promise.allSettled(
      clients.map(async ({ client }) => client.getCampaigns()),
    );
    for (const result of campaignFetchResults) {
      if (result.status === 'fulfilled') {
        allCampaigns.push(...result.value);
      }
    }

    // Calculate consolidated totals
    const consolidated = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
      roas: 0,
    };

    const platformComparisonMap = new Map<
      Platform,
      { platform: Platform; spend: number; impressions: number; clicks: number; conversions: number; conversionValue: number; budget: number }
    >;

    for (const campaign of allCampaigns) {
      consolidated.spend += campaign.spend;
      consolidated.impressions += campaign.impressions;
      consolidated.clicks += campaign.clicks;
      consolidated.conversions += campaign.conversions;

      const entry = platformComparisonMap.get(campaign.platform) || {
        platform: campaign.platform,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
        budget: 0,
      };
      entry.spend += campaign.spend;
      entry.impressions += campaign.impressions;
      entry.clicks += campaign.clicks;
      entry.conversions += campaign.conversions;
      entry.budget += campaign.budget;
      platformComparisonMap.set(campaign.platform, entry);
    }

    // Calculate derived metrics
    consolidated.conversionValue = allCampaigns.reduce(
      (sum, c) => sum + (c.roas > 0 && c.spend > 0 ? c.roas * c.spend : 0),
      0,
    );
    consolidated.roas = consolidated.spend > 0 ? consolidated.conversionValue / consolidated.spend : 0;

    const platformComparison = Array.from(platformComparisonMap.values()).map((p) => ({
      ...p,
      ctr: p.impressions > 0 ? p.clicks / p.impressions : 0,
      cpc: p.clicks > 0 ? p.spend / p.clicks : 0,
      cpa: p.conversions > 0 ? p.spend / p.conversions : 0,
      roas: p.spend > 0 && p.conversionValue > 0 ? p.conversionValue / p.spend : 0,
      budgetUtilization: p.budget > 0 ? p.spend / p.budget : 0,
      reach: undefined,
    }));

    // Top performers by ROAS
    const topPerformers = allCampaigns
      .filter((c) => c.spend > 0)
      .sort((a, b) => b.roas - a.roas)
      .slice(0, 10)
      .map((c, i) => ({
        campaignId: c.id,
        campaignName: c.name,
        platform: c.platform,
        roas: c.roas,
        spend: c.spend,
        conversions: c.conversions,
        rank: i + 1,
      }));

    return {
      workspaceId,
      dateRange,
      consolidated,
      platformComparison,
      topPerformers,
      trends: [], // TODO: aggregate daily trends across platforms
    };
  }

  /**
   * Execute a draft (batch of actions) across platforms.
   *
   * Actions are executed sequentially within a draft to handle
   * dependencies correctly. Each action can depend on previous
   * actions via the `dependsOn` field.
   */
  async executeDraft(workspaceId: string, draft: Draft): Promise<DraftResult> {
    const startedAt = new Date().toISOString();
    const updatedActions: DraftAction[] = [];
    let succeeded = 0;
    let failed = 0;
    let rolledBack = 0;

    // Build dependency graph and execute in topological order
    const actionMap = new Map(draft.actions.map((a) => [a.id, a]));
    const completedIds = new Set<string>();

    const canExecute = (action: DraftAction): boolean => {
      if (!action.dependsOn || action.dependsOn.length === 0) return true;
      return action.dependsOn.every((depId) => completedIds.has(depId));
    };

    const remaining = new Set(draft.actions);

    while (remaining.size > 0) {
      const batch = Array.from(remaining).filter(canExecute);
      if (batch.length === 0) {
        // Circular dependency detected
        for (const action of remaining) {
          updatedActions.push({
            ...action,
            status: 'failed',
            result: {
              success: false,
              error: 'Circular dependency detected',
              retryable: false,
              executedAt: new Date().toISOString(),
            },
          });
          failed++;
        }
        break;
      }

      for (const action of batch) {
        const result = await this.executeDraftAction(workspaceId, action);
        updatedActions.push({
          ...action,
          status: result.success ? 'completed' : 'failed',
          result,
        });
        completedIds.add(action.id);
        remaining.delete(action);

        if (result.success) {
          succeeded++;
        } else {
          failed++;
          // If this action has dependents, roll them back / mark as failed
          for (const depAction of remaining) {
            if (depAction.dependsOn?.includes(action.id)) {
              updatedActions.push({
                ...depAction,
                status: 'rolled_back',
                result: {
                  success: false,
                  error: `Dependency action '${action.id}' failed`,
                  retryable: false,
                  executedAt: new Date().toISOString(),
                },
              });
              completedIds.add(depAction.id);
              remaining.delete(depAction);
              rolledBack++;
            }
          }
        }
      }
    }

    const completedAt = new Date().toISOString();
    return {
      draftId: draft.id,
      status: failed === 0 ? 'completed' : succeeded > 0 ? 'partial' : 'failed',
      actions: updatedActions,
      summary: { total: draft.actions.length, succeeded, failed, rolledBack },
      startedAt,
      completedAt,
    };
  }

  /** Execute a single draft action */
  private async executeDraftAction(
    workspaceId: string,
    action: DraftAction,
  ): Promise<DraftActionResult> {
    const { platform, accountId, type, payload } = action;
    const executedAt = new Date().toISOString();

    try {
      return await this.executeWithRefresh(
        platform,
        accountId,
        workspaceId,
        async (client) => {
          let platformObjectId: string | undefined;

          switch (type) {
            case 'create_campaign':
              platformObjectId = (await client.createCampaign(payload as unknown as CreateCampaignInput)).platformCampaignId;
              break;
            case 'update_campaign':
              await client.updateCampaign(payload.campaignId as string, payload as UpdateCampaignInput);
              platformObjectId = payload.campaignId as string;
              break;
            case 'pause_campaign':
              await client.pauseCampaign(payload.campaignId as string);
              platformObjectId = payload.campaignId as string;
              break;
            case 'resume_campaign':
              await client.resumeCampaign(payload.campaignId as string);
              platformObjectId = payload.campaignId as string;
              break;
            case 'create_ad':
              platformObjectId = (await client.createAd(payload as unknown as CreateAdInput)).platformAdId;
              break;
            case 'update_ad':
              await client.updateAd(payload.adId as string, payload);
              platformObjectId = payload.adId as string;
              break;
            case 'pause_ad':
              await client.pauseCampaign(payload.adId as string);
              platformObjectId = payload.adId as string;
              break;
            default:
              return {
                success: false,
                error: `Unknown draft action type: ${type}`,
                retryable: false,
                executedAt,
              };
          }

          return {
            success: true,
            platformObjectId,
            retryable: false,
            executedAt,
          };
        },
      );
    } catch (error) {
      const wrapped = wrapError(platform, error);
      return {
        success: false,
        error: wrapped.message,
        errorCode: wrapped.code,
        retryable: wrapped.retryable,
        executedAt,
      };
    }
  }

  // ────────────────────────────────────────────
  //  Utility
  // ────────────────────────────────────────────

  /** Parse a unified ID into its platform + native ID components */
  private parseUnifiedId(unifiedId: string): [Platform, string] {
    const sepIndex = unifiedId.indexOf(':');
    if (sepIndex === -1) {
      throw new PlatformAPIError(
        'meta',
        'VALIDATION_INVALID_FORMAT',
        `Invalid unified ID format: '${unifiedId}'. Expected 'platform:nativeId'.`,
        false,
      );
    }
    const platform = unifiedId.slice(0, sepIndex) as Platform;
    const nativeId = unifiedId.slice(sepIndex + 1);
    return [platform, nativeId];
  }

  /** Build an empty account summary when no accounts are connected */
  private buildEmptyAccountSummary(workspaceId: string, dateRange: DateRange): AccountSummary {
    return {
      workspaceId,
      dateRange,
      totals: {
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        conversionValue: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
      },
      byPlatform: [],
      byCampaign: [],
      byDay: [],
    };
  }

  /** Merge multiple account summaries into a single consolidated view */
  private mergeAccountSummaries(
    workspaceId: string,
    dateRange: DateRange,
    summaries: AccountSummary[],
  ): AccountSummary {
    const totals = {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      conversionValue: 0,
      ctr: 0,
      cpc: 0,
      cpa: 0,
      roas: 0,
      reach: 0,
    };

    const byPlatform: Map<string, (typeof summaries)[0]['byPlatform'][0]> = new Map();
    const byCampaign: AccountSummary['byCampaign'] = [];
    const byDayMap: Map<string, AccountSummary['byDay'][0]> = new Map();

    for (const summary of summaries) {
      totals.spend += summary.totals.spend;
      totals.impressions += summary.totals.impressions;
      totals.clicks += summary.totals.clicks;
      totals.conversions += summary.totals.conversions;
      totals.conversionValue += summary.totals.conversionValue;
      if (summary.totals.reach) totals.reach += summary.totals.reach;

      for (const p of summary.byPlatform) {
        const existing = byPlatform.get(p.platform);
        if (existing) {
          existing.spend += p.spend;
          existing.impressions += p.impressions;
          existing.clicks += p.clicks;
          existing.conversions += p.conversions;
          existing.conversionValue += p.conversionValue;
          existing.budget += p.budget;
        } else {
          byPlatform.set(p.platform, { ...p });
        }
      }

      byCampaign.push(...summary.byCampaign);

      for (const day of summary.byDay) {
        const existing = byDayMap.get(day.date);
        if (existing) {
          existing.spend += day.spend;
          existing.impressions += day.impressions;
          existing.clicks += day.clicks;
          existing.conversions += day.conversions;
        } else {
          byDayMap.set(day.date, { ...day });
        }
      }
    }

    // Recalculate derived metrics
    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
    totals.cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
    totals.cpa = totals.conversions > 0 ? totals.spend / totals.conversions : 0;
    totals.roas = totals.spend > 0 ? totals.conversionValue / totals.spend : 0;

    const mergedByDay = Array.from(byDayMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      workspaceId,
      dateRange,
      totals,
      byPlatform: Array.from(byPlatform.values()),
      byCampaign,
      byDay: mergedByDay,
    };
  }
}

// ═══════════════════════════════════════════════
//  Factory — create a pre-configured manager
// ═══════════════════════════════════════════════

/**
 * Create a PlatformManager with the default configuration.
 *
 * @example
 * ```typescript
 * import { createPlatformManager } from './platforms';
 * const manager = createPlatformManager();
 * ```
 */
export function createPlatformManager(): PlatformManager {
  return new PlatformManager(PLATFORM_CONFIG);
}

/**
 * Create a PlatformManager with a partial custom configuration.
 * Values not provided will fall back to the defaults in PLATFORM_CONFIG.
 */
export function createPlatformManagerWithConfig(
  overrides: Partial<PlatformConfig>,
): PlatformManager {
  const merged: PlatformConfig = {
    meta: { ...PLATFORM_CONFIG.meta, ...overrides.meta },
    google: { ...PLATFORM_CONFIG.google, ...overrides.google },
    tiktok: { ...PLATFORM_CONFIG.tiktok, ...overrides.tiktok },
    snap: { ...PLATFORM_CONFIG.snap, ...overrides.snap },
    defaults: { ...PLATFORM_CONFIG.defaults, ...overrides.defaults },
  };
  return new PlatformManager(merged);
}

// ═══════════════════════════════════════════════
//  Meta platform client factory (per-workspace OAuth)
// ═══════════════════════════════════════════════

export { loadAdAccountById };

/**
 * Create a MetaPlatformClient for a workspace-connected ad account.
 * Returns null when the account is missing, inactive, or not a Meta account
 * in the given workspace.
 */
export async function createMetaPlatformClientForWorkspace(
  workspaceId: string,
  adAccountId: string,
): Promise<MetaPlatformClient | null> {
  const account = await loadAdAccountById(adAccountId);
  if (!account || account.workspaceId !== workspaceId || account.platform !== 'meta') {
    return null;
  }
  return new MetaPlatformClient(account.id);
}
