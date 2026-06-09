// ============================================
// AdNexus AI — AI Agent Decision Engine
// ============================================
// Core intelligence module that analyzes campaigns and generates
// optimization recommendations through statistical analysis,
// anomaly detection, trend forecasting, and rule-based automation.
//
// Architecture:
//   AIEngine (orchestrator)
//   ├── RuleEvaluator         (automation rule evaluation)
//   ├── PerformanceAnalyzer   (anomaly detection, trends, significance)
//   ├── RecommendationGenerator (actionable recommendations)
//   ├── CreativeFatigueDetector (creative lifecycle analysis)
//   ├── BudgetOptimizer       (budget reallocation & pacing)
//   └── DraftCreator          (recommendation → draft conversion)
// ============================================

import { supabase } from '../lib/supabase';
import { createDraft } from '../services/drafts-service';
import { getModuleLogger } from '../lib/logger';
import type {
  AutomationRule,
  CampaignStatus,
  Draft,
  DraftType,
  Platform,
  UnifiedAd,
  UnifiedCampaign,
} from '../types';

const logger = getModuleLogger('ai-engine');

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Internal Types
// ═══════════════════════════════════════════════════════════════

/** Rule type presets with pre-configured conditions + actions */
export type RuleType =
  | 'pause_if_cpa_exceeds'
  | 'scale_if_roas_exceeds'
  | 'alert_if_ctr_drops'
  | 'reduce_budget_if_spend_high'
  | 'pause_if_no_conversions'
  | 'adjust_bid_if_frequency_high';

/** A single condition within a rule */
export interface RuleCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'pct_change_gt';
  value: number;
  timeWindow?: string;
}

/** A single action within a rule */
export interface RuleAction {
  type: string;
  params: Record<string, unknown>;
}

/** Extended AI Rule with rule_type preset support */
export interface AIRule extends AutomationRule {
  rule_type?: RuleType;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

/** Internal campaign representation used by the engine */
export interface Campaign extends UnifiedCampaign {
  spend_pct?: number;
  days_since_refresh?: number;
  conversions_7d?: number;
  impressions_7d?: number;
}

/** Result of evaluating a single rule */
export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  ruleType: RuleType | string;
  triggered: boolean;
  matchedCampaigns: Campaign[];
  draftsCreated: Draft[];
  executedAt: string;
}

/** Statistical anomaly detected in a metric */
export interface Anomaly {
  campaignId: string;
  metric: string;
  date: string;
  value: number;
  expectedValue: number;
  zScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  direction: 'spike' | 'drop';
}

/** Trend analysis result */
export interface Trend {
  campaignId: string;
  metric: string;
  direction: 'up' | 'down' | 'stable';
  strength: number;        // 0-1, strength of the trend
  slope: number;           // daily change rate
  rSquared: number;        // goodness of fit
  forecast7d: number;      // predicted value in 7 days
  confidence: number;      // 0-1
  dataPoints: number;
}

/** Period comparison result */
export interface Comparison {
  campaignId: string;
  metric: string;
  currentPeriod: { start: string; end: string; avg: number; sum: number };
  previousPeriod: { start: string; end: string; avg: number; sum: number };
  changePct: number;
  changeAbs: number;
  significant: boolean;
  pValue: number;
}

/** Significance test result */
export interface SignificanceResult {
  significant: boolean;
  pValue: number;
  currentMean: number;
  previousMean: number;
  effectSize: number; // Cohen's d
}

/** Base recommendation */
export type RecommendationRiskLevel = 'low' | 'medium' | 'high';

export interface RecommendationEvidenceMetric {
  metric: string;
  value: number | string;
  baseline?: number | string;
  changePct?: number;
  unit?: string;
  source: string;
}

export interface RecommendationTargetEntity {
  type: 'campaign' | 'adset' | 'ad' | 'audience' | 'workspace';
  id: string;
}

export interface RecommendationProposedChange {
  field: string;
  currentValue?: unknown;
  proposedValue: unknown;
}

export interface Recommendation {
  id: string;
  workspaceId: string;
  type: 'budget_reallocation' | 'creative_refresh' | 'audience_optimization' | 'bid_adjustment' | 'status_change' | 'rule_suggestion';
  title: string;
  description: string;
  targetEntity: RecommendationTargetEntity;
  explanation: string;
  evidenceMetrics: RecommendationEvidenceMetric[];
  priority: number;          // 1-100, higher = more urgent
  confidence: 'high' | 'medium' | 'low';
  riskLevel: RecommendationRiskLevel;
  estimatedImpact: {
    metric: string;
    direction: 'increase' | 'decrease';
    magnitude: number;
    unit: string;
  };
  campaignIds: string[];
  proposedChanges: RecommendationProposedChange[];
  rollbackCondition: string;
  platform: Platform;
  reasoning: string;
  model: string;
  modelVersion: string;
  source: 'deterministic-rules' | 'model' | 'platform-sync';
  createdAt: string;
  expiresAt: string;
}

/** Budget-specific recommendation */
export interface BudgetRecommendation extends Recommendation {
  type: 'budget_reallocation';
  currentAllocation: Record<string, number>;
  proposedAllocation: Record<string, number>;
  marginalRoas: Record<string, number>;
  expectedRoasImprovement: number;
}

/** Creative-specific recommendation */
export interface CreativeRecommendation extends Recommendation {
  type: 'creative_refresh';
  adIds: string[];
  fatigueScores: Record<string, number>;
  suggestedVariations: string[];
  estimatedCtrImprovement: number;
}

/** Audience-specific recommendation */
export interface AudienceRecommendation extends Recommendation {
  type: 'audience_optimization';
  adsetIds: string[];
  overlapPct: number;
  suggestedAudiences: Array<{
    name: string;
    type: string;
    estimatedReach: number;
  }>;
}

/** Bid-specific recommendation */
export interface BidRecommendation extends Recommendation {
  type: 'bid_adjustment';
  adsetId: string;
  currentBid: number;
  suggestedBid: number;
  bidStrategy: string;
  expectedCpa: number;
}

/** Creative fatigue score */
export interface FatigueScore {
  adId: string;
  adName: string;
  campaignId: string;
  score: number;             // 0-100, 100 = fully fatigued
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
  ctrDecayRate: number;      // % decline per day
  frequencyGrowthRate: number;
  conversionRateDecline: number;
  daysSinceLaunch: number;
  estimatedDaysUntilFatigue: number;
}

/** Refresh strategy for a fatigued creative */
export interface RefreshStrategy {
  adId: string;
  strategy: 'replace' | 'rotate' | 'refresh_audience' | 'pause' | 'keep_running';
  confidence: number;
  steps: string[];
  expectedImpact: {
    ctrImprovementPct: number;
    cpaReductionPct: number;
  };
}

/** Optimal budget allocation for a campaign */
export interface BudgetAllocation {
  campaignId: string;
  campaignName: string;
  platform: Platform;
  currentDailyBudget: number;
  recommendedDailyBudget: number;
  marginalRoas: number;
  confidence: number;
  reason: string;
}

/** Budget pacing status */
export interface PacingStatus {
  campaignId: string;
  status: 'on_track' | 'under_pacing' | 'over_pacing' | 'at_risk';
  targetSpend: number;
  actualSpend: number;
  projectedSpend: number;
  pacingPct: number;         // % of expected spend achieved
  daysRemaining: number;
  riskScore: number;         // 0-100
}

/** Spend forecast */
export interface SpendForecast {
  campaignId: string;
  projectedDailySpend: number;
  projectedTotalSpend: number;
  projectedEndSpend: number;
  confidenceInterval: [number, number]; // [low, high]
  confidence: number;
}

/** Daily budget suggestion */
export interface DailyBudget {
  campaignId: string;
  currentBudget: number;
  suggestedBudget: number;
  changePct: number;
  reason: string;
  confidence: number;
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Statistical Utilities
// ═══════════════════════════════════════════════════════════════

/** Error function (erf) — Abramowitz & Stegun approximation */
function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

class StatsUtils {
  /** Compute mean of an array */
  static mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  /** Compute sample standard deviation */
  static stdDev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  /** Compute variance */
  static variance(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  }

  /** Z-score for each value in the array */
  static zScores(arr: number[]): number[] {
    const m = this.mean(arr);
    const s = this.stdDev(arr);
    if (s === 0) return arr.map(() => 0);
    return arr.map((v) => (v - m) / s);
  }

  /**
   * Simple linear regression: y = mx + b
   * Returns { slope, intercept, rSquared, predict }
   */
  static linearRegression(
    xs: number[],
    ys: number[],
  ): { slope: number; intercept: number; rSquared: number; predict: (x: number) => number } {
    const n = Math.min(xs.length, ys.length);
    if (n < 2) return { slope: 0, intercept: 0, rSquared: 0, predict: () => 0 };

    const sumX = xs.reduce((s, v) => s + v, 0);
    const sumY = ys.reduce((s, v) => s + v, 0);
    const sumXY = xs.slice(0, n).reduce((s, x, i) => s + x * ys[i], 0);
    const sumXX = xs.reduce((s, v) => s + v * v, 0);
    const sumYY = ys.reduce((s, v) => s + v * v, 0);

    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return { slope: 0, intercept: sumY / n, rSquared: 0, predict: () => sumY / n };

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const ssTot = sumYY - (sumY * sumY) / n;
    const ssRes = ys.slice(0, n).reduce((s, y, i) => s + (y - (slope * xs[i] + intercept)) ** 2, 0);
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

    return {
      slope,
      intercept,
      rSquared,
      predict: (x: number) => slope * x + intercept,
    };
  }

  /**
   * Welch's t-test for two independent samples with unequal variances.
   * Returns { tStatistic, pValue, significant } where pValue is two-tailed.
   */
  static welchsTTest(a: number[], b: number[]): { tStatistic: number; pValue: number } {
    const n1 = a.length;
    const n2 = b.length;
    if (n1 < 2 || n2 < 2) return { tStatistic: 0, pValue: 1 };

    const m1 = this.mean(a);
    const m2 = this.mean(b);
    const v1 = this.variance(a);
    const v2 = this.variance(b);

    const se = Math.sqrt(v1 / n1 + v2 / n2);
    if (se === 0) return { tStatistic: 0, pValue: 1 };

    const t = (m1 - m2) / se;

    // Welch–Satterthwaite degrees of freedom
    const numerator = (v1 / n1 + v2 / n2) ** 2;
    const denominator = (v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1);
    const df = denominator === 0 ? Math.min(n1, n2) - 1 : numerator / denominator;

    // Two-tailed p-value using approximation
    const pValue = this.studentT2TailedP(Math.abs(t), df);

    return { tStatistic: t, pValue };
  }

  /** Approximate CDF of Student's t-distribution (two-tailed p-value) */
  private static studentT2TailedP(t: number, df: number): number {
    // Use approximation: for df > 30, t-distribution ~ normal
    if (df > 30) {
      // Normal approximation: p = 2 * (1 - Phi(t))
      const z = t;
      const p = 2 * (1 - 0.5 * (1 + erf(z / Math.sqrt(2))));
      return Math.min(1, Math.max(0, p));
    }

    // For small df, use a simple approximation
    // Ref: Peizer-Pratt approximation for t-CDF
    const x = df / (df + t * t);
    const a = df / 2;
    const b = 0.5;
    const ibeta = this.incompleteBeta(x, a, b);
    return Math.min(1, Math.max(0, ibeta));
  }

  /** Incomplete beta function I_x(a,b) — approximation using continued fraction */
  private static incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Use symmetric property for better convergence
    if (x > (a + 1) / (a + b + 2)) {
      return 1 - this.incompleteBeta(1 - x, b, a);
    }

    const lnBeta = this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);

    const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

