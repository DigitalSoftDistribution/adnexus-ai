import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/errorHandler';
import type { Platform } from '../types';

const router = Router();

// =============================================================================
// Audience Types
// =============================================================================

export type AudienceType = 'custom' | 'retargeting' | 'interest' | 'lookalike' | 'demographic' | 'similar' | 'behavioral';
export type AudienceStatus = 'active' | 'paused' | 'archived';

/** Core audience segment derived from campaign/ad-set targeting JSONB */
export interface Audience {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  type: AudienceType;
  platform: Platform;
  status: AudienceStatus;
  estimated_reach: number;
  targeting: Record<string, unknown>;
  source_campaign_id?: string;
  source_campaign_name?: string;
  source_adset_id?: string;
  platform_audience_id?: string;
  campaigns_count: number;
  performance?: AudiencePerformance;
  created_at: string;
  updated_at: string;
}

/** Audience performance summary — mirrors key ad metrics */
export interface AudiencePerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;          // click-through rate (decimal, e.g. 0.0234)
  cpa: number;          // cost per acquisition
  roas: number;         // return on ad spend
  cpc: number;          // cost per click
  cpm: number;          // cost per 1000 impressions
  reach: number;
  frequency: number;
  trend: TrendPoint[];  // daily trend data
}

/** Single data point for performance trend lines */
export interface TrendPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
}

/** Audience overlap between two segments */
export interface AudienceOverlap {
  audience_a_id: string;
  audience_b_id: string;
  overlap_pct: number;   // 0-100  percentage of shared users
  overlap_size: number;  // estimated shared reach
  unique_a: number;
  unique_b: number;
}

/** AI-suggested audience payload */
export interface AudienceSuggestion {
  name: string;
  type: AudienceType;
  estimatedReach: number;
  platform: Platform;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
  targeting_hint: Record<string, unknown>;
}

// =============================================================================
// Helper: Extract audience records from campaign/ad-set targeting JSONB
// =============================================================================

interface TargetingRow {
  id: string;
  workspace_id: string;
  name: string;
  platform: Platform;
  status: string;
  targeting: Record<string, unknown> | null;
  ad_account_id?: string;
  campaign_id?: string;
  created_at: string;
  updated_at?: string;
  ad_accounts?: { workspace_id: string } | null;
}

/**
 * Build a deterministic audience ID from a parent record.
 * This lets us treat targeting specs as first-class audience entities.
 */
function buildAudienceId(parentId: string, targetingHash: string): string {
  return `aud_${parentId.slice(0, 8)}_${targetingHash.slice(0, 8)}`;
}

/**
 * Detect the audience type from a targeting JSONB payload.
 */
function detectAudienceType(targeting: Record<string, unknown>): AudienceType {
  if (targeting.custom_audiences) return 'custom';
  if (targeting.retargeting === true || targeting.pixel_audiences) return 'retargeting';
  if (targeting.lookalike || targeting.lookalike_source) return 'lookalike';
  if (targeting.interests && Array.isArray(targeting.interests) && targeting.interests.length > 0) return 'interest';
  if (targeting.similar_audiences || targeting.actalike) return 'similar';
  if (targeting.behaviors || targeting.behavioral) return 'behavioral';
  if (targeting.age || targeting.genders || targeting.geo_locations) return 'demographic';
  return 'custom';
}

