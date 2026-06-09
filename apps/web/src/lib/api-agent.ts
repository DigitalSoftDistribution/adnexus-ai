import { api, apiGet, apiPost, apiPut, apiDelete } from './api-base';
import type { PendingDraft } from './api-drafts';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demo mode detection */
function isDemoMode(): boolean {
  return !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused';
  isActive?: boolean;
  platform: string;
  platforms?: string[];
  condition: RuleCondition;
  conditions?: RuleCondition[];
  action: RuleAction;
  actions?: RuleAction[];
  conditionLogic?: 'and' | 'or';
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  lastAppliedAt?: string;
  triggerCount: number;
  appliedCount?: number;
}

export interface RuleCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow?: string;
}

export interface RuleAction {
  type: string;
  params: Record<string, unknown>;
}

export interface OptimizationLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleDescription?: string;
  campaignId: string;
  campaignName: string;
  action: string;
  actionType?: string;
  details: string;
  beforeValue?: number;
  afterValue?: number;
  result?: string;
  status: 'success' | 'warning' | 'error' | 'pending';
  createdAt: string;
}


export interface AgentStatus {
  status?: 'active' | 'paused';
  isRunning: boolean;
  lastRun?: string;
  nextScheduledRun?: string;
  rulesActive: number;
  rulesPaused: number;
  rulesTotal?: number;
  optimizationsToday: number;
  pendingDrafts: number;
  draftsCreatedToday?: number;
  optimizationsApplied?: number;
  budgetSaved?: number;
  creditsTotal?: number;
  creditsUsed?: number;
  recentLogs: OptimizationLogEntry[];
}

export interface AIRecommendation {
  id: string;
  severity: string;
  type: string;
  title: string;
  description: string;
  metric: string;
  campaign: string;
  platform: string;
  confidence: number;
  impact: string;
  createdAt: string;
  status?: string;
  sparklineData?: number[];
}

/* ──────────────── Agent Mock Data ──────────────── */

