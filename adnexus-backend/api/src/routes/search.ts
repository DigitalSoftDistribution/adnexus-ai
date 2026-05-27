import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../lib/errors';
import {
  searchCampaigns,
  searchAdsets,
  searchAds,
  searchDrafts,
  searchAuditLog,
  globalSearch,
  getAutocompleteSuggestions,
  saveRecentSearch,
  getRecentSearches,
} from '../services/search-service';
import type { SearchOptions } from '../services/search-service';

const router = Router();

// ─── Validation helpers ──────────────────────────────────────

function parseNumberParam(value: string | undefined, min?: number): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = parseFloat(value);
  if (Number.isNaN(n)) return undefined;
  if (min !== undefined && n < min) return min;
  return n;
}

function buildSearchOptions(reqQuery: Record<string, unknown>): SearchOptions {
  return {
    platform: (reqQuery.platform as string) || undefined,
    status: (reqQuery.status as string) || undefined,
    dateFrom: (reqQuery.date_from as string) || undefined,
    dateTo: (reqQuery.date_to as string) || undefined,
    minSpend: parseNumberParam(reqQuery.min_spend as string | undefined, 0),
    maxSpend: parseNumberParam(reqQuery.max_spend as string | undefined, 0),
    minRoas: parseNumberParam(reqQuery.min_roas as string | undefined, 0),
    campaignId: (reqQuery.campaign_id as string) || undefined,
    adsetId: (reqQuery.adset_id as string) || undefined,
    creativeType: (reqQuery.creative_type as string) || undefined,
    draftType: (reqQuery.draft_type as string) || undefined,
    actorType: (reqQuery.actor_type as string) || undefined,
    actionCategory: (reqQuery.action_category as string) || undefined,
    limit: parseInt((reqQuery.limit as string) || '20', 10),
    offset: parseInt((reqQuery.offset as string) || '0', 10),
    sort: (reqQuery.sort as 'relevance' | 'spend' | 'roas' | 'created_at') || 'relevance',
  };
}

// ─── GET /api/v1/search — Global search across all entities ──

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    if (!q.trim()) throw new ValidationError('Search query is required');

    const options = buildSearchOptions(req.query as Record<string, unknown>);
    const result = await globalSearch(workspaceId, q, options);

    // Optionally save this search to recent searches (best-effort, don't await)
    if (req.user?.sub) {
      saveRecentSearch(workspaceId, req.user.sub, q).catch(() => {
        // Silently ignore Redis errors
      });
    }

    res.json({
      success: true,
      results: {
        campaigns: result.campaigns,
        adsets: result.adsets,
        ads: result.ads,
        drafts: result.drafts,
      },
      total: result.total,
      query: q,
    });
  }),
);

// ─── GET /api/v1/search/campaigns ────────────────────────────

router.get(
  '/campaigns',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    const options = buildSearchOptions(req.query as Record<string, unknown>);

    const result = await searchCampaigns(workspaceId, q, options);

    res.json({
      success: true,
      campaigns: result.items,
      total: result.total,
    });
  }),
);

// ─── GET /api/v1/search/adsets ───────────────────────────────

router.get(
  '/adsets',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    const options = buildSearchOptions(req.query as Record<string, unknown>);

    const result = await searchAdsets(workspaceId, q, options);

    res.json({
      success: true,
      adsets: result.items,
      total: result.total,
    });
  }),
);

// ─── GET /api/v1/search/ads ──────────────────────────────────

router.get(
  '/ads',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    const options = buildSearchOptions(req.query as Record<string, unknown>);

    const result = await searchAds(workspaceId, q, options);

    res.json({
      success: true,
      ads: result.items,
      total: result.total,
    });
  }),
);

// ─── GET /api/v1/search/drafts ───────────────────────────────

router.get(
  '/drafts',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    const options = buildSearchOptions(req.query as Record<string, unknown>);

    const result = await searchDrafts(workspaceId, q, options);

    res.json({
      success: true,
      drafts: result.items,
      total: result.total,
    });
  }),
);

// ─── GET /api/v1/search/audit — Audit log search ─────────────

router.get(
  '/audit',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    const options = buildSearchOptions(req.query as Record<string, unknown>);

    const result = await searchAuditLog(workspaceId, q, options);

    res.json({
      success: true,
      entries: result.items,
      total: result.total,
    });
  }),
);

// ─── GET /api/v1/search/suggestions — Autocomplete ───────────

router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const q = (req.query.q as string) || '';
    if (!q.trim()) {
      res.json({ success: true, suggestions: [] });
      return;
    }

    const limit = parseInt((req.query.limit as string) || '10', 10);
    const suggestions = await getAutocompleteSuggestions(workspaceId, q, limit);

    res.json({
      success: true,
      suggestions,
    });
  }),
);

// ─── GET /api/v1/search/recent — Recent searches ─────────────

router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user!.sub;
    const limit = parseInt((req.query.limit as string) || '10', 10);

    const searches = await getRecentSearches(workspaceId, userId, limit);

    res.json({
      success: true,
      searches,
    });
  }),
);

// ─── POST /api/v1/search/recent — Save a recent search ───────

router.post(
  '/recent',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const userId = req.user!.sub;

    const schema = z.object({
      query: z.string().min(1).max(200),
    });

    const body = schema.parse(req.body);
    await saveRecentSearch(workspaceId, userId, body.query);

    res.json({
      success: true,
      message: 'Search saved',
    });
  }),
);

export default router;
