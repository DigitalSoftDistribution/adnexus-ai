import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import api, { draftsApi } from '../lib/api';
import { createSSEConnection } from '../lib/api';
import type { PendingDraft } from '../lib/api';
import { toast } from '../hooks/useToast';
import type { AdPlatform } from './campaignStore';

/** Review status for a draft */
export type DraftStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

/** Asset type in a draft */
export type DraftAssetType = 'image' | 'video' | 'carousel' | 'collection' | 'story';

/** Single asset within a draft */
export interface DraftAsset {
  id: string;
  type: DraftAssetType;
  url: string;
  thumbnailUrl?: string;
  name: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
  duration?: number; // for video
}

/** Comment on a draft during review */
export interface DraftComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  x?: number; // annotation x position
  y?: number; // annotation y position
}

/** A creative draft awaiting review/approval */
export interface Draft {
  id: string;
  workspaceId: string;
  campaignId?: string;
  campaignName?: string;
  name: string;
  description?: string;
  status: DraftStatus;
  platform: AdPlatform;
  assets: DraftAsset[];
  copy: {
    headline?: string;
    body?: string;
    cta?: string;
    description?: string;
  };
  comments: DraftComment[];
  submittedBy: string;
  submittedByName: string;
  submittedByAvatar?: string;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  tags: string[];
  version: number;
}

/** Draft statistics overview */
export interface DraftStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  needsRevision: number;
  avgReviewTime: number; // hours
  submissionTrend: { date: string; count: number }[];
}

