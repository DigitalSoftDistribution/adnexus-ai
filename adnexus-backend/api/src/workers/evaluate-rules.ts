// evaluate-rules.ts — AI Rule Evaluation Worker
// Periodically evaluates all active AI rules and creates drafts when conditions are met.
// Runs every 5 minutes via BullMQ with full observability, caching, and rate-limiting.

import { Worker, Queue, Job, FlowProducer } from "bullmq";
import IORedis from "ioredis";
import { v4 as uuidv4 } from "uuid";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AIRule {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: "critical" | "high" | "normal" | "low";
  conditions: RuleCondition[];
  action: RuleAction;
  dryRun: boolean;
  maxDraftsPerHour: number; // per-workspace rate-limit ceiling
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: string; // e.g. "ctr", "spend", "impressions"
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "in" | "between";
  value: number | string | number[] | string[];
  lookbackHours?: number; // how far back to fetch metrics
}

export interface RuleAction {
  type: "create_draft" | "pause_campaign" | "adjust_budget" | "send_alert";
  payload?: Record<string, unknown>;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  status: "active" | "paused" | "archived";
  metrics: CampaignMetrics;
  settings: Record<string, unknown>;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  ctr: number; // computed
  cpc: number; // computed
  roas: number; // computed
  lookbackHours: number;
}

export interface Draft {
  id: string;
  ruleId: string;
  campaignId: string;
  workspaceId: string;
  title: string;
  description: string;
  suggestedChanges: Record<string, unknown>;
  status: "pending_review" | "approved" | "rejected" | "applied";
  dryRun: boolean;
  createdAt: Date;
}

export interface RuleExecutionLog {
  id: string;
  ruleId: string;
  workspaceId: string;
  campaignId: string;
  triggered: boolean;
  draftId?: string;
  conditionsMet: boolean[];
  processingTimeMs: number;
  errorMessage?: string;
  dryRun: boolean;
  createdAt: Date;
}

export interface EvaluationResult {
  ruleId: string;
  ruleName: string;
  triggered: boolean;
  draftId?: string;
  campaignId?: string;
  dryRun: boolean;
  executionTimeMs: number;
  error?: string;
}

export interface WorkerConfig {
  redis: IORedis;
  queueName?: string;
  cronExpression?: string; // default: every 5 min
  maxDraftsPerHourDefault?: number;
  batchSize?: number; // rules per batch
  conditionCacheTtlMs?: number;
  dryRunDefault?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Interfaces (injected — implemented elsewhere)
// ─────────────────────────────────────────────────────────────────────────────

export interface IRuleRepository {
  findActiveByWorkspace(workspaceId: string): Promise<AIRule[]>;
  findAllActive(): Promise<AIRule[]>;
  findById(ruleId: string): Promise<AIRule | null>;
}

export interface ICampaignRepository {
  findByWorkspace(workspaceId: string, filters?: CampaignFilter): Promise<Campaign[]>;
  findByIds(ids: string[]): Promise<Campaign[]>;
  getMetrics(campaignIds: string[], lookbackHours: number): Promise<Map<string, CampaignMetrics>>;
}

export interface IDraftRepository {
  create(draft: Omit<Draft, "id" | "createdAt">): Promise<Draft>;
  countRecentByWorkspace(workspaceId: string, hours: number): Promise<number>;
}

export interface IExecutionLogRepository {
  create(log: Omit<RuleExecutionLog, "id" | "createdAt">): Promise<RuleExecutionLog>;
  findRecentByRule(ruleId: string, hours: number): Promise<RuleExecutionLog[]>;
}

export interface IEventPublisher {
  publish(event: RuleEvent): Promise<void>;
}

export interface CampaignFilter {
  status?: string[];
  minSpend?: number;
  ids?: string[];
}

export interface RuleEvent {
  type: "rule.triggered" | "rule.evaluated" | "rule.failed" | "draft.created";
  workspaceId: string;
  ruleId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Condition Cache — avoids re-fetching metrics for multiple rules touching
// the same campaigns in the same evaluation cycle.
// ─────────────────────────────────────────────────────────────────────────────

class ConditionCache {
  private cache = new Map<string, CampaignMetrics>();
  private hits = 0;
  private misses = 0;

