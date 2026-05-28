import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { campaignsApi } from '../lib/api';
import type { Campaign, CampaignFilters, CampaignSummary } from '../lib/api';
import { toast } from '../hooks/useToast';

/** Campaign status in lifecycle */
export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'archived';

/** Supported ad platforms */
export type AdPlatform =
  | 'facebook'
  | 'instagram'
  | 'google'
  | 'tiktok'
  | 'snapchat'
  | 'linkedin'
  | 'twitter'
  | 'pinterest';

/** Campaign objective */
export type CampaignObjective =
  | 'awareness'
  | 'traffic'
  | 'engagement'
  | 'leads'
  | 'sales'
  | 'app_installs'
  | 'retargeting'
  | 'loyalty';

/** Budget type */
export type BudgetType = 'daily' | 'lifetime';

/** Single campaign entity */
export interface Campaign {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  platform: AdPlatform;
  objective: CampaignObjective;
  budget: {
    amount: number;
    type: BudgetType;
    currency: string;
  };
  schedule: {
    startDate: string;
    endDate?: string;
    timezone: string;
  };
  targeting: {
    audiences: string[];
    demographics?: {
      ageMin?: number;
      ageMax?: number;
      genders?: string[];
      locations?: string[];
      languages?: string[];
    };
  };
  performance?: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    roas: number;
    cpa: number;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  tags: string[];
}

/** Campaign filter options */
export interface CampaignFilters {
  status: CampaignStatus | 'all';
  platform: AdPlatform | 'all';
  objective: CampaignObjective | 'all';
  search: string;
  dateRange: {
    from: string;
    to: string;
  } | null;
  sortBy: 'name' | 'createdAt' | 'updatedAt' | 'spend' | 'roas';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

/** Campaign analytics summary */
export interface CampaignSummary {
  totalCampaigns: number;
  activeCampaigns: number;
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  avgCtr: number;
  avgRoas: number;
  platformBreakdown: Record<AdPlatform, { count: number; spend: number }>;
  statusBreakdown: Record<CampaignStatus, number>;
}

export interface CampaignState {
  /** List of campaigns */
  campaigns: Campaign[];
  /** Total count (for pagination) */
  total: number;
  /** Currently selected campaign for detail view */
  selectedCampaign: Campaign | null;
  /** Active filters */
  filters: CampaignFilters;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Analytics summary */
  summary: CampaignSummary | null;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages (computed) */
  totalPages: number;
  /** Whether a creation is in progress */
  isCreating: boolean;
  /** Whether an update is in progress */
  isUpdating: boolean;
  /** Whether a delete is in progress */
  isDeleting: boolean;
  /** Selected campaign IDs for bulk actions */
  selectedIds: Set<string>;
  /** View mode: table or grid */
  viewMode: 'table' | 'grid';

