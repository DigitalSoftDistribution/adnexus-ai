import { api, apiGet, apiPost, apiPut, apiDelete, apiList } from './api-base';

/* ═════════════════════════════════════════════════════════════════════ */
/*  EXISTING TYPE DEFINITIONS + API MODULES (unchanged below)          */
/* ═════════════════════════════════════════════════════════════════════ */

export interface Campaign {
  id: string;
  name: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap';
  status: 'Active' | 'Paused' | 'Ended' | 'Draft';
  objective: string;
  budgetType: 'Daily' | 'Lifetime';
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number | null;
  conversions: number | null;
  cpa: number | null;
  roas: number | null;
  bidStrategy: string;
  ageRange: string;
  gender: string;
  locations: string[];
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignFilters {
  search?: string;
  platform?: string;
  status?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCampaignInput {
  name: string;
  platform: 'Meta' | 'Google' | 'TikTok' | 'Snap';
  objective: string;
  budgetType: 'Daily' | 'Lifetime';
  budget: number;
  bidStrategy: string;
  ageRange: string;
  gender: string;
  locations: string[];
  interests: string[];
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ──────────────── Mock Data (20 rows) ──────────────── */

let MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'c1', name: 'Summer Sale 2026', platform: 'Meta', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 500, spend: 12400, impressions: 445000, clicks: 12460, ctr: 2.8, conversions: 340, cpa: 36, roas: 4.2, bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA'], interests: ['Shopping', 'Fashion'], createdAt: '2026-01-15', updatedAt: '2026-01-20' },
  { id: 'c2', name: 'Brand Awareness Q2', platform: 'Meta', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 300, spend: 8200, impressions: 683000, clicks: 8196, ctr: 1.2, conversions: 89, cpa: 92, roas: 1.8, bidStrategy: 'Lowest Cost', ageRange: '25-44', gender: 'All', locations: ['US'], interests: ['Lifestyle'], createdAt: '2026-02-01', updatedAt: '2026-02-10' },
  { id: 'c3', name: 'Retargeting - Cart Abandoners', platform: 'Meta', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 5600, impressions: 165000, clicks: 5610, ctr: 3.4, conversions: 210, cpa: 27, roas: 5.8, bidStrategy: 'Cost Cap', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA', 'UK'], interests: ['Shopping'], createdAt: '2026-01-10', updatedAt: '2026-01-18' },
  { id: 'c4', name: 'Lookalike - Purchasers', platform: 'Meta', status: 'Paused', objective: 'Conversions', budgetType: 'Daily', budget: 150, spend: 3100, impressions: 148000, clicks: 3108, ctr: 2.1, conversions: 95, cpa: 33, roas: 3.9, bidStrategy: 'Lowest Cost', ageRange: '25-54', gender: 'All', locations: ['US'], interests: ['Lookalike'], createdAt: '2026-01-05', updatedAt: '2026-01-12' },
  { id: 'c5', name: 'Holiday Preview', platform: 'Meta', status: 'Ended', objective: 'Awareness', budgetType: 'Daily', budget: 400, spend: 0, impressions: 0, clicks: 0, ctr: null, conversions: null, cpa: null, roas: null, bidStrategy: 'Lowest Cost', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Holiday'], createdAt: '2026-03-01', updatedAt: '2026-03-01' },
  { id: 'c6', name: 'Search - Brand Terms', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 400, spend: 10800, impressions: 257000, clicks: 10836, ctr: 4.2, conversions: 520, cpa: 21, roas: 6.1, bidStrategy: 'Target CPA', ageRange: '18-65+', gender: 'All', locations: ['US', 'CA'], interests: ['Search'], createdAt: '2026-01-20', updatedAt: '2026-01-25' },
  { id: 'c7', name: 'PMax - Ecommerce', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 600, spend: 15200, impressions: 844000, clicks: 15192, ctr: 1.8, conversions: 380, cpa: 40, roas: 3.5, bidStrategy: 'Maximize Conversions', ageRange: '18-65+', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-02-05', updatedAt: '2026-02-12' },
  { id: 'c8', name: 'Display - Remarketing', platform: 'Google', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 250, spend: 6400, impressions: 582000, clicks: 5824, ctr: 1.1, conversions: 145, cpa: 44, roas: 3.2, bidStrategy: 'Viewable CPM', ageRange: '25-54', gender: 'All', locations: ['US'], interests: ['Remarketing'], createdAt: '2026-01-08', updatedAt: '2026-01-15' },
  { id: 'c9', name: 'YouTube - Product Demo', platform: 'Google', status: 'Paused', objective: 'Awareness', budgetType: 'Daily', budget: 350, spend: 4800, impressions: 534000, clicks: 4806, ctr: 0.9, conversions: 67, cpa: 72, roas: 2.1, bidStrategy: 'Target CPM', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Video'], createdAt: '2026-02-15', updatedAt: '2026-02-20' },
  { id: 'c10', name: 'Discovery - New Products', platform: 'Google', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 3200, impressions: 139000, clicks: 3198, ctr: 2.3, conversions: 128, cpa: 25, roas: 4.8, bidStrategy: 'Target CPA', ageRange: '25-44', gender: 'All', locations: ['US', 'CA'], interests: ['Discovery'], createdAt: '2026-03-05', updatedAt: '2026-03-10' },
  { id: 'c11', name: 'FYP - Viral Hook', platform: 'TikTok', status: 'Active', objective: 'Awareness', budgetType: 'Daily', budget: 300, spend: 7800, impressions: 487000, clicks: 7808, ctr: 1.6, conversions: 198, cpa: 39, roas: 3.1, bidStrategy: 'Lowest Cost', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['Viral'], createdAt: '2026-01-25', updatedAt: '2026-02-01' },
  { id: 'c12', name: 'Spark Ads - UGC', platform: 'TikTok', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 200, spend: 4200, impressions: 191000, clicks: 4202, ctr: 2.2, conversions: 156, cpa: 27, roas: 4.5, bidStrategy: 'Cost Cap', ageRange: '18-44', gender: 'All', locations: ['US', 'CA'], interests: ['UGC'], createdAt: '2026-02-10', updatedAt: '2026-02-15' },
  { id: 'c13', name: 'Collection Ads - Catalog', platform: 'TikTok', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 250, spend: 5100, impressions: 364000, clicks: 5096, ctr: 1.4, conversions: 112, cpa: 46, roas: 2.8, bidStrategy: 'Lowest Cost', ageRange: '18-54', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-03-01', updatedAt: '2026-03-05' },
  { id: 'c14', name: 'TopView - Launch', platform: 'TikTok', status: 'Ended', objective: 'Awareness', budgetType: 'Daily', budget: 500, spend: 0, impressions: 0, clicks: 0, ctr: null, conversions: null, cpa: null, roas: null, bidStrategy: 'Reach & Frequency', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['Launch'], createdAt: '2026-03-15', updatedAt: '2026-03-15' },
  { id: 'c15', name: 'In-Feed - Test', platform: 'TikTok', status: 'Draft', objective: 'Traffic', budgetType: 'Daily', budget: 150, spend: 0, impressions: 0, clicks: 0, ctr: null, conversions: null, cpa: null, roas: null, bidStrategy: 'Lowest Cost', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Test'], createdAt: '2026-03-20', updatedAt: '2026-03-20' },
  { id: 'c16', name: 'Snap Ads - App Install', platform: 'Snap', status: 'Active', objective: 'App Installs', budgetType: 'Daily', budget: 200, spend: 3800, impressions: 317000, clicks: 3804, ctr: 1.2, conversions: 95, cpa: 40, roas: 2.9, bidStrategy: 'Cost Cap', ageRange: '18-34', gender: 'All', locations: ['US'], interests: ['App Installs'], createdAt: '2026-02-01', updatedAt: '2026-02-08' },
  { id: 'c17', name: 'Story Ads - Promo', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 150, spend: 2400, impressions: 300000, clicks: 2400, ctr: 0.8, conversions: 48, cpa: 50, roas: 2.3, bidStrategy: 'Goal Based', ageRange: '18-44', gender: 'All', locations: ['US', 'CA'], interests: ['Promo'], createdAt: '2026-01-18', updatedAt: '2026-01-22' },
  { id: 'c18', name: 'AR Lens - Branded', platform: 'Snap', status: 'Paused', objective: 'Engagement', budgetType: 'Daily', budget: 400, spend: 1200, impressions: 240000, clicks: 1200, ctr: 0.5, conversions: 12, cpa: 100, roas: 1.4, bidStrategy: 'Lowest Cost', ageRange: '13-34', gender: 'All', locations: ['US'], interests: ['AR'], createdAt: '2026-02-20', updatedAt: '2026-02-25' },
  { id: 'c19', name: 'Collection - Products', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 180, spend: 2800, impressions: 187000, clicks: 2805, ctr: 1.5, conversions: 73, cpa: 38, roas: 3.3, bidStrategy: 'Swipe Up', ageRange: '18-44', gender: 'All', locations: ['US'], interests: ['Shopping'], createdAt: '2026-03-08', updatedAt: '2026-03-12' },
  { id: 'c20', name: 'Dynamic - Retargeting', platform: 'Snap', status: 'Active', objective: 'Conversions', budgetType: 'Daily', budget: 120, spend: 1600, impressions: 84000, clicks: 1596, ctr: 1.9, conversions: 58, cpa: 28, roas: 4.1, bidStrategy: 'Goal Based', ageRange: '18-54', gender: 'All', locations: ['US'], interests: ['Retargeting'], createdAt: '2026-03-12', updatedAt: '2026-03-15' },
];

/* ──────────────── Production-Ready campaignsApi ──────────────── */

export const campaignsApi = {
  /** GET /api/v1/campaigns — List campaigns with filters */
  async list(filters: CampaignFilters = {}): Promise<PaginatedResponse<Campaign>> {
    if (isDemoMode()) {
      await delay(400 + Math.random() * 300);
      return mockList(filters);
    }
    const params: Record<string, unknown> = {};
    if (filters.platform && filters.platform !== 'All') params.platform = filters.platform;
    if (filters.status && filters.status !== 'All') params.status = filters.status;
    if (filters.search?.trim()) params.search = filters.search.trim();
    if (filters.sortBy) {
      params.sortBy = filters.sortBy;
      params.sortDir = filters.sortDir || 'desc';
    }
    params.page = filters.page || 1;
    params.limit = filters.limit || 20;

    return apiList<Campaign>('/campaigns', { params });
  },

  /** GET /api/v1/campaigns/:id — Get a single campaign */
  async get(id: string): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(300);
      const c = MOCK_CAMPAIGNS.find((c) => c.id === id);
      if (!c) throw new Error('Campaign not found');
      return { ...c };
    }
    return apiGet<Campaign>(`/campaigns/${id}`);
  },

  /** POST /api/v1/campaigns — Create a new campaign (creates draft) */
  async create(input: CreateCampaignInput): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(600);
      const campaign: Campaign = {
        id: `c${Date.now()}`,
        ...input,
        status: 'Draft',
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: null,
        conversions: null,
        cpa: null,
        roas: null,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      MOCK_CAMPAIGNS.unshift(campaign);
      return campaign;
    }
    return apiPost<Campaign>('/campaigns', input);
  },

  /** PUT /api/v1/campaigns/:id — Update a campaign (creates draft) */
  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(400);
      const idx = MOCK_CAMPAIGNS.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Campaign not found');
      MOCK_CAMPAIGNS[idx] = { ...MOCK_CAMPAIGNS[idx], ...updates, updatedAt: new Date().toISOString().split('T')[0] };
      return MOCK_CAMPAIGNS[idx];
    }
    return apiPut<Campaign>(`/campaigns/${id}`, updates);
  },

  /** DELETE /api/v1/campaigns/:id — Delete a campaign */
  async delete(id: string): Promise<void> {
    if (isDemoMode()) {
      await delay(400);
      MOCK_CAMPAIGNS = MOCK_CAMPAIGNS.filter((c) => c.id !== id);
      return;
    }
    await apiDelete<void>(`/campaigns/${id}`);
  },

  async duplicate(id: string): Promise<Campaign> {
    if (isDemoMode()) {
      await delay(400);
      const original = MOCK_CAMPAIGNS.find((c) => c.id === id);
      if (!original) throw new Error('Campaign not found');
      const copy: Campaign = {
        ...original,
        id: `c${Date.now()}`,
        name: `${original.name} (Copy)`,
        status: 'Draft',
        spend: 0,
        impressions: 0,
        clicks: 0,
        ctr: null,
        conversions: null,
        cpa: null,
        roas: null,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      };
      MOCK_CAMPAIGNS.unshift(copy);
      return copy;
    }
    return apiPost<Campaign>(`/campaigns/${id}/duplicate`);
  },

  async bulkPause(ids: string[]): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      for (const id of ids) {
        const idx = MOCK_CAMPAIGNS.findIndex((c) => c.id === id);
        if (idx !== -1) {
          MOCK_CAMPAIGNS[idx] = { ...MOCK_CAMPAIGNS[idx], status: 'Paused', updatedAt: new Date().toISOString().split('T')[0] };
        }
      }
      return;
    }
    await apiPost<void>('/campaigns/bulk-pause', { ids });
  },

  async bulkDuplicate(ids: string[]): Promise<void> {
    if (isDemoMode()) {
      await delay(500);
      const toCopy = MOCK_CAMPAIGNS.filter((c) => ids.includes(c.id));
      for (const original of toCopy) {
        const copy: Campaign = {
          ...original,
          id: `c${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: `${original.name} (Copy)`,
          status: 'Draft',
          spend: 0,
          impressions: 0,
          clicks: 0,
          ctr: null,
          conversions: null,
          cpa: null,
          roas: null,
          createdAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };
        MOCK_CAMPAIGNS.unshift(copy);
      }
      return;
    }
    await apiPost<void>('/campaigns/bulk-duplicate', { ids });
  },

  /** GET /api/v1/campaigns/summary — Get campaign analytics summary */
  async summary(): Promise<{
    totalCampaigns: number;
    activeCampaigns: number;
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    avgCtr: number;
    avgRoas: number;
    platformBreakdown: Record<string, { count: number; spend: number }>;
    statusBreakdown: Record<string, number>;
  }> {
    if (isDemoMode()) {
      await delay(300);
      const campaigns = MOCK_CAMPAIGNS;
      const active = campaigns.filter((c) => c.status === 'Active');
      return {
        totalCampaigns: campaigns.length,
        activeCampaigns: active.length,
        totalSpend: campaigns.reduce((sum, c) => sum + (c.spend || 0), 0),
        totalImpressions: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
        totalClicks: campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0),
        totalConversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
        avgCtr: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / campaigns.length : 0,
        avgRoas: campaigns.length > 0 ? campaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / campaigns.length : 0,
        platformBreakdown: campaigns.reduce((acc, c) => {
          const p = c.platform;
          if (!acc[p]) acc[p] = { count: 0, spend: 0 };
          acc[p].count += 1;
          acc[p].spend += c.spend || 0;
          return acc;
        }, {} as Record<string, { count: number; spend: number }>),
        statusBreakdown: campaigns.reduce((acc, c) => {
          const s = c.status;
          if (!acc[s]) acc[s] = 0;
          acc[s] += 1;
          return acc;
        }, {} as Record<string, number>),
      };
    }
    return apiGet('/campaigns/summary');
  },

  async export(ids: string[]): Promise<string> {
    if (isDemoMode()) {
      await delay(300);
      const selected = MOCK_CAMPAIGNS.filter((c) => ids.includes(c.id));
      const headers = ['ID', 'Name', 'Platform', 'Status', 'Objective', 'Budget Type', 'Budget', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'CPA', 'ROAS'];
      const rows = selected.map((c) => [
        c.id, c.name, c.platform, c.status, c.objective, c.budgetType,
        c.budget, c.spend, c.impressions, c.clicks,
        c.ctr ?? '', c.conversions ?? '', c.cpa ?? '', c.roas ?? '',
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }
    const response = await api.post<{ csv: string }>('/campaigns/export', { ids });
    return response.data.csv;
  },
};

/** Demo mode detection */
function isDemoMode(): boolean {
  return !import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL === '';
}

/** Local mock list implementation */
function mockList(filters: CampaignFilters): PaginatedResponse<Campaign> {
  let data = [...MOCK_CAMPAIGNS];
  if (filters.platform && filters.platform !== 'All') {
    data = data.filter((c) => c.platform === filters.platform);
  }
  if (filters.status && filters.status !== 'All') {
    data = data.filter((c) => c.status === filters.status);
  }
  if (filters.search?.trim()) {
    const q = filters.search.toLowerCase();
    data = data.filter((c) => c.name.toLowerCase().includes(q));
  }
  if (filters.sortBy) {
    const dir = filters.sortDir === 'asc' ? 1 : -1;
    data.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof Campaign];
      const bVal = b[filters.sortBy as keyof Campaign];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') return dir * aVal.localeCompare(bVal as string);
      if (typeof aVal === 'number') return dir * ((aVal as number) - (bVal as number));
      return 0;
    });
  }
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const total = data.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = data.slice(start, start + limit);
  return { data: paginated, total, page, limit, totalPages };
}