let MOCK_AGENT_RULES: AutomationRule[] = [
  {
    id: 'rule_1', name: 'High CPA Auto-Pause', description: 'Pause campaigns when CPA exceeds threshold for 3+ days',
    status: 'active', platform: 'Meta', platforms: ['Meta'],
    condition: { metric: 'cpa', operator: 'gt', value: 50, timeWindow: '3d' },
    conditions: [{ metric: 'cpa', operator: 'gt', value: 50, timeWindow: '3d' }],
    action: { type: 'pause_campaign', params: { notify: true } },
    actions: [{ type: 'pause_campaign', params: { notify: true } }],
    conditionLogic: 'and',
    createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-06-18T14:00:00Z',
    lastTriggered: '2026-06-18T08:30:00Z', lastAppliedAt: '2026-06-18T08:30:00Z',
    triggerCount: 23, appliedCount: 23,
  },
  {
    id: 'rule_2', name: 'ROAS Scale Winner', description: 'Increase budget 20% when ROAS > 4x for 2 consecutive days',
    status: 'active', platform: 'All', platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    condition: { metric: 'roas', operator: 'gt', value: 4, timeWindow: '2d' },
    conditions: [{ metric: 'roas', operator: 'gt', value: 4, timeWindow: '2d' }],
    action: { type: 'increase_budget', params: { percentage: 20, cap: 1000 } },
    actions: [{ type: 'increase_budget', params: { percentage: 20, cap: 1000 } }],
    conditionLogic: 'and',
    createdAt: '2026-01-20T09:00:00Z', updatedAt: '2026-06-17T16:00:00Z',
    lastTriggered: '2026-06-17T10:15:00Z', lastAppliedAt: '2026-06-17T10:15:00Z',
    triggerCount: 45, appliedCount: 45,
  },
  {
    id: 'rule_3', name: 'Low CTR Creative Alert', description: 'Flag creatives with CTR below 0.5% after 10k impressions',
    status: 'active', platform: 'Meta', platforms: ['Meta'],
    condition: { metric: 'ctr', operator: 'lt', value: 0.5, timeWindow: '7d' },
    conditions: [{ metric: 'ctr', operator: 'lt', value: 0.5, timeWindow: '7d' }, { metric: 'impressions', operator: 'gt', value: 10000, timeWindow: '7d' }],
    action: { type: 'notify_team', params: { channel: 'slack', message: 'Creative fatigue detected' } },
    actions: [{ type: 'notify_team', params: { channel: 'slack', message: 'Creative fatigue detected' } }],
    conditionLogic: 'and',
    createdAt: '2026-02-01T11:00:00Z', updatedAt: '2026-06-15T10:00:00Z',
    lastTriggered: '2026-06-15T06:00:00Z', lastAppliedAt: '2026-06-15T06:00:00Z',
    triggerCount: 18, appliedCount: 18,
  },
  {
    id: 'rule_4', name: 'Weekend Budget Reduction', description: 'Reduce weekend spend by 30% for B2B campaigns',
    status: 'paused', platform: 'Google', platforms: ['Google'],
    condition: { metric: 'spend', operator: 'gt', value: 500, timeWindow: '1d' },
    conditions: [{ metric: 'spend', operator: 'gt', value: 500, timeWindow: '1d' }],
    action: { type: 'decrease_budget', params: { percentage: 30, schedule: 'weekend' } },
    actions: [{ type: 'decrease_budget', params: { percentage: 30, schedule: 'weekend' } }],
    conditionLogic: 'and',
    createdAt: '2026-03-01T08:00:00Z', updatedAt: '2026-05-20T12:00:00Z',
    lastTriggered: '2026-05-18T00:00:00Z', lastAppliedAt: '2026-05-18T00:00:00Z',
    triggerCount: 12, appliedCount: 8,
  },
  {
    id: 'rule_5', name: 'Frequency Cap Monitor', description: 'Alert when ad frequency exceeds 3x in 7 days',
    status: 'active', platform: 'Meta', platforms: ['Meta', 'Snap'],
    condition: { metric: 'frequency', operator: 'gt', value: 3, timeWindow: '7d' },
    conditions: [{ metric: 'frequency', operator: 'gt', value: 3, timeWindow: '7d' }],
    action: { type: 'create_alert', params: { severity: 'warning', notify: true } },
    actions: [{ type: 'create_alert', params: { severity: 'warning', notify: true } }],
    conditionLogic: 'and',
    createdAt: '2026-03-10T14:00:00Z', updatedAt: '2026-06-18T09:00:00Z',
    lastTriggered: '2026-06-18T03:00:00Z', lastAppliedAt: '2026-06-18T03:00:00Z',
    triggerCount: 31, appliedCount: 31,
  },
  {
    id: 'rule_6', name: 'Underperforming Pause', description: 'Auto-pause campaigns with 0 conversions after $200 spend',
    status: 'active', platform: 'All', platforms: ['Meta', 'Google', 'TikTok', 'Snap'],
    condition: { metric: 'conversions', operator: 'eq', value: 0, timeWindow: '7d' },
    conditions: [{ metric: 'conversions', operator: 'eq', value: 0, timeWindow: '7d' }, { metric: 'spend', operator: 'gt', value: 200, timeWindow: '7d' }],
    action: { type: 'pause_campaign', params: { createDraft: true } },
    actions: [{ type: 'pause_campaign', params: { createDraft: true } }],
    conditionLogic: 'and',
    createdAt: '2026-04-01T10:00:00Z', updatedAt: '2026-06-16T11:00:00Z',
    lastTriggered: '2026-06-16T08:00:00Z', lastAppliedAt: '2026-06-16T08:00:00Z',
    triggerCount: 9, appliedCount: 9,
  },
  {
    id: 'rule_7', name: 'TikTok Trending Scale', description: 'Scale TikTok campaigns when video completion rate > 45%',
    status: 'active', platform: 'TikTok', platforms: ['TikTok'],
    condition: { metric: 'roas', operator: 'gt', value: 3.5, timeWindow: '2d' },
    conditions: [{ metric: 'roas', operator: 'gt', value: 3.5, timeWindow: '2d' }],
    action: { type: 'increase_budget', params: { percentage: 25, cap: 500 } },
    actions: [{ type: 'increase_budget', params: { percentage: 25, cap: 500 } }],
    conditionLogic: 'and',
    createdAt: '2026-04-15T09:00:00Z', updatedAt: '2026-06-18T07:00:00Z',
    lastTriggered: '2026-06-18T05:00:00Z', lastAppliedAt: '2026-06-18T05:00:00Z',
    triggerCount: 16, appliedCount: 16,
  },
  {
    id: 'rule_8', name: 'Snap Budget Pacing', description: 'Adjust Snap bids when CPA trends above $40',
    status: 'paused', platform: 'Snap', platforms: ['Snap'],
    condition: { metric: 'cpa', operator: 'gt', value: 40, timeWindow: '2d' },
    conditions: [{ metric: 'cpa', operator: 'gt', value: 40, timeWindow: '2d' }],
    action: { type: 'adjust_bid', params: { adjustment: -15 } },
    actions: [{ type: 'adjust_bid', params: { adjustment: -15 } }],
    conditionLogic: 'and',
    createdAt: '2026-05-01T10:00:00Z', updatedAt: '2026-06-10T12:00:00Z',
    lastTriggered: '2026-06-10T04:00:00Z', lastAppliedAt: '2026-06-10T04:00:00Z',
    triggerCount: 7, appliedCount: 7,
  },
];

