import axios, { AxiosError } from 'axios';
import { supabase } from '../lib/supabase';
import { AppError, ValidationError } from '../lib/errors';
import { ragService } from './rag-service';
import type { UnifiedCampaign, UnifiedAd, Platform, PerformanceGoal } from '../types';

import { getModuleLogger } from '../lib/logger';
const logger = getModuleLogger('ai-service');

// ─── Type Definitions (AI Service Specific) ──────────────────

export interface DateRange {
  start: string;
  end: string;
}

export interface CreativeMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  spend: number;
  frequency: number;
  reach: number;
}

export interface BriefHighlight {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface BriefRecommendation {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface BriefAlert {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  campaignId?: string;
  campaignName?: string;
}

export interface MorningBrief {
  headline: string;
  summary: string;
  highlights: BriefHighlight[];
  recommendations: BriefRecommendation[];
  alerts: BriefAlert[];
  generatedAt: Date;
}

export interface CreativeAnalysis {
  fatigueRisk: 'low' | 'medium' | 'high' | 'critical';
  fatigueScore: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  predictedCtr: number;
}

export interface DraftActionInput {
  type: string;
  campaignId?: string;
  params: Record<string, unknown>;
}

export interface AIRecommendation {
  type: 'budget' | 'targeting' | 'creative' | 'bidding' | 'pause' | 'scale';
  priority: 'high' | 'medium' | 'low';
  campaignId: string;
  reasoning: string;
  expectedImpact: string;
  draftAction: DraftActionInput;
}

export interface BudgetConstraint {
  campaignId: string;
  minBudget?: number;
  maxBudget?: number;
}

export interface CampaignAllocation {
  campaignId: string;
  campaignName: string;
  platform: Platform;
  allocatedBudget: number;
  percentage: number;
  projectedRoas: number;
  projectedSpend: number;
  projectedRevenue: number;
}

export interface BudgetOptimizationResult {
  allocations: CampaignAllocation[];
  rationale: string;
  projectedRoas: number;
}

export interface ABTestAnalysis {
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  statisticalSignificance: boolean;
  insights: string[];
  recommendation: string;
}

export interface CreativeBrief {
  concept: string;
  headlines: string[];
  descriptions: string[];
  callToActions: string[];
  visualDirection: string;
  targetEmotion: string;
}

export interface AICompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  useAnthropic?: boolean;
}

export interface CreditCosts {
  [feature: string]: number;
}

export const AI_CREDIT_COSTS: Record<string, number> = {
  morning_brief: 5,
  creative_analysis: 3,
  recommendations: 8,
  budget_optimization: 5,
  ab_test_analysis: 4,
  creative_brief: 6,
};

// ─── Configuration ───────────────────────────────────────────

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const PRIMARY_MODEL = 'gpt-4o';
const FALLBACK_MODEL = 'claude-3-5-sonnet-20241022';

// ─── Rate Limiting ───────────────────────────────────────────

const activeCalls = new Map<string, number>();
const MAX_CONCURRENT_CALLS = 10;

function acquireSlot(workspaceId: string): boolean {
  const current = activeCalls.get(workspaceId) ?? 0;
  if (current >= MAX_CONCURRENT_CALLS) return false;
  activeCalls.set(workspaceId, current + 1);
  return true;
}

function releaseSlot(workspaceId: string): void {
  const current = activeCalls.get(workspaceId) ?? 0;
  if (current <= 1) {
    activeCalls.delete(workspaceId);
  } else {
    activeCalls.set(workspaceId, current - 1);
  }
}

// ─── Retry Logic ─────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000,
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        const backoff = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 200;
        await delay(backoff + jitter);
      }
    }
  }
  throw lastError;
}

// ─── Generic AI Completion ───────────────────────────────────

