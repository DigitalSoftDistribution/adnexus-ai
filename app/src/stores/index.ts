export { useAuthStore } from './authStore';
export type { AuthState, User, UserRole } from './authStore';

export { useWorkspaceStore } from './workspaceStore';
export type {
  WorkspaceState,
  Workspace,
  WorkspaceSettings,
  BrandSettings,
  IntegrationSettings,
  TeamMember,
  TeamMemberRole,
  PlanTier,
} from './workspaceStore';

export { useCampaignStore } from './campaignStore';
export type {
  CampaignState,
  Campaign,
  CampaignStatus,
  CampaignFilters,
  CampaignSummary,
  AdPlatform,
  CampaignObjective,
  BudgetType,
} from './campaignStore';

export { useDraftStore } from './draftStore';
export type {
  DraftState,
  Draft,
  DraftAsset,
  DraftAssetType,
  DraftComment,
  DraftStatus,
  DraftStats,
  DraftFilters,
} from './draftStore';

export { useNotificationStore } from './notificationStore';
export type {
  NotificationState,
  Notification,
  NotificationSeverity,
  NotificationCategory,
  NotificationFilters,
} from './notificationStore';

export { useUIStore } from './uiStore';
export type {
  UIState,
  Toast,
  ToastType,
  SidebarMode,
  ModalSize,
} from './uiStore';