let MOCK_OPTIMIZATION_LOGS: OptimizationLogEntry[] = [
  { id: 'log_1', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c1', campaignName: 'Summer Sale 2026', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 4.2x exceeded threshold for 2 days. Budget: $400 -> $480', beforeValue: 400, afterValue: 480, result: 'success', status: 'success', createdAt: '2026-06-18T08:30:00Z' },
  { id: 'log_2', ruleId: 'rule_1', ruleName: 'High CPA Auto-Pause', campaignId: 'c9', campaignName: 'YouTube - Product Demo', action: 'Created pause draft', actionType: 'pause_campaign', details: 'CPA $72.3 exceeded $50 threshold for 3 days.', beforeValue: 72.3, afterValue: 0, result: 'pending_approval', status: 'warning', createdAt: '2026-06-18T07:15:00Z' },
  { id: 'log_3', ruleId: 'rule_5', ruleName: 'Frequency Cap Monitor', campaignId: 'c4', campaignName: 'Lookalike - Purchasers', action: 'Alert: Frequency at 3.2x', actionType: 'create_alert', details: 'Ad frequency reached 3.2x in 7 days. Consider creative refresh.', beforeValue: 2.8, afterValue: 3.2, result: 'alert_sent', status: 'success', createdAt: '2026-06-18T06:00:00Z' },
  { id: 'log_4', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c6', campaignName: 'Search - Brand Terms', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 6.1x exceeded threshold. Budget: $350 -> $420', beforeValue: 350, afterValue: 420, result: 'success', status: 'success', createdAt: '2026-06-18T05:45:00Z' },
  { id: 'log_5', ruleId: 'rule_7', ruleName: 'TikTok Trending Scale', campaignId: 'c11', campaignName: 'FYP - Viral Hook', action: 'Increased budget by 25%', actionType: 'increase_budget', details: 'ROAS 3.9x on TikTok. Budget: $280 -> $350', beforeValue: 280, afterValue: 350, result: 'success', status: 'success', createdAt: '2026-06-18T05:00:00Z' },
  { id: 'log_6', ruleId: 'rule_3', ruleName: 'Low CTR Creative Alert', campaignId: 'c2', campaignName: 'Brand Awareness Q2', action: 'Flagged 2 underperforming creatives', actionType: 'notify_team', details: 'Carousel ad CTR dropped to 0.4% after 45k impressions.', beforeValue: 1.8, afterValue: 0.4, result: 'alert_sent', status: 'warning', createdAt: '2026-06-18T04:20:00Z' },
  { id: 'log_7', ruleId: 'rule_6', ruleName: 'Underperforming Pause', campaignId: 'c14', campaignName: 'TopView - Launch', action: 'Created pause draft', actionType: 'pause_campaign', details: '0 conversions after $215 spend in 7 days.', beforeValue: 0, afterValue: 0, result: 'pending_approval', status: 'warning', createdAt: '2026-06-18T03:00:00Z' },
  { id: 'log_8', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c3', campaignName: 'Retargeting - Cart Abandoners', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 5.8x strong performance. Budget: $180 -> $216', beforeValue: 180, afterValue: 216, result: 'success', status: 'success', createdAt: '2026-06-17T22:00:00Z' },
  { id: 'log_9', ruleId: 'rule_1', ruleName: 'High CPA Auto-Pause', campaignId: 'c8', campaignName: 'Display - Remarketing', action: 'Decreased bid by 15%', actionType: 'adjust_bid', details: 'CPA $44.2 trending above $50. Taking preventive action.', beforeValue: 44.2, afterValue: 37.6, result: 'success', status: 'success', createdAt: '2026-06-17T18:30:00Z' },
  { id: 'log_10', ruleId: 'rule_5', ruleName: 'Frequency Cap Monitor', campaignId: 'c16', campaignName: 'Snap Ads - App Install', action: 'Alert: Frequency climbing', actionType: 'create_alert', details: 'Frequency at 2.8x, approaching 3x cap.', beforeValue: 2.1, afterValue: 2.8, result: 'alert_sent', status: 'success', createdAt: '2026-06-17T14:00:00Z' },
  { id: 'log_11', ruleId: 'rule_7', ruleName: 'TikTok Trending Scale', campaignId: 'c12', campaignName: 'Spark Ads - UGC', action: 'Increased budget by 25%', actionType: 'increase_budget', details: 'ROAS 4.5x on Spark Ads. Budget: $200 -> $250', beforeValue: 200, afterValue: 250, result: 'success', status: 'success', createdAt: '2026-06-17T10:15:00Z' },
  { id: 'log_12', ruleId: 'rule_3', ruleName: 'Low CTR Creative Alert', campaignId: 'c18', campaignName: 'AR Lens - Branded', action: 'Flagged creative fatigue', actionType: 'notify_team', details: 'AR Lens CTR at 0.3% with 78k impressions. Recommend refresh.', beforeValue: 0.8, afterValue: 0.3, result: 'alert_sent', status: 'warning', createdAt: '2026-06-17T08:00:00Z' },
  { id: 'log_13', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c19', campaignName: 'Collection - Products', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 3.3x exceeded threshold. Budget: $160 -> $192', beforeValue: 160, afterValue: 192, result: 'success', status: 'success', createdAt: '2026-06-17T06:30:00Z' },
  { id: 'log_14', ruleId: 'rule_6', ruleName: 'Underperforming Pause', campaignId: 'c5', campaignName: 'Holiday Preview', action: 'Skipped - Ended campaign', actionType: 'pause_campaign', details: 'Campaign already ended. No action needed.', beforeValue: 0, afterValue: 0, result: 'skipped', status: 'success', createdAt: '2026-06-17T04:00:00Z' },
  { id: 'log_15', ruleId: 'rule_1', ruleName: 'High CPA Auto-Pause', campaignId: 'c17', campaignName: 'Story Ads - Promo', action: 'Alert: CPA trending up', actionType: 'create_alert', details: 'Snap CPA at $46.5, approaching $50 threshold.', beforeValue: 38, afterValue: 46.5, result: 'alert_sent', status: 'warning', createdAt: '2026-06-17T02:00:00Z' },
  { id: 'log_16', ruleId: 'rule_2', ruleName: 'ROAS Scale Winner', campaignId: 'c20', campaignName: 'Dynamic - Retargeting', action: 'Increased budget by 20%', actionType: 'increase_budget', details: 'ROAS 4.1x strong performance. Budget: $120 -> $144', beforeValue: 120, afterValue: 144, result: 'success', status: 'success', createdAt: '2026-06-16T20:00:00Z' },
  { id: 'log_17', ruleId: 'rule_5', ruleName: 'Frequency Cap Monitor', campaignId: 'c1', campaignName: 'Summer Sale 2026', action: 'Alert: High frequency', actionType: 'create_alert', details: 'Video ad frequency at 3.1x on Meta retargeting.', beforeValue: 1.4, afterValue: 3.1, result: 'alert_sent', status: 'warning', createdAt: '2026-06-16T16:00:00Z' },
  { id: 'log_18', ruleId: 'rule_3', ruleName: 'Low CTR Creative Alert', campaignId: 'c7', campaignName: 'PMax - Ecommerce', action: 'Creatives performing well', actionType: 'notify_team', details: 'All PMax creatives above 1.5% CTR. No action needed.', beforeValue: 1.8, afterValue: 1.8, result: 'no_action', status: 'success', createdAt: '2026-06-16T12:00:00Z' },
];

