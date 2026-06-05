// ============================================
// Snap Ads API Client — AdNexus AI
// ============================================
// Production-grade client for Snapchat Marketing API v1
// with OAuth 2.0, token refresh, rate limiting (20 QPS),
// exponential backoff, retry logic, and full CRUD for
// campaigns, ads, and insights.

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { config } from '../../config';
import { PlatformError } from '../../lib/errors';

// ─── Constants ───────────────────────────────────────────────

const SNAP_API_BASE = 'https://adsapi.snapchat.com/v1';
const SNAP_AUTH_BASE = 'https://accounts.snapchat.com/accounts/oauth2';
const SNAP_RATE_LIMIT_QPS = 20;
const SNAP_RATE_LIMIT_WINDOW_MS = 1000;
const DEFAULT_RETRY_MAX = 3;
const DEFAULT_RETRY_BASE_MS = 500;

// ─── Type Definitions ────────────────────────────────────────

/**
 * Snap Campaign status values
 */
export type SnapCampaignStatus =
  | 'ACTIVE'
  | 'PAUSED'
  | 'ARCHIVED'
  | 'DELETED'
  | 'PENDING_REVIEW'
  | 'REJECTED';

/**
 * Snap Campaign objective values
 */
export type SnapCampaignObjective =
  | 'AWARENESS'
  | 'APP_INSTALLS'
  | 'VIDEO_VIEWS'
  | 'TRAFFIC'
  | 'ENGAGEMENT'
  | 'WEBSITE_CONVERSIONS'
  | 'CATALOG_SALES'
  | 'LEAD_GENERATION';

/**
 * Snap Campaign model
 */
export interface SnapCampaign {
  id: string;
  name: string;
  status: SnapCampaignStatus;
  objective: SnapCampaignObjective;
  daily_budget_micro?: number;
  lifetime_budget_micro?: number;
  start_time: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
  ad_account_id: string;
  buying_model?: 'AUCTION' | 'RESERVED' | 'RESERVED_REACH_AND_FREQUENCY';
}

/**
 * Snap Ad Squad (Ad Set) model
 */
export interface SnapAdSquad {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED';
  campaign_id: string;
  bid_micro?: number;
  daily_budget_micro?: number;
  lifetime_budget_micro?: number;
  start_time: string;
  end_time?: string;
  targeting?: Record<string, unknown>;
  placement: string;
  bid_strategy?: string;
  optimization_goal?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Snap Ad model
 */
export interface SnapAd {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'PENDING_REVIEW' | 'REJECTED';
  ad_squad_id: string;
  creative_id: string;
  type: string;
  created_at: string;
  updated_at: string;
}

/**
 * Snap Organization model
 */
export interface SnapOrganization {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

/**
 * Snap Ad Account model
 */
export interface SnapAdAccount {
  id: string;
  name: string;
  status: string;
  organization_id: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

/**
 * Snap Insight / Stats metrics
 */
export interface SnapInsight {
  id: string;
  type: 'campaign' | 'ad_squad' | 'ad';
  granularity: string;
  start_time: string;
  end_time: string;
  timeseries?: SnapTimeseriesInsight[];
  total: SnapTotalMetrics;
}

export interface SnapTimeseriesInsight {
  start_time: string;
  end_time: string;
  stats: SnapMetrics;
}

export interface SnapTotalMetrics {
  stats: SnapMetrics;
}

export interface SnapMetrics {
  impressions?: number;
  swipes?: number;
  spend?: number;
  quartile_1?: number;
  quartile_2?: number;
  quartile_3?: number;
  view_completion?: number;
  video_views?: number;
  screen_time_millis?: number;
  conversions?: number;
  conversion_value?: number;
  conversion_rate?: number;
  reach?: number;
  frequency?: number;
  paid_impressions?: number;
  paid_swipes?: number;
  swipe_up_rate?: number;
  cost_per_swipe?: number;
  cost_per_thousand_impressions?: number;
  conversion_purchases?: number;
  conversion_purchases_value?: number;
  conversion_add_to_cart?: number;
  conversion_sign_ups?: number;
  conversion_level_completes?: number;
  conversion_app_opens?: number;
  conversion_page_views?: number;
  conversion_save?: number;
  conversion_start_checkout?: number;
  conversion_add_billing?: number;
  conversion_searches?: number;
  conversion_subscribe?: number;
  conversion_lead_form_opens?: number;
  conversion_lead_form_submits?: number;
}

/**
 * Date range for insights queries
 */
export interface SnapDateRange {
  startDate: string;
  endDate: string;
}

/**
 * Fetch options for paginated list endpoints
 */
export interface SnapFetchOptions {
  status?: string;
  limit?: number;
  offset?: number;
  fields?: string[];
}

/**
 * OAuth 2.0 token response from Snap
 */
export interface SnapTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

/**
 * Token management state
 */
export interface SnapTokenState {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableStatuses?: number[];
}

// ─── API Error Classes ───────────────────────────────────────

/**
 * Snap API-specific error with structured context
 */
export class SnapApiError extends PlatformError {
  constructor(
    message: string,
    public readonly snapCode?: string,
    public readonly httpStatus?: number,
    public readonly requestId?: string,
    public readonly rawResponse?: Record<string, unknown>,
  ) {
    super('snap', message);
    this.name = 'SnapApiError';
  }
}

/**
 * Snap rate limit error with retry-after hint
 */
export class SnapRateLimitError extends SnapApiError {
  constructor(
    message: string,
    public readonly retryAfterMs: number,
    snapCode?: string,
  ) {
    super(message, snapCode, 429);
    this.name = 'SnapRateLimitError';
  }
}

/**
 * Snap authentication error (token expired, invalid, etc.)
 */
export class SnapAuthError extends SnapApiError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'SnapAuthError';
  }
}

// ─── Rate Limiter ────────────────────────────────────────────

/**
 * Sliding-window rate limiter enforcing max QPS.
 * Uses an in-memory request timestamp array, evicting
 * entries older than the window. Thread-safe via async
 * queue pattern (no two calls overlap in Node.js).
 */
class SnapRateLimiter {
  private timestamps: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = SNAP_RATE_LIMIT_QPS, windowMs: number = SNAP_RATE_LIMIT_WINDOW_MS) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Acquire a slot, waiting if the rate limit is currently at capacity.
   * Returns a promise that resolves when the request may proceed.
   */
  async acquire(): Promise<void> {
    const now = Date.now();

    // Evict timestamps outside the current window
    const windowStart = now - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > windowStart);

