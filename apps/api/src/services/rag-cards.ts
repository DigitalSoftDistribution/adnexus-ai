import { createHash } from 'node:crypto';
import type {
  UnifiedCampaign,
  UnifiedAd,
  Draft,
  Platform,
} from '../types';

/**
 * Text-card renderers for the RAG layer.
 *
 * Retrieval quality is dominated by WHAT we embed, not by the vector store.
 * These deterministic templates flatten an ad-data row into a compact natural
 * language "card" that an embedding model can reason over. Each renderer also
 * returns the structured payload we store alongside the vector for filtering.
 */

export type RagEntityType =
  | 'campaign'
  | 'creative'
  | 'insight'
  | 'benchmark'
  | 'competitor_ad';

export interface RagCard {
  /** Deterministic point id (stable per entity so re-ingest upserts in place). */
  id: string;
  entityType: RagEntityType;
  /** The text we embed. */
  text: string;
  /** Structured payload stored in Qdrant (filterable + returned on search). */
  payload: Record<string, unknown>;
}

function money(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return 'n/a';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

function pct(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return 'n/a';
  return `${(n * 100).toFixed(2)}%`;
}

function num(n: number | undefined): string {
  if (n === undefined || n === null || Number.isNaN(n)) return 'n/a';
  return Math.round(n).toLocaleString('en-US');
}

/** SHA-1 hash of the embed text → content_hash for dedupe. */
export function contentHash(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

/** Stable, namespaced point id (deterministic UUID-ish string). */
function pointId(entityType: RagEntityType, key: string): string {
  return createHash('sha1').update(`${entityType}:${key}`).digest('hex');
}

const nowIso = (): string => new Date().toISOString();

// ─── Campaign card ───────────────────────────────────────────

export function renderCampaignCard(
  workspaceId: string,
  c: UnifiedCampaign,
): RagCard {
  const budget =
    c.budget_type === 'lifetime'
      ? `lifetime budget ${money(c.lifetime_budget)}`
      : `daily budget ${money(c.daily_budget)}`;

  const text = [
    `Campaign "${c.name}" on ${c.platform}.`,
    `Objective: ${c.objective ?? 'unspecified'}. Status: ${c.status}. ${budget}.`,
    `Performance: spend ${money(c.spend)}, ${num(c.impressions)} impressions, ${num(c.clicks)} clicks, CTR ${pct(c.ctr)}.`,
    `${num(c.conversions)} conversions at CPA ${money(c.cpa)}, ROAS ${c.roas?.toFixed(2) ?? 'n/a'}x.`,
    `CPM ${money(c.cpm)}, CPC ${money(c.cpc)}, frequency ${c.frequency?.toFixed(2) ?? 'n/a'}, reach ${num(c.reach)}.`,
  ].join(' ');

  return {
    id: pointId('campaign', `${workspaceId}:${c.id}`),
    entityType: 'campaign',
    text,
    payload: {
      workspace_id: workspaceId,
      entity_type: 'campaign',
      entity_id: c.id,
      platform: c.platform,
      campaign_name: c.name,
      objective: c.objective ?? null,
      status: c.status,
      spend: c.spend ?? 0,
      ctr: c.ctr ?? 0,
      roas: c.roas ?? 0,
      cpa: c.cpa ?? 0,
      conversions: c.conversions ?? 0,
      content: text,
      content_hash: contentHash(text),
      indexed_at: nowIso(),
      valid_from: c.created_at ?? nowIso(),
    },
  };
}

// ─── Creative (ad) card ──────────────────────────────────────

export function renderCreativeCard(workspaceId: string, a: UnifiedAd): RagCard {
  const text = [
    `Ad creative "${a.name}" (${a.creative_type ?? 'unknown type'}).`,
    a.creative_text ? `Copy: ${a.creative_text}.` : '',
    `Performance: ${num(a.impressions)} impressions, ${num(a.clicks)} clicks, CTR ${pct(a.ctr)}, ${num(a.conversions)} conversions, ROAS ${a.roas?.toFixed(2) ?? 'n/a'}x.`,
    `Fatigue: score ${a.fatigue_score?.toFixed(2) ?? 'n/a'} (${a.fatigue_status}), frequency ${a.frequency?.toFixed(2) ?? 'n/a'}.`,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: pointId('creative', `${workspaceId}:${a.id}`),
    entityType: 'creative',
    text,
    payload: {
      workspace_id: workspaceId,
      entity_type: 'creative',
      entity_id: a.id,
      adset_id: a.adset_id,
      creative_type: a.creative_type ?? null,
      creative_url: a.creative_url ?? null,
      status: a.status,
      ctr: a.ctr ?? 0,
      roas: a.roas ?? 0,
      fatigue_score: a.fatigue_score ?? 0,
      fatigue_status: a.fatigue_status,
      content: text,
      content_hash: contentHash(text),
      indexed_at: nowIso(),
      valid_from: a.created_at ?? nowIso(),
    },
  };
}

// ─── Insight / optimization-memory card ──────────────────────

export interface InsightCardInput {
  draftId: string;
  platform: Platform | 'all';
  campaignId?: string;
  campaignName?: string;
  draftType: string;
  changeSummary: string;
  reasoning?: string;
  /** Realized outcome after the change was applied & measured. */
  outcome?: {
    applied: boolean;
    metric?: string;
    deltaPct?: number;
    note?: string;
  };
}

export function renderInsightCard(
  workspaceId: string,
  i: InsightCardInput,
): RagCard {
  const outcomeText = i.outcome
    ? i.outcome.applied
      ? `Outcome: applied. ${i.outcome.metric ?? 'metric'} changed ${
          i.outcome.deltaPct !== undefined ? `${i.outcome.deltaPct.toFixed(1)}%` : 'unknown'
        }. ${i.outcome.note ?? ''}`
      : 'Outcome: rejected / not applied.'
    : 'Outcome: pending measurement.';

  const text = [
    `Optimization "${i.draftType}" on ${i.platform}${i.campaignName ? ` for campaign "${i.campaignName}"` : ''}.`,
    `Change: ${i.changeSummary}.`,
    i.reasoning ? `Reasoning: ${i.reasoning}.` : '',
    outcomeText,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: pointId('insight', `${workspaceId}:${i.draftId}`),
    entityType: 'insight',
    text,
    payload: {
      workspace_id: workspaceId,
      entity_type: 'insight',
      entity_id: i.draftId,
      platform: i.platform,
      campaign_id: i.campaignId ?? null,
      draft_type: i.draftType,
      applied: i.outcome?.applied ?? null,
      delta_pct: i.outcome?.deltaPct ?? null,
      usefulness_score:
        i.outcome?.deltaPct !== undefined
          ? Math.max(0, Math.min(1, 0.5 + i.outcome.deltaPct / 100))
          : 0.5,
      content: text,
      content_hash: contentHash(text),
      indexed_at: nowIso(),
      valid_from: nowIso(),
    },
  };
}

// ─── Benchmark card (aggregated segment stats) ───────────────

export interface BenchmarkCardInput {
  segmentKey: string; // e.g. "meta:conversions:ecommerce:lookalike"
  platform: Platform;
  objective: string;
  vertical?: string;
  audience?: string;
  sampleSize: number;
  avgCtr: number;
  avgCpa: number;
  avgRoas: number;
}

export function renderBenchmarkCard(
  workspaceId: string,
  b: BenchmarkCardInput,
): RagCard {
  const text = [
    `Benchmark for ${b.platform} / objective ${b.objective}${b.vertical ? ` / vertical ${b.vertical}` : ''}${b.audience ? ` / audience ${b.audience}` : ''}.`,
    `Across ${num(b.sampleSize)} campaigns: average CTR ${pct(b.avgCtr)}, average CPA ${money(b.avgCpa)}, average ROAS ${b.avgRoas?.toFixed(2) ?? 'n/a'}x.`,
  ].join(' ');

  return {
    id: pointId('benchmark', `${workspaceId}:${b.segmentKey}`),
    entityType: 'benchmark',
    text,
    payload: {
      workspace_id: workspaceId,
      entity_type: 'benchmark',
      entity_id: b.segmentKey,
      platform: b.platform,
      objective: b.objective,
      vertical: b.vertical ?? null,
      audience: b.audience ?? null,
      sample_size: b.sampleSize,
      avg_ctr: b.avgCtr,
      avg_cpa: b.avgCpa,
      avg_roas: b.avgRoas,
      content: text,
      content_hash: contentHash(text),
      indexed_at: nowIso(),
      valid_from: nowIso(),
    },
  };
}

// ─── Competitor ad card ──────────────────────────────────────

export interface CompetitorAdCardInput {
  /** Stable id from the source (ad library id or url hash). */
  sourceId: string;
  competitorDomain: string;
  platform?: string;
  headline?: string;
  body?: string;
  callToAction?: string;
  landingUrl?: string;
  firstSeen?: string;
}

export function renderCompetitorAdCard(
  workspaceId: string,
  ad: CompetitorAdCardInput,
): RagCard {
  const text = [
    `Competitor ad from ${ad.competitorDomain}${ad.platform ? ` on ${ad.platform}` : ''}.`,
    ad.headline ? `Headline: ${ad.headline}.` : '',
    ad.body ? `Body: ${ad.body}.` : '',
    ad.callToAction ? `CTA: ${ad.callToAction}.` : '',
    ad.landingUrl ? `Landing page: ${ad.landingUrl}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    id: pointId('competitor_ad', `${workspaceId}:${ad.competitorDomain}:${ad.sourceId}`),
    entityType: 'competitor_ad',
    text,
    payload: {
      workspace_id: workspaceId,
      entity_type: 'competitor_ad',
      entity_id: ad.sourceId,
      competitor_domain: ad.competitorDomain,
      platform: ad.platform ?? null,
      headline: ad.headline ?? null,
      cta: ad.callToAction ?? null,
      landing_url: ad.landingUrl ?? null,
      content: text,
      content_hash: contentHash(text),
      indexed_at: nowIso(),
      valid_from: ad.firstSeen ?? nowIso(),
    },
  };
}

/** Helper: render an insight card from a Draft row (no measured outcome yet). */
export function insightInputFromDraft(d: Draft): InsightCardInput {
  return {
    draftId: d.id,
    platform: d.platform,
    campaignId: d.campaign_id,
    campaignName: d.campaign_name,
    draftType: d.draft_type,
    changeSummary: d.change_summary,
    reasoning: d.ai_reasoning,
    outcome:
      d.status === 'approved' || d.status === 'auto_applied'
        ? { applied: true, note: d.impact_estimate }
        : d.status === 'rejected'
          ? { applied: false }
          : undefined,
  };
}
