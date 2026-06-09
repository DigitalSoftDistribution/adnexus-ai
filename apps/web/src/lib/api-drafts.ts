import { api, apiGet, apiPost } from './api-base';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demo mode detection */
function isDemoMode(): boolean {
  return !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
}

export interface PendingDraft {
  id: string;
  title: string;
  ruleName?: string;
  changeSummary?: string;
  aiReasoning?: string;
  impactEstimate?: string;
  description: string;
  campaignId?: string;
  campaignName?: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  platform?: string;
  expiresAt?: string;
  severity?: string;
  metrics?: Record<string, unknown>;
  resolvedAt?: string;
  resolvedBy?: string;
}

/* ──────────────── Drafts Mock Data ──────────────── */

const MOCK_PENDING_DRAFTS: PendingDraft[] = [
  {
    id: 'draft_1', title: 'Pause YouTube - Product Demo', description: 'CPA $72.3 exceeded threshold for 3 consecutive days. Rule: High CPA Auto-Pause.',
    type: 'pause_campaign', status: 'pending', campaignId: 'c9', campaignName: 'YouTube - Product Demo',
    platform: 'Google', changeSummary: 'CPA: $72.3 -> Pause', createdBy: 'AI Agent (High CPA Auto-Pause)', createdAt: '2026-06-18T07:15:00Z',
    expiresAt: '2026-06-19T07:15:00Z', severity: 'high', metrics: { cpa: 72.3, spend: 1240, conversions: 17 },
  },
  {
    id: 'draft_2', title: 'Pause TopView - Launch', description: '0 conversions after $215 spend in 7 days. Rule: Underperforming Pause.',
    type: 'pause_campaign', status: 'pending', campaignId: 'c14', campaignName: 'TopView - Launch',
    platform: 'TikTok', changeSummary: '0 conv -> Pause', createdBy: 'AI Agent (Underperforming Pause)', createdAt: '2026-06-18T03:00:00Z',
    expiresAt: '2026-06-19T03:00:00Z', severity: 'high', metrics: { cpa: 0, spend: 215, conversions: 0 },
  },
  {
    id: 'draft_3', title: 'Pause Snap Story - Promo', description: 'Snap CPA at $46.5 approaching threshold. Preventive pause recommended.',
    type: 'pause_campaign', status: 'pending', campaignId: 'c17', campaignName: 'Story Ads - Promo',
    platform: 'Snap', changeSummary: 'CPA: $46.5 -> Pause', createdBy: 'AI Agent (High CPA Auto-Pause)', createdAt: '2026-06-17T02:00:00Z',
    expiresAt: '2026-06-18T02:00:00Z', severity: 'medium', metrics: { cpa: 46.5, spend: 580, conversions: 12 },
  },
  {
    id: 'draft_4', title: 'Creative Refresh - Brand Q2', description: 'Carousel CTR dropped to 0.4%. Recommend new creative assets.',
    type: 'creative_swap', status: 'pending', campaignId: 'c2', campaignName: 'Brand Awareness Q2',
    platform: 'Meta', changeSummary: 'CTR: 0.4% -> Refresh', createdBy: 'AI Agent (Low CTR Creative Alert)', createdAt: '2026-06-18T04:20:00Z',
    expiresAt: '2026-06-20T04:20:00Z', severity: 'medium', metrics: { ctr: 0.4, impressions: 45000 },
  },
  {
    id: 'draft_5', title: 'Frequency Alert - Lookalike', description: 'Frequency at 3.2x. Recommend audience refresh.',
    type: 'audience_expansion', status: 'pending', campaignId: 'c4', campaignName: 'Lookalike - Purchasers',
    platform: 'Meta', changeSummary: 'Freq: 3.2x -> Expand', createdBy: 'AI Agent (Frequency Cap Monitor)', createdAt: '2026-06-18T06:00:00Z',
    expiresAt: '2026-06-19T06:00:00Z', severity: 'medium', metrics: { frequency: 3.2, impressions: 78000 },
  },
];

