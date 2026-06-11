/**
 * Google Ads API Client
 * AdNexus AI Platform
 *
 * Full-featured Google Ads API client with:
 * - OAuth 2.0 authentication with automatic token refresh
 * - Campaign management (CRUD via GAQL + mutate)
 * - Ad group and ad management
 * - Metrics & reporting with GAQL query builder
 * - Rate limiting (15K ops/day) with exponential backoff
 * - Partial failure handling for batch operations
 * - Type-safe GAQL query builder
 */

import {
  // Config types
  GoogleAdsClientConfig,
  GoogleTokens,
  AuthUrlOptions,

  // Entity types
  Campaign,
  CreateCampaignData,
  UpdateCampaignData,
  CampaignListParams,
  AdGroup,
  CreateAdGroupData,
  UpdateAdGroupData,
  AdGroupAd,
  AdData,
  CreateAdData,

  // Metrics types
  CampaignMetrics,
  AccountSummary,
  DateRange,
  ConversionAction,

  // Response types
  PaginatedResponse,
  SearchGoogleAdsRequest,
  SearchGoogleAdsResponse,
  SearchGoogleAdsRow,
  MutateRequest,
  MutateResponse,
  MutateOperation,

  // Error types
  GoogleAdsApiError,
} from "./types";

import { GoogleAdsAuth } from "./auth";
import { GAQLBuilder, GAQLPresets } from "./gaql-builder";
import {
  RateLimiter,
  RetryHandler,
  ErrorParser,
  hasPartialFailure,
  DEFAULT_RETRY_CONFIG,
} from "./error-handler";
import { getModuleLogger } from "../../lib/logger";

const logger = getModuleLogger("google-client");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_API_VERSION = "v16";
const GOOGLE_ADS_API_BASE = (version: string) =>
  `https://googleads.googleapis.com/${version}/customers`;

// ---------------------------------------------------------------------------
// Main Client
// ---------------------------------------------------------------------------

/**
 * GoogleAdsClient - Production-ready Google Ads API client for AdNexus AI.
 *
 * Provides complete campaign lifecycle management, ad creation, performance
 * reporting, and robust error handling with automatic retries.
 *
 * @example
 * ```typescript
 * const client = new GoogleAdsClient({
 *   auth: {
 *     clientId: process.env.GOOGLE_CLIENT_ID!,
 *     clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *     redirectUri: "https://app.adnexus.ai/auth/google/callback",
 *   },
 *   api: {
 *     developerToken: process.env.GOOGLE_DEVELOPER_TOKEN!,
 *     loginCustomerId: "1234567890", // Manager account ID (optional)
 *   },
 *   customerId: "9876543210",
 * });
 *
 * // Authenticate
 * client.setTokens(storedTokens);
 *
 * // List campaigns
 * const campaigns = await client.getCampaigns("9876543210", { limit: 50 });
 *
 * // Get metrics
 * const metrics = await client.getCampaignMetrics("123456789", {
 *   startDate: "2024-01-01",
 *   endDate: "2024-01-31",
 * });
 * ```
 */
export class GoogleAdsClient {
  private auth: GoogleAdsAuth;
  private config: GoogleAdsClientConfig;
  private rateLimiter: RateLimiter;
  private retryHandler: RetryHandler;
  private baseUrl: string;

  /**
   * Create a new GoogleAdsClient instance.
   */
  constructor(config: GoogleAdsClientConfig) {
    this.config = config;
    this.auth = new GoogleAdsAuth(config);
    this.rateLimiter = new RateLimiter(config.api.rateLimitConfig);
    this.retryHandler = new RetryHandler(
      config.api.retryConfig ?? DEFAULT_RETRY_CONFIG,
      this.rateLimiter
    );
    const version = config.api.apiVersion ?? DEFAULT_API_VERSION;
    this.baseUrl = config.api.baseUrl ?? GOOGLE_ADS_API_BASE(version);
  }

  // ==========================================================================
  // AUTHENTICATION HELPERS
  // ==========================================================================

  /**
   * Get the OAuth authorization URL to redirect the user to.
   */
  getAuthorizationUrl(options?: AuthUrlOptions): string {
    return this.auth.getAuthorizationUrl(options);
  }

  /**
   * Exchange an OAuth authorization code for tokens.
   */
  async exchangeCode(code: string): Promise<GoogleTokens> {
    return this.auth.exchangeCode(code);
  }

  /**
   * Set tokens directly (e.g., loaded from database).
   */
  setTokens(tokens: GoogleTokens): void {
    this.auth.setTokens(tokens);
  }

  /**
   * Get current tokens (useful for persisting updated tokens).
   */
  getTokens(): GoogleTokens | null {
    return this.auth.getTokens();
  }

  /**
   * Register a callback for token refresh events.
   */
  onTokenRefresh(callback: (tokens: GoogleTokens) => void | Promise<void>): void {
    this.auth.onTokenRefresh(callback);
  }

  /**
   * Revoke the current access token.
   */
  async revokeToken(): Promise<void> {
    await this.auth.revokeToken();
  }

  // ==========================================================================
  // LOW-LEVEL API METHODS
  // ==========================================================================

