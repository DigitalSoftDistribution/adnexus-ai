import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { ValidationError } from '../lib/errors';
import { ragService } from '../services/rag-service';
import { competitorAds } from '../services/competitor-ads';
import { aiService } from '../services/ai-service';

/**
 * RAG endpoints for ad-data optimization (mounted at /api/v1/rag).
 *
 *   POST /similar-campaigns  — find historical campaigns like a description
 *   POST /creative-intel     — retrieve similar / winning creatives
 *   POST /benchmark          — pull comparable benchmark segments
 *   POST /competitors        — search ingested competitor ads
 *   POST /competitors/ingest — scrape + ingest competitor URLs
 *   POST /ask                — natural-language analytics (retrieve → LLM)
 *   GET  /status             — readiness probe
 */

const router = Router();

// ─── Shared validation ───────────────────────────────────────

const searchSchema = z.object({
  query: z.string().min(1).max(2000),
  limit: z.number().int().min(1).max(30).optional(),
  platform: z.string().optional(),
});

// ─── GET /status ─────────────────────────────────────────────

router.get(
  '/status',
  asyncHandler(async (_req, res) => {
    const ready = await ragService.isReady();
    res.json({ success: true, ready });
  }),
);

// ─── POST /similar-campaigns ─────────────────────────────────

router.post(
  '/similar-campaigns',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = searchSchema.parse(req.body);

    const results = await ragService.search({
      workspaceId,
      collection: 'campaigns',
      query: body.query,
      limit: body.limit ?? 10,
      filters: body.platform ? { platform: body.platform } : undefined,
    });

    res.json({ success: true, results });
  }),
);

// ─── POST /creative-intel ────────────────────────────────────

router.post(
  '/creative-intel',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const schema = searchSchema.extend({
      fatigueStatus: z.enum(['healthy', 'warning', 'critical', 'exhausted']).optional(),
    });
    const body = schema.parse(req.body);

    const filters: Record<string, string> = {};
    if (body.platform) filters.platform = body.platform;
    if (body.fatigueStatus) filters.fatigue_status = body.fatigueStatus;

    const results = await ragService.search({
      workspaceId,
      collection: 'creatives',
      query: body.query,
      limit: body.limit ?? 10,
      filters: Object.keys(filters).length ? filters : undefined,
    });

    res.json({ success: true, results });
  }),
);

// ─── POST /benchmark ─────────────────────────────────────────

router.post(
  '/benchmark',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const body = searchSchema.parse(req.body);

    const results = await ragService.search({
      workspaceId,
      collection: 'benchmarks',
      query: body.query,
      limit: body.limit ?? 5,
      filters: body.platform ? { platform: body.platform } : undefined,
    });

    res.json({ success: true, results });
  }),
);

// ─── POST /competitors ───────────────────────────────────────

router.post(
  '/competitors',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const schema = searchSchema.extend({ domain: z.string().optional() });
    const body = schema.parse(req.body);

    const results = await ragService.search({
      workspaceId,
      collection: 'competitor_ads',
      query: body.query,
      limit: body.limit ?? 10,
      filters: body.domain ? { competitor_domain: body.domain } : undefined,
    });

    res.json({ success: true, results });
  }),
);

// ─── POST /competitors/ingest ────────────────────────────────

router.post(
  '/competitors/ingest',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const schema = z.object({
      domain: z.string().min(1),
      urls: z.array(z.string().url()).min(1).max(25),
    });
    const body = schema.parse(req.body);

    const indexed = await competitorAds.scrapeAndIngest(
      workspaceId,
      body.domain,
      body.urls,
    );

    res.json({ success: true, indexed });
  }),
);

// ─── POST /ask — natural-language analytics ──────────────────

router.post(
  '/ask',
  asyncHandler(async (req, res) => {
    const workspaceId = req.workspaceId!;
    const schema = z.object({
      question: z.string().min(1).max(2000),
      limit: z.number().int().min(1).max(20).optional(),
    });
    const body = schema.parse(req.body);

    if (!(await ragService.isReady())) {
      throw new ValidationError('RAG service is not configured');
    }

    // Retrieve grounding context from campaigns + past optimizations.
    const [campaigns, insights] = await Promise.all([
      ragService.search({
        workspaceId,
        collection: 'campaigns',
        query: body.question,
        limit: body.limit ?? 8,
      }),
      ragService.search({
        workspaceId,
        collection: 'insights',
        query: body.question,
        limit: 5,
      }),
    ]);

    const context = [
      ragService.buildContextBlock(campaigns, 3000),
      ragService.buildContextBlock(insights, 1500),
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `You are an advertising analytics assistant. Answer the user's question using ONLY the retrieved ad-data context below. If the context is insufficient, say so.

Retrieved context:
${context || '(no relevant ad data found)'}

Question: ${body.question}

Respond with a JSON object: { "answer": string, "confidence": "high" | "medium" | "low", "sources_used": number }`;

    const raw = await aiService.callAI(prompt, { temperature: 0.2, maxTokens: 800 });

    let parsed: { answer: string; confidence?: string; sources_used?: number };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { answer: raw };
    }

    res.json({
      success: true,
      answer: parsed.answer,
      confidence: parsed.confidence ?? 'low',
      sourcesUsed: parsed.sources_used ?? campaigns.length + insights.length,
      retrieved: {
        campaigns: campaigns.length,
        insights: insights.length,
      },
    });
  }),
);

export default router;
