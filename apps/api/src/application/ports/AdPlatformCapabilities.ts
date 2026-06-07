import type { Platform } from '../../domain/entities/Campaign';

export type PlatformCapabilityStatus = 'live' | 'read_only' | 'mock_ready' | 'coming_soon';

export interface AdPlatformCapability {
  platform: Platform;
  label: string;
  status: PlatformCapabilityStatus;
  canConnectOAuth: boolean;
  canSelectAccounts: boolean;
  canSyncCampaigns: boolean;
  canSyncAds: boolean;
  canSyncMetrics: boolean;
  canWriteCampaigns: boolean;
  dashboardReady: boolean;
  mcpReady: boolean;
  mockSyncReady: boolean;
  reason: string;
  remainingWork: readonly string[];
}

export const AD_PLATFORM_CAPABILITIES: Record<Platform, AdPlatformCapability> = {
  meta: {
    platform: 'meta',
    label: 'Meta Ads',
    status: 'live',
    canConnectOAuth: true,
    canSelectAccounts: true,
    canSyncCampaigns: true,
    canSyncAds: true,
    canSyncMetrics: true,
    canWriteCampaigns: true,
    dashboardReady: true,
    mcpReady: true,
    mockSyncReady: true,
    reason: 'Launch-ready Meta OAuth, account sync, campaign/ad/metric persistence, dashboard status, and guarded write paths are wired.',
    remainingWork: [],
  },
  google: {
    platform: 'google',
    label: 'Google Ads',
    status: 'read_only',
    canConnectOAuth: true,
    canSelectAccounts: false,
    canSyncCampaigns: false,
    canSyncAds: false,
    canSyncMetrics: false,
    canWriteCampaigns: false,
    dashboardReady: false,
    mcpReady: false,
    mockSyncReady: true,
    reason: 'Google OAuth exists, but v2 live sync/persistence is not wired into the clean-architecture platform sync service yet.',
    remainingWork: ['wire account selection', 'wire read-only sync service', 'persist campaigns and metrics', 'add dashboard health states'],
  },
  tiktok: {
    platform: 'tiktok',
    label: 'TikTok Ads',
    status: 'mock_ready',
    canConnectOAuth: false,
    canSelectAccounts: false,
    canSyncCampaigns: false,
    canSyncAds: false,
    canSyncMetrics: false,
    canWriteCampaigns: false,
    dashboardReady: false,
    mcpReady: false,
    mockSyncReady: true,
    reason: 'TikTok route/client stubs exist, but production OAuth account discovery, token refresh/storage hardening, and live sync are not complete. Mock sync contracts are available for tests only.',
    remainingWork: ['confirm TikTok OAuth endpoints/scopes with approved app', 'store refresh tokens and expiries', 'support advertiser account selection', 'wire live sync mappings', 'add audit/error dashboards', 'enable MCP read tools after live sync'],
  },
  snap: {
    platform: 'snap',
    label: 'Snapchat Ads',
    status: 'mock_ready',
    canConnectOAuth: false,
    canSelectAccounts: false,
    canSyncCampaigns: false,
    canSyncAds: false,
    canSyncMetrics: false,
    canWriteCampaigns: false,
    dashboardReady: false,
    mcpReady: false,
    mockSyncReady: true,
    reason: 'Snap route/client stubs exist, but production OAuth account discovery, token refresh/storage hardening, and live sync are not complete. Mock sync contracts are available for tests only.',
    remainingWork: ['confirm Snap OAuth endpoints/scopes with approved app', 'store refresh tokens and expiries', 'support organization/ad-account selection', 'wire live sync mappings', 'add audit/error dashboards', 'enable MCP read tools after live sync'],
  },
};

export const AD_PLATFORM_ORDER: readonly Platform[] = ['meta', 'google', 'tiktok', 'snap'];