  // Actions
  setCampaigns: (campaigns: Campaign[], total: number) => void;
  setSelected: (campaign: Campaign | null) => void;
  setFilters: (filters: Partial<CampaignFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSummary: (summary: CampaignSummary | null) => void;
  setPage: (page: number) => void;
  setViewMode: (mode: 'table' | 'grid') => void;
  toggleSelection: (id: string) => void;
  setSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  clearSelection: () => void;
  setCreating: (creating: boolean) => void;
  setUpdating: (updating: boolean) => void;
  setDeleting: (deleting: boolean) => void;
  upsertCampaign: (campaign: Campaign) => void;
  removeCampaign: (id: string) => void;

  // API-connected actions
  fetchCampaigns: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  createCampaign: (data: Partial<Campaign>) => Promise<Campaign | null>;
  updateCampaign: (id: string, data: Partial<Campaign>) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
}

const defaultFilters: CampaignFilters = {
  status: 'all',
  platform: 'all',
  objective: 'all',
  search: '',
  dateRange: null,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

export const useCampaignStore = create<CampaignState>()(
  immer((set, get) => ({
    campaigns: [],
    total: 0,
    selectedCampaign: null,
    filters: { ...defaultFilters },
    isLoading: false,
    error: null,
    summary: null,
    page: 1,
    limit: 20,
    totalPages: 0,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    selectedIds: new Set<string>(),
    viewMode: 'table' as 'table' | 'grid',

    setCampaigns: (campaigns, total) =>
      set((state) => {
        state.campaigns = campaigns;
        state.total = total;
        state.totalPages = Math.ceil(total / state.limit) || 1;
      }),

    setSelected: (campaign) =>
      set((state) => {
        state.selectedCampaign = campaign;
      }),

    setFilters: (filters) =>
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),

    resetFilters: () =>
      set((state) => {
        state.filters = { ...defaultFilters };
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    setSummary: (summary) =>
      set((state) => {
        state.summary = summary;
      }),

    setPage: (page) =>
      set((state) => {
        state.page = page;
      }),

    setViewMode: (mode) =>
      set((state) => {
        state.viewMode = mode;
      }),

    toggleSelection: (id) =>
      set((state) => {
        if (state.selectedIds.has(id)) {
          state.selectedIds.delete(id);
        } else {
          state.selectedIds.add(id);
        }
      }),

    setSelectedIds: (ids) =>
      set((state) => {
        if (typeof ids === 'function') {
          state.selectedIds = ids(new Set(state.selectedIds));
        } else {
          state.selectedIds = new Set(ids);
        }
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedIds = new Set<string>();
      }),

    setCreating: (creating) =>
      set((state) => {
        state.isCreating = creating;
      }),

    setUpdating: (updating) =>
      set((state) => {
        state.isUpdating = updating;
      }),

    setDeleting: (deleting) =>
      set((state) => {
        state.isDeleting = deleting;
      }),

    upsertCampaign: (campaign) =>
      set((state) => {
        const idx = state.campaigns.findIndex((c) => c.id === campaign.id);
        if (idx >= 0) {
          state.campaigns[idx] = campaign;
        } else {
          state.campaigns.unshift(campaign);
          state.total += 1;
        }
      }),

    removeCampaign: (id) =>
      set((state) => {
        state.campaigns = state.campaigns.filter((c) => c.id !== id);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedCampaign?.id === id) {
          state.selectedCampaign = null;
        }
      }),

    /** Fetch campaigns from API with filters */
    fetchCampaigns: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      try {
        const { filters } = get();
        const response = await campaignsApi.list({
          platform: filters.platform === 'all' ? 'All' : filters.platform,
          status: filters.status === 'all' ? 'All' : filters.status,
          search: filters.search,
          sortBy: filters.sortBy,
          sortDir: filters.sortOrder,
          page: filters.page,
          limit: filters.limit,
        });
        set((state) => {
          // Transform API campaigns to store Campaign format
          state.campaigns = response.data.map(transformApiCampaignToStore);
          state.total = response.total;
          state.totalPages = response.totalPages || Math.ceil(response.total / state.limit) || 1;
          state.isLoading = false;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch campaigns';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
        toast.error('Failed to load campaigns', message);
      }
    },

    /** Fetch campaign analytics summary */
    fetchSummary: async () => {
      try {
        const response = await campaignsApi.list({ limit: 1000 });
        const campaigns = response.data;
        const active = campaigns.filter((c) => c.status === 'Active');
        const summary: CampaignSummary = {
          totalCampaigns: campaigns.length,
          activeCampaigns: active.length,
          totalSpend: campaigns.reduce((sum, c) => sum + (c.spend || 0), 0),
          totalImpressions: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
          totalClicks: campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0),
          totalConversions: campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0),
          avgCtr: campaigns.length > 0
            ? campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / campaigns.length
            : 0,
          avgRoas: campaigns.length > 0
            ? campaigns.reduce((sum, c) => sum + (c.roas || 0), 0) / campaigns.length
            : 0,
          platformBreakdown: campaigns.reduce((acc, c) => {
            const p = c.platform as AdPlatform;
            if (!acc[p]) acc[p] = { count: 0, spend: 0 };
            acc[p].count += 1;
            acc[p].spend += c.spend || 0;
            return acc;
          }, {} as Record<AdPlatform, { count: number; spend: number }>),
          statusBreakdown: campaigns.reduce((acc, c) => {
            const s = c.status.toLowerCase() as CampaignStatus;
            if (!acc[s]) acc[s] = 0;
            acc[s] += 1;
            return acc;
          }, {} as Record<CampaignStatus, number>),
        };
        set((state) => {
          state.summary = summary;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch summary';
        set((state) => {
          state.error = message;
        });
      }
    },

    /** POST /api/v1/campaigns — Create campaign (creates draft) with optimistic update */
    createCampaign: async (data: Partial<Campaign>) => {
      set((state) => {
        state.isCreating = true;
        state.error = null;
      });
      try {
        const response = await campaignsApi.create({
          name: data.name || 'Untitled Campaign',
          platform: (data.platform || 'Meta') as 'Meta' | 'Google' | 'TikTok' | 'Snap',
          objective: data.objective || 'Conversions',
          budgetType: (data.budget?.type === 'lifetime' ? 'Lifetime' : 'Daily') as 'Daily' | 'Lifetime',
          budget: data.budget?.amount || 100,
          bidStrategy: 'Lowest Cost',
          ageRange: data.targeting?.demographics?.ageMin && data.targeting?.demographics?.ageMax
            ? `${data.targeting.demographics.ageMin}-${data.targeting.demographics.ageMax}`
            : '18-65+',
          gender: data.targeting?.demographics?.genders?.[0] || 'All',
          locations: data.targeting?.demographics?.locations || ['US'],
          interests: data.targeting?.audiences || [],
        });

        const newCampaign = transformApiCampaignToStore(response);
        set((state) => {
          state.campaigns.unshift(newCampaign);
          state.total += 1;
          state.isCreating = false;
        });

        toast.success('Campaign created', `"${newCampaign.name}" has been created as a draft.`);
        return newCampaign;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create campaign';
        set((state) => {
          state.error = message;
          state.isCreating = false;
        });
        toast.error('Failed to create campaign', message);
        return null;
      }
    },

    /** PUT /api/v1/campaigns/:id — Update campaign (creates draft) with optimistic update */
    updateCampaign: async (id: string, data: Partial<Campaign>) => {
      set((state) => {
        state.isUpdating = true;
        state.error = null;
      });

      // Store original for rollback
      const originalCampaign = get().campaigns.find((c) => c.id === id);
      const originalIndex = get().campaigns.findIndex((c) => c.id === id);

      // Optimistic update
      if (originalCampaign && originalIndex >= 0) {
        set((state) => {
          const updated = { ...originalCampaign, ...data, updatedAt: new Date().toISOString() };
          state.campaigns[originalIndex] = updated;
          if (state.selectedCampaign?.id === id) {
            state.selectedCampaign = updated;
          }
        });
      }

      try {
        const response = await campaignsApi.update(id, {
          name: data.name,
          platform: data.platform as 'Meta' | 'Google' | 'TikTok' | 'Snap',
          objective: data.objective,
          budgetType: data.budget?.type === 'lifetime' ? 'Lifetime' : 'Daily',
          budget: data.budget?.amount,
          bidStrategy: data.bidStrategy,
          ageRange: data.targeting?.demographics?.ageMin && data.targeting?.demographics?.ageMax
            ? `${data.targeting.demographics.ageMin}-${data.targeting.demographics.ageMax}`
            : undefined,
          gender: data.targeting?.demographics?.genders?.[0],
          locations: data.targeting?.demographics?.locations,
          interests: data.targeting?.audiences,
        });

        const updatedCampaign = transformApiCampaignToStore(response);
        set((state) => {
          const idx = state.campaigns.findIndex((c) => c.id === id);
          if (idx >= 0) {
            state.campaigns[idx] = updatedCampaign;
          }
          if (state.selectedCampaign?.id === id) {
            state.selectedCampaign = updatedCampaign;
          }
          state.isUpdating = false;
        });

        toast.success('Campaign updated', `"${updatedCampaign.name}" has been updated.`);
        return updatedCampaign;
      } catch (err) {
        // Rollback optimistic update
        if (originalCampaign && originalIndex >= 0) {
          set((state) => {
            state.campaigns[originalIndex] = originalCampaign;
            if (state.selectedCampaign?.id === id) {
              state.selectedCampaign = originalCampaign;
            }
          });
        }

        const message = err instanceof Error ? err.message : 'Failed to update campaign';
        set((state) => {
          state.error = message;
          state.isUpdating = false;
        });
        toast.error('Failed to update campaign', message);
        return null;
      }
    },

    /** DELETE /api/v1/campaigns/:id — Delete campaign with optimistic update */
    deleteCampaign: async (id: string) => {
      set((state) => {
        state.isDeleting = true;
        state.error = null;
      });

      // Store original for rollback
      const originalCampaign = get().campaigns.find((c) => c.id === id);
      const originalTotal = get().total;

      // Optimistic removal
      set((state) => {
        state.campaigns = state.campaigns.filter((c) => c.id !== id);
        state.total = Math.max(0, state.total - 1);
        if (state.selectedCampaign?.id === id) {
          state.selectedCampaign = null;
        }
      });

      try {
        await campaignsApi.delete(id);
        set((state) => {
          state.isDeleting = false;
        });

        toast.success('Campaign deleted', originalCampaign
          ? `"${originalCampaign.name}" has been deleted.`
          : 'Campaign has been deleted.'
        );
        return true;
      } catch (err) {
        // Rollback
        if (originalCampaign) {
          set((state) => {
            state.campaigns.push(originalCampaign);
            state.total = originalTotal;
          });
        }

        const message = err instanceof Error ? err.message : 'Failed to delete campaign';
        set((state) => {
          state.error = message;
          state.isDeleting = false;
        });
        toast.error('Failed to delete campaign', message);
        return false;
      }
    },
  }))
);

/** Transform API campaign to store Campaign format */
function transformApiCampaignToStore(apiCampaign: {
  id: string;
  name?: string;
  status?: string;
  platform?: string;
  objective?: string;
  budgetType?: string;
  budget?: number;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number | null;
  conversions?: number | null;
  cpa?: number | null;
  roas?: number | null;
  bidStrategy?: string;
  ageRange?: string;
  gender?: string;
  locations?: string[];
  interests?: string[];
  createdAt?: string;
  updatedAt?: string;
  workspaceId?: string;
  description?: string;
}): Campaign {
  const statusMap: Record<string, CampaignStatus> = {
    'Active': 'active',
    'Paused': 'paused',
    'Ended': 'completed',
    'Draft': 'draft',
  };
  const platformMap: Record<string, AdPlatform> = {
    'Meta': 'facebook',
    'Google': 'google',
    'TikTok': 'tiktok',
    'Snap': 'snapchat',
  };

  return {
    id: apiCampaign.id,
    workspaceId: apiCampaign.workspaceId || 'default',
    name: apiCampaign.name || 'Untitled',
    description: apiCampaign.description || '',
    status: statusMap[apiCampaign.status || 'Draft'] || 'draft',
    platform: platformMap[apiCampaign.platform || 'Meta'] || 'facebook',
    objective: (apiCampaign.objective?.toLowerCase() || 'awareness') as CampaignObjective,
    budget: {
      amount: apiCampaign.budget || 0,
      type: (apiCampaign.budgetType?.toLowerCase() || 'daily') as BudgetType,
      currency: 'USD',
    },
    schedule: {
      startDate: apiCampaign.createdAt || new Date().toISOString(),
      timezone: 'UTC',
    },
    targeting: {
      audiences: apiCampaign.interests || [],
      demographics: {
        locations: apiCampaign.locations || ['US'],
        genders: apiCampaign.gender ? [apiCampaign.gender] : undefined,
      },
    },
    performance: {
      impressions: apiCampaign.impressions || 0,
      clicks: apiCampaign.clicks || 0,
      conversions: apiCampaign.conversions || 0,
      spend: apiCampaign.spend || 0,
      ctr: apiCampaign.ctr || 0,
      cpc: apiCampaign.clicks ? (apiCampaign.spend || 0) / apiCampaign.clicks : 0,
      roas: apiCampaign.roas || 0,
      cpa: apiCampaign.cpa || 0,
    },
    createdBy: 'system',
    createdAt: apiCampaign.createdAt || new Date().toISOString(),
    updatedAt: apiCampaign.updatedAt || new Date().toISOString(),
    tags: apiCampaign.interests || [],
  };
}