  constructor(private ttlMs: number = 30000) {}

  private key(campaignId: string, lookbackHours: number): string {
    return `${campaignId}:${lookbackHours}`;
  }

  get(campaignId: string, lookbackHours: number): CampaignMetrics | undefined {
    const k = this.key(campaignId, lookbackHours);
    const entry = this.cache.get(k);
    if (entry) {
      this.hits++;
      return entry;
    }
    this.misses++;
    return undefined;
  }

  set(campaignId: string, lookbackHours: number, metrics: CampaignMetrics): void {
    const k = this.key(campaignId, lookbackHours);
    this.cache.set(k, metrics);
  }

  getStats(): { hits: number; misses: number; ratio: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      ratio: total === 0 ? 0 : this.hits / total,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter — sliding-window counter in Redis
// ─────────────────────────────────────────────────────────────────────────────

class RateLimiter {
  constructor(
    private redis: IORedis,
    private defaultMaxDrafts: number = 50,
  ) {}

  async check(workspaceId: string, maxAllowed?: number): Promise<boolean> {
    const key = `rate_limit:drafts:${workspaceId}`;
    const max = maxAllowed ?? this.defaultMaxDrafts;
    const now = Date.now();
    const windowStart = now - 60 * 60 * 1000; // 1 hour sliding window

    // Remove old entries outside the window
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count entries in current window
    const count = await this.redis.zcard(key);

    if (count >= max) {
      return false; // Rate limit exceeded
    }

    // Add current entry
    await this.redis.zadd(key, now, uuidv4());
    await this.redis.pexpire(key, 60 * 60 * 1000); // expire key after 1 hour

    return true;
  }

  async getRemaining(workspaceId: string, maxAllowed?: number): Promise<number> {
    const key = `rate_limit:drafts:${workspaceId}`;
    const max = maxAllowed ?? this.defaultMaxDrafts;
    const windowStart = Date.now() - 60 * 60 * 1000;

    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await this.redis.zcard(key);

    return Math.max(0, max - count);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule Engine — condition evaluation logic
// ─────────────────────────────────────────────────────────────────────────────

class RuleEngine {
  evaluateCondition(condition: RuleCondition, metrics: CampaignMetrics): boolean {
    const fieldValue = this.extractField(condition.field, metrics);
    if (fieldValue === undefined) return false;

    switch (condition.operator) {
      case "eq":
        return fieldValue === condition.value;
      case "neq":
        return fieldValue !== condition.value;
      case "gt":
        return (fieldValue as number) > (condition.value as number);
      case "gte":
        return (fieldValue as number) >= (condition.value as number);
      case "lt":
        return (fieldValue as number) < (condition.value as number);
      case "lte":
        return (fieldValue as number) <= (condition.value as number);
      case "in":
        if (Array.isArray(condition.value)) {
          return condition.value.includes(fieldValue as string | number);
        }
        return false;
      case "between": {
        const [min, max] = condition.value as number[];
        const v = fieldValue as number;
        return v >= min && v <= max;
      }
      default:
        return false;
    }
  }

  evaluateAllConditions(conditions: RuleCondition[], metrics: CampaignMetrics): boolean[] {
    return conditions.map((c) => this.evaluateCondition(c, metrics));
  }

  private extractField(field: string, metrics: CampaignMetrics): number | string | undefined {
    const map: Record<string, number | string> = {
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      spend: metrics.spend,
      conversions: metrics.conversions,
      ctr: metrics.ctr,
      cpc: metrics.cpc,
      roas: metrics.roas,
    };
    return map[field];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RuleEvaluationWorker — main worker class
// ─────────────────────────────────────────────────────────────────────────────

export class RuleEvaluationWorker {
  private queue: Queue;
  private worker: Worker | null = null;
  private conditionCache: ConditionCache;
  private rateLimiter: RateLimiter;
  private ruleEngine: RuleEngine;
  private flowProducer: FlowProducer;

  // Priority map for ordering: lower number = higher priority
  private readonly PRIORITY_MAP: Record<AIRule["priority"], number> = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  constructor(
    private config: WorkerConfig,
    private deps: {
      ruleRepo: IRuleRepository;
      campaignRepo: ICampaignRepository;
      draftRepo: IDraftRepository;
      executionLogRepo: IExecutionLogRepository;
      eventPublisher: IEventPublisher;
      logger: Logger;
    },
  ) {
    this.conditionCache = new ConditionCache(config.conditionCacheTtlMs ?? 30000);
    this.rateLimiter = new RateLimiter(
      config.redis,
      config.maxDraftsPerHourDefault ?? 50,
    );
    this.ruleEngine = new RuleEngine();
    this.flowProducer = new FlowProducer({ connection: config.redis });

    this.queue = new Queue(config.queueName ?? "rule-evaluation", {
      connection: config.redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 24 * 3600, count: 1000 },
        removeOnFail: { age: 7 * 24 * 3600, count: 5000 },
      },
    });
  }

  // ── BullMQ Worker Lifecycle ────────────────────────────────────────────────

  /**
   * Start the recurring evaluation schedule and the worker.
   * The job runs every 5 minutes by default.
   */
  async start(): Promise<void> {
    const cron = this.config.cronExpression ?? "*/5 * * * *";

    // Remove any existing repeatable job with the same pattern
    const existingRepeatables = await this.queue.getRepeatableJobs();
    for (const r of existingRepeatables) {
      if (r.pattern === cron || r.every === 300000) {
        await this.queue.removeRepeatableByKey(r.key);
      }
    }

    await this.queue.add(
      "evaluate-all-workspaces",
      { triggeredAt: new Date().toISOString() },
      { repeat: { pattern: cron }, jobId: "rule-eval-recurring" },
    );

    this.worker = new Worker(
      this.config.queueName ?? "rule-evaluation",
      async (job: Job) => this.processJob(job),
      {
        connection: this.config.redis,
        concurrency: 3,
        lockDuration: 120000, // 2 min lock for long-running evals
        stalledInterval: 30000,
        maxStalledCount: 2,
      },
    );

    this.worker.on("completed", (job) => {
      this.deps.logger.info(`[Worker] Job ${job.id} completed`, {
        jobId: job.id,
        duration: Date.now() - (job.processedOn ?? Date.now()),
      });
    });

    this.worker.on("failed", (job, err) => {
      this.deps.logger.error(`[Worker] Job ${job?.id} failed`, {
        jobId: job?.id,
        error: err.message,
        stack: err.stack,
      });
    });

    this.deps.logger.info("[RuleEvaluationWorker] Started", { cron });
  }

  /**
   * Gracefully shut down the worker and queue.
   */
  async stop(): Promise<void> {
    await this.worker?.close();
    await this.queue.close();
    await this.flowProducer.close();
    this.deps.logger.info("[RuleEvaluationWorker] Stopped");
  }

  /**
   * Route incoming BullMQ jobs to the appropriate handler.
   */
  private async processJob(job: Job): Promise<unknown> {
    const { name, data } = job;

    switch (name) {
      case "evaluate-all-workspaces":
        return this.evaluateAllWorkspaces();

      case "evaluate-workspace": {
        const { workspaceId } = data as { workspaceId: string };
        return this.evaluateWorkspace(workspaceId);
      }

      case "evaluate-rule": {
        const { rule, workspaceId } = data as { rule: AIRule; workspaceId: string };
        const campaigns = await this.deps.campaignRepo.findByWorkspace(workspaceId, {
          status: ["active"],
        });
        const metrics = await this.fetchMetricsWithCache(
          campaigns.map((c) => c.id),
          rule.conditions.map((c) => c.lookbackHours ?? 24),
        );
        const campaignsWithMetrics = campaigns.map((c) => ({
          ...c,
          metrics: metrics.get(c.id) ?? c.metrics,
        }));
        return this.evaluateRule(rule, campaignsWithMetrics);
      }

      default:
        throw new Error(`Unknown job name: ${name}`);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Evaluate rules across ALL workspaces.
   * Used by the recurring 5-minute cron job.
   */
  async evaluateAllWorkspaces(): Promise<void> {
    const startTime = Date.now();
    this.conditionCache.clear();

    this.deps.logger.info("[EvaluateAll] Starting global rule evaluation");

    try {
      const activeRules = await this.deps.ruleRepo.findAllActive();

      // Group rules by workspace for batching
      const workspaceMap = new Map<string, AIRule[]>();
      for (const rule of activeRules) {
        const list = workspaceMap.get(rule.workspaceId) ?? [];
        list.push(rule);
        workspaceMap.set(rule.workspaceId, list);
      }

      this.deps.logger.info(`[EvaluateAll] ${workspaceMap.size} workspaces, ${activeRules.length} rules`);

      // Process workspaces in parallel with concurrency control
      const workspaceIds = Array.from(workspaceMap.keys());
      const batchSize = this.config.batchSize ?? 5;

      for (let i = 0; i < workspaceIds.length; i += batchSize) {
        const batch = workspaceIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (workspaceId) => {
            try {
              await this.evaluateWorkspace(workspaceId);
            } catch (err) {
              this.deps.logger.error(`[EvaluateAll] Workspace ${workspaceId} failed`, {
                error: (err as Error).message,
              });
            }
          }),
        );
      }

      const cacheStats = this.conditionCache.getStats();
      this.deps.logger.info("[EvaluateAll] Complete", {
        durationMs: Date.now() - startTime,
        workspaces: workspaceMap.size,
        rules: activeRules.length,
        cacheHitRatio: cacheStats.ratio.toFixed(2),
      });
    } catch (err) {
      this.deps.logger.error("[EvaluateAll] Fatal error", {
        error: (err as Error).message,
        stack: (err as Error).stack,
      });
      throw err;
    }
  }

  /**
   * Evaluate all active rules for a single workspace.
   * Returns results for each rule indicating trigger status.
   */
  async evaluateWorkspace(workspaceId: string): Promise<EvaluationResult[]> {
    const startTime = Date.now();
    const results: EvaluationResult[] = [];

    this.deps.logger.debug(`[Workspace ${workspaceId}] Starting evaluation`);

    // 1. Load all active rules for this workspace, sorted by priority
    const rules = await this.loadSortedRules(workspaceId);
    if (rules.length === 0) {
      return results;
    }

    // 2. Determine unique lookback windows needed
    const lookbackHoursSet = new Set<number>();
    for (const rule of rules) {
      for (const condition of rule.conditions) {
        lookbackHoursSet.add(condition.lookbackHours ?? 24);
      }
    }

    // 3. Fetch campaigns (all active ones in the workspace)
    const campaigns = await this.deps.campaignRepo.findByWorkspace(workspaceId, {
      status: ["active"],
    });

    if (campaigns.length === 0) {
      this.deps.logger.debug(`[Workspace ${workspaceId}] No active campaigns`);
      return results;
    }

    // 4. Fetch metrics for all lookback windows with caching
    const campaignIds = campaigns.map((c) => c.id);
    const lookbackHoursList = Array.from(lookbackHoursSet);

    for (const hours of lookbackHoursList) {
      await this.fetchMetricsWithCache(campaignIds, [hours]);
    }

    // 5. Enrich campaigns with their cached metrics
    const campaignsById = new Map<string, Campaign>();
    for (const campaign of campaigns) {
      // Default to first lookback, but each rule uses its own
      const defaultMetrics = this.conditionCache.get(campaign.id, lookbackHoursList[0]);
      campaignsById.set(campaign.id, {
        ...campaign,
        metrics: defaultMetrics ?? campaign.metrics,
      });
    }

    // 6. Evaluate each rule in priority order
    for (const rule of rules) {
      const ruleStart = Date.now();

      try {
        // Build campaign list with correct lookback metrics for THIS rule
        const ruleLookback = this.extractLookbackHours(rule);
        const ruleCampaigns = campaigns.map((c) => {
          const cached = this.conditionCache.get(c.id, ruleLookback);
          return { ...c, metrics: cached ?? c.metrics };
        });

        // Check rate limit before processing
        const remaining = await this.rateLimiter.getRemaining(
          workspaceId,
          rule.maxDraftsPerHour,
        );
        if (remaining <= 0) {
          this.deps.logger.warn(`[Workspace ${workspaceId}] Rate limit reached`, {
            ruleId: rule.id,
            maxDrafts: rule.maxDraftsPerHour,
          });

          results.push({
            ruleId: rule.id,
            ruleName: rule.name,
            triggered: false,
            dryRun: rule.dryRun,
            executionTimeMs: Date.now() - ruleStart,
            error: "Rate limit exceeded",
          });
          continue;
        }

        // Evaluate the rule
        const draft = await this.evaluateRule(rule, ruleCampaigns);

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: draft !== null,
          draftId: draft?.id,
          campaignId: draft?.campaignId,
          dryRun: rule.dryRun,
          executionTimeMs: Date.now() - ruleStart,
        });
      } catch (err) {
        this.deps.logger.error(`[Workspace ${workspaceId}] Rule ${rule.id} failed`, {
          error: (err as Error).message,
        });

        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          triggered: false,
          dryRun: rule.dryRun,
          executionTimeMs: Date.now() - ruleStart,
          error: (err as Error).message,
        });
      }
    }

    this.deps.logger.debug(`[Workspace ${workspaceId}] Evaluation complete`, {
      durationMs: Date.now() - startTime,
      rules: rules.length,
      triggered: results.filter((r) => r.triggered).length,
    });

    return results;
  }

