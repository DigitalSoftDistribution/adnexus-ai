import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { getModuleLogger } from './logger';

/**
 * Voyage AI client — text embeddings + reranking.
 *
 * Mirrors the production pattern in auto-rag-service.mjs:
 *   - voyage-3 embeddings (1024-dim)
 *   - rerank-2 for second-stage relevance scoring
 *   - exponential backoff on 429 / 5xx
 *
 * All functions are no-ops returning null/empty when VOYAGE_API_KEY is unset,
 * so the RAG layer degrades gracefully instead of throwing.
 */

const log = getModuleLogger('voyage');

const VOYAGE_EMBED_URL = 'https://api.voyageai.com/v1/embeddings';
const VOYAGE_RERANK_URL = 'https://api.voyageai.com/v1/rerank';
const EMBED_DIM = 1024;
const MAX_INPUT_CHARS = 6000;

export type VoyageInputType = 'query' | 'document';

export interface RerankResult {
  index: number;
  relevanceScore: number;
}

function isConfigured(): boolean {
  return Boolean(config.rag.voyageApiKey);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Embed a single text into a 1024-dim vector.
 * Returns null when Voyage is not configured or repeatedly fails.
 */
export async function embed(
  text: string,
  inputType: VoyageInputType = 'document',
  attempt = 0,
): Promise<number[] | null> {
  if (!isConfigured()) return null;
  const input = (text ?? '').slice(0, MAX_INPUT_CHARS);
  if (!input.trim()) return null;

  try {
    const res = await axios.post(
      VOYAGE_EMBED_URL,
      { model: config.rag.embedModel, input, input_type: inputType },
      {
        headers: {
          Authorization: `Bearer ${config.rag.voyageApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    const vec = res.data?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== EMBED_DIM) {
      log.warn({ len: vec?.length }, 'voyage returned unexpected embedding length');
      return null;
    }
    return vec as number[];
  } catch (err) {
    const error = err as AxiosError;
    const status = error.response?.status ?? 0;
    if ((status === 429 || status >= 500) && attempt < 4) {
      await sleep(Math.min(4000, 400 * 2 ** attempt));
      return embed(text, inputType, attempt + 1);
    }
    log.error({ status, msg: error.message }, 'voyage embed failed');
    return null;
  }
}

/**
 * Embed many texts in one batched request (cheaper than N calls).
 * Falls back to per-item embedding when the batch request fails.
 */
export async function embedBatch(
  texts: string[],
  inputType: VoyageInputType = 'document',
): Promise<(number[] | null)[]> {
  if (!isConfigured() || texts.length === 0) return texts.map(() => null);

  const inputs = texts.map((t) => (t ?? '').slice(0, MAX_INPUT_CHARS));

  try {
    const res = await axios.post(
      VOYAGE_EMBED_URL,
      { model: config.rag.embedModel, input: inputs, input_type: inputType },
      {
        headers: {
          Authorization: `Bearer ${config.rag.voyageApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );

    const data = res.data?.data;
    if (!Array.isArray(data) || data.length !== inputs.length) {
      throw new Error('voyage batch length mismatch');
    }
    // Voyage returns items with an `index` field; sort to align with input order.
    const sorted = [...data].sort(
      (a: { index: number }, b: { index: number }) => a.index - b.index,
    );
    return sorted.map((d: { embedding?: number[] }) =>
      Array.isArray(d.embedding) && d.embedding.length === EMBED_DIM ? d.embedding : null,
    );
  } catch (err) {
    log.warn(
      { msg: (err as Error).message, count: texts.length },
      'voyage batch embed failed, falling back to sequential',
    );
    const out: (number[] | null)[] = [];
    for (const t of texts) {
      out.push(await embed(t, inputType));
    }
    return out;
  }
}

/**
 * Rerank candidate documents against a query with rerank-2.
 * Returns null when not configured — callers keep the original vector order.
 */
export async function rerank(
  query: string,
  documents: string[],
  topK = 10,
): Promise<RerankResult[] | null> {
  if (!isConfigured() || documents.length === 0) return null;

  try {
    const res = await axios.post(
      VOYAGE_RERANK_URL,
      {
        model: config.rag.rerankModel,
        query: query.slice(0, 2000),
        documents: documents.slice(0, 50),
        top_k: Math.min(topK, 50),
      },
      {
        headers: {
          Authorization: `Bearer ${config.rag.voyageApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      },
    );

    const data = res.data?.data;
    if (!Array.isArray(data)) return null;
    return data.map((d: { index: number; relevance_score: number }) => ({
      index: d.index,
      relevanceScore: d.relevance_score,
    }));
  } catch (err) {
    log.warn({ msg: (err as Error).message }, 'voyage rerank failed');
    return null;
  }
}

export const EMBEDDING_DIM = EMBED_DIM;
