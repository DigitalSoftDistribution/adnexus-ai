/**
 * Google Ads API - GAQL Query Builder
 * AdNexus AI Platform
 *
 * Type-safe, fluent builder for Google Ads Query Language (GAQL).
 * Composes SELECT, FROM, WHERE, ORDER BY, LIMIT, and DURING clauses
 * with compile-time field validation.
 */

import {
import { getModuleLogger } from "../../../lib/logger";
  GAQLQuery,
  GAQLCondition,
  GAQLResource,
  GAQLCampaignField,
  GAQLAdGroupField,
  GAQLAdField,
  GAQLMetricsField,
  GAQLSegmentsField,
  DateRange,
} from "./types";

// ---------------------------------------------------------------------------
// Field registry for validation
// ---------------------------------------------------------------------------

const VALID_CAMPAIGN_FIELDS: readonly string[] = [
  "campaign.resource_name",
  "campaign.id",
  "campaign.name",
  "campaign.status",
  "campaign.serving_status",
  "campaign.advertising_channel_type",
  "campaign.advertising_channel_sub_type",
  "campaign.start_date",
  "campaign.end_date",
  "campaign.campaign_budget",
  "campaign.bidding_strategy_type",
  "campaign.tracking_url_template",
  "campaign.final_url_suffix",
  "campaign.experiment_type",
  "campaign.base_campaign",
  "campaign.labels",
  "campaign.optimization_score",
];

const VALID_AD_GROUP_FIELDS: readonly string[] = [
  "ad_group.resource_name",
  "ad_group.id",
  "ad_group.name",
  "ad_group.status",
  "ad_group.type",
  "ad_group.campaign",
  "ad_group.cpc_bid_micros",
  "ad_group.cpm_bid_micros",
  "ad_group.cpv_bid_micros",
  "ad_group.target_cpa_micros",
  "ad_group.target_roas",
  "ad_group.labels",
  "ad_group.tracking_url_template",
];

const VALID_AD_FIELDS: readonly string[] = [
  "ad_group_ad.resource_name",
  "ad_group_ad.status",
  "ad_group_ad.ad_strength",
  "ad_group_ad.ad.resource_name",
  "ad_group_ad.ad.id",
  "ad_group_ad.ad.type",
  "ad_group_ad.ad.responsive_search_ad.headlines",
  "ad_group_ad.ad.responsive_search_ad.descriptions",
  "ad_group_ad.ad.responsive_search_ad.path1",
  "ad_group_ad.ad.responsive_search_ad.path2",
  "ad_group_ad.ad.responsive_display_ad.headlines",
  "ad_group_ad.ad.responsive_display_ad.descriptions",
  "ad_group_ad.ad.final_urls",
  "ad_group_ad.ad.final_mobile_urls",
  "ad_group_ad.ad.tracking_url_template",
];

const VALID_METRICS_FIELDS: readonly string[] = [
  "metrics.impressions",
  "metrics.clicks",
  "metrics.cost_micros",
  "metrics.conversions",
  "metrics.conversions_value",
  "metrics.view_through_conversions",
  "metrics.all_conversions",
  "metrics.all_conversions_value",
  "metrics.ctr",
  "metrics.average_cpc",
  "metrics.average_cpm",
  "metrics.cost_per_conversion",
  "metrics.conversions_from_interactions_rate",
  "metrics.value_per_conversion",
  "metrics.absolute_top_impression_percentage",
  "metrics.top_impression_percentage",
  "metrics.search_impression_share",
  "metrics.search_click_share",
  "metrics.search_top_impression_share",
  "metrics.search_absolute_top_impression_share",
  "metrics.search_budget_lost_absolute_top_impression_share",
  "metrics.search_budget_lost_top_impression_share",
  "metrics.search_budget_lost_impression_share",
  "metrics.search_rank_lost_absolute_top_impression_share",
  "metrics.search_rank_lost_top_impression_share",
  "metrics.search_rank_lost_impression_share",
  "metrics.bounce_rate",
  "metrics.average_cpe",
];

const VALID_SEGMENTS_FIELDS: readonly string[] = [
  "segments.date",
  "segments.week",
  "segments.month",
  "segments.quarter",
  "segments.year",
  "segments.ad_network_type",
  "segments.device",
  "segments.conversion_action",
  "segments.conversion_action_name",
  "segments.conversion_action_category",
];

