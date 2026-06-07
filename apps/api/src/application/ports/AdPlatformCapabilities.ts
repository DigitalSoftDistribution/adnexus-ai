import type { Platform } from '../../domain/entities/Campaign';

/**
 * Feature flag state for a single capability on a platform.
 *
 * - `true`: enabled, using live API
 * - `false`: entirely disabled (not shown in UI, no sync)
 * - `'mock'`: enabled but using mock/fake data (safe for dev/preview)
 * - `'live'`: enabled with real API calls (production)
 */
export type FeatureState = boolean | 'mock' | 'live';

/**
 * Named features that can be toggled per platform.
 *
 * New platform features should be added here (not as ad-hoc env vars or
 * magic strings) so the type system catches stale references.
 */
export type PlatformFeatureName =
  | 'sync'
  | 'write'
  | 'insights'
  | 'oauth'
  | 'campaign_management'
  | 'ad_management'
  | 'audience_management'
  | 'reporting';

/**
 * Capabilities for a single ad platform.
 *
 * The `features` map governs what the platform is allowed to do. When a
 * platform is not connected (no OAuth token stored), this object is still
 * returned but every feature is `false`.
 */
export interface AdPlatformCapabilities {
  platform: Platform;
  /** True when the workspace has a valid OAuth token for this platform. */
  connected: boolean;
  /** Per-feature toggle. Keys come from {@link PlatformFeatureName}. */
  features: Record<PlatformFeatureName, FeatureState>;
  /** ISO-8601 timestamp of the last successful capability refresh. */
  lastRefreshed: string | null;
}

/**
 * Port for querying per-platform feature capabilities.
 *
 * Implementations combine environment-based defaults (e.g. `ENABLE_META_LIVE`,
 * `ENABLE_GOOGLE_LIVE`) with the workspace's OAuth connection state to
 * produce the final capability map. Callers in the application layer never
 * read env vars directly — they go through this port.
 */
export interface IAdPlatformCapabilities {
  /**
   * Return capabilities for a single platform in the given workspace.
   * Returns a disconnected skeleton when no integration exists.
   */
  getCapabilities(workspaceId: string, platform: Platform): Promise<AdPlatformCapabilities>;

  /**
   * Return capabilities for all four supported platforms at once.
   */
  getAllCapabilities(workspaceId: string): Promise<AdPlatformCapabilities[]>;

  /**
   * True when the given feature is enabled (live or mock) for the platform.
   * Convenience check so callers don't have to guard against `false | 'mock'`
   * everywhere inline.
   */
  isFeatureEnabled(workspaceId: string, platform: Platform, feature: PlatformFeatureName): Promise<boolean>;

  /**
   * True when the given feature is live (not mock, not false).
   */
  isFeatureLive(workspaceId: string, platform: Platform, feature: PlatformFeatureName): Promise<boolean>;
}
