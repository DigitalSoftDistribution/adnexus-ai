import { config } from '../config';
import { getModuleLogger } from '../lib/logger';
import { embed, embedBatch, rerank, EMBEDDING_DIM } from '../lib/voyage';
import {
  ensureCollection,
  upsertPoints,
  search as qdrantSearch,
  deletePoints,
  ping as qdrantPing,
  type QdrantFilter,
  type QdrantCondition,
  type QdrantPoint,
  type QdrantSearchHit,
} from '../lib/qdrant';
import type { RagCard, RagEntityType } from './rag-cards';

/**
 * RAG service for AdNexus ad-data optimization.
 *
 * Responsibilities:
 *   - Own the Qdrant collection set (one per entity type, tenant-isolated by
 *     workspace_id).
 *   - Embed + upsert cards produced by rag-cards.ts.
 *   - Retrieve with a score floor, optional rerank-2 second stage, and recency
 *     decay — mirroring the production auto-rag-service.mjs behaviour.
 *
 * Every collection name is prefixed (default "adnexus") so it never collides
 * with the shared Beast knowledge collections.
 */

const log = getModuleLogger('rag-service');

// ─── Collection registry ─────────────────────────────────────

export type RagCollection =
  | 'campaigns'
  | 'creatives'
  | 'insights'
  | 'benchmarks'
  | 'competitor_ads';

const ENTITY_TO_COLLECTION: Record<RagEntityType, RagCollection> = {
  campaign: 'campaigns',
  creative: 'creatives',
  insight: 'insights',
  benchmark: 'benchmarks',
  competitor_ad: 'competitor_ads',
};

/** Keyword payload indexes created per collection (everything we filter on). */
const COMMON_INDEXES = ['workspace_id', 'entity_type', 'platform', 'status'];
const COLLECTION_INDEXES: Record<RagCollection, string[]> = {
  campaigns: [...COMMON_INDEXES, 'objective'],
  creatives: [...COMMON_INDEXES, 'fatigue_status', 'creative_type'],
  insights: [...COMMON_INDEXES, 'draft_type'],
  benchmarks: [...COMMON_INDEXES, 'objective', 'vertical'],
  competitor_ads: [...COMMON_INDEXES, 'competitor_domain'],
};

function fullName(c: RagCollection): string {
  return `${config.rag.collectionPrefix}_${c}`;
}

// ─── Lifecycle ───────────────────────────────────────────────

let ensured = false;

/** Idempotently create all RAG collections + payload indexes. */
export async function ensureCollections(): Promise<void> {
  if (!config.rag.enabled) return;
  if (ensured) return;
  for (const [collection, indexes] of Object.entries(COLLECTION_INDEXES) as [
    RagCollection,
    string[],
  ][]) {
    await ensureCollection(fullName(collection), EMBEDDING_DIM, 'Cosine', indexes);
  }
  ensured = true;
  log.info('rag collections ensured');
}

export async function isReady(): Promise<boolean> {
  if (!config.rag.enabled) return false;
  if (!config.rag.voyageApiKey) return false;
  return qdrantPing();
}

// ─── Ingestion ───────────────────────────────────────────────

/** Embed and upsert a batch of cards into their target collections. */
export async function indexCards(cards: RagCard[]): Promise<number> {
  if (!config.rag.enabled || cards.length === 0) return 0;
  await ensureCollections();

  const vectors = await embedBatch(
    cards.map((c) => c.text),
    'document',
  );

  // Group successful embeddings by collection for batched upserts.
  const byCollection = new Map<RagCollection, QdrantPoint[]>();
  let embedded = 0;

  cards.forEach((card, idx) => {
    const vector = vectors[idx];
    if (!vector) return;
    embedded += 1;
    const collection = ENTITY_TO_COLLECTION[card.entityType];
    const arr = byCollection.get(collection) ?? [];
    arr.push({ id: card.id, vector, payload: card.payload });
    byCollection.set(collection, arr);
  });

  for (const [collection, points] of byCollection) {
    await upsertPoints(fullName(collection), points);
  }

  return embedded;
}

/** Convenience for single-card indexing. */
export async function indexCard(card: RagCard): Promise<boolean> {
  return (await indexCards([card])) > 0;
}