const FIELD_REGISTRY: Record<string, readonly string[]> = {
  campaign: VALID_CAMPAIGN_FIELDS,
  ad_group: VALID_AD_GROUP_FIELDS,
  ad_group_ad: VALID_AD_FIELDS,
  metrics: VALID_METRICS_FIELDS,
  segments: VALID_SEGMENTS_FIELDS,
};

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

/** Type-safe field selection combining all available GAQL field types */
export type SelectableField =
  | GAQLCampaignField
  | GAQLAdGroupField
  | GAQLAdField
  | GAQLMetricsField
  | GAQLSegmentsField
  | string;

// ---------------------------------------------------------------------------
// GAQL Builder Class
// ---------------------------------------------------------------------------

/**
 * Fluent, type-safe builder for Google Ads Query Language (GAQL) queries.
 *
 * @example
 * ```typescript
 * const query = GAQLBuilder.create()
 *   .select("campaign.id", "campaign.name", "metrics.impressions")
 *   .from("campaign")
 *   .where("campaign.status", "=", "ENABLED")
 *   .during({ startDate: "2024-01-01", endDate: "2024-01-31" })
 *   .orderBy("metrics.impressions", "DESC")
 *   .limit(100)
 *   .build();
 * ```
 */
export class GAQLBuilder {
  private query: GAQLQuery;
  private validated: boolean = false;

  private constructor() {
    this.query = {
      select: [],
      from: "campaign",
    };
  }

  /** Create a new GAQLBuilder instance */
  static create(): GAQLBuilder {
    return new GAQLBuilder();
  }

  // ---------------------------------------------------------------------------
  // SELECT
  // ---------------------------------------------------------------------------

  /**
   * Add fields to the SELECT clause.
   * Accepts type-safe GAQL field names or arbitrary strings for extensibility.
   */
  select(...fields: SelectableField[]): this {
    this.query.select.push(...fields);
    this.validated = false;
    return this;
  }

  /**
   * Add campaign entity fields to the SELECT clause.
   */
  selectCampaign(
    ...fields: Array<GAQLCampaignField | "*">
  ): this {
    if (fields.includes("*")) {
      this.query.select.push(...VALID_CAMPAIGN_FIELDS);
    } else {
      this.query.select.push(...(fields as string[]));
    }
    this.validated = false;
    return this;
  }

  /**
   * Add ad group entity fields to the SELECT clause.
   */
  selectAdGroup(
    ...fields: Array<GAQLAdGroupField | "*">
  ): this {
    if (fields.includes("*")) {
      this.query.select.push(...VALID_AD_GROUP_FIELDS);
    } else {
      this.query.select.push(...(fields as string[]));
    }
    this.validated = false;
    return this;
  }

  /**
   * Add ad entity fields to the SELECT clause.
   */
  selectAd(
    ...fields: Array<GAQLAdField | "*">
  ): this {
    if (fields.includes("*")) {
      this.query.select.push(...VALID_AD_FIELDS);
    } else {
      this.query.select.push(...(fields as string[]));
    }
    this.validated = false;
    return this;
  }

  /**
   * Add metrics fields to the SELECT clause.
   */
  selectMetrics(
    ...fields: Array<GAQLMetricsField | "*">
  ): this {
    if (fields.includes("*")) {
      this.query.select.push(...VALID_METRICS_FIELDS);
    } else {
      this.query.select.push(...(fields as string[]));
    }
    this.validated = false;
    return this;
  }

  /**
   * Add segments fields to the SELECT clause.
   */
  selectSegments(
    ...fields: Array<GAQLSegmentsField | "*">
  ): this {
    if (fields.includes("*")) {
      this.query.select.push(...VALID_SEGMENTS_FIELDS);
    } else {
      this.query.select.push(...(fields as string[]));
    }
    this.validated = false;
    return this;
  }

  // ---------------------------------------------------------------------------
  // FROM
  // ---------------------------------------------------------------------------

  /** Set the FROM resource */
  from(resource: GAQLResource): this {
    this.query.from = resource;
    return this;
  }

