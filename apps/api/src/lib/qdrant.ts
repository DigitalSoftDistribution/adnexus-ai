import axios, { AxiosError, AxiosInstance } from 'axios';
import { config } from '../config';
import { getModuleLogger } from './logger';

/**
 * Minimal Qdrant REST client for the AdNexus RAG layer.
 *
 * We talk to Qdrant over its HTTP API directly (no SDK dependency) to keep the
 * surface small and match the auto-rag-service.mjs reference implementation.
 */

const log = getModuleLogger('qdrant');

export type QdrantDistance = 'Cosine' | 'Dot' | 'Euclid';

export interface QdrantPoint {
  id: string | number;
  vector: number[];
  payload?: Record<string, unknown>;
}

export interface QdrantFilter {
  must?: QdrantCondition[];
  should?: QdrantCondition[];
  must_not?: QdrantCondition[];
}

export interface QdrantCondition {
  key: string;
  match?: { value: string | number | boolean } | { any: (string | number)[] };
  range?: { gt?: number; gte?: number; lt?: number; lte?: number };
}

export interface QdrantSearchHit {
  id: string | number;
  score: number;
  payload?: Record<string, unknown>;
}

let client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (!client) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.rag.qdrantApiKey) headers['api-key'] = config.rag.qdrantApiKey;
    client = axios.create({
      baseURL: config.rag.qdrantUrl,
      headers,
      timeout: 10000,
    });
  }
  return client;
}

/** Return true when the collection already exists. */
export async function collectionExists(name: string): Promise<boolean> {
  try {
    await getClient().get(`/collections/${name}`);
    return true;
  } catch (err) {
    if ((err as AxiosError).response?.status === 404) return false;
    throw err;
  }
}

/**
 * Create a collection if missing, then ensure keyword payload indexes exist
 * for the fields we filter on (workspace_id, entity_type, platform, status).
 */
export async function ensureCollection(
  name: string,
  vectorSize: number,
  distance: QdrantDistance = 'Cosine',
  keywordIndexes: string[] = [],
): Promise<void> {
  const exists = await collectionExists(name);
  if (!exists) {
    await getClient().put(`/collections/${name}`, {
      vectors: { size: vectorSize, distance },
      on_disk_payload: true,
    });
    log.info({ name, vectorSize }, 'created qdrant collection');
  }

  for (const field of keywordIndexes) {
    try {
      await getClient().put(`/collections/${name}/index`, {
        field_name: field,
        field_schema: 'keyword',
      });
    } catch (err) {
      // 409 / already-exists is fine; log anything else at debug level.
      const status = (err as AxiosError).response?.status;
      if (status && status !== 409 && status !== 400) {
        log.debug({ name, field, status }, 'payload index creation skipped');
      }
    }
  }
}

/** Upsert points (idempotent on id). */
export async function upsertPoints(name: string, points: QdrantPoint[]): Promise<void> {
  if (points.length === 0) return;
  await getClient().put(`/collections/${name}/points?wait=true`, { points });
}

/** Vector search with an optional payload filter and score threshold. */
export async function search(
  name: string,
  vector: number[],
  opts: {
    limit?: number;
    filter?: QdrantFilter;
    scoreThreshold?: number;
    withPayload?: boolean;
  } = {},
): Promise<QdrantSearchHit[]> {
  const { limit = 10, filter, scoreThreshold, withPayload = true } = opts;
  try {
    const res = await getClient().post(`/collections/${name}/points/search`, {
      vector,
      limit,
      filter,
      score_threshold: scoreThreshold,
      with_payload: withPayload,
    });
    return (res.data?.result ?? []) as QdrantSearchHit[];
  } catch (err) {
    log.error(
      { name, status: (err as AxiosError).response?.status },
      'qdrant search failed',
    );
    return [];
  }
}

/** Scroll points matching a filter (no vector required). */
export async function scroll(
  name: string,
  filter: QdrantFilter,
  limit = 50,
): Promise<QdrantSearchHit[]> {
  try {
    const res = await getClient().post(`/collections/${name}/points/scroll`, {
      filter,
      limit,
      with_payload: true,
    });
    return (res.data?.result?.points ?? []) as QdrantSearchHit[];
  } catch (err) {
    log.error(
      { name, status: (err as AxiosError).response?.status },
      'qdrant scroll failed',
    );
    return [];
  }
}

/** Delete points by id list. */
export async function deletePoints(name: string, ids: (string | number)[]): Promise<void> {
  if (ids.length === 0) return;
  await getClient().post(`/collections/${name}/points/delete?wait=true`, { points: ids });
}

/** Lightweight health probe used by /api/v1/rag readiness. */
export async function ping(): Promise<boolean> {
  try {
    await getClient().get('/healthz', { timeout: 3000 });
    return true;
  } catch {
    try {
      await getClient().get('/', { timeout: 3000 });
      return true;
    } catch {
      return false;
    }
  }
}