  /**
   * Execute a GAQL (Google Ads Query Language) search query.
   * This is the primary data retrieval method.
   *
   * @param customerId - The Google Ads customer ID (without dashes)
   * @param query - The GAQL query string
   * @param pageSize - Number of results per page
   * @param pageToken - Token for pagination
   * @returns Search results with pagination info
   */
  async search(
    customerId: string,
    query: string,
    pageSize: number = 10000,
    pageToken?: string
  ): Promise<SearchGoogleAdsResponse> {
    await this.rateLimiter.waitForSlot();

    return this.retryHandler.execute(async () => {
      const headers = await this.auth.getRequestHeaders();
      const url = `${this.baseUrl}/${customerId}/googleAds:search`;

      const body: SearchGoogleAdsRequest = {
        customerId,
        query,
        pageSize,
        ...(pageToken ? { pageToken } : {}),
      };

      this.rateLimiter.reserve();

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw await ErrorParser.parseHttpResponse(response);
        }

        const data = (await response.json()) as SearchGoogleAdsResponse;
        return data;
      } catch (error) {
        if (error instanceof GoogleAdsApiError) throw error;
        throw new GoogleAdsApiError(
          `Search request failed: ${(error as Error).message}`,
          500,
          "INTERNAL_ERROR"
        );
      } finally {
        this.rateLimiter.release();
      }
    }, "search");
  }

  /**
   * Execute a GAQL search and iterate through all pages.
   *
   * @param customerId - The Google Ads customer ID
   * @param query - The GAQL query string
   * @param pageSize - Number of results per page
   * @returns All results across all pages
   */
  async searchAll(
    customerId: string,
    query: string,
    pageSize: number = 10000
  ): Promise<SearchGoogleAdsRow[]> {
    const allResults: SearchGoogleAdsRow[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.search(customerId, query, pageSize, pageToken);
      if (response.results) {
        allResults.push(...response.results);
      }
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allResults;
  }

  /**
   * Execute a mutate (write) operation against the Google Ads API.
   *
   * @param customerId - The Google Ads customer ID
   * @param operations - Array of create/update/remove operations
   * @param partialFailure - Whether to allow partial success (default: true)
   * @returns Mutate response with results and optional partial failures
   */
  async mutate(
    customerId: string,
    operations: MutateOperation[],
    partialFailure: boolean = true
  ): Promise<MutateResponse> {
    if (operations.length === 0) {
      return { results: [] };
    }

    this.rateLimiter.checkLimit(operations.length);
    await this.rateLimiter.waitForSlot();

    return this.retryHandler.execute(async () => {
      const headers = await this.auth.getRequestHeaders();
      const url = `${this.baseUrl}/${customerId}/googleAds:mutate`;

      const body: MutateRequest = {
        customerId,
        operations,
        partialFailure,
        responseContentType: "MUTABLE_RESOURCE",
      };

      this.rateLimiter.reserve(operations.length);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          throw await ErrorParser.parseHttpResponse(response);
        }

        const data = (await response.json()) as MutateResponse;

        // Handle partial failure
        if (partialFailure && hasPartialFailure(data)) {
          const failures = ErrorParser.parsePartialFailure(data);
          if (failures && failures.length > 0) {
            logger.warn(
              `Partial failure in mutate: ${failures.length}/${operations.length} operations failed`
            );
            for (const f of failures) {
              logger.warn(`  [Op ${f.operationIndex}] ${f.error.message}`);
            }
          }
        }

        return data;
      } catch (error) {
        if (error instanceof GoogleAdsApiError) throw error;
        throw new GoogleAdsApiError(
          `Mutate request failed: ${(error as Error).message}`,
          500,
          "INTERNAL_ERROR"
        );
      } finally {
        this.rateLimiter.release();
      }
    }, `mutate_${operations.length}_ops`);
  }

  // ==========================================================================
  // CAMPAIGN MANAGEMENT
  // ==========================================================================

  /**
   * List campaigns for a customer account.
   *
   * @param customerId - The Google Ads customer ID (with or without dashes)
   * @param params - Optional filters and pagination
   * @returns Paginated list of campaigns
   */
  async getCampaigns(
    customerId: string,
    params: CampaignListParams = {}
  ): Promise<PaginatedResponse<Campaign>> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLPresets.listCampaigns({
      statuses: params.statuses,
      dateRange: params.dateRange,
      limit: params.limit ?? 100,
      includeMetrics: !!params.dateRange,
    });

    const results = await this.searchAll(cleanCustomerId, query, params.limit ?? 100);

    const campaigns: Campaign[] = results
      .map((row) => row.campaign)
      .filter((c): c is Campaign => c !== undefined)
      .map((c) => this.transformCampaign(c));

    return {
      data: campaigns,
      pagination: {
        page: 1,
        pageSize: params.limit ?? 100,
        totalCount: campaigns.length,
        hasNextPage: campaigns.length === (params.limit ?? 100),
      },
    };
  }

  /**
   * Get a single campaign by ID with full details and optional metrics.
   *
   * @param customerId - The Google Ads customer ID
   * @param campaignId - The campaign ID
   * @param dateRange - Optional date range for metrics
   * @returns Campaign details or null if not found
   */
  async getCampaign(
    customerId: string,
    campaignId: string,
    dateRange?: DateRange
  ): Promise<Campaign | null> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLBuilder.create()
      .selectCampaign("*")
      .from("campaign")
      .whereCampaignId(campaignId)
      .build();

    const results = await this.searchAll(cleanCustomerId, query, 1);

    if (results.length === 0 || !results[0].campaign) {
      return null;
    }

    let campaign = this.transformCampaign(results[0].campaign);

    // Fetch metrics if date range provided
    if (dateRange) {
      const metrics = await this.getCampaignMetrics(customerId, campaignId, dateRange);
      if (metrics) {
        campaign = { ...campaign, ...metrics } as Campaign & CampaignMetrics;
      }
    }

    return campaign;
  }

  /**
   * Create a new campaign.
   *
   * @param customerId - The Google Ads customer ID
   * @param data - Campaign creation data
   * @returns The created campaign resource name and ID
   */
  async createCampaign(
    customerId: string,
    data: CreateCampaignData
  ): Promise<{ resourceName: string; id: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const campaign: Record<string, unknown> = {
      name: data.name,
      advertisingChannelType: data.advertisingChannelType,
      status: data.status ?? "PAUSED",
    };

    if (data.advertisingChannelSubType) {
      campaign.advertisingChannelSubType = data.advertisingChannelSubType;
    }

    if (data.campaignBudget) {
      campaign.campaignBudget = data.campaignBudget;
    }

    if (data.startDate) {
      campaign.startDate = data.startDate;
    }
    if (data.endDate) {
      campaign.endDate = data.endDate;
    }

    if (data.networkSettings) {
      campaign.networkSettings = {
        targetGoogleSearch: data.networkSettings.targetGoogleSearch ?? true,
        targetSearchNetwork: data.networkSettings.targetSearchNetwork ?? true,
        targetContentNetwork: data.networkSettings.targetContentNetwork ?? false,
        targetPartnerSearchNetwork: data.networkSettings.targetPartnerSearchNetwork ?? false,
      };
    }

    if (data.biddingStrategy) {
      Object.assign(campaign, this.buildBiddingStrategy(data.biddingStrategy as unknown as Record<string, unknown>));
    }

    if (data.trackingUrlTemplate) {
      campaign.trackingUrlTemplate = data.trackingUrlTemplate;
    }
    if (data.finalUrlSuffix) {
      campaign.finalUrlSuffix = data.finalUrlSuffix;
    }

    const operation: MutateOperation = {
      create: campaign,
    };

    // If budget data provided, create budget first
    const operations: MutateOperation[] = [];

    if (data.budgetAmountMicros && !data.campaignBudget) {
      const budgetOp = this.buildBudgetOperation(data.budgetAmountMicros);
      operations.push(budgetOp);

      // Reference the to-be-created budget
      campaign.campaignBudget = budgetOp.create!.resourceName as string;
    }

    operations.push(operation);

    const response = await this.mutate(cleanCustomerId, operations, true);

    if (!response.results || response.results.length === 0) {
      throw new GoogleAdsApiError("Campaign creation returned no results", 500, "INTERNAL_ERROR");
    }

    const lastResult = response.results[response.results.length - 1];
    return {
      resourceName: lastResult.resourceName,
      id: lastResult.resourceName.split("/").pop() ?? "",
    };
  }

  /**
   * Update an existing campaign.
   *
   * @param customerId - The Google Ads customer ID
   * @param campaignId - The campaign ID to update
   * @param data - Fields to update
   * @returns The updated campaign resource name
   */
  async updateCampaign(
    customerId: string,
    campaignId: string,
    data: UpdateCampaignData
  ): Promise<{ resourceName: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);
    const resourceName = `customers/${cleanCustomerId}/campaigns/${campaignId}`;

    const updateMask: string[] = [];
    const campaign: Record<string, unknown> = {
      resourceName,
    };

    if (data.name !== undefined) {
      campaign.name = data.name;
      updateMask.push("name");
    }
    if (data.status !== undefined) {
      campaign.status = data.status;
      updateMask.push("status");
    }
    if (data.startDate !== undefined) {
      campaign.startDate = data.startDate;
      updateMask.push("startDate");
    }
    if (data.endDate !== undefined) {
      campaign.endDate = data.endDate;
      updateMask.push("endDate");
    }
    if (data.campaignBudget !== undefined) {
      campaign.campaignBudget = data.campaignBudget;
      updateMask.push("campaignBudget");
    }
    if (data.budgetAmountMicros !== undefined && !data.campaignBudget) {
      // Create a new budget
      const budgetResult = await this.createCampaignBudget(customerId, data.budgetAmountMicros);
      campaign.campaignBudget = budgetResult.resourceName;
      updateMask.push("campaignBudget");
    }
    if (data.trackingUrlTemplate !== undefined) {
      campaign.trackingUrlTemplate = data.trackingUrlTemplate;
      updateMask.push("trackingUrlTemplate");
    }
    if (data.finalUrlSuffix !== undefined) {
      campaign.finalUrlSuffix = data.finalUrlSuffix;
      updateMask.push("finalUrlSuffix");
    }

    if (updateMask.length === 0) {
      throw new GoogleAdsApiError("No fields to update", 400, "INVALID_ARGUMENT");
    }

    const operation: MutateOperation = {
      update: campaign,
      updateMask: { paths: updateMask },
    };

    const response = await this.mutate(cleanCustomerId, [operation]);

    if (!response.results || response.results.length === 0) {
      throw new GoogleAdsApiError("Campaign update returned no results", 500, "INTERNAL_ERROR");
    }

    return { resourceName: response.results[0].resourceName };
  }

  /**
   * Delete (remove) a campaign. Campaigns are set to REMOVED status.
   *
   * @param customerId - The Google Ads customer ID
   * @param campaignId - The campaign ID to remove
   */
  async deleteCampaign(customerId: string, campaignId: string): Promise<void> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);
    const resourceName = `customers/${cleanCustomerId}/campaigns/${campaignId}`;

    const operation: MutateOperation = {
      remove: resourceName,
    };

    await this.mutate(cleanCustomerId, [operation]);
  }

  // ==========================================================================
  // AD GROUP MANAGEMENT
  // ==========================================================================

  /**
   * List ad groups for a campaign.
   *
   * @param customerId - The Google Ads customer ID
   * @param campaignId - The parent campaign ID
   * @param status - Optional status filter
   * @returns List of ad groups
   */
  async getAdGroups(
    customerId: string,
    campaignId: string,
    status?: "ENABLED" | "PAUSED" | "REMOVED"
  ): Promise<AdGroup[]> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLPresets.listAdGroups(campaignId, status);
    const results = await this.searchAll(cleanCustomerId, query);

    return results
      .map((row) => row.adGroup)
      .filter((ag): ag is AdGroup => ag !== undefined)
      .map((ag) => this.transformAdGroup(ag));
  }

  /**
   * Create a new ad group.
   *
   * @param customerId - The Google Ads customer ID
   * @param data - Ad group creation data
   * @returns The created ad group resource name and ID
   */
  async createAdGroup(
    customerId: string,
    data: CreateAdGroupData
  ): Promise<{ resourceName: string; id: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const adGroup: Record<string, unknown> = {
      campaign: `customers/${cleanCustomerId}/campaigns/${data.campaignId}`,
      name: data.name,
      status: data.status ?? "ENABLED",
    };

    if (data.cpcBidMicros) {
      adGroup.cpcBidMicros = data.cpcBidMicros;
    }
    if (data.cpmBidMicros) {
      adGroup.cpmBidMicros = data.cpmBidMicros;
    }
    if (data.cpvBidMicros) {
      adGroup.cpvBidMicros = data.cpvBidMicros;
    }
    if (data.trackingUrlTemplate) {
      adGroup.trackingUrlTemplate = data.trackingUrlTemplate;
    }
    if (data.finalUrlSuffix) {
      adGroup.finalUrlSuffix = data.finalUrlSuffix;
    }

    const operation: MutateOperation = {
      create: adGroup,
    };

    const response = await this.mutate(cleanCustomerId, [operation]);

    if (!response.results || response.results.length === 0) {
      throw new GoogleAdsApiError("Ad group creation returned no results", 500, "INTERNAL_ERROR");
    }

    return {
      resourceName: response.results[0].resourceName,
      id: response.results[0].resourceName.split("/").pop() ?? "",
    };
  }

  /**
   * Update an ad group.
   *
   * @param customerId - The Google Ads customer ID
   * @param adGroupId - The ad group ID to update
   * @param data - Fields to update
   */
  async updateAdGroup(
    customerId: string,
    adGroupId: string,
    data: UpdateAdGroupData
  ): Promise<{ resourceName: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);
    const resourceName = `customers/${cleanCustomerId}/adGroups/${adGroupId}`;

    const updateMask: string[] = [];
    const adGroup: Record<string, unknown> = { resourceName };

    if (data.name !== undefined) {
      adGroup.name = data.name;
      updateMask.push("name");
    }
    if (data.status !== undefined) {
      adGroup.status = data.status;
      updateMask.push("status");
    }
    if (data.cpcBidMicros !== undefined) {
      adGroup.cpcBidMicros = data.cpcBidMicros;
      updateMask.push("cpcBidMicros");
    }
    if (data.cpmBidMicros !== undefined) {
      adGroup.cpmBidMicros = data.cpmBidMicros;
      updateMask.push("cpmBidMicros");
    }

    if (updateMask.length === 0) {
      throw new GoogleAdsApiError("No fields to update", 400, "INVALID_ARGUMENT");
    }

    const response = await this.mutate(cleanCustomerId, [
      { update: adGroup, updateMask: { paths: updateMask } },
    ]);

    return { resourceName: response.results[0].resourceName };
  }

  /**
   * Delete (remove) an ad group.
   */
  async deleteAdGroup(customerId: string, adGroupId: string): Promise<void> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);
    const resourceName = `customers/${cleanCustomerId}/adGroups/${adGroupId}`;

    await this.mutate(cleanCustomerId, [{ remove: resourceName }]);
  }

  // ==========================================================================
  // AD MANAGEMENT
  // ==========================================================================

  /**
   * List ads within an ad group.
   *
   * @param customerId - The Google Ads customer ID
   * @param adGroupId - The parent ad group ID
   * @param status - Optional status filter
   * @returns List of ads
   */
  async getAds(
    customerId: string,
    adGroupId: string,
    status?: "ENABLED" | "PAUSED" | "REMOVED"
  ): Promise<AdGroupAd[]> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLPresets.listAds(adGroupId, status);
    const results = await this.searchAll(cleanCustomerId, query);

    return results
      .map((row) => row.adGroupAd)
      .filter((ad): ad is AdGroupAd => ad !== undefined)
      .map((ad) => this.transformAdGroupAd(ad));
  }

  /**
   * Create a new ad (responsive search ad, display ad, etc.).
   *
   * @param customerId - The Google Ads customer ID
   * @param data - Ad creation data
   * @returns The created ad resource name and ID
   */
  async createAd(
    customerId: string,
    data: CreateAdData
  ): Promise<{ resourceName: string; id: string; adGroupAdResourceName: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const ad: Record<string, unknown> = {
      finalUrls: data.finalUrls,
    };

    if (data.responsiveSearchAd) {
      ad.responsiveSearchAd = {
        headlines: data.responsiveSearchAd.headlines.map((h) => ({
          text: h.text,
          ...(h.pinnedField ? { pinnedField: h.pinnedField } : {}),
        })),
        descriptions: data.responsiveSearchAd.descriptions.map((d) => ({ text: d.text })),
        ...(data.responsiveSearchAd.path1 ? { path1: data.responsiveSearchAd.path1 } : {}),
        ...(data.responsiveSearchAd.path2 ? { path2: data.responsiveSearchAd.path2 } : {}),
      };
    }

    if (data.responsiveDisplayAd) {
      ad.responsiveDisplayAd = {
        headlines: data.responsiveDisplayAd.headlines.map((h) => ({ text: h.text })),
        descriptions: data.responsiveDisplayAd.descriptions.map((d) => ({ text: d.text })),
        businessName: data.responsiveDisplayAd.businessName,
        ...(data.responsiveDisplayAd.finalUrls
          ? { finalUrls: data.responsiveDisplayAd.finalUrls }
          : {}),
        ...(data.responsiveDisplayAd.callToActionText
          ? { callToActionText: data.responsiveDisplayAd.callToActionText }
          : {}),
        ...(data.responsiveDisplayAd.marketingImages
          ? { marketingImages: data.responsiveDisplayAd.marketingImages }
          : {}),
        ...(data.responsiveDisplayAd.logoImages
          ? { logoImages: data.responsiveDisplayAd.logoImages }
          : {}),
      };
    }

    if (data.expandedTextAd) {
      ad.expandedTextAd = data.expandedTextAd;
    }

    if (data.trackingUrlTemplate) {
      ad.trackingUrlTemplate = data.trackingUrlTemplate;
    }
    if (data.finalUrlSuffix) {
      ad.finalUrlSuffix = data.finalUrlSuffix;
    }

    const adGroupAd: Record<string, unknown> = {
      adGroup: `customers/${cleanCustomerId}/adGroups/${data.adGroupId}`,
      ad,
      status: data.status ?? "ENABLED",
    };

    const operation: MutateOperation = {
      create: adGroupAd,
    };

    const response = await this.mutate(cleanCustomerId, [operation]);

    if (!response.results || response.results.length === 0) {
      throw new GoogleAdsApiError("Ad creation returned no results", 500, "INTERNAL_ERROR");
    }

    const result = response.results[0];
    return {
      resourceName: result.adGroupAd?.ad?.resourceName ?? result.resourceName,
      id: result.adGroupAd?.ad?.resourceName?.split("/").pop() ?? "",
      adGroupAdResourceName: result.resourceName,
    };
  }

  /**
   * Update an ad's status (ENABLE, PAUSE, REMOVE).
   */
  async updateAdStatus(
    customerId: string,
    adGroupAdResourceName: string,
    status: "ENABLED" | "PAUSED" | "REMOVED"
  ): Promise<{ resourceName: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const adGroupAd = {
      resourceName: adGroupAdResourceName,
      status,
    };

    const response = await this.mutate(cleanCustomerId, [
      {
        update: adGroupAd,
        updateMask: { paths: ["status"] },
      },
    ]);

    return { resourceName: response.results[0].resourceName };
  }

  /**
   * Remove an ad.
   */
  async deleteAd(customerId: string, adGroupAdResourceName: string): Promise<void> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);
    await this.mutate(cleanCustomerId, [{ remove: adGroupAdResourceName }]);
  }

  // ==========================================================================
  // INSIGHTS / REPORTING
  // ==========================================================================

  /**
   * Get performance metrics for a specific campaign.
   *
   * @param customerId - The Google Ads customer ID
   * @param campaignId - The campaign ID
   * @param dateRange - Date range for metrics
   * @returns Campaign metrics or null
   */
  async getCampaignMetrics(
    customerId: string,
    campaignId: string,
    dateRange: DateRange | string
  ): Promise<CampaignMetrics | null> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLPresets.campaignPerformanceReport({
      campaignId,
      dateRange,
    });

    const results = await this.searchAll(cleanCustomerId, query, 1);

    if (results.length === 0) return null;

    return this.transformCampaignMetrics(results[0]);
  }

  /**
   * Get account-level summary with aggregate metrics.
   *
   * @param customerId - The Google Ads customer ID
   * @param dateRange - Date range for metrics
   * @returns Account summary
   */
  async getAccountSummary(
    customerId: string,
    dateRange: DateRange | string
  ): Promise<AccountSummary> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLBuilder.create()
      .select(
        "customer.id",
        "customer.descriptive_name",
        "customer.currency_code"
      )
      .selectMetrics(
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
        "metrics.ctr",
        "metrics.average_cpc",
        "metrics.cost_per_conversion",
        "metrics.conversions_from_interactions_rate",
        "metrics.value_per_conversion"
      )
      .from("customer")
      .during(dateRange)
      .build();

    const results = await this.searchAll(cleanCustomerId, query);

    // Aggregate metrics across all rows
    let impressions = 0;
    let clicks = 0;
    let costMicros = 0;
    let conversions = 0;
    let conversionsValue = 0;
    let viewThroughConversions = 0;
    let allConversions = 0;

    let customerInfo: { id: string; name?: string; currency?: string } = {
      id: cleanCustomerId,
    };

    for (const row of results) {
      if (row.customer) {
        customerInfo = {
          id: String(row.customer.id ?? cleanCustomerId),
          name: row.customer.descriptive_name,
          currency: row.customer.currency_code,
        };
      }
      if (row.metrics) {
        impressions += Number(row.metrics.impressions ?? 0);
        clicks += Number(row.metrics.clicks ?? 0);
        costMicros += Number(row.metrics.costMicros ?? 0);
        conversions += Number(row.metrics.conversions ?? 0);
        conversionsValue += Number(row.metrics.conversionsValue ?? 0);
        viewThroughConversions += Number(row.metrics.viewThroughConversions ?? 0);
        allConversions += Number(row.metrics.allConversions ?? 0);
      }
    }

    const costDollars = costMicros / 1_000_000;
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const avgCpc = clicks > 0 ? costDollars / clicks : 0;
    const avgCpm = impressions > 0 ? (costDollars / impressions) * 1000 : 0;
    const costPerConv = conversions > 0 ? costDollars / conversions : 0;
    const convRate = clicks > 0 ? conversions / clicks : 0;
    const roas = costDollars > 0 ? conversionsValue / costDollars : 0;

    // Count campaigns and ad groups
    const campaigns = await this.getCampaigns(cleanCustomerId, { limit: 10000 });
    let adGroupCount = 0;
    for (const campaign of campaigns.data) {
      const ags = await this.getAdGroups(cleanCustomerId, campaign.id);
      adGroupCount += ags.length;
    }

    const dateRangeObj = typeof dateRange === "string"
      ? { startDate: dateRange, endDate: dateRange }
      : dateRange;

    return {
      customerId: customerInfo.id,
      descriptiveName: customerInfo.name,
      currencyCode: customerInfo.currency,
      dateRange: dateRangeObj,
      impressions: String(impressions),
      clicks: String(clicks),
      costMicros: String(costMicros),
      conversions: String(conversions),
      conversionsValue: String(conversionsValue),
      viewThroughConversions: String(viewThroughConversions),
      allConversions: String(allConversions),
      ctr,
      averageCpc: avgCpc,
      averageCpm: avgCpm,
      costPerConversion: costPerConv,
      conversionRate: convRate,
      roas,
      campaignCount: campaigns.data.length,
      adGroupCount,
    };
  }

  /**
   * Get all campaigns with their metrics for a given date range.
   *
   * @param customerId - The Google Ads customer ID
   * @param dateRange - Date range for metrics
   * @returns List of campaigns with metrics
   */
  async getCampaignsWithMetrics(
    customerId: string,
    dateRange: DateRange | string
  ): Promise<Array<Campaign & Partial<CampaignMetrics>>> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLBuilder.create()
      .selectCampaign(
        "campaign.resource_name",
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "campaign.advertising_channel_type",
        "campaign.start_date",
        "campaign.end_date"
      )
      .selectMetrics(
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
        "metrics.ctr",
        "metrics.average_cpc",
        "metrics.cost_per_conversion",
        "metrics.value_per_conversion",
        "metrics.search_impression_share",
        "metrics.search_top_impression_share",
        "metrics.search_absolute_top_impression_share"
      )
      .from("campaign")
      .during(dateRange)
      .build();

    const results = await this.searchAll(cleanCustomerId, query);

    return results.map((row) => {
      const campaign = row.campaign ? this.transformCampaign(row.campaign) : ({} as Campaign);
      const metrics = row.metrics ? this.extractMetrics(row.metrics) : {};
      return { ...campaign, ...metrics } as Campaign & Partial<CampaignMetrics>;
    });
  }

  /**
   * Get conversion actions for an account.
   */
  async getConversionActions(
    customerId: string,
    status?: string
  ): Promise<ConversionAction[]> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const query = GAQLPresets.listConversionActions(status);
    const results = await this.searchAll(cleanCustomerId, query);

    return results
      .map((row) => row.conversionAction)
      .filter((ca): ca is ConversionAction => ca !== undefined)
      .map((ca) => this.transformConversionAction(ca));
  }

  // ==========================================================================
  // GAQL QUERY BUILDER ACCESS
  // ==========================================================================

  /**
   * Get a fresh GAQLBuilder instance for custom queries.
   *
   * @example
   * ```typescript
   * const query = client.queryBuilder()
   *   .select("campaign.id", "campaign.name", "metrics.clicks")
   *   .from("campaign")
   *   .where("campaign.status", "=", "ENABLED")
   *   .duringLast30Days()
   *   .limit(100)
   *   .build();
   * ```
   */
  queryBuilder(): GAQLBuilder {
    return GAQLBuilder.create();
  }

  /**
   * Execute a custom GAQL query built with the query builder or raw string.
   */
  async executeQuery(
    customerId: string,
    query: string | GAQLBuilder,
    pageSize?: number
  ): Promise<SearchGoogleAdsRow[]> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);
    const queryString = typeof query === "string" ? query : query.build();
    return this.searchAll(cleanCustomerId, queryString, pageSize);
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Create multiple campaigns in a single request.
   * Handles partial failures - some campaigns may succeed while others fail.
   *
   * @returns Results with successful campaigns and failures
   */
  async createCampaigns(
    customerId: string,
    campaigns: CreateCampaignData[]
  ): Promise<{
    successes: Array<{ item: CreateCampaignData; result: { resourceName: string; id: string } }>;
    failures: Array<{ item: CreateCampaignData; error: Error }>;
  }> {
    return this.retryHandler.executeBatch(
      campaigns,
      async (data) => this.createCampaign(customerId, data),
      "create_campaigns"
    );
  }

  /**
   * Create multiple ads in a single batch.
   */
  async createAds(
    customerId: string,
    ads: CreateAdData[]
  ): Promise<{
    successes: Array<{ item: CreateAdData; result: { resourceName: string; id: string; adGroupAdResourceName: string } }>;
    failures: Array<{ item: CreateAdData; error: Error }>;
  }> {
    return this.retryHandler.executeBatch(
      ads,
      async (data) => this.createAd(customerId, data),
      "create_ads"
    );
  }

  // ==========================================================================
  // RATE LIMIT UTILITIES
  // ==========================================================================

  /**
   * Get current rate limit status.
   */
  getRateLimitStatus(): {
    dailyRemaining: number;
    hourlyRemaining: number;
    minuteRemaining: number;
    concurrentRequests: number;
  } {
    return {
      dailyRemaining: this.rateLimiter.getRemainingDailyOperations(),
      hourlyRemaining: this.rateLimiter.getRemainingHourlyOperations(),
      minuteRemaining: this.rateLimiter.getRemainingMinuteOperations(),
      concurrentRequests: this.rateLimiter.getState().concurrentRequests,
    };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Remove dashes from customer ID for API usage.
   */
  private sanitizeCustomerId(customerId: string): string {
    return customerId.replace(/-/g, "");
  }

  /**
   * Build a bidding strategy object for campaign create/update.
   */
  private buildBiddingStrategy(strategy: Record<string, unknown>): Record<string, unknown> {
    return strategy;
  }

  /**
   * Build a budget operation for campaign creation.
   */
  private buildBudgetOperation(amountMicros: string): MutateOperation {
    return {
      create: {
        resourceName: `customers/-1/campaignBudgets/-1`,
        amountMicros,
        deliveryMethod: "STANDARD",
        explicitlyShared: false,
      },
    };
  }

  /**
   * Create a campaign budget and return its resource name.
   */
  private async createCampaignBudget(
    customerId: string,
    amountMicros: string
  ): Promise<{ resourceName: string }> {
    const cleanCustomerId = this.sanitizeCustomerId(customerId);

    const response = await this.mutate(cleanCustomerId, [
      {
        create: {
          amountMicros,
          deliveryMethod: "STANDARD",
          explicitlyShared: false,
        },
      },
    ]);

    return { resourceName: response.results[0].resourceName };
  }

  // ---- Transformers --------------------------------------------------------

  private transformCampaign(raw: Partial<Campaign>): Campaign {
    return {
      resourceName: raw.resourceName ?? "",
      id: raw.id ?? "",
      name: raw.name ?? "",
      status: raw.status ?? "PAUSED",
      servingStatus: raw.servingStatus ?? "NONE",
      advertisingChannelType: raw.advertisingChannelType ?? "SEARCH",
      advertisingChannelSubType: raw.advertisingChannelSubType,
      startDate: raw.startDate ?? "",
      endDate: raw.endDate,
      campaignBudget: raw.campaignBudget ?? "",
      biddingStrategyType: raw.biddingStrategyType ?? "NONE",
      biddingStrategy: raw.biddingStrategy,
      networkSettings: raw.networkSettings ?? {
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: false,
        targetPartnerSearchNetwork: false,
      },
      trackingUrlTemplate: raw.trackingUrlTemplate,
      finalUrlSuffix: raw.finalUrlSuffix,
      urlCustomParameters: raw.urlCustomParameters,
      labels: raw.labels,
      experimentType: raw.experimentType,
      baseCampaign: raw.baseCampaign,
      frequencyCaps: raw.frequencyCaps,
      geoTargetTypeSetting: raw.geoTargetTypeSetting,
      selectiveOptimization: raw.selectiveOptimization,
      optimizationScore: raw.optimizationScore,
      paymentMode: raw.paymentMode,
    };
  }

  private transformAdGroup(raw: Partial<AdGroup>): AdGroup {
    return {
      resourceName: raw.resourceName ?? "",
      id: raw.id ?? "",
      name: raw.name ?? "",
      status: raw.status ?? "ENABLED",
      type: raw.type ?? "SEARCH_STANDARD",
      adRotationMode: raw.adRotationMode,
      baseAdGroup: raw.baseAdGroup,
      campaign: raw.campaign ?? "",
      cpcBidMicros: raw.cpcBidMicros,
      cpmBidMicros: raw.cpmBidMicros,
      cpvBidMicros: raw.cpvBidMicros,
      targetCpaMicros: raw.targetCpaMicros,
      targetCpmMicros: raw.targetCpmMicros,
      targetRoas: raw.targetRoas,
      percentCpcBidMicros: raw.percentCpcBidMicros,
      effectiveTargetCpaMicros: raw.effectiveTargetCpaMicros,
      effectiveTargetCpaSource: raw.effectiveTargetCpaSource,
      effectiveTargetRoas: raw.effectiveTargetRoas,
      effectiveTargetRoasSource: raw.effectiveTargetRoasSource,
      labels: raw.labels,
      trackingUrlTemplate: raw.trackingUrlTemplate,
      finalUrlSuffix: raw.finalUrlSuffix,
      excludedParentAssetFieldTypes: raw.excludedParentAssetFieldTypes,
      urlCustomParameters: raw.urlCustomParameters,
      displayCustomBidDimension: raw.displayCustomBidDimension,
    };
  }

  private transformAdGroupAd(raw: Partial<AdGroupAd>): AdGroupAd {
    return {
      resourceName: raw.resourceName ?? "",
      adGroup: raw.adGroup ?? "",
      ad: raw.ad ?? ({} as AdData),
      status: raw.status ?? "ENABLED",
      policySummary: raw.policySummary,
      adStrength: raw.adStrength,
    };
  }

  private transformCampaignMetrics(row: SearchGoogleAdsRow): CampaignMetrics {
    const campaign = row.campaign ?? {};
    const metrics = row.metrics ?? {};

    const impressions = Number(metrics.impressions ?? 0);
    const clicks = Number(metrics.clicks ?? 0);
    const costMicros = Number(metrics.costMicros ?? 0);
    const costDollars = costMicros / 1_000_000;
    const conversions = Number(metrics.conversions ?? 0);
    const conversionsValue = Number(metrics.conversionsValue ?? 0);

    return {
      campaignResourceName: campaign.resourceName ?? "",
      campaignId: campaign.id ?? "",
      campaignName: campaign.name ?? "",
      status: campaign.status ?? "",
      impressions: String(impressions),
      clicks: String(clicks),
      costMicros: String(costMicros),
      conversions: String(conversions),
      conversionsValue: String(conversionsValue),
      viewThroughConversions: String(metrics.viewThroughConversions ?? 0),
      allConversions: String(metrics.allConversions ?? 0),
      allConversionsValue: String(metrics.allConversionsValue ?? 0),
      ctr: impressions > 0 ? clicks / impressions : 0,
      averageCpc: clicks > 0 ? costDollars / clicks : 0,
      averageCpm: impressions > 0 ? (costDollars / impressions) * 1000 : 0,
      costPerConversion: conversions > 0 ? costDollars / conversions : 0,
      conversionRate: clicks > 0 ? conversions / clicks : 0,
      roas: costDollars > 0 ? conversionsValue / costDollars : 0,
      absoluteTopImpressionPercentage: Number(metrics.absoluteTopImpressionPercentage ?? 0),
      topImpressionPercentage: Number(metrics.topImpressionPercentage ?? 0),
      searchImpressionShare: metrics.searchImpressionShare
        ? Number(metrics.searchImpressionShare)
        : undefined,
      searchClickShare: metrics.searchClickShare
        ? Number(metrics.searchClickShare)
        : undefined,
      searchTopImpressionShare: metrics.searchTopImpressionShare
        ? Number(metrics.searchTopImpressionShare)
        : undefined,
      searchAbsoluteTopImpressionShare: metrics.searchAbsoluteTopImpressionShare
        ? Number(metrics.searchAbsoluteTopImpressionShare)
        : undefined,
      searchBudgetLostAbsoluteTopImpressionShare: metrics.searchBudgetLostAbsoluteTopImpressionShare
        ? Number(metrics.searchBudgetLostAbsoluteTopImpressionShare)
        : undefined,
      searchBudgetLostTopImpressionShare: metrics.searchBudgetLostTopImpressionShare
        ? Number(metrics.searchBudgetLostTopImpressionShare)
        : undefined,
      searchBudgetLostImpressionShare: metrics.searchBudgetLostImpressionShare
        ? Number(metrics.searchBudgetLostImpressionShare)
        : undefined,
      searchRankLostAbsoluteTopImpressionShare: metrics.searchRankLostAbsoluteTopImpressionShare
        ? Number(metrics.searchRankLostAbsoluteTopImpressionShare)
        : undefined,
      searchRankLostTopImpressionShare: metrics.searchRankLostTopImpressionShare
        ? Number(metrics.searchRankLostTopImpressionShare)
        : undefined,
      searchRankLostImpressionShare: metrics.searchRankLostImpressionShare
        ? Number(metrics.searchRankLostImpressionShare)
        : undefined,
      bounceRate: metrics.bounceRate ? Number(metrics.bounceRate) : undefined,
      averageCpe: metrics.averageCpe ? Number(metrics.averageCpe) : undefined,
    };
  }

  private extractMetrics(metrics: Partial<CampaignMetrics>): Partial<CampaignMetrics> {
    const impressions = Number(metrics.impressions ?? 0);
    const clicks = Number(metrics.clicks ?? 0);
    const costMicros = Number(metrics.costMicros ?? 0);
    const costDollars = costMicros / 1_000_000;
    const conversions = Number(metrics.conversions ?? 0);
    const conversionsValue = Number(metrics.conversionsValue ?? 0);

    return {
      impressions: String(impressions),
      clicks: String(clicks),
      costMicros: String(costMicros),
      conversions: String(conversions),
      conversionsValue: String(conversionsValue),
      viewThroughConversions: String(metrics.viewThroughConversions ?? 0),
      ctr: impressions > 0 ? clicks / impressions : 0,
      averageCpc: clicks > 0 ? costDollars / clicks : 0,
      averageCpm: impressions > 0 ? (costDollars / impressions) * 1000 : 0,
      costPerConversion: conversions > 0 ? costDollars / conversions : 0,
      conversionRate: clicks > 0 ? conversions / clicks : 0,
      roas: costDollars > 0 ? conversionsValue / costDollars : 0,
      searchImpressionShare: metrics.searchImpressionShare
        ? Number(metrics.searchImpressionShare)
        : undefined,
      searchTopImpressionShare: metrics.searchTopImpressionShare
        ? Number(metrics.searchTopImpressionShare)
        : undefined,
      searchAbsoluteTopImpressionShare: metrics.searchAbsoluteTopImpressionShare
        ? Number(metrics.searchAbsoluteTopImpressionShare)
        : undefined,
    };
  }

  private transformConversionAction(raw: Partial<ConversionAction>): ConversionAction {
    return {
      resourceName: raw.resourceName ?? "",
      id: raw.id ?? "",
      name: raw.name ?? "",
      status: raw.status ?? "",
      type: raw.type ?? "",
      category: raw.category ?? "",
      ownerCustomer: raw.ownerCustomer ?? "",
      includeInConversionsMetric: raw.includeInConversionsMetric ?? true,
      clickThroughLookbackWindowDays: raw.clickThroughLookbackWindowDays ?? 30,
      viewThroughLookbackWindowDays: raw.viewThroughLookbackWindowDays ?? 30,
      valueSettings: raw.valueSettings,
    };
  }
}