  /**
   * Evaluate a single rule against a set of campaigns.
   * Returns a Draft if triggered, null otherwise.
   */
  async evaluateRule(
    rule: AIRule,
    campaigns: Campaign[],
  ): Promise<Draft | null> {
    const startTime = Date.now();

    // Find campaigns that match ALL conditions
    for (const campaign of campaigns) {
      const conditionsMet = this.ruleEngine.evaluateAllConditions(
        rule.conditions,
        campaign.metrics,
      );

      const allMet = conditionsMet.every(Boolean);

      if (allMet) {
        // Conditions met — handle the triggered rule
        const draft = await this.handleTriggeredRule(rule, campaign);

        // Log execution
        await this.logExecution({
          ruleId: rule.id,
          workspaceId: rule.workspaceId,
          campaignId: campaign.id,
          triggered: true,
          draftId: draft.id,
          conditionsMet,
          processingTimeMs: Date.now() - startTime,
          dryRun: rule.dryRun,
        });

        // Publish event
        await this.deps.eventPublisher.publish({
          type: rule.dryRun ? "rule.evaluated" : "rule.triggered",
          workspaceId: rule.workspaceId,
          ruleId: rule.id,
          payload: {
            campaignId: campaign.id,
            draftId: draft.id,
            dryRun: rule.dryRun,
            conditionsMet,
            ruleName: rule.name,
          },
          timestamp: new Date(),
        });

        return draft;
      }
    }

    // No campaign triggered this rule
    await this.logExecution({
      ruleId: rule.id,
      workspaceId: rule.workspaceId,
      campaignId: campaigns[0]?.id ?? "",
      triggered: false,
      conditionsMet: [],
      processingTimeMs: Date.now() - startTime,
      dryRun: rule.dryRun,
    });

    return null;
  }

