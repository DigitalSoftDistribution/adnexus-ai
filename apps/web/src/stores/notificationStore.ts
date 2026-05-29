import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import api, { createSSEConnection } from '../lib/api';
import { toast } from '../hooks/useToast';

/** Severity level of a notification */
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'error';

/** Category for grouping notifications */
export type NotificationCategory =
  | 'campaign'
  | 'draft'
  | 'system'
  | 'comment'
  | 'approval'
  | 'budget'
  | 'team'
  | 'integration';

/** A single notification item */
export interface Notification {
  id: string;
  userId: string;
  workspaceId?: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  category: NotificationCategory;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

/** Notification filter options */
export interface NotificationFilters {
  category: NotificationCategory | 'all';
  read: boolean | 'all';
  severity: NotificationSeverity | 'all';
  page: number;
  limit: number;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  filters: NotificationFilters;
  isLoading: boolean;
  error: string | null;
  sseConnected: boolean;
  sseError: string | null;

  // Actions
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setNotifications: (notifications: Notification[], total: number) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<NotificationFilters>) => void;
  setSseConnected: (connected: boolean) => void;
  setSseError: (error: string | null) => void;

  // API-connected actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;

  // SSE
  connectSSE: () => (() => void);
  handleRealtimeEvent: (event: { type: string; payload?: unknown }) => void;
}

const defaultFilters: NotificationFilters = {
  category: 'all',
  read: 'all',
  severity: 'all',
  page: 1,
  limit: 50,
};

