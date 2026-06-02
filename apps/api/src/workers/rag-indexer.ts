import { supabase } from '../lib/supabase';
import { getModuleLogger } from '../lib/logger';
import { ragService } from '../services/rag-service';
import {
  renderCampaignCard,
  renderCreativeCard,
  renderInsightCard,
  insightInputFromDraft,
  type RagCard,
} from '../services/rag-cards';
import type {
  UnifiedCampaign,
  UnifiedAd,
  Draft,
  Platform,
} from '../types';

/**
 * RAG indexer worker.
 *
 * Reads campaign / ad / draft rows from Supabase (workspace-scoped via the
 * ad_accounts join), renders them into text cards, and upserts the embeddings
 * into Qdrant. Idempotent: point ids are deterministic per entity, so a re-run
 * supersedes the previous snapshot in place (no duplicates).
 *
 * Designed to be called two ways:
 *   1. Backfill — `indexWorkspace(workspaceId)` for a full pass.
 *   2. Incremental — `indexCampaign` / `indexAd` / `indexDraft` from existing
 *      sync workers right after they write fresh data.
 */

const log = getModuleLogger('rag-indexer');

const BATCH_SIZE = 100;

interface CampaignRow extends UnifiedCampaign {
  ad_accounts?: { workspace_id: string; platform: Platform };
}

interface AdRow extends UnifiedAd {
  adsets?: {
    campaigns?: { ad_accounts?: { workspace_id: string } };
  };
}

// ─── Fetch helpers (workspace-scoped) ────────────────────────

async function fetchCampaigns(workspaceId: string): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from('campaigns')
    .select('*, ad_accounts!inner(workspace_id, platform)')
    .eq('ad_accounts.workspace_id', workspaceId);
  if (error) {
    log.error({ workspaceId, msg: error.message }, 'fetchCampaigns failed');
    return [];
  }
  return (data ?? []) as CampaignRow[];
}

async function fetchAds(workspaceId: string): Promise<AdRow[]> {
  const { data, error } = await supabase
    .from('ads')
    .select(
      '*, adsets!inner(campaign_id, campaigns!inner(ad_account_id, ad_accounts!inner(workspace_id)))',
    )
    .eq('adsets.campaigns.ad_accounts.workspace_id', workspaceId);
  if (error) {
    log.error({ workspaceId, msg: error.message }, 'fetchAds failed');
    return [];
  }
  return (data ?? []) as AdRow[];
}

async function fetchResolvedDrafts(workspaceId: string): Promise<Draft[]> {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .in('status', ['approved', 'auto_applied', 'rejected']);
  if (error) {
    log.error({ workspaceId, msg: error.message }, 'fetchResolvedDrafts failed');
    return [];
  }
  return (data ?? []) as Draft[];
}

// ─── Normalisers ─────────────────────────────────────────────

function toUnifiedCampaign(row: CampaignRow): UnifiedCampaign {
  return {
    ...row,
    platform: row.ad_accounts?.platform ?? row.platform,
  };
}

// ─── Public backfill API ─────────────────────────────────────

export interface IndexResult {
  campaigns: number;
  creatives: number;
  insights: number;
  total: number;
}

/** Full backfill of one workspace's ad data into the RAG store. */
export async function indexWorkspace(workspaceId: string): Promise<IndexResult> {
  const ready = await ragService.isReady();
  if (!ready) {
    log.warn({ workspaceId }, 'rag not ready (Qdrant/Voyage unconfigured) — skipping');
    return { campaigns: 0, creatives: 0, insights: 0, total: 0 };
  }

  await ragService.ensureCollections();

  const [campaigns, ads, drafts] = await Promise.all([
    fetchCampaigns(workspaceId),
    fetchAds(workspaceId),
    fetchResolvedDrafts(workspaceId),
  ]);

  const campaignCards: RagCard[] = campaigns.map((c) =>
    renderCampaignCard(workspaceId, toUnifiedCampaign(c)),
  );
  const creativeCards: RagCard[] = ads.map((a) => renderCreativeCard(workspaceId, a));
  const insightCards: RagCard[] = drafts.map((d) =>
    renderInsightCard(workspaceId, insightInputFromDraft(d)),
  );

  const campaignCount = await indexInBatches(campaignCards);
  const creativeCount = await indexInBatches(creativeCards);
  const insightCount = await indexInBatches(insightCards);

  const result: IndexResult = {
    campaigns: campaignCount,
    creatives: creativeCount,
    insights: insightCount,
    total: campaignCount + creativeCount + insightCount,
  };
  log.info({ workspaceId, ...result }, 'workspace RAG backfill complete');
  return result;
}

async function indexInBatches(cards: RagCard[]): Promise<number> {
  let indexed = 0;
  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    indexed += await ragService.indexCards(batch);
  }
  return indexed;
}

// ─── Incremental hooks (call from existing sync workers) ─────

export async function indexCampaign(
  workspaceId: string,
  campaign: UnifiedCampaign,
): Promise<void> {
  if (!(await ragService.isReady())) return;
  await ragService.indexCard(renderCampaignCard(workspaceId, campaign));
}

export async function indexAd(workspaceId: string, ad: UnifiedAd): Promise<void> {
  if (!(await ragService.isReady())) return;
  await ragService.indexCard(renderCreativeCard(workspaceId, ad));
}

/** Index a resolved draft as optimization memory. */
export async function indexDraft(workspaceId: string, draft: Draft): Promise<void> {
  if (!(await ragService.isReady())) return;
  await ragService.indexCard(
    renderInsightCard(workspaceId, insightInputFromDraft(draft)),
  );
}

export const ragIndexer = {
  indexWorkspace,
  indexCampaign,
  indexAd,
  indexDraft,
};