const MOCK_AI_RECOMMENDATIONS: AIRecommendation[] = [
  { id: 'rec_1', severity: 'Critical', type: 'warning', title: 'ROAS Dropped 15% on Meta Campaign X', description: 'ROAS has fallen from 4.2x to 3.57x over the past 48h on Meta Campaign "Summer Sale 2026". Recommend immediate budget reallocation of $320 from underperforming ad sets to top performers.', metric: 'ROAS 3.57x', campaign: 'Summer Sale 2026', platform: 'Meta', confidence: 91, impact: '-$1,240/wk', createdAt: '2026-06-18T08:15:00Z' },
  { id: 'rec_2', severity: 'Warning', type: 'risk', title: 'Creative Fatigue Detected on 3 TikTok Ads', description: 'CTR has declined 34% on 3 TikTok creatives after 50k+ impressions each. Frequency climbing to 2.8x. Recommend creative refresh within 24-48 hours to prevent CPA increase.', metric: 'CTR ↓ 34%', campaign: 'TikTok FYP - Viral', platform: 'TikTok', confidence: 88, impact: '+$890 if fixed', createdAt: '2026-06-18T06:30:00Z' },
  { id: 'rec_3', severity: 'Opportunity', type: 'opportunity', title: 'Google Campaign CPA 40% Below Target', description: 'Search - Brand Terms CPA is $12.40 vs target of $20. Room to scale budget by 60% while maintaining efficient CPA. Estimated additional 140 conversions/week at current trajectory.', metric: 'CPA $12.40', campaign: 'Search - Brand Terms', platform: 'Google', confidence: 94, impact: '+$6,200/wk', createdAt: '2026-06-18T05:00:00Z' },
];

