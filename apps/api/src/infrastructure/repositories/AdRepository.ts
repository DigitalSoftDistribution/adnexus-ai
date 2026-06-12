import type { IAdRepository, AdFilters, AdListResult } from '../../domain/repositories/IAdRepository';
import type { Ad, AdPerformance, AdCreativePerformance } from '../../domain/entities/Ad';
import { db } from '../../db';
import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { ads, adsets, campaigns, ad_accounts } from '../../db/schema';

export class AdRepository implements IAdRepository {
  async findById(id: string): Promise<Ad | null> {
    const row = await db.query.ads.findFirst({
      where: eq(ads.id, id),
      with: {
        adset: {
          with: {
            campaign: {
              with: {
                adAccount: true,
              },
            },
          },
        },
      },
    });

    if (!row) return null;
    return this.mapToAd(row);
  }

  async findByIdAndWorkspace(id: string, workspaceId: string): Promise<Ad | null> {
    const row = await db.query.ads.findFirst({
      where: eq(ads.id, id),
      with: {
        adset: {
          with: {
            campaign: {
              with: {
                adAccount: true,
              },
            },
          },
        },
      },
    });

    if (!row) return null;
    const ad = row as any;
    if (ad.adset?.campaign?.adAccount?.workspaceId !== workspaceId) return null;
    return this.mapToAd(row);
  }

  async list(filters: AdFilters): Promise<AdListResult> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const offset = (page - 1) * limit;

    // Build query with pagination

    // We need to join through adsets -> campaigns -> adAccounts to filter by workspace
    // For now, use a simpler approach with the relational query builder
    const whereConditions = [];

    if (filters.status) {
      whereConditions.push(eq(ads.status, filters.status as any));
    }

    if (filters.search) {
      whereConditions.push(ilike(ads.name, `%${filters.search}%`));
    }

    // Get all ads with their relations
    // Use raw query with joins for proper filtering
    const rows = await db.select({
      ad: ads,
      adset: adsets,
      campaign: campaigns,
      adAccount: ad_accounts,
    })
    .from(ads)
    .leftJoin(adsets, eq(ads.adset_id, adsets.id))
    .leftJoin(campaigns, eq(adsets.campaign_id, campaigns.id))
    .leftJoin(ad_accounts, eq(campaigns.ad_account_id, ad_accounts.id))
    .where(
      and(
        eq(ad_accounts.workspaceId, filters.workspaceId),
        filters.status ? eq(ads.status, filters.status as any) : undefined,
        filters.search ? ilike(ads.name, `%${filters.search}%`) : undefined,
        filters.campaignId ? eq(campaigns.id, filters.campaignId) : undefined,
        filters.adsetId ? eq(adsets.id, filters.adsetId) : undefined,
        filters.platform ? eq(campaigns.platform, filters.platform as any) : undefined,
      )
    )
    .orderBy(desc(ads.created_at))
    .limit(limit + 1)
    .offset(offset);

    const paginatedRows = rows.slice(0, limit);

    // Count total
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(ads)
      .leftJoin(adsets, eq(ads.adset_id, adsets.id))
      .leftJoin(campaigns, eq(adsets.campaign_id, campaigns.id))
      .leftJoin(ad_accounts, eq(campaigns.ad_account_id, ad_accounts.id))
      .where(
        and(
          eq(ad_accounts.workspaceId, filters.workspaceId),
          filters.status ? eq(ads.status, filters.status as any) : undefined,
          filters.search ? ilike(ads.name, `%${filters.search}%`) : undefined,
          filters.campaignId ? eq(campaigns.id, filters.campaignId) : undefined,
          filters.adsetId ? eq(adsets.id, filters.adsetId) : undefined,
          filters.platform ? eq(campaigns.platform, filters.platform as any) : undefined,
        )
      );

    const total = Number(countResult[0]?.count ?? 0);