const MOCK_RECENT_DRAFTS: PendingDraft[] = [
  ...MOCK_PENDING_DRAFTS,
  {
    id: 'draft_6', title: 'Scale Summer Sale 2026', description: 'ROAS 4.2x exceeded threshold for 2 days. Rule: ROAS Scale Winner applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c1', campaignName: 'Summer Sale 2026',
    platform: 'Meta', changeSummary: 'Budget: $400 -> $480', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-18T08:30:00Z',
    resolvedAt: '2026-06-18T08:35:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 4.2, spend: 400, budget: 480 },
  },
  {
    id: 'draft_7', title: 'Scale Search - Brand Terms', description: 'ROAS 6.1x outstanding performance. Budget increased automatically.',
    type: 'budget_change', status: 'approved', campaignId: 'c6', campaignName: 'Search - Brand Terms',
    platform: 'Google', changeSummary: 'Budget: $350 -> $420', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-18T05:45:00Z',
    resolvedAt: '2026-06-18T05:50:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 6.1, spend: 350, budget: 420 },
  },
  {
    id: 'draft_8', title: 'Adjust Snap Bids', description: 'CPA trending at $44.2. Preventive bid reduction applied.',
    type: 'bid_adjustment', status: 'approved', campaignId: 'c8', campaignName: 'Display - Remarketing',
    platform: 'Google', changeSummary: 'Bid: -15%', createdBy: 'AI Agent (High CPA Auto-Pause)', createdAt: '2026-06-17T18:30:00Z',
    resolvedAt: '2026-06-17T18:40:00Z', resolvedBy: 'jane@company.com', severity: 'medium', metrics: { cpa: 44.2, bidChange: -15 },
  },
  {
    id: 'draft_9', title: 'Scale FYP - Viral Hook', description: 'ROAS 3.9x on TikTok. Budget increase applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c11', campaignName: 'FYP - Viral Hook',
    platform: 'TikTok', changeSummary: 'Budget: $280 -> $350', createdBy: 'AI Agent (TikTok Trending Scale)', createdAt: '2026-06-18T05:00:00Z',
    resolvedAt: '2026-06-18T05:05:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 3.9, budget: 350 },
  },
  {
    id: 'draft_10', title: 'Scale Retargeting - Cart', description: 'ROAS 5.8x strong retargeting performance.',
    type: 'budget_change', status: 'approved', campaignId: 'c3', campaignName: 'Retargeting - Cart Abandoners',
    platform: 'Meta', changeSummary: 'Budget: $180 -> $216', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-17T22:00:00Z',
    resolvedAt: '2026-06-17T22:10:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 5.8, budget: 216 },
  },
  {
    id: 'draft_11', title: 'Scale Spark Ads - UGC', description: 'ROAS 4.5x on Spark Ads. Budget increase applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c12', campaignName: 'Spark Ads - UGC',
    platform: 'TikTok', changeSummary: 'Budget: $200 -> $250', createdBy: 'AI Agent (TikTok Trending Scale)', createdAt: '2026-06-17T10:15:00Z',
    resolvedAt: '2026-06-17T10:20:00Z', resolvedBy: 'jane@company.com', severity: 'low', metrics: { roas: 4.5, budget: 250 },
  },
  {
    id: 'draft_12', title: 'Scale Dynamic Retargeting', description: 'ROAS 4.1x on Snap Dynamic Ads. Budget increase applied.',
    type: 'budget_change', status: 'approved', campaignId: 'c20', campaignName: 'Dynamic - Retargeting',
    platform: 'Snap', changeSummary: 'Budget: $120 -> $144', createdBy: 'AI Agent (ROAS Scale Winner)', createdAt: '2026-06-16T20:00:00Z',
    resolvedAt: '2026-06-16T20:10:00Z', resolvedBy: 'john@company.com', severity: 'low', metrics: { roas: 4.1, budget: 144 },
  },
];

export const draftsApi = {
  /** GET /api/v1/drafts?status=pending — List pending drafts */
  async getPending(): Promise<PendingDraft[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      return [...MOCK_PENDING_DRAFTS];
    }
    return apiGet<PendingDraft[]>('/drafts', { params: { status: 'pending' } });
  },

  /** GET /api/v1/drafts — List drafts with filters */
  async getRecent(params?: { status?: string; limit?: number; page?: number }): Promise<PendingDraft[]> {
    if (isDemoMode()) {
      await delay(300 + Math.random() * 200);
      const sorted = [...MOCK_RECENT_DRAFTS].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return params?.limit ? sorted.slice(0, params.limit) : sorted;
    }
    const response = await api.get<{ data: PendingDraft[]; total: number }>('/drafts', { params });
    return response.data.data;
  },

  /** GET /api/v1/drafts/:id — Get a single draft */
  async get(id: string): Promise<PendingDraft> {
    if (isDemoMode()) {
      await delay(300);
      const draft = MOCK_RECENT_DRAFTS.find((d) => d.id === id);
      if (!draft) throw new Error('Draft not found');
      return { ...draft };
    }
    return apiGet<PendingDraft>(`/drafts/${id}`);
  },

  /** POST /api/v1/drafts/:id/approve — Approve a draft */
  async approve(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      const d = MOCK_PENDING_DRAFTS.find((x) => x.id === id);
      if (d) { d.status = 'approved'; d.resolvedAt = new Date().toISOString(); }
      return;
    }
    await apiPost<void>(`/drafts/${id}/approve`);
  },

  /** POST /api/v1/drafts/:id/reject — Reject a draft with optional reason */
  async reject(id: string, reason?: string): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      const d = MOCK_PENDING_DRAFTS.find((x) => x.id === id);
      if (d) { d.status = 'rejected'; d.resolvedAt = new Date().toISOString(); }
      return;
    }
    await apiPost<void>(`/drafts/${id}/reject`, { reason });
  },

  /** POST /api/v1/drafts/:id/discard — Discard a draft */
  async discard(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(300);
      const idx = MOCK_PENDING_DRAFTS.findIndex((x) => x.id === id);
      if (idx !== -1) MOCK_PENDING_DRAFTS.splice(idx, 1);
      return;
    }
    await apiPost<void>(`/drafts/${id}/discard`);
  },

  /** GET /api/v1/drafts/stats — Get draft statistics */
  async getStats(): Promise<{ total: number; pending: number; approved: number; rejected: number; byType: Record<string, number> }> {
    if (isDemoMode()) {
      await delay(300);
      const pending = MOCK_RECENT_DRAFTS.filter((d) => d.status === 'pending').length;
      const approved = MOCK_RECENT_DRAFTS.filter((d) => d.status === 'approved').length;
      const rejected = MOCK_RECENT_DRAFTS.filter((d) => d.status === 'rejected').length;
      const byType: Record<string, number> = {};
      MOCK_RECENT_DRAFTS.forEach((d) => { byType[d.type] = (byType[d.type] || 0) + 1; });
      return { total: MOCK_RECENT_DRAFTS.length, pending, approved, rejected, byType };
    }
    return apiGet('/drafts/stats');
  },
};