    if (this.timestamps.length >= this.maxRequests) {
      // Wait until the oldest timestamp exits the window
      const oldest = this.timestamps[0];
      const waitMs = oldest + this.windowMs - now + 10; // +10ms buffer
      if (waitMs > 0) {
        await this.sleep(waitMs);
        // Recurse after waiting (timestamps will have aged)
        return this.acquire();
      }
    }

    this.timestamps.push(Date.now());
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current QPS utilization (0.0 - 1.0)
   */
  getUtilization(): number {
    const windowStart = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter((ts) => ts > windowStart);
    return this.timestamps.length / this.maxRequests;
  }
}

// ─── Token Manager ───────────────────────────────────────────

/**
 * Manages OAuth 2.0 tokens for Snap, including automatic refresh
 * with configurable buffer time before expiry.
 */
export class SnapTokenManager {
  private state: SnapTokenState | null = null;
  private refreshPromise: Promise<string> | null = null;
  private readonly refreshBufferMs: number = 120_000; // Refresh 2 min before expiry

  constructor(
    private readonly clientId: string = config.snap.clientId,
    private readonly clientSecret: string = config.snap.clientSecret,
  ) {}

  /**
   * Initialize with an existing access token (e.g., from DB).
   */
  setAccessToken(token: string, expiresAt?: Date): void {
    this.state = {
      accessToken: token,
      expiresAt: expiresAt ?? new Date(Date.now() + 3600_000),
    };
  }

  /**
   * Initialize with full token state including refresh token.
   */
  setTokenState(state: SnapTokenState): void {
    this.state = { ...state };
  }