/** Filter options for drafts */
export interface DraftFilters {
  status: DraftStatus | 'all';
  platform: AdPlatform | 'all';
  search: string;
  sortBy: 'submittedAt' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface DraftState {
  /** List of drafts */
  drafts: Draft[];
  /** Total count (for pagination) */
  total: number;
  /** Number of pending drafts (badge) */
  pendingCount: number;
  /** Draft statistics */
  stats: DraftStats | null;
  /** Active filters */
  filters: DraftFilters;
  /** Loading state */
  isLoading: boolean;
  /** Whether an approval is in progress */
  isApproving: boolean;
  /** Whether a rejection is in progress */
  isRejecting: boolean;
  /** Error state */
  error: string | null;
  /** Currently selected draft */
  selectedDraft: Draft | null;
  /** SSE connection state */
  sseConnected: boolean;
  /** SSE error */
  sseError: string | null;

  // Actions
  setDrafts: (drafts: Draft[], total: number) => void;
  setPendingCount: (count: number) => void;
  setStats: (stats: DraftStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<DraftFilters>) => void;
  resetFilters: () => void;
  setSelected: (draft: Draft | null) => void;
  setApproving: (approving: boolean) => void;
  setRejecting: (rejecting: boolean) => void;
  upsertDraft: (draft: Draft) => void;

  // API-connected actions
  fetchDrafts: (params?: Partial<DraftFilters>) => Promise<void>;
  fetchStats: () => Promise<void>;
  getDraft: (id: string) => Promise<Draft | null>;
  approveDraft: (id: string) => Promise<void>;
  rejectDraft: (id: string, reason?: string) => Promise<void>;
  requestRevision: (id: string, feedback: string) => Promise<void>;
  addComment: (draftId: string, comment: DraftComment) => void;

  // SSE
  connectSSE: () => (() => void);
  setSseConnected: (connected: boolean) => void;
  setSseError: (error: string | null) => void;
  handleRealtimeEvent: (event: { type: string; payload?: unknown }) => void;
}

const defaultFilters: DraftFilters = {
  status: 'all',
  platform: 'all',
  search: '',
  sortBy: 'submittedAt',
  sortOrder: 'desc',
  page: 1,
  limit: 20,
};

export const useDraftStore = create<DraftState>()(
  immer((set, get) => ({
    drafts: [],
    total: 0,
    pendingCount: 0,
    stats: null,
    filters: { ...defaultFilters },
    isLoading: false,
    isApproving: false,
    isRejecting: false,
    error: null,
    selectedDraft: null,
    sseConnected: false,
    sseError: null,

    setDrafts: (drafts, total) =>
      set((state) => {
        state.drafts = drafts;
        state.total = total;
        state.pendingCount = drafts.filter((d) => d.status === 'pending').length;
      }),

    setPendingCount: (count) =>
      set((state) => {
        state.pendingCount = count;
      }),

    setStats: (stats) =>
      set((state) => {
        state.stats = stats;
        state.pendingCount = stats.pending;
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    setFilters: (filters) =>
      set((state) => {
        state.filters = { ...state.filters, ...filters };
      }),

    resetFilters: () =>
      set((state) => {
        state.filters = { ...defaultFilters };
      }),

    setSelected: (draft) =>
      set((state) => {
        state.selectedDraft = draft;
      }),

    setApproving: (approving) =>
      set((state) => {
        state.isApproving = approving;
      }),

    setRejecting: (rejecting) =>
      set((state) => {
        state.isRejecting = rejecting;
      }),

    upsertDraft: (draft) =>
      set((state) => {
        const idx = state.drafts.findIndex((d) => d.id === draft.id);
        if (idx >= 0) {
          state.drafts[idx] = draft;
        } else {
          state.drafts.unshift(draft);
          state.total += 1;
        }
        // Recalculate pending count
        state.pendingCount = state.drafts.filter((d) => d.status === 'pending').length;
      }),

    /** GET /api/v1/drafts?status=pending — Fetch drafts with filters */
    fetchDrafts: async (params?: Partial<DraftFilters>) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      try {
        const filters = { ...get().filters, ...params };
        const response = await api.get('/drafts', {
          params: {
            status: filters.status === 'all' ? undefined : filters.status,
            platform: filters.platform === 'all' ? undefined : filters.platform,
            search: filters.search || undefined,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            page: filters.page,
            limit: filters.limit,
          },
        });

        const drafts: Draft[] = (response.data.data || []).map(transformPendingDraftToDraft);
        const total = response.data.total || drafts.length;

        set((state) => {
          state.drafts = drafts;
          state.total = total;
          state.pendingCount = drafts.filter((d) => d.status === 'pending').length;
          state.isLoading = false;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch drafts';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
        toast.error('Failed to load drafts', message);
      }
    },

    /** GET /api/v1/drafts/stats — Fetch draft statistics */
    fetchStats: async () => {
      try {
        const stats = await draftsApi.getStats();
        set((state) => {
          state.stats = {
            total: stats.total,
            pending: stats.pending,
            approved: stats.approved,
            rejected: stats.rejected,
            needsRevision: 0,
            avgReviewTime: 0,
            submissionTrend: [],
          };
          state.pendingCount = stats.pending;
        });
      } catch {
        // Silently fail - stats are non-critical
      }
    },

    /** GET /api/v1/drafts/:id — Get a single draft */
    getDraft: async (id: string) => {
      try {
        const pendingDraft = await draftsApi.get(id);
        const draft = transformPendingDraftToDraft(pendingDraft);
        set((state) => {
          state.selectedDraft = draft;
          // Also upsert into the list
          const idx = state.drafts.findIndex((d) => d.id === id);
          if (idx >= 0) {
            state.drafts[idx] = draft;
          }
        });
        return draft;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch draft';
        set((state) => {
          state.error = message;
        });
        toast.error('Failed to load draft', message);
        return null;
      }
    },

    /** POST /api/v1/drafts/:id/approve — Approve a draft with optimistic update */
    approveDraft: async (id: string) => {
      set((state) => {
        state.isApproving = true;
        state.error = null;
      });

      // Store original for rollback
      const originalDraft = get().drafts.find((d) => d.id === id);

      // Optimistic update
      set((state) => {
        const draft = state.drafts.find((d) => d.id === id);
        if (draft) {
          draft.status = 'approved';
          draft.reviewedAt = new Date().toISOString();
        }
        if (state.selectedDraft?.id === id) {
          state.selectedDraft.status = 'approved';
          state.selectedDraft.reviewedAt = new Date().toISOString();
        }
        state.pendingCount = Math.max(0, state.pendingCount - 1);
      });

      try {
        await draftsApi.approve(id);
        set((state) => {
          state.isApproving = false;
        });
        toast.success('Draft approved', originalDraft?.name || 'The draft has been approved.');
      } catch (err) {
        // Rollback
        if (originalDraft) {
          set((state) => {
            const draft = state.drafts.find((d) => d.id === id);
            if (draft) {
              draft.status = originalDraft.status;
              draft.reviewedAt = originalDraft.reviewedAt;
            }
            state.pendingCount = state.drafts.filter((d) => d.status === 'pending').length;
          });
        }

        const message = err instanceof Error ? err.message : 'Failed to approve draft';
        set((state) => {
          state.error = message;
          state.isApproving = false;
        });
        toast.error('Failed to approve draft', message);
      }
    },

    /** POST /api/v1/drafts/:id/reject — Reject a draft with optimistic update */
    rejectDraft: async (id: string, reason?: string) => {
      set((state) => {
        state.isRejecting = true;
        state.error = null;
      });

      // Store original for rollback
      const originalDraft = get().drafts.find((d) => d.id === id);

      // Optimistic update
      set((state) => {
        const draft = state.drafts.find((d) => d.id === id);
        if (draft) {
          draft.status = 'rejected';
          draft.rejectionReason = reason;
          draft.reviewedAt = new Date().toISOString();
        }
        if (state.selectedDraft?.id === id) {
          state.selectedDraft.status = 'rejected';
          state.selectedDraft.rejectionReason = reason;
          state.selectedDraft.reviewedAt = new Date().toISOString();
        }
        state.pendingCount = Math.max(0, state.pendingCount - 1);
      });

      try {
        await draftsApi.reject(id, reason);
        set((state) => {
          state.isRejecting = false;
        });
        toast.success('Draft rejected', originalDraft?.name || 'The draft has been rejected.');
      } catch (err) {
        // Rollback
        if (originalDraft) {
          set((state) => {
            const draft = state.drafts.find((d) => d.id === id);
            if (draft) {
              draft.status = originalDraft.status;
              draft.rejectionReason = originalDraft.rejectionReason;
              draft.reviewedAt = originalDraft.reviewedAt;
            }
            state.pendingCount = state.drafts.filter((d) => d.status === 'pending').length;
          });
        }

        const message = err instanceof Error ? err.message : 'Failed to reject draft';
        set((state) => {
          state.error = message;
          state.isRejecting = false;
        });
        toast.error('Failed to reject draft', message);
      }
    },

    /** POST /api/v1/drafts/:id/request-revision — Request revision */
    requestRevision: async (id: string, feedback: string) => {
      set((state) => {
        state.isRejecting = true;
        state.error = null;
      });
      try {
        await api.post(`/drafts/${id}/request-revision`, { feedback });
        set((state) => {
          const draft = state.drafts.find((d) => d.id === id);
          if (draft) {
            draft.status = 'needs_revision';
            draft.reviewedAt = new Date().toISOString();
          }
          if (state.selectedDraft?.id === id) {
            state.selectedDraft.status = 'needs_revision';
            state.selectedDraft.reviewedAt = new Date().toISOString();
          }
          state.pendingCount = Math.max(0, state.pendingCount - 1);
          state.isRejecting = false;
        });
        toast.success('Revision requested', 'The draft has been sent back for revision.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to request revision';
        set((state) => {
          state.error = message;
          state.isRejecting = false;
        });
        toast.error('Failed to request revision', message);
      }
    },

    addComment: (draftId: string, comment: DraftComment) => {
      set((state) => {
        const draft = state.drafts.find((d) => d.id === draftId);
        if (draft) {
          draft.comments.push(comment);
        }
        if (state.selectedDraft?.id === draftId) {
          state.selectedDraft.comments.push(comment);
        }
      });
    },

    /** Connect to SSE for real-time draft updates */
    connectSSE: () => {
      const es = createSSEConnection('/events/drafts', {
        onConnect: () => {
          set((state) => {
            state.sseConnected = true;
            state.sseError = null;
          });
        },
        onDisconnect: () => {
          set((state) => {
            state.sseConnected = false;
          });
        },
        onMessage: (event) => {
          get().handleRealtimeEvent(event);
        },
        onError: () => {
          set((state) => {
            state.sseConnected = false;
            state.sseError = 'SSE connection error';
          });
        },
        autoReconnect: true,
        reconnectDelayMs: 1000,
      });

      return () => es.close();
    },

    setSseConnected: (connected) =>
      set((state) => {
        state.sseConnected = connected;
      }),

    setSseError: (error) =>
      set((state) => {
        state.sseError = error;
      }),

    /** Handle real-time SSE events */
    handleRealtimeEvent: (event: { type: string; payload?: unknown }) => {
      switch (event.type) {
        case 'draft.created': {
          // A new draft was created - refresh the list
          get().fetchDrafts();
          toast.info('New draft', 'A new draft has been created and requires your review.');
          break;
        }
        case 'draft.approved': {
          // A draft was approved - invalidate related data
          const payload = event.payload as { draftId?: string; campaignId?: string } | undefined;
          set((state) => {
            const draft = state.drafts.find((d) => d.id === payload?.draftId);
            if (draft) {
              draft.status = 'approved';
              draft.reviewedAt = new Date().toISOString();
            }
            state.pendingCount = Math.max(0, state.pendingCount - 1);
          });
          // Trigger campaign refresh
          window.dispatchEvent(new CustomEvent('invalidate:campaigns'));
          break;
        }
        case 'draft.rejected': {
          const payload = event.payload as { draftId?: string } | undefined;
          set((state) => {
            const draft = state.drafts.find((d) => d.id === payload?.draftId);
            if (draft) {
              draft.status = 'rejected';
              draft.reviewedAt = new Date().toISOString();
            }
            state.pendingCount = Math.max(0, state.pendingCount - 1);
          });
          break;
        }
        case 'campaign.updated': {
          // Campaign data changed - invalidate campaigns
          window.dispatchEvent(new CustomEvent('invalidate:campaigns'));
          break;
        }
        case 'metrics.updated': {
          // Dashboard metrics changed
          window.dispatchEvent(new CustomEvent('invalidate:dashboard'));
          break;
        }
        case 'alert.triggered': {
          const alertPayload = event.payload as { title?: string; message?: string } | undefined;
          toast.warning(alertPayload?.title || 'Alert', alertPayload?.message || 'A new alert has been triggered.');
          break;
        }
        case 'ai.recommendation': {
          const recPayload = event.payload as { title?: string; message?: string } | undefined;
          toast.info(recPayload?.title || 'AI Recommendation', recPayload?.message || 'New AI recommendation available.');
          break;
        }
        default:
          break;
      }
    },
  }))
);

/** Transform API PendingDraft to store Draft format */
function transformPendingDraftToDraft(pd: PendingDraft): Draft {
  const statusMap: Record<string, DraftStatus> = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
  };
  return {
    id: pd.id,
    workspaceId: 'default',
    campaignId: pd.campaignId,
    campaignName: pd.campaignName,
    name: pd.title,
    description: pd.description || pd.changeSummary || '',
    status: statusMap[pd.status || 'pending'] || 'pending',
    platform: (pd.platform?.toLowerCase() || 'facebook') as AdPlatform,
    assets: [],
    copy: {
      description: pd.description,
    },
    comments: [],
    submittedBy: pd.createdBy,
    submittedByName: pd.createdBy,
    submittedAt: pd.createdAt,
    reviewedBy: pd.approvedBy || pd.resolvedBy,
    reviewedAt: pd.approvedAt || pd.resolvedAt,
    rejectionReason: undefined,
    tags: [],
    version: 1,
  };
}
