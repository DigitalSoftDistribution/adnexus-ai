import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

/** Team member role within a workspace */
export type TeamMemberRole = 'owner' | 'admin' | 'manager' | 'creative' | 'viewer';

/** Workspace plan tiers */
export type PlanTier = 'free' | 'starter' | 'growth' | 'scale' | 'enterprise' | 'custom';

/** Team member in a workspace */
export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: TeamMemberRole;
  status: 'active' | 'invited' | 'suspended';
  joinedAt: string;
  lastActiveAt?: string;
}

/** Brand settings for a workspace */
export interface BrandSettings {
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  fontFamily: string;
  customDomain?: string;
}

/** Integration connection status */
export interface IntegrationSettings {
  facebookAds: boolean;
  googleAds: boolean;
  tiktokAds: boolean;
  snapchatAds: boolean;
  googleAnalytics: boolean;
  shopify: boolean;
  slack: boolean;
}

/** Workspace settings */
export interface WorkspaceSettings {
  timezone: string;
  currency: string;
  dateFormat: string;
  language: string;
  brand: BrandSettings;
  integrations: IntegrationSettings;
  notifications: {
    emailDigest: boolean;
    campaignAlerts: boolean;
    draftAlerts: boolean;
    budgetAlerts: boolean;
  };
}

/** Workspace data */
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  plan: PlanTier;
  ownerId: string;
  branding: {
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
  usage: {
    campaigns: number;
    campaignLimit: number;
    storage: number;
    storageLimit: number;
    teamMembers: number;
    teamMemberLimit: number;
    aiCredits: number;
    aiCreditLimit: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceState {
  /** Current active workspace */
  workspace: Workspace | null;
  /** Team members in the workspace */
  members: TeamMember[];
  /** Workspace settings */
  settings: WorkspaceSettings | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;

  /** Set the current workspace */
  setWorkspace: (workspace: Workspace | null) => void;
  /** Set team members */
  setMembers: (members: TeamMember[]) => void;
  /** Add a single team member */
  addMember: (member: TeamMember) => void;
  /** Remove a team member */
  removeMember: (memberId: string) => void;
  /** Update workspace settings */
  updateSettings: (settings: Partial<WorkspaceSettings>) => void;
  /** Update workspace object */
  updateWorkspace: (workspace: Partial<Workspace>) => void;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error state */
  setError: (error: string | null) => void;
  /** Computed: get current plan tier */
  currentPlan: () => PlanTier;
  /** Computed: check if workspace has reached campaign limit */
  isAtCampaignLimit: () => boolean;
  /** Computed: check if workspace has reached team member limit */
  isAtTeamLimit: () => boolean;
  /** Computed: get usage percentage for AI credits */
  aiCreditUsagePercent: () => number;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  immer((set, get) => ({
    workspace: null,
    members: [],
    settings: null,
    isLoading: false,
    error: null,

    setWorkspace: (workspace) =>
      set((state) => {
        state.workspace = workspace;
        if (workspace) {
          try {
            localStorage.setItem('workspace_id', workspace.id);
            localStorage.setItem('workspace', JSON.stringify(workspace));
          } catch {
            // Silently fail if localStorage is unavailable
          }
        }
      }),

    setMembers: (members) =>
      set((state) => {
        state.members = members;
      }),

    addMember: (member) =>
      set((state) => {
        state.members.push(member);
      }),

    removeMember: (memberId) =>
      set((state) => {
        state.members = state.members.filter((m) => m.id !== memberId);
      }),

    updateSettings: (newSettings) =>
      set((state) => {
        if (state.settings) {
          state.settings = { ...state.settings, ...newSettings };
        } else {
          state.settings = newSettings as WorkspaceSettings;
        }
      }),

    updateWorkspace: (updates) =>
      set((state) => {
        if (state.workspace) {
          state.workspace = { ...state.workspace, ...updates };
        }
      }),

    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    currentPlan: () => {
      return get().workspace?.plan || 'free';
    },

    isAtCampaignLimit: () => {
      const { workspace } = get();
      if (!workspace) return false;
      return workspace.usage.campaigns >= workspace.usage.campaignLimit;
    },

    isAtTeamLimit: () => {
      const { workspace } = get();
      if (!workspace) return false;
      return workspace.usage.teamMembers >= workspace.usage.teamMemberLimit;
    },

    aiCreditUsagePercent: () => {
      const { workspace } = get();
      if (!workspace || workspace.usage.aiCreditLimit === 0) return 0;
      return Math.round(
        (workspace.usage.aiCredits / workspace.usage.aiCreditLimit) * 100
      );
    },
  }))
);