  /**
   * Handle a triggered rule: create a draft (or dry-run placeholder).
   * Rate-limits draft creation per workspace.
   */
  async handleTriggeredRule(
    rule: AIRule,
    campaign: Campaign,
  ): Promise<Draft> {
    // Rate limit check
    const allowed = await this.rateLimiter.check(
      rule.workspaceId,
      rule.maxDraftsPerHour,
    );

    if (!allowed) {
      const error = new Error(
        `Draft rate limit exceeded for workspace ${rule.workspaceId} (max ${rule.maxDraftsPerHour}/hour)`,
      );
      this.deps.logger.warn(`[Rule ${rule.id}] Rate limited`, {
        workspaceId: rule.workspaceId,
      });
      throw error;
    }

    // Dry run: return a placeholder without persisting
    if (rule.dryRun || this.config.dryRunDefault) {
      const draft: Draft = {
        id: `dryrun-${uuidv4()}`,
        ruleId: rule.id,
        campaignId: campaign.id,
        workspaceId: rule.workspaceId,
        title: `[DRY-RUN] ${rule.name}`,
        description: `Dry run for rule "${rule.name}" on campaign "${campaign.name}". ` +
          `Conditions: ${JSON.stringify(rule.conditions)}`,
        suggestedChanges: rule.action.payload ?? {},
        status: "pending_review",
        dryRun: true,
        createdAt: new Date(),
      };

      this.deps.logger.info(`[Rule ${rule.id}] Dry-run draft created`, {
        draftId: draft.id,
        campaignId: campaign.id,
      });

      await this.deps.eventPublisher.publish({
        type: "draft.created",
        workspaceId: rule.workspaceId,
        ruleId: rule.id,
        payload: {
          draftId: draft.id,
          dryRun: true,
          campaignName: campaign.name,
        },
        timestamp: new Date(),
      });

      return draft;
    }

    // Real draft creation
    const draft = await this.deps.draftRepo.create({
      ruleId: rule.id,
      campaignId: campaign.id,
      workspaceId: rule.workspaceId,
      title: `AI Draft: ${rule.name}`,
      description: `Automatically generated by rule "${rule.name}". ` +
        `Campaign "${campaign.name}" met all conditions: ` +
        rule.conditions.map((c) => `${c.field} ${c.operator} ${c.value}`).join(", "),
      suggestedChanges: rule.action.payload ?? {},
      status: "pending_review",
      dryRun: false,
    });

    this.deps.logger.info(`[Rule ${rule.id}] Draft created`, {
      draftId: draft.id,
      campaignId: campaign.id,
    });

    await this.deps.eventPublisher.publish({
      type: "draft.created",
      workspaceId: rule.workspaceId,
      ruleId: rule.id,
      payload: {
        draftId: draft.id,
        dryRun: false,
        campaignName: campaign.name,
      },
      timestamp: new Date(),
    });

    return draft;
  }