async function callAI(prompt: string, options: AICompletionOptions = {}): Promise<string> {
  const {
    model = PRIMARY_MODEL,
    temperature = 0.3,
    maxTokens = 2000,
  } = options;

  // Try OpenAI first
  if (OPENAI_API_KEY) {
    try {
      const response = await withRetry(() =>
        axios.post(
          `${OPENAI_BASE_URL}/chat/completions`,
          {
            model,
            messages: [
              { role: 'system', content: 'You are an expert digital advertising analyst AI. Respond only with valid JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (err) {
      const error = err as AxiosError;
      logger.error({ err: error.message }, `[AI] OpenAI call failed (${model}):`);
      // Fall through to Anthropic
    }
  }

  // Fallback to Anthropic
  if (ANTHROPIC_API_KEY) {
    try {
      const response = await withRetry(() =>
        axios.post(
          `${ANTHROPIC_BASE_URL}/messages`,
          {
            model: FALLBACK_MODEL,
            max_tokens: maxTokens,
            temperature,
            messages: [{ role: 'user', content: `${prompt}\n\nRespond ONLY with a JSON object.` }],
          },
          {
            headers: {
              'x-api-key': ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        ),
      );

      const content = response.data.content?.[0]?.text;
      if (content) return content;
    } catch (err) {
      const error = err as AxiosError;
      logger.error({ err: error.message }, `[AI] Anthropic fallback failed (${FALLBACK_MODEL}):`);
    }
  }

  throw new AppError('AI_UNAVAILABLE', 'AI service is temporarily unavailable. Please try again later.', 503);
}

function parseJSON<T>(raw: string): T {
  try {
    // Try direct parse first
    return JSON.parse(raw) as T;
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }
    // Try finding JSON between braces
    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]) as T;
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

// ─── Credit Management ───────────────────────────────────────

export async function deductCredits(workspaceId: string, feature: string, credits: number): Promise<boolean> {
  if (!workspaceId) throw new ValidationError('Workspace ID is required');
  if (credits <= 0) throw new ValidationError('Credits must be positive');

  // Check current balance
  const { data: creditRow, error: fetchError } = await supabase
    .from('ai_credits')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new AppError('CREDIT_CHECK_FAILED', `Failed to check credits: ${fetchError.message}`, 500);
  }

  const remaining = (creditRow?.remaining ?? 0);
  if (remaining < credits) {
    throw new AppError('INSUFFICIENT_CREDITS', `Insufficient AI credits. Required: ${credits}, Available: ${remaining}`, 402, {
      required: credits,
      available: remaining,
    });
  }

  // Deduct credits
  const { error: updateError } = await supabase
    .from('ai_credits')
    .update({
      credits_used: (creditRow?.credits_used ?? 0) + credits,
      remaining: remaining - credits,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  if (updateError) {
    throw new AppError('CREDIT_DEDUCTION_FAILED', `Failed to deduct credits: ${updateError.message}`, 500);
  }

  // Log usage
  await supabase.from('credit_usage_log').insert({
    workspace_id: workspaceId,
    feature,
    action: feature,
    credits_used: credits,
    cost_estimate: 0,
    created_at: new Date().toISOString(),
  });

  return true;
}

// ─── Prompt Templates ────────────────────────────────────────

function buildMorningBriefPrompt(campaigns: UnifiedCampaign[], dateRange: DateRange): string {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);
  const avgRoas = campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length : 0;
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

  const campaignTable = campaigns.map((c) =>
    `| ${c.name} | ${c.platform} | ${c.status} | $${c.spend.toFixed(2)} | ${c.ctr.toFixed(2)}% | ${c.roas.toFixed(2)}x | ${c.conversions} | $${c.cpa.toFixed(2)} | ${c.frequency.toFixed(1)} |`,
  ).join('\n');

  return `
# Morning Brief: Digital Advertising Performance Report

## Date Range
${dateRange.start} to ${dateRange.end}

## Aggregate Performance
| Metric | Value |
|--------|-------|
| Total Spend | $${totalSpend.toFixed(2)} |
| Total Impressions | ${totalImpressions.toLocaleString()} |
| Total Clicks | ${totalClicks.toLocaleString()} |
| Avg CTR | ${avgCtr.toFixed(2)}% |
| Total Conversions | ${totalConversions.toLocaleString()} |
| Avg ROAS | ${avgRoas.toFixed(2)}x |
| Avg CPA | $${avgCpa.toFixed(2)} |
| Active Campaigns | ${campaigns.filter((c) => c.status === 'active').length} |

## Campaign Details
| Campaign | Platform | Status | Spend | CTR | ROAS | Conv | CPA | Freq |
|----------|----------|--------|-------|-----|------|------|-----|------|
${campaignTable}

## Instructions
Analyze this advertising performance data and generate a morning brief. Identify trends, highlight notable performance, flag concerns, and provide actionable recommendations.

Return a JSON object with this exact structure:
{
  "headline": "A concise, impactful headline summarizing the day (e.g., 'ROAS Up 15% Across Meta Campaigns')",
  "summary": "A 2-3 sentence executive summary of overall performance",
  "highlights": [
    { "title": "Highlight name", "value": "The metric value", "change": "e.g. +15% vs yesterday", "trend": "up|down|neutral" }
  ],
  "recommendations": [
    { "title": "Action title", "description": "Detailed description", "impact": "high|medium|low" }
  ],
  "alerts": [
    { "severity": "info|warning|critical", "title": "Alert title", "description": "Alert details" }
  ]
}

Rules:
- Include 3-5 highlights of the most important metrics
- Include 2-4 actionable recommendations based on the data
- Include 0-3 alerts for issues that need attention
- Be specific — reference actual campaign names and numbers
- Focus on ROAS, CPA, CTR, and frequency as key indicators
`.trim();
}

function buildCreativeAnalysisPrompt(
  ad: UnifiedAd,
  performanceMetrics: CreativeMetrics,
  comparativeContext?: CreativeMetrics[],
): string {
  let comparisonSection = '';
  if (comparativeContext && comparativeContext.length > 0) {
    const avgCtr = comparativeContext.reduce((s, m) => s + m.ctr, 0) / comparativeContext.length;
    const avgRoas = comparativeContext.reduce((s, m) => s + m.roas, 0) / comparativeContext.length;
    const avgCpa = comparativeContext.reduce((s, m) => s + m.cpa, 0) / comparativeContext.length;
    comparisonSection = `
## Comparative Context (Other ads in same adset)
| Metric | This Ad | Adset Average |
|--------|---------|---------------|
| CTR | ${performanceMetrics.ctr.toFixed(2)}% | ${avgCtr.toFixed(2)}% |
| ROAS | ${performanceMetrics.roas.toFixed(2)}x | ${avgRoas.toFixed(2)}x |
| CPA | $${performanceMetrics.cpa.toFixed(2)} | $${avgCpa.toFixed(2)} |
| Frequency | ${performanceMetrics.frequency.toFixed(1)} | ${(comparativeContext.reduce((s, m) => s + m.frequency, 0) / comparativeContext.length).toFixed(1)} |
`;
  }

  return `
# Creative Performance Analysis

## Ad Details
| Field | Value |
|-------|-------|
| Ad Name | ${ad.name} |
| Status | ${ad.status} |
| Creative Type | ${ad.creative_type ?? 'unknown'} |
| Creative URL | ${ad.creative_url ?? 'N/A'} |
| Creative Text | ${ad.creative_text ?? 'N/A'} |

## Performance Metrics
| Metric | Value |
|--------|-------|
| Spend | $${performanceMetrics.spend.toFixed(2)} |
| Impressions | ${performanceMetrics.impressions.toLocaleString()} |
| Clicks | ${performanceMetrics.clicks.toLocaleString()} |
| CTR | ${performanceMetrics.ctr.toFixed(2)}% |
| Conversions | ${performanceMetrics.conversions} |
| CPA | $${performanceMetrics.cpa.toFixed(2)} |
| ROAS | ${performanceMetrics.roas.toFixed(2)}x |
| Frequency | ${performanceMetrics.frequency.toFixed(1)} |
| Reach | ${performanceMetrics.reach.toLocaleString()} |

${comparisonSection}

## Instructions
Analyze this creative's performance and provide a comprehensive assessment. Consider:
1. **Fatigue Risk**: Based on frequency, CTR trend, and ROAS, how likely is this ad to be experiencing creative fatigue?
2. **Strengths**: What is working well?
3. **Weaknesses**: What could be improved?
4. **Suggestions**: Provide 3-5 specific, actionable suggestions
5. **Predicted CTR**: Estimate the optimal CTR this creative could achieve with improvements

Return a JSON object with this exact structure:
{
  "fatigueRisk": "low|medium|high|critical",
  "fatigueScore": 0-100,
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "suggestions": ["actionable suggestion 1", "actionable suggestion 2"],
  "predictedCtr": 0.0
}

Fatigue Score Rules:
- 0-25: low (fresh creative, performing well)
- 26-50: medium (showing early signs of fatigue)
- 51-75: high (significant fatigue, needs refresh)
- 76-100: critical (exhausted, immediate action needed)

Consider frequency > 3.0 as a fatigue warning signal. CTR below adset average is concerning. Declining ROAS over time indicates fatigue.
`.trim();
}

/**
 * Retrieve relevant past optimizations (RAG memory) to ground new
 * recommendations. Best-effort: returns an empty string when RAG is unavailable.
 */
async function retrieveOptimizationMemory(
  workspaceId: string,
  campaigns: UnifiedCampaign[],
): Promise<string> {
  try {
    if (!(await ragService.isReady())) return '';
    const query = campaigns
      .slice(0, 5)
      .map((c) => `${c.objective ?? ''} ${c.name}`)
      .join('; ')
      .trim();
    if (!query) return '';
    const results = await ragService.search({
      workspaceId,
      collection: 'insights',
      query,
      limit: 5,
    });
    return ragService.buildContextBlock(results, 1500);
  } catch {
    return '';
  }
}

function buildRecommendationsPrompt(
  campaigns: UnifiedCampaign[],
  goals: PerformanceGoal[],
  memoryBlock = '',
): string {
  const campaignTable = campaigns.map((c) =>
    `| ${c.name} | ${c.platform} | ${c.status} | $${c.spend.toFixed(0)} | ${c.ctr.toFixed(2)}% | ${c.roas.toFixed(2)}x | ${c.conversions} | $${c.cpa.toFixed(2)} | ${c.frequency.toFixed(1)} |`,
  ).join('\n');

  const goalsTable = goals.map((g) =>
    `| ${g.name} | ${g.goal_type} | ${g.target_value} | ${g.current_value} | ${g.status} | ${g.progress_pct}% |`,
  ).join('\n');

  return `
# Advertising Performance Recommendations

## Active Campaigns
| Campaign | Platform | Status | Spend | CTR | ROAS | Conv | CPA | Freq |
|----------|----------|--------|-------|-----|------|------|-----|------|
${campaignTable}

## Goals
| Goal | Type | Target | Current | Status | Progress |
|------|------|--------|---------|--------|----------|
${goalsTable}
${memoryBlock ? `\n## Past Optimization Outcomes (memory)\nUse these prior results to favour changes that worked and avoid ones that didn't:\n${memoryBlock}\n` : ''}
## Instructions
Analyze the campaign data against the goals and generate specific, actionable recommendations. Each recommendation must include a draft action that could be implemented.

Return a JSON object with this exact structure:
{
  "recommendations": [
    {
      "type": "budget|targeting|creative|bidding|pause|scale",
      "priority": "high|medium|low",
      "campaignId": "the campaign id",
      "reasoning": "Detailed explanation of why this recommendation matters",
      "expectedImpact": "Expected outcome, e.g., 'Increase ROAS by 0.5x' or 'Reduce CPA by 15%'",
      "draftAction": {
        "type": "budget_change|status_change|bid_adjustment|targeting_edit|creative_upload|pause|scale",
        "campaignId": "the campaign id",
        "params": { "field": "daily_budget", "new_value": 500 }
      }
    }
  ]
}

Rules:
- Provide 3-8 recommendations covering different campaigns
- Prioritize based on goal alignment — focus on campaigns furthest from their targets
- Include a mix of budget, creative, and bidding recommendations
- Each recommendation must have a concrete, implementable draft action
- High priority for campaigns with CPA > 2x target, ROAS < 50% of target, or frequency > 4
- Scale recommendations for campaigns with ROAS > 2x target and CPA below target
- Pause recommendations for campaigns with ROAS < 0.5 and high spend
`.trim();
}

function buildBudgetOptimizationPrompt(
  campaigns: UnifiedCampaign[],
  totalBudget: number,
  constraints?: BudgetConstraint[],
): string {
  const constraintSection = constraints && constraints.length > 0
    ? constraints.map((c) => {
        const camp = campaigns.find((cp) => cp.id === c.campaignId);
        return `| ${camp?.name ?? c.campaignId} | $${c.minBudget ?? 0} | $${c.maxBudget ?? 'unlimited'} |`;
      }).join('\n')
    : '| (none) | - | - |';

  const campaignTable = campaigns.map((c) =>
    `| ${c.name} | ${c.platform} | ${c.status} | $${c.spend.toFixed(0)} | ${c.ctr.toFixed(2)}% | ${c.roas.toFixed(2)}x | ${c.conversions} | $${c.cpa.toFixed(2)} | ${c.frequency.toFixed(1)} |`,
  ).join('\n');

  return `
# Budget Optimization

## Parameters
- **Total Budget to Allocate**: $${totalBudget.toFixed(2)}

## Constraints
| Campaign | Min Budget | Max Budget |
|----------|-----------|------------|
${constraintSection}

## Campaign Performance Data
| Campaign | Platform | Status | Historical Spend | CTR | ROAS | Conversions | CPA | Frequency |
|----------|----------|--------|-----------------|-----|------|-------------|-----|-----------|
${campaignTable}

## Instructions
Optimize the allocation of $${totalBudget.toFixed(2)} across these campaigns to maximize overall portfolio ROAS.

Return a JSON object with this exact structure:
{
  "allocations": [
    {
      "campaignId": "campaign id",
      "campaignName": "campaign name",
      "platform": "meta|google|tiktok|snap",
      "allocatedBudget": 500.00,
      "percentage": 25.0,
      "projectedRoas": 3.5,
      "projectedSpend": 500.00,
      "projectedRevenue": 1750.00
    }
  ],
  "rationale": "Detailed explanation of the allocation strategy",
  "projectedRoas": 3.2
}

Rules:
- Allocate 100% of the total budget
- Respect min/max constraints if provided
- Allocate MORE budget to high-ROAS campaigns and LESS to low-ROAS campaigns
- Consider campaign maturity — newer campaigns may need more budget to reach statistical significance
- Consider frequency — campaigns with frequency > 3 may need less budget until creative is refreshed
- Projected ROAS for each campaign should be based on historical performance
- The overall projectedRoas should be the weighted average
- Ensure status === 'active' campaigns get priority; paused campaigns may receive 0
`.trim();
}

function buildABTestPrompt(
  variantA: { name: string; metrics: CreativeMetrics },
  variantB: { name: string; metrics: CreativeMetrics },
  confidenceLevel: number,
): string {
  return `
# A/B Test Analysis

## Variant A: ${variantA.name}
| Metric | Value |
|--------|-------|
| Impressions | ${variantA.metrics.impressions.toLocaleString()} |
| Clicks | ${variantA.metrics.clicks.toLocaleString()} |
| CTR | ${variantA.metrics.ctr.toFixed(2)}% |
| Conversions | ${variantA.metrics.conversions} |
| CPA | $${variantA.metrics.cpa.toFixed(2)} |
| ROAS | ${variantA.metrics.roas.toFixed(2)}x |
| Spend | $${variantA.metrics.spend.toFixed(2)} |

## Variant B: ${variantB.name}
| Metric | Value |
|--------|-------|
| Impressions | ${variantB.metrics.impressions.toLocaleString()} |
| Clicks | ${variantB.metrics.clicks.toLocaleString()} |
| CTR | ${variantB.metrics.ctr.toFixed(2)}% |
| Conversions | ${variantB.metrics.conversions} |
| CPA | $${variantB.metrics.cpa.toFixed(2)} |
| ROAS | ${variantB.metrics.roas.toFixed(2)}x |
| Spend | $${variantB.metrics.spend.toFixed(2)} |

## Instructions
Perform a statistical analysis of this A/B test. Determine which variant is the winner, calculate confidence level, and assess statistical significance.

Return a JSON object with this exact structure:
{
  "winner": "A|B|tie",
  "confidence": 85.5,
  "statisticalSignificance": true,
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendation": "Clear recommendation on next steps"
}

Statistical Rules:
- Use a confidence threshold of ${(confidenceLevel * 100).toFixed(0)}%
- For CTR comparison: use z-test for proportions. Standard error = sqrt(p*(1-p)*(1/n1 + 1/n2)) where p = pooled CTR
- Statistical significance requires confidence >= ${(confidenceLevel * 100).toFixed(0)}%
- If confidence is below threshold, winner should be "tie"
- The winner is the variant with the better composite score considering CTR, ROAS, and CPA
- Provide 2-4 specific insights comparing the variants
- Recommendation should be actionable: e.g., "Scale Variant A", "Run longer for statistical significance", "Test new variables"
`.trim();
}

function buildCreativeBriefPrompt(
  campaignObjective: string,
  targetAudience: string,
  platform: string,
  brandGuidelines?: string,
): string {
  const brandSection = brandGuidelines
    ? `\n## Brand Guidelines\n${brandGuidelines}\n`
    : '';

  return `
# Creative Brief Generator

## Campaign Parameters
| Field | Value |
|-------|-------|
| Objective | ${campaignObjective} |
| Target Audience | ${targetAudience} |
| Platform | ${platform} |
${brandSection}

## Instructions
Generate a comprehensive creative brief for a digital advertising campaign. The brief should include a campaign concept, multiple headline options, description variations, CTA suggestions, visual direction, and emotional targeting guidance.

Return a JSON object with this exact structure:
{
  "concept": "A compelling 2-3 sentence campaign concept that ties the objective, audience, and platform together",
  "headlines": ["Headline 1", "Headline 2", "Headline 3", "Headline 4", "Headline 5"],
  "descriptions": ["Description 1", "Description 2", "Description 3"],
  "callToActions": ["CTA 1", "CTA 2", "CTA 3", "CTA 4"],
  "visualDirection": "Detailed visual direction including color palette, imagery style, and composition guidance",
  "targetEmotion": "The primary emotion to evoke (e.g., excitement, trust, urgency, aspiration)"
}

Rules:
- Platform-specific optimization: ${platform} has unique creative best practices
- Headlines: max 40 characters for Meta, use power words, include numbers where relevant
- Descriptions: max 125 characters, focus on value proposition
- CTAs: platform-native language (e.g., "Shop Now", "Learn More", "Sign Up")
- Visual direction should be specific and actionable for a designer
- Target emotion should align with the campaign objective
- Consider the target audience's pain points and desires
${brandGuidelines ? '- Follow brand guidelines for tone, voice, and visual identity' : ''}
`.trim();
}

// ─── Morning Brief Generation ────────────────────────────────

export async function generateMorningBrief(
  workspaceId: string,
  campaigns: UnifiedCampaign[],
  dateRange: DateRange,
): Promise<MorningBrief> {
  if (!acquireSlot(workspaceId)) {
    throw new AppError('RATE_LIMIT', 'Too many concurrent AI calls for this workspace. Max 10.', 429);
  }

  try {
    await deductCredits(workspaceId, 'morning_brief', AI_CREDIT_COSTS.morning_brief);

    const prompt = buildMorningBriefPrompt(campaigns, dateRange);
    const raw = await callAI(prompt, {
      model: PRIMARY_MODEL,
      temperature: 0.3,
      maxTokens: 4000,
    });

    const parsed = parseJSON<{ headline: string; summary: string; highlights: BriefHighlight[]; recommendations: BriefRecommendation[]; alerts: BriefAlert[] }>(raw);

    return {
      headline: parsed.headline ?? 'Daily Performance Summary',
      summary: parsed.summary ?? 'No summary available.',
      highlights: parsed.highlights ?? [],
      recommendations: parsed.recommendations ?? [],
      alerts: parsed.alerts ?? [],
      generatedAt: new Date(),
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMIT') throw err;

    logger.error({ err: err }, `[AI] Morning brief generation failed for workspace ${workspaceId}:`);
    // Graceful fallback
    return {
      headline: 'Performance data temporarily unavailable',
      summary: 'AI analysis is currently unavailable. Please check back later or review your campaign metrics directly.',
      highlights: [],
      recommendations: [],
      alerts: [{
        severity: 'info',
        title: 'AI Service Unavailable',
        description: 'The AI service is temporarily unavailable. Performance data is still accessible through the campaigns dashboard.',
      }],
      generatedAt: new Date(),
    };
  } finally {
    releaseSlot(workspaceId);
  }
}

// ─── Creative Analysis ───────────────────────────────────────

export async function analyzeCreative(
  ad: UnifiedAd,
  performanceMetrics: CreativeMetrics,
  comparativeContext?: CreativeMetrics[],
): Promise<CreativeAnalysis> {
  const workspaceId = 'system'; // Creative analysis doesn't always have workspace context

  if (!acquireSlot(workspaceId)) {
    throw new AppError('RATE_LIMIT', 'Too many concurrent AI calls. Max 10.', 429);
  }

  try {
    await deductCredits(workspaceId, 'creative_analysis', AI_CREDIT_COSTS.creative_analysis);

    const prompt = buildCreativeAnalysisPrompt(ad, performanceMetrics, comparativeContext);
    const raw = await callAI(prompt, {
      model: PRIMARY_MODEL,
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = parseJSON<{ fatigueRisk: string; fatigueScore: number; strengths: string[]; weaknesses: string[]; suggestions: string[]; predictedCtr: number }>(raw);

    return {
      fatigueRisk: (parsed.fatigueRisk ?? 'medium') as 'low' | 'medium' | 'high' | 'critical',
      fatigueScore: Math.max(0, Math.min(100, parsed.fatigueScore ?? 50)),
      strengths: parsed.strengths ?? [],
      weaknesses: parsed.weaknesses ?? [],
      suggestions: parsed.suggestions ?? [],
      predictedCtr: parsed.predictedCtr ?? performanceMetrics.ctr,
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMIT') throw err;

    logger.error({ err: err }, `[AI] Creative analysis failed for ad ${ad.id}:`);
    // Graceful fallback
    return {
      fatigueRisk: 'medium',
      fatigueScore: ad.fatigue_score ?? 50,
      strengths: ['AI analysis temporarily unavailable — strengths could not be determined.'],
      weaknesses: ['AI analysis temporarily unavailable — weaknesses could not be determined.'],
      suggestions: ['Review ad performance manually. Consider refreshing creative if frequency is above 3.0.'],
      predictedCtr: performanceMetrics.ctr,
    };
  } finally {
    releaseSlot(workspaceId);
  }
}

// ─── Insight Recommendations ─────────────────────────────────

export async function generateRecommendations(
  workspaceId: string,
  campaigns: UnifiedCampaign[],
  goals: PerformanceGoal[],
): Promise<AIRecommendation[]> {
  if (!acquireSlot(workspaceId)) {
    throw new AppError('RATE_LIMIT', 'Too many concurrent AI calls for this workspace. Max 10.', 429);
  }

  try {
    await deductCredits(workspaceId, 'recommendations', AI_CREDIT_COSTS.recommendations);

    // Ground recommendations in past optimization outcomes ("what worked before").
    const memoryBlock = await retrieveOptimizationMemory(workspaceId, campaigns);

    const prompt = buildRecommendationsPrompt(campaigns, goals, memoryBlock);
    const raw = await callAI(prompt, {
      model: PRIMARY_MODEL,
      temperature: 0.3,
      maxTokens: 4000,
    });

    const parsed = parseJSON<{ recommendations: Array<{ type: string; priority: string; campaignId: string; reasoning: string; expectedImpact: string; draftAction: { type: string; campaignId: string; params: Record<string, unknown> } }> }>(raw);

    return (parsed.recommendations ?? []).map((rec) => ({
      type: (rec.type ?? 'budget') as AIRecommendation['type'],
      priority: (rec.priority ?? 'medium') as AIRecommendation['priority'],
      campaignId: rec.campaignId ?? '',
      reasoning: rec.reasoning ?? '',
      expectedImpact: rec.expectedImpact ?? '',
      draftAction: {
        type: rec.draftAction?.type ?? 'budget_change',
        campaignId: rec.draftAction?.campaignId ?? rec.campaignId ?? '',
        params: rec.draftAction?.params ?? {},
      },
    }));
  } catch (err) {
    if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMIT') throw err;

    logger.error({ err: err }, `[AI] Recommendations generation failed for workspace ${workspaceId}:`);
    return [];
  } finally {
    releaseSlot(workspaceId);
  }
}

// ─── Budget Optimization ─────────────────────────────────────

export async function optimizeBudgetAllocation(
  campaigns: UnifiedCampaign[],
  totalBudget: number,
  constraints?: BudgetConstraint[],
): Promise<BudgetOptimizationResult> {
  const workspaceId = 'system_budget';

  if (!acquireSlot(workspaceId)) {
    throw new AppError('RATE_LIMIT', 'Too many concurrent AI calls. Max 10.', 429);
  }

  try {
    await deductCredits(workspaceId, 'budget_optimization', AI_CREDIT_COSTS.budget_optimization);

    const prompt = buildBudgetOptimizationPrompt(campaigns, totalBudget, constraints);
    const raw = await callAI(prompt, {
      model: PRIMARY_MODEL,
      temperature: 0.3,
      maxTokens: 4000,
    });

    const parsed = parseJSON<{ allocations: Array<{ campaignId: string; campaignName: string; platform: string; allocatedBudget: number; percentage: number; projectedRoas: number; projectedSpend: number; projectedRevenue: number }>; rationale: string; projectedRoas: number }>(raw);

    const allocations: CampaignAllocation[] = (parsed.allocations ?? []).map((a) => ({
      campaignId: a.campaignId ?? '',
      campaignName: a.campaignName ?? 'Unknown',
      platform: (a.platform ?? 'meta') as Platform,
      allocatedBudget: a.allocatedBudget ?? 0,
      percentage: a.percentage ?? 0,
      projectedRoas: a.projectedRoas ?? 0,
      projectedSpend: a.projectedSpend ?? 0,
      projectedRevenue: a.projectedRevenue ?? 0,
    }));

    // Ensure allocations sum to totalBudget
    const allocatedSum = allocations.reduce((s, a) => s + a.allocatedBudget, 0);
    if (Math.abs(allocatedSum - totalBudget) > 0.01 && allocations.length > 0) {
      const diff = totalBudget - allocatedSum;
      allocations[0].allocatedBudget += diff;
      allocations[0].percentage = (allocations[0].allocatedBudget / totalBudget) * 100;
    }

    return {
      allocations,
      rationale: parsed.rationale ?? 'AI analysis unavailable. Budget split evenly across campaigns.',
      projectedRoas: parsed.projectedRoas ?? 0,
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMIT') throw err;

    logger.error({ err: err }, '[AI] Budget optimization failed:');
    // Graceful fallback: split evenly
    const perCampaign = campaigns.length > 0 ? totalBudget / campaigns.length : 0;
    return {
      allocations: campaigns.map((c) => ({
        campaignId: c.id,
        campaignName: c.name,
        platform: c.platform,
        allocatedBudget: perCampaign,
        percentage: campaigns.length > 0 ? 100 / campaigns.length : 0,
        projectedRoas: c.roas,
        projectedSpend: perCampaign,
        projectedRevenue: perCampaign * c.roas,
      })),
      rationale: 'AI optimization service is temporarily unavailable. Budget has been split evenly across campaigns. Please retry for AI-powered optimization.',
      projectedRoas: campaigns.length > 0 ? campaigns.reduce((s, c) => s + c.roas, 0) / campaigns.length : 0,
    };
  } finally {
    releaseSlot(workspaceId);
  }
}

// ─── A/B Test Analysis ───────────────────────────────────────

export async function analyzeABTest(
  variantA: { name: string; metrics: CreativeMetrics },
  variantB: { name: string; metrics: CreativeMetrics },
  confidenceLevel = 0.95,
): Promise<ABTestAnalysis> {
  const workspaceId = 'system_abtest';

  if (!acquireSlot(workspaceId)) {
    throw new AppError('RATE_LIMIT', 'Too many concurrent AI calls. Max 10.', 429);
  }

  try {
    await deductCredits(workspaceId, 'ab_test_analysis', AI_CREDIT_COSTS.ab_test_analysis);

    const prompt = buildABTestPrompt(variantA, variantB, confidenceLevel);
    const raw = await callAI(prompt, {
      model: PRIMARY_MODEL,
      temperature: 0.3,
      maxTokens: 2000,
    });

    const parsed = parseJSON<{ winner: string; confidence: number; statisticalSignificance: boolean; insights: string[]; recommendation: string }>(raw);

    return {
      winner: (parsed.winner ?? 'tie') as 'A' | 'B' | 'tie',
      confidence: parsed.confidence ?? 0,
      statisticalSignificance: parsed.statisticalSignificance ?? false,
      insights: parsed.insights ?? [],
      recommendation: parsed.recommendation ?? 'Run the test longer to achieve statistical significance.',
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMIT') throw err;

    logger.error({ err: err }, '[AI] A/B test analysis failed:');
    // Statistical fallback without AI
    const ctrA = variantA.metrics.ctr;
    const ctrB = variantB.metrics.ctr;
    const nA = variantA.metrics.impressions;
    const nB = variantB.metrics.impressions;
    const p = (variantA.metrics.clicks + variantB.metrics.clicks) / (nA + nB);
    const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
    const z = se > 0 ? Math.abs(ctrA / 100 - ctrB / 100) / se : 0;
    const confidence = Math.min(99, z * 25); // rough approximation

    return {
      winner: confidence >= confidenceLevel * 100 ? (ctrA > ctrB ? 'A' : 'B') : 'tie',
      confidence,
      statisticalSignificance: confidence >= confidenceLevel * 100,
      insights: ['AI analysis temporarily unavailable. Using statistical approximation.'],
      recommendation: confidence >= confidenceLevel * 100
        ? `Variant ${ctrA > ctrB ? 'A' : 'B'} is performing better based on CTR.`
        : 'Run the test longer to achieve statistical significance.',
    };
  } finally {
    releaseSlot(workspaceId);
  }
}

// ─── Creative Brief Generation ───────────────────────────────

export async function generateCreativeBrief(
  campaignObjective: string,
  targetAudience: string,
  platform: string,
  brandGuidelines?: string,
): Promise<CreativeBrief> {
  const workspaceId = 'system_creative';

  if (!acquireSlot(workspaceId)) {
    throw new AppError('RATE_LIMIT', 'Too many concurrent AI calls. Max 10.', 429);
  }

  try {
    await deductCredits(workspaceId, 'creative_brief', AI_CREDIT_COSTS.creative_brief);

    const prompt = buildCreativeBriefPrompt(campaignObjective, targetAudience, platform, brandGuidelines);
    const raw = await callAI(prompt, {
      model: PRIMARY_MODEL,
      temperature: 0.7,
      maxTokens: 4000,
    });

    const parsed = parseJSON<{ concept: string; headlines: string[]; descriptions: string[]; callToActions: string[]; visualDirection: string; targetEmotion: string }>(raw);

    return {
      concept: parsed.concept ?? `Campaign focused on ${campaignObjective} targeting ${targetAudience} on ${platform}.`,
      headlines: parsed.headlines ?? ['Discover Something New', 'Unlock Your Potential', 'Transform Your Experience'],
      descriptions: parsed.descriptions ?? [`Tailored for ${targetAudience}.`, `Achieve your ${campaignObjective} goals.`],
      callToActions: parsed.callToActions ?? ['Learn More', 'Sign Up', 'Shop Now'],
      visualDirection: parsed.visualDirection ?? 'Clean, modern design with platform-optimized imagery.',
      targetEmotion: parsed.targetEmotion ?? 'aspiration',
    };
  } catch (err) {
    if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDITS') throw err;
    if (err instanceof AppError && err.code === 'RATE_LIMIT') throw err;

    logger.error({ err: err }, '[AI] Creative brief generation failed:');
    return {
      concept: `A campaign focused on ${campaignObjective} targeting ${targetAudience} on ${platform}. (AI generation unavailable — please refine manually)`,
      headlines: [`${campaignObjective} — Just for You`, 'Discover the Difference', 'Your Journey Starts Here'],
      descriptions: [`Designed for ${targetAudience}.`, `Reach your ${campaignObjective} goals faster.`],
      callToActions: ['Learn More', 'Get Started', 'Shop Now'],
      visualDirection: 'Clean, professional design optimized for the platform. (AI generation unavailable)',
      targetEmotion: 'trust',
    };
  } finally {
    releaseSlot(workspaceId);
  }
}

// ─── Token Counting (Approximation) ──────────────────────────

export function estimateTokens(text: string): number {
  // Rough approximation: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

// ─── Default Export ──────────────────────────────────────────

export const aiService = {
  generateMorningBrief,
  analyzeCreative,
  generateRecommendations,
  optimizeBudgetAllocation,
  analyzeABTest,
  generateCreativeBrief,
  deductCredits,
  callAI,
  estimateTokens,
  AI_CREDIT_COSTS,
} as const;

export default aiService;