let MOCK_AGENT_STATUS: AgentStatus = {
  isRunning: true,
  lastRun: '2026-06-18T08:30:00Z',
  nextScheduledRun: '2026-06-18T09:00:00Z',
  rulesActive: 6,
  rulesPaused: 2,
  optimizationsToday: 12,
  pendingDrafts: 3,
  draftsCreatedToday: 3,
  optimizationsApplied: 156,
  budgetSaved: 12840,
  creditsTotal: 500,
  creditsUsed: 347,
  recentLogs: MOCK_OPTIMIZATION_LOGS.slice(0, 5),
};

export const agentApi = {
  async getStatus(): Promise<AgentStatus> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return { ...MOCK_AGENT_STATUS, recentLogs: MOCK_OPTIMIZATION_LOGS.slice(0, 5) };
    }
    return apiGet<AgentStatus>('/agent/status');
  },
  async pauseAgent(): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.isRunning = false;
      return;
    }
    await apiPost('/agent/pause');
  },
  async resumeAgent(): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.isRunning = true;
      return;
    }
    await apiPost('/agent/resume');
  },
  async toggleAgent(): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.isRunning = !MOCK_AGENT_STATUS.isRunning;
      return;
    }
    await apiPost('/agent/toggle');
  },
  async getRules(): Promise<AutomationRule[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return [...MOCK_AGENT_RULES];
    }
    return apiGet<AutomationRule[]>('/agent/rules');
  },
  async createRule(input: Partial<AutomationRule>): Promise<AutomationRule> {
    if (isDemoMode()) {
      await delay(500);
      const rule: AutomationRule = {
        id: `rule_${Date.now()}`,
        name: input.name || 'New Rule',
        description: input.description || '',
        status: input.status || 'active',
        platform: input.platform || 'Meta',
        platforms: input.platforms || [input.platform || 'Meta'],
        condition: input.condition || { metric: 'cpa', operator: 'gt', value: 50 },
        conditions: input.conditions || [{ metric: 'cpa', operator: 'gt', value: 50 }],
        action: input.action || { type: 'notify_team', params: {} },
        actions: input.actions || [{ type: 'notify_team', params: {} }],
        conditionLogic: input.conditionLogic || 'and',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggerCount: 0,
      };
      MOCK_AGENT_RULES.push(rule);
      return rule;
    }
    return apiPost<AutomationRule>('/agent/rules', input);
  },
  async updateRule(id: string, input: Partial<AutomationRule>): Promise<AutomationRule> {
    if (isDemoMode()) {
      await delay(400);
      const idx = MOCK_AGENT_RULES.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Rule not found');
      MOCK_AGENT_RULES[idx] = { ...MOCK_AGENT_RULES[idx], ...input, updatedAt: new Date().toISOString() };
      return MOCK_AGENT_RULES[idx];
    }
    return apiPut<AutomationRule>(`/agent/rules/${id}`, input);
  },
  async deleteRule(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(300);
      MOCK_AGENT_RULES = MOCK_AGENT_RULES.filter((r) => r.id !== id);
      return;
    }
    await apiDelete(`/agent/rules/${id}`);
  },
  async toggleRule(id: string): Promise<AutomationRule> {
    if (isDemoMode()) {
      await delay(300);
      const idx = MOCK_AGENT_RULES.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error('Rule not found');
      const newStatus = MOCK_AGENT_RULES[idx].status === 'active' ? 'paused' : 'active';
      MOCK_AGENT_RULES[idx] = { ...MOCK_AGENT_RULES[idx], status: newStatus, updatedAt: new Date().toISOString() };
      MOCK_AGENT_STATUS.rulesActive = MOCK_AGENT_RULES.filter((r) => r.status === 'active').length;
      MOCK_AGENT_STATUS.rulesPaused = MOCK_AGENT_RULES.filter((r) => r.status === 'paused').length;
      return MOCK_AGENT_RULES[idx];
    }
    return apiPost<AutomationRule>(`/agent/rules/${id}/toggle`);
  },
  async getOptimizationLogs(limit?: number): Promise<OptimizationLogEntry[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      const logs = [...MOCK_OPTIMIZATION_LOGS];
      return limit ? logs.slice(0, limit) : logs;
    }
    return apiGet<OptimizationLogEntry[]>(limit ? `/agent/logs?limit=${limit}` : '/agent/logs');
  },
  async getRecommendations(): Promise<AIRecommendation[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return [...MOCK_AI_RECOMMENDATIONS];
    }
    return apiGet<AIRecommendation[]>('/agent/recommendations');
  },
  async executeRecommendation(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      const idx = MOCK_AI_RECOMMENDATIONS.findIndex((r) => r.id === id);
      if (idx !== -1) MOCK_AI_RECOMMENDATIONS.splice(idx, 1);
      return;
    }
    await apiPost(`/agent/recommendations/${id}/execute`);
  },
  async createDraftFromRecommendation(id: string, payload?: Record<string, unknown>): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      MOCK_AGENT_STATUS.pendingDrafts += 1;
      return;
    }
    await apiPost(`/agent/recommendations/${id}/draft`, payload);
  },
  async runNow(): Promise<{ rulesChecked: number; draftsCreated: number; actions: number }> {
    if (isDemoMode()) {
      await delay(1000 + Math.random() * 500);
      const rulesChecked = MOCK_AGENT_RULES.filter((r) => r.status === 'active').length;
      const draftsCreated = Math.floor(Math.random() * 3);
      MOCK_AGENT_STATUS.optimizationsToday += draftsCreated;
      MOCK_AGENT_STATUS.lastRun = new Date().toISOString();
      return { rulesChecked, draftsCreated, actions: rulesChecked };
    }
    return apiPost('/agent/run');
  },
  async approveDraft(id: string): Promise<PendingDraft> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.pendingDrafts = Math.max(0, MOCK_AGENT_STATUS.pendingDrafts - 1);
      return { id, title: 'Draft approved', description: '', type: 'approval', status: 'approved', createdBy: 'AI Agent', createdAt: new Date().toISOString() };
    }
    return apiPost<PendingDraft>(`/drafts/${id}/approve`);
  },
  async rejectDraft(id: string): Promise<PendingDraft> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_AGENT_STATUS.pendingDrafts = Math.max(0, MOCK_AGENT_STATUS.pendingDrafts - 1);
      return { id, title: 'Draft rejected', description: '', type: 'rejection', status: 'rejected', createdBy: 'AI Agent', createdAt: new Date().toISOString() };
    }
    return apiPost<PendingDraft>(`/drafts/${id}/reject`);
  },
};