/** Simple stable hash for targeting objects */
function hashTargeting(t: Record<string, unknown>): string {
  const str = JSON.stringify(t, Object.keys(t).sort());
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

/**
 * Convert a campaign or ad-set row into one or more Audience records.
 * Each distinct targeting spec inside `targeting` becomes its own audience.
 */
function rowsToAudiences(
  rows: TargetingRow[],
  source: 'campaign' | 'adset',
): Audience[] {
  const audiences: Audience[] = [];

  for (const row of rows) {
    if (!row.targeting || Object.keys(row.targeting).length === 0) continue;

    const t = row.targeting;
    const tHash = hashTargeting(t);
    const audienceId = buildAudienceId(row.id, tHash);
    const type = detectAudienceType(t);
    const estimatedReach = estimateReach(t);

    // Build audience name from targeting components or fall back to parent name
    let name = (t.audience_name as string) || (t.name as string);
    if (!name) {
      name = buildAudienceName(t, row.name);
    }

    audiences.push({
      id: audienceId,
      workspace_id: row.workspace_id || row.ad_accounts?.workspace_id || '',
      name,
      description: (t.description as string) || undefined,
      type,
      platform: row.platform,
      status: normalizeStatus(row.status),
      estimated_reach: estimatedReach,
      targeting: t,
      source_campaign_id: source === 'campaign' ? row.id : row.campaign_id,
      source_adset_id: source === 'adset' ? row.id : undefined,
      source_campaign_name: row.name,
      platform_audience_id: (t.platform_audience_id as string) || (t.id as string),
      campaigns_count: 1,
      created_at: row.created_at,
      updated_at: row.updated_at || row.created_at,
    });
  }

  return audiences;
}

/**
 * Normalize raw status string to AudienceStatus.
 */
function normalizeStatus(status: string): AudienceStatus {
  if (status === 'active' || status === 'paused') return status as AudienceStatus;
  if (status === 'ended' || status === 'archived') return 'archived';
  return 'active';
}

/**
 * Build a human-readable audience name from targeting spec + parent name.
 */
function buildAudienceName(targeting: Record<string, unknown>, parentName: string): string {
  const parts: string[] = [];

  if (targeting.age_min && targeting.age_max) {
    parts.push(`Age ${targeting.age_min}-${targeting.age_max}`);
  }
  if (targeting.genders) {
    const g = targeting.genders as Array<string | number>;
    if (g.length === 1 && g[0] === 1) parts.push('Men');
    else if (g.length === 1 && g[0] === 2) parts.push('Women');
  }
  if (targeting.geo_locations) {
    const geo = targeting.geo_locations as Record<string, unknown>;
    const countries = (geo.countries as string[]) ?? [];
    if (countries.length > 0) parts.push(countries.join(', '));
    const regions = (geo.regions as Array<{ name: string }>) ?? [];
    if (regions.length > 0) parts.push(regions.map((r) => r.name).join(', '));
  }
  if (targeting.interests && Array.isArray(targeting.interests)) {
    const ints = targeting.interests as Array<{ name?: string }>;
    if (ints.length > 0) parts.push(ints.map((i) => i.name).filter(Boolean).slice(0, 3).join(', '));
  }

  if (parts.length === 0) {
    return parentName;
  }

  return parts.join(' · ');
}

/**
 * Rough heuristic for estimated reach from targeting spec.
 * In production this would come from platform APIs.
 */
function estimateReach(targeting: Record<string, unknown>): number {
  if (targeting.estimated_reach) return targeting.estimated_reach as number;
  if (targeting.audience_size) return targeting.audience_size as number;

  // Rough heuristics
  let base = 1_000_000;

  const geo = targeting.geo_locations as Record<string, unknown> | undefined;
  if (geo) {
    const countries = (geo.countries as string[])?.length ?? 0;
    if (countries === 1) base = 500_000;
    if (countries > 1) base = 2_000_000;
    const cities = (geo.cities as unknown[])?.length ?? 0;
    if (cities > 0) base = Math.min(base, cities * 150_000);
  }

  if (targeting.age_min && targeting.age_max) {
    const ageSpan = (targeting.age_max as number) - (targeting.age_min as number);
    base = base * (ageSpan / 65);
  }

  if (targeting.interests && Array.isArray(targeting.interests)) {
    base = base * Math.min(1, 0.3 + (targeting.interests as unknown[]).length * 0.1);
  }

  if (targeting.custom_audiences) {
    // Custom audiences are typically much smaller
    base = Math.min(base, 100_000);
  }

  if (targeting.lookalike) {
    base = Math.min(base, 2_000_000);
  }

  return Math.round(base);
}

// =============================================================================
// Validation Schemas
// =============================================================================

const listQuerySchema = z.object({
  platform: z.enum(['meta', 'google', 'tiktok', 'snap']).optional(),
  type: z.enum(['custom', 'retargeting', 'interest', 'lookalike', 'demographic', 'similar', 'behavioral']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const overlapQuerySchema = z.object({
  audienceIds: z.union([
    z.string().transform((s) => s.split(',')),
    z.array(z.string()),
  ]).pipe(z.array(z.string().min(1)).min(2).max(10)),
});

// =============================================================================
// Service: Fetch aggregated audience performance
// =============================================================================

/**
 * Aggregate performance metrics for audiences from campaign_metrics.
 * Links via campaign_id → source_campaign_id on the audience.
 */
async function getAudiencePerformance(
  campaignIds: string[],
  dateStart?: string,
  dateEnd?: string,
): Promise<Map<string, AudiencePerformance>> {
  if (campaignIds.length === 0) return new Map();

  const start = dateStart ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const end = dateEnd ?? new Date().toISOString().slice(0, 10);

  // Pull metrics for all linked campaigns
  const { data: metricsRows, error } = await supabase
    .from('campaign_metrics')
    .select('campaign_id, date, impressions, clicks, conversions, spend, reach, frequency, ctr, cpc, cpm, cpa, roas')
    .in('campaign_id', campaignIds)
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });

  if (error || !metricsRows) return new Map();

  // Group metrics by campaign_id
  const byCampaign = new Map<string, typeof metricsRows>();
  for (const row of metricsRows) {
    const arr = byCampaign.get(row.campaign_id) ?? [];
    arr.push(row);
    byCampaign.set(row.campaign_id, arr);
  }

  const result = new Map<string, AudiencePerformance>();

  for (const [campaignId, rows] of byCampaign) {
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let spend = 0;
    let reach = 0;
    let frequencySum = 0;
    let roasSum = 0;
    const trend: TrendPoint[] = [];

    for (const r of rows) {
      impressions += r.impressions ?? 0;
      clicks += r.clicks ?? 0;
      conversions += r.conversions ?? 0;
      spend += r.spend ?? 0;
      reach += r.reach ?? 0;
      frequencySum += r.frequency ?? 0;
      roasSum += r.roas ?? 0;

      trend.push({
        date: r.date,
        impressions: r.impressions ?? 0,
        clicks: r.clicks ?? 0,
        conversions: r.conversions ?? 0,
        spend: r.spend ?? 0,
        ctr: r.ctr ?? 0,
      });
    }

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roasAvg = rows.length > 0 ? roasSum / rows.length : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

    result.set(campaignId, {
      impressions,
      clicks,
      conversions,
      spend: Math.round(spend * 100) / 100,
      ctr: Math.round(ctr * 10000) / 10000,
      cpa: Math.round(cpa * 100) / 100,
      roas: Math.round(roasAvg * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      cpm: Math.round(cpm * 100) / 100,
      reach,
      frequency: rows.length > 0 ? Math.round((frequencySum / rows.length) * 100) / 100 : 0,
      trend,
    });
  }

  return result;
}

// =============================================================================
// Route Handlers
// =============================================================================

// ─── GET /audiences ────────────────────────────────────────────
// List audiences with optional filtering and pagination

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const parsed = listQuerySchema.parse(req.query);
    const { platform, type, page, limit } = parsed;
    const offset = (page - 1) * limit;

    // ── 1. Fetch campaigns with targeting data ─────────────────
    let campaignQuery = supabase
      .from('campaigns')
      .select('id, workspace_id, name, platform, status, targeting, ad_account_id, created_at, updated_at, ad_accounts!inner(workspace_id)')
      .eq('workspace_id', workspaceId)
      .not('targeting', 'is', null)
      .order('created_at', { ascending: false });

    if (platform) {
      campaignQuery = campaignQuery.eq('platform', platform);
    }

    const { data: campaignRows, error: campaignError } = await campaignQuery;
    if (campaignError) throw new Error(`Failed to fetch campaign audiences: ${campaignError.message}`);

    // ── 2. Fetch ad-sets with targeting data ──────────────────
    let adsetQuery = supabase
      .from('ad_sets')
      .select('id, name, status, targeting, campaign_id, created_at, updated_at, campaigns!inner(workspace_id, platform, name)')
      .eq('campaigns.workspace_id', workspaceId)
      .not('targeting', 'is', null)
      .order('created_at', { ascending: false });

    if (platform) {
      adsetQuery = adsetQuery.eq('campaigns.platform', platform);
    }

    const { data: adsetRows, error: adsetError } = await adsetQuery;
    if (adsetError) throw new Error(`Failed to fetch ad-set audiences: ${adsetError.message}`);

    // ── 3. Transform rows into Audience records ────────────────
    const campaignTargeting: TargetingRow[] = (campaignRows ?? []).map((r) => ({
      id: r.id,
      workspace_id: r.workspace_id,
      name: r.name,
      platform: r.platform as Platform,
      status: r.status,
      targeting: (r.targeting ?? {}) as Record<string, unknown>,
      ad_account_id: r.ad_account_id,
      created_at: r.created_at,
      updated_at: r.updated_at,
      ad_accounts: r.ad_accounts as unknown as { workspace_id: string } | undefined,
    }));

    const adsetTargeting: TargetingRow[] = (adsetRows ?? []).map((r) => {
      const campaigns = r.campaigns as unknown as { workspace_id: string; platform: string; name: string } | null;
      return {
        id: r.id,
        workspace_id: campaigns?.workspace_id || '',
        name: r.name,
        platform: campaigns?.platform as Platform || 'meta',
        status: r.status,
        targeting: (r.targeting ?? {}) as Record<string, unknown>,
        campaign_id: r.campaign_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    let allAudiences: Audience[] = [
      ...rowsToAudiences(campaignTargeting, 'campaign'),
      ...rowsToAudiences(adsetTargeting, 'adset'),
    ];

    // ── 4. Apply type filter ──────────────────────────────────
    if (type) {
      allAudiences = allAudiences.filter((a) => a.type === type);
    }

    // ── 5. Deduplicate by targeting hash (same spec = same audience)
    const seen = new Set<string>();
    const deduped: Audience[] = [];
    for (const a of allAudiences) {
      const hash = hashTargeting(a.targeting);
      if (seen.has(hash)) {
        // Increment campaign count on existing record
        const existing = deduped.find((d) => hashTargeting(d.targeting) === hash);
        if (existing) existing.campaigns_count += 1;
        continue;
      }
      seen.add(hash);
      deduped.push(a);
    }
    allAudiences = deduped;

    // ── 6. Pagination ─────────────────────────────────────────
    const total = allAudiences.length;
    const pageData = allAudiences.slice(offset, offset + limit);

    res.json({
      success: true,
      data: pageData,
      total,
    });
  }),
);

// ─── GET /audiences/:id ────────────────────────────────────────
// Get a single audience with performance data

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const audienceId = req.params.id;

    // We need to find the audience by matching the ID prefix against
    // generated audience IDs.  Fetch everything and match.
    const { data: campaignRows } = await supabase
      .from('campaigns')
      .select('id, workspace_id, name, platform, status, targeting, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const { data: adsetRows } = await supabase
      .from('ad_sets')
      .select('id, name, status, targeting, campaign_id, created_at, updated_at, campaigns!inner(workspace_id, platform, name)')
      .eq('campaigns.workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const campaignTargeting: TargetingRow[] = (campaignRows ?? []).map((r) => ({
      id: r.id,
      workspace_id: r.workspace_id,
      name: r.name,
      platform: r.platform as Platform,
      status: r.status,
      targeting: (r.targeting ?? {}) as Record<string, unknown>,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    const adsetTargeting: TargetingRow[] = (adsetRows ?? []).map((r) => {
      const campaigns = r.campaigns as unknown as { workspace_id: string; platform: string; name: string } | null;
      return {
        id: r.id,
        workspace_id: campaigns?.workspace_id || '',
        name: r.name,
        platform: campaigns?.platform as Platform || 'meta',
        status: r.status,
        targeting: (r.targeting ?? {}) as Record<string, unknown>,
        campaign_id: r.campaign_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    const allAudiences: Audience[] = [
      ...rowsToAudiences(campaignTargeting, 'campaign'),
      ...rowsToAudiences(adsetTargeting, 'adset'),
    ];

    const audience = allAudiences.find((a) => a.id === audienceId);
    if (!audience) throw new NotFoundError('Audience');

    // Attach performance data
    const campaignIds = allAudiences
      .filter((a) => hashTargeting(a.targeting) === hashTargeting(audience.targeting))
      .map((a) => a.source_campaign_id)
      .filter((id): id is string => !!id);

    const uniqueCampaignIds = [...new Set(campaignIds)];
    const perfMap = await getAudiencePerformance(uniqueCampaignIds);

    // Aggregate performance across all linked campaigns
    let aggregated: AudiencePerformance | undefined;
    if (uniqueCampaignIds.length > 0) {
      const perfs: AudiencePerformance[] = [];
      for (const cid of uniqueCampaignIds) {
        const p = perfMap.get(cid);
        if (p) perfs.push(p);
      }

      if (perfs.length > 0) {
        const totalImpressions = perfs.reduce((s, p) => s + p.impressions, 0);
        const totalClicks = perfs.reduce((s, p) => s + p.clicks, 0);
        const totalConversions = perfs.reduce((s, p) => s + p.conversions, 0);
        const totalSpend = perfs.reduce((s, p) => s + p.spend, 0);
        const totalReach = perfs.reduce((s, p) => s + p.reach, 0);

        aggregated = {
          impressions: totalImpressions,
          clicks: totalClicks,
          conversions: totalConversions,
          spend: Math.round(totalSpend * 100) / 100,
          ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 10000 : 0,
          cpa: totalConversions > 0 ? Math.round((totalSpend / totalConversions) * 100) / 100 : 0,
          roas: totalSpend > 0 ? Math.round((totalConversions * 50) / totalSpend * 100) / 100 : 0, // rough proxy
          cpc: totalClicks > 0 ? Math.round((totalSpend / totalClicks) * 100) / 100 : 0,
          cpm: totalImpressions > 0 ? Math.round(((totalSpend / totalImpressions) * 1000) * 100) / 100 : 0,
          reach: totalReach,
          frequency: perfs.length > 0 ? Math.round((perfs.reduce((s, p) => s + p.frequency, 0) / perfs.length) * 100) / 100 : 0,
          trend: mergeTrends(perfs.map((p) => p.trend)),
        };
      }
    }

    res.json({
      success: true,
      data: {
        ...audience,
        performance: aggregated ?? null,
      },
    });
  }),
);

// ─── GET /audiences/:id/performance ────────────────────────────
// Audience performance metrics endpoint

router.get(
  '/:id/performance',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const audienceId = req.params.id;
    const dateStart = (req.query.date_start as string) || undefined;
    const dateEnd = (req.query.date_end as string) || undefined;

    // Find the audience to resolve linked campaigns
    const { data: campaignRows } = await supabase
      .from('campaigns')
      .select('id, workspace_id, name, platform, status, targeting, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const { data: adsetRows } = await supabase
      .from('ad_sets')
      .select('id, name, status, targeting, campaign_id, created_at, updated_at, campaigns!inner(workspace_id, platform, name)')
      .eq('campaigns.workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const campaignTargeting: TargetingRow[] = (campaignRows ?? []).map((r) => ({
      id: r.id,
      workspace_id: r.workspace_id,
      name: r.name,
      platform: r.platform as Platform,
      status: r.status,
      targeting: (r.targeting ?? {}) as Record<string, unknown>,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    const adsetTargeting: TargetingRow[] = (adsetRows ?? []).map((r) => {
      const campaigns = r.campaigns as unknown as { workspace_id: string; platform: string; name: string } | null;
      return {
        id: r.id,
        workspace_id: campaigns?.workspace_id || '',
        name: r.name,
        platform: campaigns?.platform as Platform || 'meta',
        status: r.status,
        targeting: (r.targeting ?? {}) as Record<string, unknown>,
        campaign_id: r.campaign_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    const allAudiences: Audience[] = [
      ...rowsToAudiences(campaignTargeting, 'campaign'),
      ...rowsToAudiences(adsetTargeting, 'adset'),
    ];

    const audience = allAudiences.find((a) => a.id === audienceId);
    if (!audience) throw new NotFoundError('Audience');

    const targetHash = hashTargeting(audience.targeting);
    const linkedCampaignIds = [
      ...new Set(
        allAudiences
          .filter((a) => hashTargeting(a.targeting) === targetHash)
          .map((a) => a.source_campaign_id)
          .filter((id): id is string => !!id),
      ),
    ];

    const perfMap = await getAudiencePerformance(linkedCampaignIds, dateStart, dateEnd);

    // Aggregate across campaigns
    let impressions = 0;
    let clicks = 0;
    let conversions = 0;
    let spend = 0;
    let reach = 0;
    let roasSum = 0;
    let roasCount = 0;
    const allTrends: TrendPoint[][] = [];

    for (const cid of linkedCampaignIds) {
      const p = perfMap.get(cid);
      if (!p) continue;
      impressions += p.impressions;
      clicks += p.clicks;
      conversions += p.conversions;
      spend += p.spend;
      reach += p.reach;
      roasSum += p.roas;
      roasCount++;
      allTrends.push(p.trend);
    }

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const roas = roasCount > 0 ? roasSum / roasCount : 0;
    const mergedTrend = mergeTrends(allTrends);

    res.json({
      success: true,
      data: {
        impressions,
        clicks,
        conversions,
        ctr: Math.round(ctr * 10000) / 10000,
        cpa: Math.round(cpa * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        trend: mergedTrend,
      },
    });
  }),
);

// ─── GET /audiences/overlap ────────────────────────────────────
// Audience overlap analysis between two or more audiences

router.get(
  '/overlap',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const parsed = overlapQuerySchema.parse(req.query);
    const ids = parsed.audienceIds;

    // Resolve audience IDs back to targeting specs
    const { data: campaignRows } = await supabase
      .from('campaigns')
      .select('id, workspace_id, name, platform, status, targeting, created_at, updated_at')
      .eq('workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const { data: adsetRows } = await supabase
      .from('ad_sets')
      .select('id, name, status, targeting, campaign_id, created_at, updated_at, campaigns!inner(workspace_id, platform, name)')
      .eq('campaigns.workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const campaignTargeting: TargetingRow[] = (campaignRows ?? []).map((r) => ({
      id: r.id,
      workspace_id: r.workspace_id,
      name: r.name,
      platform: r.platform as Platform,
      status: r.status,
      targeting: (r.targeting ?? {}) as Record<string, unknown>,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    const adsetTargeting: TargetingRow[] = (adsetRows ?? []).map((r) => {
      const campaigns = r.campaigns as unknown as { workspace_id: string; platform: string; name: string } | null;
      return {
        id: r.id,
        workspace_id: campaigns?.workspace_id || '',
        name: r.name,
        platform: campaigns?.platform as Platform || 'meta',
        status: r.status,
        targeting: (r.targeting ?? {}) as Record<string, unknown>,
        campaign_id: r.campaign_id,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    const allAudiences: Audience[] = [
      ...rowsToAudiences(campaignTargeting, 'campaign'),
      ...rowsToAudiences(adsetTargeting, 'adset'),
    ];

    const selectedAudiences = allAudiences.filter((a) => ids.includes(a.id));
    if (selectedAudiences.length < 2) {
      throw new ValidationError('At least two valid audience IDs are required for overlap analysis');
    }

    // Compute overlap matrix based on targeting spec similarity
    const matrix: AudienceOverlap[] = [];
    for (let i = 0; i < selectedAudiences.length; i++) {
      for (let j = i + 1; j < selectedAudiences.length; j++) {
        const a = selectedAudiences[i];
        const b = selectedAudiences[j];
        const overlap = computeOverlap(a, b);
        matrix.push({
          audience_a_id: a.id,
          audience_b_id: b.id,
          overlap_pct: overlap.pct,
          overlap_size: overlap.sharedSize,
          unique_a: overlap.uniqueA,
          unique_b: overlap.uniqueB,
        });
      }
    }

    // Summary stats
    const summary = {
      audiences_analyzed: selectedAudiences.length,
      total_pairs: matrix.length,
      avg_overlap_pct: matrix.length > 0
        ? Math.round((matrix.reduce((s, m) => s + m.overlap_pct, 0) / matrix.length) * 100) / 100
        : 0,
      max_overlap_pct: matrix.length > 0 ? Math.max(...matrix.map((m) => m.overlap_pct)) : 0,
    };

    res.json({
      success: true,
      data: {
        audiences: selectedAudiences.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          platform: a.platform,
          estimated_reach: a.estimated_reach,
        })),
        matrix,
        summary,
      },
    });
  }),
);

// ─── GET /audiences/suggestions ────────────────────────────────
// AI-suggested audiences based on workspace history and platform trends

router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;

    // Pull existing audience types used in this workspace
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('platform, targeting')
      .eq('workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const { data: adsets } = await supabase
      .from('ad_sets')
      .select('campaigns!inner(platform, targeting)')
      .eq('campaigns.workspace_id', workspaceId)
      .not('targeting', 'is', null);

    const usedPlatforms = new Set<Platform>();
    const usedTypes = new Set<AudienceType>();

    for (const c of campaigns ?? []) {
      usedPlatforms.add(c.platform as Platform);
      if (c.targeting) usedTypes.add(detectAudienceType(c.targeting as Record<string, unknown>));
    }
    for (const a of adsets ?? []) {
      const camp = a.campaigns as unknown as { platform: Platform; targeting: Record<string, unknown> | null } | null;
      if (camp?.platform) usedPlatforms.add(camp.platform);
      if (camp?.targeting) usedTypes.add(detectAudienceType(camp.targeting));
    }

    // Generate contextual suggestions based on what the workspace already uses
    const suggestions: AudienceSuggestion[] = [];

    const platforms = usedPlatforms.size > 0 ? [...usedPlatforms] : ['meta', 'google'] as Platform[];

    for (const platform of platforms) {
      if (!usedTypes.has('lookalike')) {
        suggestions.push({
          name: `Lookalike 1% — Top Customers (${platform})`,
          type: 'lookalike',
          estimatedReach: 2_000_000,
          platform,
          reason: 'Your workspace uses custom audiences but no lookalike expansion. A 1% lookalike of your best converters typically improves reach by 3-5x with similar CPA.',
          confidence: 'high',
          targeting_hint: { lookalike: true, lookalike_pct: 1, source: 'top_converters' },
        });
      }

      if (!usedTypes.has('retargeting')) {
        suggestions.push({
          name: 'Cart / Landing Page Abandoners — 30D',
          type: 'retargeting',
          estimatedReach: 85_000,
          platform,
          reason: 'No retargeting audience found. Website visitors who didn\'t convert within 30 days typically have 3-10x higher conversion rates than cold audiences.',
          confidence: 'high',
          targeting_hint: { retargeting: true, event: 'PageView', days: 30, exclude: 'Purchase' },
        });
      }

      if (!usedTypes.has('interest')) {
        suggestions.push({
          name: 'In-Market: E-commerce Shoppers',
          type: 'interest',
          estimatedReach: 12_000_000,
          platform,
          reason: 'Adding interest layering to demographic targeting can improve CTR by 20-40%. In-market audiences show active purchase intent signals.',
          confidence: 'medium',
          targeting_hint: { interests: [{ name: 'E-commerce', category: 'Shopping' }] },
        });
      }

      // Always suggest a broad expansion
      suggestions.push({
        name: `Broad Expansion — ${platform} Optimized`,
        type: 'similar',
        estimatedReach: 15_000_000,
        platform,
        reason: 'Platform algorithmic targeting (Advantage+ / Performance Max) often outperforms narrow manual targeting. Test a broad audience with conversion-optimized bidding.',
        confidence: 'medium',
        targeting_hint: { broad: true, algorithmic_optimization: true },
      });
    }

    // Deduplicate by name+platform
    const deduped = new Map<string, AudienceSuggestion>();
    for (const s of suggestions) {
      const key = `${s.platform}:${s.name}`;
      if (!deduped.has(key)) deduped.set(key, s);
    }

    res.json({
      success: true,
      data: [...deduped.values()],
    });
  }),
);

// =============================================================================
// Utilities: Overlap Computation & Trend Merging
// =============================================================================

interface OverlapResult {
  pct: number;
  sharedSize: number;
  uniqueA: number;
  uniqueB: number;
}

/**
 * Compute pseudo-overlap between two audiences based on targeting similarity.
 * Uses Jaccard-style overlap estimation from targeting attributes.
 */
function computeOverlap(a: Audience, b: Audience): OverlapResult {
  const tA = a.targeting;
  const tB = b.targeting;

  // Compare interests
  const interestsA = new Set(
    ((tA.interests as Array<{ name?: string }>) ?? []).map((i) => i.name).filter(Boolean),
  );
  const interestsB = new Set(
    ((tB.interests as Array<{ name?: string }>) ?? []).map((i) => i.name).filter(Boolean),
  );
  const sharedInterests = [...interestsA].filter((x) => interestsB.has(x));
  const totalInterests = new Set([...interestsA, ...interestsB]).size;
  const interestOverlap = totalInterests > 0 ? sharedInterests.length / totalInterests : 0;

  // Compare geo
  const geoA = (tA.geo_locations as Record<string, unknown>) ?? {};
  const geoB = (tB.geo_locations as Record<string, unknown>) ?? {};
  const countriesA = new Set((geoA.countries as string[]) ?? []);
  const countriesB = new Set((geoB.countries as string[]) ?? []);
  const sharedCountries = [...countriesA].filter((x) => countriesB.has(x));
  const totalCountries = new Set([...countriesA, ...countriesB]).size;
  const geoOverlap = totalCountries > 0 ? sharedCountries.length / totalCountries : 0;

  // Compare age/gender
  const ageMatch = tA.age_min === tB.age_min && tA.age_max === tB.age_max ? 1 : 0.5;
  const genderA = JSON.stringify(tA.genders ?? []);
  const genderB = JSON.stringify(tB.genders ?? []);
  const genderMatch = genderA === genderB ? 1 : 0.5;

  // Weighted composite
  const overlapScore = interestOverlap * 0.4 + geoOverlap * 0.3 + ageMatch * 0.15 + genderMatch * 0.15;
  const overlapPct = Math.round(overlapScore * 100 * 100) / 100;

  const sharedSize = Math.round(Math.min(a.estimated_reach, b.estimated_reach) * overlapScore);
  const uniqueA = a.estimated_reach - sharedSize;
  const uniqueB = b.estimated_reach - sharedSize;

  return {
    pct: Math.min(overlapPct, 100),
    sharedSize: Math.max(sharedSize, 0),
    uniqueA: Math.max(uniqueA, 0),
    uniqueB: Math.max(uniqueB, 0),
  };
}

/**
 * Merge multiple trend arrays into a single daily trend by summing metrics.
 */
function mergeTrends(trends: TrendPoint[][]): TrendPoint[] {
  const byDate = new Map<string, TrendPoint>();

  for (const trend of trends) {
    for (const point of trend) {
      const existing = byDate.get(point.date);
      if (existing) {
        existing.impressions += point.impressions;
        existing.clicks += point.clicks;
        existing.conversions += point.conversions;
        existing.spend += point.spend;
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
      } else {
        byDate.set(point.date, { ...point });
      }
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export default router;