  // ── Queue Helpers ──────────────────────────────────────────────────────────

  /**
   * Enqueue a workspace evaluation job manually (e.g. from an API endpoint).
   */
  async enqueueWorkspaceEvaluation(
    workspaceId: string,
    options?: { priority?: number; delay?: number },
  ): Promise<Job> {
    return this.queue.add(
      "evaluate-workspace",
      { workspaceId, enqueuedAt: new Date().toISOString() },
      {
        priority: options?.priority ?? 5,
        delay: options?.delay ?? 0,
      },
    );
  }

  /**
   * Enqueue evaluation of a specific rule (e.g. after rule creation).
   */
  async enqueueRuleEvaluation(
    rule: AIRule,
    options?: { priority?: number },
  ): Promise<Job> {
    return this.queue.add(
      "evaluate-rule",
      { rule, workspaceId: rule.workspaceId, enqueuedAt: new Date().toISOString() },
      { priority: options?.priority ?? this.PRIORITY_MAP[rule.priority] },
    );
  }

  // ── Internal Helpers ───────────────────────────────────────────────────────

  /**
   * Load active rules for a workspace, sorted by priority (critical first).
   */
  private async loadSortedRules(workspaceId: string): Promise<AIRule[]> {
    const rules = await this.deps.ruleRepo.findActiveByWorkspace(workspaceId);

    return rules.sort((a, b) => {
      const pa = this.PRIORITY_MAP[a.priority] ?? 2;
      const pb = this.PRIORITY_MAP[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;

      // Tie-break: newer rules first
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  /**
   * Fetch campaign metrics, using the condition cache to avoid redundant DB calls.
   */
  private async fetchMetricsWithCache(
    campaignIds: string[],
    lookbackHoursList: number[],
  ): Promise<Map<string, CampaignMetrics>> {
    const result = new Map<string, CampaignMetrics>();

    for (const hours of lookbackHoursList) {
      // Find campaigns not yet in cache for this lookback window
      const missingIds = campaignIds.filter(
        (id) => this.conditionCache.get(id, hours) === undefined,
      );

      if (missingIds.length > 0) {
        const metricsMap = await this.deps.campaignRepo.getMetrics(missingIds, hours);

        for (const [campaignId, metrics] of metricsMap.entries()) {
          this.conditionCache.set(campaignId, hours, metrics);
          result.set(campaignId, metrics);
        }

        // Also cache nulls for campaigns that returned no metrics
        for (const id of missingIds) {
          if (!metricsMap.has(id)) {
            const emptyMetrics = this.createEmptyMetrics(hours);
            this.conditionCache.set(id, hours, emptyMetrics);
            result.set(id, emptyMetrics);
          }
        }
      } else {
        // All cached — just populate result
        for (const id of campaignIds) {
          const cached = this.conditionCache.get(id, hours);
          if (cached) result.set(id, cached);
        }
      }
    }

    return result;
  }

  private createEmptyMetrics(lookbackHours: number): CampaignMetrics {
    return {
      impressions: 0,
      clicks: 0,
      spend: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
      lookbackHours,
    };
  }

  private extractLookbackHours(rule: AIRule): number {
    // Use the max lookbackHours from conditions, default to 24
    const hours = rule.conditions.map((c) => c.lookbackHours ?? 24);
    return Math.max(...hours, 24);
  }

  private async logExecution(
    partial: Omit<RuleExecutionLog, "id" | "createdAt">,
  ): Promise<void> {
    try {
      await this.deps.executionLogRepo.create(partial);
    } catch (err) {
      // Non-fatal: don't let logging failures break rule evaluation
      this.deps.logger.warn("[LogExecution] Failed to persist execution log", {
        error: (err as Error).message,
        ruleId: partial.ruleId,
      });
    }
  }

  // ── Health & Observability ─────────────────────────────────────────────────

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  getCacheStats(): { hits: number; misses: number; ratio: number } {
    return this.conditionCache.getStats();
  }

  /**
   * Purge old execution logs and rate-limit entries.
   */
  async maintenance(): Promise<{
    rateLimitKeysRemoved: number;
    cacheCleared: boolean;
  }> {
    // Clean up old rate-limit entries
    const pattern = "rate_limit:drafts:*";
    const keys = await this.config.redis.keys(pattern);
    let removed = 0;

    for (const key of keys) {
      const count = await this.config.redis.zremrangebyscore(
        key,
        0,
        Date.now() - 60 * 60 * 1000,
      );
      removed += count;
    }

    this.conditionCache.clear();

    return { rateLimitKeysRemoved: removed, cacheCleared: true };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Logger Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface Logger {
  info(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory — convenient DI wiring helper
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkerDependencies {
  ruleRepo: IRuleRepository;
  campaignRepo: ICampaignRepository;
  draftRepo: IDraftRepository;
  executionLogRepo: IExecutionLogRepository;
  eventPublisher: IEventPublisher;
  logger: Logger;
}

export function createRuleEvaluationWorker(
  redis: IORedis,
  deps: WorkerDependencies,
  overrides?: Partial<WorkerConfig>,
): RuleEvaluationWorker {
  const config: WorkerConfig = {
    redis,
    queueName: "rule-evaluation",
    cronExpression: "*/5 * * * *",
    maxDraftsPerHourDefault: 50,
    batchSize: 5,
    conditionCacheTtlMs: 30000,
    dryRunDefault: false,
    ...overrides,
  };

  return new RuleEvaluationWorker(config, deps);
}