  /**
   * Get the current access token, refreshing if needed.
   */
  async getAccessToken(): Promise<string> {
    if (!this.state) {
      throw new SnapAuthError('No token state set. Authenticate first.');
    }

    // If token is still valid with buffer, return it
    const now = Date.now();
    const expiryWithBuffer = this.state.expiresAt.getTime() - this.refreshBufferMs;

    if (now < expiryWithBuffer) {
      return this.state.accessToken;
    }

    // Token needs refresh
    if (!this.state.refreshToken) {
      throw new SnapAuthError('Access token expired and no refresh token available.');
    }

    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performRefresh(this.state.refreshToken);
    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Exchange authorization code for tokens (OAuth callback).
   */
  async exchangeCode(code: string, redirectUri: string): Promise<SnapTokenState> {
    try {
      const { data } = await axios.post(
        `${SNAP_AUTH_BASE}/token`,
        {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const accessToken = data.access_token as string;
      const refreshToken = (data.refresh_token as string) ?? undefined;
      const expiresIn = (data.expires_in as number) ?? 3600;

      this.state = {
        accessToken,
        refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };

      return { ...this.state };
    } catch (err) {
      const e = err as AxiosError<{ message?: string; error_description?: string }>;
      throw new SnapAuthError(
        `Code exchange failed: ${e.response?.data?.error_description ?? e.response?.data?.message ?? e.message}`,
      );
    }
  }

  /**
   * Refresh the access token using the refresh token.
   */
  async refresh(refreshToken: string): Promise<SnapTokenState> {
    return this.performRefresh(refreshToken).then(() => {
      if (!this.state) throw new SnapAuthError('Refresh produced no state');
      return { ...this.state };
    });
  }

  private async performRefresh(refreshToken: string): Promise<string> {
    try {
      const { data } = await axios.post(
        `${SNAP_AUTH_BASE}/token`,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );

      const accessToken = data.access_token as string;
      const newRefreshToken = (data.refresh_token as string) ?? refreshToken; // Some flows re-issue RT
      const expiresIn = (data.expires_in as number) ?? 3600;

      this.state = {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      };

      return accessToken;
    } catch (err) {
      const e = err as AxiosError<{ error_description?: string; message?: string }>;
      const msg = e.response?.data?.error_description ?? e.response?.data?.message ?? e.message;

      // Check for permanently invalid refresh token
      if (e.response?.status === 400 || e.response?.status === 401) {
        throw new SnapAuthError(`Refresh token invalid or revoked: ${msg}`);
      }

      throw new SnapApiError(`Token refresh failed: ${msg}`, undefined, e.response?.status);
    }
  }

  /**
   * Check if the current token is expired.
   */
  isExpired(): boolean {
    if (!this.state) return true;
    return Date.now() >= this.state.expiresAt.getTime() - this.refreshBufferMs;
  }

  /**
   * Clear token state (logout / disconnect).
   */
  clear(): void {
    this.state = null;
    this.refreshPromise = null;
  }

  /**
   * Get current token state snapshot (for persistence).
   */
  getState(): SnapTokenState | null {
    return this.state ? { ...this.state } : null;
  }
}

// ─── Snap Ads API Client ─────────────────────────────────────

/**
 * Production-grade Snap Ads API client.
 *
 * Features:
 * - OAuth 2.0 authorization code flow
 * - Automatic token refresh with 2-minute buffer
 * - 20 QPS rate limiting with per-request enforcement
 * - Exponential backoff + retry for transient errors
 * - Full CRUD for Campaigns, Ad Squads, and Ads
 * - Insights / stats fetching with flexible field selection
 * - Structured error handling with Snap-specific error types
 *
 * Usage:
 * ```ts
 * const client = new SnapAdsClient();
 * client.setTokenState({ accessToken, refreshToken, expiresAt });
 * const campaigns = await client.getCampaigns('ad-account-id');
 * ```
 */
export class SnapAdsClient {
  private readonly axios: AxiosInstance;
  private readonly rateLimiter: SnapRateLimiter;
  private readonly tokenManager: SnapTokenManager;
  private readonly retryConfig: Required<RetryConfig>;

  constructor(retryConfig: RetryConfig = {}) {
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries ?? DEFAULT_RETRY_MAX,
      baseDelayMs: retryConfig.baseDelayMs ?? DEFAULT_RETRY_BASE_MS,
      maxDelayMs: retryConfig.maxDelayMs ?? 30_000,
      retryableStatuses: retryConfig.retryableStatuses ?? [429, 500, 502, 503, 504],
    };

    this.rateLimiter = new SnapRateLimiter(SNAP_RATE_LIMIT_QPS, SNAP_RATE_LIMIT_WINDOW_MS);
    this.tokenManager = new SnapTokenManager();

    this.axios = axios.create({
      baseURL: SNAP_API_BASE,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30_000,
    });

    // Request interceptor: inject auth header
    this.axios.interceptors.request.use(
      async (axiosConfig) => {
        const token = await this.tokenManager.getAccessToken();
        axiosConfig.headers.set('Authorization', `Bearer ${token}`);
        return axiosConfig;
      },
      (error) => Promise.reject(error),
    );
  }

  // ═══════════════════════════════════════════════════════════
  //  Token Management
  // ═══════════════════════════════════════════════════════════

  /**
   * Set token state directly (e.g., loaded from database).
   */
  setTokenState(state: SnapTokenState): void {
    this.tokenManager.setTokenState(state);
  }

  /**
   * Set access token only (no refresh capability).
   */
  setAccessToken(token: string, expiresAt?: Date): void {
    this.tokenManager.setAccessToken(token, expiresAt);
  }

  /**
   * Exchange authorization code for tokens.
   */
  async exchangeCode(code: string, redirectUri: string): Promise<SnapTokenState> {
    return this.tokenManager.exchangeCode(code, redirectUri);
  }

  /**
   * Refresh tokens manually.
   */
  async refreshTokens(refreshToken: string): Promise<SnapTokenState> {
    return this.tokenManager.refresh(refreshToken);
  }

  /**
   * Get the token manager instance for advanced operations.
   */
  getTokenManager(): SnapTokenManager {
    return this.tokenManager;
  }

  // ═══════════════════════════════════════════════════════════
  //  OAuth 2.0 — Static helpers (no token needed)
  // ═══════════════════════════════════════════════════════════

  /**
   * Build the Snap OAuth 2.0 authorization URL.
   *
   * @param redirectUri — Must match the configured redirect URI in Snap app settings
   * @param state — Opaque state parameter (e.g., workspaceId) returned in callback
   * @param scope — OAuth scope(s) to request
   */
  static buildAuthUrl(
    redirectUri: string,
    state: string,
    scope: string = 'snapchat-marketing-api',
  ): string {
    const url = new URL(`${SNAP_AUTH_BASE}/auth`);
    url.searchParams.set('client_id', config.snap.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('state', state);
    return url.toString();
  }

  // ═══════════════════════════════════════════════════════════
  //  Organization & Ad Account
  // ═══════════════════════════════════════════════════════════

  /**
   * Fetch organizations for the authenticated user.
   */
  async getOrganizations(): Promise<SnapOrganization[]> {
    const { data } = await this.request<{ organizations: Array<{ organization: SnapOrganization }> }>({
      method: 'GET',
      url: '/organizations',
    });
    return data.organizations?.map((o) => o.organization) ?? [];
  }

  /**
   * Fetch ad accounts within an organization.
   */
  async getAdAccounts(organizationId: string): Promise<SnapAdAccount[]> {
    const { data } = await this.request<{ adaccounts: Array<{ adaccount: SnapAdAccount }> }>({
      method: 'GET',
      url: `/organizations/${organizationId}/adaccounts`,
    });
    return data.adaccounts?.map((a) => a.adaccount) ?? [];
  }

  // ═══════════════════════════════════════════════════════════
  //  Campaign CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * List campaigns for an ad account.
   *
   * @param adAccountId — Snap ad account ID
   * @param options — Optional filters (status, limit, offset)
   */
  async getCampaigns(adAccountId: string, options?: SnapFetchOptions): Promise<SnapCampaign[]> {
    const params: Record<string, unknown> = {
      limit: options?.limit ?? 50,
      ...(options?.offset ? { offset: options.offset } : {}),
    };

    // Map unified status to Snap-specific status
    if (options?.status && options.status !== 'all') {
      const statusMap: Record<string, string> = {
        active: 'ACTIVE',
        paused: 'PAUSED',
        ended: 'ARCHIVED',
      };
      params.status = statusMap[options.status] ?? options.status.toUpperCase();
    }

    const { data } = await this.request<{ campaigns: Array<{ campaign: SnapCampaign }> }>({
      method: 'GET',
      url: `/adaccounts/${adAccountId}/campaigns`,
      params,
    });

    return data.campaigns?.map((c) => c.campaign) ?? [];
  }

  /**
   * Get a single campaign by ID.
   *
   * @param campaignId — Snap campaign ID
   */
  async getCampaign(campaignId: string): Promise<SnapCampaign> {
    const { data } = await this.request<{ campaigns: Array<{ campaign: SnapCampaign }> }>({
      method: 'GET',
      url: `/campaigns/${campaignId}`,
    });

    const campaign = data.campaigns?.[0]?.campaign;
    if (!campaign) {
      throw new SnapApiError(`Campaign ${campaignId} not found`, 'NOT_FOUND', 404);
    }
    return campaign;
  }

  /**
   * Create a new campaign.
   *
   * Safety: campaigns are always created as PAUSED regardless of the
   * status field in `data`. Explicitly call updateCampaignStatus to
   * activate after review.
   *
   * @param data — Campaign creation payload
   */
  async createCampaign(data: {
    ad_account_id: string;
    name: string;
    objective: SnapCampaignObjective;
    status?: SnapCampaignStatus;
    daily_budget_micro?: number;
    lifetime_budget_micro?: number;
    start_time?: string;
    end_time?: string;
    buying_model?: string;
  }): Promise<SnapCampaign> {
    const payload = {
      campaigns: [
        {
          campaign: {
            name: data.name,
            ad_account_id: data.ad_account_id,
            status: 'PAUSED', // Safety: always create paused
            objective: data.objective,
            start_time: data.start_time ?? new Date().toISOString(),
            ...(data.daily_budget_micro ? { daily_budget_micro: data.daily_budget_micro } : {}),
            ...(data.lifetime_budget_micro ? { lifetime_budget_micro: data.lifetime_budget_micro } : {}),
            ...(data.end_time ? { end_time: data.end_time } : {}),
            ...(data.buying_model ? { buying_model: data.buying_model } : {}),
          },
        },
      ],
    };

    const { data: responseData } = await this.request<{
      campaigns: Array<{ campaign: SnapCampaign }>;
    }>({
      method: 'POST',
      url: `/adaccounts/${data.ad_account_id}/campaigns`,
      data: payload,
    });

    const created = responseData.campaigns?.[0]?.campaign;
    if (!created) {
      throw new SnapApiError('Create campaign response missing campaign data');
    }
    return created;
  }

  /**
   * Update an existing campaign.
   *
   * @param campaignId — Snap campaign ID
   * @param updates — Partial campaign fields to update
   */
  async updateCampaign(
    campaignId: string,
    updates: Partial<Pick<SnapCampaign, 'name' | 'status' | 'objective' | 'daily_budget_micro' | 'lifetime_budget_micro' | 'start_time' | 'end_time' | 'buying_model'>>,
  ): Promise<SnapCampaign> {
    const campaignUpdate: Record<string, unknown> = {};

    if (updates.name !== undefined) campaignUpdate.name = updates.name;
    if (updates.status !== undefined) campaignUpdate.status = updates.status;
    if (updates.objective !== undefined) campaignUpdate.objective = updates.objective;
    if (updates.daily_budget_micro !== undefined) campaignUpdate.daily_budget_micro = updates.daily_budget_micro;
    if (updates.lifetime_budget_micro !== undefined)
      campaignUpdate.lifetime_budget_micro = updates.lifetime_budget_micro;
    if (updates.start_time !== undefined) campaignUpdate.start_time = updates.start_time;
    if (updates.end_time !== undefined) campaignUpdate.end_time = updates.end_time;
    if (updates.buying_model !== undefined) campaignUpdate.buying_model = updates.buying_model;

    const payload = {
      campaigns: [{ campaign: campaignUpdate }],
    };

    const { data } = await this.request<{ campaigns: Array<{ campaign: SnapCampaign }> }>({
      method: 'PUT',
      url: `/campaigns/${campaignId}`,
      data: payload,
    });

    const updated = data.campaigns?.[0]?.campaign;
    if (!updated) {
      throw new SnapApiError('Update campaign response missing campaign data');
    }
    return updated;
  }

  /**
   * Convenience method: update only a campaign's status.
   */
  async updateCampaignStatus(campaignId: string, status: SnapCampaignStatus): Promise<SnapCampaign> {
    return this.updateCampaign(campaignId, { status });
  }

  /**
   * Delete (archive) a campaign.
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    await this.updateCampaign(campaignId, { status: 'ARCHIVED' });
  }

  // ═══════════════════════════════════════════════════════════
  //  Ad Squad (Ad Set) CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * List ad squads for a campaign.
   */
  async getAdSquads(campaignId: string, limit = 50, offset?: number): Promise<SnapAdSquad[]> {
    const params: Record<string, unknown> = { limit };
    if (offset !== undefined) params.offset = offset;

    const { data } = await this.request<{ adsquads: Array<{ adsquad: SnapAdSquad }> }>({
      method: 'GET',
      url: `/campaigns/${campaignId}/adsquads`,
      params,
    });
    return data.adsquads?.map((a) => a.adsquad) ?? [];
  }

  /**
   * Get a single ad squad by ID.
   */
  async getAdSquad(adSquadId: string): Promise<SnapAdSquad> {
    const { data } = await this.request<{ adsquads: Array<{ adsquad: SnapAdSquad }> }>({
      method: 'GET',
      url: `/adsquads/${adSquadId}`,
    });

    const adSquad = data.adsquads?.[0]?.adsquad;
    if (!adSquad) {
      throw new SnapApiError(`Ad squad ${adSquadId} not found`, 'NOT_FOUND', 404);
    }
    return adSquad;
  }

  /**
   * Create an ad squad.
   */
  async createAdSquad(data: {
    campaign_id: string;
    name: string;
    status?: string;
    type?: string;
    placement?: string;
    optimization_goal?: string;
    targeting?: Record<string, unknown>;
    bid_micro?: number;
    daily_budget_micro?: number;
    lifetime_budget_micro?: number;
    start_time?: string;
    end_time?: string;
    bid_strategy?: string;
  }): Promise<SnapAdSquad> {
    const payload = {
      adsquads: [
        {
          adsquad: {
            name: data.name,
            campaign_id: data.campaign_id,
            status: 'PAUSED', // Safety: always create paused
            type: data.type ?? 'SNAP_ADS',
            placement: data.placement ?? 'AUTOMATIC',
            optimization_goal: data.optimization_goal ?? 'IMPRESSIONS',
            targeting: data.targeting ?? {
              demographics: [{ gender: 'MALE', age_groups: ['18-24', '25-34'] }],
            },
            ...(data.bid_micro ? { bid_micro: data.bid_micro } : {}),
            ...(data.daily_budget_micro ? { daily_budget_micro: data.daily_budget_micro } : {}),
            ...(data.lifetime_budget_micro ? { lifetime_budget_micro: data.lifetime_budget_micro } : {}),
            ...(data.start_time ? { start_time: data.start_time } : {}),
            ...(data.end_time ? { end_time: data.end_time } : {}),
            ...(data.bid_strategy ? { bid_strategy: data.bid_strategy } : {}),
          },
        },
      ],
    };

    const { data: responseData } = await this.request<{
      adsquads: Array<{ adsquad: SnapAdSquad }>;
    }>({
      method: 'POST',
      url: `/campaigns/${data.campaign_id}/adsquads`,
      data: payload,
    });

    const created = responseData.adsquads?.[0]?.adsquad;
    if (!created) {
      throw new SnapApiError('Create ad squad response missing data');
    }
    return created;
  }

  /**
   * Update an ad squad.
   */
  async updateAdSquad(
    adSquadId: string,
    updates: Partial<
      Pick<SnapAdSquad, 'name' | 'status' | 'bid_micro' | 'daily_budget_micro' | 'lifetime_budget_micro' | 'targeting' | 'end_time'>
    >,
  ): Promise<SnapAdSquad> {
    const squadUpdate: Record<string, unknown> = {};
    if (updates.name !== undefined) squadUpdate.name = updates.name;
    if (updates.status !== undefined) squadUpdate.status = updates.status;
    if (updates.bid_micro !== undefined) squadUpdate.bid_micro = updates.bid_micro;
    if (updates.daily_budget_micro !== undefined) squadUpdate.daily_budget_micro = updates.daily_budget_micro;
    if (updates.lifetime_budget_micro !== undefined) squadUpdate.lifetime_budget_micro = updates.lifetime_budget_micro;
    if (updates.targeting !== undefined) squadUpdate.targeting = updates.targeting;
    if (updates.end_time !== undefined) squadUpdate.end_time = updates.end_time;

    const { data } = await this.request<{ adsquads: Array<{ adsquad: SnapAdSquad }> }>({
      method: 'PUT',
      url: `/adsquads/${adSquadId}`,
      data: { adsquads: [{ adsquad: squadUpdate }] },
    });

    const updated = data.adsquads?.[0]?.adsquad;
    if (!updated) {
      throw new SnapApiError('Update ad squad response missing data');
    }
    return updated;
  }

  // ═══════════════════════════════════════════════════════════
  //  Ad CRUD
  // ═══════════════════════════════════════════════════════════

  /**
   * List ads within an ad squad.
   *
   * @param adSquadId — Snap ad squad ID
   */
  async getAds(adSquadId: string, limit = 50, offset?: number): Promise<SnapAd[]> {
    const params: Record<string, unknown> = { limit };
    if (offset !== undefined) params.offset = offset;

    const { data } = await this.request<{ ads: Array<{ ad: SnapAd }> }>({
      method: 'GET',
      url: `/adsquads/${adSquadId}/ads`,
      params,
    });
    return data.ads?.map((a) => a.ad) ?? [];
  }

  /**
   * List ads across all ad squads in a campaign (aggregated).
   */
  async getAdsByCampaign(campaignId: string): Promise<SnapAd[]> {
    const adSquads = await this.getAdSquads(campaignId);
    const allAds: SnapAd[] = [];

    for (const squad of adSquads) {
      const ads = await this.getAds(squad.id);
      allAds.push(...ads);
    }

    return allAds;
  }

  /**
   * Get a single ad by ID.
   */
  async getAd(adId: string): Promise<SnapAd> {
    const { data } = await this.request<{ ads: Array<{ ad: SnapAd }> }>({
      method: 'GET',
      url: `/ads/${adId}`,
    });

    const ad = data.ads?.[0]?.ad;
    if (!ad) {
      throw new SnapApiError(`Ad ${adId} not found`, 'NOT_FOUND', 404);
    }
    return ad;
  }

  /**
   * Create a new ad.
   *
   * @param data — Ad creation payload
   */
  async createAd(data: {
    ad_squad_id: string;
    name: string;
    creative_id: string;
    status?: string;
    type?: string;
  }): Promise<SnapAd> {
    const payload = {
      ads: [
        {
          ad: {
            name: data.name,
            ad_squad_id: data.ad_squad_id,
            creative_id: data.creative_id,
            status: 'PAUSED', // Safety: always create paused
            type: data.type ?? 'SNAP_AD',
          },
        },
      ],
    };

    const { data: responseData } = await this.request<{
      ads: Array<{ ad: SnapAd }>;
    }>({
      method: 'POST',
      url: `/adsquads/${data.ad_squad_id}/ads`,
      data: payload,
    });

    const created = responseData.ads?.[0]?.ad;
    if (!created) {
      throw new SnapApiError('Create ad response missing data');
    }
    return created;
  }

  /**
   * Update an existing ad.
   *
   * @param adId — Snap ad ID
   * @param updates — Partial ad fields to update
   */
  async updateAd(
    adId: string,
    updates: Partial<Pick<SnapAd, 'name' | 'status' | 'creative_id' | 'type'>>,
  ): Promise<SnapAd> {
    const adUpdate: Record<string, unknown> = {};
    if (updates.name !== undefined) adUpdate.name = updates.name;
    if (updates.status !== undefined) adUpdate.status = updates.status;
    if (updates.creative_id !== undefined) adUpdate.creative_id = updates.creative_id;
    if (updates.type !== undefined) adUpdate.type = updates.type;

    const { data } = await this.request<{ ads: Array<{ ad: SnapAd }> }>({
      method: 'PUT',
      url: `/ads/${adId}`,
      data: { ads: [{ ad: adUpdate }] },
    });

    const updated = data.ads?.[0]?.ad;
    if (!updated) {
      throw new SnapApiError('Update ad response missing data');
    }
    return updated;
  }

  /**
   * Convenience method: update only ad status.
   */
  async updateAdStatus(
    adId: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED',
  ): Promise<SnapAd> {
    return this.updateAd(adId, { status });
  }

  // ═══════════════════════════════════════════════════════════
  //  Insights / Stats
  // ═══════════════════════════════════════════════════════════

  /**
   * Default insight fields to request.
   */
  static readonly DEFAULT_INSIGHT_FIELDS: string[] = [
    'impressions',
    'swipes',
    'spend',
    'quartile_1',
    'quartile_2',
    'quartile_3',
    'view_completion',
    'video_views',
    'screen_time_millis',
    'conversions',
    'conversion_value',
    'conversion_rate',
    'reach',
    'frequency',
    'paid_impressions',
    'paid_swipes',
    'swipe_up_rate',
    'cost_per_swipe',
    'cost_per_thousand_impressions',
  ];

  /**
   * Get campaign-level insights (stats).
   *
   * @param campaignId — Snap campaign ID
   * @param dateRange — Date range for the query (ISO 8601)
   * @param granularity — 'TOTAL' | 'DAY' | 'HOUR'
   * @param fields — Specific metric fields to include (defaults to full set)
   */
  async getCampaignInsights(
    campaignId: string,
    dateRange: SnapDateRange,
    granularity: 'TOTAL' | 'DAY' | 'HOUR' = 'TOTAL',
    fields?: string[],
  ): Promise<SnapInsight> {
    const fieldList = fields ?? SnapAdsClient.DEFAULT_INSIGHT_FIELDS;

    const { data } = await this.request<{
      timeseries_stats?: Array<{
        id: string;
        type: string;
        timeseries: SnapTimeseriesInsight[];
        total: SnapTotalMetrics;
      }>;
    }>({
      method: 'GET',
      url: `/campaigns/${campaignId}/stats`,
      params: {
        granularity,
        start_time: dateRange.startDate,
        end_time: dateRange.endDate,
        fields: fieldList.join(','),
        ...(granularity !== 'TOTAL' ? { swipe_up_attribution_window: '28_DAY' } : {}),
      },
    });

    const stat = data.timeseries_stats?.[0];
    return {
      id: stat?.id ?? campaignId,
      type: 'campaign',
      granularity,
      start_time: dateRange.startDate,
      end_time: dateRange.endDate,
      timeseries: stat?.timeseries ?? [],
      total: stat?.total ?? { stats: {} },
    };
  }

  /**
   * Get ad squad-level insights.
   */
  async getAdSquadInsights(
    adSquadId: string,
    dateRange: SnapDateRange,
    granularity: 'TOTAL' | 'DAY' | 'HOUR' = 'TOTAL',
    fields?: string[],
  ): Promise<SnapInsight> {
    const fieldList = fields ?? SnapAdsClient.DEFAULT_INSIGHT_FIELDS;

    const { data } = await this.request<{
      timeseries_stats?: Array<{
        id: string;
        type: string;
        timeseries: SnapTimeseriesInsight[];
        total: SnapTotalMetrics;
      }>;
    }>({
      method: 'GET',
      url: `/adsquads/${adSquadId}/stats`,
      params: {
        granularity,
        start_time: dateRange.startDate,
        end_time: dateRange.endDate,
        fields: fieldList.join(','),
      },
    });

    const stat = data.timeseries_stats?.[0];
    return {
      id: stat?.id ?? adSquadId,
      type: 'ad_squad',
      granularity,
      start_time: dateRange.startDate,
      end_time: dateRange.endDate,
      timeseries: stat?.timeseries ?? [],
      total: stat?.total ?? { stats: {} },
    };
  }

  /**
   * Get ad-level insights.
   */
  async getAdInsights(
    adId: string,
    dateRange: SnapDateRange,
    granularity: 'TOTAL' | 'DAY' | 'HOUR' = 'TOTAL',
    fields?: string[],
  ): Promise<SnapInsight> {
    const fieldList = fields ?? SnapAdsClient.DEFAULT_INSIGHT_FIELDS;

    const { data } = await this.request<{
      timeseries_stats?: Array<{
        id: string;
        type: string;
        timeseries: SnapTimeseriesInsight[];
        total: SnapTotalMetrics;
      }>;
    }>({
      method: 'GET',
      url: `/ads/${adId}/stats`,
      params: {
        granularity,
        start_time: dateRange.startDate,
        end_time: dateRange.endDate,
        fields: fieldList.join(','),
      },
    });

    const stat = data.timeseries_stats?.[0];
    return {
      id: stat?.id ?? adId,
      type: 'ad',
      granularity,
      start_time: dateRange.startDate,
      end_time: dateRange.endDate,
      timeseries: stat?.timeseries ?? [],
      total: stat?.total ?? { stats: {} },
    };
  }

  /**
   * Batch-fetch campaign insights for multiple campaigns.
   * Individual failures return empty stats rather than failing the batch.
   */
  async getBatchCampaignInsights(
    campaignIds: string[],
    dateRange: SnapDateRange,
    granularity: 'TOTAL' | 'DAY' | 'HOUR' = 'TOTAL',
    fields?: string[],
  ): Promise<SnapInsight[]> {
    const promises = campaignIds.map(async (campaignId) => {
      try {
        return await this.getCampaignInsights(campaignId, dateRange, granularity, fields);
      } catch {
        // Return empty insight for individual failures
        return {
          id: campaignId,
          type: 'campaign' as const,
          granularity,
          start_time: dateRange.startDate,
          end_time: dateRange.endDate,
          timeseries: [],
          total: { stats: {} },
        };
      }
    });

    return Promise.all(promises);
  }

  // ═══════════════════════════════════════════════════════════
  //  Rate Limit Utilization
  // ═══════════════════════════════════════════════════════════

  /**
   * Get current rate limiter utilization (0.0 - 1.0).
   * Useful for monitoring dashboards and health checks.
   */
  getRateLimitUtilization(): number {
    return this.rateLimiter.getUtilization();
  }

  // ═══════════════════════════════════════════════════════════
  //  Core HTTP with Retry + Backoff + Rate Limiting
  // ═══════════════════════════════════════════════════════════

  /**
   * Execute an HTTP request against the Snap API with:
   * - Rate limit acquisition (20 QPS)
   * - Exponential backoff + retry for transient errors
   * - Structured error parsing
   *
   * @param requestConfig — Axios request config
   */
  private async request<T>(requestConfig: AxiosRequestConfig): Promise<{ data: T }> {
    // Step 1: Acquire rate limit slot
    await this.rateLimiter.acquire();

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.axios.request<T>(requestConfig);
        return { data: response.data };
      } catch (err) {
        lastError = err as Error;
        const axiosError = err as AxiosError;

        const status = axiosError.response?.status;
        const responseData = axiosError.response?.data as Record<string, unknown> | undefined;

        // Handle rate limiting (429) with Retry-After
        if (status === 429) {
          const retryAfter = this.parseRetryAfter(axiosError.response?.headers);
          throw new SnapRateLimitError(
            `Snap API rate limit exceeded (20 QPS). Retry after ${retryAfter}ms.`,
            retryAfter,
            responseData?.['error_code'] as string | undefined,
          );
        }

        // Handle authentication failures — don't retry
        if (status === 401 || status === 403) {
          const snapMessage = this.extractSnapErrorMessage(responseData);
          throw new SnapAuthError(
            snapMessage || `Snap API authentication failed (${status})`,
          );
        }

        // Handle not found — don't retry
        if (status === 404) {
          const snapMessage = this.extractSnapErrorMessage(responseData);
          throw new SnapApiError(
            snapMessage || `Snap resource not found (${status})`,
            responseData?.['error_code'] as string | undefined,
            404,
          );
        }

        // Check if this error is retryable
        if (!this.isRetryable(status)) {
          const snapMessage = this.extractSnapErrorMessage(responseData);
          const snapCode = responseData?.['error_code'] as string | undefined;
          throw new SnapApiError(
            snapMessage || axiosError.message,
            snapCode,
            status,
            undefined,
            responseData,
          );
        }

        // Last attempt — don't retry again
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Exponential backoff before retrying
        const delayMs = this.calculateBackoff(attempt);
        await this.sleep(delayMs);
      }
    }

    // All retries exhausted
    const axiosErr = lastError as AxiosError;
    throw new SnapApiError(
      `Snap API request failed after ${this.retryConfig.maxRetries + 1} attempts: ${axiosErr?.message}`,
      undefined,
      axiosErr?.response?.status,
    );
  }

  /**
   * Check if an HTTP status is retryable.
   */
  private isRetryable(status: number | undefined): boolean {
    if (!status) return true; // Network errors are retryable
    return this.retryConfig.retryableStatuses.includes(status);
  }

  /**
   * Calculate exponential backoff delay with jitter.
   *
   * Formula: baseDelay * 2^attempt + random_jitter(0-200ms)
   * Capped at maxDelayMs.
   */
  private calculateBackoff(attempt: number): number {
    const exponential = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 200);
    return Math.min(exponential + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Parse Retry-After header value (seconds or HTTP date).
   */
  private parseRetryAfter(headers?: Record<string, unknown>): number {
    if (!headers) return 1000;

    const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
    if (!retryAfter) return 1000;

    // Numeric seconds
    const seconds = parseInt(String(retryAfter), 10);
    if (!isNaN(seconds)) {
      return Math.min(seconds * 1000, 60_000); // Cap at 60s
    }

    return 1000; // Default 1s
  }

  /**
   * Extract a human-readable error message from a Snap API error response.
   */
  private extractSnapErrorMessage(responseData?: Record<string, unknown>): string | undefined {
    if (!responseData) return undefined;

    // Snap error response formats vary:
    if (typeof responseData.message === 'string') return responseData.message;
    if (typeof responseData.error_description === 'string') return responseData.error_description;

    // Nested error structures
    const errorObj = responseData.error as Record<string, unknown> | undefined;
    if (errorObj) {
      if (typeof errorObj.message === 'string') return errorObj.message;
      if (typeof errorObj.error_user_msg === 'string') return errorObj.error_user_msg;
      if (Array.isArray(errorObj.errors)) {
        return errorObj.errors.map((e: Record<string, string>) => e.message ?? String(e)).join('; ');
      }
    }

    // Debug message field sometimes used
    if (typeof responseData.debug_message === 'string') return responseData.debug_message;

    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ══════════════════════════════════════════════════════════════
//  Convenience Factory Function
// ══════════════════════════════════════════════════════════════

/**
 * Create a SnapAdsClient pre-configured with token state from an AdAccount record.
 *
 * @param accessToken — Snap OAuth access token
 * @param refreshToken — Snap OAuth refresh token (optional)
 * @param expiresAt — Token expiry date
 * @param retryConfig — Optional retry configuration overrides
 */
export function createSnapClient(
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date,
  retryConfig?: RetryConfig,
): SnapAdsClient {
  const client = new SnapAdsClient(retryConfig);
  client.setTokenState({
    accessToken,
    refreshToken,
    expiresAt: expiresAt ?? new Date(Date.now() + 3600_000),
  });
  return client;
}

// ══════════════════════════════════════════════════════════════
//  Legacy Compatibility Layer (matches existing snap-api.ts API)
// ══════════════════════════════════════════════════════════════

const _SNAP_API_BASE_LEGACY = 'https://adsapi.snapchat.com/v1';

function _authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

function _paginatedParams(opts?: { limit?: number; offset?: number }): Record<string, unknown> {
  return {
    limit: opts?.limit ?? 50,
    ...(opts?.offset ? { offset: opts.offset } : {}),
  };
}

/**
 * Generate Snap OAuth authorization URL.
 */
export function getSnapAuthUrl(workspaceId: string): string {
  return SnapAdsClient.buildAuthUrl(
    `${config.frontend.url}/auth/snap/callback`,
    workspaceId,
  );
}

/**
 * Handle OAuth callback: exchange code for tokens, fetch orgs & accounts.
 */
export async function handleSnapCallback(code: string, workspaceId: string): Promise<{
  id: string;
  workspace_id: string;
  platform: 'snap';
  account_id: string;
  name: string;
  status: string;
  token_expires_at: string;
  metadata: Record<string, unknown>;
  created_at: string;
}> {
  const redirectUri = `${config.frontend.url}/auth/snap/callback`;
  const client = new SnapAdsClient();
  const tokenState = await client.exchangeCode(code, redirectUri);

  // Fetch organizations
  const orgs = await client.getOrganizations();
  if (orgs.length === 0) {
    throw new PlatformError('snap', 'No organizations found for this Snap account');
  }

  // Fetch ad accounts for first organization
  const accounts = await client.getAdAccounts(orgs[0].id);
  if (accounts.length === 0) {
    throw new PlatformError('snap', 'No ad accounts found for this Snap organization');
  }

  const firstAccount = accounts[0];

  return {
    id: firstAccount.id,
    workspace_id: workspaceId,
    platform: 'snap',
    account_id: firstAccount.id,
    name: `${firstAccount.name} (${firstAccount.id})`,
    status: 'active',
    token_expires_at: tokenState.expiresAt.toISOString(),
    metadata: {
      organization_id: orgs[0].id,
      organization_name: orgs[0].name,
      currency: firstAccount.currency,
      timezone: firstAccount.timezone,
      refresh_token: tokenState.refreshToken,
    },
    created_at: firstAccount.created_at,
  };
}

/**
 * Refresh Snap access token.
 */
export async function refreshSnapToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  try {
    const { data } = await axios.post(
      `${SNAP_AUTH_BASE}/token`,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.snap.clientId,
        client_secret: config.snap.clientSecret,
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const accessToken = data.access_token as string;
    const expiresIn = (data.expires_in as number) ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return { accessToken, expiresAt };
  } catch (err) {
    const e = err as AxiosError<{ error_description?: string }>;
    throw new PlatformError(
      'snap',
      `Token refresh failed: ${e.response?.data?.error_description ?? e.message}`,
    );
  }
}

// ─── Campaign CRUD (legacy wrappers) ─────────────────────────

export async function fetchSnapCampaigns(
  adAccountId: string,
  accessToken: string,
  options?: SnapFetchOptions,
): Promise<SnapCampaign[]> {
  const client = createSnapClient(accessToken);
  return client.getCampaigns(adAccountId, options);
}

export async function createSnapCampaign(
  accessToken: string,
  adAccountId: string,
  campaign: Partial<SnapCampaign>,
): Promise<string> {
  const client = createSnapClient(accessToken);
  const created = await client.createCampaign({
    ad_account_id: adAccountId,
    name: campaign.name ?? 'Untitled Campaign',
    objective: campaign.objective ?? 'AWARENESS',
    daily_budget_micro: campaign.daily_budget_micro,
    lifetime_budget_micro: campaign.lifetime_budget_micro,
    start_time: campaign.start_time,
    end_time: campaign.end_time,
    buying_model: campaign.buying_model,
  });
  return created.id;
}

export async function updateSnapCampaign(
  accessToken: string,
  campaignId: string,
  updates: Partial<SnapCampaign>,
): Promise<void> {
  const client = createSnapClient(accessToken);
  await client.updateCampaign(campaignId, {
    name: updates.name,
    status: updates.status,
    objective: updates.objective,
    daily_budget_micro: updates.daily_budget_micro,
    lifetime_budget_micro: updates.lifetime_budget_micro,
    start_time: updates.start_time,
    end_time: updates.end_time,
    buying_model: updates.buying_model,
  });
}

export async function updateSnapCampaignStatus(
  accessToken: string,
  campaignId: string,
  status: string,
): Promise<void> {
  const client = createSnapClient(accessToken);
  await client.updateCampaignStatus(campaignId, status as SnapCampaignStatus);
}

// ─── Ad Squad CRUD (legacy wrappers) ─────────────────────────

export async function fetchSnapAdSquads(
  campaignId: string,
  accessToken: string,
): Promise<SnapAdSquad[]> {
  const client = createSnapClient(accessToken);
  return client.getAdSquads(campaignId);
}

export async function createSnapAdSquad(
  accessToken: string,
  campaignId: string,
  adSquad: Partial<SnapAdSquad>,
): Promise<string> {
  const client = createSnapClient(accessToken);
  const created = await client.createAdSquad({
    campaign_id: campaignId,
    name: adSquad.name ?? 'Untitled Ad Squad',
    placement: adSquad.placement,
    optimization_goal: adSquad.optimization_goal,
    targeting: adSquad.targeting,
    bid_micro: adSquad.bid_micro,
    daily_budget_micro: adSquad.daily_budget_micro,
    lifetime_budget_micro: adSquad.lifetime_budget_micro,
    start_time: adSquad.start_time,
    end_time: adSquad.end_time,
    bid_strategy: adSquad.bid_strategy,
  });
  return created.id;
}

// ─── Snap Ad CRUD (legacy wrappers) ──────────────────────────

export async function fetchSnapAds(adSquadId: string, accessToken: string): Promise<SnapAd[]> {
  const client = createSnapClient(accessToken);
  return client.getAds(adSquadId);
}

export async function createSnapAd(
  accessToken: string,
  adSquadId: string,
  ad: Partial<SnapAd>,
): Promise<string> {
  const client = createSnapClient(accessToken);
  const created = await client.createAd({
    ad_squad_id: adSquadId,
    name: ad.name ?? 'Untitled Ad',
    creative_id: ad.creative_id!,
    type: ad.type,
  });
  return created.id;
}

// ─── Insights (legacy wrappers) ──────────────────────────────

export async function fetchSnapCampaignStats(
  campaignIds: string[],
  accessToken: string,
  dateRange: SnapDateRange,
  granularity: 'TOTAL' | 'DAY' | 'HOUR' = 'TOTAL',
): Promise<SnapInsight[]> {
  const client = createSnapClient(accessToken);
  return client.getBatchCampaignInsights(campaignIds, dateRange, granularity);
}

// ══════════════════════════════════════════════════════════════
//  Default Export
// ══════════════════════════════════════════════════════════════

export default {
  // Class
  SnapAdsClient,
  SnapTokenManager,
  SnapRateLimiter,

  // Errors
  SnapApiError,
  SnapRateLimitError,
  SnapAuthError,

  // Factory
  createSnapClient,

  // OAuth
  getSnapAuthUrl,
  handleSnapCallback,

  // Legacy CRUD wrappers
  fetchSnapCampaigns,
  createSnapCampaign,
  updateSnapCampaign,
  updateSnapCampaignStatus,
  fetchSnapAdSquads,
  createSnapAdSquad,
  fetchSnapAds,
  createSnapAd,

  // Legacy insights
  fetchSnapCampaignStats,

  // Token
  refreshSnapToken,
};