export async function removeEntities(
  collection: RagCollection,
  ids: string[],
): Promise<void> {
  if (!config.rag.enabled || ids.length === 0) return;
  await deletePoints(fullName(collection), ids);
}

// ─── Retrieval ───────────────────────────────────────────────

export interface RagSearchOptions {
  workspaceId: string;
  collection: RagCollection;
  query: string;
  limit?: number;
  /** Extra equality filters, e.g. { platform: 'meta' }. */
  filters?: Record<string, string | number | boolean>;
  /** Apply rerank-2 second stage (default true when Voyage is configured). */
  useRerank?: boolean;
  /** Apply recency decay to scores (default true). */
  decay?: boolean;
}

export interface RagSearchResult {
  id: string;
  score: number;
  content: string;
  payload: Record<string, unknown>;
}

const DECAY_DAYS = () => config.rag.decayDays;

function applyRecencyDecay(hit: QdrantSearchHit): number {
  const payload = hit.payload ?? {};
  const ts =
    (payload.indexed_at as string) ||
    (payload.valid_from as string) ||
    undefined;
  let score = hit.score;
  if (ts) {
    const ageDays = Math.max(0, (Date.now() - new Date(ts).getTime()) / 86_400_000);
    score *= Math.exp(-ageDays / DECAY_DAYS());
  }
  // Usefulness boost for insight cards that recorded a positive outcome.
  const u = typeof payload.usefulness_score === 'number' ? payload.usefulness_score : 0.5;
  score *= 1 + 0.3 * (u - 0.5);
  return score;
}

function buildFilter(
  workspaceId: string,
  filters?: Record<string, string | number | boolean>,
): QdrantFilter {
  const must: QdrantCondition[] = [
    { key: 'workspace_id', match: { value: workspaceId } },
  ];
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      must.push({ key, match: { value } });
    }
  }
  return { must };
}

/**
 * Vector search → score floor → optional rerank-2 → recency decay → sort.
 * Always tenant-scoped by workspace_id.
 */
export async function search(opts: RagSearchOptions): Promise<RagSearchResult[]> {
  if (!config.rag.enabled) return [];
  const {
    workspaceId,
    collection,
    query,
    limit = 10,
    filters,
    useRerank = true,
    decay = true,
  } = opts;

  const vector = await embed(query, 'query');
  if (!vector) return [];

  // Over-fetch so rerank + decay have candidates to work with.
  const overFetch = Math.min(50, Math.max(limit * 3, 15));
  const hits = await qdrantSearch(fullName(collection), vector, {
    limit: overFetch,
    filter: buildFilter(workspaceId, filters),
    scoreThreshold: config.rag.scoreFloor,
  });
  if (hits.length === 0) return [];

  let ordered = hits;

  // Second-stage rerank against the embedded content text.
  if (useRerank) {
    const docs = hits.map((h) => String((h.payload?.content as string) ?? ''));
    const reranked = await rerank(query, docs, Math.min(limit * 2, overFetch));
    if (reranked) {
      ordered = reranked
        .map((r) => {
          const h = hits[r.index];
          return h ? { ...h, score: r.relevanceScore } : null;
        })
        .filter((h): h is QdrantSearchHit => h !== null);
    }
  }

  // Recency decay + usefulness boost, then final sort.
  const scored = ordered.map((h) => ({
    hit: h,
    finalScore: decay ? applyRecencyDecay(h) : h.score,
  }));
  scored.sort((a, b) => b.finalScore - a.finalScore);

  return scored.slice(0, limit).map(({ hit, finalScore }) => ({
    id: String(hit.id),
    score: finalScore,
    content: String((hit.payload?.content as string) ?? ''),
    payload: hit.payload ?? {},
  }));
}

/**
 * Format retrieved results into a compact context block for LLM prompts.
 * Used by ai-service / agent-engine to ground generations.
 */
export function buildContextBlock(results: RagSearchResult[], maxChars = 4000): string {
  const lines: string[] = [];
  let used = 0;
  for (const r of results) {
    const line = `- [${r.payload.entity_type ?? '?'}] (relevance ${r.score.toFixed(2)}) ${r.content}`;
    if (used + line.length > maxChars) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}

export const ragService = {
  ensureCollections,
  isReady,
  indexCard,
  indexCards,
  removeEntities,
  search,
  buildContextBlock,
};