export const useNotificationStore = create<NotificationState>()(
  immer((set, get) => ({
    notifications: [],
    unreadCount: 0,
    total: 0,
    filters: { ...defaultFilters },
    isLoading: false,
    error: null,
    sseConnected: false,
    sseError: null,

    addNotification: (notification) =>
      set((state) => {
        state.notifications.unshift(notification);
        state.total += 1;
        if (!notification.read) {
          state.unreadCount += 1;
        }
      }),

    removeNotification: (id) =>
      set((state) => {
        const removed = state.notifications.find((n) => n.id === id);
        state.notifications = state.notifications.filter((n) => n.id !== id);
        state.total = Math.max(0, state.total - 1);
        if (removed && !removed.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }),

    setNotifications: (notifications, total) =>
      set((state) => {
        state.notifications = notifications;
        state.total = total;
      }),

    setUnreadCount: (count) =>
      set((state) => {
        state.unreadCount = count;
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

    setSseConnected: (connected) =>
      set((state) => {
        state.sseConnected = connected;
      }),

    setSseError: (error) =>
      set((state) => {
        state.sseError = error;
      }),

    /** GET /api/v1/notifications — Fetch notifications with filters */
    fetchNotifications: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });
      try {
        const { filters } = get();
        const params: Record<string, unknown> = { page: filters.page, limit: filters.limit };
        if (filters.category !== 'all') params.category = filters.category;
        if (filters.read !== 'all') params.read = filters.read;
        if (filters.severity !== 'all') params.severity = filters.severity;

        const response = await api.get('/notifications', { params });
        const notifications: Notification[] = response.data.data ?? [];
        const total = response.data.total ?? notifications.length;

        set((state) => {
          state.notifications = notifications;
          state.total = total;
          state.isLoading = false;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch notifications';
        set((state) => {
          state.error = message;
          state.isLoading = false;
        });
        toast.error('Failed to load notifications', message);
      }
    },

    /** GET /api/v1/notifications/unread-count — Fetch unread count */
    fetchUnreadCount: async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        const count = response.data.count ?? 0;
        set((state) => {
          state.unreadCount = count;
        });
      } catch (err) {
        // Silently fail - non-critical
        console.warn('Failed to fetch unread count:', err);
      }
    },

    /** PUT /api/v1/notifications/:id/read — Mark single notification as read (optimistic) */
    markAsRead: async (id: string) => {
      // Optimistic update
      let wasUnread = false;
      set((state) => {
        const n = state.notifications.find((n) => n.id === id);
        if (n && !n.read) {
          n.read = true;
          n.readAt = new Date().toISOString();
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          wasUnread = true;
        }
      });

      if (!wasUnread) return; // Already read, skip API call

      try {
        await api.put(`/notifications/${id}/read`);
      } catch (err) {
        // Rollback on failure
        set((state) => {
          const n = state.notifications.find((n) => n.id === id);
          if (n) {
            n.read = false;
            n.readAt = undefined;
            state.unreadCount += 1;
          }
        });
        const message = err instanceof Error ? err.message : 'Failed to mark as read';
        toast.error('Failed to mark as read', message);
      }
    },

    /** PUT /api/v1/notifications/read-all — Mark all notifications as read (optimistic) */
    markAllAsRead: async () => {
      const previousUnread = get().unreadCount;
      const previousNotifications = get().notifications.map((n) => ({
        id: n.id,
        read: n.read,
      }));

      // Optimistic update
      set((state) => {
        state.notifications.forEach((n) => {
          if (!n.read) {
            n.read = true;
            n.readAt = new Date().toISOString();
          }
        });
        state.unreadCount = 0;
      });

      if (previousUnread === 0) return; // Nothing to mark

      try {
        await api.put('/notifications/read-all');
        toast.success('All caught up', 'All notifications have been marked as read.');
      } catch (err) {
        // Rollback
        set((state) => {
          previousNotifications.forEach((prev) => {
            const n = state.notifications.find((nn) => nn.id === prev.id);
            if (n) {
              n.read = prev.read;
              if (!prev.read) {
                n.readAt = undefined;
              }
            }
          });
          state.unreadCount = previousUnread;
        });
        const message = err instanceof Error ? err.message : 'Failed to mark all as read';
        toast.error('Failed to mark all as read', message);
      }
    },

    /** Connect to SSE for real-time notification updates */
    connectSSE: () => {
      const es = createSSEConnection('/events/notifications', {
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

    /** Handle real-time SSE events for notifications */
    handleRealtimeEvent: (event: { type: string; payload?: unknown }) => {
      switch (event.type) {
        case 'notification.created': {
          const payload = event.payload as Notification | undefined;
          if (payload) {
            set((state) => {
              // Deduplicate
              const exists = state.notifications.find((n) => n.id === payload.id);
              if (!exists) {
                state.notifications.unshift(payload);
                state.total += 1;
                if (!payload.read) {
                  state.unreadCount += 1;
                }
              }
            });

            // Show toast for new notifications
            if (payload.severity === 'error' || payload.severity === 'warning') {
              toast.warning(payload.title, payload.message);
            } else if (payload.severity === 'success') {
              toast.success(payload.title, payload.message);
            } else {
              toast.info(payload.title, payload.message);
            }
          }
          break;
        }
        case 'notification.read': {
          const payload = event.payload as { id?: string } | undefined;
          if (payload?.id) {
            set((state) => {
              const n = state.notifications.find((nn) => nn.id === payload.id);
              if (n && !n.read) {
                n.read = true;
                n.readAt = new Date().toISOString();
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            });
          }
          break;
        }
        case 'notification.read-all': {
          set((state) => {
            state.notifications.forEach((n) => {
              if (!n.read) {
                n.read = true;
                n.readAt = new Date().toISOString();
              }
            });
            state.unreadCount = 0;
          });
          break;
        }
        case 'notification.deleted': {
          const payload = event.payload as { id?: string } | undefined;
          if (payload?.id) {
            set((state) => {
              const removed = state.notifications.find((n) => n.id === payload.id);
              state.notifications = state.notifications.filter((n) => n.id !== payload.id);
              state.total = Math.max(0, state.total - 1);
              if (removed && !removed.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
              }
            });
          }
          break;
        }
        default:
          break;
      }
    },
  }))
);