  // ---------------------------------------------------------------------------
  // WHERE
  // ---------------------------------------------------------------------------

  /** Add a WHERE condition */
  where(field: string, operator: GAQLCondition["operator"], value?: GAQLCondition["value"]): this {
    this.query.where = this.query.where ?? [];
    this.query.where.push({ field, operator, value });
    return this;
  }

  /** Add a raw WHERE condition string (for complex expressions) */
  whereRaw(expression: string): this {
    this.query.where = this.query.where ?? [];
    this.query.where.push({ field: "", operator: "=", raw: expression });
    return this;
  }

  /** Filter by campaign ID */
  whereCampaignId(campaignId: string | number): this {
    return this.where("campaign.id", "=", String(campaignId));
  }

  /** Filter by campaign status */
  whereCampaignStatus(status: "ENABLED" | "PAUSED" | "REMOVED" | string): this {
    return this.where("campaign.status", "=", status);
  }

  /** Filter by ad group ID */
  whereAdGroupId(adGroupId: string | number): this {
    return this.where("ad_group.id", "=", String(adGroupId));
  }

  /** Filter by ad group status */
  whereAdGroupStatus(status: "ENABLED" | "PAUSED" | "REMOVED" | string): this {
    return this.where("ad_group.status", "=", status);
  }

  /** Filter by ad status */
  whereAdStatus(status: "ENABLED" | "PAUSED" | "REMOVED" | string): this {
    return this.where("ad_group_ad.status", "=", status);
  }

  // ---------------------------------------------------------------------------
  // DURING (date range)
  // ---------------------------------------------------------------------------

  /** Add a DURING clause for date filtering */
  during(dateRange: DateRange | string): this {
    if (typeof dateRange === "string") {
      return this.where("segments.date", "DURING", dateRange);
    }
    return this.where(
      "segments.date",
      "BETWEEN",
      `${dateRange.startDate} AND ${dateRange.endDate}`
    );
  }

  /** Shorthand for common date ranges */
  duringLastNDays(days: number): this {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    return this.during({ startDate: fmt(start), endDate: fmt(end) });
  }

  duringYesterday(): this {
    return this.where("segments.date", "DURING", "YESTERDAY");
  }

  duringToday(): this {
    return this.where("segments.date", "DURING", "TODAY");
  }

  duringLast7Days(): this {
    return this.where("segments.date", "DURING", "LAST_7_DAYS");
  }

  duringLast14Days(): this {
    return this.where("segments.date", "DURING", "LAST_14_DAYS");
  }

  duringLast30Days(): this {
    return this.where("segments.date", "DURING", "LAST_30_DAYS");
  }

  duringLastMonth(): this {
    return this.where("segments.date", "DURING", "LAST_MONTH");
  }

  duringThisMonth(): this {
    return this.where("segments.date", "DURING", "THIS_MONTH");
  }

  duringLastQuarter(): this {
    return this.where("segments.date", "DURING", "LAST_QUARTER");
  }

  duringThisYear(): this {
    return this.where("segments.date", "DURING", "THIS_YEAR");
  }

  duringLastYear(): this {
    return this.where("segments.date", "DURING", "LAST_YEAR");
  }

  duringAllTime(): this {
    return this.where("segments.date", "DURING", "ALL_TIME");
  }

  // ---------------------------------------------------------------------------
  // ORDER BY
  // ---------------------------------------------------------------------------

  /** Add an ORDER BY clause */
  orderBy(field: string, direction: "ASC" | "DESC" = "ASC"): this {
    this.query.orderBy = this.query.orderBy ?? [];
    this.query.orderBy.push({ field, direction });
    return this;
  }

  // ---------------------------------------------------------------------------
  // LIMIT
  // ---------------------------------------------------------------------------

  /** Set the LIMIT */
  limit(n: number): this {
    this.query.limit = n;
    return this;
  }

  // ---------------------------------------------------------------------------
  // PARAMETERS
  // ---------------------------------------------------------------------------

  /** Add a query parameter (e.g., include_drafts=true) */
  parameter(key: string, value: string): this {
    this.query.parameters = this.query.parameters ?? [];
    this.query.parameters.push({ key, value });
    return this;
  }

  // ---------------------------------------------------------------------------
  // VALIDATION
  // ---------------------------------------------------------------------------