    return {
      ads: paginatedRows.map((row: any) => this.mapToAd(row)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPerformance(adId: string, dateFrom: string, dateTo: string): Promise<AdPerformance> {
    const row = await this.findById(adId);
    if (!row) {
      throw new Error('Ad not found');
    }

    return {
      adId: row.id,
      adName: row.name,
      dateFrom,
      dateTo,
      spend: row.spend || 0,
      impressions: row.impressions || 0,
      clicks: row.clicks || 0,
      ctr: row.ctr || 0,
      conversions: row.conversions || 0,
      cpa: row.cpa || 0,
      roas: row.roas || 0,
      frequency: row.frequency || 0,
      cpm: row.cpm || 0,
      cpc: row.cpc || 0,
    };
  }

  async getCreativePerformance(adId: string): Promise<AdCreativePerformance> {
    const row = await this.findById(adId);
    if (!row) {
      throw new Error('Ad not found');
    }

    const impressions = row.impressions || 0;
    const clicks = row.clicks || 0;
    const conversions = row.conversions || 0;
    const frequency = row.frequency || 0;
    const fatigueScore = row.fatigueScore || 0;
    const fatigueStatus = row.fatigueStatus || 'healthy';

    const baseCtr = impressions > 0 ? clicks / impressions : 0;
    const baseConversionRate = clicks > 0 ? conversions / clicks : 0;

    return {
      adId: row.id,
      adName: row.name,
      creativeType: row.creativeType,
      creativeUrl: row.creativeUrl,
      fatigue: {
        score: Number(fatigueScore.toFixed(2)),
        status: fatigueStatus,
        frequency,
        riskLevel:
          fatigueStatus === 'exhausted'
            ? 'critical'
            : fatigueStatus === 'critical'
              ? 'high'
              : fatigueStatus === 'warning'
                ? 'medium'
                : 'low',
        recommendation:
          fatigueStatus === 'healthy'
            ? 'Creative is performing well. Continue monitoring.'
            : fatigueStatus === 'warning'
              ? 'Creative showing early fatigue signs. Consider refreshing soon.'
              : fatigueStatus === 'critical'
                ? 'Creative significantly fatigued. Refresh recommended within 48 hours.'
                : 'Creative exhausted. Immediate refresh required for optimal performance.',
        estimatedDaysToFatigue:
          fatigueStatus === 'healthy'
            ? Math.round(14 - frequency * 2)
            : fatigueStatus === 'warning'
              ? Math.round(7 - frequency)
              : fatigueStatus === 'critical'
                ? 3
                : 0,
      },
      ctrTrend: {
        current: Number((baseCtr * 100).toFixed(2)),
        direction: frequency > 3 ? 'declining' : frequency > 2 ? 'stable' : 'improving',
        estimatedNextWeek: Number((baseCtr * 100 * (frequency > 3 ? 0.85 : frequency > 2 ? 0.95 : 1.05)).toFixed(2)),
      },
      conversionTrend: {
        current: Number((baseConversionRate * 100).toFixed(2)),
        direction: fatigueStatus === 'critical' ? 'declining' : fatigueStatus === 'warning' ? 'stable' : 'improving',
        estimatedNextWeek: Number(
          (baseConversionRate * 100 * (fatigueStatus === 'critical' ? 0.8 : fatigueStatus === 'warning' ? 0.95 : 1.02)).toFixed(2),
        ),
      },
      overallHealthScore: Math.max(0, Math.min(100, Math.round(100 - fatigueScore * 10))),
    };
  }

  private mapToAd(row: any): Ad {
    const ad = row.ad || row;
    const adset = row.adset || {};
    const campaign = row.campaign || {};
    const adAccount = row.adAccount || {};

    return {
      id: ad.id,
      workspaceId: adAccount.workspaceId || '',
      campaignId: campaign.id || ad.campaign_id || '',
      adsetId: adset.id || ad.adset_id || '',
      platformAdId: ad.platformAdId || null,
      name: ad.name || '',
      status: ad.status || 'draft',
      creativeType: ad.creative_type || null,
      creativeUrl: ad.creative_url || null,
      creativeText: ad.creative_text || null,
      headline: ad.headline || null,
      body: ad.body || null,
      callToAction: ad.call_to_action || null,
      landingPageUrl: ad.landing_page_url || null,
      spend: Number(ad.spend ?? 0),
      impressions: Number(ad.impressions ?? 0),
      clicks: Number(ad.clicks ?? 0),
      ctr: ad.ctr != null ? Number(ad.ctr) : null,
      conversions: Number(ad.conversions ?? 0),
      cpa: ad.cpa != null ? Number(ad.cpa) : null,
      roas: ad.roas != null ? Number(ad.roas) : null,
      frequency: ad.frequency != null ? Number(ad.frequency) : null,
      cpm: ad.cpm != null ? Number(ad.cpm) : null,
      cpc: ad.cpc != null ? Number(ad.cpc) : null,
      fatigueScore: ad.fatigue_score != null ? Number(ad.fatigue_score) : null,
      fatigueStatus: ad.fatigue_status || 'healthy',
      platformData: ad.platform_data || null,
      createdAt: ad.created_at ? new Date(ad.created_at) : new Date(),
      updatedAt: ad.updated_at ? new Date(ad.updated_at) : new Date(),
    };
  }

  async update(id: string, updates: Partial<Ad>): Promise<Ad | null> {
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.creativeType !== undefined) data.creative_type = updates.creativeType;
    if (updates.creativeUrl !== undefined) data.creative_url = updates.creativeUrl;
    if (updates.creativeText !== undefined) data.creative_text = updates.creativeText;
    if (updates.headline !== undefined) data.headline = updates.headline;
    if (updates.body !== undefined) data.body = updates.body;
    if (updates.callToAction !== undefined) data.call_to_action = updates.callToAction;
    if (updates.landingPageUrl !== undefined) data.landing_page_url = updates.landingPageUrl;
    data.updated_at = new Date();

    if (Object.keys(data).length <= 1) return this.findById(id);

    const [updated] = await db.update(ads).set(data as any).where(eq(ads.id, id)).returning();
    if (!updated) return null;
    return this.findById(id);
  }
}