// ==========================================================================
// Factory
// ==========================================================================

/**
 * Create a GoogleAdsClient from environment variables.
 *
 * Expected environment variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 * - GOOGLE_DEVELOPER_TOKEN
 * - GOOGLE_LOGIN_CUSTOMER_ID (optional)
 * - GOOGLE_CUSTOMER_ID
 */
export function createGoogleAdsClientFromEnv(
  customerId?: string
): GoogleAdsClient {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
  const loginCustomerId = process.env.GOOGLE_LOGIN_CUSTOMER_ID;
  const defaultCustomerId = process.env.GOOGLE_CUSTOMER_ID;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Google OAuth configuration. Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI"
    );
  }

  if (!developerToken) {
    throw new Error("Missing GOOGLE_DEVELOPER_TOKEN environment variable");
  }

  const finalCustomerId = customerId ?? defaultCustomerId;
  if (!finalCustomerId) {
    throw new Error(
      "No customerId provided and GOOGLE_CUSTOMER_ID not set"
    );
  }

  return new GoogleAdsClient({
    auth: {
      clientId,
      clientSecret,
      redirectUri,
      scopes: ["https://www.googleapis.com/auth/adwords"],
    },
    api: {
      developerToken,
      loginCustomerId,
      apiVersion: process.env.GOOGLE_ADS_API_VERSION ?? "v16",
    },
    customerId: finalCustomerId,
  });
}