    // Lentz's method for continued fraction
    const cf = this.betaContinuedFraction(x, a, b);
    return front * cf;
  }

  private static betaContinuedFraction(x: number, a: number, b: number): number {
    const maxIterations = 200;
    const epsilon = 3e-7;

    let am = 1;
    let bm = 1;
    let az = 1;
    const qab = a + b;
    const qap = a + 1;
    const qam = a - 1;
    let bz = 1 - (qab * x) / qap;

    for (let m = 1; m <= maxIterations; m++) {
      const m2 = 2 * m;
      let d = (m * (b - m) * x) / ((qam + m2) * (a + m2));
      const ap = az + d * am;
      const bp = bz + d * bm;
      d = -((a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
      const app = ap + d * az;
      const bpp = bp + d * bz;
      const aOld = az;

      // Normalize to prevent overflow
      const scale = ap / app;
      az = app * scale;
      bz = bpp * scale;
      am = ap * scale;
      bm = bp * scale;

      if (Math.abs(az - aOld) < epsilon * Math.abs(az)) break;
    }

    return az;
  }

  /** Log-gamma function using Lanczos approximation */
  private static logGamma(z: number): number {
    const g = 7;
    const p = [
      0.99999999999980993, 676.5203681218851, -1259.1392167224028,
      771.32342877765313, -176.61502916214059, 12.507343278686905,
      -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
    ];

    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - this.logGamma(1 - z);
    }

    z -= 1;
    let x = p[0];
    for (let i = 1; i < g + 2; i++) {
      x += p[i] / (z + i);
    }

    const t = z + g + 0.5;
    return Math.log(Math.sqrt(2 * Math.PI)) + Math.log(t) * (z + 0.5) - t + Math.log(x);
  }

  /** Cohen's d — effect size between two arrays */
  static cohensD(a: number[], b: number[]): number {
    const m1 = this.mean(a);
    const m2 = this.mean(b);
    const v1 = this.variance(a);
    const v2 = this.variance(b);
    const pooledStd = Math.sqrt((v1 + v2) / 2);
    if (pooledStd === 0) return 0;
    return (m1 - m2) / pooledStd;
  }

  /** Exponential smoothing forecast */
  static exponentialSmoothing(data: number[], alpha = 0.3): number[] {
    if (data.length === 0) return [];
    const smoothed: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
    }
    return smoothed;
  }

  /** Generate a non-deterministic UUID-like string (use stableId for recommendations). */
  static generateId(prefix = 'rec'): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Deterministic id from a prefix + seed parts. Recommendations must use this
   * so the same recommendation keeps the same id across regenerations — that's
   * what apply/dismiss target.
   */
  static stableId(prefix: string, ...parts: Array<string | number | undefined | null>): string {
    const seed = parts.filter((p) => p != null && p !== '').join('|') || prefix;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return `${prefix}_${(hash >>> 0).toString(36)}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Data Access Layer
// ═══════════════════════════════════════════════════════════════

/**
 * Centralized data fetcher for the AI Engine.
 * Abstracts all Supabase queries so classes remain testable.
 */
class DataFetcher {
  /** Fetch active campaigns for a workspace with optional account/platform filters */
  static async fetchCampaigns(
    workspaceId: string,
    filters?: { accountIds?: string[]; platforms?: Platform[]; status?: CampaignStatus },
  ): Promise<Campaign[]> {
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', filters?.status ?? 'active');

    if (filters?.accountIds?.length) {
      query = query.in('ad_account_id', filters.accountIds);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return (data as Campaign[]).map((c) => this.enrichCampaign(c));
  }

  /** Fetch a single campaign by ID */
  static async fetchCampaign(campaignId: string): Promise<Campaign | null> {
    const { data, error } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
    if (error || !data) return null;
    return this.enrichCampaign(data as Campaign);
  }

  /** Fetch campaigns by IDs */
  static async fetchCampaignsByIds(campaignIds: string[]): Promise<Campaign[]> {
    if (!campaignIds.length) return [];
    const { data, error } = await supabase.from('campaigns').select('*').in('id', campaignIds);
    if (error || !data) return [];
    return (data as Campaign[]).map((c) => this.enrichCampaign(c));
  }

  /** Fetch ad accounts for a workspace */
  static async fetchAdAccounts(workspaceId: string): Promise<{ id: string; platform: Platform }[]> {
    const { data, error } = await supabase
      .from('ad_accounts')
      .select('id, platform')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');
    if (error || !data) return [];
    return data as { id: string; platform: Platform }[];
  }

  /** Fetch ads (creatives) for a workspace */
  static async fetchAds(workspaceId: string, campaignId?: string): Promise<UnifiedAd[]> {
    let query = supabase
      .from('ads')
      .select('*, adsets!inner(campaign_id, campaigns!inner(workspace_id))')
      .eq('campaigns.workspace_id', workspaceId);

    if (campaignId) {
      query = query.eq('adsets.campaign_id', campaignId);
    }

    const { data, error } = await query;
    if (error || !data) {
      // Fallback: query directly if join fails
      const fallback = await supabase.from('ads').select('*');
      if (fallback.error || !fallback.data) return [];
      return fallback.data as UnifiedAd[];
    }
    return data as UnifiedAd[];
  }

  /** Fetch ads by campaign IDs (via adsets) */
  static async fetchAdsByCampaignIds(campaignIds: string[]): Promise<UnifiedAd[]> {
    if (!campaignIds.length) return [];
    // First get adset IDs for these campaigns
    const { data: adsets } = await supabase.from('adsets').select('id').in('campaign_id', campaignIds);
    if (!adsets?.length) return [];
    const adsetIds = adsets.map((a) => a.id);
    const { data, error } = await supabase.from('ads').select('*').in('adset_id', adsetIds);
    if (error || !data) return [];
    return data as UnifiedAd[];
  }

  /** Fetch active automation rules for a workspace */
  static async fetchRules(workspaceId: string): Promise<AIRule[]> {
    const { data, error } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active');
    if (error || !data) return [];
    return data as AIRule[];
  }

  /** Fetch daily metric snapshots for a campaign */
  static async fetchDailyMetrics(
    campaignId: string,
    metric: string,
    days: number,
  ): Promise<{ date: string; value: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('campaign_daily_stats')
      .select('date, ' + metric)
      .eq('campaign_id', campaignId)
      .gte('date', since.toISOString().slice(0, 10))
      .order('date', { ascending: true });

    if (error || !data) return [];

    return data
      .map((row) => ({
        date: (row as unknown as Record<string, unknown>).date as string,
        value: Number((row as unknown as Record<string, unknown>)[metric]) || 0,
      }))
      .filter((d) => !isNaN(d.value));
  }

  /** Fetch historical ad-level metrics for creative fatigue analysis */
  static async fetchAdDailyMetrics(
    adId: string,
    days: number,
  ): Promise<{ date: string; impressions: number; clicks: number; conversions: number; ctr: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
      .from('ad_daily_stats')
      .select('*')
      .eq('ad_id', adId)
      .gte('date', since.toISOString().slice(0, 10))
      .order('date', { ascending: true });

    if (error || !data) return [];

    return (data as Array<Record<string, unknown>>).map((row) => ({
      date: row.date as string,
      impressions: Number(row.impressions) || 0,
      clicks: Number(row.clicks) || 0,
      conversions: Number(row.conversions) || 0,
      ctr: Number(row.ctr) || 0,
    }));
  }

  /** Enrich campaign with computed fields */
  private static enrichCampaign(c: Campaign): Campaign {
    const budget = c.daily_budget || c.lifetime_budget || 0;
    if (budget > 0) {
      c.spend_pct = (c.spend / budget) * 100;
    }
    const daysSince = Math.floor(
      (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    c.days_since_refresh = daysSince;
    return c;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: RuleEvaluator
// ═══════════════════════════════════════════════════════════════

/**
 * Evaluates automation rules against current campaign data.
 * Supports 6 built-in rule types plus custom rule definitions.
 *
 * Key Algorithms:
 *   - Condition matching with AND logic across metrics
 *   - Metric resolution: CPA, ROAS, CTR, frequency, spend_pct
 *   - Action execution via draft creation (never direct API changes)
 */
export class RuleEvaluator {
  /** Z-score threshold for anomaly-triggered rules */
  private readonly Z_THRESHOLD = 2.5;

  /**
   * Evaluate all active rules for a workspace.
   * Returns results for each rule with matched campaigns and created drafts.
   */
  async evaluateRules(workspaceId: string): Promise<RuleEvaluationResult[]> {
    const rules = await DataFetcher.fetchRules(workspaceId);
    const results: RuleEvaluationResult[] = [];

    for (const rule of rules) {
      try {
        const result = await this.evaluateSingleRule(workspaceId, rule);
        results.push(result);
      } catch (err) {
        logger.error({ ruleId: rule.id, err }, "Rule evaluation failed");
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          ruleType: rule.rule_type ?? 'custom',
          triggered: false,
          matchedCampaigns: [],
          draftsCreated: [],
          executedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  /**
   * Check if a single rule's conditions are met for a set of campaigns.
   */
  async checkRule(rule: AIRule, campaigns: Campaign[]): Promise<boolean> {
    if (rule.status !== 'active') return false;

    for (const campaign of campaigns) {
      const allMet = rule.conditions.every((cond) => this.checkCondition(cond, campaign as unknown as Record<string, unknown>));
      if (allMet) return true;
    }
    return false;
  }

  /**
   * Execute rule actions for matched campaigns, creating drafts.
   */
  async executeRuleActions(rule: AIRule, matches: Campaign[]): Promise<Draft[]> {
    const drafts: Draft[] = [];

    for (const campaign of matches) {
      for (const action of rule.actions) {
        const draft = await this.createDraftFromAction(rule, campaign as unknown as Record<string, unknown>, action);
        if (draft) drafts.push(draft);
      }
    }

    // Update rule applied count
    if (drafts.length > 0) {
      await supabase
        .from('automation_rules')
        .update({
          applied_count: rule.applied_count + 1,
          last_applied_at: new Date().toISOString(),
        })
        .eq('id', rule.id);
    }

    return drafts;
  }

  // ─── Private Methods ───────────────────────────────────────

  private async evaluateSingleRule(
    workspaceId: string,
    rule: AIRule,
  ): Promise<RuleEvaluationResult> {
    const accounts = await DataFetcher.fetchAdAccounts(workspaceId);
    const platformAccounts = accounts.filter((a) =>
      rule.platforms.includes(a.platform),
    );

    if (!platformAccounts.length) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.rule_type ?? 'custom',
        triggered: false,
        matchedCampaigns: [],
        draftsCreated: [],
        executedAt: new Date().toISOString(),
      };
    }

    const campaigns = await DataFetcher.fetchCampaigns(workspaceId, {
      accountIds: platformAccounts.map((a) => a.id),
    });

    const matched: Campaign[] = [];
    for (const campaign of campaigns) {
      if (rule.conditions.every((cond) => this.checkCondition(cond, campaign as unknown as Record<string, unknown>))) {
        matched.push(campaign);
      }
    }

    const drafts = matched.length > 0 ? await this.executeRuleActions(rule, matched) : [];

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      ruleType: rule.rule_type ?? 'custom',
      triggered: matched.length > 0,
      matchedCampaigns: matched,
      draftsCreated: drafts,
      executedAt: new Date().toISOString(),
    };
  }

  private checkCondition(
    condition: RuleCondition,
    campaign: Record<string, unknown>,
  ): boolean {
    const value = this.resolveMetric(campaign, condition.metric);
    if (value === undefined || value === null) return false;

    switch (condition.operator) {
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lte':
        return value <= condition.value;
      case 'eq':
        return Math.abs(value - condition.value) < 1e-9;
      case 'pct_change_gt':
        return false; // Requires historical data — handled elsewhere
      default:
        return false;
    }
  }

  private resolveMetric(
    campaign: Record<string, unknown>,
    metric: string,
  ): number | undefined {
    switch (metric) {
      case 'cpa':
        return campaign.cpa as number;
      case 'roas':
        return campaign.roas as number;
      case 'ctr':
        return campaign.ctr as number;
      case 'frequency':
        return campaign.frequency as number;
      case 'spend':
        return campaign.spend as number;
      case 'conversions':
        return campaign.conversions as number;
      case 'impressions':
        return campaign.impressions as number;
      case 'cpm':
        return campaign.cpm as number;
      case 'cpc':
        return campaign.cpc as number;
      case 'reach':
        return campaign.reach as number;
      case 'spend_pct': {
        const budget =
          (campaign.daily_budget as number) || (campaign.lifetime_budget as number);
        if (!budget || budget === 0) return undefined;
        return ((campaign.spend as number) / budget) * 100;
      }
      case 'days_since_refresh':
        return campaign.days_since_refresh as number;
      default:
        return undefined;
    }
  }

  private async createDraftFromAction(
    rule: AIRule,
    campaign: Record<string, unknown>,
    action: RuleAction,
  ): Promise<Draft | null> {
    const draftTypeMap: Record<string, DraftType> = {
      pause_campaign: 'status_change',
      increase_budget: 'budget_change',
      decrease_budget: 'budget_change',
      adjust_bid: 'bid_adjustment',
      create_draft: 'rule_based',
      notify: 'rule_based',
      scale_budget: 'budget_change',
    };

    const draftType = draftTypeMap[action.type] ?? 'rule_based';
    const platform = (campaign.platform as Platform) ?? 'meta';

    const changeDetail: Record<string, unknown> = {
      platform_campaign_id: campaign.platform_campaign_id,
      rule_name: rule.name,
      rule_id: rule.id,
    };

    let changeSummary = `${rule.name}: ${action.type} on ${campaign.name}`;

    switch (action.type) {
      case 'pause_campaign':
        changeSummary = `Pause "${campaign.name}" — ${rule.name}`;
        changeDetail.field = 'status';
        changeDetail.old_status = campaign.status;
        changeDetail.new_status = 'PAUSED';
        break;

      case 'increase_budget':
      case 'scale_budget': {
        const pct = (action.params.percentage as number) ?? 20;
        const currentBudget = (campaign.daily_budget as number) || 0;
        const newBudget = Math.round(currentBudget * (1 + pct / 100));
        changeSummary = `Increase "${campaign.name}" budget by ${pct}% ($${currentBudget} \u2192 $${newBudget})`;
        changeDetail.field = 'daily_budget';
        changeDetail.old_value = currentBudget;
        changeDetail.new_value = newBudget;
        break;
      }

      case 'decrease_budget':
      case 'reduce_budget': {
        const pct = (action.params.percentage as number) ?? 20;
        const currentBudget = (campaign.daily_budget as number) || 0;
        const newBudget = Math.round(currentBudget * (1 - pct / 100));
        changeSummary = `Decrease "${campaign.name}" budget by ${pct}% ($${currentBudget} \u2192 $${newBudget})`;
        changeDetail.field = 'daily_budget';
        changeDetail.old_value = currentBudget;
        changeDetail.new_value = newBudget;
        break;
      }

      case 'adjust_bid': {
        const adjustment = (action.params.adjustment as number) ?? -10;
        changeSummary = `Adjust bid for "${campaign.name}" by ${adjustment}% — ${rule.name}`;
        changeDetail.field = 'bid_amount';
        changeDetail.adjustment_pct = adjustment;
        break;
      }

      case 'create_draft':
      case 'notify':
      default:
        changeSummary = `${action.type} on "${campaign.name}" via ${rule.name}`;
    }

    const conditionDescriptions = rule.conditions.map(
      (c) => `${c.metric} ${c.operator} ${c.value}`,
    );
    const aiReasoning = `Rule "${rule.name}" triggered because: ${conditionDescriptions.join(' AND ')}. ${action.type} action was executed.`;

    return createDraft({
      workspaceId: rule.workspace_id,
      platform,
      campaignId: campaign.id as string,
      draftType,
      changeSummary,
      changeDetail,
      aiReasoning,
      actorType: 'ai',
      actorName: 'AI Agent',
      ruleId: rule.id,
    }) as Promise<Draft>;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: PerformanceAnalyzer
// ═══════════════════════════════════════════════════════════════

/**
 * Statistical performance analysis using:
 *   - Z-score anomaly detection
 *   - Linear regression trend analysis
 *   - Welch's t-test for significance testing
 *   - Period-over-period comparison
 */
export class PerformanceAnalyzer {
  /** Z-score thresholds for anomaly severity */
  private readonly ANOMALY_THRESHOLDS = {
    low: 2.0,
    medium: 2.5,
    high: 3.0,
    critical: 3.5,
  };

  /** Minimum data points required for analysis */
  private readonly MIN_DATA_POINTS = 3;

  /** Detect anomalies in campaign metrics using z-score method */
  async detectAnomalies(campaignId: string, days: number = 14): Promise<Anomaly[]> {
    const metrics = ['spend', 'ctr', 'cpc', 'cpa', 'roas', 'conversions', 'frequency'];
    const allAnomalies: Anomaly[] = [];

    for (const metric of metrics) {
      const dailyData = await DataFetcher.fetchDailyMetrics(campaignId, metric, days);
      if (dailyData.length < this.MIN_DATA_POINTS) continue;

      const values = dailyData.map((d) => d.value);
      const zScores = StatsUtils.zScores(values);
      const mean = StatsUtils.mean(values);

      for (let i = 0; i < values.length; i++) {
        const absZ = Math.abs(zScores[i]);
        if (absZ < this.ANOMALY_THRESHOLDS.low) continue;

        const severity =
          absZ >= this.ANOMALY_THRESHOLDS.critical
            ? 'critical'
            : absZ >= this.ANOMALY_THRESHOLDS.high
              ? 'high'
              : absZ >= this.ANOMALY_THRESHOLDS.medium
                ? 'medium'
                : 'low';

        allAnomalies.push({
          campaignId,
          metric,
          date: dailyData[i].date,
          value: values[i],
          expectedValue: mean,
          zScore: zScores[i],
          severity,
          direction: zScores[i] > 0 ? 'spike' : 'drop',
        });
      }
    }

    // Sort by severity then by |z-score| descending
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return allAnomalies.sort(
      (a, b) =>
        severityOrder[b.severity] - severityOrder[a.severity] ||
        Math.abs(b.zScore) - Math.abs(a.zScore),
    );
  }

  /** Analyze trend direction and strength using linear regression */
  async analyzeTrend(
    campaignId: string,
    metric: string,
    days: number = 14,
  ): Promise<Trend> {
    const dailyData = await DataFetcher.fetchDailyMetrics(campaignId, metric, days);

    if (dailyData.length < this.MIN_DATA_POINTS) {
      return {
        campaignId,
        metric,
        direction: 'stable',
        strength: 0,
        slope: 0,
        rSquared: 0,
        forecast7d: 0,
        confidence: 0,
        dataPoints: dailyData.length,
      };
    }

    const xs = dailyData.map((_, i) => i); // Day index
    const ys = dailyData.map((d) => d.value);

    const regression = StatsUtils.linearRegression(xs, ys);

    // Determine direction
    let direction: 'up' | 'down' | 'stable';
    if (Math.abs(regression.slope) < 1e-10) {
      direction = 'stable';
    } else {
      direction = regression.slope > 0 ? 'up' : 'down';
    }

    // Strength based on r-squared and slope magnitude
    const normalizedSlope =
      StatsUtils.mean(ys) === 0
        ? 0
        : Math.abs(regression.slope) / StatsUtils.mean(ys);
    const strength = Math.min(1, regression.rSquared * 0.7 + Math.min(normalizedSlope, 0.3));

    // 7-day forecast
    const forecast7d = regression.predict(xs.length + 7);

    // Confidence based on data points and r-squared
    const confidence = Math.min(
      1,
      (dailyData.length / 30) * 0.3 + regression.rSquared * 0.7,
    );

    return {
      campaignId,
      metric,
      direction,
      strength,
      slope: regression.slope,
      rSquared: regression.rSquared,
      forecast7d,
      confidence,
      dataPoints: dailyData.length,
    };
  }

  /** Compare current period to previous period */
  async comparePeriods(
    campaignId: string,
    currentDays: number = 7,
    previousDays: number = 7,
  ): Promise<Comparison[]> {
    const metrics = ['spend', 'ctr', 'cpc', 'cpa', 'roas', 'conversions'];
    const comparisons: Comparison[] = [];

    for (const metric of metrics) {
      const dailyData = await DataFetcher.fetchDailyMetrics(
        campaignId,
        metric,
        currentDays + previousDays,
      );

      if (dailyData.length < this.MIN_DATA_POINTS) continue;

      const currentData = dailyData.slice(-currentDays);
      const previousData = dailyData.slice(0, Math.max(0, dailyData.length - currentDays));

      if (currentData.length < 2 || previousData.length < 2) continue;

      const currentValues = currentData.map((d) => d.value);
      const previousValues = previousData.map((d) => d.value);

      const currentAvg = StatsUtils.mean(currentValues);
      const previousAvg = StatsUtils.mean(previousValues);
      const currentSum = currentValues.reduce((s, v) => s + v, 0);
      const previousSum = previousValues.reduce((s, v) => s + v, 0);

      const changePct = previousAvg === 0 ? 0 : ((currentAvg - previousAvg) / previousAvg) * 100;

      // Statistical significance
      const sig = this.calculateSignificance(currentValues, previousValues);

      comparisons.push({
        campaignId,
        metric,
        currentPeriod: {
          start: currentData[0]?.date ?? '',
          end: currentData[currentData.length - 1]?.date ?? '',
          avg: currentAvg,
          sum: currentSum,
        },
        previousPeriod: {
          start: previousData[0]?.date ?? '',
          end: previousData[previousData.length - 1]?.date ?? '',
          avg: previousAvg,
          sum: previousSum,
        },
        changePct,
        changeAbs: currentAvg - previousAvg,
        significant: sig.significant,
        pValue: sig.pValue,
      });
    }

    return comparisons;
  }

  /**
   * Calculate statistical significance of changes between two periods.
   * Uses Welch's t-test for unequal variances.
   */
  calculateSignificance(
    current: number[],
    previous: number[],
  ): { significant: boolean; pValue: number } {
    if (current.length < 2 || previous.length < 2) {
      return { significant: false, pValue: 1 };
    }

    const { pValue } = StatsUtils.welchsTTest(current, previous);
    // Standard p < 0.05 for significance
    const significant = pValue < 0.05;

    return { significant, pValue };
  }

  /** Batch analyze trends for multiple campaigns */
  async batchAnalyzeTrends(
    campaignIds: string[],
    metric: string,
    days: number = 14,
  ): Promise<Trend[]> {
    const trends = await Promise.all(
      campaignIds.map((id) => this.analyzeTrend(id, metric, days)),
    );
    return trends;
  }

  /** Get a summary score of campaign health (0-100) */
  async calculateHealthScore(campaignId: string): Promise<number> {
    const comparisons = await this.comparePeriods(campaignId, 7, 7);
    const anomalies = await this.detectAnomalies(campaignId, 14);

    if (comparisons.length === 0 && anomalies.length === 0) return 50; // No data

    // Start at 100, deduct for issues
    let score = 100;

    // Deduct for anomalies
    const criticalCount = anomalies.filter((a) => a.severity === 'critical').length;
    const highCount = anomalies.filter((a) => a.severity === 'high').length;
    const medCount = anomalies.filter((a) => a.severity === 'medium').length;
    score -= criticalCount * 20 + highCount * 10 + medCount * 5;

    // Deduct for declining metrics
    for (const comp of comparisons) {
      if (!comp.significant) continue;
      const isBadDecline =
        (comp.metric === 'roas' || comp.metric === 'ctr' || comp.metric === 'conversions') &&
        comp.changePct < 0;
      const isBadIncrease =
        (comp.metric === 'cpa' || comp.metric === 'cpc') && comp.changePct > 0;
      if (isBadDecline || isBadIncrease) {
        score -= Math.min(15, Math.abs(comp.changePct));
      }
    }

    return Math.max(0, Math.min(100, score));
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: RecommendationGenerator
// ═══════════════════════════════════════════════════════════════

/**
 * Generates prioritized, actionable recommendations across four categories:
 *   1. Budget Reallocation — move budget to highest marginal ROAS campaigns
 *   2. Creative Refresh — identify fatigued creatives
 *   3. Audience Optimization — find audience overlap and expansion
 *   4. Bid Adjustment — optimize bids for cost efficiency
 */
export class RecommendationGenerator {
  private readonly analyzer: PerformanceAnalyzer;

  constructor() {
    this.analyzer = new PerformanceAnalyzer();
  }

  /** Generate all prioritized recommendations for a workspace */
  async generateRecommendations(workspaceId: string): Promise<Recommendation[]> {
    const [budgetRecs, creativeRecs, audienceRecs, bidRecs] = await Promise.all([
      this.recommendBudgetReallocation(workspaceId),
      this.recommendCreativeRefresh(workspaceId),
      this.recommendAudienceOptimization(workspaceId),
      this.recommendBidAdjustment(workspaceId),
    ]);

    const all = [
      ...budgetRecs.map((r) => this.convertBudgetRec(r)),
      ...creativeRecs.map((r) => this.convertCreativeRec(r)),
      ...audienceRecs.map((r) => this.convertAudienceRec(r)),
      ...bidRecs.map((r) => this.convertBidRec(r)),
    ];

    // Sort by priority descending
    return all.sort((a, b) => b.priority - a.priority);
  }

  // ─── Budget Reallocation ───────────────────────────────────

  async recommendBudgetReallocation(workspaceId: string): Promise<BudgetRecommendation[]> {
    const campaigns = await DataFetcher.fetchCampaigns(workspaceId);
    if (campaigns.length < 2) return [];

    // Calculate marginal ROAS for each campaign
    const campaignMetrics: Array<{
      campaign: Campaign;
      marginalRoas: number;
      trend: Trend | null;
      spendEfficiency: number;
    }> = await Promise.all(
      campaigns.map(async (c) => {
        const trend = await this.analyzer.analyzeTrend(c.id, 'roas', 14).catch(() => null);
        // Marginal ROAS: recent ROAS weighted by trend direction
        const marginalRoas = trend
          ? c.roas * (1 + trend.slope * 7 * Math.max(0, trend.rSquared))
          : c.roas;
        const spendEfficiency = c.spend > 0 ? (c.conversions * c.roas) / c.spend : 0;
        return { campaign: c, marginalRoas, trend, spendEfficiency };
      }),
    );

    // Sort by marginal ROAS descending
    campaignMetrics.sort((a, b) => b.marginalRoas - a.marginalRoas);

    const topPerformers = campaignMetrics.slice(0, Math.ceil(campaignMetrics.length * 0.3));
    const lowPerformers = campaignMetrics.slice(-Math.ceil(campaignMetrics.length * 0.3));

    if (topPerformers.length === 0 || lowPerformers.length === 0) return [];

    // Build current and proposed allocations
    const totalBudget = campaigns.reduce(
      (sum, c) => sum + (c.daily_budget || 0),
      0,
    );

    const currentAllocation: Record<string, number> = {};
    const proposedAllocation: Record<string, number> = {};
    const marginalRoasMap: Record<string, number> = {};

    for (const cm of campaignMetrics) {
      currentAllocation[cm.campaign.id] = cm.campaign.daily_budget || 0;
      marginalRoasMap[cm.campaign.id] = cm.marginalRoas;
    }

    // Propose: increase top performers by 20%, decrease low by 15%
    let reallocated = 0;
    for (const tp of topPerformers) {
      const increase = (tp.campaign.daily_budget || 0) * 0.2;
      proposedAllocation[tp.campaign.id] = (tp.campaign.daily_budget || 0) + increase;
      reallocated += increase;
    }

    for (const lp of lowPerformers) {
      const decrease = Math.min((lp.campaign.daily_budget || 0) * 0.15, reallocated);
      proposedAllocation[lp.campaign.id] = (lp.campaign.daily_budget || 0) - decrease;
      reallocated -= decrease;
    }

    // Keep middle performers unchanged
    for (const cm of campaignMetrics) {
      if (!(cm.campaign.id in proposedAllocation)) {
        proposedAllocation[cm.campaign.id] = cm.campaign.daily_budget || 0;
      }
    }

    const avgTopRoas = StatsUtils.mean(topPerformers.map((t) => t.marginalRoas));
    const avgLowRoas = StatsUtils.mean(lowPerformers.map((l) => l.marginalRoas));
    const expectedImprovement =
      avgLowRoas > 0 ? ((avgTopRoas - avgLowRoas) / avgLowRoas) * 100 : 0;

    const rec: BudgetRecommendation = {
      id: StatsUtils.stableId(
        'budget',
        ...[...topPerformers.map((t) => t.campaign.id), ...lowPerformers.map((l) => l.campaign.id)].sort(),
      ),
      workspaceId,
      type: 'budget_reallocation',
      title: `Reallocate budget to top ${topPerformers.length} performing campaigns`,
      description: `Shift budget from underperforming campaigns (${lowPerformers.map((l) => l.campaign.name).join(', ')}) to high ROAS campaigns (${topPerformers.map((t) => t.campaign.name).join(', ')}).`,
      priority: Math.min(95, 70 + expectedImprovement * 2),
      confidence: expectedImprovement > 50 ? 'high' : expectedImprovement > 20 ? 'medium' : 'low',
      estimatedImpact: {
        metric: 'roas',
        direction: 'increase',
        magnitude: Math.round(expectedImprovement * 10) / 10,
        unit: '%',
      },
      campaignIds: [...topPerformers.map((t) => t.campaign.id), ...lowPerformers.map((l) => l.campaign.id)],
      platform: topPerformers[0]?.campaign.platform ?? 'meta',
      targetEntity: { type: 'workspace', id: workspaceId },
      explanation: `Budget should move from lower marginal ROAS campaigns to higher marginal ROAS campaigns.`,
      evidenceMetrics: [
        { metric: 'top_marginal_roas', value: Number(avgTopRoas.toFixed(2)), unit: 'x', source: 'campaign_metrics' },
        { metric: 'low_marginal_roas', value: Number(avgLowRoas.toFixed(2)), unit: 'x', source: 'campaign_metrics' },
        { metric: 'expected_roas_improvement', value: Number(expectedImprovement.toFixed(1)), unit: '%', source: 'recommendation_engine' },
      ],
      riskLevel: expectedImprovement > 50 ? 'high' : 'medium',
      proposedChanges: Object.entries(proposedAllocation).map(([campaignId, budget]) => ({
        field: 'daily_budget',
        currentValue: currentAllocation[campaignId],
        proposedValue: budget,
      })),
      rollbackCondition: 'Rollback if ROAS drops below pre-change baseline or spend pacing exceeds approved budget after execution.',
      reasoning: `Top campaigns show marginal ROAS of ${avgTopRoas.toFixed(2)}x vs ${avgLowRoas.toFixed(2)}x for low performers. Reallocating budget improves blended ROAS by ~${expectedImprovement.toFixed(1)}%.`,
      model: 'adnexus-recommendation-engine',
      modelVersion: 'v1',
      source: 'deterministic-rules',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      currentAllocation,
      proposedAllocation,
      marginalRoas: marginalRoasMap,
      expectedRoasImprovement: expectedImprovement,
    };

    return [rec];
  }

  // ─── Creative Refresh ──────────────────────────────────────

  async recommendCreativeRefresh(workspaceId: string): Promise<CreativeRecommendation[]> {
    const campaigns = await DataFetcher.fetchCampaigns(workspaceId);
    if (campaigns.length === 0) return [];

    const campaignIds = campaigns.map((c) => c.id);
    const ads = await DataFetcher.fetchAdsByCampaignIds(campaignIds);

    const fatiguedAds = ads.filter(
      (ad) => ad.fatigue_status === 'warning' || ad.fatigue_status === 'critical',
    );

    if (fatiguedAds.length === 0) return [];

    const fatigueScores: Record<string, number> = {};
    for (const ad of fatiguedAds) {
      fatigueScores[ad.id] = ad.fatigue_score;
    }

    const rec: CreativeRecommendation = {
      id: StatsUtils.stableId('creative', ...fatiguedAds.map((a) => a.name).sort()),
      workspaceId,
      type: 'creative_refresh',
      title: `Refresh ${fatiguedAds.length} fatigued creative${fatiguedAds.length > 1 ? 's' : ''}`,
      description: `Creatives showing fatigue signals: ${fatiguedAds.map((a) => `"${a.name}" (score: ${a.fatigue_score})`).join(', ')}. CTR decay and frequency increase detected.`,
      priority: Math.min(90, 60 + fatiguedAds.reduce((max, a) => Math.max(max, a.fatigue_score), 0) * 0.3),
      confidence: fatiguedAds.some((a) => a.fatigue_status === 'critical') ? 'high' : 'medium',
      estimatedImpact: {
        metric: 'ctr',
        direction: 'increase',
        magnitude: 15,
        unit: '%',
      },
      campaignIds: campaigns.filter((c) => fatiguedAds.some((a) => a.adset_id === c.id)).map((c) => c.id),
      platform: campaigns[0]?.platform ?? 'meta',
      targetEntity: { type: 'ad', id: fatiguedAds[0]?.id ?? workspaceId },
      explanation: 'Creative fatigue signals indicate the current ads need a human-approved refresh draft before any platform changes.',
      evidenceMetrics: fatiguedAds.map((ad) => ({
        metric: 'fatigue_score',
        value: ad.fatigue_score,
        source: 'creative_fatigue_detector',
      })),
      riskLevel: fatiguedAds.some((a) => a.fatigue_status === 'critical') ? 'medium' : 'low',
      proposedChanges: [{ field: 'creative_variations', proposedValue: 'Create and review refreshed creative variants' }],
      rollbackCondition: 'Rollback if refreshed creative CTR or conversion rate underperforms the original creative baseline.',
      reasoning: `Creative fatigue detected: CTR declining while frequency rises. Refreshing creatives can restore performance to baseline levels.`,
      model: 'adnexus-recommendation-engine',
      modelVersion: 'v1',
      source: 'deterministic-rules',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      adIds: fatiguedAds.map((a) => a.id),
      fatigueScores,
      suggestedVariations: [
        'Test new headline variations',
        'Swap hero image / video thumbnail',
        'Update call-to-action text',
        'Try different color schemes',
      ],
      estimatedCtrImprovement: 15,
    };

    return [rec];
  }

  // ─── Audience Optimization ─────────────────────────────────

  async recommendAudienceOptimization(workspaceId: string): Promise<AudienceRecommendation[]> {
    // This requires adset data — simplified implementation
    const { data: adsets } = await supabase
      .from('adsets')
      .select('*, campaigns!inner(workspace_id)')
      .eq('campaigns.workspace_id', workspaceId)
      .eq('status', 'active');

    if (!adsets || adsets.length < 2) return [];

    // Estimate audience overlap by checking if targeting is similar
    // In production, this would use platform audience overlap APIs
    const overlapPct = this.estimateAudienceOverlap(adsets as Array<Record<string, unknown>>);

    if (overlapPct < 30) return []; // Low overlap, no issue

    const rec: AudienceRecommendation = {
      id: StatsUtils.stableId('audience', ...[...new Set(adsets.map((a: Record<string, unknown>) => a.campaign_id as string))].sort()),
      workspaceId,
      type: 'audience_optimization',
      title: `Consolidate overlapping audiences (${overlapPct}% overlap detected)`,
      description: `${adsets.length} active adsets show significant audience overlap. Consolidating can reduce internal competition and lower CPMs.`,
      priority: Math.min(80, 40 + overlapPct * 0.4),
      confidence: overlapPct > 60 ? 'high' : 'medium',
      estimatedImpact: {
        metric: 'cpm',
        direction: 'decrease',
        magnitude: Math.round(overlapPct * 0.2 * 10) / 10,
        unit: '%',
      },
      campaignIds: [...new Set(adsets.map((a: Record<string, unknown>) => a.campaign_id as string))],
      platform: 'meta',
      targetEntity: { type: 'audience', id: String(adsets[0]?.id ?? workspaceId) },
      explanation: 'Audience overlap creates internal auction competition; consolidation should be reviewed as a draft before execution.',
      evidenceMetrics: [
        { metric: 'audience_overlap', value: overlapPct, unit: '%', source: 'adset_targeting_similarity' },
        { metric: 'active_adsets', value: adsets.length, source: 'adsets' },
      ],
      riskLevel: overlapPct > 60 ? 'high' : 'medium',
      proposedChanges: [{ field: 'audience_structure', proposedValue: 'Consolidate overlapping adsets and review suggested audiences' }],
      rollbackCondition: 'Rollback if CPM or frequency worsens relative to the pre-consolidation baseline.',
      reasoning: `Audience overlap of ${overlapPct}% causes internal auction competition. Consolidating adsets reduces CPM and improves frequency distribution.`,
      model: 'adnexus-recommendation-engine',
      modelVersion: 'v1',
      source: 'deterministic-rules',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      adsetIds: adsets.map((a: Record<string, unknown>) => a.id as string),
      overlapPct,
      suggestedAudiences: [
        { name: 'Lookalike 1% — Purchasers', type: 'lookalike', estimatedReach: 2500000 },
        { name: 'Interest — Competitor Fans', type: 'interest', estimatedReach: 890000 },
        { name: 'Retargeting — 30d Visitors', type: 'custom', estimatedReach: 45000 },
      ],
    };

    return [rec];
  }

  // ─── Bid Adjustment ────────────────────────────────────────

  async recommendBidAdjustment(workspaceId: string): Promise<BidRecommendation[]> {
    const campaigns = await DataFetcher.fetchCampaigns(workspaceId);
    const recommendations: BidRecommendation[] = [];

    for (const campaign of campaigns) {
      // Skip campaigns with good performance
      if (campaign.roas >= 3 && campaign.cpa <= 5) continue;

      const trend = await this.analyzer.analyzeTrend(campaign.id, 'cpa', 14).catch(() => null);
      if (!trend) continue;

      // If CPA is trending up, suggest bid reduction
      if (trend.direction === 'up' && trend.strength > 0.5 && campaign.cpa > 10) {
        const suggestedBidReduction = -15; // Reduce bids by 15%
        const expectedCpa = campaign.cpa * 0.85;

        recommendations.push({
          id: StatsUtils.stableId('bid', 'reduce', campaign.id),
          workspaceId,
          type: 'bid_adjustment',
          title: `Reduce bids for "${campaign.name}" (CPA trending up)`,
          description: `CPA has increased by ${trend.slope.toFixed(2)}/day over the past 14 days. Reducing bids by 15% should bring CPA back to target.`,
          priority: Math.min(85, 50 + trend.strength * 30),
          confidence: trend.rSquared > 0.6 ? 'high' : 'medium',
          estimatedImpact: {
            metric: 'cpa',
            direction: 'decrease',
            magnitude: 15,
            unit: '%',
          },
          campaignIds: [campaign.id],
          platform: campaign.platform,
          targetEntity: { type: 'campaign', id: campaign.id },
          explanation: 'CPA trend indicates bids may be too aggressive and should be reduced through an approved draft.',
          evidenceMetrics: [
            { metric: 'cpa_trend_slope', value: Number(trend.slope.toFixed(3)), source: 'campaign_metrics' },
            { metric: 'trend_r_squared', value: Number(trend.rSquared.toFixed(2)), source: 'trend_analysis' },
            { metric: 'current_cpa', value: campaign.cpa, source: 'campaign_metrics' },
          ],
          riskLevel: 'medium',
          proposedChanges: [{ field: 'bid_amount', currentValue: campaign.cpc * 2, proposedValue: campaign.cpc * 2 * 0.85 }],
          rollbackCondition: 'Rollback if CPA does not improve or conversion volume drops below baseline after execution.',
          reasoning: `Linear regression on 14d CPA data shows upward trend (r²=${trend.rSquared.toFixed(2)}, slope=${trend.slope.toFixed(3)}). Bid reduction counters rising auction costs.`,
          model: 'adnexus-recommendation-engine',
          modelVersion: 'v1',
          source: 'deterministic-rules',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          adsetId: campaign.id, // In production, use actual adset ID
          currentBid: campaign.cpc * 2, // Approximate
          suggestedBid: campaign.cpc * 2 * 0.85,
          bidStrategy: 'LOWEST_COST_WITH_BID_CAP',
          expectedCpa: Math.round(expectedCpa * 100) / 100,
        });
      }

      // If ROAS is strong and stable, suggest bid increase
      if (campaign.roas > 4 && trend && trend.direction === 'down') {
        recommendations.push({
          id: StatsUtils.stableId('bid', 'increase', campaign.id),
          workspaceId,
          type: 'bid_adjustment',
          title: `Increase bids for "${campaign.name}" (strong ROAS: ${campaign.roas}x)`,
          description: `Campaign shows strong ROAS of ${campaign.roas}x with declining CPA trend. Increasing bids by 10% can capture more volume efficiently.`,
          priority: Math.min(75, 40 + campaign.roas * 5),
          confidence: 'high',
          estimatedImpact: {
            metric: 'conversions',
            direction: 'increase',
            magnitude: 12,
            unit: '%',
          },
          campaignIds: [campaign.id],
          platform: campaign.platform,
          targetEntity: { type: 'campaign', id: campaign.id },
          explanation: 'Strong ROAS with declining CPA indicates bids can be raised, but the live change must remain draft-first.',
          evidenceMetrics: [
            { metric: 'roas', value: campaign.roas, unit: 'x', source: 'campaign_metrics' },
            { metric: 'cpa_trend_slope', value: Number(trend.slope.toFixed(3)), source: 'campaign_metrics' },
          ],
          riskLevel: 'medium',
          proposedChanges: [{ field: 'bid_amount', currentValue: campaign.cpc * 2, proposedValue: campaign.cpc * 2 * 1.1 }],
          rollbackCondition: 'Rollback if CPA rises above target or ROAS drops below the pre-change baseline after execution.',
          reasoning: `High ROAS (${campaign.roas}x) with efficient CPA indicates room to scale bids while maintaining profitability.`,
          model: 'adnexus-recommendation-engine',
          modelVersion: 'v1',
          source: 'deterministic-rules',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          adsetId: campaign.id,
          currentBid: campaign.cpc * 2,
          suggestedBid: campaign.cpc * 2 * 1.1,
          bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
          expectedCpa: campaign.cpa,
        });
      }
    }

    return recommendations;
  }

  // ─── Private Helpers ───────────────────────────────────────

  private estimateAudienceOverlap(adsets: Array<Record<string, unknown>>): number {
    // Simplified: if adsets share the same campaign and have similar targeting,
    // estimate overlap based on targeting similarity
    let overlapScore = 0;
    const comparisons = Math.min(adsets.length * (adsets.length - 1) / 2, 50);

    for (let i = 0; i < Math.min(adsets.length, 10); i++) {
      for (let j = i + 1; j < Math.min(adsets.length, 10); j++) {
        const a = (adsets[i].targeting as Record<string, unknown>) || {};
        const b = (adsets[j].targeting as Record<string, unknown>) || {};

        // Simple heuristic: count shared targeting keys
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        const shared = keysA.filter((k) => keysB.includes(k)).length;
        const similarity = keysA.length > 0 ? shared / keysA.length : 0;
        overlapScore += similarity;
      }
    }

    return comparisons > 0
      ? Math.min(95, Math.round((overlapScore / (comparisons || 1)) * 100))
      : 0;
  }

  private convertBudgetRec(r: BudgetRecommendation): Recommendation {
    return r as Recommendation;
  }
  private convertCreativeRec(r: CreativeRecommendation): Recommendation {
    return r as Recommendation;
  }
  private convertAudienceRec(r: AudienceRecommendation): Recommendation {
    return r as Recommendation;
  }
  private convertBidRec(r: BidRecommendation): Recommendation {
    return r as Recommendation;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: CreativeFatigueDetector
// ═══════════════════════════════════════════════════════════════

/**
 * Analyzes creative lifecycle using three primary signals:
 *   1. CTR decay rate — how fast click-through rate declines
 *   2. Frequency growth — how quickly users see the ad repeatedly
 *   3. Conversion rate decline — drop in conversion efficiency
 *
 * Outputs a 0-100 fatigue score with predictive timeline and refresh strategy.
 */
export class CreativeFatigueDetector {
  /** Thresholds for fatigue status */
  private readonly SCORE_THRESHOLDS = {
    healthy: 30,
    warning: 55,
    critical: 80,
  };

  /** Weightings for fatigue score components */
  private readonly WEIGHTS = {
    ctrDecay: 0.4,
    frequencyGrowth: 0.35,
    conversionDecline: 0.25,
  };

  /** Calculate fatigue scores for all ads in a workspace */
  async calculateFatigueScores(workspaceId: string): Promise<FatigueScore[]> {
    const campaigns = await DataFetcher.fetchCampaigns(workspaceId);
    const campaignIds = campaigns.map((c) => c.id);
    const ads = await DataFetcher.fetchAdsByCampaignIds(campaignIds);

    const scores = await Promise.all(
      ads.map((ad) => this.calculateSingleFatigue(ad)),
    );

    return scores.sort((a, b) => b.score - a.score);
  }

  /** Detect if a specific creative is in declining performance */
  async detectDecliningPerformance(adId: string, days: number = 14): Promise<boolean> {
    const metrics = await DataFetcher.fetchAdDailyMetrics(adId, days);
    if (metrics.length < 7) return false;

    const ctrValues = metrics.map((m) => m.ctr);
    const convRateValues = metrics.map((m) =>
      m.impressions > 0 ? (m.conversions / m.impressions) * 100 : 0,
    );

    const daysIndices = metrics.map((_, i) => i);
    const ctrRegression = StatsUtils.linearRegression(daysIndices, ctrValues);
    const convRegression = StatsUtils.linearRegression(daysIndices, convRateValues);

    // Declining if CTR slope is negative with reasonable fit, and conversion rate declining
    const ctrDeclining = ctrRegression.slope < -0.01 && ctrRegression.rSquared > 0.3;
    const convDeclining =
      convRegression.slope < -0.001 && convRegression.rSquared > 0.2;

    return ctrDeclining && convDeclining;
  }

  /** Predict days until fatigue (score >= 80) for a creative */
  async predictFatigueTimeline(
    adId: string,
  ): Promise<{ daysUntilFatigue: number; confidence: number }> {
    const ad = await this.fetchAd(adId);
    if (!ad) return { daysUntilFatigue: Infinity, confidence: 0 };

    const currentScore = ad.fatigue_score;
    if (currentScore >= this.SCORE_THRESHOLDS.critical) {
      return { daysUntilFatigue: 0, confidence: 0.95 };
    }

    const metrics = await DataFetcher.fetchAdDailyMetrics(adId, 14);
    if (metrics.length < 7) {
      // Not enough data — estimate from current score
      const estimatedDays =
        currentScore > 0 ? (this.SCORE_THRESHOLDS.critical - currentScore) / 3 : 30;
      return { daysUntilFatigue: Math.round(estimatedDays), confidence: 0.3 };
    }

    // Calculate score progression over time
    const dailyScores: number[] = [];
    for (let i = 6; i < metrics.length; i++) {
      const window = metrics.slice(Math.max(0, i - 6), i + 1);
      const score = this.computeScoreFromMetrics(window);
      dailyScores.push(score);
    }

    if (dailyScores.length < 3) {
      return { daysUntilFatigue: 14, confidence: 0.4 };
    }

    const xs = dailyScores.map((_, i) => i);
    const regression = StatsUtils.linearRegression(xs, dailyScores);

    // Predict when score reaches critical threshold
    const scoreGap = this.SCORE_THRESHOLDS.critical - dailyScores[dailyScores.length - 1];
    if (regression.slope <= 0) {
      // Score not increasing — unlikely to fatigue soon
      return { daysUntilFatigue: 60, confidence: 0.4 };
    }

    const daysUntilFatigue = Math.ceil(scoreGap / regression.slope);
    const confidence = Math.min(0.9, regression.rSquared * 0.8 + dailyScores.length * 0.02);

    return {
      daysUntilFatigue: Math.max(0, daysUntilFatigue),
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /** Suggest a refresh strategy for a fatigued creative */
  async suggestRefreshStrategy(adId: string): Promise<RefreshStrategy> {
    const ad = await this.fetchAd(adId);
    const score = ad?.fatigue_score ?? 50;
    const isDeclining = await this.detectDecliningPerformance(adId, 14);

    let strategy: RefreshStrategy['strategy'];
    const steps: string[] = [];
    let ctrImprovement = 15;
    let cpaReduction = 10;

    if (score >= this.SCORE_THRESHOLDS.critical || (score >= this.SCORE_THRESHOLDS.warning && isDeclining)) {
      strategy = 'replace';
      steps.push(
        'Create new creative with different visual concept',
        'Test 2-3 variations in A/B test',
        'Gradually shift budget from fatigued to new creative',
        'Monitor first 48 hours closely',
      );
      ctrImprovement = 25;
      cpaReduction = 18;
    } else if (score >= this.SCORE_THRESHOLDS.warning) {
      strategy = 'rotate';
      steps.push(
        'Pause fatigued creative for 7-14 days',
        'Launch alternate creative from library',
        'Set reminder to re-test original after cooldown',
        'Compare performance on reactivation',
      );
      ctrImprovement = 18;
      cpaReduction = 12;
    } else if (isDeclining) {
      strategy = 'refresh_audience';
      steps.push(
        'Keep creative but change targeting',
        'Test new lookalike audiences',
        'Expand age range or geography',
        'Exclude users who saw ad 3+ times',
      );
      ctrImprovement = 10;
      cpaReduction = 8;
    } else {
      strategy = 'keep_running';
      steps.push(
        'Continue monitoring fatigue score weekly',
        'Prepare backup creatives just in case',
        'No action needed at this time',
      );
      ctrImprovement = 0;
      cpaReduction = 0;
    }

    return {
      adId,
      strategy,
      confidence: isDeclining ? 0.85 : 0.6,
      steps,
      expectedImpact: {
        ctrImprovementPct: ctrImprovement,
        cpaReductionPct: cpaReduction,
      },
    };
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async calculateSingleFatigue(ad: UnifiedAd): Promise<FatigueScore> {
    const daysSinceLaunch = Math.floor(
      (Date.now() - new Date(ad.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    // Fetch 14-day metrics for decay calculations
    const metrics = await DataFetcher.fetchAdDailyMetrics(ad.id, 14);

    let ctrDecayRate = 0;
    let frequencyGrowthRate = 0;
    let conversionRateDecline = 0;

    if (metrics.length >= 7) {
      // CTR decay: linear regression slope / mean CTR
      const ctrValues = metrics.map((m) => m.ctr);
      const daysIdx = metrics.map((_, i) => i);
      const ctrReg = StatsUtils.linearRegression(daysIdx, ctrValues);
      const meanCtr = StatsUtils.mean(ctrValues);
      ctrDecayRate = meanCtr > 0 ? (-ctrReg.slope / meanCtr) * 100 : 0;

      // Conversion rate decline
      const convRates = metrics.map((m) =>
        m.clicks > 0 ? (m.conversions / m.clicks) * 100 : 0,
      );
      const convReg = StatsUtils.linearRegression(daysIdx, convRates);
      const meanConv = StatsUtils.mean(convRates);
      conversionRateDecline = meanConv > 0 ? (-convReg.slope / meanConv) * 100 : 0;

      // Frequency growth (estimated from impressions/reach)
      const freqValues = metrics.map((m) =>
        m.impressions > 0 ? m.impressions / Math.max(1, m.clicks * 10) : 0,
      );
      const freqReg = StatsUtils.linearRegression(daysIdx, freqValues);
      frequencyGrowthRate = freqReg.slope > 0 ? freqReg.slope * 10 : 0;
    }

    // Clamp rates
    ctrDecayRate = Math.max(0, ctrDecayRate);
    conversionRateDecline = Math.max(0, conversionRateDecline);
    frequencyGrowthRate = Math.max(0, frequencyGrowthRate);

    // Normalize to 0-100 scale
    const normalizedCtrDecay = Math.min(100, ctrDecayRate * 10); // 10% decay/day = 100
    const normalizedConvDecline = Math.min(100, conversionRateDecline * 10);
    const normalizedFreqGrowth = Math.min(100, frequencyGrowthRate * 5);

    // Age penalty: older ads naturally fatigue
    const agePenalty = Math.min(30, daysSinceLaunch * 0.5);

    // Composite score
    const score = Math.min(
      100,
      Math.round(
        normalizedCtrDecay * this.WEIGHTS.ctrDecay +
          normalizedFreqGrowth * this.WEIGHTS.frequencyGrowth +
          normalizedConvDecline * this.WEIGHTS.conversionDecline +
          agePenalty,
      ),
    );

    const status: FatigueScore['status'] =
      score >= this.SCORE_THRESHOLDS.critical
        ? 'exhausted'
        : score >= this.SCORE_THRESHOLDS.warning
          ? 'critical'
          : score >= this.SCORE_THRESHOLDS.healthy
            ? 'warning'
            : 'healthy';

    // Estimate days until fatigue
    const scoreGap = this.SCORE_THRESHOLDS.critical - score;
    const totalDecayRate =
      (ctrDecayRate + conversionRateDecline + frequencyGrowthRate / 2) / 3;
    const estimatedDays =
      totalDecayRate > 0.1 ? Math.round(scoreGap / (totalDecayRate * 3)) : 30;

    return {
      adId: ad.id,
      adName: ad.name,
      campaignId: ad.adset_id,
      score,
      status,
      ctrDecayRate: Math.round(ctrDecayRate * 100) / 100,
      frequencyGrowthRate: Math.round(frequencyGrowthRate * 100) / 100,
      conversionRateDecline: Math.round(conversionRateDecline * 100) / 100,
      daysSinceLaunch,
      estimatedDaysUntilFatigue: Math.max(0, estimatedDays),
    };
  }

  private computeScoreFromMetrics(
    metrics: Array<{
      date: string;
      impressions: number;
      clicks: number;
      conversions: number;
      ctr: number;
    }>,
  ): number {
    if (metrics.length < 2) return 0;
    const first = metrics[0];
    const last = metrics[metrics.length - 1];
    const ctrChange = first.ctr > 0 ? ((first.ctr - last.ctr) / first.ctr) * 100 : 0;
    return Math.min(100, Math.max(0, ctrChange));
  }

  private async fetchAd(adId: string): Promise<UnifiedAd | null> {
    const { data, error } = await supabase.from('ads').select('*').eq('id', adId).single();
    if (error || !data) return null;
    return data as UnifiedAd;
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: BudgetOptimizer
// ═══════════════════════════════════════════════════════════════

/**
 * Budget optimization using marginal ROAS analysis.
 * reallocates budget across campaigns to maximize blended performance.
 *
 * Key Algorithms:
 *   - Marginal ROAS ranking for optimal allocation
 *   - Pacing analysis with spend forecasting
 *   - Linear regression for spend projection
 */
export class BudgetOptimizer {
  /** Minimum ROAS improvement to recommend a change */
  private readonly MIN_ROAS_IMPROVEMENT = 0.1;

  /** Maximum single budget change percentage */
  private readonly MAX_BUDGET_CHANGE_PCT = 30;

  /** Calculate optimal budget allocation using marginal ROAS */
  async optimizeBudgetAllocation(workspaceId: string): Promise<BudgetAllocation[]> {
    const campaigns = await DataFetcher.fetchCampaigns(workspaceId);
    if (campaigns.length === 0) return [];

    // Calculate marginal ROAS for each campaign
    const analyzer = new PerformanceAnalyzer();
    const campaignAnalysis = await Promise.all(
      campaigns.map(async (campaign) => {
        const trend = await analyzer
          .analyzeTrend(campaign.id, 'roas', 14)
          .catch(() => null);

        // Marginal ROAS = current ROAS * (1 + trend_factor)
        const trendFactor = trend
          ? 1 + trend.slope * 7 * Math.max(0, trend.rSquared)
          : 1;
        const marginalRoas = campaign.roas * trendFactor;

        // Spend efficiency: conversions per dollar
        const spendEfficiency =
          campaign.spend > 0 ? campaign.conversions / campaign.spend : 0;

        // Composite score for allocation priority
        const priorityScore = marginalRoas * 0.6 + spendEfficiency * 100 * 0.4;

        return {
          campaign,
          marginalRoas,
          spendEfficiency,
          priorityScore,
          trend,
        };
      }),
    );

    // Sort by priority score descending
    campaignAnalysis.sort((a, b) => b.priorityScore - a.priorityScore);

    const totalBudget = campaigns.reduce(
      (sum, c) => sum + (c.daily_budget || 0),
      0,
    );

    // Calculate optimal allocation: proportional to priority score
    const totalPriority = campaignAnalysis.reduce(
      (sum, ca) => sum + Math.max(0, ca.priorityScore),
      0,
    );

    const allocations: BudgetAllocation[] = campaignAnalysis.map((ca) => {
      const currentBudget = ca.campaign.daily_budget || 0;

      // Allocate budget proportional to priority score
      let optimalBudget =
        totalPriority > 0
          ? (Math.max(0, ca.priorityScore) / totalPriority) * totalBudget
          : currentBudget;

      // Don't change budget by more than MAX_BUDGET_CHANGE_PCT
      const maxBudget = currentBudget * (1 + this.MAX_BUDGET_CHANGE_PCT / 100);
      const minBudget = currentBudget * (1 - this.MAX_BUDGET_CHANGE_PCT / 100);
      optimalBudget = Math.max(minBudget, Math.min(maxBudget, optimalBudget));
      optimalBudget = Math.round(optimalBudget);

      const changeReason = this.buildAllocationReason(ca);

      return {
        campaignId: ca.campaign.id,
        campaignName: ca.campaign.name,
        platform: ca.campaign.platform,
        currentDailyBudget: currentBudget,
        recommendedDailyBudget: optimalBudget,
        marginalRoas: Math.round(ca.marginalRoas * 100) / 100,
        confidence: ca.trend ? ca.trend.confidence : 0.5,
        reason: changeReason,
      };
    });

    return allocations;
  }

  /** Calculate budget pacing status for a campaign */
  async calculatePacing(campaignId: string): Promise<PacingStatus> {
    const campaign = await DataFetcher.fetchCampaign(campaignId);
    if (!campaign) {
      return {
        campaignId,
        status: 'at_risk',
        targetSpend: 0,
        actualSpend: 0,
        projectedSpend: 0,
        pacingPct: 0,
        daysRemaining: 0,
        riskScore: 100,
      };
    }

    const budget = campaign.daily_budget || campaign.lifetime_budget || 0;
    const now = new Date();
    const endDate = campaign.end_date ? new Date(campaign.end_date) : null;
    const daysRemaining = endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    // Calculate expected spend so far (based on time elapsed)
    const startDate = campaign.start_date ? new Date(campaign.start_date) : now;
    const totalDuration = endDate
      ? Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30;
    const elapsedDays = Math.max(1, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const expectedSpendSoFar = budget * elapsedDays;
    const pacingPct = expectedSpendSoFar > 0 ? (campaign.spend / expectedSpendSoFar) * 100 : 100;

    // Project spend to end
    const dailySpendRate = elapsedDays > 0 ? campaign.spend / elapsedDays : 0;
    const projectedSpend = campaign.spend + dailySpendRate * daysRemaining;

    let status: PacingStatus['status'];
    let riskScore = 0;

    if (pacingPct < 70) {
      status = 'under_pacing';
      riskScore = Math.min(100, (70 - pacingPct) * 2);
    } else if (pacingPct > 130) {
      status = 'over_pacing';
      riskScore = Math.min(100, (pacingPct - 130) * 2);
    } else if (daysRemaining <= 3 && projectedSpend > budget * totalDuration * 1.1) {
      status = 'at_risk';
      riskScore = 60;
    } else {
      status = 'on_track';
      riskScore = Math.max(0, 100 - pacingPct);
    }

    return {
      campaignId,
      status,
      targetSpend: budget * totalDuration,
      actualSpend: campaign.spend,
      projectedSpend,
      pacingPct: Math.round(pacingPct * 10) / 10,
      daysRemaining,
      riskScore: Math.round(riskScore),
    };
  }

  /** Forecast spend for remaining days using linear regression */
  async forecastSpend(campaignId: string, daysRemaining: number): Promise<SpendForecast> {
    const campaign = await DataFetcher.fetchCampaign(campaignId);
    if (!campaign) {
      return {
        campaignId,
        projectedDailySpend: 0,
        projectedTotalSpend: 0,
        projectedEndSpend: 0,
        confidenceInterval: [0, 0],
        confidence: 0,
      };
    }

    // Fetch historical daily spend
    const dailyData = await DataFetcher.fetchDailyMetrics(campaignId, 'spend', 14);

    let projectedDailySpend: number;
    let confidence: number;

    if (dailyData.length >= 7) {
      const spendValues = dailyData.map((d) => d.value);
      const daysIdx = dailyData.map((_, i) => i);

      const regression = StatsUtils.linearRegression(daysIdx, spendValues);

      // Project next day
      projectedDailySpend = regression.predict(dailyData.length);
      projectedDailySpend = Math.max(0, projectedDailySpend);

      // Confidence from r-squared
      confidence = Math.min(0.9, regression.rSquared * 0.7 + dailyData.length * 0.02);

      // Confidence interval based on std dev of residuals
      const predictions = daysIdx.map((x) => regression.predict(x));
      const residuals = spendValues.map((v, i) => v - predictions[i]);
      const residualStd = StatsUtils.stdDev(residuals);
      const margin = 1.96 * residualStd; // 95% CI

      const projectedTotal = projectedDailySpend * daysRemaining;
      const projectedEnd = campaign.spend + projectedTotal;

      return {
        campaignId,
        projectedDailySpend: Math.round(projectedDailySpend * 100) / 100,
        projectedTotalSpend: Math.round(projectedTotal * 100) / 100,
        projectedEndSpend: Math.round(projectedEnd * 100) / 100,
        confidenceInterval: [
          Math.round((projectedEnd - margin * daysRemaining) * 100) / 100,
          Math.round((projectedEnd + margin * daysRemaining) * 100) / 100,
        ],
        confidence: Math.round(confidence * 100) / 100,
      };
    } else {
      // Not enough data — use average daily spend
      const elapsedDays = campaign.start_date
        ? Math.max(1, Math.floor(
            (Date.now() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24),
          ))
        : 7;
      const avgDailySpend = campaign.spend / elapsedDays;

      return {
        campaignId,
        projectedDailySpend: Math.round(avgDailySpend * 100) / 100,
        projectedTotalSpend: Math.round(avgDailySpend * daysRemaining * 100) / 100,
        projectedEndSpend: Math.round((campaign.spend + avgDailySpend * daysRemaining) * 100) / 100,
        confidenceInterval: [
          Math.round((campaign.spend + avgDailySpend * daysRemaining * 0.7) * 100) / 100,
          Math.round((campaign.spend + avgDailySpend * daysRemaining * 1.3) * 100) / 100,
        ],
        confidence: 0.4,
      };
    }
  }

  /** Suggest daily budget adjustments for all campaigns in a workspace */
  async suggestDailyBudgets(workspaceId: string): Promise<DailyBudget[]> {
    const allocations = await this.optimizeBudgetAllocation(workspaceId);
    const pacingStatuses = await Promise.all(
      allocations.map((a) => this.calculatePacing(a.campaignId)),
    );

    const pacingMap = new Map(pacingStatuses.map((p) => [p.campaignId, p]));

    return allocations.map((alloc) => {
      const pacing = pacingMap.get(alloc.campaignId);
      const changePct =
        alloc.currentDailyBudget > 0
          ? ((alloc.recommendedDailyBudget - alloc.currentDailyBudget) /
              alloc.currentDailyBudget) *
            100
          : 0;

      let reason = alloc.reason;
      if (pacing?.status === 'over_pacing') {
        reason += ' Campaign is over-pacing; consider reducing budget.';
      } else if (pacing?.status === 'under_pacing') {
        reason += ' Campaign is under-pacing; room to increase budget.';
      }

      return {
        campaignId: alloc.campaignId,
        currentBudget: alloc.currentDailyBudget,
        suggestedBudget: alloc.recommendedDailyBudget,
        changePct: Math.round(changePct * 10) / 10,
        reason,
        confidence: alloc.confidence,
      };
    });
  }

  // ─── Private Helpers ───────────────────────────────────────

  private buildAllocationReason(ca: {
    campaign: Campaign;
    marginalRoas: number;
    spendEfficiency: number;
    trend: Trend | null;
  }): string {
    const parts: string[] = [];
    parts.push(`Marginal ROAS: ${ca.marginalRoas.toFixed(2)}x`);

    if (ca.trend) {
      parts.push(
        `Trend: ${ca.trend.direction} (strength: ${(ca.trend.strength * 100).toFixed(0)}%, r²=${ca.trend.rSquared.toFixed(2)})`,
      );
    }

    if (ca.campaign.roas > 0) {
      parts.push(`Current ROAS: ${ca.campaign.roas}x`);
    }

    if (ca.marginalRoas > ca.campaign.roas * 1.2) {
      parts.push('Trending upward — good candidate for scaling.');
    } else if (ca.marginalRoas < ca.campaign.roas * 0.8) {
      parts.push('Declining performance — consider reducing spend.');
    }

    return parts.join('. ');
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: DraftCreator
// ═══════════════════════════════════════════════════════════════

/**
 * Converts AI recommendations and rule execution results into
 * draft objects for human review and approval.
 * Never applies changes directly to live campaigns.
 */
export class DraftCreator {
  /**
   * Convert a single recommendation into a draft object.
   */
  async createDraftFromRecommendation(
    recommendation: Recommendation,
    workspaceId: string,
  ): Promise<Draft> {
    const { changeSummary, changeDetail, draftType } =
      this.buildChangePayload(recommendation);

    return createDraft({
      workspaceId,
      platform: recommendation.platform,
      campaignId: recommendation.campaignIds[0],
      draftType,
      changeSummary,
      changeDetail: {
        ...changeDetail,
        recommendationId: recommendation.id,
        evidenceMetrics: recommendation.evidenceMetrics,
        estimatedImpact: recommendation.estimatedImpact,
        confidence: recommendation.confidence,
        riskLevel: recommendation.riskLevel,
        proposedChanges: recommendation.proposedChanges,
        rollbackCondition: recommendation.rollbackCondition,
        model: recommendation.model,
        modelVersion: recommendation.modelVersion,
        source: recommendation.source,
        expiresAt: recommendation.expiresAt,
      },
      aiReasoning: recommendation.reasoning,
      impactEstimate: `${recommendation.estimatedImpact.direction} ${recommendation.estimatedImpact.magnitude}${recommendation.estimatedImpact.unit} in ${recommendation.estimatedImpact.metric}`,
      actorType: 'ai',
      actorName: 'AI Agent',
    }) as Promise<Draft>;
  }

  /**
   * Convert a rule execution result into a draft.
   */
  async createDraftFromRuleExecution(
    rule: AIRule,
    campaign: Campaign,
    action: string,
  ): Promise<Draft> {
    const draftTypeMap: Record<string, DraftType> = {
      pause_campaign: 'status_change',
      increase_budget: 'budget_change',
      decrease_budget: 'budget_change',
      adjust_bid: 'bid_adjustment',
      create_draft: 'rule_based',
      scale_budget: 'budget_change',
    };

    const draftType = draftTypeMap[action] ?? 'rule_based';
    const platform = campaign.platform ?? 'meta';

    const changeDetail: Record<string, unknown> = {
      platform_campaign_id: campaign.platform_campaign_id,
      rule_name: rule.name,
      rule_id: rule.id,
    };

    let changeSummary = `${rule.name}: ${action} on ${campaign.name}`;

    switch (action) {
      case 'pause_campaign':
        changeSummary = `Pause "${campaign.name}" — ${rule.name}`;
        changeDetail.field = 'status';
        changeDetail.old_status = campaign.status;
        changeDetail.new_status = 'PAUSED';
        break;
      case 'increase_budget':
      case 'scale_budget': {
        const newBudget = Math.round((campaign.daily_budget || 0) * 1.2);
        changeSummary = `Increase "${campaign.name}" budget by 20% ($${campaign.daily_budget} → $${newBudget})`;
        changeDetail.field = 'daily_budget';
        changeDetail.old_value = campaign.daily_budget;
        changeDetail.new_value = newBudget;
        break;
      }
      case 'decrease_budget':
      case 'reduce_budget': {
        const newBudget = Math.round((campaign.daily_budget || 0) * 0.85);
        changeSummary = `Decrease "${campaign.name}" budget by 15% ($${campaign.daily_budget} → $${newBudget})`;
        changeDetail.field = 'daily_budget';
        changeDetail.old_value = campaign.daily_budget;
        changeDetail.new_value = newBudget;
        break;
      }
      case 'adjust_bid':
        changeSummary = `Adjust bid for "${campaign.name}" — ${rule.name}`;
        changeDetail.field = 'bid_amount';
        break;
    }

    const conditionDescriptions = rule.conditions.map(
      (c) => `${c.metric} ${c.operator} ${c.value}`,
    );
    const aiReasoning = `Rule "${rule.name}" triggered because: ${conditionDescriptions.join(' AND ')}. ${action} action was executed.`;

    return createDraft({
      workspaceId: rule.workspace_id,
      platform,
      campaignId: campaign.id,
      draftType,
      changeSummary,
      changeDetail,
      aiReasoning,
      actorType: 'ai',
      actorName: 'AI Agent',
      ruleId: rule.id,
    }) as Promise<Draft>;
  }

  /**
   * Batch create drafts from multiple recommendations.
   */
  async createDraftsBatch(
    recommendations: Recommendation[],
    workspaceId: string,
  ): Promise<Draft[]> {
    const drafts: Draft[] = [];

    for (const rec of recommendations) {
      try {
        const draft = await this.createDraftFromRecommendation(rec, workspaceId);
        drafts.push(draft);
      } catch (err) {
        logger.error({ recommendationId: rec.id, err }, "Failed to create draft for recommendation");
      }
    }

    return drafts;
  }

  // ─── Private Helpers ───────────────────────────────────────

  private buildChangePayload(recommendation: Recommendation): {
    changeSummary: string;
    changeDetail: Record<string, unknown>;
    draftType: DraftType;
  } {
    switch (recommendation.type) {
      case 'budget_reallocation': {
        const br = recommendation as BudgetRecommendation;
        return {
          changeSummary: recommendation.title,
          changeDetail: {
            type: 'budget_reallocation',
            current_allocation: br.currentAllocation,
            proposed_allocation: br.proposedAllocation,
            marginal_roas: br.marginalRoas,
            expected_roas_improvement: br.expectedRoasImprovement,
          },
          draftType: 'budget_reallocation',
        };
      }

      case 'creative_refresh': {
        const cr = recommendation as CreativeRecommendation;
        return {
          changeSummary: recommendation.title,
          changeDetail: {
            type: 'creative_refresh',
            ad_ids: cr.adIds,
            fatigue_scores: cr.fatigueScores,
            suggested_variations: cr.suggestedVariations,
          },
          draftType: 'creative_upload',
        };
      }

      case 'audience_optimization':
        return {
          changeSummary: recommendation.title,
          changeDetail: {
            type: 'audience_optimization',
            description: recommendation.description,
          },
          draftType: 'targeting_edit',
        };

      case 'bid_adjustment': {
        const bdr = recommendation as BidRecommendation;
        return {
          changeSummary: recommendation.title,
          changeDetail: {
            type: 'bid_adjustment',
            adset_id: bdr.adsetId,
            current_bid: bdr.currentBid,
            suggested_bid: bdr.suggestedBid,
            bid_strategy: bdr.bidStrategy,
            expected_cpa: bdr.expectedCpa,
          },
          draftType: 'bid_adjustment',
        };
      }

      case 'status_change':
        return {
          changeSummary: recommendation.title,
          changeDetail: {
            type: 'status_change',
            description: recommendation.description,
          },
          draftType: 'status_change',
        };

      default:
        return {
          changeSummary: recommendation.title,
          changeDetail: {
            type: recommendation.type,
            description: recommendation.description,
          },
          draftType: 'rule_based',
        };
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: AIEngine — Main Orchestrator
// ═══════════════════════════════════════════════════════════════

/**
 * Main orchestrator class that coordinates all AI subsystems.
 * Provides a unified interface for campaign analysis, recommendation
 * generation, and draft creation.
 */
export class AIEngine {
  readonly ruleEvaluator: RuleEvaluator;
  readonly performanceAnalyzer: PerformanceAnalyzer;
  readonly recommendationGenerator: RecommendationGenerator;
  readonly creativeFatigueDetector: CreativeFatigueDetector;
  readonly budgetOptimizer: BudgetOptimizer;
  readonly draftCreator: DraftCreator;

  constructor() {
    this.ruleEvaluator = new RuleEvaluator();
    this.performanceAnalyzer = new PerformanceAnalyzer();
    this.recommendationGenerator = new RecommendationGenerator();
    this.creativeFatigueDetector = new CreativeFatigueDetector();
    this.budgetOptimizer = new BudgetOptimizer();
    this.draftCreator = new DraftCreator();
  }

  // ─── Primary Entry Points ──────────────────────────────────

  /**
   * Run the complete AI analysis pipeline for a workspace.
   * Returns: { rules, anomalies, recommendations, fatigueScores, budgetAllocations, drafts }
   */
  async analyzeWorkspace(workspaceId: string): Promise<{
    rules: RuleEvaluationResult[];
    anomalies: Anomaly[];
    recommendations: Recommendation[];
    fatigueScores: FatigueScore[];
    budgetAllocations: BudgetAllocation[];
    healthScores: Record<string, number>;
    drafts: Draft[];
  }> {
    // Run independent analyses in parallel
    const [ruleResults, fatigueScores, budgetAllocations] = await Promise.all([
      this.ruleEvaluator.evaluateRules(workspaceId).catch((err) => {
        logger.error({ err }, "Rule evaluation failed");
        return [] as RuleEvaluationResult[];
      }),
      this.creativeFatigueDetector.calculateFatigueScores(workspaceId).catch((err) => {
        logger.error({ err }, "Fatigue detection failed");
        return [] as FatigueScore[];
      }),
      this.budgetOptimizer.optimizeBudgetAllocation(workspaceId).catch((err) => {
        logger.error({ err }, "Budget optimization failed");
        return [] as BudgetAllocation[];
      }),
    ]);

    // Anomaly detection for campaigns that triggered rules
    const campaignIds = [
      ...new Set(
        ruleResults.flatMap((r) => r.matchedCampaigns.map((c) => c.id)),
      ),
    ];

    const anomalies: Anomaly[] = [];
    const healthScores: Record<string, number> = {};

    for (const campaignId of campaignIds) {
      const campaignAnomalies = await this.performanceAnalyzer
        .detectAnomalies(campaignId, 14)
        .catch(() => [] as Anomaly[]);
      anomalies.push(...campaignAnomalies);

      const health = await this.performanceAnalyzer
        .calculateHealthScore(campaignId)
        .catch(() => 50);
      healthScores[campaignId] = health;
    }

    // Generate recommendations
    const recommendations = await this.recommendationGenerator
      .generateRecommendations(workspaceId)
      .catch((err) => {
        logger.error({ err }, "Recommendation generation failed");
        return [] as Recommendation[];
      });

    // Create drafts from high-priority recommendations
    const highPriorityRecs = recommendations.filter((r) => r.priority >= 60);
    const drafts = await this.draftCreator
      .createDraftsBatch(highPriorityRecs, workspaceId)
      .catch((err) => {
        logger.error({ err }, "Draft creation failed");
        return [] as Draft[];
      });

    return {
      rules: ruleResults,
      anomalies,
      recommendations,
      fatigueScores,
      budgetAllocations,
      healthScores,
      drafts,
    };
  }

  /** Quick health check for a single campaign */
  async quickHealthCheck(campaignId: string): Promise<{
    healthScore: number;
    anomalies: Anomaly[];
    trends: Trend[];
    comparison: Comparison[];
  }> {
    const [healthScore, anomalies, roasTrend, cpaTrend, comparison] = await Promise.all([
      this.performanceAnalyzer.calculateHealthScore(campaignId),
      this.performanceAnalyzer.detectAnomalies(campaignId, 14),
      this.performanceAnalyzer.analyzeTrend(campaignId, 'roas', 14),
      this.performanceAnalyzer.analyzeTrend(campaignId, 'cpa', 14),
      this.performanceAnalyzer.comparePeriods(campaignId, 7, 7),
    ]);

    return {
      healthScore,
      anomalies,
      trends: [roasTrend, cpaTrend],
      comparison,
    };
  }

  /** Generate morning brief data for a workspace */
  async generateMorningBrief(workspaceId: string): Promise<{
    recommendations: Recommendation[];
    fatigueAlerts: FatigueScore[];
    pacingAlerts: Array<{ campaignId: string; status: string; riskScore: number }>;
    topAnomalies: Anomaly[];
  }> {
    const [recommendations, fatigueScores, campaigns] = await Promise.all([
      this.recommendationGenerator.generateRecommendations(workspaceId),
      this.creativeFatigueDetector.calculateFatigueScores(workspaceId),
      DataFetcher.fetchCampaigns(workspaceId),
    ]);

    // Pacing alerts
    const pacingStatuses = await Promise.all(
      campaigns.map((c) => this.budgetOptimizer.calculatePacing(c.id)),
    );
    const pacingAlerts = pacingStatuses
      .filter((p) => p.status !== 'on_track')
      .map((p) => ({
        campaignId: p.campaignId,
        status: p.status,
        riskScore: p.riskScore,
      }));

    // Top anomalies
    const allAnomalies: Anomaly[] = [];
    for (const campaign of campaigns.slice(0, 5)) {
      const anomalies = await this.performanceAnalyzer
        .detectAnomalies(campaign.id, 7)
        .catch(() => []);
      allAnomalies.push(...anomalies);
    }

    const topAnomalies = allAnomalies
      .sort((a, b) => {
        const sevOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return sevOrder[b.severity] - sevOrder[a.severity];
      })
      .slice(0, 5);

    return {
      recommendations,
      fatigueAlerts: fatigueScores.filter((f) => f.status !== 'healthy').slice(0, 5),
      pacingAlerts,
      topAnomalies,
    };
  }

  /** Backward-compatible evaluateRules (matches existing service API) */
  async evaluateRules(workspaceId: string): Promise<{ triggered: number; drafts: number }> {
    const results = await this.ruleEvaluator.evaluateRules(workspaceId);
    const triggered = results.filter((r) => r.triggered).length;
    const drafts = results.reduce((sum, r) => sum + r.draftsCreated.length, 0);
    return { triggered, drafts };
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: Rule Presets Factory
// ═══════════════════════════════════════════════════════════════

/**
 * Factory for creating pre-configured automation rules.
 * Each preset encapsulates best-practice conditions and actions.
 */
export class RulePresetFactory {
  /** Create a rule preset by type */
  static createPreset(
    type: RuleType,
    overrides?: Partial<AIRule>,
  ): Omit<AIRule, 'id' | 'workspace_id' | 'applied_count' | 'last_applied_at' | 'created_at'> {
    const presets: Record<
      RuleType,
      Omit<AIRule, 'id' | 'workspace_id' | 'applied_count' | 'last_applied_at' | 'created_at'>
    > = {
      pause_if_cpa_exceeds: {
        name: 'Pause if CPA Exceeds Threshold',
        description: 'Automatically pause campaigns when CPA exceeds target for 3+ consecutive days',
        rule_type: 'pause_if_cpa_exceeds',
        conditions: [
          { metric: 'cpa', operator: 'gt', value: 50 },
        ],
        actions: [{ type: 'pause_campaign', params: { notify: true } }],
        platforms: ['meta', 'google'],
        status: 'active',
      },

      scale_if_roas_exceeds: {
        name: 'Scale Budget on High ROAS',
        description: 'Increase budget by 20% when ROAS exceeds 4x',
        rule_type: 'scale_if_roas_exceeds',
        conditions: [{ metric: 'roas', operator: 'gt', value: 4 }],
        actions: [{ type: 'increase_budget', params: { percentage: 20, max_budget: 1000 } }],
        platforms: ['meta', 'google', 'tiktok'],
        status: 'active',
      },

      alert_if_ctr_drops: {
        name: 'Alert if CTR Drops Below Threshold',
        description: 'Create a draft alert when CTR falls below 0.5%',
        rule_type: 'alert_if_ctr_drops',
        conditions: [{ metric: 'ctr', operator: 'lt', value: 0.5 }],
        actions: [{ type: 'create_draft', params: { notify: true, severity: 'warning' } }],
        platforms: ['meta', 'google', 'tiktok'],
        status: 'active',
      },

      reduce_budget_if_spend_high: {
        name: 'Reduce Budget if Spend Approaches Limit',
        description: 'Reduce budget by 20% when spend exceeds 90% of daily budget',
        rule_type: 'reduce_budget_if_spend_high',
        conditions: [{ metric: 'spend_pct', operator: 'gte', value: 90 }],
        actions: [{ type: 'decrease_budget', params: { percentage: 20 } }],
        platforms: ['meta', 'google', 'tiktok'],
        status: 'active',
      },

      pause_if_no_conversions: {
        name: 'Pause if No Conversions',
        description: 'Pause campaign if zero conversions after 5000 impressions',
        rule_type: 'pause_if_no_conversions',
        conditions: [
          { metric: 'conversions', operator: 'eq', value: 0 },
          { metric: 'impressions', operator: 'gt', value: 5000 },
        ],
        actions: [{ type: 'pause_campaign', params: { reason: 'no_conversions' } }],
        platforms: ['meta', 'google', 'tiktok'],
        status: 'active',
      },

      adjust_bid_if_frequency_high: {
        name: 'Adjust Bid if Frequency Too High',
        description: 'Lower bids by 10% when frequency exceeds 3.0',
        rule_type: 'adjust_bid_if_frequency_high',
        conditions: [{ metric: 'frequency', operator: 'gt', value: 3 }],
        actions: [{ type: 'adjust_bid', params: { adjustment: -10 } }],
        platforms: ['meta'],
        status: 'active',
      },
    };

    const preset = presets[type];
    if (!preset) throw new Error(`Unknown rule type: ${type}`);

    return {
      ...preset,
      ...overrides,
      conditions: overrides?.conditions ?? preset.conditions,
      actions: overrides?.actions ?? preset.actions,
    };
  }

  /** Get all available preset types */
  static getAvailablePresets(): Array<{ type: RuleType; name: string; description: string }> {
    return [
      {
        type: 'pause_if_cpa_exceeds',
        name: 'Pause if CPA Exceeds Threshold',
        description: 'Pause campaigns when CPA exceeds target',
      },
      {
        type: 'scale_if_roas_exceeds',
        name: 'Scale Budget on High ROAS',
        description: 'Increase budget when ROAS exceeds threshold',
      },
      {
        type: 'alert_if_ctr_drops',
        name: 'Alert if CTR Drops',
        description: 'Alert when CTR falls below threshold',
      },
      {
        type: 'reduce_budget_if_spend_high',
        name: 'Reduce Budget if Spend High',
        description: 'Reduce budget when spend approaches limit',
      },
      {
        type: 'pause_if_no_conversions',
        name: 'Pause if No Conversions',
        description: 'Pause if zero conversions after N impressions',
      },
      {
        type: 'adjust_bid_if_frequency_high',
        name: 'Adjust Bid if Frequency High',
        description: 'Lower bids when frequency exceeds threshold',
      },
    ];
  }
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: Exports
// ═══════════════════════════════════════════════════════════════

export { StatsUtils, DataFetcher };

/** Default export: the main AIEngine orchestrator */
export default AIEngine;