  /**
   * Validate that all selected fields are valid for the FROM resource.
   * Warnings are logged but do not throw — GAQL may support fields not in our registry.
   */
  validate(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    for (const field of this.query.select) {
      const prefix = field.split(".")[0];
      if (prefix && FIELD_REGISTRY[prefix]) {
        const validFields = FIELD_REGISTRY[prefix];
        if (!validFields.includes(field)) {
          warnings.push(`Field "${field}" is not in the known field registry for "${prefix}"`);
        }
      }
    }

    this.validated = true;
    return { valid: warnings.length === 0, warnings };
  }

  // ---------------------------------------------------------------------------
  // BUILD
  // ---------------------------------------------------------------------------

  /**
   * Compile the GAQL query string.
   * Automatically validates fields and logs warnings.
   */
  build(): string {
    if (!this.validated) {
      const { warnings } = this.validate();
      for (const w of warnings) {
        getModuleLogger('gaql-builder').warn(${w}`);
      }
    }

    const parts: string[] = [];

    // SELECT
    const uniqueFields = [...new Set(this.query.select)];
    if (uniqueFields.length === 0) {
      throw new Error("GAQL query must have at least one field in SELECT clause");
    }
    parts.push(`SELECT ${uniqueFields.join(", ")}`);

    // FROM
    parts.push(`FROM ${this.query.from}`);

    // WHERE
    const conditions = this.buildConditions();
    if (conditions.length > 0) {
      parts.push(`WHERE ${conditions.join(" AND ")}`);
    }

    // ORDER BY
    if (this.query.orderBy && this.query.orderBy.length > 0) {
      const orderClauses = this.query.orderBy.map(
        (o) => `${o.field} ${o.direction}`
      );
      parts.push(`ORDER BY ${orderClauses.join(", ")}`);
    }

    // LIMIT
    if (this.query.limit !== undefined) {
      parts.push(`LIMIT ${this.query.limit}`);
    }

    // PARAMETERS
    if (this.query.parameters && this.query.parameters.length > 0) {
      const paramStr = this.query.parameters
        .map((p) => `${p.key}=${p.value}`)
        .join(", ");
      parts.push(`PARAMETERS (${paramStr})`);
    }

    return parts.join("\n");
  }

  private buildConditions(): string[] {
    if (!this.query.where || this.query.where.length === 0) return [];

    return this.query.where.map((c) => {
      if (c.raw) return c.raw;

      const valueStr = this.formatValue(c.value);

      if (c.operator === "DURING" || c.operator === "BETWEEN") {
        return `${c.field} ${c.operator} ${valueStr}`;
      }

      if (c.operator === "IS NULL" || c.operator === "IS NOT NULL") {
        return `${c.field} ${c.operator}`;
      }

      if (c.operator === "IN" || c.operator === "NOT IN") {
        if (Array.isArray(c.value)) {
          const values = c.value.map((v) => this.formatValue(v)).join(", ");
          return `${c.field} ${c.operator} (${values})`;
        }
        return `${c.field} ${c.operator} (${valueStr})`;
      }

      return `${c.field} ${c.operator} ${valueStr}`;
    });
  }

  private formatValue(value: GAQLCondition["value"]): string {
    if (value === undefined || value === null) return "";
    if (typeof value === "string") {
      if (value.includes("'")) {
        return `"${value}"`;
      }
      return `'${value}'`;
    }
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
  }

  /** Reset the builder to an empty state */
  reset(): this {
    this.query = { select: [], from: "campaign" };
    this.validated = false;
    return this;
  }

  /** Get the current query state (for inspection/debugging) */
  getState(): Readonly<GAQLQuery> {
    return Object.freeze({ ...this.query });
  }
}

// ---------------------------------------------------------------------------
// Preset query factories
// ---------------------------------------------------------------------------

/**
 * Pre-built GAQL query presets for common operations.
 */
export const GAQLPresets = {
  /** List campaigns with basic fields */
  listCampaigns(params: {
    statuses?: string[];
    dateRange?: DateRange | string;
    limit?: number;
    includeMetrics?: boolean;
  } = {}): string {
    const builder = GAQLBuilder.create()
      .selectCampaign(
        "campaign.resource_name",
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "campaign.serving_status",
        "campaign.advertising_channel_type",
        "campaign.advertising_channel_sub_type",
        "campaign.start_date",
        "campaign.end_date",
        "campaign.campaign_budget",
        "campaign.bidding_strategy_type",
        "campaign.labels",
        "campaign.optimization_score"
      )
      .from("campaign");

    if (params.statuses && params.statuses.length > 0) {
      if (params.statuses.length === 1) {
        builder.whereCampaignStatus(params.statuses[0]);
      } else {
        builder.where("campaign.status", "IN", params.statuses);
      }
    }

    if (params.dateRange) {
      builder.during(params.dateRange);
    }

    if (params.includeMetrics) {
      builder.selectMetrics(
        "metrics.impressions",
        "metrics.clicks",
        "metrics.cost_micros",
        "metrics.conversions",
        "metrics.conversions_value",
        "metrics.ctr",
        "metrics.average_cpc",
        "metrics.cost_per_conversion"
      );
    }

    if (params.limit) {
      builder.limit(params.limit);
    }

    return builder.build();
  },

  /** Get campaign with full metrics */
  getCampaignWithMetrics(campaignId: string, dateRange?: DateRange | string): string {
    const builder = GAQLBuilder.create()
      .selectCampaign("*")
      .selectMetrics("*")
      .from("campaign")
      .whereCampaignId(campaignId);

    if (dateRange) {
      builder.during(dateRange);
    }

    return builder.build();
  },

  /** List ad groups for a campaign */
  listAdGroups(campaignId: string, status?: string): string {
    const builder = GAQLBuilder.create()
      .selectAdGroup("*")
      .from("ad_group")
      .whereCampaignId(campaignId);

    if (status) {
      builder.whereAdGroupStatus(status);
    }

    return builder.build();
  },

  /** List ads for an ad group */
  listAds(adGroupId: string, status?: string): string {
    const builder = GAQLBuilder.create()
      .selectAd("*")
      .from("ad_group_ad")
      .whereAdGroupId(adGroupId);

    if (status) {
      builder.whereAdStatus(status);
    }

    return builder.build();
  },

  /** Campaign performance report with metrics and segments */
  campaignPerformanceReport(params: {
    campaignId?: string;
    dateRange: DateRange | string;
    segments?: Array<"date" | "device" | "ad_network_type">;
    limit?: number;
  }): string {
    const builder = GAQLBuilder.create()
      .selectCampaign(
        "campaign.id",
        "campaign.name",
        "campaign.status",
        "campaign.advertising_channel_type"
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
        "metrics.value_per_conversion",
        "metrics.search_impression_share",
        "metrics.search_top_impression_share",
        "metrics.search_absolute_top_impression_share"
      )
      .from("campaign")
      .during(params.dateRange);

    if (params.campaignId) {
      builder.whereCampaignId(params.campaignId);
    }

    if (params.segments) {
      for (const seg of params.segments) {
        builder.selectSegments(`segments.${seg}` as GAQLSegmentsField);
      }
    }

    if (params.limit) {
      builder.limit(params.limit);
    }

    return builder.build();
  },

  /** Account summary query */
  accountSummary(dateRange: DateRange | string): string {
    return GAQLBuilder.create()
      .select(
        "customer.id",
        "customer.descriptive_name",
        "customer.currency_code",
        "customer.status"
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
      .selectSegments("segments.date")
      .from("customer")
      .during(dateRange)
      .build();
  },

  /** Conversion actions query */
  listConversionActions(status?: string): string {
    const builder = GAQLBuilder.create()
      .select(
        "conversion_action.resource_name",
        "conversion_action.id",
        "conversion_action.name",
        "conversion_action.status",
        "conversion_action.type",
        "conversion_action.category",
        "conversion_action.include_in_conversions_metric",
        "conversion_action.click_through_lookback_window_days",
        "conversion_action.view_through_lookback_window_days",
        "conversion_action.value_settings.default_value",
        "conversion_action.value_settings.default_currency_code",
        "conversion_action.value_settings.always_use_default_value"
      )
      .from("conversion_action");

    if (status) {
      builder.where("conversion_action.status", "=", status);
    }

    return builder.build();
  },
};
